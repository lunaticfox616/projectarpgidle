import { atlasCoreCompleted, atlasCoreStatus, atlasCoreGateMissing, atlasCoreEffectiveTier } from './atlas-graph.mjs';
import { atlasCoreLockReason, atlasCoreRunOpenReason, atlasCoreTicketReason } from './atlas-access.mjs';
import { atlasCoreStartRun } from './atlas-entry.mjs';

// 천문도의 보스 자리(개편 C, 2026-11-24): 자리마다 기존 싸움 하나(ATLAS.chartFights)를 치른다. 열림은 천문도의 규칙이다
// (atlas-graph atlasCoreGateOpen). 자리를 아직 완료하지 않았으면 비용 없이 포털 ATLAS.portals개로 들어가고, 포털이 다 닫혀도 돌려받을
// 것이 없다. 완료한 뒤에는 그 싸움의 지금 비용을 낸다: 수호자는 그 수호자의 지도석, 정점은 뿌리 입장권 4종, 후반 싸움은 바치는 재료.
// 시대 재생이 완료를 비우면 첫 도전은 다시 비용이 없다.

function atlasCoreGateNode(env, gateId) {
    const node = env.BY_ID.get(gateId);
    return node?.kind === 'gate' ? node : null;
}

/** 이번 입장이 비용 없는 첫 도전인지: 그 자리를 아직 완료하지 않았다. */
export function atlasCoreGateFree(state, gateId) { return !atlasCoreCompleted(state, gateId); }

/** 수호자 자리에 쓸 보관함의 지도석: 그 수호자의 것 중 먼저 얻은 것. */
export function atlasCoreGateStone(state, fight) { return state.atlas.stash.find(map => map.node === fight.id) || null; }

/** 닫힌 자리의 말: 아직 완료하지 않은, 자리가 기다리는 노드의 이름과 함께. */
export function atlasCoreGateLock(env, state, gateId) {
    const gate = atlasCoreGateNode(env, gateId);
    const names = gate ? atlasCoreGateMissing(state, gate).map(id => env.deps._t(env.BY_ID.get(id).name)).join(', ') : '';
    return names ? env.deps._t('{names} 완료 뒤에 열립니다.', { names }) : '';
}

/** 완료한 자리에서 그 싸움의 비용을 낼 수 없는 까닭('' = 낼 수 있다). */
function atlasCoreGateCostReason(env, state, fight) {
    if (fight.kind === 'guardian') return atlasCoreGateStone(state, fight) ? '' : env.deps._t('수호자 지침이 필요합니다.');
    if (fight.kind === 'pinnacle') return atlasCoreTicketReason(env, state);
    return env.deps.atlasEndgame.offeringReason(state, fight.id);
}

/** @returns {string} '' when the fight of that chart boss can start now, otherwise why not. */
export function atlasCoreGateReason(env, state, gateId) {
    const gate = atlasCoreGateNode(env, gateId);
    if (!gate) return '없는 싸움입니다.';
    const lock = atlasCoreLockReason(env, state);
    if (lock) return lock;
    if (state.atlas.run) return atlasCoreRunOpenReason(state);
    if (atlasCoreStatus(env, state, gate.id) === 'locked') return atlasCoreGateLock(env, state, gate.id);
    return atlasCoreGateFree(state, gate.id) ? '' : atlasCoreGateCostReason(env, state, env.BY_ID.get(gate.fight));
}

/** 지도석 없이 여는 싸움의 지도: 그 싸움의 노드, 씨앗이 올린 등급, 일반 희귀도. */
function atlasCoreFightMap(env, state, fight, random) {
    const map = env.deps.atlasMaps.create(fight.id, atlasCoreEffectiveTier(env, state, fight), 'normal', random);
    map.uid = state.atlas.nextUid++;
    return map;
}

/** 완료한 자리의 비용을 내고 열 지도를 돌려준다: 수호자는 보관함의 그 지도석 자체(희귀도와 옵션 그대로). */
function atlasCoreGatePay(env, state, fight, random) {
    if (fight.kind === 'guardian') {
        const stone = atlasCoreGateStone(state, fight);
        state.atlas.stash.splice(state.atlas.stash.indexOf(stone), 1);
        return stone;
    }
    if (fight.kind === 'pinnacle') for (const key of env.deps.ATLAS.pinnacle.tickets) state.currencies[key] -= 1;
    else env.deps.atlasEndgame.spend(state, fight.id);
    return atlasCoreFightMap(env, state, fight, random);
}

/** 천문도의 보스 자리에서 그 싸움을 연다. run.free: 비용 없는 첫 도전(취소하거나 포털이 다 닫혀도 돌려줄 것이 없다). */
export function atlasCoreBeginGate(env, state, gateId, returnZoneId, random = Math.random) {
    const reason = atlasCoreGateReason(env, state, gateId);
    if (reason) return reason;
    const gate = atlasCoreGateNode(env, gateId), fight = env.BY_ID.get(gate.fight), free = atlasCoreGateFree(state, gate.id);
    const map = free ? atlasCoreFightMap(env, state, fight, random) : atlasCoreGatePay(env, state, fight, random);
    atlasCoreStartRun(env, state, map, returnZoneId, random);
    state.atlas.run.free = free;
    return '';
}
