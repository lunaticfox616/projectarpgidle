/* Presentation audio only. Unlock on a gesture; decode each local sample once.
 * No delayed sound queue, gameplay clock changes or gameplay random draws. */
(function () {
    'use strict';
    const root = 'assets/audio/game-sfx-v2/';
    const tones = {open:[340,.018,.055], confirm:[520,.024,.07], cancel:[220,.018,.055],
        danger:[145,.028,.09], success:[660,.022,.08]};
    let context = null, master = null, bank = null, loading = false, resuming = false;
    const buffers = new Map(), active = new Set(), lastPlayed = new Map(), warnings = new Set();
    const variations = new Map();
    let variationSeed = 0x6d2b79f5;

    function permitted() {
        return typeof game !== 'undefined' && game.settings?.uiSounds !== false &&
            !document.hidden && !game.isBackgroundCalculation;
    }

    function failure(label, error) {
        if (warnings.has(label)) return;
        warnings.add(label);
        console.warn(`[ui-audio] ${label}`, error);
    }

    async function fetchFile(path) {
        const response = await fetch(path + '?v=20261006-rare-silent');
        if (!response.ok) throw Error(`Audio fetch failed: ${response.status} ${path}`);
        return response;
    }

    async function loadBank() {
        if (loading) return;
        loading = true;
        try {
            bank = await (await fetchFile(root + 'bank.json')).json();
            const files = [...new Set(Object.values(bank).flatMap(row => row.files))];
            await Promise.all(files.map(async file => {
                try {
                    const bytes = await (await fetchFile(root + file)).arrayBuffer();
                    buffers.set(file, await context.decodeAudioData(bytes));
                } catch (error) { failure(file, error); }
            }));
        } catch (error) { failure('sample bank unavailable', error); }
    }

    function unlock() {
        if (!permitted()) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        try {
            if (!context) {
                context = new AudioCtx();
                master = context.createGain(); master.gain.value = .55;
                const compressor = context.createDynamicsCompressor();
                compressor.threshold.value = -16; compressor.knee.value = 12;
                compressor.ratio.value = 4; compressor.attack.value = .003; compressor.release.value = .12;
                master.connect(compressor); compressor.connect(context.destination);
                void loadBank();
            }
            master.gain.value = .55;
            if (context.state !== 'suspended' || resuming) return;
            resuming = true;
            context.resume().catch(error => failure('resume failed', error)).finally(() => { resuming = false; });
        } catch (error) { failure('audio unavailable', error); }
    }

    function release(voice) {
        if (!active.delete(voice)) return;
        voice.node.disconnect(); voice.gain.disconnect();
    }

    function stop(voice) {
        voice.node.stop(); release(voice);
    }

    function silence() {
        [...active].forEach(stop);
    }

    function makeRoom(priority) {
        if (priority === 0 && [...active].filter(voice => voice.priority === 0).length >= 4) return false;
        if (active.size < 8) return true;
        const victim = [...active].find(voice => voice.priority < priority);
        if (!victim) return false;
        stop(victim); return true;
    }

    function throttled(spec) {
        const now = performance.now(), previous = lastPlayed.get(spec.group) ?? -Infinity;
        if (now - previous < spec.cooldown) return true;
        return false;
    }

    function attach(node, gain, priority) {
        const voice = {node, gain, priority};
        node.connect(gain); gain.connect(master);
        node.onended = () => release(voice);
        active.add(voice);
        return voice;
    }

    // Presentation-only shuffle: never consumes the game's random stream.
    function shuffled(files, previous) {
        const remaining = files.slice();
        for (let i = remaining.length - 1; i > 0; i--) {
            variationSeed ^= variationSeed << 13;
            variationSeed ^= variationSeed >>> 17;
            variationSeed ^= variationSeed << 5;
            const j = (variationSeed >>> 0) % (i + 1);
            [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        if (remaining.length > 1 && remaining[0] === previous) {
            [remaining[0], remaining[1]] = [remaining[1], remaining[0]];
        }
        return remaining;
    }

    function sampleChoice(spec) {
        const files = spec.files.filter(file => buffers.has(file));
        if (!files.length) return null;
        const key = spec.files.join('|'); // Normal/critical hits share the same bag.
        let deck = variations.get(key);
        if (!deck?.remaining.length) {
            deck = {remaining: shuffled(files, deck?.last), last: deck?.last};
            variations.set(key, deck);
        }
        return {file: deck.remaining[0], deck};
    }

    function playSample(spec) {
        if (throttled(spec)) return;
        const choice = sampleChoice(spec);
        if (!choice || !makeRoom(spec.priority)) return;
        const node = context.createBufferSource(), gain = context.createGain();
        node.buffer = buffers.get(choice.file); node.playbackRate.value = spec.rate;
        gain.gain.value = spec.gain * (spec.sampleGains?.[choice.file] ?? 1);
        const voice = attach(node, gain, spec.priority);
        try {
            node.start(); lastPlayed.set(spec.group, performance.now());
            choice.deck.last = choice.deck.remaining.shift();
        }
        catch (error) { release(voice); throw error; }
    }

    function playTone(kind) {
        const spec = tones[kind];
        if (throttled({group:'ui',cooldown:60}) || !makeRoom(1)) return;
        const node = context.createOscillator(), gain = context.createGain();
        const now = context.currentTime, end = now + spec[2];
        node.type = kind === 'danger' ? 'triangle' : 'sine';
        node.frequency.setValueAtTime(spec[0], now);
        gain.gain.setValueAtTime(.0001, now);
        gain.gain.linearRampToValueAtTime(spec[1], now + .004);
        gain.gain.exponentialRampToValueAtTime(.0001, end);
        const voice = attach(node, gain, 1);
        try { node.start(now); node.stop(end); lastPlayed.set('ui', performance.now()); }
        catch (error) { release(voice); throw error; }
    }

    function playUiFeedbackSound(kind) {
        if (!permitted() || !context || context.state !== 'running') return;
        try {
            if (tones[kind]) playTone(kind);
            else if (bank?.[kind]) playSample(bank[kind]);
        } catch (error) { failure(`play ${kind}`, error); }
    }

    function playLootDropSound(major) {
        if (major) playUiFeedbackSound('lootMajor');
    }

    // Settings UI owns the saved flag; audio only mirrors it and stops ongoing voices.
    playUiFeedbackSound.syncSettings = () => {
        if (master) master.gain.value = permitted() ? .55 : 0;
        if (!permitted()) silence();
        else unlock();
    };
    document.addEventListener('pointerdown', unlock, {passive:true});
    document.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => {
        if (master) master.gain.value = permitted() ? .55 : 0;
        if (document.hidden) silence();
    });
    safeExposeGlobals({playUiFeedbackSound, playLootDropSound});
}());
