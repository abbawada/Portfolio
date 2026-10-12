/* Wada Ring, navigation. Phase 3, V1.2 label pass; round 7 tour and jump.
   Explore (drag pans, wheel and pinch zoom), persistent labels, fly-to,
   the mini-map, Start lap (round 7: a ride round the track that stops at
   every stop and opens it), the helicopter jump (round 7) and the
   keyboard. Nothing here moves the camera on its own: every camera move
   answers the visitor. */
export function attach(world, L, dom) {
    'use strict';
    const { camera, canvas, view, fit, render, groups, hooks, project, groundAt, pick, frames: fr, poseAt, reduced } = world;
    const ZOOM_MIN = 0.8, ZOOM_MAX = 7;   // close enough to read a toy on the pit wall
    const PL = L.PLATE || { u0: 0, v0: 0, u1: 210, v1: 210 };
    /* a phone held upright sees a wide flat diamond; it gets a closer default
       and the world sits lower, under the timing block */
    const portrait = () => canvas.clientWidth / canvas.clientHeight < 0.8;
    /* the default framing leans toward the court (V1.2, section 4): the
       plate still fits, Betta sits just above the centre of the screen.
       Round 7: the plate grew 40 on the far side, so the view sits further
       back on the plan and a little wider. */
    const homeView = () => (portrait() ? { x: 104, z: 92, zoom: 1.58 } : { x: 110, z: 82, zoom: 1.02 });   // a phone keeps round 6's scale and looks at the middle of the infield
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
    let hover = null, focus = null, open = null, lapMark = null, returnTo = null, fly = null;
    function settle() {
        view.zoom = clamp(view.zoom, ZOOM_MIN, ZOOM_MAX);
        const m = open || jump.on ? -40 : 12;   // framing an open stop or a jump may look past the plate edge
        view.target.x = clamp(view.target.x, PL.u0 + m, PL.u1 - m);
        view.target.z = clamp(view.target.z, PL.v0 + m, PL.v1 - m);
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
    function flyTo(x, z, zoom, done, ms) {
        if (reduced.matches) { view.target.x = x; view.target.z = z; view.zoom = zoom; settle(); if (done) done(); return; }
        fly = { x0: view.target.x, z0: view.target.z, k0: view.zoom, x1: x, z1: z, k1: zoom, t0: performance.now(), ms: ms || FLY_MS, done };
    }
    /* the visitor takes the camera mid-move (a drag, the wheel, a pinch): the
       move stops where it is, and whatever it was going to do on arrival (open
       a panel, show the jump's card, hand the lap its ride) still happens */
    function interruptFly() {
        if (!fly) return;
        const d = fly.done; fly = null;
        if (d) d();
    }
    function stepFly(now) {
        if (!fly) return;
        const t = clamp((now - fly.t0) / fly.ms, 0, 1), e = ease(t);
        view.target.x = fly.x0 + (fly.x1 - fly.x0) * e;
        view.target.z = fly.z0 + (fly.z1 - fly.z0) * e;
        view.zoom = fly.k0 * Math.pow(fly.k1 / fly.k0, e);
        settle();
        if (t >= 1) { const d = fly.done; fly = null; if (d) d(); }
    }
    const refreshStill = () => { if (!world.isRunning()) { updatePins(1); render(); } };
    /* the ground point that puts a point h above (x, z) at the centre of the screen */
    const lifted = (x, z, h) => [x + UP[0] * h * 1.732, z + UP[1] * h * 1.732];

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
    /* round 7: the helicopter carries its own chip, the way in to the jump.
       It rides above the aircraft wherever it flies and hides while a jump
       is on; a click on it or on the aircraft itself starts the jump. */
    const heliPin = document.createElement('button');
    heliPin.type = 'button'; heliPin.className = 'ring-pin ring-heli-pin is-live'; heliPin.dataset.id = 'helicopter';
    heliPin.setAttribute('aria-label', 'Skydive: jump from the Betta helicopter');
    heliPin.innerHTML = '<span class="ring-pin-dot" aria-hidden="true"></span><span class="ring-pin-text" aria-hidden="true"><span class="ring-pin-name">Skydive</span></span>';
    heliPin.addEventListener('click', e => { if (e.detail === 0) startJump(); });   // keyboard; pointer clicks arrive below
    heliPin.addEventListener('pointerenter', () => { heliHot = true; });
    heliPin.addEventListener('pointerleave', () => { heliHot = false; });
    dom.pins.appendChild(heliPin);
    let heliHot = false;
    /* a chip that would sit under the page chrome (the name block, the Grid
       block) fades out rather than bleeding through it. The chrome boxes
       and the chip sizes are read four times a second, the test itself is
       arithmetic on the projected point, so the frame never forces a
       layout. A hot or open chip is left alone. */
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
        for (const el of [document.querySelector('.ring-broadcast'), dom.tourBar, dom.jumpCard]) {
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
            if (measure) { p.w = p.el.offsetWidth; p.h = p.el.offsetHeight; }
            /* a chip that would run off the right edge hangs left of its dot instead (round 7: the Journey on a phone) */
            let sideKey = loc.labelSide || 'right';
            if (sideKey === 'right' && p.w > 0 && s[0] - 6 + p.w > canvas.clientWidth - 4) sideKey = 'left';
            else if (sideKey === 'left' && p.w > 0 && s[0] - p.w + 6 < 4) sideKey = 'right';
            if (sideKey !== p.side) { p.side = sideKey; p.el.classList.toggle('is-left', sideKey === 'left'); }
            const side = sideKey === 'left' ? 'translate(calc(-100% + 6px), -50%)' : sideKey === 'below' ? 'translate(-50%, -6px)' : 'translate(-6px, -50%)';
            p.el.style.transform = 'translate(' + s[0].toFixed(1) + 'px,' + s[1].toFixed(1) + 'px) ' + side;
            p.el.classList.toggle('is-hot', p.cur > 0.5);
            p.el.classList.toggle('is-open', open === id);
            const box = sideKey === 'left' ? { x: s[0] - p.w + 6, y: s[1] - p.h / 2, w: p.w, h: p.h }
                : sideKey === 'below' ? { x: s[0] - p.w / 2, y: s[1] - 6, w: p.w, h: p.h }
                : { x: s[0] - 6, y: s[1] - p.h / 2, w: p.w, h: p.h };
            p.el.classList.toggle('is-under', !f && p.w > 0 && under.boxes.some(b => overlaps(box, b)));
        }
        /* the helicopter's chip, above the cabin, right of the dot */
        const h = world.jump ? world.jump.heli() : null;
        if (h) {
            const s = project(h.x, h.y + 9, h.z);
            heliPin.style.transform = 'translate(' + s[0].toFixed(1) + 'px,' + s[1].toFixed(1) + 'px) translate(-6px, -50%)';
            if (measure) { heliPin._w = heliPin.offsetWidth; heliPin._h = heliPin.offsetHeight; }
            const box = { x: s[0] - 6, y: s[1] - (heliPin._h || 0) / 2, w: heliPin._w || 0, h: heliPin._h || 0 };
            const off = s[0] < -40 || s[1] < -20 || s[0] > canvas.clientWidth + 40 || s[1] > canvas.clientHeight + 20;
            const hot = heliHot || document.activeElement === heliPin;
            if (hot !== heliPin._hot) { heliPin._hot = hot; if (world.setHeliHot) world.setHeliHot(hot); }   // the cabin glows while the aircraft is the target
            heliPin.hidden = jump.on || off;
            heliPin.classList.toggle('is-hot', hot);
            heliPin.classList.toggle('is-under', !hot && (heliPin._w || 0) > 0 && under.boxes.some(b => overlaps(box, b)));
        } else heliPin.hidden = true;
    }

    /* ------------------------------------------------ mini-map */
    const M = { w: 190, h: 120, s: 0, ox: 0, oy: 0 };
    let camDot = null;
    const XMIN = PL.u0 - PL.v1, XMAX = PL.u1 - PL.v0, YMIN = PL.u0 + PL.v0, YMAX = PL.u1 + PL.v1;   // the plate's corners in iso
    const mapXY = (u, v) => [M.ox + (u - v - (XMIN + XMAX) / 2) * M.s, M.oy + (u + v - YMIN) * M.s * 0.5];
    function buildMap() {
        M.s = Math.min((M.w - 16) / (XMAX - XMIN), (M.h - 12) / ((YMAX - YMIN) * 0.5)); M.ox = M.w / 2; M.oy = (M.h - (YMAX - YMIN) * M.s * 0.5) / 2;
        const f1 = n => n.toFixed(1);
        const path = 'M' + fr.map(f => mapXY(f.p[0], f.p[1]).map(f1).join(',')).join('L') + 'Z';
        const pit = 'M' + L.sample(L.PIT, 8, false).map(p => mapXY(p[0], p[1]).map(f1).join(',')).join('L');
        let html = '<path d="' + path + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
                   '<path d="' + pit + '" fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>';
        const MAP_OFF = { about: [4, -4], betta: [5.5, 2.6], journey: [5.5, -2], education: [-5.5, 2.6, 'end'], economics: [5.5, 2.6], writing: [-5.5, 2.6, 'end'], projects: [-5.5, 8, 'end'], contact: [5.5, 8] };
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
    const HOP = L.LAP.slice();   // the stops, round the lap
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
        if (!tour.on) dom.panelClose.focus({ preventScroll: true });   // on the lap the focus stays on the lap's own controls
        if (world.attendStop) world.attendStop(loc.id, 'open');   // the visitor's tour is the race's one live input
        if (dom.onOpen) dom.onOpen(loc);
    }
    function closePanel() {
        dom.panel.classList.remove('is-open');
        document.body.classList.remove('ring-open');
        const hide = () => { if (open) return; dom.panel.hidden = true; if (dom.onClose) dom.onClose(); };   // a stop opened in the meantime keeps the panel
        if (reduced.matches) hide(); else setTimeout(hide, 260);
    }
    /* the camera framing for an open stop: the stop beside the panel on a
       wide screen, above the sheet on a phone */
    function stopAim(loc) {
        const aspect = canvas.clientWidth / canvas.clientHeight, sheet = window.innerWidth <= 760;
        const zoom = sheet ? 3.2 : STOP_ZOOM;
        const vw = Math.max(view.width, 200 * aspect) / zoom, k = vw / canvas.clientWidth;
        const panelPx = sheet ? 0 : Math.min(600, window.innerWidth * 0.92);
        /* on a wide screen the Grid sits bottom right of the world beside the panel: frame the stop left of it */
        const tower = dom.tower && !dom.tower.hidden ? dom.tower.getBoundingClientRect().width : 0;
        const room = window.innerWidth - panelPx;
        const gridPx = !sheet && tower && room > 2.2 * tower ? tower * 0.55 : 0;
        const shift = (panelPx / 2 + gridPx) * k;
        /* a sheet rises from below: aim the stop at about 30% down the screen, above it */
        const shiftY = sheet ? (window.innerHeight * (tour.on ? 0.28 : 0.2) + (view.shiftPx || 0)) * k / SIN30 : 0;   // on the lap the bar sits above the sheet, so the stop rides higher
        const lift = loc.labelZ * 0.45 * 1.73;   // tall stops: centre halfway up, so the label stays in view
        return { x: loc.anchor[0] + RIGHT[0] * shift + UP[0] * (lift - shiftY), z: loc.anchor[1] + RIGHT[1] * shift + UP[1] * (lift - shiftY), zoom };
    }
    function show(id, after) {
        const loc = byId[id]; if (!loc) return;
        if (jump.on) endJump(false);
        open = id; returnTo = pins[id].el;
        const a = stopAim(loc);
        flyTo(a.x, a.z, a.zoom, () => { openPanel(loc); if (after) after(); });
        refreshStill();
    }
    function go(id) {
        const loc = byId[id]; if (!loc) return;
        if (open === id && !tour.on && !jump.on) return;   // already here: no second deposit, no second fly
        if (tour.on) endTour(false);   // a stop the visitor picks ends the lap there
        show(id);
    }
    /* closing never moves the camera (V1.2): the visitor stays where they
       are, the labels are all around, the next stop is one click away */
    function close() {
        if (!open) return;
        if (tour.on) endTour(false);
        open = null; closePanel();
        if (returnTo) { returnTo.focus({ preventScroll: true }); returnTo = null; }
        refreshStill();
    }

    /* ------------------------------------------------ Start lap (round 7) */
    /* The lap is a ride round the circuit that stops at every stop. The
       camera leaves the start line and rides the track at a steady clip;
       as it reaches a stop it pulls in, opens that stop, and holds it while
       a bar runs out. Then the panel closes and the ride goes on to the
       next one, and after the last it crosses the line and goes home. The
       bar stands still while the pointer is on the panel, and stops for
       good once the visitor scrolls, clicks or types in it, until they
       press Next stop. Leave lap, Escape, the Start lap button again, a
       label, the map, a drag or a Grid row all end it. Under reduced
       motion the ride is a cut. */
    const startS = fr[L.nearest(fr, [L.START.u, L.START.v])].s;
    const TOUR_DWELL = 9, TOUR_LEG_MIN = 1.6, TOUR_LEG_MAX = 4.2, TOUR_AHEAD = 6, TOUR_ZOOM = 2.1;
    const tour = { on: false, phase: null, i: -1, rel: 0, from: 0, to: 0, speed: 0, left: 0, held: false, sticky: false, flying: false, timer: 0,
        stops: L.LAP.filter(id => byId[id]).map(id => { const at = byId[id].lapAt || byId[id].anchor; const s = fr[L.nearest(fr, at)].s; return { id, rel: ((s - startS) % lapLen + lapLen) % lapLen }; }).sort((a, b) => a.rel - b.rel) };
    const rideAim = rel => {
        const p = poseAt(startS + rel), k = Math.hypot(p.tx, p.tz) || 1;
        return { x: p.x + p.tx / k * TOUR_AHEAD, z: p.z + p.tz / k * TOUR_AHEAD, zoom: TOUR_ZOOM * (portrait() ? 1.3 : 1) };
    };
    function setTourBar() {
        if (!dom.tourBar) return;
        const n = tour.stops.length, i = tour.i, at = i >= 0 && i < n ? byId[tour.stops[i].id] : null;
        const next = i + 1 < n ? byId[tour.stops[i + 1].id] : null;
        let text;
        if (tour.phase === 'stop' && at) text = 'Lap  ' + (i + 1) + ' of ' + n + '  ·  ' + at.name + (tour.sticky ? '  ·  held' : '');
        else if (tour.phase === 'done') text = 'Lap complete';
        else text = next || (i < 0 && n) ? 'Next  ·  ' + (next || byId[tour.stops[0].id]).name : 'To the line';
        if (dom.tourStep.textContent !== text) dom.tourStep.textContent = text;
        dom.tourNext.hidden = tour.phase === 'done';
        dom.tourNext.textContent = tour.phase === 'stop' ? (next ? 'Next stop' : 'Finish') : 'Skip ahead';
        dom.tourBar.classList.toggle('is-held', tour.phase === 'stop' && (tour.held || tour.sticky));
        dom.tourBar.classList.toggle('is-riding', tour.phase !== 'stop');
    }
    function setTourFill(f) { if (dom.tourFill) dom.tourFill.style.transform = 'scaleX(' + clamp(f, 0, 1).toFixed(3) + ')'; }
    function setLapButton(on) {
        dom.lapBtn.textContent = on ? 'Leave lap' : 'Start lap'; dom.lapBtn.setAttribute('aria-pressed', String(on));
        document.body.classList.toggle('ring-lapping', on);
        if (dom.tourBar) dom.tourBar.hidden = !on;
        under.at = 0;
    }
    function startLap() {
        if (tour.on) return endTour(true);
        if (jump.on) endJump(false);
        if (open) { open = null; closePanel(); }
        tour.on = true; tour.i = -1; tour.rel = 0; tour.held = false; tour.sticky = false; lapMark = null;
        setLapButton(true); hideHint();
        if (dom.tourBar) { dom.tourBar.classList.remove('is-done'); setTourFill(0); }
        rideTo(0);
    }
    /* ride from where the lap is to stop k (or the line, past the last) */
    function rideTo(k) {
        if (!tour.on) return;
        const n = tour.stops.length;
        tour.phase = 'ride';
        tour.from = tour.rel; tour.to = k < n ? tour.stops[k].rel : lapLen;
        const legs = Math.max(0, tour.to - tour.from);
        tour.speed = legs / clamp(legs / 34, TOUR_LEG_MIN, TOUR_LEG_MAX);   // a long leg goes quicker, a short one never crawls
        tour.target = k;
        setTourBar(); setTourFill(0);
        if (reduced.matches) { tour.rel = tour.to; arrive(); return; }
        const aim = rideAim(tour.rel);
        tour.flying = true;
        flyTo(aim.x, aim.z, aim.zoom, () => { tour.flying = false; });
    }
    function arrive() {
        if (!tour.on) return;
        const k = tour.target, n = tour.stops.length;
        if (k >= n) return finishTour();
        tour.i = k; tour.phase = 'stop'; tour.left = TOUR_DWELL; tour.held = false; tour.sticky = false; lapMark = null;
        setTourBar(); setTourFill(0);
        show(tour.stops[k].id);
    }
    function nextStop() {
        if (!tour.on) return;
        if (tour.phase === 'ride') {   // skip the rest of this leg
            fly = null; tour.flying = false; tour.rel = tour.to; arrive(); return;   // the skip drops the move on purpose: arrive() flies to the stop
        }
        if (tour.phase !== 'stop') return;
        open = null; closePanel(); returnTo = null;
        rideTo(tour.i + 1);
    }
    function finishTour() {
        tour.phase = 'done'; setTourBar(); setTourFill(1);
        if (dom.tourBar) dom.tourBar.classList.add('is-done');
        clearTimeout(tour.timer);
        tour.timer = setTimeout(() => endTour(true), reduced.matches ? 1200 : 1600);
    }
    function endTour(home) {
        if (!tour.on) return;
        tour.on = false; tour.phase = null; tour.flying = false; lapMark = null; clearTimeout(tour.timer);
        setLapButton(false);
        if (home) {
            if (open) { open = null; closePanel(); returnTo = null; }
            const hv = homeView(); flyTo(hv.x, hv.z, hv.zoom);
            if (dom.lapBtn) dom.lapBtn.focus({ preventScroll: true });
        }
    }
    /* the panel holds the bar while the pointer is on it, and for good once the visitor works in it */
    const panelHeld = () => document.body.classList.contains('stage-open') || document.hidden;
    function stepTour(dt) {
        if (!tour.on) return;
        if (tour.phase === 'ride') {
            if (tour.flying || fly) return;
            tour.rel = Math.min(tour.to, tour.rel + tour.speed * dt);
            const aim = rideAim(tour.rel), k = Math.min(1, dt * 6);
            view.target.x += (aim.x - view.target.x) * k; view.target.z += (aim.z - view.target.z) * k;
            view.zoom += (aim.zoom - view.zoom) * Math.min(1, dt * 2.5);
            settle();
            const near = tour.stops.find(st => { const d = Math.abs(st.rel - tour.rel); return Math.min(d, lapLen - d) < 11; });
            lapMark = near ? near.id : null;
            setTourFill(tour.to > tour.from ? (tour.rel - tour.from) / (tour.to - tour.from) : 1);
            if (tour.rel >= tour.to) arrive();
            return;
        }
        if (tour.phase === 'stop') {
            const held = tour.held || tour.sticky || panelHeld() || fly;
            if (!held) tour.left -= dt;
            setTourFill(1 - tour.left / TOUR_DWELL);
            if (dom.tourBar) dom.tourBar.classList.toggle('is-held', !!(tour.held || tour.sticky));
            if (tour.left <= 0) nextStop();
        }
    }
    /* reduced motion keeps the old cut between stops for the ride marker */
    void LAP_PAUSE;

    /* ------------------------------------------------ the jump (round 7) */
    /* A click on the Betta helicopter (or its chip, or the Jump pill in
       Projects) and the aircraft flies its jump run to the drop zone left
       of the court; the diver climbs out on the skid, lets go, falls,
       feels the pulse on the wrist at 4,000 feet, opens, and spirals down
       onto the target. The camera holds one wide shot from the aircraft to
       the target the whole way down, so the visitor watches the character
       land on the map, then moves in on the landing and offers the reel.
       Escape or Back to the map leaves early; the jump plays out on the map
       behind them. world.jump owns the aircraft, the diver and the maths. */
    const jump = { on: false, phase: null, shot: null, close: false, cardShown: false, landedAt: 0 };
    const fmtFt = ft => { ft = Math.max(0, Math.round(ft / 10) * 10); return (ft >= 1000 ? Math.floor(ft / 1000) + ',' + String(ft % 1000).padStart(3, '0') : String(ft)) + ' FT'; };
    function jumpShot(st) {
        /* frame the aircraft over the target and the target, with a margin */
        const aspect = canvas.clientWidth / canvas.clientHeight, h = st.exit.y;
        const midH = h * 0.52, [x, z] = lifted(st.dz.x, st.dz.z, midH);
        const spanY = 0.866 * h + 26, spanX = 70;   // the drop and some air either side, in world units on screen
        const base = Math.max(view.width, 200 * aspect);
        const zoom = Math.min(base / spanX, (base / aspect) / spanY) * (portrait() ? 1 : 0.92);
        return { x, z, zoom: clamp(zoom, 1.1, 3.4) };
    }
    function startJump() {
        if (!world.jump) return;
        if (tour.on) endTour(false);
        if (open) { open = null; closePanel(); returnTo = null; }
        hideHint();
        if (world.attendCase) world.attendCase('skydiving', 'case');   // the jump feeds the SKY car, as the tile once did
        if (!world.jump.start()) {   // a jump the visitor left is still in the air: go back and watch the rest of it
            const ph = world.jump.state().phase;
            if (ph === 'idle' || ph === 'landed') return;
        }
        jump.on = true; jump.close = false; jump.cardShown = false; jump.landedAt = 0; jump.cueSaid = false; jump.phase = null;
        document.body.classList.add('ring-jumping');
        if (dom.jumpCard) dom.jumpCard.hidden = true;
        if (dom.jumpExit) dom.jumpExit.hidden = false;
        const st = world.jump.state();
        jump.shot = jumpShot(st);
        under.at = 0;
        if (reduced.matches || st.phase === 'landed') {   // no motion: the diver is already down, so cut to the landing and the card (the world's loop, and with it stepJump, is still)
            jump.phase = 'landed'; jump.close = true; jump.landedAt = performance.now();
            const [x, z] = lifted(st.dz.x, st.dz.z, 2);
            flyTo(x, z, clamp(jump.shot.zoom * 1.5, 2.6, 4.2));
            if (dom.jumpStatus) dom.jumpStatus.textContent = SAY.landed;
            showJumpCard();
            return;
        }
        flyTo(jump.shot.x, jump.shot.z, jump.shot.zoom, null, 1100);
        if (dom.jumpStatus) dom.jumpStatus.textContent = 'The helicopter turns for the drop zone';
    }
    function endJump(home) {
        if (!jump.on) return;
        jump.on = false; jump.close = false; jump.cardShown = false;
        document.body.classList.remove('ring-jumping');
        if (dom.jumpCard) dom.jumpCard.hidden = true;
        if (dom.jumpExit) dom.jumpExit.hidden = true;
        if (dom.alt) dom.alt.hidden = true;
        under.at = 0;
        updatePins(0);   // the helicopter's chip comes back now, not on the next frame, so the focus can land on it
        const a = document.activeElement;
        if (!a || a === document.body || (dom.jumpCard && dom.jumpCard.contains(a)) || a === dom.jumpExit) {
            const to = !heliPin.hidden ? heliPin : dom.lapBtn;
            if (to) to.focus({ preventScroll: true });
        }
        if (home) { const hv = homeView(); flyTo(hv.x, hv.z, hv.zoom); }
    }
    const SAY = { exit: 'Out on the skid, 13,500 feet', freefall: 'Freefall', cue: 'The wrist pulses: pull height, 4,000 feet', canopy: 'Canopy open', landed: 'Landed on the target' };
    function stepJump(dt, now) {
        if (!world.jump || !jump.on) return;
        const st = world.jump.state();
        /* the altimeter rides beside the diver while they are in the air */
        if (dom.alt) {
            const air = st.diver && st.phase !== 'landed' && st.phase !== 'run' && st.phase !== 'idle';
            dom.alt.hidden = !air;
            if (air) {
                const s = project(st.diver.x, st.diver.y, st.diver.z);
                dom.alt.style.transform = 'translate(' + (s[0] + 18).toFixed(1) + 'px,' + (s[1] - 10).toFixed(1) + 'px)';
                const t = fmtFt(st.alt); if (dom.altText.textContent !== t) dom.altText.textContent = t;
                dom.alt.classList.toggle('is-cue', !!st.cue && !st.pulled);
            }
        }
        if (dom.jumpStatus && st.phase !== jump.phase) {
            const say = st.phase === 'freefall' && st.cue ? SAY.cue : SAY[st.phase];
            if (say) dom.jumpStatus.textContent = say;
        }
        if (st.cue && !jump.cueSaid && dom.jumpStatus) { jump.cueSaid = true; dom.jumpStatus.textContent = SAY.cue; }
        jump.phase = st.phase;
        if (st.phase === 'landed') {
            if (!jump.landedAt) jump.landedAt = now;
            if (!jump.close && now - jump.landedAt > (reduced.matches ? 0 : 900)) {
                jump.close = true;
                const [x, z] = lifted(st.diver.x, st.diver.z, 2);
                flyTo(x, z, clamp(jump.shot.zoom * 1.5, 2.6, 4.2), () => showJumpCard(), 900);
            }
        }
    }
    function showJumpCard() {
        if (!jump.on || !dom.jumpCard || jump.cardShown) return;
        jump.cardShown = true;
        dom.jumpCard.hidden = false; under.at = 0;
        if (dom.jumpExit) dom.jumpExit.hidden = true;   // the card has its own Back to the map; the pill would only sit under it
        const first = dom.jumpCard.querySelector('a, button');
        if (first) first.focus({ preventScroll: true });
    }
    function jumpAgain() { endJump(false); startJump(); }

    /* ------------------------------------------------ the first-visit hint */
    /* one line under the HUD on load, gone after the first press or key or
       nine seconds, and not shown again on this device */
    const HINT_KEY = 'wada-ring-hint-2';
    const hint = { shown: false, timer: 0 };
    function showHint() {
        if (!dom.hint) return;
        if (store.get(HINT_KEY)) { dom.hint.hidden = true; return; }
        let coarse = false; try { coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { /* no media queries: the mouse copy stands */ }
        if (coarse) dom.hint.textContent = 'Tap a stop to open it, or the helicopter to jump.';   // a finger taps; the markup carries the mouse copy
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
                if (tour.on) endTour(false);
                interruptFly();
                const s = pinchState();
                if (pinch.d > 0) zoomAt(s.mx, s.my, s.d / pinch.d);
                panBy(s.mx - pinch.mx, s.my - pinch.my);
                pinch = s; return;
            }
            if (drag && e.pointerId === drag.id) {
                const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
                if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) {
                    if (!drag.moved && tour.on) endTour(false);   // a drag takes the camera back from the lap
                    drag.moved = true;
                }
                if (drag.moved) { interruptFly(); panBy(dx, dy); }
            }
            return;
        }
        if (e.pointerType === 'mouse' && e.target === canvas) {
            const id = pick(e.clientX, e.clientY);
            const stop = id === 'helicopter' ? null : id;
            if (stop !== hover || (id === 'helicopter') !== heliHot) { hover = stop; heliHot = id === 'helicopter'; canvas.classList.toggle('is-over', !!id); refreshStill(); }
        }
    });
    const up = e => {
        const was = ptrs.has(e.pointerId); ptrs.delete(e.pointerId);
        if (was && drag && e.pointerId === drag.id) {
            if (!drag.moved && performance.now() - drag.t0 < 600) {
                const id = drag.pin || pick(e.clientX, e.clientY);
                if (id === 'helicopter') startJump();
                else if (id) go(id);
                else if (open && !tour.on) close();
            }
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
        if (tour.on) endTour(false);
        interruptFly();
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0012)));
    }, { passive: false });

    /* ------------------------------------------------ keyboard */
    window.addEventListener('keydown', e => {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
        const tag = (e.target && e.target.tagName) || '';
        if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
        if (document.body.classList.contains('stage-open')) return;   // a case is on stage; its own keys apply
        hideHint();
        if (e.key === 'Escape') { if (jump.on) endJump(true); else if (tour.on) endTour(true); else if (open) close(); return; }
        if (open && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            if (tour.on) return;   // on the lap the arrows are the panel's own (a case grid scrolls); Next stop moves on
            const h = hopTargets(open); go(e.key === 'ArrowLeft' ? h.prev.id : h.next.id); e.preventDefault(); return;
        }
        if (open || tour.on || jump.on) return;
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
    /* Rows on the broadcast face above the mini-map: live timing of the
       simulated race. Positions reorder as cars pass on track, the last
       column is the gap to the leader, ticking; the head carries the
       leader's lap and the Los Angeles clock. Order and gaps are the
       world's, read every frame and written at ten a second; nothing on
       the page is fetched. Each row is a button that opens the stop its
       project lives in. */
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
    const rowHtml = (c, i) =>
        '<button type="button" class="ring-tower-row" data-id="' + c.id + '"' + (c.stop ? ' data-stop="' + c.stop + '"' : '') +
            ' style="--sig:' + (c.accent || '#c6a15b') + '">' +
            '<span class="ring-tower-pos">P' + (i + 1) + '</span><span class="ring-tower-code">' + c.code + '</span>' +
            '<span class="ring-tower-name">' + c.name + '</span><span class="ring-tower-num">' + c.number + '</span>' +
            '<span class="ring-tower-bar" aria-hidden="true"><i></i></span></button>';
    function buildRows(list) {
        const el = dom.tower;
        el.innerHTML = '<div class="ring-tower-head"><span>The grid</span><span class="ring-tower-meta"><span class="ring-tower-clock" id="ringTowerClock"></span><span class="ring-tower-lap" id="ringTowerLap">Lap 1</span></span></div>' +
            list.map(rowHtml).join('') +
            '<p class="ring-tower-foot" id="ringTowerFoot">Each car is a project. Open one and its car picks up pace.</p>';
        el.setAttribute('aria-label', 'The grid: live timing of the simulated race, ' + list.length + ' cars, one per project');
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
        if (key !== grid.key) buildRows(g);   // the field changed
        const order = g.map(x => x.id).join('>');
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
    if (dom.tourNext) dom.tourNext.addEventListener('click', nextStop);
    if (dom.tourLeave) dom.tourLeave.addEventListener('click', () => endTour(true));
    if (dom.jumpExit) dom.jumpExit.addEventListener('click', () => endJump(true));
    if (dom.jumpAgain) dom.jumpAgain.addEventListener('click', jumpAgain);
    if (dom.jumpHome) dom.jumpHome.addEventListener('click', () => endJump(true));
    /* on the lap, the panel holds the bar: hovering it pauses, working in it stops the clock until Next stop */
    dom.panel.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') tour.held = true; });
    dom.panel.addEventListener('pointerleave', () => { tour.held = false; });
    const stick = e => { if (tour.on && tour.phase === 'stop' && !(dom.panelClose && dom.panelClose.contains(e.target))) { tour.sticky = true; setTourBar(); } };
    dom.panel.addEventListener('pointerdown', stick, true);
    dom.panel.addEventListener('wheel', stick, { passive: true, capture: true });
    dom.panel.addEventListener('keydown', stick, true);
    dom.panel.addEventListener('touchmove', stick, { passive: true, capture: true });
    dom.panel.addEventListener('focusin', stick);   // Tab or a screen reader's cursor into the panel: the visitor is reading, the lap waits
    document.addEventListener('focusin', e => { if (pinOf(e.target) && pinOf(e.target) !== heliPin) { focus = pinOf(e.target).dataset.id; refreshStill(); } });
    document.addEventListener('focusout', e => { if (pinOf(e.target) && pinOf(e.target) !== heliPin) { focus = null; refreshStill(); } });
    dom.panelClose.addEventListener('click', close);
    if (dom.hopPrev) dom.hopPrev.addEventListener('click', () => go(dom.hopPrev.dataset.id));
    if (dom.hopNext) dom.hopNext.addEventListener('click', () => go(dom.hopNext.dataset.id));
    window.addEventListener('resize', () => { layoutShift(); settle(); });
    buildMap();
    hooks.push((dt) => {
        const now = performance.now();
        stepFly(now); stepTour(dt); stepJump(dt, now);
        /* a case sits on top of a stop, so it wins; they never double-count */
        if (caseOpen && world.attendCaseDwell) world.attendCaseDwell(caseOpen, dt);
        else if (open && world.attendDwell) world.attendDwell(open, dt);
        updatePins(dt); updateMap(); updateGrid();
    });
    layoutShift(); { const hv = homeView(); view.target.x = hv.x; view.target.z = hv.z; view.zoom = hv.zoom; } settle();
    showHint();

    return { go, close, startLap, endLap: endTour, endTour, nextStop, startJump, endJump, panBy, zoomAt, flyTo, FLY_MS, setGrid, attendCase, homeView,
             state: () => ({ open, lap: tour.on, tour: { on: tour.on, phase: tour.phase, i: tour.i, stop: tour.i >= 0 && tour.stops[tour.i] ? tour.stops[tour.i].id : null, left: +tour.left.toFixed(2), held: tour.held, sticky: tour.sticky, rel: +tour.rel.toFixed(1), stops: tour.stops.map(s => s.id) },
                 jump: { on: jump.on, phase: jump.phase, close: jump.close, card: jump.cardShown }, zoom: view.zoom, target: [view.target.x, view.target.z], hover, focus, flying: !!fly }) };
}
