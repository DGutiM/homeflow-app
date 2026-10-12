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
        if (closed.closedInterestBasis) merged.closedInterestBasis = closed.closedInterestBasis;
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
          amount: roundMoney(deposit.closedInterest ?? deposit.interest ?? 0),
          estimated: deposit.closedInterestBasis === 'estimate'
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

  function parseLocalDate(dateStr) {
    const [year, month, day] = String(dateStr || '').split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function addMonthsToDate(dateStr, months) {
    const base = parseLocalDate(dateStr);
    if (!base) return null;
    const safeMonths = Math.max(1, Number.parseInt(months || 0, 10) || 0);
    const targetMonthIndex = base.getMonth() + safeMonths;
    const targetYear = base.getFullYear() + Math.floor(targetMonthIndex / 12);
    const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
    const lastDayOfTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
    const clampedDay = Math.min(base.getDate(), lastDayOfTargetMonth);
    return new Date(targetYear, normalizedMonth, clampedDay, 12, 0, 0, 0);
  }

  function calculateDepositEstimate(amount, rate, start, durationMonths, nowDate = null, withholdingRate = 19) {
    const principal = Math.max(0, numberValue(amount));
    const annualRate = Math.max(0, numberValue(rate));
    const safeWithholdingRate = Math.max(0, Math.min(100, numberValue(withholdingRate)));
    const startDate = parseLocalDate(start);
    const endDate = addMonthsToDate(start, durationMonths);
    if (!startDate || !endDate) {
      return {
        end: '',
        totalDays: 0,
        daysRemaining: 0,
        overdueDays: 0,
        grossInterest: 0,
        withholdingRate: roundMoney(safeWithholdingRate),
        interest: 0,
        finalAmount: roundMoney(principal),
        matured: false,
        endingSoon: false,
        dueToday: false
      };
    }

    const totalDays = Math.max(0, Math.round((endDate - startDate) / 86400000));
    const today = nowDate ? new Date(nowDate) : new Date();
    today.setHours(12, 0, 0, 0);
    const rawDaysRemaining = Math.round((endDate - today) / 86400000);
    const matured = rawDaysRemaining < 0;
    const dueToday = rawDaysRemaining === 0;
    const daysRemaining = Math.max(0, rawDaysRemaining);
    const overdueDays = matured ? Math.abs(rawDaysRemaining) : 0;
    const endingSoon = !matured && !dueToday && daysRemaining < 10;
    const grossInterest = principal * (annualRate / 100) * (totalDays / 365);
    const netInterest = grossInterest * (1 - (safeWithholdingRate / 100));
    return {
      end: formatDateInput(endDate),
      totalDays,
      daysRemaining,
      overdueDays,
      grossInterest: roundMoney(grossInterest),
      withholdingRate: roundMoney(safeWithholdingRate),
      interest: roundMoney(netInterest),
      finalAmount: roundMoney(principal + netInterest),
      matured,
      endingSoon,
      dueToday
    };
  }

  function sumInvestmentsByCategory(items, category) {
    return roundMoney(
      (items || [])
        .filter((item) => getInvestmentCategory(item?.type) === category)
        .reduce((total, item) => total + numberValue(item?.amount), 0)
    );
  }

  function summarizeMonthlyInvestments(items) {
    const summary = (items || []).reduce((totals, item) => {
      if (isInternalInvestmentTransfer(item)) return totals;
      const amount = numberValue(item?.amount);
      const category = getInvestmentCategory(item?.type);
      if (category === 'variable') totals.variable += amount;
      else if (category === 'fixed') totals.fixed += amount;
      else totals.other += amount;
      totals.total += amount;
      return totals;
    }, { variable: 0, fixed: 0, other: 0, total: 0 });

    return Object.fromEntries(
      Object.entries(summary).map(([key, value]) => [key, roundMoney(value)])
    );
  }

  function isInternalInvestmentTransfer(item) {
    return item?.fundingSource === 'fixed';
  }

  function getTransferPeriod(transfer) {
    const value = String(transfer?.period || transfer?.date || transfer?.createdAt || '').slice(0, 7);
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : '';
  }

  function buildInvestmentActivity(periods, transfers = []) {
    const byPeriod = new Map();
    const ensure = period => {
      if (!byPeriod.has(period)) byPeriod.set(period, { period, newContributions: 0, transfers: 0, adjustments: 0, totalDirected: 0, items: [] });
      return byPeriod.get(period);
    };
    Object.entries(periods || {}).forEach(([period, data]) => {
      const row = ensure(period);
      (data?.expenses?.monthlyInvestments || []).forEach(item => {
        const source = isInternalInvestmentTransfer(item) ? 'transfer' : 'income';
        row[source === 'transfer' ? 'transfers' : 'newContributions'] += numberValue(item.amount);
        row.items.push({ ...item, source, period });
      });
    });
    (transfers || []).filter(item => item.kind === 'toFunds').forEach(item => {
      const period = getTransferPeriod(item);
      const row = ensure(period || 'Sin fecha');
      const adjustment = item.purpose === 'adjustment' || (!item.purpose && /^ajustes?$/i.test(String(item.note || '').trim()));
      row[adjustment ? 'adjustments' : 'transfers'] += numberValue(item.amount);
      row.items.push({ ...item, name: item.note || 'Renta fija → variable', type: 'Renta variable', source: adjustment ? 'adjustment' : 'transfer', period, inferredPeriod: !item.period });
    });
    return Array.from(byPeriod.values()).map(row => ({
      ...row,
      newContributions: roundMoney(row.newContributions),
      transfers: roundMoney(row.transfers),
      adjustments: roundMoney(row.adjustments),
      totalDirected: roundMoney(row.newContributions + row.transfers)
    })).sort((a, b) => a.period.localeCompare(b.period));
  }

  function groupSmallIncomePayers(periodBreakdowns, threshold = 500) {
    return periodBreakdowns.map(row => {
      const values = new Map();
      let other = 0;
      for (const [key, value] of row.values) {
        if (numberValue(value) > threshold) values.set(key, numberValue(value));
        else other += numberValue(value);
      }
      if (other) values.set('__other__', roundMoney(other));
      return { ...row, values };
    });
  }

  function applyHousingInstallmentDefault(data, housing, period, { isNew = false } = {}) {
    const next = structuredClone(data);
    const schedule = housing?.installment5;
    if (!isNew || !schedule?.startPeriod || period < schedule.startPeriod || (schedule.endPeriod && period > schedule.endPeriod)) return next;
    next.expenses ||= {};
    next.expenses.commonFixed ||= {};
    if (next.expenses.commonFixed.viviendaCuota5 == null) next.expenses.commonFixed.viviendaCuota5 = Math.max(0, numberValue(schedule.amount));
    return next;
  }

  function calculateHousingSummary(housing, periods = {}) {
    const source = housing || {};
    const installmentRows = Object.entries(periods).filter(([, data]) => numberValue(data?.expenses?.commonFixed?.viviendaCuota5) > 0)
      .map(([period, data]) => ({ period, amount: roundMoney(data.expenses.commonFixed.viviendaCuota5) }))
      .sort((a, b) => a.period.localeCompare(b.period));
    const extraPaymentsTotal = (source.extraPayments || []).filter(item => !item.linkedInstallmentPeriod)
      .reduce((acc, item) => acc + numberValue(item.amount), 0);
    const installment5Paid = roundMoney(installmentRows.reduce((sum, row) => sum + row.amount, 0));
    const hipotecaPaid = roundMoney(Object.values(periods).reduce((sum, data) => sum + numberValue(data?.expenses?.commonFixed?.viviendaHipoteca), 0));
    const totalPrice = numberValue(source.targetPrice);
    const entryPaid = numberValue(source.entryPaid);
    const paid = roundMoney(entryPaid + extraPaymentsTotal + installment5Paid + hipotecaPaid);
    return { totalPrice, entryPaid, extraPaymentsTotal: roundMoney(extraPaymentsTotal), installment5Paid, installmentRows, hipotecaPaid, paid, pending: roundMoney(Math.max(0, totalPrice - paid)), percent: totalPrice > 0 ? Math.min(100, paid / totalPrice * 100) : 0 };
  }

  function linkHousingPaymentToPeriod(bundle, paymentId, period) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error('Selecciona un mes válido.');
    const next = structuredClone(bundle);
    const payment = next.profile?.housing?.extraPayments?.find(item => item.id === paymentId);
    if (!payment) throw new Error('El pago ya no existe.');
    if (payment.linkedInstallmentPeriod) throw new Error('Este pago ya está vinculado a un mes.');
    if (!next.periods?.[period]) throw new Error('Carga y guarda primero ese mes en la calculadora.');
    const month = next.periods[period];
    month.expenses ||= {};
    month.expenses.commonFixed ||= {};
    if (numberValue(month.expenses.commonFixed.viviendaCuota5) > 0) throw new Error('Ese mes ya tiene una cuota del 5 %. Revisa el mes antes de vincular otro pago.');
    month.expenses.commonFixed.viviendaCuota5 = roundMoney(payment.amount);
    payment.linkedInstallmentPeriod = period;
    return next;
  }

  function getWorkSchedule(profile, owner, period) {
    return (profile?.workSchedules || []).filter(item => item.owner === owner && item.startPeriod <= period && (!item.endPeriod || item.endPeriod >= period))
      .sort((a, b) => b.startPeriod.localeCompare(a.startPeriod))[0] || null;
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

  function summarizeSavingsPeriods(periods) {
    const totals = (periods || []).reduce((summary, period) => {
      summary.income += numberValue(period?.income);
      summary.totalOutflows += numberValue(period?.totalOutflows);
      summary.availableSavings += numberValue(period?.availableSavings);
      summary.totalSavings += numberValue(period?.totalSavings);
      return summary;
    }, { income: 0, totalOutflows: 0, availableSavings: 0, totalSavings: 0 });

    const income = roundMoney(totals.income);
    return {
      income,
      totalOutflows: roundMoney(totals.totalOutflows),
      availableSavings: roundMoney(totals.availableSavings),
      totalSavings: roundMoney(totals.totalSavings),
      totalSavingsRate: income > 0 ? roundMoney((totals.totalSavings / income) * 100) : 0,
      count: Array.isArray(periods) ? periods.length : 0
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
    applyHousingInstallmentDefault,
    buildInvestmentActivity,
    calculateHousingSummary,
    getTransferPeriod,
    getWorkSchedule,
    groupSmallIncomePayers,
    isInternalInvestmentTransfer,
    linkHousingPaymentToPeriod,
    allocateSavingsByAdult,
    calculateDepositEstimate,
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
    summarizeMonthlyInvestments,
    summarizeSavingsPeriods,
    sumInvestmentsByCategory,
    upsertPeriodMap
  });
})(globalThis);
