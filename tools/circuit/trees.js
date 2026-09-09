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
const T = L.LOCATIONS.find(l => l.id === 'about').boxes[0]; rects.push([T[0] - 23, T[1] + 4, T[0] + 1, T[1] + 11]); rects.push([T[0] + 3, T[1] + 3, T[0] + 12, T[1] + 10]);
const G = L.LOCATIONS.find(l => l.id === 'projects').boxes[0]; rects.push([G[0] - 16, G[1] - 3, G[0] + 4, G[1] + 17]); rects.push([G[0] + 57, G[1] + 1, G[0] + 70, G[1] + 12]);
for (const b of L.GRANDSTAND) rects.push(pad(b, 3));
rects.push(pad(L.PADDOCK.slab, 2)); rects.push(pad(L.CARPARK.slab, 2));
for (const w of L.HOARDINGS) { const len = w.panels.reduce((a, p) => a + p.w + (w.gap || 0), 0); rects.push(w.face === 'u' ? [w.at[0] - 2, w.at[1] - 2, w.at[0] + 3, w.at[1] + len + 2] : [w.at[0] - 2, w.at[1] - 2, w.at[0] + len + 2, w.at[1] + 3]); }
for (const b of L.BARRIERS) rects.push(pad(b.box, 2));
for (const g of L.GRAVEL) { const us = g.map(p => p[0]), vs = g.map(p => p[1]); rects.push([Math.min(...us) - 1, Math.min(...vs) - 1, Math.max(...us) + 1, Math.max(...vs) + 1]); }
rects.push([L.RUNOFF.at[0] - 7, L.RUNOFF.at[1] - 12, L.RUNOFF.at[0] + 7, L.RUNOFF.at[1] + 12]);
rects.push([L.FLAG.at[0] - 4, L.FLAG.at[1] - 4, L.FLAG.at[0] + 4, L.FLAG.at[1] + 4]);
const inRect = (u, v) => rects.some(r => u > r[0] && u < r[2] && v > r[1] && v < r[3]);
const dist = (pts, u, v) => Math.min(...pts.map(p => Math.hypot(p[0] - u, p[1] - v)));
let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const out = [];
for (let v = 8; v <= 202; v += 11) for (let u = 8; u <= 202; u += 11) {
    const uu = u + (rnd() - 0.5) * 7, vv = v + (rnd() - 0.5) * 7;
    if (uu < 4 || uu > 206 || vv < 4 || vv > 206) continue;
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
