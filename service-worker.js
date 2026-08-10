'use strict';

const RUNTIME_CACHE_PREFIX = 'project-arpg-runtime-';
const RUNTIME_CACHE_NAME = `${RUNTIME_CACHE_PREFIX}v1`;
const NETWORK_FIRST_DESTINATIONS = new Set(['document', 'script', 'style', 'worker']);

function shouldRefreshFromNetwork(request) {
    if (request.method !== 'GET') return false;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return false;
    return request.mode === 'navigate' || NETWORK_FIRST_DESTINATIONS.has(request.destination);
}

async function fetchLatestOrCached(request) {
    const cache = await caches.open(RUNTIME_CACHE_NAME);
    try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response.ok) {
            try {
                await cache.put(request, response.clone());
            } catch (error) {
                console.warn('[app-update] 최신 파일의 오프라인 사본을 저장하지 못했습니다.', error);
            }
        }
        return response;
    } catch (networkError) {
        const cached = await cache.match(request, { ignoreSearch: true });
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
    if (!shouldRefreshFromNetwork(event.request)) return;
    event.respondWith(fetchLatestOrCached(event.request));
});
