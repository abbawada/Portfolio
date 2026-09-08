"""Phase 5 gate: reduced motion, the no-WebGL poster, and the phone path.
Real Chrome over CDP. Writes docs/circuit/phase-5-report.json and PNGs.
Usage: /usr/local/bin/python3 tools/circuit/phase5test.py URL OUTDIR"""
import asyncio, base64, json, subprocess, sys, time, urllib.request, os, tempfile
import websockets

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

async def cdp(ws, i, method, params=None):
    await ws.send(json.dumps({"id": i, "method": method, "params": params or {}}))
    while True:
        m = json.loads(await ws.recv())
        if m.get("id") == i:
            if "error" in m: raise RuntimeError(method + ": " + json.dumps(m["error"]))
            return m.get("result", {})

async def wait_event(ws, name, timeout=12):
    try:
        while True:
            m = json.loads(await asyncio.wait_for(ws.recv(), timeout))
            if m.get("method") == name: return
    except asyncio.TimeoutError:
        pass

class Chrome:
    def __init__(self, port, extra=()):
        self.port = port; self.extra = list(extra); self.proc = None
    async def __aenter__(self):
        profile = os.path.join(tempfile.gettempdir(), f"wada-ring-p5-{self.port}")
        self.proc = subprocess.Popen([CHROME, "--headless=new", f"--remote-debugging-port={self.port}", "--window-size=1600,900",
                                      "--no-first-run", "--user-data-dir=" + profile, "--disable-background-timer-throttling"] + self.extra + ["about:blank"],
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        tabs = None
        for _ in range(120):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json")); break
            except Exception:
                time.sleep(0.25)
        tab = next(t for t in tabs if t["type"] == "page")
        self.ws = await websockets.connect(tab["webSocketDebuggerUrl"], max_size=None)
        self.n = 0
        return self
    async def __aexit__(self, *a):
        await self.ws.close()
        self.proc.terminate()
        try: self.proc.wait(5)
        except Exception: self.proc.kill()
    async def call(self, m, p=None):
        self.n += 1; return await cdp(self.ws, self.n, m, p)
    async def ev(self, expr):
        r = await self.call("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
        if "exceptionDetails" in r: raise RuntimeError(json.dumps(r["exceptionDetails"])[:300])
        return r["result"].get("value")
    async def key(self, k, vk):
        for t in ("keyDown", "keyUp"):
            await self.call("Input.dispatchKeyEvent", {"type": t, "key": k, "code": k, "windowsVirtualKeyCode": vk})
    async def shot(self, path):
        r = await self.call("Page.captureScreenshot", {"format": "png"})
        open(path, "wb").write(base64.b64decode(r["data"]))
    async def touch(self, kind, points):
        await self.call("Input.dispatchTouchEvent", {"type": kind, "touchPoints": [{"x": x, "y": y} for x, y in points]})
    async def load(self, url, w, h, dpr, mobile, reduced=False):
        await self.call("Page.enable"); await self.call("Runtime.enable")
        await self.call("Network.enable"); await self.call("Network.setCacheDisabled", {"cacheDisabled": True})
        await self.call("Emulation.setFocusEmulationEnabled", {"enabled": True})
        await self.call("Emulation.setDeviceMetricsOverride", {"width": w, "height": h, "deviceScaleFactor": dpr, "mobile": mobile})
        await self.call("Emulation.setTouchEmulationEnabled", {"enabled": mobile, "maxTouchPoints": 5})
        await self.call("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce" if reduced else "no-preference"}]})
        await self.call("Page.navigate", {"url": url})
        await wait_event(self.ws, "Page.loadEventFired")
        await asyncio.sleep(3)
        await self.ev("window.__errs = []; window.addEventListener('error', e => window.__errs.push(String(e.message)))")

async def poster_checks(b, r, out, tag):
    r["no_webgl_class"] = await b.ev("document.body.classList.contains('ring-no-webgl')")
    r["canvas_hidden"] = await b.ev("getComputedStyle(document.getElementById('world')).display === 'none'")
    await asyncio.sleep(1.5)
    r["poster_image_loaded"] = await b.ev("(i => i && i.naturalWidth > 0)(document.querySelector('.ring-poster-box img'))")
    r["regions"] = await b.ev("document.querySelectorAll('.ring-poster-areas polygon').length")
    r["labels"] = await b.ev("document.querySelectorAll('.ring-poster .ring-pin').length")
    await b.ev("document.activeElement.blur()")
    await b.key("Tab", 9); await b.key("Tab", 9)
    r["tab_reaches_region"] = await b.ev("document.activeElement.getAttribute('aria-label')")
    await b.key("Enter", 13); await asyncio.sleep(0.4)
    r["enter_opens"] = await b.ev("!document.getElementById('ringPanel').hidden && document.getElementById('ringPanelTitle').textContent")
    await b.key("Escape", 27); await asyncio.sleep(0.3)
    r["escape_closes"] = await b.ev("document.getElementById('ringPanel').hidden")
    # click the Projects region, flip a case
    c = await b.ev("(() => { const p = document.querySelector('.ring-poster-areas polygon[aria-label*=Projects]'); const b = p.getBoundingClientRect(); return JSON.stringify([b.x + b.width / 2, b.y + b.height / 2]); })()")
    x, y = json.loads(c)
    await b.call("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": x, "y": y})
    await b.call("Input.dispatchMouseEvent", {"type": "mousePressed", "x": x, "y": y, "button": "left", "clickCount": 1})
    await b.call("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": x, "y": y, "button": "left", "clickCount": 1})
    await asyncio.sleep(0.6)
    r["click_region_cases"] = await b.ev("document.querySelectorAll('.ring-grid .pcase').length")
    await b.shot(os.path.join(out, f"phase-5-{tag}.png"))
    await b.ev("document.querySelector('.ring-grid .pcase').click()"); await asyncio.sleep(1.6)
    r["case_flips"] = await b.ev("(document.querySelector('#ringStage .back-title') || {}).textContent || null")
    await b.key("Escape", 27); await asyncio.sleep(1.0); await b.key("Escape", 27); await asyncio.sleep(0.3)
    r["closed_clean"] = await b.ev("document.getElementById('ringPanel').hidden && document.getElementById('ringStage').hidden")
    r["js_errors"] = await b.ev("JSON.stringify(window.__errs)")

async def main():
    url, out = sys.argv[1], sys.argv[2]
    report = {}
    # A. the poster by query, WebGL present but bypassed
    async with Chrome(9237) as b:
        await b.load(url + "&nowebgl=1", 1600, 900, 1, False)
        r = {}; await poster_checks(b, r, out, "poster"); report["poster_by_query"] = r
    # B. WebGL really unavailable
    async with Chrome(9238, ["--disable-3d-apis"]) as b:
        await b.load(url, 1600, 900, 1, False)
        r = {}
        r["webgl_available"] = await b.ev("(() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })()")
        await poster_checks(b, r, out, "poster-real"); report["webgl_disabled"] = r
    # C. the phone path
    async with Chrome(9239) as b:
        await b.load(url, 390, 844, 3, True)
        r = {}
        r["world_running"] = await b.ev("!!(window.__circuit && window.__circuit.nav) && window.__circuit.isRunning()")
        r["no_horizontal_scroll"] = await b.ev("document.documentElement.scrollWidth <= innerWidth")
        await b.shot(os.path.join(out, "phase-5-mobile.png"))
        s0 = json.loads(await b.ev("JSON.stringify(window.__circuit.nav.state())"))
        # one-finger pan
        await b.touch("touchStart", [(195, 500)]); await b.touch("touchMove", [(150, 430)]); await b.touch("touchMove", [(120, 380)]); await b.touch("touchEnd", [])
        await asyncio.sleep(0.3)
        s1 = json.loads(await b.ev("JSON.stringify(window.__circuit.nav.state())"))
        r["touch_pan"] = s1["target"] != s0["target"]
        # pinch out
        await b.touch("touchStart", [(170, 420), (220, 420)]); await b.touch("touchMove", [(130, 400), (260, 440)]); await b.touch("touchMove", [(90, 380), (300, 460)]); await b.touch("touchEnd", [])
        await asyncio.sleep(0.3)
        s2 = json.loads(await b.ev("JSON.stringify(window.__circuit.nav.state())"))
        r["pinch_zoom"] = round(s2["zoom"], 2)
        # tap a stop: the projects garage
        await b.ev("window.__circuit.nav.flyTo(105, 105, 1)"); await asyncio.sleep(1.0)
        p = json.loads(await b.ev("JSON.stringify(window.__circuit.project(100, 4, 156).slice(0, 2))"))
        await b.touch("touchStart", [(p[0], p[1])]); await b.touch("touchEnd", []); await asyncio.sleep(1.3)
        st = json.loads(await b.ev("JSON.stringify(window.__circuit.nav.state())"))
        r["tap_opens"] = st["open"]
        if not st["open"]:
            await b.ev("window.__circuit.nav.go('projects')"); await asyncio.sleep(1.3)
        r["sheet_from_bottom"] = await b.ev("(() => { const b = document.getElementById('ringPanel').getBoundingClientRect(); return b.top > innerHeight * 0.3 && b.width >= innerWidth - 1; })()")
        r["sheet_cases"] = await b.ev("document.querySelectorAll('.ring-grid .pcase').length")
        r["sheet_no_overflow"] = await b.ev("(p => p.scrollWidth <= p.clientWidth + 1)(document.getElementById('ringPanel'))")
        await b.shot(os.path.join(out, "phase-5-mobile-sheet.png"))
        await b.ev("document.querySelector('.ring-grid .pcase').click()"); await asyncio.sleep(1.7)
        r["mobile_flip"] = await b.ev("(document.querySelector('#ringStage .back-title') || {}).textContent || null")
        r["mobile_spread_fits"] = await b.ev("(f => f ? (f.getBoundingClientRect().width <= innerWidth && f.getBoundingClientRect().height <= innerHeight) : null)(document.querySelector('#ringStage .flipper'))")
        await b.shot(os.path.join(out, "phase-5-mobile-spread.png"))
        await b.key("Escape", 27); await asyncio.sleep(1.0); await b.key("Escape", 27); await asyncio.sleep(1.2)
        r["closed_clean"] = await b.ev("document.getElementById('ringPanel').hidden && document.getElementById('ringStage').hidden")
        r["fps"] = await b.ev("+window.__circuit.meanFps().toFixed(1)")
        r["js_errors"] = await b.ev("JSON.stringify(window.__errs)")
        report["mobile"] = r
    # D. the phone with reduced motion
    async with Chrome(9240) as b:
        await b.load(url, 390, 844, 3, True, reduced=True)
        r = {}
        r["loop_off"] = await b.ev("!window.__circuit.isRunning()")
        await b.ev("window.__circuit.nav.go('betta')"); await asyncio.sleep(0.4)
        r["instant_open"] = await b.ev("!document.getElementById('ringPanel').hidden")
        r["car_parked"] = await b.ev("JSON.stringify(window.__circuit.nav.state().target)")
        await b.shot(os.path.join(out, "phase-5-mobile-reduced.png"))
        r["js_errors"] = await b.ev("JSON.stringify(window.__errs)")
        report["mobile_reduced"] = r
    open(os.path.join(out, "phase-5-report.json"), "w").write(json.dumps(report, indent=1))
    print(json.dumps(report, indent=1))

asyncio.run(main())
