// Presentation audio engine. Browser device/network/clock and current settings are explicit boundaries.
// Constructing it never opens a device or starts a download. Gameplay randomness is never consumed.
class FeedbackAudio {
    constructor(environment, inputs) {
        this.environment = environment;
        this.inputs = inputs;
        this.root = 'assets/audio/game-sfx-v2/';
        this.uiKinds = {open:'uiSelect', confirm:'uiConfirm', cancel:'uiCancel', danger:'uiDanger', success:'uiSuccess'};
        this.context = null;
        this.master = null;
        this.muffle = null;
        this.compressor = null;
        this.disposed = false;
        this.bank = null;
        this.loading = false;
        this.buffers = new Map();
        this.active = new Set();
        this.lastPlayed = new Map();
        this.warnings = new Set();
        this.variations = new Map();
        this.variationSeed = 0x6d2b79f5;
    }

    updateMasterGain() {
        if (!this.master) return;
        this.master.gain.cancelScheduledValues(this.context.currentTime);
        this.master.gain.setTargetAtTime(this.inputs.permitted() ? this.inputs.masterLevel() : 0, this.context.currentTime, .015);
    }

    failure(label, error) {
        if (this.warnings.has(label)) return;
        this.warnings.add(label);
        this.environment.console.warn(`[ui-audio] ${label}`, error);
    }

    async fetchFile(path) {
        const response = await this.environment.fetch(path + '?v=20261110-bell-wave'); // 묶음(bank.json)이나 소리 파일이 바뀌면 올린다
        if (!response.ok) throw Error(`Audio fetch failed: ${response.status} ${path}`);
        return response;
    }

    async loadBank() {
        if (this.loading) return;
        this.loading = true;
        try {
            const bank = await (await this.fetchFile(this.root + 'bank.json')).json();
            if (this.disposed) return;
            this.bank = bank;
            const files = [...new Set(Object.values(this.bank).flatMap(row => row.files))];
            await Promise.all(files.map(async file => {
                try {
                    const bytes = await (await this.fetchFile(this.root + file)).arrayBuffer();
                    if (this.disposed) return;
                    const buffer = await this.context.decodeAudioData(bytes);
                    if (!this.disposed) this.buffers.set(file, buffer);
                } catch (error) { this.failure(file, error); }
            }));
        } catch (error) { this.failure('sample bank unavailable', error); }
    }

    unlock() {
        if (this.disposed) return;
        if (!this.inputs.permitted() && !this.inputs.bgmWanted()) return;
        const AudioCtx = this.environment.audioConstructor();
        if (!AudioCtx || !this.inputs.gestureSeen()) return;
        try {
            if (!this.context) {
                this.context = new AudioCtx();
                this.master = this.context.createGain(); this.master.gain.value = this.inputs.masterLevel();
                const compressor = this.compressor = this.context.createDynamicsCompressor();
                compressor.threshold.value = -16; compressor.knee.value = 12;
                compressor.ratio.value = 4; compressor.attack.value = .003; compressor.release.value = .12;
                // 심해의 먹먹한 소리(updateMuffle): 평소에는 거의 열려 있는 저역 통과 거름
                this.muffle = this.context.createBiquadFilter(); this.muffle.type = 'lowpass'; this.muffle.frequency.value = 20000;
                this.master.connect(this.muffle); this.muffle.connect(compressor); compressor.connect(this.context.destination);
                void this.loadBank();
            }
            this.updateMasterGain();
            if (this.context.state === 'suspended') this.context.resume().catch(error => this.failure('resume failed', error));
        } catch (error) { this.failure('audio unavailable', error); }
    }

    release(voice) {
        if (!this.active.delete(voice)) return;
        voice.node.disconnect(); voice.gain.disconnect();
    }

    stop(voice) {
        voice.node.stop(); this.release(voice);
    }

    silence() {
        [...this.active].forEach(voice => this.stop(voice));
    }

    makeRoom(priority) {
        if (priority === 0 && [...this.active].filter(voice => voice.priority === 0).length >= 4) return false;
        if (this.active.size < 8) return true;
        const victim = [...this.active].find(voice => voice.priority < priority);
        if (!victim) return false;
        this.stop(victim); return true;
    }

    throttled(spec) {
        const now = this.environment.performance.now(), previous = this.lastPlayed.get(spec.group) ?? -Infinity;
        if (now - previous < spec.cooldown) return true;
        return false;
    }

    updateMuffle() {
        if (!this.muffle) return;
        const cutoff = this.inputs.muffleCutoff();
        if (Math.abs(this.muffle.frequency.value - cutoff) > 1) this.muffle.frequency.setTargetAtTime(cutoff, this.context.currentTime, .08);
    }

    attach(node, gain, priority) {
        this.updateMuffle();
        const voice = {node, gain, priority};
        node.connect(gain); gain.connect(this.master);
        node.onended = () => this.release(voice);
        this.active.add(voice);
        return voice;
    }

    shuffled(files, previous) {
        const remaining = files.slice();
        for (let i = remaining.length - 1; i > 0; i--) {
            this.variationSeed ^= this.variationSeed << 13;
            this.variationSeed ^= this.variationSeed >>> 17;
            this.variationSeed ^= this.variationSeed << 5;
            const j = (this.variationSeed >>> 0) % (i + 1);
            [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        if (remaining.length > 1 && remaining[0] === previous) {
            [remaining[0], remaining[1]] = [remaining[1], remaining[0]];
        }
        return remaining;
    }

    sampleChoice(spec) {
        const files = spec.files.filter(file => this.buffers.has(file));
        if (!files.length) return null;
        const key = spec.files.join('|'); // Normal/critical hits share the same bag.
        let deck = this.variations.get(key);
        if (!deck?.remaining.length) {
            deck = {remaining: this.shuffled(files, deck?.last), last: deck?.last};
            this.variations.set(key, deck);
        }
        return {file: deck.remaining[0], deck};
    }

    playSample(spec) {
        if (this.throttled(spec)) return;
        const choice = this.sampleChoice(spec);
        if (!choice || !this.makeRoom(spec.priority)) return;
        const node = this.context.createBufferSource(), gain = this.context.createGain();
        // sampleRates, sampleGains: 같은 묶음 안에서 한 파일만 높낮이나 크기를 바꿀 때(2026-11-05 사용자: 항아리 깨는 소리 하나만 톤을 낮게)
        node.buffer = this.buffers.get(choice.file); node.playbackRate.value = spec.rate * (spec.sampleRates?.[choice.file] ?? 1);
        gain.gain.value = spec.gain * (spec.sampleGains?.[choice.file] ?? 1);
        const voice = this.attach(node, gain, spec.priority);
        try {
            node.start(); this.lastPlayed.set(spec.group, this.environment.performance.now());
            choice.deck.last = choice.deck.remaining.shift();
        }
        catch (error) { this.release(voice); throw error; }
    }

    readyToPlay() {
        return !this.disposed && this.inputs.permitted() && this.context?.state === 'running';
    }

    playUiFeedbackSound(kind) {
        if (!this.readyToPlay()) return;
        try {
            const spec = this.bank?.[this.uiKinds[kind] || kind];
            if (!spec || spec.enabled === false) return;
            this.playSample(spec);
        } catch (error) { this.failure(`play ${kind}`, error); }
    }

    async dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.silence();
        this.master?.disconnect(); this.muffle?.disconnect(); this.compressor?.disconnect();
        this.master = null; this.muffle = null; this.compressor = null;
        this.buffers.clear(); this.variations.clear(); this.lastPlayed.clear(); this.bank = null;
        const context = this.context; this.context = null;
        try { if (context && context.state !== 'closed') await context.close(); }
        catch (error) { this.failure('close failed', error); }
    }
}

export function createFeedbackAudio(environment, inputs) {
    const core = new FeedbackAudio(environment, inputs);
    return Object.freeze({
        play: core.playUiFeedbackSound.bind(core), ready: core.readyToPlay.bind(core),
        context: () => core.context, unlock: core.unlock.bind(core),
        dispose: core.dispose.bind(core),
        syncSettings() {
            if (!inputs.permitted()) { core.updateMasterGain(); core.silence(); }
            else if (core.context) core.unlock();
        },
        visibilityChanged() { core.updateMasterGain(); if (inputs.hidden()) core.silence(); },
        playInventory(kind, phase) {
            const spec = core.bank?.[kind];
            if (!spec || spec.enabled === false) return;
            try { core.playSample({ ...spec, group: 'inventory:' + phase }); }
            catch (error) { core.failure('inventory ' + kind, error); }
        }
    });
}
