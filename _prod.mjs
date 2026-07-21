import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type()==='error') errs.push('console: '+m.text()); });

// MODELS: in-page search + navbar palette
await p.goto('http://localhost:3000/app/models', { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
const inPage = p.locator('input[placeholder="Search models…"]');
await inPage.click(); await inPage.type('claude', {delay:20});
await p.waitForTimeout(600);
const rows = await p.locator('a[href^="/app/models/"]').count();
const inPageVal = await inPage.inputValue();

await p.locator('header button:has-text("Search")').first().click();
await p.waitForTimeout(400);
const cmd = p.locator('[cmdk-input]');
await cmd.type('gpt', {delay:20}); await p.waitForTimeout(400);
const cmdVal = await cmd.inputValue();
const cmdItems = await p.locator('[cmdk-item]').count();
await p.keyboard.press('Escape');

// COMPARE: does adding a model work?
await p.goto('http://localhost:3000/app/compare', { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
const addBtn = p.locator('button:has-text("Add"), button:has-text("model")').first();
let compareState = 'no add button';
if (await addBtn.count()) { await addBtn.click(); await p.waitForTimeout(500);
  compareState = 'clicked, cmd items: ' + await p.locator('[cmdk-item]').count(); }

console.log('page/console errors:', errs.length ? errs.slice(0,4) : 'NONE');
console.log('in-page search: typed', JSON.stringify(inPageVal), '| rows now:', rows);
console.log('navbar palette: typed', JSON.stringify(cmdVal), '| items:', cmdItems);
console.log('compare:', compareState);
await b.close();
