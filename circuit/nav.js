/* Wada Ring, navigation. Phase 3, V1.2 label pass.
   Explore (drag pans, wheel and pinch zoom), persistent labels, fly-to,
   the mini-map, the lap guide, the drive (V1.5) and the keyboard. Nothing
   here moves the camera on its own: every camera move answers the visitor. */
export function attach(world, L, dom) {
    'use strict';
    const { camera, canvas, view, fit, render, groups, hooks, project, groundAt, pick, frames: fr, poseAt, reduced } = world;
    const ZOOM_MIN = 0.85, ZOOM_MAX = 7;   // close enough to read a toy on the pit wall
    /* a phone held upright sees a wide flat diamond; it gets a closer default
       and the world sits lower, under the timing block */
    const portrait = () => canvas.clientWidth / canvas.clientHeight < 0.8;
    /* the default framing leans toward the court (V1.2, section 4): the
       plate still fits, Betta sits just above the centre of the screen */
    const homeView = () => ({ x: 108, z: 102, zoom: portrait() ? 1.45 : 1.1 });
    const layoutShift = () => { view.shiftPx = portrait() ? Math.round(canvas.clientHeight * 0.12) : 0; };
    const FLY_MS = 750, LIFT = 1.2, STOP_ZOOM = 2.6, LAP_ZOOM = 2.1, LAP_PAUSE = 1700;
    const RIGHT = [Math.SQRT1_2, -Math.SQRT1_2], UP = [-Math.SQRT1_2, -Math.SQRT1_2], SIN30 = 0.5;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const lapLen = fr.length_;
    const byId = {}; L.LOCATIONS.forEach(l => { byId[l.id] = l; });
    /* storage is a convenience only: a private window or blocked storage degrades to a page with no memory */
    const store = { get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* nothing to do */ } } };

    /* ------------------------------------------------ the view */
    let hover = null, focus = null, open = null, lapMark = null, returnTo = null, prevView = null, fly = null;
    function settle() {
        view.zoom = clamp(view.zoom, ZOOM_MIN, ZOOM_MAX);
        const lo = open ? -40 : 12, hi = open ? 250 : 198;   // framing an open stop may look past the plate edge
        view.target.x = clamp(view.target.x, lo, hi);
        view.target.z = clamp(view.target.z, lo, hi);
        fit();
        if (!world.isRunning()) { updatePins(1); updateMap(); render(); }
    }
    const wpp = () => (camera.right - camera.left) / canvas.clientWidth;
    function panBy(dx, dy) {
        const k = wpp();
        view.target.x += (-RIGHT[0] * dx + UP[0] * dy / SIN30) * k;
        view.target.z += (-RIGHT[1] * dx + UP[1] * dy / SIN30) * k;
        settle();
    }
    function zoomAt(px, py, factor) {
        const before = groundAt(px, py);
        view.zoom = clamp(view.zoom * factor, ZOOM_MIN, ZOOM_MAX); fit();
        const after = groundAt(px, py);
        view.target.x += before[0] - after[0]; view.target.z += before[1] - after[1];
        settle();
    }
    function flyTo(x, z, zoom, done) {
        if (reduced.matches) { view.target.x = x; view.target.z = z; view.zoom = zoom; settle(); if (done) done(); return; }
        fly = { x0: view.target.x, z0: view.target.z, k0: view.zoom, x1: x, z1: z, k1: zoom, t0: performance.now(), done };
    }
    function stepFly(now) {
        if (!fly) return;
        const t = clamp((now - fly.t0) / FLY_MS, 0, 1), e = ease(t);
        view.target.x = fly.x0 + (fly.x1 - fly.x0) * e;
        view.target.z = fly.z0 + (fly.z1 - fly.z0) * e;
        view.zoom = fly.k0 * Math.pow(fly.k1 / fly.k0, e);
        settle();
        if (t >= 1) { const d = fly.done; fly = null; if (d) d(); }
    }
    const refreshStill = () => { if (!world.isRunning()) { updatePins(1); render(); } };

    /* ------------------------------------------------ pins: persistent labels (V1.2, sections 2 and 3) */
    /* Every stop carries its title at rest, in screen space at a fixed pixel
       size, on a paper chip that reads against grass and road. Hover and
       focus add feedback only: the stop lifts, the chip glows. The idle
       beacon on the dot is the one motion, staggered per stop, in CSS. */
    const pins = {};
    L.LOCATIONS.forEach((loc, i) => {
        const el = document.createElement('button');
        el.type = 'button'; el.className = 'ring-pin is-live' + (loc.labelSide ? ' is-' + loc.labelSide : ''); el.dataset.id = loc.id;
        el.style.setProperty('--beacon-delay', (i * 0.4).toFixed(1) + 's');
        el.setAttribute('aria-label', 'Stop ' + loc.num + ', ' + loc.name + ', ' + loc.section);
        el.innerHTML = '<span class="ring-pin-dot" aria-hidden="true"></span><span class="ring-pin-text" aria-hidden="true">' +
            '<span class="ring-pin-name"><span class="ring-pin-num">' + loc.num + '</span>' + loc.name + '</span></span>';   // V1.3: the mark on the building is the title; this tag is wayfinding
        el.addEventListener('click', e => { if (e.detail === 0) go(loc.id); });   // keyboard; pointer clicks arrive below
        el.addEventListener('focus', () => { focus = loc.id; refreshStill(); });
        el.addEventListener('blur', () => { if (focus === loc.id) focus = null; refreshStill(); });
        el.addEventListener('pointerenter', () => { hover = loc.id; refreshStill(); });
        el.addEventListener('pointerleave', () => { if (hover === loc.id) hover = null; refreshStill(); });
        dom.pins.appendChild(el);
        pins[loc.id] = { el, cur: 0, loc };
    });
    /* a chip that would sit under the page chrome (the name block, the car's
       HUD, the Grid block) fades out rather than bleeding through it. The
       chrome boxes and the chip sizes are read four times a second, the
       test itself is arithmetic on the projected point, so the frame never
       forces a layout. A hot or open chip is left alone. */
    const under = { at: 0, boxes: [] };
    function chromeBoxes() {
        const out = [];
        const push = r => { if (r && r.width > 0 && r.height > 0) out.push({ x: r.left, y: r.top, w: r.width, h: r.height }); };
        /* the name block is words on paper with a blank right side, so a chip
           is tested against the words themselves and the pills, never the
           block's box: at 1024 by 640 the About chip sits beside the name, not
           under it (round 6 verify) */
        const hud = document.querySelector('.ring-hud');
        if (hud && !hud.hidden) {
            for (const el of hud.children) {
                if (el.hidden || el.classList.contains('ring-visually-hidden')) continue;
                const buttons = el.querySelectorAll('button');
                if (buttons.length) { for (const b of buttons) if (!b.hidden) push(b.getBoundingClientRect()); }
                else { const range = document.createRange(); range.selectNodeContents(el); push(range.getBoundingClientRect()); }
            }
        }
        for (const el of [dom.driveHud, document.querySelector('.ring-broadcast')]) {
            if (!el || el.hidden) continue;
            push(el.getBoundingClientRect());
        }
        return out;
    }
    const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    function updatePins(dt) {
        const now = performance.now(), measure = now - under.at > 250;
        if (measure) { under.at = now; under.boxes = chromeBoxes(); }
        for (const id in pins) {
            const p = pins[id], loc = p.loc;
            const f = (hover === id || focus === id || open === id || lapMark === id || document.activeElement === p.el) ? 1 : 0;
            p.cur += (f - p.cur) * Math.min(1, dt * 9);
            if (Math.abs(f - p.cur) < 0.01) p.cur = f;
            const lift = p.cur * LIFT;
            groups[id].position.y = lift;
            const s = project(loc.anchor[0], loc.labelZ + lift, loc.anchor[1]);
            const side = loc.labelSide === 'left' ? 'translate(calc(-100% + 6px), -50%)' : loc.labelSide === 'below' ? 'translate(-50%, -6px)' : 'translate(-6px, -50%)';
            p.el.style.transform = 'translate(' + s[0].toFixed(1) + 'px,' + s[1].toFixed(1) + 'px) ' + side;
            p.el.classList.toggle('is-hot', p.cur > 0.5);
            p.el.classList.toggle('is-open', open === id);
            if (measure) { p.w = p.el.offsetWidth; p.h = p.el.offsetHeight; }
            const box = loc.labelSide === 'left' ? { x: s[0] - p.w + 6, y: s[1] - p.h / 2, w: p.w, h: p.h }
                : loc.labelSide === 'below' ? { x: s[0] - p.w / 2, y: s[1] - 6, w: p.w, h: p.h }
                : { x: s[0] - 6, y: s[1] - p.h / 2, w: p.w, h: p.h };
            p.el.classList.toggle('is-under', !f && p.w > 0 && under.boxes.some(b => overlaps(box, b)));
        }
    }

    /* ------------------------------------------------ mini-map */
    const M = { w: 190, h: 120, s: 0, ox: 0, oy: 0 };
    let camDot = null;
    const mapXY = (u, v) => [M.ox + (u - v) * M.s, M.oy + (u + v) * M.s * 0.5];
    function buildMap() {
        M.s = (M.w - 16) / 420; M.ox = M.w / 2; M.oy = (M.h - 210 * M.s * 0.5) / 2;
        const f1 = n => n.toFixed(1);
        const path = 'M' + fr.map(f => mapXY(f.p[0], f.p[1]).map(f1).join(',')).join('L') + 'Z';
        const pit = 'M' + L.sample(L.PIT, 8, false).map(p => mapXY(p[0], p[1]).map(f1).join(',')).join('L');
        let html = '<path d="' + path + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
                   '<path d="' + pit + '" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>';
        const MAP_OFF = { about: [4, -4], betta: [5.5, 2.6], education: [-5.5, 2.6, 'end'], economics: [5.5, 2.6], writing: [-5.5, 2.6, 'end'], projects: [-5.5, 8, 'end'], contact: [5.5, 8] };
        for (const loc of L.LOCATIONS) {   // the number sits beside each dot at rest; nothing waits for a hover
            const [x, y] = mapXY(loc.anchor[0], loc.anchor[1]), o = MAP_OFF[loc.id] || [5.5, 2.6];
            html += '<circle class="ring-map-stop" data-id="' + loc.id + '" cx="' + f1(x) + '" cy="' + f1(y) + '" r="3" role="button" aria-label="Stop ' + loc.num + ', ' + loc.name + '"/>' +
                    '<text class="ring-map-num" x="' + f1(x + o[0]) + '" y="' + f1(y + o[1]) + '" text-anchor="' + (o[2] || 'start') + '">' + loc.num + '</text>';
        }
        html += '<circle class="ring-map-cam" cx="0" cy="0" r="3.6"/>';
        dom.map.setAttribute('viewBox', '0 0 ' + M.w + ' ' + M.h);
        dom.map.innerHTML = html;
        camDot = dom.map.querySelector('.ring-map-cam');
        dom.map.addEventListener('click', e => { const t = e.target.closest('.ring-map-stop'); if (t) go(t.dataset.id); });
    }
    function updateMap() {
        if (!camDot) return;
        const [x, y] = mapXY(view.target.x, view.target.z);
        camDot.setAttribute('cx', x.toFixed(1)); camDot.setAttribute('cy', y.toFixed(1));
    }

    /* ------------------------------------------------ the panel */
    const HOP = L.LAP.slice();   // the seven, round the lap
    function hopTargets(id) { const i = HOP.indexOf(id), n = HOP.length; return { prev: byId[HOP[(i - 1 + n) % n]], next: byId[HOP[(i + 1) % n]] }; }
    function openPanel(loc) {
        dom.panelKicker.textContent = loc.num + ' ' + loc.section;
        dom.panelTitle.textContent = loc.name;
        dom.panel.dataset.id = loc.id;
        if (dom.hopPrev && dom.hopNext) {   // the neighbours on the lap, so a visitor never has to leave to move on
            const h = hopTargets(loc.id);
            dom.hopPrev.innerHTML = '<span class="ring-hop-arrow" aria-hidden="true">&larr;</span> ' + h.prev.num + '&nbsp;&nbsp;' + h.prev.name; dom.hopPrev.dataset.id = h.prev.id;
            dom.hopNext.innerHTML = h.next.num + '&nbsp;&nbsp;' + h.next.name + ' <span class="ring-hop-arrow" aria-hidden="true">&rarr;</span>'; dom.hopNext.dataset.id = h.next.id;
        }
        dom.panel.scrollTop = 0;
        dom.panel.hidden = false;
        if (reduced.matches) dom.panel.classList.add('is-open');
        else setTimeout(() => dom.panel.classList.add('is-open'), 20);   // a timer, not a frame: throttled tabs still get the fade
        document.body.classList.add('ring-open');
        dom.panelClose.focus({ preventScroll: true });
        if (world.attendStop) world.attendStop(loc.id, 'open');   // the visitor's tour is the race's one live input
        if (dom.onOpen) dom.onOpen(loc);
    }
    function closePanel() {
        dom.panel.classList.remove('is-open');
        document.body.classList.remove('ring-open');
        const hide = () => { dom.panel.hidden = true; if (dom.onClose) dom.onClose(); };
        if (reduced.matches) hide(); else setTimeout(hide, 260);
    }
    function go(id) {
        const loc = byId[id]; if (!loc) return;
        if (open === id && !lap.running && !drive.on) return;   // already here: no second deposit, no second fly
        if (lap.running) endLap(false);
        if (drive.on) endDrive(false);   // a stop opened from the car ends the drive; the fly below goes to the stop
        open = id; returnTo = pins[id].el;
        const aspect = canvas.clientWidth / canvas.clientHeight, sheet = window.innerWidth <= 760;
        const zoom = sheet ? 3.2 : STOP_ZOOM;
        const vw = Math.max(view.width, 200 * aspect) / zoom, k = vw / canvas.clientWidth;
        const panelPx = sheet ? 0 : Math.min(600, window.innerWidth * 0.92);
        const shift = panelPx / 2 * k;
        /* a sheet rises from below: aim the stop at about 30% down the screen, above it */
        const shiftY = sheet ? (window.innerHeight * 0.2 + (view.shiftPx || 0)) * k / SIN30 : 0;
        const lift = loc.labelZ * 0.45 * 1.73;   // tall stops: centre halfway up, so the label stays in view
        const x = loc.anchor[0] + RIGHT[0] * shift + UP[0] * (lift - shiftY), z = loc.anchor[1] + RIGHT[1] * shift + UP[1] * (lift - shiftY);
        flyTo(x, z, zoom, () => openPanel(loc));
        refreshStill();
    }
    /* closing never moves the camera (V1.2): the visitor stays where they
       are, the labels are all around, the next stop is one click away */
    function close() {
        if (!open) return;
        open = null; closePanel();
        if (returnTo) { returnTo.focus({ preventScroll: true }); returnTo = null; }
        refreshStill();
    }

    /* ------------------------------------------------ the lap guide */
    const startS = fr[L.nearest(fr, [L.START.u, L.START.v])].s;
    /* V1.3 Session 3: Watch the race is a chase camera on the live race. It
       picks up the leader wherever the leader is and rides a little ahead
       of its nose with smooth easing; when two cars close to within
       striking distance it moves to that battle and holds it until they
       separate or a subject has had its few seconds; it never loses its
       subject. The lap ends when the leader has covered one lap, or the
       moment the visitor leaves: the exit pill, Escape, the lap button, a
       label, the map, a drag. Each stop's label lights as the subject
       passes it. Under reduced motion it cuts between the stops. */
    const lap = { running: false, flying: false, rel: 0, next: 0, pauseUntil: 0, timer: 0, s0: 0,
        stops: L.LAP.map(id => { const at = byId[id].lapAt || byId[id].anchor; const s = fr[L.nearest(fr, at)].s; return { id, rel: ((s - startS) % lapLen + lapLen) % lapLen }; }).sort((a, b) => a.rel - b.rel) };
    const CHASE_AHEAD = 7, BATTLE_GAP = 8, BATTLE_DROP = 12, HOLD_S = 3.5, BATTLE_ZOOM = 1.22;
    const chase = { subject: null, since: 0, cut: 0 };
    const sameSubject = (a, b) => !!a && !!b && a.kind === b.kind && ((a.a === b.a && a.b === b.b) || (a.a === b.b && a.b === b.a));
    function pickSubject(now) {
        const g = world.gridState(); if (!g.length) return null;
        let battle = null;
        for (let k = 1; k < g.length; k++) { const d = g[k - 1].s - g[k].s; if (d < BATTLE_GAP && (!battle || d < battle.d)) battle = { kind: 'battle', a: g[k - 1].id, b: g[k].id, d }; }
        const cur = chase.subject;
        if (cur && now - chase.since < HOLD_S * 1000) return cur;
        if (battle) return sameSubject(cur, battle) ? cur : battle;
        if (cur && cur.kind === 'battle') { const a = g.find(x => x.id === cur.a), b = g.find(x => x.id === cur.b); if (a && b && Math.abs(a.s - b.s) < BATTLE_DROP) return cur; }
        const leader = { kind: 'leader', a: g[0].id };
        return sameSubject(cur, leader) ? cur : leader;
    }
    function aimOf(sub) {
        if (!sub) return null;
        if (sub.kind === 'battle') {
            const a = world.carAt(sub.a), b = world.carAt(sub.b); if (!a || !b) return null;
            return { x: (a.x + b.x) / 2 + (a.tx + b.tx) / 2 * 4, z: (a.z + b.z) / 2 + (a.tz + b.tz) / 2 * 4, zoom: LAP_ZOOM * BATTLE_ZOOM, s: Math.max(a.s, b.s) };
        }
        const car = world.carAt(sub.a); if (!car) return null;
        return { x: car.x + car.tx * CHASE_AHEAD, z: car.z + car.tz * CHASE_AHEAD, zoom: LAP_ZOOM, s: car.s };
    }
    /* the one exit pill serves the lap and the drive; whichever is on names it */
    function setExit(text) {
        if (!dom.lapExit) return;
        if (text) { dom.lapExit.innerHTML = text + ' <kbd>Esc</kbd>'; dom.lapExit.hidden = false; }
        else dom.lapExit.hidden = true;
    }
    function setLapButton(on) {
        dom.lapBtn.textContent = on ? 'Leave the lap' : 'Watch the race'; dom.lapBtn.setAttribute('aria-pressed', String(on));
        setExit(on ? 'Back to the map' : null);
        document.body.classList.toggle('ring-lapping', on);
    }
    function startLap() {
        if (lap.running) return endLap(true);
        if (drive.on) endDrive(false);
        if (open) { open = null; closePanel(); prevView = null; }
        lap.running = true; lap.rel = -12; lap.next = 0; lap.pauseUntil = 0; lapMark = null;
        setLapButton(true);
        if (reduced.matches) { lapCut(); return; }
        const now = performance.now();
        chase.subject = pickSubject(now); chase.since = now; chase.cut = 0;
        const aim = aimOf(chase.subject);
        if (!aim) return endLap(true);
        lap.s0 = world.gridState()[0].s; lap.flying = true;
        flyTo(aim.x, aim.z, aim.zoom, () => { lap.flying = false; });
    }
    function lapCut() {   // reduced motion: cuts between the stops, no travelling
        if (!lap.running) return;
        if (lap.next >= lap.stops.length) return endLap(true);
        const stop = lap.stops[lap.next++], p = poseAt(startS + stop.rel);
        lapMark = stop.id; view.target.x = p.x; view.target.z = p.z; view.zoom = LAP_ZOOM; settle();
        lap.timer = setTimeout(lapCut, LAP_PAUSE + 600);
    }
    function stepLap(dt, now) {
        if (!lap.running || lap.flying || fly || reduced.matches) return;
        const next = pickSubject(now);
        if (!sameSubject(next, chase.subject)) { chase.subject = next; chase.since = now; chase.cut = now; }
        const aim = aimOf(chase.subject);
        if (!aim) return endLap(true);
        const rate = now - chase.cut < 900 ? 9 : 5.5, k = Math.min(1, dt * rate);   // a quick move on a cut, a glide otherwise
        view.target.x += (aim.x - view.target.x) * k; view.target.z += (aim.z - view.target.z) * k;
        view.zoom += (aim.zoom - view.zoom) * Math.min(1, dt * 2.5);
        settle();
        const rel = ((aim.s - startS) % lapLen + lapLen) % lapLen;
        const near = lap.stops.find(st => { const d = Math.abs(st.rel - rel); return Math.min(d, lapLen - d) < 11; });
        lapMark = near ? near.id : null;
        if (world.gridState()[0].s - lap.s0 >= lapLen + 6) endLap(true);
    }
    function endLap(home) {
        if (!lap.running) return;
        lap.running = false; lap.flying = false; lapMark = null; chase.subject = null; clearTimeout(lap.timer);
        setLapButton(false);
        if (home) { const hv = homeView(); flyTo(hv.x, hv.z, hv.zoom); }
    }

    /* ------------------------------------------------ the drive (V1.5) */
    /* The visitor takes a car. The world owns the car and its maths
       (world.startDrive, setDriveInput, driveState, endDrive); this side
       owns the input, the chase camera, the HUD and the toasts. Keys:
       ArrowUp, W or Space hold the throttle, ArrowDown or S brake,
       ArrowLeft and A, ArrowRight and D steer, with a quarter-second ramp.
       Pointer: press and hold the world for the throttle, slide sideways to
       steer, ninety pixels is full lock; touch is the same. The camera is
       the lap guide's chase with the subject fixed on the car, a little
       further ahead at speed. Every car the visitor passes, and every car
       that goes by, is a toast with Open it, which opens that project's
       stop and ends the drive. The lap ends with a card: the time, the
       best on this device, drive again or back to the map. Escape, the
       exit pill, the Drive button, a label or a Grid row all leave the car.
       Under reduced motion the camera snaps instead of gliding. */
    const DRIVE_AHEAD = 7, DRIVE_AHEAD_SPEED = 4, STEER_RATE = 4, PTR_LOCK = 90, TOAST_MS = 5000, TOAST_MAX = 2, TIP_MS = 4000;
    const BEST_KEY = 'wada-ring-drive-best', HINT_KEY = 'wada-ring-hint-1';
    const drive = { on: false, keys: new Set(), ptr: null, steer: 0, zoomK: 1, passedN: 0, passedByN: 0, done: false, flying: false, tipTimer: 0, startKey: null };
    const DRIVE_KEYS = { ArrowUp: 'up', w: 'up', W: 'up', ' ': 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    const fmt = t => { t = Math.max(0, +t || 0); const m = Math.floor(t / 60), s = Math.floor(t - m * 60), d = Math.floor((t - m * 60 - s) * 10); return m + ':' + String(s).padStart(2, '0') + '.' + d; };
    const fmtS = t => { t = Math.max(0, +t || 0); const m = Math.floor(t / 60), s = Math.floor(t - m * 60); return m + ':' + String(s).padStart(2, '0'); };   // whole seconds while driving; the tenth is for the card
    /* D takes a car only while the map itself has the focus (the page, the
       canvas, the Drive button or the car's own HUD), never from another
       control: a single-letter shortcut must not fire from a focused pin or
       pill (WCAG 2.1.4) */
    const mapFocused = () => { const a = document.activeElement; return !a || a === document.body || a === canvas || a === dom.driveBtn || a === dom.driveHud; };
    const phone = () => window.innerWidth <= 760 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    /* one exit control while the car is held: the bottom pill. The Drive
       button keeps its one word and carries the state in aria-pressed; the
       Watch pill, the line and the place step aside (circuit.css) */
    function setDriveChrome(on) {
        if (dom.driveBtn) dom.driveBtn.setAttribute('aria-pressed', String(on));
        setExit(on ? 'Leave the car' : (lap.running ? 'Back to the map' : null));
        if (dom.driveHud) { dom.driveHud.hidden = !on; dom.driveHud.classList.remove('is-done'); }
        document.body.classList.toggle('ring-driving', on);
        canvas.classList.remove('is-dragging');
        under.at = 0;   // the HUD and the Grid change shape: the chrome boxes re-measure
    }
    function driveAim() {
        const car = world.carAt('you'); if (!car) return null;
        const top = world.speed || 9.2, k = clamp((car.v - top * 0.5) / (top * 0.7), 0, 1);   // further ahead at speed
        const ahead = DRIVE_AHEAD + DRIVE_AHEAD_SPEED * k;
        return { x: car.x + car.tx * ahead, z: car.z + car.tz * ahead, zoom: LAP_ZOOM * (portrait() ? 1.5 : 1) * drive.zoomK };   // a phone held upright rides closer, or the car is fifteen pixels long
    }
    function startDrive() {
        if (drive.on) return endDrive(true);
        if (!world.startDrive) return;
        if (lap.running) endLap(false);
        if (open) { open = null; closePanel(); prevView = null; }
        const car = world.startDrive(); if (!car) return;
        drive.on = true; drive.done = false; drive.keys.clear(); drive.ptr = null; drive.steer = 0; drive.zoomK = 1; drive.passedN = 0; drive.passedByN = 0;
        clearToasts();
        if (dom.driveCard) dom.driveCard.hidden = true;
        setDriveChrome(true); hideHint();
        if (dom.driveTip) {   // on a phone, four seconds of how
            clearTimeout(drive.tipTimer);
            dom.driveTip.hidden = !phone();
            if (phone()) drive.tipTimer = setTimeout(() => { dom.driveTip.hidden = true; }, TIP_MS);
        }
        world.setDriveInput({ throttle: 0, steer: 0, brake: false });
        updateDriveHud(world.driveState());
        updateGrid(true);   // the YOU row joins now, loop or no loop
        if (dom.driveHud) dom.driveHud.focus({ preventScroll: true });   // Space and Enter drive the car, not the button that started it
        const aim = driveAim(); if (!aim) return endDrive(true);
        chase.cut = performance.now();
        if (reduced.matches) { view.target.x = aim.x; view.target.z = aim.z; view.zoom = aim.zoom; settle(); return; }
        drive.flying = true;
        flyTo(aim.x, aim.z, aim.zoom, () => { drive.flying = false; });
    }
    function endDrive(home) {
        if (!drive.on) return;
        drive.on = false; drive.flying = false; drive.keys.clear(); drive.ptr = null; drive.startKey = null; clearTimeout(drive.tipTimer);
        world.endDrive();
        clearToasts();
        if (dom.driveCard) dom.driveCard.hidden = true;
        if (dom.driveTip) dom.driveTip.hidden = true;
        setDriveChrome(false);
        updateGrid(true);   // the YOU row leaves now: under reduced motion the loop has already stopped, so no frame would do it
        /* the focus was in the car (the HUD, a toast, the card) or fell to
           the page when the exit pill hid: it goes back to the Drive button,
           the way a closed panel returns to its pin. A focus elsewhere, the
           Drive button itself or a Grid row, is left where it is. */
        const a = document.activeElement;
        if (dom.driveBtn && (!a || a === document.body || (dom.driveHud && dom.driveHud.contains(a)))) dom.driveBtn.focus({ preventScroll: true });
        if (home) { const hv = homeView(); flyTo(hv.x, hv.z, hv.zoom); }
    }
    function updateDriveHud(ds) {
        if (!dom.drivePos || !dom.driveTime || !ds.on) return;
        const pos = 'P' + ds.rank; if (dom.drivePos.textContent !== pos) dom.drivePos.textContent = pos;
        const t = fmtS(ds.lapDone ? ds.lapTime : ds.t); if (dom.driveTime.textContent !== t) dom.driveTime.textContent = t;
    }
    function rowOf(id) { return world.gridState().find(r => r.id === id) || null; }
    const holdsFocus = el => !!el && el.contains(document.activeElement);
    function toast(id, quiet) {
        const box = dom.driveToasts; if (!box || drive.done) return;   // the card has the top right once the lap is in
        const row = rowOf(id); if (!row || !row.stop) return;
        const el = document.createElement('div');
        el.className = 'ring-drive-toast' + (quiet ? ' is-quiet' : '');
        const text = document.createElement('span'); text.className = 'ring-drive-toast-text';
        text.textContent = quiet ? row.name + ' went by' : 'You passed ' + row.name;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'ring-drive-open'; b.textContent = 'Open it';
        b.setAttribute('aria-label', 'Open ' + row.name); b.dataset.stop = row.stop;
        b.addEventListener('click', () => go(row.stop));
        el.appendChild(text); el.appendChild(b);
        box.appendChild(el); under.at = 0;   // the HUD grew: the chrome boxes re-measure on the next frame
        while (box.children.length > TOAST_MAX) {   // the oldest goes, unless the keyboard is on it
            const old = [...box.children].find(x => x !== el && !holdsFocus(x)) || box.firstChild;
            clearTimeout(old._timer); box.removeChild(old);
        }
        const fade = () => {
            if (holdsFocus(el)) { el._timer = setTimeout(fade, TOAST_MS); return; }   // never removed from under a focused Open it
            el.classList.add('is-out'); setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); under.at = 0; }, reduced.matches ? 0 : 400);
        };
        el._timer = setTimeout(fade, TOAST_MS);
        if (reduced.matches) el.classList.add('is-in'); else requestAnimationFrame(() => el.classList.add('is-in'));
    }
    function clearToasts() {
        const box = dom.driveToasts; if (!box) return;
        for (const el of [...box.children]) clearTimeout(el._timer);
        box.innerHTML = ''; under.at = 0;
    }
    /* the card carries one number: the lap. A first lap on this device
       says nothing more; a faster one says New best; a slower one names the
       best to beat. The toasts clear and the timer hides so nothing moves
       the card or repeats its number. */
    function finishLap(ds) {
        drive.done = true;
        const t = ds.lapTime, prev = parseFloat(store.get(BEST_KEY)), had = Number.isFinite(prev) && prev > 0;
        if (!had || t < prev) store.set(BEST_KEY, String(t));
        clearToasts();
        if (dom.driveHud) dom.driveHud.classList.add('is-done');
        if (dom.driveYour) dom.driveYour.textContent = 'Your lap ' + fmt(t);
        if (dom.driveBest) {
            dom.driveBest.hidden = !had;
            if (had) dom.driveBest.textContent = t < prev ? 'New best' : 'Best on this device ' + fmt(prev);
        }
        if (dom.driveCard) { dom.driveCard.hidden = false; dom.driveCard.focus({ preventScroll: true }); }
        under.at = 0;
    }
    function stepDrive(dt, now) {
        if (!drive.on) return;
        const paused = !!open || document.body.classList.contains('stage-open');   // a panel or the stage: no input, no chase
        const ptr = drive.ptr;
        const aimSteer = paused ? 0 : ptr ? ptr.steer : (drive.keys.has('right') ? 1 : 0) - (drive.keys.has('left') ? 1 : 0);
        const throttle = (!paused && (ptr || drive.keys.has('up'))) ? 1 : 0;
        const brake = !paused && !throttle && drive.keys.has('down');
        drive.steer += clamp(aimSteer - drive.steer, -dt * STEER_RATE, dt * STEER_RATE);
        world.setDriveInput({ throttle, steer: drive.steer, brake });
        const ds = world.driveState(); if (!ds.on) return endDrive(true);
        updateDriveHud(ds);
        if (ds.passed.length > drive.passedN) { for (let i = drive.passedN; i < ds.passed.length; i++) toast(ds.passed[i], false); drive.passedN = ds.passed.length; }
        if (ds.passedBy.length > drive.passedByN) { for (let i = drive.passedByN; i < ds.passedBy.length; i++) toast(ds.passedBy[i], true); drive.passedByN = ds.passedBy.length; }
        if (ds.lapDone && !drive.done) finishLap(ds);
        if (paused || drive.flying || fly) return;
        const aim = driveAim(); if (!aim) return endDrive(true);
        if (reduced.matches) { view.target.x = aim.x; view.target.z = aim.z; view.zoom = aim.zoom; settle(); return; }
        const rate = now - chase.cut < 900 ? 9 : 5.5, k = Math.min(1, dt * rate);
        view.target.x += (aim.x - view.target.x) * k; view.target.z += (aim.z - view.target.z) * k;
        view.zoom += (aim.zoom - view.zoom) * Math.min(1, dt * 2.5);
        settle();
    }

    /* ------------------------------------------------ the first-visit hint */
    /* one line under the HUD on load, gone after the first press or key or
       nine seconds, and not shown again on this device */
    const hint = { shown: false, timer: 0 };
    function showHint() {
        if (!dom.hint) return;
        if (store.get(HINT_KEY)) { dom.hint.hidden = true; return; }
        let coarse = false; try { coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { /* no media queries: the mouse copy stands */ }
        if (coarse) dom.hint.textContent = 'Tap a stop to open it. Drag to look around.';   // a finger taps; the markup carries the mouse copy
        dom.hint.hidden = false; hint.shown = true;
        hint.timer = setTimeout(hideHint, 9000);
    }
    function hideHint() {
        if (!dom.hint || !hint.shown) return;
        hint.shown = false; clearTimeout(hint.timer);
        store.set(HINT_KEY, '1');
        dom.hint.classList.add('is-out');
        setTimeout(() => { dom.hint.hidden = true; }, reduced.matches ? 0 : 320);
    }

    /* ------------------------------------------------ pointer */
    const ptrs = new Map(); let drag = null, pinch = null;
    const pinchState = () => { const [a, b] = [...ptrs.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; };
    const pinOf = t => (t && t.closest) ? t.closest('.ring-pin') : null;
    const worldTarget = t => t === canvas || !!pinOf(t);
    document.addEventListener('pointerdown', hideHint, true);
    document.addEventListener('pointerdown', e => {
        if (!worldTarget(e.target)) return;
        if (drive.on && e.target === canvas && !open) {   // the world is the pedal: press for the throttle, slide to steer
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* a pointer that is already gone */ }
            drive.ptr = { id: e.pointerId, x0: e.clientX, steer: 0 };
            return;
        }
        if (lap.running) endLap(true);
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* a pointer that is already gone */ }
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const pin = pinOf(e.target);
        if (ptrs.size === 1) drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, t0: performance.now(), pin: pin ? pin.dataset.id : null };
        else { drag = null; pinch = pinchState(); }
        canvas.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', e => {
        if (drive.ptr && e.pointerId === drive.ptr.id) { drive.ptr.steer = clamp((e.clientX - drive.ptr.x0) / PTR_LOCK, -1, 1); return; }
        if (ptrs.has(e.pointerId)) {
            ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (ptrs.size >= 2 && pinch) {
                const s = pinchState();
                if (pinch.d > 0) zoomAt(s.mx, s.my, s.d / pinch.d);
                panBy(s.mx - pinch.mx, s.my - pinch.my);
                pinch = s; return;
            }
            if (drag && e.pointerId === drag.id) {
                const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
                if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) drag.moved = true;
                if (drag.moved) panBy(dx, dy);
            }
            return;
        }
        if (e.pointerType === 'mouse' && e.target === canvas && !drive.on) {
            const id = pick(e.clientX, e.clientY);
            if (id !== hover) { hover = id; canvas.classList.toggle('is-over', !!id); refreshStill(); }
        }
    });
    const up = e => {
        if (drive.ptr && e.pointerId === drive.ptr.id) { drive.ptr = null; return; }   // the pedal lifts
        const was = ptrs.has(e.pointerId); ptrs.delete(e.pointerId);
        if (was && drag && e.pointerId === drag.id) {
            if (!drag.moved && performance.now() - drag.t0 < 600) { const id = drag.pin || pick(e.clientX, e.clientY); if (id) go(id); else if (open) close(); }
            drag = null;
        }
        if (ptrs.size < 2) pinch = null;
        if (ptrs.size === 1) { const [pid, p] = [...ptrs][0]; drag = { id: pid, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: true, t0: 0, pin: null }; }
        if (!ptrs.size) canvas.classList.remove('is-dragging');
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    document.addEventListener('wheel', e => {
        if (!worldTarget(e.target)) return;
        e.preventDefault();
        if (drive.on) { drive.zoomK = clamp(drive.zoomK * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0012)), 0.6, 1.5); return; }   // the chase keeps its subject; the wheel sets how close
        if (lap.running) endLap(true);
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0012)));
    }, { passive: false });

    /* ------------------------------------------------ keyboard */
    window.addEventListener('keydown', e => {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
        const tag = (e.target && e.target.tagName) || '';
        if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
        if (document.body.classList.contains('stage-open')) return;   // a case is on stage; its own keys apply
        hideHint();
        if (e.key === 'Escape') { if (drive.on) endDrive(true); else if (lap.running) endLap(true); else if (open) close(); return; }
        if (drive.on && !open) {   // the car has the keys
            const k = DRIVE_KEYS[e.key];
            if (drive.startKey && e.key.toLowerCase() === drive.startKey) { e.preventDefault(); return; }   // the D that took the car is not a steer until it is let go
            if (e.key === ' ' && e.target && e.target.tagName === 'BUTTON') return;   // Space on a focused button is the button's: Open it, Drive again, the pills
            if (k) { drive.keys.add(k); e.preventDefault(); }
            return;
        }
        if (open && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { const h = hopTargets(open); go(e.key === 'ArrowLeft' ? h.prev.id : h.next.id); e.preventDefault(); return; }
        if (!open && (e.key === 'd' || e.key === 'D') && mapFocused()) {   // D takes a car, from the map or from the watch, while the map has the focus
            if (!e.repeat) { startDrive(); if (drive.on) drive.startKey = 'd'; }
            e.preventDefault(); return;
        }
        if (open || lap.running) return;
        const step = 60, cx = canvas.clientWidth / 2, cy = canvas.clientHeight / 2;
        let used = true;
        switch (e.key) {
            case 'ArrowLeft': panBy(step, 0); break;
            case 'ArrowRight': panBy(-step, 0); break;
            case 'ArrowUp': panBy(0, step); break;
            case 'ArrowDown': panBy(0, -step); break;
            case '+': case '=': zoomAt(cx, cy, 1.25); break;
            case '-': case '_': zoomAt(cx, cy, 0.8); break;
            case '0': case 'Home': { const hv = homeView(); flyTo(hv.x, hv.z, hv.zoom); break; }
            default: used = false;
        }
        if (used) e.preventDefault();
    });
    window.addEventListener('keyup', e => {
        const k = DRIVE_KEYS[e.key]; if (k) drive.keys.delete(k);
        if (drive.startKey && e.key.toLowerCase() === drive.startKey) drive.startKey = null;
    });
    window.addEventListener('blur', () => { drive.keys.clear(); drive.ptr = null; drive.startKey = null; });   // no key is held by a window that lost focus

    /* ------------------------------------------------ the grid (V1.2, live in V1.3) */
    /* Rows on the broadcast face above the mini-map: live timing of the
       simulated race. Positions reorder as cars pass on track, the last
       column is the gap to the leader, ticking; the head carries the
       leader's lap and the Los Angeles clock. Order and gaps are the
       world's, read every frame and written at ten a second; nothing on
       the page is fetched. Each row is a button that opens the stop its
       project lives in. The field is dynamic: when the visitor drives,
       their row joins the list and leaves with the car. */
    const grid = { rows: {}, order: '', key: '', lapEl: null, clockEl: null, footEl: null, at: 0, bound: false };
    let clockFmt = null;
    try { clockFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { clockFmt = null; }
    function laTime() {
        try { if (clockFmt) return clockFmt.format(new Date()).replace(/^24/, '00'); } catch (e) { /* fall through to the plain clock */ }
        const d = new Date();
        return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }
    function tickClock() {
        if (!grid.clockEl) return;
        const s = 'Los Angeles ' + laTime();
        if (grid.clockEl.textContent !== s) grid.clockEl.textContent = s;
    }
    setInterval(tickClock, 15000);
    /* the visitor's own row is a plain row, not a button: it opens nothing,
       so it takes no Tab stop, and it reads from its content (P5 YOU +1.20),
       which the live update keeps true; the eight others are buttons */
    const rowHtml = (c, i) => {
        const you = !!c.player, tag = you ? 'div' : 'button';
        return '<' + tag + (you ? '' : ' type="button"') + ' class="ring-tower-row' + (you ? ' is-you' : '') + '" data-id="' + c.id + '"' + (c.stop ? ' data-stop="' + c.stop + '"' : '') +
            ' style="--sig:' + (c.accent || '#c6a15b') + '">' +
            '<span class="ring-tower-pos">P' + (i + 1) + '</span><span class="ring-tower-code">' + c.code + '</span>' +
            '<span class="ring-tower-name">' + c.name + '</span><span class="ring-tower-num">' + (you ? '' : c.number) + '</span>' +
            (you ? '' : '<span class="ring-tower-bar" aria-hidden="true"><i></i></span>') + '</' + tag + '>';
    };
    function buildRows(list) {
        const el = dom.tower, you = list.some(c => c.player);
        el.innerHTML = '<div class="ring-tower-head"><span>The grid</span><span class="ring-tower-meta"><span class="ring-tower-clock" id="ringTowerClock"></span><span class="ring-tower-lap" id="ringTowerLap">Lap 1</span></span></div>' +
            list.map(rowHtml).join('') +
            '<p class="ring-tower-foot" id="ringTowerFoot">Each car is a project. Open one and its car picks up pace. Drive to join them.</p>';
        el.setAttribute('aria-label', 'The grid: live timing of the simulated race, ' + list.length + ' cars, one per project' + (you ? ' and you' : ''));
        grid.rows = {}; el.querySelectorAll('.ring-tower-row').forEach(r => { grid.rows[r.dataset.id] = r; });
        grid.lapEl = el.querySelector('#ringTowerLap'); grid.clockEl = el.querySelector('#ringTowerClock'); grid.footEl = el.querySelector('#ringTowerFoot');
        grid.order = ''; grid.key = list.map(c => c.id).slice().sort().join(',');
        tickClock();
    }
    function setGrid(list) {
        const el = dom.tower; if (!el) return;
        if (!list || !list.length) { el.hidden = true; return; }
        buildRows(list);
        el.hidden = false;
        if (!grid.bound) { grid.bound = true; el.addEventListener('click', e => { const r = e.target.closest('.ring-tower-row'); if (r && r.dataset.stop) go(r.dataset.stop); }); }
        updateGrid(true);
    }
    function updateGrid(force) {
        if (!dom.tower || !world.gridState) return;
        const now = performance.now();
        if (!force && now - grid.at < 100) return;
        grid.at = now;
        const g = world.gridState(); if (!g.length) return;
        const key = g.map(x => x.id).slice().sort().join(',');
        if (key !== grid.key) buildRows(g);   // the field changed: a car joined or left
        const order = g.map(x => x.id).join('>');
        /* while the visitor drives the Grid collapses to the three rows that
           matter, the car ahead, YOU and the car behind (circuit.css hides the
           rest); at the back or the front the window slides to keep three */
        const kYou = drive.on ? g.findIndex(x => x.player) : -1;
        const lo = kYou >= 0 ? Math.max(0, Math.min(kYou - 1, g.length - 3)) : -1, hi = kYou >= 0 ? Math.min(g.length - 1, lo + 2) : -1;
        if (kYou >= 0) g.forEach((row, k) => { const el = grid.rows[row.id]; if (el) el.classList.toggle('is-near', k >= lo && k <= hi); });
        if (order !== grid.order) {   // a pass on track: the rows swap, and slide into place
            const before = {}; for (const id in grid.rows) { const r = grid.rows[id].getBoundingClientRect(); before[id] = r.height ? r.top : null; }   // a hidden row has no place to slide from
            for (const row of g) dom.tower.insertBefore(grid.rows[row.id], grid.footEl || null);   // the caption stays last
            if (grid.order && !reduced.matches) for (const id in grid.rows) {
                const el = grid.rows[id], r = el.getBoundingClientRect();
                if (before[id] == null || !r.height) continue;
                const dy = before[id] - r.top;
                if (!dy) continue;
                el.style.transition = 'none'; el.style.transform = 'translateY(' + dy + 'px)';
                requestAnimationFrame(() => { el.style.transition = ''; el.style.transform = ''; });
            }
            grid.order = order;
        }
        const now2 = Date.now() / 1000;
        g.forEach((row, k) => {
            const el = grid.rows[row.id]; if (!el) return;
            el.querySelector('.ring-tower-pos').textContent = 'P' + (k + 1);
            el.querySelector('.ring-tower-num').textContent = k === 0 ? 'Lead' : '+' + row.gap.toFixed(2);
            el.classList.toggle('is-fight', row.passing || row.passed);
            /* the bar is this car's share of the attention in the room, so
               the visitor can see their own reading moving the race */
            const bar = el.querySelector('.ring-tower-bar > i');
            if (bar) bar.style.transform = 'scaleX(' + Math.max(0, Math.min(1, row.share || 0)).toFixed(3) + ')';
            el.classList.toggle('is-attended', (row.share || 0) > 0.02);
            el.classList.toggle('is-just-read', row.flashedAt && (now2 - row.flashedAt) < 1.1);
        });
        const rs = world.raceState ? world.raceState() : null;
        if (grid.lapEl && rs) { const txt = 'Lap ' + rs.lap; if (grid.lapEl.textContent !== txt) grid.lapEl.textContent = txt; }
    }

    /* the shelf tells us which project case is open, so the visitor
       reading a case feeds that project's car and no other */
    let caseOpen = null;
    function attendCase(projectId, kind) {
        if (kind === 'close' || !projectId) { caseOpen = null; return; }
        if (world.attendCase && world.attendCase(projectId, 'case')) caseOpen = projectId;
        else caseOpen = null;   // a case with no car on the grid moves nothing, and claims nothing
    }

    /* ------------------------------------------------ wiring */
    dom.lapBtn.addEventListener('click', startLap);
    if (dom.driveBtn) dom.driveBtn.addEventListener('click', startDrive);
    if (dom.lapExit) dom.lapExit.addEventListener('click', () => { if (drive.on) endDrive(true); else endLap(true); });
    if (dom.driveAgain) dom.driveAgain.addEventListener('click', () => { endDrive(false); startDrive(); });
    if (dom.driveHome) dom.driveHome.addEventListener('click', () => endDrive(true));
    document.addEventListener('focusin', e => { if (pinOf(e.target)) { focus = pinOf(e.target).dataset.id; refreshStill(); } });
    document.addEventListener('focusout', e => { if (pinOf(e.target)) { focus = null; refreshStill(); } });
    dom.panelClose.addEventListener('click', close);
    if (dom.hopPrev) dom.hopPrev.addEventListener('click', () => go(dom.hopPrev.dataset.id));
    if (dom.hopNext) dom.hopNext.addEventListener('click', () => go(dom.hopNext.dataset.id));
    window.addEventListener('resize', () => { layoutShift(); settle(); });
    buildMap();
    hooks.push((dt) => {
        const now = performance.now();
        stepFly(now); stepLap(dt, now); stepDrive(dt, now);
        /* a case sits on top of a stop, so it wins; they never double-count */
        if (caseOpen && world.attendCaseDwell) world.attendCaseDwell(caseOpen, dt);
        else if (open && world.attendDwell) world.attendDwell(open, dt);
        updatePins(dt); updateMap(); updateGrid();
    });
    layoutShift(); { const hv = homeView(); view.target.x = hv.x; view.target.z = hv.z; view.zoom = hv.zoom; } settle();
    showHint();

    return { go, close, startLap, endLap, startDrive, endDrive, panBy, zoomAt, flyTo, FLY_MS, setGrid, attendCase,
             state: () => ({ open, lap: lap.running, driving: drive.on, zoom: view.zoom, target: [view.target.x, view.target.z], hover, focus, flying: !!fly }) };
}
