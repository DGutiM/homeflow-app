import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

assert.match(html, /<script src="homeflow-core\.js"><\/script>/);
assert.match(html, /<script src="app\.js"><\/script>/);
assert.match(html, /<link rel="stylesheet" href="styles\.css(?:\?[^"]+)?"/);
assert.match(app, /document\.querySelectorAll\('\[data-tab\]'\)/);
assert.doesNotMatch(app, /function sendDepositToCash/);
assert.match(app, /HomeFlowCore\.upsertPeriodMap/);
assert.match(app, /selectedPeriod !== state\.currentPeriod/);
assert.match(app, /function closeDeposit\(depositId\)/);
assert.match(html, /Intereses de depósitos por año/);
assert.match(app, /const globalDeposits = deposits\.filter\(isDepositActive\)/);
assert.match(html, /class="workspace-accordion/);
assert.match(html, /id="history-mobile-list"/);
assert.match(html, /id="compound-inflation"/);
assert.match(app, /hiddenCount = Math\.max\(0, items\.length - limit\)/);
assert.match(app, /El mes anterior se ha reemplazado, no se ha duplicado/);
assert.match(html, /id="auth-toggle"/);
assert.match(html, /Rosco Económico/);
assert.match(html, /Patrimonio inicial/);
assert.match(html, /Listado de depósitos/);
assert.doesNotMatch(html, /<details class="workspace-accordion[^"]*"[^>]*\sopen/);
assert.doesNotMatch(html, /id="aggregated-monthly-investment-list"/);
assert.doesNotMatch(html, /function applyTheme/);
assert.match(app, /function renderActiveDepositList/);
assert.match(app, /\(\) => renderActiveDepositList\(deposits, todayDevice\)/);
assert.match(app, /HomeFlowCore\.calculateSavingsBreakdown/);
assert.doesNotMatch(styles, /person-card-header|mini-summary-grid|surface-cash/);
assert.match(styles, /\.mobile-nav\s*\{[\s\S]*?bottom:\s*0;/);
assert.match(styles, /body\s*\{[\s\S]*?overflow:\s*visible;/);
assert.match(html, /id="kpi-total-savings"/);
assert.match(html, /id="hist-total-savings-total"/);
assert.match(html, /data-scroll-on-open/);
assert.match(html, /id="history-person-savings"/);
assert.match(html, /id="savings-account-list"/);
assert.match(html, /id="investments-total-savings-accounts"/);
assert.match(app, /restoreOpenAccordionKeys\(row, openAccordionKeys\)/);
assert.match(app, /HomeFlowCore\.allocateSavingsByAdult/);
assert.match(app, /HomeFlowCore\.calculateSavingsAccountProjection/);

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'No debe haber IDs HTML duplicados');

console.log('index-contract: contratos correctos');
