/* The lab, variant A: the contract check. Real Chrome over Playwright.
   node lab-lab-a-check.mjs  (the harness served on 8651, or LAB_PORT=NNNN) */
import { chromium } from '/Users/abbawada/Projects/Betta/BettaType/betta-live-site/node_modules/playwright/index.mjs';

const URL = 'http://localhost:' + (process.env.LAB_PORT || '8651') + '/tools/circuit/harness/lab.html';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = {}, fails = [];
const ok = (name, pass, detail) => { results[name] = { pass: !!pass, detail }; if (!pass) fails.push(name); };

async function open(query, viewport = { width: 1200, height: 900 }, dpr = 2) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr });
    const page = await ctx.newPage();
    const errors = [];
    await page.addInitScript(() => {
        window.__raf = 0;
        const orig = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = cb => { window.__raf++; return orig(cb); };
    });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(URL + '?' + query, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts ? document.fonts.ready : null);
    await page.waitForTimeout(400);
    return { ctx, page, errors };
}
const rafDelta = async (page, ms) => {
    const a = await page.evaluate(() => window.__raf);
    await page.waitForTimeout(ms);
    return (await page.evaluate(() => window.__raf)) - a;
};
const state = page => page.evaluate(() => ({
    index: window.__lab.api.index,
    selected: [...document.querySelectorAll('.lab-tab')].findIndex(b => b.getAttribute('aria-selected') === 'true'),
    tabindex0: [...document.querySelectorAll('.lab-tab')].filter(b => b.tabIndex === 0).length,
    date: document.querySelector('.lab-date').firstChild.nodeValue,
    number: document.querySelector('.lab-number').textContent,
    line: document.querySelector('.lab-line').textContent,
    focused: document.activeElement && document.activeElement.classList.contains('lab-tab') ? document.activeElement.getAttribute('aria-label').split(',')[0] : null,
    log: window.__lab.log.length,
}));

/* 1. structure, errors, keyboard scrub */
{
    const { ctx, page, errors } = await open('autoplay=0');
    const s = await page.evaluate(() => ({
        tabs: document.querySelectorAll('.lab-tabs[role=tablist] .lab-tab[role=tab]').length,
        canvasHidden: document.querySelector('.lab-stage canvas').getAttribute('aria-hidden') === 'true',
        panel: !!document.querySelector('.lab-panel[role=tabpanel][aria-atomic=true]'), controls: [...document.querySelectorAll('.lab-tab')].every(b => b.getAttribute('aria-controls') === document.querySelector('.lab-panel').id), labelled: document.querySelector('.lab-panel').getAttribute('aria-labelledby') === document.querySelector('.lab-tab[aria-selected=true]').id,
        canvasW: document.querySelector('.lab-stage canvas').width,
        cssW: document.querySelector('.lab-stage').clientWidth,
        cssH: document.querySelector('.lab-stage').clientHeight,
        dpr: window.devicePixelRatio,
    }));
    ok('structure', s.tabs === 6 && s.canvasHidden && s.panel && s.controls && s.labelled && s.canvasW === Math.round(s.cssW * s.dpr) && Math.abs(s.cssH - s.cssW * 2 / 3) < 2, s);
    { const d = await rafDelta(page, 600); ok('frames run while visible', d > 8, 'raf calls in 600 ms: ' + d); }
    await page.focus('.lab-tab[aria-selected="true"]');
    const seen = [];
    for (let i = 1; i < 6; i++) {
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(500);
        seen.push(await state(page));
    }
    const dates = ['Dec 2025', 'Jan 2026', 'Apr 2026', 'Aug 2026', 'Oct 2026'];
    ok('arrow right scrubs every stage', seen.every((st, i) => st.index === i + 1 && st.selected === i + 1 && st.date === dates[i] && st.tabindex0 === 1 && st.focused === dates[i]), seen.map(st => st.date + '/' + st.number));
    ok('onInteract fired per scrub', seen[4].log === 5, 'log length ' + seen[4].log);
    await page.keyboard.press('ArrowRight');   // wraps to the first
    await page.waitForTimeout(400);
    let st = await state(page);
    ok('wraps to first', st.index === 0 && st.date === 'Nov 2025', st.date);
    await page.keyboard.press('End'); await page.waitForTimeout(400);
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(400);
    st = await state(page);
    ok('End then ArrowLeft', st.index === 4 && st.date === 'Aug 2026', st.date);
    await page.keyboard.press('Home'); await page.waitForTimeout(400);
    await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');   // leaves and returns
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
    await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    st = await state(page);
    ok('Enter selects the focused tab', st.index === 1 && st.selected === 1, st.date);
    await page.mouse.click(0, 0);
    await page.locator('.lab-tab').nth(3).click(); await page.waitForTimeout(400);
    st = await state(page);
    ok('click selects', st.index === 3 && st.date === 'Apr 2026', st.date);
    ok('zero page errors (scrub run)', errors.length === 0, errors);
    await ctx.close();
}

/* 2. autoplay: advances after the dwell, pauses on hover, pauses 25 s after a scrub */
{
    const { ctx, page, errors } = await open('');
    await page.mouse.move(5, 5);
    const i0 = (await state(page)).index;
    await page.waitForTimeout(8600);
    const i1 = (await state(page)).index;
    ok('autoplay advances after ~7 s', i0 === 0 && i1 === 1, { i0, i1 });
    const box = await page.locator('.lab-stage').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(8600);
    const i2 = (await state(page)).index;
    ok('hover pauses autoplay', i2 === 1, { i2 });
    await page.mouse.move(5, 5);
    await page.locator('.lab-tab').nth(2).click();
    await page.mouse.click(5, 5);   // drop focus so only the 25 s rule holds it
    await page.waitForTimeout(8600);
    const i3 = (await state(page)).index;
    ok('a scrub holds autoplay (25 s)', i3 === 2, { i3 });
    const stats = await page.evaluate(() => window.__lab.api.stats());
    ok('zero page errors (autoplay run)', errors.length === 0, errors);
    results.perfAtDpr2 = stats;
    await ctx.close();
}

/* 3. reduced motion: no frame loop, scrub still swaps instantly */
{
    const { ctx, page, errors } = await open('');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(500);
    const d = await rafDelta(page, 700);
    ok('reduced motion: no frames', d === 0, 'raf calls in 700 ms: ' + d);
    await page.focus('.lab-tab[aria-selected="true"]');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    const st = await state(page);
    ok('reduced motion: scrub swaps', st.index === 1 && st.date === 'Dec 2025', st.date);
    const d2 = await rafDelta(page, 500);
    ok('reduced motion: still no frames after scrub', d2 === 0, d2);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(300);
    ok('motion returns when the media query flips back', (await rafDelta(page, 500)) > 10, 'raf resumed');
    ok('zero page errors (reduced run)', errors.length === 0, errors);
    await ctx.close();
}

/* 4. 360px phone, off-screen pause, destroy */
{
    const { ctx, page, errors } = await open('autoplay=0', { width: 360, height: 780 }, 3);
    const m = await page.evaluate(() => ({
        stageW: document.querySelector('.lab-stage').clientWidth,
        scrollW: document.documentElement.scrollWidth,
        canvasW: document.querySelector('.lab-stage canvas').width,
        tabsW: document.querySelector('.lab-tabs').clientWidth,
        overflow: [...document.querySelectorAll('.lab-tab')].some(b => b.scrollWidth > b.clientWidth + 1),
    }));
    ok('360px: fits, no horizontal scroll', m.stageW >= 320 && m.scrollW <= 360 && !m.overflow, m);
    ok('360px: frames run', (await rafDelta(page, 500)) > 10, 'raf');
    await page.evaluate(() => { const sp = document.createElement('div'); sp.style.height = '4000px'; document.body.append(sp); window.scrollTo(0, 3000); });
    await page.waitForTimeout(400);
    const dOff = await rafDelta(page, 600);
    ok('off screen: frames stop', dOff === 0, 'raf calls in 600 ms: ' + dOff);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    ok('back on screen: frames resume', (await rafDelta(page, 500)) > 10, 'raf');
    await page.evaluate(() => window.__lab.api.destroy());
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => ({ children: window.__lab.el.children.length, html: window.__lab.el.innerHTML }));
    const dDead = await rafDelta(page, 700);
    ok('destroy empties the container', after.children === 0 && after.html === '', after);
    ok('destroy stops the frames', dDead === 0, 'raf calls in 700 ms after destroy: ' + dDead);
    ok('zero page errors (phone run)', errors.length === 0, errors);
    await ctx.close();
}

/* 5. frame cost at 520px, dpr 1 and dpr 2, and the 7 s stage with sparks */
for (const dpr of [1, 2]) {
    const { ctx, page } = await open('stage=5', { width: 552, height: 900 }, dpr);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(3000);
    const stats = await page.evaluate(() => window.__lab.api.stats());
    results['perf stage5 dpr' + dpr] = stats;
    await ctx.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
console.log(fails.length ? 'FAIL: ' + fails.join(', ') : 'ALL PASS');
process.exit(fails.length ? 1 : 0);
