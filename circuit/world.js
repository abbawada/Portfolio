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
        white: candy('#eceff2', '#aeb6bc'),          // the Education, Economics and Writing shells, and the white parts inside the districts
        smoke: candy('#aab1b7', '#3a3f45', { thickness: 2.5, roughness: 0.12, transmission: 0.94 }),   // the sleeve monument, graphite iMac
        red: candy('#e08a90', '#a31621'),            // Bluetooth Car's livery, its spine red
        chrome: new THREE.MeshStandardMaterial({ color: '#e9eaec', metalness: 1, roughness: 0.08, envMapIntensity: 1.6 }),   // the visor
        graphite: new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: 0.55, metalness: 0.35, flatShading: true }),
        cabin: new THREE.MeshStandardMaterial({ color: '#eceff2', roughness: 0.6, flatShading: true }),   // the helicopter's cabin: opaque paper, so it reads white over the graphite tower and matches the tile's aircraft
        neon: {}
    };
    for (const [k, v] of Object.entries({ cyan: '#3ad7e6', magenta: '#ff4f9d', gold: '#f0b64a', lime: '#a4ec5c', green: '#42d67a' })) {
        M.neon[k] = new THREE.MeshBasicMaterial({ color: v, toneMapped: false });
    }
    /* V1.4: the candy tech family. A transmissive shell whose colour comes
       per vertex, so any number of flavours cost one draw call. Everything
       meant to be SEEN through these shells must be opaque: a transmissive
       material does not render another transmissive material behind it,
       which is why the guts below are built with the unlit flat material
       and not with candy(). */
    const candyVC = new THREE.MeshPhysicalMaterial({
        vertexColors: true, transmission: 0.92, thickness: 3.2, roughness: 0.14, ior: 1.45,
        attenuationColor: '#ffffff', attenuationDistance: 40, flatShading: true,
        envMapIntensity: 1.3, specularIntensity: 1, side: THREE.FrontSide
    });

    /* V1.3 Session 2: the buildings are muted candy; each stop's one
       saturated signature colour lives on its mark and its accents only */
    const DISTRICT = { about: M.grey, betta: null, education: M.white, economics: M.white, writing: M.white, projects: M.grey, contact: M.grey };
    const SIG = {}; M.sig = {}; M.sigFlat = {};
    for (const loc of L.LOCATIONS) if (loc.signature) {
        SIG[loc.id] = loc.signature;
        M.sig[loc.id] = new THREE.MeshStandardMaterial({ color: loc.signature, emissive: loc.signature, emissiveIntensity: 0.18, roughness: 0.45, metalness: 0.05, flatShading: true });
        M.sigFlat[loc.id] = new THREE.MeshBasicMaterial({ color: loc.signature, toneMapped: false });   // strips, screens, lit bars
    }
    /* every stop's internals, details and signs are placed relative to its layout box (V1.2, V1.3) */
    const boxOf = id => L.LOCATIONS.find(l => l.id === id).boxes[0];
    const TOWER = boxOf('about'), TDECK = L.LOCATIONS.find(l => l.id === 'about').boxes[3], TU = TDECK[0] + TDECK[2] / 2 - 2.5, TV = TDECK[1] + TDECK[3] / 2 - 2.5;   // a virtual 5 by 5 on the core's centre, from the deck (the mark slides on its own)
    const GAR = boxOf('projects'), GU = GAR[0], GV = GAR[1];
    const WALL = boxOf('contact'), WU = WALL[0], WV = WALL[1];
    const EXC = boxOf('economics'), EU = EXC[0], EV = EXC[1];
    const PRS = boxOf('writing'), PU = PRS[0], PV = PRS[1];
    const CAM = boxOf('education'), KU = CAM[0], KV = CAM[1];

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
        scene.environment = pm.fromScene(studio, 0.04).texture;   // the widest blur that fits the generator's twenty taps at this size; 0.05 clipped, and warned on every load
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
    const heli = new THREE.Group();   // the Betta helicopter
    let ticker = null, flagGeom = null, flagBase = null, scopeGeom = null, scopePos = null, glow = null, built = false;

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

        const campusA = L.nearest(fr, L.CAMPUS_CURBS[0]), campusB = L.nearest(fr, L.CAMPUS_CURBS[1]);
        for (let i = 0; i < n; i += 2) {
            if (Math.abs(fr[i].k) < 0.045) continue;
            const j = (i + 2) % n, campus = i >= campusA && i <= campusB;
            const pair = campus ? [SIG.education, C.paper] : [C.ink, C.paper];
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
        for (const loc of L.LOCATIONS) for (const b of loc.boxes) groundBox(loc.id === 'education' && b === loc.boxes[3] ? [b[0], b[1], b[2], b[3], 6, b[5], b[6]] : b, lb[loc.id]);   // the campus hall's walls stop at 6; its gable rides the rest
        for (const b of L.GRANDSTAND) groundBox(b, gb);
        for (const b of L.PADDOCK.haulers) groundBox(b, gb);
        for (const b of L.BILLBOARDS) {
            groundBox(b, gb);
            const horizontal = b[2] > b[3];
            const posts = horizontal ? [[b[0] + 0.6, b[1]], [b[0] + b[2] - 1.1, b[1]]] : [[b[0], b[1] + 0.6], [b[0], b[1] + b[3] - 1.1]];
            for (const p of posts) gb.box(p[0], p[1], 0.5, 0.5, b[5], 0, 'roof');
        }
        L.CARPARK.cars.forEach((c) => gb.box(c[0], c[1], c[2], c[3], 0.8, 0, 'wall'));
        buildCandyTech();
        st.box(L.FLAG.at[0] - 0.2, L.FLAG.at[1] - 0.2, 0.4, 0.4, 7.2, 0, 'ink');   // the flag pole
        buildLandmarks();
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
        buildHoardings();
        for (const loc of L.LOCATIONS) {
            const g = groups[loc.id];
            for (const m of guts[loc.id]) g.add(m);
            mergeStatic(g);
            g.add(new THREE.Mesh(lb[loc.id].build(), DISTRICT[loc.id] || flat));
            const bb = new THREE.Box3().setFromObject(g), size = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3());
            const top = Math.max(size.y, 5, loc.labelZ + 3);   // V1.2: the hit area covers the mesh and the label above it
            const hit = new THREE.Mesh(new THREE.BoxGeometry(size.x + 4, top + 2, size.z + 4), flat);
            hit.position.set(ctr.x, top / 2, ctr.z); hit.layers.set(1); hit.userData.id = loc.id; hit.userData.box = bb;
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
    const SLEEVE_AT = [GU - 3, GV + 7], SLEEVE_N = 30, SLEEVE_SIDES = 12;   // the pit-lane end of the garage
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
        st.poly([[GU - 10, GV], [GU + 4, GV], [GU + 4, GV + 14], [GU - 10, GV + 14]], 0.03, C.plate);
        sh.poly([[GU - 8, GV + 2], [GU + 2, GV + 2], [GU + 7, GV + 5], [GU + 7, GV + 16], [GU - 3, GV + 16], [GU - 8, GV + 13]], 0.04, C.ink);
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
    const NEON = { cyan: SIG.about, gold: SIG.betta, white: '#f4f2ee' };   // V1.3: each district's own colour and white
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
        const SU = TU + 8, SV = TV + 7, SF = TV + 7.73;   // the stack: right of the tower's base, a step in front of it, and its face
        const posts = (v, h) => { for (const u of [SU + 1, SU + 13.5, SU + 17]) gutBox('about', u, v, 0.5, 0.5, h, 0, M.graphite); };
        posts(SV + 0.1, 26);
        /* A: the shooter and BETTA, the big one at the foot of the stack */
        frame(SU, SV, 14, 0.7, 9, 6);
        board(dotBoard(56, 36, [
            { bitmap: SHOOTER, col: 2, row: 6, color: NEON.cyan, colors: { '#': NEON.cyan, g: NEON.white, o: NEON.white } },
            { text: 'BETTA', col: 22, row: 3, color: NEON.white }, { text: 'FEEL', col: 22, row: 12, color: NEON.cyan },
            { text: 'EVERY', col: 22, row: 20, color: NEON.white }, { text: 'REP', col: 22, row: 28, color: NEON.cyan }
        ]), 14, 9, [SU + 7, 10.5, SF]);
        /* D: three projects, the wide board above it */
        frame(SU, SV, 18, 0.7, 5.6, 15);
        board(dotBoard(90, 28, [
            { text: 'POSTURE CUE', col: 3, row: 2, color: NEON.cyan }, { text: 'VISUAL MAPPING', col: 3, row: 11, color: NEON.white },
            { text: 'BLUETOOTH CAR', col: 3, row: 20, color: NEON.cyan }
        ]), 18, 5.6, [SU + 9, 17.8, SF]);
        /* E: the stat and the tap on top; this one flickers */
        frame(SU, SV, 16, 0.7, 5.6, 20.6);
        board(dotBoard(80, 28, [
            { text: 'TOP 4 OF 221', col: 4, row: 2, color: NEON.cyan }, { text: 'A TAP ON', col: 4, row: 11, color: NEON.white },
            { text: 'THE WRIST', col: 4, row: 20, color: NEON.cyan }
        ]), 16, 5.6, [SU + 8, 23.4, SF], 0, true);
        /* B: the circuit name down the tower's right face, one letter under the next */
        const nameItems = [...'WADA RING'].map((ch, i) => ({ text: ch, col: 1, row: 1 + i * 8, color: i < 4 ? NEON.cyan : NEON.white }));
        board(dotBoard(7, 74, nameItems), 2.4, 25.4, [TU + 4.56, 20, TV + 2.5], Math.PI / 2);
        /* C: his tools on the tower's front face */
        board(dotBoard(20, 26, [
            { text: 'C++', col: 1, row: 1, color: NEON.cyan }, { text: 'IMU', col: 1, row: 9, color: NEON.white }, { text: 'SQL', col: 1, row: 17, color: NEON.cyan }
        ]), 4.6, 6, [TU + 2.5, 8.5, TV + 4.56]);
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
        /* 02 the court: a rack of three gold balls, a bench with a folded sleeve on it */
        gutBox('betta', 101.5, 96.3, 0.3, 0.3, 2.6, 0, M.graphite); gutBox('betta', 106.2, 96.3, 0.3, 0.3, 2.6, 0, M.graphite);
        gutBox('betta', 101.5, 96.2, 5, 0.5, 0.25, 1.2, M.graphite);
        for (const x of [102.5, 104, 105.5]) gutMesh('betta', new THREE.SphereGeometry(0.62, 10, 8, 0, Math.PI * 2, 0, Math.PI), M.gold, [x, 2.05, 96.45]);
        gutBox('betta', 126, 96, 4.4, 1.2, 0.25, 1.0, M.graphite); gutBox('betta', 126.2, 96.2, 0.3, 0.3, 1, 0, M.graphite); gutBox('betta', 130.1, 96.9, 0.3, 0.3, 1, 0, M.graphite);
        gutMesh('betta', new THREE.TorusGeometry(0.75, 0.42, 7, 14), M.smoke, [128.2, 1.65, 96.6], [Math.PI / 2, 0, 0]);
        /* 03 campus: books and the mortarboard on the lawn, cardinal and white */
        gutBox('education', KU + 7, KV + 8, 2.6, 1.8, 0.45, 0.6, M.sig.education); gutBox('education', KU + 7.3, KV + 7.8, 2.4, 1.9, 0.4, 1.05, M.white); gutBox('education', KU + 7.1, KV + 8.1, 2.5, 1.7, 0.45, 1.45, M.sig.education);
        gutMesh('education', new THREE.CylinderGeometry(0.7, 0.8, 1.0, 10), M.graphite, [KU + 9, 1.1, KV + 14]);
        gutBox('education', KU + 7.8, KV + 12.8, 2.4, 2.4, 0.16, 1.6, M.graphite);
        gutBox('education', KU + 10.1, KV + 13.9, 0.12, 0.12, 1.4, 0.5, M.sigFlat.education);
        /* 04 the Exchange: the vault door on the side wall, coins by it, silver */
        gutMesh('economics', new THREE.CylinderGeometry(3.2, 3.2, 0.5, 20), M.sig.economics, [EU + 30.3, 6, EV + 9], [0, 0, Math.PI / 2]);
        gutMesh('economics', new THREE.TorusGeometry(1.4, 0.18, 6, 18), M.graphite, [EU + 30.6, 6, EV + 9], [0, Math.PI / 2, 0]);
        for (let i = 0; i < 3; i++) gutMesh('economics', new THREE.BoxGeometry(0.16, 2.8, 0.16), M.graphite, [EU + 30.62, 6, EV + 9], [i * Math.PI / 3, 0, 0]);
        for (let i = 0; i < 6; i++) gutMesh('economics', new THREE.CylinderGeometry(1.1, 1.1, 0.28, 14), M.white, [EU + 33 + (i % 2) * 0.15, 0.14 + i * 0.3, EV + 16]);
        /* 05 the press room: a stack of paper with a pen by the door, the paper box on the dock */
        gutBox('writing', PU + 12.4, PV + 3.5, 2.2, 3, 0.9, 0, M.white);
        gutMesh('writing', new THREE.CylinderGeometry(0.1, 0.1, 2.2, 6), M.graphite, [PU + 13.5, 1.02, PV + 5], [Math.PI / 2, 0, 0.5]);
        gutBox('writing', PU + 10.2, PV + 13.6, 1.3, 1.6, 1.3, 1, M.grey); gutBox('writing', PU + 10.1, PV + 13.5, 1.5, 1.8, 0.2, 2.3, M.graphite);
        /* 06 the garage: the tyre stack on orange rims and the tool chest, under the gantry */
        for (let i = 0; i < 4; i++) { gutMesh('projects', new THREE.TorusGeometry(1.1, 0.45, 7, 16), M.graphite, [GU + 66, 0.5 + i * 0.9, GV + 9], [Math.PI / 2, 0, 0]); gutMesh('projects', new THREE.CylinderGeometry(0.65, 0.65, 0.5, 10), M.sig.projects, [GU + 66, 0.5 + i * 0.9, GV + 9]); }
        gutBox('projects', GU + 70, GV + 4, 2.6, 1.6, 1.6, 0, M.sig.projects);
        for (let i = 0; i < 3; i++) gutBox('projects', GU + 70.2, GV + 5.61, 2.2, 0.08, 0.12, 0.3 + i * 0.45, M.graphite);
        /* 07 the pit wall: a headset, the chrome-visor helmet at rest by the board, its fin in the wall's blue */
        gutMesh('contact', new THREE.TorusGeometry(0.5, 0.09, 6, 16, Math.PI), M.graphite, [WU + 43, 2.3, WV + 0.7], [0, 0, 0]);
        gutBox('contact', WU + 42.35, WV + 0.45, 0.35, 0.5, 0.4, 2.0, M.graphite); gutBox('contact', WU + 43.3, WV + 0.45, 0.35, 0.5, 0.4, 2.0, M.graphite);
        gutMesh('contact', new THREE.SphereGeometry(0.95, 18, 14), M.chrome, [WU + 50, 2.75, WV + 0.7]);
        gutBox('contact', WU + 49.4, WV + 0.9, 1.2, 0.8, 0.5, 1.9, M.graphite);
        gutBox('contact', WU + 49.95, WV + 0.2, 0.1, 1.1, 0.55, 2.9, M.sig.contact);
    }
    /* ------------------------------------------------ the landmarks (V1.3 Session 2) */
    /* Six massings a stranger can name from shape alone: a lattice broadcast
       tower, a colonnaded trading hall with its ticker band, a campus quad
       with a campanile, a newsroom block with paper rolls on its dock, a
       sawtooth garage with four bays and a gantry, a pit wall with its
       perches. Bodies in muted candy; each stop's signature colour on its
       accents only. The court is as built. */
    function strut(b, a, c, r, tone) {   // a box from point a to point c, r thick, into builder b
        const A = new THREE.Vector3(a[0], a[1], a[2]), Cc = new THREE.Vector3(c[0], c[1], c[2]);
        const dir = Cc.clone().sub(A), len = dir.length(); dir.normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        const m = new THREE.Matrix4().compose(A.clone().lerp(Cc, 0.5), q, new THREE.Vector3(1, 1, 1));
        b.geometry(new THREE.BoxGeometry(r, len, r), tone || 'x', m);
    }
    /* The bench behind the garage: five translucent machines in the candy
       flavours, guts showing through the shell, a white bezel on the face
       the camera sees. This is the material the rest of the world only ever
       hints at, built as objects instead of colour on a wall. Two draw
       calls: every shell is one vertex-coloured transmissive mesh, every
       gut and bezel is one unlit mesh behind it. */
    const TECH = [
        { u: 93, flavour: '#ff8a00' },    // tangerine
        { u: 101, flavour: '#a8e02a' },   // lime
        { u: 109, flavour: '#00b8d4' },   // bondi
        { u: 117, flavour: '#8a63ff' },   // grape
        { u: 125, flavour: '#ff3d6e' }    // strawberry
    ];
    const TECH_V = 111, TECH_K = 1.55;   // the open lawn between the court and the garage, where nothing stands in front of them
    function buildCandyTech() {
        const shells = new Builder(), guts = new Builder(), K = TECH_K;
        const box = (b, u, v, w, d, h, z, tone) => b.box(u, v, w * K, d * K, h * K, z * K, tone);
        for (const t of TECH) {
            const u = t.u, v = TECH_V, f = t.flavour;
            /* the guts first, so the shell goes over them. Everything here is
               unlit and opaque on purpose: a transmissive shell will not show
               another transmissive object behind it. */
            box(guts, u + 0.3, v + 0.1, 3.4, 2.8, 0.22, 0, 'ink');                    // the foot
            box(guts, u + 0.45, v + 0.3, 3.1, 2.4, 0.5, 0.2, 'roof');                 // the chassis
            box(guts, u + 0.62, v + 0.5, 2.9, 0.3, 2.3, 1.1, 'ink');                  // the board on edge, big enough to read through the shell
            for (let i = 0; i < 3; i++) box(guts, u + 0.95 + i * 0.8 * K, v + 0.4, 0.34, 0.34, 1.5, 1.3, 'roof');   // the ribs
            /* the face sits proud of the shell, so the machine reads as a
               machine and not as a coloured block */
            box(guts, u + 0.62, v + 3.78, 2.85, 0.22, 2.25, 1.0, 'paper');            // the bezel
            box(guts, u + 0.92, v + 3.9, 2.25, 0.12, 1.62, 1.28, 'ink');              // the screen
            box(guts, u + 1.5, v + 3.9, 0.5, 0.12, 0.16, 0.62, 'roof');               // the slot under it
            /* the shell over all of it, tapered by stacking */
            box(shells, u + 0.2, v + 0.2, 3.6, 2.6, 1.0, 0.15, f);
            box(shells, u + 0.45, v + 0.35, 3.1, 2.3, 2.6, 1.0, f);
            box(shells, u + 0.75, v + 0.5, 2.5, 1.9, 0.5, 3.6, f);                    // the handle shoulder
        }
        scene.add(new THREE.Mesh(guts.build(), flat));
        scene.add(new THREE.Mesh(shells.build(), candyVC));
    }

    function buildLandmarks() {
        {   // 01 the broadcast tower: four legs to the deck, ring beams, X braces, a dish on the platform, a beacon on the needle at the mark's far end (off the deck, so nothing stands in front of the letters)
            const cx = TU + 2.5, cz = TV + 2.5, lat = new Builder(true), MU = L.LOCATIONS.find(l => l.id === 'about').mark.at[0];
            const levels = [[2, 4.6], [14, 3.8], [26, 3.1], [38, 2.5], [48, 2.1]];
            for (let k = 0; k < levels.length - 1; k++) {
                const [y0, h0] = levels[k], [y1, h1] = levels[k + 1];
                for (const sx of [-1, 1]) for (const sz of [-1, 1]) strut(lat, [cx + sx * h0, y0, cz + sz * h0], [cx + sx * h1, y1, cz + sz * h1], 0.5);
                for (const sx of [-1, 1]) {   // X braces on the two faces the camera sees
                    strut(lat, [cx + sx * h0, y0, cz - h0], [cx + sx * h1, y1, cz + h1], 0.22); strut(lat, [cx + sx * h0, y0, cz + h0], [cx + sx * h1, y1, cz - h1], 0.22);
                    strut(lat, [cx - h0, y0, cz + sx * h0], [cx + h1, y1, cz + sx * h1], 0.22); strut(lat, [cx + h0, y0, cz + sx * h0], [cx - h1, y1, cz + sx * h1], 0.22);
                }
                for (const [sx, sz, ex, ez] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) strut(lat, [cx + sx * h1, y1, cz + sz * h1], [cx + ex * h1, y1, cz + ez * h1], 0.3);
            }
            gut('about', new THREE.Mesh(lat.build(), M.graphite));
            gutBox('about', TU + 2.1, TV + 2.1, 0.8, 0.8, 45, 2.5, M.graphite);   // the core's spine
            const ring = new THREE.TorusGeometry(1.5, 0.2, 6, 14);
            for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(ring, M.sigFlat.about); r.rotation.x = Math.PI / 2; r.position.set(cx, 6 + i * 6.5, cz); gut('about', r); }
            gutMesh('about', new THREE.SphereGeometry(2.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.white, [TU - 1.2, 28.6, TV - 0.4], [Math.PI, 0.7, 0], [1, 0.7, 1]);   // the dish on the platform
            gutMesh('about', new THREE.CylinderGeometry(0.18, 0.18, 2.4, 6), M.graphite, [TU - 1.2, 29, TV - 0.4], [0.5, 0, 0.6]);
            gutMesh('about', new THREE.SphereGeometry(1.4, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), M.white, [TU + 6.2, 28.2, TV + 6], [Math.PI, -0.8, 0], [1, 0.7, 1]);
            gutBox('about', MU - 16.3, TV + 2.1, 2.2, 0.8, 0.6, 49.2, M.graphite);   // the outrigger arm off the mount's left end, carrying the needle clear of the first letter
            gutBox('about', MU - 16.7, TV + 1.8, 1.4, 1.4, 1.4, 61.2, M.sigFlat.about);   // the beacon on the needle
            for (let i = 0; i < 3; i++) gutMesh('about', new THREE.TorusGeometry(1.4, 0.22, 6, 18), M.graphite, [TU + 8, 0.3 + i * 0.45, TV + 6], [Math.PI / 2, 0, 0]);   // the cable coil
        }
        {   // 04 the Exchange: a colonnade with its entablature, a parapet carrying the ticker, the stepped top, the tape and rollers inside
            const w = EXC[2], d = EXC[3], h = EXC[4], zf = EV + d;
            for (let i = 0; i < 9; i++) gutBox('economics', EU + 1.4 + i * 3.4, zf + 0.5, 1.2, 1.2, h - 1, 0, M.white);
            gutBox('economics', EU + 0.6, zf + 0.2, w - 1.2, 1.8, 1.4, h - 1.2, M.white);            // the entablature
            gutBox('economics', EU + 0.6, zf + 2.0, w - 1.2, 0.2, 0.5, h - 0.7, M.sigFlat.economics); // the frieze in green
            gutBox('economics', EU, zf - 1, w, 1, 3.2, h, M.white);                                  // the parapet, the ticker rides on it
            gutBox('economics', EU + 11, EV + 4, 8, 8, 2, 14, M.white); gutBox('economics', EU + 13, EV + 6, 4, 4, 1.4, 16, M.white);   // the stepped top
            gutBox('economics', EU + 1.5, EV + 3, 13, 1.2, 1.2, 4, M.graphite); gutBox('economics', EU + 1.5, EV + 11.8, 13, 1.2, 1.2, 8, M.graphite);   // rollers
            gutBox('economics', EU + 2.5, EV + 7.4, 11, 0.3, 4.4, 4.6, M.sigFlat.economics);       // the tape
            const gear = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.35, 6, 12), M.graphite); gear.position.set(EU + 8, 9.8, EV + 8); gut('economics', gear);
            gutBox('economics', EU + 13, zf + 0.06, 4, 0.3, 4.2, 0.3, M.graphite);                  // the doors
        }
        {   // 03 the campus: an arcade on the front wing, a cardinal roof on the campanile, its clock, the gateway
            const front = boxOf('education'); const fw = L.LOCATIONS.find(l => l.id === 'education').boxes[1];
            const zf = fw[1] + fw[3];
            for (let i = 0; i < 6; i++) gutBox('education', fw[0] + 0.6 + i * 3.4, zf - 0.2, 0.8, 0.8, 5, 0, M.white);
            gutBox('education', fw[0] + 0.3, zf - 0.4, fw[2] - 0.6, 1.2, 0.8, 5, M.white);          // the arcade's lintel
            gutBox('education', fw[0] + 0.2, zf + 0.02, fw[2] - 0.4, 0.15, 0.5, fw[4] - 1.6, M.sigFlat.education);   // the cardinal band under the roof line
            gutBox('education', fw[0] + fw[2] + 0.02, fw[1] + 0.2, 0.15, fw[3] - 0.4, 0.5, fw[4] - 1.6, M.sigFlat.education);
            for (let i = 0; i < 4; i++) gutBox('education', fw[0] + 2 + i * 4.2, zf + 0.04, 2, 0.1, 1.6, 6, M.graphite);   // the upper windows, dark
            const hall = L.LOCATIONS.find(l => l.id === 'education').boxes[3], hw = hall[2], hd = hall[3], hh = 6;   // the hall's walls are 6, the gable rides to 9
            const gable = new THREE.Shape(); gable.moveTo(0, 0); gable.lineTo(hd, 0); gable.lineTo(hd / 2, 3); gable.lineTo(0, 0);
            const g = new THREE.ExtrudeGeometry(gable, { depth: hw + 0.8, bevelEnabled: false });
            gutMesh('education', g, M.sig.education, [hall[0] + hw + 0.4, hh, hall[1]], [0, -Math.PI / 2, 0]);   // the cardinal gable roof, along u
            gutBox('education', hall[0] - 0.4, hall[1] - 0.4, hw + 0.8, hd + 0.8, 0.3, hh - 0.3, M.white);   // the eaves line
            gutBox('education', hall[0] + 0.3, hall[1] + hd + 0.02, hw - 0.6, 0.15, 0.5, hh - 1.5, M.sigFlat.education);
            gutMesh('education', new THREE.CylinderGeometry(0.12, 0.12, 16, 6), M.graphite, [hall[0] + hw + 1.2, 8, hall[1] + 1]);   // the flagpole
            gutBox('education', hall[0] + hw + 1.2, hall[1] + 0.95, 2.6, 0.1, 1.5, 14.3, M.sigFlat.education);
            const gate = L.LOCATIONS.find(l => l.id === 'education').boxes[4];
            gutBox('education', gate[0] + 2.2, gate[1] - 0.2, 2.6, 1.6, 4.2, 0, M.graphite);        // the gate, dark inside the arch
            gutBox('education', gate[0], gate[1] + gate[3] + 0.02, gate[2], 0.15, 0.5, 4.3, M.sigFlat.education);
            const side = L.LOCATIONS.find(l => l.id === 'education').boxes[2];
            gutBox('education', side[0] + side[2] + 0.02, side[1] + 2, 0.15, 2.4, 3, 0, M.sig.education);   // the side wing's door
        }
        {   // 05 the press room: a glazed band in magenta round the top floor, the paper rolls on the dock, a water tank on the roof
            const b = PRS, zf = PV + b[3], uf = PU + b[2];
            gutBox('writing', PU + 0.4, zf + 0.02, b[2] - 0.8, 0.15, 2.2, 7.4, M.sigFlat.writing);
            gutBox('writing', uf + 0.02, PV + 0.4, 0.15, b[3] - 0.8, 2.2, 7.4, M.sigFlat.writing);
            gutBox('writing', PU + 1, zf + 0.06, 2.6, 0.3, 4, 0.3, M.graphite);                   // the door
            for (let i = 0; i < 3; i++) gutMesh('writing', new THREE.CylinderGeometry(1.5, 1.5, 3.2, 14), M.white, [PU + 3 + i * 3.4, 2.6, zf + 3.2], [0, 0, Math.PI / 2]);   // the rolls
            gutBox('writing', PU + 1.2, zf + 1.4, 9.6, 3.6, 0.3, 0.9, M.graphite);                 // their rack
            gutMesh('writing', new THREE.CylinderGeometry(1.2, 1.2, 2.2, 10), M.graphite, [PU + 9.5, b[4] + 2.2, PV + 2.5]);   // the tank
            for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) gutBox('writing', PU + 9.5 + dx - 0.1, PV + 2.5 + dz - 0.1, 0.2, 0.2, 1.2, b[4], M.graphite);
            gutBox('writing', PU + 1, PV + 6.5, 8, 0.5, 0.5, 3.2, M.sigFlat.writing);            // the tube inside
        }
        {   // 06 the garage: four bays with half-open doors, a sawtooth roof with glazed faces, the gantry at the end
            const zf = GV + GAR[3], w = GAR[2], h = GAR[4];
            for (let i = 0; i < 4; i++) {
                const u0 = GU + 4 + i * 15;
                const mouth = new Builder(true);
                mouth.quad([u0, 0.02, zf + 0.02], [u0 + 7, 0.02, zf + 0.02], [u0 + 7, 5.4, zf + 0.02], [u0, 5.4, zf + 0.02], 'x');
                gut('projects', new THREE.Mesh(mouth.build(), M.graphite));
                gutBox('projects', u0, zf - 0.2, 7, 0.4, 1.8, 3.6, M.sig.projects);               // the door, rolled half up
                gutBox('projects', u0 + 0.4, zf - 1.4, 2.6, 1.1, 1.3, 0, M.graphite);              // a bench in the bay
            }
            const tooth = new THREE.Shape(); tooth.moveTo(0, 0); tooth.lineTo(15, 0); tooth.lineTo(15, 3); tooth.lineTo(0, 0);
            for (let i = 0; i < 4; i++) {
                const g = new THREE.ExtrudeGeometry(tooth, { depth: GAR[3] + 0.6, bevelEnabled: false });
                gutMesh('projects', g, M.grey, [GU + i * 15, h, GV - 0.3]);
                gutBox('projects', GU + i * 15 + 14.75, GV, 0.2, GAR[3], 2.6, h + 0.2, M.sigFlat.projects);   // the glazed face of each tooth
            }
            gutBox('projects', GU + 2, GV + 1.2, w - 8, 0.4, 0.5, h - 2.6, M.sigFlat.projects);  // the light bar along the back wall
            gutBox('projects', GU + 6, GV + 4, 10, 4, 1.2, 0, M.graphite); gutBox('projects', GU + 40, GV + 4, 10, 4, 1.2, 0, M.graphite);   // the benches inside
            const gan = new Builder(true), gx0 = GU + w + 2, gx1 = GU + w + 12, gz0 = GV + 2, gz1 = GV + 10, gy = 9;
            for (const x of [gx0, gx1]) { strut(gan, [x, 0, gz0], [x, gy, (gz0 + gz1) / 2], 0.5); strut(gan, [x, 0, gz1], [x, gy, (gz0 + gz1) / 2], 0.5); }
            strut(gan, [gx0, gy, (gz0 + gz1) / 2], [gx1, gy, (gz0 + gz1) / 2], 0.7);
            gut('projects', new THREE.Mesh(gan.build(), M.graphite));
            gutBox('projects', gx0 + 4.4, (gz0 + gz1) / 2 - 0.5, 1.2, 1, 1.2, gy - 3.6, M.sig.projects);   // the hook block
            gutBox('projects', gx0 + 4.9, (gz0 + gz1) / 2 - 0.1, 0.2, 0.2, 2.4, gy - 2.4, M.graphite);
        }
        {   // 07 the pit wall: a blue rail along the top, umbrellas and screens on the perches
            const b = WALL;
            gutBox('contact', WU, WV - 0.02, b[2], 0.2, 0.15, b[4], M.sigFlat.contact);
            for (const p of L.LOCATIONS.find(l => l.id === 'contact').boxes.slice(3)) {
                const cu = p[0] + p[2] / 2, cv = p[1] + p[3] / 2, top = p[5] + p[4];
                gutBox('contact', cu - 0.08, cv - 0.08, 0.16, 0.16, 2.6, top, M.graphite);
                gutMesh('contact', new THREE.CylinderGeometry(1.7, 1.7, 0.14, 12), M.sig.contact, [cu, top + 2.6, cv]);
                gutBox('contact', p[0] + 0.3, p[1] + p[3] + 0.02, p[2] - 0.6, 0.15, 0.9, top + 0.2, M.sigFlat.contact);   // the screens
            }
        }
    }
    /* low barrier walls with his marks in type, placed in layout.js */
    const BARRIERS = L.BARRIERS;
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
        { at: [TU + 5.6, 49.2, TV - 0.6], scale: 1.8, yaw: Math.PI / 4, stop: 'about' },  // on the deck's back-right corner, past the T of the mark
        { at: [WU + 80, 1.8, WV + 0.7], scale: 0.75, yaw: Math.PI / 4, stop: 'contact' }   // on the pit wall, past the board
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

    /* ------------------------------------------------ the dimensional marks (V1.3 Session 2) */
    /* One giant wordmark per stop in Chakra Petch Bold, extruded in the
       stop's signature colour, standing on a graphite mount on its
       building. The glyph parser is three's Font logic (typeface.json
       commands m, l, q, b) on the core's ShapePath. Letters and mount are
       one mesh per stop with vertex colours, so a stop lifts as one. */
    const MARK_DEPTH = 1.5, MARK_TRACKING = 0.92;
    const markMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.5, metalness: 0.06 });
    const markBoxes = [];
    function fontShapes(data, text, capHeight) {
        const scale = capHeight / 700 / data.resolution * 1000, shapes = [];   // 700 units of cap height per em in this face
        let offsetX = 0;
        for (const ch of Array.from(text)) {
            const glyph = data.glyphs[ch] || data.glyphs['?']; if (!glyph) continue;
            const path = new THREE.ShapePath();
            if (glyph.o) {
                const o = glyph.o.split(' ');
                for (let i = 0; i < o.length;) {
                    const a = o[i++];
                    if (a === 'm') path.moveTo(o[i++] * scale + offsetX, o[i++] * scale);
                    else if (a === 'l') path.lineTo(o[i++] * scale + offsetX, o[i++] * scale);
                    else if (a === 'q') { const x = o[i++] * scale + offsetX, y = o[i++] * scale, x1 = o[i++] * scale + offsetX, y1 = o[i++] * scale; path.quadraticCurveTo(x1, y1, x, y); }
                    else if (a === 'b') { const x = o[i++] * scale + offsetX, y = o[i++] * scale, x1 = o[i++] * scale + offsetX, y1 = o[i++] * scale, x2 = o[i++] * scale + offsetX, y2 = o[i++] * scale; path.bezierCurveTo(x1, y1, x2, y2, x, y); }
                }
            }
            offsetX += glyph.ha * scale * MARK_TRACKING;
            shapes.push(...path.toShapes());
        }
        return shapes;
    }
    function buildMarks(font) {
        const col = new THREE.Color();
        for (const loc of L.LOCATIONS) {
            if (!loc.mark || !loc.signature) continue;
            const mk = loc.mark, letters = new THREE.ExtrudeGeometry(fontShapes(font, mk.text, mk.h), { depth: MARK_DEPTH, bevelEnabled: false, curveSegments: 5 });
            letters.computeBoundingBox();
            const bb = letters.boundingBox, w = bb.max.x - bb.min.x;
            letters.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y + 0.6, -MARK_DEPTH / 2);   // centred, standing on the mount
            const mount = new THREE.BoxGeometry(w + 2.4, 0.6, MARK_DEPTH + 1.4); mount.translate(0, 0.3, 0);
            const parts = [[letters, loc.signature], [mount, '#2a2b2e']], pos = [], nor = [], colr = [];
            for (const [g, hexc] of parts) {
                const ng = g.index ? g.toNonIndexed() : g; col.set(hexc);
                pos.push(...ng.attributes.position.array); nor.push(...ng.attributes.normal.array);
                for (let i = 0; i < ng.attributes.position.count; i++) colr.push(col.r, col.g, col.b);
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
            const m = new THREE.Mesh(geo, markMat);
            m.position.set(mk.at[0], mk.at[2], mk.at[1]); if (mk.face === 'u') m.rotation.y = Math.PI / 2;
            groups[loc.id].add(m);
            const depth = MARK_DEPTH + 1.4, top = mk.h + 0.6;
            const box = mk.face === 'u' ? [mk.at[0] - depth / 2, mk.at[1] - (w + 2.4) / 2, depth, w + 2.4, top, mk.at[2]] : [mk.at[0] - (w + 2.4) / 2, mk.at[1] - depth / 2, w + 2.4, depth, top, mk.at[2]];
            markBoxes.push({ id: loc.id, box });
            const hit = hits.find(h => h.userData.id === loc.id);   // the hit area grows to take the mark in
            if (hit && hit.userData.box) {
                const b0 = hit.userData.box.clone().expandByPoint(new THREE.Vector3(box[0], box[5], box[1])).expandByPoint(new THREE.Vector3(box[0] + box[2], box[5] + box[4] + 1, box[1] + box[3]));
                const size = b0.getSize(new THREE.Vector3()), ctr = b0.getCenter(new THREE.Vector3()), tp = Math.max(size.y, 5, loc.labelZ + 3);
                hit.geometry.dispose(); hit.geometry = new THREE.BoxGeometry(size.x + 4, tp + 2, size.z + 4); hit.position.set(ctr.x, tp / 2, ctr.z); hit.userData.box = b0;
            }
        }
        if (!running) render();
    }
    const fontJson = fetch('circuit/vendor/chakra-petch-bold.typeface.json?v=15.1').then(r => r.json());

    /* ------------------------------------------------ the type hoardings (V1.2, V1.3) */
    /* Three lines of type on trackside boards. Frames and posts go up with
       the stops; the type lands once the fonts are in. No photographs
       anywhere in the world (V1.3 Session 1). */
    const hoardingPlanes = [];
    function buildHoardings() {
        for (const wall of L.HOARDINGS) {
            let along = 0;
            for (const p of wall.panels) {
                const w = p.w, hh = p.h, z0 = p.z0 != null ? p.z0 : (wall.z0 || 0);
                const u = wall.face === 'u' ? wall.at[0] : wall.at[0] + along, v = wall.face === 'u' ? wall.at[1] + along : wall.at[1];
                if (wall.face === 'u') {
                    gb.box(u, v - 0.3, 0.6, w + 0.6, hh + 0.6, Math.max(0, z0 - 0.3), 'x');
                    if (z0 > 0.6) for (const vv of [v + 0.2, v + w - 0.7]) gb.box(u + 0.05, vv, 0.5, 0.5, z0, 0, 'x');
                    shadowOf(u, v - 0.3, 0.6, w + 0.6, z0 + hh);
                    hoardingPlanes.push({ p, w, hh, pos: [u + 0.62, z0 + hh / 2, v + w / 2], rotY: Math.PI / 2 });
                } else {
                    gb.box(u - 0.3, v, w + 0.6, 0.6, hh + 0.6, Math.max(0, z0 - 0.3), 'x');
                    if (z0 > 0.6) for (const uu of [u + 0.2, u + w - 0.7]) gb.box(uu, v + 0.05, 0.5, 0.5, z0, 0, 'x');
                    shadowOf(u - 0.3, v, w + 0.6, 0.6, z0 + hh);
                    hoardingPlanes.push({ p, w, hh, pos: [u + w / 2, z0 + hh / 2, v + 0.62], rotY: 0 });
                }
                along += w + (wall.gap || 0);
            }
        }
    }
    function dressHoardings() {
        for (const hp of hoardingPlanes) {
            const tex = textTexture(hp.p.text, { w: 1024, h: Math.round(1024 * hp.hh / hp.w), font: 'italic 700 ' + Math.round(1024 * hp.hh / hp.w * 0.42) + 'px ' + CHAKRA, fill: C.ink, bg: C.paper, spacing: '8px' });
            textPlane(tex, hp.w, hp.hh, hp.pos, hp.rotY);
        }
        if (!running) render();
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
    /* V1.3 Session 3: the cars, in the Valkyrie language. Low and wide, a
       glossy near-black body with sculpted haunches and a canopy, four dark
       wheels, and one thin neon accent in the project's signature colour
       from Session 2: Betta gold, Yield Vaults the Exchange's green,
       Posture Cue and Bluetooth Car the garage's orange (both live in
       Projects). 5.8 long, 2.6 wide, so a car reads at the default zoom.
       Nothing here reads anything outside the page. */
    const cars = [];
    const CAR = { length: 5.8, width: 2.6 };
    const gloss = new THREE.MeshPhysicalMaterial({ color: '#15171b', roughness: 0.1, metalness: 0.45, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 2.4, flatShading: true });
    /* one unlit material per accent colour: seven cars, seven flavours, so
       the field stays apart on the road without touching the stops' own
       colours on the buildings */
    const accentMats = new Map();
    const accentMat = hex => {
        let m = accentMats.get(hex);
        if (!m) { m = new THREE.MeshBasicMaterial({ color: hex, toneMapped: false }); accentMats.set(hex, m); }
        return m;
    };
    /* opts (V1.5 fix round): the visitor's car is the one light car on the
       graphite. opts.body is its own body material (paper), so the wheels
       stay gloss black in their own mesh, and opts.wing lights the wing edge
       in a second colour (gold) while the flank lines and nose take accent. */
    function makeCar(accent, number, opts) {
        const g = new THREE.Group(), body = new Builder(true), neon = new Builder(true);
        const own = opts && opts.body ? opts.body : null;
        const wheels = own ? new Builder(true) : body, wing = opts && opts.wing ? new Builder(true) : neon;
        body.box(-2.4, -1.05, 4.8, 2.1, 0.5, 0.35, 'x');                                            // the tub, low and wide
        for (const z of [-1.3, 0.85]) { body.box(-2.2, z, 1.8, 0.45, 0.72, 0.3, 'x'); body.box(1.0, z, 1.3, 0.45, 0.58, 0.3, 'x'); }   // rear haunches, front fenders
        body.box(-2.3, -0.38, 1.6, 0.76, 0.34, 0.85, 'x');                                           // the spine behind the canopy
        body.box(2.4, -0.8, 0.9, 1.6, 0.3, 0.3, 'x'); body.box(2.85, -1.25, 0.5, 2.5, 0.1, 0.24, 'x');   // the nose and the splitter
        body.box(-2.95, -1.25, 0.42, 2.5, 0.12, 0.98, 'x');                                          // the rear wing
        body.geometry(new THREE.SphereGeometry(1, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), 'x',
            new THREE.Matrix4().compose(new THREE.Vector3(-0.35, 0.84, 0), new THREE.Quaternion(), new THREE.Vector3(1.05, 0.55, 0.62)));   // the canopy
        for (const x of [1.55, -1.65]) for (const z of [-1.28, 0.83]) wheels.box(x - 0.42, z, 0.84, 0.45, 0.82, 0, 'x');   // wheels, gloss black whatever the body
        for (const z of [-0.7, 0.55]) body.box(-2.75, z, 0.2, 0.15, 0.4, 0.58, 'x');             // wing pylons
        for (const z of [-1.16, 1.04]) neon.box(-2.3, z, 4.5, 0.12, 0.08, 0.86, 'x');             // the flank lines, one accent per car
        wing.box(-3.0, -1.05, 0.1, 2.1, 0.12, 1.0, 'x');                                           // the wing's lit edge
        neon.box(2.9, -0.65, 0.1, 1.3, 0.1, 0.5, 'x');                                             // the nose tip
        g.add(new THREE.Mesh(body.build(), own || gloss));
        if (own) g.add(new THREE.Mesh(wheels.build(), gloss));
        g.add(new THREE.Mesh(neon.build(), accentMat(accent)));
        if (wing !== neon) g.add(new THREE.Mesh(wing.build(), accentMat(opts.wing)));
        const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 10), shadowMat);
        shadow.rotation.x = -Math.PI / 2; shadow.scale.set(3.1, 1.7, 1); shadow.position.set(0.3, 0.11, 0); g.add(shadow);
        g.userData.number = number;
        return g;
    }
    function placeAt(g, s, lane) {
        const p = poseAt(s);
        const nx = p.tz, nz = -p.tx;   // the left normal in plan
        g.position.set(p.x + nx * lane, 0, p.z + nz * lane); g.rotation.y = Math.atan2(-p.tz, p.tx);
        return p;
    }
    /* V1.3 Session 3: a live race, simulated. Seeded fresh each visit
       (?seed=N repeats a run), four pace personalities (base pace, corner
       grip, a slow form curve), a tow behind the car ahead and a mild
       rubber band that keep the field close enough to fight. A pass is a
       real move round the outside: it starts on a straight with a real
       pace edge, the car goes by with a commit, the passed car tucks in.
       Order and gaps come from each car's distance along the track and
       nowhere else; the Grid reads them. A race, presented as one, and
       nothing more.
       Geometry: line is the racing line's swing either side of the
       centre, pass how far outside the passing car goes, inside how far
       the passed car tucks in; 1.1 + 2.1 + half a car's width stays inside
       the white line on a track 9 wide, and 2.1 + 0.7 keeps two cars 2.6
       wide clear of each other side by side. follow is the closest a car
       sits behind another in line. */
    const seedParam = new URLSearchParams(location.search).get('seed');
    const SEED = seedParam ? (parseInt(seedParam, 10) >>> 0) : (Math.random() * 4294967296) >>> 0;
    const rng = (a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(SEED);
    /* V1.4: the one live input. The visitor's own tour of the page feeds
       the car of whatever they open, so the order answers the person
       watching it instead of a fixed list. Attention decays, so the order
       is about the last couple of minutes and never freezes; it is read as
       a share of the field, so no car runs away; and it buys a small,
       capped pace edge, so what runs underneath is still a race. Nothing
       is fetched and nothing leaves this browser. */
    const carsByStop = {}, carByProject = {};
    L.GRID.forEach(c => { (carsByStop[c.stop] = carsByStop[c.stop] || []).push(c.id); carByProject[c.project] = c.id; });
    const pulse = (typeof CircuitPulse !== 'undefined') ? CircuitPulse.create(L.GRID.map(c => c.id)) : null;
    const ATTEND_SMOOTH = 1.6;   // seconds for a car to take up its new pace, so a click nudges rather than teleports
    const attend = (carId, kind) => { if (pulse && carId) pulse.bump(carId, kind); };
    /* one open is worth the same wherever it lands, so a stop with four
       projects does not outweigh a stop with one */
    const attendStop = (stopId, kind) => {
        const ids = carsByStop[stopId]; if (!pulse || !ids || !ids.length) return;
        const each = (pulse.WORTH[kind || 'open'] || 0) / ids.length;
        ids.forEach(id => pulse.bump(id, kind || 'open', each));
    };
    const attendDwell = (stopId, dt) => { if (pulse && carsByStop[stopId]) pulse.dwell(carsByStop[stopId], dt); };
    const attendCase = (projectId, kind) => { const id = carByProject[projectId]; if (pulse && id) pulse.bump(id, kind || 'case'); return !!id; };
    const attendCaseDwell = (projectId, dt) => { const id = carByProject[projectId]; if (pulse && id) pulse.dwell([id], dt); };

    const RACE = { speed: 9.2, line: 1.0, pass: 2.1, inside: 0.9, follow: CAR.length + 0.9, ahead: CAR.length + 1.2, clear: CAR.width + 0.25, towReach: 16, tow: 0.06, band: 0.12, drag: 0.03, edge: 0.1, commit: 0.16, lift: 0.05, rest: 4, patience: 18, firm: CAR.length + 0.3 };
    const race = { t: 0, lap: 0, seed: SEED, order: [], pass: null, passes: 0, aborts: 0, lastPass: -10, changes: 0 };
    /* V1.5: the visitor drives. One extra car, paper white, that exists only
       while someone is driving it. Its speed comes from the throttle and
       the corner instead of a personality: idle is half pace, flat out is
       a touch faster than the field, so a pass needs a clean lane and a
       lift in the corners keeps it honest. The tow applies; the band, the
       leader drag and the attention do not. It holds station behind a
       blocker exactly as the others do, so it has to change lane to get
       by, and the field treats it as a blocker like any other car. It
       never starts a choreographed pass; the AI may pass it. Its lateral
       follows the steer and is clamped so the car stays inside the white
       line, and the racing line's swing means a full lock clears a car
       only on the inside of the swing. Nothing it does is written to the
       attention store. */
    const DRIVE = { idle: 0.5, gain: 0.60, grip: 0.34, reach: 3.0, edge: 3.1, brake: 0.35, back: RACE.follow + 1.5, turn: 3.0, hyst: 2.0 };   // gain 0.60: a bot lap passes three to five, a person two to four, in about 68 s (docs/circuit/v15/drive.md)
    const drive = { car: null, t: 0, s0: 0, lapDone: false, lapTime: 0, passed: [], passedBy: [], ahead: new Set(), input: { throttle: 0, steer: 0, brake: false }, halo: null };
    const HALO_S = 1.5;   // the paper ring under the visitor's car, gone after a second and a half
    const easeIO = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    const racingLine = s => RACE.line * Math.sin(s / lap * Math.PI * 6 + 0.4);
    function buildGrid() {
        const gridStart = startS - 4, slots = L.GRID.map((c, i) => i);
        for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }   // a fresh order each visit
        L.GRID.forEach((c, i) => {
            const g = makeCar(c.accent, c.number); scene.add(g);
            cars.push({ id: c.id, group: g, name: c.name, code: c.code, stop: c.stop, number: c.number, accent: c.accent, pose: null, lane: 0, lateral: 0,
                s: gridStart - slots.indexOf(i) * (RACE.follow + 1.5), v: RACE.speed * 0.8,
                attendNow: 1, pace: 0.99 + rng() * 0.02, grip: 0.36 + rng() * 0.12, top: 1 + rng() * 0.015,
                f1: 18 + rng() * 22, f2: 31 + rng() * 25, p1: rng() * 6.28, p2: rng() * 6.28 });
        });
        race.order = cars.map((c, i) => i).sort((a, b) => cars[b].s - cars[a].s);
        placeCars(0);
    }
    /* every frame: pace, the tow and the band set what each car wants;
       a car in line behind another holds station; a pass carries one
       round the outside; positions and gaps fall out of the distances */
    /* a car alongside is a wall: the player cannot steer into it, and a car
       the racing line would carry into the pinned player gives room inside
       the line first, the player second. Runs inside the player's own step,
       so every car stepped after it in the same frame sees the settled lane. */
    function wall(p) {
        for (const o of cars) {
            if (o === p || Math.abs(o.s - p.s) >= CAR.length + 0.2) continue;
            let d = o.lane - p.lane; if (Math.abs(d) >= RACE.clear) continue;
            const sign = d >= 0 ? 1 : -1;
            if ((p.lateral - p.lat0) * sign > 0) p.lateral = p.lat0;   // undo the steer toward it
            { const rl = racingLine(p.s); p.lateral = Math.max(-DRIVE.edge - rl, Math.min(DRIVE.edge - rl, p.lateral)); p.lane = rl + p.lateral; d = o.lane - p.lane; }   // and keep the line
            let need = RACE.clear - Math.abs(d);
            if (need > 0) {   // the other car gives what room it has: to the line, and to the next car alongside it on that side
                let room = Math.max(0, DRIVE.edge - sign * o.lane);
                for (const q of cars) if (q !== o && q !== p && Math.abs(q.s - o.s) < CAR.length + 0.2 && (q.lane - o.lane) * sign > 0) room = Math.min(room, Math.max(0, (q.lane - o.lane) * sign - RACE.clear));
                const give = Math.min(need, room);
                o.lateral += sign * give; o.lane += sign * give; need -= give;
                o.pose = placeAt(o.group, o.s, o.lane);
            }
            if (need > 0) { const lane = Math.max(-DRIVE.edge, Math.min(DRIVE.edge, p.lane - sign * need)); p.lateral += lane - p.lane; p.lane = lane; }
        }
    }
    function placeCars(dt) {
        race.t += dt;
        if (pulse) pulse.tick();
        const t = race.t, order = cars.map((c, i) => i).sort((a, b) => cars[b].s - cars[a].s);
        if (race.order.length && order.some((ci, k) => ci !== race.order[k])) race.changes++;
        race.order = order;
        for (let k = 0; k < order.length; k++) {
            const c = cars[order[k]], ahead = k > 0 ? cars[order[k - 1]] : null, player = !!c.player;
            let blocker = null, bi = -1;   // the nearest car ahead on a line this one would run into; a car alongside on a clear line is not one
            for (let j = k - 1; j >= 0; j--) {   // for the player, both cars of a pass in progress block the whole road: nobody threads a pass
                const o = cars[order[j]], inBand = Math.abs(o.lateral - c.lateral) < RACE.clear;
                if (inBand && o.s - c.s < CAR.length + 0.2 && Math.abs(o.lane - c.lane) >= RACE.clear) continue;   // beside us on a clear lane (the visitor's car, held off by the wall below), not ahead of us
                if (inBand || (player && race.pass && race.pass.over !== order[k] && (order[j] === race.pass.car || order[j] === race.pass.over))) { blocker = o; bi = order[j]; break; }   // a car passing the visitor is an ordinary car to them
            }
            const pose = poseAt(c.s), corner = Math.min(1, Math.abs(pose.k) / 0.12);
            c.lat0 = c.lateral;
            let want;
            if (player) {   // the throttle and the corner, nothing else
                const inp = drive.input;
                want = RACE.speed * (DRIVE.idle + DRIVE.gain * inp.throttle) * (1 - DRIVE.grip * corner);
                if (inp.brake) want = Math.min(want, RACE.speed * DRIVE.brake);
            } else {
                const form = 1 + 0.022 * Math.sin(t / c.f1 + c.p1) + 0.012 * Math.sin(t / c.f2 + c.p2);
                const aimAttend = pulse ? pulse.pace(c.id) : 1;   // what the visitor's tour is worth to this car right now
                c.attendNow += (aimAttend - c.attendNow) * Math.min(1, dt / ATTEND_SMOOTH);
                want = RACE.speed * c.pace * c.top * form * c.attendNow * (1 - c.grip * corner);
            }
            const passing = race.pass && race.pass.car === order[k], passed = race.pass && race.pass.over === order[k];
            if (ahead) {
                const gap = ahead.s - c.s;
                if (gap < RACE.towReach) want *= 1 + RACE.tow * (1 - gap / RACE.towReach);          // the tow
                if (!player) want *= 1 + RACE.band * Math.min(1, Math.max(0, (gap - 7) / 20));     // the band: nobody drifts away
            }
            let held = false;
            if (blocker) {   // everyone holds station behind the car it would run into, passing or not
                const gap = blocker.s - c.s;
                if (gap < RACE.follow) {
                    const edge = want - blocker.v;
                    /* no pass starts across a visitor who is alongside either car of it; a pass on the visitor is fine */
                    const third = drive.car && drive.car !== c && drive.car !== blocker && (Math.abs(drive.car.s - c.s) < CAR.length + 1.5 || Math.abs(drive.car.s - blocker.s) < CAR.length + 1.5);
                    if (!player && !passing && !race.pass && !third && corner < 0.25 && edge > RACE.edge && gap >= CAR.length + 0.4 && t - race.lastPass > RACE.rest)
                        race.pass = { car: order[k], over: bi, t0: t, side: race.passes % 2 ? -1 : 1 };
                    else { want = Math.min(want, blocker.v * (gap < RACE.follow - 0.8 ? 0.96 : 1)); held = true; }
                }
            }
            if (!ahead && !player) {
                const behind = order.length > 1 ? c.s - cars[order[1]].s : 0;
                want *= 1 - RACE.drag * Math.min(1, Math.max(0, (behind - 8) / 20));                // the leader in clean air, reeled in
            }
            if (passing) {   // pull out at the other car's pace, commit once clear of it across the track and nothing blocks; an abort drops back first, still offset
                const over = cars[race.pass.over], clear = Math.abs(c.lateral - over.lateral) >= RACE.clear, gap = over.s - c.s;
                if (race.pass.abort) want = Math.min(want, over.v * 0.93);
                else if (clear) { if (!held) want *= 1 + RACE.commit; }
                else if (gap > 0 && gap < CAR.length + 0.8) want = Math.min(want, over.v * 0.94);   // only while still behind: ahead of a visitor who is holding station, slowing to their pace would stall both
            }
            if (passed && !player && !race.pass.abort && Math.abs(c.lateral - cars[race.pass.car].lateral) >= RACE.clear) want *= 1 - RACE.lift;
            c.v += (want - c.v) * Math.min(1, dt * (want < c.v ? 7 : 2.4));   // the brakes bite, the throttle builds
            /* the firm end of the hold: inside a third of a length of the
               follow distance the car's speed is clamped to its blocker's,
               so a long frame (a throttled tab, a slow phone) cannot shrink
               the gap under a car length. Eight cars make more trains, and
               the player closes faster than any of them. */
            if (held && blocker.s - c.s < RACE.firm) c.v = Math.min(c.v, blocker.v);
            c.s += c.v * dt;
            if (player) {   // the steer sets the lateral; the lane stays inside the white line; a car alongside is a wall
                c.lateral += (drive.input.steer * DRIVE.reach - c.lateral) * Math.min(1, dt * DRIVE.turn);
                const rl = racingLine(c.s);
                c.lateral = Math.max(-DRIVE.edge - rl, Math.min(DRIVE.edge - rl, c.lateral));
                c.lane = rl + c.lateral;
                wall(c);
            } else {
                const side = race.pass ? race.pass.side : 0, aimLat = passing ? RACE.pass * side : passed ? -RACE.inside * side : 0;
                c.lateral += (aimLat - c.lateral) * Math.min(1, dt * 2.6);
            }
            c.lane = racingLine(c.s) + c.lateral;
            c.pose = placeAt(c.group, c.s, c.lane);
        }
        if (drive.car) {   // the lap and the passes, from distance alone, with a third of a car of hysteresis so a dead heat is not ten passes
            const c = drive.car;
            if (drive.halo) {   // the ring under the car fades through the last half second of its time
                const h = drive.halo; h.t += dt;
                h.mesh.material.opacity = 0.6 * Math.max(0, Math.min(1, (HALO_S - h.t) / 0.5));
                if (h.t >= HALO_S) { c.group.remove(h.mesh); h.mesh.geometry.dispose(); h.mesh.material.dispose(); drive.halo = null; }
            }
            if (!drive.lapDone) { drive.t += dt; if (c.s - drive.s0 >= lap) { drive.lapDone = true; drive.lapTime = drive.t; } }
            for (const o of cars) {
                if (o === c) continue;
                const d = o.s - c.s;
                if (drive.ahead.has(o.id)) { if (d <= -DRIVE.hyst) { drive.ahead.delete(o.id); drive.passed.push(o.id); } }
                else if (d >= DRIVE.hyst) { drive.ahead.add(o.id); drive.passedBy.push(o.id); }
            }
        }
        if (race.pass) {
            const a = cars[race.pass.car], b = cars[race.pass.over], d = a.s - b.s;
            if (!race.pass.abort && d >= RACE.ahead) { race.pass = null; race.passes++; race.lastPass = t; }   // a length clear: back on the line
            else if (!race.pass.abort && t - race.pass.t0 > RACE.patience) { race.pass.abort = true; race.aborts++; }   // no way through: drop back, then tuck in
            else if (race.pass.abort && d <= -RACE.follow) { race.pass = null; race.lastPass = t; }
            else if (race.pass.abort && b.player && d > 0) { race.pass = null; race.lastPass = t; }   // a pass on the visitor that runs out of time while already ahead of them simply ends: the car is past and rejoins the line
        }
        const leader = cars[order[0]];
        race.lap = Math.max(1, Math.floor((leader.s - startS) / lap) + 1);
    }
    const gridState = () => {
        if (!cars.length || !race.order.length) return [];
        const leader = cars[race.order[0]], lv = Math.max(1, leader.v);
        return race.order.map((ci, k) => { const c = cars[ci], you = !!c.player; return { id: c.id, rank: k + 1, code: c.code, name: c.name, stop: c.stop, number: c.number, accent: c.accent, player: you,
            share: (pulse && !you) ? +pulse.share(c.id).toFixed(3) : 0, attend: you ? 0 : +(c.attendNow - 1).toFixed(4), flashedAt: (pulse && !you) ? pulse.flashedAt(c.id) : 0,   // the player is kept out of the attention store
            gap: +((leader.s - c.s) / lv).toFixed(2), s: +c.s.toFixed(2), v: +c.v.toFixed(2), lane: +c.lane.toFixed(2),
            at: [c.group.position.x, c.group.position.z], tx: c.pose ? c.pose.tx : 1, tz: c.pose ? c.pose.tz : 0,
            passing: !!(race.pass && race.pass.car === ci), passed: !!(race.pass && race.pass.over === ci) }; });
    };
    /* V1.5: the drive. startDrive puts the visitor's car at the back of the
       field, a follow distance and a half behind the last car; it is the
       last entry in cars, so the others keep their indices when it leaves. */
    function startDrive() {
        if (drive.car || !cars.length || !race.order.length) return drive.car;
        const last = cars[race.order[race.order.length - 1]];
        /* the one light car on the graphite: a paper body, ink flank lines, the wing edge in gold (fix round, 2026-10-10) */
        const paper = new THREE.MeshPhysicalMaterial({ color: C.paper, roughness: 0.35, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.25, flatShading: true });
        const g = makeCar(C.ink, 'YOU', { body: paper, wing: C.accent }); scene.add(g);
        g.userData.own = [paper];   // disposed with the car; the gloss, the accents and the shadow are shared and stay
        const c = { id: 'you', group: g, name: '', code: 'YOU', stop: null, project: null, number: 'YOU', accent: C.ink, player: true, pose: null, lane: 0, lateral: 0,
            s: last.s - DRIVE.back, v: last.v, attendNow: 1, pace: 1, grip: DRIVE.grip, top: 1, f1: 1, f2: 1, p1: 0, p2: 0 };
        cars.push(c);
        if (!reduced.matches) {   // a flat paper ring under the car for the first moment of the drive, so the eye lands on it during the fly
            const halo = new THREE.Mesh(new THREE.RingGeometry(3.4, 4.0, 48), new THREE.MeshBasicMaterial({ color: C.paper, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }));
            halo.rotation.x = -Math.PI / 2; halo.position.y = 0.12; g.add(halo);
            drive.halo = { mesh: halo, t: 0 };
        }
        drive.car = c; drive.t = 0; drive.s0 = c.s; drive.lapDone = false; drive.lapTime = 0; drive.passed = []; drive.passedBy = [];
        drive.input = { throttle: 0, steer: 0, brake: false };
        drive.ahead = new Set(cars.filter(o => o !== c && o.s > c.s).map(o => o.id));
        race.order = cars.map((x, i) => i).sort((a, b) => cars[b].s - cars[a].s);
        c.lane = racingLine(c.s); c.pose = placeAt(g, c.s, c.lane);
        if (fontsLoaded) numberCars();
        if (!running) { start(); if (!running) render(); }
        return c;
    }
    const setDriveInput = inp => {
        if (!inp) return;
        const th = +inp.throttle, st = +inp.steer;
        drive.input.throttle = Number.isFinite(th) ? Math.max(0, Math.min(1, th)) : 0;
        drive.input.steer = Number.isFinite(st) ? Math.max(-1, Math.min(1, st)) : 0;
        drive.input.brake = !!inp.brake;
    };
    function endDrive() {
        const c = drive.car; if (!c) return;
        const i = cars.indexOf(c);
        if (i >= 0) cars.splice(i, 1);
        scene.remove(c.group);
        if (drive.halo) { drive.halo.mesh.material.dispose(); drive.halo = null; }
        c.group.traverse(o => {   // its own geometry, its plate and its paper body; the gloss, the accents and the shadow material are shared and stay
            if (!o.isMesh) return;
            o.geometry.dispose();
            if (o.material.map) { o.material.map.dispose(); o.material.dispose(); }
        });
        for (const m of c.group.userData.own || []) m.dispose();
        if (race.pass && (race.pass.car === i || race.pass.over === i)) { race.pass = null; race.lastPass = race.t; }
        race.order = cars.map((x, k) => k).sort((a, b) => cars[b].s - cars[a].s);
        drive.car = null; drive.input = { throttle: 0, steer: 0, brake: false };
        if (reduced.matches) { stop(); render(); } else if (!running) render();
    }
    const driveState = () => {
        const c = drive.car;
        if (!c) return { on: false, t: 0, lapDone: false, lapTime: 0, rank: 0, passed: [], passedBy: [], v: 0, lane: 0, s: 0, lap: +lap.toFixed(1) };
        return { on: true, t: +drive.t.toFixed(2), lapDone: drive.lapDone, lapTime: +drive.lapTime.toFixed(2), rank: race.order.indexOf(cars.indexOf(c)) + 1,
                 passed: drive.passed.slice(), passedBy: drive.passedBy.slice(), v: +c.v.toFixed(2), lane: +c.lane.toFixed(2), lateral: +c.lateral.toFixed(2), s: +(c.s - drive.s0).toFixed(1), lap: +lap.toFixed(1),
                 throttle: drive.input.throttle, steer: drive.input.steer, brake: drive.input.brake };
    };
    const raceState = () => !cars.length ? { seed: race.seed, t: 0, lap: 1, passes: 0, aborts: 0, changes: 0, pass: null, leader: null } : ({ seed: race.seed, t: +race.t.toFixed(2), lap: race.lap, passes: race.passes, aborts: race.aborts, changes: race.changes,
        pass: race.pass ? { car: cars[race.pass.car].id, over: cars[race.pass.over].id, since: +(race.t - race.pass.t0).toFixed(1) } : null, leader: cars[race.order[0]].id });
    let fontsLoaded = false;
    function numberCars() {
        for (const c of cars) {
            if (c.group.userData.plated || !c.group.userData.number) continue;
            const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), new THREE.MeshBasicMaterial({ map: textTexture(c.group.userData.number, { w: 128, h: 96, font: 'italic 700 72px ' + CHAKRA, fill: C.ink, bg: C.paper }), side: THREE.DoubleSide, toneMapped: false }));
            plate.position.set(1.95, 0.63, 0); plate.rotation.set(-Math.PI / 2, 0, -Math.PI / 2); c.group.add(plate);
            c.group.userData.plated = true;
        }
    }
    const BY = L.HELI.height, BY_FLOOR = L.HELI.floor != null ? L.HELI.floor : BY;
    const bandEase = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
    /* The height is a band, not one number: the camera looks down at 30 degrees, so a hull that held
       HELI.height everywhere would leave the top of the desktop frame over the far straight. The plan sum
       x + z is the screen's up axis, so the hull cruises at HELI.height over the near half of the plate
       (the pit straight) and settles smoothly toward HELI.floor as it follows the leader away from the
       camera, climbing again on the way back. Nothing is pinned to the frame's edge. */
    const heightAt = (x, z) => BY_FLOOR + (BY - BY_FLOOR) * bandEase((x + z - 150) / 110);
    const air = { x: L.HELI.at[0], z: L.HELI.at[1], yaw: 0, pitch: 0, set: false };
    /* The helicopter is the camera ship. It rides high over whoever is
       leading, a little ahead of their nose, so the front of the race is
       findable in the wide shot without reading the Grid. It is slow and
       high on purpose: it lags the leader, so a pass shows as the aircraft
       drifting across to the other car. The skydiver on the Projects stop
       jumps from this same helicopter. No label, no hit box, not a stop. */
    function placeHeli(t, dt) {
        const lead = (cars.length && race.order.length) ? cars[race.order[0]] : null;
        let tx, tz;
        if (lead && lead.pose) { tx = lead.group.position.x + lead.pose.tx * L.HELI.lead; tz = lead.group.position.z + lead.pose.tz * L.HELI.lead; }
        else { const a = t * Math.PI * 2 / 240; tx = L.HELI.at[0] + Math.cos(a) * 18; tz = L.HELI.at[1] + Math.sin(a) * 9; }
        if (!air.set) { air.x = tx; air.z = tz; air.set = true; }
        const step = Math.min(1, Math.max(0, dt || 0.016) * (L.HELI.ease || 0.55));
        const px = air.x, pz = air.z;
        air.x += (tx - air.x) * step; air.z += (tz - air.z) * step;
        const dx = air.x - px, dz = air.z - pz;
        const speed = dt > 0 ? Math.hypot(dx, dz) / dt : 0;
        if (dx * dx + dz * dz > 1e-6) {
            const want = Math.atan2(-dz, dx);                       // local +x is the nose
            let d = want - air.yaw;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            air.yaw += d * Math.min(1, Math.max(0, dt || 0.016) * 1.1);   // it turns like an aircraft, not a drone
        }
        air.pitch += (-Math.min(1, speed / 8) * 0.1 - air.pitch) * Math.min(1, Math.max(0, dt || 0.016) * 2);   // nose down when it closes on the leader
        heli.position.set(air.x, heightAt(air.x, air.z) + Math.sin(t * 1.3) * 0.5, air.z);
        heli.rotation.set(0, air.yaw, air.pitch);
        /* no ground shadow: from this height it would land some fifty units from the hull, often past the
           plate edge, and nobody would read a faint disc that far away as this aircraft's. The height shows
           in the aircraft sitting clear above the buildings. */
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
        buildGrid();   // 1. the four cars, lapping from the first frame
        {   // 2. the start flag
            flagGeom = new THREE.PlaneGeometry(4.6, 2.9, 10, 5); flagBase = flagGeom.attributes.position.array.slice();
            const flag = new THREE.Mesh(flagGeom, new THREE.MeshBasicMaterial({ color: C.accent, side: THREE.DoubleSide, toneMapped: false }));
            flag.position.set(L.FLAG.at[0] + 2.5, 5.6, L.FLAG.at[1]); scene.add(flag);
        }
        {   // 4. the Betta helicopter (the blimp until round 6), the camera ship over the leader
            const b = new Builder(true);                               // the cabin, opaque paper-white
            b.box(-4.5, -2.3, 8.5, 4.6, 4.2, -2.1, 'x');
            b.geometry(new THREE.SphereGeometry(1, 12, 8), 'x', new THREE.Matrix4().compose(new THREE.Vector3(4, 0, 0), new THREE.Quaternion(), new THREE.Vector3(3.4, 2.1, 2.3)));
            /* boom, fin, stabiliser, tail rotor, cowl, mast, skids and struts are one merged graphite mesh */
            const dark = new Builder(true);
            dark.box(-18, -0.6, 13.6, 1.2, 1.2, -0.4, 'x');            // the tail boom
            dark.box(-19, -0.25, 1.4, 0.5, 3.2, -0.9, 'x');            // the fin
            dark.box(-15.5, -2.2, 1.4, 4.4, 0.3, 0.5, 'x');            // the stabiliser
            dark.geometry(new THREE.CircleGeometry(2, 10), 'x', new THREE.Matrix4().makeTranslation(-18.3, 1.8, 0.85));   // the tail rotor disc
            dark.geometry(new THREE.CircleGeometry(2, 10), 'x', new THREE.Matrix4().makeTranslation(-18.3, 1.8, 0.85).multiply(new THREE.Matrix4().makeRotationY(Math.PI)));   // its back face, so the disc shows from either flank as the hull yaws round the lap
            dark.box(-4.5, -1.4, 5, 2.8, 1.1, 2.1, 'x');               // the engine cowl
            dark.box(-0.7, -0.7, 1.4, 1.4, 1.3, 3.2, 'x');             // the mast
            for (const side of [1, -1]) {
                dark.box(-6, side > 0 ? 2.2 : -2.65, 12, 0.45, 0.4, -3.6, 'x');   // a skid
                for (const u of [-3.5, 3]) dark.box(u, side > 0 ? 2.2 : -2.6, 0.4, 0.4, 1.6, -3.4, 'x');   // its struts
            }
            heli.add(new THREE.Mesh(dark.build(), M.graphite));
            heli.add(new THREE.Mesh(b.build(), M.cabin));
            {   // the main rotor: one faint disc, the blur a running rotor photographs as. Solid blades at this
                // frame rate step a fifth of a turn a frame and strobe, so none are drawn; the tail rotor is a disc too
                const disc = new THREE.Mesh(new THREE.CircleGeometry(10.8, 28), new THREE.MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
                disc.rotation.x = -Math.PI / 2; disc.position.y = 4.45; heli.add(disc);
            }
            heli.rotation.order = 'YZX';   // yaw, then the nose pitches in its own frame
            heli.scale.setScalar(1.4);
            scene.add(heli);   // decoration only: no label, no hit box (V1.3)
            placeHeli(0, 0);
        }
        {   // 5. the garage scope
            scopePos = new Float32Array(scopeN * 3);
            scopeGeom = new THREE.BufferGeometry(); scopeGeom.setAttribute('position', new THREE.BufferAttribute(scopePos, 3));
            const scope = new THREE.Line(scopeGeom, new THREE.LineBasicMaterial({ color: SIG.projects, toneMapped: false }));
            scope.position.set(GU + 37.5, 3.05, GV + 12.09); groups.projects.add(scope);
            glow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6), new THREE.MeshBasicMaterial({ color: SIG.projects, transparent: true, opacity: 0.12, depthWrite: false, toneMapped: false }));
            glow.position.set(GU + 37.5, 3.05, GV + 12.07); groups.projects.add(glow);
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
            ctx.fillStyle = SIG.economics; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, 50);
            const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping;
            const pw = eb[2] - 1.6, ph = 2.2; tex.repeat.set((pw / ph) / (tw / 96), 1);
            ticker = textPlane(tex, pw, ph, [eb[0] + eb[2] / 2, eb[5] + eb[4] + 1.5, eb[1] + eb[3] + 0.03], 0, groups.economics);
        }
        const board = L.LOCATIONS.find(l => l.id === 'contact');
        const bd = L.LOCATIONS.find(l => l.id === 'contact').boxes;   // the email board and the temperature board sit on their own boxes
        textPlane(textTexture(board.board.text, { w: 1024, h: 256, font: '700 96px ' + SCHIB, fill: C.ink, bg: C.paper, spacing: '2px' }), 5.6, 1.4, [bd[1][0] + 3, 2.5, WV + 0.02], 0, groups.contact);
        textPlane(textTexture('TRACK 29°', { w: 512, h: 192, font: '700 96px ' + CHAKRA, fill: SIG.contact, bg: C.ink }), 2.7, 1.0, [bd[2][0] + 1.5, 1.7, WV + 0.02], 0, groups.contact);
        textPlane(textTexture(L.NAME.toUpperCase(), { w: 2048, h: 96, font: 'italic 600 60px ' + CHAKRA, fill: C.paper, spacing: '18px' }), 72, 3.4, [105, -2.5, 210.03]);
        {   // BETTA painted inside T1 along the track, the way circuits paint their own name
            const f = fr[L.nearest(fr, L.RUNOFF.at)];
            const m = textPlane(textTexture(L.HELI.banner, { w: 1024, h: 256, font: 'italic 700 200px ' + CHAKRA, fill: C.paper, spacing: '30px' }), 18, 4.5, [L.RUNOFF.at[0], 0.06, L.RUNOFF.at[1]]);
            m.rotation.order = 'YXZ'; m.rotation.y = Math.atan2(-f.t[1], f.t[0]); m.rotation.x = -Math.PI / 2;
        }
        fontsLoaded = true; numberCars();
        barrierText();
        const ban = textTexture(L.HELI.banner, { w: 1024, h: 256, font: 'italic 700 190px ' + CHAKRA, fill: C.ink, spacing: '28px' });
        for (const side of [1, -1]) {   // BETTA on both flanks of the cabin
            const m = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 1.9), new THREE.MeshBasicMaterial({ map: ban, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
            m.position.set(-0.25, 0.1, 2.32 * side); m.rotation.y = side < 0 ? Math.PI : 0; heli.add(m);
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
    /* V1.2 ambient list: the four cars, the flag, the sleeve shimmer, one
       flickering board and the helicopter over the leader. Eight, the ceiling. The
       ticker and the scope hold still. */
    function tick(dt, t) {
        if (!built) return;
        placeCars(dt);
        placeHeli(t, dt);
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
    /* under reduced motion nothing runs on its own; a drive is the visitor
       asking for motion, so the loop runs for exactly as long as they hold the car */
    function start() { if (running || (reduced.matches && !drive.car) || !ready) return; running = true; last = performance.now(); secStart = last; secFrames = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    const onReduced = () => { if (reduced.matches && !drive.car) { stop(); if (built) placeCars(0); render(); } else start(); };
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
    const dressed = Promise.all([readyPromise, fontsReady]).then(dressHoardings, dressHoardings);
    const marked = Promise.all([readyPromise, fontJson]).then(([, font]) => buildMarks(font)).catch(err => console.warn('marks', err));

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
             cars, carAt: id => { const c = cars.find(k => k.id === id); return c && c.pose ? { x: c.group.position.x, z: c.group.position.z, tx: c.pose.tx, tz: c.pose.tz, s: c.s, v: c.v } : null; },
             gridState, raceState, passing: () => !!race.pass, stepRace: dt => placeCars(dt), dressed, marked, marks: () => markBoxes,
             startDrive, endDrive, setDriveInput, driveState, driving: () => !!drive.car, DRIVE, speed: RACE.speed,
             attend, attendStop, attendDwell, attendCase, attendCaseDwell, carsByStop, carByProject,
             attention: () => pulse ? L.GRID.map(c => ({ id: c.id, score: +pulse.scoreOf(c.id).toFixed(2), share: +pulse.share(c.id).toFixed(3) })) : [],
             anyAttention: () => !!pulse && pulse.anyAttention(),
             meanFps: () => stats.window.length ? stats.window.reduce((a, b) => a + b, 0) / stats.window.length : stats.fps };
}
