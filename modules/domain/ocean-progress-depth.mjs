import { oceanGetOceanFishingStrategyDef } from './ocean-progress-collection.mjs';

// 수심을 meters 만큼 증가시키고 체크포인트/수압을 갱신하는 공통 처리.
export function* oceanApplyOceanDepthGain(env, st, meters) {
    if (!st || !(meters > 0)) return;
    let curDepth = Math.max(0, Number(st.depthM) || 0);
    // 500m 보스 경계: 다음 경계의 심해 가디언을 처치하기 전에는 그 경계까지만 전진한다.
    let interval = typeof env.deps.getOceanBossBoundaryInterval === 'function' ? env.deps.getOceanBossBoundaryInterval() : 500;
    let cleared = Math.max(0, Math.floor(st.bossClearM || 0));
    let nextBoundary = Math.floor(cleared / interval) * interval + interval;
    if (curDepth >= nextBoundary) return; // 이미 경계에 도달해 보스 처치를 기다리는 중
    st.depthM = Math.min(nextBoundary, curDepth + meters);
    yield* advanceOceanCheckpoint(env, st);
    st.pressureLevel = env.deps.getOceanDepthTier(st.depthM);
    // 경계에 막 도달한 순간(이전엔 미달, 지금 도달) 가디언 등장을 알린다.
    if (curDepth < nextBoundary && st.depthM >= nextBoundary) {
        (yield { kind: 'progressLog', args: [env.deps._t('🌊 수심 {nextBoundary}m: 심해 가디언이 길을 막습니다. 처치해야 더 깊이 내려갈 수 있습니다.', { nextBoundary }), 'loot-unique'] });
    }
}

function* advanceOceanCheckpoint(env, st) {
    let newCheckpoint = Math.floor(st.depthM / 100) * 100;
    if (newCheckpoint > (st.checkpointM || 0)) {
        st.checkpointM = newCheckpoint;
        (yield { kind: 'progressLog', args: [env.deps._t('🛗 수중 리프트 {checkpointM}m 지점이 개방되었습니다.', { checkpointM: st.checkpointM }), 'loot-rare'] });
    }
}

// 쓰러뜨린 몬스터가 쌓은 하강 거리(st.descentPendingM, applyOceanKill)를 한 번에 뛰지 않고 조금씩 내려간다(A안, OCEAN_COMBAT_DIVE).
// 가디언 경계에 닿으면 남은 거리는 버린다(applyOceanDepthGain이 경계에서 멈춘다).
export function* oceanTickOceanDepth(env, st, dtSec) {
    const pending = Math.max(0, Number(st && st.descentPendingM) || 0);
    if (!(dtSec > 0) || pending <= 0) return;
    const step = Math.min(pending, env.deps.OCEAN_COMBAT_DIVE.descentPerSec * dtSec);
    st.descentPendingM = pending - step;
    yield* oceanApplyOceanDepthGain(env, st, step);
}

/** 심해에서 쓰러뜨린 몬스터(js/combat-kill-rewards.js countKillForContent): 잠수 중이면 하강 거리를 쌓고(A안), 공기 방울을 남기는 몬스터면 산소를
 * 채운다(B안). 가디언과 그 졸개는 하강 거리를 쌓지 않는다(경계에서 멈춘다).
 * @returns {number} 채운 산소가 버티는 초(반올림, 가득 차 있었으면 0) */
export function oceanApplyOceanKill(env, owner, enemy) {
    const st = env.deps.ensureOceanState(owner);
    if (!st.unlocked || !st.diving || !enemy || enemy.isBoss) return 0;
    if (!enemy.oceanAirAdd) st.descentPendingM = Math.max(0, Number(st.descentPendingM) || 0) + oceanGetOceanKillDescentM(env, enemy);
    const seconds = oceanGetOceanKillAirSec(env, enemy), before = st.oxygenCur;
    if (seconds <= 0) return 0;
    const drainPerSec = env.deps.getOceanOxygenDrainPerSec(owner) * Math.max(0.1, Number(oceanGetOceanFishingStrategyDef(env, owner, st).oxygenDrainMul) || 1);
    st.oxygenCur = Math.min(st.oxygenMax, st.oxygenCur + drainPerSec * seconds);
    return Math.round((st.oxygenCur - before) / drainPerSec);
}

/** 몬스터 하나가 쌓는 하강 거리(m): 정예는 배로, 장비의 심해 수심 전진 속도(%)만큼 더. */
export function oceanGetOceanKillDescentM(env, enemy) {
    const rule = env.deps.OCEAN_COMBAT_DIVE, gearPct = Math.max(0, Number(env.deps.getPlayerStats().oceanDepthGainPct) || 0);
    return rule.metersPerKill * (enemy.isElite ? rule.eliteKillMul : 1) * (1 + gearPct / 100);
}

/** 쓰러지며 남기는 공기(그 수심에서 산소가 줄어드는 초 수): 가디언의 졸개, 정예, 철갑 패각충. */
export function oceanGetOceanKillAirSec(env, enemy) {
    const air = env.deps.OCEAN_COMBAT_DIVE.air;
    if (enemy.oceanAirAdd) return air.guardianAddSec;
    if (enemy.isElite) return air.eliteSec;
    return enemy.monsterVisualId === air.carrier ? air.carrierSec : 0;
}
