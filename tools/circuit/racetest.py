"""Part 4 gate: the race follows the standings. Real Chrome over CDP.
Checks: cars match standings.json, only active repos lap, idle cars park in
the pit boxes, the true leader crosses the line first, lapping cars never
touch, the tower reads the real numbers, and rows animate only when the
standings changed since the browser last saw them.
Usage: /usr/local/bin/python3 tools/circuit/racetest.py URL OUTDIR"""
import asyncio, base64, json, subprocess, sys, time, urllib.request, os, tempfile
import websockets

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9241
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

async def main():
    url, out = sys.argv[1], sys.argv[2]
    standings = json.load(open(os.path.join(ROOT, "circuit", "standings.json")))
    profile = os.path.join(tempfile.gettempdir(), "wada-ring-race-profile")
    proc = subprocess.Popen([CHROME, "--headless=new", f"--remote-debugging-port={PORT}", "--window-size=1600,900",
                             "--no-first-run", "--user-data-dir=" + profile, "--disable-background-timer-throttling", "about:blank"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    r = {}
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
                res = await cdp(ws, n(), "Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
                if "exceptionDetails" in res: raise RuntimeError(json.dumps(res["exceptionDetails"])[:300])
                return res["result"].get("value")
            async def load(extra=""):
                await cdp(ws, n(), "Page.navigate", {"url": url + extra})
                await wait_event(ws, "Page.loadEventFired"); await asyncio.sleep(4)
            await cdp(ws, n(), "Page.enable"); await cdp(ws, n(), "Runtime.enable")
            await cdp(ws, n(), "Network.enable"); await cdp(ws, n(), "Network.setCacheDisabled", {"cacheDisabled": True})
            await cdp(ws, n(), "Emulation.setDeviceMetricsOverride", {"width": 1600, "height": 900, "deviceScaleFactor": 1, "mobile": False})
            await load()
            await ev("localStorage.removeItem('wada-ring-standings')")
            state = json.loads(await ev("JSON.stringify(window.__circuit.raceState())"))
            r["cars_built"] = len(state)
            r["cars_match_standings"] = sorted(s["id"] for s in state) == sorted(c["id"] for c in standings["cars"])
            active = {c["id"] for c in standings["cars"] if c["commits"] > 0}
            r["lapping_equals_active"] = {s["id"] for s in state if s["lapping"]} == active
            r["idle_parked_in_pit_lane"] = all(150 <= s["at"][1] <= 170 and 40 <= s["at"][0] <= 160 for s in state if not s["lapping"])
            # order at the line and closest approach over a lap, from the race maths itself
            probe = """(() => { const c = window.__circuit, fr = c.frames, lap = fr.length_, cars = c.cars.filter(k => k.lapping);
                const startS = fr[fr.findIndex(f => f === fr.reduce((a, b) => Math.hypot(a.p[0]-100, a.p[1]-178) < Math.hypot(b.p[0]-100, b.p[1]-178) ? a : b))].s;
                let minD = Infinity, lineOrderOk = true, overtakes = 0, prevLead = null;
                for (let k = 0; k <= 400; k++) { const rel = k / 400 * lap;
                    const pos = cars.map(car => { const off = -car.gap + car.swap * Math.sin(Math.PI * 2 * rel / lap); const p = c.poseAt(startS + rel + off); return { id: car.id, off, x: p.x + p.tz * car.lane, z: p.z - p.tx * car.lane }; });
                    for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) minD = Math.min(minD, Math.hypot(pos[i].x - pos[j].x, pos[i].z - pos[j].z));
                    const lead = pos.slice().sort((a, b) => b.off - a.off)[0]; if (prevLead && lead.id !== prevLead) overtakes++; prevLead = lead.id;
                    if ((k === 0 || k === 400) && pos.length && lead.id !== cars[0].id) lineOrderOk = false; }
                return JSON.stringify({ lapping: cars.length, minDistance: +minD.toFixed(2), leaderFirstAtLine: lineOrderOk, leadChangesPerLap: overtakes }); })()"""
            r["race"] = json.loads(await ev(probe))
            r["tower_rows"] = await ev("[...document.querySelectorAll('.ring-tower-row')].map(r => r.textContent.trim().replace(/\\s+/g, ' '))")
            r["tower_no_slugs"] = await ev("!/abbawada\\//.test(document.getElementById('ringTower').textContent)")
            r["tower_head"] = await ev("(document.querySelector('.ring-tower-head') || {}).textContent || null")
            # second load with the same standings: no animation
            await load("&again=1"); await asyncio.sleep(0.2)
            r["no_animation_when_unchanged"] = await ev("[...document.querySelectorAll('.ring-tower-row')].every(r => !r.style.transform && !r.style.transition)")
            # pretend the browser last saw a different order and generation: rows should animate into place
            fake = {"generated": "1999-01-01T00:00:00Z", "order": list(reversed(standings["order"]))}
            await ev("localStorage.setItem('wada-ring-standings', " + json.dumps(json.dumps(fake)) + ")")
            await cdp(ws, n(), "Page.navigate", {"url": url + "&changed=1"}); await wait_event(ws, "Page.loadEventFired")
            moved = False
            for _ in range(60):
                await asyncio.sleep(0.05)
                if await ev("[...document.querySelectorAll('.ring-tower-row')].some(r => r.style.transition && r.style.transition.indexOf('transform') === 0)"): moved = True; break
            r["animates_when_changed"] = moved
            await asyncio.sleep(1.0)
            r["final_order_is_standings"] = await ev("[...document.querySelectorAll('.ring-tower-row')].map(r => r.dataset.id)") == standings["order"]
            # a synthetic field with every car active, to exercise the spacing and the scripted overtakes
            fake = {"generated": "2099-01-01T00:00:00Z", "since": "2098-12-02T00:00:00Z", "window_days": 30, "order": ["media", "betta", "exchange"],
                    "cars": [dict(c, commits={"media": 9, "betta": 4, "exchange": 1}[c["id"]]) for c in standings["cars"]]}
            await ev("window.__circuit.setStandings(" + json.dumps(fake) + ")"); await asyncio.sleep(0.6)
            r["synthetic"] = json.loads(await ev(probe))
            r["synthetic"]["clear_of_each_other"] = r["synthetic"]["minDistance"] is not None and r["synthetic"]["minDistance"] > 2.2
            r["synthetic"]["lapping_all_three"] = r["synthetic"]["lapping"] == 3
            await ev("window.__circuit.setStandings(" + json.dumps(standings) + ")"); await asyncio.sleep(0.4)
            r["draw_calls"] = await ev("window.__circuit.stats.calls")
            r["fps"] = await ev("+window.__circuit.meanFps().toFixed(1)")
            shot = await cdp(ws, n(), "Page.captureScreenshot", {"format": "png"})
            open(os.path.join(out, "part-4-tower.png"), "wb").write(base64.b64decode(shot["data"]))
    finally:
        proc.terminate()
        try: proc.wait(5)
        except Exception: proc.kill()
    open(os.path.join(out, "part-4-report.json"), "w").write(json.dumps(r, indent=1))
    print(json.dumps(r, indent=1))

asyncio.run(main())
