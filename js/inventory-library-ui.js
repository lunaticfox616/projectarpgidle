// Page state belongs to presentation. Filter complete inventories before passing rows here;
// the returned slice preserves item references and original indices used by domain actions.
const inventoryLibraryUi = (() => {
    const states = {jewel: {page:0, search:''}, talisman: {page:0, search:''}};

    function visibleRows(kind, rows, query) {
        const state = states[kind];
        if (state.search !== query) { state.search = query; state.page = 0; }
        const mobile = uiDisplay.matches('(max-width: 1080px)');
        const pages = Math.max(1, Math.ceil(rows.length / 6));
        state.page = Math.min(state.page, pages - 1);
        document.querySelectorAll(`[data-inventory-library="${kind}"]`).forEach(navigation => {
            navigation.hidden = !mobile || rows.length <= 6;
            navigation.querySelector('[data-inventory-page="-1"]').disabled = state.page === 0;
            navigation.querySelector('[data-inventory-page="1"]').disabled = state.page === pages - 1;
            const status = `${state.page + 1} / ${pages} · ${rows.length}개`;
            const label = navigation.querySelector('span');
            if (label.textContent !== status) label.textContent = status;
        });
        return mobile ? rows.slice(state.page * 6, state.page * 6 + 6) : rows;
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-inventory-library]').forEach(navigation => {
            navigation.innerHTML = '<button type="button" data-inventory-page="-1">이전</button><span aria-live="polite"></span><button type="button" data-inventory-page="1">다음</button>';
            navigation.addEventListener('click', event => {
                const button = event.target.closest('[data-inventory-page]');
                if (!button || button.disabled) return;
                const kind = navigation.dataset.inventoryLibrary;
                states[kind].page = Math.max(0, states[kind].page + Number(button.dataset.inventoryPage));
                updateStaticUI();
                document.querySelector(`[data-inventory-library="${kind}"]`).scrollIntoView({block:'start'});
            });
        });
    }, {once:true});
    return {visibleRows};
})();
safeExposeGlobals({inventoryLibraryUi});
