"""Screenshot a page from the local dev server with real Chrome over CDP.
Usage: /usr/local/bin/python3 tools/circuit/shot.py URL OUT.png [W H] [--reduced]
Playwright is not installed in this repo; this is the repo's own harness
pattern (tools/qa/capture.py) reduced to one shot."""
import asyncio, base64, json, subprocess, sys, time, urllib.request, os, tempfile
import websockets

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9231

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
    url, out = sys.argv[1], sys.argv[2]
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 1600
    h = int(sys.argv[4]) if len(sys.argv) > 4 else 900
    reduced = "--reduced" in sys.argv
    profile = os.path.join(tempfile.gettempdir(), "wada-ring-shot-profile")
    proc = subprocess.Popen([CHROME, "--headless=new", f"--remote-debugging-port={PORT}",
                             f"--window-size={w},{h}", "--hide-scrollbars", "--no-first-run",
                             "--user-data-dir=" + profile, "about:blank"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
                      {"width": w, "height": h, "deviceScaleFactor": 1, "mobile": False})
            if reduced:
                await cdp(ws, i(), "Emulation.setEmulatedMedia",
                          {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
            await cdp(ws, i(), "Page.navigate", {"url": url})
            await wait_event(ws, "Page.loadEventFired")
            await asyncio.sleep(2.5)
            r = await cdp(ws, i(), "Page.captureScreenshot", {"format": "png"})
            with open(out, "wb") as f:
                f.write(base64.b64decode(r["data"]))
            print(out, os.path.getsize(out), "bytes")
    finally:
        proc.terminate()
        try: proc.wait(5)
        except Exception: proc.kill()

asyncio.run(main())
