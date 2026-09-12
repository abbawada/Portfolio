/* Race contract for the Wikipedia-driven grid: the field never touches,
   stays inside the white lines, and its order is exactly yesterday's
   view-count rank, unchanged for the whole run. That last check is the
   point of this version of the test: the order used to be simulated and
   required to change; now the ranking is real and already decided, so
   this test fails if it EVER changes, which would mean something is
   still simulating a race the data already settled. "Never idle" needs
   no runtime check any more: every car's position is now derived from
   one shared distance variable that only ever advances, so idling is
   structurally impossible rather than something to measure.
   Steps the race maths directly (the loop is stopped) for the given
   seconds at 60 Hz. Usage: node tools/circuit/racetest.mjs URL [seconds] [OUT.json] */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pw = [process.env.PLAYWRIGHT, path.join(ROOT, 'node_modules/playwright/index.mjs'),
    path.join(process.env.HOME || '', 'Projects/Betta/BettaType/betta-live-site/node_modules/playwright/index.mjs')].filter(Boolean).find(p => fs.existsSync(p));
const { chromium } = await import(pathToFileURL(pw).href);
const [url, secsArg, out] = process.argv.slice(2);
const secs = +(secsArg || 240);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { waitUntil: 'load' });
await page.waitForFunction(() => window.__circuit && window.__circuit.groups);
await page.evaluate(() => window.__circuit.ready);
await page.evaluate(() => window.__circuit.fielded);
await page.waitForTimeout(800);
const r = await page.evaluate(secs => {
    const c = window.__circuit; c.stop();
    const n = Math.round(secs * 60), dt = 1 / 60, LEN = 5.8, WID = 2.6;
    const startOrder = c.gridState().map(x => x.id).join('>');
    let touches = 0, touchAt = null, maxLateral = 0, orderEverChanged = false, changeAt = null;
    let gapMin = Infinity, gapMax = -Infinity;
    for (let i = 0; i < n; i++) {
        c.stepRace(dt);
        const g = c.gridState();
        const order = g.map(x => x.id).join('>');
        if (order !== startOrder && !orderEverChanged) { orderEverChanged = true; changeAt = +(i / 60).toFixed(2); }
        for (let a = 0; a < g.length; a++) {
            maxLateral = Math.max(maxLateral, Math.abs(g[a].lane));
            if (a > 0) { const gap = g[a - 1].s - g[a].s; gapMin = Math.min(gapMin, gap); gapMax = Math.max(gapMax, gap); }
            for (let b = a + 1; b < g.length; b++) {
                const ds = Math.abs(g[a].s - g[b].s), dl = Math.abs(g[a].lane - g[b].lane);
                if (ds < LEN && dl < WID) { touches++; if (!touchAt) touchAt = [g[a].id, g[b].id, +(i / 60).toFixed(2)]; }
            }
        }
    }
    const finalOrder = c.gridState(), rs = c.raceState();
    return { seconds: secs, cars: finalOrder.length, startOrder: startOrder.split('>'), finalOrder: finalOrder.map(x => x.id),
             orderEverChanged, changeAt, touches, touchAt, maxLateral: +maxLateral.toFixed(2),
             gapMin: +gapMin.toFixed(2), gapMax: +gapMax.toFixed(2), leader: rs.leader, date: rs.date, status: rs.status,
             views: finalOrder.map(x => ({ id: x.id, name: x.name, views: x.views, fixed: x.fixed })),
             calls: c.stats.calls, triangles: c.stats.triangles };
}, secs);
r.errors = errors;
/* the field is whatever data/race-standings.json lists (normally 9): zero
   touches, inside the lines (a centre within 3.2 of the middle on a track
   9 wide), the gap between adjacent cars constant to two decimal places
   (proof nothing is simulating overtakes), and the order identical at the
   start and the end of the run */
r.gapConstant = (r.gapMax - r.gapMin) < 0.05;
r.viewsDescending = r.views.every((v, i) => i === 0 || r.views[i - 1].views >= v.views);
r.pass = r.cars >= 2 && r.touches === 0 && r.maxLateral <= 3.2 && !r.orderEverChanged && r.gapConstant && r.viewsDescending && errors.length === 0;
console.log(JSON.stringify(r));
if (out) fs.writeFileSync(out, JSON.stringify(r, null, 1));
await browser.close();
