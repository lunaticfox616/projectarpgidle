import { battlePresentationSuspended } from './battle-presentation-gates.mjs';
import { dockBattlePreview, setBattlePreviewCollapsed } from './mobile-battle-dock.mjs';

/** 그리는 간격(ms): 한 장을 그리는 비용(이동 평균)을 MAIN_SHARE로 나눈 만큼 쉬고, MIN과 MAX 사이로 묶는다. 빠른 기기일수록 장수가 오르고
 * 메인 스레드에서 이 화면이 쓰는 몫은 기기와 상관없이 같다(2026-11-23 사용자 "성능은 유지하면서 프레임 개선": 예전에는 150ms마다 한 장). */
const FRAME = Object.freeze({ MIN_MS: 50, MAX_MS: 420, FIRST_MS: 150, MAIN_SHARE: 0.04, SMOOTH: 0.2 });
/** 그림을 누르면 오른쪽 위에 끄기 단추가 이만큼 떠 있다(ms). 떠 있는 동안 그림을 다시 누르면 전투 화면으로 간다. */
const PEEK_MS = 3000;
/** 열리면 이 화면을 감추는 창들: (문서, 살아 있는 목록) → 열렸는가. */
const activeTab = (document, id) => !!document.getElementById(id)?.classList.contains('active');
const BLOCKING_SHEETS = Object.freeze([
    document => document.getElementById('passive-mobile-detail')?.hidden === false,
    document => !!document.getElementById('ui-equipment-inventory-inspector')?.matches(':popover-open'),
    (document, live) => live.pickers.length > 0,
    (document, live) => [...live.dialogs].some(dialog => dialog.open),
    (document, live) => [...live.tutorials].some(overlay => overlay.classList.contains('active')),
    document => !!document.getElementById('background-combat-result-overlay'),
    document => activeTab(document, 'tab-settings'),
    document => activeTab(document, 'tab-traits') && !!document.getElementById('tab-traits').querySelector('.ascend-detail:not(.is-empty)'),
    document => activeTab(document, 'tab-items') && !!document.getElementById('tab-items').querySelector('.shop-info:not(:empty)')
]);
const MARKUP = '<button type="button" class="mobile-battle-pip-preview" data-pip-peek data-i18n-attr="aria-label" aria-label="작은 전투 화면"><canvas width="320" height="180" aria-hidden="true"></canvas></button>'
    + '<button type="button" class="mobile-battle-pip-close" data-pip-close hidden data-i18n-attr="aria-label" aria-label="작은 전투 화면 끄기"></button>'
    + '<button type="button" data-pip-toggle aria-expanded="false" data-i18n-attr="aria-label" aria-label="작은 전투 화면 펼치기" data-i18n>전투 보기</button>';

/** Owns one adaptive preview timer and its copy surface, never a combat timer. Its only saved effect is the off switch (showMobileBattlePip). */
export class MobileBattlePreview {
    constructor(deps) {
        this.deps = deps; this.canvas = null; this.ctx = null; this.handle = null; this.peekHandle = null;
        this.errorReported = false; this.active = true; this.host = null; this.live = null;
        /** @type {number} 다음 장까지의 간격(ms) */
        this.interval = FRAME.FIRST_MS;
        /** @type {number} 한 장을 그리는 비용의 이동 평균(ms) */
        this.cost = FRAME.FIRST_MS * FRAME.MAIN_SHARE;
        this.onClick = this.click.bind(this); this.onTick = this.tick.bind(this); this.onPeekEnd = this.hidePeek.bind(this);
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

    collapse(host, collapsed) {
        if (collapsed) this.hidePeek();
        setBattlePreviewCollapsed(this.deps, host, collapsed);
    }

    /** 그림: 끄기 단추를 띄운다(떠 있으면 전투 화면으로). 끄기 단추: 설정의 작은 전투 화면을 끈다. 접힌 단추(빽빽한 화면): 펼친다. */
    click(event) {
        if (!this.active) return;
        const target = event.target;
        if (target.closest('[data-pip-close]')) this.turnOff();
        else if (target.closest('[data-pip-toggle]')) {
            this.collapse(this.host, false);
            dockBattlePreview(this.deps, this.host);
            this.refresh();
        } else if (target.closest('[data-pip-peek]')) this.peek();
    }

    peek() {
        const close = this.host.querySelector('[data-pip-close]');
        if (!close.hidden) { this.hidePeek(); this.deps.switchTab('tab-battle'); return; }
        close.hidden = false;
        this.peekHandle = this.deps.setTimeout(this.onPeekEnd, PEEK_MS);
    }

    hidePeek() {
        if (this.peekHandle !== null) this.deps.clearTimeout(this.peekHandle);
        this.peekHandle = null;
        const close = this.host && this.host.querySelector('[data-pip-close]');
        if (close) close.hidden = true;
    }

    /** 설정 창의 같은 스위치(chk-mobile-battle-pip)를 끈 것과 같다: 다시 켜면 돌아온다. */
    turnOff() {
        this.hidePeek();
        this.deps.game.settings.showMobileBattlePip = false;
        const control = this.deps.document.getElementById('chk-mobile-battle-pip');
        if (control) control.checked = false;
        this.deps.queueImportantSave(180);
        this.updateVisibility();
    }

    /** 이 화면을 가리는 창이 열렸는가. 클래스로 찾는 것은 살아 있는 목록으로 본다: 그리는 장마다 문서 전체를 고르는 선택자로 훑으면 장당 0.8ms가 들었다. */
    sheetOpen() {
        const document = this.deps.document;
        if (!this.live) this.live = { pickers: document.getElementsByClassName('selection-overlay'), dialogs: document.getElementsByTagName('dialog'), tutorials: document.getElementsByClassName('tutorial-overlay') };
        return BLOCKING_SHEETS.some(open => open(document, this.live));
    }

    blocked() {
        return battlePresentationSuspended(this.deps) || this.deps.document.body.classList.contains('mobile-tab-drawer-open') || this.sheetOpen();
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
            if (schedule && this.handle === null) this.handle = this.deps.setTimeout(this.onTick, this.interval);
        } else {
            this.stop();
            this.hidePeek();
        }
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
        this.deps.renderBattlefield(true, this.interval);
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

    /** 이번 장의 비용으로 다음 간격을 정한다. */
    pace(cost) {
        this.cost += (cost - this.cost) * FRAME.SMOOTH;
        this.interval = Math.round(Math.min(FRAME.MAX_MS, Math.max(FRAME.MIN_MS, this.cost / FRAME.MAIN_SHARE)));
    }

    tick() {
        this.handle = null;
        if (!this.active) return;
        try {
            this.updateVisibility(false);
            if (!this.visible() || battlePresentationSuspended(this.deps)) return;
            const began = this.deps.now();
            this.refresh();
            this.pace(this.deps.now() - began);
            this.errorReported = false;
        } catch (error) {
            if (!this.errorReported) this.deps.console.error('mobile battle PIP refresh failed:', error);
            this.errorReported = true;
        }
        if (this.visible() && !battlePresentationSuspended(this.deps)) this.handle = this.deps.setTimeout(this.onTick, this.interval);
    }

    start() { this.stop(); this.updateVisibility(); }
    stop() { if (this.handle !== null) this.deps.clearTimeout(this.handle); this.handle = null; }
    dispose() {
        this.active = false;
        this.stop();
        this.hidePeek();
        if (this.host) this.host.removeEventListener('click', this.onClick);
        this.host = this.canvas = this.ctx = this.live = null;
    }
}
