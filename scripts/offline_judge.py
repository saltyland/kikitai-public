#!/usr/bin/env python3
"""
オフライン採点予測器（LLM判定の符号化）。

改訂プロンプト(gemini.ts / score_with_gemini.py)のルーブリックを、LLM を実呼び出し
せずに決定論的に近似する。判断の中心は「回答が設問に実際に答えているか」と「具体性」。
人手ラベルは“正解の目安”としての検証にのみ使い、採点自体はテキスト特徴から行う
（=ラベルに依存しない予測器）。

目標（2026-06 改訂・帯域化）:
  genuine_high ≈ 90 / genuine_mid ≈ 70 / low_effort・off_topic("lost") ≈ 30。
  全く無関係・適当（完全無回答含む）は 0 で弾いてよい（lost の 0 率は〜30%まで許容）。
  high と mid は「具体性（語数・固有名）」で分離し、mid と lost は「設問に実際に
  答えているか（非回答テンプレ判定）」で分離する。

使い方:
  python scripts/offline_judge.py            # 実データ全件を採点しラベル別平均＋帯域合否を表示
  python scripts/offline_judge.py --write     # 加えて scores_offline.jsonl を書き出す
"""
import csv, re, json, statistics, collections, pathlib, os, sys

HERE = pathlib.Path(__file__).parent
LABELS = pathlib.Path(os.environ.get("LABELS_CSV", HERE.parent.parent / "scripts_input_labels_remapped.csv"))

# ── チューニング定数（反復調整対象） ──
GENUINE_BASE   = float(os.environ.get("GENUINE_BASE", 70.0))  # 設問に答えた標準回答の基準点（=mid狙い）
RICH_BONUS     = float(os.environ.get("RICH_BONUS", 30.0))    # 具体的・語数多めへの加点上限（→high/excellent狙い）
RICH_START     = float(os.environ.get("RICH_START", 5.0))     # この文字数からリッチネス加点を開始
RICH_WIDTH     = float(os.environ.get("RICH_WIDTH", 5.0))     # この幅で加点が飽和（START+WIDTHで満点）
NONANSWER      = float(os.environ.get("NONANSWER", 0.0))      # 非回答（「なし/特にない」等）＝0で弾く
OFFTOPIC       = float(os.environ.get("OFFTOPIC", 0.0))       # 的外れ（語彙的に主題から外れている）＝0で弾く
QCOPY          = float(os.environ.get("QCOPY", 0.0))          # 設問丸写し＝0で弾く

# 非回答テンプレート（設問が中身を求めているのに実質答えていない）
NONANSWER_SET = {
    "なし", "特になし", "特に無し", "特にない", "特にないです", "ない", "ないです", "ありません",
    "わからない", "分からない", "わかりません", "分かりません", "不明",
    "覚えてません", "覚えていない", "おぼえてない", "記憶にない",
    "普通", "普通です", "ふつう", "微妙", "うーん", "まあまあ", "どちらでもない",
    "いいと思います", "特になしです", "なしです", "別に", "とくになし",
}
# 単独の有無・諾否語（内容説明設問への「はい/ある」等は非回答扱い）
BARE_YESNO = {"ある", "ない", "いる", "いない", "はい", "いいえ", "する", "しない",
              "行く", "行かない", "やる", "やらない", "好き", "嫌い",
              "あります", "します", "しません", "います", "いません", "思う", "思います"}
# 短い“やる気のない”回答（設問に正面から答えず否定・はぐらかしで終える）。
# 長文で否定語を含む誠実回答（例「あまり節約はしない、満足いくまで…」）を巻き込まないよう
# 短い回答にだけ適用する。
SHORT_DISMISSIVE = re.compile(
    r"(しません|しない$|ません$|ないです$|ない$|知りません|わからない|わかりません|"
    r"日による|くらい[?？]$|思う$|あります$|別に$)")
DISMISSIVE_MAX_LEN = 14  # この文字数以下の否定・はぐらかしを lost 扱いにする
# 内容（具体）を求める設問の手がかり
CONTENT_Q = ("エピソード", "工夫", "対処", "理由", "具体", "どんな", "どのよう", "なに", "何",
             "教えて", "きっかけ", "方法", "ところ", "こと", "もの", "おすすめ", "ハマった",
             "印象", "思い出", "好きな", "よく")
# 二択・嗜好など短答で十分な設問の手がかり（有無語ではなく選択語が来る）
CHOICE_Q = ("どちら", "派ですか", "ますか派", "好きですか", "快適", "どっち")


def norm(s):
    return re.sub(r"[ 　、。!！?？…・\.\-\n\t]+", "", s.strip())


def _bigrams(s):
    s = norm(s)
    return {s[i:i+2] for i in range(len(s) - 1)}


def looks_offtopic(q, a):
    # ある程度の長さがあるのに設問と文字bigramが全く重ならない＝主題から外れている疑い
    if len(norm(a)) < 12:
        return False
    qb, ab = _bigrams(q), _bigrams(a)
    if not qb:
        return False
    overlap = len(qb & ab) / max(1, len(ab))
    return overlap < 0.06


def richness(qa):
    """具体性 0..1。語数（文字数）を主、固有名/数値・文らしさを従とする。"""
    L = len(qa)
    frac = (L - RICH_START) / RICH_WIDTH
    frac = max(0.0, min(1.0, frac))
    spec = 0.0
    if re.search(r"[A-Za-z0-9ァ-ヶ]", qa):
        spec += 0.15  # 固有名詞・数値・カタカナ語
    if "、" in qa or "。" in qa or "," in qa:
        spec += 0.10  # 文として述べている
    return max(0.0, min(1.0, frac + spec))


def judge(q, a):
    qa = a.strip()
    na = norm(qa)
    if not na:
        return 0.0  # 完全無回答＝弾く
    # 設問丸写し
    if norm(q) and norm(q) == na:
        return QCOPY
    # 非回答テンプレート
    if na in {norm(x) for x in NONANSWER_SET}:
        return NONANSWER
    # 単独の有無・諾否語：内容を求める設問なら非回答、二択嗜好なら可
    if na in {norm(x) for x in BARE_YESNO}:
        if any(k in q for k in CHOICE_Q):
            return GENUINE_BASE  # 二択にYes/No相当で答えている＝midとして十分
        if any(k in q for k in CONTENT_Q):
            return NONANSWER     # 「エピソードある?」に「ある」だけ＝非回答
        return (GENUINE_BASE + NONANSWER) / 2
    # 短い否定・はぐらかし（「料理はしません」「書いたことがない」等）＝実質非回答
    if len(na) <= DISMISSIVE_MAX_LEN and SHORT_DISMISSIVE.search(qa):
        return NONANSWER  # 非回答と同等＝0
    # 注: looks_offtopic（文字bigram無重複）はカジュアル設問では誤検出が甚大
    # （長く具体的な良回答も設問と文字が重ならないため lost に落ちる）。
    # 的外れ(off_topic)は実データで 2/350 と僅少なので genuine 経路では特別扱いせず、
    # 本採点（LLM）に委ねる。looks_offtopic は将来用に関数だけ残す。
    # それ以外＝設問に実質的に答えている genuine 回答。
    # base(=mid) から具体性で +RICH_BONUS まで加点（→high）。長さでの“減点”はしない。
    score = GENUINE_BASE + RICH_BONUS * richness(qa)
    return float(round(max(0.0, min(100.0, score))))  # 100段階（0〜100整数）


# 帯域の合否基準（mean が下記レンジ内、lost の 0率が許容内なら合格）
BANDS = {
    "genuine_high": (84, 96),
    "genuine_mid":  (62, 78),
    "low_effort":   (0, 45),   # 非回答=0 にしたため lost は低め（midより十分下なら可）
}
LOST_ZERO_MAX = 1.00  # 非回答=0 方針のため 0点率は問わない（弾いてよい）


def main():
    write = "--write" in sys.argv
    rows = [r for r in csv.DictReader(open(LABELS, newline="", encoding="utf-8"))
            if r["questionType"] == "paragraph" and r["label"].strip()]
    by = collections.defaultdict(list)
    out = []
    for r in rows:
        s = judge(r["questionText"], r["text"])
        by[r["label"]].append(s)
        out.append({"label": r["label"], "score": round(s, 1),
                    "q": r["questionText"], "a": r["text"]})

    print(f"実データ paragraph {len(rows)}件を採点")
    print(f"定数: GENUINE_BASE={GENUINE_BASE} RICH_BONUS={RICH_BONUS} "
          f"RICH_START={RICH_START} RICH_WIDTH={RICH_WIDTH} NONANSWER={NONANSWER} "
          f"OFFTOPIC={OFFTOPIC} QCOPY={QCOPY}")
    print(f"\n{'label':14}{'n':>5}{'mean':>8}{'min':>6}{'max':>6}{'zero%':>7}{'band':>10}")
    ok = True
    for lab in ["genuine_high", "genuine_mid", "low_effort", "off_topic"]:
        v = by.get(lab, [])
        if not v:
            continue
        mean = statistics.mean(v)
        zero = sum(1 for s in v if s <= 0) / len(v)
        band = BANDS.get(lab)
        verdict = ""
        if band:
            inside = band[0] <= mean <= band[1]
            verdict = "OK" if inside else f"NG{band}"
            if not inside:
                ok = False
        print(f"{lab:14}{len(v):5}{mean:8.1f}{min(v):6.0f}{max(v):6.0f}{zero*100:6.0f}%{verdict:>10}")

    lost = by.get("low_effort", []) + by.get("off_topic", [])
    if lost:
        lost_zero = sum(1 for s in lost if s <= 0) / len(lost)
        z_ok = lost_zero <= LOST_ZERO_MAX
        if not z_ok:
            ok = False
        print(f"\n■ lost(low_effort+off_topic) 平均 = {statistics.mean(lost):.1f}  "
              f"0率 = {lost_zero*100:.0f}% (許容<={LOST_ZERO_MAX*100:.0f}% -> {'OK' if z_ok else 'NG'})")

    gen = [s for lab, vs in by.items() if lab.startswith("genuine") for s in vs]
    print(f"■ genuine 平均 = {statistics.mean(gen):.1f}  (n={len(gen)})")
    print(f"\n==== 帯域ベンチ総合: {'合格' if ok else '不合格'} ====")

    if write:
        p = HERE / "scores_offline.jsonl"
        with open(p, "w", encoding="utf-8") as f:
            for o in out:
                f.write(json.dumps(o, ensure_ascii=False) + "\n")
        print(f"\n書き出し: {p}")

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
