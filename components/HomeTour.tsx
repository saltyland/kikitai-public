'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

/**
 * 初回サインイン直後のホーム画面で、画面を暗転させながら主要パーツを
 * 順番にスポットライトで解説するコーチマーク。
 *
 * - `?tour=1` 付きで遷移してきたときだけ起動（オンボーディング完了時に付与）。
 * - 一度完了/スキップすると localStorage で再表示を抑止する。
 * - 解説対象は本文側の `data-tour="..."` 属性で指定し、DOM に無い/非表示の
 *   ステップは自動でスキップ（PC/スマホでヘッダー構成が変わるため）。
 */

const STORAGE_KEY = 'kk_home_tour_done_v1';

interface Step {
  /** data-tour の値 */
  target: string;
  title: string;
  body: string;
  /** スポットライトの角丸（px） */
  radius?: number;
}

const STEPS: Step[] = [
  {
    target: 'points',
    title: 'ここに「ポイント」が貯まります',
    body: 'アンケートに答えると増えていきます。貯めたポイントで、自分のアンケートに回答者を集められます。',
    radius: 999,
  },
  {
    target: 'search',
    title: 'アンケートを「検索」',
    body: 'キーワードから、答えたいアンケートや気になる研究テーマを探せます。',
  },
  {
    target: 'notifications',
    title: '「お知らせ」はここ',
    body: '自分のアンケートに回答が届いたときや、ポイントの確定などをここで受け取れます。',
    radius: 999,
  },
  {
    target: 'answer',
    title: 'ここのアンケートに「回答」してポイントを貯めよう',
    body: 'あなたへのおすすめから、すきま時間に1問ずつ。回答するほどポイントが貯まります。',
    radius: 20,
  },
  {
    target: 'my-surveys',
    title: 'ここから「自分のアンケート」を作成・管理',
    body: '新しいアンケートを作ったり、集まった回答や結果を確認したりできます。',
    radius: 20,
  },
  {
    target: 'profile',
    title: 'プロフィール・設定はここ',
    body: 'プロフィールの編集やログアウトなど、各種メニューを開けます。これで案内はおしまいです！',
    radius: 999,
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** data-tour に一致する、実際に表示されている最初の要素を返す */
function findVisible(target: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`);
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export default function HomeTour() {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [steps, setSteps] = useState<Step[]>([]);
  const [rect, setRect] = useState<Rect | null>(null);

  const cleanUrl = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('tour');
    window.history.replaceState({}, '', url.toString());
  }, []);

  // 起動判定（?tour=1 かつ 未完了）。DOM に存在するステップだけ採用する。
  // ※ 表示サイズの確認は計測側で行う（タブ非アクティブ時は rect が 0 になるため、
  //   ここでは「DOM に存在するか」だけで判断して取りこぼさない）。
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const wants = params.get('tour') === '1';
    const done = window.localStorage.getItem(STORAGE_KEY) === '1';
    if (!wants || done) {
      // URL から tour パラメータだけ消しておく（リロードで再起動しないように）
      if (wants) cleanUrl();
      return;
    }
    // 同期 setState の連鎖を避けるため、次のタスクで起動する
    const t = setTimeout(() => {
      const usable = STEPS.filter((s) =>
        document.querySelector(`[data-tour="${s.target}"]`)
      );
      if (usable.length === 0) {
        cleanUrl();
        return;
      }
      setSteps(usable);
      setActive(true);
    }, 0);
    return () => clearTimeout(t);
  }, [cleanUrl]);

  const finish = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, '1');
    cleanUrl();
    setActive(false);
  }, [cleanUrl]);

  const measure = useCallback(() => {
    if (!active || steps.length === 0) return;
    const step = steps[index];
    const el = findVisible(step.target);
    if (!el) return; // 取れなければ前回の rect を保持（リトライに任せる）
    const r = el.getBoundingClientRect();
    const pad = 8;
    setRect({
      top: r.top - pad,
      left: r.left - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    });
  }, [active, steps, index]);

  // ステップ移動時：対象を画面内に入れてから採寸。
  // 対象がまだ表示されない場合は数回リトライし、それでも測れなければ次のステップへ自動スキップ。
  useLayoutEffect(() => {
    if (!active || steps.length === 0) return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const attempt = () => {
      const el = findVisible(steps[index].target);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        timer = setTimeout(measure, 320);
        return;
      }
      tries += 1;
      if (tries >= 8) {
        // 対象が見つからない（PC/スマホ差・未表示など）→ 次へ送る
        if (index >= steps.length - 1) finish();
        else setIndex((i) => i + 1);
        return;
      }
      timer = setTimeout(attempt, 150);
    };
    // 直前ステップのスポットライト（rect）はあえて消さずに保持し、計測でき次第
    // 新しい位置へ更新する。こうすると一旦中央に表示してから対象へ動く挙動を防げる。
    timer = setTimeout(() => {
      attempt();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index, steps, measure]);

  // リサイズ・スクロール追従
  useEffect(() => {
    if (!active) return;
    const onChange = () => measure();
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, [active, measure]);

  const next = () => {
    if (index >= steps.length - 1) finish();
    else setIndex((i) => i + 1);
  };
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  if (!active || steps.length === 0) return null;

  const step = steps[index];
  const isLast = index === steps.length - 1;

  // ラベルカードの配置：対象の下に余裕があれば下、なければ上
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
  const CARD_W = Math.min(320, vw - 24);
  let cardTop = 0;
  let cardLeft = 12;
  if (rect) {
    const below = rect.top + rect.height + 12;
    const placeBelow = below + 180 < vh;
    cardTop = placeBelow ? below : Math.max(12, rect.top - 12 - 180);
    cardLeft = Math.min(
      Math.max(12, rect.left + rect.width / 2 - CARD_W / 2),
      vw - CARD_W - 12
    );
  }

  return (
    <div className="fixed inset-0 z-[60]" aria-live="polite" role="dialog" aria-modal="true">
      {/* クリックを吸収する透明レイヤー（背後を誤操作させない） */}
      <button
        type="button"
        aria-label="案内を閉じる"
        onClick={finish}
        className="absolute inset-0 h-full w-full cursor-default bg-transparent"
      />

      {/* スポットライト（周囲を box-shadow で暗転） */}
      {rect && (
        <div
          className="pointer-events-none absolute transition-all duration-300 ease-out"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: step.radius ?? 14,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.72)',
            outline: '2px solid rgba(45, 212, 191, 0.9)',
          }}
        />
      )}
      {/* 対象が測れない場合は全面を暗転だけ */}
      {!rect && <div className="pointer-events-none absolute inset-0 bg-slate-900/70" />}

      {/* 解説カード（対象の位置が取れてから表示する。中央表示はしない） */}
      {rect && (
      <div
        className="absolute w-[var(--w)] rounded-2xl border border-brand-100 bg-white p-4 shadow-2xl"
        style={
          {
            top: cardTop,
            left: cardLeft,
            ['--w' as string]: `${CARD_W}px`,
          } as React.CSSProperties
        }
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-widest text-brand-500">
            ガイド {index + 1}/{steps.length}
          </span>
          <button
            type="button"
            onClick={finish}
            className="text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            スキップ
          </button>
        </div>
        <h3 className="mt-2 text-base font-extrabold leading-snug text-slate-900">
          {step.title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-5 bg-brand-500' : 'w-1.5 bg-slate-200'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={prev}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100"
              >
                戻る
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="btn-3d btn-3d-primary rounded-lg px-4 py-1.5 text-sm font-bold"
            >
              {isLast ? '始める' : '次へ'}
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
