const INPUT_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];
/** Draw cadence only: no simulation timing, save or combat writes. */
export class DisplayCadence {
    constructor(environment, getState) {
        const { window, document } = environment;
        this.window = window; this.document = document; this.getState = getState;
        const { navigator } = window;
        this.mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
            || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        this.lastInputAt = window.performance.now();
        this.markInput = () => { this.lastInputAt = window.performance.now(); };
    }
    start() {
        if (this.started) return;
        this.started = true;
        INPUT_EVENTS.forEach(type => this.window.addEventListener(type, this.markInput, { capture: true, passive: true }));
        this.window.addEventListener('focus', this.markInput);
    }
    watchingBoss() {
        const game = this.getState();
        if (typeof game !== 'object' || game.combatHalted || !(game.playerHp > 0)) return false;
        if (!this.document.getElementById('tab-battle')?.classList.contains('active')) return false;
        return game.enemies.some(enemy => enemy && enemy.isBoss && enemy.hp > 0);
    }
    restingFrameMs() {
        if (!this.document.hidden && this.watchingBoss()) return 0;
        if (!this.document.hasFocus()) return 1000 / 20;
        return this.inputIdleMs > 20000 ? (this.mobile ? 1000 / 20 : 1000 / 30) : 0;
    }
    get inputIdleMs() { return this.window.performance.now() - this.lastInputAt; }
    get battleFrameMs() { return Math.max(this.mobile ? 1000 / 30 : 22, this.restingFrameMs()); }
    get explorationFrameMs() { return Math.max(this.mobile ? 1000 / 30 : 1000 / 60, this.restingFrameMs()); }
    dispose() {
        INPUT_EVENTS.forEach(type => this.window.removeEventListener(type, this.markInput, true));
        this.window.removeEventListener('focus', this.markInput);
        this.started = false;
    }
}
