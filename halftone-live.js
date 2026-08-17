/* HalftoneLive: makes a halftone portrait breathe, araesf-style.
   One region animates: a slow band travels across it, lifting dots toward a
   dim tint (never paper white) and blinking faint dots in behind it. Ellipses
   in `exclude` are never touched; the rest of the artwork stays untouched.
   Dependency-free.
   Usage:
     const live = HalftoneLive.mount(canvas, {
       src: 'assets/page_halftone.png',
       region: { x: 0.42, y: 0.24, w: 0.53, h: 0.50 },  // normalized
       exclude: [{ cx: 0.42, cy: 0.52, rx: 0.13, ry: 0.15 }],
       lift: '#b8b2a6'
     });
   Static image under prefers-reduced-motion; pauses when the tab is hidden. */
(function () {
    'use strict';

    function mount(canvas, opts) {
        opts = opts || {};
        var src = opts.src;
        var region = opts.region || { x: 0.42, y: 0.24, w: 0.53, h: 0.50 };
        var exclude = opts.exclude || [];     // normalized ellipses the band skips
        var pitch = opts.pitch || 8;          // sampling grid in display px
        var rate = opts.rate == null ? 1 : opts.rate;
        var ink = opts.ink || '#141414';
        var lift = opts.lift || '#b8b2a6';    // dots lift toward this, not paper
        var liftMax = opts.liftMax == null ? 0.34 : opts.liftMax;
        var sparkMax = opts.sparkMax == null ? 0.3 : opts.sparkMax;
        var period = opts.period || 20;       // seconds for one pass of the band
        var angle = opts.angle == null ? 78 : opts.angle;      // 0 right, 90 down
        var wavelength = opts.wavelength == null ? 0.55 : opts.wavelength; // of the span
        var scatter = opts.scatter == null ? 0.5 : opts.scatter;  // radians of stagger
        var omega = (Math.PI * 2) / period;
        var dirx = Math.cos(angle * Math.PI / 180), diry = Math.sin(angle * Math.PI / 180);

        var ctx = canvas.getContext('2d');
        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        var img = new Image();
        var W = 0, H = 0, dpr = 1;
        var R = null;                          // region in display px
        var erasers = [], sparks = [];
        var raf = null, t0 = performance.now();
        var ready = false;

        function smooth(t) { return t * t * (3 - 2 * t); }

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
                var v = smooth(Math.max(0, Math.min(1, (d - 1) / f)));
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

        function build() {
            R = {
                x: Math.round(region.x * W), y: Math.round(region.y * H),
                w: Math.round(region.w * W), h: Math.round(region.h * H)
            };
            drawStatic();
            // sample the drawn region
            var data;
            try {
                data = ctx.getImageData(R.x * dpr, R.y * dpr, R.w * dpr, R.h * dpr);
            } catch (e) { return; }
            erasers = []; sparks = [];
            var p = pitch, pd = Math.round(p * dpr);
            // one wavelength measured along the travel direction
            var span = Math.abs(R.w * dirx) + Math.abs(R.h * diry);
            var wl = Math.max(1, span * wavelength);
            for (var gy = 0; gy + p <= R.h; gy += p) {
                for (var gx = 0; gx + p <= R.w; gx += p) {
                    var cov = 0, n = 0;
                    for (var sy = 0; sy < pd; sy += 2) {
                        for (var sx = 0; sx < pd; sx += 2) {
                            var ix = (((gy * dpr + sy) * data.width) + (gx * dpr + sx)) * 4;
                            cov += data.data[ix + 3] / 255;   // ink coverage via alpha
                            n++;
                        }
                    }
                    cov = n ? cov / n : 0;
                    // edge fade keeps the region boundary seamless
                    var ex = Math.min(gx, R.w - gx) / (R.w * 0.14);
                    var ey = Math.min(gy, R.h - gy) / (R.h * 0.14);
                    var edge = smooth(Math.max(0, Math.min(1, Math.min(ex, ey))));
                    if (edge <= 0.02) continue;
                    var cx = R.x + gx + p / 2, cy = R.y + gy + p / 2;
                    var clear = clearance(cx / W, cy / H);
                    if (clear <= 0.02) continue;
                    var h = hash(gx, gy);
                    var dot = {
                        x: cx, y: cy,
                        // phase rises along the travel direction: the band sweeps,
                        // the scatter keeps its leading edge from reading as a ruler
                        phase: (Math.PI * 2) * ((gx * dirx + gy * diry) / wl) + (h - 0.5) * scatter,
                        edge: edge * clear
                    };
                    if (cov > 0.15) {
                        dot.r = p * 0.62;
                        dot.amp = 0.45 + 0.55 * Math.min(1, cov * 1.6);
                        erasers.push(dot);
                    } else if (cov > 0.008 && cov < 0.06) {
                        dot.r = 1.0 + h * 0.9;
                        dot.amp = Math.min(1, cov * 14);
                        sparks.push(dot);
                    }
                }
            }
        }

        function drawStatic() {
            ctx.clearRect(0, 0, W, H);
            ctx.drawImage(img, 0, 0, W, H);
        }

        function activity(dot, t) {
            var s = Math.sin(t * omega * rate - dot.phase);
            if (s < 0.72) return 0;
            return smooth((s - 0.72) / 0.28) * dot.edge * dot.amp;
        }

        function frame(now) {
            raf = requestAnimationFrame(frame);
            var t = (now - t0) / 1000;
            // restore the artwork inside the region, then apply the shimmer
            ctx.save();
            ctx.beginPath();
            ctx.rect(R.x, R.y, R.w, R.h);
            ctx.clip();
            ctx.clearRect(R.x, R.y, R.w, R.h);
            ctx.drawImage(img, 0, 0, W, H);
            var i, a, d;
            ctx.fillStyle = lift;
            for (i = 0; i < erasers.length; i++) {
                d = erasers[i]; a = activity(d, t);
                if (a <= 0.01) continue;
                ctx.globalAlpha = a * liftMax;
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = ink;
            for (i = 0; i < sparks.length; i++) {
                d = sparks[i]; a = activity(d, t);
                if (a <= 0.01) continue;
                ctx.globalAlpha = a * sparkMax;
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        function start() {
            stop();
            if (!ready) return;
            if (reduced.matches) { drawStatic(); return; }
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
            debug: function () { return { erasers: erasers.length, sparks: sparks.length, R: R, ready: ready }; },
            destroy: function () {
                stop();
                window.removeEventListener('resize', resize);
                document.removeEventListener('visibilitychange', onVis);
            }
        };
    }

    window.HalftoneLive = { mount: mount };
})();
