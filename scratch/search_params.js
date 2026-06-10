// 子供加算継続仮説に基づく探索スクリプト

const params = {
  startAge: 23,
  endAge: 65,
  initialAsset: 0,
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
  taxRate: 75,
  isFirstYearNoResidentTax: true,
  spouseIncomeStartAge: null,
  spouseIncomeAmount: 0,
  retirementAge: null,
  retirementAmount: 0,

  buyAge: 27,
  propertyPrice: 5000,
  downPayment: 300,
  loanAmount: 5000,
  interestRate: 1.5,
  loanTerm: 35,
  maintenanceCost: 30,
  rentBeforeBuy: 84,

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

const interpolateIncome = (age, curve, salaryCap) => {
  const sorted = [...curve].sort((a, b) => a.age - b.age);
  let salary = 0;
  if (age <= sorted[0].age) {
    salary = sorted[0].salary;
  } else if (age >= sorted[sorted.length - 1].age) {
    salary = sorted[sorted.length - 1].salary;
  } else {
    for (let i = 0; i < sorted.length - 1; i++) {
      const p1 = sorted[i];
      const p2 = sorted[i+1];
      if (age >= p1.age && age <= p2.age) {
        salary = p1.salary + ((age - p1.age) * (p2.salary - p1.salary)) / (p2.age - p1.age);
        break;
      }
    }
  }
  return Math.min(salary, salaryCap);
};

const interpolateTakeHomeAmount = (salary, anchors) => {
  if (salary <= 0) return 0;
  const sorted = [...anchors].sort((a, b) => a.salary - b.salary);
  if (sorted[0].salary > 0) {
    sorted.unshift({ salary: 0, takeHome: 0 });
  }
  if (salary <= sorted[sorted.length - 1].salary) {
    for (let i = 0; i < sorted.length - 1; i++) {
      const a1 = sorted[i];
      const a2 = sorted[i+1];
      if (salary >= a1.salary && salary <= a2.salary) {
        return a1.takeHome + ((salary - a1.salary) * (a2.takeHome - a1.takeHome)) / (a2.salary - a1.salary);
      }
    }
  }
  const last = sorted[sorted.length - 1];
  return salary * (last.takeHome / last.salary);
};

const interpolateTakeHomeRate = (salary, anchors) => {
  if (salary <= 0) return 0;
  const sorted = anchors.map(a => ({
    salary: a.salary,
    rate: a.takeHome / a.salary
  })).sort((a, b) => a.salary - b.salary);
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
      const a2 = sorted[i+1];
      if (salary >= a1.salary && salary <= a2.salary) {
        rate = a1.rate + ((salary - a1.salary) * (a2.rate - a1.rate)) / (a2.salary - a1.salary);
        break;
      }
    }
  }
  return salary * rate;
};

const calculateAnnualLoanPayment = (principal, annualRatePct, termYears) => {
  if (principal <= 0 || termYears <= 0) return 0;
  if (annualRatePct <= 0) return principal / termYears;
  const r = (annualRatePct / 100) / 12;
  const n = termYears * 12;
  const monthly = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return monthly * 12;
};

function simulateWithOptions(params, opts) {
  let asset = params.initialAsset;
  const results = [];

  let loanPayment = calculateAnnualLoanPayment(params.loanAmount, params.interestRate, params.loanTerm);
  if (opts.loanPaymentMode === 'round') {
    if (params.interestRate === 1.5) loanPayment = 184;
    else if (params.interestRate === 4.0) loanPayment = 266;
    else loanPayment = Math.round(loanPayment);
  } else if (opts.loanPaymentMode === 'round_raw') {
    loanPayment = Math.round(loanPayment);
  }

  for (let age = params.startAge; age <= params.endAge; age++) {
    const rawSalary = interpolateIncome(age, params.incomeCurve, params.salaryCap);
    
    let takeHome = 0;
    if (opts.taxInterpolationMode === 'rate') {
      takeHome = interpolateTakeHomeRate(rawSalary, params.taxAnchors);
    } else {
      takeHome = interpolateTakeHomeAmount(rawSalary, params.taxAnchors);
    }
    
    if (params.isFirstYearNoResidentTax && age === params.startAge) {
      takeHome = 364;
    }

    const spouseIncome = (params.spouseIncomeStartAge !== null && age >= params.spouseIncomeStartAge)
      ? params.spouseIncomeAmount : 0;

    const retirementPay = (params.retirementAge !== null && age === params.retirementAge)
      ? params.retirementAmount : 0;

    const basicLiving = params.basicLivingCost;

    let extraLiving = 0;
    if (params.tempExtraLivingCost) {
      const start = params.tempExtraLivingCost.startAge;
      const end = opts.tempExtraLivingIncludeEnd ? params.tempExtraLivingCost.endAge : params.tempExtraLivingCost.endAge - 1;
      if (age >= start && age <= end) {
        extraLiving = params.tempExtraLivingCost.amount;
      }
    }

    let spouseLiving = 0;
    if (params.marriageAge !== null) {
      const startAge = opts.spouseLivingStartOffset === 'next' ? params.marriageAge + 1 : params.marriageAge;
      if (age >= startAge) {
        spouseLiving = params.spouseLivingCost;
      }
    }

    // 子ども加算 (仮説: 誕生以降、親のシミュレーション終了までずっと継続)
    let childLiving = 0;
    params.childrenBirthAges.forEach(birthAge => {
      const childAge = age - birthAge;
      if (childAge >= 0) {
        if (opts.childLivingNeverEnds || childAge <= 22) {
          childLiving += params.childLivingCost;
        }
      }
    });

    let educationCost = 0;
    params.childrenBirthAges.forEach(birthAge => {
      const childAge = age - birthAge;
      if (childAge >= 0 && childAge <= 22) {
        const band = params.educationCostBand.find(b => childAge >= b.ageStart && childAge <= b.ageEnd);
        if (band) {
          educationCost += band.cost;
        }
      }
    });

    let housingCost = 0;
    if (params.buyAge === null || age < params.buyAge) {
      housingCost = params.rentBeforeBuy;
    } else {
      const isLoanPaying = age >= params.buyAge && age < params.buyAge + params.loanTerm;
      const currentLoanPayment = isLoanPaying ? loanPayment : 0;
      const downPayment = (age === params.buyAge) ? params.downPayment : 0;
      housingCost = downPayment + currentLoanPayment + params.maintenanceCost;
    }

    let carCost = 0;
    const purchase = params.carPurchases.find(c => c.age === age);
    if (purchase) {
      carCost += purchase.price;
    }
    if (opts.carMaintenanceMode === 'accumulate') {
      params.carMaintenances.forEach(m => {
        if (age >= m.age) {
          carCost += m.cost;
        }
      });
    } else if (opts.carMaintenanceMode === 'discrete') {
      const sortedM = [...params.carMaintenances].sort((a, b) => a.age - b.age);
      let cost = 0;
      for (let i = 0; i < sortedM.length; i++) {
        if (age >= sortedM[i].age) {
          cost = sortedM[i].cost;
        }
      }
      carCost += cost;
    }

    let eventCost = 0;
    params.tempEvents.forEach(e => {
      if (e.age === age) {
        eventCost += e.amount;
      }
    });

    const totalLiving = basicLiving + extraLiving + spouseLiving + childLiving;
    let annualBalance = (takeHome + spouseIncome + retirementPay) - totalLiving - housingCost - educationCost - carCost - eventCost;
    
    if (opts.roundAnnualBalance) {
      annualBalance = Math.round(annualBalance);
    }
    
    asset += annualBalance;

    results.push({
      age,
      annualBalance,
      cumulativeAsset: asset
    });
  }
  return results;
}

const searchSpaces = {
  taxInterpolationMode: ['amount', 'rate'],
  loanPaymentMode: ['round', 'exact'],
  tempExtraLivingIncludeEnd: [true, false],
  spouseLivingStartOffset: ['same', 'next'],
  childLivingNeverEnds: [true, false],
  carMaintenanceMode: ['accumulate', 'discrete'],
  roundAnnualBalance: [true, false]
};

function getCombinations(obj) {
  const keys = Object.keys(obj);
  const results = [];
  function helper(index, current) {
    if (index === keys.length) {
      results.push({ ...current });
      return;
    }
    const key = keys[index];
    const values = obj[key];
    for (const val of values) {
      current[key] = val;
      helper(index + 1, current);
    }
  }
  helper(0, {});
  return results;
}

const combinations = getCombinations(searchSpaces);
let bestMatches = [];

for (const combo of combinations) {
  const resBase = simulateWithOptions(params, combo);
  const r29 = resBase.find(r => r.age === 29);
  const r33 = resBase.find(r => r.age === 33);
  const r53 = resBase.find(r => r.age === 53);
  const r65 = resBase.find(r => r.age === 65);

  const bal29 = Math.round(r29.annualBalance);
  const bal33 = Math.round(r33.annualBalance);
  const cum53 = Math.round(r53.cumulativeAsset);
  const cum65 = Math.round(r65.cumulativeAsset);

  const p4 = { ...params, interestRate: 4.0 };
  const res4 = simulateWithOptions(p4, combo);
  let min4 = Infinity;
  res4.forEach(r => {
    if (r.cumulativeAsset < min4) min4 = r.cumulativeAsset;
  });
  min4 = Math.round(min4);

  const p850 = { ...params, salaryCap: 850 };
  const res850 = simulateWithOptions(p850, combo);
  let min850 = Infinity;
  res850.forEach(r => {
    if (r.cumulativeAsset < min850) min850 = r.cumulativeAsset;
  });
  min850 = Math.round(min850);

  // 一致条件 (29歳: +27, 33歳: -259, 53歳: +907, 65歳: +4289, 4%最小: -1306, 850最小: -1808)
  const score = 
    (Math.abs(bal29 - 27) <= 0.1 ? 1 : 0) +
    (Math.abs(bal33 - (-259)) <= 0.1 ? 1 : 0) +
    (Math.abs(cum53 - 907) <= 3 ? 1 : 0) +
    (Math.abs(cum65 - 4289) <= 5 ? 1 : 0) +
    (Math.abs(min4 - (-1306)) <= 3 ? 1 : 0) +
    (Math.abs(min850 - (-1808)) <= 3 ? 1 : 0);

  if (score >= 4) {
    bestMatches.push({
      combo,
      score,
      metrics: { bal29, bal33, cum53, cum65, min4, min850 }
    });
  }
}

bestMatches.sort((a, b) => b.score - a.score);

console.log(`FOUND ${bestMatches.length} MATCHES:`);
bestMatches.slice(0, 10).forEach(m => {
  console.log(`Score: ${m.score}/6`);
  console.log(JSON.stringify(m.combo, null, 2));
  console.log(m.metrics);
  console.log('---');
});
