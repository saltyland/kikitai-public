-- questions テーブルに品質シグナルメタデータ列を追加
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS signal_meta JSONB DEFAULT NULL;

COMMENT ON COLUMN questions.signal_meta IS
  '品質評価シグナルのメタ情報。
   role: standard | attention_check | consistency_anchor | consistency_check | open_signal
   pairKey: 一貫性ペアの識別子（consistency_anchor / consistency_check のみ使用）
   contradictsWith: 矛盾とみなす相手問の選択肢テキスト配列（consistency_check のみ）
   positiveOptions: anchorの肯定回答とみなす選択肢テキスト配列（consistency_anchor のみ）
   例: {"role": "consistency_anchor", "pairKey": "sleep_q1", "positiveOptions": ["毎日取れている"]}';
