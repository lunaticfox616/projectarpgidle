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
            body: '장비를 눌러 비교한 뒤 장착 버튼으로 착용해 보세요.',
            read: () => Object.values(game.equipment).filter(Boolean).map(item => String(item.instanceId || item.id)),
            completed: (current, before) => current.some(id => !before.includes(id))
        },
        unlock_char: {
            // 휴대폰에서 노드 상세가 열려 있으면 그 "포인트 사용" 단추를, 아니면 트리 캔버스를 가리킨다.
            selector: ['#passive-mobile-detail:not([hidden]) [data-passive-confirm]:not(:disabled)', '#tree-canvas'],
            title: '첫 스킬트리 투자',
            body: '연결된 시작 노드의 효과를 살펴보고, 원하는 노드에 포인트를 투자해 보세요.',
            read: () => game.passives.length,
            completed: (current, before) => current > before
        },
        unlock_skills: {
            // 젬 상세가 열려 있으면 그 '장착' 단추를, 아니면 첫 스킬 젬 카드를 가리킨다.
            selector: ['#gem-selection .gem-equip-primary', '#tab-skills .starter-gem-tutorial-target, #tab-skills .gem-library-card:not(.active):not(.equipment-blocked)'],
            title: '스킬 젬 장착',
            body: '젬을 선택해 효과를 확인하고 ‘장착’을 누르세요. 선택한 젬에 따라 자동 전투가 달라집니다.',
            read: () => JSON.stringify([game.activeSkill, game.mobilitySkill, game.equippedSupports, game.equippedSummonSkills]),
            completed: (current, before) => current !== before
        }
    },
    aliases: { tutorial_starter_gem_equip: 'unlock_skills', tutorial_first_passive: 'unlock_char', tutorial_first_gear: 'unlock_items' },
    guideFor(key) {
        const guideKey = this.aliases[key] || key;
        if (guideKey === 'unlock_items' && !game.inventory.some(Boolean)) return null;
        if (guideKey === 'unlock_char' && game.passivePoints < 1) return null;
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
            if (!this.highlighted) return;
            this.highlighted.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            this.placeCard(this.highlighted);
        });
    },
    refresh() {
        const action = this.active;
        if (!action) return;
        if (action.guide.completed(action.guide.read(), action.before)) return this.finish(true);
        const target = this.findTarget(action.guide.selector);
        this.clearHighlight();
        // 가리킬 칸이 다른 화면에 있으면(전투 화면으로 돌아옴) 제목 · 단추만 한 줄로 기본 자리에 둔다.
        this.card.classList.toggle('is-away', !target);
        if (!target) { this.card.style.top = this.card.style.bottom = ''; return; }
        target.classList.add('tutorial-action-target');
        const describedBy = target.getAttribute('aria-describedby') || '';
        target.setAttribute('aria-describedby', (describedBy + ' tutorial-action-description').trim());
        this.highlighted = target;
        this.placeCard(target);
    },
    /** PC는 화면 구석(가리키는 칸이 아래 절반이면 위쪽)이되 그 자리가 칸을 덮으면, 휴대폰은 늘(카드가 화면 폭을 다 쓴다)
     * 가리키는 칸 바로 위(아래 절반) 또는 바로 아래(위 절반)에 붙인다 — 화면 맨 위에 두면 장비 창 머리의 판단 · 일괄 분석 줄을 덮었다. */
    placeCard(target) {
        const card = this.card, rect = target.getBoundingClientRect(), lower = rect.top > innerHeight / 2;
        card.classList.toggle('at-top', lower);
        card.style.top = card.style.bottom = '';
        const corner = card.getBoundingClientRect(), phone = isMobilePrimaryNavigationEnabled();
        // PC는 구석이 칸을 덮을 때만 옮기되, 트리 캔버스처럼 화면 절반이 넘는 대상은 어디에 두어도 겹치니 구석에 둔다.
        if (!phone && (!rectsOverlap(corner, rect) || rect.height > innerHeight / 2)) return;
        const factor = uiDisplay.factor || 1, height = corner.height;
        const floor = document.getElementById('tab-header-bottom')?.getBoundingClientRect().top || innerHeight;
        const top = lower ? rect.top - 12 - height : rect.bottom + 12;
        card.style.top = `${Math.max(8, Math.min(floor - height - 8, top)) / factor}px`;
        card.style.bottom = 'auto';
    },
    /** 먼저 적은 자리부터 화면에 보이는 첫 요소(selector는 문자열 하나 또는 우선순위 배열). */
    findTarget(selectors) {
        for (const selector of [].concat(selectors)) {
            const found = [...document.querySelectorAll(selector)].find(el => el.getClientRects().length);
            if (found) return found;
        }
        return null;
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
        } else equipSkippedStarterGem(action.notice.key);
        setTimeout(showNextTutorial, 40);
    }
};

function rectsOverlap(a, b) {
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

// 안내 카드 종류: 처음 하는 조작(시작 안내), 새로 열린 콘텐츠(새 콘텐츠), 루프 도달(새 루프). 이야기 장면은 storyJournalUi가 그린다.
const TUTORIAL_START_KEYS = new Set(['tutorial_battle_basics', 'tutorial_starter_gem_equip', 'tutorial_first_passive', 'tutorial_first_gear',
    'unlock_char', 'unlock_items', 'unlock_skills']);
const TUTORIAL_KIND_LABELS = Object.freeze({ start: '시작 안내', content: '새 콘텐츠', loop: '새 루프' });
// "…열기" 단추에 쓰는 화면 이름(메뉴 이름과 같게). 없으면 "화면 열기".
const TUTORIAL_TAB_NAMES = Object.freeze({
    'tab-character': '캐릭터', 'tab-char': '스킬트리', 'tab-items': '장비', 'tab-skills': '스킬 젬', 'tab-map': '지도', 'tab-unlocks': '해금',
    'tab-season': '루프 패시브', 'tab-traits': '전직', 'tab-talent': '재능', 'tab-pruning': '가지치기', 'tab-arcana': '아르카나', 'tab-codex': '도감',
    'tab-expertise': '전문가',
    'tab-stump': '그루터기 함', 'tab-settings': '설정', 'tab-journal': '기록', 'tab-records': '전적'
});
function tutorialNoticeKind(notice) {
    if (TUTORIAL_START_KEYS.has(notice.key)) return 'start';
    return String(notice.key).startsWith('unlock_content_loop_') ? 'loop' : 'content';
}
/** Colour in card text: ‘menu or button’ in the card's kind colour (where to go), [item name] in blue (what it is). */
function tutorialMarkup(line) {
    return escapeTutorialText(line)
        .replace(/‘([^’]+)’/g, '<span class="tutorial-ui">$1</span>')
        .replace(/\[([^\]]+)\]/g, '<span class="tutorial-name">[$1]</span>');
}
/** First line = what happened; the rest = what to do, as a short list (a line of speech in “…” keeps it prose). */
function tutorialBodyHtml(body) {
    const [lead = '', ...rest] = String(body || '').split('\n').map(line => line.trim()).filter(Boolean);
    const head = `<p class="tutorial-summary">${tutorialMarkup(lead)}</p>`;
    if (!rest.length) return head;
    if (rest.some(line => /^[\u201c"]/.test(line))) return head + rest.map(line => `<p class="tutorial-line">${tutorialMarkup(line)}</p>`).join('');
    return head + `<ul class="tutorial-steps">${rest.map(line => `<li>${tutorialMarkup(line)}</li>`).join('')}</ul>`;
}
function tutorialOpenLabel(notice) {
    if (tutorialActionUi.guideFor(notice.key)) return '따라 해보기';
    if (notice.openLabel) return notice.openLabel;
    const name = TUTORIAL_TAB_NAMES[notice.tabId];
    return name ? `${name} 열기` : '화면 열기';
}
/** "○○ 열기": an unlock card opens its exact screen (sub-tab, explore list, section); other cards open their tab. */
function openTutorialTarget(notice) {
    if (notice.contentId && contentUnlockUi.open(notice.contentId)) return;
    const { tabId, subtabId } = notice;
    if (tabId) switchTab(tabId, { keepWindowOpen: true });
    if (subtabId && tabId === 'tab-items') switchItemSubtab(subtabId);
    if (subtabId && tabId === 'tab-map') switchMapSubtab(subtabId);
}
/** "다음 안내 N": how many more cards will follow this one. The counter sits in the card's top-right corner. */
function syncTutorialQueueCount() {
    let count = document.getElementById('tutorial-queue-count');
    const card = count ? null : document.querySelector?.('#tutorial-overlay .tutorial-card');
    if (card) {
        count = document.createElement('span');
        count.id = 'tutorial-queue-count';
        count.className = 'tutorial-queue-count';
        card.prepend(count);
    }
    if (!count) return;
    const waiting = tutorialQueue.filter(next => storyJournalUi.allowsNotice(next.key) && contentProgression.canOpen(next.subtabId || next.tabId)).length;
    count.hidden = waiting === 0;
    count.textContent = waiting ? `다음 안내 ${waiting}` : '';
}

function renderTutorialStep() {
    if (!activeTutorial) return;
    if (storyJournalUi.renderTutorial(activeTutorial)) return;
    const kind = tutorialNoticeKind(activeTutorial), overlay = document.getElementById('tutorial-overlay');
    if (overlay.dataset) overlay.dataset.noticeKind = kind;
    document.getElementById('tutorial-kicker').innerText = TUTORIAL_KIND_LABELS[kind];
    document.getElementById('tutorial-title').innerText = activeTutorial.title;
    syncTutorialQueueCount();
    let pauseEnabled = game.settings.pauseGameOnOverlay !== false;
    let pauseControl = activeTutorial.key === 'tutorial_battle_basics' ? `
        <label class="cfg-toggle tutorial-pause-toggle">
            <input type="checkbox" id="tutorial-pause-overlay-toggle" ${pauseEnabled ? 'checked' : ''}>
            <span class="cfg-label"><b>안내 중 전투 일시 정지</b><small>이후 ${settingsMenuPath()}에서 언제든 변경할 수 있습니다.</small></span>
            <strong id="tutorial-pause-overlay-status">${pauseEnabled ? '켜짐' : '꺼짐'}</strong>
        </label>` : '';
    // 본문은 줄바꿈을 살려 보이므로(pre-line) 템플릿 앞의 줄바꿈이 빈 줄이 되지 않게 다듬는다.
    document.getElementById('tutorial-body').innerHTML = tutorialBodyHtml(activeTutorial.body) + pauseControl.trim();
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
    openButton.innerText = tutorialOpenLabel(activeTutorial);
    dismissButton.innerText = '확인';
}

/** A guide card waits while the act title card is on screen (a story scene does not: the title card waits for it). */
function tutorialWaitsForTitleCard() {
    const next = tutorialQueue[0];
    if (!next || String(next.key).startsWith('story_')) return false;
    return typeof actTitleCard === 'object' && typeof actTitleCard.busy === 'function' && actTitleCard.busy();
}
/** 설정으로 가는 길: 휴대폰은 하단 "전체" 서랍, PC는 HUD의 "기타" 목록. */
function settingsMenuPath() {
    return isMobilePrimaryNavigationEnabled() ? '전체 → 설정' : '기타 → 설정';
}

function isTutorialPresentationBlocked() {
    if (game.pendingLoopHeroSelection || game.pendingLoopReady || game.pendingLoopDecision) return true;
    // 방치 전투를 되돌리는 중이거나 그 결과 창이 열려 있으면 이야기 · 안내 카드는 결과를 닫은 뒤에 뜬다(두 판이 겹쳤다).
    if (backgroundCombatRuntime.processing || document.getElementById('background-combat-result-overlay')) return true;
    if (tutorialWaitsForTitleCard()) return true;
    return ['isStartupOverlayOpen', 'isLoadingOverlayOpen', 'isRewardOpen', 'isDeathOverlayOpen', 'isLoopHeroSelectOpen']
        .some(name => typeof window[name] === 'function' && window[name]());
}

/** 떠 있는 안내 카드는 열린 창이 바뀌면 다시 자리를 잡는다 — 카드가 뜬 뒤 연 창(장비 등)의 내용을 덮고 있었다. */
let tutorialCardWindowSignature = '';
function refreshTutorialCardPlacement() {
    if (!activeTutorial) return;
    const signature = [...document.querySelectorAll('.tab-content.ui-window.ui-window-open')].map(node => node.id).join(',');
    if (signature === tutorialCardWindowSignature) return;
    tutorialCardWindowSignature = signature;
    placeTutorialCard();
}

function showNextTutorial() {
    refreshTutorialCardPlacement();
    if (activeTutorial || tutorialActionUi.active || tutorialQueue.length === 0 || isTutorialPresentationBlocked()) return;
    while (tutorialQueue.length) {
        const next = tutorialQueue.shift();
        if (storyJournalUi.allowsNotice(next.key) && contentProgression.canOpen(next.subtabId || next.tabId)) {
            activeTutorial = next;
            break;
        }
    }
    if (!activeTutorial) return;
    activeTutorial.title = stripDecorativeEmoji(activeTutorial.title);
    activeTutorial.body = stripDecorativeEmoji(activeTutorial.body);
    activeTutorialStep = 0;
    renderTutorialStep();
    document.getElementById('tutorial-overlay').classList.add('active');
    placeTutorialCard();
    setTutorialCallout(activeTutorial.tabId, 0);
    lastTime = Date.now();
}
let tutorialCallouts = [], tutorialCalloutTimer = null;
// 탭 단추가 메뉴 안에 숨어 있을 때 대신 깜빡일 여는 단추: PC 레일의 기타, 좁은 레일의 기타, 휴대폰의 전체.
const TUTORIAL_MENU_OPENERS = Object.freeze(['btn-ui-rail-misc', 'ui-rail-misc-toggle', 'btn-mobile-nav-more']);
function tutorialShown(node) {
    return !!(node && node.classList && node.getClientRects && node.getClientRects().length);
}
/** The menu buttons of the screen a card points to: the tab's own button when it is on screen; otherwise that button
 * (it lights up once its menu opens) plus the visible button that opens it — the merged launcher, 기타 or 전체. */
function tutorialMenuButtons(tabId) {
    const own = document.getElementById(`btn-${tabId}`);
    if (tutorialShown(own)) return [own];
    const group = typeof getMergedTabGroup === 'function' ? getMergedTabGroup(tabId) : null;
    const ids = [group ? `btn-${group[1].launcher}` : '', ...TUTORIAL_MENU_OPENERS];
    const opener = ids.map(id => (id ? document.getElementById(id) : null)).find(tutorialShown) || null;
    return [own, opener].filter(node => node && node.classList);
}
function clearTutorialCallout() {
    clearTimeout(tutorialCalloutTimer);
    tutorialCallouts.forEach(node => node.classList.remove('tutorial-callout'));
    tutorialCallouts = [];
}
/** Pulses those buttons while the card is up (holdMs 0) and a little after a plain 확인 (holdMs), so a newly
 * opened screen can be found again. */
function setTutorialCallout(tabId, holdMs) {
    clearTutorialCallout();
    tutorialCallouts = tabId ? tutorialMenuButtons(tabId) : [];
    tutorialCallouts.forEach(node => node.classList.add('tutorial-callout'));
    if (holdMs && tutorialCallouts.length) tutorialCalloutTimer = setTimeout(clearTutorialCallout, holdMs);
}
/** First passive point and first piece of gear for a new character: the old tab-unlock notices that carried these
 * guides never fire now (the tabs start open). Saves that saw those notices (seenAs), and later loops, skip them. */
const TUTORIAL_STARTER_GUIDES = Object.freeze([
    { key: 'tutorial_first_passive', seenAs: 'unlock_char', tabId: 'tab-char', title: '첫 스킬트리 포인트',
        body: '레벨이 올라 스킬트리 포인트를 얻었습니다.\n‘스킬트리’에서 시작 지점과 이어진 노드를 골라 찍으세요.\n오른 능력치는 ‘캐릭터’에서 확인할 수 있습니다.',
        starterDue: state => state.level >= 2 && state.passivePoints > 0 },
    { key: 'tutorial_first_gear', seenAs: 'unlock_items', tabId: 'tab-items', title: '첫 장비',
        body: '장비를 얻었습니다.\n‘장비’에서 아이템을 눌러 지금 착용한 것과 비교하세요.\n착용하면 생명 구슬 위에 DPS 변화가 뜹니다.',
        starterDue: state => (state.inventory || []).some(Boolean) }
]);
function queueStarterGuides(state) {
    if ((state.season || 1) > 1 || (state.loopCount || 0) > 0) return;
    const seen = state.seenTutorials || [];
    TUTORIAL_STARTER_GUIDES.filter(guide => !seen.includes(guide.seenAs) && guide.starterDue(state))
        .forEach(guide => queueTutorialNotice(guide.key, guide.title, guide.body, guide.tabId));
}
/** Wide screens: centre the guide card right above the player HUD (life orb and panel) so it covers neither the combat
 * log nor the minimap. Phones keep the bottom sheet from CSS. Coordinates are divided by the display zoom. */
function placeTutorialCard() {
    const overlay = document.getElementById('tutorial-overlay');
    if (!overlay || !overlay.style) return;
    const hud = document.querySelector('.combat-top-status.player-hud'), orb = document.getElementById('ui-hp-bar');
    const rect = hud ? hud.getBoundingClientRect() : null;
    if (!rect || !rect.width || uiDisplay.matches('(max-width: 1080px)')) {
        overlay.style.removeProperty('--tutorial-anchor-left');
        overlay.style.removeProperty('--tutorial-anchor-bottom');
        return;
    }
    const factor = uiDisplay.factor || 1, viewWidth = window.innerWidth / factor, width = Math.min(420, viewWidth - 24);
    const top = Math.min(rect.top, orb ? orb.getBoundingClientRect().top : rect.top) / factor;
    const centred = Math.max(12, Math.min(viewWidth - width - 12, (rect.left + rect.width / 2) / factor - width / 2));
    const left = tutorialLeftClearOfWindows(centred, width, factor);
    overlay.style.setProperty('--tutorial-anchor-left', `${Math.round(left)}px`);
    overlay.style.setProperty('--tutorial-anchor-bottom', `${Math.round(window.innerHeight / factor - top + 10)}px`);
}
/** An open window docked beside the HUD (equipment, skills…) keeps its content: the card slides left into the free
 * battlefield when there is room, otherwise it stays centred over the HUD. */
function tutorialLeftClearOfWindows(left, width, factor) {
    let limit = Infinity;
    document.querySelectorAll('.tab-content.ui-window.ui-window-open').forEach(node => {
        const rect = node.getBoundingClientRect();
        if (rect.width && rect.left / factor < left + width && rect.right / factor > left) limit = Math.min(limit, rect.left / factor);
    });
    return limit !== Infinity && limit - width - 12 >= 12 ? Math.min(left, limit - width - 12) : left;
}
window.addEventListener('resize', () => { if (activeTutorial) placeTutorialCard(); });
function advanceTutorial() {
    if (!activeTutorial) return;
    dismissTutorial(true);
}
function goBackTutorialStep() {
    if (!activeTutorial || activeTutorialStep <= 0) return;
    activeTutorialStep -= 1;
    renderTutorialStep();
}
/** 첫 스킬 젬 안내를 따라 하지 않고 닫으면 그 젬을 대신 장착한다 — 방치하는 플레이어는 기본 공격으로 싸우며 초반에 거듭
 * 쓰러졌다(검토 2026-10-01). 바꾸고 싶으면 '스킬 젬'에서 언제든 바꾼다. */
function equipSkippedStarterGem(key) {
    const name = game.starterGemTutorialPending;
    if (key !== 'tutorial_starter_gem_equip' || typeof name !== 'string' || game.activeSkill !== '기본 공격') return;
    changeSkill(name);
    if (game.activeSkill === name) showGameToast(`[${name}] 젬을 장착했습니다 · '스킬 젬'에서 바꿀 수 있습니다`, { tone: 'success' });
}

function dismissTutorial(openTarget) {
    if (!activeTutorial) return;
    const notice = activeTutorial, tabId = notice.tabId;
    document.getElementById('tutorial-overlay').classList.remove('active');
    activeTutorial = null;
    activeTutorialStep = 0;
    lastTime = Date.now();
    setTutorialCallout(openTarget ? null : tabId, 6000);
    // Phone notices held while the card was up: after the next card (if any) has had its turn.
    setTimeout(() => { if (typeof pumpMobileToastQueue === 'function') pumpMobileToastQueue(); }, 120);
    if (!openTarget) {
        equipSkippedStarterGem(notice.key);
        return setTimeout(showNextTutorial, 40);
    }
    if (tutorialActionUi.guideFor(notice.key)) return tutorialActionUi.start(notice);
    openTutorialTarget(notice);
    setTimeout(showNextTutorial, 40);
}
