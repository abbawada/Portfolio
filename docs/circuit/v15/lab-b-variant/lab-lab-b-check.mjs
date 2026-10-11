/* The lab, variant B: the contract check over real Chrome.
   Usage: node check.mjs [port]
   Mounts the harness, asserts zero page errors, scrubs every stage with
   the keyboard, checks autoplay and the hover pause, toggles reduced
   motion, resizes to 360px, destroys through the window hook and asserts
   the container is empty and no frames keep running, then measures the
   draw cost per frame. Exit code 1 on any failure. */
import { chromium } from '/Users/abbawada/Projects/Betta/BettaType/betta-live-site/node_modules/playwright/index.mjs';

const port = process.argv[2] || '8652';
const URL = `http://localhost:${port}/tools/circuit/harness/lab-b.html`;
const results = [];
let failed = 0;
function check(name, ok, detail) {
    results.push({ name, ok: !!ok, detail });
    if (!ok) failed++;
    console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  (' + detail + ')' : ''));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 560, height: 820 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => {
    window.__rafCount = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => { window.__rafCount++; return raf(cb); };
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

async function load(query) {
    await page.goto(URL + '?v=' + Date.now() + (query ? '&' + query : ''), { waitUntil: 'load' });
    await page.waitForFunction(() => window.__lab && document.fonts && document.fonts.status === 'loaded', null, { timeout: 15000 });
    await page.waitForTimeout(300);
}
const state = () => page.evaluate(() => {
    const tabs = [...document.querySelectorAll('.lab-tab')];
    return {
        index: window.__lab.stats().index,
        selected: tabs.map(t => t.getAttribute('aria-selected')),
        tabindex: tabs.map(t => t.tabIndex),
        line: document.querySelector('.lab-line').textContent,
        date: document.querySelector('.lab-date').firstChild.textContent,
        number: document.querySelector('.lab-number b').textContent,
        focused: tabs.indexOf(document.activeElement),
        interactions: window.__labInteractions || 0,
        raf: window.__rafCount
    };
});

/* 1. mount, live, zero errors */
await load('');
await page.waitForTimeout(1500);
check('zero page errors after 1.5 s live', errors.length === 0, errors.join(' | '));
const dom = await page.evaluate(() => {
    const fig = document.querySelector('figure.lab');
    const cv = fig.querySelector('.lab-stage canvas');
    const r = cv.getBoundingClientRect();
    return {
        fig: !!fig, canvasHidden: cv.getAttribute('aria-hidden') === 'true',
        cssW: r.width, cssH: r.height, pxW: cv.width, pxH: cv.height,
        containerW: document.getElementById('lab').clientWidth,
        live: fig.querySelector('figcaption.lab-cap').getAttribute('aria-live'),
        tablist: !!fig.querySelector('.lab-time [role="tablist"]'),
        tabs: fig.querySelectorAll('.lab-tab[role="tab"]').length,
        labels: [...fig.querySelectorAll('.lab-tab')].map(t => t.getAttribute('aria-label')),
        number: fig.querySelector('.lab-number b').textContent
    };
});
check('figure.lab with an aria-hidden canvas', dom.fig && dom.canvasHidden);
check('canvas fills the 520 container at 3:2', Math.abs(dom.cssW - dom.containerW) <= 2 && Math.abs(dom.cssW / dom.cssH - 1.5) < 0.02, `${dom.cssW}x${dom.cssH} css, container ${dom.containerW}`);
check('canvas backing store is dpr 2', dom.pxW === Math.round(dom.cssW * 2) || Math.abs(dom.pxW - dom.cssW * 2) <= 4, `${dom.pxW}x${dom.pxH} px`);
check('caption is aria-live polite', dom.live === 'polite');
check('six tabs in a tablist with date labels', dom.tablist && dom.tabs === 6 && dom.labels.every(l => /20\d\d/.test(l)), dom.labels.join(' / '));
check('the one number sits in the scene', dom.number === '1');
let s0 = await state();
check('stage 1 selected, roving tabindex', s0.selected.join('') === 'truefalsefalsefalsefalsefalse' && s0.tabindex.join(',') === '0,-1,-1,-1,-1,-1');
check('frames are running while live', s0.raf > 30, `${s0.raf} rAF calls`);

/* 2. keyboard scrub through every stage: arrows move, Enter selects */
const STAGES = await page.evaluate(() => window.__labStages.map(s => ({ date: s.date, line: s.line, number: s.number })));
await page.focus('.lab-tab[aria-selected="true"]');
let keyOk = true, keyDetail = [];
for (let i = 1; i < STAGES.length; i++) {
    await page.keyboard.press('ArrowRight');
    const f = await state();
    if (f.focused !== i) { keyOk = false; keyDetail.push(`ArrowRight did not focus tab ${i} (focused ${f.focused})`); }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);   /* the cut to black and back */
    const s = await state();
    if (s.index !== i || s.selected[i] !== 'true' || s.line !== STAGES[i].line || s.number !== STAGES[i].number || s.date !== STAGES[i].date) {
        keyOk = false; keyDetail.push(`stage ${i + 1}: index ${s.index}, selected ${s.selected[i]}, line ok ${s.line === STAGES[i].line}`);
    }
}
check('ArrowRight + Enter selects every stage and updates caption, number, aria-selected', keyOk, keyDetail.join('; '));
let sEnd = await state();
check('onInteract called once per keyboard selection', sEnd.interactions === STAGES.length - 1, `${sEnd.interactions} calls`);
await page.keyboard.press('ArrowLeft'); await page.keyboard.press(' '); await page.waitForTimeout(800);
let sBack = await state();
check('ArrowLeft + Space goes back one stage', sBack.index === STAGES.length - 2, `index ${sBack.index}`);
await page.keyboard.press('Home'); await page.keyboard.press('Enter'); await page.waitForTimeout(800);
let sHome = await state();
check('Home + Enter returns to stage 1', sHome.index === 0);
check('zero page errors after the keyboard pass', errors.length === 0, errors.join(' | '));

/* 3. autoplay advances after about 7 s; hovering pauses it */
await load('');
await page.mouse.move(5, 5);
await page.waitForTimeout(8600);
let sAuto = await state();
check('autoplay moves to stage 2 after ~7 s', sAuto.index === 1, `index ${sAuto.index} at 8.6 s`);
await load('');
const box = await page.locator('.lab-stage').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(8600);
let sHover = await state();
check('autoplay holds while hovered', sHover.index === 0, `index ${sHover.index} after 8.6 s hovered`);
await page.mouse.move(5, 5);

/* 4. a click on a tab calls onInteract and holds autoplay for 25 s */
await load('');
await page.click('.lab-tab:nth-child(3)');
await page.waitForTimeout(700);
await page.mouse.move(5, 5);
await page.evaluate(() => document.activeElement && document.activeElement.blur());
await page.waitForTimeout(8600);
let sClick = await state();
check('click selects stage 3 and the 25 s hold keeps it there past 8 s', sClick.index === 2 && sClick.interactions === 1, `index ${sClick.index}, interactions ${sClick.interactions}`);

/* 5. reduced motion: no loop, no autoplay, scrubbing swaps instantly */
await ctx.close();
const ctx2 = await browser.newContext({ viewport: { width: 560, height: 820 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
await ctx2.addInitScript(() => {
    window.__rafCount = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => { window.__rafCount++; return raf(cb); };
});
const page2 = await ctx2.newPage();
page2.on('pageerror', e => errors.push('pageerror(rm): ' + e.message));
page2.on('console', m => { if (m.type() === 'error') errors.push('console(rm): ' + m.text()); });
await page2.goto(URL + '?v=' + Date.now(), { waitUntil: 'load' });
await page2.waitForFunction(() => window.__lab && document.fonts && document.fonts.status === 'loaded');
await page2.waitForTimeout(600);
const rm0 = await page2.evaluate(() => ({ raf: window.__rafCount, reduced: window.__lab.stats().reduced, png: document.querySelector('.lab-stage canvas').toDataURL().length }));
await page2.waitForTimeout(1500);
const rm1 = await page2.evaluate(() => ({ raf: window.__rafCount, index: window.__lab.stats().index, png: document.querySelector('.lab-stage canvas').toDataURL() }));
check('reduced motion is detected', rm0.reduced === true);
check('reduced motion: no frame loop (rAF count flat over 1.5 s)', rm1.raf === rm0.raf, `${rm0.raf} -> ${rm1.raf}`);
await page2.focus('.lab-tab[aria-selected="true"]');
await page2.keyboard.press('ArrowRight'); await page2.keyboard.press('Enter');
await page2.waitForTimeout(150);
const rm2 = await page2.evaluate(() => ({ raf: window.__rafCount, index: window.__lab.stats().index, line: document.querySelector('.lab-line').textContent, png: document.querySelector('.lab-stage canvas').toDataURL() }));
check('reduced motion: scrub swaps the scene instantly (one redraw, new pixels, new caption)', rm2.index === 1 && rm2.png !== rm1.png && rm2.raf - rm1.raf <= 2 && rm2.line === STAGES[1].line, `rAF +${rm2.raf - rm1.raf}`);
await page2.waitForTimeout(8000);
const rm3 = await page2.evaluate(() => window.__lab.stats().index);
check('reduced motion: no autoplay after 8 s', rm3 === 1, `index ${rm3}`);

/* 6. 360 px phone width */
await page2.setViewportSize({ width: 360, height: 740 });
await page2.waitForTimeout(400);
const phone = await page2.evaluate(() => {
    const cv = document.querySelector('.lab-stage canvas'), r = cv.getBoundingClientRect();
    const tabs = [...document.querySelectorAll('.lab-tab')].map(t => t.getBoundingClientRect());
    return { cssW: r.width, cssH: r.height, pxW: cv.width, scrollW: document.documentElement.scrollWidth, tabsFit: tabs.every(t => t.right <= 360 && t.width > 30), labelW: tabs[0].width };
});
check('360 px: canvas at least 320 wide at 3:2, no horizontal page overflow', phone.cssW >= 320 && Math.abs(phone.cssW / phone.cssH - 1.5) < 0.02 && phone.scrollW <= 360, `canvas ${phone.cssW}x${phone.cssH}, scrollWidth ${phone.scrollW}`);
check('360 px: six tabs fit in the row', phone.tabsFit, `tab width ${phone.labelW}`);
check('360 px: backing store follows the new size', Math.abs(phone.pxW - phone.cssW * 2) <= 4, `${phone.pxW} px for ${phone.cssW} css`);
await page2.locator('.lab').screenshot({ path: '/Users/abbawada/Documents/Portfolio-clean-recreate/docs/circuit/v15/lab/lab-lab-b-phone-360.png' });

/* 7. destroy: container empty, no frames keep running */
await page2.setViewportSize({ width: 560, height: 820 });
await ctx2.close();
const ctx3 = await browser.newContext({ viewport: { width: 560, height: 820 }, deviceScaleFactor: 2 });
await ctx3.addInitScript(() => {
    window.__rafCount = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => { window.__rafCount++; return raf(cb); };
});
const page3 = await ctx3.newPage();
page3.on('pageerror', e => errors.push('pageerror(destroy): ' + e.message));
page3.on('console', m => { if (m.type() === 'error') errors.push('console(destroy): ' + m.text()); });
await page3.goto(URL + '?v=' + Date.now(), { waitUntil: 'load' });
await page3.waitForFunction(() => window.__lab && document.fonts && document.fonts.status === 'loaded');
await page3.waitForTimeout(1200);
const d0 = await page3.evaluate(() => { window.__lab.destroy(); return { html: document.getElementById('lab').innerHTML, raf: window.__rafCount }; });
await page3.waitForTimeout(400);
const d1 = await page3.evaluate(() => window.__rafCount);
await page3.waitForTimeout(600);
const d2 = await page3.evaluate(() => window.__rafCount);
check('destroy() empties the container', d0.html === '', JSON.stringify(d0.html).slice(0, 60));
check('destroy() stops the frame loop (rAF count flat over 600 ms)', d2 === d1, `${d1} -> ${d2}`);
const d3 = await page3.evaluate(() => { try { window.__lab.destroy(); window.__lab.goTo(2); window.__lab.play(); return 'ok'; } catch (e) { return e.message; } });
check('destroy() twice and calls after destroy are harmless', d3 === 'ok', d3);
await page3.waitForTimeout(300);
const d4 = await page3.evaluate(() => window.__rafCount);
check('still no frames after calls on a destroyed lab', d4 === d2, `${d2} -> ${d4}`);

/* 8. the draw cost per frame at 520 px, dpr 2, on the two busiest stages */
const perf = {};
for (const st of [3, 5, 6]) {
    await page3.goto(URL + '?v=' + Date.now() + '&stage=' + st, { waitUntil: 'load' });
    await page3.waitForFunction(() => window.__lab && document.fonts && document.fonts.status === 'loaded');
    await page3.waitForTimeout(1200);
    await page3.evaluate(() => window.__lab.reset());
    await page3.waitForTimeout(4000);
    perf[st] = await page3.evaluate(() => window.__lab.stats());
    console.log(`stage ${st}: ${perf[st].frames} frames, avg ${perf[st].avgMs.toFixed(2)} ms, max ${perf[st].maxMs.toFixed(2)} ms`);
}
check('draw cost under 4 ms average on every measured stage (dpr 2, headless)', Object.values(perf).every(p => p.avgMs < 4), Object.entries(perf).map(([k, p]) => `s${k} ${p.avgMs.toFixed(2)}/${p.maxMs.toFixed(1)} ms`).join(', '));
check('zero page errors over the whole run', errors.length === 0, errors.join(' | '));

await browser.close();
console.log(`\n${results.length - failed}/${results.length} checks passed`);
console.log('PERF ' + JSON.stringify(perf));
process.exit(failed ? 1 : 0);
