// 한 브라우저에서 게임을 두 탭으로 열면 두 탭이 같은 기기 저장을 번갈아 덮어써, 한 탭에서 얻은 진행이 사라졌다(2026-10-21 실험:
// 뒤 탭에서 얻은 장비가 앞 탭의 저장에 지워졌다). 마지막에 연 탭이 게임을 이어 받는다: 앞 탭은 지금까지를 저장하고, 그 뒤로는 쓰지 않으며,
// 다시 불러와 대기 화면(index.html #startup-standby)이 된다. 대기 화면의 버튼은 반대로 그 탭이 이어 받게 한다.
// 게임을 돌리는 탭은 Web Locks의 PLAY_LOCK을 쥐고, 넘겨 달라는 말은 BroadcastChannel로 보낸다. 둘 중 하나라도 없는 브라우저는 예전처럼 막지 않는다.
// js/main.js bootWhenStageArtKnown이 ready()를 기다려 부팅한다(쥐고 있던 탭이 저장을 마친 뒤에 이 탭이 저장을 읽는다).
const gameTabGuard = (() => {
    'use strict';
    const PLAY_LOCK = 'rignin-game-play';
    const CHANNEL_NAME = 'rignin-game-tabs';
    const STANDBY_KEY = 'rignin-game-standby';
    // 앞 탭이 저장하고 놓아 주기를 기다리는 시간. 브라우저가 얼려 둔 탭은 답하지 못하므로 그 뒤에는 빼앗는다.
    // 이보다 늦게 받은 부탁에는 저장하지 않는다(이미 빼앗아 간 탭의 진행을 덮게 된다).
    const HANDOVER_WAIT_MS = 4000;
    let readyPromise = null;
    let releaseLock = null;

    function supported() {
        return typeof navigator === 'object' && !!navigator.locks && typeof BroadcastChannel === 'function';
    }

    /** This tab's standby mark, or null when the page cannot use sessionStorage: such a page saves nothing either, so the guard stays off
     * (two such tabs would otherwise take the game from each other on every reload). */
    function readStandby() {
        try { return sessionStorage.getItem(STANDBY_KEY) === '1'; } catch (error) { console.warn('game tab guard off: no sessionStorage', error); return null; }
    }

    function writeStandby(on) {
        try {
            if (on) sessionStorage.setItem(STANDBY_KEY, '1');
            else sessionStorage.removeItem(STANDBY_KEY);
        } catch (error) { console.warn('game tab guard: the standby mark was not kept', error); }
    }

    // The page holds a default game before it loads the save (js/passives.js), so a standby page must never write either.
    function blockWrites() {
        setLocalSaveRuntimeState('standby', { writable: false, message: '다른 탭에서 게임을 이어 하고 있어 이 탭은 저장하지 않습니다.' });
    }

    /** This tab stops: its progress so far is saved when it was asked in time, nothing is written after that, and it reloads into standby. */
    function standBy(saveFirst) {
        if (saveFirst && gameplayStarted && canPersistLocalSave()) saveGame({ skipCloudSync: true });
        blockWrites(); // also stops the page-exit save and cloud push (js/main.js pagehide, pushCloudSaveOnPageExit)
        writeStandby(true);
        if (releaseLock) releaseLock();
        releaseLock = null;
        location.reload();
    }

    /** Resolves true once this tab holds the play lock (kept until it stands by), false when not granted or the wait ran out. */
    function requestLock(options) {
        return new Promise(resolve => {
            let held = false;
            navigator.locks.request(PLAY_LOCK, options, lock => {
                if (!lock) { resolve(false); return null; }
                held = true;
                resolve(true);
                return new Promise(done => { releaseLock = done; });
            }).catch(error => {
                if (held) standBy(false); // a newer tab took the game by force: it has already read the save
                else {
                    if (error.name !== 'AbortError') console.warn('game tab guard: lock request failed', error);
                    resolve(false);
                }
            });
        });
    }

    function listenForHandOver(channel) {
        channel.addEventListener('message', event => {
            const ask = event.data;
            if (!releaseLock || !ask || ask.type !== 'hand-over') return;
            standBy(Date.now() - Number(ask.at) < HANDOVER_WAIT_MS - 500);
        });
    }

    async function takeGame() {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        listenForHandOver(channel);
        if (await requestLock({ ifAvailable: true })) return;
        channel.postMessage({ type: 'hand-over', at: Date.now() });
        const wait = new AbortController();
        const timer = setTimeout(() => wait.abort(), HANDOVER_WAIT_MS);
        const granted = await requestLock({ signal: wait.signal });
        clearTimeout(timer);
        if (!granted) await requestLock({ steal: true });
    }

    function showStandby() {
        blockWrites();
        const overlay = document.getElementById('startup-overlay');
        const panel = document.getElementById('startup-standby');
        if (!overlay || !panel) return;
        overlay.classList.add('standby');
        panel.hidden = false;
        const resume = document.getElementById('btn-startup-standby');
        resume.addEventListener('click', () => { writeStandby(false); location.reload(); });
        resume.focus();
    }

    /** Resolves when this tab may load the save and run the game; a tab in standby never resolves. Never rejects: on any failure the tab
     * boots as before. */
    function untilTabMayBoot() {
        if (readyPromise) return readyPromise;
        const standby = readStandby();
        if (standby) {
            showStandby();
            readyPromise = new Promise(() => {});
        } else readyPromise = standby === false && supported() ? takeGame().catch(error => console.warn('game tab guard skipped:', error)) : Promise.resolve();
        return readyPromise;
    }

    return Object.freeze({ ready: untilTabMayBoot });
})();
