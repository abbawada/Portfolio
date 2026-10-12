/* Wada Ring, the jump (round 7). Click the Betta helicopter and it flies
   its jump run to the drop zone on the lawn left of the court; the diver
   climbs out and hangs from the near skid, lets go, falls belly to earth,
   feels the pulse on the left wrist at 4,000 feet, pulls, and the canopy
   carries them down a spiral onto the middle of the target, where they
   stand and the canopy settles on the grass. It stays there, a record of
   the last jump, until the next one.

   The world owns the aircraft; this module only borrows it for the run
   (setHeliTask) and gives it back. One unit is about a metre at the toy
   scale of the aircraft: the diver stands about 3.1 tall, the canopy is 9
   wide. The altimeter reads 13,500 feet at the exit height and 0 on the
   grass, linearly, so 4,000 feet is a little under a third of the way up.

   createJump(env) -> { buildStatic(builder), start(), tick(dt, t), state(),
   heli(), cancel(), objects }. Nothing here reads the network. */
export function createJump(env) {
    'use strict';
    const { THREE, scene, L, heli, setHeliTask, heightAt, M, reduced, camDir } = env;
    const DZ = L.DZ;
    const TOP_FT = 13500, CUE_FT = 4000;
    const EXIT_Y = 64;                         // the jump run's height over the target, clear of every mark near the lawn
    const R0 = 9;                              // the canopy spirals in from this far out
    const DIR0 = (() => { const d = [-1, 0.35], k = Math.hypot(d[0], d[1]); return [d[0] / k, d[1] / k]; })();   // where the exit point sits from the target: up-left on screen, clear of the court
    const TURNS = 1.1;                         // the spiral's turns from the opening to the grass
    const DEPART = [-40, -40];                 // where the aircraft waits after the exit, from the target: straight up the screen, away from the camera
    const RUN_MAX = 6, RUN_NEAR = 1.6;         // the run gives up after this long; it counts as over the spot inside this
    const HANG_S = 0.6, TURN_S = 0.8;          // on the skid, then the turn from hanging to belly to earth
    const FF_V = 13.5, FF_RAMP = 1.0;          // units a second at full fall, reached after the ramp
    const CUE_SLOW = 0.35, PULL_AFTER = 0.6;   // the fall slows at the cue and the pull comes this long after it, so the canopy opens high enough to fly
    const OPEN_S = 1.05, CANOPY_S = 8.2, FLARE_S = 1.1;
    const STAND_S = 0.35, SETTLE_S = 1.2;
    const SCALE = 1.5;                         // the diver and the canopy at the aircraft's toy scale, big enough to follow down the whole drop
    const CY = 1.55 * SCALE, HANDS = 1.75 * SCALE;   // the body's centre over the feet, and the hands over the centre when they hang, in world units

    const ink = '#141414', gold = '#f0b64a', sky = '#8fd3ff', cream = '#efe6cf';
    const mat = {
        suit: new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: 0.6, flatShading: true }),
        rig: new THREE.MeshStandardMaterial({ color: '#1b1b1d', roughness: 0.7, flatShading: true }),
        glove: new THREE.MeshStandardMaterial({ color: '#121214', roughness: 0.8, flatShading: true }),
        gold: new THREE.MeshBasicMaterial({ color: gold, toneMapped: false }),
        sky: new THREE.MeshBasicMaterial({ color: sky, toneMapped: false }),
        cell: new THREE.MeshStandardMaterial({ color: cream, roughness: 0.62, flatShading: true, side: THREE.DoubleSide }),
        cellGold: new THREE.MeshStandardMaterial({ color: gold, roughness: 0.55, flatShading: true, side: THREE.DoubleSide, emissive: gold, emissiveIntensity: 0.12 }),
        line: new THREE.LineBasicMaterial({ color: '#4a4a4d', transparent: true, opacity: 0.9, toneMapped: false }),
        shadow: new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
        pulse: new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })
    };
    /* several geometries, each in one flat colour, as one mesh: positions and a colour per vertex */
    function mergeColored(list) {
        const pos = [], col = [], c = new THREE.Color();
        for (const [g0, hex] of list) {
            const g = g0.index ? g0.toNonIndexed() : g0, p = g.attributes.position.array;
            c.set(hex);
            for (let i = 0; i < p.length; i += 3) { pos.push(p[i], p[i + 1], p[i + 2]); col.push(c.r, c.g, c.b); }
        }
        const out = new THREE.BufferGeometry();
        out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        return out;
    }
    const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
    const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
    const backOut = t => { t = clamp(t, 0, 1); const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
    const lerp = (a, b, t) => a + (b - a) * t;

    /* ------------------------------------------------ the drop zone, on the static ground */
    const WIND = (() => {   // the canopy lands into the wind: its last heading, reversed, is where the sock points
        const th1 = Math.atan2(DIR0[1], DIR0[0]) + TURNS * Math.PI * 2;
        return [Math.cos(th1), Math.sin(th1)];
    })();
    let sock = null;
    function buildStatic(st) {
        if (!DZ) return;
        const ring = (r, y, color) => {
            const pts = []; for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; pts.push([DZ.at[0] + Math.cos(a) * r, DZ.at[1] + Math.sin(a) * r]); }
            st.poly(pts, y, color);
        };
        ring(DZ.r + 1.2, 0.032, '#e9e2d0');   // a pale apron round the target
        ring(DZ.r, 0.04, '#f7f5f0');
        ring(DZ.r * 0.74, 0.048, gold);
        ring(DZ.r * 0.5, 0.056, '#f7f5f0');
        ring(DZ.r * 0.22, 0.064, ink);
        /* the windsock: a graphite pole baked into the ground's mesh, and a sock in the SKY car's pale blue with a
           white tip, pointing downwind, as one two-colour mesh (the one piece here that moves) */
        st.geometry(new THREE.CylinderGeometry(0.16, 0.2, 7.2, 8), '#2a2b2e', new THREE.Matrix4().makeTranslation(DZ.sock[0], 3.6, DZ.sock[1]));
        const arm = new THREE.Group(); arm.position.set(DZ.sock[0], 7.0, DZ.sock[1]); arm.rotation.y = Math.atan2(-WIND[1], WIND[0]);
        const r90 = new THREE.Matrix4().makeRotationZ(-Math.PI / 2);
        const geo = mergeColored([
            [new THREE.CylinderGeometry(0.62, 0.48, 1.8, 12, 1, true).applyMatrix4(r90).translate(0.9, 0, 0), sky],
            [new THREE.CylinderGeometry(0.48, 0.3, 1.6, 12, 1, true).applyMatrix4(r90).translate(2.6, 0, 0), '#f7f5f0']
        ]);
        arm.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false })));
        sock = arm;
        scene.add(arm);
        /* its shadow and the target's soft edge come free with the plate; the pole casts a thin one */
        st.poly([[DZ.sock[0] - 0.2, DZ.sock[1]], [DZ.sock[0] + 0.2, DZ.sock[1]], [DZ.sock[0] + 5.6, DZ.sock[1] + 2.2], [DZ.sock[0] + 5.2, DZ.sock[1] + 2.3]], 0.07, '#a7ae93');
    }

    /* ------------------------------------------------ the diver */
    /* body frame: y up the spine, z out of the chest; the origin at the
       body's centre, so a turn from hanging to belly to earth pivots about
       the middle. Limbs hang from pivots at the shoulders and hips. */
    function capsule(r, len, m) { return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 8), m); }
    function limb(len, r, m, end, endR) {
        const pivot = new THREE.Group();
        const bone = capsule(r, len, m); bone.position.y = -(len / 2 + r * 0.6); pivot.add(bone);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(endR, 8, 6), end); tip.position.y = -(len + r * 1.2); pivot.add(tip);
        pivot.userData.tip = tip;
        return pivot;
    }
    function makeDiver() {
        const holder = new THREE.Group(), body = new THREE.Group();
        body.rotation.order = 'YXZ';
        holder.scale.setScalar(SCALE);
        holder.add(body);
        const y = v => v - CY / SCALE;   // model heights, feet at 0, to body coordinates (model units; the holder scales)
        const torso = capsule(0.42, 0.82, mat.suit); torso.position.y = y(1.78); body.add(torso);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 9), mat.rig); head.position.y = y(2.7); body.add(head);
        const strap = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.05, 5, 16), mat.sky); strap.rotation.x = Math.PI / 2; strap.position.y = y(2.72); body.add(strap);
        const rig = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.92, 0.32), mat.rig); rig.position.set(0, y(1.86), -0.44); body.add(rig);
        const seam = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 0.02), mat.gold); seam.position.set(0, y(1.86), -0.61); body.add(seam);
        const pins = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.04), mat.gold); pins.position.set(0, y(1.5), -0.6); body.add(pins);
        const armL = limb(0.86, 0.13, mat.suit, mat.glove, 0.15), armR = limb(0.86, 0.13, mat.suit, mat.glove, 0.15);
        armL.position.set(0.52, y(2.28), 0); armR.position.set(-0.52, y(2.28), 0); body.add(armL); body.add(armR);
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.06, 5, 12), mat.gold); band.position.y = -0.92; band.rotation.x = Math.PI / 2; armL.add(band);   // the instrument on the left wrist, where the pulse comes from
        const legL = limb(1.0, 0.16, mat.suit, mat.glove, 0.17), legR = limb(1.0, 0.16, mat.suit, mat.glove, 0.17);
        legL.position.set(0.22, y(1.3), 0); legR.position.set(-0.22, y(1.3), 0); body.add(legL); body.add(legR);
        return { holder, body, armL, armR, legL, legR, band };
    }
    /* the poses, as pivot angles: [armL.x, armL.z, legL.x, legL.z]; the right side mirrors z */
    const POSE = {
        hang:   [0.1, 2.95, 0.05, 0.06],
        arch:   [-0.55, 1.62, -0.6, 0.34],
        track:  [-0.2, 0.5, -0.1, 0.12],
        canopy: [0.15, 2.55, 0.12, 0.04],
        flare:  [0.35, 0.42, 0.55, 0.08],
        stand:  [0.02, 0.14, 0.0, 0.03]
    };
    const poseNow = [0, 0, 0, 0];
    function setPose(d, a, b, t) {
        const A = POSE[a], B = POSE[b || a];
        for (let i = 0; i < 4; i++) poseNow[i] = lerp(A[i], B[i], t || 0);
        d.armL.rotation.set(poseNow[0], 0, poseNow[1]); d.armR.rotation.set(poseNow[0], 0, -poseNow[1]);
        d.legL.rotation.set(poseNow[2], 0, poseNow[3]); d.legR.rotation.set(poseNow[2], 0, -poseNow[3]);
    }

    /* ------------------------------------------------ the canopy */
    /* seven cells on a shallow arc, cream with the centre cell gold, span
       along x, chord along z (the leading edge at +z); a small graphite
       pilot chute trails off the top while it opens */
    const SPAN = 9, CHORD = 3.1, THICK = 0.7, ARC_R = 12, CELLS = 7;
    function makeCanopy() {
        const g = new THREE.Group(); g.rotation.order = 'YXZ';
        const cells = [];
        for (let i = 0; i < CELLS; i++) {
            const a = (i - (CELLS - 1) / 2) / CELLS * (SPAN / ARC_R);
            const cell = new THREE.Mesh(new THREE.BoxGeometry(SPAN / CELLS * 1.03, THICK, CHORD), i === (CELLS - 1) / 2 ? mat.cellGold : mat.cell);
            cell.position.set(Math.sin(a) * ARC_R, (Math.cos(a) - 1) * ARC_R, 0); cell.rotation.z = -a;
            g.add(cell); cells.push(cell);
        }
        const pc = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 14), mat.rig); pc.position.set(0, 0.9, -CHORD * 0.9); g.add(pc);
        const pcRim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 4, 16), mat.gold); pcRim.rotation.x = Math.PI / 2; pc.add(pcRim);
        g.userData.pc = pc;
        return { g, cells };
    }
    /* the lines: from four points under the canopy to the shoulders, in world space */
    const LINE_N = 8, linePos = new Float32Array(LINE_N * 2 * 3);
    const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    const lines = new THREE.LineSegments(lineGeo, mat.line); lines.frustumCulled = false; lines.visible = false;

    /* ------------------------------------------------ the pulse on the wrist */
    const pulses = [];
    const FACE = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), camDir.clone().normalize());   // rings face the camera
    for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 5, 28), mat.pulse.clone());
        m.quaternion.copy(FACE); m.visible = false; m.frustumCulled = false; pulses.push(m);
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 18), mat.shadow); shadow.rotation.x = -Math.PI / 2; shadow.visible = false;

    let diver = null, canopy = null;
    function ensureRig() {
        if (diver) return;
        diver = makeDiver(); canopy = makeCanopy();
        diver.holder.add(canopy.g);
        scene.add(diver.holder); scene.add(lines); scene.add(shadow);
        for (const p of pulses) scene.add(p);
    }

    /* ------------------------------------------------ the sequence */
    const J = { phase: 'idle', t: 0, y: 0, x: 0, z: 0, vy: 0, cue: false, cueT: 0, pulled: false, pullAt: 0,
        exit: null, open: null, th0: 0, r0: R0, yOpen: 0, heading: 0, side: 1, skid: new THREE.Vector3() };
    const exitPoint = () => ({ x: DZ.at[0] + DIR0[0] * R0, y: EXIT_Y, z: DZ.at[1] + DIR0[1] * R0 });
    const altFt = () => clamp((J.y - CY) / ((J.top || EXIT_Y) - CY), 0, 1) * TOP_FT;   // 13,500 where the diver hangs from the skid, 0 on the grass

    function start() {
        if (!DZ) return false;
        if (J.phase !== 'idle' && J.phase !== 'landed') return false;
        ensureRig();
        J.exit = exitPoint();
        J.cue = false; J.cueT = 0; J.pulled = false; J.t = 0; J.vy = 0; J.top = 0;
        diver.holder.visible = false; lines.visible = false; shadow.visible = false;
        for (const p of pulses) p.visible = false;
        canopy.g.visible = false;
        if (reduced.matches) { land(true); return true; }
        J.phase = 'run';
        setHeliTask({ x: J.exit.x, z: J.exit.z, y: EXIT_Y, ease: 2.3, near: 30 });
        return true;
    }
    function cancel() {
        J.phase = 'idle'; setHeliTask(null);
        if (diver) { diver.holder.visible = false; lines.visible = false; shadow.visible = false; for (const p of pulses) p.visible = false; }
    }
    /* the near skid, in world space: whichever of the two is closer to the camera */
    const _a = new THREE.Vector3(), _b = new THREE.Vector3();
    function skidPoint(out) {
        heli.updateMatrixWorld(true);
        _a.set(0.5, -3.55, 2.42); heli.localToWorld(_a);
        _b.set(0.5, -3.55, -2.42); heli.localToWorld(_b);
        return out.copy(_a.dot(camDir) >= _b.dot(camDir) ? _a : _b);
    }
    function beginExit() {
        J.phase = 'exit'; J.t = 0; J.departed = false;
        diver.holder.visible = true; canopy.g.visible = false; lines.visible = false;
        diver.body.rotation.set(0, Math.atan2(camDir.x, camDir.z), 0);   // facing the camera on the skid
        setPose(diver, 'hang');
        skidPoint(J.skid);
        J.x = J.skid.x; J.z = J.skid.z; J.y = J.skid.y - HANDS;   // hands on the skid, body below it
        J.top = J.y;
    }
    function pull() {
        if (J.pulled) return;
        J.pulled = true; J.phase = 'open'; J.t = 0; J.yOpen = J.y;
        /* the spiral starts where the canopy opens, whatever the run left */
        const dx = J.x - DZ.at[0], dz = J.z - DZ.at[1];
        J.r0 = clamp(Math.hypot(dx, dz), 2, 26); J.th0 = Math.atan2(dz, dx);
        J.heading = diver.body.rotation.y;
        canopy.g.visible = true; lines.visible = true; mat.line.opacity = 0.9;
        canopy.g.userData.pc.visible = true;
    }
    function land(instant) {
        J.phase = 'landed'; J.t = instant ? 10 : 0;
        setHeliTask(null);   // the aircraft goes back to the race
        J.x = DZ.at[0]; J.z = DZ.at[1]; J.y = CY;
        diver.holder.visible = true; canopy.g.visible = true;
        diver.holder.position.set(J.x, J.y, J.z);
        if (instant || !J.heading) J.heading = Math.atan2(-WIND[0], -WIND[1]);   // into the wind, and the canopy below follows the same heading
        diver.body.rotation.set(0, J.heading, 0);
        setPose(diver, 'stand');
        if (instant) settleCanopy(1);
        for (const p of pulses) p.visible = false;
        shadow.visible = false;
    }
    /* the canopy settles on the grass behind the diver, flat, the lines slack */
    function settleCanopy(u) {
        const k = smooth(u), h = J.heading || 0, back = lerp(-0.4, 4.6, k);
        canopy.g.position.set(-Math.sin(h) * back, lerp(6.2, -CY / SCALE + 0.45, k), -Math.cos(h) * back);
        canopy.g.rotation.set(0, h, 0);
        canopy.g.scale.set(1, lerp(1, 0.35, k), lerp(1, 0.9, k));
        canopy.g.userData.pc.visible = false;
        lines.visible = k < 0.98;
        mat.line.opacity = 0.9 * (1 - k);
    }
    const _s1 = new THREE.Vector3(), _s2 = new THREE.Vector3(), _c = new THREE.Vector3();
    function updateLines() {
        if (!lines.visible) return;
        diver.holder.updateMatrixWorld(true);
        _s1.set(0.42, 2.25 - CY / SCALE, 0); diver.body.localToWorld(_s1);
        _s2.set(-0.42, 2.25 - CY / SCALE, 0); diver.body.localToWorld(_s2);
        let k = 0;
        for (const i of [0, 2, 4, 6]) for (const zz of [CHORD * 0.42, -CHORD * 0.25]) {
            const cell = canopy.cells[i];
            _c.set(0, -THICK / 2, zz); cell.localToWorld(_c);
            const sh = i < 3 ? _s2 : i > 3 ? _s1 : (zz > 0 ? _s1 : _s2);
            linePos.set([_c.x, _c.y, _c.z, sh.x, sh.y, sh.z], k * 6); k++;
        }
        lineGeo.attributes.position.needsUpdate = true;
    }
    function updatePulses(dt) {
        if (!J.cue || J.phase === 'landed' || J.phase === 'canopy') { for (const p of pulses) p.visible = false; return; }
        J.cueT += dt;
        diver.armL.userData.tip.getWorldPosition(_c);
        pulses.forEach((p, i) => {
            const u = (J.cueT - i * 0.22) / 0.8;
            p.visible = u > 0 && u < 1 && J.cueT < 2.2;
            if (!p.visible) return;
            p.position.copy(_c);
            const r = 0.3 + 2.4 * smooth(u); p.scale.set(r, r, r);
            p.material.opacity = 0.95 * (1 - u);
        });
    }
    function tick(dt, t) {
        if (sock) { sock.rotation.z = -0.12 + 0.05 * Math.sin(t * 2.3); sock.rotation.x = 0.06 * Math.sin(t * 3.1 + 1); }
        if (!diver || J.phase === 'idle') return;
        J.t += dt;
        switch (J.phase) {
            case 'run': {
                const h = heli.position, d = Math.hypot(h.x - J.exit.x, h.z - J.exit.z);
                if ((d < RUN_NEAR && Math.abs(h.y - EXIT_Y) < 1.5) || J.t > RUN_MAX) beginExit();
                break;
            }
            case 'exit': {
                if (J.t < HANG_S) {   // holding on: the body sways under the skid, which may still drift
                    skidPoint(J.skid);
                    J.x = J.skid.x; J.z = J.skid.z; J.y = J.skid.y - HANDS - 0.05 * Math.sin(J.t * 9);
                    diver.body.rotation.z = 0.08 * Math.sin(J.t * 6);
                } else {
                    if (!J.departed) {   // let go: the aircraft climbs away up the screen, out of the diver's line, and holds there until they land
                        J.departed = true;
                        setHeliTask({ x: DZ.at[0] + DEPART[0], z: DZ.at[1] + DEPART[1], y: EXIT_Y + 16, ease: 0.8, near: 999 });
                    }
                    const u = (J.t - HANG_S) / TURN_S;
                    J.vy = FF_V * smooth((J.t - HANG_S) / FF_RAMP);
                    J.y -= J.vy * dt;
                    diver.body.rotation.x = lerp(0, Math.PI / 2, smooth(u));
                    diver.body.rotation.z = 0.35 * Math.sin(u * 5) * (1 - smooth(u));   // one roll as the body turns
                    setPose(diver, 'hang', 'arch', smooth(u));
                    if (u >= 1) { J.phase = 'freefall'; J.t = 0; }
                }
                break;
            }
            case 'freefall': {
                const slow = J.cue ? lerp(1, CUE_SLOW, smooth(J.cueT / 0.5)) : 1;
                J.vy = FF_V * slow;
                J.y -= J.vy * dt;
                diver.body.rotation.x = Math.PI / 2;
                diver.body.rotation.z = 0.05 * Math.sin(J.t * 2.4);
                diver.body.rotation.y += 0.25 * dt;   // a slow turn on the fall line
                setPose(diver, 'arch');
                if (!J.cue && altFt() <= CUE_FT) { J.cue = true; J.cueT = 0; }
                if (J.cue && J.cueT >= PULL_AFTER) { setPose(diver, 'arch', 'track', 0.5); pull(); }
                break;
            }
            case 'open': {
                const u = J.t / OPEN_S;
                const vCan = (J.yOpen - CY) / CANOPY_S;
                J.vy = lerp(FF_V * CUE_SLOW, vCan, smooth((J.t - 0.35) / 0.5));
                J.y -= J.vy * dt;
                const pc = canopy.g.userData.pc; pc.visible = u < 0.55;
                const inflate = backOut((u - 0.25) / 0.75), h = J.heading, fwd = lerp(-1.6, 0.4, smooth(u));
                canopy.g.position.set(Math.sin(h) * fwd, lerp(1.2, 6.2, smooth(u / 0.5)), Math.cos(h) * fwd);
                canopy.g.scale.set(Math.max(0.08, inflate), lerp(0.4, 1, smooth((u - 0.25) / 0.6)), lerp(0.5, 1, smooth((u - 0.2) / 0.6)));
                canopy.g.rotation.set(0, h, 0);
                diver.body.rotation.x = lerp(Math.PI / 2, 0.05, smooth((u - 0.3) / 0.55));   // the snatch: belly to earth to upright
                setPose(diver, 'track', 'canopy', smooth((u - 0.3) / 0.6));
                if (u >= 1) { J.phase = 'canopy'; J.t = 0; J.yOpen = J.y; }
                break;
            }
            case 'canopy': {
                const u = clamp(J.t / CANOPY_S, 0, 1);
                const R = J.r0 * Math.pow(1 - u, 1.05), th = J.th0 + TURNS * Math.PI * 2 * u;
                const nx = DZ.at[0] + Math.cos(th) * R, nz = DZ.at[1] + Math.sin(th) * R;
                const vx = (nx - J.x) / Math.max(dt, 1e-4), vz = (nz - J.z) / Math.max(dt, 1e-4);
                J.x = nx; J.z = nz;
                J.y = lerp(J.yOpen, CY, u < 0.86 ? u / 0.86 * 0.9 : 0.9 + (u - 0.86) / 0.14 * 0.1);
                if (Math.hypot(vx, vz) > 0.2) {   // turn onto the spiral's heading, never in one frame
                    let d = Math.atan2(vx, vz) - J.heading;
                    while (d > Math.PI) d -= Math.PI * 2;
                    while (d < -Math.PI) d += Math.PI * 2;
                    J.heading += d * Math.min(1, dt * 3);
                }
                const flare = clamp((J.t - (CANOPY_S - FLARE_S)) / FLARE_S, 0, 1);
                const bank = 0.22 * (1 - smooth(flare));   // into the turn
                diver.body.rotation.set(0.05, J.heading, -bank);
                canopy.g.position.set(Math.sin(J.heading) * 0.4, 6.2, Math.cos(J.heading) * 0.4);
                canopy.g.rotation.set(-0.3 * smooth(flare), J.heading, -bank * 0.6);
                setPose(diver, 'canopy', 'flare', smooth(flare));
                if (u >= 1) land(false);
                break;
            }
            case 'landed': {
                const st = smooth(J.t / STAND_S);
                setPose(diver, 'flare', 'stand', st);
                diver.body.rotation.x = 0; diver.body.rotation.z = 0;
                if (J.t < SETTLE_S + 0.2) settleCanopy(J.t / SETTLE_S);
                break;
            }
        }
        if (J.phase !== 'run') {
            diver.holder.position.set(J.x, J.y, J.z);
            /* the shadow closes in over the last stretch of the fall */
            const hgt = J.y - CY;
            shadow.visible = J.phase !== 'landed' && hgt < 22;
            if (shadow.visible) {
                const a = clamp(1 - hgt / 22, 0, 1);
                shadow.position.set(J.x + 0.5 * hgt * 0.15, 0.1, J.z + 0.2 * hgt * 0.15);
                const r = J.pulled ? 2.6 : 1.4; shadow.scale.set(r * (0.6 + 0.4 * a), r * 0.5 * (0.6 + 0.4 * a), 1);
                mat.shadow.opacity = 0.2 * a;
            }
            updatePulses(dt);
            updateLines();
        }
    }
    function state() {
        const d = diver && diver.holder.visible ? { x: J.x, y: J.y, z: J.z } : null;
        return { phase: J.phase, alt: J.phase === 'run' ? TOP_FT : altFt(), cue: J.cue, pulled: J.pulled, diver: d,
                 exit: J.exit || exitPoint(), dz: { x: DZ.at[0], z: DZ.at[1] }, t: J.t };
    }
    return { buildStatic, start, tick, state, cancel, heli: () => ({ x: heli.position.x, y: heli.position.y, z: heli.position.z }), EXIT_Y };
}
