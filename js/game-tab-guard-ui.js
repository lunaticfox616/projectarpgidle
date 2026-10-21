// 한 브라우저에서 게임을 두 탭으로 열면 두 탭이 같은 기기 저장을 번갈아 덮어써, 한 탭에서 얻은 진행이 사라졌다(2026-10-21 실험:
// 뒤 탭에서 얻은 장비가 앞 탭의 저장에 지워졌다). 마지막에 연 탭이 게임을 이어 받는다: 앞 탭은 지금까지를 저장하고, 그 뒤로는 쓰지 않으며,
// 다시 불러와 대기 화면(index.html #startup-standby)이 된다. 대기 화면의 버튼은 반대로 그 탭이 이어 받게 한다.
// 탭끼리는 localStorage로 말한다(다른 탭의 storage 이벤트). 같은 저장소의 바뀜은 쓴 차례대로 닿으므로, 새 탭이 "넘겼다"(HANDOVER_KEY)를 받을
// 때는 앞 탭이 그 전에 쓴 저장도 이미 와 있다(BroadcastChannel로 답하면 답이 저장보다 먼저 닿아 저장 전 값을 읽은 적이 있다).
// 게임을 돌리는 탭은 열려 있다는 표시(OPEN_KEY, 탭 id와 시각)를 OPEN_BEAT_MS마다 새로 쓰고 떠날 때 지운다. 새로운 표시가 있으면 새 탭은
// 인사(HELLO_KEY)하고 HELLO_WAIT_MS까지 "넘겼다"를 기다린다. 표시가 없거나 OPEN_FRESH_MS보다 오래됐으면(지우지 못하고 꺼진 앱, 오래 숨은 탭)
// 인사만 하고 바로 부팅한다(혼자 여는 게임의 부팅을 늦추지 않는다). 둘이 함께 인사하면 나중에 연 탭이 이어 받는다. 잠금(Web Locks)은 쓰지
// 않는다: 잠금을 쥔 페이지는 새 서비스 워커로 바뀌거나 오프라인에서 새로고침할 때 멈추곤 했다(tests/browser/service-worker.spec.js).
// js/main.js bootWhenStageArtKnown이 ready()를 기다려 부팅한다. sessionStorage가 없는 페이지는 예전처럼 막지 않는다.
const gameTabGuard = (() => {
    'use strict';
    const STANDBY_KEY = 'rignin-game-standby';   // sessionStorage: 이 탭은 다른 탭에 넘겼다
    const OPEN_KEY = 'rignin-game-open';
    const HELLO_KEY = 'rignin-game-hello';
    const HANDOVER_KEY = 'rignin-game-handover';
    // 열린 탭이 있을 때 새 탭이 기다리는 시간. 그 탭은 보통 몇 밀리초 안에 저장하고 넘긴다. 넘기지 않으면(얼었거나 오래 바쁜 탭) 그대로 부팅한다.
    const HELLO_WAIT_MS = 1500;
    // 이보다 늦게 받은 인사에는 저장하지 않는다: 새 탭이 기다림을 끝내고 이미 저장을 읽었을 수 있다(그 뒤의 저장은 새 탭의 진행과 엇갈린다).
    const SAVE_WINDOW_MS = HELLO_WAIT_MS - 300;
    const OPEN_BEAT_MS = 5000;
    const OPEN_FRESH_MS = 12000;
    const self = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, at: 0 };
    let readyPromise = null;
    let boot = null;
    let yielded = false;
    let beat = null;

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

    function readKey(key) {
        try { return localStorage.getItem(key); } catch (error) { console.warn(`game tab guard: ${key} was not read`, error); return null; }
    }
    function writeKey(key, value) {
        try {
            if (value === null) localStorage.removeItem(key);
            else localStorage.setItem(key, value);
        } catch (error) { console.warn(`game tab guard: ${key} was not kept`, error); }
    }

    /** The open mark ('<tab id> <time>') of the tab that runs the game, or null. */
    function openMark() {
        const [id, at] = String(readKey(OPEN_KEY) || '').split(' ');
        return id ? { id, at: Number(at) || 0 } : null;
    }
    /** While this tab runs the game its mark stays fresh; leaving or standing by removes it (only its own: a newer tab may have written one). */
    function markOpen(on) {
        clearInterval(beat);
        beat = null;
        if (on) {
            const write = () => writeKey(OPEN_KEY, `${self.id} ${Date.now()}`);
            write();
            beat = setInterval(write, OPEN_BEAT_MS);
        } else if (openMark()?.id === self.id) writeKey(OPEN_KEY, null);
    }
    function anotherTabOpen() {
        const mark = openMark();
        return !!mark && mark.id !== self.id && Date.now() - mark.at < OPEN_FRESH_MS;
    }

    // The page holds a default game before it loads the save (js/passives.js), so a standby page must never write either.
    function blockWrites() {
        setLocalSaveRuntimeState('standby', { writable: false, message: '다른 탭에서 게임을 이어 하고 있어 이 탭은 저장하지 않습니다.' });
    }

    /** A newer tab said hello: this tab saves (when that tab waits and the hello came in time), writes nothing after that, says it handed
     * over (after the save, so the save reaches that tab first) and reloads into standby. */
    function handOver(asker) {
        yielded = true;
        boot = null;
        if (asker.waits && gameplayStarted && Date.now() - asker.at < SAVE_WINDOW_MS && canPersistLocalSave()) saveGame({ skipCloudSync: true });
        blockWrites(); // also stops the page-exit save and cloud push (js/main.js pagehide, pushCloudSaveOnPageExit)
        writeStandby(true);
        markOpen(false);
        writeKey(HANDOVER_KEY, `${asker.id} ${Date.now()}`);
        location.reload();
    }

    const newer = other => other.at > self.at || (other.at === self.at && other.id > self.id);

    /** Another tab's hello ('<id> <time> <waits>'): a newer one takes the game. */
    function heardHello(value) {
        const [id, at, waits] = value.split(' '), asker = { id, at: Number(at) || 0, waits: waits === '1' };
        if (id !== self.id && newer(asker)) handOver(asker);
    }

    function onStorage(event) {
        if (yielded || !event.newValue) return;
        if (event.key === HANDOVER_KEY && event.newValue.split(' ')[0] === self.id && boot) boot();
        else if (event.key === HELLO_KEY) heardHello(event.newValue);
    }

    /** Says hello and resolves at once when no tab is open, else once the open tab has saved and handed over or after HELLO_WAIT_MS. */
    function claim() {
        return new Promise(resolve => {
            window.addEventListener('storage', onStorage);
            // Leaving (closing, reloading) removes the mark; a page brought back from the back-forward cache runs the game again.
            window.addEventListener('pagehide', () => markOpen(false));
            window.addEventListener('pageshow', event => { if (event.persisted && !yielded && !boot) markOpen(true); });
            const waits = anotherTabOpen();
            boot = () => { boot = null; markOpen(true); resolve(); };
            self.at = Date.now();
            writeKey(HELLO_KEY, `${self.id} ${self.at} ${waits ? 1 : 0}`);
            if (waits) setTimeout(() => { if (boot) boot(); }, HELLO_WAIT_MS);
            else boot();
        });
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

    /** Resolves when this tab may load the save and run the game; a tab in standby (or one that a newer tab took over while it waited)
     * never resolves. Never rejects: on any failure the tab boots as before. */
    function untilTabMayBoot() {
        if (readyPromise) return readyPromise;
        const standby = readStandby();
        if (standby) {
            showStandby();
            readyPromise = new Promise(() => {});
        } else readyPromise = standby === false ? claim().catch(error => console.warn('game tab guard skipped:', error)) : Promise.resolve();
        return readyPromise;
    }

    return Object.freeze({ ready: untilTabMayBoot });
})();
