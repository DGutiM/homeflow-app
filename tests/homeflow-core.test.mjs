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

const closedLegacy = core.normalizeDepositLifecycle({
  name: 'Depósito antiguo',
  sentToCash: true,
  sentToCashAt: '2026-05-01T10:00:00.000Z',
  interest: 81.25
});
assert.equal(closedLegacy.status, 'closed');
assert.equal(core.isDepositActive(closedLegacy), false);
assert.equal(closedLegacy.closedInterest, 81.25);

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

const originalPeriods = { '2026-06': { income: 1000 } };
const updatedPeriods = core.upsertPeriodMap(originalPeriods, '2026-06', { income: 1250 });
assert.equal(Object.keys(updatedPeriods).length, 1);
assert.equal(updatedPeriods['2026-06'].income, 1250);
assert.equal(originalPeriods['2026-06'].income, 1000);

console.log('homeflow-core: pruebas correctas');
