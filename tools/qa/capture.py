import asyncio, base64, json, subprocess, time, urllib.request, signal, os

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SCRATCH = os.path.dirname(os.path.abspath(__file__))
BASE = "http://localhost:8646/"
PAGES = ["index.html", "betta.html", "projects.html", "writing.html"]
import websockets

async def cdp(ws, id_, method, params=None):
    await ws.send(json.dumps({"id": id_, "method": method, "params": params or {}}))
    while True:
        msg = json.loads(await ws.recv())
        if msg.get("id") == id_:
            return msg.get("result", {})

async def wait_event(ws, name, timeout=15):
    try:
        while True:
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout))
            if msg.get("method") == name:
                return
    except asyncio.TimeoutError:
        pass

async def capture(ws, page, out, mobile, reduced=False):
    i = [0]
    def n():
        i[0] += 1
        return i[0]
    await cdp(ws, n(), "Page.enable")
    if mobile:
        await cdp(ws, n(), "Emulation.setDeviceMetricsOverride",
                  {"width": 390, "height": 844, "deviceScaleFactor": 1, "mobile": True})
    else:
        await cdp(ws, n(), "Emulation.setDeviceMetricsOverride",
                  {"width": 1280, "height": 900, "deviceScaleFactor": 1, "mobile": False})
    if reduced:
        await cdp(ws, n(), "Emulation.setEmulatedMedia",
                  {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
    await cdp(ws, n(), "Page.navigate", {"url": BASE + page})
    await wait_event(ws, "Page.loadEventFired")
    await asyncio.sleep(2)
    height = (await cdp(ws, n(), "Runtime.evaluate",
                        {"expression": "document.body.scrollHeight", "returnByValue": True}))["result"]["value"]
    step = 600 if mobile else 800
    y = 0
    while y < height:
        await cdp(ws, n(), "Runtime.evaluate", {"expression": f"window.scrollTo(0,{y})"})
        await asyncio.sleep(0.3)
        y += step
    await cdp(ws, n(), "Runtime.evaluate", {"expression": "window.scrollTo(0,0)"})
    await asyncio.sleep(1.2)
    shot = await cdp(ws, n(), "Page.captureScreenshot",
                     {"format": "jpeg", "quality": 82, "captureBeyondViewport": True})
    with open(out, "wb") as f:
        f.write(base64.b64decode(shot["data"]))
    print(os.path.basename(out), "bytes:", os.path.getsize(out), "pageheight:", height)

async def main():
    proc = subprocess.Popen([CHROME, "--headless=new", "--remote-debugging-port=9223",
                             "--disable-gpu", "--hide-scrollbars", "--window-size=1280,900",
                             "about:blank"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        ws_url = None
        for _ in range(30):
            try:
                tabs = json.loads(urllib.request.urlopen("http://localhost:9223/json").read())
                pages = [t for t in tabs if t.get("type") == "page"]
                if pages:
                    ws_url = pages[0]["webSocketDebuggerUrl"]
                    break
            except Exception:
                pass
            time.sleep(0.5)
        if not ws_url:
            raise RuntimeError("no CDP page target")
        async with websockets.connect(ws_url, max_size=200_000_000) as ws:
            for page in PAGES:
                stem = page.replace(".html", "")
                await capture(ws, page, f"{SCRATCH}/{stem}_1280.jpg", mobile=False)
                await capture(ws, page, f"{SCRATCH}/{stem}_375.jpg", mobile=True)
            await capture(ws, "index.html", f"{SCRATCH}/index_reduced.jpg", mobile=False, reduced=True)
    finally:
        proc.send_signal(signal.SIGTERM)

asyncio.run(main())
