/* Wada Ring: yesterday's Wikipedia race, the client-side loader.
   Reads data/race-standings.json (written daily by .github/workflows/
   race-standings.yml) and turns it into the field the world renders.

   The one rule this module exists to enforce: the race never shows an
   error state or a zeroed field. If the file is missing, unreachable, or
   does not parse into the shape below, this falls back to the last
   standings that DID validate, cached in this browser's localStorage. If
   there is no cache either (a first-ever visit hitting a broken deploy),
   it falls back to a small built-in default so the page still shows a
   race instead of nothing. Every result says which case it is, so the
   caller can show that honestly rather than presenting stale or made-up
   data as today's.

   fetchImpl and storage are injectable so this can be unit-tested with
   plain Node (see tools/circuit/test-wikirace.mjs) without a browser or a
   live network call; in the page, both default to the real thing. */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.WikiRace = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var CACHE_KEY = 'wada-ring-race-1';
    var DEFAULT_URL = 'data/race-standings.json';

    /* Shipped as the very last resort: a first-ever visit where the JSON
       has never once loaded successfully. Not a guess at real data, and
       not zeros either; every view count is null so the renderer can
       show these nine cars without printing a false number. */
    var BOOTSTRAP = {
        date: null,
        generatedAt: null,
        source: null,
        entries: [
            { rank: 1, title: 'Loading', displayTitle: 'Loading', views: null, fixed: false },
            { rank: 2, title: 'Loading', displayTitle: 'Loading', views: null, fixed: false },
            { rank: 3, title: 'Loading', displayTitle: 'Loading', views: null, fixed: false },
            { rank: 4, title: 'Loading', displayTitle: 'Loading', views: null, fixed: false },
            { rank: 5, title: 'Loading', displayTitle: 'Loading', views: null, fixed: false },
            { rank: 6, title: 'Loading', displayTitle: 'Loading', views: null, fixed: false },
            { rank: 7, title: 'Loading', displayTitle: 'Loading', views: null, fixed: false },
            { rank: 8, title: 'Loading', displayTitle: 'Loading', views: null, fixed: false },
            { rank: 9, title: 'Loading', displayTitle: 'Loading', views: null, fixed: true }
        ]
    };

    /* Deliberately not hardcoded to exactly 9: the field size is data,
       set by whatever the Action actually wrote, so changing DYNAMIC_SIZE
       in the fetch script later does not also require an edit here. */
    function isValid(payload) {
        if (!payload || typeof payload !== 'object') return false;
        if (typeof payload.date !== 'string' || !payload.date) return false;
        if (!Array.isArray(payload.entries) || payload.entries.length < 2) return false;
        for (var i = 0; i < payload.entries.length; i++) {
            var e = payload.entries[i];
            if (!e || typeof e.rank !== 'number' || typeof e.title !== 'string' ||
                typeof e.displayTitle !== 'string' || typeof e.views !== 'number' ||
                typeof e.fixed !== 'boolean') return false;
        }
        return true;
    }

    function readCache(storage) {
        try {
            var raw = storage.getItem(CACHE_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            return isValid(parsed) ? parsed : null;   // a corrupted cache is treated as no cache
        } catch (e) { return null; }   // private mode, storage disabled, bad JSON
    }
    function writeCache(storage, payload) {
        try { storage.setItem(CACHE_KEY, JSON.stringify(payload)); } catch (e) { /* nothing to do */ }
    }

    /* status is one of:
       'fresh'     the file loaded and validated just now
       'cached'    the file failed (missing/unreachable/malformed); showing
                   the last one that DID validate, from this browser
       'bootstrap' no file has ever loaded successfully in this browser;
                   showing the built-in placeholder field, no real data */
    function load(opts) {
        opts = opts || {};
        var url = opts.url || DEFAULT_URL;
        var fetchImpl = opts.fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(typeof self !== 'undefined' ? self : this) : null);
        var storage = opts.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
        var noStorage = { getItem: function () { return null; }, setItem: function () {} };
        var store = storage || noStorage;

        if (!fetchImpl) return Promise.resolve(fallback('no fetch available'));

        return fetchImpl(url, { cache: 'no-store' }).then(function (res) {
            if (!res || !res.ok) throw new Error('HTTP ' + (res && res.status));
            return res.json();
        }).then(function (payload) {
            if (!isValid(payload)) throw new Error('malformed payload');
            writeCache(store, payload);
            return { status: 'fresh', date: payload.date, generatedAt: payload.generatedAt, source: payload.source, entries: payload.entries };
        }).catch(function (err) {
            return fallback(err && err.message, store);
        });

        function fallback(reason, storeArg) {
            var cached = readCache(storeArg || store);
            if (cached) return { status: 'cached', date: cached.date, generatedAt: cached.generatedAt, source: cached.source, entries: cached.entries, reason: reason };
            return { status: 'bootstrap', date: BOOTSTRAP.date, generatedAt: null, source: null, entries: BOOTSTRAP.entries, reason: reason };
        }
    }

    return { load: load, isValid: isValid, CACHE_KEY: CACHE_KEY, DEFAULT_URL: DEFAULT_URL };
}));
