const MAX_AGE_MS = 1000;
const HUD_PARTS = '.enemy-nameplate, .enemy-health-frame, .enemy-hud-meta, .enemy-ailments';

function changedHudRecord(row) {
    return row.type === 'attributes' ? row.oldValue !== row.target.getAttribute(row.attributeName)
        : [...row.addedNodes, ...row.removedNodes].some(node => node.nodeType === 1);
}

/** Cached CSS bounds: hidden canvas has width 0; resize/scroll invalidates, position expires after 1 s.
 * The 2026-10-07 4x-throttled phone probe spent 1.5 s of 14 s remeasuring after HUD writes. Keep DOM
 * measurements outside individual effect draws. Never advance or own game state. */
class BattleCanvasBox {
    constructor(deps) {
        this.deps = deps;
        this.observed = null;
        this.hud = null;
        this.box = null;
        this.observer = null;
        this.hudObserver = null;
        this.epoch = 0;
        this.listening = false;
        this.forget = () => { this.box = null; };
    }

    disconnect() {
        this.epoch++;
        if (this.observer) this.observer.disconnect();
        if (this.hudObserver) this.hudObserver.disconnect();
        this.observer = null;
        this.hudObserver = null;
    }

    observeSizes() {
        this.box = null;
        if (!this.observer) return;
        this.observer.disconnect();
        this.observer.observe(this.observed);
        if (this.hud) [this.hud, ...this.hud.querySelectorAll(HUD_PARTS)].forEach(part => this.observer.observe(part));
    }

    watch(canvas) {
        if (this.observed === canvas) return;
        this.disconnect();
        this.observed = canvas; this.box = null;
        this.hud = this.deps.document.getElementById('ui-enemy-list');
        const epoch = this.epoch;
        if (typeof this.deps.ResizeObserver === 'function') {
            this.observer = new this.deps.ResizeObserver(() => { if (epoch === this.epoch) this.forget(); });
            this.observeSizes();
        }
        this.watchHud(epoch);
        if (!this.listening) {
            this.deps.document.addEventListener('scroll', this.forget, { capture: true, passive: true });
            this.listening = true;
        }
    }

    watchHud(epoch) {
        if (!this.hud || typeof this.deps.MutationObserver !== 'function') return;
        this.hudObserver = new this.deps.MutationObserver(rows => {
            if (epoch === this.epoch && rows.some(changedHudRecord)) this.observeSizes();
        });
        this.hudObserver.observe(this.hud, { childList: true, subtree: true, attributes: true,
            attributeOldValue: true, attributeFilter: ['class', 'hidden'] });
    }

    /** HUD children may extend outside their card; convert their viewport rectangles through CSS zoom. */
    enemyOverlays(canvas) {
        const hud = this.deps.document.querySelector('#ui-enemy-list:not([hidden])');
        if (!hud) return [];
        const view = canvas.getBoundingClientRect();
        if (!view.width || !view.height) return [];
        const sx = canvas.clientWidth / view.width, sy = canvas.clientHeight / view.height;
        return [...hud.querySelectorAll(HUD_PARTS)].map(element => {
            const rect = element.getBoundingClientRect();
            const x = Math.max(0, (rect.left - view.left) * sx), y = Math.max(0, (rect.top - view.top) * sy);
            const right = Math.min(canvas.clientWidth, (rect.right - view.left) * sx);
            const bottom = Math.min(canvas.clientHeight, (rect.bottom - view.top) * sy);
            return { x, y, w: right - x, h: bottom - y };
        }).filter(rect => rect.w > 0 && rect.h > 0);
    }

    measure(canvas, now) {
        if (canvas.offsetParent === null) return { width: 0, height: 0, left: 0, top: 0, at: now, enemyOverlays: [] };
        return { width: canvas.clientWidth, height: canvas.clientHeight, left: canvas.offsetLeft, top: canvas.offsetTop,
            at: now, enemyOverlays: this.enemyOverlays(canvas) };
    }

    read(canvas) {
        this.watch(canvas);
        const now = this.deps.now();
        if (!this.box || now - this.box.at >= MAX_AGE_MS || typeof this.deps.ResizeObserver !== 'function') this.box = this.measure(canvas, now);
        return this.box;
    }

    dispose() {
        this.disconnect();
        if (this.listening) this.deps.document.removeEventListener('scroll', this.forget, true);
        this.listening = false;
        this.observed = null; this.hud = null; this.box = null;
    }
}

export function createBattleCanvasBox(deps) {
    const owner = new BattleCanvasBox(deps);
    return Object.freeze({ read: owner.read.bind(owner), forget: owner.forget, clientPoint: battlefieldClientPoint, dispose: owner.dispose.bind(owner) });
}
/** Pointer coordinates in the canvas's CSS-pixel drawing space, including CSS scaling. */
export function battlefieldClientPoint(canvas, clientX, clientY) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
        x: (clientX - rect.left) * ((canvas.clientWidth || rect.width) / Math.max(1, rect.width)),
        y: (clientY - rect.top) * ((canvas.clientHeight || rect.height) / Math.max(1, rect.height))
    };
}
