const FADE_SEC = 1.4, BOSS_HOLD_MS = 8000, CACHE_TRACKS = 2, LEVEL = .45;
const DUCK_LEVEL = .5, DUCK_RELEASE_MS = 1500;

/** Seconds from the first play, wrapped only after the intro has passed. */
export function trackPosition(track, elapsed) {
    if (elapsed < track.loopEnd) return elapsed;
    return track.loopStart + (elapsed - track.loopStart) % (track.loopEnd - track.loopStart);
}

class BackgroundMusic {
    constructor(catalog, inputs, environment) {
        this.catalog = catalog; this.inputs = inputs; this.environment = environment;
        this.buffers = new Map(); this.positions = new Map(); this.warned = new Set();
        this.output = null; this.current = null; this.loading = null;
        this.bossUntil = 0; this.bossTrack = 'boss'; this.duckUntil = 0;
        this.pendingTimers = new Set(); this.disposed = false;
    }

    failure(label, error) {
        if (this.warned.has(label)) return;
        this.warned.add(label);
        this.environment.warn(`[bgm] ${label}`, error);
    }

    standingBossTrack(bosses, type) {
        const own = bosses.map(enemy => this.catalog.visual[enemy.monsterVisualId]).find(Boolean);
        return own || this.catalog.boss[type] || 'boss';
    }

    zoneTrack(zone) {
        if (!zone) return 'act';
        return this.catalog.visual[zone.atlasStages || zone.bossVisualId] || this.catalog.zone[zone.type] || 'act';
    }

    wantedTrack(now) {
        if (this.inputs.startupOpen()) return 'title';
        const zone = this.inputs.zone();
        const bosses = this.inputs.enemies().filter(enemy => enemy.isBoss && enemy.hp > 0);
        if (bosses.length) {
            this.bossUntil = now + BOSS_HOLD_MS;
            this.bossTrack = this.standingBossTrack(bosses, zone?.type);
        }
        return now < this.bossUntil ? this.bossTrack : this.zoneTrack(zone);
    }

    async bufferFor(context, id) {
        if (this.buffers.has(id)) {
            const buffer = this.buffers.get(id);
            this.buffers.delete(id); this.buffers.set(id, buffer);
            return buffer;
        }
        const response = await this.environment.fetch('assets/audio/bgm/' + this.catalog.tracks[id].file + '?v=20261105-bgm3');
        if (!response.ok) throw Error(`BGM fetch failed: ${response.status} ${id}`);
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        if (this.disposed) return buffer;
        this.buffers.set(id, buffer);
        for (const old of this.buffers.keys()) if (this.buffers.size > CACHE_TRACKS && old !== this.current?.id) this.buffers.delete(old);
        return buffer;
    }

    fadeOutTrack(context) {
        if (!this.current) return;
        const { id, node, gain, startedAt, offset } = this.current;
        this.positions.set(id, trackPosition(this.catalog.tracks[id], offset + context.currentTime - startedAt));
        gain.gain.cancelScheduledValues(context.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
        gain.gain.linearRampToValueAtTime(0, context.currentTime + FADE_SEC);
        node.stop(context.currentTime + FADE_SEC + .05);
        node.onended = () => { node.disconnect(); gain.disconnect(); };
        this.current = null;
    }

    startTrack(context, id, buffer) {
        const track = this.catalog.tracks[id], node = context.createBufferSource(), gain = context.createGain();
        node.buffer = buffer; node.loop = true;
        // Stay two samples inside the decoded buffer: Chromium otherwise repeated the last 128 samples (2026-11-04).
        node.loopStart = track.loopStart; node.loopEnd = Math.min(track.loopEnd, buffer.duration - 2 / buffer.sampleRate);
        const offset = Math.min(this.positions.get(id) || 0, node.loopEnd - .05);
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(1, context.currentTime + FADE_SEC);
        node.connect(gain); gain.connect(this.output);
        node.start(context.currentTime, offset);
        this.current = { id, node, gain, startedAt: context.currentTime, offset };
    }

    async switchTrack(context, id) {
        this.loading = id;
        try {
            const buffer = await this.bufferFor(context, id);
            if (this.disposed || this.loading !== id) return;
            this.fadeOutTrack(context);
            this.startTrack(context, id, buffer);
        } catch (error) { if (!this.disposed) this.failure(id, error); }
        finally { if (this.loading === id) this.loading = null; }
    }

    ensureOutput(context) {
        if (this.output) return;
        this.output = context.createGain();
        this.output.gain.value = 0;
        this.output.connect(context.destination);
    }

    syncLevel(context) {
        const now = this.environment.now(), ducked = now < this.duckUntil;
        const settle = ducked ? .05 : now - this.duckUntil < DUCK_RELEASE_MS ? .4 : .08;
        const level = this.inputs.audible() ? LEVEL * this.inputs.volume() / 100 * (ducked ? DUCK_LEVEL : 1) : 0;
        this.output.gain.setTargetAtTime(level, context.currentTime, settle);
    }

    schedule(callback, ms) {
        const id = this.environment.schedule(() => {
            this.pendingTimers.delete(id);
            if (!this.disposed) callback();
        }, ms);
        this.pendingTimers.add(id);
    }

    duck(ms) {
        if (this.disposed) return;
        this.duckUntil = Math.max(this.duckUntil, this.environment.now() + ms);
        const relevel = () => { const context = this.inputs.context(); if (context && this.output) this.syncLevel(context); };
        relevel();
        this.schedule(relevel, ms + 20);
    }

    tick() {
        if (this.disposed) return;
        const context = this.inputs.context();
        if (!context || context.state !== 'running' || this.inputs.background()) return;
        this.ensureOutput(context);
        this.syncLevel(context);
        if (!this.inputs.enabled()) return void this.fadeOutTrack(context);
        const id = this.wantedTrack(this.environment.now());
        if (id !== this.current?.id && id !== this.loading && this.catalog.tracks[id]) void this.switchTrack(context, id);
    }

    leaveZone() {
        if (this.disposed) return;
        // Movement fires before the old enemy list is cleared. Select the new zone on the next task.
        this.schedule(() => { this.bossUntil = 0; this.tick(); }, 0);
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true; this.loading = null;
        for (const id of this.pendingTimers) this.environment.cancel(id);
        this.pendingTimers.clear();
        if (this.current) {
            const { node, gain } = this.current;
            node.onended = null; node.stop(); node.disconnect(); gain.disconnect();
            this.current = null;
        }
        this.output?.disconnect(); this.output = null;
        this.buffers.clear(); this.positions.clear();
        // The effects service owns the shared AudioContext; never close it here.
    }
}

/** No device, fetch, timer or listener is started by construction. The caller owns tick scheduling. */
export function createBackgroundMusic(catalog, inputs, environment) {
    const music = new BackgroundMusic(catalog, inputs, environment);
    return Object.freeze({
        tick: () => music.tick(), duck: ms => music.duck(ms), leaveZone: () => music.leaveZone(), dispose: () => music.dispose()
    });
}
