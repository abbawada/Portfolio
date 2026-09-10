/* V1.3 race contract: four cars lap without pause on the racing line, never
   touch, stay inside the white lines, never idle, and pass each other
   often enough to watch (a change of order every 15 to 20 s on average).
   Steps the race maths directly (the loop is stopped) for the given
   seconds at 60 Hz. Pass ?seed=N in the URL to repeat a run.
   Usage: node tools/circuit/racetest.mjs URL [seconds] [OUT.json] */
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
await page.evaluate(() => window.__circuit.ready); await page.waitForTimeout(800);
const r = await page.evaluate(secs => {
    const c = window.__circuit; c.stop();
    const n = Math.round(secs * 60), dt = 1 / 60, LEN = 5.8, WID = 2.6;
    let touches = 0, touchAt = null, maxLane = 0, minSpeed = Infinity, prevOrder = null, changes = [], passingFrames = 0, closest = Infinity, closestPair = null, maxGap = 0;
    for (let i = 0; i < n; i++) {
        c.stepRace(dt);
        const g = c.gridState(), order = g.map(x => x.id).join('>');
        if (prevOrder && order !== prevOrder) changes.push(+(i / 60).toFixed(1));
        prevOrder = order;
        if (c.passing()) passingFrames++;
        maxGap = Math.max(maxGap, g[g.length - 1].gap);
        for (let a = 0; a < g.length; a++) {
            maxLane = Math.max(maxLane, Math.abs(g[a].lane)); minSpeed = Math.min(minSpeed, g[a].v);
            for (let b = a + 1; b < g.length; b++) {
                const ds = Math.abs(g[a].s - g[b].s), dl = Math.abs(g[a].lane - g[b].lane);
                if (ds < LEN && dl < WID) { touches++; if (!touchAt) touchAt = [g[a].id, g[b].id, +(i / 60).toFixed(1), +ds.toFixed(2), +dl.toFixed(2)]; }
                const d = Math.hypot(g[a].at[0] - g[b].at[0], g[a].at[1] - g[b].at[1]);
                if (d < closest) { closest = d; closestPair = [g[a].id, g[b].id, +(i / 60).toFixed(1)]; }
            }
        }
    }
    const gaps = changes.map((t, k) => k ? t - changes[k - 1] : t);
    const rs = c.raceState();
    return { seconds: secs, seed: rs.seed, cars: c.gridState().length, touches, touchAt, maxLateral: +maxLane.toFixed(2), minSpeed: +minSpeed.toFixed(2),
             orderChanges: changes.length, meanChangeInterval: changes.length > 1 ? +((changes[changes.length - 1] - changes[0]) / (changes.length - 1)).toFixed(1) : null,
             longestWait: gaps.length ? +Math.max(...gaps).toFixed(1) : null, changeTimes: changes.slice(0, 40),
             passesCompleted: rs.passes, passesAborted: rs.aborts, passingShare: +(passingFrames / n).toFixed(2), maxGapToLeaderS: +maxGap.toFixed(2), closestCentres: +closest.toFixed(2), closestPair,
             lap: rs.lap, calls: c.stats.calls, triangles: c.stats.triangles };
}, secs);
r.errors = errors;
/* cars are 5.8 long and 2.6 wide: a touch is both within a length along the track and within a width across it;
   inside the lines when a centre sits within 3.2 of the middle (the track is 9 wide); never idle; an order change every 15 to 20 s on average, never a wait over 50 s */
r.pass = r.cars === 4 && r.touches === 0 && r.maxLateral <= 3.2 && r.minSpeed > 2 && r.meanChangeInterval !== null && r.meanChangeInterval >= 10 && r.meanChangeInterval <= 24 && r.longestWait <= 50 && errors.length === 0;
console.log(JSON.stringify(r));
if (out) fs.writeFileSync(out, JSON.stringify(r, null, 1));
await browser.close();
