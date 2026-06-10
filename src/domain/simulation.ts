import type { SimulationParams, YearRow, IncomeAnchor, TaxAnchor } from './types';

/**
 * 元利均等返済における年間のローン返済額を計算します。
 * 式: P * r * (1 + r)^n / ((1 + r)^n - 1) * 12
 * @param principal 借入額 (万円)
 * @param annualRatePct 年利 (%)
 * @param termYears 返済期間 (年)
 */
export const calculateAnnualLoanPayment = (
  principal: number,
  annualRatePct: number,
  termYears: number
): number => {
  if (principal <= 0 || termYears <= 0) return 0;
  if (annualRatePct <= 0) return principal / termYears;

  const r = (annualRatePct / 100) / 12; // 月利
  const n = termYears * 12; // 返済月数
  const monthly = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  
  // 年間返済額を万円単位で四捨五入 (要件定義の 184万, 266万 に合わせるため)
  return Math.round(monthly * 12);
};

/**
 * 指定年齢における額面年収を、年収カーブのアンカーから線形補間します。
 * @param age 本人年齢
 * @param curve 年収カーブのアンカー配列
 * @param salaryCap 年収上限 (頭打ち額)
 */
export const interpolateIncome = (
  age: number,
  curve: IncomeAnchor[],
  salaryCap: number
): number => {
  if (curve.length === 0) return 0;
  const sorted = [...curve].sort((a, b) => a.age - b.age);

  let rawSalary = 0;
  if (age <= sorted[0].age) {
    rawSalary = sorted[0].salary;
  } else if (age >= sorted[sorted.length - 1].age) {
    rawSalary = sorted[sorted.length - 1].salary;
  } else {
    // 該当する年齢区間を探して線形補間
    for (let i = 0; i < sorted.length - 1; i++) {
      const p1 = sorted[i];
      const p2 = sorted[i + 1];
      if (age >= p1.age && age <= p2.age) {
        rawSalary = p1.salary + ((age - p1.age) * (p2.salary - p1.salary)) / (p2.age - p1.age);
        break;
      }
    }
  }

  // 年収上限で頭打ちにする
  return Math.min(rawSalary, salaryCap);
};

/**
 * 額面年収に対応する手取り率をアンカーから補間し、手取り額を算出します。
 * @param salary 額面年収 (万円)
 * @param anchors 手取りアンカー配列
 */
export const interpolateTakeHome = (
  salary: number,
  anchors: TaxAnchor[]
): number => {
  if (salary <= 0) return 0;
  
  // 額面と手取り率 { salary, rate } の形でソート
  const sorted = anchors.map(a => ({
    salary: a.salary,
    rate: a.takeHome / a.salary
  })).sort((a, b) => a.salary - b.salary);

  // 0 -> 最小アンカーの手取り率 を先頭に補完して0付近の計算を安定させる
  if (sorted[0].salary > 0) {
    sorted.unshift({ salary: 0, rate: sorted[0].rate });
  }

  let rate = 0;
  if (salary <= sorted[0].salary) {
    rate = sorted[0].rate;
  } else if (salary >= sorted[sorted.length - 1].salary) {
    rate = sorted[sorted.length - 1].rate;
  } else {
    for (let i = 0; i < sorted.length - 1; i++) {
      const a1 = sorted[i];
      const a2 = sorted[i + 1];
      if (salary >= a1.salary && salary <= a2.salary) {
        rate = a1.rate + ((salary - a1.salary) * (a2.rate - a1.rate)) / (a2.salary - a1.salary);
        break;
      }
    }
  }

  return salary * rate;
};

/**
 * 本人の指定年齢における教育費の合計額を計算します。
 * @param age 本人年齢
 * @param childrenBirthAges 子どもの出生時親年齢配列
 * @param educationCostBand 教育費バンド設定
 */
export const calculateEducationCost = (
  age: number,
  childrenBirthAges: number[],
  educationCostBand: { ageStart: number; ageEnd: number; cost: number }[]
): number => {
  let totalCost = 0;
  
  childrenBirthAges.forEach(birthAge => {
    const childAge = age - birthAge;
    // 子どもが0歳〜22歳の間のみ教育費が発生
    if (childAge >= 0 && childAge <= 22) {
      const band = educationCostBand.find(b => childAge >= b.ageStart && childAge <= b.ageEnd);
      if (band) {
        totalCost += band.cost;
      }
    }
  });

  return totalCost;
};

/**
 * 本人の指定年齢における生活費の合計額を計算します。
 * @param age 本人年齢
 * @param params シミュレーションパラメータ
 */
export const calculateLivingCost = (
  age: number,
  params: SimulationParams
): number => {
  let cost = params.basicLivingCost;

  // 1. 期間限定の上乗せ (年金追納など)
  if (params.tempExtraLivingCost) {
    const { startAge, endAge, amount } = params.tempExtraLivingCost;
    if (age >= startAge && age <= endAge) {
      cost += amount;
    }
  }

  // 2. 配偶者加算 (結婚年齢以降)
  if (params.marriageAge !== null && age >= params.marriageAge) {
    cost += params.spouseLivingCost;
  }

  // 3. 子ども加算 (誕生〜22歳まで)
  params.childrenBirthAges.forEach(birthAge => {
    const childAge = age - birthAge;
    if (childAge >= 0 && childAge <= 22) {
      cost += params.childLivingCost;
    }
  });

  return cost;
};

/**
 * 本人の指定年齢における住宅費を計算します。
 * @param age 本人年齢
 * @param params シミュレーションパラメータ
 * @param annualLoanPayment 年間ローン返済額
 */
export const calculateHousingCost = (
  age: number,
  params: SimulationParams,
  annualLoanPayment: number
): number => {
  // 住宅購入前、または購入しない場合
  if (params.buyAge === null || age < params.buyAge) {
    return params.rentBeforeBuy;
  }

  // 購入後の支出
  const downPayment = (age === params.buyAge) ? params.downPayment : 0;
  const isLoanPaying = age >= params.buyAge && age < params.buyAge + params.loanTerm;
  const loanCost = isLoanPaying ? annualLoanPayment : 0;

  return downPayment + loanCost + params.maintenanceCost;
};

/**
 * 本人の指定年齢における車関連費を計算します。
 * @param age 本人年齢
 * @param params シミュレーションパラメータ
 */
export const calculateCarCost = (
  age: number,
  params: SimulationParams
): number => {
  let cost = 0;

  // 1. 車両購入イベント
  const purchase = params.carPurchases.find(c => c.age === age);
  if (purchase) {
    cost += purchase.price;
  }

  // 2. 維持費の上乗せ (段階的な置き換え方式)
  // 設定年齢以上の条件に合ううち、最も高い年齢の維持費を適用する
  const sortedMaint = [...params.carMaintenances].sort((a, b) => a.age - b.age);
  let activeMaintCost = 0;
  for (let i = 0; i < sortedMaint.length; i++) {
    if (age >= sortedMaint[i].age) {
      activeMaintCost = sortedMaint[i].cost;
    }
  }
  cost += activeMaintCost;

  return cost;
};

/**
 * ライフプランシミュレーションを実行するメインの純粋関数です。
 * @param params シミュレーションパラメータ
 */
export const simulate = (params: SimulationParams): YearRow[] => {
  console.log(`Starting simulation from age ${params.startAge} to ${params.endAge}`);
  
  const results: YearRow[] = [];
  let asset = params.initialAsset;
  let cash = params.initialAsset;
  let investment = 0;

  // ローン返済額をあらかじめ計算
  const loanPayment = calculateAnnualLoanPayment(
    params.loanAmount,
    params.interestRate,
    params.loanTerm
  );

  for (let age = params.startAge; age <= params.endAge; age++) {
    // 1. 収入の計算
    const salary = interpolateIncome(age, params.incomeCurve, params.salaryCap);
    
    let takeHome = 0;
    if (params.taxMode === 'rate') {
      takeHome = salary * (params.taxRate / 100);
    } else {
      takeHome = interpolateTakeHome(salary, params.taxAnchors);
    }

    // 初年度住民税なしオプション
    if (params.isFirstYearNoResidentTax && age === params.startAge) {
      takeHome = 364;
    }

    // 配偶者収入
    const spouseIncome = (params.spouseIncomeStartAge !== null && age >= params.spouseIncomeStartAge)
      ? params.spouseIncomeAmount
      : 0;

    // 退職金
    const retirementPay = (params.retirementAge !== null && age === params.retirementAge)
      ? params.retirementAmount
      : 0;

    // 2. 支出の計算
    const living = calculateLivingCost(age, params);
    const housing = calculateHousingCost(age, params, loanPayment);
    const education = calculateEducationCost(age, params.childrenBirthAges, params.educationCostBand);
    const car = calculateCarCost(age, params);
    
    // 一時イベント
    const event = params.tempEvents
      .filter(e => e.age === age)
      .reduce((sum, curr) => sum + curr.amount, 0);

    // 3. 運用益の計算 (オプションONの場合)
    let yieldIncome = 0;
    if (params.isInvestmentEnabled) {
      // 年初の運用資産に対して利回りを掛ける
      yieldIncome = investment * (params.investmentYield / 100);
      investment += yieldIncome;
    }

    // 4. 単年度収支
    const incomeSum = takeHome + spouseIncome + retirementPay;
    const costSum = living + housing + education + car + event;
    const annualBalance = Math.round(incomeSum - costSum + yieldIncome);

    // 5. 資産残高の更新と運用積立
    if (params.isInvestmentEnabled) {
      // 貯蓄余力 (収支) がプラスの場合、指定割合を投資に回す
      if (annualBalance > 0) {
        const investAmount = annualBalance * (params.investmentRate / 100);
        const cashAmount = annualBalance - investAmount;
        investment += investAmount;
        cash += cashAmount;
      } else {
        // マイナスの場合は、まず現金から取り崩し、足りない分を運用資産から取り崩す
        cash += annualBalance; // 収支がマイナスなので減算される
        if (cash < 0) {
          investment += cash; // 足りないマイナス分を運用資産から引く
          cash = 0;
        }
      }
      asset = Math.round(cash + investment);
    } else {
      asset += annualBalance;
      cash = asset;
      investment = 0;
    }

    results.push({
      age,
      salary: Math.round(salary),
      takeHome: Math.round(takeHome),
      spouseIncome,
      retirementPay,
      basicLivingCost: living,
      housingCost: housing,
      educationCost: education,
      carCost: car,
      eventCost: event,
      investmentYieldIncome: Math.round(yieldIncome),
      annualBalance,
      cumulativeAsset: asset,
      cumulativeCash: Math.round(cash),
      cumulativeInvestment: Math.round(investment),
    });
  }

  console.log(`Simulation finished. Final asset at age ${params.endAge}: ${asset}万円`);
  return results;
};
