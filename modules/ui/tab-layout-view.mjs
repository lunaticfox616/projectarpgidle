import { MERGED_TAB_GROUPS } from './tab-definitions.mjs';
import { listenView, releaseViewEvents, releaseViewTarget } from './view-events.mjs';

/** Menu edits use the same saved layouts as the header; only the editor selection is transient. */
export function createTabLayoutView(deps) { return new TabLayoutView(deps); }

class TabLayoutView {
    constructor(deps) {
        this.deps = deps;
        this.active = true;
        this.listeners = [];
        this.owner = deps.game;
        this.root = null;
        this.renderedOwner = null;
        this.selectedPlatform = null;
        this.defaultOrder = Array.from(this.deps.document.querySelectorAll('.tab-header .tab-btn')).map(button => button.id);
        /** The phone dock's order before the player moves anything (2026-11-07 사용자): 전투, 캐릭터, 스킬트리, 장비, 그루터기 함, 지도, 루프,
             * 기록, then the 전체 button. Tabs past what fits stay in the full menu. */
        this.mobileDefaultOrder = Object.freeze(['btn-tab-battle', 'btn-tab-character', 'btn-tab-char', 'btn-tab-items', 'btn-tab-stump', 'btn-tab-map',
        'btn-tab-season', 'btn-tab-journal', 'btn-tab-trade']);
        /** Short names for a menu cell four characters wide (the PC HUD menu, the phone dock); the full name stays on the button. */
        this.shortCaptions = Object.freeze({ 'btn-tab-season': '루프', 'btn-tab-stump': '그루터기' });
        // During defer-script evaluation readyState is already interactive, but later scripts still define merged tab names.
        if (deps.document.readyState === 'complete') this.initializeCaptions();
        else listenView(this, deps.document, 'DOMContentLoaded', () => this.initializeCaptions(), { once: true });
    }

    platform() {
        return this.deps.uiDisplay.matches('(max-width: 1080px)') ? 'mobile' : 'desktop';
    }

    current() {
        return this.deps.game.settings.tabLayouts[this.platform()];
    }

    buttons() {
        return Array.from(this.deps.document.querySelectorAll('.tab-header .tab-btn'))
            .filter(button => button.style.display !== 'none' && !button.hidden
                && button.dataset.mergedTabMember !== '1'
                && !['btn-tab-battle', 'btn-tab-settings', 'btn-map-complete-action-picker'].includes(button.id));
    }

    orderedButtons(layout) {
        const available = this.buttons();
        const byId = new Map(available.map(button => [button.id, button]));
        const defaults = layout === this.deps.game.settings.tabLayouts.mobile ? this.mobileDefaultOrder : [];
        return [...layout.tabOrder, ...defaults, ...this.defaultOrder, ...available.map(button => button.id)]
            .filter((id, index, ids) => byId.has(id) && ids.indexOf(id) === index)
            .map(id => byId.get(id));
    }

    /** A tab button's short name: its group's title for a button that opens several screens (js/ui.js MERGED_TAB_GROUPS), else the
         * short name, else its own words. */
    caption(button) {
        const merged = button.dataset.mergedTabLauncher && typeof MERGED_TAB_GROUPS === 'object' ? MERGED_TAB_GROUPS[button.dataset.mergedTabLauncher] : null;
        // 글 마디는 이미 옮겨졌을 수 있다: 한국어 원문을 쓴다(그래야 '|하단 메뉴' 문맥 열쇠로 옮겨진다)
        const own = Array.from(button.childNodes).filter(node => node.nodeType === 3).map(node => this.deps.i18n.sourceOf(node).trim()).join(' ').trim();
        return (merged && merged.title) || this.shortCaptions[button.id] || own;
    }

    isMisc(id, layout = this.current()) {
        return id === 'btn-tab-settings' || id === 'btn-map-complete-action-picker'
            || layout.tabPlacement[id] === 'bottom';
    }

    // The order is the player's (long press and drag, js/ui.js commitMobileDockOrder) before mobileDefaultOrder; battle may move too.
    mobilePrimaryIds(layout = this.deps.game.settings.tabLayouts.mobile) {
        const preferred = layout.tabOrder.filter(id => layout.tabPlacement[id] === 'top');
        // 스킬룬은 장비 단추로 열린다(2026-10-13): 그 자리에는 스킬트리가 선다
        const defaults = this.mobileDefaultOrder.filter(id => id === 'btn-tab-battle' || layout.tabPlacement[id] !== 'bottom');
        const ordered = [...new Set([...preferred, ...defaults])].filter(id => id === 'btn-tab-battle' || this.isDockable(id));
        const fit = Math.max(3, Math.min(7, Math.floor(this.deps.document.documentElement.clientWidth / 52) - 2));
        const shortcuts = ordered.filter(id => id !== 'btn-tab-battle').slice(0, fit);
        const battleAt = ordered.slice(0, ordered.indexOf('btn-tab-battle')).filter(id => shortcuts.includes(id)).length;
        shortcuts.splice(battleAt, 0, 'btn-tab-battle');
        return shortcuts;
    }

    /** A tab button that may sit on the phone dock: shown, not a screen inside a merged window, not battle or settings. */
    isDockable(id) {
        const button = this.deps.document.getElementById(id);
        return id.startsWith('btn-tab-') && !!button && button.style.display !== 'none' && !button.hidden
            && button.dataset.mergedTabMember !== '1' && !['btn-tab-battle', 'btn-tab-settings'].includes(id);
    }

    placementOptions(id, target, layout) {
        if (target === 'mobile') {
            const primary = this.mobilePrimaryIds(layout).includes(id);
            return '<option value="top"' + (primary ? ' selected' : '') + '>' + this.deps._t('하단 바로가기') + '</option>'
                + '<option value="bottom"' + (primary ? '' : ' selected') + '>' + this.deps._t('전체 메뉴') + '</option>';
        }
        const secondary = this.isMisc(id, layout);
        return '<option value="top"' + (secondary ? '' : ' selected') + '>' + this.deps._t('기본 메뉴') + '</option>'
            + '<option value="bottom"'
            + (secondary ? ' selected' : '') + '>' + this.deps._t('기타 메뉴') + '</option>';
    }

    render() {
        if (!this.active) return;
        this.syncOwner();
        const root = this.deps.document.getElementById('ui-tab-order-settings');
        if (!this.editorVisible(root)) return;
        this.bindEditor(root);
        const target = this.selectedPlatform || this.platform();
        const layout = this.deps.game.settings.tabLayouts[target];
        const available = this.orderedButtons(layout);
        const rows = this.editorRows(available, target, layout);
        root.innerHTML = '<label class="cfg-tab-platform">' + this.deps._t('편집할 화면') + '<select aria-label="' + this.deps._t('편집할 화면') + '"><option value="desktop"' + (target === 'desktop' ? ' selected' : '') + '>PC</option><option value="mobile"' + (target === 'mobile' ? ' selected' : '') + '>' + this.deps._t('모바일') + '</option></select></label>' + rows;
        this.renderedOwner = this.deps.game;
    }

    editorVisible(root) {
        const settings = this.deps.document.getElementById('tab-settings');
        if (!root || !settings?.classList.contains('active') || !root.closest('details')?.open) return false;
        return this.platform() !== 'mobile' || settings.dataset.settingsCategory === 'layout';
    }

    editorRows(available, target, layout) {
        const rows = available.map((button, index) => {
            const id = button.id;
            const label = (button.querySelector('.ui-rail-label') || button).textContent.replace(/●/g, '').trim();
            return '<div class="cfg-tab-row"><span>' + this.deps.escapeHTML(label) + '</span>'
                + '<div class="cfg-tab-actions"><button type="button" data-move="-1" data-tab="' + id + '" aria-label="' + this.deps.escapeHTML(this.deps._t('{label} 앞으로', { label })) + '"' + (index === 0 ? ' disabled' : '') + '>↑</button>'
                + '<button type="button" data-move="1" data-tab="' + id + '" aria-label="' + this.deps.escapeHTML(this.deps._t('{label} 뒤로', { label })) + '"' + (index === available.length - 1 ? ' disabled' : '') + '>↓</button>'
                + '<select data-place="' + id + '" aria-label="' + this.deps.escapeHTML(this.deps._t('{label} 위치', { label })) + '"' + '>'
                + this.placementOptions(id, target, layout) + '</select></div></div>';
        }).join('');
        return rows;
    }

    syncOwner() {
        if (this.owner === this.deps.game) return;
        this.owner = this.deps.game;
        this.selectedPlatform = null;
        this.renderedOwner = null;
    }

    bindEditor(root) {
        if (this.root === root) return;
        if (this.root) releaseViewTarget(this, this.root);
        this.root = root;
        listenView(this, root, 'click', event => this.editOrder(event));
        listenView(this, root, 'change', event => this.editPlacement(event));
    }

    acceptsEditorEvent(event) {
        return this.active && this.root?.isConnected && this.root.contains(event.target)
            && this.renderedOwner === this.deps.game;
    }

    editOrder(event) {
        if (!this.acceptsEditorEvent(event)) return;
        const button = event.target.closest('[data-move]');
        if (!button || !this.root.contains(button) || button.disabled) return;
        this.move(button.dataset.tab, Number(button.dataset.move));
    }

    editPlacement(event) {
        if (!this.acceptsEditorEvent(event)) return;
        const select = event.target;
        if (select.matches('.cfg-tab-platform select')) {
            if (!['desktop', 'mobile'].includes(select.value)) return;
            this.selectedPlatform = select.value;
            this.render();
        } else if (select.matches('[data-place]')) this.place(select.dataset.place, select.value);
    }

    changed() {
        if (!this.active) return;
        this.deps.applyTabHeaderOrder(true);
        this.deps.queueImportantSave(300);
    }

    move(id, direction) {
        if (!this.active || ![-1, 1].includes(direction)) return;
        this.syncOwner();
        const layout = this.deps.game.settings.tabLayouts[this.selectedPlatform || this.platform()];
        const order = this.orderedButtons(layout).map(button => button.id);
        const index = order.indexOf(id);
        const next = index + direction;
        if (index < 0 || next < 0 || next >= order.length) return;
        [order[index], order[next]] = [order[next], order[index]];
        // Keep locked entries in storage; they simply stay out of the editor.
        layout.tabOrder = order.concat(layout.tabOrder.filter(key => !order.includes(key)));
        this.changed();
    }

    place(id, placement) {
        if (!this.active) return;
        this.syncOwner();
        const target = this.selectedPlatform || this.platform();
        if (!this.buttons().some(button => button.id === id)) return;
        const layout = this.deps.game.settings.tabLayouts[target];
        layout.tabPlacement[id] = placement === 'bottom' ? 'bottom' : 'top';
        if (target === 'mobile' && placement === 'top') {
            layout.tabOrder = [id, ...layout.tabOrder.filter(key => key !== id)];
        }
        this.changed();
    }

    initializeCaptions() {
        if (!this.active) return;
        // Keep the Korean source/context: i18n also translates this attribute after language changes.
        this.deps.document.querySelectorAll('.tab-header .tab-btn').forEach(button => {
            if (button.dataset.caption) return;
            button.dataset.caption = `${this.caption(button)}|하단 메뉴`;
            button.dataset.i18nAttr = [button.dataset.i18nAttr, 'data-caption'].filter(Boolean).join(' ');
            this.deps.i18n.applyStatic(button);
        });
    }

    dispose() {
        if (!this.active) return;
        releaseViewEvents(this);
        this.root = this.owner = this.renderedOwner = null;
        this.selectedPlatform = null;
    }
}
