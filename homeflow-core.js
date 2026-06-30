(function exposeHomeFlowCore(root) {
  'use strict';

  function numberValue(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function roundMoney(value) {
    return Math.round((numberValue(value) + Number.EPSILON) * 100) / 100;
  }

  function parseMoneyInput(value) {
    const cleaned = String(value ?? '').trim().replace(/[€\s]/g, '');
    if (!cleaned) return Number.NaN;
    const normalized = cleaned.includes(',')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  function getInvestmentCategory(type) {
    const normalized = String(type || '').trim().toLocaleLowerCase('es');
    if (['fondo', 'fondos', 'etf', 'renta variable', 'acciones'].includes(normalized)) return 'variable';
    if (['renta fija', 'bono', 'bonos', 'letra', 'letras'].includes(normalized)) return 'fixed';
    return 'other';
  }

  function isDepositClosed(deposit) {
    return String(deposit?.status || '').toLowerCase() === 'closed' || deposit?.sentToCash === true;
  }

  function isDepositActive(deposit) {
    return !isDepositClosed(deposit);
  }

  function normalizeDepositLifecycle(deposit) {
    const normalized = { ...(deposit || {}) };
    const closed = isDepositClosed(normalized);
    normalized.status = closed ? 'closed' : 'active';
    if (closed) {
      normalized.closedAt = normalized.closedAt || normalized.sentToCashAt || null;
      normalized.closedInterest = roundMoney(
        normalized.closedInterest ?? normalized.interest ?? 0
      );
    }
    return normalized;
  }

  function getDepositInterestYear(deposit) {
    const dateValue = deposit?.closedAt || deposit?.sentToCashAt || deposit?.end || '';
    const yearMatch = String(dateValue).match(/^(\d{4})/);
    if (yearMatch) return yearMatch[1];
    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? 'Sin fecha' : String(parsed.getFullYear());
  }

  function groupClosedDepositInterestByYear(deposits) {
    const grouped = new Map();
    (deposits || [])
      .map(normalizeDepositLifecycle)
      .filter(isDepositClosed)
      .forEach((deposit) => {
        const year = getDepositInterestYear(deposit);
        if (!grouped.has(year)) grouped.set(year, { year, total: 0, deposits: [] });
        const amount = roundMoney(deposit.closedInterest ?? deposit.interest ?? 0);
        const group = grouped.get(year);
        group.total = roundMoney(group.total + amount);
        group.deposits.push({ ...deposit, closedInterest: amount });
      });

    return Array.from(grouped.values()).sort((a, b) => String(b.year).localeCompare(String(a.year)));
  }

  function sumInvestmentsByCategory(items, category) {
    return roundMoney(
      (items || [])
        .filter((item) => getInvestmentCategory(item?.type) === category)
        .reduce((total, item) => total + numberValue(item?.amount), 0)
    );
  }

  function calculateSavingsBreakdown(totalIncome, livingExpenses, longTermInvestment) {
    const income = numberValue(totalIncome);
    const living = numberValue(livingExpenses);
    const invested = numberValue(longTermInvestment);
    const availableSavings = roundMoney(income - living - invested);
    const totalSavings = roundMoney(availableSavings + invested);
    return {
      livingExpenses: roundMoney(living),
      longTermInvestment: roundMoney(invested),
      availableSavings,
      availableSavingsRate: income > 0 ? roundMoney((availableSavings / income) * 100) : 0,
      totalSavings,
      totalSavingsRate: income > 0 ? roundMoney((totalSavings / income) * 100) : 0,
      totalOutflows: roundMoney(living + invested)
    };
  }

  function upsertPeriodMap(periods, periodId, data) {
    const next = { ...(periods || {}) };
    next[String(periodId)] = data;
    return next;
  }

  root.HomeFlowCore = Object.freeze({
    calculateSavingsBreakdown,
    getInvestmentCategory,
    groupClosedDepositInterestByYear,
    isDepositActive,
    isDepositClosed,
    normalizeDepositLifecycle,
    numberValue,
    parseMoneyInput,
    roundMoney,
    sumInvestmentsByCategory,
    upsertPeriodMap
  });
})(globalThis);
