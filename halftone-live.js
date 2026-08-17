/* HalftoneLive: makes a halftone portrait breathe, araesf-style.
   One region animates (dots fade out to paper, faint dots blink in);
   the rest of the artwork stays untouched. Dependency-free.
   Usage:
     const live = HalftoneLive.mount(canvas, {
       src: 'assets/page_halftone.png',
       region: { x: 0.42, y: 0.24, w: 0.53, h: 0.50 },  // normalized
       paper: '#f7f5f0'
     });
   Static image under prefers-reduced-motion; pauses when the tab is hidden. */
(function () {
    'use strict';

    function mount(canvas, opts) {
        opts = opts || {};
        var src = opts.src;
        var region = opts.region || { x: 0.42, y: 0.24, w: 0.53, h: 0.50 };
        var paper = opts.paper || '#f7f5f0';
        var pitch = opts.pitch || 8;          // sampling grid in display px
        var rate = opts.rate == null ? 1 : opts.rate;
        var ink = opts.ink || '#141414';

        var ctx = canvas.getContext('2d');
        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        var img = new Image();
        var W = 0, H = 0, dpr = 1;
        var R = null;                          // region in display px
        var erasers = [], sparks = [];
        var raf = null, t0 = performance.now();
        var ready = false;

        function smooth(t) { return t * t * (3 - 2 * t); }

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
                    var dot = {
                        x: R.x + gx + p / 2, y: R.y + gy + p / 2,
                        phase: Math.random() * Math.PI * 2,
                        speed: 0.35 + Math.random() * 0.55,
                        edge: edge
                    };
                    if (cov > 0.15) {
                        dot.r = p * 0.62;
                        dot.amp = 0.45 + 0.55 * Math.min(1, cov * 1.6);
                        erasers.push(dot);
                    } else if (cov > 0.008 && cov < 0.06) {
                        dot.r = 1.0 + Math.random() * 0.9;
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
            var s = Math.sin(t * dot.speed * rate + dot.phase);
            if (s < 0.80) return 0;
            return smooth((s - 0.80) / 0.20) * dot.edge * dot.amp;
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
            ctx.fillStyle = paper;
            for (i = 0; i < erasers.length; i++) {
                d = erasers[i]; a = activity(d, t);
                if (a <= 0.01) continue;
                ctx.globalAlpha = a * 0.85;
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = ink;
            for (i = 0; i < sparks.length; i++) {
                d = sparks[i]; a = activity(d, t);
                if (a <= 0.01) continue;
                ctx.globalAlpha = a * 0.6;
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
