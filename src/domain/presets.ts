import type { SimulationParams, Scenario } from './types';

// デフォルトのシミュレーションパラメータ
export const DEFAULT_PARAMS: SimulationParams = {
  // 基本
  startAge: 23,
  endAge: 65,
  initialAsset: 0,

  // 収入
  incomeCurve: [
    { age: 23, salary: 450 },
    { age: 24, salary: 480 },
    { age: 26, salary: 550 },
    { age: 27, salary: 600 },
    { age: 29, salary: 700 },
    { age: 31, salary: 825 },
    { age: 33, salary: 925 },
    { age: 35, salary: 1000 },
    { age: 37, salary: 1100 },
  ],
  salaryCap: 1100,
  taxMode: 'anchor',
  taxAnchors: [
    { salary: 480, takeHome: 354 },
    { salary: 600, takeHome: 421 },
    { salary: 700, takeHome: 481 },
    { salary: 925, takeHome: 615 },
    { salary: 1100, takeHome: 711 },
  ],
  taxRate: 75, // 一律手取り率の場合 75%
  isFirstYearNoResidentTax: true,
  spouseIncomeStartAge: null, // 例: 35
  spouseIncomeAmount: 0, // 例: 110
  retirementAge: null,
  retirementAmount: 0,

  // 住宅
  buyAge: 27,
  propertyPrice: 5000,
  downPayment: 300,
  loanAmount: 5000,
  interestRate: 1.5,
  loanTerm: 35,
  maintenanceCost: 30,
  rentBeforeBuy: 84,

  // 生活費
  basicLivingCost: 126,
  tempExtraLivingCost: { startAge: 23, endAge: 25, amount: 20 },
  spouseLivingCost: 50,
  marriageAge: 24,
  childLivingCost: 15,

  // 子ども・教育費
  childrenBirthAges: [29, 33],
  educationCostBand: [
    { ageStart: 0, ageEnd: 6, cost: 50 },
    { ageStart: 7, ageEnd: 12, cost: 80 },
    { ageStart: 13, ageEnd: 15, cost: 100 },
    { ageStart: 16, ageEnd: 18, cost: 170 },
    { ageStart: 19, ageEnd: 19, cost: 160 },
    { ageStart: 20, ageEnd: 22, cost: 120 },
  ],

  // 車
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

  // 一時イベント
  tempEvents: [
    { id: 'marriage-ceremony', age: 24, name: '結婚式', amount: 120 },
  ],

  // 運用
  isInvestmentEnabled: false,
  investmentRate: 50, // 年間貯蓄の50%を投資
  investmentYield: 3, // 実質年率3%
};

// プリセットシナリオの一覧
export const PRESET_SCENARIOS: Scenario[] = [
  {
    id: 'base',
    name: 'ベース',
    params: { ...DEFAULT_PARAMS },
    color: '#6366f1', // Indigo
    dashStyle: 'solid',
  },
  {
    id: 'interest-4%',
    name: '金利4%',
    params: {
      ...DEFAULT_PARAMS,
      interestRate: 4.0,
    },
    color: '#f43f5e', // Rose
    dashStyle: 'dashed',
  },
  {
    id: 'salary-cap-850',
    name: '年収850万頭打ち',
    params: {
      ...DEFAULT_PARAMS,
      salaryCap: 850,
    },
    color: '#eab308', // Amber
    dashStyle: 'dotted',
  },
];
