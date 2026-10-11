/* The lab, variant B: Abba at a bench under one lamp, building Betta in
   six stages. A drawn, animated timeline on a 3:2 canvas, the cave as a
   set: full standing figure, the shelves filling up as the stages pass,
   a laptop at the right end of the bench from the third stage on.

   mountLab(el, opts) builds its own DOM inside el and returns
   { destroy, goTo, play, pause, stages }. Plain canvas 2D, no fetches,
   no libraries. STAGES holds every fact; the renderer reads its keys, so
   a seventh stage is one new object at the end of the array.

   Two canvases: a static layer (rock, lamp cone, shelves and what sits on
   them, bench, laptop body, the pinned cheque) redrawn only when the stage
   or the size changes, and the moving layer (the figure, the props he
   touches, the laptop screen, dust, sparks, rings) drawn every frame.
   The figure is drawn on its own transparent canvas so one lamp pass and
   one laptop pass can light it with source-atop gradients. */

export const STAGES = [
    {
        id: 'car', date: 'Nov 2025', title: 'Bluetooth Car',
        number: '1', unit: 'phone',
        line: 'A robot car on a breadboard, driven from a paired phone.',
        hair: 'twists', clothes: 'tee-navy', laptop: false, arm: null,
        bench: 'car', wall: null, shelf: [], floor: [],
        loop: 7, still: 2.35, hold: 7
    },
    {
        id: 'posture', date: 'Dec 2025', title: 'Posture Cue',
        number: '15 s', unit: 'of slouching',
        line: 'A posture monitor for a connected-devices class: an IMU on the chest, a buzz after 15 s of slouching.',
        hair: 'twists', clothes: 'tee-navy', laptop: false, arm: null,
        bench: 'board', wall: null, shelf: ['car'], floor: [],
        loop: 7, still: 4.98, hold: 7
    },
    {
        id: 'throws', date: 'Jan 2026', title: 'The first free throws',
        number: '100', unit: 'reads a second',
        line: 'Winter break on campus: the posture board strapped to a forearm, the first free throws read by a sensor.',
        hair: 'twists', clothes: 'tee-track', laptop: true, arm: 'board',
        bench: 'throw', wall: null, shelf: ['car', 'board'], floor: [],
        loop: 7, still: 2.5, hold: 7
    },
    {
        id: 'award', date: 'Apr 2026', title: 'Top 4 of 221',
        number: 'Top 4', unit: 'of 221',
        line: 'USC New Venture Seed Competition: 4th of 221, a $10,000 award.',
        hair: 'twists', clothes: 'blazer', laptop: true, arm: null,
        bench: 'cheque', wall: null, shelf: ['car', 'board'], floor: [],
        loop: 7, still: 3.0, hold: 7
    },
    {
        id: 'rig', date: 'Aug 2026', title: 'The rig',
        number: '6', unit: 'firmware versions',
        line: 'Six firmware versions later: a protoboard he soldered himself, two IMUs on the arm, vibration motors, a real rep on a real arm.',
        hair: 'curls', clothes: 'tank', laptop: true, arm: 'imus',
        bench: 'rig', wall: 'cheque', shelf: ['car', 'board'], floor: ['dumbbell'],
        loop: 7, still: 1.98, hold: 7
    },
    {
        id: 'sleeve', date: 'Oct 2026', title: 'The Betta sleeve',
        number: '21 of 28', unit: 'reps buzzed',
        line: 'The sleeve: a black knit arm sleeve with three grey pods. First court session, Oct 8: 21 of 28 reps buzzed.',
        hair: 'curls', clothes: 'hoodie', laptop: true, arm: 'sleeve',
        bench: 'sleeve', wall: 'cheque', shelf: ['car', 'board', 'rig'], floor: [],
        loop: 10.6, still: 6.6, hold: 14
    }
    /* the seventh stage goes here */
];

/* ------------------------------------------------------------ constants */
const W = 600, H = 400;            /* the logical frame, 3:2 */
const FX = 275, FEET = 368;        /* where he stands */
const SKIN = { lit: '#5f3f2d', mid: '#4a3226', shade: '#2d1c14', fade: '#3a2619' };
const HAIR = '#0f0b09';
const GOLD = '240,182,74', CYAN = '58,215,230', EMBER = '255,120,48';
const PAPER = '#f7f5f0';
const FONT = "600 italic 11px 'Chakra Petch', 'Schibsted Grotesk', sans-serif";

/* [lit, mid, shade] */
const CLOTHES = {
    'tee-navy': { top: ['#2f3a68', '#222b4f', '#161c36'], sleeve: 'short', pants: ['#1e1f25', '#141519'] },
    'tee-track': { top: ['#383a42', '#272930', '#191a1f'], sleeve: 'short', pants: ['#66686f', '#4c4e55'] },
    'blazer': { top: ['#26262b', '#171719', '#0d0d0f'], sleeve: 'long', pants: ['#1c1c20', '#121214'], lapel: '#303036', under: '#3a3b41' },
    'tank': { top: ['#2a2b30', '#1c1d21', '#121315'], sleeve: 'none', pants: ['#66686f', '#4c4e55'], stripe: '#d8d5cc' },
    'hoodie': { top: ['#6d47ad', '#55368c', '#3a2264'], sleeve: 'pushed', pants: ['#1e1f25', '#141519'], hood: true }
};

/* channels that hold their value until the next key instead of easing */
const DISCRETE = new Set(['ballAt', 'iron', 'led']);

/* ------------------------------------------------------------ helpers */
function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const ease = f => f <= 0 ? 0 : f >= 1 ? 1 : f * f * (3 - 2 * f);
const lerp = (a, b, f) => a + (b - a) * f;
function lerpV(a, b, f) {
    if (Array.isArray(a)) return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    return a + (b - a) * f;
}

/* keyframes: [[t, {channel: value}], ...] in time order; the first key
   must sit at 0 and the last at the loop length so the loop is seamless */
function track(keys) {
    const chans = {};
    keys = keys.slice().sort((a, b) => a[0] - b[0]);
    for (const k of keys) for (const n in k[1]) (chans[n] || (chans[n] = [])).push([k[0], k[1][n]]);
    return function (t, out) {
        for (const n in chans) {
            const c = chans[n];
            let i = 0;
            while (i < c.length - 1 && c[i + 1][0] <= t) i++;
            const a = c[i], b = c[i + 1];
            if (!b || t <= a[0] || DISCRETE.has(n)) { out[n] = a[1]; continue; }
            out[n] = lerpV(a[1], b[1], ease((t - a[0]) / (b[0] - a[0])));
        }
        return out;
    };
}

/* two-bone IK: shoulder, hand target, the two lengths, which side the
   elbow bends to (1 = screen left for a hanging arm, -1 = screen right) */
function ik(sx, sy, tx, ty, l1, l2, bend) {
    let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy) || 0.001;
    const max = l1 + l2 - 0.5, min = Math.abs(l1 - l2) + 0.5;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    if (d < min) { dx *= min / d; dy *= min / d; d = min; }
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const mx = sx + dx * a / d, my = sy + dy * a / d;
    return [mx - dy * h / d * bend, my + dx * h / d * bend, sx + dx, sy + dy];
}

function seg(c, x1, y1, x2, y2, w, color) {
    c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
}
function dot(c, x, y, r, color) {
    c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}
function rrect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}
function poly(c, pts, fill) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); }
}
function glow(c, x, y, r, rgb, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}

/* the lamp cone: how much light lands at a point, 0 to 1 */
function cone(x, y) {
    if (y < 84) return 0;
    const hw = 24 + (y - 84) * 0.92;
    return clamp(1 - Math.abs(x - 300) / hw, 0, 1) * clamp(1 - (y - 84) / 330, 0, 1);
}

/* ------------------------------------------------------------ the rock */
const ROCK = (function () {
    const rnd = mulberry(11);
    const cols = 11, rows = 7, cw = W / cols, rh = 346 / rows, pts = [];
    for (let r = 0; r <= rows; r++) {
        pts[r] = [];
        for (let c = 0; c <= cols; c++) {
            const jx = (c === 0 || c === cols) ? 0 : (rnd() - 0.5) * cw * 0.8;
            const jy = (r === 0 || r === rows) ? 0 : (rnd() - 0.5) * rh * 0.8;
            pts[r][c] = [c * cw + jx, r * rh + jy];
        }
    }
    const tris = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const a = pts[r][c], b = pts[r][c + 1], d = pts[r + 1][c], e = pts[r + 1][c + 1];
        const flip = rnd() < 0.5;
        for (const t of flip ? [[a, b, e], [a, e, d]] : [[a, b, d], [b, e, d]]) {
            tris.push({ p: t, l: 7 + rnd() * 5, cx: (t[0][0] + t[1][0] + t[2][0]) / 3, cy: (t[0][1] + t[1][1] + t[2][1]) / 3 });
        }
    }
    return tris;
})();

/* ------------------------------------------------------------ small props
   (the shelf versions and the bench versions share these) */
function ball(c, x, y, r, rot) {
    dot(c, x, y, r, '#d9772c');
    c.strokeStyle = '#2b190f'; c.lineWidth = Math.max(0.8, r * 0.1); c.lineCap = 'butt';
    c.beginPath(); c.ellipse(x, y, r * 0.42, r, rot || 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.ellipse(x, y, r, r * 0.42, rot || 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
    c.fillStyle = 'rgba(255,230,190,0.22)'; c.beginPath(); c.ellipse(x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.18, -0.6, 0, Math.PI * 2); c.fill();
}
function breadboard(c, x, y, w, h) {
    c.fillStyle = '#ebe9e2'; rrect(c, x, y, w, h, 1.5); c.fill();
    c.fillStyle = '#b8b6ae';
    for (let yy = y + 2.5; yy < y + h - 1; yy += 3) for (let xx = x + 2.5; xx < x + w - 1; xx += 3) c.fillRect(xx - 0.5, yy - 0.5, 1, 1);
}
function car(c, x, y, s, wheel, led, lite) {
    /* s scales; wheel is the tyre angle; led lights the blue dot */
    c.save(); c.translate(x, y); c.scale(s, s);
    const tyre = (tx, ty, r) => {
        dot(c, tx, ty, r, '#121316');
        c.strokeStyle = '#2b2c31'; c.lineWidth = 1.2;
        for (let i = 0; i < 8; i++) {
            const a = wheel + i * Math.PI / 4;
            c.beginPath(); c.moveTo(tx + Math.cos(a) * (r - 2.5), ty + Math.sin(a) * (r - 2.5)); c.lineTo(tx + Math.cos(a) * r, ty + Math.sin(a) * r); c.stroke();
        }
        dot(c, tx, ty, r * 0.35, '#26272c');
    };
    tyre(-24, -7, 8); tyre(24, -7, 8);
    poly(c, [[-30, -8], [-36, -3], [-36, 3], [-30, 8], [30, 8], [36, 3], [36, -3], [30, -8]], '#0d0e11');
    c.strokeStyle = '#33343a'; c.lineWidth = 1; c.beginPath(); c.moveTo(-30, -8); c.lineTo(30, -8); c.stroke();
    c.fillStyle = '#a9abb0'; rrect(c, -31, -2, 15, 6, 1); c.fill();         /* the pouch LiPo */
    breadboard(c, -28, -20, 56, 12);
    c.fillStyle = '#c4312d'; c.fillRect(6, -25, 14, 8); dot(c, 10, -21, 1, '#3a0e0c'); dot(c, 16, -21, 1, '#3a0e0c');
    c.fillStyle = '#1e2328'; c.fillRect(-24, -25, 16, 7);
    dot(c, -18, -21.5, 1.6, led ? '#5fb3ff' : '#1d3a5c');
    if (led) glow(c, -18, -21.5, 7, '95,179,255', 0.7);
    if (lite !== true) {
        const wires = [['#e8c23a', -14, -22, -2, -10, 8], ['#d8342e', 12, -16, 18, -9, 14], ['#0c0c0c', -10, -12, 4, -4, 20], ['#e8c23a', 20, -12, 26, -3, 26], ['#d8342e', -22, -11, -30, -4, -16], ['#0c0c0c', 0, -22, -8, -14, 0]];
        c.lineWidth = 1.3; c.lineCap = 'round';
        for (const w of wires) { c.strokeStyle = w[0]; c.beginPath(); c.moveTo(w[1], w[2]); c.quadraticCurveTo(w[3], w[4], w[5], w[2] + 6); c.stroke(); }
    }
    tyre(-24, 1, 9); tyre(24, 1, 9);
    c.restore();
}
function postureBoard(c, x, y, s, cyan, lite) {
    c.save(); c.translate(x, y); c.scale(s, s);
    breadboard(c, -36, -8, 72, 16);
    c.fillStyle = '#1b1f24'; rrect(c, -32, -5, 24, 9, 1); c.fill();                 /* Photon 2 */
    dot(c, -14, -0.5, 1.5, 'rgba(58,215,230,' + (0.35 + 0.65 * cyan) + ')');
    if (cyan > 0.3) glow(c, -14, -0.5, 7, CYAN, cyan * 0.7);
    c.fillStyle = '#2b5fa8'; c.fillRect(-4, -5, 11, 9);                            /* BNO055 */
    dot(c, 14, 0, 5, '#0b0b0d'); dot(c, 14, 0, 1.2, '#2a2a2e');                      /* the buzzer */
    c.fillStyle = '#7d7f85'; c.fillRect(22, -3, 5, 5); dot(c, 24.5, -0.5, 1, '#1a1a1c');   /* the button */
    c.fillStyle = '#e4c02a'; rrect(c, 24, 1, 12, 7, 1); c.fill();                   /* the yellow LiPo */
    if (!lite) {
        const wires = [['#e8c23a', -20, -2, -8, -12, 0, -4], ['#0c0c0c', -26, 4, -10, 10, 8, 3], ['#d8342e', 4, 3, 12, 8, 24, 5]];
        c.lineWidth = 1.2; c.lineCap = 'round';
        for (const w of wires) { c.strokeStyle = w[0]; c.beginPath(); c.moveTo(w[1], w[2]); c.quadraticCurveTo(w[3], w[4], w[5], w[6]); c.stroke(); }
    }
    c.restore();
}
function oled(c, x, y, rot, bar, s) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s || 1, s || 1);
    c.fillStyle = '#c4312d'; rrect(c, -16, -10, 32, 20, 1.5); c.fill();
    c.fillStyle = '#060607'; c.fillRect(-13, -7, 26, 13);
    c.fillStyle = '#1e2b2e'; c.fillRect(-11, -4, 22, 4);
    c.fillStyle = bar >= 0.98 ? '#9df3ff' : '#4fd6e8'; c.fillRect(-11, -4, 22 * clamp(bar, 0, 1), 4);
    c.fillStyle = '#c8f2f8'; c.font = "600 5px 'Chakra Petch', sans-serif"; c.textBaseline = 'middle'; c.textAlign = 'center';
    c.fillText(bar >= 0.98 ? 'PERFECT' : Math.round(4 + (1 - clamp(bar, 0, 1)) * 34) + '°', 0, 3);
    c.restore();
}
function protoboard(c, x, y, s, lite) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#2f6a3a'; rrect(c, -28, -12, 56, 24, 1.5); c.fill();
    c.fillStyle = 'rgba(214,160,92,0.55)';
    for (let yy = -9; yy <= 9; yy += 3) for (let xx = -25; xx <= 25; xx += 3) c.fillRect(xx - 0.6, yy - 0.6, 1.2, 1.2);
    c.fillStyle = '#1b1f24'; c.fillRect(-20, -7, 14, 9);                           /* the micro */
    dot(c, -13, -2.5, 1.3, 'rgba(58,215,230,0.9)');
    c.fillStyle = '#2b5fa8'; c.fillRect(4, -7, 9, 7);                               /* the driver */
    if (!lite) {
        const wires = [['#f0f0ea', -4, -2, 4, 6, 14, 2], ['#d8342e', -18, 6, -8, 12, 2, 8], ['#e8c23a', 10, -2, 20, 2, 22, 8], ['#0c0c0c', -24, -9, -16, -14, 0, -9]];
        c.lineWidth = 1.2; c.lineCap = 'round';
        for (const w of wires) { c.strokeStyle = w[0]; c.beginPath(); c.moveTo(w[1], w[2]); c.quadraticCurveTo(w[3], w[4], w[5], w[6]); c.stroke(); }
        /* solder beads */
        for (let i = 0; i < 7; i++) dot(c, -22 + i * 7, 9, 1.1, '#cfd2d8');
    }
    c.restore();
}
function imuBoard(c, x, y, rot, s) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s || 1, s || 1);
    c.fillStyle = 'rgba(247,245,240,0.5)'; c.fillRect(-9, -7, 18, 14);           /* tape */
    c.fillStyle = '#2b5fa8'; rrect(c, -5.5, -4, 11, 8, 1); c.fill();
    dot(c, 0, 0, 1.4, '#0f1a2c'); dot(c, -3.5, -2, 0.7, '#cfd2d8'); dot(c, 3.5, 2, 0.7, '#cfd2d8');
    c.restore();
}
function sleeveShape(c, x, y, rot, len, s, knit) {
    /* a black knit tube with three grey pods and three cuff buttons, laid
       along its axis from the elbow end (left) to the cuff (right) */
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    const half = len / 2;
    c.strokeStyle = '#121214'; c.lineWidth = 15; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-half, 0); c.lineTo(half, 0); c.stroke();
    if (knit) {
        c.strokeStyle = 'rgba(255,255,255,0.07)'; c.lineWidth = 1;
        for (let i = -half + 4; i < half; i += 4) { c.beginPath(); c.moveTo(i, -6); c.lineTo(i + 2, 6); c.stroke(); }
    }
    c.fillStyle = '#8f9299';
    for (const f of [-0.62, -0.1, 0.42]) { rrect(c, f * len - 6, -3.5, 12, 7, 3.5); c.fill(); }
    c.fillStyle = '#cfd2d8';
    for (const f of [0.74, 0.82, 0.9]) dot(c, f * len, 3, 1.1, '#cfd2d8');
    c.restore();
}
function lipo(c, x, y, leadTo) {
    c.fillStyle = '#9a9ca3'; rrect(c, x - 8, y - 4, 16, 8, 1.5); c.fill();
    c.fillStyle = '#6f7178'; c.fillRect(x - 6, y - 2, 12, 1.2);
    if (leadTo) {
        c.lineWidth = 1.2; c.lineCap = 'round';
        c.strokeStyle = '#d8342e'; c.beginPath(); c.moveTo(x + 8, y - 1.5); c.quadraticCurveTo((x + leadTo[0]) / 2, y - 8, leadTo[0], leadTo[1] - 1); c.stroke();
        c.strokeStyle = '#0c0c0c'; c.beginPath(); c.moveTo(x + 8, y + 1.5); c.quadraticCurveTo((x + leadTo[0]) / 2, y - 4, leadTo[0], leadTo[1] + 1); c.stroke();
    }
}
function jar(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s || 1, s || 1);
    c.fillStyle = 'rgba(247,245,240,0.13)'; rrect(c, -11, -30, 22, 30, 3); c.fill();
    c.strokeStyle = 'rgba(247,245,240,0.35)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#2a2a2e'; rrect(c, -12, -33, 24, 5, 1.5); c.fill();
    c.fillStyle = 'rgba(247,245,240,0.16)'; c.fillRect(-8, -24, 2, 20);
    c.restore();
}
function iron(c, hx, hy, dir, held, hot) {
    /* a soldering iron from the grip at (hx,hy) along dir; the tip glows */
    const gx = hx + dir[0] * 10, gy = hy + dir[1] * 10, sx = hx + dir[0] * 24, sy = hy + dir[1] * 24;
    seg(c, hx - dir[0] * 6, hy - dir[1] * 6, gx, gy, 6, '#2a2a2e');
    seg(c, gx, gy, sx - dir[0] * 4, sy - dir[1] * 4, 2.6, '#8e9096');
    seg(c, sx - dir[0] * 4, sy - dir[1] * 4, sx, sy, 1.6, hot ? '#ffc07a' : '#6c6e74');
    if (hot) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, sx, sy, 7, GOLD, 0.55); c.restore(); }
    if (!held) { c.strokeStyle = '#0b0b0d'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(hx - dir[0] * 6, hy - dir[1] * 6 + 4); c.lineTo(hx - dir[0] * 6 - 10, hy - dir[1] * 6 + 4); c.stroke(); }
}
function ironStand(c, x, y) {
    c.fillStyle = '#1f2024'; rrect(c, x - 12, y + 2, 26, 4, 1); c.fill();
    c.strokeStyle = '#8e9096'; c.lineWidth = 1;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x - 4 + i * 3.2, y - 3, 3.5, Math.PI * 0.9, Math.PI * 2.1); c.stroke(); }
    c.fillStyle = '#4a4b50'; rrect(c, x - 2, y + 2, 10, 2, 1); c.fill();
}
function cheque(c, x, y, s, rot, alpha) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s, s); c.globalAlpha = alpha == null ? 1 : alpha;
    c.fillStyle = 'rgba(0,0,0,0.35)'; rrect(c, -44, -26, 92, 58, 2); c.fill();
    c.fillStyle = '#efe6cf'; rrect(c, -46, -29, 92, 58, 2); c.fill();
    c.strokeStyle = '#cfc3a4'; c.lineWidth = 1; rrect(c, -42, -25, 84, 50, 1.5); c.stroke();
    c.fillStyle = '#2b2b2b'; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.font = "600 italic 10px 'Chakra Petch', sans-serif"; c.fillText('Betta', -36, -12);
    c.font = "600 italic 16px 'Chakra Petch', sans-serif"; c.textAlign = 'right'; c.fillText('$10,000', 36, 17);
    c.fillStyle = '#cfc3a4'; c.fillRect(-36, -6, 50, 1);
    c.restore();
}
function dumbbell(c, x, y) {
    c.fillStyle = 'rgba(0,0,0,0.5)'; c.beginPath(); c.ellipse(x, y + 8, 26, 4, 0, 0, Math.PI * 2); c.fill();
    seg(c, x - 14, y, x + 14, y, 4, '#4b4d53');
    for (const dx of [-17, 17]) {
        c.fillStyle = '#2a2b2f'; rrect(c, x + dx - 5, y - 9, 10, 18, 2); c.fill();
        c.fillStyle = '#3a3b41'; c.fillRect(x + dx - 5, y - 9, 10, 2);
    }
}

/* ------------------------------------------------------------ the static layer */
function drawStatic(c, stage, idx) {
    c.fillStyle = '#0a0b0d'; c.fillRect(0, 0, W, H);
    /* the rock wall: neutral graphite facets, a thin dark seam between */
    for (const t of ROCK) {
        poly(c, t.p, 'hsl(226,8%,' + t.l.toFixed(1) + '%)');
        c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 0.7; c.stroke();
    }
    /* the warm rim where the lamp catches an edge */
    for (const t of ROCK) {
        const k = cone(t.cx, t.cy);
        if (k <= 0.15) continue;
        c.strokeStyle = 'rgba(' + GOLD + ',' + (k * 0.11).toFixed(3) + ')'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(t.p[0][0], t.p[0][1]); c.lineTo(t.p[1][0], t.p[1][1]); c.lineTo(t.p[2][0], t.p[2][1]); c.closePath(); c.stroke();
    }
    /* floor */
    c.fillStyle = '#0d0e10'; c.fillRect(0, 346, W, H - 346);
    c.fillStyle = '#17181c'; c.fillRect(0, 345, W, 1.5);
    glow(c, 300, 350, 230, GOLD, 0.09);

    /* the forge, far right, dim: a brick box with a glowing mouth */
    c.fillStyle = '#17171a'; c.fillRect(546, 196, 50, 70);
    c.fillStyle = '#222226'; c.fillRect(546, 196, 50, 4); c.fillRect(546, 196, 3, 70);
    c.fillStyle = '#131316'; c.fillRect(566, 120, 10, 76);                        /* the flue */
    c.fillStyle = '#050506'; rrect(c, 556, 214, 32, 36, 3); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 1;
    for (let yy = 206; yy < 266; yy += 10) { c.beginPath(); c.moveTo(546, yy); c.lineTo(596, yy); c.stroke(); }

    /* shelves on the left wall, filling up */
    const planks = [118, 164, 212];
    for (const py of planks) {
        c.fillStyle = '#26272b'; c.fillRect(26, py, 124, 6);
        c.fillStyle = '#3a3b41'; c.fillRect(26, py, 124, 1.5);
        c.fillStyle = '#1a1b1f'; c.fillRect(30, py + 6, 4, 8); c.fillRect(142, py + 6, 4, 8);
    }
    const has = n => stage.shelf.indexOf(n) >= 0;
    /* shelf A */
    c.strokeStyle = '#3f4046'; c.lineWidth = 2;
    for (let r = 4; r <= 9; r += 2.5) { c.beginPath(); c.arc(44, 114, r, 0, Math.PI * 2); c.stroke(); }   /* a coil of wire */
    if (has('car')) car(c, 94, 110, 0.5, 0.3, false, true);
    if (idx >= 3) { c.fillStyle = '#9a9ca3'; c.beginPath(); c.arc(134, 110, 7, 0, Math.PI * 2); c.fill(); dot(c, 134, 110, 3, '#26272b'); }   /* a roll of tape */
    /* shelf B */
    if (has('board')) { postureBoard(c, 72, 160, 0.5, 0.5, true); oled(c, 100, 158, -0.3, 1, 0.45); }
    if (idx >= 2) { c.fillStyle = '#2b2c31'; c.fillRect(110, 150, 8, 14); c.fillStyle = '#35363c'; c.fillRect(119, 148, 7, 16); c.fillStyle = PAPER; c.globalAlpha = 0.25; c.fillRect(110, 150, 8, 1); c.fillRect(119, 148, 7, 1); c.globalAlpha = 1; }
    jar(c, 138, 164, 0.6);
    /* shelf C */
    if (idx >= 4) { c.fillStyle = '#5d5f66'; c.beginPath(); c.arc(48, 206, 6, 0, Math.PI * 2); c.fill(); dot(c, 48, 206, 2.2, '#26272b'); c.strokeStyle = '#cfd2d8'; c.lineWidth = 1; c.beginPath(); c.moveTo(53, 203); c.lineTo(60, 196); c.stroke(); }   /* solder spool */
    if (has('rig')) { protoboard(c, 96, 204, 0.5, true); c.strokeStyle = '#8e9096'; c.lineWidth = 1; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(82 + i * 2, 200); c.quadraticCurveTo(74 + i * 2, 190, 86 + i * 2, 186); c.stroke(); } }
    if (idx >= 4) { c.fillStyle = '#2a2b30'; c.fillRect(126, 198, 20, 14); c.fillStyle = '#3a3b41'; c.fillRect(126, 198, 20, 2); }   /* a box of parts */

    /* the lamp: cord, shade, bulb, then the cone over everything behind him */
    seg(c, 300, 0, 300, 56, 2, '#2a2a2e');
    poly(c, [[286, 56], [314, 56], [334, 86], [266, 86]], '#1b1b1e');
    c.strokeStyle = '#303035'; c.lineWidth = 1; c.beginPath(); c.moveTo(286, 56); c.lineTo(266, 86); c.stroke();
    seg(c, 266, 86, 334, 86, 1.5, 'rgba(' + GOLD + ',0.8)');
    dot(c, 300, 88, 4, '#ffe9b0');
    c.save(); c.globalCompositeOperation = 'lighter';
    glow(c, 300, 88, 26, GOLD, 0.6);
    for (const [k, a] of [[1, 0.055], [0.82, 0.06], [0.64, 0.065]]) {
        const g = c.createLinearGradient(0, 86, 0, 360);
        g.addColorStop(0, 'rgba(' + GOLD + ',' + (a * 3.2) + ')'); g.addColorStop(0.55, 'rgba(' + GOLD + ',' + a + ')'); g.addColorStop(1, 'rgba(' + GOLD + ',0)');
        poly(c, [[300 - 34 * k, 86], [300 + 34 * k, 86], [300 + 262 * k, 360], [300 - 262 * k, 360]], g);
    }
    c.restore();

    /* the laptop spill before the bench so it lands on the wall too */
    if (stage.laptop) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 462, 236, 120, CYAN, 0.16); c.restore(); }

    if (stage.wall === 'cheque') { cheque(c, 395, 139, 1, -0.03); dot(c, 395, 112, 2.6, '#f0b64a'); dot(c, 394, 111, 0.9, '#fff3d6'); }
    for (const f of stage.floor) if (f === 'dumbbell') dumbbell(c, 112, 352);
}

/* the bench layer: it sits between him and the camera, so it is drawn
   over his body and under his forearms and hands */
function drawFront(c, stage) {
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#1d1e22'; c.fillRect(156, 268, 9, 92); c.fillRect(531, 268, 9, 92);
    c.fillRect(160, 328, 376, 4);
    poly(c, [[150, 250], [540, 250], [550, 268], [140, 268]], '#2b2c30');
    poly(c, [[140, 268], [550, 268], [550, 282], [140, 282]], '#1f2024');
    seg(c, 140, 268, 550, 268, 1.5, 'rgba(' + GOLD + ',0.45)');
    c.save(); c.beginPath(); c.moveTo(150, 250); c.lineTo(540, 250); c.lineTo(550, 268); c.lineTo(140, 268); c.closePath(); c.clip();
    glow(c, 300, 258, 190, GOLD, 0.2); c.restore();
    /* cables along the front */
    c.lineCap = 'round';
    const cables = [[160, 274, 230, 300, 300, 276, '#0e0f11'], [300, 276, 360, 304, 430, 278, '#0e0f11'], [420, 276, 470, 296, 540, 278, '#121316']];
    for (const k of cables) { c.strokeStyle = k[6]; c.lineWidth = 3; c.beginPath(); c.moveTo(k[0], k[1]); c.quadraticCurveTo(k[2], k[3], k[4], k[5]); c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 1; c.stroke(); }
    seg(c, 232, 282, 228, 346, 2.5, '#0e0f11');
    /* the laptop body; the screen content is drawn live */
    if (stage.laptop) {
        poly(c, [[440, 244], [520, 244], [526, 258], [434, 258]], '#1d1e22');
        c.fillStyle = '#2a2b30'; for (let r = 0; r < 3; r++) for (let k = 0; k < 10; k++) c.fillRect(446 + k * 7 + r, 247 + r * 3, 5, 2);
        poly(c, [[446, 190], [518, 186], [520, 246], [448, 246]], '#1a1b1f');
        c.strokeStyle = '#34353b'; c.lineWidth = 1; c.stroke();
    }
    /* vignette */
    const g = c.createRadialGradient(300, 190, 150, 300, 200, 420);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
}

/* ------------------------------------------------------------ the figure */
function solve(P, now) {
    const dy = P.crouch * 14, br = Math.sin(now * 1.5) * 1.2;
    const t = P.turn;
    const sy = 196 + dy + P.lean * 10 + br * 0.8;
    const rs = [FX - 27 + t * 21, sy], ls = [FX + 27 - t * 13, sy];
    /* the arm is 44 + 40 when it is in the picture plane; a hand low on
       the bench or close to the shoulder points its forearm at the camera,
       so both bones read shorter and the elbow stays by the body */
    const arm = (S, Hd, bend) => {
        const d = Math.hypot(Hd[0] - S[0], Hd[1] - S[1]);
        const low = clamp((Hd[1] - S[1] - 26) / 34, 0, 1), near = clamp((50 - d) / 40, 0, 1);
        const l1 = 44 - 4 * low - 10 * near, l2 = Math.max(14, 40 - 15 * low - 20 * near);
        return ik(S[0], S[1], Hd[0], Hd[1], l1, l2, bend);
    };
    const r = arm(rs, P.rh, P.rb), l = arm(ls, P.lh, P.lb);
    const G = {
        dy, br, sy, rs, ls, hip: [FX, 262 + dy],
        head: [FX + t * 6 + P.lean * 7, 167 + dy + P.lean * 19 + br * 0.6],
        rE: [r[0], r[1]], rH: [r[2], r[3]], lE: [l[0], l[1]], lH: [l[2], l[3]]
    };
    const rd = Math.hypot(G.rH[0] - G.rE[0], G.rH[1] - G.rE[1]) || 1, ld = Math.hypot(G.lH[0] - G.lE[0], G.lH[1] - G.lE[1]) || 1;
    G.rDir = [(G.rH[0] - G.rE[0]) / rd, (G.rH[1] - G.rE[1]) / rd];
    G.lDir = [(G.lH[0] - G.lE[0]) / ld, (G.lH[1] - G.lE[1]) / ld];
    G.rFore = [lerp(G.rE[0], G.rH[0], 0.55), lerp(G.rE[1], G.rH[1], 0.55), Math.atan2(G.rDir[1], G.rDir[0])];
    G.lFore = [lerp(G.lE[0], G.lH[0], 0.5), lerp(G.lE[1], G.lH[1], 0.5), Math.atan2(G.lDir[1], G.lDir[0])];
    G.lUpper = [lerp(G.ls[0], G.lE[0], 0.5), lerp(G.ls[1], G.lE[1], 0.5), Math.atan2(G.lE[1] - G.ls[1], G.lE[0] - G.ls[0])];
    G.ironDir = [-0.72, 0.69];
    const held = P.held || 0;
    G.board = [lerp(300, (G.rH[0] + G.lH[0]) / 2 + 2, held), lerp(250, (G.rH[1] + G.lH[1]) / 2 + 4, held)];
    G.oled = [lerp(346, G.lH[0] + 2, held), lerp(246, G.lH[1] - 16, held)];
    G.buzzer = [G.board[0] + 14 + P.x, G.board[1] + P.y];
    G.tip = P.iron ? [G.rH[0] + G.ironDir[0] * 24 + P.x, G.rH[1] + G.ironDir[1] * 24 + P.y] : null;
    return G;
}

function headPath(c, hx, hy) {
    c.beginPath();
    c.moveTo(hx - 14, hy - 2);
    c.bezierCurveTo(hx - 14, hy - 21, hx + 14, hy - 21, hx + 14, hy - 2);
    c.bezierCurveTo(hx + 14, hy + 8, hx + 9, hy + 17.5, hx + 1, hy + 17.5);
    c.bezierCurveTo(hx - 7, hy + 17.5, hx - 14, hy + 8, hx - 14, hy - 2);
    c.closePath();
}

const STRANDS = (function () {
    const rnd = mulberry(3), out = [];
    for (let i = 0; i < 12; i++) {
        const a = Math.PI * (1.02 + i * 0.96 / 11);
        const px = Math.cos(a) * 13.5, py = -4 + Math.sin(a) * 15;
        const outward = (i / 11 - 0.5) * 2;
        out.push([px + (rnd() - 0.5) * 2, py + 1, outward * 5 + (rnd() - 0.5) * 3, 6 + rnd() * 5]);
    }
    return out;
})();

function drawUpper(c, S, E, C, bare) {
    if (C.sleeve === 'none' || bare) {
        seg(c, S[0], S[1], E[0], E[1], 12, SKIN.mid);
    } else if (C.sleeve === 'short') {
        seg(c, S[0], S[1], E[0], E[1], 12, SKIN.mid);
        seg(c, S[0], S[1], lerp(S[0], E[0], 0.62), lerp(S[1], E[1], 0.62), 13, C.top[1]);
    } else {
        seg(c, S[0], S[1], E[0], E[1], 12.5, C.top[1]);
    }
}
function drawFore(c, E, Hd, C, bare) {
    if (C.sleeve === 'long') seg(c, E[0], E[1], Hd[0], Hd[1], 11, C.top[1]);
    else if (C.sleeve === 'pushed') { seg(c, E[0], E[1], Hd[0], Hd[1], 10.5, SKIN.mid); seg(c, E[0], E[1], lerp(E[0], Hd[0], 0.42), lerp(E[1], Hd[1], 0.42), 12, C.top[1]); }
    else seg(c, E[0], E[1], Hd[0], Hd[1], 10.5, SKIN.mid);
}
function drawHand(c, Hd, dir, flick) {
    const a = Math.atan2(dir[1], dir[0]) + flick * 1.15;
    const ex = Hd[0] + Math.cos(a) * 7, ey = Hd[1] + Math.sin(a) * 7;
    seg(c, Hd[0] - dir[0] * 1, Hd[1] - dir[1] * 1, ex, ey, 9.5, SKIN.mid);
    dot(c, ex, ey, 4.75, SKIN.lit);
}

function drawBody(c, P, G, stage, blink) {
    const C = CLOTHES[stage.clothes];
    const [hx, hy] = G.head, dy = G.dy;
    const lk = P.look * 0.9, tl = P.tilt;
    c.save(); c.translate(P.x, P.y);

    /* legs, feet */
    const kx = 11 + P.crouch * 8;
    for (const s of [-1, 1]) {
        const hip = [FX + s * 9, 262 + dy], knee = [FX + s * kx, 318 + dy * 0.55], ank = [FX + s * 12, 362];
        seg(c, hip[0], hip[1], knee[0], knee[1], 14, C.pants[1]);
        seg(c, knee[0], knee[1], ank[0], ank[1], 13, C.pants[0]);
        if (C.stripe) { seg(c, lerp(hip[0], knee[0], 0.3) + s * 4.5, lerp(hip[1], knee[1], 0.3), knee[0] + s * 4.5, knee[1], 1.4, C.stripe); seg(c, knee[0] + s * 4.5, knee[1], ank[0] + s * 4, ank[1] - 4, 1.4, C.stripe); }
        c.fillStyle = '#121214'; c.beginPath(); c.ellipse(ank[0] + s * 2, 366, 10, 4.5, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(247,245,240,0.35)'; c.beginPath(); c.ellipse(ank[0] + s * 2, 368.5, 10, 1.6, 0, 0, Math.PI * 2); c.fill();
    }

    /* the far upper arm (his left, screen right) */
    const bare = C.sleeve === 'none';
    drawUpper(c, G.ls, G.lE, C, bare);
    if (stage.arm === 'imus') imuBoard(c, G.lUpper[0], G.lUpper[1], G.lUpper[2], 1);

    /* torso */
    const t = P.turn;
    const hipL = [FX - 15 + t * 8, 268 + dy], hipR = [FX + 15 - t * 2, 268 + dy];
    if (C.hood) { c.fillStyle = C.top[2]; c.beginPath(); c.ellipse(hx + 3, hy + 15, 14, 7, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = SKIN.shade; c.fillRect(hx - 5 + t * 2, hy + 10, 10, 16);                /* the neck, in the jaw's shadow */
    if (bare) {
        poly(c, [[G.rs[0] + 2, G.sy - 1], [G.ls[0] - 2, G.sy - 1], [hipR[0], hipR[1]], [hipL[0], hipL[1]]], C.top[1]);
        dot(c, G.rs[0], G.sy, 7.5, SKIN.mid); dot(c, G.ls[0], G.sy, 7.5, SKIN.mid);
        dot(c, G.rs[0] - 2, G.sy - 3, 4, SKIN.lit); dot(c, G.ls[0] - 1, G.sy - 3, 4, SKIN.lit);
        seg(c, G.rs[0] + 3, G.sy - 4, G.rs[0] + 8, G.sy + 2, 2.5, C.top[1]); seg(c, G.ls[0] - 3, G.sy - 4, G.ls[0] - 8, G.sy + 2, 2.5, C.top[1]);
        poly(c, [[G.rs[0] + 6, G.sy + 2], [G.ls[0] - 6, G.sy + 2], [G.ls[0] - 8, G.sy + 11], [G.rs[0] + 8, G.sy + 11]], C.top[0]);
    } else {
        poly(c, [[G.rs[0] - 5, G.sy - 3], [G.ls[0] + 5, G.sy - 3], [hipR[0], hipR[1]], [hipL[0], hipL[1]]], C.top[1]);
        dot(c, G.rs[0], G.sy, 7.5, C.top[1]); dot(c, G.ls[0], G.sy, 7.5, C.top[1]);
        poly(c, [[G.rs[0] - 5, G.sy - 3], [G.ls[0] + 5, G.sy - 3], [G.ls[0] + 2, G.sy + 7], [G.rs[0] - 2, G.sy + 7]], C.top[0]);
        if (C.lapel) {
            poly(c, [[G.rs[0] + 6, G.sy - 3], [hx - 1, hy + 24], [hx + 1, hy + 52], [G.rs[0] + 2, G.sy + 2]], C.lapel);
            poly(c, [[G.ls[0] - 6, G.sy - 3], [hx + 5, hy + 24], [hx + 1, hy + 52], [G.ls[0] - 2, G.sy + 2]], C.lapel);
            poly(c, [[hx - 4, hy + 20], [hx + 8, hy + 20], [hx + 2, hy + 40]], C.under);
        }
        if (C.hood) {
            c.strokeStyle = PAPER; c.lineWidth = 1; c.globalAlpha = 0.55;
            c.beginPath(); c.moveTo(hx - 2, hy + 26); c.lineTo(hx - 4, hy + 46); c.moveTo(hx + 6, hy + 26); c.lineTo(hx + 7, hy + 46); c.stroke();
            c.globalAlpha = 1;
            c.strokeStyle = C.top[2]; c.lineWidth = 1.2; c.beginPath(); c.moveTo(hipL[0] + 4, hipL[1] - 16); c.lineTo(hipR[0] - 4, hipR[1] - 16); c.stroke();
        }
    }

    /* head: mid tone, lit forehead, shade under the jaw and on the far side */
    headPath(c, hx, hy); c.fillStyle = SKIN.mid; c.fill();
    c.save(); headPath(c, hx, hy); c.clip();
    c.fillStyle = SKIN.lit; c.beginPath(); c.moveTo(hx - 16, hy - 24); c.lineTo(hx + 16, hy - 24); c.lineTo(hx + 16, hy - 4); c.lineTo(hx + 2, hy + 2); c.lineTo(hx - 16, hy - 1); c.closePath(); c.fill();
    c.fillStyle = SKIN.shade; c.beginPath(); c.moveTo(hx - 16, hy + 11); c.lineTo(hx + 16, hy + 7); c.lineTo(hx + 16, hy + 24); c.lineTo(hx - 16, hy + 24); c.closePath(); c.fill();
    c.globalAlpha = 0.45; c.fillRect(hx + 10, hy - 24, 8, 48); c.globalAlpha = 1;
    c.restore();
    dot(c, hx - 13.5, hy + 1, 3, SKIN.shade);                                           /* the near ear */

    /* hair */
    if (stage.hair === 'twists') {
        c.save(); headPath(c, hx, hy); c.clip();
        c.fillStyle = HAIR; c.beginPath(); c.moveTo(hx - 16, hy - 24); c.lineTo(hx + 16, hy - 24); c.lineTo(hx + 16, hy - 9); c.quadraticCurveTo(hx, hy - 4, hx - 16, hy - 8); c.closePath(); c.fill();
        c.restore();
        for (let i = 0; i <= 9; i++) { const a = Math.PI + i * Math.PI / 9; dot(c, hx + Math.cos(a) * 13.5, hy - 4 + Math.sin(a) * 15, 3.2, HAIR); }
        c.strokeStyle = HAIR; c.lineWidth = 2.6; c.lineCap = 'round';
        for (const s of STRANDS) {
            const px = hx + s[0], py = hy + s[1];
            c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + s[2] * 0.3, py + s[3] * 0.6, px + s[2], py + s[3]); c.stroke();
        }
    } else {
        poly(c, [[hx - 14, hy - 4], [hx - 12, hy + 5], [hx - 9, hy - 3]], SKIN.fade);
        poly(c, [[hx + 14, hy - 4], [hx + 13, hy + 4], [hx + 9, hy - 3]], SKIN.fade);
        c.fillStyle = HAIR; c.beginPath(); c.ellipse(hx + 0.5, hy - 12, 15, 8, 0, 0, Math.PI * 2); c.fill();
        for (let i = 0; i <= 8; i++) { const a = Math.PI + i * Math.PI / 8; dot(c, hx + 0.5 + Math.cos(a) * 14, hy - 10 + Math.sin(a) * 9.5, 4.2, HAIR); }
        c.beginPath(); c.moveTo(hx - 13, hy - 6); c.quadraticCurveTo(hx, hy - 3, hx + 13, hy - 6); c.lineTo(hx + 13, hy - 14); c.lineTo(hx - 13, hy - 14); c.closePath(); c.fill();
    }

    /* face: brow, eyes, nose, mouth, a few deliberate strokes */
    c.strokeStyle = '#1b120d'; c.lineWidth = 2.3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(hx - 10.5 + lk, hy - 5.5 + tl); c.lineTo(hx - 3 + lk, hy - 7.2 + tl); c.moveTo(hx + 2 + lk, hy - 7.2 + tl); c.lineTo(hx + 9.5 + lk, hy - 5.5 + tl); c.stroke();
    if (blink) {
        c.lineWidth = 1.5; c.beginPath(); c.moveTo(hx - 9.5 + lk, hy - 1 + tl); c.lineTo(hx - 4.5 + lk, hy - 1 + tl); c.moveTo(hx + 2.5 + lk, hy - 1 + tl); c.lineTo(hx + 8 + lk, hy - 1 + tl); c.stroke();
    } else {
        c.fillStyle = 'rgba(247,245,240,0.6)';
        c.beginPath(); c.ellipse(hx - 7 + lk * 0.9, hy - 1.2 + tl, 3.3, 2.1, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(hx + 5.4 + lk * 0.9, hy - 1.2 + tl, 3.5, 2.2, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#120c09';
        c.beginPath(); c.ellipse(hx - 6.6 + lk * 1.25, hy - 1 + tl, 1.9, 1.9, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(hx + 5.8 + lk * 1.25, hy - 1 + tl, 2, 2, 0, 0, Math.PI * 2); c.fill();
    }
    c.strokeStyle = '#2a1710'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(hx + 1 + lk * 1.2, hy + 0.5 + tl); c.lineTo(hx + 3.4 + lk * 1.2, hy + 5.5 + tl); c.lineTo(hx + 0.4 + lk * 1.2, hy + 6.5 + tl); c.stroke();
    c.lineWidth = 1.6; c.beginPath(); c.moveTo(hx - 3.5 + lk, hy + 10 + tl - P.mouth * 0.8); c.quadraticCurveTo(hx + 0.5 + lk, hy + 10 + tl + P.mouth * 4, hx + 5 + lk, hy + 10 + tl - P.mouth * 0.8); c.stroke();
    if (P.mouth > 0.5) { c.fillStyle = 'rgba(247,245,240,0.8)'; c.beginPath(); c.moveTo(hx - 2.3 + lk, hy + 10.5 + tl); c.quadraticCurveTo(hx + 0.5 + lk, hy + 10.5 + tl + P.mouth * 2.4, hx + 4 + lk, hy + 10.5 + tl); c.closePath(); c.fill(); }

    /* the near upper arm (his right, screen left) */
    drawUpper(c, G.rs, G.rE, C, bare);
    c.restore();
}

function drawHands(c, P, G, stage) {
    const C = CLOTHES[stage.clothes];
    const bare = C.sleeve === 'none';
    c.save(); c.translate(P.x, P.y);
    /* the far forearm and what sits on it */
    drawFore(c, G.lE, G.lH, C, bare);
    if (stage.arm === 'imus') {
        imuBoard(c, G.lFore[0], G.lFore[1], G.lFore[2], 0.95);
        const w = [lerp(G.lE[0], G.lH[0], 0.84), lerp(G.lE[1], G.lH[1], 0.84)];
        const n = [-G.lDir[1], G.lDir[0]];
        dot(c, w[0] + n[0] * 3, w[1] + n[1] * 3, 2.4, '#b9bcc3'); dot(c, w[0] - n[0] * 3.5, w[1] - n[1] * 3.5, 2.4, '#b9bcc3');
    }
    drawHand(c, G.lH, G.lDir, 0);
    /* the near forearm and what sits on it */
    drawFore(c, G.rE, G.rH, C, bare);
    if (stage.arm === 'board') {
        const f = G.rFore;
        c.save(); c.translate(f[0], f[1]); c.rotate(f[2]);
        c.fillStyle = '#0d0d0f'; c.fillRect(-7, -8.5, 14, 17);
        breadboard(c, -12, -5.5, 24, 9);
        c.fillStyle = '#1b1f24'; c.fillRect(-10, -4, 8, 5); dot(c, -6, -1.5, 1, 'rgba(58,215,230,0.95)');
        c.fillStyle = '#2b5fa8'; c.fillRect(0, -4, 5, 5);
        c.restore();
    }
    if (stage.arm === 'sleeve' && P.sleeveOn >= 0.999) {
        sleeveShape(c, lerp(G.rE[0], G.rH[0], 0.48), lerp(G.rE[1], G.rH[1], 0.48), G.rFore[2], 30, 1, true);
    }
    drawHand(c, G.rH, G.rDir, P.wrist || 0);
    if (P.iron) iron(c, G.rH[0], G.rH[1], G.ironDir, true, true);
    c.restore();
}

/* ------------------------------------------------------------ the bench
   each stage's props, split into what sits behind him and what he holds */
const BENCH = {
    car: {
        back(c, P, G, D, now) {
            jar(c, 408, 250, 1);
            c.save(); c.translate(390, 236); c.rotate(-0.2);
            c.fillStyle = '#0d0e10'; rrect(c, -8, -15, 16, 30, 2.5); c.fill();
            c.fillStyle = '#0d2b33'; c.fillRect(-6.5, -12.5, 13, 25);
            c.strokeStyle = 'rgba(58,215,230,0.9)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 3, 4, 0, Math.PI * 2); c.stroke(); dot(c, P.carX ? 1.5 : 0, 3, 1.6, 'rgba(58,215,230,0.9)');
            c.restore();
            c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 390, 236, 22, CYAN, 0.25); c.restore();
            car(c, 292 + (P.carX || 0), 248, 1, P.wheel || 0, !!P.led, false);
        }
    },
    board: {
        back(c, P, G, D, now) {
            const held = P.held || 0;
            const bx = G.board[0], by = G.board[1], ox = G.oled[0], oy = G.oled[1];
            c.strokeStyle = '#0c0c0c'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(bx + 20, by - 4); c.quadraticCurveTo(lerp(bx, ox, 0.5), Math.min(by, oy) - 14, ox - 6, oy + 2); c.stroke();
            postureBoard(c, bx, by, 1, 0.5 + 0.5 * Math.sin(now * 2.2), false);
            oled(c, ox, oy, lerp(0, -0.25, held), P.bar == null ? 0.4 : P.bar, 1);
        }
    },
    throw: {
        back(c, P, G, D, now) {
            /* the lead from the forearm board to the laptop */
            const f = G.rFore;
            c.strokeStyle = '#0c0c0c'; c.lineWidth = 1.6; c.lineCap = 'round';
            c.beginPath(); c.moveTo(f[0] + P.x, f[1] + P.y); c.quadraticCurveTo(360, 262, 448, 240); c.stroke();
            c.strokeStyle = '#d8342e'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(f[0] + P.x, f[1] + P.y + 2); c.quadraticCurveTo(362, 265, 448, 242); c.stroke();
            if (P.ballAt === 2) ball(c, 206, 246, 10, 0.3);
        },
        front(c, P, G, D, now) { flyingBall(c, P, G); }
    },
    cheque: {
        back(c, P, G, D, now, lt) {
            ball(c, 206, 246, 10, 0.3);
            const p = P.chequeP || 0;
            const x = lerp(FX, 395, p) + P.x * (1 - p), y = lerp(214, 139, p) + P.y * (1 - p);
            const fadeIn = clamp(lt / 0.35, 0, 1);
            cheque(c, x, y, lerp(0.9, 1, p), lerp(0.04, -0.03, p), fadeIn);
            if (D.pinned) { dot(c, 395, 112, 2.6, '#f0b64a'); dot(c, 394, 111, 0.9, '#fff3d6'); }
            else if (lt < 0.35) cheque(c, 395, 139, 1, -0.03, 1 - fadeIn);   /* last loop's cheque fades off the wall as this one arrives in his hands */
        }
    },
    rig: {
        back(c, P, G, D, now) {
            protoboard(c, 300, 244, 1, false);
            /* the ribbon from the forearm breakout down to the board */
            const f = G.lFore;
            c.lineCap = 'round';
            for (let i = 0; i < 3; i++) { c.strokeStyle = i === 1 ? '#a9acb3' : '#7d8087'; c.lineWidth = 1; c.beginPath(); c.moveTo(f[0] + P.x + i * 1.5, f[1] + P.y + 4); c.quadraticCurveTo(340 + i * 1.5, 262, 318 + i * 1.5, 242); c.stroke(); }
            if (!P.iron) iron(c, 386, 236, [-0.7, 0.71], false, false);
            ironStand(c, 380, 244);
        }
    },
    sleeve: {
        back(c, P, G, D, now) {
            const on = P.sleeveOn || 0;
            if (on < 0.999) {
                const f = G.rFore;
                const x = lerp(300, lerp(G.rE[0], G.rH[0], 0.48) + P.x, on), y = lerp(248, lerp(G.rE[1], G.rH[1], 0.48) + P.y, on);
                sleeveShape(c, x, y, lerp(0.06, f[2], on), lerp(72, 30, on), 1, true);
                lipo(c, 352, 250, [330, 250]);
            } else lipo(c, 352, 250, null);
            if (P.ballAt === 2) ball(c, 206, 246, 10, 0.3);
            if (!P.iron) iron(c, 386, 236, [-0.7, 0.71], false, false);
            ironStand(c, 380, 244);
        },
        front(c, P, G, D, now) { flyingBall(c, P, G); }
    }
};

function flyingBall(c, P, G) {
    if (P.ballAt === 0) {
        const x = (G.rH[0] + G.lH[0]) / 2 + P.x, y = (G.rH[1] + G.lH[1]) / 2 - 7 + P.y;
        ball(c, x, y, 10, 0.2);
    } else if (P.ballAt === 1) {
        const p = P.ballP || 0, q = 1 - p;
        const x = q * q * 334 + 2 * q * p * 450 + p * p * 650, y = q * q * 140 + 2 * q * p * -50 + p * p * -30;
        ball(c, x, y, 10, p * 4);
    }
}

/* ------------------------------------------------------------ the laptop screen */
function drawScreen(c, stage, D, P) {
    if (!stage.laptop) return;
    c.save();
    c.beginPath(); c.moveTo(452, 194); c.lineTo(514, 190); c.lineTo(516, 242); c.lineTo(454, 242); c.closePath(); c.clip();
    c.fillStyle = '#08141a'; c.fillRect(450, 188, 70, 56);
    if (stage.bench === 'throw' || stage.bench === 'rig') {
        c.strokeStyle = 'rgba(58,215,230,0.18)'; c.lineWidth = 0.8;
        for (const yy of [206, 220, 234]) { c.beginPath(); c.moveTo(454, yy); c.lineTo(516, yy); c.stroke(); }
        const plotTrace = (tr, col, scale, base) => {
            c.strokeStyle = col; c.lineWidth = 1.3; c.lineJoin = 'round'; c.beginPath();
            for (let i = 0; i < tr.length; i++) { const x = 454 + i * (62 / (tr.length - 1)), y = base - (tr[i] - 0.5) * scale; i ? c.lineTo(x, y) : c.moveTo(x, y); }
            c.stroke();
        };
        plotTrace(D.trace, 'rgba(58,215,230,0.95)', 60, 222);
        if (stage.bench === 'rig') plotTrace(D.trace2, 'rgba(240,182,74,0.9)', 36, 230);
    } else if (stage.bench === 'sleeve') {
        const k = P.check || 0;
        c.fillStyle = 'rgba(247,245,240,0.92)'; rrect(c, 458, 196, 52, 42, 2); c.fill();
        c.fillStyle = 'rgba(20,20,20,0.12)'; c.fillRect(462, 201, 30, 1.5); c.fillRect(462, 205, 18, 1.5);
        c.strokeStyle = k > 0.05 ? 'rgba(240,182,74,' + (0.3 + 0.7 * k) + ')' : 'rgba(20,20,20,0.14)'; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(472, 221); c.lineTo(481, 230); c.lineTo(498, 212); c.stroke();
        if (k > 0.05) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 485, 222, 26, GOLD, 0.35 * k); c.restore(); }
    } else {
        c.fillStyle = 'rgba(58,215,230,0.12)'; c.fillRect(456, 198, 58, 40);
        c.fillStyle = 'rgba(58,215,230,0.35)'; c.fillRect(460, 204, 26, 2); c.fillRect(460, 210, 40, 2); c.fillRect(460, 216, 32, 2);
    }
    c.restore();
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, 484, 216, 40, CYAN, 0.12); c.restore();
}

/* ------------------------------------------------------------ the tracks */
const BASE = { x: 0, y: 0, crouch: 0, lean: 0, turn: 0.15, look: 3, tilt: 2, mouth: 0, wrist: 0, rh: [258, 254], lh: [318, 254], rb: 1, lb: -1 };

/* every channel is re-keyed where it has to hold; a channel with keys
   only at 0 and at the loop end would drift the whole way between them */
const TRACKS = {
    car: track([
        [0, { rh: [246, 254], lh: [340, 254], look: 3, tilt: 2, carX: 0, wheel: 0, led: 0 }],
        [0.9, { rh: [282, 240], look: 3, tilt: 2 }],
        [1.1, { rh: [282, 244], led: 1 }],
        [1.3, { rh: [282, 242], led: 0 }],
        [1.5, { led: 1 }], [1.7, { led: 0 }], [1.9, { led: 1 }], [2.1, { led: 0 }], [2.3, { led: 1 }], [2.5, { led: 0 }], [2.7, { led: 1 }], [2.9, { led: 0 }],
        [1.4, { lh: [340, 254] }],
        [1.8, { lh: [386, 242], look: 8, tilt: 1 }],
        [2.0, { lh: [386, 244], carX: 0, wheel: 0 }],
        [2.6, { lh: [340, 254], look: 5, tilt: 2, carX: 8, wheel: 6.283 }],
        [3.0, { carX: 8, wheel: 9.42, look: 5, tilt: 2 }],
        [3.4, { carX: 0, wheel: 12.566 }],
        [3.6, { look: 5, tilt: 2, rh: [282, 242] }],
        [3.9, { look: 0, tilt: -2 }],
        [4.7, { look: 0, tilt: -2 }],
        [5.2, { look: 3, tilt: 2, rh: [262, 250] }],
        [6.0, { rh: [288, 244] }],
        [7, { rh: [246, 254], lh: [340, 254], look: 3, tilt: 2, carX: 0, wheel: 12.566, led: 0 }]
    ]),
    board: track([
        [0, { rh: [262, 254], lh: [310, 254], held: 0, bar: 0.4, look: 3, tilt: 2, lean: 0 }],
        [0.3, { rh: [272, 250], lh: [334, 250], held: 0, bar: 0.4 }],
        [1.0, { rh: [262, 214], lh: [306, 204], held: 1, look: 4, tilt: 0, lean: 0 }],
        [1.4, { lean: -0.35, bar: 0.4, look: 4, tilt: 0 }],
        [2.3, { bar: 1 }],
        [2.9, { bar: 1, lean: -0.35, tilt: 0, look: 4 }],
        [4.6, { lean: 1, bar: 0.1, tilt: 3, look: 5 }],
        [4.78, { lean: 1, bar: 0.1, tilt: 3 }],
        [5.05, { lean: -0.25, tilt: -1, bar: 0.6, look: 4 }],
        [5.4, { look: 0, tilt: -2, bar: 0.9, lean: -0.15 }],
        [6.1, { look: 0, tilt: -2, held: 1, lean: -0.15, rh: [262, 214], lh: [306, 204], bar: 1 }],
        [6.5, { look: 3, tilt: 2, bar: 1 }],
        [7, { rh: [262, 254], lh: [310, 254], held: 0, bar: 0.4, lean: 0, look: 3, tilt: 2 }]
    ]),
    throw: track([
        [0, { rh: [262, 238], lh: [290, 238], ballAt: 0, ballP: 0, crouch: 0, turn: 0.2, look: 4, tilt: 1, wrist: 0, lb: -1 }],
        [0.5, { lb: -1 }],
        [0.8, { rh: [280, 190], lh: [298, 190], turn: 0.6, look: 8, tilt: -1, crouch: 0, lb: 1 }],
        [1.5, { rh: [278, 202], lh: [298, 202], crouch: 0.5, turn: 0.6 }],
        [2.1, { rh: [326, 150], lh: [316, 180], crouch: 0, ballAt: 1, ballP: 0, wrist: 0 }],
        [2.45, { rh: [332, 146], lh: [318, 178], wrist: 1 }],
        [3.0, { ballP: 1 }],
        [3.3, { rh: [332, 146], lh: [318, 178], wrist: 1, look: 8, tilt: -1, turn: 0.6, lb: 1 }],
        [4.0, { rh: [298, 246], lh: [318, 250], wrist: 0, turn: 0.3, look: 8, tilt: 1, ballAt: 2, lb: -1 }],
        [4.8, { look: 8, tilt: 1, rh: [298, 246], lh: [318, 250], turn: 0.3 }],
        [5.1, { look: 0, tilt: -2 }],
        [5.8, { look: 0, tilt: -2 }],
        [6.1, { rh: [216, 246], lh: [238, 252], crouch: 0.25, look: -3, tilt: 3, turn: 0.2 }],
        [6.4, { ballAt: 0, rh: [216, 246], lh: [238, 252], crouch: 0.25 }],
        [7, { rh: [262, 238], lh: [290, 238], ballAt: 0, ballP: 0, crouch: 0, turn: 0.2, look: 4, tilt: 1, wrist: 0 }]
    ]),
    cheque: track([
        [0, { rh: [254, 214], lh: [296, 214], chequeP: 0, look: 3, tilt: 0, x: 0, y: 0 }],
        [1.2, { rh: [354, 162], lh: [436, 162], chequeP: 1, look: 8, tilt: -2 }],
        [1.5, { rh: [394, 118], lh: [436, 162], chequeP: 1 }],
        [1.75, { rh: [394, 120] }],
        [2.4, { rh: [262, 236], lh: [304, 236], x: -14, y: -4, look: 8, tilt: -2, chequeP: 1 }],
        [3.1, { tilt: -2, x: -14, y: -4, look: 8 }],
        [3.35, { tilt: -3.5 }],
        [3.6, { tilt: -1.5 }],
        [3.85, { tilt: -3.5 }],
        [4.2, { tilt: -2, x: -14, y: -4, look: 8, rh: [262, 236], lh: [304, 236] }],
        [5.0, { x: 0, y: 0, look: 3, tilt: 2, rh: [258, 254], lh: [312, 254], chequeP: 1 }],
        [5.5, { look: 0, tilt: -2 }],
        [6.2, { look: 0, tilt: -2 }],
        [6.6, { look: 3, tilt: 2, chequeP: 1, rh: [258, 254], lh: [312, 254] }],
        [7, { rh: [254, 214], lh: [296, 214], chequeP: 1, look: 3, tilt: 0, x: 0, y: 0 }]
    ]),
    rig: track([
        [0, { rh: [258, 254], lh: [318, 254], iron: 0, look: 3, tilt: 2, mouth: 0 }],
        [0.6, { rh: [376, 240], lh: [318, 254], look: 5 }],
        [0.8, { iron: 1, rh: [376, 236] }],
        [1.2, { rh: [320, 230], look: 3, tilt: 2 }],
        [1.3, { rh: [318, 234] }],
        [1.7, { rh: [324, 230] }],
        [1.9, { rh: [308, 234] }],
        [2.3, { rh: [314, 230] }],
        [2.5, { rh: [300, 235] }],
        [2.9, { rh: [376, 236] }],
        [3.1, { iron: 0, rh: [376, 240], lh: [318, 254], lb: -1 }],
        [3.6, { rh: [258, 254], lh: [334, 190], look: 8, tilt: -1, lb: 1 }],
        [4.2, { lh: [338, 186] }],
        [4.5, { lh: [338, 186], look: 8, tilt: -1, mouth: 0 }],
        [4.8, { look: 8, tilt: 0, mouth: 1 }],
        [5.6, { mouth: 1, look: 8, tilt: 0, lh: [338, 186] }],
        [5.9, { look: 0, tilt: -2, mouth: 0.6 }],
        [6.5, { look: 0, tilt: -2, mouth: 0.6, lh: [338, 186], lb: 1 }],
        [7, { rh: [258, 254], lh: [318, 254], iron: 0, look: 3, tilt: 2, mouth: 0, lb: -1 }]
    ]),
    sleeve: track([
        [0, { rh: [258, 254], lh: [318, 254], iron: 0, sleeveOn: 0, ballAt: 2, ballP: 0, check: 0, look: 3, tilt: 2, crouch: 0, turn: 0.15, wrist: 0 }],
        [0.4, { rh: [376, 240], look: 5 }],
        [0.6, { iron: 1, rh: [376, 236] }],
        [0.9, { rh: [346, 232], look: 3, tilt: 2 }],
        [1.0, { rh: [344, 236] }],
        [1.3, { rh: [350, 232] }],
        [1.45, { rh: [340, 236] }],
        [1.8, { rh: [376, 236] }],
        [2.0, { iron: 0, rh: [376, 240], lh: [318, 254], sleeveOn: 0 }],
        [2.4, { rh: [238, 240], lh: [300, 250], look: 3, tilt: 2 }],
        [2.7, { lh: [262, 238], sleeveOn: 0 }],
        [3.3, { lh: [250, 226], rh: [236, 232], sleeveOn: 1 }],
        [3.9, { rh: [216, 246], lh: [238, 252], crouch: 0.2, look: -3, tilt: 3, sleeveOn: 1 }],
        [4.1, { ballAt: 0, rh: [216, 246], lh: [238, 252], lb: -1 }],
        [4.6, { rh: [280, 190], lh: [298, 190], crouch: 0, turn: 0.6, look: 8, tilt: -1, lb: 1 }],
        [5.2, { rh: [278, 202], lh: [298, 202], crouch: 0.5 }],
        [5.7, { rh: [326, 150], lh: [316, 180], crouch: 0, ballAt: 1, ballP: 0, wrist: 0 }],
        [6.0, { rh: [332, 146], lh: [318, 178], wrist: 1 }],
        [6.2, { check: 0 }],
        [6.45, { check: 1 }],
        [6.6, { ballP: 1 }],
        [7.0, { rh: [332, 146], lh: [318, 178], wrist: 1, look: 8, tilt: -1, turn: 0.6, lb: 1 }],
        [7.5, { rh: [298, 246], lh: [318, 250], wrist: 0, turn: 0.3, look: 8, tilt: 1, ballAt: 2, lb: -1 }],
        [7.9, { look: 8, tilt: 1 }],
        [8.2, { look: 0, tilt: -2 }],
        [9.3, { look: 0, tilt: -2, check: 1, rh: [298, 246], lh: [318, 250] }],
        [9.7, { look: 3, tilt: 2, rh: [258, 254], lh: [318, 254], sleeveOn: 1 }],
        [10.3, { sleeveOn: 0, check: 0 }],
        [10.6, { rh: [258, 254], lh: [318, 254], iron: 0, sleeveOn: 0, ballAt: 2, ballP: 0, check: 0, look: 3, tilt: 2, crouch: 0, turn: 0.15, wrist: 0 }]
    ])
};

/* one-shot beats: [time, kind, anchor, options] */
const EVENTS = {
    car: [],
    board: [[4.7, 'ring', 'buzzer', { dur: 0.75, r1: 34, w: 2 }], [4.95, 'ring', 'buzzer', { dur: 0.6, r1: 26, w: 1.5 }]],
    throw: [[2.15, 'spike']],
    cheque: [[1.6, 'pin']],
    rig: [[1.3, 'spark', 'tip'], [1.9, 'spark', 'tip'], [2.5, 'spark', 'tip'], [4.5, 'ring', 'lwrist', { dur: 0.45, r1: 16, w: 2 }], [4.68, 'ring', 'lwrist', { dur: 0.45, r1: 16, w: 2 }], [4.5, 'spike']],
    sleeve: [[1.0, 'spark', 'tip'], [1.45, 'spark', 'tip'], [5.75, 'spike'], [6.2, 'ring', 'rwrist', { dur: 1.5, r1: 48, w: 3 }]]
};

/* ------------------------------------------------------------ mount */
let uid = 0;

export function mountLab(el, opts) {
    opts = opts || {};
    const onInteract = typeof opts.onInteract === 'function' ? opts.onInteract : null;
    const autoplayWanted = opts.autoplay !== false;
    const stillWanted = !!opts.still;
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    let reduced = !!(mq && mq.matches);
    const id = 'lab-' + (++uid);

    /* DOM */
    el.innerHTML = '';
    const fig = document.createElement('figure');
    fig.className = 'lab';
    fig.setAttribute('aria-label', 'The lab: Abba building Betta, ' + STAGES.length + ' stages');
    fig.innerHTML =
        '<div class="lab-stage" id="' + id + '-stage">' +
            '<canvas aria-hidden="true"></canvas>' +
            '<div class="lab-number" aria-hidden="true"><b></b><small></small></div>' +
        '</div>' +
        '<figcaption class="lab-cap" aria-live="polite"><span class="lab-date"></span><span class="lab-line"></span></figcaption>' +
        '<nav class="lab-time" aria-label="Stages"><div role="tablist" aria-label="Stage"></div></nav>';
    el.appendChild(fig);
    const stageEl = fig.querySelector('.lab-stage'), canvas = fig.querySelector('canvas');
    const numB = fig.querySelector('.lab-number b'), numS = fig.querySelector('.lab-number small');
    const dateEl = fig.querySelector('.lab-date'), lineEl = fig.querySelector('.lab-line');
    const list = fig.querySelector('[role="tablist"]');
    const tabs = STAGES.map((s, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'lab-tab'; b.setAttribute('role', 'tab');
        b.setAttribute('aria-controls', id + '-stage'); b.setAttribute('aria-label', s.date + ', ' + s.title);
        b.id = id + '-tab-' + i;
        const parts = s.date.split(' ');
        b.innerHTML = '<span class="lab-tab-m">' + parts[0] + '</span><span class="lab-tab-y">' + (parts[1] || '') + '</span>';
        b.addEventListener('click', () => select(i));
        list.appendChild(b);
        return b;
    });

    /* canvases */
    const ctx = canvas.getContext('2d');
    const statCv = document.createElement('canvas'), statCx = statCv.getContext('2d');
    const figCv = document.createElement('canvas'), figCx = figCv.getContext('2d');
    const frontCv = document.createElement('canvas'), frontCx = frontCv.getContext('2d');
    let cssW = 0, cssH = 0, dpr = 1, scale = 1, staticFor = -1;

    /* state */
    let idx = opts.start === 'last' ? STAGES.length - 1 : 0;
    let lt = 0, prevLt = 0, stageClock = 0, holdLeft = 0, now = 0;
    let autoplay = autoplayWanted, hovered = false, focused = false, visible = true, pageShown = document.visibilityState !== 'hidden';
    let fade = null;                      /* { phase: 'out' | 'in', t, to } */
    let raf = 0, last = 0, dirty = true, destroyed = false, still = stillWanted;
    const D = resetDynamic();
    const stats = { frames: 0, sum: 0, max: 0 };
    const P = Object.assign({}, BASE);
    const rnd = mulberry(99);

    function resetDynamic() {
        return { rings: [], sparks: [], smoke: [], dust: [], trace: new Array(64).fill(0.5), trace2: new Array(64).fill(0.5), traceT: 0, bump: 0, pinned: false };
    }
    function seedDust() {
        D.dust = [];
        const r = mulberry(5);
        for (let i = 0; i < 26; i++) D.dust.push({ x: 300 + (r() - 0.5) * 300, y: 90 + r() * 260, p: r() * 6.28, s: 0.6 + r() * 0.8 });
    }
    seedDust();

    /* ---- sizing */
    function size() {
        const w = Math.max(320, Math.round(el.clientWidth || stageEl.clientWidth || 520));
        const h = Math.round(w * 2 / 3);
        const d = Math.min(2, window.devicePixelRatio || 1);
        if (w === cssW && d === dpr) return false;
        cssW = w; cssH = h; dpr = d; scale = w * d / W;
        stageEl.style.width = w + 'px';
        for (const cv of [canvas, statCv, figCv, frontCv]) { cv.width = Math.round(W * scale); cv.height = Math.round(H * scale); }
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        staticFor = -1; dirty = true;
        return true;
    }

    function rebuildStatic() {
        statCx.setTransform(scale, 0, 0, scale, 0, 0);
        drawStatic(statCx, STAGES[idx], idx);
        frontCx.setTransform(1, 0, 0, 1, 0, 0); frontCx.clearRect(0, 0, frontCv.width, frontCv.height);
        frontCx.setTransform(scale, 0, 0, scale, 0, 0);
        drawFront(frontCx, STAGES[idx]);
        staticFor = idx;
    }

    /* ---- text */
    function setText() {
        const s = STAGES[idx];
        numB.textContent = s.number; numS.textContent = s.unit || '';
        dateEl.innerHTML = '';
        dateEl.appendChild(document.createTextNode(s.date));
        const t = document.createElement('span'); t.className = 'lab-title'; t.textContent = s.title; dateEl.appendChild(t);
        lineEl.textContent = s.line;
        tabs.forEach((b, i) => {
            b.setAttribute('aria-selected', i === idx ? 'true' : 'false');
            b.tabIndex = i === idx ? 0 : -1;
            b.classList.toggle('is-current', i === idx);
            b.classList.toggle('is-past', i < idx);
            b.classList.toggle('is-future', i > idx);
        });
    }

    /* ---- stage changes */
    function apply(i) {
        idx = (i + STAGES.length) % STAGES.length;
        lt = 0; prevLt = 0; stageClock = 0;
        const keepDust = D.dust; Object.assign(D, resetDynamic()); D.dust = keepDust;
        staticFor = -1; dirty = true;
        setText();
        if (still || reduced) simulateTo(STAGES[idx].still);
    }
    function goTo(i, instant) {
        if (destroyed) return;
        i = (i + STAGES.length) % STAGES.length;
        if (i === idx && !fade) return;
        if (reduced || still || instant || !visible || !pageShown) { fade = null; apply(i); schedule(); return; }
        fade = { phase: 'out', t: 0, to: i };
        schedule();
    }
    function select(i) {
        holdLeft = 25;
        if (onInteract) onInteract('scrub');
        goTo(i, false);
        tabs[i].focus({ preventScroll: true });
    }

    /* ---- simulation */
    function fire(e) {
        const kind = e[1], anchor = e[2], o = e[3] || {};
        if (reduced && kind !== 'pin' && kind !== 'spike') return;
        let at = null;
        if (anchor === 'tip') at = lastG && lastG.tip;
        else if (anchor === 'rwrist') at = lastG && [lastG.rH[0] + P.x, lastG.rH[1] + P.y];
        else if (anchor === 'lwrist') at = lastG && [lastG.lH[0] + P.x, lastG.lH[1] + P.y];
        else if (anchor === 'buzzer') at = lastG && lastG.buzzer;
        if (kind === 'ring' && at) D.rings.push({ x: at[0], y: at[1], t: 0, dur: o.dur, r1: o.r1, w: o.w });
        else if (kind === 'spark' && at) {
            for (let i = 0; i < 16; i++) {
                const a = -Math.PI / 2 + (rnd() - 0.5) * 2.4, v = 40 + rnd() * 110;
                D.sparks.push({ x: at[0], y: at[1], vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.4 + rnd() * 0.5 });
            }
            for (let i = 0; i < 3; i++) D.smoke.push({ x: at[0] + (rnd() - 0.5) * 3, y: at[1] - 2, t: -i * 0.12, life: 1.6 + rnd() * 0.6, d: (rnd() - 0.5) * 10 });
        } else if (kind === 'spike') D.bump = 1;
        else if (kind === 'pin') D.pinned = true;
    }
    let lastG = null;
    function pose() {
        const s = STAGES[idx];
        Object.assign(P, BASE);
        TRACKS[s.bench](lt, P);
        if (P.ballAt == null) P.ballAt = 2;
        lastG = solve(P, now);
        return lastG;
    }
    function step(dt) {
        const s = STAGES[idx];
        now += dt;
        prevLt = lt; lt += dt;
        if (lt >= s.loop) { lt -= s.loop; D.pinned = false; }
        pose();
        for (const e of EVENTS[s.bench]) {
            const t = e[0];
            const crossed = lt >= prevLt ? (prevLt < t && lt >= t) : (prevLt < t || lt >= t);
            if (crossed) fire(e);
        }
        /* particles */
        for (const r of D.rings) r.t += dt;
        D.rings = D.rings.filter(r => r.t < r.dur);
        for (const p of D.sparks) { p.t += dt; p.vy += 190 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; }
        D.sparks = D.sparks.filter(p => p.t < p.life);
        for (const p of D.smoke) { p.t += dt; if (p.t > 0) { p.y -= 13 * dt; p.x += p.d * dt + Math.sin(p.t * 3) * 4 * dt; } }
        D.smoke = D.smoke.filter(p => p.t < p.life);
        if (!reduced) for (const m of D.dust) { m.y += 3.5 * dt * m.s; m.x += Math.sin(now * 0.6 + m.p) * 4 * dt; if (m.y > 352) { m.y = 88; m.x = 300 + (rnd() - 0.5) * 40; } }
        /* the laptop trace, forty samples a second */
        D.traceT += dt;
        while (D.traceT > 0.025) {
            D.traceT -= 0.025;
            D.bump *= 0.9;
            D.trace.shift(); D.trace.push(0.5 + (rnd() - 0.5) * 0.06 + D.bump * 0.45);
            D.trace2.shift(); D.trace2.push(0.5 + (rnd() - 0.5) * 0.05 + D.bump * 0.3);
        }
    }
    /* run the stage from zero to t without drawing, for stills and seeks */
    function simulateTo(t) {
        lt = 0; prevLt = 0; D.rings = []; D.sparks = []; D.smoke = []; D.pinned = false; D.bump = 0;
        D.trace.fill(0.5); D.trace2.fill(0.5);
        const n = Math.max(1, Math.ceil(t / (1 / 60)));
        for (let i = 0; i < n; i++) step(t / n);
        dirty = true;
    }

    /* ---- drawing */
    /* draw part of him on the clear canvas, light it (the lamp from
       above, the laptop from the right, the floor's shadow from below)
       with source-atop gradients, then composite */
    const FB = [110, 80, 380, 300];   /* the box he and what he holds stay inside */
    function figurePass(drawPart, laptop, y0, h) {
        const f = figCx;
        f.setTransform(scale, 0, 0, scale, 0, 0);
        f.clearRect(FB[0], FB[1], FB[2], FB[3]);
        f.save(); f.beginPath(); f.rect(FB[0], FB[1], FB[2], FB[3]); f.clip();
        drawPart(f);
        f.restore();
        f.globalCompositeOperation = 'source-atop';
        let g = f.createLinearGradient(0, 140, 0, 290);
        g.addColorStop(0, 'rgba(' + GOLD + ',0.26)'); g.addColorStop(1, 'rgba(' + GOLD + ',0)');
        f.fillStyle = g; f.fillRect(120, y0, 360, h);
        if (laptop) {
            g = f.createLinearGradient(345, 0, 285, 0);
            g.addColorStop(0, 'rgba(' + CYAN + ',0.22)'); g.addColorStop(1, 'rgba(' + CYAN + ',0)');
            f.fillStyle = g; f.fillRect(120, y0, 360, h);
        }
        g = f.createLinearGradient(0, 282, 0, 372);
        g.addColorStop(0, 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
        f.fillStyle = g; f.fillRect(120, 280, 360, 100);
        f.globalCompositeOperation = 'source-over';
        const px = FB[0] * scale, py = FB[1] * scale, pw = FB[2] * scale, ph = FB[3] * scale;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(figCv, px, py, pw, ph, px, py, pw, ph); ctx.setTransform(scale, 0, 0, scale, 0, 0);
    }
    function draw() {
        const t0 = performance.now();
        const s = STAGES[idx];
        if (staticFor !== idx) rebuildStatic();
        const c = ctx;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.drawImage(statCv, 0, 0);
        c.setTransform(scale, 0, 0, scale, 0, 0);

        /* the forge breathes */
        c.save(); c.globalCompositeOperation = 'lighter';
        const fl = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(now * 7.3) * Math.sin(now * 2.1);
        glow(c, 572, 236, 30, EMBER, 0.22 + fl * 0.12);
        c.strokeStyle = 'rgba(' + EMBER + ',' + (0.35 + fl * 0.3) + ')'; c.lineWidth = 1.5; c.beginPath();
        for (let i = 0; i < 4; i++) { c.moveTo(560, 222 + i * 7); c.lineTo(584, 226 + i * 7); }
        c.stroke(); c.restore();

        /* dust in the cone */
        if (!reduced) {
            c.fillStyle = PAPER;
            for (const m of D.dust) { const k = cone(m.x, m.y); if (k > 0.02) { c.globalAlpha = k * 0.4; c.beginPath(); c.arc(m.x, m.y, 1.1, 0, Math.PI * 2); c.fill(); } }
            c.globalAlpha = 1;
        }

        const G = lastG || pose();
        const blink = !reduced && ((now + 1.3) % 3.7) < 0.11;

        /* his body, lit, then the bench over it */
        figurePass(f => drawBody(f, P, G, s, blink), s.laptop, 120, 260);
        c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(frontCv, 0, 0); c.setTransform(scale, 0, 0, scale, 0, 0);

        /* the screen, what sits on the bench, then his forearms and hands over it */
        drawScreen(c, s, D, P);
        const B = BENCH[s.bench];
        if (B.back) B.back(c, P, G, D, now, lt);
        figurePass(f => drawHands(f, P, G, s), s.laptop, 100, 180);
        if (B.front) B.front(c, P, G, D, now, lt);

        /* rings, smoke, sparks */
        for (const r of D.rings) {
            const k = r.t / r.dur;
            c.strokeStyle = 'rgba(' + GOLD + ',' + (0.9 * (1 - k)).toFixed(3) + ')'; c.lineWidth = r.w * (1 - k * 0.5);
            c.beginPath(); c.arc(r.x, r.y, 5 + (r.r1 - 5) * ease(k), 0, Math.PI * 2); c.stroke();
        }
        for (const p of D.smoke) {
            if (p.t <= 0) continue;
            const k = p.t / p.life;
            c.fillStyle = 'rgba(150,152,158,' + (0.16 * (1 - k)).toFixed(3) + ')';
            c.beginPath(); c.arc(p.x, p.y, 2 + k * 7, 0, Math.PI * 2); c.fill();
        }
        if (D.sparks.length) {
            c.save(); c.globalCompositeOperation = 'lighter';
            for (const p of D.sparks) {
                const k = p.t / p.life;
                c.fillStyle = 'rgba(' + (k < 0.3 ? '255,246,220' : GOLD) + ',' + (1 - k).toFixed(3) + ')';
                c.beginPath(); c.arc(p.x, p.y, 1.6 - k, 0, Math.PI * 2); c.fill();
            }
            c.restore();
        }

        /* the cut */
        if (fade) {
            const a = fade.phase === 'out' ? ease(fade.t / 0.28) : 1 - ease(fade.t / 0.36);
            c.fillStyle = 'rgba(0,0,0,' + a.toFixed(3) + ')'; c.fillRect(0, 0, W, H);
        }
        /* vignette */
        c.setTransform(1, 0, 0, 1, 0, 0);
        const ms = performance.now() - t0;
        stats.frames++; stats.sum += ms; if (ms > stats.max) stats.max = ms;
        dirty = false;
    }

    /* ---- the loop */
    function running() { return !destroyed && visible && pageShown; }
    function schedule() { if (!raf && running()) { last = 0; raf = requestAnimationFrame(frame); } }
    function frame(ts) {
        raf = 0;
        if (!running()) return;
        const dt = last ? Math.min(0.05, (ts - last) / 1000) : 1 / 60;
        last = ts;
        const live = !reduced && !still;
        if (fade) {
            fade.t += dt;
            if (fade.phase === 'out' && fade.t >= 0.28) { apply(fade.to); fade = { phase: 'in', t: 0 }; }
            else if (fade.phase === 'in' && fade.t >= 0.36) fade = null;
            dirty = true;
        }
        if (live) {
            step(dt);
            if (holdLeft > 0) holdLeft -= dt;
            else if (autoplay && !hovered && !focused && !fade) {
                stageClock += dt;
                if (stageClock >= STAGES[idx].hold) goTo(idx + 1, false);
            }
            dirty = true;
        }
        if (dirty) draw();
        if (live || fade || dirty) raf = requestAnimationFrame(frame);
    }

    /* ---- listeners */
    const onKey = e => {
        const i = tabs.indexOf(document.activeElement);
        if (i < 0) return;
        let n = -1;
        if (e.key === 'ArrowRight') n = Math.min(STAGES.length - 1, i + 1);
        else if (e.key === 'ArrowLeft') n = Math.max(0, i - 1);
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = STAGES.length - 1;
        if (n < 0) return;
        e.preventDefault();
        tabs.forEach((b, k) => { b.tabIndex = k === n ? 0 : -1; });
        tabs[n].focus({ preventScroll: true });
    };
    const onEnter = () => { hovered = true; };
    const onLeave = () => { hovered = false; schedule(); };
    const onFocusIn = () => { focused = true; };
    const onFocusOut = () => { focused = false; schedule(); };
    const onVis = () => { pageShown = document.visibilityState !== 'hidden'; if (pageShown) { last = 0; schedule(); } };
    const onMotion = () => { reduced = !!(mq && mq.matches); fade = null; D.rings = []; D.sparks = []; D.smoke = []; if (reduced || still) simulateTo(STAGES[idx].still); dirty = true; schedule(); };
    list.addEventListener('keydown', onKey);
    fig.addEventListener('pointerenter', onEnter);
    fig.addEventListener('pointerleave', onLeave);
    fig.addEventListener('focusin', onFocusIn);
    fig.addEventListener('focusout', onFocusOut);
    document.addEventListener('visibilitychange', onVis);
    if (mq && mq.addEventListener) mq.addEventListener('change', onMotion);
    let io = null;
    if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) { last = 0; schedule(); } });
        io.observe(fig);
    }
    let ro = null;
    const onResize = () => { if (size()) { dirty = true; schedule(); } };
    if ('ResizeObserver' in window) { ro = new ResizeObserver(onResize); ro.observe(el); }
    else window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!destroyed) { staticFor = -1; dirty = true; schedule(); } });

    /* ---- go */
    size();
    apply(idx);
    schedule();

    function destroy() {
        if (destroyed) return;
        destroyed = true;
        if (raf) cancelAnimationFrame(raf); raf = 0;
        list.removeEventListener('keydown', onKey);
        fig.removeEventListener('pointerenter', onEnter);
        fig.removeEventListener('pointerleave', onLeave);
        fig.removeEventListener('focusin', onFocusIn);
        fig.removeEventListener('focusout', onFocusOut);
        document.removeEventListener('visibilitychange', onVis);
        if (mq && mq.removeEventListener) mq.removeEventListener('change', onMotion);
        if (io) io.disconnect();
        if (ro) ro.disconnect(); else window.removeEventListener('resize', onResize);
        el.innerHTML = '';
    }

    return {
        destroy,
        goTo: i => goTo(i, false),
        play: () => { autoplay = true; holdLeft = 0; schedule(); },
        pause: () => { autoplay = false; },
        stages: STAGES,
        /* extras the harness uses: a deterministic frame at loop time t,
           freezing motion, and the draw cost */
        seek: t => { simulateTo(t); dirty = true; if (!raf) draw(); },
        still: v => { still = !!v; if (still) simulateTo(STAGES[idx].still); dirty = true; schedule(); },
        stats: () => ({ frames: stats.frames, avgMs: stats.frames ? stats.sum / stats.frames : 0, maxMs: stats.max, reduced, index: idx, loopTime: lt }),
        reset: () => { stats.frames = 0; stats.sum = 0; stats.max = 0; }
    };
}
