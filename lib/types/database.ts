/**
 * ドメイン型定義
 * DBのテーブル構造とアプリ内で扱うエンティティの型をここに集約する。
 */

export type SurveyStatus = 'draft' | 'open' | 'closed';

/**
 * アンケートの公開範囲。
 *  - public   : 回答一覧に表示される（従来どおり）
 *  - unlisted : 一覧に出さず、共有リンクを知っている人のみアクセスできる
 */
export type SurveyVisibility = 'public' | 'unlisted';

/** 料金プラン。pro のみ統計解析モードを利用できる。 */
export type Plan = 'free' | 'pro';

/**
 * 設問タイプ。Googleフォーム相当の種類を網羅する。
 * 新タイプを足す場合は、ここに識別子を追加し、対応する QuestionTypeDefinition の
 * サブクラスを作ってレジストリに登録するだけでよい（開放閉鎖の原則）。
 */
export type QuestionType =
  | 'single' // ラジオボタン（単一選択）
  | 'multiple' // チェックボックス（複数選択）
  | 'dropdown' // プルダウン（単一選択）
  | 'text' // 記述式（短文）
  | 'paragraph' // 段落（長文）
  | 'date' // 日付
  | 'scale' // 均等目盛り（可変段階＋両端ラベル）
  | 'grid' // 選択式／チェックボックスグリッド
  | 'attention'; // アテンションチェック（正解選択肢つき単一選択。不正解で品質スコア0）

/** スケール設問の設定 */
export interface ScaleConfig {
  min: number;
  max: number;
  minLabel: string | null;
  maxLabel: string | null;
}

/** グリッド設問の設定。multiple=true でチェックボックスグリッド。 */
export interface GridConfig {
  rows: string[];
  columns: string[];
  multiple: boolean;
}

/** アテンションチェック設問の設定。正解以外を選んだ回答は品質スコア0になる。 */
export interface AttentionConfig {
  /** 正解の選択肢テキスト（options のいずれかと一致すること） */
  correctOptionText: string;
}

/** 設問タイプ別の追加設定（DBには config jsonb として保存する） */
export type QuestionConfig = ScaleConfig | GridConfig | AttentionConfig;

/**
 * 設問の表示条件（分岐ロジック）。
 * 「先行設問 sourceQuestionOrder で optionText の選択肢が選ばれた時だけ、この設問を表示する」。
 * null（未設定）の設問は常に表示。
 */
export interface QuestionCondition {
  /** 条件元となる先行設問の order_index */
  sourceQuestionOrder: number;
  /** その設問でこの選択肢テキストが選ばれていれば表示する */
  optionText: string;
}

/** セクション（ページ）メタ情報。survey.sections の各要素。 */
export interface SectionMeta {
  title: string;
  description: string;
}

/**
 * 非公開にできる属性名。ここに含めた属性はマッチング対象外になる代わりに
 * プロフィール充実ボーナス（+10pt/項目, 上限50pt）が付く（DESIGN_SPEC §3 逆インセンティブ）。
 */
export type PrivateField =
  | 'affiliation'
  | 'field'
  | 'age'
  | 'gender'
  | 'occupation'
  | 'grade'
  | 'major';

/** 非公開設定の対象となる属性の一覧（ボーナス計算・UI生成に使う） */
export const PRIVATE_FIELDS: PrivateField[] = [
  'affiliation',
  'field',
  'age',
  'gender',
  'occupation',
  'grade',
  'major',
];

/** SNSリンクの構造 */
export interface SnsLinks {
  twitter?: string;
  instagram?: string;
  github?: string;
  website?: string;
}

export interface Profile {
  id: string;
  nickname: string;
  /** アバター画像の公開URL（未設定は null → イニシャル表示） */
  avatar_url: string | null;
  affiliation: string | null;
  field: string | null;
  age: number | null;
  gender: string | null;
  occupation: string | null;
  grade: string | null;
  major: string | null;
  /** ポイント残高（point_lots の非期限切れ合計のキャッシュ） */
  points: number;
  /** 信頼スコア（0〜100, 既定70）。低品質回答で減点される。 */
  trust_score: number;
  /** 非公開にした属性名。マッチング対象外になる代わりにボーナスが付く。 */
  private_fields: PrivateField[];
  /** 料金プラン。pro のみ統計解析モードを利用できる。 */
  plan: Plan;
  /** SNSリンク（twitter/instagram/github/websiteのURL） */
  sns_links: SnsLinks;
  created_at: string;
}

/**
 * 他人から見えるプロフィール（public_profiles ビューの行）。
 * private_fields に含めた属性は null にマスクされ、
 * points / trust_score / plan / private_fields はそもそも含まれない。
 */
export interface PublicProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  affiliation: string | null;
  field: string | null;
  age: number | null;
  gender: string | null;
  occupation: string | null;
  grade: string | null;
  major: string | null;
  sns_links: SnsLinks;
  created_at: string;
}

/** アプリ内通知の種別。発火点を増やす場合はここに追加する。 */
export type NotificationType =
  | 'survey_goal_reached' // 自分のアンケートが目標回答数に到達
  | 'points_low' // 残高不足で公開に失敗
  | 'points_expiring'; // ポイント失効14日前

/** アプリ内通知（notifications テーブルの行） */
export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType | string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

/** ポイントの束（有効期限つき）。 */
export interface PointLot {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  granted_at: string;
  expires_at: string;
}

/** ポイント残高サマリ（表示用）。 */
export interface PointsSummary {
  /** 有効（期限内）ポイント合計 */
  available: number;
  /** 残り14日以内に期限切れになる束 */
  expiringSoon: { amount: number; expires_at: string }[];
}

/**
 * 属性マッチング配信の条件。null/全項目未設定＝全員に配信。
 * 回答者が該当属性を非公開（private_fields）にしている場合は「不明」となり、
 * 条件を満たさない扱いになる（逆インセンティブ設計）。
 */
export interface TargetConditions {
  ageMin?: number | null;
  ageMax?: number | null;
  /** 許可する性別（空＝制限なし） */
  genders?: string[];
  /** 許可する職業（空＝制限なし） */
  occupations?: string[];
}

export interface Survey {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  required_count: number;
  deadline: string | null;
  status: SurveyStatus;
  /** ページ分割。空配列＝単一ページ。 */
  sections: SectionMeta[];
  /** インフォームドコンセント文。回答画面冒頭の同意ゲートに表示する。 */
  consent_text: string | null;
  /** 属性マッチング配信の条件。null＝全員に配信。 */
  target_conditions: TargetConditions | null;
  /** 回答者に要求する最低信頼スコア。null＝制限なし。 */
  min_trust_score: number | null;
  /** データ保持期限。超過した回答はバッチで自動削除される。null＝無期限。 */
  retention_until: string | null;
  /** 共有リンク用トークン（/s/<token>）。DBが自動生成する。 */
  share_token: string;
  /** 公開範囲。unlisted は一覧非表示（リンクを知っている人のみ）。 */
  visibility: SurveyVisibility;
  /**
   * 共有リンク経由の回答をポイント付与なし（0pt）にするか。
   * unlisted アンケートで有効。true の場合、ログイン済み回答でも0pt。
   */
  share_link_no_reward: boolean;
  created_at: string;
}

export interface Question {
  id: string;
  survey_id: string;
  type: QuestionType;
  text: string;
  description: string | null;
  required: boolean;
  config: QuestionConfig | null;
  /** 所属セクション（ページ）番号。0始まり。 */
  section_index: number;
  order_index: number;
  /** 表示条件（分岐）。null は常に表示。 */
  condition: QuestionCondition | null;
}

export interface Option {
  id: string;
  question_id: string;
  text: string;
  order_index: number;
}

export interface ResponseSession {
  id: string;
  survey_id: string;
  /** 回答者のユーザーID。ゲスト回答（共有リンク経由）は null。 */
  user_id: string | null;
  /** 回答所要時間（秒）。クライアント計測のため参考値。 */
  duration_sec: number | null;
  created_at: string;
}

export interface Answer {
  id: string;
  response_id: string;
  question_id: string;
  option_id: string | null;
  text_answer: string | null;
  /** グリッド設問の行ラベル（行ごとに1回答行） */
  row_label: string | null;
}

/** 設問＋選択肢をまとめた集約型 */
export interface QuestionWithOptions extends Question {
  options: Option[];
}

/** アンケート＋設問をまとめた集約型 */
export interface SurveyWithQuestions extends Survey {
  questions: QuestionWithOptions[];
}

/** 一覧カードのプレビュー用：設問の最小情報（テキスト・種別・選択肢） */
export interface PreviewQuestionLite {
  type: QuestionType;
  text: string;
  options: string[];
}

/** 一覧表示用：アンケート＋回答数 */
export interface SurveyWithStats extends Survey {
  response_count: number;
  author_id?: string;
  author_nickname?: string;
  /** 投稿者のアバター画像URL（未設定は null → イニシャル表示） */
  author_avatar_url?: string | null;
  /** カードに表示する設問プレビュー（先頭の数問のみ） */
  preview?: PreviewQuestionLite[];
  /** 全問回答した場合の平均獲得ポイント（平均品質×1.0時の目安） */
  avg_reward_points?: number;
  /** 全問回答した場合の最高獲得ポイント（高品質×1.5時） */
  max_reward_points?: number;
}

/** 編集フォームから受け取る設問の入力データ */
export interface QuestionInput {
  type: QuestionType;
  text: string;
  description: string | null;
  required: boolean;
  /** 選択肢（single/multiple/dropdown 用） */
  options: string[];
  /** タイプ別設定（scale/grid 用） */
  config: QuestionConfig | null;
  /** 所属セクション番号 */
  section_index: number;
  /** 表示条件（分岐）。null は常に表示。 */
  condition: QuestionCondition | null;
}

/** アンケート作成・更新の入力データ */
export interface SurveyInput {
  title: string;
  description: string | null;
  required_count: number;
  deadline: string | null;
  status: SurveyStatus;
  sections: SectionMeta[];
  questions: QuestionInput[];
  /** インフォームドコンセント文（公開するアンケートでは必須） */
  consent_text: string | null;
  /** 属性マッチング配信の条件。null＝全員に配信。 */
  target_conditions: TargetConditions | null;
  /** 回答者に要求する最低信頼スコア。null＝制限なし。 */
  min_trust_score: number | null;
  /** データ保持期間（月数）。null＝無期限。retention_until はサーバーで算出する。 */
  retention_months: number | null;
  /** 公開範囲。unlisted は一覧非表示（リンクを知っている人のみ）。 */
  visibility: SurveyVisibility;
  /** 共有リンク経由の回答を0ptにするか（unlisted のみ有効）。 */
  share_link_no_reward: boolean;
}

/** グリッド設問の1行分の回答（行ラベル→選択した列） */
export interface GridRowAnswer {
  row: string;
  columns: string[];
}

/** 回答送信の入力データ（question_idごとの回答） */
export interface AnswerInput {
  question_id: string;
  /** single/scale/dropdown: 単一option_id, multiple: option_id配列 */
  option_ids?: string[];
  /** text/paragraph/date: 文字列 */
  text_answer?: string;
  /** grid: 行ごとの選択 */
  grid_answers?: GridRowAnswer[];
}

/** 結果集計：設問ごとの集計 */
export interface QuestionAggregate {
  question: QuestionWithOptions;
  /** option_id -> 件数（選択式） */
  optionCounts: Record<string, number>;
  /** 自由記述・日付の回答テキスト一覧 */
  textAnswers: string[];
  /** グリッド集計：行ラベル -> 列ラベル -> 件数 */
  gridCounts?: Record<string, Record<string, number>>;
}
