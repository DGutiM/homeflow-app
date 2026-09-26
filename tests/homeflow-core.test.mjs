import assert from 'node:assert/strict';
import '../homeflow-core.js';

const core = globalThis.HomeFlowCore;

assert.equal(core.getInvestmentCategory('Fondo'), 'variable');
assert.equal(core.getInvestmentCategory('ETF'), 'variable');
assert.equal(core.getInvestmentCategory('Renta variable'), 'variable');
assert.equal(core.getInvestmentCategory('Renta fija'), 'fixed');
assert.equal(core.getInvestmentCategory('Cuenta ahorro'), 'other');
assert.equal(core.parseMoneyInput('27.947,29 €'), 27947.29);
assert.equal(core.parseMoneyInput('27947.29'), 27947.29);

assert.equal(
  core.sumInvestmentsByCategory([
    { type: 'Renta fija', amount: 27947.29 },
    { type: 'Fondo', amount: 4105.79 },
    { type: 'ETF', amount: 2668.99 },
    { type: 'Renta variable', amount: 1669.35 },
    { type: 'Fondo', amount: 164.26 }
  ], 'fixed'),
  27947.29
);

assert.equal(
  core.sumInvestmentsByCategory([
    { type: 'Fondo', amount: 4105.79 },
    { type: 'ETF', amount: 2668.99 },
    { type: 'Renta variable', amount: 1669.35 },
    { type: 'Fondo', amount: 164.26 }
  ], 'variable'),
  8608.39
);

assert.deepEqual(
  core.summarizeMonthlyInvestments([
    { type: 'Fondo', amount: 300 },
    { type: 'Renta fija', amount: 200 },
    { type: 'Otra inversión', amount: 50 }
  ]),
  { variable: 300, fixed: 200, other: 50, total: 550 }
);

const closedLegacy = core.normalizeDepositLifecycle({
  name: 'Depósito antiguo',
  sentToCash: true,
  sentToCashAt: '2026-05-01T10:00:00.000Z',
  interest: 81.25
});
assert.equal(closedLegacy.status, 'closed');
assert.equal(core.isDepositActive(closedLegacy), false);
assert.equal(closedLegacy.closedInterest, 81.25);

const reconciledDeposits = core.mergeDepositSources(
  [{ id: 'deposito-1', name: 'Duplicado', amount: 1000, status: 'active' }],
  [{ id: 'deposito-1', name: 'Duplicado', amount: 1000, status: 'closed', closedAt: '2026-07-01T10:00:00.000Z', closedInterest: 25 }]
);
assert.equal(reconciledDeposits.length, 1);
assert.equal(reconciledDeposits[0].status, 'closed');
assert.equal(reconciledDeposits[0].closedInterest, 25);
assert.equal(core.calculateDepositPortfolio(reconciledDeposits).capital, 0);

assert.deepEqual(
  core.calculateDepositPortfolio([
    { id: 'activo-1', status: 'active', amount: 1000, interest: 20, finalAmount: 1020 },
    { id: 'activo-2', amount: 500, interest: 5, finalAmount: 505 },
    { id: 'cerrado', status: 'closed', amount: 9000, interest: 200, finalAmount: 9200 }
  ]),
  { count: 2, capital: 1500, pendingInterest: 25, maturityTotal: 1525 }
);

const depositEstimate = core.calculateDepositEstimate(
  10000,
  3,
  '2026-01-31',
  1,
  new Date(2026, 1, 20, 12),
  19
);
assert.equal(depositEstimate.end, '2026-02-28');
assert.equal(depositEstimate.totalDays, 28);
assert.equal(depositEstimate.daysRemaining, 8);
assert.equal(depositEstimate.endingSoon, true);
assert.equal(depositEstimate.grossInterest, 23.01);
assert.equal(depositEstimate.interest, 18.64);
assert.equal(depositEstimate.finalAmount, 10018.64);

const maturedDepositEstimate = core.calculateDepositEstimate(
  1000,
  2,
  '2025-01-01',
  12,
  new Date(2026, 0, 2, 12),
  0
);
assert.equal(maturedDepositEstimate.matured, true);
assert.equal(maturedDepositEstimate.overdueDays, 1);
assert.equal(maturedDepositEstimate.interest, maturedDepositEstimate.grossInterest);

const interestYears = core.groupClosedDepositInterestByYear([
  closedLegacy,
  { name: 'Segundo', status: 'closed', closedAt: '2026-12-01T10:00:00.000Z', closedInterest: 20 },
  { name: 'Siguiente', status: 'closed', closedAt: '2027-01-10T10:00:00.000Z', closedInterest: 10 },
  { name: 'Activo', status: 'active', interest: 999 }
]);
assert.deepEqual(
  interestYears.map(({ year, total }) => ({ year, total })),
  [
    { year: '2027', total: 10 },
    { year: '2026', total: 101.25 }
  ]
);

const combinedInterestYears = core.groupInvestmentInterestByYear(
  [{ id: 'dep', name: 'Depósito', status: 'closed', closedAt: '2026-06-01T10:00:00.000Z', closedInterest: 40 }],
  [{
    id: 'trade-republic',
    name: 'Trade Republic',
    owner: 'Diego',
    interestEntries: [
      { id: 'tr-1', date: '2026-06-30', amount: 20.5 },
      { id: 'tr-2', date: '2027-01-31', amount: 21 }
    ]
  }]
);
assert.deepEqual(
  combinedInterestYears.map(({ year, total, depositTotal, savingsAccountTotal }) => ({ year, total, depositTotal, savingsAccountTotal })),
  [
    { year: '2027', total: 21, depositTotal: 0, savingsAccountTotal: 21 },
    { year: '2026', total: 60.5, depositTotal: 40, savingsAccountTotal: 20.5 }
  ]
);

const originalPeriods = { '2026-06': { income: 1000 } };
const updatedPeriods = core.upsertPeriodMap(originalPeriods, '2026-06', { income: 1250 });
assert.equal(Object.keys(updatedPeriods).length, 1);
assert.equal(updatedPeriods['2026-06'].income, 1250);
assert.equal(originalPeriods['2026-06'].income, 1000);

assert.deepEqual(
  core.calculateSavingsBreakdown(5000, 3000, 500),
  {
    livingExpenses: 3000,
    longTermInvestment: 500,
    availableSavings: 1500,
    availableSavingsRate: 30,
    totalSavings: 2000,
    totalSavingsRate: 40,
    totalOutflows: 3500
  }
);

assert.deepEqual(
  core.calculateSavingsBreakdown(0, 100, 50),
  {
    livingExpenses: 100,
    longTermInvestment: 50,
    availableSavings: -150,
    availableSavingsRate: 0,
    totalSavings: -100,
    totalSavingsRate: 0,
    totalOutflows: 150
  }
);

assert.deepEqual(
  core.summarizeSavingsPeriods([
    { income: 1000, totalOutflows: 900, availableSavings: 50, totalSavings: 100 },
    { income: 3000, totalOutflows: 2000, availableSavings: 700, totalSavings: 1000 }
  ]),
  {
    income: 4000,
    totalOutflows: 2900,
    availableSavings: 750,
    totalSavings: 1100,
    totalSavingsRate: 27.5,
    count: 2
  }
);

assert.deepEqual(
  core.allocateSavingsByAdult([
    { id: 'diego', name: 'Diego', income: 3000, personalExpenses: 200, longTermInvestment: 400 },
    { id: 'itxaso', name: 'Itxaso', income: 2500, personalExpenses: 100, longTermInvestment: 200 }
  ], 2000, 300),
  [
    {
      id: 'diego',
      name: 'Diego',
      income: 3000,
      personalExpenses: 200,
      sharedLivingExpenses: 1000,
      allocatedLivingExpenses: 1200,
      longTermInvestment: 550,
      availableSavings: 1250,
      totalSavings: 1800
    },
    {
      id: 'itxaso',
      name: 'Itxaso',
      income: 2500,
      personalExpenses: 100,
      sharedLivingExpenses: 1000,
      allocatedLivingExpenses: 1100,
      longTermInvestment: 350,
      availableSavings: 1050,
      totalSavings: 1400
    }
  ]
);

assert.deepEqual(
  core.calculateSavingsAccountProjection(10000, 3),
  {
    balance: 10000,
    annualRate: 3,
    monthlyInterest: 24.66,
    annualInterest: 300,
    projectedBalanceOneYear: 10300
  }
);

console.log('homeflow-core: pruebas correctas');
