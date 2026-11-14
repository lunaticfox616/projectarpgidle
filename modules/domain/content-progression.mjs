/** Optional-content purchase rules. No DOM, storage, timers or combat mutations. */
import { contentCanOpenMap, contentCanOpen, contentNpcsMet, contentIsUnlocked, contentKind, contentParents, contentHolds, contentRank, contentCanDropUnique, contentCanDropCurrency, contentRequirements } from './content-unlock-rules.mjs';
import { contentEarnedBy, contentPoints, contentOverflow, contentBalance } from './content-unlock-points.mjs';
import { contentCheapestOpen, contentStatus, contentSync, contentPurchase, contentPlanTarget } from './content-unlock-purchase.mjs';
import { contentRestore } from './content-unlock-migrations.mjs';
import { createOpeningProgression } from './content-opening.mjs';

function createContentProgressChecks(deps) {
    return {
        tactics: owner => [['액트 3 클리어', deps.hasCombatTacticsUnlockProgress(owner)]],
        trials: owner => [['액트 3 클리어', owner.maxZoneId >= 3 || owner.completedTrials.length > 0]],
        meteor: owner => [['루프 7에서 액트 7 클리어', owner.maxZoneId >= 7]],
        deepChaos: owner => [['혼돈 20층 클리어', deps.hasCurrentLoopChaos20Clear(owner)]],
        chaosRealm: owner => [['나무꾼에게 10% 피해 후 전투 종료', !!owner.chaosRealm.unlocked, 'outside-chaos']],
        underworld: deps.getUnderworldUnlockChecks,
        cosmos: deps.getCosmosUnlockChecks,
        sky: owner => [['혼돈 20층 클리어', owner.skyTower.unlocked || owner.season > 15 || deps.hasCurrentLoopChaos20Clear(owner), 'map-explore-chaos']],
        beyond: owner => [['경계의 관측자 처치, 그리고 루프 50 또는 세계수 씨앗 4개', deps.isBeyondBoundaryUnlockRequirementMet(owner)]],
        cube: owner => [['지하계 10층 클리어', owner.underworldProgress.highestFloor >= 11]],
        talent: owner => [['재능 개화', deps.hasPermanentTalentTabUnlock(owner)]],
        woodsman: owner => [['나무꾼 조우 또는 기록', !!owner.woodsmanSimulatorSeenLoop || owner.woodsmanDefeatAttempts > 0 || owner.journalEntries.includes('woodsman')]],
        stump: owner => [['액트 10 클리어', !!(owner.stumpBox && owner.stumpBox.acquired) || deps.stumpBox.eligible(owner)]]
    };
}

function createContentProgressRoutes(env) {
    return {
        'tab-map': contentCanOpenMap,
        'tab-season': owner => owner.season >= 2,
        'tab-unlocks': owner => owner.season >= 2,
        'tab-guide': owner => contentCanOpen(env, 'tab-journal', owner),
        // NPC, 거래소, 장비 전당 중 하나가 열리면 거래 창을 연다. 옛 칸 주소는 UI가 이 창으로 보낸다.
        'tab-trade': owner => contentNpcsMet(owner) || contentIsUnlocked(env, 'market', owner) || contentIsUnlocked(env, 'hall', owner),
        // 아틀라스와 혼돈계의 최초 개방 기록은 서로 독립적이다.
        'map-explore-worldtree': owner => !!owner.atlas?.unlocked
    };
}

function createContentEnvironment(deps) {
    const env = { deps };
    env.definitions = new Map(deps.CONTENT_UNLOCK_CATALOG.map(row => [row.id, row]));
    env.routes = new Map(deps.CONTENT_UNLOCK_CATALOG.flatMap(row => (row.routes || []).map(route => [route, row.id])));
    env.coreRoutes = new Set(['tab-character', 'tab-items', 'tab-skills', 'tab-battle', 'tab-settings', 'tab-social',
        'item-tab-equip', 'skill-tab-equip', 'map-tab-zones', 'map-explore-atlas', 'map-explore-hunting', 'map-explore-chaos',
        'map-explore-root-boss']);
    env.opening = createOpeningProgression(deps);
    env.progressChecks = createContentProgressChecks(deps);
    env.progressRoutes = createContentProgressRoutes(env);
    env.AWARDS_BEFORE_NPC_SPLIT = Object.freeze({ early: Object.freeze([4, 4, 3, 3]), perLoop: 2 });
    env.AWARDS_BEFORE_GROWTH = Object.freeze({ early: Object.freeze([2, 2, 3, 3, 2, 1, 1, 1, 2]), perLoop: 2 });
    env.NPC_SPLIT_VERSION = 9;
    env.SERIES_VERSION = env.deps.CONTENT_UNLOCK_SERIES_VERSION;
    env.LEDGER_VERSION = env.deps.CONTENT_UNLOCK_TREE_VERSION;
    env.LOOP_MOVE_VERSION = env.deps.CONTENT_UNLOCK_LOOP_MOVE_VERSION;
    return env;
}

/** One ledger/opening owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createContentProgression(deps) {
    const env = createContentEnvironment(deps);
    return Object.freeze({
        opening: env.opening,
        kind: contentKind,
        parents: contentParents,
        holds: (...args) => contentHolds(env, ...args),
        rank: (...args) => contentRank(env, ...args),
        isUnlocked: (...args) => contentIsUnlocked(env, ...args),
        canDropUnique: (...args) => contentCanDropUnique(env, ...args),
        canDropCurrency: (...args) => contentCanDropCurrency(env, ...args),
        canOpen: (...args) => contentCanOpen(env, ...args),
        npcsMet: contentNpcsMet,
        earnedBy: (...args) => contentEarnedBy(env, ...args),
        points: (...args) => contentPoints(env, ...args),
        overflow: (...args) => contentOverflow(env, ...args),
        balance: (...args) => contentBalance(env, ...args),
        cheapestOpen: (...args) => contentCheapestOpen(env, ...args),
        status: (...args) => contentStatus(env, ...args),
        requirements: (...args) => contentRequirements(env, ...args),
        sync: (...args) => contentSync(env, ...args),
        purchase: (...args) => contentPurchase(env, ...args),
        restore: (...args) => contentRestore(env, ...args),
        planTarget: (...args) => contentPlanTarget(env, ...args)
    });
}
