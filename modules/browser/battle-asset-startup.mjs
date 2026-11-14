import { prepareBattleAssetGroups } from './battle-asset-loading.mjs';
import { criticalHeroImageKeys, isOptionalBattleImage } from './battle-image-manifest.mjs';

class BattleAssetStartup {
    constructor(sources, services) {
        this.sources = sources; this.services = services;
        this.state = { loading: false, ready: false, failed: false, failedKeys: [], loadTicket: 0,
            loadPromise: null, images: {}, backdrops: {}, atlas: null };
        this.active = new Set(); this.deferred = []; this.disposed = false;
        this.groups = []; this.next = 0; this.pending = 0; this.resolve = null;
    }

    start() {
        const state = this.state;
        if (this.disposed) return Promise.resolve(false);
        if (state.ready) return Promise.resolve(true);
        if (state.loading && state.loadPromise) return state.loadPromise;
        if (state.failed) return Promise.resolve(false);
        state.loading = true; state.failedKeys = []; state.loadTicket = (state.loadTicket || 0) + 1;
        state.loadPromise = new Promise(resolve => { this.resolve = resolve; });
        try {
            this.prepare();
            this.report(); this.pump(); this.finish();
        } catch (error) { this.failPreparation(error); }
        return state.loadPromise;
    }

    prepare() {
        const manifest = this.sources.manifest();
        this.optional = new Set(Object.keys(manifest).filter(isOptionalBattleImage));
        this.groups = prepareBattleAssetGroups(manifest, criticalHeroImageKeys(this.sources.hero()),
            this.state.images, this.sources.activeSkill(), {
                ...this.sources.skillSheets, backdrops: this.state.backdrops, environment: this.services.images,
                onDeferred: dispose => this.deferred.push(dispose)
            });
        this.next = 0; this.pending = this.groups.length;
        this.maxParallel = this.services.maxParallel();
    }

    report() {
        this.services.progress({ loaded: Math.max(0, this.groups.length - this.pending), total: this.groups.length });
    }

    finish() {
        if (!this.resolve || this.pending > 0 || this.disposed) return;
        if (this.state.failedKeys.length) this.services.warn('battle asset load completed with missing files:', this.state.failedKeys.join(', '));
        try {
            this.state.atlas = this.services.buildAtlas();
            this.state.ready = true; this.state.loading = false;
            this.services.ready();
        } catch (error) {
            this.state.failed = true; this.state.loading = false;
            this.services.error('battle asset atlas error', error);
        }
        this.resolve(!!this.state.ready); this.resolve = null;
    }

    failPreparation(error) {
        this.state.failed = true; this.state.loading = false;
        this.services.error('battle asset preparation error', error);
        this.resolve?.(false); this.resolve = null;
        this.detachRequests();
    }

    store(key, image) {
        if (key.startsWith('backdrop') || key.startsWith('bg')) this.state.backdrops[key] = image;
        else {
            this.state.images[key] = image;
            try { this.state.images[key] = this.services.clean(key, image); }
            catch (error) { this.services.warn('battle asset cleaning failed:', key, error); }
        }
    }

    settle(image, group, ticket, failed) {
        if (this.disposed || ticket !== this.state.loadTicket || !this.active.delete(image)) return;
        image.onload = null; image.onerror = null;
        if (failed) {
            const required = group.keys.filter(key => !this.optional.has(key));
            if (required.length) {
                this.state.failed = true; this.state.failedKeys.push(...required);
                this.services.warn('battle asset load failed:', required.join(','), group.src);
            }
        } else group.keys.forEach(key => this.store(key, image));
        this.pending--; this.report(); this.finish(); this.pump();
    }

    pump() {
        if (this.disposed || !this.resolve) return;
        const concurrency = this.services.idleStartup() ? 2 : this.maxParallel;
        while (this.active.size < concurrency && this.next < this.groups.length) {
            const group = this.groups[this.next++], ticket = this.state.loadTicket;
            const image = this.services.images.createImage();
            this.active.add(image);
            if (this.services.images.protocol() !== 'file:') image.crossOrigin = 'anonymous';
            image.decoding = 'async'; image.loading = 'eager';
            if ('fetchPriority' in image) image.fetchPriority = concurrency === 2 ? 'low' : 'auto';
            image.onload = () => this.settle(image, group, ticket, false);
            image.onerror = () => this.settle(image, group, ticket, true);
            image.src = group.src;
        }
    }

    detachRequests() {
        for (const image of this.active) { image.onload = null; image.onerror = null; }
        this.active.clear();
        this.deferred.splice(0).forEach(dispose => dispose());
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true; this.state.loadTicket++;
        this.detachRequests();
        this.resolve?.(false); this.resolve = null;
        this.state.loading = false; this.state.ready = false; this.state.atlas = null;
        // Delete descriptors without reading lazy getters (which would request more images).
        for (const bank of [this.state.images, this.state.backdrops]) for (const key of Object.keys(bank)) delete bank[key];
        this.groups = []; this.pending = 0;
    }
}

/** One runtime owns the banks, ticket, queue, atlas and requests; construction starts no work. */
export function createBattleAssetStartup(sources, services) {
    const runtime = new BattleAssetStartup(sources, services);
    return Object.freeze({ state: runtime.state, start: () => runtime.start(), dispose: () => runtime.dispose() });
}
