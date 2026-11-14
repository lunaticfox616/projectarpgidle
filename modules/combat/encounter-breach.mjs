import { flowStartEncounterRun } from './encounter-session.mjs';
import { packChainRoomsOf } from '../domain/exploration-pack-rules.mjs';
import { packFillRoomPack } from '../domain/exploration-pack-placement.mjs';

// Explicit current owner and combat services; yielded presentation commands are applied by the entry adapter.

const grandBreachRoomPortals=room=>[{gx:room.x0+1,gy:room.y0+1},{gx:room.x1-1,gy:room.y0+1},{gx:Math.round(room.gx),gy:room.y1-1}];
/** New runs fight in one arena; only an active old save still has separate breach and lord rooms. */
export function* flowGetGrandBreachArena(env, zone) {
    if(!env.deps.actExplorationState.current(env.owner) && !zone.exploration)return null;
    if(!env.deps.actExplorationState.current(env.owner))(yield* flowStartEncounterRun(env));
    const run=env.deps.actExplorationState.current(env.owner),map=env.deps.actExplorationMap.forRun(run);
    if(map.grandBreach)return {run,map,arena:map.grandBreach.arena,portals:map.grandBreach.riftCells,inside:true,singleRoom:true};
    const breach=packChainRoomsOf(map)[0];
    const woke=!run.packs.some(pack=>pack.roomId===breach.id && pack.waiting.length);
    return {run,map,arena:breach,portals:grandBreachRoomPortals(breach),inside:woke && env.deps.actExplorationRooms.roomAt(map,env.owner.gridPlayer)===breach};
}

/** At the kill target, remove surviving horde members and their already released attacks before the lord appears. */
function flowRetireGrandBreachHordeAttacks(env) {
    for(let i=env.runtime.pendingEnemyCombatAttacks.length-1;i>=0;i--)env.deps.dropEnemyAttack(i,env.deps.getCombatTime());
}

/** 목표 처치 수에 닿으면 잔여 적을 걷고 같은 아레나에 군주를 세운다. */
function flowPlaceGrandBreachBoss(env, battlefield, boss) {
    const {run,map}=battlefield;
    flowRetireGrandBreachHordeAttacks(env);
    env.owner.enemies=[];
    for(const pack of run.packs)Object.assign(pack,{waiting:[],aliveIds:[],eliteIds:[]});
    packFillRoomPack(env, map,map.rooms.find(room=>room.role==='boss'),run.packs.find(pack=>pack.stage===0),{enemies: [boss]});
    delete run.sealed;
}

/** Append at most one reinforcement; capacity pauses the queue without consuming it.
 * @param {ReturnType<typeof getZone>} zone
 * @param {{pendingWave:boolean,spawnedCount:number,totalToSpawn:number,spawnTick:number}} rift Active run, mutated in place.
 * @returns {boolean} Whether an enemy was appended.
 */
export function flowSpawnVoidBreachReinforcement(env, zone, rift) {
    const alive = env.owner.enemies.filter(e => e.hp > 0);
    if (!rift.pendingWave || rift.spawnedCount >= rift.totalToSpawn || alive.length >= 8
        || alive.filter(e => e.fromVoidRift).length >= 4) return false;
    rift.spawnTick++;
    if (rift.spawnTick < 4) return false;
    rift.spawnTick = 0;
    const index = rift.spawnedCount;
    const marker = { at: Math.max(5, Math.min(95, 10 + index * 8)), elite: env.deps.random() < 0.18, boss: false };
    const enemy = env.deps.createEnemy(zone, marker, index + 1);
    enemy.fromVoidRift = true;
    env.deps.applyVoidRiftMobTuning(enemy);
    env.owner.enemies.push(enemy);
    env.deps.ensureCombatGridRuntime();
    rift.spawnedCount++;
    return true;
}

/** Split each wave across the rifts. A crowded rift tries another before losing that spawn. */
function flowGrandBreachSpawnCell(env, deployment, offset, blocked) {
    const {portals,arena,radius}=deployment;
    for (let step = 0; step < portals.length; step++) {
        const portal = portals[(offset + step) % portals.length], cell = env.deps.findFreeGridCell(blocked, portal);
        if (!cell) continue;
        if (arena && (cell.gx < arena.x0 || cell.gx > arena.x1 || cell.gy < arena.y0 || cell.gy > arena.y1)) continue;
        if (radius && Math.max(Math.abs(cell.gx - portal.gx), Math.abs(cell.gy - portal.gy)) > radius) continue;
        return cell;
    }
    return null;
}

function flowSpawnGrandBreachEnemy(env, zone, deployment, blocked, {elite, index}) {
    const cell = flowGrandBreachSpawnCell(env, deployment, index % deployment.portals.length, blocked);
    if (!cell) return false;
    const enemy = env.deps.createEnemy(zone, {elite,boss:false}, index);
    Object.assign(enemy, cell, {gridMoveTimer:0.25,attackTimer:0,spawnStamp:env.deps.getBattleSpawnStamp()});
    blocked.add(env.deps.gridCellKey(cell.gx,cell.gy));
    env.owner.enemies.push(enemy);
    return true;
}

function flowGrandBreachWaveSize(env, run, config, alive) {
    const stage=env.deps.getGrandBreachProgress(run.gauge).stage;
    return Math.min(alive.length === 0 ? config.openingPack : config.refillPack, config.capacities[stage] - alive.length);
}

function flowDeployGrandBreachWave(env, zone, deployment, {config, alive, count}) {
    const blocked = env.deps.getGridBlockedCells();
    let elites = alive.filter(e => e.isElite).length;
    for (let i = 0; i < count; i++) {
        const elite = elites < config.eliteLimit && i % 4 === 0;
        if (!flowSpawnGrandBreachEnemy(env, zone,deployment,blocked,{elite: elite,index: i})) break;
        elites += Number(elite);
    }
}

/** The next arena wave keeps its two announced mouths until release, even across a gauge-stage boundary.
 * First entries and old saves without a plan use their existing all-mouth wave once. The old three-room route has no plan. */
function flowPlanGrandBreachRefill(env, run, battlefield, previous) {
    if (!battlefield?.singleRoom) { delete run.refillPlan; return; }
    const pairs=env.deps.GRAND_BREACH_ENCOUNTER.arena.portalPairs[env.deps.getGrandBreachProgress(run.gauge).stage];
    const turn=previous && previous.turn < Number.MAX_SAFE_INTEGER ? previous.turn+1 : 0;
    run.refillPlan={portalIndices:[...pairs[turn%pairs.length]],at:run.nextRefillAt,turn};
}

function flowGrandBreachWaveDeployment(env, battlefield, plan, radius) {
    const portals=battlefield?.portals || env.deps.GRAND_BREACH_ENCOUNTER.portals;
    return {portals:plan ? plan.portalIndices.map(index=>portals[index]) : portals,arena:battlefield?.arena,radius};
}

/** Append one bounded pack. Missed refill intervals are not replayed as a burst.
 * @param {ReturnType<typeof getZone>} zone
 * @param {{kills:number,nextRefillAt?:number,refillPlan?:{portalIndices:number[],at:number,turn:number}}} run Combat-clock wave plan; mutated in place.
 * @param {number} now Combat clock milliseconds.
 * @param {?object} battlefield 단일 아레나 또는 구 저장의 전투 공간. 판 전투면 null.
 */
function flowRefillGrandBreachWave(env, zone, run, now, battlefield) {
    if (!flowGrandBreachRefillReady(env, run,now)) return;
    const config = battlefield?.singleRoom ? env.deps.GRAND_BREACH_ENCOUNTER.arena : env.deps.GRAND_BREACH_ENCOUNTER;
    const alive = env.owner.enemies.filter(e => e.hp > 0);
    const count = flowGrandBreachWaveSize(env, run, config, alive);
    const plan=battlefield?.singleRoom ? run.refillPlan : null;
    const deployment=flowGrandBreachWaveDeployment(env, battlefield,plan,config.spawnRadius);
    if (count > 0) flowDeployGrandBreachWave(env, zone,deployment,{config: config,alive: alive,count: count});
    // Saturated or blocked waves expire too: no spawn debt, and the warning is inside the same 900 ms interval.
    run.nextRefillAt = now + config.intervalMs;
    flowPlanGrandBreachRefill(env, run,battlefield,plan);
}

function flowGrandBreachRefillReady(env, run, now) {
    return run.phase==='survival' && !env.deps.getGrandBreachProgress(run.gauge).complete && now>=(run.nextRefillAt||0);
}

function flowGrandBreachSurvivalReady(run, battlefield) {
    if (run.phase !== 'survival' || !battlefield || run.survivalStarted) return true;
    run.survivalStarted = battlefield.singleRoom || battlefield.inside;
    return run.survivalStarted;
}

function flowSummonGrandBreachLord(env, zone, run, battlefield) {
    delete run.refillPlan;
    const boss=env.deps.createEnemy(zone,{boss:true,count:1},0),soul=Math.max(0,Math.floor(run.kills||0));
    flowTuneGrandBreachLord(env, boss,soul);
    if(battlefield)flowPlaceGrandBreachBoss(env, battlefield,boss);
    else {flowRetireGrandBreachHordeAttacks(env);env.owner.enemies=[boss];}
    run.phase='boss';
    return soul;
}

/** The survival deadline on the combat clock, set when the fight begins (old runs get the full time on their next tick). */
function flowGrandBreachTimeUp(env, run, now) {
    if (!Number.isFinite(run.survivalEndsAt)) run.survivalEndsAt = now + env.deps.GRAND_BREACH_ENCOUNTER.survivalLimitSeconds * 1000;
    return now >= run.survivalEndsAt;
}

/** The lord was not called in time: the attempt fails as a defeat does (its held loot is lost), without a death or its penalty. */
function* flowFailGrandBreachTimeUp(env, zone) {
    delete env.owner.voidRift.grandRun.refillPlan;
    env.deps.actExplorationProgress.defeat(env.owner);
    env.deps.defeatInGrandBreach(zone, env.deps._t('⌛ {value}분 안에 균열 군주를 부르지 못해 대균열이 닫혔습니다.', { value: env.deps.GRAND_BREACH_ENCOUNTER.survivalLimitSeconds / 60 }), {});
    env.deps.actExplorationProgress.depart(env.owner);
    (yield {kind:'resetBattleRuntimeVisuals',args:[]});
    env.owner.combatHalted=false;
    env.runtime.pendingHeavyUiRefresh=true;
    (yield {kind:'queueImportantSave',args:[200]});
}

export function* flowTickGrandBreachRun(env, zone) {
    const g = activeGrandBreach(env.owner);
    if (!g) return;
    let now = env.deps.getCombatTime();
    const battlefield = (yield* flowGetGrandBreachArena(env, zone));
    env.deps.expireConditionEffects(now);
    if (!flowGrandBreachSurvivalReady(g, battlefield)) return;
    if (g.phase === 'survival') {
        if(env.deps.getGrandBreachProgress(g.gauge).complete)g.phase='bossPending';
        else if(flowGrandBreachTimeUp(env, g,now)){(yield* flowFailGrandBreachTimeUp(env, zone));return;}
        else flowRefillGrandBreachWave(env, zone,g,now,battlefield);
    }
    if(g.phase==='bossPending') {
        const soul=flowSummonGrandBreachLord(env, zone,g,battlefield);
        (yield {kind:'addLog',args:[env.deps._t('🕳️ 균열 몬스터 {soul}처치! 균열 군주가 출현합니다. 군주의 힘과 격파 보상은 처치 수에 따라 증가합니다.', { soul }), 'loot-unique']});
    }
}

function activeGrandBreach(owner) {
    let v = owner.voidRift || (owner.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    let g = v.grandRun;
    if (g && (g.phase!=='survival' || !g.inRun)) delete g.refillPlan;
    return g && g.inRun ? g : null;
}

/** The more rift creatures killed, the stronger the lord and the better the clear reward. */
function flowTuneGrandBreachLord(env, boss, kills) {
    const pressure = Math.min(6, Math.floor(Math.max(0, kills) / 10));
    boss.name = '👿 균열 군주';
    boss.ele = 'chaos';
    boss.maxHp = Math.max(1, Math.floor(boss.maxHp * (1 + pressure * 0.06)));
    boss.hp = boss.maxHp;
    boss.damageMul *= 1 + pressure * 0.05;
    boss.penetration += pressure * 2;
    boss.traitName = env.deps._t('공허 압박 {pressure}단계 (균열 몬스터 {kills}처치)', { pressure, kills });
    return boss;
}
