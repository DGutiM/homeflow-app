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

  function getDepositIdentity(deposit) {
    if (deposit?.id) return `id:${deposit.id}`;
    return [
      String(deposit?.name || 'deposito').trim().toLocaleLowerCase('es'),
      String(deposit?.bank || '').trim().toLocaleLowerCase('es'),
      String(deposit?.start || ''),
      roundMoney(deposit?.amount || 0)
    ].join('|');
  }

  function getDepositLifecycleTimestamp(deposit) {
    const value = deposit?.closedAt || deposit?.sentToCashAt || deposit?.updatedAt || deposit?.createdAt || '';
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function mergeDepositSources(...sources) {
    const depositsById = new Map();
    sources.flatMap(source => Array.isArray(source) ? source : []).forEach((rawDeposit) => {
      const deposit = normalizeDepositLifecycle(rawDeposit);
      const key = getDepositIdentity(deposit);
      const existing = depositsById.get(key);
      if (!existing) {
        depositsById.set(key, deposit);
        return;
      }

      const merged = { ...existing, ...deposit };
      const closedVersions = [existing, deposit]
        .filter(isDepositClosed)
        .sort((a, b) => getDepositLifecycleTimestamp(b) - getDepositLifecycleTimestamp(a));
      if (closedVersions.length) {
        const closed = closedVersions[0];
        merged.status = 'closed';
        merged.closedAt = closed.closedAt || closed.sentToCashAt || existing.closedAt || deposit.closedAt || null;
        merged.closedInterest = roundMoney(
          closed.closedInterest ?? closed.interest ?? existing.closedInterest ?? deposit.closedInterest ?? 0
        );
      }
      depositsById.set(key, normalizeDepositLifecycle(merged));
    });
    return Array.from(depositsById.values());
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

  function groupInvestmentInterestByYear(deposits, savingsAccounts) {
    const events = [];
    (deposits || [])
      .map(normalizeDepositLifecycle)
      .filter(isDepositClosed)
      .forEach((deposit) => {
        events.push({
          id: deposit.id || getDepositIdentity(deposit),
          sourceType: 'deposit',
          sourceName: deposit.name || 'Depósito',
          institution: deposit.bank || '',
          owner: deposit.owner || 'Hogar',
          date: deposit.closedAt || deposit.sentToCashAt || deposit.end || '',
          amount: roundMoney(deposit.closedInterest ?? deposit.interest ?? 0)
        });
      });

    (savingsAccounts || []).forEach((account) => {
      (Array.isArray(account?.interestEntries) ? account.interestEntries : []).forEach((entry) => {
        events.push({
          id: entry.id || `${account.id || account.name || 'cuenta'}-${entry.date || ''}-${entry.amount || 0}`,
          sourceType: 'savings-account',
          sourceName: account.name || 'Cuenta remunerada',
          institution: account.name || '',
          owner: account.owner || 'Hogar',
          date: entry.date || entry.createdAt || '',
          amount: roundMoney(entry.amount || 0)
        });
      });
    });

    const grouped = new Map();
    events.forEach((event) => {
      const year = getDepositInterestYear({ closedAt: event.date });
      if (!grouped.has(year)) grouped.set(year, { year, total: 0, depositTotal: 0, savingsAccountTotal: 0, events: [] });
      const group = grouped.get(year);
      group.total = roundMoney(group.total + event.amount);
      if (event.sourceType === 'deposit') group.depositTotal = roundMoney(group.depositTotal + event.amount);
      else group.savingsAccountTotal = roundMoney(group.savingsAccountTotal + event.amount);
      group.events.push(event);
    });

    return Array.from(grouped.values())
      .map(group => ({ ...group, events: group.events.sort((a, b) => String(b.date).localeCompare(String(a.date))) }))
      .sort((a, b) => String(b.year).localeCompare(String(a.year)));
  }

  function calculateDepositPortfolio(deposits) {
    const active = (deposits || []).map(normalizeDepositLifecycle).filter(isDepositActive);
    return active.reduce((summary, deposit) => {
      summary.count += 1;
      summary.capital = roundMoney(summary.capital + numberValue(deposit.amount));
      summary.pendingInterest = roundMoney(summary.pendingInterest + numberValue(deposit.interest));
      summary.maturityTotal = roundMoney(summary.maturityTotal + numberValue(deposit.finalAmount || (numberValue(deposit.amount) + numberValue(deposit.interest))));
      return summary;
    }, { count: 0, capital: 0, pendingInterest: 0, maturityTotal: 0 });
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

  function allocateSavingsByAdult(adults, sharedLivingExpenses, householdLongTermInvestment) {
    const members = Array.isArray(adults) ? adults : [];
    if (!members.length) return [];
    const sharedLivingPerAdult = numberValue(sharedLivingExpenses) / members.length;
    const sharedInvestmentPerAdult = numberValue(householdLongTermInvestment) / members.length;
    return members.map((adult) => {
      const income = numberValue(adult?.income);
      const personalExpenses = numberValue(adult?.personalExpenses);
      const longTermInvestment = numberValue(adult?.longTermInvestment) + sharedInvestmentPerAdult;
      const allocatedLivingExpenses = personalExpenses + sharedLivingPerAdult;
      const savings = calculateSavingsBreakdown(income, allocatedLivingExpenses, longTermInvestment);
      return {
        id: adult?.id || '',
        name: adult?.name || 'Adulto',
        income: roundMoney(income),
        personalExpenses: roundMoney(personalExpenses),
        sharedLivingExpenses: roundMoney(sharedLivingPerAdult),
        allocatedLivingExpenses: roundMoney(allocatedLivingExpenses),
        longTermInvestment: savings.longTermInvestment,
        availableSavings: savings.availableSavings,
        totalSavings: savings.totalSavings
      };
    });
  }

  function calculateSavingsAccountProjection(balance, annualRate) {
    const principal = Math.max(0, numberValue(balance));
    const rate = Math.max(0, numberValue(annualRate));
    const monthlyRate = Math.pow(1 + (rate / 100), 1 / 12) - 1;
    const monthlyInterest = roundMoney(principal * monthlyRate);
    const annualInterest = roundMoney(principal * (rate / 100));
    return {
      balance: roundMoney(principal),
      annualRate: roundMoney(rate),
      monthlyInterest,
      annualInterest,
      projectedBalanceOneYear: roundMoney(principal + annualInterest)
    };
  }

  function upsertPeriodMap(periods, periodId, data) {
    const next = { ...(periods || {}) };
    next[String(periodId)] = data;
    return next;
  }

  root.HomeFlowCore = Object.freeze({
    allocateSavingsByAdult,
    calculateDepositPortfolio,
    calculateSavingsAccountProjection,
    calculateSavingsBreakdown,
    getInvestmentCategory,
    groupClosedDepositInterestByYear,
    groupInvestmentInterestByYear,
    isDepositActive,
    isDepositClosed,
    mergeDepositSources,
    normalizeDepositLifecycle,
    numberValue,
    parseMoneyInput,
    roundMoney,
    sumInvestmentsByCategory,
    upsertPeriodMap
  });
})(globalThis);
