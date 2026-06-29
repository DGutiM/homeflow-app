import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

assert.match(html, /<script src="homeflow-core\.js"><\/script>/);
assert.match(html, /<script src="app\.js"><\/script>/);
assert.match(html, /<link rel="stylesheet" href="styles\.css"/);
assert.match(app, /document\.querySelectorAll\('\[data-tab\]'\)/);
assert.doesNotMatch(app, /function sendDepositToCash/);
assert.match(app, /bundle\.periods\[periodId\] = structuredClone\(data\)/);
assert.match(app, /selectedPeriod !== state\.currentPeriod/);
assert.match(app, /function closeDeposit\(depositId\)/);
assert.match(html, /Intereses de depósitos por año/);
assert.match(app, /const globalDeposits = deposits\.filter\(isDepositActive\)/);

console.log('index-contract: contratos correctos');
