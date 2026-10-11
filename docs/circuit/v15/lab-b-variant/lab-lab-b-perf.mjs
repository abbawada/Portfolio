/* Separates the frame cost into: the seek simulation plus draw-command
   issue (main thread), the raster flush forced by a 1px readback, and
   the readback's own baseline after a trivial 1px fill. 520 px, dpr 2. */
import { chromium } from '/Users/abbawada/Projects/Betta/BettaType/betta-live-site/node_modules/playwright/index.mjs';
const port = process.argv[2] || '8652';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 560, height: 820 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const out = {};
for (const st of [1, 3, 5, 6]) {
    await page.goto(`http://localhost:${port}/tools/circuit/harness/lab-b.html?stage=${st}&still=1&v=${Date.now()}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__lab && document.fonts && document.fonts.status === 'loaded');
    await page.waitForTimeout(400);
    const r = await page.evaluate(st => {
        const cv = document.querySelector('.lab-stage canvas'), c = cv.getContext('2d');
        const base = { 1: 1.0, 3: 2.0, 5: 1.1, 6: 0.7 }[st];
        const N = 40, sim = [], flush = [], basel = [], issue0 = window.__lab.stats();
        window.__lab.seek(base); c.getImageData(0, 0, 1, 1);
        for (let i = 0; i < N; i++) {
            const t0 = performance.now();
            window.__lab.seek(base + (i % 10) * 0.05);
            const t1 = performance.now();
            c.getImageData(0, 0, 1, 1);
            const t2 = performance.now();
            c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#000'; c.fillRect(0, 0, 1, 1); c.restore();
            const t3 = performance.now();
            c.getImageData(0, 0, 1, 1);
            const t4 = performance.now();
            sim.push(t1 - t0); flush.push(t2 - t1); basel.push(t4 - t3);
        }
        const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
        const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
        const s1 = window.__lab.stats();
        return { simIssueAvg: avg(sim), simIssueMed: med(sim), flushAvg: avg(flush), flushMed: med(flush), baselineAvg: avg(basel), baselineMed: med(basel),
            drawIssueAvg: (s1.frames - issue0.frames) ? ((s1.avgMs * s1.frames - issue0.avgMs * issue0.frames) / (s1.frames - issue0.frames)) : s1.avgMs, steps: Math.ceil((base + 0.45) * 60) };
    }, st);
    out['s' + st] = r;
    console.log(`stage ${st}: seek(sim ~${r.steps} steps)+draw issue avg ${r.simIssueAvg.toFixed(2)} ms (draw issue alone ${r.drawIssueAvg.toFixed(2)} ms); raster flush avg ${r.flushAvg.toFixed(2)} / med ${r.flushMed.toFixed(2)} ms; readback baseline avg ${r.baselineAvg.toFixed(2)} / med ${r.baselineMed.toFixed(2)} ms`);
}
await browser.close();
console.log('PERF2 ' + JSON.stringify(out));
