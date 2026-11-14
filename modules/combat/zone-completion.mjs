import { killEnterAutomaticMapInterruptionAfterClear } from './clear-interruption.mjs';
import { killOnChaos20Cleared } from './clear-interruption.mjs';
import { clearEnsureLoopProgressCurrent, clearEnsureNextEndlessChaosDepthUnlocked } from '../combat/clear-progression.mjs';
import { clearDepartAfterZoneClear } from '../combat/clear-travel.mjs';
import { ACT_CLEAR_JOURNAL_ENTRIES } from '../data/clear-values.mjs';

/** A hunting zone or chaos depth with its kills done: its marks, the loop's final zone, trial 3, the next zone, this loop's best
 * depth, then where the hero goes. */
export function* clearFinishZoneClear(env, zone, mapAction) {
    if (zone.type === 'abyss') (yield* clearMarkChaosDepthClear(env, zone));
    if (zone.type === 'act') (yield* clearMarkActZoneClear(env, zone));
    if (clearIsSeasonFinalZoneClear(env, zone)) return (yield* clearFinishSeasonFinalZone(env, zone, mapAction));
    if (zone.type === 'abyss' && !env.owner.unlockedTrials.includes('trial_3')) (yield* clearUnlockTrial3FromChaos(env, zone));
    (yield* clearUnlockNextZoneAfterClear(env, zone));
    env.owner.killsInZone = 0;
    clearNoteBestChaosDepth(env, zone, clearEnsureLoopProgressCurrent(env));
    if (env.owner.beehive && env.owner.beehive.inRun) mapAction = 'repeatZone';
    (yield* clearDepartAfterZoneClear(env, zone, mapAction));
}

export function clearNoteBestChaosDepth(env, zone, progress) {
    if (zone.type !== 'abyss') return;
    let d = Math.max(1, Math.floor(zone.depth || env.deps.getAbyssDepthFromZoneId(zone.id) || 1));
    if (d >= 20) progress.bestAbyssDepth = Math.max(Math.floor(progress.bestAbyssDepth || 0), d);
}

export function* clearMarkChaosDepthClear(env, zone) {
    let depth = Math.max(1, Math.floor(zone.depth || env.deps.getAbyssDepthFromZoneId(zone.id) || 1));
    if (depth === 5 && !env.owner.woodsmanSimulatorSeenLoop) {
        env.owner.woodsmanSimulatorSeenLoop = true;
        env.owner.chaosInfuserUnlocked = true;
        env.deps.unlockJournalEntry('woodsman');
        (yield { kind: 'queueTutorialNotice', args: ['woodsman_simulator_loop', env.deps._t('나무꾼의 시뮬레이터'), env.deps._t('“다음은 더 나은 세계를 바라지.”\n정체를 드러낸 존재는 진짜 나무꾼이 아닌 시뮬레이터였다.\n더 깊은 혼돈을 돌파해야 루프가 열린다.'), 'tab-season'] });
    }
    let capDepth = 20;
    env.owner.abyssClearedDepths = Array.isArray(env.owner.abyssClearedDepths) ? env.owner.abyssClearedDepths : [];
    if (depth <= capDepth && !env.owner.abyssClearedDepths.includes(depth)) {
        env.owner.abyssClearedDepths.push(depth);
    }
    clearEnsureNextEndlessChaosDepthUnlocked(env, depth);
    if (depth >= 20) {
        clearEnsureLoopProgressCurrent(env).chaos20Cleared = true;
        killOnChaos20Cleared(env);
    }
}

export function* clearMarkActZoneClear(env, zone) {
    if (zone.id <= 9) env.deps.markActRewardReady(zone.id);
    // 전적: 이번 루프 시작 기준 액트 돌파 경과 시간(루프당 첫 돌파만).
    env.deps.worldTreeBark.noteActTenClear(zone);
    if (typeof env.deps.recordActClear === 'function') env.deps.recordActClear(zone.id);
    (yield* clearSayActClearStory(env, zone));
    const journalEntry = ACT_CLEAR_JOURNAL_ENTRIES.get(zone.id);
    if (journalEntry) env.deps.unlockJournalEntry(journalEntry);
    // 클리어 후 정지·방치 정산에서도 다음 화면 갱신을 기다리지 않고 전술을 연다.
    if (zone.id === 2) (yield { kind: 'finishSyncOpened', args: [] });
    if (zone.id === 9 && Math.max(0, Math.floor(env.owner.loopDeaths || 0)) <= 0) env.deps.unlockJournalEntry('immortal');
}

/** An act's clear story, once a loop: on the clear at the frontier (the one that opens the next zone, like its unlock line), not
 * on each repeat clear (a new hero who fell back to level up read act 1's five times in its first 15 minutes, 2026-10-18). */
export function* clearSayActClearStory(env, zone) {
    if (zone.id < env.owner.maxZoneId) return;
    let storyAct = env.deps.getStoryActByZoneId(zone.id);
    if (storyAct && storyAct.clearText) (yield { kind: 'finishSay', args: [`📜 ${storyAct.clearText}`, 'season-up'] });
}

/** Whether this clear is the loop's final zone: the season's final zone, or a chaos depth at the season's cap or deeper. */
export function clearIsSeasonFinalZoneClear(env, zone) {
    let clearedAbyssDepth = zone.type === 'abyss' ? Math.max(1, Math.floor(zone.depth || env.deps.getAbyssDepthFromZoneId(zone.id) || 1)) : 0;
    return zone.id === env.deps.getCurrentSeasonFinalZoneId() || (zone.type === 'abyss' && clearedAbyssDepth >= env.deps.getSeasonAbyssDepthCap(env.owner.season || 1));
}

export function* clearFinishSeasonFinalZone(env, zone, mapAction) {
    if ((env.owner.season || 1) >= 10 && zone.type === 'abyss') return (yield* clearFinishEndlessChaosClear(env, zone, mapAction));
    env.deps.handleSeasonLoopConditionMet();
}

/** From loop 10 the cleared final chaos depth: deep chaos opens past it, this loop's record, then the map action: stay, go one
 * deeper (or deeper anyway past 21 when the loop condition was met before), or the loop condition. */
export function* clearFinishEndlessChaosClear(env, zone, mapAction) {
    let depth = Math.max(1, Math.floor(zone.depth || env.deps.getAbyssDepthFromZoneId(zone.id) || 1));
    env.owner.abyssUnlockedDepths = Array.isArray(env.owner.abyssUnlockedDepths) ? env.owner.abyssUnlockedDepths : [20];
    // 깬 층이 곧 지금 층이다(2026-10-11): 예전에는 21층부터 지난 루프의 기록(game.abyssEndlessDepth)과 견줘 더 큰 쪽을
    // 써서, 루프 조건 층을 깨면 다음 층이 아니라 기록한 최고 층의 다음으로 뛰었다.
    let nowEndless = Math.max(20, depth);
    clearEnsureNextEndlessChaosDepthUnlocked(env, nowEndless);
    // Chaos 20 is the entrance to deep chaos, so continuing after that clear must start at 21
    // even if the save has a higher recorded deep-chaos floor from a previous loop.
    // Setting this to the unlocked next depth would double-advance and skip a floor (e.g. 20 -> 22).
    env.owner.abyssEndlessDepth = nowEndless;
    let hadCurrentSeasonLoopRequirementBeforeClear = clearRecordEndlessChaosClear(env, depth);
    if (mapAction === 'repeatZone') return (yield* clearRepeatEndlessChaosDepth(env, zone));
    if (mapAction === 'nextLoopBestPlusOne' || (depth >= 21 && hadCurrentSeasonLoopRequirementBeforeClear)) {
        env.deps.enterNextEndlessChaosDepth(zone);
        return;
    }
    env.deps.handleSeasonLoopConditionMet();
}

/** This loop's chaos record for a cleared final depth; returns whether the loop condition was met before this clear. */
export function clearRecordEndlessChaosClear(env, depth) {
    const progress = clearEnsureLoopProgressCurrent(env);
    let seasonAbyssCap = env.deps.getSeasonAbyssDepthCap(env.owner.season || 1);
    let bestAbyssDepthBeforeClear = Math.max(0, Math.floor(progress.bestAbyssDepth || 0));
    let hadCurrentSeasonLoopRequirementBeforeClear = seasonAbyssCap <= 20
        ? (typeof env.deps.hasCurrentLoopChaos20Clear === 'function' ? env.deps.hasCurrentLoopChaos20Clear() : !!progress.chaos20Cleared)
        : bestAbyssDepthBeforeClear >= seasonAbyssCap;
    if (depth >= 20) progress.bestAbyssDepth = Math.max(bestAbyssDepthBeforeClear, depth);
    progress.chaos20Cleared = true;
    killOnChaos20Cleared(env);
    return hadCurrentSeasonLoopRequirementBeforeClear;
}

export function* clearRepeatEndlessChaosDepth(env, zone) {
    env.owner.currentZoneId = zone.id;
    env.owner.killsInZone = 0;
    yield* killEnterAutomaticMapInterruptionAfterClear(env, zone);
    (yield { kind: 'finishUnlocks', args: [] });
    if ((env.owner.settings.townReturnAction || 'retry') === 'stop') {
        env.owner.combatHalted = true;
        env.owner.enemies = [];
        env.owner.encounterPlan = [];
        env.owner.encounterIndex = 0;
        env.owner.runProgress = 0;
    } else env.deps.startMoving(false);
    (yield { kind: 'finishRedraw', args: [] });
    (yield { kind: 'queueImportantSave', args: [220] });
}

export function* clearUnlockTrial3FromChaos(env, zone) {
    let shouldUnlockTrial3 = zone.name === '혼돈 5' || Math.random() < 0.15;
    if (!shouldUnlockTrial3) return;
    env.owner.unlockedTrials.push('trial_3');
    env.owner.noti.map = true;
    (yield { kind: 'finishSay', args: [zone.name === '혼돈 5' ? "✨ [시련의 증표] 혼돈 5 보스 확정 드랍! 3차 전직 시련 개방!" : "✨ [시련의 증표] 획득! 3차 전직 시련 개방!", "loot-unique"] });
}

export function* clearUnlockNextZoneAfterClear(env, zone) {
    // 다음 지역 해금은 "지금 막 클리어한 존"을 기준으로 보정한다.
    // 특히 혼돈 구간은 반복/자동화 상태와 무관하게 N 클리어 시 N+1이 열려야 하므로
    // targetUnlockZone을 직접 계산해 누락을 방지한다.
    let targetUnlockZone = Math.min(env.deps.getCurrentSeasonFinalZoneId(), zone.id + 1);
    // 이미 열려 있는 이전 구역 반복 클리어로 프론티어를 우회 해금하지 않도록
    // "현재 프론티어(=maxZoneId) 이상 구역을 클리어했을 때만" 다음 구역을 연다.
    let clearedAtFrontier = zone.id >= env.owner.maxZoneId;
    if (!(clearedAtFrontier && env.owner.maxZoneId < targetUnlockZone)) return;
    env.owner.maxZoneId = targetUnlockZone;
    if (typeof env.deps.npcShop === 'object') env.deps.npcShop.syncAllRunes();
    env.owner.noti.map = true;
    (yield { kind: 'finishReveal', args: [env.owner.maxZoneId] });
    let clearedStoryAct = env.deps.getStoryActByZoneId(zone.id);
    if (clearedStoryAct && clearedStoryAct.unlockText) (yield { kind: 'finishSay', args: [`🧭 ${clearedStoryAct.unlockText}`, 'season-up'] });
    let unlockedZone = env.deps.getZone(env.owner.maxZoneId);
    (yield { kind: 'finishSay', args: [env.deps._t('🗺️ 신규 사냥터 [{zone}] 개방!', { zone: unlockedZone ? env.deps._t(unlockedZone.name) : env.deps._t('구역 {n}', { n: env.owner.maxZoneId }) }), "season-up"] });
    env.deps.noteCampaignResistPenalty(env.owner.maxZoneId);
}
