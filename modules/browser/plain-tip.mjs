import { escapeHTML } from '../common/text.mjs';
const SHOW_DELAY_MS = 120;
const HOLD_MS = 450;
const HOLD_SLOP_PX = 10;
const HOST = '[data-tip]:not([data-tip=""])';
class PlainTip {
    host = null;
    timer = 0;
    shown = false;
    pressed = false;
    x = 0;
    y = 0;
    plainTipHost = event => (event.target.closest ? event.target.closest(HOST) : null);
    quiet = { capture: true, passive: true };
    constructor({ window, document }, inputs) {
        this.window = window; this.document = document; this.inputs = inputs;
        this.started = false; this.disposed = false;
        for (const name of ["adoptStrayTitle","paintPlainTip","hidePlainTip","forgetPlainTip","armPlainTip","onPlainTipOver","onPlainTipDown","onPlainTipMove","onPlainTipUp"]) this[name] = this[name].bind(this);
    }
    adoptStrayTitle(event) {
        const stray = event.target.closest ? event.target.closest('[title]') : null;
        if (!stray) return;
        this.inputs.console.warn('title 속성 대신 data-tip을 쓴다:', stray);
        stray.dataset.tip = this.inputs.translate(stray.title);
        stray.removeAttribute('title');
    }

    paintPlainTip() {
        this.timer = 0;
        if (!this.host || !this.host.isConnected) return;
        const refused = this.host.matches(':disabled, [aria-disabled="true"]');
        const html = `<div class="tooltip-line plain-tip${refused ? ' is-refused' : ''}">${escapeHTML(this.inputs.translate(this.host.dataset.tip))}</div>`;
        this.inputs.show(this.x, this.y, html, refused ? '#b5654a' : '#a98546');
        this.shown = true;
    }

    hidePlainTip() {
        this.window.clearTimeout(this.timer);
        this.timer = 0;
        if (this.shown) this.inputs.hide();
        this.shown = false;
    }

    forgetPlainTip() {
        this.hidePlainTip();
        this.host = null;
        this.pressed = false;
    }

    armPlainTip(next, event, delay) {
        this.hidePlainTip();
        this.pressed = false;
        this.host = next;
        this.x = event.clientX;
        this.y = event.clientY;
        this.timer = this.window.setTimeout(this.paintPlainTip, delay);
    }

    onPlainTipOver(event) {
        if (event.pointerType === 'touch') return;
        this.adoptStrayTitle(event);
        const next = this.plainTipHost(event);
        // A repaint under the pointer gives a new element, maybe with new numbers: the tip follows it without a flicker, and a press keeps it closed.
        if (next && this.host && (next.dataset.tip === this.host.dataset.tip || !this.host.isConnected)) {
            this.host = next;
            if (!this.timer && !this.pressed) this.paintPlainTip();
            return;
        }
        if (next) this.armPlainTip(next, event, SHOW_DELAY_MS);
        else this.forgetPlainTip();
    }

    onPlainTipDown(event) {
        if (event.pointerType !== 'touch') {
            this.hidePlainTip();
            this.pressed = true;
            return;
        }
        const next = this.plainTipHost(event);
        if (next) this.armPlainTip(next, event, HOLD_MS);
        else this.forgetPlainTip();
    }

    onPlainTipMove(event) {
        if (event.pointerType === 'touch') {
            if (Math.hypot(event.clientX - this.x, event.clientY - this.y) > HOLD_SLOP_PX) this.forgetPlainTip();
            return;
        }
        this.x = event.clientX;
        this.y = event.clientY;
    }

    onPlainTipUp(event) {
        if (event.pointerType === 'touch') this.forgetPlainTip();
    }
    start() {
        if (this.started || this.disposed) return;
        this.started = true;
        for (const [type, handler] of this.events()) this.document.addEventListener(type, handler, this.quiet);
        this.document.documentElement.addEventListener('pointerleave', this.forgetPlainTip);
    }
    events() {
        return [['pointerover', this.onPlainTipOver], ['pointerdown', this.onPlainTipDown],
            ['pointermove', this.onPlainTipMove], ['pointerup', this.onPlainTipUp], ['pointercancel', this.onPlainTipUp]];
    }
    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.forgetPlainTip();
        for (const [type, handler] of this.events()) this.document.removeEventListener(type, handler, true);
        this.document.documentElement.removeEventListener('pointerleave', this.forgetPlainTip);
    }
}
export function createPlainTip(env, inputs) {
    const tip = new PlainTip(env, inputs);
    return Object.freeze({ start: () => tip.start(), dispose: () => tip.dispose() });
}
