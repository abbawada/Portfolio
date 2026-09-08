"""Parity check: projects-old.html (inline script) against projects.html
(cases.js). Compares the rendered shelf, the filters, the open spread and
the keyboard step, and saves both spreads as screenshots.
Usage: /usr/local/bin/python3 tools/circuit/paritytest.py OUTDIR"""
import asyncio, base64, json, subprocess, sys, time, urllib.request, os, tempfile, re, difflib
import websockets

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9234
BASE = "http://localhost:8646/"

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
            if m.get("method") == name: return
    except asyncio.TimeoutError:
        pass

def norm(html):
    html = re.sub(r'<div class="back-live"[^>]*>.*?</div>', '<div class="back-live"></div>', html, flags=re.S)
    return html

async def capture(ws, n, page, out):
    await cdp(ws, n(), "Page.enable")
    await cdp(ws, n(), "Network.enable")
    await cdp(ws, n(), "Network.setCacheDisabled", {"cacheDisabled": True})
    await cdp(ws, n(), "Emulation.setDeviceMetricsOverride", {"width": 1280, "height": 900, "deviceScaleFactor": 1, "mobile": False})
    await cdp(ws, n(), "Page.navigate", {"url": BASE + page + "?p=" + str(time.time())})
    await wait_event(ws, "Page.loadEventFired")
    await asyncio.sleep(3)
    async def ev(expr):
        r = await cdp(ws, n(), "Runtime.evaluate", {"expression": expr, "returnByValue": True})
        return r["result"].get("value")
    d = {}
    d["shelf"] = await ev("document.getElementById('shelf').innerHTML")
    d["filters"] = await ev("document.getElementById('filters').innerHTML")
    d["cases"] = await ev("document.querySelectorAll('.pcase').length")
    d["plain_hidden"] = await ev("document.getElementById('plainProjects').hidden")
    d["nav_hidden"] = await ev("[document.getElementById('shelfPrev').hidden, document.getElementById('shelfNext').hidden]")
    await ev("document.querySelector('.pcase').click()")
    await asyncio.sleep(1.6)
    d["stage"] = norm(await ev("document.getElementById('stage').innerHTML"))
    d["stage_classes"] = await ev("document.getElementById('stage').className")
    d["body_class"] = await ev("document.body.className")
    d["focus"] = await ev("document.activeElement.className")
    shot = await cdp(ws, n(), "Page.captureScreenshot", {"format": "png"})
    open(out, "wb").write(base64.b64decode(shot["data"]))
    await cdp(ws, n(), "Input.dispatchKeyEvent", {"type": "keyDown", "key": "ArrowRight", "code": "ArrowRight", "windowsVirtualKeyCode": 39})
    await cdp(ws, n(), "Input.dispatchKeyEvent", {"type": "keyUp", "key": "ArrowRight", "code": "ArrowRight", "windowsVirtualKeyCode": 39})
    await asyncio.sleep(0.6)
    d["stepped_title"] = await ev("document.querySelector('.back-title') && document.querySelector('.back-title').textContent")
    await cdp(ws, n(), "Input.dispatchKeyEvent", {"type": "keyDown", "key": "Escape", "code": "Escape", "windowsVirtualKeyCode": 27})
    await cdp(ws, n(), "Input.dispatchKeyEvent", {"type": "keyUp", "key": "Escape", "code": "Escape", "windowsVirtualKeyCode": 27})
    await asyncio.sleep(1.2)
    d["closed"] = await ev("document.getElementById('stage').hidden")
    d["focus_after"] = await ev("document.activeElement.className")
    await ev("document.querySelectorAll('.chip')[1].click()")
    await asyncio.sleep(0.3)
    d["filtered"] = await ev("document.querySelectorAll('.pcase').length")
    return d

async def main():
    out = sys.argv[1]
    profile = os.path.join(tempfile.gettempdir(), "wada-ring-parity-profile")
    proc = subprocess.Popen([CHROME, "--headless=new", f"--remote-debugging-port={PORT}", "--window-size=1280,900",
                             "--no-first-run", "--user-data-dir=" + profile, "about:blank"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
            old = await capture(ws, n, "projects-old.html", os.path.join(out, "parity-old.png"))
            new = await capture(ws, n, "projects.html", os.path.join(out, "parity-new.png"))
    finally:
        proc.terminate()
        try: proc.wait(5)
        except Exception: proc.kill()
    report = {}
    for k in old:
        same = old[k] == new[k]
        report[k] = "same" if same else "DIFFERENT"
        if not same and isinstance(old[k], str):
            diff = list(difflib.unified_diff(old[k].split("><"), new[k].split("><"), lineterm="", n=1))
            report[k + "_diff"] = diff[:40]
        elif not same:
            report[k + "_values"] = [old[k], new[k]]
    print(json.dumps(report, indent=1))

asyncio.run(main())
