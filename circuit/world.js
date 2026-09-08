/* Wada Ring, the world. V1.1 material pass.
   Builds the diorama from circuit/layout.js: matte ground with baked flat
   shading, one shadow mesh, candy translucent shells for the buildings and
   trees with opaque internals inside the hero objects, seven stop groups
   that can lift, and the ambient elements (the car and the start flag). Orthographic camera at 45 degrees azimuth,
   30 degrees elevation, the 2:1 look of the flat map.
   The build runs in stages on separate tasks so a slow phone keeps its
   main thread free; shaders compile off the main thread where the browser
   allows it. mount() returns at once; the scene fills in behind it. */
import * as THREE from './vendor/three.module.min.js';

export function mount(canvas, L) {
    'use strict';
    const C = L.PALETTE;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* ------------------------------------------------ colour and light */
    const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, '0')).join(''); };
    const shade = (h, t) => mix(h, C.ink, t);
    const LIGHT = new THREE.Vector3(-0.3, 1, 0.55).normalize();
    const SHADOW = [0.85, 0.3];   // plan direction a shadow falls per unit of height
    const tintCache = new Map();
    function tint(nx, ny, nz, base) {
        const d = (nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z) / LIGHT.y;
        const t = Math.round(34 * (1 - Math.max(0, Math.min(1, d)))) / 100;
        const key = base + t;
        let c = tintCache.get(key);
        if (!c) { c = shade(base, t); tintCache.set(key, c); }
        return c;
    }
    const tone = t => C[t] || t;
    const rgbCache = new Map(), _col = new THREE.Color();
    function rgb(color) {
        let c = rgbCache.get(color);
        if (!c) { _col.set(color); c = [_col.r, _col.g, _col.b]; rgbCache.set(color, c); }
        return c;
    }

    /* ------------------------------------------------ geometry builder */
    class Builder {
        /* plain: no baked colour, the material lights it (the candy shells) */
        constructor(plain) { this.pos = []; this.col = []; this.plain = !!plain; }
        tri(a, b, c, color) {
            this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
            if (this.plain) return;
            const k = rgb(color);
            this.col.push(k[0], k[1], k[2], k[0], k[1], k[2], k[0], k[1], k[2]);
        }
        quad(a, b, c, d, color) { this.tri(a, b, c, color); this.tri(a, c, d, color); }
        /* plan box: x from u, z from v, y from z0. Faces tinted by normal. */
        box(u, v, w, d, h, z0, t, topTone) {
            const base = tone(t), z1 = z0 + h, top = topTone ? tone(topTone) : base;
            this.quad([u, z1, v], [u, z1, v + d], [u + w, z1, v + d], [u + w, z1, v], top);
            this.quad([u + w, z0, v], [u + w, z1, v], [u + w, z1, v + d], [u + w, z0, v + d], tint(1, 0, 0, base));
            this.quad([u, z0, v + d], [u + w, z0, v + d], [u + w, z1, v + d], [u, z1, v + d], tint(0, 0, 1, base));
            this.quad([u, z0, v], [u, z0, v + d], [u, z1, v + d], [u, z1, v], tint(-1, 0, 0, base));
            this.quad([u, z0, v], [u, z1, v], [u + w, z1, v], [u + w, z0, v], tint(0, 0, -1, base));
        }
        poly(pts, y, color) {
            const tris = THREE.ShapeUtils.triangulateShape(pts.map(p => new THREE.Vector2(p[0], p[1])), []);
            for (const t of tris) this.tri([pts[t[0]][0], y, pts[t[0]][1]], [pts[t[1]][0], y, pts[t[1]][1]], [pts[t[2]][0], y, pts[t[2]][1]], color);
        }
        ribbon(left, right, y, color, closed) {
            const n = left.length;
            for (let i = 0; i < (closed ? n : n - 1); i++) {
                const j = (i + 1) % n;
                this.quad([left[i][0], y, left[i][1]], [right[i][0], y, right[i][1]], [right[j][0], y, right[j][1]], [left[j][0], y, left[j][1]], color);
            }
        }
        /* a thin painted line along a plan polyline */
        stroke(pts, width, y, color) {
            for (let i = 0; i < pts.length - 1; i++) {
                const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
                const nx = -dz / len * width / 2, nz = dx / len * width / 2;
                this.quad([a[0] + nx, y, a[1] + nz], [b[0] + nx, y, b[1] + nz], [b[0] - nx, y, b[1] - nz], [a[0] - nx, y, a[1] - nz], color);
            }
        }
        /* merge any BufferGeometry, flat colour tinted per face */
        geometry(geom, color, matrix) {
            const g = geom.index ? geom.toNonIndexed() : geom, p = g.attributes.position;
            const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), e = new THREE.Vector3();
            for (let i = 0; i < p.count; i += 3) {
                a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
                if (matrix) { a.applyMatrix4(matrix); b.applyMatrix4(matrix); c.applyMatrix4(matrix); }
                n.subVectors(b, a).cross(e.subVectors(c, a)).normalize();
                this.tri([a.x, a.y, a.z], [b.x, b.y, b.z], [c.x, c.y, c.z], tint(n.x, n.y, n.z, color));
            }
        }
        build() {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
            if (this.plain) g.computeVertexNormals();
            else g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
            return g;
        }
    }
    function hull(points) {
        const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const lo = [], up = [];
        for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
        for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
        return lo.slice(0, -1).concat(up.slice(0, -1));
    }
    const flat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false });
    const shadowMat = new THREE.MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    /* V1.1 material pass: candy translucent plastic. A transmissive shell
       with a soft internal tint; the ground and track stay matte so the
       candy pops against calm. One hero colour family per district. */
    const candy = (color, atten, o) => new THREE.MeshPhysicalMaterial(Object.assign({
        color, transmission: 0.9, thickness: 5, roughness: 0.2, ior: 1.45,
        attenuationColor: atten, attenuationDistance: 9, flatShading: true,
        envMapIntensity: 1.1, specularIntensity: 0.9, side: THREE.FrontSide
    }, o || {}));
    const M = {
        gold: candy('#ead6a3', '#c6a15b'),           // pit garage: Betta gold
        green: candy('#9fe0b3', '#3fa565'),          // the Exchange
        cardinal: candy('#e07a7f', '#990000'),       // campus corner
        media: candy('#dfe6ec', '#9aa8b4'),          // media district: cool shell, neon inside
        grey: candy('#c9d0d6', '#7c8791'),           // pit lane and the neutral set
        sage: candy('#b9d1a8', '#6f8f63', { transmission: 0.7, roughness: 0.4, thickness: 3 }),   // trees
        white: candy('#eceff2', '#aeb6bc'),          // the blimp
        smoke: candy('#aab1b7', '#3a3f45', { thickness: 2.5, roughness: 0.12, transmission: 0.94 }),   // the sleeve monument, graphite iMac
        chrome: new THREE.MeshStandardMaterial({ color: '#e9eaec', metalness: 1, roughness: 0.08, envMapIntensity: 1.6 }),   // the visor
        graphite: new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: 0.55, metalness: 0.35, flatShading: true }),
        neon: {}
    };
    for (const [k, v] of Object.entries({ cyan: '#3ad7e6', magenta: '#ff4f9d', gold: '#f0b64a', lime: '#a4ec5c', green: '#42d67a' })) {
        M.neon[k] = new THREE.MeshBasicMaterial({ color: v, toneMapped: false });
    }
    const DISTRICT = { about: M.media, betta: null, education: M.cardinal, economics: M.green, writing: M.media, projects: M.gold, contact: M.grey };
    /* the tower's internals, boards, details and Rep are placed relative to its box (V1.2) */
    const TOWER = L.LOCATIONS.find(l => l.id === 'about').boxes[0], TU = TOWER[0], TV = TOWER[1];

    /* ------------------------------------------------ scene, camera */
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(C.paper, 1);
    renderer.toneMapping = THREE.NeutralToneMapping;
    if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = (window.devicePixelRatio || 1) > 1.5 ? 0.5 : 1;
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
    const DIR = new THREE.Vector3(Math.cos(Math.PI / 6) * Math.SQRT1_2, Math.sin(Math.PI / 6), Math.cos(Math.PI / 6) * Math.SQRT1_2);
    const view = { target: new THREE.Vector3(105, 2, 105), width: 318, zoom: 1, shiftPx: 0 };
    function fit() {
        const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1, aspect = w / h;
        const vw = Math.max(view.width, 200 * aspect) / view.zoom, vh = vw / aspect;
        const off = (view.shiftPx || 0) * (vh / h);   // portrait: the world sits lower, under the timing block
        camera.left = -vw / 2; camera.right = vw / 2; camera.top = vh / 2 + off; camera.bottom = -vh / 2 + off;
        camera.position.copy(view.target).addScaledVector(DIR, 600);
        camera.lookAt(view.target);
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
    }

    /* one light from the upper left, matching the baked shadows, a soft sky,
       and a small studio environment for the candy highlights */
    scene.add(new THREE.HemisphereLight('#f7f5f0', '#9aa38c', 0.9));
    const sun = new THREE.DirectionalLight('#ffffff', 2.4); sun.position.copy(LIGHT).multiplyScalar(100); scene.add(sun);
    {
        const studio = new THREE.Scene();
        studio.add(new THREE.Mesh(new THREE.SphereGeometry(60, 16, 12), new THREE.MeshBasicMaterial({ color: '#efece5', side: THREE.BackSide })));
        const soft = new THREE.Mesh(new THREE.PlaneGeometry(50, 30), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
        soft.position.set(-15, 40, 25); soft.lookAt(0, 0, 0); studio.add(soft);
        const rim = new THREE.Mesh(new THREE.PlaneGeometry(10, 40), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
        rim.position.set(45, 20, -30); rim.lookAt(0, 0, 0); studio.add(rim);
        const pm = new THREE.PMREMGenerator(renderer);
        scene.environment = pm.fromScene(studio, 0.05).texture;
        scene.environmentIntensity = 0.9;
        pm.dispose();
    }

    /* the seven stop groups exist at once so the navigation can attach;
       their geometry arrives in the build stages below */
    const groups = {}, hits = [];
    for (const loc of L.LOCATIONS) { const g = new THREE.Group(); g.userData.id = loc.id; scene.add(g); groups[loc.id] = g; }

    /* the track frames are cheap and the navigation needs them at once */
    const samples = L.sample(L.TRACK, 24, true), fr = L.frames(samples, true), rib = L.ribbon(fr, L.TRACK_WIDTH);
    const n = fr.length, lap = fr.length_;

    const st = new Builder(), sh = new Builder(), gb = new Builder(true), lb = {}, guts = {};
    for (const loc of L.LOCATIONS) { lb[loc.id] = new Builder(!!DISTRICT[loc.id]); guts[loc.id] = []; }
    const car = new THREE.Group(), blimp = new THREE.Group();
    let ticker = null, flagGeom = null, flagBase = null, scopeGeom = null, scopePos = null, glow = null, blimpShadow = null, built = false;

    /* ------------------------------------------------ stage A: ground and track */
    function buildGround() {
        st.box(0, 0, 210, 210, 5, -5, 'plate', 'grass');
        const slab = (s, y) => st.poly([[s[0], s[1]], [s[0] + s[2], s[1]], [s[0] + s[2], s[1] + s[3]], [s[0], s[1] + s[3]]], y, C.plate);
        for (const g of L.GRAVEL) st.poly(g, 0.03, C.plate);
        slab(L.PADDOCK.slab, 0.03); slab(L.CARPARK.slab, 0.03);

        st.ribbon(rib.left, rib.right, 0.06, C.asphalt, true);
        const inset = (side, w) => fr.map(f => [f.p[0] + f.n[0] * side * w, f.p[1] + f.n[1] * side * w]);
        st.ribbon(rib.left, inset(1, L.TRACK_WIDTH / 2 - 0.45), 0.09, C.paper, true);
        st.ribbon(inset(-1, L.TRACK_WIDTH / 2 - 0.45), rib.right, 0.09, C.paper, true);

        const campusA = L.nearest(fr, [186, 142]), campusB = L.nearest(fr, [178, 86]);
        for (let i = 0; i < n; i += 2) {
            if (Math.abs(fr[i].k) < 0.045) continue;
            const j = (i + 2) % n, campus = i >= campusA && i <= campusB;
            const pair = campus ? [C.cardinal, C.campusGold] : [C.ink, C.paper];
            const col = pair[Math.floor(i / 2) % 2];
            for (const side of [1, -1]) {
                const hw = L.TRACK_WIDTH / 2;
                const e0 = [fr[i].p[0] + fr[i].n[0] * side * hw, fr[i].p[1] + fr[i].n[1] * side * hw];
                const e1 = [fr[j].p[0] + fr[j].n[0] * side * hw, fr[j].p[1] + fr[j].n[1] * side * hw];
                const i0 = [e0[0] - fr[i].n[0] * side * 1.1, e0[1] - fr[i].n[1] * side * 1.1];
                const i1 = [e1[0] - fr[j].n[0] * side * 1.1, e1[1] - fr[j].n[1] * side * 1.1];
                st.quad([e0[0], 0.12, e0[1]], [e1[0], 0.12, e1[1]], [i1[0], 0.12, i1[1]], [i0[0], 0.12, i0[1]], col);
            }
        }
        {   // the start and finish line
            const f = fr[L.nearest(fr, [L.START.u, L.START.v])], cells = 6, cw = L.TRACK_WIDTH / cells, rh = 0.9;
            for (let r = 0; r < 2; r++) for (let c = 0; c < cells; c++) {
                const a = -L.TRACK_WIDTH / 2 + c * cw, b = a + cw, s0 = (r - 1) * rh, s1 = s0 + rh;
                const q = [[a, s0], [b, s0], [b, s1], [a, s1]].map(([nn, tt]) => [f.p[0] + f.n[0] * nn + f.t[0] * tt, 0.13, f.p[1] + f.n[1] * nn + f.t[1] * tt]);
                st.quad(q[0], q[1], q[2], q[3], (r + c) % 2 ? C.ink : C.paper);
            }
        }
        {   // pit lane
            const ps = L.sample(L.PIT, 16, false), pf = L.frames(ps, false), pr = L.ribbon(pf, L.PIT_WIDTH);
            st.ribbon(pr.left, pr.right, 0.05, mix(C.asphalt, C.paper, 0.18), false);
            st.stroke(pr.left, 0.35, 0.08, C.paper); st.stroke(pr.right, 0.35, 0.08, C.paper);
        }
    }

    /* ------------------------------------------------ stage B: the buildings, the stops */
    function groundBox(b, into) {
        (into || st).box(b[0], b[1], b[2], b[3], b[4], b[5], b[6]);
        if (b[5] === 0 && b[4] > 1) {
            const [u, v, w, d, h] = b, off = [SHADOW[0] * h * 0.9, SHADOW[1] * h * 0.9];
            const foot = [[u, v], [u + w, v], [u + w, v + d], [u, v + d]];
            sh.poly(hull(foot.concat(foot.map(p => [p[0] + off[0], p[1] + off[1]]))), 0.04, C.ink);
        }
    }
    /* fold a group's still meshes into one mesh per material; textured
       planes and anything marked keep stay as they are */
    function mergeStatic(g) {
        g.updateMatrixWorld(true);
        const buckets = new Map(), gone = [];
        g.traverse(o => {
            if (!o.isMesh || o.isInstancedMesh || o.userData.keep || o.material.map) return;
            const key = o.material.uuid;
            if (!buckets.has(key)) buckets.set(key, { mat: o.material, pos: [], nor: [], n: 0 });
            const b = buckets.get(key);
            const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
            b.pos.push(geo.attributes.position.array); b.nor.push(geo.attributes.normal ? geo.attributes.normal.array : null); b.n += geo.attributes.position.count;
            gone.push(o);
        });
        for (const o of gone) o.parent.remove(o);
        for (const b of buckets.values()) {
            const pos = new Float32Array(b.n * 3), nor = new Float32Array(b.n * 3); let off = 0;
            b.pos.forEach((arr, i) => { pos.set(arr, off); if (b.nor[i]) nor.set(b.nor[i], off); off += arr.length; });
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
            if (b.nor.some(x => !x)) geo.computeVertexNormals();
            g.add(new THREE.Mesh(geo, b.mat));
        }
    }
    /* an opaque piece that lives inside a translucent shell */
    function gut(id, mesh) { guts[id].push(mesh); }
    function gutBox(id, u, v, w, d, h, z0, mat) {
        const b = new Builder(true); b.box(u, v, w, d, h, z0, 'x');
        const m = new THREE.Mesh(b.build(), mat); gut(id, m); return m;
    }
    function buildStops() {
        for (const loc of L.LOCATIONS) for (const b of loc.boxes) groundBox(b, lb[loc.id]);
        for (const b of L.GRANDSTAND) groundBox(b, gb);
        for (const b of L.PADDOCK.haulers) groundBox(b, gb);
        for (const b of L.BILLBOARDS) {
            groundBox(b, gb);
            const horizontal = b[2] > b[3];
            const posts = horizontal ? [[b[0] + 0.6, b[1]], [b[0] + b[2] - 1.1, b[1]]] : [[b[0], b[1] + 0.6], [b[0], b[1] + b[3] - 1.1]];
            for (const p of posts) gb.box(p[0], p[1], 0.5, 0.5, b[5], 0, 'roof');
        }
        L.CARPARK.cars.forEach((c) => gb.box(c[0], c[1], c[2], c[3], 0.8, 0, 'wall'));
        st.box(99.8, 183.8, 0.4, 0.4, 7.2, 0, 'ink');                        // the flag pole
        {   // the garage: the open bay reads as a dark mouth, the bench and the scope inside
            const g = L.LOCATIONS.find(l => l.id === 'projects').boxes[0], zf = g[1] + g[3];
            const mouth = new Builder(true);
            mouth.quad([96, 0.02, zf + 0.02], [104, 0.02, zf + 0.02], [104, 5.6, zf + 0.02], [96, 5.6, zf + 0.02], 'x');
            gut('projects', new THREE.Mesh(mouth.build(), M.graphite));
            gutBox('projects', 100.6, zf - 1.2, 2.6, 1.1, 1.3, 0, M.graphite);              // the workbench
            gutBox('projects', 74, 151.2, 52, 0.4, 0.5, 5.4, M.neon.gold);                   // a light bar along the back wall
            gutBox('projects', 78, 154, 10, 4, 1.2, 0, M.graphite);                          // the electronics bench inside
            gutBox('projects', 112, 154, 10, 4, 1.2, 0, M.graphite);
        }
        {   // the Exchange: a ticker mechanism inside the green shell
            gutBox('economics', 3.5, 39, 13, 1.2, 1.2, 4, M.graphite); gutBox('economics', 3.5, 47.8, 13, 1.2, 1.2, 8, M.graphite);   // rollers
            gutBox('economics', 4.5, 43.4, 11, 0.3, 4.4, 4.6, M.neon.green);                // the tape
            const gear = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.35, 6, 12), M.graphite); gear.position.set(10, 9.8, 44); gut('economics', gear);
        }
        {   // the tower: broadcast internals in neon, a core and stacked rings
            gutBox('about', TU + 2.1, TV + 2.1, 0.8, 0.8, 33, 0.5, M.graphite);
            const ring = new THREE.TorusGeometry(1.7, 0.22, 6, 14), names = ['cyan', 'magenta', 'gold', 'lime', 'cyan', 'magenta'];
            names.forEach((nm, i) => { const r = new THREE.Mesh(ring, M.neon[nm]); r.rotation.x = Math.PI / 2; r.position.set(TU + 2.5, 5 + i * 5, TV + 2.5); gut('about', r); });
            gutBox('about', TU + 1.3, TV + 1.3, 2.4, 2.4, 1.2, 35, M.neon.cyan);                    // the head's transmitter
        }
        {   // the press room: one magenta tube inside
            gutBox('writing', 3, 102.5, 8, 0.5, 0.5, 3.2, M.neon.magenta);
        }
        {   // court markings, hoops, the ball frozen mid-arc
            const b = lb.betta;
            const c = L.LOCATIONS.find(l => l.id === 'betta').boxes[0];
            const u0 = c[0], v0 = c[1], w = c[2], d = c[3], y = c[4] + 0.04;
            b.stroke([[u0 + 1, v0 + 1], [u0 + w - 1, v0 + 1], [u0 + w - 1, v0 + d - 1], [u0 + 1, v0 + d - 1], [u0 + 1, v0 + 1]], 0.4, y, C.paper);
            b.stroke([[u0 + w / 2, v0 + 1], [u0 + w / 2, v0 + d - 1]], 0.4, y, C.paper);
            const arc = (cu, dir) => { const a = []; for (let k = 0; k <= 16; k++) { const t = -Math.PI / 2 + k / 16 * Math.PI; a.push([cu + Math.cos(t) * 6 * dir, v0 + d / 2 + Math.sin(t) * 6]); } return a; };
            b.stroke(arc(u0 + 1, 1), 0.4, y, C.paper); b.stroke(arc(u0 + w - 1, -1), 0.4, y, C.paper);
            b.box(u0 + 1.6, v0 + 7, 0.2, 2.0, 1.2, 3.0, 'paper'); b.box(u0 + w - 1.8, v0 + 7, 0.2, 2.0, 1.2, 3.0, 'paper');
            const ring = new THREE.TorusGeometry(0.45, 0.07, 5, 12), m = new THREE.Matrix4();
            for (const x of [u0 + 2.3, u0 + w - 2.3]) b.geometry(ring, C.accent, m.makeRotationX(Math.PI / 2).setPosition(x, 3.2, v0 + 8));
            b.geometry(new THREE.SphereGeometry(0.75, 8, 6), C.accent, new THREE.Matrix4().makeTranslation(u0 + 8, 3.6, v0 + 9.5));
        }
        buildArena();
        buildSleeve();
        buildSignage();
        buildMascot();
        buildDetails();
        buildBarriers();
        /* each stop is its own group so it can lift on approach; a hit box on
           layer 1 (never drawn) gives the pointer something generous to find */
        for (const loc of L.LOCATIONS) {
            const g = groups[loc.id];
            for (const m of guts[loc.id]) g.add(m);
            mergeStatic(g);
            g.add(new THREE.Mesh(lb[loc.id].build(), DISTRICT[loc.id] || flat));
            const bb = new THREE.Box3().setFromObject(g), size = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3());
            const top = Math.max(size.y, 5, loc.labelZ + 3);   // V1.2: the hit area covers the mesh and the label above it
            const hit = new THREE.Mesh(new THREE.BoxGeometry(size.x + 4, top + 2, size.z + 4), flat);
            hit.position.set(ctr.x, top / 2, ctr.z); hit.layers.set(1); hit.userData.id = loc.id;
            g.add(hit); hits.push(hit);
        }
    }

    /* ------------------------------------------------ the arena round the court (V1.2, section 4) */
    /* Betta is the centre of gravity: the largest footprint on the plate, the
       tallest silhouette, the brightest ground. A lit apron, gold candy stands
       with a neon rail, three floodlights, and the scoreboard pylon at the
       back corner, its shell lit from a gold core, BETTA in dots on the head. */
    function shadowOf(u, v, w, d, h) {
        const off = [SHADOW[0] * h * 0.9, SHADOW[1] * h * 0.9];
        const foot = [[u, v], [u + w, v], [u + w, v + d], [u, v + d]];
        sh.poly(hull(foot.concat(foot.map(p => [p[0] + off[0], p[1] + off[1]]))), 0.04, C.ink);
    }
    function buildArena() {
        const A = L.LOCATIONS.find(l => l.id === 'betta').arena;
        const [au, av, aw, ad] = A.apron;
        st.poly([[au, av], [au + aw, av], [au + aw, av + ad], [au, av + ad]], 0.03, mix(C.plate, C.paper, 0.55));   // the lit apron
        for (const sd of A.stands) {   // three stepped tiers, the top rail in neon gold
            const [u, v, w, d, kind] = sd, steps = 3;
            for (let i = 0; i < steps; i++) {
                const t = d / steps, h = 1.6 * (i + 1);
                if (kind === 'back') gutBox('betta', u, v + i * t, w, t, h, 0, M.gold);
                else if (kind === 'front') gutBox('betta', u, v + (steps - 1 - i) * t, w, t, h, 0, M.gold);
                else gutBox('betta', u + i * (w / steps), v, w / steps, d, 1.6 * (steps - i), 0, M.gold);
            }
            if (kind === 'back') gutBox('betta', u, v + d - 0.5, w, 0.3, 0.3, 4.8, M.neon.gold);
            else if (kind === 'front') gutBox('betta', u, v + 0.2, w, 0.3, 0.3, 4.8, M.neon.gold);
            else gutBox('betta', u + 0.2, v, 0.3, d, 0.3, 4.8, M.neon.gold);
            shadowOf(u, v, w, d, 4.8);
        }
        for (const [lu, lv] of A.lights) {   // floodlight masts with a lit head turned to the court
            gutBox('betta', lu - 0.3, lv - 0.3, 0.6, 0.6, A.lightH, 0, M.graphite);
            const toward = lv < av + ad / 2 ? 1 : -1;
            gutBox('betta', lu - 1.4, lv + (toward > 0 ? 0.2 : -1.4), 2.8, 1.2, 1.6, A.lightH - 1.2, M.neon.gold);
            gutBox('betta', lu - 1.6, lv + (toward > 0 ? 0.1 : -1.5), 3.2, 0.2, 2.0, A.lightH - 1.4, M.graphite);
            shadowOf(lu - 0.3, lv - 0.3, 0.6, 0.6, A.lightH);
        }
        {   // the pylon: a gold shell round a neon core, the scoreboard head on top
            const [pu, pv, pw, pd, ph] = A.pylon, [hu, hv, hw, hd, hh, hz] = A.head;
            gutBox('betta', pu, pv, pw, pd, ph, 0, M.gold);
            gutBox('betta', pu + pw / 2 - 0.6, pv + pd / 2 - 0.6, 1.2, 1.2, ph - 1, 0.5, M.neon.gold);
            gutBox('betta', hu, hv, hw, hd, hh, hz, M.gold);
            gutBox('betta', hu + 0.8, hv + 0.8, hw - 1.6, hd - 1.6, hh - 1.6, hz + 0.8, M.graphite);
            const big = bigText('BETTA', 3);
            dotSign('betta', dotBoard(96, 27, [{ bitmap: big, col: 3, row: 3, color: NEON.gold, colors: { '#': NEON.gold } }]), hw - 0.8, hh - 0.8, [hu + hw / 2, hz + hh / 2, hv + hd + 0.03]);
            shadowOf(pu, pv, pw, pd, ph);
        }
    }
    /* the 5x7 dot glyphs scaled up k times, as a bitmap for a big sign */
    function bigText(text, k) {
        const rows = [];
        for (let y = 0; y < 7; y++) {
            let line = '';
            for (const ch of text.toUpperCase()) { const g = DOTFONT[ch] || DOTFONT[' ']; for (const b of g[y]) line += (b === '#' ? '#' : '.').repeat(k); line += '.'.repeat(k); }
            for (let r = 0; r < k; r++) rows.push(line);
        }
        return rows;
    }

    /* ------------------------------------------------ the sleeve monument (V1.1 Part 2) */
    let shimmer = null, sleeve = null;
    const SLEEVE_AT = [66, 157], SLEEVE_N = 30, SLEEVE_SIDES = 12;
    const sleeveRadius = t => 4.0 * (1 - t) + 2.5 * t + 0.3 * Math.exp(-Math.pow((t - 0.5) / 0.12, 2));
    function buildSleeve() {
        const curve = new THREE.CatmullRomCurve3([[0, 0, 0], [0, 4.5, 0], [0.6, 8.5, 0], [3.2, 12.2, 0.6], [7.2, 15.2, 1.4], [10.2, 16.4, 1.9]].map(a => new THREE.Vector3(a[0], a[1], a[2])), false, 'catmullrom', 0.5);
        const P = [], T = [], Nn = [], B = [];
        let normal = new THREE.Vector3(1, 0, 0);
        for (let i = 0; i <= SLEEVE_N; i++) {
            const t = i / SLEEVE_N, pt = curve.getPoint(t), tan = curve.getTangent(t).normalize();
            normal = normal.clone().sub(tan.clone().multiplyScalar(normal.dot(tan))).normalize();
            P.push(pt); T.push(tan); Nn.push(normal); B.push(new THREE.Vector3().crossVectors(tan, normal).normalize());
        }
        sleeve = { P, T, N: Nn, B, curve };
        const v3 = q => [q.x, q.y, q.z];
        const ring = i => { const out = [], r = sleeveRadius(i / SLEEVE_N); for (let k = 0; k < SLEEVE_SIDES; k++) { const a = k / SLEEVE_SIDES * Math.PI * 2; out.push(P[i].clone().addScaledVector(Nn[i], Math.cos(a) * r).addScaledVector(B[i], Math.sin(a) * r)); } return out; };
        const shell = new Builder(true);
        let prev = ring(0);
        for (let i = 1; i <= SLEEVE_N; i++) {
            const cur = ring(i);
            for (let k = 0; k < SLEEVE_SIDES; k++) { const k2 = (k + 1) % SLEEVE_SIDES; shell.quad(v3(prev[k]), v3(prev[k2]), v3(cur[k2]), v3(cur[k]), 'x'); }
            prev = cur;
        }
        const mon = new THREE.Group();
        mon.position.set(SLEEVE_AT[0], 2.6, SLEEVE_AT[1]); mon.rotation.y = Math.PI / 4;
        const frameAt = t => {   // a basis at parameter t: x along N, y along T, z along B
            const i = Math.min(SLEEVE_N - 1, Math.floor(t * SLEEVE_N)), f = t * SLEEVE_N - i;
            const lerp = (arr) => arr[i].clone().lerp(arr[i + 1], f);
            const pos = lerp(P), tan = lerp(T).normalize(), n = lerp(Nn).normalize(), b = new THREE.Vector3().crossVectors(tan, n).normalize();
            const m = new THREE.Matrix4().makeBasis(n, tan, b);
            return { pos, quat: new THREE.Quaternion().setFromRotationMatrix(m), r: sleeveRadius(t), n, tan, b };
        };
        /* internals first, so they read through the shell: harness, battery, two IMUs with a gold LED, the wrist motor */
        const inner = [];
        for (let i = 2; i <= SLEEVE_N - 2; i++) inner.push(P[i].clone());
        const harness = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(inner), 20, 0.42, 6, false), M.graphite);
        mon.add(harness);
        const place = (mesh, t, side, lift) => { const f = frameAt(t); mesh.position.copy(f.pos).addScaledVector(f.b, side * (f.r - lift)); mesh.quaternion.copy(f.quat); mon.add(mesh); return mesh; };
        place(new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 0.7), M.graphite), 0.14, 0.45, 2.2);
        for (const t of [0.38, 0.86]) {
            const imu = place(new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.5), M.graphite), t, 0.5, 1.6);
            const led = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.2), M.neon.gold); led.position.set(0.2, 0.3, 0.3); imu.add(led);
        }
        place(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 8), M.graphite), 0.94, 0.4, 1.4);
        for (const t of [0.24, 0.5, 0.66]) place(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.15), M.neon.gold), t, 0.7, 0.9);
        /* the shell, then three pods on the outer arm like the render */
        mon.add(new THREE.Mesh(shell.build(), M.smoke));
        for (const t of [0.22, 0.5, 0.78]) {
            const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.75, 2.0, 3, 8), M.grey);
            const f = frameAt(t);
            pod.position.copy(f.pos).addScaledVector(f.b, f.r - 0.25);
            pod.quaternion.copy(f.quat); pod.scale.set(1, 1, 0.5); mon.add(pod);
        }
        /* one slow shimmer along the sleeve: a soft band riding the surface */
        shimmer = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.4, 16, 1, true),
            new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
        shimmer.userData.keep = true; mon.add(shimmer);
        /* the stand: a graphite disc and post, and a matte plinth on the ground */
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.4, 0.7, 16), M.graphite); disc.position.set(SLEEVE_AT[0], 0.35, SLEEVE_AT[1]);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2.2, 8), M.graphite); post.position.set(SLEEVE_AT[0], 1.8, SLEEVE_AT[1]);
        guts.projects.push(disc, post, mon);
        st.poly([[59, 150], [73, 150], [73, 164], [59, 164]], 0.03, C.plate);
        sh.poly([[61, 152], [71, 152], [76, 155], [76, 166], [66, 166], [61, 163]], 0.04, C.ink);
    }
    function shimmerAt(t) {
        if (!shimmer || !sleeve) return;
        const i = Math.min(SLEEVE_N - 1, Math.floor(t * SLEEVE_N)), f = t * SLEEVE_N - i;
        const pos = sleeve.P[i].clone().lerp(sleeve.P[i + 1], f), tan = sleeve.T[i].clone().lerp(sleeve.T[i + 1], f).normalize();
        const n = sleeve.N[i].clone().lerp(sleeve.N[i + 1], f).normalize(), b = new THREE.Vector3().crossVectors(tan, n).normalize();
        shimmer.position.copy(pos); shimmer.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(n, tan, b));
        const r = sleeveRadius(t) + 0.12; shimmer.scale.set(r, 1, r);
        shimmer.material.opacity = 0.26 * Math.sin(Math.PI * t);
    }

    /* ------------------------------------------------ the signage district (V1.1 Part 3) */
    /* Dot-matrix neon boards round the tower, in the Osaka style, every
       mark his: Betta, the circuit name, his tools, his projects, one joke.
       Boards are canvases of round dots on black; one board flickers. */
    const DOTFONT = {
        A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'], B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
        C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'], D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
        E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'], F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
        G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.####'], H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
        I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'], J: ['....#', '....#', '....#', '....#', '#...#', '#...#', '.###.'],
        K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'], L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
        M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'], N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
        O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
        Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'], R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
        S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'], T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
        U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'], V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
        W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'], X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
        Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'], Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
        0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'], 1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
        2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'], 3: ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
        4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'], 5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
        6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'], 7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
        8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'], 9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
        ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'], '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
        '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'], '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..']
    };
    const SHOOTER = [   // a jump shot, the sleeve arm in gold, the ball white
        '..............oo', '..............oo', '............gg..', '...........gg...', '......##..gg....', '.....####.g.....',
        '.....####gg.....', '......##.g......', '.....####.......', '....######......', '...##.####......', '..##..####......',
        '.##...####......', '......####......', '......####......', '.....##.##......', '....##...##.....', '...##.....##....',
        '..##.......##...', '.##.........##..', '.##..........##.', '##............##', '##............##'
    ];
    const NEON = { cyan: '#3ad7e6', magenta: '#ff4f9d', gold: '#f0b64a', lime: '#a4ec5c', white: '#f4f2ee' };
    function dotBoard(cols, rows, items, cell) {
        cell = cell || 10;
        const grid = new Array(cols * rows).fill(null);
        const put = (col, row, color) => { if (col >= 0 && col < cols && row >= 0 && row < rows) grid[row * cols + col] = color; };
        for (const it of items) {
            if (it.bitmap) { it.bitmap.forEach((line, y) => { [...line].forEach((ch, x) => { if (ch !== '.') put(it.col + x, it.row + y, it.colors[ch] || it.color); }); }); continue; }
            let c = it.col;
            for (const ch of it.text.toUpperCase()) { const g = DOTFONT[ch] || DOTFONT[' ']; g.forEach((line, y) => { [...line].forEach((b, x) => { if (b === '#') put(c + x, it.row + y, it.color); }); }); c += 6; }
        }
        const render = (dimSeed) => {
            const cv = document.createElement('canvas'); cv.width = cols * cell; cv.height = rows * cell;
            const ctx = cv.getContext('2d'); ctx.fillStyle = '#0b0b0c'; ctx.fillRect(0, 0, cv.width, cv.height);
            let seed = dimSeed || 0;
            const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
            for (let i = 0; i < grid.length; i++) {
                const x = (i % cols) * cell + cell / 2, y = Math.floor(i / cols) * cell + cell / 2;
                const lit = grid[i];
                ctx.beginPath(); ctx.arc(x, y, cell * (lit ? 0.42 : 0.18), 0, Math.PI * 2);
                ctx.fillStyle = lit ? (dimSeed && rnd() < 0.06 ? '#3a3a3c' : lit) : '#1c1c1e'; ctx.fill();
            }
            const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
        };
        return { render, w: cols * cell, h: rows * cell };
    }
    const flickerBoards = [];
    function dotSign(stop, spec, w, h, pos, rotY, flicker) {
        const frames = flicker ? [spec.render(0), spec.render(7), spec.render(19)] : [spec.render(0)];
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: frames[0], toneMapped: false }));
        m.position.set(pos[0], pos[1], pos[2]); if (rotY) m.rotation.y = rotY;
        guts[stop].push(m);
        if (flicker) flickerBoards.push({ mesh: m, frames, i: 0, next: 0 });
        return m;
    }
    function buildSignage() {
        const board = (spec, w, h, pos, rotY, flicker) => dotSign('about', spec, w, h, pos, rotY, flicker);
        const frame = (u, v, w, d, h, z0) => gutBox('about', u, v, w, d, h, z0, M.graphite);
        /* V1.2: the three boards stack on one wall right of the tower, the
           Osaka density in a third of the old width, so the media district
           keeps to its own zone and the garage label has clear air */
        const SU = TU - 20, SV = TV + 7, SF = TV + 7.73;   // the stack: left of the tower, a step in front of it, and its face
        const posts = (v, h) => { for (const u of [SU + 1, SU + 13.5, SU + 17]) gutBox('about', u, v, 0.5, 0.5, h, 0, M.graphite); };
        posts(SV + 0.1, 26);
        /* A: the shooter and BETTA, the big one at the foot of the stack */
        frame(SU, SV, 14, 0.7, 9, 6);
        board(dotBoard(56, 36, [
            { bitmap: SHOOTER, col: 2, row: 6, color: NEON.cyan, colors: { '#': NEON.cyan, g: NEON.gold, o: NEON.white } },
            { text: 'BETTA', col: 22, row: 3, color: NEON.gold }, { text: 'FEEL', col: 22, row: 12, color: NEON.cyan },
            { text: 'EVERY', col: 22, row: 20, color: NEON.magenta }, { text: 'REP', col: 22, row: 28, color: NEON.white }
        ]), 14, 9, [SU + 7, 10.5, SF]);
        /* D: three projects, the wide board above it */
        frame(SU, SV, 18, 0.7, 5.6, 15);
        board(dotBoard(90, 28, [
            { text: 'POSTURE CUE', col: 3, row: 2, color: NEON.cyan }, { text: 'VISUAL MAPPING', col: 3, row: 11, color: NEON.gold },
            { text: 'BLUETOOTH CAR', col: 3, row: 20, color: NEON.magenta }
        ]), 18, 5.6, [SU + 9, 17.8, SF]);
        /* E: the stat and the tap on top; this one flickers */
        frame(SU, SV, 16, 0.7, 5.6, 20.6);
        board(dotBoard(80, 28, [
            { text: 'TOP 4 OF 221', col: 4, row: 2, color: NEON.gold }, { text: 'A TAP ON', col: 4, row: 11, color: NEON.white },
            { text: 'THE WRIST', col: 4, row: 20, color: NEON.cyan }
        ]), 16, 5.6, [SU + 8, 23.4, SF], 0, true);
        /* B: the circuit name down the tower's right face, one letter under the next */
        const nameItems = [...'WADA RING'].map((ch, i) => ({ text: ch, col: 1, row: 1 + i * 8, color: i < 4 ? NEON.gold : NEON.white }));
        board(dotBoard(7, 74, nameItems), 2.4, 25.4, [TU + 5.06, 20, TV + 1.5], Math.PI / 2);
        /* C: his tools on the tower's front face */
        board(dotBoard(20, 26, [
            { text: 'C++', col: 1, row: 1, color: NEON.lime }, { text: 'IMU', col: 1, row: 9, color: NEON.cyan }, { text: 'SQL', col: 1, row: 17, color: NEON.magenta }
        ]), 4.6, 6, [TU + 2.5, 8.5, TV + 5.06]);
    }
    function flickerStep(t) {
        for (const b of flickerBoards) {
            if (t < b.next) continue;
            b.i = (b.i + 1 + Math.floor(Math.random() * 2)) % b.frames.length;
            b.mesh.material.map = b.frames[b.i]; b.mesh.material.needsUpdate = true;
            b.next = t + 0.25 + Math.random() * 0.6;
        }
    }

    /* ------------------------------------------------ toy details per stop and the barriers (V1.1 Part 6) */
    function gutMesh(id, geom, mat, pos, rot, scale) {
        const m = new THREE.Mesh(geom, mat); m.position.set(pos[0], pos[1], pos[2]);
        if (rot) m.rotation.set(rot[0], rot[1], rot[2]); if (scale) m.scale.set(scale[0], scale[1], scale[2]);
        guts[id].push(m); return m;
    }
    function buildDetails() {
        /* 01 the tower: a satellite dish on the head, a coil of cable at the base */
        gutMesh('about', new THREE.SphereGeometry(2.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.media, [TU - 1.5, 40.2, TV - 0.5], [Math.PI, 0.7, 0], [1, 0.7, 1]);
        gutMesh('about', new THREE.CylinderGeometry(0.18, 0.18, 2.2, 6), M.graphite, [TU - 1.5, 40.6, TV - 0.5], [0.5, 0, 0.6]);
        for (let i = 0; i < 3; i++) gutMesh('about', new THREE.TorusGeometry(1.4, 0.22, 6, 18), M.graphite, [TU + 8, 0.3 + i * 0.45, TV + 6], [Math.PI / 2, 0, 0]);
        /* 02 the court: a rack of three gold balls, a bench with a folded sleeve on it */
        gutBox('betta', 101.5, 96.3, 0.3, 0.3, 2.6, 0, M.graphite); gutBox('betta', 106.2, 96.3, 0.3, 0.3, 2.6, 0, M.graphite);
        gutBox('betta', 101.5, 96.2, 5, 0.5, 0.25, 1.2, M.graphite);
        for (const x of [102.5, 104, 105.5]) gutMesh('betta', new THREE.SphereGeometry(0.62, 10, 8, 0, Math.PI * 2, 0, Math.PI), M.gold, [x, 2.05, 96.45]);
        gutBox('betta', 126, 96, 4.4, 1.2, 0.25, 1.0, M.graphite); gutBox('betta', 126.2, 96.2, 0.3, 0.3, 1, 0, M.graphite); gutBox('betta', 130.1, 96.9, 0.3, 0.3, 1, 0, M.graphite);
        gutMesh('betta', new THREE.TorusGeometry(0.75, 0.42, 7, 14), M.smoke, [128.2, 1.65, 96.6], [Math.PI / 2, 0, 0]);
        /* 03 campus: a stack of books, a mortarboard with a gold tassel */
        gutBox('education', 193, 98.5, 2.6, 1.8, 0.45, 1.0, M.cardinal); gutBox('education', 193.3, 98.3, 2.4, 1.9, 0.4, 1.45, M.gold); gutBox('education', 193.1, 98.6, 2.5, 1.7, 0.45, 1.85, M.cardinal);
        gutMesh('education', new THREE.CylinderGeometry(0.7, 0.8, 1.0, 10), M.graphite, [193.8, 1.5, 125.5]);
        gutBox('education', 192.6, 124.3, 2.4, 2.4, 0.16, 2.0, M.graphite);
        gutBox('education', 194.9, 125.4, 0.12, 0.12, 1.4, 0.9, M.neon.gold);
        /* 04 the Exchange: a vault door on the side wall, a stack of coins by it */
        gutMesh('economics', new THREE.CylinderGeometry(3.2, 3.2, 0.5, 20), M.green, [18.3, 6, 46], [0, 0, Math.PI / 2]);
        gutMesh('economics', new THREE.TorusGeometry(1.4, 0.18, 6, 18), M.graphite, [18.6, 6, 46], [0, Math.PI / 2, 0]);
        for (let i = 0; i < 3; i++) gutMesh('economics', new THREE.BoxGeometry(0.16, 2.8, 0.16), M.graphite, [18.62, 6, 46], [i * Math.PI / 3, 0, 0]);
        for (let i = 0; i < 6; i++) gutMesh('economics', new THREE.CylinderGeometry(1.1, 1.1, 0.28, 14), M.gold, [21.5 + (i % 2) * 0.15, 0.14 + i * 0.3, 55]);
        /* 05 the press room: a stack of paper with a pen, a paper box at the corner */
        gutBox('writing', 13.2, 99.5, 2.2, 3, 0.9, 0, M.white);
        gutMesh('writing', new THREE.CylinderGeometry(0.1, 0.1, 2.2, 6), M.graphite, [14.3, 1.02, 101], [Math.PI / 2, 0, 0.5]);
        gutBox('writing', 12.6, 109, 1.3, 1.6, 1.3, 0, M.grey); gutBox('writing', 12.5, 108.9, 1.5, 1.8, 0.2, 1.3, M.graphite);
        /* 06 the garage: a tyre stack on gold rims, a tool chest */
        for (let i = 0; i < 4; i++) { gutMesh('projects', new THREE.TorusGeometry(1.1, 0.45, 7, 16), M.graphite, [132.5, 0.5 + i * 0.9, 159], [Math.PI / 2, 0, 0]); gutMesh('projects', new THREE.CylinderGeometry(0.65, 0.65, 0.5, 10), M.gold, [132.5, 0.5 + i * 0.9, 159]); }
        gutBox('projects', 134.5, 154.5, 2.6, 1.6, 1.6, 0, M.gold);
        for (let i = 0; i < 3; i++) gutBox('projects', 134.7, 156.11, 2.2, 0.08, 0.12, 0.3 + i * 0.45, M.graphite);
        /* 07 the pit wall: a headset, the chrome-visor helmet at rest by the board */
        gutMesh('contact', new THREE.TorusGeometry(0.5, 0.09, 6, 16, Math.PI), M.graphite, [70, 2.3, 171.7], [0, 0, 0]);
        gutBox('contact', 69.35, 171.45, 0.35, 0.5, 0.4, 2.0, M.graphite); gutBox('contact', 70.3, 171.45, 0.35, 0.5, 0.4, 2.0, M.graphite);
        gutMesh('contact', new THREE.SphereGeometry(0.95, 18, 14), M.chrome, [112, 2.75, 171.7]);
        gutBox('contact', 111.4, 171.9, 1.2, 0.8, 0.5, 1.9, M.graphite);
        gutBox('contact', 111.95, 171.2, 0.1, 1.1, 0.55, 2.9, M.gold);
    }
    /* low barrier walls with his marks in type: the pit straight, the hairpin, the back straight */
    const BARRIERS = [
        { box: [52, 185.4, 44, 0.6, 2.2, 0], face: 'v', text: 'WADA RING   ·   BETTA   ·   WADA RING' },
        { box: [104, 185.4, 46, 0.6, 2.2, 0], face: 'v', text: 'FEEL EVERY REP   ·   AWUS   ·   TOP 4 OF 221' },
        { box: [3.4, 56, 0.6, 28, 2.2, 0], face: 'u', text: 'BETTA   ·   BETTA' },
        { box: [50, 36.4, 30, 0.6, 2.2, 0], face: 'v', text: 'AWUS   ·   WADA RING' }
    ];
    function buildBarriers() { for (const b of BARRIERS) gb.box(b.box[0], b.box[1], b.box[2], b.box[3], b.box[4], b.box[5], 'x'); }
    function barrierText() {
        for (const b of BARRIERS) {
            const [u, v, w, d, h] = b.box;
            const tex = textTexture(b.text, { w: 2048, h: 128, font: 'italic 700 78px ' + CHAKRA, fill: C.ink, spacing: '6px' });
            if (b.face === 'v') textPlane(tex, w - 1, h - 0.5, [u + w / 2, h / 2, v + d + 0.02]);
            else textPlane(tex, d - 1, h - 0.5, [u + w + 0.02, h / 2, v + d / 2], Math.PI / 2);
        }
    }

    /* ------------------------------------------------ the mascot: Rep (V1.1 Part 5) */
    /* A basketball that shoots with the sleeve on, picked from three
       concepts on 2026-09-08. Gold candy ball with graphite seams, dot
       eyes, stubby legs, one arm in the smoky sleeve raised in the
       follow-through. It lives in three places: a statue on the lawn
       beside the court, on the tower head, and on the pit wall by the flag. */
    function mascotRep() {
        const g = new THREE.Group();
        const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), M.gold); ball.position.y = 1.35; g.add(ball);
        for (const rot of [[0, 0, 0], [0, Math.PI / 2, 0], [Math.PI / 2, 0, 0]]) {
            const seam = new THREE.Mesh(new THREE.TorusGeometry(1.01, 0.045, 5, 40), M.graphite);
            seam.rotation.set(rot[0], rot[1], rot[2]); seam.position.y = 1.35; g.add(seam);
        }
        for (const x of [-0.3, 0.3]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), M.graphite); eye.position.set(x, 1.65, 0.93); g.add(eye); }
        for (const x of [-0.42, 0.42]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 3, 8), M.graphite); leg.position.set(x, 0.4, 0); g.add(leg); }
        const arm = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.2, 6, 14, Math.PI * 0.55), M.smoke);
        arm.position.set(0.75, 1.6, 0); arm.rotation.z = -0.2; g.add(arm);
        const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 2, 6), M.grey); pod.position.set(1.42, 2.15, 0.16); pod.rotation.z = 0.9; g.add(pod);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), M.gold); hand.position.set(1.05, 2.9, 0); g.add(hand);
        const other = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.7, 3, 8), M.gold); other.position.set(-1.05, 1.0, 0.1); other.rotation.z = 0.35; g.add(other);
        return g;
    }
    const REP_AT = L.LOCATIONS.find(l => l.id === 'betta').arena.rep;
    const REP_SPOTS = [
        { at: [REP_AT[0], 0.7, REP_AT[1]], scale: 2.6, yaw: Math.PI / 4, stop: 'betta' },     // the statue on the lawn beside the court
        { at: [TU + 2.5, 45.2, TV + 2.5], scale: 1.8, yaw: Math.PI / 4, stop: 'about' },  // on the tower head
        { at: [86, 1.8, 171.7], scale: 0.75, yaw: Math.PI / 4, stop: 'contact' }   // on the pit wall by the flag
    ];
    let repFigure = null;
    function buildMascot() {
        for (const sp of REP_SPOTS) {
            const g = mascotRep(); g.position.set(sp.at[0], sp.at[1], sp.at[2]); g.scale.setScalar(sp.scale); g.rotation.y = sp.yaw;
            guts[sp.stop].push(g);
            if (!repFigure) repFigure = g;
        }
        const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.5, 0.7, 16), M.graphite); plinth.position.set(REP_AT[0], 0.35, REP_AT[1]);
        guts.betta.push(plinth);
        const [ru, rv] = REP_AT;
        sh.poly([[ru - 3, rv - 2], [ru + 4, rv - 2], [ru + 9, rv], [ru + 9, rv + 4], [ru + 2, rv + 4], [ru - 3, rv + 2]], 0.04, C.ink);
    }

    /* ------------------------------------------------ stage C: shadows, trees, the static mesh */
    function buildScenery() {
        for (const t of L.TREES) {
            const r = t[2] * 0.42, pts = [];
            for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; pts.push([t[0] + t[2] * 0.5 + Math.cos(a) * r * 1.1, t[1] + t[2] * 0.18 + Math.sin(a) * r * 0.75]); }
            sh.poly(pts, 0.045, C.ink);
        }
        scene.add(new THREE.Mesh(st.build(), flat));
        scene.add(new THREE.Mesh(sh.build(), shadowMat));
        scene.add(new THREE.Mesh(gb.build(), M.grey));
        const tb = new Builder(true);
        tb.geometry(new THREE.ConeGeometry(2.4, 4.8, 5, 1, true), 'x', new THREE.Matrix4().makeTranslation(0, 3.6, 0));
        tb.box(-0.3, -0.3, 0.6, 0.6, 1.3, 0, 'x');
        const trees = new THREE.InstancedMesh(tb.build(), M.sage, L.TREES.length), o = new THREE.Object3D();
        L.TREES.forEach((t, i) => {
            o.position.set(t[0], 0, t[1]); o.rotation.y = (i * 2.399) % (Math.PI * 2); o.scale.setScalar(t[2] / 6);
            o.updateMatrix(); trees.setMatrixAt(i, o.matrix);
        });
        scene.add(trees);
    }

    /* ------------------------------------------------ stage D: the five ambient elements */
    function poseAt(s) {
        s = ((s % lap) + lap) % lap;
        let lo = 0, hi = n - 1;
        while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (fr[mid].s <= s) lo = mid; else hi = mid - 1; }
        const a = fr[lo], b = fr[(lo + 1) % n], span = (lo === n - 1 ? lap : b.s) - a.s, t = span > 0 ? (s - a.s) / span : 0;
        return { x: a.p[0] + (b.p[0] - a.p[0]) * t, z: a.p[1] + (b.p[1] - a.p[1]) * t, tx: a.t[0] + (b.t[0] - a.t[0]) * t, tz: a.t[1] + (b.t[1] - a.t[1]) * t, k: a.k };
    }
    const startS = fr[L.nearest(fr, [L.START.u, L.START.v])].s;
    let carS = startS - 6;
    function placeCar(s) { const p = poseAt(s); car.position.set(p.x, 0, p.z); car.rotation.y = Math.atan2(-p.tz, p.tx); return p; }
    /* V1.1 Part 4: the race. Three cars in district colours, one per repo;
       standings.json (built from trailing 30-day commit counts, never
       fetched client-side) decides who laps, in what order, and how far
       apart. A repo with no activity parks its car in the pit lane. */
    const cars = [];
    const CAR_SHELL = { gold: () => M.gold, media: () => M.media, green: () => M.green };
    function makeCar(district, number) {
        const g = new THREE.Group();
        const shell = new Builder(true), dark = new Builder();
        shell.box(-1.3, -0.55, 2.6, 1.1, 0.55, 0.3, 'x');
        shell.box(1.3, -0.3, 0.8, 0.6, 0.35, 0.35, 'x');
        shell.box(-1.9, -0.8, 0.5, 1.6, 0.15, 1.0, 'x');
        shell.box(1.9, -0.9, 0.4, 1.8, 0.15, 0.25, 'x');
        dark.box(-0.9, -0.35, 1.2, 0.7, 0.5, 0.85, 'ink');
        for (const x of [1.15, -1.25]) for (const z of [-0.95, 0.55]) dark.box(x - 0.35, z, 0.7, 0.4, 0.7, 0, 'ink');
        dark.box(-0.9, -0.14, 1.2, 0.08, 0.06, 1.35, 'accent');
        dark.box(-0.9, 0.06, 1.2, 0.08, 0.06, 1.35, 'wood');
        g.add(new THREE.Mesh(dark.build(), flat));
        g.add(new THREE.Mesh(shell.build(), (CAR_SHELL[district] || CAR_SHELL.gold)()));
        const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 10), shadowMat);
        shadow.rotation.x = -Math.PI / 2; shadow.scale.set(2.2, 1.2, 1); shadow.position.set(0.5, 0.11, 0.3); g.add(shadow);
        g.userData.number = number;
        return g;
    }
    const PIT_BOXES = [[94, 166], [108, 166], [122, 166]];
    function placeAt(g, s, lane) {
        const p = poseAt(s);
        const nx = p.tz, nz = -p.tx;   // the left normal in plan
        g.position.set(p.x + nx * lane, 0, p.z + nz * lane); g.rotation.y = Math.atan2(-p.tz, p.tx);
        return p;
    }
    let raceS = startS - 6;
    function setStandings(data) {
        for (const c of cars) scene.remove(c.group);
        cars.length = 0;
        if (car.parent) scene.remove(car);
        const list = data && data.cars ? data.cars.slice() : [];
        const order = data && data.order ? data.order : list.map(c => c.id);
        list.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
        const numbers = { betta: '10', media: '23', exchange: '4' };
        let prevCommits = null, prevGap = 0, rank = 0, parked = 0;
        list.forEach((c) => {
            const lapping = (c.commits || 0) > 0;
            const g = makeCar(c.district, numbers[c.id] || '');
            scene.add(g);
            const entry = { id: c.id, group: g, lapping, commits: c.commits || 0, lane: 0, gap: 0, swap: 0, name: c.name };
            if (lapping) {
                const gap = rank === 0 ? 0 : Math.min(40, prevGap + 8 + 2 * Math.max(0, prevCommits - entry.commits));
                entry.gap = gap; entry.swap = rank === 1 ? gap * 1.3 : gap * 0.6;   // P2 gets a mid-lap look at the lead, P3 closes in
                entry.lane = [0, 2.4, -2.4][rank] || 0;   // three lanes inside a 9-wide track, cars 1.8 wide: side by side, never touching
                prevCommits = entry.commits; prevGap = gap; rank++;
            } else {
                const box = PIT_BOXES[parked++] || PIT_BOXES[0];
                g.position.set(box[0], 0, box[1]); g.rotation.y = 0;   // parked in the pit lane, nose along it
            }
            cars.push(entry);
        });
        placeCars(raceS);
        if (fontsLoaded) numberCars();
        if (!running) render();
    }
    function placeCars(sL) {
        const rel = sL - startS;
        for (const c of cars) {
            if (!c.lapping) continue;
            const off = -c.gap + c.swap * Math.sin(Math.PI * 2 * rel / lap);
            placeAt(c.group, sL + off, c.lane);
        }
    }
    let fontsLoaded = false;
    function numberCars() {
        for (const c of cars) {
            if (c.group.userData.plated || !c.group.userData.number) continue;
            const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), new THREE.MeshBasicMaterial({ map: textTexture(c.group.userData.number, { w: 128, h: 96, font: 'italic 700 72px ' + CHAKRA, fill: C.ink, bg: C.paper }), side: THREE.DoubleSide, toneMapped: false }));
            plate.position.set(1.7, 0.72, 0); plate.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); c.group.add(plate);
            c.group.userData.plated = true;
        }
    }
    const BY = L.BLIMP.at[2];
    function placeBlimp(t) {
        const a = t * Math.PI * 2 / 140, x = 130 + Math.cos(a) * 20, z = 30 + Math.sin(a) * 10;
        blimp.position.set(x, BY, z); blimp.rotation.y = Math.atan2(-Math.cos(a) * 10, -Math.sin(a) * 20);
        if (blimpShadow) blimpShadow.position.set(x + SHADOW[0] * BY * 0.9, 0.05, z + SHADOW[1] * BY * 0.9);
    }
    function waveFlag(t) {
        const p = flagGeom.attributes.position.array;
        for (let i = 0; i < p.length; i += 3) { const x = flagBase[i] + 2.3; p[i + 2] = Math.sin(x * 1.4 - t * 6) * 0.35 * (x / 4.6); }
        flagGeom.attributes.position.needsUpdate = true;
    }
    const scopeN = 48;
    function traceScope(t) {
        for (let i = 0; i < scopeN; i++) {
            const x = i / (scopeN - 1);
            scopePos[i * 3] = (x - 0.5) * 2.4; scopePos[i * 3 + 1] = Math.sin(x * Math.PI * 4 + t * 3) * 0.55 * (0.6 + 0.4 * Math.sin(t * 0.7)); scopePos[i * 3 + 2] = 0;
        }
        scopeGeom.attributes.position.needsUpdate = true;
        glow.material.opacity = 0.09 + 0.05 * (0.5 + 0.5 * Math.sin(t * 3));
    }
    function buildAmbient() {
        {   // 1. the car, number 10
            const shell = new Builder(true), dark = new Builder();
            shell.box(-1.3, -0.55, 2.6, 1.1, 0.55, 0.3, 'x');
            shell.box(1.3, -0.3, 0.8, 0.6, 0.35, 0.35, 'x');
            shell.box(-1.9, -0.8, 0.5, 1.6, 0.15, 1.0, 'x');
            shell.box(1.9, -0.9, 0.4, 1.8, 0.15, 0.25, 'x');
            dark.box(-0.9, -0.35, 1.2, 0.7, 0.5, 0.85, 'ink');                                  // the cockpit, the guts you see through the shell
            for (const x of [1.15, -1.25]) for (const z of [-0.95, 0.55]) dark.box(x - 0.35, z, 0.7, 0.4, 0.7, 0, 'ink');
            dark.box(-0.9, -0.14, 1.2, 0.08, 0.06, 1.35, 'accent');
            dark.box(-0.9, 0.06, 1.2, 0.08, 0.06, 1.35, 'wood');
            car.add(new THREE.Mesh(dark.build(), flat));
            car.add(new THREE.Mesh(shell.build(), M.gold));
            const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 10), shadowMat);
            shadow.rotation.x = -Math.PI / 2; shadow.scale.set(2.2, 1.2, 1); shadow.position.set(0.5, 0.11, 0.3); car.add(shadow);
            placeCar(carS);   // kept as the fallback field until standings arrive
        }
        {   // 2. the start flag
            flagGeom = new THREE.PlaneGeometry(4.6, 2.9, 10, 5); flagBase = flagGeom.attributes.position.array.slice();
            const flag = new THREE.Mesh(flagGeom, new THREE.MeshBasicMaterial({ color: C.accent, side: THREE.DoubleSide, toneMapped: false }));
            flag.position.set(102.5, 5.6, 184); scene.add(flag);
        }
        {   // 4. the blimp
            const b = new Builder(true);
            b.geometry(new THREE.SphereGeometry(1, 12, 8), 'x', new THREE.Matrix4().makeScale(16, 5.5, 5.5));
            b.box(-15.5, -0.3, 4, 0.6, 4.5, 0.5, 'x'); b.box(-15.5, -0.3, 4, 0.6, 4.5, -5, 'x');
            b.box(-15.5, -4.8, 4, 4.4, 0.5, -0.3, 'x'); b.box(-15.5, 0.4, 4, 4.4, 0.5, -0.3, 'x');
            const frame = new THREE.TorusGeometry(4.6, 0.18, 6, 16);   // the gas-cell frame, faint inside the shell
            for (const x of [-9, -4, 1, 6, 11]) { const r = new THREE.Mesh(frame, M.graphite); r.rotation.y = Math.PI / 2; r.position.x = x; r.scale.setScalar(1 - Math.abs(x) / 24); blimp.add(r); }
            const gondola = new Builder(true); gondola.box(-2, -1, 4, 2, 1.2, -6.4, 'x');
            blimp.add(new THREE.Mesh(gondola.build(), M.graphite));
            blimp.add(new THREE.Mesh(b.build(), M.white));
            scene.add(blimp);
            blimpShadow = new THREE.Mesh(new THREE.CircleGeometry(1, 16), new THREE.MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0.1, depthWrite: false, toneMapped: false }));
            blimpShadow.rotation.x = -Math.PI / 2; blimpShadow.scale.set(15, 5.5, 1); blimpShadow.position.y = 0.05; scene.add(blimpShadow);
            placeBlimp(0);
        }
        {   // 5. the garage scope
            scopePos = new Float32Array(scopeN * 3);
            scopeGeom = new THREE.BufferGeometry(); scopeGeom.setAttribute('position', new THREE.BufferAttribute(scopePos, 3));
            const scope = new THREE.Line(scopeGeom, new THREE.LineBasicMaterial({ color: C.accent, toneMapped: false }));
            scope.position.set(98.4, 3.05, 162.09); groups.projects.add(scope);
            glow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6), new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0.12, depthWrite: false, toneMapped: false }));
            glow.position.set(98.4, 3.05, 162.07); groups.projects.add(glow);
            traceScope(0);
        }
        built = true;
    }

    /* ------------------------------------------------ stage E: text on faces, after the fonts */
    function textTexture(text, o) {
        const cv = document.createElement('canvas'); cv.width = o.w; cv.height = o.h;
        const ctx = cv.getContext('2d');
        if (o.bg) { ctx.fillStyle = o.bg; ctx.fillRect(0, 0, o.w, o.h); }
        ctx.fillStyle = o.fill; ctx.textBaseline = 'middle'; ctx.textAlign = o.align || 'center';
        if ('letterSpacing' in ctx) ctx.letterSpacing = o.spacing || '0px';
        let font = o.font, size = parseFloat((font.match(/(\d+(?:\.\d+)?)px/) || [0, 48])[1]);
        ctx.font = font;
        while (ctx.measureText(text).width > o.w * 0.92 && size > 8) {   // shrink to fit the face
            size -= 2; font = font.replace(/\d+(?:\.\d+)?px/, size + 'px'); ctx.font = font;
        }
        ctx.fillText(text, o.align === 'left' ? 0 : o.w / 2, o.h / 2);
        const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
        return tex;
    }
    function textPlane(tex, w, h, pos, rotY, parent) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
        m.position.set(pos[0], pos[1], pos[2]); if (rotY) m.rotation.y = rotY; (parent || scene).add(m); return m;
    }
    const CHAKRA = "'Chakra Petch', sans-serif", SCHIB = "'Schibsted Grotesk', 'Helvetica Neue', Arial, sans-serif";
    function addText() {
        const eco = L.LOCATIONS.find(l => l.id === 'economics'), eb = eco.boxes[0];
        {   // 3. the Exchange ticker, seamless tile
            const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
            ctx.font = '600 44px ' + CHAKRA; if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
            const s = eco.ticker.text + '  ·  ', tw = Math.ceil(ctx.measureText(s).width);
            cv.width = tw; cv.height = 96;
            ctx.fillStyle = C.ink; ctx.fillRect(0, 0, tw, 96);
            ctx.font = '600 44px ' + CHAKRA; if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
            ctx.fillStyle = C.accent; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, 50);
            const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping;
            const pw = eb[2] - 1.6, ph = 2.2; tex.repeat.set((pw / ph) / (tw / 96), 1);
            ticker = textPlane(tex, pw, ph, [eb[0] + eb[2] / 2, 9.3, eb[1] + eb[3] + 0.03], 0, groups.economics);
        }
        const board = L.LOCATIONS.find(l => l.id === 'contact');
        textPlane(textTexture(board.board.text, { w: 1024, h: 256, font: '700 96px ' + SCHIB, fill: C.ink, bg: C.paper, spacing: '2px' }), 5.6, 1.4, [99, 2.5, 171.02], 0, groups.contact);
        textPlane(textTexture('TRACK 29°', { w: 512, h: 192, font: '700 96px ' + CHAKRA, fill: C.accent, bg: C.ink }), 2.7, 1.0, [107.5, 1.7, 171.02], 0, groups.contact);
        const signs = ['AWUS  ·  RATED W', 'C++  ·  PYTHON  ·  SQL', 'IMU  ·  HAPTICS  ·  FIRMWARE'];
        L.BILLBOARDS.forEach((b, i) => {
            const tex = textTexture(signs[i], { w: 1024, h: 384, font: 'italic 700 92px ' + CHAKRA, fill: C.ink, bg: C.paper, spacing: '6px' });
            if (b[2] > b[3]) textPlane(tex, b[2] - 0.6, b[4] - 0.4, [b[0] + b[2] / 2, b[5] + b[4] / 2, b[1] + b[3] + 0.02]);
            else textPlane(tex, b[3] - 0.6, b[4] - 0.4, [b[0] + b[2] + 0.02, b[5] + b[4] / 2, b[1] + b[3] / 2], Math.PI / 2);
        });
        textPlane(textTexture(L.NAME.toUpperCase(), { w: 2048, h: 96, font: 'italic 600 60px ' + CHAKRA, fill: C.paper, spacing: '18px' }), 72, 3.4, [105, -2.5, 210.03]);
        {   // BETTA painted on the T1 run-off, the way circuits paint their own name
            const m = textPlane(textTexture(L.BLIMP.banner, { w: 1024, h: 256, font: 'italic 700 200px ' + CHAKRA, fill: C.paper, spacing: '30px' }), 18, 4.5, [193.5, 0.06, 161]);
            m.rotation.order = 'YXZ'; m.rotation.y = Math.atan2(26, 14); m.rotation.x = -Math.PI / 2;
        }
        fontsLoaded = true; numberCars();
        barrierText();
        const ban = textTexture(L.BLIMP.banner, { w: 1024, h: 256, font: 'italic 700 190px ' + CHAKRA, fill: C.ink, spacing: '28px' });
        for (const side of [1, -1]) {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.5), new THREE.MeshBasicMaterial({ map: ban, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
            m.position.set(0, 0.2, 5.55 * side); m.rotation.y = side < 0 ? Math.PI : 0; blimp.add(m);
        }
        if (!running) render();
    }

    /* ------------------------------------------------ loop, stats */
    const stats = { fps: 0, frames: 0, calls: 0, triangles: 0, window: [] };
    let last = performance.now(), secFrames = 0, secStart = last, raf = 0, running = false, ready = false;
    const hooks = [];
    function render() {
        renderer.render(scene, camera);
        stats.calls = renderer.info.render.calls; stats.triangles = renderer.info.render.triangles;
    }
    /* V1.1 ambient list: up to three lapping cars, the flag, the sleeve
       shimmer and one flickering board. The ticker, the blimp and the scope
       hold still. Six of eight at most, two in reserve. */
    function tick(dt, t) {
        if (!built) return;
        const p = poseAt(raceS); raceS += dt * 8.5 * (1 - 0.45 * Math.min(1, Math.abs(p.k) / 0.12));
        placeCars(raceS);
        waveFlag(t);
        shimmerAt((t % 8) / 8);   // the sleeve shimmer, base to cuff every eight seconds
        flickerStep(t);           // one board flickers
    }
    function frame(now) {
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        tick(dt, now / 1000);
        for (const h of hooks) h(dt, now / 1000);
        render();
        stats.frames++; secFrames++;
        if (now - secStart >= 1000) { stats.fps = secFrames * 1000 / (now - secStart); stats.window.push(stats.fps); if (stats.window.length > 10) stats.window.shift(); secFrames = 0; secStart = now; }
        if (running) raf = requestAnimationFrame(frame);
    }
    function start() { if (running || reduced.matches || !ready) return; running = true; last = performance.now(); secStart = last; secFrames = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    const onReduced = () => { if (reduced.matches) { stop(); if (built) placeCars(raceS); render(); } else start(); };
    if (reduced.addEventListener) reduced.addEventListener('change', onReduced); else reduced.addListener(onReduced);
    window.addEventListener('resize', () => { fit(); if (!running) render(); });

    /* the build, one stage per task, then shaders off the main thread, then the loop */
    const stages = [buildGround, buildStops, buildScenery, buildAmbient];
    const readyPromise = new Promise(resolve => {
        let i = 0;
        const step = () => {
            if (i < stages.length) { stages[i++](); setTimeout(step, 0); return; }
            const compiled = renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve();
            compiled.then(() => { ready = true; fit(); render(); start(); resolve(); }, () => { ready = true; fit(); render(); start(); resolve(); });
        };
        setTimeout(step, 0);
    });
    fit(); render();
    const fontsReady = document.fonts ? Promise.race([document.fonts.load("600 44px 'Chakra Petch'").then(() => document.fonts.ready), new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
    Promise.all([readyPromise, fontsReady]).then(addText, addText);

    /* screen helpers for the navigation layer */
    const _v = new THREE.Vector3();
    function project(x, y, z) {
        _v.set(x, y, z).project(camera);
        return [(_v.x + 1) / 2 * canvas.clientWidth, (1 - _v.y) / 2 * canvas.clientHeight, _v.z];
    }
    function groundAt(px, py) {
        _v.set(px / canvas.clientWidth * 2 - 1, 1 - py / canvas.clientHeight * 2, -1).unproject(camera);
        const t = _v.y / DIR.y;
        return [_v.x - DIR.x * t, _v.z - DIR.z * t];
    }
    const raycaster = new THREE.Raycaster(); raycaster.layers.set(1);
    function pick(px, py) {
        raycaster.setFromCamera(new THREE.Vector2(px / canvas.clientWidth * 2 - 1, 1 - py / canvas.clientHeight * 2), camera);
        const hit = raycaster.intersectObjects(hits, false)[0];
        return hit ? hit.object.userData.id : null;
    }

    return { scene, camera, renderer, canvas, view, fit, render, start, stop, stats, frames: fr, poseAt, ambient: L.AMBIENT,
             groups, hooks, project, groundAt, pick, DIR, isRunning: () => running, reduced, ready: readyPromise,
             setStandings: data => readyPromise.then(() => setStandings(data)), cars, raceState: () => cars.map(c => ({ id: c.id, lapping: c.lapping, commits: c.commits, gap: c.gap, lane: c.lane, at: [c.group.position.x, c.group.position.z] })),
             meanFps: () => stats.window.length ? stats.window.reduce((a, b) => a + b, 0) / stats.window.length : stats.fps };
}
