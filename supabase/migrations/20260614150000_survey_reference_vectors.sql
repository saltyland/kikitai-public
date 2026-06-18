-- 参照ベクトル方式（設計書 §13.2）のための列を surveys に追加する。
-- 作成・公開時にローカルエンコーダで生成した「設問ごとの参照ベクトル群」を保存し、
-- 回答時のローカル関連性判定（外部API呼び出しなし）に使う。
--
-- 形式は固定長ベクトルの集合を JSONB で保持する（lib/domain/quality/referenceVector.ts の
-- SurveyReferenceVectors と対応）。bytea ではなく JSONB を採用する理由:
--   - 設問ごとに可変個（領域化＝複数アンカー）のベクトルを持つネスト構造のため。
--   - エンコーダID・次元・生成時刻などのメタも同じ列に自己記述的に保持できる。
--   - 外部AIへは送らないローカル限定データであり、検索より読み出し一括が主用途。
--
-- 冪等（再実行安全）。

alter table public.surveys
  add column if not exists reference_vectors jsonb;

comment on column public.surveys.reference_vectors is
  '参照ベクトル群（設計書§13.2）。{encoderId,dim,generatedAt,questions:[{questionOrder,questionText,questionVector,anchors,keyConcepts}]}。同一ローカルエンコーダで生成（補正2）。回答時の関連性判定に使用。';
