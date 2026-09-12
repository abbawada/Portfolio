/* Wada Ring, the flat map. Phase 1 design surface.
   node tools/circuit/map.js  ->  docs/circuit/map.svg + docs/circuit/map.html
   Everything is projected from circuit/layout.js so the 3D build in Phase 2
   starts from the same coordinates. */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('../../circuit/layout.js');
const C = L.PALETTE;

const W = 1600, H = 900;
const S = 3.35, CX = 800, CY = 128, ZS = S * 0.95;
const SHADOW = [0.85, 0.3];                     // plan direction a shadow falls, per unit of height
const CENTROID = [105, 110];                    // roughly the infield centre

function P(u, v, z) { return [CX + (u - v) * S, CY + (u + v) * S * 0.5 - (z || 0) * ZS]; }
function f2(n) { return Math.round(n * 100) / 100; }
function pts(list) { return list.map(p => f2(p[0]) + ',' + f2(p[1])).join(' '); }
function poly(list, fill, extra) { return `<polygon points="${pts(list)}" fill="${fill}"${extra ? ' ' + extra : ''}/>`; }
function line(list, stroke, width, extra) { return `<polyline points="${pts(list)}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"${extra ? ' ' + extra : ''}/>`; }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, '0')).join(''); }
function shade(c, t) { return mix(c, C.ink, t); }

/* the face text matrix: x along plan u, y straight down, at a screen point */
function faceMatrix(at) { return `matrix(0.894 0.447 0 1 ${f2(at[0])} ${f2(at[1])})`; }

function hull(points) {
    const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
    for (const q of p.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/* an iso box: three visible faces and, for boxes on the ground, a shadow */
function boxSVG(b) {
    const [u, v, w, d, h, z0, tone] = b;
    const base = C[tone] || C.wall, z1 = z0 + h;
    const A = [u, v], B = [u + w, v], Q = [u + w, v + d], D = [u, v + d];
    let s = '';
    if (z0 === 0 && h > 1) {
        const off = [SHADOW[0] * h * 0.9, SHADOW[1] * h * 0.9];
        const foot = [A, B, Q, D].map(p => P(p[0], p[1], 0));
        const cast = [A, B, Q, D].map(p => P(p[0] + off[0], p[1] + off[1], 0));
        s += poly(hull(foot.concat(cast)), 'rgba(20,20,20,0.13)');
    }
    s += poly([P(Q[0], Q[1], z0), P(D[0], D[1], z0), P(D[0], D[1], z1), P(Q[0], Q[1], z1)], shade(base, 0.14));
    s += poly([P(B[0], B[1], z0), P(Q[0], Q[1], z0), P(Q[0], Q[1], z1), P(B[0], B[1], z1)], shade(base, 0.34));
    s += poly([P(A[0], A[1], z1), P(B[0], B[1], z1), P(Q[0], Q[1], z1), P(D[0], D[1], z1)], base);
    return s;
}
function boxKey(b) { return b[0] + b[2] + b[1] + b[3] + b[5] * 0.001; }

function treeSVG(t) {
    const [u, v, h] = t, r = h * 0.42 * S;
    const base = P(u, v, 0.9), apex = P(u, v, h), foot = P(u, v, 0);
    const sh = P(u + h * 0.5, v + h * 0.18, 0);
    return `<ellipse cx="${f2(sh[0])}" cy="${f2(sh[1])}" rx="${f2(r * 0.9)}" ry="${f2(r * 0.4)}" fill="rgba(20,20,20,0.12)"/>` +
        `<line x1="${f2(foot[0])}" y1="${f2(foot[1])}" x2="${f2(base[0])}" y2="${f2(base[1])}" stroke="${C.roof}" stroke-width="1.6"/>` +
        poly([apex, [base[0] - r, base[1]], [base[0], base[1] + r * 0.28]], shade(C.grass, 0.30)) +
        poly([apex, [base[0], base[1] + r * 0.28], [base[0] + r, base[1]]], shade(C.grass, 0.48));
}

/* ------------------------------------------------------------ track */
const samples = L.sample(L.TRACK, 24, true);
const fr = L.frames(samples, true);
const rib = L.ribbon(fr, L.TRACK_WIDTH);
const outsideSign = i => {
    const f = fr[i];
    return (f.n[0] * (f.p[0] - CENTROID[0]) + f.n[1] * (f.p[1] - CENTROID[1])) > 0 ? 1 : -1;
};

let track = '';
track += poly(rib.left.concat(rib.right.slice().reverse()).map(p => P(p[0], p[1], 0)), C.asphalt);
track += line(rib.left.concat([rib.left[0]]).map(p => P(p[0], p[1], 0)), C.paper, 1.1, 'opacity="0.9"');
track += line(rib.right.concat([rib.right[0]]).map(p => P(p[0], p[1], 0)), C.paper, 1.1, 'opacity="0.9"');

/* curbs at the corners, both edges; cardinal and gold through Campus Corner only */
const campusA = L.nearest(fr, [186, 142]), campusB = L.nearest(fr, [178, 86]);
let curbs = '', curbCount = 0;
const n = fr.length;
for (let i = 0; i < n; i += 2) {
    if (Math.abs(fr[i].k) < 0.045) continue;
    const j = (i + 2) % n;
    const campus = i >= campusA && i <= campusB;
    const pair = campus ? [C.cardinal, C.campusGold] : [C.ink, C.paper];
    const col = pair[Math.floor(i / 2) % 2];
    for (const side of [1, -1]) {
        const e0 = [fr[i].p[0] + fr[i].n[0] * side * L.TRACK_WIDTH / 2, fr[i].p[1] + fr[i].n[1] * side * L.TRACK_WIDTH / 2];
        const e1 = [fr[j].p[0] + fr[j].n[0] * side * L.TRACK_WIDTH / 2, fr[j].p[1] + fr[j].n[1] * side * L.TRACK_WIDTH / 2];
        const i0 = [e0[0] - fr[i].n[0] * side * 1.1, e0[1] - fr[i].n[1] * side * 1.1];
        const i1 = [e1[0] - fr[j].n[0] * side * 1.1, e1[1] - fr[j].n[1] * side * 1.1];
        curbs += poly([e0, e1, i1, i0].map(p => P(p[0], p[1], 0.05)), col);
        curbCount++;
    }
}

/* start and finish line, chequered */
let start = '';
{
    const i = L.nearest(fr, [L.START.u, L.START.v]);
    const f = fr[i], cells = 6, rows = 2, cw = L.TRACK_WIDTH / cells, rh = 0.9;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cells; c++) {
        const a = -L.TRACK_WIDTH / 2 + c * cw, b = a + cw, s0 = (r - 1) * rh, s1 = s0 + rh;
        const q = [[a, s0], [b, s0], [b, s1], [a, s1]].map(([nn, tt]) => [f.p[0] + f.n[0] * nn + f.t[0] * tt, f.p[1] + f.n[1] * nn + f.t[1] * tt]);
        start += poly(q.map(p => P(p[0], p[1], 0.06)), (r + c) % 2 ? C.ink : C.paper);
    }
}

/* pit lane */
const pitS = L.sample(L.PIT, 16, false);
const pitF = L.frames(pitS, false);
const pitR = L.ribbon(pitF, L.PIT_WIDTH);
let pit = poly(pitR.left.concat(pitR.right.slice().reverse()).map(p => P(p[0], p[1], 0)), mix(C.asphalt, C.paper, 0.18));
pit += line(pitR.left.map(p => P(p[0], p[1], 0)), C.paper, 0.8, 'opacity="0.7"');
pit += line(pitR.right.map(p => P(p[0], p[1], 0)), C.paper, 0.8, 'opacity="0.7"');

/* sector ticks */
let sectors = '';
for (const sc of L.SECTORS) {
    const i = L.nearest(fr, sc.at), f = fr[i], sg = outsideSign(i);
    const a = [f.p[0] + f.n[0] * sg * (L.TRACK_WIDTH / 2 + 0.5), f.p[1] + f.n[1] * sg * (L.TRACK_WIDTH / 2 + 0.5)];
    const b = [f.p[0] + f.n[0] * sg * (L.TRACK_WIDTH / 2 + 4), f.p[1] + f.n[1] * sg * (L.TRACK_WIDTH / 2 + 4)];
    const t = [f.p[0] + f.n[0] * sg * (L.TRACK_WIDTH / 2 + 6.5), f.p[1] + f.n[1] * sg * (L.TRACK_WIDTH / 2 + 6.5)];
    sectors += line([P(a[0], a[1], 0), P(b[0], b[1], 0)], C.ink, 1.4);
    const tp = P(t[0], t[1], 0);
    sectors += `<text x="${f2(tp[0])}" y="${f2(tp[1] + 3)}" class="sec" text-anchor="middle">S${sc.id}</text>`;
}

/* ------------------------------------------------------------ ground */
let ground = '';
ground += poly([P(0, 210, 0), P(210, 210, 0), P(210, 210, -5), P(0, 210, -5)], shade(C.plate, 0.22));
ground += poly([P(210, 0, 0), P(210, 210, 0), P(210, 210, -5), P(210, 0, -5)], shade(C.plate, 0.42));
ground += poly([P(0, 0, 0), P(210, 0, 0), P(210, 210, 0), P(0, 210, 0)], C.grass);
{   // the name on the plate edge
    const at = P(118, 210, -1.6);
    ground += `<text transform="${faceMatrix(at)}" class="plate">${esc(L.NAME.toUpperCase())}</text>`;
}
for (const g of L.GRAVEL) ground += poly(g.map(p => P(p[0], p[1], 0.02)), C.plate);
{   const s = L.CARPARK.slab; ground += poly([[s[0], s[1]], [s[0] + s[2], s[1]], [s[0] + s[2], s[1] + s[3]], [s[0], s[1] + s[3]]].map(p => P(p[0], p[1], 0.02)), C.plate); }
{   const s = L.PADDOCK.slab; ground += poly([[s[0], s[1]], [s[0] + s[2], s[1]], [s[0] + s[2], s[1] + s[3]], [s[0], s[1] + s[3]]].map(p => P(p[0], p[1], 0.02)), C.plate); }
{   // court markings
    const c = L.LOCATIONS.find(l => l.id === 'betta').boxes[0];
    const u0 = c[0], v0 = c[1], w = c[2], d = c[3], z = c[4] + 0.02;
    ground += ''; // drawn with the props so it sits on the slab; see courtLines
}

/* ------------------------------------------------------------ props */
const props = [];
function addBox(b, keyBias) { props.push({ key: boxKey(b) + (keyBias || 0), svg: boxSVG(b) }); }
for (const loc of L.LOCATIONS) for (const b of loc.boxes) addBox(b);
for (const b of L.GRANDSTAND) addBox(b);
for (const b of L.PADDOCK.haulers) addBox(b);
for (const b of L.BILLBOARDS) {
    addBox(b);
    const horizontal = b[2] > b[3];
    const posts = horizontal ? [[b[0] + 0.6, b[1]], [b[0] + b[2] - 1.1, b[1]]] : [[b[0], b[1] + 0.6], [b[0], b[1] + b[3] - 1.1]];
    for (const p of posts) addBox([p[0], p[1], 0.5, 0.5, b[5], 0, 'roof'], -0.002);
}
for (const t of L.TREES) props.push({ key: t[0] + t[1], svg: treeSVG(t) });
L.CARPARK.cars.forEach((c, i) => addBox([c[0], c[1], c[2], c[3], 0.8, 0, i % 3 ? 'wall' : 'roof']));

/* court lines on the slab */
{
    const c = L.LOCATIONS.find(l => l.id === 'betta').boxes[0];
    const u0 = c[0], v0 = c[1], w = c[2], d = c[3], z = c[4] + 0.03;
    let s = line([P(u0 + 1, v0 + 1, z), P(u0 + w - 1, v0 + 1, z), P(u0 + w - 1, v0 + d - 1, z), P(u0 + 1, v0 + d - 1, z), P(u0 + 1, v0 + 1, z)], C.paper, 0.9);
    s += line([P(u0 + w / 2, v0 + 1, z), P(u0 + w / 2, v0 + d - 1, z)], C.paper, 0.9);
    const arc = (cu, dir) => { const a = []; for (let k = 0; k <= 20; k++) { const t = -Math.PI / 2 + k / 20 * Math.PI; a.push(P(cu + Math.cos(t) * 6 * dir, v0 + d / 2 + Math.sin(t) * 6, z)); } return a; };
    s += line(arc(u0 + 1, 1), C.paper, 0.9) + line(arc(u0 + w - 1, -1), C.paper, 0.9);
    const ball = P(u0 + 8, v0 + d / 2 + 2, 3.2);
    s += `<circle cx="${f2(ball[0])}" cy="${f2(ball[1])}" r="2.2" fill="${C.accent}"/>`;
    props.push({ key: boxKey(c) + 0.0005, svg: s });
}

/* the car, number 10, on the pit straight */
{
    const i = L.nearest(fr, [70, 178]), f = fr[i];
    const u = f.p[0], v = f.p[1];
    const body = [u - 1.3, v - 0.7, 2.6, 1.4, 0.7, 0, 'accent'];
    let s = boxSVG(body) + boxSVG([u - 0.4, v - 0.4, 0.9, 0.8, 0.6, 0.7, 'roof']);
    const t = P(u, v, 3.2);
    s += `<text x="${f2(t[0])}" y="${f2(t[1])}" class="car" text-anchor="middle">${L.GRID[0].number}</text>`;
    props.push({ key: u + v + 1.5, svg: s });
}

/* the start flag, outside the start line */
{
    const [u, v] = L.FLAG.at, base = P(u, v, 0), top = P(u, v, 7);
    let s = `<line x1="${f2(base[0])}" y1="${f2(base[1])}" x2="${f2(top[0])}" y2="${f2(top[1])}" stroke="${C.ink}" stroke-width="1.2"/>`;
    s += poly([top, [top[0] + 14, top[1] + 4], [top[0], top[1] + 8]], C.accent);
    props.push({ key: u + v + 1, svg: s });
}

/* the Exchange ticker and the pit board, text on the lit faces */
let faceText = '';
{
    const ex = L.LOCATIONS.find(l => l.id === 'economics'), b = ex.boxes[0];
    const v = b[1] + b[3], u0 = b[0] + 0.8, u1 = b[0] + b[2] - 0.8;
    faceText += poly([P(u0, v, 8.2), P(u1, v, 8.2), P(u1, v, 10.4), P(u0, v, 10.4)], C.ink);
    const at = P(u0 + 0.4, v, 8.8);
    faceText += `<text transform="${faceMatrix(at)}" class="ticker" textLength="${f2((u1 - u0 - 0.8) * S * 1.118)}" lengthAdjust="spacingAndGlyphs">PLUME VAULTS · ETH VALIDATORS · MEDICI</text>`;
    const pl = L.LOCATIONS.find(l => l.id === 'contact'), bb = pl.boxes[1];
    const bv = bb[1] + bb[3], bu0 = bb[0] + 0.3, bu1 = bb[0] + bb[2] - 0.3;
    faceText += poly([P(bu0, bv, 1.9), P(bu1, bv, 1.9), P(bu1, bv, 3.3), P(bu0, bv, 3.3)], C.paper);
    const at2 = P(bu0 + 0.2, bv, 2.3);
    faceText += `<text transform="${faceMatrix(at2)}" class="board" textLength="${f2((bu1 - bu0 - 0.4) * S * 1.118)}" lengthAdjust="spacingAndGlyphs">${esc(pl.board.text)}</text>`;
}

props.sort((a, b) => a.key - b.key);
const propSVG = props.map(p => p.svg).join('');

/* ------------------------------------------------------------ labels */
let labels = '';
for (const loc of L.LOCATIONS) {
    const [u, v] = loc.anchor, g = P(u, v, 0), t = P(u, v, loc.labelZ);
    labels += `<line x1="${f2(g[0])}" y1="${f2(g[1])}" x2="${f2(t[0])}" y2="${f2(t[1])}" stroke="${C.ink}" stroke-width="1" opacity="0.7"/>`;
    labels += `<circle cx="${f2(t[0])}" cy="${f2(t[1])}" r="3" fill="${C.ink}"/>`;
    labels += `<text x="${f2(t[0] + 10)}" y="${f2(t[1] + 4)}" class="lbl">${loc.num}&#160;&#160;${esc(loc.name.toUpperCase())}</text>`;
    labels += `<text x="${f2(t[0] + 10)}" y="${f2(t[1] + 18)}" class="sub">${esc(loc.section.toUpperCase())}</text>`;
}

/* ------------------------------------------------------------ blimp */
let blimp = '';
{
    const [u, v, z] = L.BLIMP.at, c = P(u, v, z);
    const sh = P(u + SHADOW[0] * z * 0.9, v + SHADOW[1] * z * 0.9, 0);
    blimp += `<ellipse cx="${f2(sh[0])}" cy="${f2(sh[1])}" rx="40" ry="14" fill="rgba(20,20,20,0.10)"/>`;
    blimp += `<ellipse cx="${f2(c[0])}" cy="${f2(c[1])}" rx="46" ry="17" fill="${C.wall}" stroke="${shade(C.wall, 0.3)}" stroke-width="1"/>`;
    blimp += poly([[c[0] - 44, c[1] - 4], [c[0] - 58, c[1] - 12], [c[0] - 56, c[1] + 6], [c[0] - 44, c[1] + 4]], shade(C.wall, 0.34));
    blimp += `<rect x="${f2(c[0] - 6)}" y="${f2(c[1] + 16)}" width="12" height="5" rx="1" fill="${C.roof}"/>`;
    blimp += `<text x="${f2(c[0])}" y="${f2(c[1] + 5)}" class="banner" text-anchor="middle">${L.BLIMP.banner}</text>`;
}

/* ------------------------------------------------------------ HUD */
let hud = '';
hud += `<g transform="translate(48,60)">
  <text class="ring">${esc(L.NAME.toUpperCase())}</text>
  <text y="20" class="sub">${esc(L.PLACE.toUpperCase())}</text>
  <text y="70" class="name">ABBA WADA</text>
  <text y="96" class="line">I'm 23, on a mission to put elite performance</text>
  <text y="116" class="line">in the hands of every young dreamer.</text>
  <rect x="0" y="140" width="118" height="32" rx="16" fill="none" stroke="${C.ink}" stroke-width="1"/>
  <text x="59" y="160" class="btn" text-anchor="middle">START LAP</text>
</g>`;
hud += `<text x="1552" y="44" class="tag" text-anchor="end">PHASE 1 · FLAT MAP · DEFAULT ZOOM 16:9</text>`;
hud += `<text x="48" y="856" class="tag">SECTORS&#160;&#160;S1 ORIGINS&#160;&#160;S2 BUILDING&#160;&#160;S3 NOW&#160;&#160;·&#160;&#160;LAP 01 → 07</text>`;

/* mini-map, bottom right, monochrome */
let mini = '';
{
    const ms = 0.48, mx = 1470, my = 705;
    const M = (u, v) => [mx + (u - v) * ms, my + (u + v) * ms * 0.5];
    mini += line(samples.concat([samples[0]]).map(p => M(p[0], p[1])), C.ink, 1.6);
    mini += line(pitS.map(p => M(p[0], p[1])), C.ink, 0.8, 'opacity="0.5"');
    for (const sc of L.SECTORS) { const i = L.nearest(fr, sc.at), f = fr[i], sg = outsideSign(i); const a = M(f.p[0] + f.n[0] * sg * 3, f.p[1] + f.n[1] * sg * 3), b = M(f.p[0] + f.n[0] * sg * 9, f.p[1] + f.n[1] * sg * 9); mini += line([a, b], C.ink, 1); }
    for (const loc of L.LOCATIONS) { const m = M(loc.anchor[0], loc.anchor[1]); mini += `<circle cx="${f2(m[0])}" cy="${f2(m[1])}" r="2.6" fill="${C.ink}"/>`; }
    const cam = M(105, 110); mini += `<circle cx="${f2(cam[0])}" cy="${f2(cam[1])}" r="4" fill="${C.accent}"/>`;
    mini += `<text x="${mx}" y="${my - 8}" class="tag" text-anchor="middle">MINI-MAP</text>`;
}

const style = `<style>
  .lbl{font-family:'Chakra Petch',sans-serif;font-weight:600;font-style:italic;font-size:13px;letter-spacing:.14em;fill:${C.ink};paint-order:stroke;stroke:${C.paper};stroke-width:4px;stroke-linejoin:round}
  .sub{font-family:'Schibsted Grotesk','Helvetica Neue',Arial,sans-serif;font-weight:600;font-size:9px;letter-spacing:.16em;fill:#6b675f;paint-order:stroke;stroke:${C.paper};stroke-width:3px;stroke-linejoin:round}
  .sec{font-family:'Chakra Petch',sans-serif;font-weight:700;font-style:italic;font-size:11px;letter-spacing:.1em;fill:${C.ink};paint-order:stroke;stroke:${C.paper};stroke-width:3px;stroke-linejoin:round}
  .car{font-family:'Chakra Petch',sans-serif;font-weight:700;font-style:italic;font-size:9px;fill:${C.ink}}
  .ring{font-family:'Chakra Petch',sans-serif;font-weight:700;font-style:italic;font-size:26px;letter-spacing:.2em;fill:${C.ink}}
  .name{font-family:'Schibsted Grotesk','Helvetica Neue',Arial,sans-serif;font-weight:800;font-size:30px;letter-spacing:-.03em;fill:${C.ink}}
  .line{font-family:'Newsreader',Georgia,serif;font-size:15px;fill:${C.ink}}
  .btn{font-family:'Chakra Petch',sans-serif;font-weight:600;font-size:11px;letter-spacing:.18em;fill:${C.ink}}
  .tag{font-family:'Schibsted Grotesk','Helvetica Neue',Arial,sans-serif;font-weight:600;font-size:9px;letter-spacing:.18em;fill:#6b675f}
  .plate{font-family:'Chakra Petch',sans-serif;font-weight:600;font-style:italic;font-size:7px;letter-spacing:.3em;fill:${C.paper};opacity:.9}
  .ticker{font-family:'Chakra Petch',sans-serif;font-weight:600;font-size:5px;letter-spacing:.06em;fill:${C.accent}}
  .board{font-family:'Schibsted Grotesk','Helvetica Neue',Arial,sans-serif;font-weight:700;font-size:3.2px;fill:${C.ink}}
  .banner{font-family:'Chakra Petch',sans-serif;font-weight:700;font-style:italic;font-size:15px;letter-spacing:.24em;fill:${C.accent}}
</style>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(L.NAME)}, flat map">
${style}
<rect width="${W}" height="${H}" fill="${C.paper}"/>
<g id="ground">${ground}</g>
<g id="track">${track}${curbs}${start}${pit}${sectors}</g>
<g id="props">${propSVG}${faceText}</g>
<g id="labels">${labels}</g>
<g id="sky">${blimp}</g>
<g id="hud">${hud}${mini}</g>
</svg>`;

const outDir = path.join(__dirname, '..', '..', 'docs', 'circuit');
fs.writeFileSync(path.join(outDir, 'map.svg'), svg);
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(L.NAME)}, flat map | Phase 1</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,600;0,700;1,600;1,700&amp;family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&amp;family=Schibsted+Grotesk:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet">
<style>html,body{margin:0;height:100%;background:${C.paper}}svg{display:block;width:100vw;height:100vh}</style>
</head>
<body>
${svg}
</body>
</html>`;
fs.writeFileSync(path.join(outDir, 'map.html'), html);
console.log('map.svg', svg.length, 'bytes;', props.length, 'props,', curbCount, 'curb blocks,', L.TREES.length, 'trees');
