#!/usr/bin/env python3
"""
Gemini採点スクリプト（並列版）
- グローバルレートリミッター: RATE_PER_MIN req/min（全スレッド共有）
- WORKERS スレッドで並列処理
- 推定所要時間: 残り件数 / RATE_PER_MIN 分
"""
import json, csv, time, urllib.request, urllib.error, os, pathlib, threading, statistics
from concurrent.futures import ThreadPoolExecutor, as_completed

# ── 環境変数ロード ──
_env = pathlib.Path(__file__).parent.parent / ".env.local"
if _env.exists():
    with open(_env, encoding="utf-8") as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _v = _line.split("=", 1)
                os.environ.setdefault(_k.strip(), _v.strip())

_SCRIPTS  = pathlib.Path(__file__).parent
API_KEY   = os.environ.get("REDACTED_API_KEY", "")
MODEL     = "gemini-1.5-flash"
URL       = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"
FEATURES  = str(_SCRIPTS / "features.jsonl")
LABELS_CSV= str(_SCRIPTS / "labels_remapped.csv")
OUTPUT    = str(_SCRIPTS / "features_with_llm.jsonl")
PROGRESS  = str(_SCRIPTS / "gemini_progress.json")

WORKERS      = 8    # 並列スレッド数
RATE_PER_MIN = 30   # 全スレッド合計の最大リクエスト数/分（429が出たら下げる）

PROMPT = """\
あなたはアンケート回答の品質を採点する採点官です。設問1問に対する回答1件を0〜100点で採点します。
positivity bias（甘め採点）も、逆に厳しすぎる過小評価も避け、設問の性質に合わせて公正に採点してください。

【最重要：設問の性質に合わせる（レジスタ適応）】
「日常・嗜好・経験」を尋ねるカジュアルな設問が多い。これらは長文・専門性・固有名詞を求めていない。
設問に正面から誠実に答えていれば、短い単語・一文でも十分に良い回答であり高く評価する。
長さ・流暢さ・固有名詞の有無そのものを減点理由にしない。判断の中心は「設問が訊いていることに
実際に答えているか」。

【点数の目安（連続0〜100。代表帯を狙う）】
- 設問に的確かつ具体的に答えた良い回答（自分の言葉・選択・経験・理由がある） → ≈90点。
- 設問に普通に答えている標準的な回答（短い一語でも設問にちゃんと答えていればここ） → ≈70点。
  ※Y/Nや二択・嗜好を訊く設問への誠実な「ない／いない／オフライン」等は非回答ではなく ≈70〜90点。
- 「なし」「特にない」「わからない」「覚えていない」「普通」、否定・はぐらかしで終える等、
  中身を求める設問への実質的な非回答 → 0〜15点（弾く帯）。短さではなく「答えていない」ことが理由。
- 設問と全く無関係（別の話題・雑談）・設問文の丸写し・コピペ・意味をなさない羅列 → 0〜15点（弾く帯）。

<survey_data>
{data}
</survey_data>

JSONのみ返答: {{"score": 整数0-100, "feedback": "1行コメント"}}
"""

# ── グローバルレートリミッター（全スレッド共有） ──
class RateLimiter:
    def __init__(self, rate_per_min):
        self._interval = 60.0 / rate_per_min
        self._lock = threading.Lock()
        self._last = 0.0

    def acquire(self):
        with self._lock:
            now = time.time()
            wait = self._last + self._interval - now
            if wait > 0:
                time.sleep(wait)
            self._last = time.time()

_rate = RateLimiter(RATE_PER_MIN)
_done = {}
_done_count = 0
_total = 0
_save_lock = threading.Lock()

def save_progress():
    with _save_lock:
        with open(PROGRESS, "w") as f:
            json.dump(_done, f)

def call_gemini(idx, question, answer, retries=4):
    data = json.dumps([{"question": question, "answer": answer}], ensure_ascii=False)
    body = json.dumps({
        "contents": [{"parts": [{"text": PROMPT.format(data=data)}]}],
        "generationConfig": {"temperature": 0, "responseMimeType": "application/json"}
    }).encode()
    for attempt in range(retries):
        _rate.acquire()  # レートリミット取得（全スレッド共有）
        try:
            req = urllib.request.Request(URL, data=body,
                  headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read())
            text = result["candidates"][0]["content"]["parts"][0]["text"]
            score = float(json.loads(text).get("score", 50))
            return (100 - max(0, min(100, score))) / 100
        except urllib.error.HTTPError as e:
            wait = 15 * (attempt + 1)
            print(f"  [idx={idx} HTTP {e.code}] {wait}s待機...", flush=True)
            time.sleep(wait)
        except Exception as ex:
            print(f"  [idx={idx} ERR] {ex}", flush=True)
            time.sleep(5)
    return 0.3

def process_item(args):
    global _done_count
    i, feat, row = args
    key = str(i)

    risk = call_gemini(i, row["questionText"], row["text"])

    with _save_lock:
        _done[key] = risk
        _done_count += 1
        cnt = _done_count
    if cnt % 10 == 0:
        save_progress()
        elapsed = time.time() - _start
        rpm = cnt / elapsed * 60
        eta = (_total - cnt) / max(rpm, 0.1)
        print(f"  {cnt}件完了 / {_total}件  ({rpm:.1f} RPM, 残り約{eta/60:.1f}分)", flush=True)

    return i, feat, risk

# ── データ読み込み ──
rows_csv = []
with open(LABELS_CSV, newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        if row["label"].strip():
            rows_csv.append(row)

rows_feat = []
with open(FEATURES, encoding="utf-8") as f:
    for line in f:
        rows_feat.append(json.loads(line))

assert len(rows_csv) == len(rows_feat)

if os.path.exists(PROGRESS):
    with open(PROGRESS) as f:
        _done = json.load(f)

_total = len(rows_feat)
_done_count = len(_done)
already = len(_done)
todo = [(i, rows_feat[i], rows_csv[i]) for i in range(_total) if str(i) not in _done]

print(f"対象: {_total}件 / 完了済み: {already}件 / 残り: {len(todo)}件", flush=True)
print(f"設定: {WORKERS}スレッド, {RATE_PER_MIN} RPM → 推定 {len(todo)/RATE_PER_MIN:.1f}分", flush=True)

results_map = dict(_done)
_start = time.time()

with ThreadPoolExecutor(max_workers=WORKERS) as exe:
    futures = {exe.submit(process_item, args): args[0] for args in todo}
    for fut in as_completed(futures):
        i, feat, risk = fut.result()
        results_map[str(i)] = risk

save_progress()

# ── 出力 ──
results = []
for i, feat in enumerate(rows_feat):
    feat["llmRisk"] = results_map[str(i)]
    results.append(feat)

with open(OUTPUT, "w", encoding="utf-8") as f:
    for r in results:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")

p = [r["llmRisk"] for r in results if r["shouldPenalize"]]
g = [r["llmRisk"] for r in results if not r["shouldPenalize"]]
print(f"\n[done] {OUTPUT}")
print(f"  llmRisk: penalize={statistics.mean(p):.4f}  genuine={statistics.mean(g):.4f}")
