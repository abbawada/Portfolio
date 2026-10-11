/* Skydiving, a live tile for the Projects stop (round 6, fix round 1).
   One ES module, canvas 2D, no fetches, no libraries. mountSkydive(el,
   opts) builds a figure.sky: a 2:3 tile where the diver falls through
   clouds and the altimeter counts, which opens to a 16:10 jump the
   visitor steers and pulls, lands on the Wada Ring plate, then links to
   the reel. The scene says one number, the altitude, and nothing else.

   The jump starts on the skid of the Betta helicopter, the same aircraft
   that flies over the race leader on the Wada Ring (circuit/world.js):
   the diver hangs from it for a moment, lets go, and the helicopter
   recedes up the frame as the camera drops away with the diver. The
   compact tile shows the same helicopter passing when its count wraps
   back to 13,500 ft, and the first reduced-motion still is the exit.

   Time: freefall at 176 ft/s with one real second standing for four
   seconds of fall (13.5 s from 13,500 ft to pull height at 4,000 ft),
   after a 1.5 s exit during which the fall builds up to that rate.
   After the cue the clock halves, so the 2,500 ft of decision last 7 s;
   at 1,500 ft with no pull the automatic activation device opens the
   canopy on its own. The canopy flies at 15 ft/s with one real second
   standing for fourteen (about 15 s of glide from a pull at the cue); a
   pull from higher up runs the canopy clock faster so the glide is still
   about 15 s. The altimeter always shows the true altitude.

   The ground is the plate from circuit/layout.js (the live copy when the
   page has loaded it, the same control points below otherwise), sampled
   with the same Catmull-Rom and drawn in the same tones, so the diver
   lands on the circuit. It surfaces out of the haze between 6,000 and
   2,000 ft.

   The module loads circuit/skydive.css itself when the page has not (and
   keeps the figure out of sight until that sheet lands), and sizes its
   canvas in px so the canvas can never size its own button. */

const REEL = 'https://www.instagram.com/reel/Ddv8Qr_gruP/';

const TOP_ALT = 13500, IDLE_RESET_ALT = 9000, CUE_ALT = 4000, AAD_ALT = 1500, FLARE_ALT = 50, FLARE2_ALT = 20;
const FF_RATE = 176 * 4;          // ft per real second in freefall
const CUE_RATE = 176 * 2;         // ft per real second once the cue is lit: 2,500 ft of decision in 7 s
const IDLE_RATE = 176 * 2;        // the compact tile counts at half speed, 13,500 to 9,000 in 12.8 s
const CAN_RATE = 15 * 14;         // ft per real second under the canopy, from a pull at the cue
const GLIDE_S = 15;               // a pull from higher up scales the canopy clock to about this glide
const OPEN_DROP = 850;            // ft lost during the 1.6 s opening from a pull at the cue, for that scaling
const FLARE_RATE = [90, 35];      // the two steps of the flare, ft per real second
const PLATE_C = 900;              // plate width on screen = 1.6 w * C / (alt + C)
const HAZE_TOP = 6000, HAZE_FULL = 2000;   // the plate is invisible above the first, solid below the second
const ARM_MS = 500;               // a click this soon after the jump starts is the double click, not a pull
const EXIT_S = 1.5;               // real seconds from the skid to the full-speed fall; the helicopter is out of frame by the end
const LETGO_S = 0.6;              // no pull before this: the diver is still holding the helicopter
const PASS_S = 1.8;               // the compact tile: how long the helicopter takes to pass out of the top after the wrap
const BANK_MAX = 25 * Math.PI / 180;
const YAW_MAX = 22 * Math.PI / 180;
const ISO_X = 0.8660254;

/* the diver in the site's own ink and gold; the one accent is the SKY car's pale sky from layout.js */
const SUIT = '#2a2b2e', RIG = '#1b1b1d', HELMET = '#1b1b1d', STRAP = '#8fd3ff', GLOVE = '#121214', SEAM = '#3a3b3f';
const PLATE_BG = 'rgba(42,43,46,0.86)';   // the altimeter plate, the same graphite as the tile's band
/* the helicopter in the world's own tones: the paper-white cabin, its grey edge, graphite for the rest, ink for the name */
const HELI_BODY = '#eceff2', HELI_EDGE = '#aeb6bc', HELI_DARK = '#2a2b2e', HELI_NAME = 'BETTA';

/* The circuit, a copy of circuit/layout.js so the tile also works where
   that script is not loaded. layout.js wins when it is present. */
const TRACK_COPY = [
    [30, 190], [100, 190], [170, 190],
    [190, 182], [199, 160],
    [186, 134], [198, 108],
    [190, 80], [168, 54],
    [128, 36], [84, 32],
    [40, 38], [14, 58], [12, 86],
    [34, 110], [18, 136],
    [10, 164], [18, 186]
];
const PIT_COPY = [[26, 168], [40, 178], [160, 178], [176, 174]];
const PALETTE_COPY = {
    plate: '#e6e0d3', grass: '#b7bfa3', asphalt: '#3b3b3d', paper: '#f7f5f0',
    wall: '#efece5', wallShade: '#c9c3b7', roof: '#6b675f', wood: '#d8bc93',
    accent: '#c6a15b', ink: '#141414'
};

function cr(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return [
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
    ];
}
function sample(pts, steps, closed) {
    const out = [], n = pts.length, segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
        const p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[closed ? (i + 1) % n : i + 1];
        const p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
        for (let k = 0; k < steps; k++) out.push(cr(p0, p1, p2, p3, k / steps));
    }
    if (!closed) out.push(pts[n - 1].slice());
    return out;
}
const iso = (u, v) => [(u - v) * ISO_X, (u + v) * 0.5];

function layout() {
    const L = typeof window !== 'undefined' ? window.CircuitLayout : null;
    return {
        SIZE: (L && L.SIZE) || 210,
        TRACK: (L && L.TRACK) || TRACK_COPY,
        PIT: (L && L.PIT) || PIT_COPY,
        WIDTH: (L && L.TRACK_WIDTH) || 9,
        START: (L && L.START) || { u: 100, v: 190 },
        PAL: Object.assign({}, PALETTE_COPY, (L && L.PALETTE) || {})
    };
}

/* Path2D in iso units, built once per mount; the frame scales them. */
function buildPlate(L) {
    const open = pts => { const p = new Path2D(); pts.forEach(([u, v], i) => { const s = iso(u, v); if (i) p.lineTo(s[0], s[1]); else p.moveTo(s[0], s[1]); }); return p; };
    const closed = pts => { const p = open(pts); p.closePath(); return p; };
    const rect = (u, v, w, d) => closed([[u, v], [u + w, v], [u + w, v + d], [u, v + d]]);
    const S = L.SIZE, half = L.WIDTH / 2;
    return {
        plate: closed([[0, 0], [S, 0], [S, S], [0, S]]),
        loop: closed(sample(L.TRACK, 8, true)),
        pit: open(sample(L.PIT, 6, false)),
        start: open([[L.START.u, L.START.v - half], [L.START.u, L.START.v + half]]),
        court: rect(106, 79, 28, 16),
        garage: rect(70, 160, 64, 15),
        stand: rect(84, 8, 52, 13)
    };
}

/* Clouds live at fixed altitudes, so the field is the same every jump
   and a still can show them without a clock. Three layers, thin enough
   that the diver's limbs always read. The compact idle streams the same
   field on a loop. */
const CLOUD_LO = 3000, CLOUD_SPAN = TOP_ALT - CLOUD_LO;
function makeClouds() {
    let seed = 1234567;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const out = [];
    const bands = [[CLOUD_LO, 13200, 10, 2], [3200, 13000, 9, 1], [3600, 12800, 8, 0]];   // near, mid, far
    for (const [lo, hi, n, layer] of bands) {
        const step = (hi - lo) / n;
        for (let i = 0; i < n; i++) out.push({ alt: lo + step * (i + 0.2 + rnd() * 0.6), x: (rnd() - 0.5) * 1.3, size: 0.6 + rnd() * 0.5, layer });
    }
    return out;
}
const CLOUD_K = [0.19, 0.35, 0.6];        // px per ft at a 348 px tall tile, far to near
const CLOUD_R = [0.11, 0.17, 0.23];       // radius as a share of the width
const CLOUD_A = [0.55, 0.66, 0.4];        // the near layer stays thin so the diver always reads
const CLOUD_PX = [0.6, 1, 1.5];           // parallax against the steering shift

const SKY = [[13500, [27, 59, 126]], [9000, [47, 102, 179]], [5000, [110, 162, 214]], [2000, [168, 203, 230]], [0, [216, 231, 240]]];
function skyRGB(alt, out) {
    for (let i = 0; i < SKY.length - 1; i++) {
        const [a0, c0] = SKY[i], [a1, c1] = SKY[i + 1];
        if (alt <= a0 && alt >= a1) {
            const t = (a0 - alt) / (a0 - a1);
            for (let k = 0; k < 3; k++) out[k] = Math.round(c0[k] + (c1[k] - c0[k]) * t);
            return out;
        }
    }
    const c = alt > TOP_ALT ? SKY[0][1] : SKY[SKY.length - 1][1];
    out[0] = c[0]; out[1] = c[1]; out[2] = c[2];
    return out;
}

/* Poses, left side only, in diver units; the right side mirrors. e elbow,
   h hand, k knee, f foot. Shoulders sit at (12, -14), hips at (8, 18). */
const POSE = {
    arch:    { e: [-36, -10], h: [-44, -36], k: [-20, 44], f: [-30, 66] },
    track:   { e: [-30, -2],  h: [-34, 20],  k: [-10, 46], f: [-12, 72] },
    forward: { e: [-40, -16], h: [-38, -44], k: [-26, 38], f: [-22, 52] },
    hang:    { e: [-16, -30], h: [-14, -46], k: [-6, 40],  f: [-7, 64] },
    flare:   { e: [-24, -4],  h: [-22, 14],  k: [-8, 40],  f: [-10, 60] }
};
const KEYS = ['e', 'h', 'k', 'f'];
function mixPose(out, a, b, t) {
    for (const key of KEYS) { out[key][0] = a[key][0] + (b[key][0] - a[key][0]) * t; out[key][1] = a[key][1] + (b[key][1] - a[key][1]) * t; }
    return out;
}
function newPose() { return { e: [0, 0], h: [0, 0], k: [0, 0], f: [0, 0] }; }

const clamp = (x, lo, hi) => x < lo ? lo : x > hi ? hi : x;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const backOut = t => { t = clamp(t, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const lerp = (a, b, t) => a + (b - a) * t;
function fmtAlt(a) {
    a = Math.max(0, Math.round(a / 10) * 10);
    return (a >= 1000 ? Math.floor(a / 1000) + ',' + String(a % 1000).padStart(3, '0') : String(a)) + ' FT';
}
const fmtFeet = a => fmtAlt(a).replace(' FT', ' feet');
function rrect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
}

/* the one line of copy under the scene: four words in freefall, three under the canopy */
const HINT = {
    pointer: { freefall: 'Move to steer. Click to pull.', canopy: 'Move to steer.' },
    touch:   { freefall: 'Drag to steer. Tap to pull.',   canopy: 'Drag to steer.' }
};
const LABEL = {
    idle: 'Skydiving, press to jump',
    freefall: 'Skydiving, arrow keys steer, press to pull',
    canopy: 'Skydiving, arrow keys steer the canopy',
    again: 'Skydiving, press to jump again',
    stillPull: 'Skydiving, press to pull',
    stillLand: 'Skydiving, press to land'
};
const STILL_SAY = ['Exit from the helicopter, 13,500 feet', 'Pull height, 4,000 feet', 'Canopy open, 2,000 feet', 'Landed'];

/* The stylesheet: index.html may not link circuit/skydive.css, so the
   module links it once itself, next to its own URL and with the same
   build query. Until it arrives the canvas is already out of flow (below)
   so nothing can inflate the panel. */
let stylesChecked = false, stylesLink = null, stylesReady = true;
function ensureStyles() {
    if (stylesChecked) return;
    stylesChecked = true;
    try {
        for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
            if (/skydive\.css/.test(link.getAttribute('href') || '')) return;
        }
        const me = new URL(import.meta.url);
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = new URL('./skydive.css' + me.search, me).href;
        const ready = () => { stylesReady = true; };
        link.addEventListener('load', ready, { once: true });
        link.addEventListener('error', ready, { once: true });
        stylesReady = false; stylesLink = link;
        document.head.appendChild(link);
    } catch (err) { stylesReady = true; /* no document.head or no import.meta: the inline canvas sizing below still holds */ }
}

export function mountSkydive(el, opts) {
    'use strict';
    opts = opts || {};
    const href = opts.href || REEL;
    const onJump = typeof opts.onJump === 'function' ? opts.onJump : null;
    const onLink = typeof opts.onLink === 'function' ? opts.onLink : null;
    const L = layout(), PAL = L.PAL, paths = buildPlate(L), clouds = makeClouds();
    const isGrid = el.classList.contains('ring-grid');
    ensureStyles();
    if (!isGrid) el.classList.add('sky-host');

    /* ---- DOM ---- */
    const fig = document.createElement('figure');
    fig.className = 'sky';
    fig.dataset.phase = 'idle';
    fig.innerHTML =
        '<button type="button" class="sky-tile" aria-label="' + LABEL.idle + '">' +
            '<canvas class="sky-canvas" aria-hidden="true"></canvas>' +
            '<span class="sky-band" aria-hidden="true"><span class="sky-name">Skydiving</span><span class="sky-jump">Jump</span></span>' +
        '</button>' +
        '<div class="sky-controls">' +
            '<p class="sky-hint">' + HINT.pointer.freefall + '</p>' +
            '<button type="button" class="sky-pull">Pull</button>' +
            '<button type="button" class="sky-next">Next</button>' +
            '<span class="sky-end"><a class="sky-reel" target="_blank" rel="noopener noreferrer" aria-label="Watch the reel, opens in a new tab">Watch the reel</a>' +
            '<button type="button" class="sky-again">Jump again</button></span>' +
            '<button type="button" class="sky-close">Back</button>' +
        '</div>' +
        '<span class="sky-status ring-visually-hidden" aria-live="polite"></span>';
    const tile = fig.querySelector('.sky-tile'), canvas = fig.querySelector('.sky-canvas');
    const hint = fig.querySelector('.sky-hint'), pullBtn = fig.querySelector('.sky-pull'), nextBtn = fig.querySelector('.sky-next');
    const reel = fig.querySelector('.sky-reel'), againBtn = fig.querySelector('.sky-again'), closeBtn = fig.querySelector('.sky-close');
    const status = fig.querySelector('.sky-status');
    reel.href = href;
    /* the three load-bearing canvas rules, inline, so a page without the stylesheet cannot be inflated by the canvas */
    canvas.style.position = 'absolute'; canvas.style.left = '0'; canvas.style.top = '0'; canvas.style.display = 'block';
    el.appendChild(fig);
    const ctx = canvas.getContext('2d');

    /* ---- state ---- */
    const S = {
        mode: 'idle',           // idle (compact loop), jump, stills (reduced motion)
        phase: 'freefall',      // freefall, opening, canopy, flare, landed
        alt: TOP_ALT, skyAlt: TOP_ALT, time: 0, t: 0, openT: 0,
        rate: FF_RATE, canRate: CAN_RATE,
        sx: 0, sy: 0, bank: 0, yaw: 0, sway: 0,
        lu: 100, lv: 203,       // the plan point under the diver: grass outside the pit straight
        cue: false, cueT: 0, aad: false, pulled: false, flare: 0, ended: false, quiet: false,
        scroll: 0, wrap: 0,     // the idle cloud stream and the idle digit wrap
        exitT: -1,              // real seconds since the jump started, while the helicopter is still in the picture; -1 otherwise
        passT: -1,              // the compact tile: real seconds since the helicopter began its pass after the wrap; -1 otherwise
        still: 0
    };
    const steerT = { x: 0, y: 0 };
    const keys = { left: false, right: false, up: false, down: false };
    const pose = newPose(), poseA = newPose(), poseL = newPose(), poseR = newPose();
    const rgb = [0, 0, 0];
    let open = false, destroyed = false, visible = true, raf = 0, last = 0, frameN = 0, armedAt = 0;
    let w = 0, h = 0, dpr = 1;
    let drag = null, dragMoved = false, touchHint = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(hover: none) and (pointer: coarse)');
    let reducedNow = reduced.matches;
    if (coarse.matches) setTouchHint();
    fig.classList.toggle('is-reduced', reducedNow);

    const bound = [];
    function on(target, type, fn, o) { target.addEventListener(type, fn, o); bound.push([target, type, fn, o]); }
    function say(text) { status.textContent = text; }
    function setTouchHint() { if (!touchHint) { touchHint = true; setHint(); } }
    function setHint() { hint.textContent = HINT[touchHint ? 'touch' : 'pointer'][S.phase === 'freefall' ? 'freefall' : 'canopy']; }
    /* a control that is about to hide must not take keyboard focus down with it: the tile takes it, and the arrows keep steering */
    function refocus() {
        const a = document.activeElement;
        for (let i = 0; i < arguments.length; i++) {
            if (a === arguments[i]) { try { tile.focus({ preventScroll: true }); } catch (err) { tile.focus(); } return; }
        }
    }

    /* a stylesheet the module had to link itself is one round trip away on a cold cache: until it lands the
       figure stays out of sight (still in flow, so nothing jumps), an empty slot for that moment rather than the
       raw Pull, Watch the reel and Back text; a timer makes sure it can never stay hidden */
    let revealTimer = 0;
    function reveal() { if (revealTimer) { clearTimeout(revealTimer); revealTimer = 0; } fig.style.visibility = ''; }
    if (stylesLink && !stylesReady) {
        fig.style.visibility = 'hidden';
        on(stylesLink, 'load', reveal); on(stylesLink, 'error', reveal);
        revealTimer = setTimeout(reveal, 3000);
    }

    /* ---- sizing ---- */
    function resize() {
        const nw = tile.clientWidth, nh = tile.clientHeight;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        if (nw === w && nh === h && canvas.width === Math.round(nw * dpr)) return;
        w = nw; h = nh;
        if (w < 1 || h < 1) return;
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        if (!raf) draw();
    }
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(tile); else on(window, 'resize', resize);

    /* ---- the loop, only while on screen ---- */
    const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
        visible = entries[entries.length - 1].isIntersecting; syncLoop();
    }, { threshold: 0 }) : null;
    if (io) io.observe(fig);
    on(document, 'visibilitychange', syncLoop);

    function wantsLoop() {
        return !destroyed && visible && document.visibilityState !== 'hidden' && !reducedNow &&
            (S.mode === 'idle' || (S.mode === 'jump' && !S.quiet));
    }
    function syncLoop() {
        const want = wantsLoop();
        if (want && !raf) { last = 0; raf = requestAnimationFrame(tick); }
        else if (!want && raf) { cancelAnimationFrame(raf); raf = 0; draw(); }
    }
    function tick(ts) {
        raf = 0;
        if (destroyed) return;
        const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
        last = ts;
        update(dt);
        draw();
        if (wantsLoop()) raf = requestAnimationFrame(tick);
    }

    /* ---- physics, such as it is ---- */
    function driftGround(rate, dt) {
        /* steering slides the plan point under the diver, screen axes to plan axes */
        const x = S.sx * rate * dt, y = S.sy * rate * dt;
        S.lu = clamp(S.lu + x / (2 * ISO_X) + y, 6, L.SIZE - 6);
        S.lv = clamp(S.lv - x / (2 * ISO_X) + y, 6, L.SIZE - 6);
    }
    function update(dt) {
        S.time += dt;
        const ease = Math.min(1, dt * 6);
        const exiting = S.mode === 'jump' && S.phase === 'freefall' && S.exitT >= 0;
        S.sx += ((exiting ? 0 : steerT.x) - S.sx) * ease;   // no steering until the diver has left the skid
        S.sy += ((exiting ? 0 : steerT.y) - S.sy) * ease;
        if (S.mode === 'idle') {
            S.sway = Math.sin(S.time * 0.9) * 4 * Math.PI / 180;
            S.scroll += IDLE_RATE * dt;             // the clouds stream on this and never reset
            if (S.passT >= 0) { S.passT += dt; if (S.passT >= PASS_S) S.passT = -1; }
            if (S.wrap > 0) {                       // the digits dip out at 9,000 and back in at 13,500, 250 ms
                S.wrap += dt / 0.25;
                if (S.wrap >= 0.5 && S.alt < TOP_ALT) S.alt = TOP_ALT;
                if (S.wrap >= 1) { S.wrap = 0; S.passT = 0; }   // back at the top: the helicopter passes out of the frame
            } else {
                S.alt -= IDLE_RATE * dt;
                if (S.alt <= IDLE_RESET_ALT) { S.alt = IDLE_RESET_ALT; S.wrap = 0.0001; }
            }
            S.skyAlt += (S.alt - S.skyAlt) * Math.min(1, dt * 1.5);   // the sky eases back to deep blue, no cut
            if ((frameN++ & 7) === 0) postAlt();
            return;
        }
        if (S.mode !== 'jump') return;
        S.skyAlt = S.alt;
        switch (S.phase) {
            case 'freefall':
                if (S.cue) { S.cueT += dt; S.rate = lerp(FF_RATE, CUE_RATE, smooth(S.cueT / 0.8)); }
                if (exiting) {   // the exit: the fall builds from nothing on the skid to the full rate as the helicopter leaves the frame
                    S.exitT += dt;
                    S.alt -= S.rate * smooth(S.exitT / EXIT_S) * dt;
                    if (S.exitT >= EXIT_S) S.exitT = -1;
                } else S.alt -= S.rate * dt;
                S.bank += (S.sx * BANK_MAX - S.bank) * ease;
                if (!exiting) driftGround(9, dt);
                if (!S.cue && S.alt <= CUE_ALT) { S.cue = true; S.cueT = 0; pullBtn.classList.add('is-lit'); say('Pull height, ' + fmtFeet(S.alt)); postAlt(); }
                if (S.alt <= AAD_ALT) { S.aad = true; doPull(); }
                break;
            case 'opening': {
                S.openT += dt;
                const rate = lerp(S.rate, S.canRate, smooth((S.openT - 0.6) / 0.7));
                S.alt -= rate * dt;
                S.bank += (0 - S.bank) * ease;
                driftGround(4, dt);
                if (S.openT >= 1.6) { setPhase('canopy'); say('Canopy open, ' + fmtFeet(S.alt)); }
                break;
            }
            case 'canopy':
                S.openT += dt;
                S.alt -= S.canRate * dt;
                S.yaw += (S.sx * YAW_MAX - S.yaw) * Math.min(1, dt * 3);
                driftGround(7, dt);
                if (S.alt <= FLARE_ALT) { setPhase('flare'); S.t = 0; }
                break;
            case 'flare': {
                S.openT += dt; S.t += dt;
                const step = S.alt > FLARE2_ALT ? 0 : 1;
                S.flare += ((step ? 1 : 0.5) - S.flare) * Math.min(1, dt * 7);
                S.alt -= FLARE_RATE[step] * dt;
                S.yaw += (0 - S.yaw) * Math.min(1, dt * 3);
                if (S.alt <= 0) { S.alt = 0; setPhase('landed'); S.t = 0; say('Landed'); }
                break;
            }
            case 'landed':
                S.t += dt;
                if (!S.ended && S.t >= 1.0) { S.ended = true; refocus(closeBtn); fig.classList.add('is-landed'); tile.setAttribute('aria-label', LABEL.again); }
                if (S.t >= 3.0) S.quiet = true;
                break;
        }
        if ((frameN++ & 7) === 0) postAlt();
    }
    /* the altitude and phase on the figure, for tests and for anything that watches the DOM */
    function postAlt() { fig.dataset.alt = String(Math.max(0, Math.round(S.alt / 10) * 10)); }
    function setPhase(p) { S.phase = p; fig.dataset.phase = p; postAlt(); }

    /* ---- drawing ---- */
    function draw() {
        if (w < 1 || h < 1 || destroyed) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cx = w / 2, cy = h / 2;
        const alt = Math.max(0, S.alt);
        const stills = S.mode === 'stills';
        const freefall = S.phase === 'freefall';
        /* the snatch: the camera jolts up and the diver drops to canopy size */
        const o = S.phase === 'freefall' || S.mode === 'idle' ? 0 : S.openT;
        const snatch = o > 0.7 ? o - 0.7 : 0;
        const jolt = snatch > 0 && snatch < 1.6 ? -18 * Math.exp(-4.5 * snatch) * Math.sin(16 * snatch) * (h / 348) : 0;
        const settle = S.phase === 'landed' ? smooth(S.t / 1.2) : 0;
        const scaleD = (1 - 0.38 * smooth((o - 0.7) / 0.6)) + 0.13 * settle;
        const shiftX = -S.sx * 0.07 * w, shiftY = -S.sy * 0.05 * h;
        const k = clamp(Math.min(w, h) / 240, 0.55, 1.4);
        /* the exit: e runs 0 to 1 over EXIT_S (the first still holds it just after the let-go); the helicopter
           hangs at the top of the frame, then recedes as the camera drops away with the diver, who starts
           small on the near skid and comes to the centre at full size */
        const e = freefall && S.mode === 'jump' && S.exitT >= 0 ? S.exitT / EXIT_S : (stills && S.still === 0 ? 0.42 : -1);
        const recede = e >= 0 ? smooth((e - 0.2) / 0.8) : 1;
        const letgo = e >= 0 ? smooth((e - 0.12) / 0.45) : 1;
        let heliX = 0, heliY = 0, heliS = 0;
        if (e >= 0) {
            heliX = cx + w * (0.06 + 0.16 * recede);
            heliY = lerp(cy - 0.14 * h, -0.5 * h, recede);
            heliS = k * lerp(1, 0.5, recede);
        } else if (S.mode === 'idle' && S.passT >= 0) {   // the compact tile: the helicopter passes out of the top after the wrap
            const r = smooth(S.passT / PASS_S);
            heliX = cx + w * 0.12; heliY = lerp(0.2 * h, -0.5 * h, r); heliS = k * lerp(0.8, 0.45, r);
        }
        const diverS = e >= 0 ? lerp(0.45, 1, recede) : 1;
        const diverX = e >= 0 ? (heliX - 36 * heliS - cx) * (1 - recede) : 0;
        const diverY = e >= 0 ? (heliY + 42 * heliS - 64 * k * diverS - cy) * (1 - recede) : 0;

        /* sky */
        skyRGB(Math.max(0, S.skyAlt), rgb);
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgb(' + Math.round(rgb[0] * 0.82) + ',' + Math.round(rgb[1] * 0.85) + ',' + Math.round(rgb[2] * 0.92) + ')');
        g.addColorStop(1, 'rgb(' + Math.min(255, Math.round(rgb[0] * 1.08 + 8)) + ',' + Math.min(255, Math.round(rgb[1] * 1.06 + 8)) + ',' + Math.min(255, Math.round(rgb[2] * 1.03 + 8)) + ')');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        drawClouds(0, cx, cy, shiftX, shiftY, alt);
        drawGround(cx, cy, shiftX, shiftY + jolt, alt);
        drawShadow(cx, cy, shiftX, shiftY + jolt, alt, k, settle);
        if (heliS > 0) drawHeli(heliX, heliY, heliS, S.time * 22);
        drawClouds(1, cx, cy, shiftX, shiftY, alt);

        /* the diver group: canopy, lines, diver, pulse rings */
        ctx.save();
        ctx.translate(cx + diverX, cy + diverY + jolt * 0.4);
        ctx.scale(k * scaleD * diverS, k * scaleD * diverS);
        ctx.rotate(S.yaw);
        if (!freefall) drawCanopy(o, settle, stills);
        if (S.phase === 'landed') {
            const stand = stills ? 1 : smooth(S.t / 0.35);
            if (stand < 1) { ctx.globalAlpha = 1 - stand; drawDiver(0, 0, 1, 0); ctx.globalAlpha = 1; }
            ctx.globalAlpha = stand; drawStanding(); ctx.globalAlpha = 1;
        } else if (e >= 0) {
            /* on the skid the diver hangs from the strut, arms up (the hang pose); letting go, the arms open into the arch and the body rolls once */
            drawDiver(Math.sin(e * 7) * 0.22 * letgo * (1 - recede), 1 - letgo, 0, 0);
        } else {
            const bank = S.mode === 'idle' ? S.sway : S.bank;
            const hangT = smooth((o - 0.7) / 0.6);
            drawDiver(bank, hangT, freefall ? 1 : 0, S.flare);
        }
        ctx.restore();

        drawClouds(2, cx, cy, shiftX, shiftY, alt);
        drawAltimeter(alt);
    }

    function drawClouds(layer, cx, cy, shiftX, shiftY, alt) {
        const kAlt = CLOUD_K[layer] * (h / 348), r0 = CLOUD_R[layer] * w;
        const idle = S.mode === 'idle';
        ctx.fillStyle = layer === 2 ? '#f6f9fc' : '#eef4fa';
        ctx.globalAlpha = CLOUD_A[layer];
        for (let i = 0; i < clouds.length; i++) {
            const c = clouds[i];
            if (c.layer !== layer) continue;
            let d = idle ? TOP_ALT - S.scroll - c.alt : alt - c.alt;
            if (idle) d = ((d % CLOUD_SPAN) + CLOUD_SPAN * 1.5) % CLOUD_SPAN - CLOUD_SPAN / 2;   // the idle field loops, no reset
            const y = cy + d * kAlt + shiftY * CLOUD_PX[layer];
            const r = r0 * c.size;
            if (y < -r * 1.2 || y > h + r * 1.2) continue;
            const x = cx + c.x * w + shiftX * CLOUD_PX[layer];
            /* four lobes, each its own subpath so no joining line leaves a sliver */
            ctx.beginPath();
            ctx.moveTo(x + r * 0.62, y); ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
            ctx.moveTo(x - r * 0.18, y + r * 0.18); ctx.arc(x - r * 0.62, y + r * 0.18, r * 0.44, 0, Math.PI * 2);
            ctx.moveTo(x + r * 1.06, y + r * 0.2); ctx.arc(x + r * 0.66, y + r * 0.2, r * 0.4, 0, Math.PI * 2);
            ctx.moveTo(x + r * 0.6, y + r * 0.3); ctx.arc(x + r * 0.1, y + r * 0.3, r * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    /* the plate surfaces out of the haze: nothing above 6,000 ft, solid by 2,000 */
    function drawGround(cx, cy, shiftX, shiftY, alt) {
        const haze = smooth((HAZE_TOP - alt) / (HAZE_TOP - HAZE_FULL));
        if (haze <= 0) return;
        const widthPx = 1.6 * w * PLATE_C / (alt + PLATE_C);
        const s = widthPx / (2 * L.SIZE * ISO_X);
        const here = iso(S.lu, S.lv);
        ctx.save();
        ctx.globalAlpha = haze;
        ctx.translate(cx + shiftX, cy + shiftY);
        ctx.scale(s, s);
        ctx.translate(-here[0], -here[1]);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.fillStyle = PAL.plate; ctx.fill(paths.plate);
        ctx.strokeStyle = PAL.wallShade; ctx.lineWidth = 1.5 / Math.max(s, 0.05); ctx.stroke(paths.plate);
        /* the lawn: the infield and a verge either side of the track, so the landing is on grass */
        ctx.strokeStyle = PAL.grass; ctx.lineWidth = L.WIDTH * 3.6; ctx.stroke(paths.loop);
        ctx.fillStyle = PAL.grass; ctx.fill(paths.loop);
        ctx.strokeStyle = PAL.asphalt; ctx.lineWidth = L.WIDTH; ctx.stroke(paths.loop);
        if (s > 0.22) {
            ctx.strokeStyle = PAL.wallShade; ctx.lineWidth = 4; ctx.stroke(paths.pit);
            ctx.fillStyle = PAL.wood; ctx.fill(paths.court);
            ctx.fillStyle = PAL.roof; ctx.fill(paths.garage); ctx.fill(paths.stand);
            ctx.strokeStyle = PAL.paper; ctx.lineWidth = 1.4; ctx.stroke(paths.start);
        }
        ctx.restore();
    }

    /* the shadow of the falling figure closes in over the last 350 ft and hands over to the standing figure's own */
    function drawShadow(cx, cy, shiftX, shiftY, alt, k, settle) {
        const a = clamp(1 - alt / 350, 0, 1) * (1 - settle);
        if (a <= 0) return;
        ctx.fillStyle = 'rgba(20,20,20,' + (0.26 * a).toFixed(3) + ')';
        const rx = 34 * k * (0.4 + 0.6 * a);
        ctx.beginPath();
        ctx.ellipse(cx + shiftX, cy + shiftY + 6 * k, rx, rx * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    function limb(a, b, c) {
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]);
        ctx.strokeStyle = SUIT; ctx.lineWidth = 9; ctx.stroke();
        ctx.strokeStyle = PAL.accent; ctx.lineWidth = 1.8; ctx.stroke();
    }
    function dot(p, r, fill) { ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }

    /* belly to earth, seen from above and behind: head up the frame */
    function drawDiver(bank, hangT, steerable, flare) {
        const sy = steerable ? S.sy : 0;
        mixPose(poseA, POSE.arch, sy < 0 ? POSE.track : POSE.forward, Math.abs(sy) * steerable);
        mixPose(poseA, poseA, POSE.hang, hangT);
        mixPose(pose, poseA, POSE.flare, flare);
        const bn = bank / BANK_MAX;
        const kl = 1 + 0.08 * bn, kr = 1 - 0.12 * bn;
        for (const key of KEYS) {
            poseL[key][0] = pose[key][0] * kl; poseL[key][1] = pose[key][1];
            poseR[key][0] = -pose[key][0] * kr; poseR[key][1] = pose[key][1];
        }
        if (hangT > 0) {   // the toggles: the hand on the turn side comes down
            poseL.h[1] += 14 * Math.max(0, -S.sx) * hangT;
            poseR.h[1] += 14 * Math.max(0, S.sx) * hangT;
        }
        ctx.save();
        ctx.rotate(bank);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        limb([-8, 18], poseL.k, poseL.f); limb([8, 18], poseR.k, poseR.f);
        dot(poseL.f, 5, GLOVE); dot(poseR.f, 5, GLOVE);
        limb([-12, -14], poseL.e, poseL.h); limb([12, -14], poseR.e, poseR.h);
        dot(poseL.h, 4.5, GLOVE); dot(poseR.h, 4.5, GLOVE);
        /* torso */
        ctx.beginPath();
        ctx.moveTo(-15, -16); ctx.quadraticCurveTo(0, -22, 15, -16);
        ctx.lineTo(11, 22); ctx.quadraticCurveTo(0, 27, -11, 22); ctx.closePath();
        ctx.fillStyle = SUIT; ctx.fill();
        /* the rig and its straps */
        ctx.beginPath(); rrect(ctx, -9, -10, 18, 26, 4); ctx.fillStyle = RIG; ctx.fill();
        ctx.beginPath(); ctx.moveTo(-9, 2); ctx.lineTo(9, 2); ctx.strokeStyle = SEAM; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-10, -14); ctx.lineTo(-8, 12); ctx.moveTo(10, -14); ctx.lineTo(8, 12);
        ctx.strokeStyle = PAL.accent; ctx.lineWidth = 2; ctx.stroke();
        if (!S.pulled && S.mode !== 'stills' || (S.mode === 'stills' && S.still < 2)) dot([8, 12], 2.2, PAL.accent);
        /* helmet, strap, goggle rims */
        dot([0, -28], 11.5, HELMET);
        ctx.beginPath(); ctx.arc(0, -28, 9.5, Math.PI * 1.15, Math.PI * 1.75); ctx.strokeStyle = SEAM; ctx.lineWidth = 2.2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-10.5, -29.5); ctx.lineTo(10.5, -29.5); ctx.strokeStyle = STRAP; ctx.lineWidth = 3; ctx.stroke();
        dot([-11.5, -32], 2.6, STRAP); dot([11.5, -32], 2.6, STRAP);
        /* the altimeter on the left wrist, where the cue pulses */
        const wx = poseL.h[0] + (poseL.e[0] - poseL.h[0]) * 0.24, wy = poseL.h[1] + (poseL.e[1] - poseL.h[1]) * 0.24;
        dot([wx, wy], 3.2, PAL.accent); dot([wx, wy], 1.4, GLOVE);
        if (S.cue && !S.pulled) {
            const burst = S.mode === 'stills' ? 0.9 : S.cueT % 3.0;
            for (let j = 0; j < 3; j++) {
                const p = (burst - j * 0.4) / 1.1;
                if (p <= 0 || p >= 1) continue;
                ctx.beginPath(); ctx.arc(wx, wy, 6 + 50 * p, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(240,182,74,' + ((1 - p) * 0.95).toFixed(3) + ')'; ctx.lineWidth = 2.6; ctx.stroke();
            }
        }
        ctx.restore();
    }

    /* the Betta helicopter the diver leaves, seen from below and behind as the camera drops away: the cabin
       with BETTA on its flank and the glass nose, the boom and fin off to the right, the rotor a spinning blur
       above, the skids below. Units: the cabin is 100 wide at s = 1; the diver stands on the near skid at
       (-36, 42), clear of the name. The same tones as the aircraft over the Wada Ring. */
    function drawHeli(x, y, s, spin) {
        ctx.save();
        ctx.translate(x, y); ctx.scale(s, s);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        /* the rotor: a faint disc and three blades */
        ctx.beginPath(); ctx.ellipse(0, -40, 150, 13, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(42,43,46,0.16)'; ctx.fill();
        ctx.strokeStyle = 'rgba(42,43,46,0.75)'; ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
            const a = spin + i * Math.PI * 2 / 3;
            ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(Math.cos(a) * 150, -40 + Math.sin(a) * 13); ctx.stroke();
        }
        ctx.fillStyle = HELI_DARK; ctx.fillRect(-3, -40, 6, 14);   // the mast
        /* the boom, the stabiliser, the fin and the tail rotor */
        ctx.strokeStyle = HELI_DARK; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(44, -4); ctx.lineTo(140, -20); ctx.stroke();
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(126, -24); ctx.lineTo(146, -28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(134, -17); ctx.lineTo(150, -44); ctx.lineTo(148, -14); ctx.closePath(); ctx.fillStyle = HELI_DARK; ctx.fill();
        ctx.beginPath(); ctx.arc(149, -32, 13, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(42,43,46,0.35)'; ctx.lineWidth = 2; ctx.stroke();
        const b = spin * 1.7;
        ctx.beginPath(); ctx.moveTo(149 - Math.cos(b) * 13, -32 - Math.sin(b) * 13); ctx.lineTo(149 + Math.cos(b) * 13, -32 + Math.sin(b) * 13);
        ctx.strokeStyle = 'rgba(42,43,46,0.8)'; ctx.lineWidth = 2; ctx.stroke();
        /* the far skid, behind the cabin */
        ctx.strokeStyle = HELI_DARK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-34, 34); ctx.lineTo(44, 34); ctx.moveTo(-16, 22); ctx.lineTo(-17, 34); ctx.moveTo(22, 22); ctx.lineTo(23, 34); ctx.stroke();
        /* the cabin, its cowl, the glass nose and the name */
        ctx.beginPath(); rrect(ctx, -52, -26, 100, 50, 22); ctx.fillStyle = HELI_BODY; ctx.fill();
        ctx.strokeStyle = HELI_EDGE; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); rrect(ctx, -18, -34, 36, 10, 3); ctx.fillStyle = HELI_DARK; ctx.fill();
        ctx.beginPath(); ctx.ellipse(-30, -8, 17, 12, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(143,211,255,0.8)'; ctx.fill();
        ctx.font = 'italic 700 17px "Chakra Petch", "Schibsted Grotesk", sans-serif';
        ctx.letterSpacing = '0.12em'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = PAL.ink; ctx.fillText(HELI_NAME, 14, 4);
        ctx.letterSpacing = '0px';
        /* the near skid, the one the diver stands on */
        ctx.strokeStyle = HELI_DARK; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(-42, 42); ctx.lineTo(40, 42); ctx.moveTo(-22, 24); ctx.lineTo(-24, 42); ctx.moveTo(18, 24); ctx.lineTo(20, 42); ctx.stroke();
        ctx.restore();
    }

    /* landed: a person standing on the grass seen from straight above, helmet,
       shoulders, the tips of the shoes and a small shadow at the feet */
    function drawStanding() {
        ctx.beginPath(); ctx.ellipse(0, 6, 13, 5.5, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(20,20,20,0.26)'; ctx.fill();
        dot([-7, 8], 4, GLOVE); dot([7, 8], 4, GLOVE);
        ctx.beginPath(); rrect(ctx, -15, -10, 30, 12, 5); ctx.fillStyle = SUIT; ctx.fill();
        ctx.beginPath(); ctx.moveTo(-12.5, -8); ctx.lineTo(-12.5, 0); ctx.moveTo(12.5, -8); ctx.lineTo(12.5, 0);
        ctx.strokeStyle = PAL.accent; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
        ctx.beginPath(); rrect(ctx, -9, -26, 18, 10, 3); ctx.fillStyle = RIG; ctx.fill();
        dot([0, -10], 11.5, HELMET);
        ctx.beginPath(); ctx.moveTo(-10.5, -11.5); ctx.lineTo(10.5, -11.5); ctx.strokeStyle = STRAP; ctx.lineWidth = 3; ctx.stroke();
    }

    /* the pilot chute, the bag, seven cells, the lines and the slider */
    function drawCanopy(o, settle, stills) {
        const pc = smooth(o / 0.25), rise = smooth((o - 0.2) / 0.45);
        const inflate = backOut((o - 0.5) / 0.6), cells = clamp((o - 0.55) / 0.7, 0, 1), slider = smooth((o - 0.9) / 0.8);
        if (pc <= 0) return;
        const cyC = lerp(10, -95, rise) + 25 * settle;
        const W = 112 * Math.max(0.07, inflate), H = 34 * (1 - 0.62 * settle);
        const topW = W * 0.92;
        const shL = -12, shR = 12, shY = -14;
        const farY = cyC - H / 2;
        if (cells < 1) {
            /* the pilot chute does its job: a graphite round on its bridle, pulling the bag up */
            const pcStart = lerp(10, farY - 16, pc);
            ctx.beginPath(); ctx.moveTo(0, Math.min(farY, 10)); ctx.lineTo(0, pcStart);
            ctx.strokeStyle = '#4a4a4d'; ctx.lineWidth = 0.9; ctx.stroke();
            dot([0, pcStart], lerp(6, 4, cells), RIG); dot([0, pcStart], 2.4, PAL.accent);
        } else {
            /* open: it trails at the far edge, a small cream disc with a gold rim */
            const py = farY - 10 * (1 - 0.5 * settle);
            ctx.beginPath(); ctx.moveTo(0, farY); ctx.lineTo(0, py);
            ctx.strokeStyle = '#4a4a4d'; ctx.lineWidth = 0.6; ctx.stroke();
            dot([0, py], 4, PAL.wall);
            ctx.beginPath(); ctx.arc(0, py, 4, 0, Math.PI * 2); ctx.strokeStyle = PAL.accent; ctx.lineWidth = 1; ctx.stroke();
        }
        /* the lines, straight from the near edge to the shoulders; down, the canopy lies flat behind them */
        ctx.beginPath();
        for (let i = 0; i <= 6; i += 2) {
            const lx = -W / 2 + W * i / 6, ly = cyC + H / 2;
            const sx = i < 3 ? shL : i > 3 ? shR : (shL + shR) / 2;
            ctx.moveTo(lx, ly); ctx.lineTo(sx, shY);
        }
        ctx.strokeStyle = '#4a4a4d'; ctx.lineWidth = 0.9; ctx.stroke();
        /* the cream rectangle and its seven cells */
        ctx.beginPath();
        ctx.moveTo(-topW / 2, farY); ctx.lineTo(topW / 2, farY); ctx.lineTo(W / 2, cyC + H / 2); ctx.lineTo(-W / 2, cyC + H / 2); ctx.closePath();
        ctx.fillStyle = PAL.wall; ctx.fill();
        ctx.strokeStyle = PAL.wallShade; ctx.lineWidth = 1; ctx.stroke();
        const inset = 2.2;
        for (let i = 0; i < 7; i++) {
            const open = clamp((cells * 8 - Math.abs(i - 3) * 1.1) / 1.6, 0, 1) * (1 - 0.55 * settle);
            if (open <= 0) continue;
            const t0 = i / 7, t1 = (i + 1) / 7;
            const x0t = -topW / 2 + topW * t0 + inset, x1t = -topW / 2 + topW * t1 - inset;
            const x0b = -W / 2 + W * t0 + inset, x1b = -W / 2 + W * t1 - inset;
            const yt = cyC - (H / 2 - inset) * open, yb = cyC + (H / 2 - inset) * open;
            ctx.beginPath(); ctx.moveTo(x0t, yt); ctx.lineTo(x1t, yt); ctx.lineTo(x1b, yb); ctx.lineTo(x0b, yb); ctx.closePath();
            ctx.fillStyle = i === 3 ? PAL.accent : '#e8d7a9'; ctx.fill();
            ctx.strokeStyle = PAL.accent; ctx.lineWidth = 1; ctx.stroke();
        }
        /* the slider rides the lines down after the snatch */
        if (!stills || slider < 1) {
            const sy = lerp(cyC + H / 2, shY - 4, slider), sw = lerp(W * 0.5, 16, slider);
            ctx.beginPath(); rrect(ctx, -sw / 2, sy - 2.5, sw, 5, 2); ctx.fillStyle = RIG; ctx.fill();
        }
    }

    /* the one number, on a graphite plate so it reads over every sky and every cloud, with the barometer
       scale inside it once the scene is wide enough for the scale to read as one; the compact tiles (176 and
       232 px, where the short hairline under the gold tick read as a T before the digits) show the number alone */
    function drawAltimeter(alt) {
        const fs = clamp(Math.round(Math.min(w, h) * 0.062), 11, 20);
        const edge = Math.round(fs * 0.7), padX = Math.round(fs * 0.55), padY = Math.round(fs * 0.38);
        const scale = w >= 240;
        ctx.font = 'italic 600 ' + fs + 'px "Chakra Petch", "Schibsted Grotesk", sans-serif';
        ctx.letterSpacing = '0.06em';
        ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        const text = fmtAlt(alt);
        const tpl = ctx.measureText('13,500 FT').width;   // the plate holds the widest reading, so it never twitches
        const sw = scale ? Math.round(fs * 0.6) : 0;
        const pw = padX * 2 + sw + Math.ceil(tpl + fs * 0.12), ph = padY * 2 + Math.round(fs * 1.05);
        ctx.fillStyle = PLATE_BG;
        ctx.beginPath(); rrect(ctx, edge, edge, pw, ph, 3); ctx.fill();
        if (scale) {
            const bx = edge + padX + 0.5, top = edge + padY + 1, len = ph - padY * 2 - 2;
            ctx.strokeStyle = 'rgba(247,245,240,0.55)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(bx, top); ctx.lineTo(bx, top + len); ctx.stroke();
            const ty = top + len * (1 - clamp(alt / TOP_ALT, 0, 1));
            ctx.strokeStyle = '#f0b64a'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(bx - 3, ty); ctx.lineTo(bx + 3, ty); ctx.stroke();
        }
        const a = S.mode === 'idle' && S.wrap > 0 ? (S.wrap < 0.5 ? 1 - S.wrap * 2 : (S.wrap - 0.5) * 2) : 1;
        ctx.globalAlpha = smooth(a);
        ctx.fillStyle = PAL.paper;
        ctx.fillText(text, edge + padX + sw, edge + ph / 2 + fs * 0.04);
        ctx.globalAlpha = 1;
        ctx.letterSpacing = '0px';
    }

    /* ---- the sequence ---- */
    function resetJump() {
        S.alt = TOP_ALT; S.skyAlt = TOP_ALT; S.t = 0; S.openT = 0; S.bank = 0; S.yaw = 0; S.flare = 0; S.wrap = 0; S.scroll = 0;
        S.rate = FF_RATE; S.canRate = CAN_RATE;
        S.lu = 100; S.lv = 203;
        S.cue = false; S.cueT = 0; S.aad = false; S.pulled = false; S.ended = false; S.quiet = false;
        S.sx = 0; S.sy = 0; steerT.x = 0; steerT.y = 0;
        S.exitT = 0; S.passT = -1;   // every jump starts on the helicopter's skid
        setPhase('freefall');
        fig.classList.remove('is-landed');
        pullBtn.classList.remove('is-lit');
        pullBtn.hidden = false;
        setHint();
        say('');
    }
    function startJump() {
        if (destroyed) return;
        refocus(againBtn, reel);
        resetJump();
        armedAt = performance.now() + ARM_MS;
        if (reducedNow) { S.mode = 'stills'; setStill(0); }
        else { S.mode = 'jump'; tile.setAttribute('aria-label', LABEL.freefall); }
        if (onJump) onJump();
        syncLoop();
        if (!raf) draw();
    }
    /* the scene lands just under a sticky panel head (scroll-margin-top in the CSS), so the altimeter is never
       covered: on opening, and again after a pull the visitor made (reaching the Pull pill at the foot of a phone
       sheet scrolls the scene up under the head); the AAD's own pull never moves the page */
    function settleIntoView() {
        requestAnimationFrame(() => {
            if (destroyed || !open || !tile.scrollIntoView) return;
            try { tile.scrollIntoView({ block: 'nearest', behavior: reducedNow ? 'auto' : 'smooth' }); } catch (err) { /* an older signature */ }
        });
    }
    function doPull(byVisitor) {
        if (S.mode === 'stills') { setStill(S.still < 2 ? 2 : Math.min(3, S.still + 1)); return; }
        if (S.mode !== 'jump' || S.phase !== 'freefall') return;
        if (S.exitT >= 0 && S.exitT < LETGO_S) return;   // still holding the helicopter
        S.exitT = -1;
        S.pulled = true; S.openT = 0;
        S.canRate = Math.max(CAN_RATE, (S.alt - OPEN_DROP - FLARE_ALT) / GLIDE_S);   // a high pull still glides for about 15 s
        setPhase('opening');
        refocus(pullBtn);
        pullBtn.classList.remove('is-lit');
        pullBtn.hidden = true;
        setHint();
        tile.setAttribute('aria-label', LABEL.canopy);
        if (byVisitor) settleIntoView();
    }
    /* reduced motion: four cut stills, exit, pull cue, canopy, landed */
    function setStill(i) {
        S.still = i; S.mode = 'stills';
        S.sx = 0; S.sy = 0; S.bank = 0; S.yaw = 0; S.flare = 0; S.lu = 100; S.lv = 203; S.wrap = 0;
        S.cue = false; S.aad = false; S.pulled = false; S.ended = false;
        S.exitT = i === 0 ? EXIT_S * 0.42 : -1; S.passT = -1;   // the first still is the exit, just after the let-go
        if (i >= 2) refocus(pullBtn);
        if (i >= 3) refocus(nextBtn, closeBtn);
        pullBtn.classList.remove('is-lit');
        fig.classList.remove('is-landed');
        if (i === 0) { setPhase('freefall'); S.alt = TOP_ALT; S.openT = 0; pullBtn.hidden = false; }
        else if (i === 1) { setPhase('freefall'); S.alt = CUE_ALT; S.openT = 0; S.cue = true; S.cueT = 0.9; pullBtn.hidden = false; pullBtn.classList.add('is-lit'); }
        else if (i === 2) { setPhase('canopy'); S.alt = 2000; S.openT = 5; S.pulled = true; pullBtn.hidden = true; }
        else { setPhase('landed'); S.alt = 0; S.openT = 5; S.t = 2; S.pulled = true; S.ended = true; pullBtn.hidden = true; fig.classList.add('is-landed'); }
        S.skyAlt = S.alt;
        nextBtn.hidden = i >= 3;
        fig.dataset.alt = String(Math.round(S.alt));
        tile.setAttribute('aria-label', i >= 3 ? LABEL.again : i === 2 ? LABEL.stillLand : LABEL.stillPull);
        say(STILL_SAY[i]);
        draw();
    }
    /* motion is back: the still becomes the same moment of a running jump, not a new jump, so onJump stays quiet */
    function resumeStill() {
        const i = S.still;
        S.mode = 'jump'; nextBtn.hidden = true;
        S.rate = i === 1 ? CUE_RATE : FF_RATE; S.canRate = CAN_RATE; S.cueT = i === 1 ? 0.9 : 0;
        if (i !== 0) S.exitT = -1;   // the exit still resumes mid-exit; every other still is past the helicopter
        if (i === 3) { S.t = 2; S.ended = true; S.quiet = false; tile.setAttribute('aria-label', LABEL.again); }
        else if (i === 2) tile.setAttribute('aria-label', LABEL.canopy);
        else tile.setAttribute('aria-label', LABEL.freefall);
        setHint();
    }
    function doOpen() {
        if (destroyed) return;
        open = true;
        fig.classList.add('is-open');
        if (!isGrid) el.classList.add('is-open');
        resize();
        startJump();
        settleIntoView();
    }
    function doClose() {
        if (destroyed) return;
        refocus(pullBtn, nextBtn, reel, againBtn, closeBtn);
        open = false;
        fig.classList.remove('is-open', 'is-landed');
        if (!isGrid) el.classList.remove('is-open');
        S.mode = 'idle';
        resetJump();
        fig.dataset.phase = 'idle';
        pullBtn.classList.remove('is-lit');
        nextBtn.hidden = true;
        tile.setAttribute('aria-label', LABEL.idle);
        resize();
        syncLoop();
        if (!raf) draw();
    }

    /* ---- input ---- */
    on(tile, 'click', e => {
        if (dragMoved) { dragMoved = false; return; }
        if (!open) { doOpen(); return; }
        if (performance.now() < armedAt) return;   // the second half of a double click, or an impatient tap
        if (S.mode === 'stills') { if (S.still >= 3) startJump(); else doPull(); return; }
        if (S.phase === 'freefall') doPull(true);
        else if (S.ended) startJump();
    });
    on(pullBtn, 'click', () => doPull(true));
    on(nextBtn, 'click', () => { if (S.mode === 'stills') setStill(Math.min(3, S.still + 1)); });
    on(againBtn, 'click', startJump);
    on(closeBtn, 'click', doClose);
    on(reel, 'click', () => { if (onLink) onLink(); });

    on(tile, 'pointerdown', e => {
        if (!open) return;
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
            setTouchHint();
            drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; dragMoved = false;
            try { tile.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ }
        }
    });
    on(tile, 'pointermove', e => {
        if (!open || reducedNow) return;
        if (drag && e.pointerId === drag.id) {
            const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
            if (Math.hypot(dx, dy) > 8) dragMoved = true;
            steerT.x = clamp(dx / 70, -1, 1); steerT.y = clamp(dy / 70, -1, 1);
            return;
        }
        if (e.pointerType === 'mouse') {
            const r = tile.getBoundingClientRect();
            steerT.x = clamp((e.clientX - r.left - r.width / 2) / (r.width * 0.42), -1, 1);
            steerT.y = clamp((e.clientY - r.top - r.height / 2) / (r.height * 0.42), -1, 1);
        }
    });
    const release = e => {
        if (drag && (!e || e.pointerId === drag.id)) { drag = null; steerT.x = 0; steerT.y = 0; }
    };
    on(tile, 'pointerup', release);
    on(tile, 'pointercancel', release);
    on(tile, 'pointerleave', e => { if (e.pointerType === 'mouse' && !keys.left && !keys.right && !keys.up && !keys.down) { steerT.x = 0; steerT.y = 0; } });

    function keySteer() {
        steerT.x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        steerT.y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    }
    const ARROWS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    /* while the scene is open the arrows belong to it from anywhere inside the figure (the tile, Pull, Back, the
       reel): prevented, and stopped here so neither of the page's window listeners ever sees them (the stop hop in
       nav.js honours defaultPrevented; the case shelf's arrow handler in cases.js does not, and would move the
       focus to a case, after which the next press hops the panel and ends the jump) */
    on(fig, 'keydown', e => {
        if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); doClose(); return; }
        const k = ARROWS[e.key];
        if (k && open && fig.contains(document.activeElement)) {
            if (!reducedNow) { keys[k] = true; keySteer(); }
            e.preventDefault();
            e.stopPropagation();
        }
    });
    on(fig, 'keyup', e => { const k = ARROWS[e.key]; if (k) { keys[k] = false; keySteer(); } });
    on(fig, 'focusout', e => { if (!fig.contains(e.relatedTarget)) { keys.left = keys.right = keys.up = keys.down = false; keySteer(); } });

    const onReduced = () => {
        reducedNow = reduced.matches;
        fig.classList.toggle('is-reduced', reducedNow);
        if (open) {
            if (reducedNow && S.mode === 'jump') {
                const i = S.phase === 'freefall' ? (S.cue ? 1 : 0) : S.phase === 'landed' ? 3 : 2;
                setStill(i);
            } else if (!reducedNow && S.mode === 'stills') resumeStill();
        } else if (reducedNow) { S.alt = TOP_ALT; S.skyAlt = TOP_ALT; S.sway = 0; S.wrap = 0; S.scroll = 0; }
        syncLoop();
        if (!raf) draw();
    };
    if (reduced.addEventListener) on(reduced, 'change', onReduced); else reduced.addListener(onReduced);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!destroyed && !raf) draw(); });

    /* ---- start ---- */
    nextBtn.hidden = true;
    resize();
    postAlt();
    if (opts.compact === false) doOpen(); else syncLoop();
    if (!raf) draw();

    return {
        destroy() {
            if (destroyed) return;
            destroyed = true; open = false;
            if (raf) cancelAnimationFrame(raf); raf = 0;
            if (revealTimer) clearTimeout(revealTimer); revealTimer = 0;
            if (ro) ro.disconnect(); if (io) io.disconnect();
            for (const [t, type, fn, o] of bound) t.removeEventListener(type, fn, o);
            if (!reduced.addEventListener) reduced.removeListener(onReduced);
            bound.length = 0;
            if (fig.parentNode === el) el.removeChild(fig);
            if (!el.querySelector('.sky')) el.classList.remove('sky-host', 'is-open');   // a host shared with another tile keeps its classes
        },
        open() { doOpen(); },
        close() { doClose(); },
        jump() { if (destroyed) return; if (!open) doOpen(); else startJump(); }
    };
}
