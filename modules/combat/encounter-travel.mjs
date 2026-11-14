import { flowPrepareActExplorationArrival } from './encounter-session.mjs';
import { flowLeaveWoodsmanEchoForTown } from './encounter-echo.mjs';
import { killEnterAutomaticMapInterruptionAfterClear } from './clear-interruption.mjs';

// Explicit current owner and combat services; yielded presentation commands are applied by the entry adapter.
export function* flowStartMoving(env, isTown) {
    env.deps.cosmosRouteRuntime.reconcileDeparture(env.owner);
    // End a run left behind before its floor owner clears unreleased loot and opens the destination.
    env.deps.holdZoneBoundRuns();
    let returnDepartureCell = isTown && env.deps.hasGridCell(env.owner.gridPlayer)
        ? env.deps.copyCombatGridCell(env.owner.gridPlayer)
        : null;
    env.deps.actExplorationProgress.depart(env.owner);
    (yield {kind:'dispatchRuntimeEvent',args:['movement-started', { background: !!env.owner.isBackgroundCalculation }]});
    env.runtime.pTimer = 0;
    env.deps.resetCombatTacticsRuntime();
    env.deps.resetCombatChannelRuntime();
    env.runtime.progressStallTicks = 0;
    if (typeof env.deps.clearTalentCardRuntimeState === 'function') env.deps.clearTalentCardRuntimeState();
    (yield {kind:'resetBattleRuntimeVisuals',args:[]});
    env.deps.restoreAndRecallSummons(env.deps.getPlayerStats());
    if (!isTown && env.deps.hasKeystone('a2')) env.owner.assassinBlurred = true;
    let ms = env.deps.getPlayerStats().moveSpeed;
    if (!Number.isFinite(ms) || ms <= 0) ms = 100;
    let time = Math.max(0.5, 1.2 * (100 / ms));
    env.owner.moveTotalTime = time;
    env.owner.moveTimer = time;
    if (returnDepartureCell) {
        (yield {kind:'addBattleFx',args:['playerReturnDepart', {
            duration: Math.max(500, Math.round(time * 1000)),
            cell: returnDepartureCell
        }]});
    }
    env.owner.isTownReturning = !!isTown;
    env.owner.combatHalted = false;
    env.owner.enemies = [];
    env.owner.encounterPlan = [];
    env.owner.encounterIndex = 0;
    env.owner.runProgress = 0;
    env.owner.playerAilments = [];
    env.owner.playerLeechInstances = [];
    env.owner.gladiatorSwiftOpeningReady = true;
    env.owner.gladiatorSwiftGuardReady = true;
    env.owner.woodsmanEntrancePending = false;
    env.deps.resetWoodsmanCurse();
    closeDepartedVoidRift(env.owner.voidRift);
    flowPrepareActExplorationArrival(env);
}

function closeDepartedVoidRift(v) {
    if (v && v.active) {
        v.active = false;
        v.pendingWave = false;
        v.totalToSpawn = 0;
        v.spawnedCount = 0;
        v.defeatedCount = 0;
        v.spawnTick = 0;
    }
}

/** Called by the existing fixed combat clock; offline resumes a saved exit without visual delay. */
export function* flowAdvanceActExplorationDeparture(env) {
    const run=env.deps.actExplorationState.current(env.owner),departure=run?.departure;
    if(!departure)return false;
    departure.remainingMs=env.owner.isBackgroundCalculation ? 0 : Math.max(0,departure.remainingMs-100);
    if(departure.remainingMs>0)return true;
    const zone=env.deps.getZone(env.owner.currentZoneId);
    env.owner.currentZoneId=departure.zoneId;
    env.deps.actExplorationProgress.depart(env.owner);
    yield* killEnterAutomaticMapInterruptionAfterClear(env, zone);
    if(env.owner.settings.townReturnAction==='stop'){env.deps.actExplorationProgress.stopAfterCompletion(env.owner);flowPrepareActExplorationArrival(env);}
    else (yield* flowStartMoving(env, false));
    (yield {kind:'dispatchRuntimeEvent',args:['exploration-departed',{background:!!env.owner.isBackgroundCalculation}]});
    return true;
}

export function* flowFinishTownReturnAction(env) {
    let action = (env.owner.settings && env.owner.settings.townReturnAction) || 'retry';
    if (action !== 'stop') return false;
    env.owner.combatHalted = true;
    env.owner.enemies = [];
    env.owner.encounterPlan = [];
    env.owner.encounterIndex = 0;
    env.owner.runProgress = 0;
    (yield {kind:'updateStaticUI',args:[]});
    return true;
}

export function* flowReturnToTown(env) {
    if (env.owner.isTownReturning && env.owner.moveTimer > 0) return;
    const returningFromRun = ['grand_breach_run', 'colony_run'].includes(env.owner.currentZoneId);
    const run = env.owner.currentZoneId === 'grand_breach_run' ? env.owner.voidRift.grandRun : env.owner.colony;
    if (returningFromRun) env.owner.currentZoneId = run?.returnZoneId ?? env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    flowLeaveWoodsmanEchoForTown(env);
    env.deps.atlasRun.leave('마을 귀환');
    env.deps.cosmosRouteRuntime.leave(env.owner);
    let pStats = env.deps.getPlayerStats();
    env.owner.playerHp = env.deps.getPlayerHpCap(pStats);
    env.owner.playerEnergyShield = Math.floor(pStats.energyShield || 0);
    env.owner.playerLeechInstances = [];
    env.runtime.pTimer = 0;
    (yield {kind:'addLog',args:[env.deps._t('⛺ 마을 귀환'), "season-up"]});
    (yield* flowStartMoving(env, true));
    (yield {kind:'updateStaticUI',args:[]});
    if (returningFromRun) (yield {kind:'queueImportantSave',args:[200]});
}

/** 전술 규칙의 마을 귀환(예전 귀환 룬): 규칙은 열린 지도의 마지막 포털을 쓰지 않는다(죽지 않고 지도가 닫히므로). */
function* flowReturnToTownByRule(env) {
    if (!env.deps.atlasRun.lastPortal()) (yield* flowReturnToTown(env));
}

/** Enabled 'return_town' rules: the first whose trigger holds sends the hero home, then the action's cooldown runs. */
export function* flowRunReturnRules(env, pStats, now = env.deps.getCombatTime()) {
    const action = env.deps.CONDITION_PATTERN_ACTION_DB.find(row => row.id === 'return_town');
    const wait = env.runtime.returnRuleReadyAt - now;
    if (!env.owner.combatTacticsUnlocked || (wait > 0 && wait <= action.cooldownMs)) return;
    const rules = (env.owner.skillAutoRules || []).filter(rule => rule && rule.enabled && rule.actionType === 'return_town');
    if (!rules.some(rule => env.deps.evaluateConditionPatternRule(rule, pStats, env.owner, now))) return;
    env.runtime.returnRuleReadyAt = now + action.cooldownMs;
    (yield* flowReturnToTownByRule(env));
}
