"""Phase 3 gate: drive the world by keyboard and pointer in real Chrome over
CDP and report what happened. Prints a JSON report and writes screenshots.
Usage: /usr/local/bin/python3 tools/circuit/navtest.py URL OUTDIR"""
import asyncio, base64, json, subprocess, sys, time, urllib.request, os, tempfile
import websockets

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9233

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

class Page:
    def __init__(self, ws): self.ws = ws; self.n = 0
    async def call(self, method, params=None):
        self.n += 1; return await cdp(self.ws, self.n, method, params)
    async def ev(self, expr):
        r = await self.call("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
        if "exceptionDetails" in r: raise RuntimeError(json.dumps(r["exceptionDetails"])[:400])
        return r["result"].get("value")
    async def key(self, key, code=None, vk=0, text=None):
        p = {"key": key, "code": code or key, "windowsVirtualKeyCode": vk}
        if text: p["text"] = text
        await self.call("Input.dispatchKeyEvent", dict(p, type="keyDown"))
        await self.call("Input.dispatchKeyEvent", dict(p, type="keyUp"))
    async def mouse(self, kind, x, y, **kw):
        await self.call("Input.dispatchMouseEvent", dict({"type": kind, "x": x, "y": y}, **kw))
    async def shot(self, path):
        r = await self.call("Page.captureScreenshot", {"format": "png"})
        open(path, "wb").write(base64.b64decode(r["data"]))

STATE = "JSON.stringify(window.__circuit.nav.state())"

async def run(page, out, report, reduced=False):
    tag = "reduced" if reduced else "motion"
    await page.call("Page.enable")
    await page.call("Network.enable")
    await page.call("Network.setCacheDisabled", {"cacheDisabled": True})
    await page.call("Emulation.setFocusEmulationEnabled", {"enabled": True})
    await page.call("Emulation.setDeviceMetricsOverride", {"width": 1600, "height": 900, "deviceScaleFactor": 1, "mobile": False})
    await page.call("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce" if reduced else "no-preference"}]})
    await page.call("Page.navigate", {"url": URL + ("&rm=1" if reduced else "")})
    await wait_event(page.ws, "Page.loadEventFired")
    await asyncio.sleep(3)
    r = {}
    r["loaded"] = await page.ev("!!(window.__circuit && window.__circuit.nav)")
    r["running_loop"] = await page.ev("window.__circuit.isRunning()")
    s0 = json.loads(await page.ev(STATE))
    # motion audit: nothing but the five ambient elements moves without input
    lifts0 = await page.ev("JSON.stringify(Object.values(window.__circuit.groups).map(g => +g.position.y.toFixed(3)))")
    await asyncio.sleep(2)
    s1 = json.loads(await page.ev(STATE))
    lifts1 = await page.ev("JSON.stringify(Object.values(window.__circuit.groups).map(g => +g.position.y.toFixed(3)))")
    r["idle_camera_still"] = s0["zoom"] == s1["zoom"] and s0["target"] == s1["target"]
    r["idle_lifts_zero"] = lifts0 == lifts1 == "[0,0,0,0,0,0,0]"
    # keyboard: Tab to the lap button, Tab to stop 01, Enter opens
    await page.ev("document.activeElement.blur()")
    await page.key("Tab", vk=9); f1 = await page.ev("document.activeElement.className")
    await page.key("Tab", vk=9); f2 = await page.ev("document.activeElement.dataset.id || document.activeElement.className")
    r["tab_order"] = [f1, f2]
    await asyncio.sleep(0.7)   # the label fades in over about half a second
    r["focused_pin_visible"] = await page.ev("parseFloat(getComputedStyle(document.activeElement).opacity) > 0.9")
    t0 = time.time()
    await page.key("Enter", vk=13, text="\r")
    opened_at = None
    for _ in range(60):
        await asyncio.sleep(0.05)
        if await page.ev("!document.getElementById('ringPanel').hidden && document.getElementById('ringPanel').classList.contains('is-open')"):
            opened_at = (time.time() - t0) * 1000; break
    r["enter_opens_ms"] = None if opened_at is None else round(opened_at)
    r["open_id"] = json.loads(await page.ev(STATE))["open"]
    r["focus_in_panel"] = await page.ev("document.activeElement.id")
    r["fly_ms_constant"] = await page.ev("window.__circuit.nav.FLY_MS")
    await asyncio.sleep(0.4)
    await page.shot(os.path.join(out, f"phase-3-{tag}-open.png"))
    # Escape closes, focus returns to the pin, the camera flies back
    await page.key("Escape", vk=27)
    await asyncio.sleep(1.2)
    s2 = json.loads(await page.ev(STATE))
    r["escape_closes"] = s2["open"] is None and await page.ev("document.getElementById('ringPanel').hidden")
    r["focus_back_on_pin"] = await page.ev("document.activeElement.dataset.id || null")
    r["camera_back_home"] = [round(v, 1) for v in s2["target"]] == [105.0, 105.0] and abs(s2["zoom"] - 1) < 0.01
    # tab through every stop, enter on the last, escape
    ids = []
    for _ in range(6):
        await page.key("Tab", vk=9); ids.append(await page.ev("document.activeElement.dataset.id || null"))
    r["tab_cycles_all_stops"] = ids
    await page.key("Enter", vk=13, text="\r"); await asyncio.sleep(1.2)
    r["last_stop_opens"] = json.loads(await page.ev(STATE))["open"]
    await page.key("Escape", vk=27); await asyncio.sleep(1.2)
    # arrows pan, +/- zoom, 0 returns
    await page.ev("document.activeElement.blur()")
    await page.key("ArrowLeft", vk=37); await page.key("ArrowUp", vk=38); await page.key("=", "Equal", 187, "=")
    await asyncio.sleep(0.2)
    s3 = json.loads(await page.ev(STATE))
    r["arrows_and_plus_move"] = s3["target"] != [105, 105] and s3["zoom"] > 1
    await page.key("0", "Digit0", 48, "0"); await asyncio.sleep(1.0)
    s4 = json.loads(await page.ev(STATE))
    r["zero_returns_home"] = [round(v, 1) for v in s4["target"]] == [105.0, 105.0]
    # pointer: wheel zooms at the cursor, drag pans, click opens
    await page.mouse("mouseMoved", 800, 450)
    await page.mouse("mouseWheel", 800, 450, deltaX=0, deltaY=-400); await asyncio.sleep(0.2)
    r["wheel_zooms"] = json.loads(await page.ev(STATE))["zoom"] > 1.2
    await page.mouse("mousePressed", 800, 450, button="left", clickCount=1)
    await page.mouse("mouseMoved", 700, 380, button="left"); await page.mouse("mouseMoved", 600, 320, button="left")
    await page.mouse("mouseReleased", 600, 320, button="left", clickCount=1); await asyncio.sleep(0.2)
    s5 = json.loads(await page.ev(STATE))
    r["drag_pans"] = s5["target"] != s4["target"]
    r["labels_after_zoom"] = await page.ev("[...document.querySelectorAll('.ring-pin')].filter(p => parseFloat(p.style.opacity) > 0.5).map(p => p.dataset.id)")
    await page.shot(os.path.join(out, f"phase-3-{tag}-explore.png"))
    # click the court in the world
    pos = await page.ev("JSON.stringify(window.__circuit.project(110, 1, 112).slice(0, 2))")
    px, py = json.loads(pos)
    await page.mouse("mouseMoved", px, py); await asyncio.sleep(0.1)
    r["hover_cursor_pointer"] = await page.ev("document.getElementById('world').classList.contains('is-over')")
    await page.mouse("mousePressed", px, py, button="left", clickCount=1); await page.mouse("mouseReleased", px, py, button="left", clickCount=1)
    await asyncio.sleep(1.2)
    r["click_world_opens"] = json.loads(await page.ev(STATE))["open"]
    await page.key("Escape", vk=27); await asyncio.sleep(1.2)
    # mini-map click
    mp = await page.ev("(() => { const c = document.querySelector('.ring-map-stop[data-id=economics]'); const b = c.getBoundingClientRect(); return JSON.stringify([b.x + b.width/2, b.y + b.height/2]); })()")
    mx, my = json.loads(mp)
    await page.mouse("mouseMoved", mx, my); await page.mouse("mousePressed", mx, my, button="left", clickCount=1); await page.mouse("mouseReleased", mx, my, button="left", clickCount=1)
    await asyncio.sleep(1.2)
    r["minimap_click_opens"] = json.loads(await page.ev(STATE))["open"]
    await page.key("Escape", vk=27); await asyncio.sleep(1.2)
    # the lap guide: starts, marks stops, escape ends it
    await page.ev("document.getElementById('ringLap').click()")
    await asyncio.sleep(0.9 if not reduced else 0.3)
    r["lap_runs"] = json.loads(await page.ev(STATE))["lap"]
    r["lap_button_text"] = await page.ev("document.getElementById('ringLap').textContent")
    await asyncio.sleep(3.5)
    r["lap_label_lit"] = await page.ev("[...document.querySelectorAll('.ring-pin')].filter(p => parseFloat(p.style.opacity) > 0.9).map(p => p.dataset.id)")
    await page.shot(os.path.join(out, f"phase-3-{tag}-lap.png"))
    await page.key("Escape", vk=27); await asyncio.sleep(1.0)
    r["escape_ends_lap"] = not json.loads(await page.ev(STATE))["lap"]
    r["draw_calls"] = await page.ev("window.__circuit.stats.calls")
    r["fps"] = await page.ev("+window.__circuit.meanFps().toFixed(1)")
    report[tag] = r

async def main():
    global URL
    URL, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    profile = os.path.join(tempfile.gettempdir(), "wada-ring-navtest-profile")
    proc = subprocess.Popen([CHROME, "--headless=new", f"--remote-debugging-port={PORT}", "--window-size=1600,900",
                             "--no-first-run", "--user-data-dir=" + profile, "--disable-background-timer-throttling", "about:blank"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    report = {}
    try:
        tabs = None
        for _ in range(120):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json")); break
            except Exception:
                time.sleep(0.25)
        tab = next(t for t in tabs if t["type"] == "page")
        async with websockets.connect(tab["webSocketDebuggerUrl"], max_size=None) as ws:
            page = Page(ws)
            await run(page, out, report, reduced=False)
            await run(page, out, report, reduced=True)
    finally:
        proc.terminate()
        try: proc.wait(5)
        except Exception: proc.kill()
    open(os.path.join(out, "phase-3-report.json"), "w").write(json.dumps(report, indent=1))
    print(json.dumps(report, indent=1))

asyncio.run(main())
