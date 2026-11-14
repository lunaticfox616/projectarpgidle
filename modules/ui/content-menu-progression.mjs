import { takeMenuUnlock, starterWeaponTarget, jewelPanelReady, journalPanelReady, takeBoundaryMenuReveal, takeInfusionUnlock, takeFourthTrialUnlock } from '../domain/content-menu-progress.mjs';

export function getStarterWeaponTutorialTarget(runtime) { return starterWeaponTarget(runtime.deps.game); }
export function isJournalTabUnlockReady(runtime) { return journalPanelReady(runtime.deps.game); }

/** Keep discovery/notice ordering: opening lessons may inspect the flags set by earlier steps. */
export function syncMenuUnlocks(runtime) {
    const { deps } = runtime;
    deps.storyJournalUi.sync();
    const owner = deps.game;
    if (runtime.state.menuOwner !== owner) cancelBoundaryReveal(runtime);
    runtime.state.menuOwner = owner;
    const starter = starterWeaponTarget(owner);
    if (typeof deps.stumpBoxUi === 'object') deps.stumpBoxUi.checkStumpBoxUnlock();
    announceBasicBattle(runtime);
    unlockInventoryAndJewels(runtime, starter);
    deps.contentProgression.opening.sync(owner);
    runtime.handlers.announceStarterWeapon(starter);
    deps.queueStarterGuides(owner);
    takeMenuUnlock(owner, 'skills');
    deps.tutorialActionUi.announceRune();
    unlockCodexAndMap(runtime);
    revealBoundary(runtime);
    if (takeMenuUnlock(owner, 'season')) runtime.handlers.announceLoop();
    unlockTraitsAndInfusion(runtime);
    if (owner.level >= 200) deps.unlockJournalEntry('level_200');
    if (takeFourthTrialUnlock(owner)) deps.addLog(deps._t('🏛️ Lv.100 달성으로 4차 전직 미궁 시련이 개방되었습니다!'), 'loot-unique');
    runtime.handlers.syncOpened();
    deps.detectNewMapUnlockAlarms();
    deps.announceMapPrimaryContentUnlocks();
}

function announceBasicBattle(runtime) {
    const { deps } = runtime;
    if (!(deps.game.seenTutorials || []).includes('tutorial_battle_basics')) {
        deps.queueTutorialNotice('tutorial_battle_basics', deps._t('첫 여정'), deps._t('전투는 자동입니다. 캐릭터가 알아서 걷고 공격합니다.\n지금 할 일은 오른쪽 위 ‘목표’에 나옵니다.\n생명 구슬이 자주 비면 장비와 저항을 점검하세요.\n장비나 룬을 얻으면 그때마다 조작을 안내합니다.'));
    }
}

function unlockInventoryAndJewels(runtime, starter) {
    const { deps } = runtime;
    if (takeMenuUnlock(deps.game, 'items', starter)) {
        deps.queueTutorialNotice('unlock_items', deps._t('첫 장비'), deps._t('장비나 제작 재화를 처음 얻었습니다.\n‘장비’에서 아이템을 눌러 지금 착용한 장비와 비교하고 착용하세요.'), 'tab-items');
    }
    if (jewelPanelReady(deps.game, deps.bagItems)) {
        deps.queueContentNotice('unlock_jewel', '주얼', 'jewel', { open: '주얼을 모을 수 있게 되었습니다.\n장비를 선택해 [소켓]에서 주얼을 끼우세요. 반지, 목걸이, 허리띠에는 소켓이 처음부터 있습니다.',
            locked: '주얼과 주얼 결정을 모을 수 있게 되었습니다.\n‘해금’에서 주얼을 열면 장비 소켓에 끼울 수 있습니다.' }, 'tab-items');
    }
}

function unlockCodexAndMap(runtime) {
    const { deps } = runtime;
    // takeMenuUnlock skips the inventory scan once codex discovery is saved.
    if (takeMenuUnlock(deps.game, 'codex')) {
        deps.queueContentNotice('unlock_codex', '첫 고유 장비', 'codex', { open: '고유 장비를 처음 얻었습니다.\n‘기록 → 도감’에 등록하면 도감 보너스를 받습니다.',
            locked: '고유 장비를 처음 얻었습니다.\n고유 도감을 해금하면 등록해 도감 보너스를 얻습니다.' }, 'tab-codex');
    }
    if (takeMenuUnlock(deps.game, 'map')) {
        deps.queueTutorialNotice('unlock_map', deps._t('지도 개방'), deps._t('다음 액트가 열렸습니다.\n‘지도’에서 지나온 액트로 돌아가 다시 사냥하거나, 마친 액트의 보상을 받을 수 있습니다.'), 'tab-map');
    }
}

function unlockTraitsAndInfusion(runtime) {
    const { deps } = runtime;
    if (takeMenuUnlock(deps.game, 'traits')) {
        deps.queueContentNotice('unlock_traits', '전직', 'trials', { open: '전직을 고를 수 있게 되었습니다.\n‘스킬트리 → 전직’에서 직업의 전직 셋 중 하나를 고르세요.\n전직 노드 포인트와 키스톤 포인트는 서로 다른 노드에 씁니다.',
            locked: '전직을 고를 수 있게 되었습니다.\n‘해금’에서 전직을 열면 전직을 고르고 전직 노드를 할당할 수 있습니다.' }, 'tab-traits');
    }
    if (typeof deps.isChaosInfuserUnlocked === 'function' && takeInfusionUnlock(deps.game, deps.isChaosInfuserUnlocked())) {
        deps.addLog(deps._t('🧪 나무꾼의 흔적을 해석해 혼돈 주입이 열렸습니다. 장비 상세의 [주입]으로 희귀 장비에 한 줄을 더할 수 있습니다.'), 'loot-unique');
    }
}

function revealBoundary(runtime) {
    const { deps } = runtime;
    deps.reconcileBeyondBoundaryUnlock(deps.game);
    if (!takeBoundaryMenuReveal(deps.game, deps.ensureBeyondBoundaryState(deps.game))) return;
    const button = deps.document.getElementById('btn-map-explore-beyond');
    if (!button) return;
    cancelBoundaryReveal(runtime);
    button.style.display = '';
    button.classList.add('map-explore-tab-unlock-reveal');
    runtime.state.boundaryRevealButton = button;
    runtime.state.boundaryRevealTimer = deps.setTimeout(() => cancelBoundaryReveal(runtime), 1400);
}

export function cancelBoundaryReveal(runtime) {
    runtime.deps.clearTimeout(runtime.state.boundaryRevealTimer);
    runtime.state.boundaryRevealTimer = null;
    runtime.state.boundaryRevealButton?.classList.remove('map-explore-tab-unlock-reveal');
    runtime.state.boundaryRevealButton = null;
}
