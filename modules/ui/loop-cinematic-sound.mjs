// Sound of the loop cinematic, on the game's one audio device (the effects service's AudioContext) and its settings only:
// effects are the sample bank's own kinds (soundVolume, uiSounds), the abyss track forward and then a reversed slice of it follow
// bgm and bgmVolume, and the game's own music is hushed while the cinematic is up.
import { SHOTS } from './loop-cinematic-timeline.mjs';

const BGM_LEVEL = 0.45; // js/bgm-ui.js background music level at 100%
const BGM_QUERY = '?v=20261105-bgm3';

export class LoopCinematicSound {
    constructor(deps) {
        this.deps = deps;
        this.buffer = null;
        this.loading = null;
        this.reversed = null;
        this.reversedKey = '';
        this.output = null;
        this.sources = new Set();
        this.hushed = false;
    }

    context() {
        const context = typeof this.deps.playUiFeedbackSound?.context === 'function' ? this.deps.playUiFeedbackSound.context() : null;
        return context && context.state !== 'closed' ? context : null;
    }

    track() { return this.deps.BGM_TRACKS?.abyss || null; }

    musicLevel() {
        const settings = this.deps.game.settings, volume = settings.bgmVolume ?? 70;
        return settings.bgm !== false && volume > 0 && !this.deps.document.hidden ? BGM_LEVEL * volume / 100 * SHOTS.audio.reverseGain : 0;
    }

    /** Decodes the abyss track once the device exists (a first gesture opened it); nothing waits for it. */
    load() {
        const context = this.context(), track = this.track();
        if (this.buffer || this.loading || !context || !track) return;
        this.loading = this.deps.fetch('assets/audio/bgm/' + track.file + BGM_QUERY)
            .then(response => { if (!response.ok) throw new Error('abyss track ' + response.status); return response.arrayBuffer(); })
            .then(bytes => context.decodeAudioData(bytes))
            .then(buffer => { this.buffer = buffer; })
            .catch(error => this.deps.console.warn('[loop-cinematic] music off', error))
            .finally(() => { this.loading = null; });
    }

    hush(on) {
        if (this.hushed === on) return;
        this.hushed = on;
        this.deps.gameBgm?.hush(on);
    }

    ensureOutput(context) {
        if (!this.output) {
            this.output = context.createGain();
            this.output.connect(context.destination);
        }
        this.output.gain.setValueAtTime(this.musicLevel(), context.currentTime);
        return this.output;
    }

    stopMusic() {
        this.sources.forEach(node => { node.onended = null; node.stop(); node.disconnect(); });
        this.sources.clear();
    }

    play(context, node) {
        node.connect(this.ensureOutput(context));
        node.onended = () => { this.sources.delete(node); node.disconnect(); };
        this.sources.add(node);
        return node;
    }

    startForward(context, t) {
        const track = this.track(), node = context.createBufferSource();
        node.buffer = this.buffer; node.loop = true;
        node.loopStart = track.loopStart; node.loopEnd = Math.min(track.loopEnd, this.buffer.duration - 2 / this.buffer.sampleRate);
        this.play(context, node).start(0, (t / 1000) % node.loopEnd);
    }

    /** The slice that fills the reverse span, flipped, its rate rising 1.0 -> 1.6 (built once per span length). */
    reversedSlice(context, seconds) {
        const key = seconds.toFixed(3);
        if (this.reversedKey === key) return this.reversed;
        const A = SHOTS.audio, src = this.buffer, length = seconds * (A.rateFrom + A.rateTo) / 2;
        const endS = Math.min(src.duration, A.sliceEndSec), startS = Math.max(0, endS - length);
        const a = Math.floor(startS * src.sampleRate), b = Math.floor(endS * src.sampleRate), out = context.createBuffer(src.numberOfChannels, b - a, src.sampleRate);
        for (let ch = 0; ch < src.numberOfChannels; ch++) {
            const from = src.getChannelData(ch), to = out.getChannelData(ch);
            for (let i = 0; i < b - a; i++) to[i] = from[b - 1 - i];
        }
        this.reversed = out; this.reversedKey = key;
        return out;
    }

    startReverse(context, plan, t) {
        const A = SHOTS.audio, D = (plan.revEnd - plan.revStart) / 1000, e = Math.max(0, (t - plan.revStart) / 1000);
        if (e >= D) return;
        const node = context.createBufferSource(), now = context.currentTime;
        node.buffer = this.reversedSlice(context, D);
        node.playbackRate.setValueAtTime(A.rateFrom + (A.rateTo - A.rateFrom) * e / D, now);
        node.playbackRate.linearRampToValueAtTime(A.rateTo, now + (D - e));
        this.play(context, node).start(now, e + (A.rateTo - A.rateFrom) / (2 * D) * e * e);
        node.stop(now + (D - e) + 0.05);
    }

    /** Starts the music that belongs at t (after a jump, a skip or the tab coming back). */
    sync(T, t) {
        this.stopMusic();
        const context = this.context(), plan = T.music;
        if (!plan || !this.buffer || !context || context.state !== 'running' || this.musicLevel() <= 0) return;
        if (t < plan.fwdUntil) this.startForward(context, t);
        else if (t >= plan.revStart && t < plan.revEnd) this.startReverse(context, plan, t);
    }

    duckMusic(context) {
        if (!this.output) return;
        const A = SHOTS.audio, gain = this.output.gain, now = context.currentTime, level = this.musicLevel();
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(level * A.duckGain, now);
        gain.linearRampToValueAtTime(level, now + A.duckMs / 1000);
    }

    effect(kind) {
        this.deps.playUiFeedbackSound(kind);
        const context = this.context();
        if (context) this.duckMusic(context);
    }

    /** Plays what the timeline crosses between prev and cur. */
    crossings(T, prev, cur) {
        const plan = T.music;
        if (plan && prev < plan.fwdUntil && cur >= plan.fwdUntil) this.stopMusic();
        if (plan && prev < plan.revStart && cur >= plan.revStart && cur < plan.revEnd) this.sync(T, cur);
        T.events.forEach(ev => { if (prev < ev.at && cur >= ev.at) this.effect(ev.sfx); });
    }

    dispose() {
        this.stopMusic();
        this.output?.disconnect();
        this.output = null;
        this.reversed = null;
        this.reversedKey = '';
        this.hush(false);
    }
}
