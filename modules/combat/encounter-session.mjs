import { packGetZoneExplorationPlan } from '../domain/exploration-packs.mjs';
import { packCreateActExplorationEncounter } from '../domain/exploration-packs.mjs';

// Explicit current owner and combat services; yielded presentation commands are applied by the entry adapter.
// Explicit false is retained for replaying legacy progress-based encounters in regression
// fixtures. Production callers use the zone default; saved legacy plans finish in place.
export function* flowStartEncounterRun(env, exploration) {
    let zone = env.deps.getZone(env.owner.currentZoneId) || env.deps.getZone(0);
    const opened=flowOpenEncounterExploration(env, zone,exploration),explorationRun=opened.run;
    let returnedToGridStart = opened.returning;
    env.runtime.pTimer = 0;
    env.deps.resetCombatTacticsRuntime();
    env.deps.resetCombatChannelRuntime();
    env.runtime.progressStallTicks = 0;
    env.owner.runProgress = 0;
    env.owner.encounterIndex = 0;
    // 재능 개화 미궁 보스 실제 처치 여부(이번 런 기준). 보스 처치 없이 런이 완료 처리되는 경우 개화를 막는다.
    env.owner.bloomBossDefeated = false;
    if (typeof env.deps.clearTalentCardRuntimeState === 'function') env.deps.clearTalentCardRuntimeState();
    (yield {kind:'dispatchRuntimeEvent',args:['encounter-started', {
        zoneId: zone.id,
        zoneType: zone.type,
        contentContext: env.deps.getEncounterTelemetryContext(zone),
        background: !!env.owner.isBackgroundCalculation
    }]});
    (yield {kind:'resetBattleRuntimeVisuals',args:[]});
    env.owner.actExploration=explorationRun;
    env.deps.resetPlayerGridPosition();
    if (returnedToGridStart) {
        (yield {kind:'addBattleFx',args:['playerReturnWarp', { duration: 720, cell: env.deps.copyCombatGridCell(env.owner.gridPlayer) }]});
    }
    env.deps.restoreAndRecallSummons(env.deps.getPlayerStats());
    env.deps.primeTrialHazardTimer(zone);
    env.owner.encounterPlan = explorationRun ? [] : env.deps.generateEncounterPlan(zone);
    env.owner.enemies = [];
    flowBeginEncounterZoneRules(env, zone, explorationRun);
}

/** 전투가 열릴 때 거는 그 구역의 규칙. 혼돈 밖: 나무꾼의 저주(방 단위 지도에서는 나무꾼이 깨어날 때 걸린다: beginRoomBossRules).
 * 심해: 방 단위 지도에서는 이번 지도가 가디언의 투기장인지로 정산이 갈린다(판에서는 generateEncounterPlan이 적는다). */
function flowBeginEncounterZoneRules(env, zone, explorationRun) {
    if (zone && zone.type === 'outsideChaos' && !explorationRun) env.deps.startWoodsmanCurse();
    else env.deps.resetWoodsmanCurse();
    if (zone && zone.type === 'oceanDepth') flowBeginOceanRunRules(env, zone, explorationRun);
}

/** 심해 판이 열릴 때. 방 단위 지도: 이번 지도가 가디언의 투기장인지로 정산이 갈리고, 투기장은 영웅을 보스 방 문 안쪽에 세운다
 * (2026-10-19 사용자: "가디언 리프트에서 가디언 방으로 시작"). 판: generateEncounterPlan이 방금 적은 가디언 판은 진행 막대 끝 바로
 * 앞에서 시작해 다음 틱에 가디언이 선다(OCEAN_GUARDIAN_BOARD_START_PROGRESS). */
export function flowBeginOceanRunRules(env, zone, explorationRun) {
    if (!explorationRun) {
        if (env.owner.oceanBossRunPending) env.owner.runProgress = env.deps.OCEAN_GUARDIAN_BOARD_START_PROGRESS;
        return;
    }
    env.owner.oceanBossRunPending = !!explorationRun.source.arena;
    flowSeatOceanGuardianArena(env, zone, explorationRun);
}

/** 심해 가디언 투기장은 영웅을 보스 방 문 안쪽에 세운다: 지도를 지을 때(이동하는 동안 빈 입구 방이 보이지 않게)와 판이 열릴 때. */
function flowSeatOceanGuardianArena(env, zone, run) {
    if (zone && zone.type === 'oceanDepth' && run && run.source && run.source.arena) env.deps.actExplorationDoors.startAtGate(run);
}

/** Moving into an explored zone (a story act, or a content with its own map) lays its map out at once: the travel
 * wait (다음 구간 준비 · 재정비) shows the entrance with the character standing in it instead of the legacy 9×8 board.
 * The run stays idle until the timer ends (actExplorationProgress.tick holds it while moveTimer > 0), then
 * startEncounterRun takes it over. */
export function flowPrepareActExplorationArrival(env) {
    const zone = env.deps.getZone(env.owner.currentZoneId);
    if (!zone || zone.id !== env.owner.currentZoneId || !packGetZoneExplorationPlan(env, zone)) return;
    const run = packCreateActExplorationEncounter(env, zone);
    run.arrival = true;
    env.owner.actExploration = run;
    env.deps.resetPlayerGridPosition();
    env.deps.restoreAndRecallSummons(env.deps.getPlayerStats());
    flowSeatOceanGuardianArena(env, zone, run);
}

/** The act's exploration for a new encounter: the one laid out while moving here, else a new one (null outside acts).
 * returning: the character comes back from elsewhere on the board (the return warp plays), not already standing in it. */
function flowOpenEncounterExploration(env, zone, exploration) {
    const arrival=flowTakeActExplorationArrival(env, zone,exploration);
    const returning=!arrival && env.deps.hasGridCell(env.owner.gridPlayer) && env.deps.getGridUnitDistance(env.owner.gridPlayer,env.deps.COMBAT_GRID_CONFIG.playerSpawn)>0;
    return {run:arrival || packCreateActExplorationEncounter(env, zone,exploration),returning};
}

/** The run laid out while moving here, if this encounter starts in the same act. */
function flowTakeActExplorationArrival(env, zone, exploration) {
    const run = env.owner.actExploration;
    if (exploration === false || !run || !run.arrival || run.zoneId !== zone.id) return null;
    delete run.arrival;
    return run;
}

export function* flowEnsureEncounterRun(env) {
    if(env.deps.actExplorationState.current(env.owner))return;
    if(waveOwnsProgressPlan())return;
    if(env.owner.combatHalted && env.deps.isSkyTowerAtRewardLimit(env.deps.getZone(env.owner.currentZoneId))) {
        flowPrepareActExplorationArrival(env);
        return;
    }
    if (env.owner.moveTimer <= 0 && (!env.owner.encounterPlan || env.owner.encounterPlan.length === 0)) (yield* flowStartEncounterRun(env));
    // Board waves own an empty plan. The hive reconciles stale flags; the colony resumes or fills its wave in tickColonyRun.
    function waveOwnsProgressPlan() {
        if(env.owner.currentZoneId==='colony_run')return !!env.owner.colony?.inRun;
        return env.owner.currentZoneId==='beehive_run' && env.deps.isBeehiveRunLockedForMapTravel();
    }
}

export function flowIsRegularAutoProgressZone(zone) {
    if (!zone) return false;
    if (zone.id === 'beehive_run' || zone.id === 'colony_run' || zone.id === 'grand_breach_run') return false;
    if (typeof zone.id === 'string' && zone.id.includes('_boss_')) return false;
    return ['act', 'abyss', 'trial', 'meteor', 'labyrinth', 'chaosRealm', 'skyTower'].includes(zone.type);
}

export function* flowReconcileMapProgressRuntimeState(env) {
    if(env.deps.actExplorationState.current(env.owner))return false;
    if (typeof env.deps.reconcileBeehiveRunState === 'function') env.deps.reconcileBeehiveRunState();
    let zone = env.deps.getZone(env.owner.currentZoneId) || env.deps.getZone(0);
    if (!flowIsRegularAutoProgressZone(zone)) return false;
    const changed = clearStaleProgressFlags(env, zone);
    if (env.owner.combatHalted) return changed;
    const started = yield* restartEmptyProgressPlan(env);
    return changed || started;
}

function clearStaleProgressFlags(env, zone) {
    let changed = false;
    let explicitStop = env.deps.isCombatProgressStopped(zone);
    if (env.owner.inTicketBossFight) {
        env.owner.inTicketBossFight = false;
        changed = true;
    }
    if (env.owner.combatHalted && !explicitStop) {
        env.owner.combatHalted = false;
        changed = true;
    }
    return changed;
}

function* restartEmptyProgressPlan(env) {
    let changed = false;
    if (env.owner.moveTimer <= 0 && env.owner.runProgress <= 0) {
        let hasPlan = Array.isArray(env.owner.encounterPlan) && env.owner.encounterPlan.length > 0;
        let liveEnemies = (env.owner.enemies || []).filter(enemy => enemy && enemy.hp > 0).length;
        if (liveEnemies > 0 && !hasPlan && Math.max(0, Math.floor(env.owner.encounterIndex || 0)) === 0) {
            env.owner.enemies = [];
            changed = true;
        }
        if (!hasPlan) {
            (yield* flowStartEncounterRun(env));
            changed = true;
        }
    }
    return changed;
}
