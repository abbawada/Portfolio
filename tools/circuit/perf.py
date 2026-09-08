"""Measure the world in real Chrome over CDP.
Usage: /usr/local/bin/python3 tools/circuit/perf.py URL [--mobile] [--headed] [--seconds N]
--mobile: 390x844 at DPR 3 with 4x CPU throttling, a mid-tier phone proxy.
--headed: launch a visible Chrome window (the GPU path) instead of headless.
Prints JSON: fps (mean of the last seconds), draw calls, triangles, GL renderer."""
import asyncio, json, subprocess, sys, time, urllib.request, os, tempfile
import websockets

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9232

async def cdp(ws, i, method, params=None):
    await ws.send(json.dumps({"id": i, "method": method, "params": params or {}}))
    while True:
        m = json.loads(await ws.recv())
        if m.get("id") == i:
            return m.get("result", {})

async def wait_event(ws, name, timeout=12):
    try:
        while True:
            m = json.loads(await asyncio.wait_for(ws.recv(), timeout))
            if m.get("method") == name:
                return
    except asyncio.TimeoutError:
        pass

async def main():
    url = sys.argv[1]
    mobile = "--mobile" in sys.argv
    headed = "--headed" in sys.argv
    secs = int(sys.argv[sys.argv.index("--seconds") + 1]) if "--seconds" in sys.argv else 8
    w, h, dpr = (390, 844, 3) if mobile else (1600, 900, 1)
    profile = os.path.join(tempfile.gettempdir(), "wada-ring-perf-profile")
    args = [CHROME, f"--remote-debugging-port={PORT}", f"--window-size={w},{h}", "--no-first-run",
            "--user-data-dir=" + profile, "--disable-background-timer-throttling",
            "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "about:blank"]
    if not headed:
        args.insert(1, "--headless=new")
    proc = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        tabs = None
        for _ in range(120):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json"))
                break
            except Exception:
                time.sleep(0.25)
        page = next(t for t in tabs if t["type"] == "page")
        async with websockets.connect(page["webSocketDebuggerUrl"], max_size=None) as ws:
            n = [0]
            def i():
                n[0] += 1; return n[0]
            await cdp(ws, i(), "Page.enable")
            await cdp(ws, i(), "Network.enable")
            await cdp(ws, i(), "Network.setCacheDisabled", {"cacheDisabled": True})
            await cdp(ws, i(), "Emulation.setDeviceMetricsOverride",
                      {"width": w, "height": h, "deviceScaleFactor": dpr, "mobile": mobile})
            if mobile:
                await cdp(ws, i(), "Emulation.setCPUThrottlingRate", {"rate": 4})
            await cdp(ws, i(), "Page.navigate", {"url": url})
            await wait_event(ws, "Page.loadEventFired")
            await asyncio.sleep(3)
            await cdp(ws, i(), "Runtime.evaluate", {"expression": "window.__circuit && (window.__circuit.stats.window.length = 0)"})
            await asyncio.sleep(secs)
            expr = """(() => { const c = window.__circuit; if (!c) return JSON.stringify({error: 'no world'});
                const gl = c.renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info');
                return JSON.stringify({ fps: +c.meanFps().toFixed(1), samples: c.stats.window.slice(),
                  calls: c.stats.calls, triangles: c.stats.triangles,
                  gl: e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'n/a',
                  dpr: window.devicePixelRatio, size: [innerWidth, innerHeight] }); })()"""
            r = await cdp(ws, i(), "Runtime.evaluate", {"expression": expr, "returnByValue": True})
            out = json.loads(r["result"]["value"])
            out["mode"] = ("mobile proxy, 4x cpu throttle" if mobile else "desktop") + (", headed" if headed else ", headless")
            print(json.dumps(out))
    finally:
        proc.terminate()
        try: proc.wait(5)
        except Exception: proc.kill()

asyncio.run(main())
