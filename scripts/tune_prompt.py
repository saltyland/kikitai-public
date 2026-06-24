#!/usr/bin/env python3
"""
回答ごと品質スコアのプロンプト調整ハーネス。

labels_remapped.csv（実データ・人手ラベル付き）の paragraph 行をサンプリングして
候補プロンプトで Gemini 採点し、ラベル別の平均スコアを出す。
目標: genuine(high/mid) の平均 ≈ 80、low_effort/off_topic は明確に下げる。

使い方:
  python scripts/tune_prompt.py            # 既定サンプルで採点しラベル別平均を表示
  N_GENUINE=40 N_LOW=40 python scripts/tune_prompt.py
  FULL=1 python scripts/tune_prompt.py      # 全 paragraph 件を採点

429 が出たら RATE_PER_MIN を下げる。
"""
import json, csv, time, urllib.request, urllib.error, os, pathlib, threading, statistics, collections, random
from concurrent.futures import ThreadPoolExecutor, as_completed

_HERE = pathlib.Path(__file__).parent
_env = _HERE.parent / ".env.local"
if _env.exists():
    for _line in open(_env, encoding="utf-8"):
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

API_KEY = os.environ["GEMINI_API_KEY"]
MODEL   = os.environ.get("REDACTED_API_KEY", "")
URL     = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"
LABELS  = str(pathlib.Path(os.environ.get("LABELS_CSV", _HERE.parent.parent / "scripts_input_labels_remapped.csv")))

WORKERS      = int(os.environ.get("WORKERS", 6))
RATE_PER_MIN = int(os.environ.get("RATE_PER_MIN", 28))

# ── 候補プロンプト（回答ごと採点・レジスタ適応・甘さ抑制） ──
PROMPT = """\
あなたはアンケート回答の品質を採点する採点官です。設問1問に対する回答1件を0〜100点で採点します。

【大前提：設問の性質に合わせて採点する】
このアンケートには「日常・嗜好・経験」を尋ねるカジュアルな設問が多く含まれます。
こうした設問は長文や専門性を求めていません。設問に正面から答えた誠実な回答であれば、
たとえ短くても（単語・一文でも）十分に良い回答です。長さや流暢さで加点・減点しないこと。

【採点の中心：その回答は設問に本当に答えているか】
- 設問が問うていることに、具体的な内容（好み・選択・固有名・経験・理由など）で答えている
  → 良い回答。短くても 75〜90 点。特に具体的・自分の言葉で語られていれば 85〜95 点。
- Yes/No や二択を問う設問に、選択を明示して答えている → それで満点級（80〜95点）。

【明確に減点するパターン】
- 「なし」「特にない」「わからない」「覚えていない」「普通」等、設問に実質的に答えていない
  非回答・はぐらかし（設問が内容を求めているのに中身ゼロ） → 20〜45点。
- 設問と無関係な内容（別の話題・雑談・はぐらかし） → 10〜35点。
- 設問文の丸写し・コピペ、ランダム文字列・意味をなさない羅列 → 0〜20点。
- ただし「ない/いない」が設問への誠実な事実回答として妥当な場合（例:「該当する経験はありますか」に
  「ない」）は非回答ではない。設問が内容説明を求めているのに「なし」で済ませた時のみ減点する。

<survey_data>
設問: {q}
回答: {a}
</survey_data>

JSONのみ返答（前後に文章やコードブロックを付けない）:
{{"score": <0-100の整数>, "feedback": "<日本語1行>"}}
"""

class RateLimiter:
    def __init__(self, rpm):
        self._interval = 60.0 / rpm; self._lock = threading.Lock(); self._last = 0.0
    def acquire(self):
        with self._lock:
            now = time.time(); wait = self._last + self._interval - now
            if wait > 0: time.sleep(wait)
            self._last = time.time()

_rate = RateLimiter(RATE_PER_MIN)

def score_one(q, a, retries=5):
    body = json.dumps({
        "contents": [{"parts": [{"text": PROMPT.format(q=q, a=a)}]}],
        "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
    }).encode()
    for attempt in range(retries):
        _rate.acquire()
        try:
            req = urllib.request.Request(URL, data=body,
                  headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=40) as resp:
                result = json.loads(resp.read())
            text = result["candidates"][0]["content"]["parts"][0]["text"]
            return int(max(0, min(100, float(json.loads(text).get("score", 50)))))
        except urllib.error.HTTPError as e:
            time.sleep(8 * (attempt + 1))
            if attempt == retries - 1:
                print(f"  [HTTP {e.code} give up] {q[:18]}", flush=True)
        except Exception as ex:
            time.sleep(4)
            if attempt == retries - 1:
                print(f"  [ERR give up] {ex}", flush=True)
    return None

def main():
    rows = [r for r in csv.DictReader(open(LABELS, newline="", encoding="utf-8"))
            if r["label"].strip() and r["questionType"] == "paragraph"]
    by = collections.defaultdict(list)
    for r in rows: by[r["label"]].append(r)

    random.seed(42)
    if os.environ.get("FULL"):
        sample = rows
    else:
        ng = int(os.environ.get("N_GENUINE", 35))
        nl = int(os.environ.get("N_LOW", 35))
        sample = []
        for lab, n in [("genuine_high", ng), ("genuine_mid", ng), ("low_effort", nl), ("off_topic", 99)]:
            pool = by.get(lab, [])
            sample += random.sample(pool, min(n, len(pool)))
    print(f"採点対象: {len(sample)}件  model={MODEL}  rpm={RATE_PER_MIN}", flush=True)

    results = []
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=WORKERS) as exe:
        futs = {exe.submit(score_one, r["questionText"], r["text"]): r for r in sample}
        done = 0
        for fut in as_completed(futs):
            r = futs[fut]; s = fut.result()
            if s is not None:
                results.append((r["label"], s, r["questionText"], r["text"]))
            done += 1
            if done % 20 == 0:
                print(f"  {done}/{len(sample)} ({(time.time()-t0)/60:.1f}分)", flush=True)

    by_lab = collections.defaultdict(list)
    for lab, s, _, _ in results: by_lab[lab].append(s)
    print("\n=== ラベル別 平均スコア ===")
    print(f"{'label':16}{'n':>5}{'mean':>8}{'min':>5}{'max':>5}")
    for lab in ["genuine_high", "genuine_mid", "low_effort", "off_topic"]:
        v = by_lab.get(lab, [])
        if v:
            print(f"{lab:16}{len(v):5}{statistics.mean(v):8.1f}{min(v):5}{max(v):5}")
    gen = [s for lab, s, _, _ in results if lab.startswith("genuine")]
    bad = [s for lab, s, _, _ in results if not lab.startswith("genuine")]
    print(f"\ngenuine 平均 = {statistics.mean(gen):.1f}  (n={len(gen)})")
    if bad: print(f"非genuine 平均 = {statistics.mean(bad):.1f}  (n={len(bad)})")

    out = _HERE / "tune_result.jsonl"
    with open(out, "w", encoding="utf-8") as f:
        for lab, s, q, a in results:
            f.write(json.dumps({"label": lab, "score": s, "q": q, "a": a}, ensure_ascii=False) + "\n")
    print(f"\n詳細: {out}")

if __name__ == "__main__":
    main()
