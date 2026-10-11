/* V1.5 drive contract, in real Chrome through Playwright.
   Usage: node tools/circuit/drivetest.mjs URL [OUTDIR] [OUT.json]
   Three passes. 1. The maths, loop stopped: a drive stepped at 60 Hz, two
   minutes flat out on the racing line, two minutes flat out with the steer
   sweeping, then a bot lap for the tuning numbers. The player's lane never
   leaves the white lines (|lane| <= 3.1), no two cars overlap (the race
   contract's touch rule, player included), the player completes a lap, and
   it passes somebody. 2. The page, loop running: Drive clicked, ArrowUp held
   twenty seconds, the HUD read (the timer advances, a P chip), then a
   keyboard bot drives on for the toast and the end card, Escape leaves the
   car, and the HUD, the Grid's YOU row and the ninth car are all gone.
   3. A phone, 390 by 844: Drive, the tip, a press on the world as the
   throttle. 4. The fix round (2026-10-10): the card's buttons take the tap
   at five sizes, the phone column, Space and D, the focus, the three-row
   Grid, the card's one number, reduced motion, the chips under the chrome,
   the paper car. Zero page errors throughout. OUTDIR gets drive-start.png,
   drive-pass.png, drive-end.png, drive-phone.png, grid-clock.png and the
   fix-*.png captures. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pw = [process.env.PLAYWRIGHT, path.join(ROOT, 'node_modules/playwright/index.mjs'),
    path.join(process.env.HOME || '', 'Projects/Betta/BettaType/betta-live-site/node_modules/playwright/index.mjs')].filter(Boolean).find(p => fs.existsSync(p));
if (!pw) { console.error('playwright not found; set PLAYWRIGHT=/path/to/playwright/index.mjs'); process.exit(2); }
const { chromium } = await import(pathToFileURL(pw).href);
const [url, outDir, out] = process.argv.slice(2);
if (!url) { console.error('usage: node tools/circuit/drivetest.mjs URL [OUTDIR] [OUT.json]'); process.exit(2); }
if (outDir) fs.mkdirSync(outDir, { recursive: true });
const shot = async (page, name, opts) => { if (!outDir) return null; const f = path.join(outDir, name + '.png'); await page.screenshot(Object.assign({ path: f }, opts || {})); console.log(f); return f; };
const bust = u => u + (u.includes('?') ? '&' : '?') + 't=' + Date.now();
const text = (page, sel) => page.evaluate(sel => (document.querySelector(sel) || { textContent: '' }).textContent.replace(/\s+/g, ' ').trim(), sel);   // textContent, so the chrome's uppercase transform does not change the words
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const watch = page => { page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); }); };
async function load(page) {
    await page.goto(bust(url), { waitUntil: 'load' });
    await page.waitForFunction(() => window.__circuit && window.__circuit.groups, null, { timeout: 20000 });
    await page.evaluate(() => window.__circuit.ready);
    await page.evaluate(() => document.fonts ? document.fonts.ready : null);
    await page.waitForTimeout(800);
}
/* the same lane-change policy a person uses: blocked, pull to the side with room; still blocked after four seconds, try the other side; clear road, back to the line */
const BOT = `(function () {
    const bot = { side: 0, since: -10 };
    return function (g, t) {
        const you = g.find(x => x.player); if (!you) return 0;
        const ahead = g.filter(x => !x.player && x.s > you.s && x.s - you.s < 12).sort((a, b) => a.s - b.s)[0];
        if (!ahead) bot.side = 0;
        else if (Math.abs(ahead.lane - you.lane) >= 2.85) { /* clear: hold the lane */ }
        else if (bot.side === 0) { bot.side = ahead.lane > 0 ? -1 : 1; bot.since = t; }
        else if (t - bot.since > 4) { bot.side = -bot.side; bot.since = t; }
        return bot.side;
    };
})()`;
const report = { url, errors };

/* ------------------------------------------------ 1. the maths, loop stopped */
{
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } }); watch(page);
    await load(page);
    report.maths = await page.evaluate(BOT_SRC => {
        const c = window.__circuit; c.stop();
        const dt = 1 / 60, LEN = 5.8, WID = 2.6, bot = eval(BOT_SRC);
        const callsRest = c.stats.calls;
        const field = c.gridState().length;
        const run = (secs, input, stats) => {
            for (let i = 0; i < secs * 60; i++) {
                const t = stats.t;
                c.setDriveInput(input(t, c.gridState()));
                c.stepRace(dt); stats.t += dt;
                const g = c.gridState(), you = g.find(x => x.player);
                stats.maxLane = Math.max(stats.maxLane, Math.abs(you.lane));
                for (const x of g) if (!x.player) stats.maxLaneAI = Math.max(stats.maxLaneAI, Math.abs(x.lane));
                stats.minV = Math.min(stats.minV, you.v); stats.maxV = Math.max(stats.maxV, you.v);
                for (let a = 0; a < g.length; a++) for (let b = a + 1; b < g.length; b++) {
                    const ds = Math.abs(g[a].s - g[b].s), dl = Math.abs(g[a].lane - g[b].lane);
                    if (ds < LEN && dl < WID) { stats.touches++; if (!stats.touchAt) stats.touchAt = [g[a].id, g[b].id, +t.toFixed(1), +ds.toFixed(2), +dl.toFixed(2)]; }
                    const ahead = g[a].s > g[b].s ? [g[a], g[b]] : [g[b], g[a]];
                    if (dl < 2.85 && (g[a].player || g[b].player)) stats.minInLineGap = Math.min(stats.minInLineGap, ds);
                }
                const ds = c.driveState();
                if (ds.lapDone && stats.lapAt == null) { stats.lapAt = ds.lapTime; stats.passesAtLap = ds.passed.length; stats.rankAtLap = ds.rank; }
                if (stats.lapAt != null && stats.stopAtLap) break;
            }
        };
        const fresh = () => ({ t: 0, touches: 0, touchAt: null, maxLane: 0, maxLaneAI: 0, minV: Infinity, maxV: 0, minInLineGap: Infinity, lapAt: null, passesAtLap: null, rankAtLap: null });
        /* a: two minutes flat out on the line, then two minutes flat out weaving across the road */
        c.startDrive(); c.render();
        const callsDrive = c.stats.calls, carsDrive = c.cars.length, rowDrive = c.gridState().find(x => x.player);
        const a = fresh();
        run(120, () => ({ throttle: 1, steer: 0, brake: false }), a);
        const afterLine = Object.assign({}, c.driveState(), { passed: c.driveState().passed.length, passedBy: c.driveState().passedBy.length });
        run(120, t => ({ throttle: 1, steer: Math.sin(t * Math.PI * 2 / 10), brake: false }), a);
        const dsA = c.driveState();
        const sweep = { seconds: 240, touches: a.touches, touchAt: a.touchAt, maxLane: +a.maxLane.toFixed(2), maxLaneAI: +a.maxLaneAI.toFixed(2), minV: +a.minV.toFixed(2), maxV: +a.maxV.toFixed(2), minInLineGap: +a.minInLineGap.toFixed(2),
            lapDone: dsA.lapDone, lapTime: dsA.lapTime, passed: dsA.passed.length, passedBy: dsA.passedBy.length, rank: dsA.rank, afterLine: { t: afterLine.t, lapDone: afterLine.lapDone, lapTime: afterLine.lapTime, passed: afterLine.passed, passedBy: afterLine.passedBy, rank: afterLine.rank } };
        c.endDrive(); c.render();
        const callsAfter = c.stats.calls, carsAfter = c.cars.length, rowAfter = !!c.gridState().find(x => x.player);
        /* b: the bot lap, for the tuning numbers: passes in the lap and its time */
        for (let i = 0; i < 20 * 60; i++) c.stepRace(dt);
        c.startDrive();
        const b = fresh(); b.stopAtLap = true;
        run(150, (t, g) => ({ throttle: 1, steer: bot(g, t), brake: false }), b);
        const dsB = c.driveState();
        const botLap = { lapTime: b.lapAt, passesAtLap: b.passesAtLap, rankAtLap: b.rankAtLap, passedBy: dsB.passedBy.length, touches: b.touches, touchAt: b.touchAt, maxLane: +b.maxLane.toFixed(2), minV: +b.minV.toFixed(2), maxV: +b.maxV.toFixed(2) };
        c.endDrive(); c.render();
        /* c: the brake flag and the clamps */
        c.startDrive();
        c.setDriveInput({ throttle: 7, steer: -4, brake: 'yes' }); const clamped = c.driveState();
        c.setDriveInput({ throttle: 0, steer: 0, brake: true });
        for (let i = 0; i < 6 * 60; i++) c.stepRace(dt);
        const braked = c.driveState().v;
        c.endDrive(); c.render();
        return { field, callsRest, callsDrive, callsAfter, carsDrive, carsAfter, rowDrive: !!rowDrive, rowAfter, lapLength: c.driveState().lap, tune: c.DRIVE, speed: c.speed, sweep, botLap,
                 clamped: { throttle: clamped.throttle, steer: clamped.steer, brake: clamped.brake }, brakedV: +braked.toFixed(2), carsEnd: c.cars.length };
    }, BOT);
    await page.close();
}

/* ------------------------------------------------ 2. the page, loop running */
{
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } }); watch(page);
    await load(page);
    const live = report.live = {};
    live.hintOnLoad = await page.evaluate(() => { const h = document.getElementById('ringHint'); return !!h && !h.hidden; });
    live.driveLabel = await text(page, '#ringDrive');
    live.watchLabel = await text(page, '#ringLap');
    live.clock = await text(page, '#ringTowerClock');
    live.clockOk = /^Los Angeles \d\d:\d\d$/.test(live.clock);
    live.caption = await text(page, '#ringTowerFoot');
    live.gridLabel = await page.getAttribute('#ringTower', 'aria-label');
    await shot(page, 'grid-clock', { clip: await page.evaluate(() => { const r = document.querySelector('.ring-broadcast').getBoundingClientRect(); return { x: Math.max(0, r.left - 12), y: Math.max(0, r.top - 12), width: r.width + 24, height: r.height + 24 }; }) });
    await page.click('#ringDrive');
    await page.waitForTimeout(1100);
    live.hudShown = await page.evaluate(() => !document.getElementById('ringDriveHud').hidden);
    live.exitLabel = await text(page, '#ringLapExit');
    live.driveLabelOn = await text(page, '#ringDrive');
    live.drivePressed = await page.getAttribute('#ringDrive', 'aria-pressed');
    live.watchHiddenOn = await page.evaluate(() => getComputedStyle(document.getElementById('ringLap')).display === 'none');
    live.youRow = await page.evaluate(() => !!document.querySelector('.ring-tower-row.is-you'));
    live.hintGone = await page.evaluate(() => document.getElementById('ringHint').hidden);
    live.cameraOnCar = await page.evaluate(() => { const c = window.__circuit, car = c.carAt('you'), v = c.view.target; return car ? +Math.hypot(car.x - v.x, car.z - v.z).toFixed(1) : null; });
    await shot(page, 'drive-start');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(5000);
    live.timeAt5 = await page.locator('#ringDriveTime').innerText();
    live.posAt5 = await page.locator('#ringDrivePos').innerText();
    live.throttleHeld = await page.evaluate(() => window.__circuit.driveState().throttle);
    await page.waitForTimeout(15000);
    live.timeAt20 = await page.locator('#ringDriveTime').innerText();
    live.posAt20 = await page.locator('#ringDrivePos').innerText();
    const secs = s => { const m = /^(\d+):(\d\d)(?:\.(\d))?$/.exec(s); return m ? +m[1] * 60 + +m[2] + (m[3] ? +m[3] / 10 : 0) : NaN; };   // whole seconds while driving, a tenth on the card
    live.timerAdvances = secs(live.timeAt20) > secs(live.timeAt5) + 10 && secs(live.timeAt5) > 3;
    live.posChip = /^P\d$/.test(live.posAt5) && /^P\d$/.test(live.posAt20);
    /* the keyboard bot drives on, for the toast and the end card */
    live.fpsWhileDriving = [];
    let side = 0, toastShot = false, cardShot = false; const t0 = Date.now();
    while (Date.now() - t0 < 110000) {
        const st = await page.evaluate(BOT_SRC => {
            if (!window.__driveBot) window.__driveBot = eval(BOT_SRC);
            const c = window.__circuit, ds = c.driveState();
            return { side: window.__driveBot(c.gridState(), ds.t), lapDone: ds.lapDone, passed: ds.passed.length, passedBy: ds.passedBy.length, toasts: document.querySelectorAll('.ring-drive-toast.is-in:not(.is-out)').length, card: !document.getElementById('ringDriveCard').hidden, fps: +c.meanFps().toFixed(1), rank: ds.rank };
        }, BOT);
        if (st.side !== side) {
            if (side === -1) await page.keyboard.up('ArrowLeft'); if (side === 1) await page.keyboard.up('ArrowRight');
            if (st.side === -1) await page.keyboard.down('ArrowLeft'); if (st.side === 1) await page.keyboard.down('ArrowRight');
            side = st.side;
        }
        if (st.toasts && !toastShot) { toastShot = true; live.toastAt = { passed: st.passed, passedBy: st.passedBy, rank: st.rank }; live.toastText = await text(page, '.ring-drive-toast'); await shot(page, 'drive-pass'); }
        if (st.card && !cardShot) { cardShot = true; live.cardYour = await text(page, '#ringDriveYour'); live.cardBest = await page.evaluate(() => { const b = document.getElementById('ringDriveBest'); return b.hidden ? null : b.textContent; }); await shot(page, 'drive-end'); }
        if (live.fpsWhileDriving.length < 40 && st.fps) live.fpsWhileDriving.push(st.fps);
        if (cardShot && toastShot) break;
        await page.waitForTimeout(100);
    }
    await page.keyboard.up('ArrowUp'); if (side === -1) await page.keyboard.up('ArrowLeft'); if (side === 1) await page.keyboard.up('ArrowRight');
    live.toastShot = toastShot; live.cardShot = cardShot;
    live.driveStateBeforeEscape = await page.evaluate(() => { const d = window.__circuit.driveState(); return { t: d.t, lapDone: d.lapDone, lapTime: d.lapTime, passed: d.passed, passedBy: d.passedBy, rank: d.rank }; });
    live.callsDriving = await page.evaluate(() => window.__circuit.stats.calls);
    live.best = await page.evaluate(() => { try { return window.localStorage.getItem('wada-ring-drive-best'); } catch (e) { return null; } });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    live.hudHidden = await page.evaluate(() => document.getElementById('ringDriveHud').hidden);
    live.youRowGone = await page.evaluate(() => !document.querySelector('.ring-tower-row.is-you'));
    live.carsAfter = await page.evaluate(() => window.__circuit.cars.length);
    live.drivingAfter = await page.evaluate(() => window.__circuit.nav.state().driving);
    live.exitHidden = await page.evaluate(() => document.getElementById('ringLapExit').hidden);
    live.driveLabelOff = await text(page, '#ringDrive');
    live.callsAfter = await page.evaluate(() => window.__circuit.stats.calls);
    /* the watch camera still works beside it, and Drive ends it */
    await page.click('#ringLap'); await page.waitForTimeout(900);
    live.watchOn = await page.evaluate(() => window.__circuit.nav.state().lap);
    live.watchExit = await text(page, '#ringLapExit');
    await page.evaluate(() => document.activeElement.blur());   // D fires from the page, not from a focused pill (WCAG 2.1.4)
    await page.keyboard.press('d'); await page.waitForTimeout(900);
    live.dKeyDrives = await page.evaluate(() => window.__circuit.nav.state().driving && !window.__circuit.nav.state().lap);
    /* a Grid row opens its stop and ends the drive: one of the three rows the Grid keeps while driving (not Betta's, whose stop loads the lab) */
    await page.click('.ring-tower-row.is-near[data-stop]:not([data-stop="betta"])'); await page.waitForTimeout(1400);
    live.rowOpensStop = await page.evaluate(() => !document.getElementById('ringPanel').hidden && !window.__circuit.nav.state().driving && window.__circuit.cars.length === 8);
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    await page.close();
}

/* ------------------------------------------------ 3. a phone */
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(); watch(page);
    await load(page);
    const ph = report.phone = {};
    await page.tap('#ringDrive');
    await page.waitForTimeout(1100);
    ph.hudShown = await page.evaluate(() => !document.getElementById('ringDriveHud').hidden);
    ph.camera = await page.evaluate(() => { const c = window.__circuit, car = c.carAt('you'), v = c.view.target, st = c.nav.state(); return { zoom: +st.zoom.toFixed(2), onCar: car ? +Math.hypot(car.x - v.x, car.z - v.z).toFixed(1) : null, flying: st.flying, running: c.isRunning() }; });
    ph.cameraOnCar = ph.camera.onCar != null && ph.camera.onCar < 14 && ph.camera.zoom > 1.9;
    ph.tipShown = await page.evaluate(() => !document.getElementById('ringDriveTip').hidden);
    ph.tipText = await text(page, '#ringDriveTip');
    ph.hudBox = await page.evaluate(() => { const r = document.getElementById('ringDriveHud').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; });
    ph.hudInViewport = ph.hudBox[0] >= 0 && ph.hudBox[0] + ph.hudBox[2] <= 390 && ph.hudBox[1] + ph.hudBox[3] < 844 * 0.4;
    ph.broadcastShown = await page.evaluate(() => getComputedStyle(document.querySelector('.ring-broadcast')).display !== 'none');
    await shot(page, 'drive-phone');
    await page.mouse.move(195, 500); await page.mouse.down();
    await page.waitForTimeout(1500);
    ph.throttleOnPress = await page.evaluate(() => window.__circuit.driveState().throttle);
    await page.mouse.move(285, 500); await page.waitForTimeout(600);
    ph.steerOnSlide = await page.evaluate(() => window.__circuit.driveState().steer);
    await page.mouse.up(); await page.waitForTimeout(400);
    ph.throttleOnRelease = await page.evaluate(() => window.__circuit.driveState().throttle);
    await page.waitForTimeout(3000);
    ph.tipGoneAfter4s = await page.evaluate(() => document.getElementById('ringDriveTip').hidden);
    await page.tap('#ringLapExit'); await page.waitForTimeout(900);
    ph.leftByPill = await page.evaluate(() => !window.__circuit.nav.state().driving && document.getElementById('ringDriveHud').hidden && window.__circuit.cars.length === 8);
    await ctx.close();
}

/* ------------------------------------------------ 4. the fix round (2026-10-10) */
/* What the reviewers measured, re-measured: the end card's buttons take the
   tap at 360x640, 360x780, 390x844, 1366x620 and 1024x640; the phone column
   (one-line toasts, a wide short card, the exit pill clear of the map, no
   Esc hint on a phone); Space on a focused button; the D that took the car
   not steering it; the focus back on Drive after the car; D only from the
   page; a focused toast kept; the YOU row a plain row; the three-row Grid;
   the card's one number; reduced motion leaving no ghost row; no chip
   showing through the chrome while the camera rides; the paper car. */
{
    const fx = report.fix = { sizes: {}, chips: {} };
    const field = report.maths.field;
    const finish = page => page.evaluate(() => { const c = window.__circuit; c.stop(); c.setDriveInput({ throttle: 1, steer: 0, brake: false }); let n = 0; while (!c.driveState().lapDone && n++ < 20000) c.stepRace(1 / 60); c.start(); });
    /* the bot drives until it has passed a car other than Betta's (whose stop loads the lab, which is another module's), then the loop resumes */
    const passOne = page => page.evaluate(BOT_SRC => { const c = window.__circuit, bot = eval(BOT_SRC); c.stop(); let n = 0, t = 0;
        const clear = () => c.driveState().passed.some(id => { const r = c.gridState().find(x => x.id === id); return r && r.stop !== 'betta'; });
        while (!clear() && !c.driveState().lapDone && n++ < 6000) { c.setDriveInput({ throttle: 1, steer: bot(c.gridState(), t), brake: false }); c.stepRace(1 / 60); t += 1 / 60; }
        c.setDriveInput({ throttle: 0, steer: 0, brake: false }); c.start(); return c.driveState().passed.length; }, BOT);
    const hit = (page, id) => page.evaluate(id => { const el = document.getElementById(id); if (!el || el.hidden) return { ok: false, hit: 'hidden', box: null }; const r = el.getBoundingClientRect(); const t = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2); return { ok: !!(t && t.closest('#' + id)), hit: t ? (t.id || t.className || t.tagName) : null, box: [r.left, r.top, r.width, r.height].map(Math.round) }; }, id);
    const box = (page, sel) => page.evaluate(sel => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); }, sel);
    const meet = (a, b) => !!a && !!b && a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
    const display = (page, sel) => page.evaluate(sel => { const el = document.querySelector(sel); return el ? getComputedStyle(el).display : null; }, sel);
    /* a. the sizes the reviewers measured: the card, the toast, the pill, the hint */
    for (const [w, h] of [[360, 640], [360, 780], [390, 844], [1366, 620], [1024, 640]]) {
        const mobile = w < 500;
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
        const page = await ctx.newPage(); watch(page);
        await load(page);
        const s = fx.sizes[w + 'x' + h] = {};
        s.hint = await page.evaluate(() => { const el = document.getElementById('ringHint'); return { shown: !el.hidden && getComputedStyle(el).display !== 'none', text: el.textContent.trim() }; });
        s.hintVsTower = s.hint.shown ? meet(await box(page, '#ringHint'), await box(page, '#ringTower')) : false;
        s.hintCopy = mobile ? /^Tap a stop/.test(s.hint.text) : /^Click a stop/.test(s.hint.text);
        if (mobile) await page.tap('#ringDrive'); else await page.click('#ringDrive');
        await page.waitForTimeout(1300);
        s.exit = await box(page, '#ringLapExit'); s.map = await box(page, '#ringMap'); s.exitOverMap = meet(s.exit, s.map);
        s.kbdHidden = (await display(page, '#ringLapExit kbd')) === 'none';
        s.actionsHidden = (await display(page, '.ring-hud-actions')) === 'none';
        s.row = await box(page, '.ring-drive-row'); s.hud = await box(page, '#ringDriveHud');
        s.rowInsideHud = s.row[0] >= s.hud[0] - 1 && s.row[0] + s.row[2] <= s.hud[0] + s.hud[2] + 1;
        s.passes = await passOne(page);
        await page.waitForTimeout(700);
        s.toast = await box(page, '.ring-drive-toast'); s.toastText = await box(page, '.ring-drive-toast-text');
        s.toastOneLine = !!s.toastText && s.toastText[3] < 20;
        s.openHit = await page.evaluate(() => { const b = document.querySelector('.ring-drive-open'); if (!b) return null; const r = b.getBoundingClientRect(); const t = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2); return { ok: !!(t && t.closest('.ring-drive-open')), h: Math.round(r.height), font: getComputedStyle(b).fontSize }; });
        await shot(page, 'fix-' + w + 'x' + h + '-toast');
        await finish(page); await page.waitForTimeout(700);
        s.card = await box(page, '#ringDriveCard'); s.tower = await box(page, '#ringTower'); s.cardOverTower = meet(s.card, s.tower);
        s.toastsWithCard = await page.evaluate(() => document.querySelectorAll('.ring-drive-toast').length);
        s.timerHidden = (await display(page, '#ringDriveTime')) === 'none';
        s.again = await hit(page, 'ringDriveAgain'); s.home = await hit(page, 'ringDriveHome');
        s.yourOneLine = (await box(page, '#ringDriveYour'))[3] < 30;
        await shot(page, 'fix-' + w + 'x' + h + '-card');
        const c = s.home.box;
        if (mobile) await page.touchscreen.tap(c[0] + c[2] / 2, c[1] + c[3] / 2); else await page.mouse.click(c[0] + c[2] / 2, c[1] + c[3] / 2);
        await page.waitForTimeout(900);
        s.afterHome = await page.evaluate(() => ({ driving: window.__circuit.nav.state().driving, open: window.__circuit.nav.state().open, cars: window.__circuit.cars.length }));
        s.ok = !s.hintVsTower && s.hintCopy && !s.exitOverMap && s.rowInsideHud && !!s.toast && s.toastOneLine && !!s.openHit && s.openHit.ok && s.openHit.h >= 36
            && !s.cardOverTower && s.toastsWithCard === 0 && s.timerHidden && s.again.ok && s.home.ok && s.yourOneLine
            && !s.afterHome.driving && !s.afterHome.open && s.afterHome.cars === field && (!mobile || (s.kbdHidden && s.actionsHidden));
        await ctx.close();
    }
    /* b. the keyboard, the focus, the Grid, the card's number, the car */
    {
        const page = await browser.newPage({ viewport: { width: 1600, height: 900 } }); watch(page);
        await load(page);
        const k = fx.keyboard = {};
        await page.click('#ringDrive'); await page.waitForTimeout(1300);
        k.focusOnStart = await page.evaluate(() => document.activeElement.id);
        k.hudRole = await page.getAttribute('#ringDriveHud', 'role');
        k.hero = await page.evaluate(() => { const you = window.__circuit.cars.find(x => x.player); return { body: you.group.children[0].material.color.getHexString(), name: you.name, accent: you.accent, meshes: you.group.children.length }; });
        await page.waitForTimeout(1000);
        k.haloGone = await page.evaluate(() => window.__circuit.cars.find(x => x.player).group.children.length === 6);
        await page.keyboard.press('Shift+Tab');
        k.shiftTab = await page.evaluate(() => document.activeElement.id);
        await page.keyboard.down('Space'); await page.waitForTimeout(400);
        k.spaceThrottle = await page.evaluate(() => window.__circuit.driveState().throttle);
        await page.keyboard.up('Space'); await page.waitForTimeout(400);
        k.spaceOnExitLeaves = await page.evaluate(() => !window.__circuit.nav.state().driving);
        k.focusAfterExit = await page.evaluate(() => document.activeElement.id);
        /* the key that took the car does not steer it */
        await page.evaluate(() => document.activeElement.blur());
        await page.keyboard.down('d'); await page.waitForTimeout(150);
        for (let i = 0; i < 6; i++) { await page.keyboard.down('d'); await page.waitForTimeout(100); }
        k.holdD = await page.evaluate(() => { const d = window.__circuit.driveState(); return { on: d.on, steer: d.steer, lateral: d.lateral }; });
        await page.keyboard.up('d'); await page.waitForTimeout(100);
        await page.keyboard.down('d'); await page.waitForTimeout(350);
        k.dSteersAfterRelease = await page.evaluate(() => window.__circuit.driveState().steer);
        await page.keyboard.up('d');
        k.gridWhileDriving = await page.evaluate(() => ({ rows: [...document.querySelectorAll('.ring-tower-row')].filter(r => r.getBoundingClientRect().height > 0).length, you: !!document.querySelector('.ring-tower-row.is-you.is-near'),
            foot: getComputedStyle(document.getElementById('ringTowerFoot')).display, clock: getComputedStyle(document.getElementById('ringTowerClock')).display, watch: getComputedStyle(document.getElementById('ringLap')).display,
            line: getComputedStyle(document.querySelector('.ring-hud-line')).display, drive: document.getElementById('ringDrive').textContent.trim(), pressed: document.getElementById('ringDrive').getAttribute('aria-pressed') }));
        k.youRow = await page.evaluate(() => { const r = document.querySelector('.ring-tower-row.is-you'); return { tag: r.tagName, label: r.getAttribute('aria-label'), text: r.textContent.replace(/\s+/g, ' ').trim(), tabbable: r.tabIndex >= 0 }; });
        k.timer = await text(page, '#ringDriveTime');
        k.fonts = await page.evaluate(() => ({ time: parseFloat(getComputedStyle(document.getElementById('ringDriveTime')).fontSize), name: parseFloat(getComputedStyle(document.querySelector('.ring-hud-name')).fontSize), pos: getComputedStyle(document.getElementById('ringDrivePos')).fontWeight }));
        /* Space on a toast's Open it opens the stop; a focused toast is kept */
        k.passes = await passOne(page); await page.waitForTimeout(700);
        await page.focus('#ringDriveHud'); await page.keyboard.press('Tab');
        k.tabToOpen = await page.evaluate(() => document.activeElement.className);
        await page.waitForTimeout(5600);
        k.toastHeldByFocus = await page.evaluate(() => document.activeElement.className === 'ring-drive-open' && !!document.querySelector('.ring-drive-toast'));
        await page.focus('.ring-drive-open:not([data-stop="betta"])');   // a toast for a stop other than Betta's
        await page.keyboard.press('Space'); await page.waitForTimeout(1400);
        k.spaceOpensStop = await page.evaluate(() => ({ open: window.__circuit.nav.state().open, driving: window.__circuit.nav.state().driving, panel: !document.getElementById('ringPanel').hidden }));
        await page.keyboard.press('Escape'); await page.waitForTimeout(500);
        /* Space on the card's Back to the map, and the focus after it */
        await page.evaluate(() => document.activeElement.blur());
        await page.keyboard.press('d'); await page.waitForTimeout(1300);
        await finish(page); await page.waitForTimeout(700);
        k.cardRole = await page.getAttribute('#ringDriveCard', 'role');
        k.focusOnCard = await page.evaluate(() => document.activeElement.id);
        k.firstLapBestHidden = await page.evaluate(() => document.getElementById('ringDriveBest').hidden);
        await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
        k.tabToHome = await page.evaluate(() => document.activeElement.id);
        await page.keyboard.press('Space'); await page.waitForTimeout(1200);
        k.spaceHome = await page.evaluate(() => ({ driving: window.__circuit.nav.state().driving, active: document.activeElement.id }));
        /* D from a focused pill or pin does nothing; from the page it drives */
        await page.click('#ringLap'); await page.waitForTimeout(600);
        await page.keyboard.press('d'); await page.waitForTimeout(300);
        k.dFromWatchPill = await page.evaluate(() => window.__circuit.nav.state().driving);
        await page.focus('.ring-pin'); await page.keyboard.press('d'); await page.waitForTimeout(300);
        k.dFromPin = await page.evaluate(() => window.__circuit.nav.state().driving);
        await page.evaluate(() => document.activeElement.blur());
        await page.keyboard.press('d'); await page.waitForTimeout(900);
        k.dFromPage = await page.evaluate(() => window.__circuit.nav.state().driving);
        /* a best already on the device: New best when faster, the best to beat when slower */
        await page.evaluate(() => { try { localStorage.setItem('wada-ring-drive-best', '500'); } catch (e) { /* no storage */ } });
        await finish(page); await page.waitForTimeout(500);
        k.bestFaster = await page.evaluate(() => ({ hidden: document.getElementById('ringDriveBest').hidden, text: document.getElementById('ringDriveBest').textContent }));
        await page.click('#ringDriveAgain'); await page.waitForTimeout(1300);
        await page.evaluate(() => { try { localStorage.setItem('wada-ring-drive-best', '40'); } catch (e) { /* no storage */ } });
        await finish(page); await page.waitForTimeout(500);
        k.bestSlower = await page.evaluate(() => ({ hidden: document.getElementById('ringDriveBest').hidden, text: document.getElementById('ringDriveBest').textContent }));
        await shot(page, 'fix-card-best');
        await page.keyboard.press('Escape'); await page.waitForTimeout(1200);
        k.gridAfter = await page.evaluate(() => ({ rows: [...document.querySelectorAll('.ring-tower-row')].filter(r => r.getBoundingClientRect().height > 0).length, foot: getComputedStyle(document.getElementById('ringTowerFoot')).display,
            headBg: getComputedStyle(document.querySelector('.ring-tower-head')).backgroundColor, rowBg: getComputedStyle(document.querySelector('.ring-tower-row')).backgroundColor, active: document.activeElement.id }));
        k.ok = k.focusOnStart === 'ringDriveHud' && k.hudRole === 'group' && k.hero.body === 'f7f5f0' && k.hero.name === '' && k.hero.meshes === 7 && k.haloGone
            && k.shiftTab === 'ringLapExit' && k.spaceThrottle === 0 && k.spaceOnExitLeaves && k.focusAfterExit === 'ringDrive'
            && k.holdD.on && k.holdD.steer === 0 && Math.abs(k.holdD.lateral) < 0.2 && k.dSteersAfterRelease === 1
            && k.gridWhileDriving.rows === 3 && k.gridWhileDriving.you && k.gridWhileDriving.foot === 'none' && k.gridWhileDriving.clock === 'none' && k.gridWhileDriving.watch === 'none' && k.gridWhileDriving.line === 'none' && k.gridWhileDriving.drive === 'Drive' && k.gridWhileDriving.pressed === 'true'
            && k.youRow.tag === 'DIV' && !k.youRow.label && /^P\d ?YOU/.test(k.youRow.text) && !k.youRow.tabbable
            && /^\d+:\d\d$/.test(k.timer) && k.fonts.time < k.fonts.name && k.fonts.pos === '600'
            && k.tabToOpen === 'ring-drive-open' && k.toastHeldByFocus && k.spaceOpensStop.panel && !k.spaceOpensStop.driving
            && k.cardRole === 'group' && k.focusOnCard === 'ringDriveCard' && k.firstLapBestHidden && k.tabToHome === 'ringDriveHome' && !k.spaceHome.driving && k.spaceHome.active === 'ringDrive'
            && !k.dFromWatchPill && !k.dFromPin && k.dFromPage
            && !k.bestFaster.hidden && k.bestFaster.text === 'New best' && !k.bestSlower.hidden && k.bestSlower.text === 'Best on this device 0:40.0'
            && k.gridAfter.rows === field && k.gridAfter.foot !== 'none' && k.gridAfter.headBg === 'rgb(247, 245, 240)' && k.gridAfter.rowBg === 'rgb(247, 245, 240)' && k.gridAfter.active === 'ringDrive';
        await page.close();
    }
    /* c. reduced motion: the car leaves the Grid with the loop stopped */
    {
        const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, reducedMotion: 'reduce' });
        const page = await ctx.newPage(); watch(page);
        await load(page);
        const r = fx.reduced = {};
        r.runningAtRest = await page.evaluate(() => window.__circuit.isRunning());
        await page.click('#ringDrive'); await page.waitForTimeout(500);
        r.noHalo = await page.evaluate(() => window.__circuit.cars.find(x => x.player).group.children.length === 6);
        r.youRowOn = await page.evaluate(() => !!document.querySelector('.ring-tower-row.is-you'));
        await page.keyboard.down('ArrowUp'); await page.waitForTimeout(2500); await page.keyboard.up('ArrowUp');
        await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
        r.after = await page.evaluate(() => ({ running: window.__circuit.isRunning(), cars: window.__circuit.cars.length, youRow: !!document.querySelector('.ring-tower-row.is-you'), label: document.getElementById('ringTower').getAttribute('aria-label'), active: document.activeElement.id }));
        await shot(page, 'fix-reduced-after');
        r.ok = !r.runningAtRest && r.noHalo && r.youRowOn && !r.after.running && r.after.cars === field && !r.after.youRow && r.after.label.endsWith(field + ' cars, one per project') && r.after.active === 'ringDrive';
        await ctx.close();
    }
    /* d. no chip shows through the chrome while the camera rides the car */
    for (const [w, h] of [[1600, 900], [540, 900], [390, 844]]) {
        const mobile = w < 500;
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
        const page = await ctx.newPage(); watch(page);
        await load(page);
        const ch = fx.chips[w + 'x' + h] = { samples: 0, bleed: 0, under: 0, worst: null };
        if (mobile) await page.tap('#ringDrive'); else await page.click('#ringDrive');
        await page.keyboard.down('ArrowUp');
        const t0 = Date.now();
        while (Date.now() - t0 < 9000) {
            const s = await page.evaluate(() => {
                const rect = el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
                const chrome = ['.ring-hud', '#ringDriveHud', '.ring-broadcast'].map(q => document.querySelector(q)).filter(el => el && !el.hidden).map(rect).filter(r => r.w > 0 && r.h > 0);
                const deep = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 6 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 6;
                let bleed = 0, under = 0, worst = null;
                for (const pin of document.querySelectorAll('.ring-pin')) {
                    if (pin.classList.contains('is-under') || parseFloat(getComputedStyle(pin).opacity) < 0.05) { under++; continue; }
                    const r = rect(pin);
                    for (const c of chrome) if (deep(r, c)) { bleed++; if (!worst) worst = { pin: pin.dataset.id, chip: r, chrome: c }; }
                }
                return { bleed, under, worst };
            });
            ch.samples++; ch.bleed += s.bleed; ch.under += s.under; if (s.bleed && !ch.worst) ch.worst = s.worst;
            await page.waitForTimeout(150);
        }
        await page.keyboard.up('ArrowUp');
        if (w === 1600) await shot(page, 'fix-chips-drive');
        ch.ok = ch.samples > 20 && ch.bleed === 0;
        await ctx.close();
    }
    fx.ok = Object.values(fx.sizes).every(s => s.ok) && fx.keyboard.ok && fx.reduced.ok && Object.values(fx.chips).every(c => c.ok);
}

/* ------------------------------------------------ the verdict */
const m = report.maths, l = report.live, p = report.phone;
report.checks = {
    laneInsideLines: m.sweep.maxLane <= 3.1 && m.botLap.maxLane <= 3.1,
    noTouches: m.sweep.touches === 0 && m.botLap.touches === 0,
    lapCompleted: m.sweep.lapDone === true && m.botLap.lapTime != null,
    passedSomebody: m.sweep.passed > 0 && m.botLap.passesAtLap > 0,
    carLeaves: m.carsAfter === m.field && m.carsDrive === m.field + 1 && m.rowDrive && !m.rowAfter && m.carsEnd === m.field,
    inputClamped: m.clamped.throttle === 1 && m.clamped.steer === -1 && m.clamped.brake === true && m.brakedV < 4,
    liveHud: l.hudShown && l.timerAdvances && l.posChip && l.throttleHeld === 1,
    liveLeaves: l.hudHidden && l.youRowGone && l.carsAfter === m.field && l.drivingAfter === false && l.exitHidden,
    liveChrome: l.driveLabel === 'Drive' && l.watchLabel === 'Watch the race' && l.driveLabelOn === 'Drive' && l.drivePressed === 'true' && l.watchHiddenOn && /Leave the car/.test(l.exitLabel) && l.youRow && l.clockOk && /Drive to join them/.test(l.caption) && /\d+ cars/.test(l.gridLabel),
    liveRoutes: l.watchOn === true && l.dKeyDrives === true && l.rowOpensStop === true,
    phone: p.hudShown && p.tipShown && p.hudInViewport && p.cameraOnCar && p.throttleOnPress === 1 && Math.abs(p.steerOnSlide) >= 0.9 && p.throttleOnRelease === 0 && p.tipGoneAfter4s && p.leftByPill,
    fixRound: report.fix.ok,
    noErrors: errors.length === 0
};
report.pass = Object.values(report.checks).every(Boolean);
console.log(JSON.stringify({ checks: report.checks, pass: report.pass, fix: { sizes: Object.fromEntries(Object.entries(report.fix.sizes).map(([k, v]) => [k, { ok: v.ok, again: v.again.hit, home: v.home.hit, card: v.card, tower: v.tower, toast: v.toast, exitOverMap: v.exitOverMap, hint: v.hint }])), keyboard: report.fix.keyboard, reduced: report.fix.reduced, chips: report.fix.chips }, maths: { calls: [m.callsRest, m.callsDrive, m.callsAfter], sweep: m.sweep, botLap: m.botLap, tune: m.tune }, live: { timeAt5: l.timeAt5, timeAt20: l.timeAt20, pos: [l.posAt5, l.posAt20], toastText: l.toastText, cardYour: l.cardYour, cardBest: l.cardBest, before: l.driveStateBeforeEscape, fps: l.fpsWhileDriving.slice(0, 12), calls: [l.callsDriving, l.callsAfter], clock: l.clock }, phone: p, errors }, null, 1));
if (out) fs.writeFileSync(out, JSON.stringify(report, null, 1));
await browser.close();
process.exit(report.pass ? 0 : 1);
