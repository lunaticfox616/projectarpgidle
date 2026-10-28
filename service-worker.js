'use strict';

const RUNTIME_CACHE_PREFIX = 'project-arpg-runtime-';
const RUNTIME_CACHE_NAME = `${RUNTIME_CACHE_PREFIX}v1`;
const APP_DESTINATIONS = new Set(['document', 'script', 'style', 'worker']);

/** Same-origin page, script, style and worker requests: the files whose release the page must agree on. */
function isAppRequest(request) {
    if (request.method !== 'GET') return false;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return false;
    return request.mode === 'navigate' || APP_DESTINATIONS.has(request.destination);
}

/** A release build names every script and style by its content (?…h=<hash>, scripts/lib/immutable-urls.js): that URL is always the
 * same bytes, so a stored copy is served without asking the network. Until 2026-10-28 every visit downloaded all 367 scripts again
 * (2.7MB gzipped) and the page stayed black until the last one arrived. The development tree's hand-kept ?v= keys stay network-first,
 * and so does the page itself, whatever its query says. */
function isImmutable(request) {
    if (request.mode === 'navigate' || request.destination === 'document') return false;
    return new URL(request.url).searchParams.has('h');
}

// The URL stored last for each file path, during this worker's life: the trim keeps it and drops the path's other versions.
const latestByPath = new Map();
let trimming = null, trimAgain = false;

/** Older copies of stored files (other query keys from earlier releases) go in one pass over the cache index. The cache kept one
 * entry per release of every script and style, so it grew by the changed files on each deploy and was never trimmed (2026-10-26).
 * One pass per burst of stores, not one index scan per stored file: 367 scans of 450 entries after every cold load kept the cache
 * busy for tens of seconds, and every later lookup (the next visit, an offline reload) waited behind them (2026-10-28). */
async function trimOtherVersions(cache) {
    for (const stored of await cache.keys()) {
        const latest = latestByPath.get(new URL(stored.url).pathname);
        if (latest && stored.url !== latest) await cache.delete(stored);
    }
}
/** The trim in flight, or a new one; a store that lands during a trim gets one more pass after it. */
function scheduleTrim(cache) {
    if (trimming) { trimAgain = true; return trimming; }
    trimming = (async () => {
        do { trimAgain = false; await trimOtherVersions(cache); } while (trimAgain);
    })().finally(() => { trimming = null; });
    return trimming;
}

/** Keeps a successful response's clone and trims the file's other versions; a failed write only loses the offline copy. */
async function store(cache, request, response) {
    try {
        latestByPath.set(new URL(request.url).pathname, request.url);
        await cache.put(request, response);
        await scheduleTrim(cache);
    } catch (error) {
        console.warn('[app-update] 최신 파일의 오프라인 사본을 저장하지 못했습니다.', error);
    }
}

/** The stored copy of this exact URL, else the network's (which the browser HTTP cache may answer), stored in the background: the
 * page gets the bytes as they arrive, not after the write. */
async function cachedOrFetch(event, cache) {
    const cached = await cache.match(event.request, { ignoreVary: true });
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) event.waitUntil(storeIfNamed(cache, event.request, response.clone()));
    return response;
}

/** Whether the bytes are the ones the URL's h= names (the first 10 hex of their SHA-256, scripts/lib/immutable-urls.js). The server
 * ignores the query: a page of an older release that asks during a deploy gets the newer file under the old name, and a stored copy of
 * that would be served for good, even after a revert brings the old name back (2026-10-28 review). No crypto.subtle (an insecure
 * origin) keeps nothing. */
async function bytesMatchName(request, response) {
    const name = new URL(request.url).searchParams.get('h');
    if (!name || typeof crypto !== 'object' || !crypto.subtle) return false;
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await response.arrayBuffer()));
    return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('').startsWith(name);
}
/** Keeps a content-named copy only when its bytes match the name; other bytes reach the page this once and are not kept. */
async function storeIfNamed(cache, request, response) {
    try {
        if (await bytesMatchName(request, response.clone())) await store(cache, request, response);
    } catch (error) {
        console.warn('[app-update] 받은 파일의 내용을 확인하지 못해 오프라인 사본을 두지 않았습니다.', error);
    }
}

/** The network's copy, never the browser HTTP cache (an unkeyed file may have changed in place), stored before the page gets it so an
 * offline reload right after a load finds every file; offline, the stored copy of this exact URL. A versioned script never falls back
 * to a different release's bytecode. */
async function fetchLatestOrCached(event, cache) {
    try {
        const response = await fetch(event.request, { cache: 'no-store' });
        if (response.ok) await store(cache, event.request, response.clone());
        return response;
    } catch (networkError) {
        const cached = await cache.match(event.request, { ignoreVary: true });
        if (cached) return cached;
        throw networkError;
    }
}

self.addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        const staleNames = cacheNames.filter(name => name.startsWith(RUNTIME_CACHE_PREFIX) && name !== RUNTIME_CACHE_NAME);
        await Promise.all(staleNames.map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    if (!isAppRequest(event.request)) return;
    event.respondWith((async () => {
        const cache = await caches.open(RUNTIME_CACHE_NAME);
        return isImmutable(event.request) ? cachedOrFetch(event, cache) : fetchLatestOrCached(event, cache);
    })());
});
