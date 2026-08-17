/* Betta recorded-session graphic, the card-back cut of the pitch piece's
   "19 reps, every one captured" block: rep bars against the best rep, an
   auto-playing rep slider, one tempo readout. Data is the curl session
   recorded 4 August 2026 (capture_20260804-204121, one forearm IMU at
   50 Hz); values are baked from the session analysis, nothing recomputes.

   window.__bettaCapture.mount(host) draws the block into host and returns
   a controller with destroy(). */
(function () {
    'use strict';

    /* [set, curl-up s, lowering s, ROM deg] straight from the analysis */
    var REPS = [
        [1, 2.62, 1.38, 45.1], [1, 2.10, 1.48, 65.3], [1, 2.12, 2.14, 87.3], [1, 2.28, 1.70, 88.8],
        [2, 1.42, 1.14, 66.6], [2, 1.84, 1.70, 85.6], [2, 1.38, 2.06, 81.5], [2, 2.54, 2.38, 90.1],
        [2, 3.82, 3.64, 87.5], [2, 4.46, 4.10, 90.3], [2, 6.10, 3.76, 88.8], [2, 6.34, 3.74, 88.2],
        [2, 8.38, 2.60, 78.0], [2, 1.10, 1.76, 45.6], [2, 1.76, 2.50, 21.9], [2, 1.56, 1.10, 32.2],
        [3, 2.38, 2.70, 87.4], [3, 4.46, 3.02, 85.0], [3, 6.82, 3.68, 79.5]
    ];
    var N = REPS.length;
    var BEST = REPS.reduce(function (m, r) { return Math.max(m, r[3]); }, 0);
    var BEST_AT = REPS.map(function (r) { return r[3]; }).indexOf(BEST);
    var LONGEST = REPS.reduce(function (m, r) { return Math.max(m, r[1] + r[2]); }, 0);
    var DWELL = 950;                 /* ms per rep while playing */

    var SVGNS = 'http://www.w3.org/2000/svg';
    var W = 460, H = 138, TOP = 18, BASE = 108;

    function el(name, attrs, text) {
        var n = document.createElementNS(SVGNS, name);
        for (var k in attrs) { if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]); }
        if (text) n.textContent = text;
        return n;
    }

    function mount(host) {
        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        var root = document.createElement('div');
        root.className = 'live';
        root.setAttribute('role', 'group');
        root.setAttribute('aria-label',
            'Recorded curl session, 19 reps in three sets. Drag the slider to step through the reps.');

        root.innerHTML = '<p class="live-head"><b>Recorded</b> · one session · every rep captured</p>';

        /* rep bars against the best rep */
        var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'live-bars',
                              'aria-hidden': 'true', focusable: 'false' });
        var slot = W / N, barW = Math.min(17, slot - 6);
        var bars = [];
        var bestY = TOP;

        svg.appendChild(el('line', { x1: 0, y1: BASE, x2: W, y2: BASE, class: 'live-axis' }));
        svg.appendChild(el('line', { x1: 0, y1: bestY, x2: W, y2: bestY, class: 'live-best' }));
        svg.appendChild(el('text', { x: W - 2, y: bestY - 5, class: 'live-lab', 'text-anchor': 'end' },
                          'BEST ' + BEST.toFixed(1) + '°'));

        var setStart = { 1: null, 2: null, 3: null };
        REPS.forEach(function (r, i) {
            var x = slot * i + (slot - barW) / 2;
            var h = Math.max(3, r[3] / BEST * (BASE - TOP));
            var b = el('rect', { x: x, y: BASE - h, width: barW, height: h, rx: 2, class: 'live-bar' });
            svg.appendChild(b);
            bars.push(b);
            if (setStart[r[0]] === null) {
                setStart[r[0]] = i;
                if (i) svg.appendChild(el('line', { x1: slot * i, y1: TOP, x2: slot * i, y2: BASE, class: 'live-sep' }));
                svg.appendChild(el('text', { x: slot * i + 3, y: H - 8, class: 'live-lab' }, 'SET ' + r[0]));
            }
        });
        root.appendChild(svg);

        /* play control and rep slider */
        var row = document.createElement('div');
        row.className = 'live-row';
        row.innerHTML =
            '<button type="button" class="live-play" aria-pressed="false">Play</button>' +
            '<input type="range" min="1" max="' + N + '" step="1" value="1" ' +
                'aria-label="Drag to step through the nineteen recorded reps">';
        root.appendChild(row);

        /* one readout: set and rep, tempo, range */
        var read = document.createElement('div');
        read.className = 'live-read';
        read.innerHTML =
            '<div class="live-now">' +
              '<b data-now></b>' +
              '<span class="live-tempo" aria-hidden="true"><i data-up></i><i data-down></i></span>' +
              '<span class="live-secs" data-secs></span>' +
            '</div>' +
            '<div class="live-rom"><strong data-rom></strong><span>RANGE</span></div>';
        root.appendChild(read);

        host.appendChild(root);

        var slider = row.querySelector('input');
        var play = row.querySelector('.live-play');
        var nowEl = read.querySelector('[data-now]');
        var upEl = read.querySelector('[data-up]');
        var downEl = read.querySelector('[data-down]');
        var secsEl = read.querySelector('[data-secs]');
        var romEl = read.querySelector('[data-rom]');

        var at = -1, timer = 0, dead = false;

        function setRep(i) {
            i = Math.min(N - 1, Math.max(0, i));
            if (i === at) return;
            at = i;
            var r = REPS[i];
            var repInSet = i - setStart[r[0]] + 1;
            bars.forEach(function (b, k) {
                b.classList.toggle('is-active', k === i);
                b.classList.toggle('is-passed', k < i);
            });
            slider.value = String(i + 1);
            nowEl.textContent = 'SET ' + r[0] + ' · REP ' + repInSet;
            upEl.style.width = (r[1] / LONGEST * 100).toFixed(1) + '%';
            downEl.style.width = (r[2] / LONGEST * 100).toFixed(1) + '%';
            secsEl.textContent = r[1].toFixed(1) + ' s up · ' + r[2].toFixed(1) + ' s down';
            romEl.textContent = Math.round(r[3]) + '°';
        }

        function setPlaying(on) {
            clearInterval(timer);
            timer = 0;
            play.setAttribute('aria-pressed', String(on));
            play.textContent = on ? 'Pause' : 'Play';
            if (on) {
                timer = setInterval(function () {
                    if (dead) return;
                    setRep((at + 1) % N);
                }, DWELL);
            }
        }

        play.addEventListener('click', function () {
            setPlaying(play.getAttribute('aria-pressed') !== 'true');
        });
        slider.addEventListener('input', function () {
            setPlaying(false);
            setRep(Number(slider.value) - 1);
        });
        /* the slider owns the arrow keys; the stage must not swap cases */
        root.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') e.stopPropagation();
        });
        root.addEventListener('pointerdown', function (e) { e.stopPropagation(); });

        /* reduced motion opens on the best rep and waits; otherwise play */
        setRep(reduced ? BEST_AT : 0);
        if (!reduced) setPlaying(true);

        return {
            destroy: function () { dead = true; clearInterval(timer); }
        };
    }

    window.__bettaCapture = { mount: mount };
})();
