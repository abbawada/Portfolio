/* Betta capture readout.
   One recorded bench session, 4 August 2026: capture_20260804-213422.
   One IMU on the forearm at 50 Hz, the second sensor offline, 0.17% of
   packets lost. TRACE is the forearm orientation angle with its two second
   moving median removed, so each rep reads as one cycle. REPS carries the
   phase timings straight from the session analysis. Both are baked; nothing
   here recomputes the session.

   window.__bettaCapture.mount(host) draws the panel into host and returns a
   controller with play() and destroy(). */
(function () {
    'use strict';

    var LO = 63.093, HI = 110.528;   /* seconds, the window the trace covers */

    var TRACE = [[0.0004,7.2],[0.0046,-4.96],[0.0122,-2.83],[0.0164,-5.4],[0.0181,-6.37],[0.0248,-5.82],[0.0253,-4.79],[0.0295,-1.73],[0.0359,0.37],[0.0417,2.11],[0.0459,5.22],[0.0498,6.65],[0.0537,6.9],[0.0557,7.73],[0.0586,5.32],[0.0667,-5.75],[0.0701,-6.22],[0.0751,-6.2],[0.0756,-6.35],[0.0798,-6.27],[0.084,-0.93],[0.0899,-1.31],[0.0925,-0.4],[0.0996,-0.16],[0.1013,0.73],[0.1085,0.51],[0.1127,1.34],[0.1144,1.53],[0.1174,0.8],[0.125,-1.18],[0.1283,-1.29],[0.13,-1.19],[0.1351,-0.42],[0.1393,0.53],[0.1431,0.16],[0.149,0.53],[0.1541,1.81],[0.1579,3.92],[0.1612,4.58],[0.1633,3.17],[0.1676,0.94],[0.1756,2.31],[0.1761,2.24],[0.184,-3.68],[0.1874,-4.34],[0.1887,-4.11],[0.1937,-2.11],[0.2005,1.62],[0.2047,3.1],[0.2076,3.5],[0.2094,2.54],[0.2149,-0.44],[0.2212,2.4],[0.222,2.7],[0.2301,-1.39],[0.2343,-2.71],[0.2352,-2.96],[0.2389,-2.23],[0.2432,-1.46],[0.2499,0.71],[0.255,2.01],[0.2592,3.51],[0.2613,4.34],[0.2639,2.66],[0.2692,0.96],[0.2756,3.16],[0.2765,2.21],[0.2845,-1.55],[0.2887,-2.54],[0.2892,-2.61],[0.2933,-2.25],[0.2971,-1.9],[0.3014,-0.59],[0.3093,1.8],[0.3136,3.75],[0.3178,5.22],[0.3182,5.44],[0.3225,3.48],[0.3305,-1.46],[0.333,-3.44],[0.3385,-6.04],[0.3427,-8.09],[0.3452,-8.89],[0.3482,-9.6],[0.3516,-8.57],[0.3558,-6.87],[0.3601,-4.12],[0.3681,1.97],[0.3723,5.28],[0.3756,7],[0.3808,8.4],[0.3828,9.27],[0.3887,10.99],[0.3896,11.54],[0.3934,9.4],[0.3976,3.85],[0.4056,-4.81],[0.409,-8.17],[0.4137,-9.42],[0.4153,-10.02],[0.4191,-10.31],[0.4229,-9.51],[0.4272,-6.33],[0.431,-3.18],[0.4385,2.79],[0.4432,5.88],[0.4474,10.18],[0.4516,11.94],[0.4554,12.92],[0.4567,13.63],[0.4605,11.73],[0.4647,6.23],[0.4694,2.76],[0.477,-4.8],[0.4807,-7.81],[0.4849,-9.21],[0.4888,-10.34],[0.4905,-10.04],[0.4963,-9.59],[0.5001,-9.33],[0.5023,-8.45],[0.5065,-5.52],[0.5116,-1.87],[0.5183,3.62],[0.523,5.82],[0.5271,8.82],[0.5306,11.01],[0.5348,12.53],[0.5378,13.06],[0.5411,12.79],[0.544,9.79],[0.5483,5.49],[0.5525,3.66],[0.5605,-7.18],[0.5647,-10.37],[0.5689,-11.16],[0.5711,-11.52],[0.5757,-11.02],[0.5774,-11],[0.5817,-9.53],[0.5859,-7.94],[0.59,-4.26],[0.5981,3.22],[0.6024,6.5],[0.6066,8.69],[0.61,9.7],[0.615,11.2],[0.6192,12.95],[0.6196,13.18],[0.6238,11.18],[0.6277,7.27],[0.6318,3.13],[0.6399,-6.02],[0.6441,-9.83],[0.6484,-11.67],[0.6526,-12.56],[0.6534,-12.69],[0.6573,-12.17],[0.6614,-10.72],[0.6656,-8.36],[0.6698,-5.47],[0.6737,-1.87],[0.6813,0.53],[0.6859,2.38],[0.6901,4.41],[0.6944,6.33],[0.6985,8],[0.7024,8.99],[0.7057,9.67],[0.7075,9.78],[0.7117,7.9],[0.7159,4.77],[0.7201,2.29],[0.726,-0.23],[0.7319,-2.89],[0.7362,-7.58],[0.7404,-9.49],[0.7412,-9.72],[0.745,-8.89],[0.7497,-7.82],[0.7535,-6.7],[0.7589,-5.22],[0.7618,-4.41],[0.7657,-2.64],[0.7699,-0.57],[0.7779,-0.19],[0.7809,-0.22],[0.7851,-0.16],[0.7906,0.52],[0.7939,1.79],[0.799,3.32],[0.8025,4.22],[0.8075,5.47],[0.8105,5.78],[0.8117,5.73],[0.816,4.69],[0.8206,3.99],[0.8252,2.02],[0.8286,0.71],[0.8328,0.21],[0.8391,-0.4],[0.845,-0.3],[0.8464,0.21],[0.8526,-0.2],[0.8573,-0.32],[0.8615,-1.9],[0.8657,-3.16],[0.87,-5.04],[0.8742,-6.57],[0.878,-7.12],[0.8797,-7.27],[0.8852,-7.04],[0.8872,-6],[0.8919,-3.16],[0.8956,-1.5],[0.9012,-0.89],[0.9067,0.22],[0.9118,2.22],[0.916,2.96],[0.9201,5.37],[0.9244,6.81],[0.9261,7.25],[0.9295,7.02],[0.9333,5.78],[0.9374,3.76],[0.9417,1.94],[0.9459,0.85],[0.9506,0.23],[0.9577,-0.13],[0.9603,0.13],[0.9624,-0.22],[0.9704,-0.22],[0.973,-0.37],[0.9772,0.66],[0.981,0.25],[0.9847,-0.22],[0.9915,-0.14],[0.9919,-0.3],[0.9995,-1.1]];

    /* a start, b bottom turn, c end (all 0 to 1 across the window);
       press and lower in seconds, err is how far the rep finishes from the
       orientation it started at, in degrees */
    var REPS = [{i:1,a:0.0253,b:0.084,c:0.1093,press:1.2,lower:2.78,err:18.2},
                {i:2,a:0.1093,b:0.1866,c:0.2085,press:1.04,lower:3.67,err:18.5},
                {i:3,a:0.2085,b:0.2355,c:0.2596,press:1.14,lower:1.28,err:2.1},
                {i:4,a:0.2596,b:0.2925,c:0.3162,press:1.12,lower:1.56,err:1.9},
                {i:5,a:0.3162,b:0.3448,c:0.3871,press:2.01,lower:1.36,err:4},
                {i:6,a:0.3871,b:0.4158,c:0.4546,press:1.84,lower:1.36,err:3.5},
                {i:7,a:0.4546,b:0.4901,c:0.5365,press:2.2,lower:1.68,err:1.1},
                {i:8,a:0.5365,b:0.572,c:0.6172,press:2.14,lower:1.68,err:1.9},
                {i:9,a:0.6172,b:0.653,c:0.7054,press:2.48,lower:1.7,err:4.9},
                {i:10,a:0.7054,b:0.7433,c:0.8095,press:3.14,lower:1.8,err:2.8},
                {i:11,a:0.8095,b:0.8797,c:0.9747,press:4.51,lower:3.33,err:17.3}];

    var SVGNS = 'http://www.w3.org/2000/svg';
    var SWEEP = 2600;                /* ms for the trace to draw across */

    /* plot box */
    var PW = 420, PH = 148, PX = 6, PT = 8, PB = 8;
    var AMP = 14;                    /* degrees at the top of the plot */
    /* bar box */
    var BW = 420, BH = 84, BT = 6, BBASE = 66, BMAX = 8.2;  /* seconds full height */

    function el(name, attrs) {
        var n = document.createElementNS(SVGNS, name);
        for (var k in attrs) { if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]); }
        return n;
    }

    function px(u) { return PX + u * (PW - PX * 2); }

    function tracePath() {
        var mid = PT + (PH - PT - PB) / 2;
        var half = (PH - PT - PB) / 2;
        var d = '';
        for (var i = 0; i < TRACE.length; i++) {
            var x = px(TRACE[i][0]);
            var y = mid - Math.max(-1, Math.min(1, TRACE[i][1] / AMP)) * half;
            d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
        }
        return d;
    }

    function mount(host) {
        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        var root = document.createElement('div');
        root.className = 'cap';
        root.tabIndex = 0;
        root.setAttribute('role', 'group');
        root.setAttribute('aria-label',
            'Recorded bench session, 11 reps. Use the left and right arrow keys to step through the reps.');

        root.innerHTML =
            '<p class="cap-head"><b>Recorded</b> 4 Aug 2026 · Bench press · 1 set of 11</p>';

        /* the trace */
        var plot = el('svg', { viewBox: '0 0 ' + PW + ' ' + PH, class: 'cap-plot',
                               role: 'img', 'aria-hidden': 'true', focusable: 'false' });
        var bandG = el('g', {});
        plot.appendChild(bandG);
        var mid = PT + (PH - PT - PB) / 2;
        plot.appendChild(el('line', { x1: PX, y1: mid, x2: PW - PX, y2: mid, class: 'cap-axis' }));

        var path = el('path', { d: tracePath(), class: 'cap-line', 'pathLength': '1' });
        plot.appendChild(path);

        var head = el('line', { x1: PX, y1: PT, x2: PX, y2: PH - PB, class: 'cap-head-line' });
        plot.appendChild(head);
        root.appendChild(plot);

        /* one stacked bar per rep: lowering under, press over */
        var bars = el('svg', { viewBox: '0 0 ' + BW + ' ' + BH, class: 'cap-bars',
                               role: 'img', 'aria-hidden': 'true', focusable: 'false' });
        bars.appendChild(el('line', { x1: PX, y1: BBASE, x2: BW - PX, y2: BBASE, class: 'cap-axis' }));

        var slot = (BW - PX * 2) / REPS.length;
        var barW = Math.min(24, slot - 10);
        var pressRects = [], lowerRects = [], bandRects = [], hits = [];

        REPS.forEach(function (r, k) {
            var cx = PX + slot * (k + 0.5);
            var lh = r.lower / BMAX * (BBASE - BT);
            var ph = r.press / BMAX * (BBASE - BT);

            var lo = el('rect', { x: cx - barW / 2, y: BBASE - lh, width: barW, height: lh,
                                  class: 'cap-lower', 'data-rep': r.i });
            var pr = el('rect', { x: cx - barW / 2, y: BBASE - lh - ph, width: barW, height: ph,
                                  class: 'cap-press', 'data-rep': r.i });
            bars.appendChild(lo); bars.appendChild(pr);
            lowerRects.push(lo); pressRects.push(pr);

            var lab = el('text', { x: cx, y: BH - 6, class: 'cap-tick', 'text-anchor': 'middle' });
            lab.textContent = r.i;
            bars.appendChild(lab);

            /* one transparent hit target per rep, spanning bar and label */
            var hit = el('rect', { x: cx - slot / 2, y: 0, width: slot, height: BH,
                                   class: 'cap-hit', 'data-rep': r.i });
            bars.appendChild(hit);
            hits.push(hit);

            /* the matching span on the trace: lowering faint, press lit */
            var band = el('g', { class: 'cap-band', 'data-rep': r.i });
            band.appendChild(el('rect', { x: px(r.a), y: PT, width: px(r.b) - px(r.a),
                                          height: PH - PT - PB, class: 'cap-band-lower' }));
            band.appendChild(el('rect', { x: px(r.b), y: PT, width: px(r.c) - px(r.b),
                                          height: PH - PT - PB, class: 'cap-band-press' }));
            bandG.appendChild(band);
            bandRects.push(band);
        });
        root.appendChild(bars);

        var read = document.createElement('p');
        read.className = 'cap-read';
        read.setAttribute('aria-live', 'polite');
        root.appendChild(read);

        var foot = document.createElement('div');
        foot.className = 'cap-foot';
        foot.innerHTML =
            '<ul class="cap-chips">' +
              '<li>11 of 11 reps</li>' +
              '<li>Press 1.20 to 4.51 s</li>' +
              '<li>50 Hz, 0.17% lost</li>' +
            '</ul>' +
            '<button type="button" class="cap-replay">Replay</button>';
        root.appendChild(foot);

        var note = document.createElement('p');
        note.className = 'cap-note';
        note.textContent = 'One IMU on the forearm; the second was offline. ' +
            'Press time climbs every rep. The last one takes 4.51 seconds and ' +
            'finishes 17.3 degrees off the top.';
        root.appendChild(note);

        host.appendChild(root);

        /* ---- state ---- */

        var current = 0;             /* 0 means the summary */
        var pinned = 0;              /* set by hover, tap or the arrow keys */
        var raf = 0, t0 = 0, dead = false;

        var SUMMARY = 'Set held together to rep 11, then the press took nearly four times as long.';

        function paint() {
            var r = current ? REPS[current - 1] : null;
            read.innerHTML = r
                ? '<b>Rep ' + r.i + '</b> press ' + r.press.toFixed(2) + ' s · lowering ' +
                  r.lower.toFixed(2) + ' s · finishes ' + r.err.toFixed(1) + '&deg; off the top'
                : SUMMARY;
            for (var k = 0; k < REPS.length; k++) {
                var on = (current === k + 1);
                bandRects[k].classList.toggle('is-on', on);
                pressRects[k].classList.toggle('is-on', on);
                lowerRects[k].classList.toggle('is-on', on);
            }
        }

        function setRep(i) {
            if (current === i) return;
            current = i;
            paint();
        }

        function reveal(upTo) {
            for (var k = 0; k < REPS.length; k++) {
                bandRects[k].classList.toggle('is-in', REPS[k].a <= upTo);
                var grown = REPS[k].c <= upTo || REPS[k].a <= upTo;
                pressRects[k].classList.toggle('is-in', grown);
                lowerRects[k].classList.toggle('is-in', grown);
            }
        }

        function finish() {
            path.style.strokeDashoffset = '0';
            head.style.opacity = '0';
            reveal(1);
            if (!pinned) setRep(0);
        }

        function frame(now) {
            if (dead) return;
            if (!t0) t0 = now;
            var p = Math.min(1, (now - t0) / SWEEP);
            var e = 1 - Math.pow(1 - p, 2);          /* ease out */
            path.style.strokeDashoffset = String(1 - e);
            head.setAttribute('x1', px(e)); head.setAttribute('x2', px(e));
            reveal(e);
            if (!pinned) {
                var at = 0;
                for (var k = 0; k < REPS.length; k++) { if (REPS[k].a <= e) at = k + 1; }
                setRep(at);
            }
            if (p < 1) { raf = requestAnimationFrame(frame); }
            else { finish(); }
        }

        function play() {
            if (dead) return;
            cancelAnimationFrame(raf);
            t0 = 0;
            if (reduced) { finish(); return; }
            path.style.strokeDashoffset = '1';
            head.style.opacity = '';
            reveal(0);
            setRep(0);
            raf = requestAnimationFrame(frame);
        }

        /* ---- interaction ---- */

        function pin(i) { pinned = i; setRep(i); }

        hits.forEach(function (h) {
            var i = Number(h.getAttribute('data-rep'));
            h.addEventListener('pointerenter', function () { pin(i); });
            h.addEventListener('pointerdown', function (e) { e.stopPropagation(); pin(i); });
        });
        bars.addEventListener('pointerleave', function () { pinned = 0; setRep(0); });

        root.addEventListener('keydown', function (e) {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            var next = e.key === 'ArrowRight'
                ? Math.min(REPS.length, (pinned || 0) + 1)
                : Math.max(1, (pinned || REPS.length + 1) - 1);
            pin(next);
            e.preventDefault();
            e.stopPropagation();
        });

        var replay = foot.querySelector('.cap-replay');
        replay.addEventListener('click', function (e) {
            e.stopPropagation();
            pinned = 0;
            play();
        });

        paint();
        reveal(reduced ? 1 : 0);
        if (reduced) finish();

        return {
            play: play,
            destroy: function () { dead = true; cancelAnimationFrame(raf); }
        };
    }

    window.__bettaCapture = { mount: mount, window: [LO, HI] };
})();
