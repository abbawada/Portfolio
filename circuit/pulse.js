/* Wada Ring, the live order.
   The running order is driven by something real: what the visitor actually
   explores. Opening a stop, staying in it, and opening a project's case all
   feed that project's car, so the race answers the person watching it.
   Nothing is fetched and nothing is sent anywhere. The signal is this
   browser's own session, kept in localStorage so a second visit picks up
   where the first left off, and it decays so the order never freezes. */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.CircuitPulse = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var KEY = 'wada-ring-pulse-1';
    /* what each real action is worth, and how fast attention fades. The
       half-life keeps the order live: stop exploring and the field drifts
       back to its own pace over a couple of minutes. */
    var WORTH = { open: 26, dwell: 1.6, case: 34, row: 10 };
    var HALF_LIFE = 110;        // seconds
    var CAP = 190;              // no project can run away for ever
    var SWING = 0.075;          // the most attention can bend a car's pace, either way

    function now() { return Date.now() / 1000; }

    function read() {
        try {
            var raw = window.localStorage.getItem(KEY);
            if (!raw) return null;
            var o = JSON.parse(raw);
            return (o && o.v === 1 && o.p) ? o : null;
        } catch (e) { return null; }   // private mode, blocked storage, bad JSON
    }
    function write(state) {
        try { window.localStorage.setItem(KEY, JSON.stringify({ v: 1, p: state.score, t: state.at })); } catch (e) { /* nothing to do */ }
    }

    function create(projectIds) {
        var state = { score: {}, at: now(), live: {}, flash: {} };
        projectIds.forEach(function (id) { state.score[id] = 0; });
        var saved = read();
        if (saved) {
            projectIds.forEach(function (id) {
                var v = +saved.p[id];
                if (isFinite(v) && v > 0) state.score[id] = v;
            });
            state.at = +saved.t || now();
            decayTo(now());          // a visit that ended an hour ago should not still be leading
        }

        function decayTo(t) {
            var dt = Math.max(0, t - state.at);
            if (dt <= 0) { state.at = t; return; }
            var k = Math.pow(0.5, dt / HALF_LIFE);
            for (var id in state.score) state.score[id] *= k;
            state.at = t;
        }

        /* a real action by the visitor */
        function bump(projectId, kind, amount) {
            if (!(projectId in state.score)) return;
            decayTo(now());
            var add = amount != null ? amount : (WORTH[kind] || 0);
            state.score[projectId] = Math.min(CAP, state.score[projectId] + add);
            if (kind !== 'dwell') state.flash[projectId] = now();
            write(state);
        }

        /* called every frame while a stop is open */
        function dwell(projectIds2, dt) {
            if (!projectIds2 || !projectIds2.length) return;
            decayTo(now());
            var each = WORTH.dwell * dt / projectIds2.length;
            for (var i = 0; i < projectIds2.length; i++) {
                var id = projectIds2[i];
                if (id in state.score) state.score[id] = Math.min(CAP, state.score[id] + each);
            }
        }

        /* the pace multiplier for one car: 1 means its own natural pace */
        function pace(projectId) {
            var s = state.score[projectId] || 0;
            if (s <= 0) return 1;
            var top = 0;
            for (var id in state.score) if (state.score[id] > top) top = state.score[id];
            if (top <= 0) return 1;
            return 1 + SWING * (s / top) * Math.min(1, top / 70);   // a small amount of attention bends the race a little, a lot bends it fully
        }

        function scoreOf(projectId) { return state.score[projectId] || 0; }
        function share(projectId) {
            var sum = 0;
            for (var id in state.score) sum += state.score[id];
            return sum > 0 ? (state.score[projectId] || 0) / sum : 0;
        }
        function flashedAt(projectId) { return state.flash[projectId] || 0; }
        function anyAttention() {
            for (var id in state.score) if (state.score[id] > 1) return true;
            return false;
        }
        function tick() { decayTo(now()); }
        function save() { write(state); }

        return { bump: bump, dwell: dwell, pace: pace, scoreOf: scoreOf, share: share,
                 flashedAt: flashedAt, anyAttention: anyAttention, tick: tick, save: save, WORTH: WORTH };
    }

    return { create: create, KEY: KEY };
}));
