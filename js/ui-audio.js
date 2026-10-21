/* Presentation audio only. Unlock on a gesture; decode each local sample once.
 * No delayed sound queue, gameplay clock changes or gameplay random draws. */
(function () {
    'use strict';
    const root = 'assets/audio/game-sfx-v2/';
    const tones = {open:[340,.018,.055], confirm:[520,.024,.07], cancel:[220,.018,.055],
        danger:[145,.028,.09], success:[660,.022,.08]};
    let context = null, master = null, muffle = null, bank = null, loading = false, resuming = false;
    const buffers = new Map(), active = new Set(), lastPlayed = new Map(), warnings = new Set();
    const variations = new Map();
    let variationSeed = 0x6d2b79f5;

    function permitted() {
        return typeof game !== 'undefined' && game.settings?.uiSounds !== false &&
            game.settings?.soundVolume !== 0 && !document.hidden && !game.isBackgroundCalculation;
    }

    function masterLevel() {
        return .55 * (game.settings.soundVolume ?? 100) / 100;
    }

    function updateMasterGain() {
        if (!master) return;
        master.gain.cancelScheduledValues(context.currentTime);
        master.gain.setTargetAtTime(permitted() ? masterLevel() : 0, context.currentTime, .015);
    }

    function syncVolumeControl() {
        const slider = document.getElementById('range-sound-volume');
        if (!slider) return;
        const volume = game.settings.soundVolume ?? 100;
        slider.value = volume;
        slider.setAttribute('aria-valuetext', `${volume}%`);
        document.getElementById('sound-volume-value').value = `${volume}%`;
        document.getElementById('btn-sound-preview').disabled = !permitted();
    }

    function failure(label, error) {
        if (warnings.has(label)) return;
        warnings.add(label);
        console.warn(`[ui-audio] ${label}`, error);
    }

    async function fetchFile(path) {
        const response = await fetch(path + '?v=20261006-boss-stage');
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
                master = context.createGain(); master.gain.value = masterLevel();
                const compressor = context.createDynamicsCompressor();
                compressor.threshold.value = -16; compressor.knee.value = 12;
                compressor.ratio.value = 4; compressor.attack.value = .003; compressor.release.value = .12;
                // 심해의 먹먹한 소리(updateMuffle): 평소에는 거의 열려 있는 저역 통과 거름
                muffle = context.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = 20000;
                master.connect(muffle); muffle.connect(compressor); compressor.connect(context.destination);
                void loadBank();
            }
            updateMasterGain();
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

    /** 심해에 있는 동안은 낮은 소리만 남는다(2026-10-19 심해 요청문 "먹먹한 소리"): 깊을수록 더 걸러 낸다(1700Hz에서 650Hz까지). */
    function updateMuffle() {
        if (!muffle) return;
        const ocean = typeof OCEAN_ZONE_ID !== 'undefined' && game.currentZoneId === OCEAN_ZONE_ID;
        const cutoff = ocean ? Math.max(650, 1700 - Math.max(0, Number(game.ocean && game.ocean.depthM) || 0) * 1.1) : 20000;
        if (Math.abs(muffle.frequency.value - cutoff) > 1) muffle.frequency.setTargetAtTime(cutoff, context.currentTime, .08);
    }

    function attach(node, gain, priority) {
        updateMuffle();
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

    // Mute preserves the chosen level; a zero level also stops all ongoing voices. Settings sync runs at boot too, before any gesture:
    // it only wakes an existing context, and the first pointerdown or keydown creates one (Chrome warned about a context made earlier).
    playUiFeedbackSound.syncSettings = () => {
        if (!permitted()) { updateMasterGain(); silence(); }
        else if (context) unlock();
        syncVolumeControl();
    };
    document.addEventListener('input', event => {
        if (event.target.id !== 'range-sound-volume') return;
        game.settings.soundVolume = event.target.valueAsNumber;
        playUiFeedbackSound.syncSettings();
    });
    document.addEventListener('change', event => {
        if (event.target.id === 'range-sound-volume') saveGame({ skipCloudSync: true });
    });
    document.addEventListener('click', event => {
        if (event.target.id === 'btn-sound-preview') playUiFeedbackSound('confirm');
    });
    window.addEventListener('project-idle:startup-visibility', syncVolumeControl);
    document.addEventListener('pointerdown', unlock, {passive:true});
    document.addEventListener('keydown', unlock);
    window.addEventListener('project-idle:encounter-finished', event => {
        if (!event.detail?.background) playUiFeedbackSound('stageClear');
    });
    document.addEventListener('visibilitychange', () => {
        updateMasterGain();
        if (document.hidden) silence();
    });
    safeExposeGlobals({playUiFeedbackSound, playLootDropSound});
}());
