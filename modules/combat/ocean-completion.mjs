export function* clearFinishOceanEncounter(env, zone) {
    // 잠수 중이 아니면(예: 강제 귀환 후 호출) 진행을 변경하지 않는다.
    let oceanSt = env.deps.ensureOceanState();
    if (oceanSt.unlocked && oceanSt.diving) (yield* clearAdvanceOceanAfterClear(env, zone, oceanSt));
    env.owner.currentZoneId = env.deps.OCEAN_ZONE_ID;
    env.owner.killsInZone = 0;
    env.deps.startMoving(false);
    (yield { kind: 'finishRedraw', args: [] });
    (yield { kind: 'queueImportantSave', args: [200] });
}

export function* clearAdvanceOceanAfterClear(env, zone, oceanSt) {
    if (!env.owner.oceanBossRunPending) return env.deps.advanceOceanDiveFromKill(zone);
    // 방금 클리어한 런은 500m 경계의 심해 가디언 전투였다 → 경계 통과 처리.
    let pendingBoundary = env.deps.getOceanPendingBossBoundary(oceanSt);
    if (pendingBoundary > 0) {
        oceanSt.bossClearM = pendingBoundary;
        oceanSt.pressureLevel = env.deps.getOceanDepthTier(oceanSt.depthM);
        env.deps.awardCurrency('reefFragment', 3);
        (yield { kind: 'finishSay', args: [env.deps._t('🌊 수심 {pendingBoundary}m의 심해 가디언을 처치했습니다! 더 깊은 곳으로 길이 열립니다. (암초 조각 +3)', { pendingBoundary }), 'loot-unique'] });
        if (pendingBoundary >= 500) env.deps.unlockJournalEntry('ocean_500');
    }
    env.owner.oceanBossRunPending = false;
}
