'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const registrationMatch = html.match(/<script id="app-update-registration">([\s\S]*?)<\/script>/);

assert(registrationMatch, 'app shell must include the update registration boundary');
assert(html.includes('20260811-passive-tree-layout1'), 'changed passive-tree styles must receive an immediate cache version');

async function verifyRegistrationBehavior() {
    const serviceWorkerListeners = {};
    const windowListeners = {};
    let reloadCount = 0;
    let registrationArgs = null;
    let updateCount = 0;
    const registrationContext = {
        console,
        location: { protocol: 'https:', reload() { reloadCount += 1; } },
        navigator: {
            serviceWorker: {
                addEventListener(type, handler) { serviceWorkerListeners[type] = handler; },
                async register(url, options) {
                    registrationArgs = { url, options };
                    return { async update() { updateCount += 1; } };
                }
            }
        },
        window: { addEventListener(type, handler) { windowListeners[type] = handler; } }
    };
    vm.createContext(registrationContext);
    vm.runInContext(registrationMatch[1], registrationContext, { filename: 'app-update-registration.js' });
    await windowListeners.load();
    serviceWorkerListeners.controllerchange();
    serviceWorkerListeners.controllerchange();
    assert.strictEqual(registrationArgs.url, './service-worker.js', 'app shell must register the root update worker');
    assert.strictEqual(registrationArgs.options.updateViaCache, 'none', 'worker update checks must bypass HTTP cache');
    assert.strictEqual(updateCount, 1, 'each page load must explicitly check once for an updated worker');
    assert.strictEqual(reloadCount, 1, 'controller replacement must trigger at most one automatic reload');
}

const listeners = {};
const storedResponses = new Map();
const deletedCaches = [];
let skipWaitingCount = 0;
let claimCount = 0;
let networkMode = 'success';
let latestFetchOptions = null;

const runtimeCache = {
    async put(request, response) { storedResponses.set(request.url, response); },
    async match(request, options) {
        if (storedResponses.has(request.url)) return storedResponses.get(request.url);
        if (!options?.ignoreSearch) return undefined;
        const pathName = new URL(request.url).pathname;
        return [...storedResponses].find(([url]) => new URL(url).pathname === pathName)?.[1];
    }
};
const context = {
    URL,
    Set,
    Promise,
    console,
    self: {
        location: { origin: 'https://game.example' },
        clients: { async claim() { claimCount += 1; } },
        async skipWaiting() { skipWaitingCount += 1; },
        addEventListener(type, handler) { listeners[type] = handler; }
    },
    caches: {
        async open() { return runtimeCache; },
        async keys() { return ['project-arpg-runtime-old', 'project-arpg-runtime-v1', 'unrelated-cache']; },
        async delete(name) { deletedCaches.push(name); return true; }
    },
    async fetch(request, options) {
        latestFetchOptions = options;
        if (networkMode === 'failure') throw new Error('offline');
        return { ok: true, marker: 'network', clone() { return this; } };
    }
};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'service-worker.js' });

async function dispatchLifecycle(type) {
    let pending;
    listeners[type]({ waitUntil(promise) { pending = promise; } });
    await pending;
}

async function requestThroughWorker(request) {
    let responsePromise;
    listeners.fetch({ request, respondWith(promise) { responsePromise = promise; } });
    return responsePromise ? responsePromise : null;
}

(async () => {
    await verifyRegistrationBehavior();
    await dispatchLifecycle('install');
    await dispatchLifecycle('activate');
    assert.strictEqual(skipWaitingCount, 1, 'new worker must activate without waiting for old tabs to close');
    assert.strictEqual(claimCount, 1, 'active worker must immediately control existing tabs');
    assert.deepStrictEqual(deletedCaches, ['project-arpg-runtime-old'], 'activation must only delete stale app runtime caches');

    const scriptRequest = { method: 'GET', url: 'https://game.example/js/ui.js?v=old', mode: 'cors', destination: 'script' };
    const networkResponse = await requestThroughWorker(scriptRequest);
    assert.strictEqual(networkResponse.marker, 'network', 'scripts must prefer the latest network response');
    assert.strictEqual(latestFetchOptions.cache, 'no-store', 'runtime refresh must bypass the browser HTTP cache');

    networkMode = 'failure';
    const offlineRequest = { ...scriptRequest, url: 'https://game.example/js/ui.js?v=new' };
    const offlineResponse = await requestThroughWorker(offlineRequest);
    assert.strictEqual(offlineResponse.marker, 'network', 'offline fallback may reuse the same cached path across version strings');

    const externalRequest = { method: 'GET', url: 'https://api.example/data', mode: 'cors', destination: 'script' };
    assert.strictEqual(await requestThroughWorker(externalRequest), null, 'cross-origin requests must remain outside app caching');
    console.log('app update cache smoke test passed');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
