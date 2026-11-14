import { oceanGetOceanShallowLiftM } from './ocean-progress-entry.mjs';

export function* oceanForceSurfaceOcean(env, owner, reason) {
    let st = env.deps.ensureOceanState(owner);
    const returnZoneId = oceanTakeOceanReturnZone(env, owner, st);
    st.diving = false;
    st.depthM = Math.max(0, Math.floor(st.checkpointM || 0));
    st.descentPendingM = 0;
    st.oxygenCur = st.oxygenMax;
    st.drowning = false;
    st.drownSec = 0;
    const stopNote = oceanRecordOceanSurface(env, owner, st, reason);
    (yield { kind: 'progressLog', args: [reason === 'oxygen' ? '🫧 산소가 모두 소진되어 익사 직전에 수면으로 끌어올려졌습니다. 체크포인트 이후의 진행이 사라졌습니다.' : '🌊 잠수를 종료하고 수면으로 복귀했습니다.', 'attack-monster'] });
    if (stopNote) (yield { kind: 'progressLog', args: [stopNote, 'attack-monster'] });
    st.autoDive = false;
    // 실패(산소 고갈) 시에도 '수면으로 복귀' 버튼과 동일하게 심해 맵을 벗어나 수면(일반 맵)으로 이동한다.
    if (reason !== 'manual') {
        yield { kind: 'progressAutoSurface', args: [returnZoneId] };
    }
    return returnZoneId;
}

/** 떠오른 까닭을 적고, 산소가 떨어지거나 가디언에게 쓰러진 잠수면 소득(새 리프트, 가디언 처치, 물고기)이 있었는지 센다(자동 재잠수가
 * 읽는다). 'defeat'는 자동 재잠수로 들어간 잠수에서 무리에게 쓰러진 경우다(가디언에게 쓰러지면 'guardian').
 * @returns {string} 자동 재잠수가 멈췄거나 얕게 이어지면 그 알림, 아니면 빈 글 */
export function oceanRecordOceanSurface(env, owner, st, reason) {
    st.lastSurfaceReason = ['oxygen', 'guardian', 'defeat'].includes(reason) ? reason : 'manual';
    if (reason === 'defeat') return owner.settings.autoRediveOcean ? '🌊 자동 재잠수로 들어간 잠수에서 무리에게 쓰러져 자동 재잠수를 멈춥니다. 잠수 시작을 누르면 다시 이어집니다.' : '';
    if (reason !== 'oxygen' && reason !== 'guardian') return '';
    const limit = env.deps.OCEAN_AUTO_REDIVE.missLimit;
    st.fruitlessDives = env.deps.getOceanDiveRecord(st) > st.diveStartProgress ? 0 : Math.min(limit, st.fruitlessDives + 1);
    return owner.settings.autoRediveOcean ? oceanGetOceanAutoRediveNote(env, st, reason) : '';
}

/** 자동 재잠수 알림: 소득 없이 한도만큼 떠올라 멈췄거나, 넘지 못한 가디언 때문에 다음 잠수가 지난 가디언 자리부터 내려간다. */
export function oceanGetOceanAutoRediveNote(env, st, reason) {
    const limit = env.deps.OCEAN_AUTO_REDIVE.missLimit;
    if (st.fruitlessDives >= limit) return env.deps._t('🌊 리프트도 가디언 처치도 물고기도 없이 {limit}번 떠올라 자동 재잠수를 멈춥니다. 잠수 시작을 누르면 다시 이어집니다.', { limit });
    const lift = reason === 'guardian' ? oceanGetOceanShallowLiftM(env, st) : null;
    return lift === null ? '' : env.deps._t('🌊 자동 재잠수는 {lift}m부터 내려가 물고기를 모읍니다.', { lift });
}

/** 떠오를 곳: 잠수를 시작한 사냥터(액트나 혼돈 구역이 남아 있으면), 아니면 예전처럼 가장 먼 사냥터. 기록은 비운다. changeZone은
 * maxZoneId를 넘는 번호(혼돈 심화의 더 깊은 층)를 받지 않으므로 그런 층에서 시작한 잠수도 가장 먼 사냥터로 올라온다. */
export function oceanTakeOceanReturnZone(env, owner, st) {
    const back = st.returnZoneId === null ? null : env.deps.getZone(st.returnZoneId), farthest = Math.max(0, owner.maxZoneId || 0);
    st.returnZoneId = null;
    return back && ['act', 'abyss'].includes(back.type) && !(back.id > farthest) ? back.id : farthest;
}

/** 새 루프: 자동 재잠수는 이 루프에서 직접 시작한 잠수가 떠오른 뒤부터 잇는다(낮은 레벨의 새 영웅을 지난 루프의 깊은 리프트로 보내지 않게). */
export function oceanForgetOceanAutoDive(st) {
    st.lastSurfaceReason = '';
    st.returnZoneId = null;
    st.autoDive = false;
}

/** 자동 재잠수 설정(심해 잠수 창의 단추). 켤 때 소득 없이 떠오른 잠수의 수를 비운다. */
export function oceanSetOceanAutoRedive(env, owner, on) {
    owner.settings.autoRediveOcean = !!on;
    if (on) env.deps.ensureOceanState(owner).fruitlessDives = 0;
}
