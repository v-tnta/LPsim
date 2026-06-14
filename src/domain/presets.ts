import type { SimulationParams, Scenario } from './types';

/**
 * 額面年収 → 手取りの一般的な目安アンカー。
 * 特定個人の値ではなく、給与所得者のおおまかな手取り率の目安として用意しています。
 * (taxMode を 'anchor' に切り替えたときに使われます)
 */
const GENERIC_TAX_ANCHORS = [
  { salary: 300, takeHome: 240 }, // 約80%
  { salary: 500, takeHome: 390 }, // 約78%
  { salary: 700, takeHome: 530 }, // 約76%
  { salary: 1000, takeHome: 730 }, // 約73%
  { salary: 1500, takeHome: 1020 }, // 約68%
];

/**
 * 教育費の一般的な目安バンド (子どもの年齢 → 1人あたり年額)。
 * 幼稚園〜大学までの平均的な水準をベースにした初期値です。
 */
const GENERIC_EDUCATION_BANDS = [
  { ageStart: 0, ageEnd: 5, cost: 30 },
  { ageStart: 6, ageEnd: 11, cost: 40 },
  { ageStart: 12, ageEnd: 14, cost: 60 },
  { ageStart: 15, ageEnd: 17, cost: 80 },
  { ageStart: 18, ageEnd: 22, cost: 120 },
];

/**
 * アプリ起動時のデフォルト（空）パラメータ。
 * 特定の人物のライフプランは登録せず、誰でもそのまま自分の数値に
 * 置き換えられるニュートラルな初期値だけを持たせています。
 * 結婚・子ども・住宅購入・車・イベントなどの「個人の予定」は未設定です。
 */
export const DEFAULT_PARAMS: SimulationParams = {
  // 基本
  startAge: 30,
  endAge: 90, // 老後まで含めて試算
  initialAsset: 0,
  inflationRate: 0, // 既定は「今の価値」で表示。必要ならスライダーで上げる

  // 収入（1行だけの雛形。ユーザーが自分の年収に置き換える前提）
  incomeCurve: [{ age: 30, salary: 400 }],
  salaryCap: 2000, // 実質的に上限なし
  workEndAge: 64, // 65歳から年金を受け取る前提で64歳まで給与
  taxMode: 'rate',
  taxAnchors: GENERIC_TAX_ANCHORS,
  taxRate: 80, // 手取りざっくり80%
  isFirstYearNoResidentTax: false,
  spouseIncomeStartAge: null,
  spouseIncomeAmount: 0,
  retirementAge: null,
  retirementAmount: 0,
  taxRetirement: true,
  pensionStartAge: 65, // 65歳から年金
  pensionAnnual: 240, // ざっくり想定（月20万・世帯）

  // 税・控除
  isNisa: true, // 運用益は非課税(NISA)を既定に
  idecoAnnual: 0,
  mortgageDeduction: true,
  mortgageDeductionYears: 13,

  // 住宅（初期は賃貸。購入予定は未設定）
  buyAge: null,
  propertyPrice: 4000,
  downPayment: 500,
  loanAmount: 3500,
  interestRate: 1.0,
  loanTerm: 35,
  maintenanceCost: 30,
  rentBeforeBuy: 96, // 月8万円のざっくり想定
  countHomeAsAsset: true,
  homeDepreciationRate: 1.0, // 評価額 年1%減価

  // 生活費（家賃以外の基礎生活費のざっくり想定）
  basicLivingCost: 180, // 月15万円
  tempExtraLivingCost: null,
  spouseLivingCost: 60,
  marriageAge: null,
  childLivingCost: 30,

  // 子ども・教育費（初期は子どもなし）
  childrenBirthAges: [],
  educationCostBand: GENERIC_EDUCATION_BANDS,

  // 車（初期はなし）
  carPurchases: [],
  carMaintenances: [],

  // 一時イベント（初期はなし）
  tempEvents: [],

  // 運用（初期はオフ）
  isInvestmentEnabled: false,
  investmentRate: 50,
  investmentYield: 3,
};

/**
 * 「サンプルを読み込む」ボタン用の記入例。
 * 23歳・年収450万スタートの会社員が、結婚・出産・住宅購入を経て
 * 65歳まで過ごすケースの一例です（あくまでデモ用の数値）。
 */
export const SAMPLE_PARAMS: SimulationParams = {
  startAge: 23,
  endAge: 65,
  initialAsset: 0,
  inflationRate: 0, // サンプルは旧仕様どおり（インフレなし）

  // ITエンジニア・評価A(賞与率25%)・標準成長のグレード別年収。
  // G1(23-26)→G2(27-31)→G3(32-39)→G4(40-)で昇格し、46歳で1,050万に到達後プラトー。
  incomeCurve: [
    { age: 23, salary: 450 }, // G1 スタート
    { age: 26, salary: 540 }, // G1 上限
    { age: 27, salary: 570 }, // G2 昇格
    { age: 31, salary: 735 }, // G2 上限
    { age: 32, salary: 765 }, // G3 昇格
    { age: 39, salary: 953 }, // G3 上限
    { age: 40, salary: 960 }, // G4 昇格
    { age: 46, salary: 1050 }, // G4 プラトー(以降65歳まで横ばい)
  ],
  salaryCap: 1100,
  workEndAge: null,
  taxMode: 'anchor',
  taxAnchors: [
    { salary: 480, takeHome: 354 },
    { salary: 600, takeHome: 421 },
    { salary: 700, takeHome: 481 },
    { salary: 925, takeHome: 615 },
    { salary: 1100, takeHome: 711 },
  ],
  taxRate: 75,
  isFirstYearNoResidentTax: true,
  spouseIncomeStartAge: null,
  spouseIncomeAmount: 0,
  retirementAge: null,
  retirementAmount: 0,
  taxRetirement: false,
  pensionStartAge: null,
  pensionAnnual: 0,

  // 税・控除（サンプルは旧仕様どおり全てオフ）
  isNisa: true,
  idecoAnnual: 0,
  mortgageDeduction: false,
  mortgageDeductionYears: 13,

  buyAge: 27,
  propertyPrice: 4000,
  downPayment: 300,
  loanAmount: 4000,
  interestRate: 1.5,
  loanTerm: 35,
  maintenanceCost: 30,
  rentBeforeBuy: 84,
  countHomeAsAsset: false,
  homeDepreciationRate: 1.0,

  basicLivingCost: 126,
  tempExtraLivingCost: { startAge: 23, endAge: 25, amount: 20 },
  spouseLivingCost: 50,
  marriageAge: 24,
  childLivingCost: 15,

  childrenBirthAges: [29, 33],
  educationCostBand: [
    { ageStart: 0, ageEnd: 6, cost: 50 },
    { ageStart: 7, ageEnd: 12, cost: 80 },
    { ageStart: 13, ageEnd: 15, cost: 100 },
    { ageStart: 16, ageEnd: 18, cost: 170 },
    { ageStart: 19, ageEnd: 19, cost: 160 },
    { ageStart: 20, ageEnd: 22, cost: 120 },
  ],

  carPurchases: [
    { age: 33, price: 350 },
    { age: 43, price: 500 },
    { age: 53, price: 500 },
    { age: 63, price: 500 },
  ],
  carMaintenances: [
    { age: 33, cost: 5 },
    { age: 43, cost: 10 },
  ],

  tempEvents: [
    { id: 'marriage-ceremony', age: 24, name: '結婚式', amount: 120 },
  ],

  isInvestmentEnabled: false,
  investmentRate: 50,
  investmentYield: 3,
};

/**
 * プリセットシナリオは持たせません（初期登録データなし）。
 * 比較したいシナリオはユーザーが「現在の条件を保存」して作成します。
 */
export const PRESET_SCENARIOS: Scenario[] = [];
