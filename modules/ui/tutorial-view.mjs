import { tutorialNoticeAllowed, showNextTutorial, openTutorialTarget, isTutorialPresentationBlocked, yieldTutorialCardToResult, refreshTutorialCardPlacement, tutorialQueueIsHeld, saveTutorialHistoryChange, ownsWeaponBlockedRune, queueStarterGuides, advanceTutorial, equipSkippedStarterWeapon, applySkippedGuide, discardQueuedNotices, dismissTutorial, coachWaitBetweenNotices, coachRequiresAttention, coachExpireNotice, coachAnnounceRune, coachStart, coachFollowOpeningTab, coachFollowOpeningGuide, coachLeaveContextualGuide, coachOpenTarget, coachOpenGuidePane, coachOpenEquipment, coachCurrentTarget, coachRefresh, coachReposition, coachHoldsQueue, coachCompleteGuideAction, coachDismissGuideAction, coachFinish } from './tutorial-notice-flow.mjs';
import { tutorialShown, clearTutorialCallout, rectsOverlap, tutorialSamePlacement, tutorialRectOf, tutorialRectFits, tutorialVisibleRects, tutorialCardSpots, revealTutorialTarget, setTutorialCallout, placeTutorialCard } from './tutorial-placement.mjs';
import { practiceGearStep, practiceEquippedKeys, practiceRuneStep, practiceEquippedRunes, practiceSeedStep, practicePassiveStep, createPracticeStep, practiceGearChoices, practiceGearCards, practiceWorn, practiceRuneChoices, practiceRuneCards, practiceEmptyStumpCell, practiceSeedIds, practiceSeedCards } from './tutorial-practice.mjs';
import { tutorialMarkup, tutorialQuoteHtml, tutorialBodyHtml, renderTutorialStep, settingsMenuPath, coachNoticeBody, coachGuideFor } from './tutorial-notice-markup.mjs';
import { coachRefreshText, coachEnsureCard, coachDockCard, coachCanDockCard, coachFloatCard, coachInlineGuideAnchor, coachLeftGuideContext, coachRevealStep, coachPlaceCard, coachAvoidRects, coachKeepsClear, coachHomeRect, coachRest, coachHushHover, coachUnhush, coachHushesTooltipAt, coachClearTooltipSpot, coachFindTarget, coachSetGuideTarget, coachClearHighlight } from './tutorial-coach-card.mjs';
import { listenView, releaseViewEvents, releaseViewTarget } from './view-events.mjs';
import { cancelViewFrames } from './view-frames.mjs';
import { clearTutorialTimers } from './tutorial-timers.mjs';

/** Owns tutorial presentation; history and queue remain in the tutorial state domain. */
export function createTutorialView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [], frames: new Set(), timers: new Set() };
    const handlers = { ...tutorialNoticeHandlers(), ...tutorialCoachHandlers() };
    for (const [name, handler] of Object.entries(handlers)) {
        runtime.handlers[name] = (...args) => {
            if (!runtime.active) return;
            syncTutorialOwner(runtime);
            return handler(runtime, ...args);
        };
    }
    initializeTutorialLayout(runtime);
    initializeTutorialPractice(runtime);
    initializeTutorialCoach(runtime);
    initializeTutorialNotices(runtime);
    runtime.state.owner = deps.game;
    runtime.state.notice = null;
    runtime.state.pauseToggle = null;
    runtime.handlers.practiceStep = createPracticeStep();
    runtime.api = TutorialViewApi(runtime);
    installTutorialEvents(runtime);
    return runtime.api;
}

function initializeTutorialLayout(runtime) {
    runtime.state.TUTORIAL_CARD_GAP = 12;
    runtime.state.TUTORIAL_CARD_EDGE = 8;
    runtime.state.TUTORIAL_TOOLTIPS = Object.freeze(['#info-tooltip', '#canvas-tooltip', '#item-tooltip-box']);
    runtime.state.TUTORIAL_HUSH_WAKERS = Object.freeze(['pointermove', 'pointerdown', 'wheel']);
    runtime.state.TUTORIAL_GUIDE_OPENING_MS = 1500;
}

function initializeTutorialPractice(runtime) {
    runtime.state.practiceEquipButton = '#ui-equipment-inventory-inspector .equipment-card-primary:not(:disabled)';
    runtime.state.practiceRuneEquipButton = '#gem-selection:popover-open .gem-equip-primary:not(:disabled)';
    runtime.state.practiceEmptyCell = '#stump-box-board .stump-board.is-box .stump-cell.is-target';
    runtime.state.practicePlacement = '#stump-placement-preview:not([hidden]) [data-stump-action="placement-apply"]';
    runtime.state.practicePassivePanel = '#passive-mobile-detail:not([hidden])';
    runtime.state.practicePassiveConfirm = runtime.state.practicePassivePanel + ' [data-passive-confirm]:not(:disabled)';
    runtime.state.tutorialPractice = Object.freeze({
        gear: {
            available: () => !runtime.deps.game.woodsmanBuildLock && (practiceGearChoices(runtime).length > 0 || practiceEquippedKeys(runtime).length > 0),
            begin: () => {
                const keys = practiceGearChoices(runtime).map(runtime.deps.equipmentLoadoutRuntime.ensureItemIdentity);
                return { keys, cards: practiceGearCards(runtime, keys) };
            },
            step: runtime.handlers.practiceGearStep, read: runtime.handlers.practiceEquippedKeys,
            completed: (current, before) => before.keys.length ? current.some(key => before.keys.includes(key)) : practiceWorn(runtime),
            result: before => before.keys.length ? '장비를 장착했습니다.' : '착용 장비의 옵션을 확인했습니다.'
        },
        rune: {
            available: () => !runtime.deps.game.woodsmanBuildLock && practiceRuneChoices(runtime).length > 0,
            begin: () => {
                const choices = practiceRuneChoices(runtime);
                return { choices, cards: practiceRuneCards(runtime, choices), kinds: [...new Set(choices.map(runtime.deps.skillGemBoardUi.kindOf))] };
            },
            step: runtime.handlers.practiceRuneStep, read: runtime.handlers.practiceEquippedRunes,
            completed: (current, before) => current.some(name => before.choices.includes(name)),
            result: () => '스킬룬을 장착했습니다.'
        },
        seed: {
            available: () => !runtime.deps.game.woodsmanBuildLock && practiceEmptyStumpCell(runtime) && practiceSeedIds(runtime).length > 0,
            begin: () => { const ids = practiceSeedIds(runtime); return { ids, cards: practiceSeedCards(runtime, ids) }; },
            keepClear: ['#stump-box-detail:popover-open'],
            step: runtime.handlers.practiceSeedStep, read: () => runtime.deps.game.stumpBox.board,
            completed: (current, before) => current.some(id => before.ids.includes(id)),
            result: () => '씨앗을 심었습니다. 이제 적을 처치하면 자랍니다.'
        },
        passiveStep: runtime.handlers.practicePassiveStep
    });
}

function initializeTutorialCoach(runtime) {
    runtime.state.TUTORIAL_CHAIN_GAP_MS = 700;
    runtime.state.coachNoticeUntil = 0;
    runtime.state.coachQuietUntil = 0;
    runtime.state.coachActive = null;
    runtime.state.coachHighlighted = null;
    runtime.state.coachCard = null;
    runtime.state.coachPlacedFor = null;
    runtime.state.coachHush = null;
    initializeTutorialGuideDefinitions(runtime);
}

function initializeTutorialGuideDefinitions(runtime) {
    runtime.state.coachGuides = {
        ...runtime.deps.systemTutorialUi.guides,
        unlock_items: {
            ...runtime.state.tutorialPractice.gear,
            title: '장비 비교와 교체'
        },
        tutorial_passive_tree_unlock: {
            available: () => !runtime.deps.contentProgression.isUnlocked('passiveTree'),
            selector: ['#content-unlock-panel [data-unlock-content="passiveTree"]'],
            title: '스킬트리 해금',
            body: '해금 포인트 1점을 써서 스킬트리를 여세요.',
            step: () => {
                const balance = runtime.deps.contentProgression.balance();
                return { body: balance > 0
                        ? (0, runtime.deps._t)('해금 포인트 {balance}점 중 1점을 씁니다. 해금 후 {remaining}점이 남습니다.', { balance, remaining: balance - 1 })
                        : (0, runtime.deps._t)('해금 포인트 1점을 써서 스킬트리를 여세요.') };
            },
            read: () => runtime.deps.contentProgression.isUnlocked('passiveTree'),
            completed: opened => opened
        },
        unlock_char: {
            available: () => runtime.deps.game.passivePoints > 0 && !runtime.deps.game.woodsmanBuildLock,
            // 휴대폰에서 노드 상세가 열려 있으면 그 "포인트 사용" 단추를, 아니면 트리 캔버스를 가리킨다.
            title: '첫 스킬트리 투자',
            body: '시작점 옆에 빛나는 노드 하나를 골라 1포인트를 쓰세요.',
            step: runtime.state.tutorialPractice.passiveStep,
            begin: () => ({ nodes: new Set(runtime.deps.game.passives), points: runtime.deps.game.passivePoints }),
            read: () => runtime.deps.game.passives,
            completed: (current, before) => runtime.deps.game.passivePoints < before.points && current.some(id => !before.nodes.has(id)),
            result: () => '스킬트리 노드에 포인트를 사용했습니다.',
            // 6~8px 노드는 연결선 강조만으로 보이지 않았다: 찍을 수 있는 노드에 고리를 켜고, 카드는 캔버스 대신 그 노드 무리 옆에 둔다
            // (트리는 탭을 연 뒤 40ms에 처음 그려지므로 그때 카드 자리를 다시 잡는다).
            spotlight: (on, whenDrawn) => runtime.deps.passiveTreeGuide.show(on, whenDrawn),
            focus: target => (target.id === 'tree-canvas' ? runtime.deps.passiveTreeGuide.screenRect() : null)
        },
        unlock_skills: {
            ...runtime.state.tutorialPractice.rune,
            title: '스킬룬 장착',
            keepClear: ['#gem-selection:popover-open', '#tab-skills .is-gem-selected']
        },
        starter_weapon: {
            // 첫 루프의 시작 무기(js/combat-kill-rewards.js grantLoopStarterWeaponOnFirstKill, 2026-11-09): 장비 상세가 열려 있으면 그 '장착' 단추를, 아니면 가방의 무기를 가리킨다.
            selector: ['#tab-items .equipment-card-primary', '#ui-inventory-list .equipment-grid-item'],
            title: '무기 장착',
            body: '가방의 무기를 누르고 ‘장착’을 누르세요. 무기를 들면 기초 스킬로 싸웁니다.',
            read: () => (0, runtime.deps.getEquippedWeaponStance)(),
            completed: current => current !== 'unarmed'
        },
        unlock_stump_box: {
            ...runtime.state.tutorialPractice.seed,
            title: '그루터기 함에 심기'
        }
    };
    runtime.state.coachAliases = { tutorial_starter_gem_equip: 'starter_weapon', tutorial_first_passive: 'unlock_char', tutorial_first_gear: 'unlock_items',
        tutorial_stump_starter: 'unlock_stump_box' };
    runtime.state.coachDockAnchor = undefined;
}

function initializeTutorialNotices(runtime) {
    runtime.state.TUTORIAL_START_KEYS = new Set(['tutorial_battle_basics', 'tutorial_starter_gem_equip', 'opening_auto', 'tutorial_first_passive', 'tutorial_first_gear',
        'unlock_char', 'unlock_items', 'unlock_skills', 'tutorial_passive_tree_unlock']);
    runtime.state.TUTORIAL_GUIDED_CONTENT_KEYS = new Set(['unlock_stump_box', 'tutorial_stump_starter']);
    runtime.state.OPENING_TAB_GUIDES = Object.freeze({
        'tab-items': [runtime.deps.basicSkills.weaponGuide, 'tutorial_first_gear'],
        'tab-char': ['tutorial_first_passive'],
        'tab-stump': ['unlock_stump_box', 'tutorial_stump_starter']
    });
    runtime.state.TUTORIAL_KIND_LABELS = Object.freeze({ start: '시작 안내', content: '새 콘텐츠', loop: '새 루프', notice: '알림' });
    runtime.state.TUTORIAL_TAB_NAMES = Object.freeze({
        'tab-character': '캐릭터', 'tab-char': '스킬트리', 'tab-items': '장비', 'tab-skills': '스킬룬', 'tab-map': '지도', 'tab-unlocks': '해금',
        'tab-season': '루프 패시브', 'tab-traits': '전직', 'tab-talent': '재능', 'tab-codex': '도감',
        'tab-stump': '그루터기 함', 'tab-settings': '설정', 'tab-journal': '기록', 'tab-records': '전적', 'tab-trade': '거래'
    });
    runtime.state.tutorialCardWindowSignature = '';
    runtime.state.savedTutorialRevision = -1;
    runtime.state.tutorialCallouts = [];
    runtime.state.tutorialCalloutTimer = null;
    runtime.state.TUTORIAL_MENU_OPENERS = Object.freeze(['btn-ui-rail-misc', 'ui-rail-misc-toggle', 'btn-mobile-nav-more']);
    initializeTutorialStarterGuides(runtime);
}

function initializeTutorialStarterGuides(runtime) {
    runtime.state.TUTORIAL_STARTER_GUIDES = Object.freeze([
        { key: 'tutorial_first_gear', seenAs: 'unlock_items', tabId: 'tab-items', title: '첫 장비',
            body: '장비를 얻었습니다. 자동 장착이 켜져 있으면 빈 칸에 맞는 장비를 바로 착용합니다.\n‘장비’에서 착용한 장비의 효과를 확인하고, 보관 중인 장비와 비교하세요.\n바꿔 입으면 전투 화면의 생명 구슬 위에 DPS 변화가 뜹니다.',
            // 빈 칸에 바로 입은 장비도 첫 장비다: 초반 드랍은 가방을 거치지 않아 안내가 끝내 뜨지 않았다(검토 7차). 무기 칸은 세지 않는다:
            // 첫 처치가 떨어뜨리는 직업 무기(js/combat-kill-rewards.js grantLoopStarterWeaponOnFirstKill)는 제 장착 안내가 맡는다(2026-11-09).
            starterDue: state => (state.inventory || []).some(item => item && item.id !== state.starterWeaponTutorialPending)
                || Object.entries(state.equipment || {}).some(([slot, item]) => item && slot !== '무기') },
        { key: 'tutorial_weapon_rune', seenAs: 'tutorial_weapon_rune', tabId: 'tab-skills', title: '무기와 스킬룬',
            body: '스킬룬마다 쓸 수 있는 무기가 있습니다. 지금 무기로 쓸 수 없는 룬은 흐리게 보이고, 카드에 필요한 무기가 적혀 있습니다.\n장착한 룬을 쓸 수 없는 무기로 바꾸면 기본 공격으로 싸우다가, 맞는 무기를 들면 그 룬으로 돌아갑니다.',
            starterDue: state => ownsWeaponBlockedRune(runtime, state) }
    ]);
}

function TutorialViewApi(runtime) {
    const names = [
        "rectsOverlap", "tutorialSamePlacement", "tutorialRectOf", "tutorialRectFits",
        "tutorialVisibleRects", "tutorialCardSpots", "revealTutorialTarget", "tutorialMarkup",
        "tutorialQuoteHtml", "tutorialBodyHtml", "openTutorialTarget", "renderTutorialStep",
        "settingsMenuPath", "isTutorialPresentationBlocked", "yieldTutorialCardToResult", "refreshTutorialCardPlacement",
        "tutorialNoticeAllowed", "tutorialQueueIsHeld", "saveTutorialHistoryChange", "setTutorialCallout",
        "ownsWeaponBlockedRune", "queueStarterGuides", "placeTutorialCard", "advanceTutorial",
        "equipSkippedStarterWeapon", "applySkippedGuide", "discardQueuedNotices", "dismissTutorial",
        "showNextTutorial"
    ];
    const api = Object.fromEntries(names.map(name => [name, runtime.handlers[name]]));
    api.tutorialActionUi = tutorialCoachApi(runtime);
    api.dispose = () => disposeTutorialView(runtime);
    return api;
}

function tutorialCoachApi(runtime) {
    const names = [
        "waitBetweenNotices", "requiresAttention", "noticeBody", "expireNotice",
        "guideFor", "announceRune", "start", "followOpeningTab",
        "followOpeningGuide", "leaveContextualGuide", "refreshText", "ensureCard",
        "openTarget", "openGuidePane", "openEquipment", "currentTarget",
        "dockCard", "canDockCard", "floatCard", "inlineGuideAnchor",
        "leftGuideContext", "refresh", "revealStep", "placeCard",
        "avoidRects", "keepsClear", "homeRect", "rest",
        "reposition", "holdsQueue", "hushHover", "unhush",
        "hushesTooltipAt", "clearTooltipSpot", "findTarget", "setGuideTarget",
        "clearHighlight", "completeGuideAction", "dismissGuideAction", "finish"
    ];
    const api = Object.fromEntries(names.map(name => [name, runtime.handlers['coach' + name[0].toUpperCase() + name.slice(1)]]));
    return Object.defineProperties(api, tutorialCoachFields(runtime));
}



function installTutorialEvents(runtime) {
    listenView(runtime, runtime.deps.window, 'resize', runtime.handlers.coachReposition);
    listenView(runtime, runtime.deps.window, 'game:languagechange', () => {
        runtime.handlers.renderTutorialStep();
        runtime.handlers.coachRefreshText();
    });
    listenView(runtime, runtime.deps.window, 'resize', () => {
        if (runtime.deps.activeTutorial) runtime.handlers.placeTutorialCard();
    });
}

function clearTutorialPresentation(runtime) {
    cancelViewFrames(runtime);
    clearTutorialTimers(runtime);
    clearTutorialCallout(runtime);
    const action = runtime.state.coachActive;
    runtime.state.coachActive = null;
    runtime.state.coachPlacedFor = null;
    coachClearHighlight(runtime);
    coachUnhush(runtime);
    if (runtime.state.coachCard) {
        runtime.state.coachCard.hidden = true;
        coachFloatCard(runtime);
    }
    if (action?.guide.spotlight) action.guide.spotlight(false);
    releaseViewTarget(runtime, runtime.state.pauseToggle);
    runtime.state.pauseToggle = null;
    if (runtime.state.notice && runtime.deps.activeTutorial === runtime.state.notice) {
        runtime.deps.document.getElementById('tutorial-overlay')?.classList.remove('active');
        runtime.deps.activeTutorial = null;
        runtime.deps.activeTutorialStep = 0;
    }
    runtime.state.notice = null;
}

function syncTutorialOwner(runtime) {
    if (runtime.state.owner === runtime.deps.game) return;
    runtime.state.owner = runtime.deps.game;
    clearTutorialPresentation(runtime);
    runtime.state.savedTutorialRevision = -1;
    runtime.state.tutorialCardWindowSignature = '';
    runtime.state.coachNoticeUntil = runtime.state.coachQuietUntil = 0;
}

function disposeTutorialView(runtime) {
    if (!runtime.active) return;
    releaseViewEvents(runtime);
    clearTutorialPresentation(runtime);
    runtime.state.coachCard?.remove();
    runtime.state.coachCard = null;
}

function tutorialNoticeHandlers() {
    return {
        tutorialNoticeAllowed,
        tutorialShown,
        clearTutorialCallout,
        showNextTutorial,
        practiceGearStep,
        practiceEquippedKeys,
        practiceRuneStep,
        practiceEquippedRunes,
        practiceSeedStep,
        practicePassiveStep,
        rectsOverlap,
        tutorialSamePlacement,
        tutorialRectOf,
        tutorialRectFits,
        tutorialVisibleRects,
        tutorialCardSpots,
        revealTutorialTarget,
        tutorialMarkup,
        tutorialQuoteHtml,
        tutorialBodyHtml,
        openTutorialTarget,
        renderTutorialStep,
        settingsMenuPath,
        isTutorialPresentationBlocked,
        yieldTutorialCardToResult,
        refreshTutorialCardPlacement,
        tutorialQueueIsHeld,
        saveTutorialHistoryChange,
        setTutorialCallout,
        ownsWeaponBlockedRune,
        queueStarterGuides,
        placeTutorialCard,
        advanceTutorial,
        equipSkippedStarterWeapon,
        applySkippedGuide,
        discardQueuedNotices,
        dismissTutorial
    };
}

function tutorialCoachHandlers() {
    return {
        coachWaitBetweenNotices,
        coachRequiresAttention,
        coachNoticeBody,
        coachExpireNotice,
        coachGuideFor,
        coachAnnounceRune,
        coachStart,
        coachFollowOpeningTab,
        coachFollowOpeningGuide,
        coachLeaveContextualGuide,
        coachRefreshText,
        coachEnsureCard,
        coachOpenTarget,
        coachOpenGuidePane,
        coachOpenEquipment,
        coachCurrentTarget,
        coachDockCard,
        coachCanDockCard,
        coachFloatCard,
        coachInlineGuideAnchor,
        coachLeftGuideContext,
        coachRefresh,
        coachRevealStep,
        coachPlaceCard,
        coachAvoidRects,
        coachKeepsClear,
        coachHomeRect,
        coachRest,
        coachReposition,
        coachHoldsQueue,
        coachHushHover,
        coachUnhush,
        coachHushesTooltipAt,
        coachClearTooltipSpot,
        coachFindTarget,
        coachSetGuideTarget,
        coachClearHighlight,
        coachCompleteGuideAction,
        coachDismissGuideAction,
        coachFinish
    };
}

function tutorialCoachFields(runtime) {
    return Object.assign(Object.getOwnPropertyDescriptors(tutorialCoachActivityFields(runtime)),
        Object.getOwnPropertyDescriptors(tutorialCoachPresentationFields(runtime)));
}

function tutorialCoachActivityFields(runtime) {
    return {
        get noticeUntil() { return runtime.state.coachNoticeUntil; },
        set noticeUntil(value) { runtime.state.coachNoticeUntil = value; },
        get quietUntil() { return runtime.state.coachQuietUntil; },
        set quietUntil(value) { runtime.state.coachQuietUntil = value; },
        get active() { return runtime.state.coachActive; },
        set active(value) { runtime.state.coachActive = value; },
        get highlighted() { return runtime.state.coachHighlighted; },
        set highlighted(value) { runtime.state.coachHighlighted = value; },
        get card() { return runtime.state.coachCard; },
        set card(value) { runtime.state.coachCard = value; }
    };
}

function tutorialCoachPresentationFields(runtime) {
    return {
        get placedFor() { return runtime.state.coachPlacedFor; },
        set placedFor(value) { runtime.state.coachPlacedFor = value; },
        get hush() { return runtime.state.coachHush; },
        set hush(value) { runtime.state.coachHush = value; },
        get guides() { return runtime.state.coachGuides; },
        set guides(value) { runtime.state.coachGuides = value; },
        get aliases() { return runtime.state.coachAliases; },
        set aliases(value) { runtime.state.coachAliases = value; },
        get dockAnchor() { return runtime.state.coachDockAnchor; },
        set dockAnchor(value) { runtime.state.coachDockAnchor = value; }
    };
}
