

/** 체크포인트부터 잠수를 시작한다. 떠오르면 지금 있던 사냥터로 돌아온다(takeOceanReturnZone). auto: 자동 재잠수(js/combat.js
 * autoRediveOceanAfterClear)가 불렀는지. 손으로 시작한 잠수는 소득 없이 떠오른 잠수의 수를 비워 멈춘 자동 재잠수를 다시 잇는다.
 * shallow: 얕은 리프트(getOceanShallowLiftM)가 있으면 거기서 시작한다.
 * @returns {boolean} 잠수를 시작했는지 */
export function* oceanEnterOceanDive(env, owner, { auto = false, shallow = false } = {}) {
    const reason = env.deps.getZoneTravelBlockReason(env.deps.OCEAN_ZONE_ID) || env.deps.getContentStartBlockReason();
    if (reason) { (yield { kind: 'progressLog', args: [reason, 'attack-monster'] }); return false; }
    let st = env.deps.ensureOceanState(owner);
    if (!st.unlocked) { (yield { kind: 'progressLog', args: [env.deps._t('아직 심해로 진입할 수 없습니다.'), 'attack-monster'] }); return false; }
    if (st.diving) return false;
    if (!auto) st.fruitlessDives = 0;
    st.returnZoneId = owner.currentZoneId === env.deps.OCEAN_ZONE_ID ? null : owner.currentZoneId;
    st.autoDive = !!auto;
    st.diveStartProgress = env.deps.getOceanDiveRecord(st);
    st.lastSurfaceReason = '';
    st.depthM = oceanGetOceanDiveStartM(env, st, shallow);
    st.oxygenMax = Math.max(1, Math.floor(env.deps.getOceanOxygenMax(owner)));
    st.oxygenCur = st.oxygenMax;
    st.descentPendingM = 0;
    st.diving = true;
    st.lastTickAt = env.deps.getCombatTime();
    owner.currentZoneId = env.deps.OCEAN_ZONE_ID;
    (yield { kind: 'progressLog', args: [env.deps._t('🌊 심해 {depthM}m 지점부터 잠수를 시작합니다.', { depthM: st.depthM }), 'loot-rare'] });
    return true;
}

/** 얕은 리프트: 가장 깊은 리프트가 아직 못 넘은 가디언 경계에 있으면 마지막으로 넘은 가디언 자리(그 아래 구간의 무리와 낚시를 다시
 * 한다). 리프트는 경계에 닿을 때 열려서, 넘지 못한 가디언 앞의 잠수는 가디언 싸움뿐이었다. 그런 리프트가 아니면 null. */
export function oceanGetOceanShallowLiftM(env, st) {
    const interval = env.deps.getOceanBossBoundaryInterval(), from = Math.floor(Math.max(0, st.bossClearM || 0) / interval) * interval;
    return Math.floor(st.checkpointM || 0) >= from + interval ? from : null;
}

/** 잠수를 시작할 수심: 가장 깊은 리프트, shallow면 얕은 리프트(없으면 가장 깊은 리프트). */
export function oceanGetOceanDiveStartM(env, st, shallow) {
    const lift = shallow ? oceanGetOceanShallowLiftM(env, st) : null;
    return lift === null ? Math.max(0, Math.floor(st.checkpointM || 0)) : lift;
}
