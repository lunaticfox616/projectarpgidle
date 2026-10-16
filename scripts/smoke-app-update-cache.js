'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const registrationMatch = html.match(/<script id="app-update-registration">([\s\S]*?)<\/script>/);

assert(registrationMatch, 'app shell must include the update registration boundary');

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
                controller: null,
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
    const serviceWorker = registrationContext.navigator.serviceWorker;
    serviceWorker.controller = { scriptURL: 'first-install' };
    serviceWorkerListeners.controllerchange?.();
    assert.strictEqual(reloadCount, 0, 'the first install claiming a freshly loaded page must not restart it');
    serviceWorker.controller = { scriptURL: 'update' };
    serviceWorkerListeners.controllerchange?.();
    serviceWorkerListeners.controllerchange?.();
    assert.strictEqual(registrationArgs.url, './service-worker.js', 'app shell must register the root update worker');
    assert.strictEqual(registrationArgs.options.updateViaCache, 'none', 'worker update checks must bypass HTTP cache');
    assert.strictEqual(updateCount, 1, 'each page load must explicitly check once for an updated worker');
    assert.strictEqual(reloadCount, 0, 'installing an update must not interrupt play or discard unsaved progress');
}

function createNoticeRuntime() {
    const runtime = buildGameRuntime();
    const storage = new Map();
    const elements = new Map();
    const windowEvents = {}, documentEvents = {};
    const boundary = { now: Date.now(), full: false, reloadCount: 0 };
    const makeElement = () => {
        const children = new Map();
        return {
            events: {}, setAttribute() {},
            addEventListener(type, handler) { this.events[type] = handler; },
            querySelector(selector) {
                if (!children.has(selector)) children.set(selector, makeElement());
                return children.get(selector);
            },
            remove() { elements.delete(this.id); }
        };
    };
    runtime.document.createElement = makeElement;
    runtime.document.getElementById = id => elements.get(id) || null;
    runtime.document.querySelector = selector => selector === 'meta[name="app-deploy"]' ? { content: 'release-old' } : null;
    runtime.document.body.appendChild = node => elements.set(node.id, node);
    runtime.document.addEventListener = (type, handler) => { documentEvents[type] = handler; };
    runtime.addEventListener = (type, handler) => { windowEvents[type] = handler; };
    runtime.Date = class extends Date { static now() { return boundary.now; } };
    runtime.localStorage = {
        getItem: key => storage.get(key) || null,
        setItem(key, value) {
            if (boundary.full) throw Object.assign(new Error('test quota exceeded'), { name: 'QuotaExceededError' });
            storage.set(key, value);
        },
        removeItem: key => storage.delete(key)
    };
    runtime.location.reload = () => { boundary.reloadCount += 1; };
    runtime.fetch = async () => ({ ok: true, json: async () => ({ build: 'release-new' }) });
    return { runtime, elements, windowEvents, documentEvents, boundary };
}

async function verifyNoticeSaveBoundary() {
    const { runtime, elements, windowEvents, documentEvents, boundary } = createNoticeRuntime();
    runtime.loadGame();
    vm.runInContext('game.level = 37; saveGame({ skipCloudSync: true }); game.level = 38;', runtime);
    const saved = runtime.readLocalSaveString();
    vm.runInContext(fs.readFileSync(path.join(root, 'js/app-update-ui.js'), 'utf8'), runtime);
    windowEvents.load();
    await documentEvents.visibilitychange();
    const notice = elements.get('app-update-notice');
    assert(notice, 'a new deployment must show a choice');
    const reload = () => notice.querySelector('.app-update-reload').events.click();
    vm.runInContext('backgroundCombatRuntime.processing = true;', runtime);
    reload();
    assert.strictEqual(boundary.reloadCount, 0, 'update must wait while background rewards are being settled');
    assert.strictEqual(runtime.readLocalSaveString(), saved, 'an unfinished settlement must not replace the last safe save');
    vm.runInContext('backgroundCombatRuntime.processing = false;', runtime);
    boundary.full = true;
    reload();
    assert.strictEqual(boundary.reloadCount, 0, 'a full disk must leave the running game open');
    assert.strictEqual(runtime.readLocalSaveString(), saved, 'a failed write must preserve the saved progress');
    assert.strictEqual(runtime.getLocalSaveStatus().writable, false, 'real storage failure must enter existing recovery protection');
    assert(notice.querySelector('span').textContent, 'a refused update must explain why it stayed open');
    // Recover through the existing load boundary, then retry with new progress.
    boundary.full = false;
    runtime.loadGame();
    vm.runInContext('game.level = 39;', runtime);
    reload();
    assert.strictEqual(boundary.reloadCount, 1, 'an explicitly requested update may reload after saving');
    assert.strictEqual(JSON.parse(runtime.readLocalSaveString()).level, 39, 'save must finish before navigation, without depending on pagehide');
    notice.querySelector('.app-update-later').events.click();
    await documentEvents.visibilitychange();
    assert(!elements.has('app-update-notice'), 'later must suppress the notice');
    boundary.now += 30 * 60 * 1000;
    await documentEvents.visibilitychange();
    assert(elements.has('app-update-notice'), 'a postponed update must be offered again');
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
    await verifyNoticeSaveBoundary();
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
    await assert.rejects(requestThroughWorker(offlineRequest), /offline/, 'a missing version must not execute older bytecode');
    const offlineResponse = await requestThroughWorker(scriptRequest);
    assert.strictEqual(offlineResponse.marker, 'network', 'the exact cached release remains usable offline');

    const externalRequest = { method: 'GET', url: 'https://api.example/data', mode: 'cors', destination: 'script' };
    assert.strictEqual(await requestThroughWorker(externalRequest), null, 'cross-origin requests must remain outside app caching');
    console.log('app update cache smoke test passed');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
