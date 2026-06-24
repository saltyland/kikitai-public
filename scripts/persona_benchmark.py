#!/usr/bin/env python3
"""
ペルソナ・ベンチマーク（採点の代理 = offline_judge を単一の真実とする）。

実データ `scripts_input_labels_remapped.csv` を再標本化して 4 群のペルソナを生成し、
各ペルソナの回答を `offline_judge.judge`（0〜100 の 100 段階）で採点して平均点を出す。

  群                目標   人数
  excellent(非常にいい) 95   10
  average(CSV平均)      70   20
  shady(やや悪い)       40   20
  bad(悪い)              5   10

採点分布は二峰性（非回答=0 と genuine=70〜100）なので、中間の平均は
「良い回答」と「0点回答」の混合比で作る。各群は良回答プール（excellent=長く具体的な
genuine_high、その他=genuine 全般）から良回答平均を実測し、目標に合う良回答割合
good_frac = 目標 / 良回答平均 を自動算出して 0 点回答を注入する（=ルール側の目標寄せ）。

多様性: 設問は毎回ランダムに選び、各プールから多数の実回答をランダムに引く。0点回答も
複数種類から選ぶ。末尾に多様性指標（ユニーク回答率）を表示する。

使い方:
    python scripts/persona_benchmark.py
    SEED=42 python scripts/persona_benchmark.py
"""
import csv, collections, random, statistics, pathlib, os, sys, json, importlib.util

HERE = pathlib.Path(__file__).parent
LABELS = pathlib.Path(os.environ.get(
    "LABELS_CSV", HERE.parent.parent / "scripts_input_labels_remapped.csv"))

_spec = importlib.util.spec_from_file_location("offline_judge", HERE / "offline_judge.py")
_oj = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_oj)
judge = _oj.judge

N_QUESTIONS = int(os.environ.get("N_QUESTIONS", 8))
SEED = int(os.environ.get("SEED", 20260624))
RICH_MIN_LEN = 12  # excellent 用：これ以上の長さの genuine_high を「リッチ」とみなす

# 0点回答（弾く帯）。offline_judge が設問に依らず必ず 0 にする非回答テンプレートのみ。
# （注: 的外れ雑談・ギブリッシュは offline_judge では検出できず genuine 扱いになるため
#  ここには入れない。それらの捕捉は本番の関連性軸(LLM/埋め込み)の役割。）
ZERO_TEXTS = ["なし", "特にない", "特になし", "とくになし", "わからない", "分からない",
              "普通", "覚えてません", "ありません", "別に", "どちらでもない", "微妙",
              "まあまあ", "うーん"]

# 群定義: (人数, 目標, 良回答プール種別)。good_frac は実測平均から自動算出。
GROUPS = {
    "excellent(非常にいい)": (10, 95, "rich"),
    "average(CSV平均)":      (20, 70, "genuine"),
    "shady(やや悪い)":        (20, 40, "genuine"),
    "bad(悪い)":              (10,  5, "genuine"),
}


def load_pools():
    rows = [r for r in csv.DictReader(open(LABELS, newline="", encoding="utf-8"))
            if r["questionType"] == "paragraph" and r["label"].strip()]
    q2l2a = collections.defaultdict(lambda: collections.defaultdict(list))
    for r in rows:
        q2l2a[r["questionText"]][r["label"]].append(r["text"])
    global GLOBAL_RICH_POOL
    GLOBAL_RICH_POOL = [r["text"] for r in rows if r["label"] == "genuine_high"]
    return q2l2a, list(q2l2a.keys())


GLOBAL_RICH_POOL = []  # load_pools() で設問横断の genuine_high 全件に置き換える


def good_pool_for(q2l2a, q, kind):
    """設問 q の『良回答』候補リストを返す。"""
    if kind == "rich":
        pool = [a for a in q2l2a[q]["genuine_high"] if len(a) >= RICH_MIN_LEN]
        if pool:
            return pool
        # 長い genuine_high が無ければ同設問の genuine_high（任意の長さ）に留める。
        # genuine_mid を混ぜると平均が下がり excellent(目標95) に届かないため。
        pool = list(q2l2a[q]["genuine_high"])
        if pool:
            return pool
        return GLOBAL_RICH_POOL  # この設問に genuine_high が無い場合のみ全設問プールへ
    pool = list(q2l2a[q]["genuine_high"]) + list(q2l2a[q]["genuine_mid"])
    return pool or list(q2l2a[q]["low_effort"])


def measure_good_avg(rng, q2l2a, questions, kind, samples=1500):
    """良回答プールから多数サンプルして平均点を実測（good_frac 算出に使う）。"""
    vals = []
    for _ in range(samples):
        q = rng.choice(questions)
        pool = good_pool_for(q2l2a, q, kind)
        if not pool:
            continue
        vals.append(judge(q, rng.choice(pool)))
    return statistics.mean(vals) if vals else 0.0


GROUP_PREFIX = {
    "excellent(非常にいい)": ("E", "誠実_丁寧"),
    "average(CSV平均)":      ("A", "誠実_標準"),
    "shady(やや悪い)":        ("S", "やや手抜き"),
    "bad(悪い)":              ("B", "手抜き_放棄"),
}


def archetype_for(prefix_label, good_hits, n_q):
    """個人ごとの実際の良回答数からサブ archetype 名を作る（=多様性の見える化）。"""
    if good_hits == n_q:
        return f"{prefix_label}_全問丁寧({good_hits}/{n_q})"
    if good_hits == 0:
        return f"{prefix_label}_全問手抜き(0/{n_q})"
    return f"{prefix_label}_まちまち({good_hits}/{n_q})"


def run_group(gid, name, n, target, kind, good_avg, rng, q2l2a, questions, personas_out):
    good_frac = max(0.0, min(1.0, target / good_avg)) if good_avg > 0 else 0.0
    prefix, label = GROUP_PREFIX[name]
    persona_means, all_scores, answers = [], [], []
    for i in range(n):
        qs = rng.sample(questions, min(N_QUESTIONS, len(questions)))
        scores, qa_records, good_hits = [], [], 0
        for q in qs:
            is_good = rng.random() <= good_frac
            if is_good:
                pool = good_pool_for(q2l2a, q, kind)
                a = rng.choice(pool) if pool else rng.choice(ZERO_TEXTS)
                if pool:
                    good_hits += 1
            else:
                a = rng.choice(ZERO_TEXTS)
            s = judge(q, a)
            scores.append(s); all_scores.append(s); answers.append(a)
            qa_records.append({"question": q, "answer": a, "score": s})
        persona_means.append(statistics.mean(scores))
        personas_out.append({
            "id": f"{prefix}{i+1:03d}",
            "group": name,
            "archetype": archetype_for(label, good_hits, len(qs)),
            "target": target,
            "meanScore": round(statistics.mean(scores), 1),
            "answers": qa_records,
        })
    overall = statistics.mean(all_scores)
    uniq = len(set(answers)) / len(answers)
    hit = "OK" if abs(overall - target) <= 6 else "要調整"
    print(f"\n=== {name}  {n}人 / 各{N_QUESTIONS}問  （目標 {target}点）===")
    print(f"  良回答平均={good_avg:.0f}  良回答割合={good_frac*100:.0f}%")
    print(f"  平均点          = {overall:5.1f} / 100   [目標差 {overall-target:+.1f}  {hit}]")
    print(f"  ペルソナ平均範囲 = {min(persona_means):.0f} 〜 {max(persona_means):.0f}")
    print(f"  多様性(ユニーク回答率) = {uniq*100:.0f}%   0点回答 = "
          f"{sum(1 for s in all_scores if s<=0)}/{len(all_scores)}")
    return overall, target


def main():
    write = "--write" in sys.argv
    rng = random.Random(SEED)
    q2l2a, questions = load_pools()
    print(f"設問プール: {len(questions)}問  シード={SEED}  （採点=offline_judge / 100点満点）")
    results, personas_out = [], []
    for gid, (name, (n, target, kind)) in enumerate(GROUPS.items()):
        good_avg = measure_good_avg(rng, q2l2a, questions, kind)
        results.append((name, *run_group(gid, name, n, target, kind, good_avg, rng,
                                          q2l2a, questions, personas_out)))
    print("\n──────── 目標 vs 実測 ────────")
    for name, got, target in results:
        print(f"  {name:22} 目標 {target:3}  実測 {got:5.1f}  差 {got-target:+.1f}")

    if write:
        out_path = HERE / "personas_4groups.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({
                "version": "1.0-4groups",
                "source": str(LABELS.name),
                "seed": SEED,
                "groups": {name: {"n": n, "target": target} for name, (n, target, _) in GROUPS.items()},
                "personas": personas_out,
            }, f, ensure_ascii=False, indent=2)
        print(f"\n書き出し: {out_path}  ({len(personas_out)}人)")


if __name__ == "__main__":
    main()
