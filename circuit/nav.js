/* Wada Ring, navigation. Phase 3.
   Explore (drag pans, wheel and pinch zoom), labels on approach, fly-to,
   the mini-map, the lap guide and the keyboard. Nothing here moves on its
   own: every camera move answers the visitor. */
export function attach(world, L, dom) {
    'use strict';
    const { camera, canvas, view, fit, render, groups, hooks, project, groundAt, pick, frames: fr, poseAt, reduced } = world;
    const ZOOM_MIN = 0.85, ZOOM_MAX = 7;   // close enough to read a toy on the pit wall
    /* a phone held upright sees a wide flat diamond; it gets a closer default
       and the world sits lower, under the timing block */
    const portrait = () => canvas.clientWidth / canvas.clientHeight < 0.8;
    const homeView = () => ({ x: 105, z: 105, zoom: portrait() ? 1.35 : 1 });
    const layoutShift = () => { view.shiftPx = portrait() ? Math.round(canvas.clientHeight * 0.12) : 0; };
    const FLY_MS = 750, LIFT = 1.2, STOP_ZOOM = 2.6, LAP_ZOOM = 2.0, LAP_SPEED = 16, LAP_PAUSE = 1700;
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

    /* ------------------------------------------------ pins: labels on approach */
    const pins = {};
    for (const loc of L.LOCATIONS) {
        const el = document.createElement('button');
        el.type = 'button'; el.className = 'ring-pin'; el.dataset.id = loc.id;
        el.setAttribute('aria-label', 'Stop ' + loc.num + ', ' + loc.name + ', ' + loc.section);
        el.innerHTML = '<span class="ring-pin-dot" aria-hidden="true"></span><span class="ring-pin-text" aria-hidden="true">' +
            '<span class="ring-pin-name">' + loc.num + '&nbsp;&nbsp;' + loc.name + '</span>' +
            '<span class="ring-pin-sub">' + loc.section + '</span></span>';
        el.addEventListener('click', e => { if (e.detail === 0) go(loc.id); });   // keyboard; pointer clicks arrive below
        el.addEventListener('focus', () => { focus = loc.id; refreshStill(); });
        el.addEventListener('blur', () => { if (focus === loc.id) focus = null; refreshStill(); });
        el.addEventListener('pointerenter', () => { hover = loc.id; refreshStill(); });
        el.addEventListener('pointerleave', () => { if (hover === loc.id) hover = null; refreshStill(); });
        dom.pins.appendChild(el);
        pins[loc.id] = { el, cur: 0, loc };
    }
    function updatePins(dt) {
        const vw = camera.right - camera.left;
        const gate = clamp((view.zoom - homeView().zoom * 1.15) / 0.5, 0, 1);   // labels arrive on approach, never at the default view
        for (const id in pins) {
            const p = pins[id], loc = p.loc;
            const dist = Math.hypot(loc.anchor[0] - view.target.x, loc.anchor[1] - view.target.z);
            let f = clamp(1 - dist / (vw * 0.28), 0, 1) * gate;
            if (hover === id || focus === id || open === id || lapMark === id || document.activeElement === p.el) f = 1;
            p.cur += (f - p.cur) * Math.min(1, dt * 9);
            if (Math.abs(f - p.cur) < 0.01) p.cur = f;
            const lift = p.cur * LIFT;
            groups[id].position.y = lift;
            const s = project(loc.anchor[0], loc.labelZ + lift, loc.anchor[1]);
            p.el.style.transform = 'translate(' + s[0].toFixed(1) + 'px,' + s[1].toFixed(1) + 'px)';
            p.el.style.opacity = p.cur.toFixed(3);
            p.el.classList.toggle('is-live', p.cur > 0.5);
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
        for (const loc of L.LOCATIONS) {
            const [x, y] = mapXY(loc.anchor[0], loc.anchor[1]);
            html += '<circle class="ring-map-stop" data-id="' + loc.id + '" cx="' + f1(x) + '" cy="' + f1(y) + '" r="3"><title>' + loc.name + '</title></circle>';
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
    function openPanel(loc) {
        dom.panelKicker.textContent = loc.num + ' ' + loc.section;
        dom.panelTitle.textContent = loc.name;
        dom.panel.dataset.id = loc.id;
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
        if (!open) prevView = { x: view.target.x, z: view.target.z, zoom: view.zoom };
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
    function close() {
        if (!open) return;
        open = null; closePanel();
        const back = prevView || homeView(); prevView = null;
        flyTo(back.x, back.z, back.zoom);
        if (returnTo) { returnTo.focus({ preventScroll: true }); returnTo = null; }
        refreshStill();
    }

    /* ------------------------------------------------ the lap guide */
    const startS = fr[L.nearest(fr, [L.START.u, L.START.v])].s;
    const lap = { running: false, flying: false, rel: 0, next: 0, pauseUntil: 0, timer: 0,
        stops: L.LAP.map(id => { const at = byId[id].lapAt || byId[id].anchor; const s = fr[L.nearest(fr, at)].s; return { id, rel: ((s - startS) % lapLen + lapLen) % lapLen }; }).sort((a, b) => a.rel - b.rel) };
    function setLapButton(on) { dom.lapBtn.textContent = on ? 'Skip lap' : 'Start lap'; dom.lapBtn.setAttribute('aria-pressed', String(on)); }
    function startLap() {
        if (lap.running) return endLap(true);
        if (open) { open = null; closePanel(); prevView = null; }
        lap.running = true; lap.rel = -12; lap.next = 0; lap.pauseUntil = 0; lapMark = null;
        setLapButton(true);
        if (reduced.matches) { lapCut(); return; }
        const p = poseAt(startS + lap.rel);
        lap.flying = true;
        flyTo(p.x, p.z, LAP_ZOOM, () => { lap.flying = false; });
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
        if (now < lap.pauseUntil) return;
        lapMark = null;
        lap.rel += dt * LAP_SPEED;
        const stop = lap.stops[lap.next];
        if (stop && lap.rel >= stop.rel) {
            lap.rel = stop.rel; lap.next++; lapMark = stop.id; lap.pauseUntil = now + LAP_PAUSE;
        }
        const p = poseAt(startS + lap.rel);
        view.target.x = p.x; view.target.z = p.z; settle();
        if (lap.rel >= lapLen + 2) endLap(true);
    }
    function endLap(home) {
        if (!lap.running) return;
        lap.running = false; lap.flying = false; lapMark = null; clearTimeout(lap.timer);
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
            if (!drag.moved && performance.now() - drag.t0 < 600) { const id = drag.pin || pick(e.clientX, e.clientY); if (id) go(id); }
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

    /* ------------------------------------------------ the timing tower (V1.1 Part 4) */
    /* Three rows on the broadcast face above the mini-map: position, code,
       name, and the real number, trailing 30-day commits, with the gap to
       the leader for the cars behind and GARAGE for a car with none. Rows
       move only when the standings changed since this browser last saw
       them, which happens on a deploy, not while anyone watches. */
    function setStandings(data) {
        const el = dom.tower; if (!el) return;
        if (!data || !data.cars) { el.hidden = true; return; }
        const order = data.order || data.cars.map(c => c.id);
        const rows = data.cars.slice().sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
        const lead = rows.find(c => (c.commits || 0) > 0);
        let prev = null;
        try { prev = JSON.parse(localStorage.getItem('wada-ring-standings') || 'null'); } catch (e) { prev = null; }
        const changed = prev && prev.generated !== data.generated && Array.isArray(prev.order) && prev.order.join() !== order.join();
        const drawOrder = changed ? rows.slice().sort((a, b) => prev.order.indexOf(a.id) - prev.order.indexOf(b.id)) : rows;
        const since = data.since ? new Date(data.since) : null;
        el.innerHTML = '<div class="ring-tower-head"><span>' + (data.window_days || 30) + ' DAYS</span><span>COMMITS</span></div>' +
            drawOrder.map(c => {
                const pos = rows.indexOf(c) + 1, n = c.commits || 0;
                const val = n === 0 ? 'GARAGE' : (c === lead ? String(n) : '+' + ((lead.commits || 0) - n));
                return '<div class="ring-tower-row" data-id="' + c.id + '" data-district="' + c.district + '">' +
                    '<span class="ring-tower-pos">P' + pos + '</span><span class="ring-tower-code">' + c.code + '</span>' +
                    '<span class="ring-tower-name">' + c.name + '</span><span class="ring-tower-val' + (n === 0 ? ' is-garage' : '') + '">' + val + '</span></div>';
            }).join('');
        el.hidden = false;
        el.setAttribute('aria-label', 'Standings, commits in the last ' + (data.window_days || 30) + ' days' + (since ? ', since ' + since.toISOString().slice(0, 10) : ''));
        if (changed && !reduced.matches) {   // FLIP: from the old order to the new
            const items = [...el.querySelectorAll('.ring-tower-row')];
            const first = new Map(items.map(r => [r.dataset.id, r.getBoundingClientRect().top]));
            rows.forEach(c => el.appendChild(el.querySelector('.ring-tower-row[data-id="' + c.id + '"]')));
            items.forEach(r => {
                const dy = first.get(r.dataset.id) - r.getBoundingClientRect().top;
                r.style.transition = 'none'; r.style.transform = 'translateY(' + dy + 'px)';
            });
            requestAnimationFrame(() => items.forEach(r => { r.style.transition = 'transform 700ms cubic-bezier(0.2, 0.7, 0.2, 1)'; r.style.transform = ''; }));
        } else if (changed) {
            rows.forEach(c => el.appendChild(el.querySelector('.ring-tower-row[data-id="' + c.id + '"]')));
        }
        try { localStorage.setItem('wada-ring-standings', JSON.stringify({ generated: data.generated, order })); } catch (e) { /* private mode */ }
    }

    /* ------------------------------------------------ wiring */
    dom.lapBtn.addEventListener('click', startLap);
    document.addEventListener('focusin', e => { if (pinOf(e.target)) { focus = pinOf(e.target).dataset.id; refreshStill(); } });
    document.addEventListener('focusout', e => { if (pinOf(e.target)) { focus = null; refreshStill(); } });
    dom.panelClose.addEventListener('click', close);
    window.addEventListener('resize', () => { layoutShift(); settle(); });
    buildMap();
    hooks.push((dt) => { const now = performance.now(); stepFly(now); stepLap(dt, now); updatePins(dt); updateMap(); });
    layoutShift(); view.zoom = homeView().zoom; settle();

    return { go, close, startLap, endLap, panBy, zoomAt, flyTo, FLY_MS, setStandings,
             state: () => ({ open, lap: lap.running, zoom: view.zoom, target: [view.target.x, view.target.z], hover, focus, flying: !!fly }) };
}
