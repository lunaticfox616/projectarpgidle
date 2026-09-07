// Pagination is presentation-only: rows retain the domain's original inventory index.
const jewelLibraryUi = (() => {
    let page = 0;
    let search = '';

    function visibleRows(rows, query) {
        if (search !== query) { search = query; page = 0; }
        const mobile = uiDisplay.matches('(max-width: 1080px)');
        const pages = Math.max(1, Math.ceil(rows.length / 6));
        page = Math.min(page, pages - 1);
        document.querySelectorAll('.jewel-library-pages').forEach(navigation => {
            navigation.hidden = !mobile || rows.length <= 6;
            navigation.querySelector('[data-jewel-page="-1"]').disabled = page === 0;
            navigation.querySelector('[data-jewel-page="1"]').disabled = page === pages - 1;
            const status = `${page + 1} / ${pages} · ${rows.length}개`;
            const label = navigation.querySelector('span');
            if (label.textContent !== status) label.textContent = status;
        });
        return mobile ? rows.slice(page * 6, page * 6 + 6) : rows;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('ui-jewel-library');
        root.querySelectorAll('.jewel-library-pages').forEach(navigation => {
            navigation.innerHTML = '<button type="button" data-jewel-page="-1">이전</button><span aria-live="polite"></span><button type="button" data-jewel-page="1">다음</button>';
        });
        root.addEventListener('click', event => {
            const button = event.target.closest('[data-jewel-page]');
            if (!button || button.disabled) return;
            page = Math.max(0, page + Number(button.dataset.jewelPage));
            updateStaticUI();
            root.querySelector('.jewel-library-pages').scrollIntoView({ block: 'start' });
        });
    }, { once: true });
    return { visibleRows };
})();
safeExposeGlobals({ jewelLibraryUi });
