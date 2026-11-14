import { moveStarWedgeSaveToMeteorSite } from './saved-retired-systems.mjs';
import { normalizeAllocatedPassiveTreeNodes, normalizePassiveNodeId } from './saved-passive-nodes.mjs';
import { normalizeOwnedGemLibrariesSave, removeOldSealResonanceSave, refundBlessingEngravings } from './saved-gems.mjs';
import { clampFiniteNumber } from './saved-number.mjs';
import { normalizeJewelRecord } from './saved-jewels.mjs';
import { normalizeAscendancySave } from './saved-ascendancy.mjs';
import { voidPassiveLockField } from './saved-combat-values.mjs';

export function restorePassiveAllocation(deps, context) {
    context.legacyPassiveRefundCount = Number(context.merged.passiveLayoutVersion || 0) < deps.PASSIVE_LAYOUT_VERSION
        ? (Array.isArray(context.save.passives) ? context.save.passives.filter(id => id !== 'n0' && !String(id).startsWith('pt_start_')).length : 0)
        : 0;
    moveStarWedgeSaveToMeteorSite(deps, context.merged, context.save);
    context.passiveAllocationNormalization = normalizeAllocatedPassiveTreeNodes(deps, context.merged.passives, !!context.merged.passiveStarEvolution, context.merged);
    context.merged.passives = context.passiveAllocationNormalization.passives;
    context.merged.autoRefundedPassivePoints = Math.max(0, Math.floor(context.passiveAllocationNormalization.refunded || 0));
    Object.values(deps.PASSIVE_TREE.nodes || {}).forEach(node => {
        if (!node || node.stat !== 'critDmg') return;
        node.val = (0, deps.getPassiveStatTierValue)('critDmg', Math.max(0, Math.floor(node.tier || 1)));
    });
    context.merged.discoveredPassives = Array.from(new Set((context.merged.discoveredPassives || []).map(((...args) => normalizePassiveNodeId(deps, ...args))).filter(Boolean)));
}

export function restorePassiveChoices(deps, context) {
    const passiveAttributeStats = new Set(['strength', 'dexterity', 'intelligence']);
    context.merged.passiveAttributePreference = passiveAttributeStats.has(context.merged.passiveAttributePreference) ? context.merged.passiveAttributePreference : 'strength';
    const rawPassiveAttributeChoices = context.merged.passiveAttributeChoices && typeof context.merged.passiveAttributeChoices === 'object' && !Array.isArray(context.merged.passiveAttributeChoices)
        ? context.merged.passiveAttributeChoices
        : {};
    context.merged.passiveAttributeChoices = Object.fromEntries(Object.entries(rawPassiveAttributeChoices)
        .filter(([nodeId, stat]) => passiveAttributeStats.has(stat)
            && deps.PASSIVE_TREE.nodes[nodeId]
            && deps.PASSIVE_TREE.nodes[nodeId].kind === 'attribute'
            && (context.merged.passives || []).includes(nodeId)));
    const passiveSpecializationOptions = { migrateWisdomBranchChoice: true, passiveIds: context.merged.passives };
    context.merged.passiveSpecialization = typeof deps.normalizePassiveSpecializationState === 'function'
        ? (0, deps.normalizePassiveSpecializationState)(context.merged.passiveSpecialization, passiveSpecializationOptions)
        : JSON.parse(JSON.stringify(deps.defaultGame.passiveSpecialization));
}

export function restorePassiveLayout(deps, context) {
    if (context.merged.passiveLayoutVersion !== deps.PASSIVE_LAYOUT_VERSION) {
        // Version 22 replaced the generated tree with the authored six-class layout, version 23 with the co-edited one.
        // Refund once rather than silently mapping old node ids onto unrelated effects. Void options sat on the old sockets.
        if (Number(context.merged.passiveLayoutVersion || 0) < deps.PASSIVE_LAYOUT_VERSION) {
            context.merged.autoRefundedPassivePoints = context.legacyPassiveRefundCount;
            context.merged.passives = [];
            context.merged.passiveAttributeChoices = {};
            context.merged.voidPassives = {};
            context.merged.retiredVoidPassives = {};
        }
        context.merged.discoveredPassives = Array.from(new Set([(0, deps.getPassiveTreeRootNodeId)(context.merged)].concat(context.merged.passives || [])));
        context.merged.passiveLayoutVersion = deps.PASSIVE_LAYOUT_VERSION;
    }
}

export function restoreActRewards(deps, context) {
    context.merged.claimableActRewards = (context.merged.claimableActRewards || []).filter(id => typeof id === 'number' && id >= 0 && id <= 9);
    context.merged.claimedActRewards = (context.merged.claimedActRewards || []).filter(id => typeof id === 'number' && id >= 0 && id <= 9);
    context.merged.actRewardBonuses = (context.merged.actRewardBonuses || []).filter(entry => entry && entry.stat);
    context.merged.seasonChaseUniqueDrops = Array.from(new Set((Array.isArray(context.merged.seasonChaseUniqueDrops) ? context.merged.seasonChaseUniqueDrops : []).filter(name => typeof name === 'string' && name)));
    // Old saves only had a boolean flag and could not identify which chase unique dropped.
    // Do not treat that unknown legacy flag as a full chase-unique blacklist.
    context.merged.seasonChaseUniqueDropped = context.merged.seasonChaseUniqueDrops.length > 0;
    normalizeOwnedGemLibrariesSave(deps, context.merged);
    if ((context.save.saveVersion || 0) < 21) removeOldSealResonanceSave(context.merged);
    context.merged.seasonNodes = Array.isArray(context.merged.seasonNodes) ? context.merged.seasonNodes.filter(id => !!(0, deps.getSeasonPassiveNodeDef)(id)) : [];
}

export function restoreSeasonUnlocks(context) {
    context.merged.seasonNodeLevels = (context.merged.seasonNodeLevels && typeof context.merged.seasonNodeLevels === 'object') ? context.merged.seasonNodeLevels : {};
    context.merged.seasonNodes.forEach(id => {
        let lv = Math.max(1, Math.floor(context.merged.seasonNodeLevels[id] || 1));
        context.merged.seasonNodeLevels[id] = Math.min(5, lv);
    });
    context.merged.unlockedSeasonContents = Array.isArray(context.merged.unlockedSeasonContents) ? context.merged.unlockedSeasonContents.filter(id => typeof id === 'string') : ['season_1'];
    context.merged.seenSeasonContentNotices = Array.isArray(context.merged.seenSeasonContentNotices) ? context.merged.seenSeasonContentNotices.filter(id => typeof id === 'string') : ['season_1'];
    context.merged.unlockedMapContents = Array.isArray(context.merged.unlockedMapContents) ? context.merged.unlockedMapContents.filter(id => typeof id === 'string') : [];
}

export function restoreEndlessDepths(deps, context) {
    restoreLabyrinthDepths(deps, context);
    restoreAbyssDepths(deps, context);
}

export function restoreJewelsAndEngravings(deps, context) {
    context.merged.jewelInventory = Array.isArray(context.merged.jewelInventory) ? context.merged.jewelInventory.map(((...args) => normalizeJewelRecord(deps, ...args))).filter(Boolean) : [];
    // 한도를 넘은 주얼을 잘라내지 않는다. 전투 드랍은 보관함이 가득 차도 희귀·고유
    // 주얼만은 유실 방지로 한도를 넘겨 보관하는데(combat.js의 protectOverflow),
    // 여기서 잘라내면 바로 그 아껴 둔 주얼이 다음 불러오기에 조용히 사라졌다.
    // 게다가 앞에서부터 40개를 남기므로 가장 최근에 지켜 낸 것이 먼저 지워진다.
    // 장비 보관함도 같은 이유로 자르지 않고 초과 보관을 허용한다(유실 방지).
    // 2026-10-10부터 주얼은 가방에 들어가고, 이 목록은 불러온 뒤 bagItems.migrate가 가방으로 옮긴다.
    // 주얼 슬롯은 2026-09-30에 없어졌다(주얼은 장비 소켓에만 낀다). 슬롯의 주얼은 보관함으로 옮기고, 증폭은 보상 없이 지운다.
    context.merged.jewelInventory.push(...(Array.isArray(context.merged.jewelSlots) ? context.merged.jewelSlots.map(((...args) => normalizeJewelRecord(deps, ...args))).filter(Boolean) : []));
    delete context.merged.jewelSlots;
    delete context.merged.jewelSlotAmplify;
    delete context.merged.unlocks.jewel;
    delete context.merged.noti.jewel;
    context.merged.skyGemEnhancements = (context.merged.skyGemEnhancements && typeof context.merged.skyGemEnhancements === 'object') ? context.merged.skyGemEnhancements : {};
    Object.keys(context.merged.skyGemEnhancements).forEach(skill => {
        let arr = Array.isArray(context.merged.skyGemEnhancements[skill]) ? context.merged.skyGemEnhancements[skill] : [];
        context.merged.skyGemEnhancements[skill] = typeof deps.normalizeSkyGemEnhancementSlots === 'function'
            ? (0, deps.normalizeSkyGemEnhancementSlots)(arr)
            : arr.slice(0, 5);
    });
    refundBlessingEngravings(deps, context.merged);
}

export function restoreAscendancyProgress(deps, context) {
    restoreBloomIdentity(deps, context);
    restoreBloomAndKeystones(deps, context);
}

export function restoreAscendancyCaps(deps, context) {
    if (context.merged.ascendClass) {
        let legacyTrialCount = Array.isArray(context.merged.completedTrials)
            ? context.merged.completedTrials.filter(id => ['trial_1', 'trial_2', 'trial_3', 'trial_4'].includes(id)).length
            : 0;
        let legacyAscendRank = Math.max(0, Math.floor(clampFiniteNumber(context.merged.ascendRank, 0, 0, 4)));
        let legacyKeystoneTotal = Math.min(deps.CLASS_KEYSTONE_PICK_LIMIT, Math.max(legacyAscendRank, legacyTrialCount));
        let minExpectedPoints = Math.max(0, legacyKeystoneTotal - context.merged.ascendKeystones.length);
        context.merged.ascendKeystonePoints = Math.max(context.merged.ascendKeystonePoints, minExpectedPoints);
    }
}

export function restoreVoidPassives(deps, context) {
    let validVoidPassiveIds = new Set(typeof deps.getVoidPassiveNodeIds === 'function' ? (0, deps.getVoidPassiveNodeIds)() : []);
    let rawVoidPassives = (context.merged.voidPassives && typeof context.merged.voidPassives === 'object') ? context.merged.voidPassives : {};
    context.merged.voidPassives = {};
    context.merged.retiredVoidPassives = (context.merged.retiredVoidPassives && typeof context.merged.retiredVoidPassives === 'object') ? context.merged.retiredVoidPassives : {};
    Object.keys(rawVoidPassives).forEach(nodeId => {
        if (!validVoidPassiveIds.has(String(nodeId))) context.merged.retiredVoidPassives[nodeId] = rawVoidPassives[nodeId];
    });
    let legacyVoidMigration = !(context.save.voidPassives && typeof context.save.voidPassives === 'object');
    let allocatedVoidIds = legacyVoidMigration ? new Set((context.merged.passives || []).map(id => String(id))) : new Set();
    validVoidPassiveIds.forEach(nodeId => {
        let rawEntry = readSavedVoidEntry(rawVoidPassives, nodeId);
        let stats = Array.isArray(rawEntry.stats) ? rawEntry.stats : [];
        if (legacyVoidMigration && allocatedVoidIds.has(String(nodeId)) && stats.length <= 0) {
            stats = restoreLegacyVoidStats(deps, nodeId, stats);
        }
        stats = stats.filter(line => line && (0, deps.isVoidPassiveLineStat)(line.id) && Number.isFinite(Number(line.val))).slice(0, 2).map(line => ({ id: line.id, val: Number(line.val) }));
        let transcendent = (typeof deps.normalizeTranscendentVoidPassive === 'function') ? (0, deps.normalizeTranscendentVoidPassive)(rawEntry.transcendent) : null;
        if (keepSavedVoidEntry(stats, transcendent, rawVoidPassives, allocatedVoidIds, nodeId)) context.merged.voidPassives[nodeId] = { rarity: transcendent ? 'transcendent' : (stats.length > 0 ? 'magic' : 'normal'), stats, transcendent, ...voidPassiveLockField(rawEntry) };
    });
}

function readSavedVoidEntry(rawVoidPassives, nodeId) {
    return rawVoidPassives[nodeId] && typeof rawVoidPassives[nodeId] === 'object' ? rawVoidPassives[nodeId] : {};
}

function restoreLegacyVoidStats(deps, nodeId, stats) {
    let node = deps.PASSIVE_TREE.nodes[nodeId];
    if (node && deps.P_STATS[node.legacyVoidStat] && Number.isFinite(Number(node.legacyVoidVal))) {
        stats = [{ id: node.legacyVoidStat, val: Number(node.legacyVoidVal) }];
    }
    return stats;
}

function keepSavedVoidEntry(stats, transcendent, rawVoidPassives, allocatedVoidIds, nodeId) {
    return stats.length > 0 || transcendent || rawVoidPassives[nodeId] || allocatedVoidIds.has(String(nodeId));
}

function restoreLabyrinthDepths(deps, context) {
    context.merged.labyrinthFloor = Math.max(1, Math.floor(clampFiniteNumber(context.merged.labyrinthFloor, deps.defaultGame.labyrinthFloor || 1, 1)));
    context.merged.labyrinthUnlockedMaxFloor = Math.max(
        context.merged.labyrinthFloor,
        Math.floor(clampFiniteNumber(context.merged.labyrinthUnlockedMaxFloor, deps.defaultGame.labyrinthUnlockedMaxFloor || 1, 1))
    );
    const lastLabyrinth = context.merged.labyrinthLastResult;
    context.merged.labyrinthLastResult = lastLabyrinth && Number.isInteger(lastLabyrinth.season) && lastLabyrinth.season > 0
        && Number.isInteger(lastLabyrinth.floor) && lastLabyrinth.floor > 0 ? {
            season: lastLabyrinth.season, floor: lastLabyrinth.floor, pending: lastLabyrinth.pending === true,
            currencies: Object.fromEntries(Object.keys(deps.ORB_DB).filter(key => Number.isFinite(lastLabyrinth.currencies?.[key])
                && lastLabyrinth.currencies[key] > 0).map(key => [key, Math.min(1000000, Math.floor(lastLabyrinth.currencies[key]))]))
        } : null;
}

function restoreAbyssDepths(deps, context) {
    context.merged.abyssEndlessDepth = Math.max(20, Math.floor(clampFiniteNumber(context.merged.abyssEndlessDepth, deps.defaultGame.abyssEndlessDepth || 20, 20)));
    context.merged.abyssUnlockedDepths = Array.isArray(context.merged.abyssUnlockedDepths)
        ? Array.from(new Set(context.merged.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 20))).sort((a, b) => a - b)
        : [20];
    if (!context.merged.abyssUnlockedDepths.includes(20)) context.merged.abyssUnlockedDepths.unshift(20);
    if (context.merged.abyssEndlessDepth >= 21 && !context.merged.abyssUnlockedDepths.includes(context.merged.abyssEndlessDepth)) context.merged.abyssUnlockedDepths.push(context.merged.abyssEndlessDepth);
}

function restoreBloomIdentity(deps, context) {
    normalizeAscendancySave(deps, context.merged);
    context.merged.bloomedClassThisLoop = deps.CLASS_TEMPLATES[context.merged.bloomedClassThisLoop] ? context.merged.bloomedClassThisLoop : null;
    context.merged.bloomedTalentThisLoop = deps.HERO_SELECTION_DEFS[context.merged.bloomedTalentThisLoop] ? context.merged.bloomedTalentThisLoop : null;
}

function restoreBloomAndKeystones(deps, context) {
    if (context.merged.bloomedClassThisLoop && !context.merged.bloomedTalentThisLoop) context.merged.bloomedTalentThisLoop = context.merged.selectedHeroId;
    if (!context.merged.bloomedClassThisLoop) context.merged.bloomedTalentThisLoop = null;
    context.merged.pendingTalentBloomHeroId = context.merged.currentZoneId === 'trial_5'
        && deps.HERO_SELECTION_DEFS[context.merged.pendingTalentBloomHeroId] ? context.merged.pendingTalentBloomHeroId : null;
    context.merged.ascendKeystonePoints = Math.max(0, Math.floor(clampFiniteNumber(context.merged.ascendKeystonePoints, 0, 0)));
    let classKeystoneSet = new Set((0, deps.getClassKeystoneDefs)(context.merged.ascendClass).map(node => node.id));
    context.merged.ascendKeystones = Array.isArray(context.merged.ascendKeystones)
        ? Array.from(new Set(context.merged.ascendKeystones.filter(id => typeof id === 'string' && classKeystoneSet.has(id)))).slice(0, deps.CLASS_KEYSTONE_PICK_LIMIT)
        : [];
    if (!context.merged.ascendClass && (!Array.isArray(context.merged.completedTrials) || context.merged.completedTrials.length === 0)) {
        context.merged.ascendKeystonePoints = 0;
        context.merged.ascendKeystones = [];
    }
}
