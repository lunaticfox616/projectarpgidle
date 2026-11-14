import { clearTutorialCallout, placeTutorialCard, setTutorialCallout, revealTutorialTarget } from './tutorial-placement.mjs';
import { coachGuideFor, renderTutorialStep } from './tutorial-notice-markup.mjs';
import { scheduleViewFrame } from './view-frames.mjs';
import { scheduleTutorialTimer } from './tutorial-timers.mjs';
import { storySceneAllowsNotice } from '../domain/story-scenes.mjs';
import { coachEnsureCard, coachRefreshText, coachRest, coachHushHover, coachPlaceCard, coachFindTarget, coachLeftGuideContext, coachDockCard, coachSetGuideTarget, coachRevealStep, coachClearHighlight, coachFloatCard } from './tutorial-coach-card.mjs';

/** "○○ 열기": an unlock card opens its exact screen (sub-tab, explore list, section); other cards open their tab. */
export function openTutorialTarget(runtime, notice) {
    if (notice.key === runtime.deps.EXPLORATION_REGIONS.guides['outside-chaos'].noticeKey) {
        return runtime.deps.contentUnlockUi.openProgressTarget('outside-chaos');
    }
    const contentId = runtime.deps.contentUnlockUi.noticeContentId(notice);
    if (contentId && runtime.deps.contentUnlockUi.open(contentId)) return;
    openSavedTutorialRoute(runtime, notice);
}

export function openSavedTutorialRoute(runtime, notice) {
    const { tabId, subtabId } = notice;
    if (tabId) (0, runtime.deps.switchTab)(tabId, { keepWindowOpen: true });
    if (subtabId && tabId === 'tab-items') (0, runtime.deps.switchItemSubtab)(subtabId);
    if (subtabId && tabId === 'tab-map') {
        openMapTutorialTarget(runtime, subtabId);
        runtime.deps.explorationAtlasUi.openEntryPage(subtabId);
    }
    if (notice.atlasView && typeof runtime.deps.atlasUi === 'object') runtime.deps.atlasUi.setView(notice.atlasView);
}

/** A map card may aim at an explore sub-tab (map-explore-*): open the zones tab, then that explore tab. */
export function openMapTutorialTarget(runtime, subtabId) {
    if (!subtabId.startsWith('map-explore-')) return (0, runtime.deps.switchMapSubtab)(subtabId);
    (0, runtime.deps.switchMapSubtab)('map-tab-zones');
    (0, runtime.deps.switchMapExploreSubtab)(subtabId);
}

/** A guide card waits while the act title card is on screen (a story scene does not: the title card waits for it). */
export function tutorialWaitsForTitleCard(runtime) {
    const next = runtime.deps.tutorialQueue[0];
    if (!next || String(next.key).startsWith('story_')) return false;
    return typeof runtime.deps.actTitleCard === 'object' && typeof runtime.deps.actTitleCard.busy === 'function' && runtime.deps.actTitleCard.busy();
}

export function isTutorialPresentationBlocked(runtime) {
    if (runtime.deps.game.pendingLoopHeroSelection || runtime.deps.game.pendingLoopReady || runtime.deps.game.pendingLoopDecision) return true;
    // 방치 전투를 되돌리는 중이거나 그 결과 창이 열려 있으면 이야기 · 안내 카드는 결과를 닫은 뒤에 뜬다(두 판이 겹쳤다).
    if (runtime.deps.backgroundCombatRuntime.processing || runtime.deps.document.getElementById('background-combat-result-overlay')) return true;
    if (tutorialWaitsForTitleCard(runtime) || tutorialYieldsToMenus(runtime) || tutorialWaitsForReward(runtime)) return true;
    return ['isStartupOverlayOpen', 'isLoadingOverlayOpen', 'isRewardOpen', 'isDeathOverlayOpen', 'isLoopHeroSelectOpen', 'isOpeningIntroOpen']
        .some(name => typeof runtime.deps.window[name] === 'function' && runtime.deps.window[name]());
}

/** 방치 결과 창이 뜰 때 이미 떠 있던 이야기 · 안내 카드는 접어 줄 맨 앞에 돌려놓는다 — 다시 불러온 뒤 이야기 카드 위에
 * 결과 창이 겹쳤다(검토 6차). 결과를 닫으면 showNextTutorial이 다시 띄운다. */
export function yieldTutorialCardToResult(runtime) {
    if (!runtime.deps.activeTutorial) return;
    runtime.deps.tutorialQueue.unshift(runtime.deps.activeTutorial);
    runtime.deps.document.getElementById('tutorial-overlay')?.classList.remove('active');
    clearTutorialCallout(runtime);
    runtime.deps.activeTutorial = null;
    runtime.deps.activeTutorialStep = 0;
}

/** 열린 메뉴나 확인 창을 안내 카드가 가리지 않도록 끝날 때까지 기다린다. */
export function tutorialYieldsToMenus(runtime) {
    return runtime.deps.document.body.classList.contains('mobile-tab-drawer-open')
        || !!runtime.deps.document.querySelector('dialog:modal, .selection-overlay, .game-choice-overlay');
}

export function refreshTutorialCardPlacement(runtime) {
    if (!runtime.deps.activeTutorial) return;
    const signature = [...runtime.deps.document.querySelectorAll('.tab-content.ui-window.ui-window-open')].map(node => node.id).join(',');
    if (signature === runtime.state.tutorialCardWindowSignature) return;
    runtime.state.tutorialCardWindowSignature = signature;
    placeTutorialCard(runtime);
}

/** The first map notice sends the player to the act reward; after claiming it, the map button remains the way back. */
export function tutorialNoticeAllowed(runtime, notice) {
    if (notice.key === 'unlock_map' && (runtime.deps.game.claimedActRewards || []).includes(0)) return false;
    if (notice.key === 'tutorial_passive_tree_unlock' && runtime.deps.contentProgression.isUnlocked('passiveTree')) return false;
    if (notice.key === 'tutorial_first_passive' && runtime.deps.game.passives.length > 0) return false;
    return storySceneAllowsNotice(runtime.deps.game, notice.key) && runtime.deps.contentProgression.canOpen(notice.tabId) && runtime.deps.contentProgression.canOpen(notice.subtabId);
}

export function tutorialWaitsForReward(runtime) {
    return !!runtime.deps.tutorialQueue[0] && !String(runtime.deps.tutorialQueue[0].key).startsWith('story_') && (0, runtime.deps.actRewardPromptPending)();
}

export function tutorialQueueIsHeld(runtime) { return coachHoldsQueue(runtime) || runtime.deps.Date.now() < runtime.state.coachQuietUntil; }

/** 안내 기록(game.tutorialHistory)이 바뀌면 바로 저장한다. 시작 화면이 떠 있는 동안은 빈 게임이라 저장하지 않는다. */
export function saveTutorialHistoryChange(runtime) {
    const revision = runtime.deps.window.GameModules.state.tutorials.revision;
    if (revision === runtime.state.savedTutorialRevision || (typeof runtime.deps.isStartupOverlayOpen === 'function' && (0, runtime.deps.isStartupOverlayOpen)())) return;
    runtime.state.savedTutorialRevision = revision;
    (0, runtime.deps.queueImportantSave)(0);
}

/** 지금 든 무기로 쓸 수 없는 룬을 가졌는가(무기를 바꿔 기본 공격으로 물러난 주 공격 룬 포함): 무기 규칙 안내를 띄울 때. */
export function ownsWeaponBlockedRune(runtime, state) {
    // 첫 처치의 직업 무기를 기다리며 쉬는 기초 스킬은 세지 않는다: 그 무기를 들면 바로 돌아온다(js/combat-kill-rewards.js grantLoopStarterWeaponOnFirstKill).
    if (!state.loopStarterWeaponGranted || state.starterWeaponTutorialPending != null) return false;
    const stance = (0, runtime.deps.getEquippedWeaponStance)();
    return !!state.weaponBlockedSkill || (state.skills || []).some(name => !(0, runtime.deps.isSkillRuneUsableWithStance)(name, stance));
}

export function queueStarterGuides(runtime, state) {
    queuePassiveTreeGuides(runtime, state);
    if ((state.season || 1) > 1 || (state.loopCount || 0) > 0) return;
    runtime.deps.contentProgression.opening.sync(state);
    const seen = state.seenTutorials || [];
    runtime.state.TUTORIAL_STARTER_GUIDES.filter(guide => !seen.includes(guide.seenAs) && runtime.deps.contentProgression.opening.canOpen(state, guide.tabId) && guide.starterDue(state))
        .forEach(guide => (0, runtime.deps.queueTutorialNotice)(guide.key, guide.title, guide.body, guide.tabId));
}

export function queuePassiveTreeGuides(runtime, state) {
    if (state.season < 2) return;
    if (!runtime.deps.contentProgression.canOpen('tab-char', state)) {
        if (state.season === 2) (0, runtime.deps.queueTutorialNotice)('tutorial_passive_tree_unlock', (0, runtime.deps._t)('스킬트리 해금'),
            (0, runtime.deps._t)('해금 포인트 1점을 써서 스킬트리를 여세요.'), 'tab-unlocks');
        return;
    }
    if (state.level < 2 || state.passivePoints < 1 || state.passives.length) return;
    if (state.seenTutorials.includes('tutorial_first_passive') || state.seenTutorials.includes('unlock_char')) return;
    (0, runtime.deps.queueTutorialNotice)('tutorial_first_passive', (0, runtime.deps._t)('첫 스킬트리 포인트'),
        (0, runtime.deps._t)('시작점 옆에 빛나는 노드 하나를 골라 1포인트를 쓰세요.'), 'tab-char');
}

export function advanceTutorial(runtime) {
    if (!runtime.deps.activeTutorial) return;
    dismissTutorial(runtime, true);
}

/** 첫 무기 안내를 따라 하지 않고 닫으면 그 무기를 대신 장착한다: 맨손이면 기초 스킬을 못 쓰고 기본 공격으로만 싸운다
 * (예전 첫 스킬룬 안내와 같은 까닭, 검토 2026-10-01). 바꾸고 싶으면 '장비'에서 언제든 바꾼다. */
export function equipSkippedStarterWeapon(runtime, key) {
    const item = (0, runtime.deps.getStarterWeaponTutorialTarget)();
    if (key !== runtime.deps.basicSkills.weaponGuide || !item) return;
    if ((0, runtime.deps.equipItemById)(item.id)) (0, runtime.deps.showGameToast)((0, runtime.deps._t)("[{name}] 무기를 장착했습니다, '장비'에서 바꿀 수 있습니다", { name: (0, runtime.deps._t)(item.name) }), { tone: 'success' });
    runtime.deps.game.starterWeaponTutorialPending = null;
}

/** 따라 하기를 하지 않고 닫은 안내의 뒷정리: 첫 무기는 장착하고, 그루터기 함 시작 선물은 판에 놓는다. */
export function applySkippedGuide(runtime, key) {
    if (runtime.deps.contentProgression.opening.applies(runtime.deps.game)) return;
    equipSkippedStarterWeapon(runtime, key);
    plantSkippedStumpStarter(runtime, key);
}

/** 그루터기 함 시작 선물 안내를 닫으면 받은 씨앗을 판의 가운데부터 대신 놓는다(첫 무기와 같은 이유). */
export function plantSkippedStumpStarter(runtime, key) {
    if (!runtime.state.TUTORIAL_GUIDED_CONTENT_KEYS.has(key) || !runtime.deps.game.stumpBox || !runtime.deps.game.stumpBox.acquired) return;
    if (runtime.deps.stumpBox.plantStored(runtime.deps.game) > 0) (0, runtime.deps.showGameToast)((0, runtime.deps._t)('그루터기 함: 받은 씨앗을 배치했습니다'), { tone: 'success' });
}

/** A loaded save owns its pending/displayed records. Discard the old foreground without acknowledging it. */
export function discardQueuedNotices(runtime) {
    runtime.deps.tutorialQueue.length = 0;
    runtime.deps.window.GameModules.state.tutorials.reset();
    coachFinish(runtime, false, true);
    if (!runtime.deps.activeTutorial) return;
    runtime.deps.document.getElementById('tutorial-overlay').classList.remove('active');
    runtime.deps.activeTutorial = null;
    runtime.deps.activeTutorialStep = 0;
}

export function dismissTutorial(runtime, openTarget, status = 'read') {
    if (!runtime.deps.activeTutorial) return;
    const notice = runtime.deps.activeTutorial, tabId = notice.tabId;
    runtime.deps.window.GameModules.state.tutorials.transition(runtime.deps.game, notice.key, status);
    runtime.deps.document.getElementById('tutorial-overlay').classList.remove('active');
    runtime.deps.activeTutorial = null;
    runtime.deps.activeTutorialStep = 0;
    runtime.deps.window.GameModules.state.session.lastTime = runtime.deps.Date.now();
    setTutorialCallout(runtime, openTarget ? null : tabId, 6000);
    // Phone notices held while the card was up: after the next card (if any) has had its turn.
    scheduleTutorialTimer(runtime, () => { if (typeof runtime.deps.pumpMobileToastQueue === 'function') (0, runtime.deps.pumpMobileToastQueue)(); }, 120);
    if (!openTarget) {
        if (status === 'read') applySkippedGuide(runtime, notice.key);
        (0, runtime.deps.queueImportantSave)(0);
        return coachWaitBetweenNotices(runtime);
    }
    (0, runtime.deps.queueImportantSave)(0);
    if (coachGuideFor(runtime, notice.key)) return coachStart(runtime, notice);
    openTutorialTarget(runtime, notice);
    if (['tutorial_first_gear', 'unlock_items'].includes(notice.key)) coachOpenEquipment(runtime);
    coachWaitBetweenNotices(runtime);
}

export function showNextTutorial(runtime) {
    if (runtime.deps.gameEntryRunning || runtime.deps.game.isGuideReplay) return;
    runtime.deps.window.GameModules.state.tutorials.sync(runtime.deps.game);
    saveTutorialHistoryChange(runtime);
    coachExpireNotice(runtime, runtime.deps.Date.now());
    refreshTutorialCardPlacement(runtime);
    if (runtime.deps.activeTutorial || tutorialQueueIsHeld(runtime) || runtime.deps.tutorialQueue.length === 0 || isTutorialPresentationBlocked(runtime)) return;
    while (runtime.deps.tutorialQueue.length) {
        const next = runtime.deps.tutorialQueue.shift();
        if (tutorialNoticeAllowed(runtime, next)) {
            runtime.deps.activeTutorial = next;
            runtime.state.notice = next;
            break;
        }
        runtime.deps.window.GameModules.state.tutorials.transition(runtime.deps.game, next.key, 'unread');
    }
    if (!runtime.deps.activeTutorial) return;
    runtime.deps.window.GameModules.state.tutorials.transition(runtime.deps.game, runtime.deps.activeTutorial.key, 'displayed');
    (0, runtime.deps.queueImportantSave)(0);
    runtime.state.coachNoticeUntil = runtime.deps.Date.now() + 8000;
    const activeTutorial = runtime.deps.activeTutorial;
    activeTutorial.title = (0, runtime.deps.stripDecorativeEmoji)(activeTutorial.title);
    activeTutorial.body = (0, runtime.deps.stripDecorativeEmoji)(activeTutorial.body);
    runtime.deps.activeTutorialStep = 0;
    renderTutorialStep(runtime);
    runtime.deps.document.getElementById('tutorial-overlay').classList.add('active');
    placeTutorialCard(runtime);
    setTutorialCallout(runtime, runtime.deps.activeTutorial.tabId, 0);
    runtime.deps.window.GameModules.state.session.lastTime = runtime.deps.Date.now();
}

export function coachWaitBetweenNotices(runtime) {
    runtime.state.coachQuietUntil = runtime.deps.Date.now() + runtime.state.TUTORIAL_CHAIN_GAP_MS;
    scheduleTutorialTimer(runtime, runtime.handlers.showNextTutorial, runtime.state.TUTORIAL_CHAIN_GAP_MS + 40);
}

export function coachRequiresAttention(runtime, notice) {
    return !!notice && (runtime.state.TUTORIAL_START_KEYS.has(notice.key) || runtime.state.TUTORIAL_GUIDED_CONTENT_KEYS.has(notice.key) || String(notice.key).startsWith('story_'));
}

export function coachExpireNotice(runtime, now) {
    if (!runtime.deps.activeTutorial || coachRequiresAttention(runtime, runtime.deps.activeTutorial) || now < runtime.state.coachNoticeUntil) return;
    const card = runtime.deps.document.querySelector('#tutorial-overlay .tutorial-card');
    if (card?.matches(':hover, :focus-within')) return;
    dismissTutorial(runtime, false, 'unread');
}

export function coachAnnounceRune(runtime) {
    const key = 'unlock_skills';
    if (runtime.deps.game.seenTutorials.includes(key) || runtime.deps.game.tutorialHistory.some(row => row.key === key) || !coachGuideFor(runtime, key)) return;
    runtime.deps.game.noti.skills = true;
    (0, runtime.deps.queueTutorialNotice)(key, (0, runtime.deps._t)('새 스킬룬'), (0, runtime.deps._t)('새 룬을 얻었습니다.\n‘스킬룬’에서 룬을 눌러 효과를 보고 공격 룬을 바꿔 보세요.'), 'tab-skills');
}

export function coachStart(runtime, notice, open = true) {
    const guide = coachGuideFor(runtime, notice.key);
    if (!guide) return;
    coachFinish(runtime, false, true);
    if (guide === runtime.state.coachGuides.unlock_items) runtime.deps.equipmentInventoryInteraction.focus(null);
    const before = guide.begin ? guide.begin(notice) : guide.read();
    const action = { notice, guide, before, step: guide.step?.(before), startedAt: runtime.deps.Date.now(), contextual: !open, owner: runtime.deps.game };
    runtime.state.coachActive = action;
    coachEnsureCard(runtime);
    runtime.state.coachCard.hidden = false;
    runtime.state.coachCard.classList.remove('is-away');
    runtime.state.coachCard.querySelector('[data-skip]').hidden = notice.replay === true;
    coachRefreshText(runtime);
    coachRest(runtime);
    if (guide.spotlight) guide.spotlight(true, () => {
        if (runtime.active && runtime.state.coachActive === action && runtime.deps.game === action.owner) coachReposition(runtime);
    });
    if (open) coachOpenTarget(runtime);
    else {
        coachHushHover(runtime);
        scheduleViewFrame(runtime, () => { if (runtime.state.coachActive === action) coachRefresh(runtime); });
    }
}

export function coachFollowOpeningTab(runtime, tabId) {
    if (runtime.deps.game.isGuideReplay) return;
    if (tabId === 'tab-skills') runtime.deps.systemTutorialUi.visit(runtime.deps.game.skillSubtab);
    if (!runtime.deps.contentProgression.opening.applies(runtime.deps.game)) return;
    if (runtime.deps.contentProgression.opening.visit(runtime.deps.game, tabId)) (0, runtime.deps.queueImportantSave)(180);
    coachFollowOpeningGuide(runtime, tabId);
}

export function coachFollowOpeningGuide(runtime, tabId) {
    coachLeaveContextualGuide(runtime, tabId);
    if (runtime.state.coachActive) return;
    const keys = runtime.state.OPENING_TAB_GUIDES[tabId];
    if (!keys) return;
    const pendingWeapon = tabId === 'tab-items' && !!(0, runtime.deps.getStarterWeaponTutorialTarget)();
    const notice = runtime.deps.game.tutorialHistory.find(row => keys.includes(row.key) && (row.status === 'unread' || pendingWeapon));
    if (!notice || !coachGuideFor(runtime, notice.key)) return;
    if (notice.key !== 'tutorial_first_gear') runtime.deps.window.GameModules.state.tutorials.transition(runtime.deps.game, notice.key, 'read');
    coachStart(runtime, notice, false);
    const action = runtime.state.coachActive;
    if (tabId === 'tab-items') scheduleViewFrame(runtime, () => {
        if (runtime.state.coachActive === action) coachOpenEquipment(runtime);
    });
}

export function coachLeaveContextualGuide(runtime, tabId) {
    if (runtime.state.coachActive?.contextual && runtime.state.coachActive.notice.tabId !== tabId) coachFinish(runtime, false, true);
}

export function coachOpenTarget(runtime) {
    const action = runtime.state.coachActive;
    if (!action) return;
    coachHushHover(runtime);
    (0, runtime.deps.hideInfoTooltip)();
    coachOpenGuidePane(runtime, action);
    scheduleViewFrame(runtime, () => {
        if (runtime.state.coachActive !== action) return;
        coachRefresh(runtime);
        if (runtime.state.coachActive !== action || !runtime.state.coachHighlighted) return;
        revealTutorialTarget(runtime, runtime.state.coachHighlighted);
        if (runtime.state.coachCard.classList.contains('is-docked')) runtime.state.coachCard.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        else coachPlaceCard(runtime, runtime.state.coachHighlighted, true);
    });
}

export function coachOpenGuidePane(runtime, action) {
    const group = (0, runtime.deps.getMergedTabGroup)(action.notice.tabId);
    if (group) (0, runtime.deps.switchMergedTabSubtab)(group[0], action.notice.tabId);
    else (0, runtime.deps.switchTab)(action.notice.tabId, { keepWindowOpen: true });
    if (action.guide.open) return action.guide.open();
    if (action.notice.key === 'tutorial_passive_tree_unlock') runtime.deps.contentUnlockUi.select('passiveTree');
    if (action.notice.tabId === 'tab-items') coachOpenEquipment(runtime);
    if (action.notice.tabId === 'tab-skills') (0, runtime.deps.switchSkillSubtab)('skill-tab-equip');
}

export function coachOpenEquipment(runtime) {
    (0, runtime.deps.switchItemSubtab)('item-tab-equip');
    if ((0, runtime.deps.isMobilePrimaryNavigationEnabled)()) {
        const bag = runtime.state.coachActive?.before?.keys ? runtime.state.coachActive.before.keys.length > 0 : runtime.deps.game.inventory.some(Boolean);
        (0, runtime.deps.setEquipmentMobilePane)(bag ? 'inventory' : 'loadout');
    }
}

export function coachCurrentTarget(runtime, action) {
    const step = action.guide.step?.(action.before);
    if (step?.body !== action.step?.body) {
        action.step = step;
        coachRefreshText(runtime);
    }
    return coachFindTarget(runtime, step?.selector ?? action.guide.selector);
}

export function coachRefresh(runtime) {
    const action = runtime.state.coachActive;
    if (!action) return;
    if (action.guide.completed(action.guide.read(action.before), action.before)) return coachFinish(runtime, true);
    if (coachLeftGuideContext(runtime, action)) return coachFinish(runtime, false, true);
    const target = coachCurrentTarget(runtime, action);
    const docked = coachDockCard(runtime, target, action.step);
    coachSetGuideTarget(runtime, target);
    const away = !target && !runtime.deps.document.getElementById(action.notice.tabId)?.classList.contains('active');
    runtime.state.coachCard.classList.toggle('is-away', away);
    runtime.state.coachCard.querySelector('[data-open]').hidden = !away;
    if (!target) return coachRest(runtime);
    coachRevealStep(runtime, action, target, docked);
    if (!docked) coachPlaceCard(runtime, target);
}

export function coachReposition(runtime) {
    runtime.state.coachPlacedFor = null;
    coachRefresh(runtime);
}

export function coachHoldsQueue(runtime) {
    if (!runtime.state.coachActive) return false;
    return !runtime.state.coachCard.classList.contains('is-away') || runtime.deps.Date.now() - runtime.state.coachActive.startedAt < runtime.state.TUTORIAL_GUIDE_OPENING_MS;
}

export function coachCompleteGuideAction(runtime, action) {
    if (!runtime.active || runtime.deps.game !== action.owner) return;
    if (action.notice.onComplete) return action.notice.onComplete();
    const key = 'action_' + action.notice.key;
    if (!runtime.deps.game.seenTutorials.includes(key)) runtime.deps.game.seenTutorials.push(key);
    const result = action.guide.result ? (0, runtime.deps._t)(action.guide.result(action.before)) : action.guide.title + ' 완료';
    (0, runtime.deps.showGameToast)(result, { tone: 'success' });
}

export function coachDismissGuideAction(runtime, action) {
    if (!runtime.active || runtime.deps.game !== action.owner) return;
    if (action.guide.view) runtime.deps.game.seenTutorials.push('dismiss_' + action.notice.key);
    else applySkippedGuide(runtime, action.notice.key);
}

export function coachFinish(runtime, completed, withoutSkip = false) {
    const action = runtime.state.coachActive;
    runtime.state.coachActive = null;
    runtime.state.coachPlacedFor = null;
    coachClearHighlight(runtime);
    if (runtime.state.coachCard) {
        runtime.state.coachCard.hidden = true;
        coachFloatCard(runtime);
    }
    if (!action) return;
    if (action.guide.spotlight) action.guide.spotlight(false);
    if (withoutSkip) return coachWaitBetweenNotices(runtime);
    if (action.notice.key === 'tutorial_first_gear') runtime.deps.window.GameModules.state.tutorials.transition(runtime.deps.game, action.notice.key, 'read');
    if (completed) coachCompleteGuideAction(runtime, action);
    else coachDismissGuideAction(runtime, action);
    (0, runtime.deps.queueImportantSave)(0);
    coachWaitBetweenNotices(runtime);
}
