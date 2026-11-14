import { flowTickGrandBreachRun } from './encounter-breach.mjs';
import { flowTickWoodsmanEchoRun } from './encounter-echo.mjs';
import { flowEnsureEncounterRun } from './encounter-session.mjs';

// Explicit current owner and combat services; yielded presentation commands are applied by the entry adapter.
export function* flowSpawnEncounterMarker(env, marker) {
    let zone = env.deps.getZone(env.owner.currentZoneId);
    let count = marker.count || 1;
    if (!env.deps.hasGridCell(env.owner.gridPlayer)) env.deps.resetPlayerGridPosition();
    let blockedCells = env.deps.getGridBlockedCells();
    if (marker.boss) {
        for (let i = 0; i < Math.max(0, count - 1); i++) {
            let enemy = env.deps.createEnemy(zone, { ...marker, boss: false, elite: true }, i);
            env.deps.assignEnemyGridSpawn(enemy, blockedCells);
            enemy.spawnStamp = env.deps.getBattleSpawnStamp();
            env.owner.enemies.push(enemy);
            (yield {kind:'addBattleFx',args:['enemySpawn', { enemyId: enemy.id, color: env.deps.getElementColor(enemy.ele), duration: 360, boss: false }]});
        }
        let bossEnemy = env.deps.createEnemy(zone, { ...marker, count: 1, storyStage: env.owner.killsInZone }, count);
        env.deps.assignEnemyGridSpawn(bossEnemy, blockedCells);
        bossEnemy.spawnStamp = env.deps.getBattleSpawnStamp();
        env.owner.enemies.push(bossEnemy);
        (yield {kind:'addBattleFx',args:['enemySpawn', { enemyId: bossEnemy.id, color: env.deps.getElementColor(bossEnemy.ele), duration: 460, boss: true }]});
        if (env.owner.settings.showSpawnLog !== false) {
            (yield {kind:'addLog',args:[env.deps._t("👑 '{replace}' 등장.", { replace: bossEnemy.name.replace(/^👿\s*/, '') }), "loot-unique"]});
        }
    } else {
        for (let i = 0; i < count; i++) {
            let enemy = env.deps.createEnemy(zone, marker, i);
            env.deps.assignEnemyGridSpawn(enemy, blockedCells);
            enemy.spawnStamp = env.deps.getBattleSpawnStamp();
            env.owner.enemies.push(enemy);
            (yield {kind:'addBattleFx',args:['enemySpawn', { enemyId: enemy.id, color: env.deps.getElementColor(enemy.ele), duration: 320, boss: false }]});
        }
        if (env.owner.settings.showSpawnLog !== false) (yield {kind:'addLog',args:[env.deps._t('⚠️ 적 {count}마리 참전', { count }), marker.elite ? "loot-rare" : "attack-monster"]});
    }
}

function flowGetMapProgressGainMultiplier(zone) {
    return zone && zone.type === 'seasonBoss' ? 2 : 1;
}

/** 자체 진행 콘텐츠의 한 틱(대균열의 처치 게이지, 나무꾼의 잔상의 30초). @returns 이번 틱의 진행이 여기서 끝나는가: 판에서는 언제나
 * 끝나고, 방 단위 지도를 걷고 있으면 걸음이 이어서 돈다(advanceMapProgress). */
function* flowTickOwnClockRun(env, zone) {
    if (zone.id === 'grand_breach_run') (yield* flowTickGrandBreachRun(env, zone));
    else if (zone.type === 'woodsmanEcho') (yield* flowTickWoodsmanEchoRun(env));
    else return false;
    return !env.deps.actExplorationState.current(env.owner);
}

export function* flowAdvanceMapProgress(env, pStats) {
    if (env.owner.moveTimer > 0) return;
    let zone = env.deps.getZone(env.owner.currentZoneId) || env.deps.getZone(0);
    if (holdsMapProgress(env.owner, zone)) return;
    if (zone && (yield* flowTickOwnClockRun(env, zone))) return;
    (yield* flowEnsureEncounterRun(env));
    if(env.deps.actExplorationProgress.advance(pStats))return;
    if (env.owner.runProgress >= 100) return;
    if (env.deps.isCrowdProgressPaused()) return;
    const gain = mapProgressGain(env, zone, pStats);
    env.owner.runProgress = Math.min(100, env.owner.runProgress + gain);
    yield* spawnDueMarkers(env);
}

function* spawnDueMarkers(env) {
    while (env.owner.encounterIndex < env.owner.encounterPlan.length && env.owner.runProgress >= env.owner.encounterPlan[env.owner.encounterIndex].at) {
        (yield* flowSpawnEncounterMarker(env, env.owner.encounterPlan[env.owner.encounterIndex]));
        env.owner.encounterIndex++;
    }
}

function holdsMapProgress(owner, zone) {
    if (zone && zone.type === 'outsideChaos' && owner.woodsmanEntrancePending) return true;
    return !!(zone && zone.id === 'beehive_run' && owner.beehive && owner.beehive.inRun);
}

function mapProgressGain(env, zone, pStats) {
    let abyssScale = env.deps.getAbyssMonsterScales(zone);
    let enemyCount = (env.owner.enemies || []).filter(enemy => enemy.hp > 0).length;
    let zoneType = zone ? zone.type : 'act';
    let baseGain = ({trial:0.26,abyss:0.42,skyTower:0.072})[zoneType] ?? 0.36;
    let crowdPenalty = enemyCount > 0 ? Math.max(0.4, 1 - enemyCount * 0.13) : 0.94;
    let emptyTravelMultiplier = enemyCount === 0 ? env.deps.EMPTY_TRAVEL_PROGRESS_MULTIPLIER : 1;
    let moveSpeed = Number.isFinite(pStats.moveSpeed) && pStats.moveSpeed > 0 ? pStats.moveSpeed : 100;
    return baseGain * 0.5 * (moveSpeed / 100) * crowdPenalty * emptyTravelMultiplier
        * (abyssScale.mapProgressMul || 1) * flowGetMapProgressGainMultiplier(zone);
}
