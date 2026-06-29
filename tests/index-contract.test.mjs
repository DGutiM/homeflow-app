import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

assert.match(html, /<script src="homeflow-core\.js"><\/script>/);
assert.match(html, /<script src="app\.js"><\/script>/);
assert.match(html, /<link rel="stylesheet" href="styles\.css"/);
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

console.log('index-contract: contratos correctos');
