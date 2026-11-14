import { clearGrantBeyondBoundaryFocusedReward } from '../combat/boundary-payouts.mjs';

export function* clearFinishBeyondBoundaryEncounter(env, zone, mapAction) {
    let result = env.deps.completeBeyondBoundaryEncounter(env.owner);
    if (!result.ok) return;
    env.owner.killsInZone = 0;
    if (!result.completed) {
        (yield { kind: 'finishSay', args: [env.deps._t('경계 너머 {tier}단계, {wave}/{BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER} 조우로 전진합니다.', { tier: result.tier, wave: result.wave, BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER: env.deps.BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER }), 'season-up'] });
        env.deps.startMoving(false);
    } else (yield* clearFinishBeyondBoundaryTier(env, result, mapAction));
    (yield { kind: 'finishUnlocks', args: [] });
    (yield { kind: 'finishRedraw', args: [] });
    (yield { kind: 'queueImportantSave', args: [180] });
}

/** A boundary tier broken: the seal's experience (or that it is at its max level), the focused reward, back to the zone it left. */
export function* clearFinishBeyondBoundaryTier(env, result, mapAction) {
    let seal = env.deps.BEYOND_BOUNDARY_SEAL_DB.find(row => row.id === result.sealId);
    let levelText = result.sealResult.levelsGained > 0 ? env.deps._t(', 인장 {level}레벨', { level: result.sealResult.level }) : '';
    let focusedReward = (yield* clearGrantBeyondBoundaryFocusedReward(env, result));
    // 최대 레벨 인장은 경험치를 받지 못한다: "경험치 +N" 대신 그렇다고 적는다(2026-10-18).
    let sealMaxed = !!seal && result.sealResult.levelsGained === 0 && result.sealResult.level >= seal.maxLevel;
    let sealText = sealMaxed ? env.deps._t('{name} 최대 레벨(경험치 없음)', { name: seal.name }) : env.deps._t('{value} 경험치 +{rewardXp}{levelText}', { value: seal ? seal.name : env.deps._t('경계 인장'), rewardXp: result.rewardXp, levelText });
    (yield { kind: 'finishSay', args: [env.deps._t('경계 너머 {tier}단계 돌파, {sealText}, {summary}', { tier: result.tier, sealText, summary: focusedReward.summary }), 'loot-unique'] });
    env.owner.currentZoneId = result.returnZoneId !== null && result.returnZoneId !== undefined
        ? result.returnZoneId : env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    if (mapAction === 'stop') {
        env.deps.actExplorationProgress.depart(env.owner);
        env.deps.actExplorationProgress.stopAfterCompletion(env.owner);
        env.deps.prepareActExplorationArrival();
    } else env.deps.startMoving(false);
}
