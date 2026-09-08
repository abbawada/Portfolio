"""Capture the no-WebGL poster and its clickable regions.
Writes images/wada-ring-poster.jpg (1600x900) and circuit/poster-areas.js
(each stop's hit box projected to the poster, as percent coordinates).
Usage: /usr/local/bin/python3 tools/circuit/poster.py URL"""
import asyncio, base64, json, subprocess, sys, time, urllib.request, os, tempfile
import websockets

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9236
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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

def hull(points):
    p = sorted(set(map(tuple, points)))
    if len(p) < 3: return p
    def cross(o, a, b): return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    lo, up = [], []
    for q in p:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], q) <= 0: lo.pop()
        lo.append(q)
    for q in reversed(p):
        while len(up) >= 2 and cross(up[-2], up[-1], q) <= 0: up.pop()
        up.append(q)
    return lo[:-1] + up[:-1]

async def main():
    url = sys.argv[1]
    W, H = 1600, 900
    profile = os.path.join(tempfile.gettempdir(), "wada-ring-poster-profile")
    proc = subprocess.Popen([CHROME, "--headless=new", f"--remote-debugging-port={PORT}", f"--window-size={W},{H}",
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
            await cdp(ws, n(), "Page.enable")
            await cdp(ws, n(), "Network.enable")
            await cdp(ws, n(), "Network.setCacheDisabled", {"cacheDisabled": True})
            await cdp(ws, n(), "Emulation.setDeviceMetricsOverride", {"width": W, "height": H, "deviceScaleFactor": 1, "mobile": False})
            await cdp(ws, n(), "Page.navigate", {"url": url})
            await wait_event(ws, "Page.loadEventFired")
            await asyncio.sleep(4)
            # park the ambient elements at rest so the poster is calm: stop the loop after one settled frame
            await cdp(ws, n(), "Runtime.evaluate", {"expression": "window.__circuit.stop(); window.__circuit.render(); true"})
            await asyncio.sleep(0.3)
            r = await cdp(ws, n(), "Page.captureScreenshot", {"format": "jpeg", "quality": 82})
            out_img = os.path.join(ROOT, "images", "wada-ring-poster.jpg")
            open(out_img, "wb").write(base64.b64decode(r["data"]))
            expr = """(() => { const c = window.__circuit, L = window.CircuitLayout, out = [];
                for (const loc of L.LOCATIONS) { const g = c.groups[loc.id]; const hit = g.children[1];
                    hit.updateWorldMatrix(true, false); const geo = hit.geometry; geo.computeBoundingBox(); const b = geo.boundingBox;
                    const pts = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
                        const v = hit.localToWorld(new c.scene.constructor.prototype.constructor.THREEVector3 ? null : Object.assign({}, {}) );
                    }
                    out.push({ id: loc.id }); }
                return JSON.stringify(out); })()"""
            # simpler and dependable: use the projected corners via the world's own helpers
            expr = """(() => { const c = window.__circuit, L = window.CircuitLayout, out = [];
                for (const loc of L.LOCATIONS) {
                    if (loc.sky) continue;   // the blimp has no fixed place on the poster
                    const g = c.groups[loc.id], hit = g.children.find(o => o.layers && o.layers.mask === 2);   // the hit box lives on layer 1
                    const p = hit.geometry.parameters, cx = hit.position.x, cy = hit.position.y, cz = hit.position.z;
                    const pts = [];
                    for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) {
                        const s = c.project(cx + dx * p.width / 2, cy + dy * p.height / 2, cz + dz * p.depth / 2);
                        pts.push([s[0] / innerWidth * 100, s[1] / innerHeight * 100]);
                    }
                    const lab = c.project(loc.anchor[0], loc.labelZ, loc.anchor[1]);
                    out.push({ id: loc.id, pts, label: [lab[0] / innerWidth * 100, lab[1] / innerHeight * 100] });
                }
                return JSON.stringify(out); })()"""
            r = await cdp(ws, n(), "Runtime.evaluate", {"expression": expr, "returnByValue": True})
            data = json.loads(r["result"]["value"])
            areas = [{"id": d["id"], "points": [[round(x, 2), round(y, 2)] for x, y in hull(d["pts"])],
                      "label": [round(d["label"][0], 2), round(d["label"][1], 2)]} for d in data]
            js = ("/* Generated by tools/circuit/poster.py: the seven stops as percent\n"
                  "   polygons over images/wada-ring-poster.jpg, for the no-WebGL page. */\n"
                  "window.CircuitPoster = " + json.dumps({"image": "images/wada-ring-poster.jpg", "width": W, "height": H, "areas": areas}, indent=1) + ";\n")
            open(os.path.join(ROOT, "circuit", "poster-areas.js"), "w").write(js)
            print("poster", os.path.getsize(out_img), "bytes;", len(areas), "areas")
    finally:
        proc.terminate()
        try: proc.wait(5)
        except Exception: proc.kill()

asyncio.run(main())
