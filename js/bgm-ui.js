/* 배경음(2026-11-04 사용자: 리그닌 BGM). 1초마다 지금 자리(첫 화면, 지역 종류, 보스)에 맞는 곡을 골라(data/bgm.js) 바뀌면
 * 1.4초 동안 겹쳐 넘긴다. 곡은 처음부터 한 번 울린 뒤 loopStart~loopEnd를 이음매 없이 되풀이한다(AudioBufferSourceNode의 loop).
 * 효과음과 같은 AudioContext(js/ui-audio.js, 첫 누름에 열린다)를 쓰되 효과음의 압축기는 거치지 않는다.
 * 보스가 쓰러진 뒤 8초는 보스 곡을 이어 보스마다 곡이 깜빡이지 않게 하고, 돌아온 지역 곡은 멈췄던 자리부터 다시 튼다.
 * 푼 곡은 둘까지만 둔다(100초 곡 하나가 약 38MB). 소리는 게임 상태를 바꾸지 않는다. */
(function () {
    'use strict';
    const root = 'assets/audio/bgm/';
    const FADE_SEC = 1.4, BOSS_HOLD_MS = 8000, CACHE_TRACKS = 2, LEVEL = 0.45, DEFAULT_VOLUME = 70;
    const buffers = new Map(), positions = new Map(), warned = new Set();
    let output = null, current = null, loading = null, bossUntil = 0;

    const volume = () => game.settings.bgmVolume ?? DEFAULT_VOLUME;
    const audible = () => game.settings.bgm !== false && volume() > 0 && !document.hidden;

    function failure(label, error) {
        if (warned.has(label)) return;
        warned.add(label);
        console.warn(`[bgm] ${label}`, error);
    }

    /** 지금 자리의 곡 이름(BGM_TRACKS 열쇠). */
    function wantedTrack(now) {
        if (isStartupOverlayOpen()) return 'title';
        const type = getZone(game.currentZoneId)?.type;
        if ((game.enemies || []).some(enemy => enemy.isBoss && enemy.hp > 0)) bossUntil = now + BOSS_HOLD_MS;
        if (now < bossUntil) return BGM_BOSS_TRACKS[type] || 'boss';
        return BGM_ZONE_TRACKS[type] || 'act';
    }

    async function bufferFor(context, id) {
        if (buffers.has(id)) {
            const buffer = buffers.get(id);
            buffers.delete(id); buffers.set(id, buffer); // 가장 최근에 쓴 곡을 뒤로
            return buffer;
        }
        const response = await fetch(root + BGM_TRACKS[id].file + '?v=20261104-bgm');
        if (!response.ok) throw Error(`BGM fetch failed: ${response.status} ${id}`);
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        buffers.set(id, buffer);
        for (const old of buffers.keys()) if (buffers.size > CACHE_TRACKS && old !== current?.id) buffers.delete(old);
        return buffer;
    }

    /** 곡이 흐른 시간을 그 곡 안의 자리로: 처음 한 번은 그대로, 그 뒤는 되풀이 구간 안에서. */
    function trackPosition(track, elapsed) {
        if (elapsed < track.loopEnd) return elapsed;
        const span = track.loopEnd - track.loopStart;
        return track.loopStart + ((elapsed - track.loopStart) % span);
    }

    function fadeOutTrack(context) {
        if (!current) return;
        const { id, node, gain, startedAt, offset } = current;
        positions.set(id, trackPosition(BGM_TRACKS[id], offset + context.currentTime - startedAt));
        gain.gain.cancelScheduledValues(context.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
        gain.gain.linearRampToValueAtTime(0, context.currentTime + FADE_SEC);
        node.stop(context.currentTime + FADE_SEC + 0.05);
        node.onended = () => { node.disconnect(); gain.disconnect(); };
        current = null;
    }

    function startTrack(context, id, buffer) {
        const track = BGM_TRACKS[id], node = context.createBufferSource(), gain = context.createGain();
        node.buffer = buffer; node.loop = true;
        node.loopStart = track.loopStart; node.loopEnd = Math.min(track.loopEnd, buffer.duration);
        const offset = Math.min(positions.get(id) || 0, node.loopEnd - 0.05);
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(1, context.currentTime + FADE_SEC);
        node.connect(gain); gain.connect(output);
        node.start(context.currentTime, offset);
        current = { id, node, gain, startedAt: context.currentTime, offset };
    }

    async function switchTrack(context, id) {
        loading = id;
        try {
            const buffer = await bufferFor(context, id);
            if (loading !== id) return;
            fadeOutTrack(context);
            startTrack(context, id, buffer);
        } catch (error) { failure(id, error); }
        finally { if (loading === id) loading = null; }
    }

    function ensureOutput(context) {
        if (output) return;
        output = context.createGain();
        output.gain.value = 0;
        output.connect(context.destination);
    }

    function syncLevel(context) {
        output.gain.setTargetAtTime(audible() ? LEVEL * volume() / 100 : 0, context.currentTime, 0.08);
    }

    function bgmTick() {
        const context = playUiFeedbackSound.context();
        if (!context || context.state !== 'running' || game.isBackgroundCalculation) return;
        ensureOutput(context);
        syncLevel(context);
        if (game.settings.bgm === false) return void fadeOutTrack(context);
        const id = wantedTrack(performance.now());
        if (id !== current?.id && id !== loading && BGM_TRACKS[id]) void switchTrack(context, id);
    }

    function syncVolumeControl() {
        const slider = document.getElementById('range-bgm-volume');
        if (!slider) return;
        slider.value = volume();
        slider.setAttribute('aria-valuetext', `${volume()}%`);
        document.getElementById('bgm-volume-value').value = `${volume()}%`;
    }

    document.addEventListener('input', event => {
        if (event.target.id !== 'range-bgm-volume') return;
        game.settings.bgmVolume = event.target.valueAsNumber;
        syncVolumeControl();
        bgmTick();
    });
    document.addEventListener('change', event => {
        if (event.target.id === 'range-bgm-volume') saveGame({ skipCloudSync: true });
    });
    document.addEventListener('visibilitychange', bgmTick);
    window.addEventListener('project-idle:startup-visibility', syncVolumeControl);
    setInterval(bgmTick, 1000);
    // 설정에서 켜면 그 누름으로 소리 장치를 연다(효과음이 꺼져 있으면 아직 열리지 않았다)
    safeExposeGlobals({ gameBgm: Object.freeze({ sync: () => { syncVolumeControl(); playUiFeedbackSound.unlock(); bgmTick(); } }) });
}());
