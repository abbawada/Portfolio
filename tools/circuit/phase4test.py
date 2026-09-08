"""Phase 4 gate: every stop opens its shelf, every project is reachable in
two clicks, the case flip works inside the world. Real Chrome over CDP.
Usage: /usr/local/bin/python3 tools/circuit/phase4test.py URL OUTDIR"""
import asyncio, base64, json, subprocess, sys, time, urllib.request, os, tempfile
import websockets

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9235

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

async def main():
    url, out = sys.argv[1], sys.argv[2]
    profile = os.path.join(tempfile.gettempdir(), "wada-ring-p4-profile")
    proc = subprocess.Popen([CHROME, "--headless=new", f"--remote-debugging-port={PORT}", "--window-size=1600,900",
                             "--no-first-run", "--user-data-dir=" + profile, "--disable-background-timer-throttling", "about:blank"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    report = {"stops": {}}
    try:
        tabs = None
        for _ in range(120):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json")); break
            except Exception:
                time.sleep(0.25)
        tab = next(t for t in tabs if t["type"] == "page")
        async with websockets.connect(tab["webSocketDebuggerUrl"], max_size=None) as ws:
            c = [0]
            def n():
                c[0] += 1; return c[0]
            async def ev(expr):
                r = await cdp(ws, n(), "Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
                if "exceptionDetails" in r: raise RuntimeError(json.dumps(r["exceptionDetails"])[:300])
                return r["result"].get("value")
            async def key(k, vk):
                for t in ("keyDown", "keyUp"):
                    await cdp(ws, n(), "Input.dispatchKeyEvent", {"type": t, "key": k, "code": k, "windowsVirtualKeyCode": vk})
            async def shot(path):
                r = await cdp(ws, n(), "Page.captureScreenshot", {"format": "png"})
                open(path, "wb").write(base64.b64decode(r["data"]))
            errors = []
            await cdp(ws, n(), "Runtime.enable")
            await cdp(ws, n(), "Page.enable")
            await cdp(ws, n(), "Network.enable")
            await cdp(ws, n(), "Network.setCacheDisabled", {"cacheDisabled": True})
            await cdp(ws, n(), "Emulation.setFocusEmulationEnabled", {"enabled": True})
            await cdp(ws, n(), "Emulation.setDeviceMetricsOverride", {"width": 1600, "height": 900, "deviceScaleFactor": 1, "mobile": False})
            await cdp(ws, n(), "Page.navigate", {"url": url})
            await wait_event(ws, "Page.loadEventFired")
            await asyncio.sleep(3)
            await ev("window.__errs = []; window.addEventListener('error', e => window.__errs.push(String(e.message)))")
            for sid in ["about", "betta", "education", "economics", "writing", "projects", "contact"]:
                await ev(f"window.__circuit.nav.go('{sid}')")
                await asyncio.sleep(1.3)
                d = {}
                d["open"] = (await ev("JSON.stringify(window.__circuit.nav.state())"))
                d["open"] = json.loads(d["open"])["open"]
                d["title"] = await ev("document.getElementById('ringPanelTitle').textContent")
                d["cases"] = await ev("document.querySelectorAll('.ring-grid .pcase').length")
                d["rows"] = await ev("document.querySelectorAll('.ring-panel .plain-list li').length")
                d["essays"] = await ev("document.querySelectorAll('.ring-panel .publication-item').length")
                d["links"] = await ev("document.querySelectorAll('.ring-panel a[href]').length")
                d["images"] = await ev("document.querySelectorAll('.ring-panel img').length")
                d["skills"] = await ev("document.querySelectorAll('.ring-panel .skills-grid span').length")
                if sid == "projects":
                    await shot(os.path.join(out, "phase-4-projects.png"))
                if d["cases"]:
                    await ev("document.querySelector('.ring-grid .pcase').click()")
                    await asyncio.sleep(1.7)
                    d["stage_open"] = await ev("!document.getElementById('ringStage').hidden && document.getElementById('ringStage').classList.contains('is-open')")
                    d["spread_title"] = await ev("(document.querySelector('#ringStage .back-title') || {}).textContent || null")
                    d["spread_links"] = await ev("[...document.querySelectorAll('#ringStage .back-links a')].map(a => a.getAttribute('href'))")
                    d["spread_focus"] = await ev("document.activeElement.className")
                    if sid == "betta":
                        await asyncio.sleep(0.8)
                        d["capture_mounted"] = await ev("!!document.querySelector('#ringStage [data-live] *')")
                        d["video_playing"] = await ev("(v => v ? !v.paused : null)(document.querySelector('#ringStage video'))")
                        await shot(os.path.join(out, "phase-4-betta-spread.png"))
                    if sid == "projects":
                        await shot(os.path.join(out, "phase-4-spread.png"))
                        await key("ArrowRight", 39); await asyncio.sleep(0.6)
                        d["arrow_steps_to"] = await ev("(document.querySelector('#ringStage .back-title') || {}).textContent || null")
                    await key("Escape", 27); await asyncio.sleep(1.2)
                    d["stage_closed_panel_open"] = await ev("document.getElementById('ringStage').hidden && !document.getElementById('ringPanel').hidden")
                    d["focus_back_on_case"] = await ev("document.activeElement.className")
                await key("Escape", 27); await asyncio.sleep(1.2)
                d["panel_closed"] = await ev("document.getElementById('ringPanel').hidden")
                d["panel_body_empty"] = await ev("document.getElementById('ringPanelBody').innerHTML === ''")
                report["stops"][sid] = d
            report["js_errors"] = await ev("JSON.stringify(window.__errs)")
            report["draw_calls"] = await ev("window.__circuit.stats.calls")
            report["fps"] = await ev("+window.__circuit.meanFps().toFixed(1)")
            report["stage_open_class_clean"] = await ev("document.body.className")
    finally:
        proc.terminate()
        try: proc.wait(5)
        except Exception: proc.kill()
    open(os.path.join(out, "phase-4-report.json"), "w").write(json.dumps(report, indent=1))
    print(json.dumps(report, indent=1))

asyncio.run(main())
