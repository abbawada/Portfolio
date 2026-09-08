/* V1.2 label contract, checked in real Chrome through Playwright.
   Usage: node tools/circuit/labeltest.mjs URL [OUT.json]
   Every stop: its chip is visible at the default view with the title in
   it, hovering adds the lift and the glow class and changes the cursor,
   clicking the chip opens the panel with the same title, Escape closes.
   Nothing in the world carries a hover-only title: no SVG <title>, no
   title attributes on the world layer. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pw = [process.env.PLAYWRIGHT, path.join(ROOT, 'node_modules/playwright/index.mjs'),
    path.join(process.env.HOME || '', 'Projects/Betta/BettaType/betta-live-site/node_modules/playwright/index.mjs')].filter(Boolean).find(p => fs.existsSync(p));
const { chromium } = await import(pathToFileURL(pw).href);
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { waitUntil: 'load' });
await page.waitForFunction(() => window.__circuit && window.__circuit.groups);
await page.evaluate(() => window.__circuit.ready); await page.waitForTimeout(1500);
const r = { stops: [], errors };
const locs = await page.evaluate(() => window.CircuitLayout.LOCATIONS.map(l => ({ id: l.id, num: l.num, name: l.name, section: l.section })));
r.hoverOnlyTitles = await page.evaluate(() => document.querySelectorAll('#ringMap title, #ringPins [title], #ringMap [title]').length);
for (const loc of locs) {
    const pin = page.locator('.ring-pin[data-id="' + loc.id + '"]');
    const s = { id: loc.id };
    s.visibleAtRest = await pin.isVisible() && (await pin.evaluate(el => getComputedStyle(el).opacity === '1'));
    s.chipText = (await pin.locator('.ring-pin-text').innerText()).replace(/\s+/g, ' ').trim();
    s.titleAtRest = s.chipText.includes(loc.num) && s.chipText.toUpperCase().includes(loc.name.toUpperCase()) && s.chipText.toUpperCase().includes(loc.section.toUpperCase());
    await pin.hover(); await page.waitForTimeout(350);
    s.hoverLift = await page.evaluate(id => +window.__circuit.groups[id].position.y.toFixed(2), loc.id);
    s.hoverGlow = await pin.evaluate(el => el.classList.contains('is-hot'));
    s.cursor = await pin.evaluate(el => getComputedStyle(el).cursor);
    s.chipTextAfterHover = (await pin.locator('.ring-pin-text').innerText()).replace(/\s+/g, ' ').trim();
    s.hoverAddsNoText = s.chipTextAfterHover === s.chipText;
    await pin.click(); await page.waitForTimeout(1100);
    s.panelOpen = await page.evaluate(() => !document.getElementById('ringPanel').hidden);
    s.panelTitle = await page.locator('#ringPanelTitle').innerText();
    s.opensRightStop = s.panelTitle === loc.name;
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    s.closed = await page.evaluate(() => document.getElementById('ringPanel').hidden);
    s.cameraStayed = await page.evaluate(() => Math.abs(window.__circuit.nav.state().zoom - 1) > 0.3);   // closing does not fly home (V1.2)
    await page.keyboard.press('Home'); await page.waitForTimeout(1000);   // back to the default view for the next stop
    s.pass = s.visibleAtRest && s.titleAtRest && s.hoverLift > 0.5 && s.hoverGlow && s.cursor === 'pointer' && s.hoverAddsNoText && s.panelOpen && s.opensRightStop && s.closed && s.cameraStayed;
    r.stops.push(s); console.log(loc.id, s.pass ? 'pass' : 'FAIL', JSON.stringify(s));
}
r.pass = r.stops.every(s => s.pass) && r.hoverOnlyTitles === 0 && errors.length === 0;
console.log('hover-only titles in the world layer:', r.hoverOnlyTitles, '| errors:', errors.length, '| all pass:', r.pass);
if (out) fs.writeFileSync(out, JSON.stringify(r, null, 1));
await browser.close();
