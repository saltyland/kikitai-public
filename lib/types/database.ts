/**
 * ドメイン型定義
 * DBのテーブル構造とアプリ内で扱うエンティティの型をここに集約する。
 */

export type SurveyStatus = 'draft' | 'open' | 'closed';
export type QuestionType = 'single' | 'multiple' | 'text' | 'scale';

export interface Profile {
  id: string;
  nickname: string;
  affiliation: string | null;
  field: string | null;
  created_at: string;
}

export interface Survey {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  required_count: number;
  deadline: string | null;
  status: SurveyStatus;
  created_at: string;
}

export interface Question {
  id: string;
  survey_id: string;
  type: QuestionType;
  text: string;
  order_index: number;
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
  user_id: string;
  created_at: string;
}

export interface Answer {
  id: string;
  response_id: string;
  question_id: string;
  option_id: string | null;
  text_answer: string | null;
}

/** 設問＋選択肢をまとめた集約型 */
export interface QuestionWithOptions extends Question {
  options: Option[];
}

/** アンケート＋設問をまとめた集約型 */
export interface SurveyWithQuestions extends Survey {
  questions: QuestionWithOptions[];
}

/** 一覧表示用：アンケート＋回答数 */
export interface SurveyWithStats extends Survey {
  response_count: number;
  author_nickname?: string;
}

/** 編集フォームから受け取る設問の入力データ */
export interface QuestionInput {
  type: QuestionType;
  text: string;
  options: string[];
}

/** アンケート作成・更新の入力データ */
export interface SurveyInput {
  title: string;
  description: string | null;
  required_count: number;
  deadline: string | null;
  status: SurveyStatus;
  questions: QuestionInput[];
}

/** 回答送信の入力データ（question_idごとの回答） */
export interface AnswerInput {
  question_id: string;
  /** single/scale: 単一option_id, multiple: option_id配列, text: 文字列 */
  option_ids?: string[];
  text_answer?: string;
}

/** 結果集計：設問ごとの集計 */
export interface QuestionAggregate {
  question: QuestionWithOptions;
  /** option_id -> 件数 */
  optionCounts: Record<string, number>;
  /** 自由記述の回答テキスト一覧 */
  textAnswers: string[];
}
