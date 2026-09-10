/* Wada Ring, navigation. Phase 3, V1.2 label pass.
   Explore (drag pans, wheel and pinch zoom), persistent labels, fly-to,
   the mini-map, the lap guide and the keyboard. Nothing here moves the
   camera on its own: every camera move answers the visitor. */
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
    function updatePins(dt) {
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
        dom.panelKicker.textContent = loc.num + ' ' + loc.section;
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
        if (lap.running) endLap(false);
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
    /* V1.3 Session 3: Start lap is a chase camera on the live race. It
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
    function setLapButton(on) {
        dom.lapBtn.textContent = on ? 'Leave the lap' : 'Start lap'; dom.lapBtn.setAttribute('aria-pressed', String(on));
        if (dom.lapExit) dom.lapExit.hidden = !on;
        document.body.classList.toggle('ring-lapping', on);
    }
    function startLap() {
        if (lap.running) return endLap(true);
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

    /* ------------------------------------------------ pointer */
    const ptrs = new Map(); let drag = null, pinch = null;
    const pinchState = () => { const [a, b] = [...ptrs.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; };
    const pinOf = t => (t && t.closest) ? t.closest('.ring-pin') : null;
    const worldTarget = t => t === canvas || !!pinOf(t);
    document.addEventListener('pointerdown', e => {
        if (!worldTarget(e.target)) return;
        if (lap.running) endLap(true);
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* a pointer that is already gone */ }
        ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const pin = pinOf(e.target);
        if (ptrs.size === 1) drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, t0: performance.now(), pin: pin ? pin.dataset.id : null };
        else { drag = null; pinch = pinchState(); }
        canvas.classList.add('is-dragging');
    });
    window.addEventListener('pointermove', e => {
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
        if (e.pointerType === 'mouse' && e.target === canvas) {
            const id = pick(e.clientX, e.clientY);
            if (id !== hover) { hover = id; canvas.classList.toggle('is-over', !!id); refreshStill(); }
        }
    });
    const up = e => {
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
        if (lap.running) endLap(true);
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0012)));
    }, { passive: false });

    /* ------------------------------------------------ keyboard */
    window.addEventListener('keydown', e => {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
        const tag = (e.target && e.target.tagName) || '';
        if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
        if (document.body.classList.contains('stage-open')) return;   // a case is on stage; its own keys apply
        if (e.key === 'Escape') { if (lap.running) endLap(true); else if (open) close(); return; }
        if (open && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { const h = hopTargets(open); go(e.key === 'ArrowLeft' ? h.prev.id : h.next.id); e.preventDefault(); return; }
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

    /* ------------------------------------------------ the grid (V1.2, live in V1.3) */
    /* Four rows on the broadcast face above the mini-map: live timing of
       the simulated race. Positions reorder as cars pass on track, the
       last column is the gap to the leader, ticking; the head carries the
       leader's lap. Order and gaps are the world's, read every frame and
       written at ten a second; nothing on the page is fetched. Each row is
       a button that opens the stop its project lives in. */
    const grid = { rows: {}, order: '', lapEl: null, at: 0 };
    function setGrid(list) {
        const el = dom.tower; if (!el) return;
        if (!list || !list.length) { el.hidden = true; return; }
        el.innerHTML = '<div class="ring-tower-head"><span>The grid</span><span class="ring-tower-lap" id="ringTowerLap">Lap 1</span></div>' +
            list.map((c, i) => { const loc = byId[c.stop]; return '<button type="button" class="ring-tower-row" data-id="' + c.id + '" data-stop="' + c.stop + '" style="--sig:' + (loc && loc.signature || '#c6a15b') + '">' +
                '<span class="ring-tower-pos">P' + (i + 1) + '</span><span class="ring-tower-code">' + c.code + '</span>' +
                '<span class="ring-tower-name">' + c.name + '</span><span class="ring-tower-num">' + c.number + '</span></button>'; }).join('');
        el.hidden = false;
        el.setAttribute('aria-label', 'The grid: live timing of the simulated race, four cars, one per project');
        el.addEventListener('click', e => { const r = e.target.closest('.ring-tower-row'); if (r) go(r.dataset.stop); });
        grid.rows = {}; el.querySelectorAll('.ring-tower-row').forEach(r => { grid.rows[r.dataset.id] = r; });
        grid.lapEl = el.querySelector('#ringTowerLap'); grid.order = '';
        updateGrid(true);
    }
    function updateGrid(force) {
        if (!dom.tower || !world.gridState) return;
        const now = performance.now();
        if (!force && now - grid.at < 100) return;
        grid.at = now;
        const g = world.gridState(); if (!g.length) return;
        const order = g.map(x => x.id).join('>');
        if (order !== grid.order) {   // a pass on track: the rows swap, and slide into place
            const before = {}; for (const id in grid.rows) before[id] = grid.rows[id].getBoundingClientRect().top;
            for (const row of g) dom.tower.appendChild(grid.rows[row.id]);
            if (grid.order && !reduced.matches) for (const id in grid.rows) {
                const el = grid.rows[id], dy = before[id] - el.getBoundingClientRect().top;
                if (!dy) continue;
                el.style.transition = 'none'; el.style.transform = 'translateY(' + dy + 'px)';
                requestAnimationFrame(() => { el.style.transition = ''; el.style.transform = ''; });
            }
            grid.order = order;
        }
        g.forEach((row, k) => {
            const el = grid.rows[row.id]; if (!el) return;
            el.querySelector('.ring-tower-pos').textContent = 'P' + (k + 1);
            el.querySelector('.ring-tower-num').textContent = k === 0 ? 'Lead' : '+' + row.gap.toFixed(2);
            el.classList.toggle('is-fight', row.passing || row.passed);
        });
        const rs = world.raceState ? world.raceState() : null;
        if (grid.lapEl && rs) { const txt = 'Lap ' + rs.lap; if (grid.lapEl.textContent !== txt) grid.lapEl.textContent = txt; }
    }

    /* ------------------------------------------------ wiring */
    dom.lapBtn.addEventListener('click', startLap);
    if (dom.lapExit) dom.lapExit.addEventListener('click', () => endLap(true));
    document.addEventListener('focusin', e => { if (pinOf(e.target)) { focus = pinOf(e.target).dataset.id; refreshStill(); } });
    document.addEventListener('focusout', e => { if (pinOf(e.target)) { focus = null; refreshStill(); } });
    dom.panelClose.addEventListener('click', close);
    if (dom.hopPrev) dom.hopPrev.addEventListener('click', () => go(dom.hopPrev.dataset.id));
    if (dom.hopNext) dom.hopNext.addEventListener('click', () => go(dom.hopNext.dataset.id));
    window.addEventListener('resize', () => { layoutShift(); settle(); });
    buildMap();
    hooks.push((dt) => { const now = performance.now(); stepFly(now); stepLap(dt, now); updatePins(dt); updateMap(); updateGrid(); });
    layoutShift(); { const hv = homeView(); view.target.x = hv.x; view.target.z = hv.z; view.zoom = hv.zoom; } settle();

    return { go, close, startLap, endLap, panBy, zoomAt, flyTo, FLY_MS, setGrid,
             state: () => ({ open, lap: lap.running, zoom: view.zoom, target: [view.target.x, view.target.z], hover, focus, flying: !!fly }) };
}
