/* 배경음(2026-11-04 사용자: 리그닌 BGM). 1초마다 지금 자리(첫 화면, 지역 종류, 보스)에 맞는 곡을 골라(data/bgm.js) 바뀌면
 * 1.4초 동안 겹쳐 넘긴다. 곡은 처음부터 한 번 울린 뒤 loopStart~loopEnd를 이음매 없이 되풀이한다(AudioBufferSourceNode의 loop).
 * 효과음과 같은 AudioContext(js/ui-audio.js, 첫 누름에 열린다)를 쓰되 효과음의 압축기는 거치지 않는다.
 * 보스가 쓰러진 뒤 8초는 보스 곡을 이어 보스마다 곡이 깜빡이지 않게 하고, 돌아온 지역 곡은 멈췄던 자리부터 다시 튼다.
 * 그 자리를 떠나면(이동 시작: 다음 맵, 귀환, 쓰러진 뒤 다시 서기) 8초를 기다리지 않고 곧바로 새 자리의 곡으로 넘긴다(2026-11-05 사용자).
 * 클리어 효과음과 쓰러지는 소리가 나는 동안은 곡을 절반 크기로 낮춘다(같은 날 사용자 "클리어 효과음 재생될 때 음악 약간 소리 작아지는 효과").
 * 푼 곡은 둘까지만 둔다(100초 곡 하나가 약 38MB). 소리는 게임 상태를 바꾸지 않는다. */
(function () {
    'use strict';
    const root = 'assets/audio/bgm/';
    const FADE_SEC = 1.4, BOSS_HOLD_MS = 8000, CACHE_TRACKS = 2, LEVEL = 0.45, DEFAULT_VOLUME = 70;
    /** 낮추는 크기(곡 크기의 몫)와 시간(ms): 클리어 효과음(2.1초), 쓰러지는 소리(1.8초). 다시 올라올 때는 0.4초쯤에 걸쳐 돌아온다. */
    const DUCK_LEVEL = 0.5, DUCK_MS = Object.freeze({ clear: 2200, defeat: 2000 }), DUCK_RELEASE_MS = 1500;
    const buffers = new Map(), positions = new Map(), warned = new Set();
    let output = null, current = null, loading = null, bossUntil = 0, bossTrack = 'boss', duckUntil = 0;

    const volume = () => game.settings.bgmVolume ?? DEFAULT_VOLUME;
    const audible = () => game.settings.bgm !== false && volume() > 0 && !document.hidden;

    function failure(label, error) {
        if (warned.has(label)) return;
        warned.add(label);
        console.warn(`[bgm] ${label}`, error);
    }

    /** 서 있는 보스들의 곡: 엔드게임 보스가 있으면 그 보스의 곡(BGM_BOSS_VISUAL_TRACKS), 없으면 지역 종류의 보스 곡. */
    function standingBossTrack(bosses, type) {
        const own = bosses.map(enemy => BGM_BOSS_VISUAL_TRACKS[enemy.monsterVisualId]).find(Boolean);
        return own || BGM_BOSS_TRACKS[type] || 'boss';
    }
    /** 보스가 없을 때의 곡: 엔드게임 보스만의 자리(아틀라스 투기장은 atlasStages)는 그 보스의 곡, 나머지는 지역 종류의 곡. */
    function zoneTrack(zone) {
        if (!zone) return 'act';
        return BGM_BOSS_VISUAL_TRACKS[zone.atlasStages || zone.bossVisualId] || BGM_ZONE_TRACKS[zone.type] || 'act';
    }
    /** 지금 자리의 곡 이름(BGM_TRACKS 열쇠). 보스가 쓰러진 뒤 8초도 그 보스의 곡이다. */
    function wantedTrack(now) {
        if (isStartupOverlayOpen()) return 'title';
        const zone = getZone(game.currentZoneId);
        const bosses = (game.enemies || []).filter(enemy => enemy.isBoss && enemy.hp > 0);
        if (bosses.length) {
            bossUntil = now + BOSS_HOLD_MS;
            bossTrack = standingBossTrack(bosses, zone?.type);
        }
        return now < bossUntil ? bossTrack : zoneTrack(zone);
    }

    async function bufferFor(context, id) {
        if (buffers.has(id)) {
            const buffer = buffers.get(id);
            buffers.delete(id); buffers.set(id, buffer); // 가장 최근에 쓴 곡을 뒤로
            return buffer;
        }
        // 곡 파일을 바꾸면 올린다: 반복 지점(data/bgm.js)이 바뀐 곡을 브라우저에 남은 옛 파일로 틀지 않게(2026-11-05 일반 보스 곡, 그 뒤 어비스와 아틀라스, 어비스 곡 되돌림)
        const response = await fetch(root + BGM_TRACKS[id].file + '?v=20261105-bgm3');
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
        // 끝 지점은 버퍼 끝보다 2샘플 안쪽: loopEnd가 버퍼 길이와 같거나 넘으면 크롬이 끝에서 되감지 못하고 마지막 128샘플을
        // 되풀이해 344Hz 삐 소리가 났다(2026-11-04 사용자, 크롬 151과 152에서 재현). 2샘플은 이음매에서 들리지 않는다.
        node.loopStart = track.loopStart; node.loopEnd = Math.min(track.loopEnd, buffer.duration - 2 / buffer.sampleRate);
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
        const now = performance.now(), ducked = now < duckUntil, settle = ducked ? 0.05 : now - duckUntil < DUCK_RELEASE_MS ? 0.4 : 0.08;
        output.gain.setTargetAtTime(audible() ? LEVEL * volume() / 100 * (ducked ? DUCK_LEVEL : 1) : 0, context.currentTime, settle);
    }
    /** 효과음이 나는 ms 동안 곡을 낮춘다(끝나면 다시 올린다). */
    function duck(ms) {
        duckUntil = Math.max(duckUntil, performance.now() + ms);
        const relevel = () => { const context = playUiFeedbackSound.context(); if (context && output) syncLevel(context); };
        relevel();
        setTimeout(relevel, ms + 20);
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

    /** 배경음 크기 슬라이더는 설정 창과 로그인 화면에 하나씩 있다([data-bgm-volume], 옆의 output이 값). */
    function syncVolumeControl() {
        document.querySelectorAll('[data-bgm-volume]').forEach(slider => {
            slider.value = volume();
            slider.setAttribute('aria-valuetext', `${volume()}%`);
            const output = slider.parentElement.querySelector('output');
            if (output) output.value = `${volume()}%`;
        });
    }

    document.addEventListener('input', event => {
        if (!event.target.matches?.('[data-bgm-volume]')) return;
        game.settings.bgmVolume = event.target.valueAsNumber;
        syncVolumeControl();
        bgmTick();
    });
    // 로그인 화면에서는 저장하지 않는다(js/ui-audio.js와 같은 규칙)
    document.addEventListener('change', event => {
        if (event.target.matches?.('[data-bgm-volume]') && !startupOverlayActive) saveGame({ skipCloudSync: true });
    });
    document.addEventListener('visibilitychange', bgmTick);
    const live = handler => event => { if (!event.detail?.background) handler(); };
    window.addEventListener('project-idle:encounter-finished', live(() => duck(DUCK_MS.clear)));
    window.addEventListener('project-idle:player-defeated', live(() => duck(DUCK_MS.defeat)));
    // 이동을 시작하는 그 순간에는 아직 적 목록이 남아 있다(js/combat-encounters.js startMoving): 비운 뒤에 고른다
    window.addEventListener('project-idle:movement-started', live(() => setTimeout(() => { bossUntil = 0; bgmTick(); }, 0)));
    window.addEventListener('project-idle:startup-visibility', syncVolumeControl);
    setInterval(bgmTick, 1000);
    // 설정에서 켜면 그 누름으로 소리 장치를 연다(효과음이 꺼져 있으면 아직 열리지 않았다). syncControls는 화면만 맞춘다(누름 없이 불러도 된다)
    safeExposeGlobals({ gameBgm: Object.freeze({ sync: () => { syncVolumeControl(); playUiFeedbackSound.unlock(); bgmTick(); }, syncControls: syncVolumeControl }) });
}());
