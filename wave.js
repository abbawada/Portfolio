/* RibbonWave: PS3 XMB-inspired ribbon wave, dependency-free.
   Cream base; ribbons cycle warm ivory, pale gold, faint blush over ~60s.
   Sparse particles, pointer parallax, reduced-motion static fallback,
   pauses when the tab is hidden. Usage:
     const wave = RibbonWave.mount(canvas, { intensity: 1 });
     wave.setFocus(x, y, true);   // brightens the wave near a point (page px)
     wave.setIntensity(0.6);      // quieter pages
*/
(function () {
    'use strict';

    var STOPS = [
        [243, 234, 216],  // warm ivory
        [230, 211, 168],  // pale gold
        [238, 221, 214]   // faint blush
    ];
    var CYCLE_MS = 60000;

    function mix(a, b, t) {
        return [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t
        ];
    }

    function paletteAt(u) {
        var n = STOPS.length;
        var f = (u % 1 + 1) % 1 * n;
        var i = Math.floor(f) % n;
        return mix(STOPS[i], STOPS[(i + 1) % n], f - i);
    }

    function rgba(c, a) {
        return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')';
    }

    function mount(canvas, opts) {
        opts = opts || {};
        var ctx = canvas.getContext('2d');
        var intensity = opts.intensity == null ? 1 : opts.intensity;
        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        var W = 0, H = 0, dpr = 1;
        var raf = null, t0 = performance.now();
        var par = { tx: 0, ty: 0, x: 0, y: 0 };
        var focus = { x: 0, y: 0, target: 0, cur: 0 };

        var ribbons = [
            { y: 0.40, amp: 0.085, k: 1.35, speed: 0.055, phase: 0.0, thick: 0.150, drift: 0.012, hue: 0.00 },
            { y: 0.60, amp: 0.110, k: 0.95, speed: 0.038, phase: 2.1, thick: 0.190, drift: -0.009, hue: 0.33 }
        ];

        var particles = [];
        for (var i = 0; i < 26; i++) {
            particles.push({
                x: Math.random(), y: Math.random(),
                r: 0.8 + Math.random() * 1.6,
                vx: 0.004 + Math.random() * 0.010,
                vy: -(0.002 + Math.random() * 0.006),
                tw: Math.random() * Math.PI * 2,
                sp: 0.4 + Math.random() * 0.8
            });
        }

        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = canvas.clientWidth; H = canvas.clientHeight;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (reduced.matches) drawStatic();
        }

        function edge(r, x, t, off) {
            var u = x / W;
            return (r.y + off + Math.sin(u * Math.PI * 2 * r.k + t * r.speed + r.phase) * r.amp * 0.55
                         + Math.sin(u * Math.PI * 2 * (r.k * 2.7) - t * r.speed * 1.6 + r.phase * 1.7) * r.amp * 0.20
                         + Math.sin(t * r.drift) * 0.02) * H;
        }

        function drawRibbon(r, t, secs) {
            var color = paletteAt(secs / (CYCLE_MS / 1000) + r.hue);
            var steps = 26;
            for (var layer = 0; layer < 3; layer++) {
                var off = (layer - 1) * r.thick * 0.28;
                var thick = r.thick * (1 - layer * 0.18);
                ctx.beginPath();
                for (var s = 0; s <= steps; s++) {
                    var x = W * s / steps;
                    var y = edge(r, x, t, off);
                    s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                for (var s2 = steps; s2 >= 0; s2--) {
                    var x2 = W * s2 / steps;
                    ctx.lineTo(x2, edge(r, x2, t * 1.06, off) + thick * H);
                }
                ctx.closePath();
                var g = ctx.createLinearGradient(0, 0, W, 0);
                g.addColorStop(0, rgba(color, 0.05 * intensity));
                g.addColorStop(0.5, rgba(color, 0.16 * intensity));
                g.addColorStop(1, rgba(color, 0.05 * intensity));
                ctx.fillStyle = g;
                ctx.fill();
            }
            // luminous crest line along the top edge
            ctx.beginPath();
            for (var s3 = 0; s3 <= steps; s3++) {
                var x3 = W * s3 / steps;
                var y3 = edge(r, x3, t, 0);
                s3 === 0 ? ctx.moveTo(x3, y3) : ctx.lineTo(x3, y3);
            }
            ctx.strokeStyle = rgba([255, 252, 244], 0.30 * intensity);
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        function drawParticles(t) {
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                var a = (0.10 + 0.14 * (0.5 + 0.5 * Math.sin(p.tw + t * p.sp))) * intensity;
                ctx.fillStyle = rgba([214, 188, 138], a);
                ctx.beginPath();
                ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function stepParticles(dt) {
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                p.x += p.vx * dt; p.y += p.vy * dt;
                if (p.x > 1.02) p.x = -0.02;
                if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
            }
        }

        function drawFocus() {
            if (focus.cur < 0.01) return;
            var r = Math.max(W, H) * 0.16;
            var g = ctx.createRadialGradient(focus.x, focus.y, 0, focus.x, focus.y, r);
            g.addColorStop(0, rgba([236, 214, 168], 0.14 * focus.cur * intensity));
            g.addColorStop(1, rgba([236, 214, 168], 0));
            ctx.fillStyle = g;
            ctx.fillRect(focus.x - r, focus.y - r, r * 2, r * 2);
        }

        var last = performance.now();
        function frame(now) {
            raf = requestAnimationFrame(frame);
            var dt = Math.min((now - last) / 1000, 0.1); last = now;
            var t = (now - t0) / 1000;
            par.x += (par.tx - par.x) * 0.05;
            par.y += (par.ty - par.y) * 0.05;
            focus.cur += (focus.target - focus.cur) * 0.06;
            stepParticles(dt);
            ctx.clearRect(0, 0, W, H);
            ctx.save();
            ctx.translate(par.x, par.y);
            drawRibbon(ribbons[0], t, t);
            drawRibbon(ribbons[1], t, t + 20);
            drawParticles(t);
            drawFocus();
            ctx.restore();
        }

        function drawStatic() {
            ctx.clearRect(0, 0, W, H);
            var g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, rgba(STOPS[0], 0.0));
            g.addColorStop(0.45, rgba(STOPS[1], 0.16 * intensity));
            g.addColorStop(0.62, rgba(STOPS[2], 0.10 * intensity));
            g.addColorStop(1, rgba(STOPS[0], 0.0));
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, W, H);
        }

        function start() {
            stop();
            if (reduced.matches) { drawStatic(); return; }
            last = performance.now();
            raf = requestAnimationFrame(frame);
        }
        function stop() {
            if (raf) { cancelAnimationFrame(raf); raf = null; }
        }

        function onPointer(e) {
            par.tx = (e.clientX / W - 0.5) * 8;
            par.ty = (e.clientY / H - 0.5) * 5;
        }
        function onVis() {
            document.hidden ? stop() : start();
        }
        function onReduced() {
            start();
        }

        window.addEventListener('resize', resize);
        window.addEventListener('pointermove', onPointer, { passive: true });
        document.addEventListener('visibilitychange', onVis);
        if (typeof reduced.addEventListener === 'function') reduced.addEventListener('change', onReduced);

        resize();
        start();

        return {
            setFocus: function (x, y, on) {
                focus.x = x; focus.y = y;
                focus.target = on ? 1 : 0;
            },
            setIntensity: function (v) { intensity = v; },
            destroy: function () {
                stop();
                window.removeEventListener('resize', resize);
                window.removeEventListener('pointermove', onPointer);
                document.removeEventListener('visibilitychange', onVis);
            }
        };
    }

    window.RibbonWave = { mount: mount };
})();
