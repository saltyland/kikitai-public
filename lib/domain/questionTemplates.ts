import type { GridConfig, QuestionType, ScaleConfig } from '@/lib/types/database';

/**
 * 設問テンプレート1件分の「種」。SurveyEditor はこれを EditorQuestion に展開して挿入する。
 * key / section_index / condition は挿入時に付与するため持たない。
 */
export interface QuestionSeed {
  type: QuestionType;
  text: string;
  description?: string;
  required?: boolean;
  options?: string[];
  config?: Partial<ScaleConfig & GridConfig>;
}

/** 1つのテンプレート（複数設問をまとめて挿入できる）。 */
export interface QuestionTemplate {
  id: string;
  name: string;
  hint: string;
  questions: QuestionSeed[];
}

export interface TemplateGroup {
  id: string;
  label: string;
  templates: QuestionTemplate[];
}

const likert5 = (text: string): QuestionSeed => ({
  type: 'scale',
  text,
  required: true,
  config: { min: 1, max: 5, minLabel: '全くそう思わない', maxLabel: 'とてもそう思う' },
});

/**
 * 組み込みテンプレート群。デモグラフィック・心理尺度・リッカートなどを
 * ワンクリックで挿入できるようにする。
 */
export const TEMPLATE_GROUPS: TemplateGroup[] = [
  {
    id: 'demographic',
    label: 'デモグラフィック（属性）',
    templates: [
      {
        id: 'age',
        name: '年齢',
        hint: '年代を1つ選ぶ',
        questions: [
          {
            type: 'single',
            text: 'あなたの年齢を教えてください',
            required: true,
            options: ['10代', '20代', '30代', '40代', '50代', '60代以上'],
          },
        ],
      },
      {
        id: 'gender',
        name: '性別',
        hint: '任意回答の単一選択',
        questions: [
          {
            type: 'single',
            text: 'あなたの性別を教えてください',
            description: '回答は任意です。',
            options: ['女性', '男性', 'その他', '回答しない'],
          },
        ],
      },
      {
        id: 'occupation',
        name: '職業',
        hint: 'リストから選ぶ',
        questions: [
          {
            type: 'dropdown',
            text: 'あなたの職業に最も近いものを選んでください',
            required: true,
            options: ['学生', '会社員', '公務員', '自営業', '専門職', '主婦・主夫', '無職', 'その他'],
          },
        ],
      },
      {
        id: 'demographic-set',
        name: '属性セット（年齢＋性別＋職業）',
        hint: '3問まとめて挿入',
        questions: [
          {
            type: 'single',
            text: 'あなたの年齢を教えてください',
            required: true,
            options: ['10代', '20代', '30代', '40代', '50代', '60代以上'],
          },
          {
            type: 'single',
            text: 'あなたの性別を教えてください',
            description: '回答は任意です。',
            options: ['女性', '男性', 'その他', '回答しない'],
          },
          {
            type: 'dropdown',
            text: 'あなたの職業に最も近いものを選んでください',
            required: true,
            options: ['学生', '会社員', '公務員', '自営業', '専門職', '主婦・主夫', '無職', 'その他'],
          },
        ],
      },
    ],
  },
  {
    id: 'likert',
    label: 'リッカート尺度',
    templates: [
      {
        id: 'likert5-agree',
        name: '5段階（同意度）',
        hint: '全くそう思わない〜とてもそう思う',
        questions: [likert5('この内容についてどの程度そう思いますか')],
      },
      {
        id: 'likert5-satisfaction',
        name: '5段階（満足度）',
        hint: '不満〜満足',
        questions: [
          {
            type: 'scale',
            text: '全体的な満足度を教えてください',
            required: true,
            config: { min: 1, max: 5, minLabel: '不満', maxLabel: '満足' },
          },
        ],
      },
      {
        id: 'likert7',
        name: '7段階尺度',
        hint: 'より細かい同意度',
        questions: [
          {
            type: 'scale',
            text: 'この意見にどの程度同意しますか',
            required: true,
            config: { min: 1, max: 7, minLabel: '全く同意しない', maxLabel: '強く同意する' },
          },
        ],
      },
      {
        id: 'likert-grid',
        name: 'リッカートグリッド',
        hint: '複数項目をまとめて5段階評価',
        questions: [
          {
            type: 'grid',
            text: '次の各項目について、当てはまる程度を選んでください',
            required: true,
            config: {
              rows: ['使いやすい', '分かりやすい', 'また利用したい'],
              columns: ['全くそう思わない', 'そう思わない', 'どちらでもない', 'そう思う', 'とてもそう思う'],
              multiple: false,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'psych',
    label: '心理尺度',
    templates: [
      {
        id: 'satisfaction-with-life',
        name: '人生満足尺度（短縮）',
        hint: 'SWLS 風の5項目（7段階）',
        questions: [
          'ほとんどの面で、私の人生は理想に近い',
          '私の人生は、とても良い状態だ',
          '私は自分の人生に満足している',
          'これまでに、人生で大切だと思うものを得てきた',
          'もう一度人生をやり直せるとしても、ほとんど何も変えないだろう',
        ].map((t) => ({
          type: 'scale' as const,
          text: t,
          required: true,
          config: { min: 1, max: 7, minLabel: '全く当てはまらない', maxLabel: 'とても当てはまる' },
        })),
      },
      {
        id: 'self-esteem',
        name: '自尊感情（短縮）',
        hint: 'ローゼンバーグ風の4項目（4段階）',
        questions: [
          '私は自分に満足している',
          '私には良いところがたくさんあると思う',
          '私は物事を人並みにはこなせる',
          '私は自分自身に対して前向きな態度をとっている',
        ].map((t) => ({
          type: 'scale' as const,
          text: t,
          required: true,
          config: { min: 1, max: 4, minLabel: '当てはまらない', maxLabel: '当てはまる' },
        })),
      },
      {
        id: 'stress',
        name: 'ストレス自覚（短縮）',
        hint: '直近1か月の状態（5段階）',
        questions: [
          {
            type: 'grid',
            text: 'この1か月の状態について、当てはまる程度を選んでください',
            required: true,
            config: {
              rows: ['気持ちに余裕がなかった', 'いらいらした', 'よく眠れなかった', '気分が落ち込んだ'],
              columns: ['全くない', 'まれにある', 'ときどきある', 'よくある', 'いつもある'],
              multiple: false,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'open',
    label: '自由記述・その他',
    templates: [
      {
        id: 'free-comment',
        name: '自由記述',
        hint: '長文の意見',
        questions: [{ type: 'paragraph', text: 'ご意見・ご感想を自由にお書きください' }],
      },
      {
        id: 'nps',
        name: '推奨度（NPS）',
        hint: '0〜10段階',
        questions: [
          {
            type: 'scale',
            text: 'このサービスを友人や同僚にどの程度すすめたいですか',
            required: true,
            config: { min: 0, max: 10, minLabel: '全くすすめたくない', maxLabel: 'ぜひすすめたい' },
          },
        ],
      },
    ],
  },
];

/** localStorage に保存するマイテンプレートのキー */
export const MY_TEMPLATES_KEY = 'kikitai-my-templates';
