import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import '../homeflow-core.js';

const core = globalThis.HomeFlowCore;
const monthly = {
  incomes: { adults: { a: { mainFixed: 3000 }, b: { mainFixed: 2000 } } },
  expenses: { commonFixed: { viviendaAlquiler: 1000 }, monthlyInvestments: [
    { owner: 'Ana', type: 'Renta variable', amount: 400 },
    { owner: 'Ana', type: 'Renta variable', amount: 600, fundingSource: 'fixed' }
  ] }
};
const transfers = [
  { id: 'one', owner: 'Ana', kind: 'toFunds', amount: 200, createdAt: '2026-08-07T12:00:00Z', period: '2026-07' },
  { id: 'two', owner: 'Luis', kind: 'toFunds', amount: 100, note: 'Ajustes', createdAt: '2026-08-07T12:00:00Z' },
  { id: 'withdrawal', kind: 'toCash', amount: 500, createdAt: '2026-08-07T12:00:00Z' }
];
const activity = core.buildInvestmentActivity({ '2026-07': monthly }, transfers);
assert.equal(activity[0].newContributions, 400);
assert.equal(activity[0].transfers, 800);
assert.equal(activity[0].totalDirected, 1200);
assert.equal(activity[1].totalDirected, 0);
assert.equal(activity[1].adjustments, 100);
assert.equal(core.summarizeMonthlyInvestments(monthly.expenses.monthlyInvestments).total, 400);
assert.equal(core.buildInvestmentActivity({}, [{ ...transfers[0], period: '2026-09' }])[0].period, '2026-09');

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const context = vm.createContext({ structuredClone, HomeFlowCore: core, console, Intl, Date });
vm.runInContext(source.replace(/\s+init\(\);\s*$/, ''), context);
context.monthlyFixture = monthly;
vm.runInContext(`state.profile = normalizeProfile({configured:true, adults:[{id:'a',name:'Ana'},{id:'b',name:'Luis'}], investmentPositions:[{type:'Renta fija',owner:'Ana',amount:1000}]});`, context);
const totals = vm.runInContext('calculateTotalsForData(monthlyFixture)', context);
assert.equal(totals.investments, 400);
assert.equal(totals.savings, 3600, 'Solo el dinero nuevo sale de los ingresos disponibles');
assert.equal(totals.totalSavings, 4000);
context.positionsFixture = monthly.expenses.monthlyInvestments;
const portfolio = vm.runInContext('buildInvestmentOwnerBreakdown(positionsFixture, [])', context)[0];
assert.equal(portfolio.fixed, 400);
assert.equal(portfolio.funds, 1000);
assert.equal(portfolio.total, 1400, 'Traspasar 600 no aumenta el patrimonio; aportar 400 sí');

const bundle = { profile: { housing: { targetPrice: 100000, entryPaid: 10000, extraPayments: [{ id: 'old', name: 'Cuota antigua', amount: 250 }] } }, periods: { '2026-08': structuredClone(monthly) } };
const before = core.calculateHousingSummary(bundle.profile.housing, bundle.periods);
const linked = core.linkHousingPaymentToPeriod(bundle, 'old', '2026-08');
assert.equal(bundle.periods['2026-08'].expenses.commonFixed.viviendaCuota5, undefined, 'La operación no modifica la copia de seguridad');
assert.equal(linked.periods['2026-08'].expenses.commonFixed.viviendaCuota5, 250);
assert.equal(core.calculateHousingSummary(linked.profile.housing, linked.periods).paid, before.paid);
assert.throws(() => core.linkHousingPaymentToPeriod(linked, 'old', '2026-08'), /ya está vinculado/);
linked.periods = core.upsertPeriodMap(linked.periods, '2026-09', { expenses: { commonFixed: { viviendaCuota5: 250 } } });
assert.equal(core.calculateHousingSummary(linked.profile.housing, linked.periods).paid, before.paid + 250);
linked.periods = core.upsertPeriodMap(linked.periods, '2026-09', { expenses: { commonFixed: { viviendaCuota5: 275 } } });
assert.equal(core.calculateHousingSummary(linked.profile.housing, linked.periods).paid, before.paid + 275, 'Editar un mes aplica solo la diferencia');
context.monthlyFixture = linked.periods['2026-08'];
assert.equal(vm.runInContext('calculateTotalsForData(monthlyFixture).livingExpenses', context), 1250);

const housing = { installment5: { startPeriod: '2026-08', endPeriod: '2027-01', amount: 250 } };
assert.equal(core.applyHousingInstallmentDefault({}, housing, '2026-10', { isNew: true }).expenses.commonFixed.viviendaCuota5, 250);
assert.equal(core.applyHousingInstallmentDefault({ expenses: { commonFixed: { viviendaCuota5: 0 } } }, housing, '2026-10', { isNew: true }).expenses.commonFixed.viviendaCuota5, 0);
assert.deepEqual(core.applyHousingInstallmentDefault({}, housing, '2026-07', { isNew: true }), {});
assert.deepEqual(core.applyHousingInstallmentDefault({}, housing, '2027-02', { isNew: true }), {});
assert.deepEqual(core.applyHousingInstallmentDefault({}, housing, '2026-10'), {});

const grouped = core.groupSmallIncomePayers([{ period: '2026-09', values: new Map([['hospital', 3000], ['limit', 500], ['small', 20], ['extra', 500.01]]) }])[0];
assert.equal(grouped.values.get('__other__'), 520);
assert.equal(grouped.values.get('extra'), 500.01);
assert.equal([...grouped.values.values()].reduce((sum, n) => sum + n, 0), 4020.01);
const profile = { workSchedules: [{ owner: 'Ana', startPeriod: '2026-10', percent: 60 }, { owner: 'Ana', startPeriod: '2027-01', percent: 100 }] };
assert.equal(core.getWorkSchedule(profile, 'Ana', '2026-09'), null);
assert.equal(core.getWorkSchedule(profile, 'Ana', '2026-10').percent, 60);
assert.equal(core.getWorkSchedule(profile, 'Ana', '2027-01').percent, 100);
console.log('financial-flows: aportaciones, traspasos, cuotas, umbral y jornada correctos');
