// 한 브라우저에서 게임을 두 탭으로 열면 두 탭이 같은 기기 저장을 번갈아 덮어써, 한 탭에서 얻은 진행이 사라졌다(2026-10-21 실험:
// 뒤 탭에서 얻은 장비가 앞 탭의 저장에 지워졌다). 마지막에 연 탭이 게임을 이어 받는다: 앞 탭은 지금까지를 저장하고, 그 뒤로는 쓰지 않으며,
// 다시 불러와 대기 화면(index.html #startup-standby)이 된다. 대기 화면의 버튼은 반대로 그 탭이 이어 받게 한다.
// 탭끼리는 localStorage로 말한다(다른 탭의 storage 이벤트). 같은 저장소의 바뀜은 쓴 차례대로 닿으므로, 새 탭이 "넘겼다"(HANDOVER_KEY)를 받을
// 때는 앞 탭이 그 전에 쓴 저장도 이미 와 있다(BroadcastChannel로 답하면 답이 저장보다 먼저 닿아 저장 전 값을 읽은 적이 있다).
// 게임을 돌리는 탭은 열려 있다는 표시(OPEN_KEY, 탭 id와 시각)를 OPEN_BEAT_MS마다 새로 쓰고 떠날 때 지운다. 새로운 표시가 있으면 새 탭은
// 인사(HELLO_KEY)하고 HELLO_WAIT_MS까지 "넘겼다"를 기다린다. 표시가 없거나 OPEN_FRESH_MS보다 오래됐으면(지우지 못하고 꺼진 앱, 오래 숨은 탭)
// 인사만 하고 바로 부팅한다(혼자 여는 게임의 부팅을 늦추지 않는다). 둘이 함께 인사하면 나중에 연 탭이 이어 받는다. 잠금(Web Locks)은 쓰지
// 않는다: 잠금을 쥔 페이지는 새 서비스 워커로 바뀌거나 오프라인에서 새로고침할 때 멈추곤 했다(tests/browser/service-worker.spec.js).
// js/main.js bootWhenTabMayRun이 ready()를 기다려 부팅한다. sessionStorage가 없는 페이지는 예전처럼 막지 않는다.
const STANDBY_KEY = 'rignin-game-standby';
const OPEN_KEY = 'rignin-game-open';
const HELLO_KEY = 'rignin-game-hello';
const HANDOVER_KEY = 'rignin-game-handover';
const HELLO_WAIT_MS = 1500;
const SAVE_WINDOW_MS = HELLO_WAIT_MS - 300;
const OPEN_BEAT_MS = 5000;
const OPEN_FRESH_MS = 12000;

export class GameTabGuard {
    constructor(deps, view) {
        this.deps = deps; this.view = view;
        this.self = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, at: 0 };
        this.readyPromise = null;
        this.boot = null;
        this.yielded = false;
        this.beat = null;
        this.disposed = false;
        this.claimTimer = null;
        this.onStorage = this.onStorage.bind(this);
        this.onPageHide = () => this.markOpen(false);
        this.onPageShow = event => { if (event.persisted && !this.yielded && !this.boot) this.markOpen(true); };
    }

    /** This tab's standby mark, or null when the page cannot use sessionStorage: such a page saves nothing either, so the guard stays off
     * (two such tabs would otherwise take the game from each other on every reload). */
    readStandby() {
        try { return this.deps.sessionStorage.getItem(STANDBY_KEY) === '1'; } catch (error) { this.deps.console.warn('game tab guard off: no sessionStorage', error); return null; }
    }

    writeStandby(on) {
        try {
            if (on) this.deps.sessionStorage.setItem(STANDBY_KEY, '1');
            else this.deps.sessionStorage.removeItem(STANDBY_KEY);
        } catch (error) { this.deps.console.warn('game tab guard: the standby mark was not kept', error); }
    }

    readKey(key) {
        try { return this.deps.localStorage.getItem(key); } catch (error) { this.deps.console.warn(`game tab guard: ${key} was not read`, error); return null; }
    }

    writeKey(key, value) {
        try {
            if (value === null) this.deps.localStorage.removeItem(key);
            else this.deps.localStorage.setItem(key, value);
        } catch (error) { this.deps.console.warn(`game tab guard: ${key} was not kept`, error); }
    }

    /** The open mark ('<tab id> <time>') of the tab that runs the game, or null. */
    openMark() {
        const [id, at] = String(this.readKey(OPEN_KEY) || '').split(' ');
        return id ? { id, at: Number(at) || 0 } : null;
    }

    /** While this tab runs the game its mark stays fresh; leaving or standing by removes it (only its own: a newer tab may have written one). */
    markOpen(on) {
        (0, this.deps.clearInterval)(this.beat);
        this.beat = null;
        if (on) {
            const write = () => this.writeKey(OPEN_KEY, `${this.self.id} ${Date.now()}`);
            write();
            this.beat = (0, this.deps.setInterval)(write, OPEN_BEAT_MS);
        } else if (this.openMark()?.id === this.self.id) this.writeKey(OPEN_KEY, null);
    }

    anotherTabOpen() {
        const mark = this.openMark();
        return !!mark && mark.id !== this.self.id && Date.now() - mark.at < OPEN_FRESH_MS;
    }

    // The page holds a default game before it loads the save (js/passives.js), so a standby page must never write either.
    blockWrites() {
        (0, this.deps.setLocalSaveRuntimeState)('standby', { writable: false, message: (0, this.deps._t)('다른 탭에서 게임을 이어 하고 있어 이 탭은 저장하지 않습니다.') });
    }

    /** A newer tab said hello: this tab saves (when that tab waits and the hello came in time), writes nothing after that, says it handed
     * over (after the save, so the save reaches that tab first) and reloads into standby. */
    handOver(asker) {
        this.deps.window.playerGuideUi?.dismissReplay(false);
        this.yielded = true;
        this.boot = null;
        if (asker.waits && this.deps.gameplayStarted && Date.now() - asker.at < SAVE_WINDOW_MS && (0, this.deps.canPersistLocalSave)()) (0, this.deps.saveGame)({ skipCloudSync: true });
        this.blockWrites(); // also stops the page-exit save and cloud push (js/main.js pagehide, pushCloudSaveOnPageExit)
        this.writeStandby(true);
        this.markOpen(false);
        this.writeKey(HANDOVER_KEY, `${asker.id} ${Date.now()}`);
        this.deps.location.reload();
    }

    newer(other) { return other.at > this.self.at || (other.at === this.self.at && other.id > this.self.id); }

    /** Another tab's hello ('<id> <time> <waits>'): a newer one takes the game. */
    heardHello(value) {
        const [id, at, waits] = value.split(' '), asker = { id, at: Number(at) || 0, waits: waits === '1' };
        if (id !== this.self.id && this.newer(asker)) this.handOver(asker);
    }

    onStorage(event) {
        if (this.yielded || !event.newValue) return;
        if (event.key === HANDOVER_KEY && event.newValue.split(' ')[0] === this.self.id && this.boot) this.boot();
        else if (event.key === HELLO_KEY) this.heardHello(event.newValue);
    }

    /** Says hello and resolves at once when no tab is open, else once the open tab has saved and handed over or after HELLO_WAIT_MS. */
    claim() {
        return new Promise(resolve => {
            this.deps.window.addEventListener('storage', this.onStorage);
            // Leaving (closing, reloading) removes the mark; a page brought back from the back-forward cache runs the game again.
            this.deps.window.addEventListener('pagehide', this.onPageHide);
            this.deps.window.addEventListener('pageshow', this.onPageShow);
            const waits = this.anotherTabOpen();
            this.boot = () => { this.boot = null; this.markOpen(true); resolve(); };
            this.self.at = Date.now();
            this.writeKey(HELLO_KEY, `${this.self.id} ${this.self.at} ${waits ? 1 : 0}`);
            if (waits) this.claimTimer = (0, this.deps.setTimeout)(() => { if (this.boot) this.boot(); }, HELLO_WAIT_MS);
            else this.boot();
        });
    }

    /** Lifts the loading cover (html.app-preload). A booting page does it in js/main.js revealStartupScreen; a standby page never boots, so
     * its panel sat under the "게임 파일을 받는 중" line until index.html's 20 s fallback (2026-10-28 to 2026-11-10). Waits for the fonts
     * like the boot does. */
    uncover() { return this.view.uncover(); }

    showStandby() { this.blockWrites(); this.view.showTab(() => { this.writeStandby(false); this.deps.location.reload(); }); }

    /** Resolves when this tab may load the save and run the game; a tab in standby (or one that a newer tab took over while it waited)
     * never resolves. Never rejects: on any failure the tab boots as before. */
    untilTabMayBoot() {
        if (this.disposed) return new Promise(() => {});
        if (this.readyPromise) return this.readyPromise;
        const standby = this.readStandby();
        if (standby) {
            this.showStandby();
            this.readyPromise = new Promise(() => {});
        } else this.readyPromise = standby === false ? this.claim().catch(error => this.deps.console.warn('game tab guard skipped:', error)) : Promise.resolve();
        return this.readyPromise;
    }

    /** Terminal page shutdown: no handover save, reload or later boot is allowed. */
    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.yielded = true;
        this.boot = null;
        this.markOpen(false);
        if (this.claimTimer !== null) (0, this.deps.clearTimeout)(this.claimTimer);
        this.claimTimer = null;
        this.deps.window.removeEventListener('storage', this.onStorage);
        this.deps.window.removeEventListener('pagehide', this.onPageHide);
        this.deps.window.removeEventListener('pageshow', this.onPageShow);
        this.view.dispose();
    }
}
