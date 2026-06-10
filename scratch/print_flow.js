// 年ごとのキャッシュフロー詳細プリント

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

function printSimulation() {
  let asset = 0;
  console.log("Age | Salary | TakeHome | Living | Housing | Edu | Car | Event | Balance | Asset");
  console.log("--------------------------------------------------------------------------------");

  const loanPayment = 184; // 既定金利 1.5% の返済額

  for (let age = 23; age <= 65; age++) {
    const salary = interpolateIncome(age, params.incomeCurve, params.salaryCap);
    let takeHome = interpolateTakeHomeAmount(salary, params.taxAnchors);
    if (age === 23) takeHome = 364;

    // 基礎生活費 126
    const basicLiving = 126;
    // 期間限定 23〜25歳 20
    const extraLiving = (age >= 23 && age <= 25) ? 20 : 0;
    // 配偶者加算 24歳から 50
    const spouseLiving = (age >= 24) ? 50 : 0;
    // 子供加算 15 (子供1: 29歳から22年, 子供2: 33歳から22年)
    let childLiving = 0;
    [29, 33].forEach(birthAge => {
      const childAge = age - birthAge;
      if (childAge >= 0 && childAge <= 22) {
        childLiving += 15;
      }
    });

    const totalLiving = basicLiving + extraLiving + spouseLiving + childLiving;

    // 住宅費
    let housing = 0;
    if (age < 27) {
      housing = 84;
    } else {
      const downPayment = (age === 27) ? 300 : 0;
      const loan = (age >= 27 && age < 27 + 35) ? loanPayment : 0;
      housing = downPayment + loan + 30;
    }

    // 教育費
    let education = 0;
    [29, 33].forEach(birthAge => {
      const childAge = age - birthAge;
      if (childAge >= 0 && childAge <= 22) {
        const band = params.educationCostBand.find(b => childAge >= b.ageStart && childAge <= b.ageEnd);
        education += band ? band.cost : 0;
      }
    });

    // 車
    let car = 0;
    const purchase = params.carPurchases.find(c => c.age === age);
    if (purchase) car += purchase.price;
    // 維持費上乗せ (discrete: 33〜42は5, 43以降は10)
    let carMaint = 0;
    if (age >= 33 && age <= 42) carMaint = 5;
    else if (age >= 43) carMaint = 10;
    car += carMaint;

    // イベント
    const event = (age === 24) ? 120 : 0;

    const balance = takeHome - totalLiving - housing - education - car - event;
    asset += balance;

    console.log(`${age}  | ${Math.round(salary)}    | ${Math.round(takeHome)}      | ${totalLiving}    | ${housing}     | ${education}   | ${car}   | ${event}     | ${Math.round(balance)}     | ${Math.round(asset)}`);
  }
}

printSimulation();
