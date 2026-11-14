

export function castGetDefeatRecoveryZoneId(env) {
    let frontier = Math.max(0, Math.floor(Number(env.owner.maxZoneId) || 0));
    return env.deps.getZone(frontier) ? frontier : 0;
}

export function* castRecordPlayerDefeatStart(env, zone, options) {
    env.deps.cosmosRouteRuntime.leave(env.owner, 'failed');
    env.deps.resetHiddenJournalBossRun();
    yield { kind: 'addBattleFx', args: ['playerDown', { color: '#ff6b6b', duration: 600 }] };
    yield { kind: 'dispatchRuntimeEvent', args: ['player-defeated', {
        zoneId: zone && zone.id,
        zoneType: zone && zone.type,
        contentContext: env.deps.getEncounterTelemetryContext(zone),
        background: !!env.owner.isBackgroundCalculation,
        noToast: !!options.noToast
    }] };
}

/** 자동 진행(다음 지역) 중 스토리 액트에서 쓰러지면 바로 앞 액트로 물러난다 — 같은 무리에 거듭 쓰러지며 탐험 전리품을
 * 잃던 반복을 끊는다. ACT_RETREAT_LEVELS만큼 오르면 holdActRetreat가 다시 앞 액트로 보낸다. Returns the retreat zone name ('' = stays). */
export function castRetreatAfterActDefeat(env, zone) {
    if (zone?.type !== 'act' || !(zone.id > 0)) return '';
    if ((env.owner.settings.mapCompleteAction || 'nextZone') !== 'nextZone') return '';
    const target = env.deps.getZone(zone.id - 1);
    if (target?.type !== 'act') return '';
    env.owner.actRetreat = { frontierZoneId: zone.id, level: env.owner.level };
    env.owner.currentZoneId = target.id;
    env.owner.killsInZone = 0;
    return target.name;
}

/** 지금까지 연 구역의 캠페인 패널티(모든 원소 저항과 카오스 저항에서 뺄 값). */
export function castGetCampaignResistPenalty(env, maxZoneId) {
    return env.deps.CAMPAIGN_RESIST_PENALTY.zones.filter(zoneId => maxZoneId >= zoneId).length * env.deps.CAMPAIGN_RESIST_PENALTY.each;
}
