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

    isMisc(id, layout = tabLayoutUi.current()) {
        if (id === 'btn-tab-pruning') return false;
        return id === 'btn-tab-settings' || id === 'btn-map-complete-action-picker'
            || layout.tabPlacement[id] === 'bottom';
    },

    // The phone dock has three shortcuts plus battle; every other tab stays in the full menu.
    mobilePrimaryIds(layout = game.settings.tabLayouts.mobile) {
        const preferred = layout.tabOrder.filter(id => layout.tabPlacement[id] === 'top');
        const defaults = ['btn-tab-items', 'btn-tab-skills', 'btn-tab-map']
            .filter(id => layout.tabPlacement[id] !== 'bottom');
        const candidates = [...new Set([...preferred, ...defaults])].filter(id => {
            const button = document.getElementById(id);
            return id.startsWith('btn-tab-') && button && button.style.display !== 'none' && !button.hidden
                && button.dataset.mergedTabMember !== '1' && !['btn-tab-battle', 'btn-tab-settings'].includes(id);
        });
        return ['btn-tab-battle', ...candidates.slice(0, 3)];
    },

    placementOptions(id, target, layout) {
        if (target === 'mobile') {
            const primary = tabLayoutUi.mobilePrimaryIds(layout).includes(id);
            return '<option value="top"' + (primary ? ' selected' : '') + '>하단 바로가기</option>'
                + '<option value="bottom"' + (primary ? '' : ' selected') + '>전체 메뉴</option>';
        }
        const secondary = tabLayoutUi.isMisc(id, layout);
        return '<option value="top"' + (secondary ? '' : ' selected') + '>기본 메뉴</option>'
            + '<option value="bottom"' + (id === 'btn-tab-pruning' ? ' disabled' : '')
            + (secondary ? ' selected' : '') + '>기타 메뉴</option>';
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
                + '<div class="cfg-tab-actions"><button type="button" data-move="-1" data-tab="' + id + '" aria-label="' + escapeHTML(label) + ' 앞으로"' + (index === 0 ? ' disabled' : '') + '>↑</button>'
                + '<button type="button" data-move="1" data-tab="' + id + '" aria-label="' + escapeHTML(label) + ' 뒤로"' + (index === available.length - 1 ? ' disabled' : '') + '>↓</button>'
                + '<select data-place="' + id + '" aria-label="' + escapeHTML(label) + ' 위치"' + '>'
                + tabLayoutUi.placementOptions(id, target, layout) + '</select></div></div>';
        }).join('');
        root.innerHTML = '<label class="cfg-tab-platform">편집할 화면<select aria-label="편집할 화면"><option value="desktop"' + (target === 'desktop' ? ' selected' : '') + '>PC</option><option value="mobile"' + (target === 'mobile' ? ' selected' : '') + '>모바일</option></select></label>' + rows;
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
        if (id === 'btn-tab-pruning' && target === 'desktop') placement = 'top';
        if (!tabLayoutUi.buttons().some(button => button.id === id)) return;
        const layout = game.settings.tabLayouts[target];
        layout.tabPlacement[id] = placement === 'bottom' ? 'bottom' : 'top';
        if (target === 'mobile' && placement === 'top') {
            layout.tabOrder = [id, ...layout.tabOrder.filter(key => key !== id)];
        }
        tabLayoutUi.changed();
    },

};
