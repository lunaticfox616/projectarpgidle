import { restoreCosmosRouteSave } from './saved-cosmos-route.mjs';

export function normalizeSavedCombatRuntime(deps, state) {
    // 지난 지도의 바닥 실타래는 아래 복원이 보관함에 넣는다: 손상된 보관함이면 그 전에 고친다
    state.knitting = deps.knitting.normalize(state.knitting, state.season);
    deps.actExplorationState.groundLoot.normalizeEncounter(state);
    deps.actExplorationState.restore(state);
    deps.combatLootReceipts.normalize(state);
    state.cosmosGravity = null;
    restoreCosmosRouteSave(deps, state);
    const challenge = state.cosmosAtlas.activeChallenge;
    if (challenge) challenge.habitat = deps.cosmosRouteRuntime.habitat(state, challenge.nodeId);
    const time = Number(state.combatTimeMs);
    state.combatTimeMs = Number.isFinite(time) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, time)) : 0;
    delete state.isBackgroundCalculation;
    delete state.backgroundStopReason;
    delete state.backgroundOverflowSalvageCount;
    delete state.backgroundKillMix;
    return state;
}

export function getSavedZoneForValidation(deps, state) {
    if (state.currentZoneId === deps.ATLAS.zoneId) return deps.atlas.zone(state);
    // During boot the current game has no challenge yet; validate the incoming snapshot instead.
    if (state.currentZoneId === 'cosmos_challenge') return (0, deps.createCosmosChallengeZone)(state);
    const zone = (0, deps.getZone)(state.currentZoneId);
    // The zone registry owns valid IDs; array properties such as "constructor" are not zones.
    return zone?.id === state.currentZoneId ? zone : null;
}
