import asyncio, base64, json, subprocess, time, urllib.request, signal, os
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
S = os.path.dirname(os.path.abspath(__file__))
import websockets

async def cdp(ws, i, m, p=None):
    await ws.send(json.dumps({"id": i, "method": m, "params": p or {}}))
    while True:
        r = json.loads(await ws.recv())
        if r.get("id") == i:
            return r.get("result", {})

async def main():
    proc = subprocess.Popen([CHROME, "--headless=new", "--remote-debugging-port=9225",
                             "--disable-gpu", "--hide-scrollbars", "--window-size=1280,900", "about:blank"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        ws_url = None
        for _ in range(30):
            try:
                tabs = json.loads(urllib.request.urlopen("http://localhost:9225/json").read())
                pg = [t for t in tabs if t.get("type") == "page"]
                if pg:
                    ws_url = pg[0]["webSocketDebuggerUrl"]
                    break
            except Exception:
                pass
            time.sleep(0.5)
        async with websockets.connect(ws_url, max_size=100_000_000) as ws:
            await cdp(ws, 1, "Page.enable")
            await cdp(ws, 2, "Page.navigate", {"url": "http://localhost:8646/projects.html"})
            await asyncio.sleep(3)
            await cdp(ws, 3, "Runtime.evaluate", {"expression": "document.querySelector('.pcase').click()"})
            await asyncio.sleep(1.2)
            shot = await cdp(ws, 4, "Page.captureScreenshot", {"format": "jpeg", "quality": 85})
            open(f"{S}/flip_test.jpg", "wb").write(base64.b64decode(shot["data"]))
            print("flip_test.jpg saved")
    finally:
        proc.send_signal(signal.SIGTERM)

asyncio.run(main())
