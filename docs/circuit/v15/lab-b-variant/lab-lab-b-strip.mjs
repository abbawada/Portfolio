/* Frames of one stage at given loop times, tiled into one PNG.
   Usage: node strip.mjs STAGE OUT.png t1,t2,t3,... [cols] [dpr] */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from '/Users/abbawada/Projects/Betta/BettaType/betta-live-site/node_modules/playwright/index.mjs';

const [stageArg, out, timesArg, colsArg = '3', dprArg = '2'] = process.argv.slice(2);
const times = timesArg.split(',').map(Number), cols = parseInt(colsArg, 10), dpr = parseFloat(dprArg);
const tmp = fs.mkdtempSync('/private/tmp/claude-501/-Users-abbawada-Techstars-Betta/d2cbf270-c5b8-4a97-b867-e345c7e716ea/scratchpad/lab-b/frames-');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 560, height: 760 }, deviceScaleFactor: dpr });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('http://localhost:8652/tools/circuit/harness/lab-b.html?stage=' + stageArg + '&still=1&v=' + Date.now(), { waitUntil: 'load' });
await page.waitForFunction(() => window.__lab && document.fonts && document.fonts.status === 'loaded');
await page.waitForTimeout(250);
const files = [];
for (let i = 0; i < times.length; i++) {
    await page.evaluate(t => window.__lab.seek(t), times[i]);
    await page.waitForTimeout(60);
    const f = path.join(tmp, `f${i}.png`);
    await page.locator('.lab-stage').screenshot({ path: f });
    files.push(f);
}
await browser.close();
/* tile with ffmpeg: rows of `cols` */
const rows = Math.ceil(files.length / cols);
const inputs = files.flatMap(f => ['-i', f]);
let layout = [];
for (let i = 0; i < files.length; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    layout.push((c === 0 ? '0' : Array.from({ length: c }, (_, k) => 'w' + k).join('+')) + '_' + (r === 0 ? '0' : Array.from({ length: r }, (_, k) => 'h' + (k * cols)).join('+')));
}
const filter = files.length === 1 ? 'copy' : `xstack=inputs=${files.length}:layout=${layout.join('|')}:fill=black`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, out]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log((errors.length ? errors.join('\n') + '\n' : '') + 'wrote ' + out + ' (' + files.length + ' frames, ' + cols + ' per row, ' + rows + ' rows)');
