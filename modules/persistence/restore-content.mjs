import { normalizeSavedTacticRules } from './saved-settings.mjs';
import { clampFiniteNumber } from './saved-number.mjs';
import { normalizeUniqueHuntSave } from './saved-equipment.mjs';
import { normalizeColonyRunSave, normalizeVoidRiftSave } from './saved-content-runs.mjs';
import { removeDropOnlyShopWares, normalizeStarterWeaponSave } from './saved-gems.mjs';

export function restoreCraftAndMapTabs(deps, context) {
    context.merged.completedTrials = Array.isArray(context.merged.completedTrials) ? context.merged.completedTrials.filter(id => typeof id === 'string') : [];
    context.merged.unlockedTrials = Array.isArray(context.merged.unlockedTrials) ? context.merged.unlockedTrials.filter(id => typeof id === 'string') : [];
    Object.assign(context.merged, deps.craftingWorkspaceState.restore(context.merged));
    context.merged.skillSubtab = ['skill-tab-equip','skill-tab-enhance','skill-tab-condition'].includes(context.merged.skillSubtab) ? context.merged.skillSubtab : 'skill-tab-equip';
    context.merged.skillAutoRules = normalizeSavedTacticRules(deps, context.merged.skillAutoRules);
    // 컨디션 룬 → 부적 조건부 줄(2026-09-30): 룬 · 레벨 · 가공 선택 · 전투 중 버프 · 룬 규칙은 보상 없이 지운다. 전술 규칙은 남는다.
    ['conditionGemUnlocked', 'conditionGemPool', 'conditionGemLevels', 'pendingConditionGemChoices', 'conditionGemCooldowns', 'playerConditionBuffs',
        'lastConditionGemCast', 'playerCastDelayUntil', 'enemyCurseExpirePayloads'].forEach(key => delete context.merged[key]);
    context.merged.beyondBoundary = (0, deps.normalizeBeyondBoundaryState)(context.merged.beyondBoundary, context.merged);
    delete context.merged.worldDeck;
    context.merged.clearedRootBosses = Array.isArray(context.merged.clearedRootBosses) ? context.merged.clearedRootBosses : [];
    context.merged.mapSubtab = ['map-tab-zones', 'map-tab-chaos-realm', 'map-tab-sky', 'map-tab-underworld', 'map-tab-cosmos', 'map-tab-ocean', 'map-tab-fishing', 'map-tab-pvp'].includes(context.merged.mapSubtab) ? context.merged.mapSubtab : 'map-tab-zones';
    context.merged.mapExploreSubtab = ['map-explore-atlas', 'map-explore-worldtree', 'map-explore-hunting', 'map-explore-chaos', 'map-explore-root-boss', 'map-explore-beyond', 'map-explore-labyrinth', 'map-explore-deep-chaos', 'map-explore-meteor', 'map-explore-beehive', 'map-explore-colony', 'map-explore-voidrift', 'map-explore-timerift', 'map-explore-trials'].includes(context.merged.mapExploreSubtab) ? context.merged.mapExploreSubtab : 'map-explore-atlas';
    delete context.merged.coreCube;
    delete context.merged.unlocks.cube;
    delete context.merged.noti.cube;
    // 코어 큐브 → 코어 칸(2026-09-30): 예전 진행은 보상 없이 지운다.
    context.merged.cores = deps.coreItems.normalize(context.merged.cores);
}

export function restoreRetiredCraftPanels(context) {
    restoreGemPanelAndTalismanCore(context);
    restoreJewelCoreAndRetiredTalisman(context);
}

export function restoreCodexAndColony(deps, context) {
    restoreGemEnhanceSelection(deps, context);
    restoreCodexLedgers(deps, context);
    restoreCodexPreferences(deps, context);
    restoreColonyWardSlots(deps, context);
}

export function restoreBeehiveRun(deps, context) {
    let beeHasReturnZone = context.merged.beehive.returnZoneId !== undefined && context.merged.beehive.returnZoneId !== null;
    let beeHasStartedRoute = Math.max(0, Math.floor(context.merged.beehive.branchStep || 0)) > 0;
    let activeBeehiveRuntime = !!(context.merged.beehive.inRun && context.merged.currentZoneId === 'beehive_run' && (
        hasSavedBeehiveActivity(context, beeHasReturnZone, beeHasStartedRoute)
    ));
    if (!activeBeehiveRuntime) {
        let staleBeehiveReturnZone = beeHasReturnZone ? context.merged.beehive.returnZoneId : context.merged.maxZoneId;
        context.merged.beehive.inRun = false;
        (0, deps.resetBeehiveRunModifiers)(context.merged.beehive);
        if (context.merged.currentZoneId === 'beehive_run') context.merged.currentZoneId = staleBeehiveReturnZone;
    }
    if (context.merged.beehive && context.merged.beehive.inRun) {
        context.merged.combatHalted = !context.merged.beehive.awaitingClear;
    } else {
        context.merged.combatHalted = !!context.merged.combatHalted;
    }
}

function hasSavedBeehiveActivity(context, beeHasReturnZone, beeHasStartedRoute) {
    return context.merged.beehive.awaitingClear
        || (context.merged.beehive.pendingChoice && (beeHasReturnZone || beeHasStartedRoute))
        || context.merged.beehive.queenActive
        || context.merged.beehive.pendingWaveReward
        || (Array.isArray(context.merged.beehive.pendingQueenRewards) && context.merged.beehive.pendingQueenRewards.length > 0)
        || (Array.isArray(context.merged.enemies) && context.merged.enemies.some(enemy => enemy && enemy.hp > 0));
}

export function restoreJournalAndNpcs(deps, context) {
    context.merged.seenTutorials = Array.isArray(context.merged.seenTutorials) ? context.merged.seenTutorials.filter(id => typeof id === 'string') : [];
    context.merged.npcHeard = Array.isArray(context.merged.npcHeard) ? Array.from(new Set(context.merged.npcHeard.filter(id => typeof id === 'string' && id.includes(':')))) : [];
    // NPC meetings and shop stock (js/npc-shop.js): plain records; a stock's offers are read again before each sale.
    const record = value => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
    context.merged.npcMet = record(context.merged.npcMet);
    context.merged.npcShops = record(context.merged.npcShops);
    removeDropOnlyShopWares(deps, context.merged);
    normalizeStarterWeaponSave(deps, context.merged);
    deps.window.GameModules.state.tutorials.normalize(context.merged);
    context.merged.journalEntries = Array.isArray(context.merged.journalEntries) ? Array.from(new Set(context.merged.journalEntries.filter(id => typeof id === 'string' && deps.JOURNAL_DB[id]))) : ['prologue'];
    // 보스 도전 추적은 저장 복원 후 이어 붙이지 않는다. 탭이 닫힌 동안의 피해를
    // 잃은 기록으로 업적을 잘못 판정하지 않도록 새 조우에서만 다시 시작한다.
    context.merged.hiddenJournalBossRun = null;
    // 전적: 기존 세이브에는 과거 시간 데이터가 없다. 지어내지 않고 지금부터 기록을 시작하며,
    // startedAt이 남으므로 화면이 "언제부터의 기록인지"를 그대로 밝힐 수 있다.
    if (typeof deps.ensureRecordsState === 'function') (0, deps.ensureRecordsState)(context.merged);
    normalizeVoidRiftSave(deps, context.merged);
    context.merged.timeRift = (context.merged.timeRift && typeof context.merged.timeRift === 'object') ? { ...deps.defaultGame.timeRift, ...context.merged.timeRift } : { ...deps.defaultGame.timeRift };
    context.merged.timeRift.fusionCount = Math.max(0, Math.floor(clampFiniteNumber(context.merged.timeRift.fusionCount, 0, 0)));
    context.merged.timeRift.lastFusion = deps.window.GameModules.state.normalizeTimeRiftResult(context.merged.timeRift.lastFusion);
    (0, deps.repairJournalEntriesFromProgress)(context.merged);
    // 저널 보너스는 기록 정의에서 항상 재구축한다. 저장 배열을 그대로 신뢰하면
    // 클라우드 병합·구버전 이관 과정에서 같은 기록이 중복되어 능력치가 누적될 수 있다.
    let journalLoadState = (0, deps.rebuildJournalBonusStateForLoad)(context.merged);
    context.pendingJournalPassivePoints = Math.max(0, Math.floor(journalLoadState.pendingPassivePoints || 0));
}

function restoreGemPanelAndTalismanCore(context) {
    context.merged.gemFoldInactiveAttack = !!context.merged.gemFoldInactiveAttack;
    context.merged.gemFoldInactiveSupport = !!context.merged.gemFoldInactiveSupport;
    delete context.merged.gemResearchExpanded;
    if (context.merged.currencies) delete context.merged.currencies.gemShard;
    if (context.merged.gemFoldInactive) {
        context.merged.gemFoldInactiveAttack = true;
        context.merged.gemFoldInactiveSupport = true;
    }
    context.merged.autoRepeatSeasonBoss = !!context.merged.autoRepeatSeasonBoss;
    if (((context.merged.currencies || {}).talismanCore || 0) > 0) {
        context.merged.currencies.sealShard = (context.merged.currencies.sealShard || 0) + (context.merged.currencies.talismanCore || 0);
        context.merged.currencies.talismanCore = 0;
    }
}

function restoreJewelCoreAndRetiredTalisman(context) {
    if (((context.merged.currencies || {}).jewelCore || 0) > 0) {
        context.merged.currencies.jewelShard = (context.merged.currencies.jewelShard || 0) + Math.max(0, Math.floor(context.merged.currencies.jewelCore || 0));
        context.merged.currencies.jewelCore = 0;
    }
    // 부적 판 → 그루터기 함의 부적(2026-09-30): 예전 판 · 배치 · 보유 부적은 보상 없이 지운다. 봉인편린은 그대로 쓴다.
    ['talismanUnlocked', 'talismanBoardUnlock', 'talismanUnlockedCells', 'talismanInventory', 'talismanBoard', 'talismanPlacements',
        'talismanSelectedId', 'talismanUnseal', 'talismanUnlockPickMode', 'talismanSubtab'].forEach(key => delete context.merged[key]);
    delete context.merged.unlocks.talisman;
    delete context.merged.noti.talisman;
    context.merged.gemEnhanceUnlocked = !!context.merged.gemEnhanceUnlocked;
    context.merged.gemEngraveSelectedSlot = Math.max(0, Math.min(4, Math.floor(clampFiniteNumber(context.merged.gemEngraveSelectedSlot, 0, 0, 4))));
}

function restoreGemEnhanceSelection(deps, context) {
    context.merged.gemEnhanceTargetSkill = (typeof context.merged.gemEnhanceTargetSkill === 'string' && deps.SKILL_DB[context.merged.gemEnhanceTargetSkill] && deps.SKILL_DB[context.merged.gemEnhanceTargetSkill].isGem && Array.isArray(context.merged.skills) && context.merged.skills.includes(context.merged.gemEnhanceTargetSkill)) ? context.merged.gemEnhanceTargetSkill : null;
}

function restoreCodexLedgers(deps, context) {
    context.merged.uniqueCodex = (context.merged.uniqueCodex && typeof context.merged.uniqueCodex === 'object') ? context.merged.uniqueCodex : {};
    normalizeUniqueHuntSave(deps, context.merged);
    context.merged.codexNewlyRegistered = (context.merged.codexNewlyRegistered && typeof context.merged.codexNewlyRegistered === 'object') ? context.merged.codexNewlyRegistered : {};
    context.merged.codexCollapsedSlots = (context.merged.codexCollapsedSlots && typeof context.merged.codexCollapsedSlots === 'object') ? context.merged.codexCollapsedSlots : {};
}

function restoreCodexPreferences(deps, context) {
    context.merged.codexSubtab = (context.merged.codexSubtab === 'realm') ? 'realm' : 'main';
    context.merged.codexSelectedSlot = (0, deps.getCodexSlotOrder)().includes(context.merged.codexSelectedSlot) ? context.merged.codexSelectedSlot : '무기';
    context.merged.uniqueCodexCompletedRewardClaimed = !!context.merged.uniqueCodexCompletedRewardClaimed;
    if (!context.merged.gemEnhanceUnlocked && (((context.merged.currencies || {}).bossCore || 0) > 0 || ((context.merged.currencies || {}).skyEssence || 0) > 0)) context.merged.gemEnhanceUnlocked = true;
}

function restoreColonyWardSlots(deps, context) {
    context.merged.inTicketBossFight = !!context.merged.inTicketBossFight;
    context.merged.beehive = (context.merged.beehive && typeof context.merged.beehive === 'object') ? context.merged.beehive : { unlockedPermanent:false, inRun:false, branchStep:0, cleared:false, routeSeed:0 };
    context.merged.beehive.waveExtra = Math.floor(clampFiniteNumber(context.merged.beehive.waveExtra, 0, 0, 2));
    context.merged.colony = (context.merged.colony && typeof context.merged.colony === 'object') ? { ...deps.defaultGame.colony, ...context.merged.colony } : { ...deps.defaultGame.colony };
    normalizeColonyRunSave(context.merged.colony, clampFiniteNumber);
    context.merged.colony.wardInventory = Array.isArray(context.merged.colony.wardInventory) ? context.merged.colony.wardInventory.map(w => w && typeof w === 'object' ? { ...w, locked: !!w.locked } : w).filter(Boolean) : [];
    context.merged.colony.wardEquipped = Array.isArray(context.merged.colony.wardEquipped) ? context.merged.colony.wardEquipped.slice(0, 4) : [null,null,null,null];
    while (context.merged.colony.wardEquipped.length < 4) context.merged.colony.wardEquipped.push(null);
    let highestWardSlot = context.merged.colony.wardEquipped.reduce((max, ward, idx) => ward ? Math.max(max, idx + 1) : max, 1);
    if (!context.savedColonyHadWardSlotVersion) context.merged.colony.wardSlots = highestWardSlot;
    else context.merged.colony.wardSlots = Math.max(1, Math.min(4, Math.floor(context.merged.colony.wardSlots || 1)));
    context.merged.colony.wardSlots = Math.max(context.merged.colony.wardSlots, highestWardSlot);
    context.merged.colony.wardSlotVersion = 1;
}
