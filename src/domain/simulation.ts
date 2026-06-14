import type { SimulationParams, YearRow, IncomeAnchor, TaxAnchor } from './types';

/** シミュレーション結果から主要な指標を抽出した分析結果 */
export interface SimulationAnalysis {
  minAsset: number; // 期間中の最小累計資産
  minAssetAge: number; // 最小累計資産になる年齢
  minusPeriods: { start: number; end: number }[]; // 資産がマイナスになる期間
  depletionAge: number | null; // 初めて資産がマイナスに転じる年齢 (尽きる年齢)
  finalAsset: number; // 最終年の累計資産
  finalAge: number; // 最終年齢
  isHealthy: boolean; // 期間を通じて一度もマイナスにならないか
}

/**
 * シミュレーション結果(年表)から、最小資産・赤字期間・最終資産などの
 * サマリー指標を計算します。UI 側の表示に利用します。
 */
export const analyzeResults = (results: YearRow[]): SimulationAnalysis | null => {
  if (results.length === 0) return null;

  let minAsset = Infinity;
  let minAssetAge = -1;
  let depletionAge: number | null = null;
  const minusPeriods: { start: number; end: number }[] = [];
  let inMinus = false;
  let currentStart = -1;

  results.forEach((row) => {
    if (row.cumulativeAsset < minAsset) {
      minAsset = row.cumulativeAsset;
      minAssetAge = row.age;
    }

    if (row.cumulativeAsset < 0) {
      if (!inMinus) {
        inMinus = true;
        currentStart = row.age;
        if (depletionAge === null) depletionAge = row.age;
      }
    } else if (inMinus) {
      inMinus = false;
      minusPeriods.push({ start: currentStart, end: row.age - 1 });
    }
  });

  if (inMinus) {
    minusPeriods.push({ start: currentStart, end: results[results.length - 1].age });
  }

  const finalRow = results[results.length - 1];

  return {
    minAsset,
    minAssetAge,
    minusPeriods,
    depletionAge,
    finalAsset: finalRow.cumulativeAsset,
    finalAge: finalRow.age,
    isHealthy: minusPeriods.length === 0,
  };
};

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
  annualLoanPayment: number,
  inflationFactor = 1
): number => {
  // 住宅購入前、または購入しない場合: 家賃はインフレで上昇
  if (params.buyAge === null || age < params.buyAge) {
    return params.rentBeforeBuy * inflationFactor;
  }

  // 購入後の支出。頭金・ローン返済は名目（固定）、維持費はインフレで上昇
  const downPayment = (age === params.buyAge) ? params.downPayment : 0;
  const isLoanPaying = age >= params.buyAge && age < params.buyAge + params.loanTerm;
  const loanCost = isLoanPaying ? annualLoanPayment : 0;

  return downPayment + loanCost + params.maintenanceCost * inflationFactor;
};

/**
 * 元利均等返済ローンの、経過年数時点でのローン残高(元本)を計算します。
 * @param principal 借入額 (万円)
 * @param annualRatePct 年利 (%)
 * @param termYears 返済期間 (年)
 * @param yearsElapsed 経過年数
 */
export const calculateRemainingLoanBalance = (
  principal: number,
  annualRatePct: number,
  termYears: number,
  yearsElapsed: number
): number => {
  if (principal <= 0 || termYears <= 0 || yearsElapsed >= termYears) return 0;
  if (yearsElapsed <= 0) return principal;
  if (annualRatePct <= 0) return principal * (1 - yearsElapsed / termYears);

  const r = (annualRatePct / 100) / 12;
  const n = termYears * 12;
  const k = yearsElapsed * 12;
  const powN = Math.pow(1 + r, n);
  const powK = Math.pow(1 + r, k);
  return principal * (powN - powK) / (powN - 1);
};

/**
 * 本人の指定年齢における車関連費を計算します。
 * @param age 本人年齢
 * @param params シミュレーションパラメータ
 */
export const calculateCarCost = (
  age: number,
  params: SimulationParams,
  inflationFactor = 1
): number => {
  let cost = 0;

  // 1. 車両購入イベント (購入額は名目・入力値のまま)
  const purchase = params.carPurchases.find(c => c.age === age);
  if (purchase) {
    cost += purchase.price;
  }

  // 2. 維持費の上乗せ (段階的な置き換え方式)。維持費はインフレで上昇
  // 設定年齢以上の条件に合ううち、最も高い年齢の維持費を適用する
  const sortedMaint = [...params.carMaintenances].sort((a, b) => a.age - b.age);
  let activeMaintCost = 0;
  for (let i = 0; i < sortedMaint.length; i++) {
    if (age >= sortedMaint[i].age) {
      activeMaintCost = sortedMaint[i].cost;
    }
  }
  cost += activeMaintCost * inflationFactor;

  return cost;
};

/**
 * 課税所得(万円)に対する所得税額(万円)を、速算表で概算します。
 */
export const incomeTaxJP = (taxableManYen: number): number => {
  const t = taxableManYen;
  if (t <= 0) return 0;
  if (t <= 195) return t * 0.05;
  if (t <= 330) return t * 0.10 - 9.75;
  if (t <= 695) return t * 0.20 - 42.75;
  if (t <= 900) return t * 0.23 - 63.6;
  if (t <= 1800) return t * 0.33 - 153.6;
  if (t <= 4000) return t * 0.40 - 279.6;
  return t * 0.45 - 479.6;
};

/**
 * 額面年収(万円)から、iDeCo節税などに使う限界税率(所得税+住民税)を概算します。
 */
export const estimateMarginalRate = (annualSalary: number): number => {
  if (annualSalary <= 0) return 0;
  if (annualSalary <= 330) return 0.15; // 所得税5〜10% + 住民税10%
  if (annualSalary <= 600) return 0.20;
  if (annualSalary <= 900) return 0.30;
  if (annualSalary <= 1800) return 0.43;
  return 0.50;
};

/**
 * 退職金の手取りを、退職所得控除を考慮して概算します。
 * 課税対象 = max(0, 退職金 - 退職所得控除) / 2 に所得税+住民税(10%)。
 * @param amount 退職金(万円・額面)
 * @param yearsWorked 勤続年数
 */
export const calculateRetirementTakeHome = (amount: number, yearsWorked: number): number => {
  if (amount <= 0) return 0;
  const y = Math.max(1, yearsWorked);
  const deduction = y <= 20 ? 40 * y : 800 + 70 * (y - 20);
  const taxableBase = Math.max(0, amount - deduction) / 2;
  const tax = incomeTaxJP(taxableBase) + taxableBase * 0.10;
  return amount - tax;
};

/**
 * 配偶者収入の手取りを概算します。
 * 103万円以下は非課税(パート想定)で満額、超えたら本人と同じ方式で手取り換算します。
 */
export const calculateSpouseTakeHome = (
  amount: number,
  params: SimulationParams
): number => {
  if (amount <= 0) return 0;
  if (amount <= 103) return amount; // 非課税の範囲
  return params.taxMode === 'rate'
    ? amount * (params.taxRate / 100)
    : interpolateTakeHome(amount, params.taxAnchors);
};

/**
 * ライフプランシミュレーションを実行するメインの純粋関数です。
 * @param params シミュレーションパラメータ
 */
export const simulate = (params: SimulationParams): YearRow[] => {
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
    // 物価上昇の累積係数 (開始年齢を1.0とする)
    const inflationFactor = Math.pow(1 + params.inflationRate / 100, age - params.startAge);

    // 1. 収入の計算
    let salary = interpolateIncome(age, params.incomeCurve, params.salaryCap);

    // 定年(収入の最終年齢)を過ぎたら給与なし
    if (params.workEndAge !== null && age > params.workEndAge) {
      salary = 0;
    }

    let takeHome =
      params.taxMode === 'rate'
        ? salary * (params.taxRate / 100)
        : interpolateTakeHome(salary, params.taxAnchors);

    // 初年度は前年の所得がないため住民税が課税されないオプション。
    // 特定個人の固定値ではなく、住民税のおおよその額(額面の約4.5%)を手取りに足し戻す。
    if (params.isFirstYearNoResidentTax && age === params.startAge) {
      takeHome += salary * 0.045;
    }

    // 住宅ローン控除: 購入後の適用年数の間、年末ローン残高×0.7%(上限21万)を税額控除として手取りに加算
    if (
      params.mortgageDeduction &&
      params.buyAge !== null &&
      age >= params.buyAge &&
      age < params.buyAge + params.mortgageDeductionYears
    ) {
      const yearEndBalance = calculateRemainingLoanBalance(
        params.loanAmount,
        params.interestRate,
        params.loanTerm,
        age - params.buyAge + 1
      );
      takeHome += Math.min(yearEndBalance * 0.007, 21);
    }

    // iDeCo: 働いている間(給与あり)は掛金×限界税率の節税ぶんを手取りに加算
    if (params.idecoAnnual > 0 && salary > 0) {
      takeHome += params.idecoAnnual * estimateMarginalRate(salary);
    }

    // 配偶者収入(103万円超は手取り換算)
    const spouseIncome = (params.spouseIncomeStartAge !== null && age >= params.spouseIncomeStartAge)
      ? calculateSpouseTakeHome(params.spouseIncomeAmount, params)
      : 0;

    // 退職金(退職所得控除を考慮して課税)
    let retirementPay = (params.retirementAge !== null && age === params.retirementAge)
      ? params.retirementAmount
      : 0;
    if (retirementPay > 0 && params.taxRetirement) {
      const yearsWorked = (params.retirementAge ?? params.endAge) - params.startAge;
      retirementPay = calculateRetirementTakeHome(retirementPay, yearsWorked);
    }

    // 公的年金 (受給開始年齢以降は毎年加算)。
    // 年金は「今の価値」で入力し、物価連動で実質価値を保つ想定でインフレ係数を掛ける。
    const pensionIncome = (params.pensionStartAge !== null && age >= params.pensionStartAge)
      ? Math.round(params.pensionAnnual * inflationFactor)
      : 0;

    // 2. 支出の計算 (生活費・教育費・家賃・維持費はインフレで上昇)
    const living = calculateLivingCost(age, params) * inflationFactor;
    const housing = calculateHousingCost(age, params, loanPayment, inflationFactor);
    const education = calculateEducationCost(age, params.childrenBirthAges, params.educationCostBand) * inflationFactor;
    const car = calculateCarCost(age, params, inflationFactor);

    // 一時イベント (入力値のまま・名目)
    const event = params.tempEvents
      .filter(e => e.age === age)
      .reduce((sum, curr) => sum + curr.amount, 0);

    // 3. 運用益の計算 (オプションONの場合)
    // 運用益は投資資産の中で複利として積み上がるだけで、年間収支(annualBalance)には
    // 含めない。収支に含めると、ここでの investment 加算と後段の積立で二重計上になる。
    let yieldIncome = 0;
    if (params.isInvestmentEnabled) {
      // 年初の運用資産に対して利回りを掛ける
      yieldIncome = investment * (params.investmentYield / 100);
      // 特定口座(NISA以外)は運用益に約20.315%課税
      if (!params.isNisa && yieldIncome > 0) {
        yieldIncome *= 1 - 0.20315;
      }
      investment += yieldIncome;
    }

    // 4. 単年度収支 (運用益は含めない=営業キャッシュフロー)
    const incomeSum = takeHome + spouseIncome + retirementPay + pensionIncome;
    const costSum = living + housing + education + car + event;
    const annualBalance = Math.round(incomeSum - costSum);

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
          // 現金が尽きたら運用資産を取り崩す。運用資産も尽きたら不足分は
          // 負債(現金マイナス)として残す。投資資産をマイナスにすると翌年の
          // 運用益がマイナスになってしまうため、0で止める。
          const drawFromInvestment = Math.min(investment, -cash);
          investment -= drawFromInvestment;
          cash += drawFromInvestment;
        }
      }
      asset = Math.round(cash + investment);
    } else {
      asset += annualBalance;
      cash = asset;
      investment = 0;
    }

    // 6. 住宅の評価額・純価値・純資産の計算
    let homeValue = 0;
    let homeEquity = 0;
    if (params.buyAge !== null && age >= params.buyAge) {
      const yearsOwned = age - params.buyAge;
      homeValue = params.propertyPrice * Math.pow(1 - params.homeDepreciationRate / 100, yearsOwned);
      const remainingLoan = calculateRemainingLoanBalance(
        params.loanAmount,
        params.interestRate,
        params.loanTerm,
        yearsOwned
      );
      homeEquity = homeValue - remainingLoan;
    }
    // 純資産 = 流動資産 + (計上する場合のみ)住宅の純価値
    const netWorth = Math.round(asset + (params.countHomeAsAsset ? homeEquity : 0));

    results.push({
      age,
      salary: Math.round(salary),
      takeHome: Math.round(takeHome),
      spouseIncome: Math.round(spouseIncome),
      retirementPay: Math.round(retirementPay),
      pensionIncome,
      basicLivingCost: Math.round(living),
      housingCost: Math.round(housing),
      educationCost: Math.round(education),
      carCost: Math.round(car),
      eventCost: event,
      investmentYieldIncome: Math.round(yieldIncome),
      annualBalance,
      cumulativeAsset: asset,
      cumulativeCash: Math.round(cash),
      cumulativeInvestment: Math.round(investment),
      homeValue: Math.round(homeValue),
      homeEquity: Math.round(homeEquity),
      netWorth,
    });
  }

  return results;
};
