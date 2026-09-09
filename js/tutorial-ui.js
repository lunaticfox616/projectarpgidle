/**
 * Optional action guidance owned by the UI. Reads real loadouts; never equips or
 * spends points. Each notice offers one action and can be skipped immediately.
 */
const tutorialActionUi = {
    active: null,
    highlighted: null,
    card: null,
    guides: {
        unlock_items: {
            selector: '#ui-inventory-list .equipment-grid-item',
            title: '첫 장비 장착',
            body: '장비를 눌러 비교한 뒤, 더블클릭하거나 장착 버튼으로 착용해 보세요.',
            read: () => Object.values(game.equipment).filter(Boolean).map(item => String(item.instanceId || item.id)),
            completed: (current, before) => current.some(id => !before.includes(id))
        },
        unlock_char: {
            selector: '#tree-canvas',
            title: '첫 패시브 투자',
            body: '연결된 시작 노드의 효과를 살펴보고, 원하는 노드에 포인트를 투자해 보세요.',
            read: () => game.passives.length,
            completed: (current, before) => current > before
        },
        unlock_skills: {
            selector: '#tab-skills .starter-gem-tutorial-target, #tab-skills .gem-library-card:not(.active):not(.equipment-blocked)',
            title: '스킬 젬 장착',
            body: '젬을 선택해 효과를 확인하고 ‘장착’을 누르세요. 선택한 젬에 따라 자동 전투가 달라집니다.',
            read: () => JSON.stringify([game.activeSkill, game.equippedSupports, game.equippedSummonSkills]),
            completed: (current, before) => current !== before
        }
    },
    guideFor(key) {
        if (key === 'unlock_items' && !game.inventory.some(Boolean)) return null;
        if (key === 'unlock_char' && game.passivePoints < 1) return null;
        const guideKey = key === 'tutorial_starter_gem_equip' ? 'unlock_skills' : key;
        return Object.hasOwn(this.guides, guideKey) ? this.guides[guideKey] : null;
    },
    start(notice) {
        const guide = this.guideFor(notice.key);
        if (!guide) return;
        this.finish(false);
        this.active = { notice, guide, before: guide.read() };
        this.ensureCard();
        this.card.hidden = false;
        this.card.querySelector('strong').textContent = guide.title;
        this.card.querySelector('p').textContent = guide.body;
        this.openTarget();
    },
    ensureCard() {
        if (this.card) return;
        const card = document.createElement('aside');
        card.id = 'tutorial-action-card';
        card.className = 'tutorial-action-card';
        card.setAttribute('aria-label', '플레이 안내');
        card.innerHTML = '<strong></strong><p id="tutorial-action-description"></p><div><button type="button" data-open>화면 보기</button><button type="button" data-skip>안내 닫기</button></div>';
        card.querySelector('[data-open]').addEventListener('click', () => this.openTarget());
        card.querySelector('[data-skip]').addEventListener('click', () => this.finish(false));
        document.body.appendChild(card);
        this.card = card;
    },
    openTarget() {
        const action = this.active;
        if (!action) return;
        const group = getMergedTabGroup(action.notice.tabId);
        if (group) switchMergedTabSubtab(group[0], action.notice.tabId);
        else switchTab(action.notice.tabId, { keepWindowOpen: true });
        if (action.notice.tabId === 'tab-items') {
            switchItemSubtab('item-tab-equip');
            if (isMobilePrimaryNavigationEnabled()) setEquipmentMobilePane('inventory');
        }
        requestAnimationFrame(() => {
            this.refresh();
            if (this.highlighted) this.highlighted.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        });
    },
    refresh() {
        const action = this.active;
        if (!action) return;
        if (action.guide.completed(action.guide.read(), action.before)) return this.finish(true);
        const target = document.querySelector(action.guide.selector);
        this.clearHighlight();
        if (!target || !target.getClientRects().length) return;
        target.classList.add('tutorial-action-target');
        const describedBy = target.getAttribute('aria-describedby') || '';
        target.setAttribute('aria-describedby', (describedBy + ' tutorial-action-description').trim());
        this.highlighted = target;
        this.card.classList.toggle('at-top', target.getBoundingClientRect().top > innerHeight / 2);
    },
    clearHighlight() {
        const target = this.highlighted;
        if (!target) return;
        target.classList.remove('tutorial-action-target');
        const ids = (target.getAttribute('aria-describedby') || '').split(' ').filter(id => id !== 'tutorial-action-description');
        if (ids.length) target.setAttribute('aria-describedby', ids.join(' '));
        else target.removeAttribute('aria-describedby');
        this.highlighted = null;
    },
    finish(completed) {
        const action = this.active;
        this.active = null;
        this.clearHighlight();
        if (this.card) this.card.hidden = true;
        if (!action) return;
        if (completed) {
            game.seenTutorials.push('action_' + action.notice.key);
            showGameToast(action.guide.title + ' 완료', { tone: 'success' });
        }
        setTimeout(showNextTutorial, 40);
    }
};

function renderTutorialStep() {
    if (!activeTutorial) return;
    if (storyJournalUi.renderTutorial(activeTutorial)) return;
    document.getElementById('tutorial-kicker').innerText = '새 콘텐츠';
    document.getElementById('tutorial-title').innerText = activeTutorial.title;
    let pauseEnabled = game.settings.pauseGameOnOverlay !== false;
    let pauseControl = activeTutorial.key === 'tutorial_battle_basics' ? `
        <label class="cfg-toggle tutorial-pause-toggle">
            <input type="checkbox" id="tutorial-pause-overlay-toggle" ${pauseEnabled ? 'checked' : ''}>
            <span class="cfg-label"><b>안내 중 전투 일시 정지</b><small>이후 기타 → 설정에서 언제든 변경할 수 있습니다.</small></span>
            <strong id="tutorial-pause-overlay-status">${pauseEnabled ? '켜짐' : '꺼짐'}</strong>
        </label>` : '';
    document.getElementById('tutorial-body').innerHTML = `<p class="tutorial-summary">${escapeTutorialText(activeTutorial.body)}</p>${pauseControl}`;
    let pauseToggle = document.getElementById('tutorial-pause-overlay-toggle');
    if (pauseToggle) {
        pauseToggle.checked = pauseEnabled;
        pauseToggle.addEventListener('change', () => {
            let enabled = !!pauseToggle.checked;
            game.settings.pauseGameOnOverlay = enabled;
            let settingsToggle = document.getElementById('chk-pause-overlay');
            let status = document.getElementById('tutorial-pause-overlay-status');
            if (settingsToggle) settingsToggle.checked = enabled;
            if (status) status.innerText = enabled ? '켜짐' : '꺼짐';
            if (typeof queueImportantSave === 'function') queueImportantSave(0);
        });
    }
    const hasShortcut = !!activeTutorial.tabId || !!activeTutorial.subtabId;
    const openButton = document.getElementById('tutorial-open-btn');
    const dismissButton = document.getElementById('tutorial-dismiss-btn');
    openButton.style.display = hasShortcut ? 'inline-block' : 'none';
    openButton.innerText = tutorialActionUi.guideFor(activeTutorial.key) ? '따라 해보기' : '화면 열기';
    dismissButton.innerText = '확인';
}

function isTutorialPresentationBlocked() {
    if (game.pendingLoopHeroSelection || game.pendingLoopReady || game.pendingLoopDecision) return true;
    return ['isStartupOverlayOpen', 'isLoadingOverlayOpen', 'isRewardOpen', 'isDeathOverlayOpen', 'isLoopHeroSelectOpen']
        .some(name => typeof window[name] === 'function' && window[name]());
}

function showNextTutorial() {
    if (activeTutorial || tutorialActionUi.active || tutorialQueue.length === 0 || isTutorialPresentationBlocked()) return;
    while (tutorialQueue.length && !activeTutorial) {
        const next = tutorialQueue.shift();
        if (contentProgression.canOpen(next.subtabId || next.tabId)) activeTutorial = next;
    }
    if (!activeTutorial) return;
    activeTutorial.title = stripDecorativeEmoji(activeTutorial.title);
    activeTutorial.body = stripDecorativeEmoji(activeTutorial.body);
    activeTutorialStep = 0;
    renderTutorialStep();
    document.getElementById('tutorial-overlay').classList.add('active');
    lastTime = Date.now();
}
function advanceTutorial() {
    if (!activeTutorial) return;
    dismissTutorial(true);
}
function goBackTutorialStep() {
    if (!activeTutorial || activeTutorialStep <= 0) return;
    activeTutorialStep -= 1;
    renderTutorialStep();
}
function dismissTutorial(openTarget) {
    if (!activeTutorial) return;
    const notice = activeTutorial;
    const { tabId, subtabId } = notice;
    document.getElementById('tutorial-overlay').classList.remove('active');
    activeTutorial = null;
    activeTutorialStep = 0;
    lastTime = Date.now();
    if (!openTarget) return setTimeout(showNextTutorial, 40);
    if (tutorialActionUi.guideFor(notice.key)) return tutorialActionUi.start(notice);
    if (tabId) switchTab(tabId, { keepWindowOpen: true });
    if (subtabId && tabId === 'tab-items') switchItemSubtab(subtabId);
    if (subtabId && tabId === 'tab-map') switchMapSubtab(subtabId);
    setTimeout(showNextTutorial, 40);
}
