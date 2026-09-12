/* Exercises circuit/wikirace.js against the four cases it exists to
   handle, with fake fetch and storage so it runs in plain Node with no
   browser and no live network call.
   Usage: node tools/circuit/test-wikirace.mjs */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const WikiRace = require(path.join(ROOT, 'circuit', 'wikirace.js'));

const GOOD = {
    date: '2026-09-10', generatedAt: '2026-09-11T07:00:00Z', source: 'https://example.test',
    entries: Array.from({ length: 9 }, (_, i) => ({ rank: i + 1, title: 'A' + i, displayTitle: 'A ' + i, views: 900 - i * 10, fixed: i === 8 }))
};
const STALE_GOOD = { ...GOOD, date: '2026-09-05' };   // old but well-formed: still a valid payload

function fakeStorage() {
    const m = new Map();
    return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), _map: m };
}
function fetchOk(body) { return () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) }); }
function fetch404() { return () => Promise.resolve({ ok: false, status: 404 }); }
function fetchNetworkError() { return () => Promise.reject(new Error('network down')); }
function fetchMalformed() { return () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ nope: true }) }); }

let failures = 0;
function check(name, cond, detail) {
    if (cond) { console.log('  ok  ', name); }
    else { console.log('  FAIL', name, detail || ''); failures++; }
}

async function run() {
    console.log('1. a good fetch, empty cache -> fresh');
    {
        const storage = fakeStorage();
        const r = await WikiRace.load({ fetchImpl: fetchOk(GOOD), storage });
        check('status is fresh', r.status === 'fresh', r.status);
        check('date matches the payload', r.date === '2026-09-10', r.date);
        check('9 entries', r.entries.length === 9, r.entries.length);
        check('cache was written', storage._map.has(WikiRace.CACHE_KEY));
    }

    console.log('2. missing file (404), a prior good fetch cached -> cached, not error, not zeros');
    {
        const storage = fakeStorage();
        await WikiRace.load({ fetchImpl: fetchOk(GOOD), storage });   // seed the cache first
        const r = await WikiRace.load({ fetchImpl: fetch404(), storage });
        check('status is cached', r.status === 'cached', r.status);
        check('still the last good date', r.date === '2026-09-10', r.date);
        check('no null/zero views leaked in', r.entries.every(e => typeof e.views === 'number'));
    }

    console.log('3. malformed JSON body, a prior good fetch cached -> cached');
    {
        const storage = fakeStorage();
        await WikiRace.load({ fetchImpl: fetchOk(GOOD), storage });
        const r = await WikiRace.load({ fetchImpl: fetchMalformed(), storage });
        check('status is cached', r.status === 'cached', r.status);
        check('entries came from the cache, not the malformed body', r.entries.length === 9);
    }

    console.log('4. network error, a prior good fetch cached -> cached');
    {
        const storage = fakeStorage();
        await WikiRace.load({ fetchImpl: fetchOk(GOOD), storage });
        const r = await WikiRace.load({ fetchImpl: fetchNetworkError(), storage });
        check('status is cached', r.status === 'cached', r.status);
    }

    console.log('5. every failure mode, NO cache at all (first-ever visit) -> bootstrap, never a throw');
    for (const [label, impl] of [['404', fetch404()], ['network error', fetchNetworkError()], ['malformed', fetchMalformed()]]) {
        const storage = fakeStorage();
        const r = await WikiRace.load({ fetchImpl: impl, storage });
        check(label + ' -> bootstrap', r.status === 'bootstrap', r.status);
        check(label + ' bootstrap has no fabricated view counts', r.entries.every(e => e.views === null));
    }

    console.log('6. a stale but well-formed file (old date) is treated as fresh data, honestly dated');
    {
        const storage = fakeStorage();
        const r = await WikiRace.load({ fetchImpl: fetchOk(STALE_GOOD), storage });
        check('status is fresh (it did load and validate)', r.status === 'fresh', r.status);
        check('date is the old date, not hidden', r.date === '2026-09-05', r.date);
    }

    console.log('7. a corrupted cache entry is treated as no cache, not a crash');
    {
        const storage = fakeStorage();
        storage.setItem(WikiRace.CACHE_KEY, '{not json');
        const r = await WikiRace.load({ fetchImpl: fetch404(), storage });
        check('falls through to bootstrap without throwing', r.status === 'bootstrap', r.status);
    }

    console.log('8. isValid rejects the shapes it should');
    {
        check('rejects null', WikiRace.isValid(null) === false);
        check('rejects missing entries', WikiRace.isValid({ date: 'x' }) === false);
        check('rejects an entry missing a field', WikiRace.isValid({ date: 'x', entries: [{ rank: 1, title: 'a' }] }) === false);
        check('accepts the real shape', WikiRace.isValid(GOOD) === true);
    }

    console.log(failures ? `\n${failures} FAILURE(S)` : '\nall pass');
    process.exit(failures ? 1 : 0);
}

run();
