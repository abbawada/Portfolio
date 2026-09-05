/* HalftoneLive: makes a halftone portrait breathe, araesf-style.
   The artwork is redrawn from the source image every frame; nothing is ever
   erased. Two motion modes light dots up as they pass, always toward a dim
   tint, never paper white:

     band    a straight wave travels across the region (the default)
     dragon  pass a `spine` and a body of light crawls along that path, head
             first, tail tapering behind it, then rests before returning

   Ellipses in `exclude` are never touched. Dependency-free.
   Usage:
     const live = HalftoneLive.mount(canvas, {
       src: 'assets/page_halftone.png',
       region: { x: 0, y: 0.28, w: 0.80, h: 0.70 },      // normalized
       exclude: [{ cx: 0.42, cy: 0.52, rx: 0.13, ry: 0.15 }],
       spine: [{ x: 0.28, y: 0.30 }, ...],               // normalized path
       dragon: { cross: 30, rest: 15, length: 0.34 },
       lift: '#b8b2a6', ember: '#c6a15b'
     });
   Static image under prefers-reduced-motion; pauses when the tab is hidden. */
(function () {
    'use strict';

    function mount(canvas, opts) {
        opts = opts || {};
        var src = opts.src;
        var region = opts.region || { x: 0.42, y: 0.24, w: 0.53, h: 0.50 };
        var exclude = opts.exclude || [];     // normalized ellipses the light skips
        var pitch = opts.pitch || 8;          // sampling grid in display px
        var rate = opts.rate == null ? 1 : opts.rate;
        var ink = opts.ink || '#141414';
        var lift = opts.lift || '#b8b2a6';    // dots lift toward this, not paper
        var liftMax = opts.liftMax == null ? 0.34 : opts.liftMax;
        var sparkMax = opts.sparkMax == null ? 0.3 : opts.sparkMax;

        // band mode
        var period = opts.period || 20;       // seconds for one pass of the band
        var angle = opts.angle == null ? 78 : opts.angle;      // 0 right, 90 down
        var wavelength = opts.wavelength == null ? 0.55 : opts.wavelength; // of the span
        var scatter = opts.scatter == null ? 0.5 : opts.scatter;  // radians of stagger
        var omega = (Math.PI * 2) / period;
        var dirx = Math.cos(angle * Math.PI / 180), diry = Math.sin(angle * Math.PI / 180);

        // dragon mode
        var spine = opts.spine || null;       // normalized points, head to tail
        var dg = opts.dragon || {};
        var cross = dg.cross == null ? 30 : dg.cross;       // seconds to travel the spine
        var rest = dg.rest == null ? 15 : dg.rest;          // seconds still between passes
        var bodyFrac = dg.length == null ? 0.34 : dg.length;   // of the spine length
        var headW = dg.headWidth == null ? 0.075 : dg.headWidth;  // half width, of H
        var tailW = dg.tailWidth == null ? 0.022 : dg.tailWidth;
        var scaleLen = dg.scale == null ? 34 : dg.scale;    // scale ripple, display px
        var ember = opts.ember || '#c6a15b';  // the head only, the one warm note
        var emberMax = opts.emberMax == null ? 0.22 : opts.emberMax;
        var emberSpan = opts.emberSpan == null ? 0.2 : opts.emberSpan;  // of the body
        var glyph = opts.glyph === false ? null : (opts.glyph || {});
        var glyphAt = glyph ? (glyph.threshold == null ? 0.4 : glyph.threshold) : 2;
        var glyphLen = glyph ? (glyph.length == null ? 0.95 : glyph.length) : 0;
        var glyphWide = glyph ? (glyph.width == null ? 0.24 : glyph.width) : 0;

        var ctx = canvas.getContext('2d');
        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        var img = new Image();
        var W = 0, H = 0, dpr = 1;
        var R = null;                          // region in display px
        var erasers = [], sparks = [];
        var path = null;                       // { pts: [{x,y,s}], len }
        var bodyLen = 0, maxW = 0;
        var raf = null, t0 = performance.now();
        var ready = false, idle = false;

        function smooth(t) { return t * t * (3 - 2 * t); }
        function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

        // stable per-cell scatter: the pattern stays put across resizes
        function hash(x, y) {
            var s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
            return s - Math.floor(s);
        }

        // 0 inside an excluded ellipse, 1 clear of it, soft in the margin
        function clearance(nx, ny) {
            var m = 1;
            for (var i = 0; i < exclude.length; i++) {
                var e = exclude[i];
                var f = e.feather == null ? 0.5 : e.feather;
                var dx = (nx - e.cx) / e.rx, dy = (ny - e.cy) / e.ry;
                var d = Math.sqrt(dx * dx + dy * dy);
                var v = smooth(clamp01((d - 1) / f));
                if (v < m) m = v;
            }
            return m;
        }

        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = canvas.clientWidth; H = canvas.clientHeight;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (ready) build();
        }

        // Catmull-Rom through the control points, walked into a polyline
        // carrying cumulative arc length
        function buildPath() {
            if (!spine || spine.length < 2) { path = null; return; }
            var p = [], i, k;
            for (i = 0; i < spine.length; i++) p.push({ x: spine[i].x * W, y: spine[i].y * H });
            var pts = [], steps = 22;
            for (i = 0; i < p.length - 1; i++) {
                var a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], d = p[Math.min(p.length - 1, i + 2)];
                for (k = 0; k < steps; k++) {
                    var t = k / steps, t2 = t * t, t3 = t2 * t;
                    pts.push({
                        x: 0.5 * ((2 * b.x) + (-a.x + c.x) * t + (2 * a.x - 5 * b.x + 4 * c.x - d.x) * t2 + (-a.x + 3 * b.x - 3 * c.x + d.x) * t3),
                        y: 0.5 * ((2 * b.y) + (-a.y + c.y) * t + (2 * a.y - 5 * b.y + 4 * c.y - d.y) * t2 + (-a.y + 3 * b.y - 3 * c.y + d.y) * t3)
                    });
                }
            }
            pts.push({ x: p[p.length - 1].x, y: p[p.length - 1].y });
            var len = 0;
            pts[0].s = 0;
            for (i = 1; i < pts.length; i++) {
                len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
                pts[i].s = len;
            }
            path = { pts: pts, len: len };
            bodyLen = len * bodyFrac;
            maxW = H * Math.max(headW, tailW) * 1.35;
        }

        // nearest point on the path: arc length along it, distance across it
        function onPath(x, y) {
            var pts = path.pts, best = -1, bd = Infinity, i;
            for (i = 0; i < pts.length; i++) {
                var dx = x - pts[i].x, dy = y - pts[i].y;
                var d2 = dx * dx + dy * dy;
                if (d2 < bd) { bd = d2; best = i; }
            }
            var s = pts[best].s, d = Math.sqrt(bd);
            // refine against the two touching segments
            for (i = Math.max(0, best - 1); i <= Math.min(pts.length - 2, best); i++) {
                var ax = pts[i].x, ay = pts[i].y;
                var bx = pts[i + 1].x - ax, by = pts[i + 1].y - ay;
                var l2 = bx * bx + by * by;
                if (l2 < 1e-6) continue;
                var t = clamp01(((x - ax) * bx + (y - ay) * by) / l2);
                var px = ax + bx * t, py = ay + by * t;
                var dd = Math.hypot(x - px, y - py);
                if (dd < d) { d = dd; s = pts[i].s + Math.sqrt(l2) * t; }
            }
            return { s: s, d: d };
        }

        function tangentAt(s) {
            var pts = path.pts, i = 1;
            while (i < pts.length - 1 && pts[i].s < s) i++;
            return Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
        }

        function build() {
            R = {
                x: Math.round(region.x * W), y: Math.round(region.y * H),
                w: Math.round(region.w * W), h: Math.round(region.h * H)
            };
            buildPath();
            drawStatic();
            // sample the drawn region
            var data;
            try {
                data = ctx.getImageData(R.x * dpr, R.y * dpr, R.w * dpr, R.h * dpr);
            } catch (e) { return; }
            erasers = []; sparks = [];
            var p = pitch, pd = Math.round(p * dpr);
            var gw = Math.floor(R.w / p), gh = Math.floor(R.h / p);
            var cov = new Float32Array(gw * gh);
            var ix, iy, sx, sy;
            for (iy = 0; iy < gh; iy++) {
                for (ix = 0; ix < gw; ix++) {
                    var c = 0, n = 0;
                    for (sy = 0; sy < pd; sy += 2) {
                        for (sx = 0; sx < pd; sx += 2) {
                            var o = (((iy * p * dpr + sy) * data.width) + (ix * p * dpr + sx)) * 4;
                            c += data.data[o + 3] / 255;   // ink coverage via alpha
                            n++;
                        }
                    }
                    cov[iy * gw + ix] = n ? c / n : 0;
                }
            }
            // one wavelength measured along the travel direction (band mode)
            var span = Math.abs(R.w * dirx) + Math.abs(R.h * diry);
            var wl = Math.max(1, span * wavelength);
            for (iy = 0; iy < gh; iy++) {
                for (ix = 0; ix < gw; ix++) {
                    var gx = ix * p, gy = iy * p;
                    var v = cov[iy * gw + ix];
                    // Edge fade keeps the region boundary seamless. The band needs a
                    // wide one; the dragon carries its own falloff, so it gets a thin
                    // margin instead, or the corridor near the rect edge goes dim.
                    var fw = spine ? pitch * 3 : R.w * 0.14;
                    var fh = spine ? pitch * 3 : R.h * 0.14;
                    var ex = Math.min(gx, R.w - gx) / fw;
                    var ey = Math.min(gy, R.h - gy) / fh;
                    var edge = smooth(clamp01(Math.min(ex, ey)));
                    if (edge <= 0.02) continue;
                    var cx = R.x + gx + p / 2, cy = R.y + gy + p / 2;
                    var clear = clearance(cx / W, cy / H);
                    if (clear <= 0.02) continue;
                    var h = hash(gx, gy);
                    var dot = { x: cx, y: cy, edge: edge * clear };
                    if (path) {
                        var on = onPath(cx, cy);
                        if (on.d > maxW) continue;   // never lit, never stored
                        dot.s = on.s; dot.d = on.d;
                        // stroke angle follows the artwork: across the local
                        // gradient, falling back to the path's own flow
                        var l = ix > 0 ? cov[iy * gw + ix - 1] : v;
                        var r = ix < gw - 1 ? cov[iy * gw + ix + 1] : v;
                        var u = iy > 0 ? cov[(iy - 1) * gw + ix] : v;
                        var d2 = iy < gh - 1 ? cov[(iy + 1) * gw + ix] : v;
                        var mag = Math.hypot(r - l, d2 - u);
                        dot.ang = mag > 0.06 ? Math.atan2(d2 - u, r - l) + Math.PI / 2 : tangentAt(on.s);
                    } else {
                        // phase rises along the travel direction: the band sweeps,
                        // the scatter keeps its leading edge from reading as a ruler
                        dot.phase = (Math.PI * 2) * ((gx * dirx + gy * diry) / wl) + (h - 0.5) * scatter;
                    }
                    if (v > 0.15) {
                        dot.r = p * 0.62;
                        dot.amp = 0.45 + 0.55 * Math.min(1, v * 1.6);
                        erasers.push(dot);
                    } else if (v > 0.008 && v < 0.06) {
                        dot.r = 1.0 + h * 0.9;
                        dot.amp = Math.min(1, v * 14);
                        sparks.push(dot);
                    }
                }
            }
        }

        function drawStatic() {
            ctx.clearRect(0, 0, W, H);
            ctx.drawImage(img, 0, 0, W, H);
        }

        function activityBand(dot, t) {
            var s = Math.sin(t * omega * rate - dot.phase);
            if (s < 0.72) return 0;
            return smooth((s - 0.72) / 0.28) * dot.edge * dot.amp;
        }

        // how far behind the head this dot sits, 0 at the head, 1 at the tail
        function bodyAt(dot, head) {
            var off = head - dot.s;
            if (off < 0 || off > bodyLen) return -1;
            return off / bodyLen;
        }

        function activityDragon(dot, f, t) {
            // Along the body: a crisp front so you read a moving head, then a
            // slow taper so most of the body stays lit behind it.
            var along = smooth(clamp01(f / 0.035)) * Math.pow(1 - f, 0.9) * 1.08;
            // across it: broad at the head, thin at the tail
            var hw = H * (headW * (1 - f) + tailW * f);
            var lat = smooth(clamp01(1 - dot.d / hw));
            if (along <= 0 || lat <= 0) return 0;
            // scales: a ripple in (s, d) so the body never fires in unison
            var ripple = 0.62 + 0.38 * Math.sin(dot.s / scaleLen * 2 + dot.d / scaleLen * 1.4 - t * 1.1);
            return Math.min(1, along * lat * ripple * dot.edge * dot.amp);
        }

        function paint(d, a, colour, asGlyph) {
            ctx.globalAlpha = a;
            if (asGlyph && d.ang != null) {
                var L = d.r * glyphLen;
                ctx.strokeStyle = colour;
                ctx.lineWidth = Math.max(1, d.r * glyphWide);
                ctx.beginPath();
                ctx.moveTo(d.x - Math.cos(d.ang) * L, d.y - Math.sin(d.ang) * L);
                ctx.lineTo(d.x + Math.cos(d.ang) * L, d.y + Math.sin(d.ang) * L);
                ctx.stroke();
                return;
            }
            ctx.fillStyle = colour;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Redraw the artwork under a rectangle, then hand back the clip. The box
        // must sit on whole pixels: a fractional clip edge anti-aliases, which
        // half-erases the dots under it and leaves a bright seam trailing the body.
        function restore(box) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(Math.floor(box.x), Math.floor(box.y),
                     Math.ceil(box.w + 1), Math.ceil(box.h + 1));
            ctx.clip();
            ctx.clearRect(Math.floor(box.x), Math.floor(box.y),
                          Math.ceil(box.w + 1), Math.ceil(box.h + 1));
            ctx.drawImage(img, 0, 0, W, H);
        }

        // the box the body currently occupies, so a pass costs only its own area
        function bodyBox(head) {
            var pts = path.pts, i;
            var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            for (i = 0; i < pts.length; i++) {
                var s = pts[i].s;
                if (s > head || s < head - bodyLen) continue;
                if (pts[i].x < x0) x0 = pts[i].x;
                if (pts[i].x > x1) x1 = pts[i].x;
                if (pts[i].y < y0) y0 = pts[i].y;
                if (pts[i].y > y1) y1 = pts[i].y;
            }
            if (x0 === Infinity) return null;
            var m = maxW + pitch * 2;
            x0 = Math.max(R.x, Math.floor(x0 - m)); y0 = Math.max(R.y, Math.floor(y0 - m));
            x1 = Math.min(R.x + R.w, Math.ceil(x1 + m)); y1 = Math.min(R.y + R.h, Math.ceil(y1 + m));
            if (x1 <= x0 || y1 <= y0) return null;
            return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
        }

        function frameDragon(t) {
            var cycle = cross + rest;
            var u = (t % cycle) / cross;
            if (u > 1) {                      // resting: one clean redraw, then nothing
                if (!idle) { restore(R); ctx.restore(); idle = true; }
                return;
            }
            idle = false;
            var head = u * (path.len + bodyLen);
            var box = bodyBox(head);
            if (!box) return;
            restore(box);
            var i, d, f, a, w, g;
            for (i = 0; i < erasers.length; i++) {
                d = erasers[i];
                f = bodyAt(d, head);
                if (f < 0) continue;
                a = activityDragon(d, f, t);
                if (a <= 0.01) continue;
                w = smooth(clamp01((emberSpan - f) / emberSpan));   // gold at the head only
                g = a >= glyphAt;                                  // strokes deep in the body
                if (w < 1) paint(d, a * (1 - w) * liftMax, lift, g);
                if (w > 0) paint(d, a * w * emberMax, ember, g);
            }
            for (i = 0; i < sparks.length; i++) {
                d = sparks[i];
                f = bodyAt(d, head);
                if (f < 0) continue;
                a = activityDragon(d, f, t);
                if (a <= 0.01) continue;
                paint(d, a * sparkMax, ink);
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        function frameBand(t) {
            restore(R);
            var i, a, d;
            ctx.fillStyle = lift;
            for (i = 0; i < erasers.length; i++) {
                d = erasers[i]; a = activityBand(d, t);
                if (a <= 0.01) continue;
                ctx.globalAlpha = a * liftMax;
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = ink;
            for (i = 0; i < sparks.length; i++) {
                d = sparks[i]; a = activityBand(d, t);
                if (a <= 0.01) continue;
                ctx.globalAlpha = a * sparkMax;
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        function frame(now) {
            raf = requestAnimationFrame(frame);
            var t = (now - t0) / 1000 * (path ? rate : 1);
            path ? frameDragon(t) : frameBand(t);
        }

        function start() {
            stop();
            if (!ready) return;
            if (reduced.matches) { drawStatic(); return; }
            idle = false;
            raf = requestAnimationFrame(frame);
        }
        function stop() {
            if (raf) { cancelAnimationFrame(raf); raf = null; }
        }
        function onVis() { document.hidden ? stop() : start(); }

        img.onload = function () {
            ready = true;
            resize();
            start();
        };
        img.src = src;

        window.addEventListener('resize', resize);
        document.addEventListener('visibilitychange', onVis);
        if (typeof reduced.addEventListener === 'function') reduced.addEventListener('change', start);

        return {
            setRate: function (v) { rate = v; },
            debug: function () {
                return {
                    erasers: erasers.length, sparks: sparks.length, R: R, ready: ready,
                    len: path && Math.round(path.len), body: Math.round(bodyLen)
                };
            },
            destroy: function () {
                stop();
                window.removeEventListener('resize', resize);
                document.removeEventListener('visibilitychange', onVis);
            }
        };
    }

    window.HalftoneLive = { mount: mount };
})();
