import { clearContinueMapAfterClear } from '../combat/clear-travel.mjs';

export function* clearFinishSkyTowerEncounter(env, zone, mapAction) {
    let st = env.deps.ensureSkyTowerState();
    let floor = Math.max(1, Math.floor(zone.floor || st.currentFloor || 1));
    let remainingBefore = env.deps.getSkyTowerRemainingClears();
    const kind = remainingBefore === 0 ? 'practice' : st.clearedFloors.includes(floor) ? 'repeat' : 'first';
    const reward = remainingBefore > 0 ? (yield* clearClearSkyTowerFloor(env, st, floor, mapAction)) : 0;
    if (remainingBefore === 0) (yield { kind: 'finishSay', args: [env.deps._t('☁️ 창공의 탑 {floor}층 연습 완료.', { floor }), 'season-up'] });
    st.lastResult = { season: env.owner.season, floor, kind, condensedPower: reward };
    env.owner.killsInZone = 0;
    env.owner.currentZoneId = env.deps.SKY_TOWER_ZONE_ID;
    yield* clearContinueMapAfterClear(env, zone);
    (yield { kind: 'finishRedraw', args: [] });
    (yield { kind: 'queueImportantSave', args: [220] });
}

/** A sky tower floor within this loop's clear limit: a first clear's reward and the next floor, else a 16% repeat reward. */
export function* clearClearSkyTowerFloor(env, st, floor, mapAction) {
    env.owner.loopProgressCurrent.bestSkyFloor = Math.max(env.owner.loopProgressCurrent.bestSkyFloor || 0, floor);
    st.clearedFloors = Array.isArray(st.clearedFloors) ? st.clearedFloors : [];
    let firstClear = !st.clearedFloors.includes(floor);
    let reward = firstClear ? clearFirstSkyTowerClear(env, st, floor, mapAction) : clearRepeatSkyTowerClear(env, st, floor, mapAction);
    if (reward > 0) st.condensedPower = Math.max(0, Math.floor(st.condensedPower || 0)) + reward;
    st.clearedThisLoop = Math.min(env.deps.getSkyTowerLoopClearLimit(), Math.max(0, Math.floor(st.clearedThisLoop || 0)) + 1);
    let rewardText = firstClear
        ? env.deps._t('최초 클리어 보상: 응축된 창공의 정수 +{reward}', { reward })
        : (reward > 0 ? env.deps._t('반복 클리어 보상: 응축된 창공의 정수 +{reward}', { reward }) : '반복 클리어: 응축된 창공의 정수 미발견');
    (yield { kind: 'finishSay', args: [env.deps._t('☁️ 창공의 탑 {floor}층 돌파! {rewardText}, 이번 루프 잔여 클리어 {skyTowerRemainingClears}/{skyTowerLoopClearLimit}', { floor, rewardText, skyTowerRemainingClears: env.deps.getSkyTowerRemainingClears(), skyTowerLoopClearLimit: env.deps.getSkyTowerLoopClearLimit() }), reward > 0 ? 'loot-unique' : 'season-up'] });
    return reward;
}

export function clearFirstSkyTowerClear(env, st, floor, mapAction) {
    let reward = env.deps.getSkyTowerRewardAmount(floor);
    st.clearedFloors.push(floor);
    st.clearedFloors = Array.from(new Set(st.clearedFloors.map(v => Math.floor(v || 0)).filter(v => v >= 1))).sort((a, b) => a - b);
    st.highestFloor = Math.max(Math.floor(st.highestFloor || 1), floor + 1);
    st.currentFloor = ['repeatZone', 'stop'].includes(mapAction) ? floor : Math.min(st.highestFloor, floor + 1);
    if (floor >= 10) env.deps.unlockJournalEntry('sky_tower_10');
    return reward;
}

/** A floor cleared before: 16% of the time a part of the reward, and the next floor as the map complete action says, as a first clear
 * (it stayed on the floor, so a low floor picked early spent the loop's clears there, 2026-10-20). */
export function clearRepeatSkyTowerClear(env, st, floor, mapAction) {
    let reward = 0;
    if (Math.random() < 0.16) reward = Math.max(1, Math.floor(env.deps.getSkyTowerRewardAmount(floor) * 0.35));
    const highest = Math.max(1, Math.floor(st.highestFloor || 1));
    st.currentFloor = Math.max(1, Math.min(highest, ['repeatZone', 'stop'].includes(mapAction) ? floor : floor + 1));
    return reward;
}
