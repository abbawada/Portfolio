/* Gate captures with Playwright over real Chrome (the chrome channel).
   Usage: node tools/circuit/gate.mjs URL OUTDIR [--prefix gate-a] [--no-close]
   Writes: <prefix>-wide-1600.png and <prefix>-wide-1440.png at the default
   view, one close shot per stop, and <prefix>-report.json with the overlap
   audit: label chips against each other, label chips against the other
   stops' screen boxes, each chip's clearance from its own stop's mark
   (markClear, px; labelOverMark lists any that touch), and plan
   footprints against each other.
   Playwright resolves from $PLAYWRIGHT, then ./node_modules, then the
   sibling betta-live-site install. Never downloads a browser. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CANDIDATES = [process.env.PLAYWRIGHT, path.join(ROOT, 'node_modules/playwright/index.mjs'),
    path.join(process.env.HOME || '', 'Projects/Betta/BettaType/betta-live-site/node_modules/playwright/index.mjs')].filter(Boolean);
const pw = CANDIDATES.find(p => fs.existsSync(p));
if (!pw) { console.error('playwright not found; set PLAYWRIGHT=/path/to/playwright/index.mjs'); process.exit(2); }
const { chromium } = await import(pathToFileURL(pw).href);

const [url, outDir] = process.argv.slice(2);
if (!url || !outDir) { console.error('usage: node tools/circuit/gate.mjs URL OUTDIR [--prefix name] [--no-close]'); process.exit(2); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const prefix = arg('--prefix', 'gate'), noClose = process.argv.includes('--no-close');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1, bypassCSP: true });
const page = await ctx.newPage();
page.on('pageerror', e => console.error('page error:', e.message));
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

async function load(width, height) {
    await page.setViewportSize({ width, height });
    await page.goto(url + (url.includes('?') ? '&' : '?') + 'gate=' + Date.now(), { waitUntil: 'load' });
    await page.waitForFunction(() => window.__circuit && window.__circuit.groups, null, { timeout: 20000 });
    await page.evaluate(() => window.__circuit.ready);
    await page.evaluate(() => document.fonts ? document.fonts.ready : null);
    await page.evaluate(() => window.__circuit.dressed);   // the type hoardings, after the fonts
    await page.evaluate(() => window.__circuit.marked);    // the dimensional marks, after the typeface
    await page.waitForTimeout(1800);   // text planes arrive behind the build
}

const AUDIT = `(() => {
    const c = window.__circuit, L = window.CircuitLayout;
    const rect = el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    const hits = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const labels = [...document.querySelectorAll('.ring-pin:not(.ring-heli-pin)')].map(el => ({ id: el.dataset.id, chip: rect(el.querySelector('.ring-pin-text')), pin: rect(el) }));   // round 7: the helicopter's chip moves with the aircraft; it is not a stop label
    /* silhouettes: each stop's layout boxes plus the pieces the world adds
       beside them, projected box by box to convex screen polygons */
    const T = L.LOCATIONS.find(l => l.id === 'about').boxes[0], G = L.LOCATIONS.find(l => l.id === 'projects').boxes[0], W = L.LOCATIONS.find(l => l.id === 'contact').boxes[0];
    const TD = L.LOCATIONS.find(l => l.id === 'about').boxes[3], TU = TD[0] + TD[2] / 2 - 2.5, TV = TD[1] + TD[3] / 2 - 2.5;   // the core's centre, from the deck
    const EXTRA = { about: [[TU + 8, TV + 7, 18, 0.7, 26.2, 0], [TU + 6.6, TV + 4.6, 2.8, 2.8, 1.4, 0]],
                    projects: [[G[0] - 10, G[1], 14, 14, 19, 0], [G[0] + 64, G[1] + 7, 6, 6, 4, 0], [G[0] + 62, G[1] + 2, 12, 8, 9, 0]],
                    contact: [] };
    const sil = {};
    /* the hoardings, as set dressing a label must not cover */
    const hoardBoxes = [];
    for (const wall of L.HOARDINGS) {
        let along = 0;
        for (const p of wall.panels) {
            const w = p.w, z0 = p.z0 != null ? p.z0 : (wall.z0 || 0);
            const u = wall.face === 'u' ? wall.at[0] : wall.at[0] + along, v = wall.face === 'u' ? wall.at[1] + along : wall.at[1];
            hoardBoxes.push(wall.face === 'u' ? [u, v, 0.6, w, p.h, z0] : [u, v, w, 0.6, p.h, z0]);
            along += w + (wall.gap || 0);
        }
    }
    const markBoxes = c.marks ? c.marks() : [], srcBoxes = {};
    for (const loc of L.LOCATIONS) {
        const boxes = loc.boxes.map(b => b.slice(0, 6)).concat(EXTRA[loc.id] || []).concat(markBoxes.filter(m => m.id === loc.id).map(m => m.box));
        srcBoxes[loc.id] = boxes;
        if (loc.arena) {
            const A = loc.arena; boxes.push(A.apron.concat([0.1, 0]));
            for (const sd of A.stands) boxes.push([sd[0], sd[1], sd[2], sd[3], 4.8, 0]);
            boxes.push(A.pylon.concat([0])); boxes.push(A.head); for (const l of A.lights) boxes.push([l[0] - 1.6, l[1] - 1.5, 3.2, 3, A.lightH + 1, 0]);
            boxes.push([A.rep[0] - 3.5, A.rep[1] - 3.5, 7, 7, 9, 0]);
        }
        sil[loc.id] = boxes.map(([u, v, w, d, h, z0]) => {
            const pts = [];
            for (const x of [u, u + w]) for (const y of [z0, z0 + h]) for (const z of [v, v + d]) { const s = c.project(x, y, z); pts.push([s[0], s[1]]); }
            pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
            const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
            const lo = [], up = [];
            for (const q of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
            for (const q of pts.slice().reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
            return lo.slice(0, -1).concat(up.slice(0, -1));
        });
    }
    /* convex polygon against a rect: separating axis test */
    const polyRect = (poly, r) => {
        const rp = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
        const axes = [[1, 0], [0, 1]];
        for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; axes.push([-(b[1] - a[1]), b[0] - a[0]]); }
        for (const ax of axes) {
            const pr = p => p.map(q => q[0] * ax[0] + q[1] * ax[1]);
            const A = pr(poly), B = pr(rp);
            if (Math.max(...A) < Math.min(...B) || Math.max(...B) < Math.min(...A)) return false;
        }
        return true;
    };
    const polyPoly = (P, Q) => {
        const axes = [];
        for (const poly of [P, Q]) for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; axes.push([-(b[1] - a[1]), b[0] - a[0]]); }
        for (const ax of axes) {
            const pr = p => p.map(q => q[0] * ax[0] + q[1] * ax[1]);
            const A = pr(P), B = pr(Q);
            if (Math.max(...A) < Math.min(...B) || Math.max(...B) < Math.min(...A)) return false;
        }
        return true;
    };
    const project6 = ([u, v, w, d, h, z0]) => {
        const pts = [];
        for (const x of [u, u + w]) for (const y of [z0, z0 + h]) for (const z of [v, v + d]) { const s = c.project(x, y, z); pts.push([s[0], s[1]]); }
        pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const lo = [], up = [];
        for (const q of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
        for (const q of pts.slice().reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
        return lo.slice(0, -1).concat(up.slice(0, -1));
    };
    const hoardPolys = hoardBoxes.map(project6);
    const labelPairs = [], labelVsStop = [], stopPairs = [], labelVsHoarding = [];
    for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) if (hits(labels[i].pin, labels[j].pin)) labelPairs.push([labels[i].id, labels[j].id]);
        for (const id in sil) if (id !== labels[i].id && sil[id].some(poly => polyRect(poly, labels[i].chip))) labelVsStop.push([labels[i].id, id]);
        if (hoardPolys.some(poly => polyRect(poly, labels[i].chip))) labelVsHoarding.push(labels[i].id);
    }
    /* each chip against its own stop's mark: the tag must read as its own
       object, so the report carries the clearance in px (negative = overlap) */
    const grow = (r, m) => ({ x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m });
    const markClear = {}, labelOverMark = [];
    for (const l of labels) {
        const mks = markBoxes.filter(m => m.id === l.id); if (!mks.length) continue;   // round 7: a diagonal mark comes as several pieces
        const polys = mks.map(mk => project6(mk.box)), touches = r => polys.some(poly => polyRect(poly, r)); let m = 0;
        if (touches(l.chip)) { m = -1; labelOverMark.push(l.id); } else while (m < 200 && !touches(grow(l.chip, m + 1))) m += 1;
        markClear[l.id] = m;
    }
    const ids = Object.keys(sil), detail = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        let hit = null;
        sil[ids[i]].forEach((P, a) => sil[ids[j]].forEach((Q, b) => { if (!hit && polyPoly(P, Q)) hit = [a, b]; }));
        if (hit) { stopPairs.push([ids[i], ids[j]]); detail.push({ pair: [ids[i], ids[j]], a: srcBoxes[ids[i]][hit[0]].map(n => +n.toFixed(1)), b: srcBoxes[ids[j]][hit[1]].map(n => +n.toFixed(1)) }); }
    }
    for (const l of labels) for (const id in sil) if (id !== l.id) sil[id].forEach((poly, k) => { if (polyRect(poly, l.chip)) detail.push({ label: l.id, over: id, box: srcBoxes[id][k].map(n => +n.toFixed(1)), chip: l.chip }); });
    /* plan footprints: every box of a stop plus the arena pieces, as rects in plan */
    const plan = {};
    for (const loc of L.LOCATIONS) {
        const r = loc.boxes.map(b => [b[0], b[1], b[2], b[3]]).concat((EXTRA[loc.id] || []).map(b => b.slice(0, 4)));
        if (loc.arena) { r.push(loc.arena.apron.slice(0, 4)); r.push([loc.arena.rep[0] - 3.5, loc.arena.rep[1] - 3.5, 7, 7]); }
        plan[loc.id] = r;
    }
    const planPairs = [];
    const rh = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++)
        if (plan[ids[i]].some(a => plan[ids[j]].some(b => rh(a, b)))) planPairs.push([ids[i], ids[j]]);
    const chipStyle = getComputedStyle(document.querySelector('.ring-pin-name'));
    const bbox = polys => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of polys) for (const q of p) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); } return { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) }; };
    return { viewport: [innerWidth, innerHeight], zoom: c.nav.state().zoom, target: c.nav.state().target,
             labels: labels.map(l => ({ id: l.id, chip: Object.fromEntries(Object.entries(l.chip).map(([k, v]) => [k, Math.round(v)])) })),
             stops: Object.fromEntries(ids.map(id => [id, bbox(sil[id])])),
             labelOverlaps: labelPairs, labelOverStop: labelVsStop, labelOverHoarding: labelVsHoarding, labelOverMark, markClear, stopOverlaps: stopPairs, planOverlaps: planPairs, detail,
             labelFont: chipStyle.fontSize + ' ' + chipStyle.fontWeight, calls: c.stats.calls, triangles: c.stats.triangles, fps: +c.meanFps().toFixed(1) };
})()`;

const report = { url, wide: {}, close: [], errors };
for (const [w, h] of [[1600, 900], [1440, 900]]) {
    await load(w, h);
    const file = path.join(outDir, `${prefix}-wide-${w}.png`);
    await page.screenshot({ path: file });
    report.wide[w] = await page.evaluate(AUDIT);
    console.log(file, JSON.stringify({ labelOverlaps: report.wide[w].labelOverlaps, labelOverStop: report.wide[w].labelOverStop, labelOverHoarding: report.wide[w].labelOverHoarding, labelOverMark: report.wide[w].labelOverMark, markClear: report.wide[w].markClear, planOverlaps: report.wide[w].planOverlaps, stopOverlaps: report.wide[w].stopOverlaps, fps: report.wide[w].fps, calls: report.wide[w].calls }));
}
if (!noClose) {
    await load(1600, 900);
    const locs = await page.evaluate(() => window.CircuitLayout.LOCATIONS.map(l => ({ id: l.id, num: l.num, anchor: l.anchor, labelZ: l.labelZ })));
    for (const loc of locs) {
        await page.evaluate(([id, a, labelZ]) => {
            const UP = [-Math.SQRT1_2, -Math.SQRT1_2], lift = labelZ * 0.45 * 1.73;
            window.__circuit.nav.flyTo(a[0] + UP[0] * lift, a[1] + UP[1] * lift, 2.2);
        }, [loc.id, loc.anchor, loc.labelZ]);
        await page.waitForTimeout(1200);
        const file = path.join(outDir, `${prefix}-${loc.num}-${loc.id}.png`);
        await page.screenshot({ path: file });
        report.close.push(file);
        console.log(file);
    }
}
fs.writeFileSync(path.join(outDir, `${prefix}-report.json`), JSON.stringify(report, null, 1));
await browser.close();
if (errors.length) console.log('console errors:', errors);
