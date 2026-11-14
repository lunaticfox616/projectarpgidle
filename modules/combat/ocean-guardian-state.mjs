/** 잠수가 가디언 경계(500m마다)에 닿았는데 무리 구간을 돌고 있으면 그 구간을 접고 가디언 판을 연다(2026-10-19 사용자: "경계에
 * 닿으면 가디언 바로 등장"). 남은 무리는 처치 보상 없이 사라지고, 이미 다 깬 구간은 끝나는 대로(낚시 게이지를 받고) 가디언 판으로
 * 넘어간다. 이동하는 동안 넘었으면 걸어 들어갈 무리 지도를 투기장으로 바꿔 짓는다. 멈춤과 쓰러짐에는 손대지 않는다(이 틱의
 * 산소가 영웅을 수면으로 올렸으면 지역이 이미 바뀌어 있다). */
export function killCallOceanGuardianAtBoundary(env) {
    if (env.owner.currentZoneId !== env.deps.OCEAN_ZONE_ID || env.owner.combatHalted || !(env.owner.playerHp > 0)) return;
    const st = env.deps.ensureOceanState();
    if (!st.diving || env.deps.getOceanPendingBossBoundary(st) <= 0) return;
    if (env.owner.moveTimer > 0) killRelayOceanArrivalToGuardian(env);
    else if (killIsOceanSectionRunning(env)) env.deps.startMoving(false);
}

/** 심해에서 쓰러뜨린 몬스터: 수심을 내리고(A안) 공기 방울을 남기면 영웅 머리 위에 채운 산소를 초로 띄운다(B안, js/passives.js
 * applyOceanKill. 산소 막대도 "약 N초 남음"으로 읽는다). */
export function* killNoteOceanKill(env, enemy, zone) {
    if (!zone || zone.type !== 'oceanDepth') return;
    const seconds = env.deps.applyOceanKill(enemy);
    if (!(seconds > 0)) return;
    (yield { kind: 'addBattleFx', args: ['statusText', { text: env.deps._t('🫧 산소 +{seconds}초', { seconds }), color: '#8fd8ff', duration: 620 }] });
    // 쓰러진 자리에서 공기 기둥이 솟는다(js/canvas-stage-ocean.js): 여덟 장(장마다 125ms)을 두 바퀴
    (yield { kind: 'addBattleFx', args: ['oceanAir', { enemyId: enemy.id, cell: { gx: enemy.gx, gy: enemy.gy }, duration: 2000 }] });
}

/** 심해 가디언이 졸개를 부른다(B안, OCEAN_COMBAT_DIVE.guardianAdds): 가디언이 선 뒤 everyMs마다(다음 시각은 가디언이 들고 있다),
 * 살아 있는 졸개가 max보다 적으면. 졸개는 쓰러지며 공기 방울을 남긴다(js/passives.js getOceanKillAirSec). say: 전투 기록(addLog). */
export function* killCallOceanGuardianAdds(env) {
    const guardian = killGetOceanGuardianInFight(env);
    if (!guardian) return;
    const rule = env.deps.OCEAN_COMBAT_DIVE.guardianAdds, now = env.deps.getCombatTime();
    if (!(guardian.oceanAddsAt > 0)) guardian.oceanAddsAt = now + rule.everyMs;
    if (now < guardian.oceanAddsAt) return;
    guardian.oceanAddsAt = now + rule.everyMs;
    const alive = env.owner.enemies.filter(enemy => enemy && enemy.hp > 0 && enemy.oceanAirAdd).length;
    const called = (yield* killSpawnOceanGuardianAdds(env, guardian, Math.min(rule.count, rule.max - alive)));
    if (called > 0 && env.owner.settings.showSpawnLog !== false) (yield { kind: 'killSay', args: [env.deps._t('🫧 심해 가디언이 졸개 {called}마리를 불렀습니다. 쓰러뜨리면 공기 방울이 나옵니다.', { called }), 'attack-monster', { noToast: true }] });
}

/** 심해 가디언 판에서 싸우고 있는 가디언(칸에 선 살아 있는 보스), 아니면 null. */
export function killGetOceanGuardianInFight(env) {
    if (env.owner.currentZoneId !== env.deps.OCEAN_ZONE_ID || !env.owner.oceanBossRunPending || env.owner.combatHalted || !(env.owner.playerHp > 0)) return null;
    const guardian = (env.owner.enemies || []).find(enemy => enemy && enemy.isBoss && enemy.hp > 0);
    return guardian && env.deps.hasGridCell(guardian) ? guardian : null;
}

/** 가디언 곁 빈칸에 졸개를 세운다. @returns {number} 세운 수 */
export function* killSpawnOceanGuardianAdds(env, guardian, count) {
    const zone = env.deps.getZone(env.deps.OCEAN_ZONE_ID), blocked = env.deps.getGridBlockedCells();
    let called = 0;
    for (; called < count; called++) {
        const cell = env.deps.findFreeGridCell(blocked, guardian);
        if (!cell) break;
        const enemy = env.deps.createEnemy(zone, { at: 90, elite: false, boss: false }, 40 + called);
        Object.assign(enemy, cell, { gridMoveTimer: 0.25, attackTimer: 0, oceanAirAdd: true, spawnStamp: env.deps.getBattleSpawnStamp() });
        blocked.add(env.deps.gridCellKey(cell.gx, cell.gy));
        env.owner.enemies.push(enemy);
        (yield { kind: 'addBattleFx', args: ['enemySpawn', { enemyId: enemy.id, color: env.deps.getElementColor(enemy.ele), duration: 320, boss: false }] });
    }
    return called;
}

/** 이동하는 동안 지어 둔 도착 지도가 무리 구간이면 가디언 투기장으로 다시 짓는다(도착한 뒤 한 번 더 이동하지 않게). */
export function killRelayOceanArrivalToGuardian(env) {
    const run = env.deps.actExplorationState.current(env.owner);
    if (run && run.arrival && !(run.source && run.source.arena)) env.deps.prepareActExplorationArrival();
}

/** 무리 구간이 돌고 있는가: 가디언 판이 아니고 아직 다 깨지 않았다(방 단위 지도는 탐험의 상태, 판은 남은 무리와 살아 있는 몬스터). */
export function killIsOceanSectionRunning(env) {
    const run = env.deps.actExplorationState.current(env.owner);
    if (run) return !(run.source && run.source.arena) && run.status === 'active';
    const plan = env.owner.encounterPlan || [];
    if (!plan.length || plan.some(marker => marker && marker.boss)) return false;
    return env.owner.encounterIndex < plan.length || (env.owner.enemies || []).some(enemy => enemy && enemy.hp > 0);
}
