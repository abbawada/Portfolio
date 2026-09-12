/* Wada Ring: yesterday's Wikipedia race.
   Fetches en.wikipedia's most-viewed articles for UTC yesterday from the
   Wikimedia REST pageviews API (no key), filters out non-article pages
   and anything on data/race-blocklist.txt, keeps the top 8 survivors,
   adds one fixed topic (data/race-fixed-topic.json) that always races
   regardless of its rank, and writes all 9 to data/race-standings.json,
   ordered by view count descending.

   Invariant this script exists to protect: it either produces a complete,
   valid 9-entry file for a real date, or it changes nothing. A network
   hiccup, a missing config file, or a malformed API response never
   overwrites good data with an empty or partial one. The Action's commit
   step only fires when the file actually changed, so a failed run here
   simply means today's cron did not update the race; yesterday's
   standings keep racing until the next successful run.

   Usage: node tools/circuit/fetch-race-standings.mjs
   Exit 0 on a successful write, exit 1 if it could not produce a valid
   file (the existing data/race-standings.json, if any, is untouched). */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_FILE = path.join(ROOT, 'data', 'race-standings.json');
const BLOCKLIST_FILE = path.join(ROOT, 'data', 'race-blocklist.txt');
const FIXED_TOPIC_FILE = path.join(ROOT, 'data', 'race-fixed-topic.json');
const FIELD_SIZE = 9, DYNAMIC_SIZE = 8;   // 8 from the day's top pageviews, 1 fixed

// Wikimedia's API etiquette policy requires a descriptive User-Agent that
// identifies the project and a contact; requests without one are throttled
// or blocked. Update the contact if it ever changes.
const USER_AGENT = 'WadaRingCircuit/1.0 (https://abbawada.github.io/Portfolio; contact: abbawada@usc.edu)';

// Real MediaWiki namespaces, matched against the text before the FIRST
// colon only. This is deliberately not "contains a colon": plenty of real
// articles do (Avengers:_Doomsday, Spider-Man:_Brand_New_Day), so a blind
// colon filter would wrongly drop them. Verified against a live pull of
// the top 1000 on 2026-09-09 before writing this list.
const NAMESPACES = new Set([
    'Special', 'Wikipedia', 'Portal', 'File', 'Help', 'Talk', 'User', 'Category',
    'Template', 'Draft', 'Module', 'MediaWiki', 'Book', 'TimedText',
    'Wikipedia_talk', 'User_talk', 'File_talk', 'Template_talk', 'Category_talk',
    'Portal_talk', 'Help_talk', 'Draft_talk', 'Module_talk', 'MediaWiki_talk', 'Book_talk'
]);

function log(...a) { console.log('[race-standings]', ...a); }
function fail(msg) { console.error('[race-standings] FAILED:', msg); process.exit(1); }

function pad2(n) { return String(n).padStart(2, '0'); }
function ymd(date) { return { y: date.getUTCFullYear(), m: pad2(date.getUTCMonth() + 1), d: pad2(date.getUTCDate()) }; }
function isoDate({ y, m, d }) { return `${y}-${m}-${d}`; }
function addDays(date, n) { return new Date(date.getTime() + n * 86400000); }

async function fetchJson(url) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (!res.ok) return { ok: false, status: res.status, url };
    return { ok: true, status: res.status, url, body: await res.json() };
}

/* The top-pageviews endpoint is published for a UTC day shortly after it
   ends, but a scheduled job that runs very early UTC could occasionally
   catch a brief gap, and the endpoint 404s cleanly for a day with no data
   yet (verified: a not-yet-existing date returns 404 with a JSON body,
   not a crash or an empty 200). Try yesterday first, then the day before,
   so a same-day publishing delay does not fail the whole run. */
async function fetchTopPageviews(today) {
    for (const back of [1, 2]) {
        const day = addDays(today, -back), { y, m, d } = ymd(day);
        const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${y}/${m}/${d}`;
        log(`fetching top pageviews for ${isoDate({ y, m, d })} (attempt ${back})`);
        const r = await fetchJson(url);
        if (r.ok) return { ...r, date: { y, m, d } };
        log(`  -> HTTP ${r.status}, trying an earlier day`);
    }
    return null;
}

async function fetchArticlePageviews(article, date) {
    const { y, m, d } = date;
    const stamp = `${y}${m}${d}00`;
    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/all-agents/${encodeURIComponent(article)}/daily/${stamp}/${stamp}`;
    const r = await fetchJson(url);
    if (!r.ok) return null;
    const item = r.body && r.body.items && r.body.items[0];
    if (!item || typeof item.views !== 'number') return null;
    return item.views;
}

function readBlocklist() {
    if (!fs.existsSync(BLOCKLIST_FILE)) { log('no blocklist file found, treating as empty'); return new Set(); }
    const lines = fs.readFileSync(BLOCKLIST_FILE, 'utf8').split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));
    return new Set(lines);
}

function readFixedTopic() {
    if (!fs.existsSync(FIXED_TOPIC_FILE)) fail(`missing ${path.relative(ROOT, FIXED_TOPIC_FILE)}; add { "title": "Some_Article" }`);
    let cfg;
    try { cfg = JSON.parse(fs.readFileSync(FIXED_TOPIC_FILE, 'utf8')); }
    catch (e) { fail(`${path.relative(ROOT, FIXED_TOPIC_FILE)} is not valid JSON: ${e.message}`); }
    if (!cfg || typeof cfg.title !== 'string' || !cfg.title.trim()) fail(`${path.relative(ROOT, FIXED_TOPIC_FILE)} needs a non-empty "title"`);
    return cfg.title.trim();
}

function displayTitle(slug) { return slug.replace(/_/g, ' '); }

function isFilteredOut(article, blocklist) {
    if (article === 'Main_Page') return true;
    const ns = article.split(':')[0];
    if (article.includes(':') && NAMESPACES.has(ns)) return true;
    if (blocklist.has(article)) return true;
    return false;
}

async function main() {
    const now = new Date();
    const top = await fetchTopPageviews(now);
    if (!top) fail('could not fetch top pageviews for yesterday or the day before; leaving data/race-standings.json untouched');

    const blocklist = readBlocklist();
    const item = top.body.items[0];
    const survivors = item.articles.filter(a => !isFilteredOut(a.article, blocklist)).slice(0, DYNAMIC_SIZE);
    if (survivors.length < DYNAMIC_SIZE) fail(`only ${survivors.length} articles survived filtering, need ${DYNAMIC_SIZE}; check the blocklist is not too broad`);

    const fixedTitle = readFixedTopic();
    const fixedViews = await fetchArticlePageviews(fixedTitle, top.date);
    if (fixedViews == null) fail(`could not fetch pageviews for the fixed topic "${fixedTitle}" on ${isoDate(top.date)}`);

    const entries = [
        ...survivors.map(a => ({ title: a.article, displayTitle: displayTitle(a.article), views: a.views, fixed: false })),
        { title: fixedTitle, displayTitle: displayTitle(fixedTitle), views: fixedViews, fixed: true }
    ].sort((a, b) => b.views - a.views)
     .map((e, i) => ({ rank: i + 1, ...e }));

    if (entries.length !== FIELD_SIZE) fail(`expected ${FIELD_SIZE} entries, built ${entries.length}`);

    const payload = {
        date: isoDate(top.date),               // the UTC day these views are FROM
        generatedAt: now.toISOString(),        // when this file was written
        source: top.url,
        entries
    };

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2) + '\n');
    log(`wrote ${path.relative(ROOT, OUT_FILE)} for ${payload.date}:`);
    for (const e of entries) log(`  P${e.rank}  ${String(e.views).padStart(8)}  ${e.displayTitle}${e.fixed ? '  (fixed)' : ''}`);
}

main().catch(e => fail(e.stack || e.message));
