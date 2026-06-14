export interface IncomeAnchor {
  age: number;
  salary: number; // 万円
}

export interface TaxAnchor {
  salary: number; // 額面(万円)
  takeHome: number; // 手取り(万円)
}

export interface CarPurchase {
  age: number;
  price: number; // 万円
}

export interface CarMaintenance {
  age: number;
  cost: number; // 年額(万円)
}

export interface TempEvent {
  id: string; // 編集しやすくするために一意のIDを付与
  age: number;
  name: string;
  amount: number; // 万円
}

export interface SimulationParams {
  // 基本
  startAge: number;
  endAge: number;
  initialAsset: number;
  inflationRate: number; // 物価上昇率(年率%)。生活費・家賃・教育費・住宅維持費を年々膨らませる

  // 収入
  incomeCurve: IncomeAnchor[];
  salaryCap: number; // 年収上限(万円)
  workEndAge: number | null; // 給与収入の最終年齢(これ以降は給与0)。nullで停止なし
  selfIncomePause: { startAge: number; endAge: number } | null; // 本人の収入一時中断(育休など)。期間中は給与0。nullで中断なし
  taxMode: 'anchor' | 'rate'; // アンカー補間か一律率か
  taxAnchors: TaxAnchor[];
  taxRate: number; // 一律手取り率 (%)
  isFirstYearNoResidentTax: boolean; // 初年度住民税なしオプション
  spouseIncomeStartAge: number | null; // 配偶者収入開始年齢 (nullは無し)
  spouseIncomeEndAge: number | null; // 配偶者が収入を辞める年齢(これ以降は0)。nullで停止なし
  spouseIncomePause: { startAge: number; endAge: number } | null; // 配偶者の収入一時中断(育休など)。期間中は0。nullで中断なし
  spouseIncomeAmount: number; // 年額(万円)
  retirementAge: number | null; // 退職金受取年齢 (nullは無し)
  retirementAmount: number; // 受取金額(万円・額面)
  taxRetirement: boolean; // 退職金に課税(退職所得控除を考慮)するか
  pensionStartAge: number | null; // 公的年金の受給開始年齢 (nullは年金なし)
  pensionAnnual: number; // 公的年金 年額(万円・世帯合計の想定)

  // 税・控除 (NISA / iDeCo / 住宅ローン控除)
  isNisa: boolean; // 運用益を非課税(NISA等)にするか。falseなら特定口座として運用益に課税
  idecoAnnual: number; // iDeCo 年間掛金(万円)。掛金×限界税率の節税ぶんを手取りに加算
  mortgageDeduction: boolean; // 住宅ローン控除を適用するか
  mortgageDeductionYears: number; // 住宅ローン控除の適用年数 (例: 13)

  // 住宅資産
  countHomeAsAsset: boolean; // 購入後の住宅を純資産に計上するか
  homeDepreciationRate: number; // 物件評価額の年間減価率(%)

  // 住宅
  buyAge: number | null; // 購入年齢 (nullは購入なし)
  propertyPrice: number; // 物件価格(万円)
  downPayment: number; // 頭金・諸費用の現金支出(万円)
  loanAmount: number; // 借入額(万円)
  interestRate: number; // 金利 (年利%)
  loanTerm: number; // 返済年数
  maintenanceCost: number; // 年間維持費・固定資産税(万円)
  rentBeforeBuy: number; // 購入前家賃(年額万円)

  // 生活費
  basicLivingCost: number; // 独身基礎生活費(家賃除く年額万円)
  tempExtraLivingCost: { startAge: number; endAge: number; amount: number } | null; // 期間限定上乗せ
  spouseLivingCost: number; // 配偶者加算(年額万円)
  marriageAge: number | null; // 結婚年齢(nullは独身)
  childLivingCost: number; // 子ども1人あたりの世帯スケール加算(年額万円)

  // 子ども・教育費
  childrenBirthAges: number[]; // 出生時の親年齢の配列
  educationCostBand: { ageStart: number; ageEnd: number; cost: number }[]; // 子どもの年齢範囲→年額

  // 車
  carPurchases: CarPurchase[];
  carMaintenances: CarMaintenance[];

  // 一時イベント
  tempEvents: TempEvent[];

  // 運用 (オプション)
  isInvestmentEnabled: boolean;
  investmentRate: number; // 年間貯蓄のうち投資に回す割合 (%)
  investmentYield: number; // 想定利回り (実質%)
}

export interface YearRow {
  age: number;
  salary: number;
  takeHome: number;
  spouseIncome: number;
  retirementPay: number;
  pensionIncome: number; // 公的年金
  basicLivingCost: number;
  housingCost: number;
  educationCost: number;
  carCost: number;
  eventCost: number;
  investmentYieldIncome: number; // 運用益
  annualBalance: number; // 年間収支
  cumulativeAsset: number; // 流動資産(現金+運用)。"資産が尽きる"判定はこれで行う
  cumulativeCash: number; // 現金部分
  cumulativeInvestment: number; // 運用資産部分
  homeValue: number; // 住宅評価額(購入後・減価考慮)
  homeEquity: number; // 住宅の純価値(評価額 - ローン残高)
  netWorth: number; // 純資産(流動資産 + 住宅純価値)
}

export interface Scenario {
  id: string;
  name: string;
  params: SimulationParams;
  color: string;
  dashStyle: string; // "solid" | "dashed" | "dotted" 等の表現
}
