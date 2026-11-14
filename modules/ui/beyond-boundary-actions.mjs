import { renderBeyondBoundaryPanel, formatBeyondBoundaryCosts } from './beyond-boundary-markup.mjs';

export function setBeyondBoundaryTier(runtime, value) {
    (0, runtime.deps.selectBeyondBoundaryTier)(value, runtime.deps.game);
    renderBeyondBoundaryPanel(runtime);
}

export function stepBeyondBoundaryTier(runtime, delta) {
    let state = (0, runtime.deps.ensureBeyondBoundaryState)(runtime.deps.game);
    setBeyondBoundaryTier(runtime, state.selectedTier + Math.sign(Number(delta) || 0));
}

export function chooseBeyondBoundarySeal(runtime, sealId) {
    if (!(0, runtime.deps.selectBeyondBoundarySeal)(sealId, runtime.deps.game)) return;
    renderBeyondBoundaryPanel(runtime);
    if (typeof runtime.deps.saveGame === 'function') (0, runtime.deps.saveGame)();
}

export function chooseBeyondBoundaryRewardFocus(runtime, focusId) {
    if (!(0, runtime.deps.selectBeyondBoundaryRewardFocus)(focusId, runtime.deps.game)) return;
    renderBeyondBoundaryPanel(runtime);
    if (typeof runtime.deps.saveGame === 'function') (0, runtime.deps.saveGame)();
}

export function chooseBeyondBoundaryIntensity(runtime, intensityId) {
    if (!(0, runtime.deps.selectBeyondBoundaryIntensity)(intensityId, runtime.deps.game)) return;
    renderBeyondBoundaryPanel(runtime);
    if (typeof runtime.deps.saveGame === 'function') (0, runtime.deps.saveGame)();
}

export function enterBeyondBoundaryRun(runtime) {
    if (runtime.deps.game.pendingLoopDecision) return (0, runtime.deps.addLog)((0, runtime.deps._t)('루프 정산 화면에서 먼저 결정하세요(루프 진행 또는 나중에 루프).'), 'attack-monster');
    const held = (0, runtime.deps.getZoneTravelBlockReason)(runtime.deps.BEYOND_BOUNDARY_ZONE_ID) || (0, runtime.deps.getHeldRunBlockReason)();
    if (held) return (0, runtime.deps.addLog)(held, 'attack-monster');
    let state = (0, runtime.deps.ensureBeyondBoundaryState)(runtime.deps.game);
    const previousTier = state.selectedTier, previousRun = state.activeRun;
    const wallet = (0, runtime.deps.getBeyondBoundaryIntensityCosts)(state.selectedIntensityId).map(({ key }) => [key, runtime.deps.game.currencies[key]]);
    let result = (0, runtime.deps.startBeyondBoundaryRun)(state.selectedTier, runtime.deps.game);
    if (!result.ok) {
        const messages = { locked: '경계 너머가 아직 잠겨 있습니다.', active: '이미 경계 너머에 도전 중입니다.',
            cost: (0, runtime.deps._t)('조율 재화가 부족합니다. (필요: {costs})', { costs: formatBeyondBoundaryCosts(runtime, result.costs) }) };
        return (0, runtime.deps.addLog)(result.reason || messages[result.code], 'attack-monster');
    }
    // Entry owns its payment only after travel succeeds. A refusal keeps the exact prior wallet and selection.
    try { (0, runtime.deps.changeZone)(runtime.deps.BEYOND_BOUNDARY_ZONE_ID); }
    finally {
        if (runtime.deps.game.currentZoneId !== runtime.deps.BEYOND_BOUNDARY_ZONE_ID) {
            state.activeRun = previousRun;
            state.selectedTier = previousTier;
            wallet.forEach(([key, value]) => { runtime.deps.game.currencies[key] = value; });
        }
    }
    if (runtime.deps.game.currentZoneId !== runtime.deps.BEYOND_BOUNDARY_ZONE_ID) return;
    (0, runtime.deps.switchTab)('tab-battle');
    if (typeof runtime.deps.saveGame === 'function') (0, runtime.deps.saveGame)();
}

export function viewBeyondBoundaryCombat(runtime) {
    if (!(0, runtime.deps.ensureBeyondBoundaryState)(runtime.deps.game).activeRun) return;
    if (runtime.deps.game.currentZoneId !== runtime.deps.BEYOND_BOUNDARY_ZONE_ID) (0, runtime.deps.changeZone)(runtime.deps.BEYOND_BOUNDARY_ZONE_ID);
    (0, runtime.deps.switchTab)('tab-battle');
}

export function leaveBeyondBoundaryRun(runtime) {
    let returnZoneId = (0, runtime.deps.abandonBeyondBoundaryRun)(runtime.deps.game);
    if (returnZoneId === null || returnZoneId === undefined) return;
    runtime.deps.game.currentZoneId = returnZoneId;
    runtime.deps.game.killsInZone = 0;
    (0, runtime.deps.startMoving)(false);
    (0, runtime.deps.addLog)((0, runtime.deps._t)('경계 너머 도전을 포기했습니다.'), 'attack-monster');
    (0, runtime.deps.updateStaticUI)();
    if (typeof runtime.deps.saveGame === 'function') (0, runtime.deps.saveGame)();
}
