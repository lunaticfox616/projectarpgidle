// Menu editing and runtime layout share the platform layouts owned by game.settings.
const tabLayoutUi = {
    selectedPlatform: null,
    defaultOrder: Array.from(document.querySelectorAll('.tab-header .tab-btn')).map(button => button.id),

    platform() {
        return uiDisplay.matches('(max-width: 1080px)') ? 'mobile' : 'desktop';
    },

    current() {
        return game.settings.tabLayouts[tabLayoutUi.platform()];
    },

    buttons() {
        return Array.from(document.querySelectorAll('.tab-header .tab-btn'))
            .filter(button => button.style.display !== 'none' && !button.hidden
                && button.dataset.mergedTabMember !== '1'
                && !['btn-tab-battle', 'btn-tab-settings', 'btn-map-complete-action-picker'].includes(button.id)
                && ((tabLayoutUi.selectedPlatform || tabLayoutUi.platform()) !== 'desktop' || button.id !== 'btn-tab-social'));
    },

    orderedButtons(layout) {
        const available = tabLayoutUi.buttons();
        const byId = new Map(available.map(button => [button.id, button]));
        return [...layout.tabOrder, ...tabLayoutUi.defaultOrder, ...available.map(button => button.id)]
            .filter((id, index, ids) => byId.has(id) && ids.indexOf(id) === index)
            .map(id => byId.get(id));
    },

    /** Short names for a menu cell four characters wide (the PC HUD menu, the phone dock); the full name stays on the button. */
    shortCaptions: Object.freeze({ 'btn-tab-season': '루프', 'btn-tab-stump': '그루터기' }),

    /** A tab button's short name: its group's title for a button that opens several screens (js/ui.js MERGED_TAB_GROUPS), else the
     * short name, else its own words. */
    caption(button) {
        const merged = button.dataset.mergedTabLauncher && typeof MERGED_TAB_GROUPS === 'object' ? MERGED_TAB_GROUPS[button.dataset.mergedTabLauncher] : null;
        // 글 마디는 이미 옮겨졌을 수 있다: 한국어 원문을 쓴다(그래야 '|하단 메뉴' 문맥 열쇠로 옮겨진다)
        const own = Array.from(button.childNodes).filter(node => node.nodeType === 3).map(node => i18n.sourceOf(node).trim()).join(' ').trim();
        return (merged && merged.title) || tabLayoutUi.shortCaptions[button.id] || own;
    },

    isMisc(id, layout = tabLayoutUi.current()) {
        return id === 'btn-tab-settings' || id === 'btn-map-complete-action-picker'
            || layout.tabPlacement[id] === 'bottom';
    },

    // The phone dock: battle, as many shortcuts as fit the screen's width (a cell of about 52px, 3 to 7) and the full menu
    // button; every other tab stays in the full menu (2026-11-03 사용자: 하단 탭이 너무 적다, 390px 휴대폰은 셋에서 다섯).
    mobilePrimaryIds(layout = game.settings.tabLayouts.mobile) {
        const preferred = layout.tabOrder.filter(id => layout.tabPlacement[id] === 'top');
        // 스킬룬은 장비 단추로 열린다(2026-10-13): 그 자리에는 스킬트리가 선다
        const defaults = ['btn-tab-items', 'btn-tab-char', 'btn-tab-map', 'btn-tab-stump', 'btn-tab-season', 'btn-tab-character', 'btn-tab-journal']
            .filter(id => layout.tabPlacement[id] !== 'bottom');
        const candidates = [...new Set([...preferred, ...defaults])].filter(id => {
            const button = document.getElementById(id);
            return id.startsWith('btn-tab-') && button && button.style.display !== 'none' && !button.hidden
                && button.dataset.mergedTabMember !== '1' && !['btn-tab-battle', 'btn-tab-settings'].includes(id);
        });
        const fit = Math.max(3, Math.min(7, Math.floor(document.documentElement.clientWidth / 52) - 2));
        return ['btn-tab-battle', ...candidates.slice(0, fit)];
    },

    placementOptions(id, target, layout) {
        if (target === 'mobile') {
            const primary = tabLayoutUi.mobilePrimaryIds(layout).includes(id);
            return '<option value="top"' + (primary ? ' selected' : '') + '>' + _t('하단 바로가기') + '</option>'
                + '<option value="bottom"' + (primary ? '' : ' selected') + '>' + _t('전체 메뉴') + '</option>';
        }
        const secondary = tabLayoutUi.isMisc(id, layout);
        return '<option value="top"' + (secondary ? '' : ' selected') + '>' + _t('기본 메뉴') + '</option>'
            + '<option value="bottom"'
            + (secondary ? ' selected' : '') + '>' + _t('기타 메뉴') + '</option>';
    },

    render() {
        const root = document.getElementById('ui-tab-order-settings');
        if (!root || !document.getElementById('tab-settings')?.classList.contains('active')) return;
        if (!root.closest('details').open) return;
        if (tabLayoutUi.platform() === 'mobile' && document.getElementById('tab-settings').dataset.settingsCategory !== 'layout') return;
        const target = tabLayoutUi.selectedPlatform || tabLayoutUi.platform();
        const layout = game.settings.tabLayouts[target];
        const available = tabLayoutUi.orderedButtons(layout);
        const rows = available.map((button, index) => {
            const id = button.id;
            const label = (button.querySelector('.ui-rail-label') || button).textContent.replace(/●/g, '').trim();
            return '<div class="cfg-tab-row"><span>' + escapeHTML(label) + '</span>'
                + '<div class="cfg-tab-actions"><button type="button" data-move="-1" data-tab="' + id + '" aria-label="' + escapeHTML(_t('{label} 앞으로', { label })) + '"' + (index === 0 ? ' disabled' : '') + '>↑</button>'
                + '<button type="button" data-move="1" data-tab="' + id + '" aria-label="' + escapeHTML(_t('{label} 뒤로', { label })) + '"' + (index === available.length - 1 ? ' disabled' : '') + '>↓</button>'
                + '<select data-place="' + id + '" aria-label="' + escapeHTML(_t('{label} 위치', { label })) + '"' + '>'
                + tabLayoutUi.placementOptions(id, target, layout) + '</select></div></div>';
        }).join('');
        root.innerHTML = '<label class="cfg-tab-platform">' + _t('편집할 화면') + '<select aria-label="' + _t('편집할 화면') + '"><option value="desktop"' + (target === 'desktop' ? ' selected' : '') + '>PC</option><option value="mobile"' + (target === 'mobile' ? ' selected' : '') + '>' + _t('모바일') + '</option></select></label>' + rows;
        root.querySelector('.cfg-tab-platform select').addEventListener('change', event => {
            tabLayoutUi.selectedPlatform = event.target.value;
            tabLayoutUi.render();
        });
        root.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', () => tabLayoutUi.move(button.dataset.tab, Number(button.dataset.move))));
        root.querySelectorAll('[data-place]').forEach(select => select.addEventListener('change', () => tabLayoutUi.place(select.dataset.place, select.value)));
    },

    changed() {
        applyTabHeaderOrder(true);
        queueImportantSave(300);
    },

    move(id, direction) {
        const layout = game.settings.tabLayouts[tabLayoutUi.selectedPlatform || tabLayoutUi.platform()];
        const order = tabLayoutUi.orderedButtons(layout).map(button => button.id);
        const index = order.indexOf(id);
        const next = index + direction;
        if (index < 0 || next < 0 || next >= order.length) return;
        [order[index], order[next]] = [order[next], order[index]];
        // Keep locked entries in storage; they simply stay out of the editor.
        layout.tabOrder = order.concat(layout.tabOrder.filter(key => !order.includes(key)));
        tabLayoutUi.changed();
    },

    place(id, placement) {
        const target = tabLayoutUi.selectedPlatform || tabLayoutUi.platform();
        if (!tabLayoutUi.buttons().some(button => button.id === id)) return;
        const layout = game.settings.tabLayouts[target];
        layout.tabPlacement[id] = placement === 'bottom' ? 'bottom' : 'top';
        if (target === 'mobile' && placement === 'top') {
            layout.tabOrder = [id, ...layout.tabOrder.filter(key => key !== id)];
        }
        tabLayoutUi.changed();
    },

};

// The phone dock shows each button's short name (css/themes/pixel-menu.css, attr(data-caption)); the PC HUD menu sets its own when it wraps the label.
// The caption is the Korean source with the '|하단 메뉴' context and i18n translates the attribute, now and on every language change:
// written once as plain text it stayed Korean in English (2026-11-05 review: 스킬트리, 그루터기, 장비, 지도).
document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('.tab-header .tab-btn').forEach(button => {
    if (button.dataset.caption) return;
    button.dataset.caption = `${tabLayoutUi.caption(button)}|하단 메뉴`;
    button.dataset.i18nAttr = [button.dataset.i18nAttr, 'data-caption'].filter(Boolean).join(' ');
    i18n.applyStatic(button);
}), { once: true });
