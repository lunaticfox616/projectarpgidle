/** Searchable gameplay notices. Story scenes keep their existing journal reader. */
window.GameModules.tutorialHistoryUi = (() => {
    let dialog = null, opener = null, savedRevision = -1;
    const history = () => window.GameModules.state.tutorials;
    const rows = () => game.tutorialHistory.filter(row => !row.key.startsWith('story_'));
    const labels = { pending: '대기 중', displayed: '읽는 중', unread: '놓친 안내', read: '확인한 안내' };
    function sync() {
        if (savedRevision !== history().revision && !(typeof isStartupOverlayOpen === 'function' && isStartupOverlayOpen())) {
            savedRevision = history().revision;
            queueImportantSave(0);
        }
        const unread = rows().filter(row => row.status !== 'read').length;
        for (const button of document.querySelectorAll('[data-tutorial-history-open]')) {
            button.setAttribute('aria-label', _t('안내 보관함 · 미확인 {count}개', { count: unread }));
            button.dataset.unread = String(unread);
        }
    }
    function createDialog() {
        const node = document.createElement('dialog');
        node.id = 'tutorial-history-dialog';
        node.className = 'tutorial-history-dialog';
        node.setAttribute('aria-labelledby', 'tutorial-history-heading');
        node.innerHTML = `<header><div><span>${_t('플레이 안내')}</span><h2 id="tutorial-history-heading">${_t('안내 보관함')}</h2></div>
            <button type="button" data-history-close aria-label="${_t('안내 보관함 닫기')}">×</button></header>
            <p class="tutorial-history-help">${_t('놓친 안내와 확인한 안내를 최근 순서로 다시 볼 수 있습니다. 이야기 장면은 기록에 남습니다.')}</p>
            <div class="tutorial-history-search"><label for="tutorial-history-query">${_t('안내 검색')}</label>
            <input type="search" id="tutorial-history-query" maxlength="120" placeholder="${_t('제목·내용·메뉴 검색')}">
            <label class="tutorial-history-filter"><input type="checkbox" data-history-unread>${_t('미확인만')}</label></div>
            <p class="tutorial-history-count" role="status" aria-live="polite"></p><div class="tutorial-history-list"></div>`;
        node.addEventListener('input', render);
        node.addEventListener('click', click);
        node.addEventListener('keydown', event => selectionDialog.containFocus(event, node));
        node.addEventListener('close', () => { if (opener) selectionDialog.restoreFocus(opener); opener = null; });
        document.body.appendChild(node);
        return node;
    }
    function legacyNotices() {
        const notices = TUTORIAL_STARTER_GUIDES.flatMap(guide => [guide, { ...guide, key: guide.seenAs }]);
        for (const [key, guide] of Object.entries(tutorialActionUi.guides)) {
            const tabId = { unlock_items: 'tab-items', unlock_char: 'tab-char', unlock_skills: 'tab-skills', unlock_stump_box: 'tab-stump' }[key];
            notices.push({ key, title: guide.title, body: guide.body, tabId });
        }
        return notices;
    }
    function open(button) {
        opener = button || document.activeElement;
        history().sync(game);
        history().rememberLegacy(game, legacyNotices());
        yieldTutorialCardToResult();
        tutorialActionUi.finish(false, true);
        if (!dialog) dialog = createDialog();
        dialog.querySelector('#tutorial-history-query').value = '';
        dialog.querySelector('[data-history-unread]').checked = false;
        render();
        if (!dialog.open) dialog.showModal();
        dialog.querySelector('#tutorial-history-query').focus();
    }
    function searchable(row) {
        return [_t(row.title), _t(row.body), _t(TUTORIAL_TAB_NAMES[row.tabId] || '')].join(' ').toLocaleLowerCase(i18n.locale);
    }
    function canOpen(row) {
        if (row.contentId) return CONTENT_UNLOCK_CATALOG.some(def => def.id === row.contentId) && contentProgression.isUnlocked(row.contentId);
        return !!row.tabId && Object.hasOwn(TUTORIAL_TAB_NAMES, row.tabId) && contentProgression.canOpen(row.subtabId || row.tabId);
    }
    function cardHtml(row) {
        const stamp = row.displayedAt || row.queuedAt;
        const when = stamp ? new Date(stamp).toLocaleString(i18n.locale) : _t('이전 저장에서 이어진 안내');
        const title = escapeHTML(_t(row.title)), key = escapeHTML(row.key), unread = row.status !== 'read';
        const action = tutorialActionUi.guideFor(row.key) ? _t('따라 해보기') : _t('화면 보기');
        return `<article class="tutorial-history-entry ${unread ? 'is-unread' : ''}" data-history-key="${key}">
            <div class="tutorial-history-meta"><span>${_t(labels[row.status])}</span><time>${escapeHTML(when)}</time></div>
            <h3>${title}</h3>${tutorialBodyHtml(_t(row.body))}<footer>
            ${unread ? `<button type="button" data-history-read aria-label="${escapeHTML(_t('{name} 확인', { name: _t(row.title) }))}">${_t('확인')}</button>` : ''}
            ${canOpen(row) ? `<button type="button" data-history-follow aria-label="${escapeHTML(_t('{name} 화면 보기', { name: _t(row.title) }))}">${action}</button>` : ''}</footer></article>`;
    }
    function render() {
        if (!dialog) return;
        const query = dialog.querySelector('#tutorial-history-query').value.trim().toLocaleLowerCase(i18n.locale);
        const unreadOnly = dialog.querySelector('[data-history-unread]').checked;
        const matches = rows().filter(row => (!unreadOnly || row.status !== 'read') && searchable(row).includes(query))
            .sort((a, b) => (b.displayedAt || b.queuedAt) - (a.displayedAt || a.queuedAt));
        dialog.querySelector('.tutorial-history-count').textContent = _t('안내 {count}개 · 최근 순', { count: matches.length });
        dialog.querySelector('.tutorial-history-list').innerHTML = matches.length ? matches.map(cardHtml).join('')
            : `<p class="tutorial-history-empty">${_t('해당하는 안내가 없습니다. 새 안내를 받으면 여기에 남습니다.')}</p>`;
    }
    function reopenGuide(row) {
        history().transition(game, row.key, 'read');
        opener = null;
        dialog.close();
        // Reading a replay cannot equip a starter rune or plant the seed reward on dismissal.
        if (!tutorialActionUi.active && tutorialActionUi.guideFor(row.key)) {
            tutorialActionUi.start({ ...row, replay: true });
            tutorialActionUi.card.querySelector('[data-open]').focus();
        } else openTutorialTarget(row);
        history().sync(game);
        queueImportantSave(0);
    }
    function click(event) {
        if (event.target.closest('[data-history-close]')) { dialog.close(); return; }
        const button = event.target.closest('[data-history-read], [data-history-follow]');
        const card = button?.closest('[data-history-key]');
        if (!card) return;
        const row = rows().find(record => record.key === card.dataset.historyKey);
        if (!row) return;
        if (button.hasAttribute('data-history-follow')) { reopenGuide(row); return; }
        history().transition(game, row.key, 'read');
        history().sync(game);
        queueImportantSave(0);
        render();
        dialog.querySelector('#tutorial-history-query').focus();
        sync();
    }
    document.addEventListener('click', event => {
        const button = event.target.closest?.('[data-tutorial-history-open]');
        if (button) open(button);
    });
    return { open, sync, render, canOpen, reopenGuide };
})();
