import { battlePresentationSuspended } from './battle-presentation-gates.mjs';
import { dockBattlePreview, setBattlePreviewCollapsed } from './mobile-battle-dock.mjs';

const BASE_INTERVAL_MS = 150;
const BLOCKING_SHEETS = '#passive-mobile-detail:not([hidden]), #ui-equipment-inventory-inspector:popover-open, .selection-overlay, dialog[open], .tutorial-overlay.active, #background-combat-result-overlay, #tab-settings.active, #tab-traits.active .ascend-detail:not(.is-empty), #tab-items.active .shop-info:not(:empty)';
const MARKUP = '<button type="button" class="mobile-battle-pip-preview" data-pip-return data-i18n-attr="aria-label" aria-label="전투 화면으로 이동"><canvas width="320" height="180" aria-hidden="true"></canvas></button>'
    + '<div class="mobile-battle-pip-actions"><button type="button" data-pip-return data-i18n class="mobile-battle-dock-label">전투로</button>'
    + '<button type="button" data-pip-toggle aria-expanded="true" aria-label="작은 전투 화면 접기">접기</button></div>';

/** Owns one adaptive preview timer and its copy surface, never a combat timer or saved state. */
export class MobileBattlePreview {
    constructor(deps) {
        this.deps = deps; this.canvas = null; this.ctx = null; this.handle = null;
        this.errorReported = false; this.active = true; this.host = null;
        this.onClick = this.click.bind(this); this.onTick = this.tick.bind(this);
    }

    ensure() {
        let host = this.deps.document.getElementById('mobile-battle-pip');
        if (!host) {
            host = this.deps.document.createElement('div');
            host.id = 'mobile-battle-pip'; host.className = 'mobile-battle-dock'; host.style.display = 'none';
            host.setAttribute('role', 'region'); host.setAttribute('aria-label', '작은 전투 화면');
            host.dataset.i18nAttr = 'aria-label'; host.innerHTML = MARKUP;
            this.deps.i18n.applyStatic(host);
            this.collapse(host, false);
            this.deps.document.body.appendChild(host);
        }
        if (this.host !== host) {
            if (this.host) this.host.removeEventListener('click', this.onClick);
            this.host = host;
            host.addEventListener('click', this.onClick);
            this.canvas = host.querySelector('canvas');
            this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        }
        return host;
    }

    collapse(host, collapsed) { setBattlePreviewCollapsed(this.deps, host, collapsed); }

    click(event) {
        if (!this.active) return;
        const host = this.host, toggle = event.target.closest('[data-pip-toggle]');
        if (toggle) {
            const collapsed = !host.classList.contains('is-collapsed');
            this.collapse(host, collapsed);
            dockBattlePreview(this.deps, host);
            if (collapsed) this.stop();
            else this.refresh();
        } else if (event.target.closest('[data-pip-return]')) this.deps.switchTab('tab-battle');
    }

    blocked() {
        return battlePresentationSuspended(this.deps) || this.deps.document.body.classList.contains('mobile-tab-drawer-open')
            || !!this.deps.document.querySelector(BLOCKING_SHEETS);
    }

    updateVisibility(schedule = true) {
        if (!this.active) return;
        const host = this.ensure();
        dockBattlePreview(this.deps, host);
        const mobile = this.deps.display.matches('(max-width: 1080px)');
        const battle = this.deps.document.getElementById('tab-battle').classList.contains('active');
        const blocked = mobile && !battle && this.blocked();
        const display = mobile && !battle && !blocked && this.deps.game.settings.showMobileBattlePip !== false ? 'grid' : 'none';
        if (host.style.display !== display) host.style.display = display;
        this.syncTimer(schedule);
    }

    syncTimer(schedule) {
        if (this.visible()) {
            if (schedule && this.handle === null) this.handle = this.deps.setTimeout(this.onTick, BASE_INTERVAL_MS);
        } else this.stop();
    }

    visible() {
        const host = this.deps.document.getElementById('mobile-battle-pip');
        return !!(host && host.style.display !== 'none' && !host.classList.contains('is-collapsed'));
    }

    refresh() {
        if (!this.active || !this.visible() || battlePresentationSuspended(this.deps)) return;
        const src = this.deps.document.getElementById('battlefield-canvas');
        // Assigning the same dimensions still clears the bitmap. Reset only before a real preview draw.
        if (src.width !== this.canvas.width || src.height !== this.canvas.height || src.dataset.renderScale !== '1') {
            src.width = this.canvas.width; src.height = this.canvas.height; src.dataset.renderScale = '1';
            this.deps.canvasBox.forget();
        }
        this.deps.renderBattlefield(true, BASE_INTERVAL_MS);
        this.copy();
    }

    copy() {
        if (!this.active || !this.ctx || !this.canvas || !this.visible()) return;
        const src = this.deps.document.getElementById('battlefield-canvas');
        if (!src) return;
        if (src.width < 32 || src.height < 32) { src.width = this.canvas.width; src.height = this.canvas.height; }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(src, 0, 0, this.canvas.width, this.canvas.height);
    }

    tick() {
        this.handle = null;
        if (!this.active) return;
        let nextDelay = BASE_INTERVAL_MS;
        try {
            this.updateVisibility(false);
            if (!this.visible() || battlePresentationSuspended(this.deps)) return;
            const began = this.deps.now();
            this.refresh();
            const cost = this.deps.now() - began;
            if (cost > 16) nextDelay = Math.min(420, Math.round(BASE_INTERVAL_MS + cost * 8));
            else if (cost > 9) nextDelay = BASE_INTERVAL_MS + 70;
            this.errorReported = false;
        } catch (error) {
            if (!this.errorReported) this.deps.console.error('mobile battle PIP refresh failed:', error);
            this.errorReported = true;
        }
        if (this.visible() && !battlePresentationSuspended(this.deps)) this.handle = this.deps.setTimeout(this.onTick, nextDelay);
    }

    start() { this.stop(); this.updateVisibility(); }
    stop() { if (this.handle !== null) this.deps.clearTimeout(this.handle); this.handle = null; }
    dispose() {
        this.active = false;
        this.stop();
        if (this.host) this.host.removeEventListener('click', this.onClick);
        this.host = this.canvas = this.ctx = null;
    }
}
