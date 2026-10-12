/* Seeds the trees for the plate from the layout: a jittered grid, kept
   where there is grass, clear of the track, the pit lane and every
   footprint. Writes the TREES list back into circuit/layout.js.
   node tools/circuit/trees.js */
'use strict';
const fs = require('fs'), path = require('path');
const file = path.join(__dirname, '..', '..', 'circuit', 'layout.js');
delete require.cache[require.resolve(file)];
const L = require(file);
const track = L.sample(L.TRACK, 24, true), pit = L.sample(L.PIT, 16, false);
const rects = [];
const pad = (b, m) => [b[0] - m, b[1] - m, b[0] + b[2] + m, b[1] + b[3] + m];
for (const loc of L.LOCATIONS) {
    for (const b of loc.boxes) rects.push(pad(b, 3));
    if (loc.arena) { rects.push(pad(loc.arena.apron, 3)); rects.push([loc.arena.rep[0] - 6, loc.arena.rep[1] - 6, loc.arena.rep[0] + 6, loc.arena.rep[1] + 6]); }
}
const TD = L.LOCATIONS.find(l => l.id === 'about').boxes[3], TU = TD[0] + TD[2] / 2 - 2.5, TV = TD[1] + TD[3] / 2 - 2.5; rects.push([TU + 6, TV + 4, TU + 28, TV + 11]); rects.push([TU + 5, TV + 3, TU + 12, TV + 10]);
const G = L.LOCATIONS.find(l => l.id === 'projects').boxes[0]; rects.push([G[0] - 13, G[1] - 3, G[0] + 7, G[1] + 17]); rects.push([G[0] + 57, G[1] - 1, G[0] + 76, G[1] + 13]);
for (const b of L.GRANDSTAND) rects.push(pad(b, 3));
rects.push(pad(L.PADDOCK.slab, 2)); rects.push(pad(L.CARPARK.slab, 2));
rects.push([90, 107, 134, 119]);   // the candy tech bench on the lawn between the court and the garage
for (const w of L.HOARDINGS) { const len = w.panels.reduce((a, p) => a + p.w + (w.gap || 0), 0); rects.push(w.face === 'u' ? [w.at[0] - 2, w.at[1] - 2, w.at[0] + 3, w.at[1] + len + 2] : [w.at[0] - 2, w.at[1] - 2, w.at[0] + len + 2, w.at[1] + 3]); }
for (const b of L.BARRIERS) rects.push(pad(b.box, 2));
for (const g of L.GRAVEL) { const us = g.map(p => p[0]), vs = g.map(p => p[1]); rects.push([Math.min(...us) - 1, Math.min(...vs) - 1, Math.max(...us) + 1, Math.max(...vs) + 1]); }
rects.push([L.RUNOFF.at[0] - 7, L.RUNOFF.at[1] - 12, L.RUNOFF.at[0] + 7, L.RUNOFF.at[1] + 12]);
rects.push([L.FLAG.at[0] - 4, L.FLAG.at[1] - 4, L.FLAG.at[0] + 4, L.FLAG.at[1] + 4]);
if (L.DZ) {   // round 7: the drop zone's target, a clear lawn round it, and the windsock
    const r = L.DZ.r + 6; rects.push([L.DZ.at[0] - r, L.DZ.at[1] - r, L.DZ.at[0] + r, L.DZ.at[1] + r]);
    rects.push([L.DZ.sock[0] - 3, L.DZ.sock[1] - 3, L.DZ.sock[0] + 8, L.DZ.sock[1] + 5]);
}
const inRect = (u, v) => rects.some(r => u > r[0] && u < r[2] && v > r[1] && v < r[3]);
const dist = (pts, u, v) => Math.min(...pts.map(p => Math.hypot(p[0] - u, p[1] - v)));
let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const out = [], P = L.PLATE || { u0: 0, v0: 0, u1: 210, v1: 210 };   // round 7: the plate runs v -40 to 210
for (let v = P.v0 + 8; v <= P.v1 - 8; v += 11) for (let u = P.u0 + 8; u <= P.u1 - 8; u += 11) {
    const uu = u + (rnd() - 0.5) * 7, vv = v + (rnd() - 0.5) * 7;
    if (uu < P.u0 + 4 || uu > P.u1 - 4 || vv < P.v0 + 4 || vv > P.v1 - 4) continue;
    if (dist(track, uu, vv) < 9 || dist(pit, uu, vv) < 6 || inRect(uu, vv)) continue;
    if (rnd() < 0.28) continue;   // thin the grid so it never reads as a grid
    out.push([+uu.toFixed(0), +vv.toFixed(0), 4 + Math.round(rnd() * 2)]);
}
let s = fs.readFileSync(file, 'utf8');
const a = s.indexOf('    var TREES = '), b = s.indexOf('];', a) + 2;   // the whole block, one line or many
const lines = []; for (let i = 0; i < out.length; i += 8) lines.push('        ' + out.slice(i, i + 8).map(t => '[' + t.join(', ') + ']').join(', '));
s = s.slice(0, a) + '    var TREES = [   // seeded by tools/circuit/trees.js\n' + lines.join(',\n') + '\n    ];' + s.slice(b);
fs.writeFileSync(file, s);
console.log('trees', out.length);
