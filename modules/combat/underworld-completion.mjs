import { clearNextBestZoneOr } from '../combat/clear-progression.mjs';
import { clearContinueMapAfterClear } from '../combat/clear-travel.mjs';

export function* clearFinishUnderworldEncounter(env, zone, mapAction) {
    let { uw, floor } = clearAdvanceUnderworldFloor(env, zone, mapAction);
    if (!env.owner.underworldRunes || typeof env.owner.underworldRunes !== 'object') env.owner.underworldRunes = { unlockedSlots: 0, unlockedRunesMaxNumber: 0, obtainedRunes: [] };
    (yield* clearGrantUnderworldFloorMilestone(env, floor, uw));
    (yield { kind: 'finishSay', args: [env.deps._t('🕳️ 지하계 {floor}층 돌파! {highestFloor}층까지 하강 가능합니다.', { floor, highestFloor: uw.highestFloor }), 'season-up'] });
    env.owner.killsInZone = 0;
    env.owner.currentZoneId = mapAction === 'nextLoopBestPlusOne' ? clearNextBestZoneOr(env, zone, env.deps.UNDERWORLD_ZONE_ID) : env.deps.UNDERWORLD_ZONE_ID;
    yield* clearContinueMapAfterClear(env, zone);
    (yield { kind: 'finishRedraw', args: [] });
    (yield { kind: 'queueImportantSave', args: [220] });
}

/** The underworld progress after a floor clear: this loop's best, the next floor open, where the next descent starts. */
export function clearAdvanceUnderworldFloor(env, zone, mapAction) {
    let uw = (env.owner.underworldProgress && typeof env.owner.underworldProgress === 'object') ? env.owner.underworldProgress : { highestFloor: 1, currentFloor: 1 };
    env.owner.underworldProgress = uw;
    let floor = Math.max(1, Math.floor(zone.floor || uw.currentFloor || 1));
    env.owner.loopProgressCurrent.bestUnderworldFloor = Math.max(env.owner.loopProgressCurrent.bestUnderworldFloor || 0, floor);
    uw.highestFloor = Math.max(Math.floor(uw.highestFloor || 1), floor + 1);
    uw.currentFloor = ['repeatZone', 'stop'].includes(mapAction) ? floor : Math.min(uw.highestFloor, floor + 1);
    if (floor >= 10) uw.floor10Cleared = true;
    return { uw, floor };
}

/** Every 10 underworld floors: rune slots (to 6) and rune numbers (to 30) through floor 300; past it, rune growth materials. */
export function* clearGrantUnderworldFloorMilestone(env, floor, progress) {
    const reward = env.deps.underworldMilestoneReward(floor);
    if (!reward) return;
    if (!reward.rune) return (yield* clearGrantUnderworldDeepFloorReward(env, floor, progress));
    let runeState = env.owner.underworldRunes;
    let prevSlots = Math.max(0, Math.floor(runeState.unlockedSlots || 0));
    let prevMaxRuneNo = Math.max(0, Math.floor(runeState.unlockedRunesMaxNumber || 0));
    runeState.unlockedSlots = Math.min(6, Math.max(prevSlots, reward.slots));
    runeState.unlockedRunesMaxNumber = Math.min(30, Math.max(prevMaxRuneNo, reward.rune.no));
    const lines = [];
    if (runeState.unlockedRunesMaxNumber > prevMaxRuneNo) {
        runeState.obtainedRunes.push(reward.rune.no);
        lines.push(`${reward.rune.name} 지하석 1개`);
    }
    if (runeState.unlockedSlots > prevSlots) lines.push(`지하석 슬롯 ${runeState.unlockedSlots}/6`);
    if (lines.length) (yield { kind: 'dispatchRuntimeEvent', args: ['underworld-milestone', { floor, text: env.deps._t('🧿 지하계 {floor}층 보상: {lines}', { floor, lines: lines.join(', ') }) }] });
}

/** Past floor 300 (data/constants.js UNDERWORLD_DEEP_FLOOR_REWARD), each `every`-th floor pays rune materials once:
 * progress.deepRewardFloor keeps the deepest paid floor, so repeating a floor pays nothing. */
export function* clearGrantUnderworldDeepFloorReward(env, floor, progress) {
    const reward = env.deps.underworldMilestoneReward(floor);
    const paid = Math.max(env.deps.UNDERWORLD_DEEP_FLOOR_REWARD.fromFloor, Math.floor(Number(progress.deepRewardFloor) || 0));
    if (!reward || floor <= paid) return;
    progress.deepRewardFloor = floor;
    const { runeShard: shards, underGold: gold } = reward.currencies;
    env.deps.awardCurrency('runeShard', shards);
    env.deps.awardCurrency('underGold', gold);
    (yield { kind: 'dispatchRuntimeEvent', args: ['underworld-milestone', { floor, text: env.deps._t('🧿 지하계 {floor}층 보상: 지하석 조각 {shards}, 금 {gold}', { floor, shards, gold }) }] });
}
