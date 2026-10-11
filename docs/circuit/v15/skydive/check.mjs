/* Skydiving tile check (fix round 1, pass 2): mounts the harness over real
   Chrome, drives the whole jump with the keyboard only (Tab, Enter on the
   tile, arrows, Tab to Pull, Enter, Tab to Jump again, Enter, Escape),
   asserts focus never drops out of the figure, the arrows never reach the
   window (a shelf-like window listener that would steal the focus never
   runs), the hint changes at the pull, the double click is not a pull, the
   AAD fires at 1,500 ft, Back hides at the end, reduced motion is four
   stills with announcements, motion back does not fire onJump, destroy
   makes jump() a no-op, and a slow stylesheet hides the figure until it
   lands. Zero page errors is the bar. Screenshots go to OUT. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL('/Users/abbawada/Projects/Betta/BettaType/betta-live-site/node_modules/playwright/index.mjs').href);

const BASE = process.argv[2] || 'http://127.0.0.1:8660';
const OUT = process.argv[3] || '/Users/abbawada/Documents/Portfolio-clean-recreate/docs/circuit/v15/skydive';
fs.mkdirSync(OUT, { recursive: true });
const URL = BASE + '/tools/circuit/harness/skydive.html';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const pageErrors = [], consoleErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

const checks = [];
const check = (name, pass, detail) => { checks.push({ name, pass: !!pass, detail }); if (!pass) console.error('FAIL', name, detail || ''); };
const cls = async (c) => page.evaluate(c => document.querySelector('.sky').classList.contains(c), c);
const phase = async () => page.evaluate(() => document.querySelector('.sky').dataset.phase);
const alt = async () => page.evaluate(() => Number(document.querySelector('.sky').dataset.alt || 0));
const altRaw = async () => page.evaluate(() => document.querySelector('.sky').dataset.alt);
const active = async () => page.evaluate(() => { const a = document.activeElement; return a ? a.tagName.toLowerCase() + (a.className ? '.' + String(a.className).split(' ')[0] : '') : 'null'; });
const live = async () => page.evaluate(() => document.querySelector('.sky-status').textContent);
const label = async () => page.locator('.sky-tile').getAttribute('aria-label');
const hint = async () => page.locator('.sky-hint').textContent();
const jumps = async () => page.evaluate(() => window.__jumps);
const shot = async (name, loc) => { const p = path.join(OUT, name + '.png'); await (loc || page.locator('.harness')).screenshot({ path: p }); return p; };
const hook = () => page.evaluate(() => {
    if (window.__rafHook) return;
    const orig = window.requestAnimationFrame.bind(window);
    window.__rafHook = { calls: 0, durations: [] };
    window.requestAnimationFrame = cb => orig(ts => {
        window.__rafHook.calls++;
        const t0 = performance.now(); cb(ts); window.__rafHook.durations.push(performance.now() - t0);
    });
});
const rafCalls = () => page.evaluate(() => window.__rafHook ? window.__rafHook.calls : -1);
const rafStats = () => page.evaluate(() => {
    const d = window.__rafHook.durations.slice().sort((a, b) => a - b); window.__rafHook.durations = [];
    if (!d.length) return null;
    const mean = d.reduce((a, b) => a + b, 0) / d.length;
    return { n: d.length, mean: +mean.toFixed(2), p95: +d[Math.floor(d.length * 0.95)].toFixed(2), max: +d[d.length - 1].toFixed(2) };
});
/* two window-level listeners, the way the live page listens: one records every arrow that arrives (nav.js reads
   defaultPrevented); the other is the case shelf's handler from cases.js, which moves the focus to the next case on
   ArrowLeft or ArrowRight without checking defaultPrevented (here: the dummy box) */
const armWindow = () => page.evaluate(() => {
    window.__keys = []; window.__shelf = 0;
    window.addEventListener('keydown', e => { if (/^Arrow/.test(e.key)) window.__keys.push({ key: e.key, prevented: e.defaultPrevented, target: e.target.className }); });
    const d = document.querySelector('.dummy'); if (d) d.tabIndex = -1;
    window.addEventListener('keydown', e => { if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && d) { window.__shelf++; d.focus({ preventScroll: true }); } });
});
const shelfRuns = () => page.evaluate(() => window.__shelf);

await page.goto(URL + '?t=' + Date.now(), { waitUntil: 'load' });
await page.evaluate(() => document.fonts ? document.fonts.ready : null);
await page.waitForTimeout(800);
await hook();
await armWindow();

/* 1. the compact tile in the grid */
const tileBox = await page.locator('.sky-tile').boundingBox();
check('compact tile is 232 wide at 2:3', tileBox && Math.round(tileBox.width) === 232 && Math.abs(tileBox.height - 348) <= 2, tileBox && `${tileBox.width}x${tileBox.height}`);
const dummyBox = await page.locator('.dummy').boundingBox();
check('dummy box sits beside the tile on one row', dummyBox && Math.abs(dummyBox.y - tileBox.y) < 2 && dummyBox.x > tileBox.x + 232, dummyBox && `${dummyBox.x},${dummyBox.y}`);
check('tile aria-label', (await label()) === 'Skydiving, press to jump');
check('data-alt is posted in the compact idle', /^\d+$/.test(String(await altRaw())), await altRaw());
await page.waitForTimeout(1200);
check('idle loop runs frames', (await rafCalls()) > 20, await rafCalls());
check('the stylesheet is the one the page linked (no second copy)', (await page.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')].filter(l => /skydive\.css/.test(l.href)).length)) === 1);
await shot('01-compact-grid');
await page.locator('.sky-tile').hover();
await page.waitForTimeout(250);
await shot('02-compact-hover');
await page.mouse.move(5, 5);
const idleStats = await rafStats();

/* 2. keyboard only: Tab to the tile, Enter to jump */
await page.keyboard.press('Tab');
check('tab lands on the tile', (await active()) === 'button.sky-tile', await active());
await page.keyboard.press('Enter');
await page.waitForTimeout(100);
check('Enter opens the tile', await cls('is-open'));
check('onJump fired once', (await jumps()) === 1, await jumps());
check('phase is freefall', (await phase()) === 'freefall', await phase());
const openBox = await page.locator('.sky-tile').boundingBox();
check('open tile spans the grid at 16:10', openBox && Math.round(openBox.width) === 492 && Math.abs(openBox.height - 307.5) <= 2, openBox && `${openBox.width}x${openBox.height}`);
check('hint in freefall', (await hint()) === 'Move to steer. Click to pull.', await hint());
check('Pull button visible', await page.locator('.sky-pull').isVisible());
check('Back button visible', await page.locator('.sky-close').isVisible());
check('reel link hidden before landing', !(await page.locator('.sky-reel').isVisible()));
check('reel link says it opens a new tab', (await page.locator('.sky-reel').getAttribute('aria-label')) === 'Watch the reel, opens in a new tab');
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(900);
await shot('03-open-freefall');
await page.keyboard.up('ArrowLeft');
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(600);
await page.keyboard.up('ArrowRight');

/* 3. arrows with focus on the tile or on Pull are the scene's, not the page's: they never reach the window, so
   the shelf-like listener (which would move the focus to the dummy) never runs */
const arrowsOnTile = await page.evaluate(() => window.__keys);
check('held arrows on the tile never reach the window', arrowsOnTile.length === 0 && (await shelfRuns()) === 0, JSON.stringify(arrowsOnTile) + ' shelf=' + (await shelfRuns()));
check('focus is still on the tile after the held arrows', (await active()) === 'button.sky-tile', await active());
await page.keyboard.press('Tab');
check('Tab from the tile lands on Pull', (await active()) === 'button.sky-pull', await active());
await page.evaluate(() => { window.__keys = []; });
await page.keyboard.press('ArrowLeft');
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowUp');
await page.keyboard.press('ArrowDown');
const arrowOnPull = await page.evaluate(() => window.__keys);
check('the four arrows on Pull never reach the window', arrowOnPull.length === 0 && (await shelfRuns()) === 0, JSON.stringify(arrowOnPull) + ' shelf=' + (await shelfRuns()));
check('focus stays on Pull after the arrows', (await active()) === 'button.sky-pull', await active());

/* 4. the cue at 4,000 ft, then Pull by keyboard; focus stays in the figure */
await page.waitForFunction(() => document.querySelector('.sky-pull').classList.contains('is-lit'), null, { timeout: 20000 });
const cueAlt = await alt();
check('cue lights at 4,000 ft', cueAlt <= 4000 && cueAlt >= 3900, cueAlt);
check('live text announces the cue with the altitude', /^Pull height, [\d,]+ feet$/.test(await live()), await live());
await page.waitForTimeout(450);
await shot('04-pull-cue');
const ffStats = await rafStats();
const t0 = Date.now();
await page.keyboard.press('Enter');
await page.waitForTimeout(80);
check('Enter on Pull opens', (await phase()) === 'opening', await phase());
check('focus after Pull is on the tile, not body', (await active()) === 'button.sky-tile', await active());
check('hint under the canopy', (await hint()) === 'Move to steer.', await hint());
check('Pull hidden after the pull', !(await page.locator('.sky-pull').isVisible()));
await page.waitForTimeout(900);
await shot('05-canopy-opening');
await page.waitForFunction(() => document.querySelector('.sky').dataset.phase === 'canopy', null, { timeout: 5000 });
check('live text announces the canopy with the altitude', /^Canopy open, [\d,]+ feet$/.test(await live()), await live());
await page.waitForTimeout(1500);
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(700);
await shot('06-canopy-glide');
await page.keyboard.up('ArrowRight');

/* 5. the landing and the end state */
await page.waitForFunction(() => { const s = document.querySelector('.sky'); return s.dataset.phase === 'flare' || s.dataset.phase === 'landed'; }, null, { timeout: 40000 });
await shot('07-landing-flare');
await page.waitForFunction(() => document.querySelector('.sky').classList.contains('is-landed'), null, { timeout: 10000 });
const glideS = (Date.now() - t0) / 1000;
check('the glide from the cue lasts about 15 s', glideS > 11 && glideS < 20, glideS.toFixed(1) + ' s');
const canopyStats = await rafStats();
await page.waitForTimeout(1400);
check('end state shows the reel and Jump again', (await page.locator('.sky-reel').isVisible()) && (await page.locator('.sky-again').isVisible()));
check('Back is hidden at the end', !(await page.locator('.sky-close').isVisible()));
check('live text says Landed', (await live()) === 'Landed', await live());
const reel = await page.evaluate(() => { const a = document.querySelector('.sky-reel'); return { href: a.href, target: a.target, rel: a.rel, text: a.textContent }; });
check('reel link attributes', reel.href === 'https://www.instagram.com/reel/Ddv8Qr_gruP/' && reel.target === '_blank' && /noopener/.test(reel.rel) && /noreferrer/.test(reel.rel) && reel.text === 'Watch the reel', JSON.stringify(reel));
await shot('08-end-state');
await page.waitForTimeout(2200);
const quietBefore = await rafCalls(); await page.waitForTimeout(400); const quietAfter = await rafCalls();
check('frames stop once the end state settles', quietAfter === quietBefore, `${quietBefore} -> ${quietAfter}`);
await page.evaluate(() => { const a = document.querySelector('.sky-reel'); a.addEventListener('click', e => e.preventDefault(), { once: true }); a.click(); });
check('onLink fired', (await page.evaluate(() => window.__links)) === 1);
/* Jump again by keyboard: Tab to the reel, Tab to Jump again, Enter */
await page.keyboard.press('Tab');
await page.keyboard.press('Tab');
check('Tab reaches Jump again', (await active()) === 'button.sky-again', await active());
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
check('Jump again restarts', (await phase()) === 'freefall' && !(await cls('is-landed')) && (await jumps()) === 2, `${await phase()} jumps=${await jumps()}`);
check('focus after Jump again is on the tile', (await active()) === 'button.sky-tile', await active());
check('Jump again resets the altimeter', (await alt()) > 12000, await alt());

/* 6. Escape closes, from the tile where focus already is */
await page.keyboard.press('Escape');
await page.waitForTimeout(100);
check('Escape closes', !(await cls('is-open')) && (await phase()) === 'idle', await phase());
check('focus after Escape stays on the tile', (await active()) === 'button.sky-tile', await active());
const closedBox = await page.locator('.sky-tile').boundingBox();
check('closed tile is 2:3 again', closedBox && Math.round(closedBox.width) === 232, closedBox && closedBox.width);

/* 7. a double click is one jump, not a pull at the top */
await page.locator('.sky-tile').dblclick();
await page.waitForTimeout(200);
check('double click opens without pulling', (await cls('is-open')) && (await phase()) === 'freefall' && (await alt()) > 12500, `${await phase()} ${await alt()} jumps=${await jumps()}`);
await page.waitForTimeout(700);
await page.locator('.sky-tile').click();
await page.waitForTimeout(80);
check('a click after the arming window pulls', (await phase()) === 'opening', await phase());
await page.locator('.sky-tile').focus();
await page.keyboard.press('Escape');
await page.waitForTimeout(100);

/* 8. the phone width */
await page.setViewportSize({ width: 360, height: 740 });
await page.waitForTimeout(400);
const phoneBox = await page.locator('.sky-tile').boundingBox();
check('phone tile is 176 wide', phoneBox && Math.round(phoneBox.width) === 176, phoneBox && `${phoneBox.width}x${phoneBox.height}`);
await shot('09-phone-360-compact', page);
await page.locator('.sky-tile').click();
await page.waitForTimeout(1200);
const phoneOpen = await page.locator('.sky-tile').boundingBox();
check('phone open scene fills the column', phoneOpen && phoneOpen.width >= 300 && phoneOpen.width <= 340, phoneOpen && `${phoneOpen.width}x${phoneOpen.height}`);
check('no horizontal overflow at 360', await page.evaluate(() => document.documentElement.scrollWidth <= 360));
await shot('10-phone-360-open', page);
await page.locator('.sky-tile').focus();
await page.keyboard.press('Escape');

/* 9. reduced motion: stills */
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.waitForTimeout(300);
check('reduced class follows the media query', await cls('is-reduced'));
const rBefore = await rafCalls(); await page.waitForTimeout(500); const rAfter = await rafCalls();
check('no frames under reduced motion', rAfter === rBefore, `${rBefore} -> ${rAfter}`);
await shot('11-reduced-phone-compact', page);
await page.setViewportSize({ width: 1280, height: 900 });
await page.waitForTimeout(300);
await shot('12-reduced-compact');
const jumpsBeforeStills = await jumps();
await page.locator('.sky-tile').click();
await page.waitForTimeout(200);
check('reduced open shows still 1 at 13,500', (await cls('is-open')) && (await phase()) === 'freefall' && (await alt()) === 13500, `${await phase()} ${await alt()}`);
check('still 1 is announced', (await live()) === 'Exit from the helicopter, 13,500 feet', await live());
check('Next visible under reduced motion', await page.locator('.sky-next').isVisible());
check('hint hidden under reduced motion', !(await page.locator('.sky-hint').isVisible()));
await shot('13-still-1-exit');
await page.locator('.sky-next').focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
check('still 2 is the pull cue', (await alt()) === 4000 && (await page.evaluate(() => document.querySelector('.sky-pull').classList.contains('is-lit'))), await alt());
check('still 2 is announced', (await live()) === 'Pull height, 4,000 feet', await live());
await shot('14-still-2-pull-cue');
await page.locator('.sky-pull').focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
check('Pull advances to the canopy still', (await phase()) === 'canopy', await phase());
check('focus after Pull on the stills is on the tile', (await active()) === 'button.sky-tile', await active());
check('canopy still label says press to land', (await label()) === 'Skydiving, press to land', await label());
await shot('15-still-3-canopy');
await page.locator('.sky-next').focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
check('still 4 is landed with the reel', (await phase()) === 'landed' && (await cls('is-landed')) && (await page.locator('.sky-reel').isVisible()) && !(await page.locator('.sky-next').isVisible()));
check('focus after the last Next is on the tile', (await active()) === 'button.sky-tile', await active());
check('still 4 is announced', (await live()) === 'Landed', await live());
await shot('16-still-4-landed');
const sBefore = await rafCalls(); await page.waitForTimeout(400); const sAfter = await rafCalls();
check('stills draw without frames', sAfter === sBefore, `${sBefore} -> ${sAfter}`);
/* motion comes back on the landed still: no new jump, no onJump */
await page.emulateMedia({ reducedMotion: 'no-preference' });
await page.waitForTimeout(300);
check('motion back on the landed still keeps the landed state and fires no onJump', (await phase()) === 'landed' && (await cls('is-landed')) && (await jumps()) === jumpsBeforeStills + 1, `${await phase()} jumps=${await jumps()}`);
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.waitForTimeout(200);
await page.locator('.sky-again').click();
await page.waitForTimeout(150);
check('Jump again under reduced motion returns to still 1', (await alt()) === 13500 && (await jumps()) === jumpsBeforeStills + 2, `${await alt()} jumps=${await jumps()}`);
await page.locator('.sky-tile').focus();
await page.keyboard.press('Escape');
await page.waitForTimeout(100);
check('Escape closes the stills', !(await cls('is-open')));
await page.emulateMedia({ reducedMotion: 'no-preference' });
await page.waitForTimeout(400);
check('motion returns: idle frames again', (await rafCalls()) > sAfter, `${sAfter} -> ${await rafCalls()}`);

/* 10. destroy through the window hook, from an open tile */
await page.locator('.sky-tile').click();
await page.waitForTimeout(100);
const jumpsBeforeDestroy = await jumps();
await page.evaluate(() => window.__sky.destroy());
const dBefore = await rafCalls();
await page.waitForTimeout(500);
const dAfter = await rafCalls();
check('destroy empties the container', await page.evaluate(() => document.getElementById('skyHost').childNodes.length === 0 && document.getElementById('skyHost').className === ''));
check('destroy stops frames', dAfter === dBefore, `${dBefore} -> ${dAfter}`);
await page.evaluate(() => window.__sky.destroy());   // twice is harmless
await page.evaluate(() => { window.__sky.open(); window.__sky.jump(); window.__sky.close(); });   // after destroy: no-ops, no errors
check('jump() after destroy does not fire onJump', (await jumps()) === jumpsBeforeDestroy, `${jumpsBeforeDestroy} -> ${await jumps()}`);

/* 11. two tiles in one host: destroying the first leaves the second its host */
await page.goto(URL + '?two=1&t=' + Date.now(), { waitUntil: 'load' });
await page.waitForTimeout(400);
check('?two=1 mounts two tiles', (await page.locator('.sky').count()) === 2);
await page.evaluate(() => window.__sky.destroy());
check('destroying one of two keeps the host class', await page.evaluate(() => document.getElementById('skyHost').classList.contains('sky-host')));
await page.evaluate(() => window.__sky2.open());
await page.waitForTimeout(200);
const survivor = await page.locator('.sky-tile').boundingBox();
check('the survivor still spans the grid when open', survivor && Math.round(survivor.width) === 492, survivor && survivor.width);
await page.evaluate(() => window.__sky2.destroy());

/* 12. no stylesheet on the page: the module links its own and the tile is still 232 wide */
await page.goto(URL + '?nocss=1&t=' + Date.now(), { waitUntil: 'load' });
await page.waitForFunction(() => [...document.styleSheets].some(s => /skydive\.css/.test(s.href || '')), null, { timeout: 5000 });
await page.waitForTimeout(400);
const noCssBox = await page.locator('.sky-tile').boundingBox();
check('without a linked stylesheet the module links its own', await page.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')].filter(l => /skydive\.css/.test(l.href)).length === 1));
check('the tile is 232x348 on that page too', noCssBox && Math.round(noCssBox.width) === 232 && Math.abs(noCssBox.height - 348) <= 2, noCssBox && `${noCssBox.width}x${noCssBox.height}`);

/* 12b. a slow stylesheet (one round trip on a cold cache): the figure is hidden, in flow, until the sheet lands,
   never the raw controls; then the styled tile at 232x348 */
await page.route(/skydive\.css/, async route => { await new Promise(r => setTimeout(r, 1500)); route.continue(); });
await page.goto(URL + '?nocss=1&slow=' + Date.now(), { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.sky', { state: 'attached', timeout: 5000 });
const during = await page.evaluate(() => { const f = document.querySelector('.sky'); const b = f.getBoundingClientRect(); return { visibility: getComputedStyle(f).visibility, inFlow: b.width > 0 && b.height > 0, sheet: [...document.styleSheets].some(s => /skydive\.css/.test(s.href || '')) }; });
check('while the stylesheet is in flight the figure is hidden, in flow, not the raw controls', during.visibility === 'hidden' && during.inFlow && !during.sheet, JSON.stringify(during));
await page.waitForFunction(() => getComputedStyle(document.querySelector('.sky')).visibility === 'visible', null, { timeout: 6000 });
await page.waitForTimeout(300);
const slowBox = await page.locator('.sky-tile').boundingBox();
const slowSheets = await page.evaluate(() => [...document.styleSheets].filter(s => /skydive\.css/.test(s.href || '')).length);
check('once the sheet lands the figure shows, styled, at 232x348', slowSheets === 1 && slowBox && Math.round(slowBox.width) === 232 && Math.abs(slowBox.height - 348) <= 2, slowBox && `${slowBox.width}x${slowBox.height} sheets=${slowSheets}`);
await page.unroute(/skydive\.css/);

/* 13. the ?open=1 harness mode, then nobody pulls: the AAD fires at 1,500 ft, 7 s after the cue */
await page.goto(URL + '?open=1&t=' + Date.now(), { waitUntil: 'load' });
await page.waitForTimeout(600);
check('?open=1 mounts open and jumping', (await cls('is-open')) && (await phase()) === 'freefall' && (await jumps()) === 1);
await page.waitForTimeout(300);
await shot('17-harness-open-mode');
await page.waitForFunction(() => document.querySelector('.sky-pull').classList.contains('is-lit'), null, { timeout: 20000 });
const tCue = Date.now();
await page.waitForFunction(() => document.querySelector('.sky').dataset.phase === 'opening', null, { timeout: 15000 });
const cueToAad = (Date.now() - tCue) / 1000;
const aadAlt = await alt();
check('AAD fires at 1,500 ft with no pull', aadAlt <= 1500 && aadAlt >= 1400, aadAlt);
check('at least 6 s between the lit Pull and the AAD', cueToAad >= 6, cueToAad.toFixed(2) + ' s');
check('Pull hidden after the AAD', !(await page.locator('.sky-pull').isVisible()));
await page.waitForTimeout(400);
await shot('18-aad-fires');
await page.waitForFunction(() => document.querySelector('.sky').classList.contains('is-landed'), null, { timeout: 30000 });
check('AAD jump still lands', (await phase()) === 'landed');

await browser.close();
const report = { url: URL, pageErrors, consoleErrors, frames: { idle: idleStats, freefall: ffStats, canopy: canopyStats }, checks, failed: checks.filter(c => !c.pass).length };
fs.writeFileSync(path.join(OUT, 'check-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(pageErrors.length || consoleErrors.length || report.failed ? 1 : 0);
