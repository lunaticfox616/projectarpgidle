import { objectInteractive, objectEntries, objectDistance, objectCancel } from './exploration-object-rules.mjs';
import { objectRemember } from './exploration-object-setup.mjs';
import { objectReward } from './exploration-object-rewards.mjs';
import { objectSpawn, objectWavePlan, objectCreateWave, objectWaveSize, objectWaveMarker } from './exploration-object-waves.mjs';
import { progressRunMode } from './exploration-progress-rules.mjs';

/** Explicit click: if distant, walk there. The existing auto-move setting is never changed. */
export function* objectRequest(env, id) {
    const run=env.deps.actExplorationState.current(env.owner);
    if(!objectInteractive(env, run))return false;
    const row=objectEntries(run).find(e=>e.id===id&&e.phase==='ready'&&e.kind!=='ambush');
    if(!row||!env.deps.state.visible(run,row))return false;
    if(objectDistance(env.owner.gridPlayer,row)<=1){env.deps.actExplorationState.lockOn(run,null);(yield* objectUse(env, run,row));return true;}
    if(!env.deps.actExplorationState.selectDestination(run,row,{object:true}))return false;
    run.objects.pendingId=id;return true;
}

function* objectUse(env, run,row) {
    objectCancel(run);run.destination=null;
    if(env.deps.state.isEvent(row)) {row.phase='warning';row.remainingMs=env.deps.state.warningMs[row.kind];objectRemember(env, run);}
    else (yield* objectReward(env, run,row));
}

export function* objectStep(env, run,elapsedMs) {
    if(!run.objects||run.status!=='active'||env.owner.combatHalted||env.owner.playerHp<=0)return;
    (yield* objectManualStep(env, run));
    (yield* objectAutoStep(env, run));
    for(const row of objectEntries(run).filter(env.deps.state.isEvent))(yield* objectAdvanceEvent(env, run,row,elapsedMs));
}

function* objectManualStep(env, run) {
    if(env.owner.isBackgroundCalculation&&run.objects.pendingId){objectCancel(run);run.destination=null;}
    const pending=objectEntries(run).find(e=>e.id===run.objects.pendingId);
    if(pending&&!env.owner.isBackgroundCalculation&&objectDistance(env.owner.gridPlayer,pending)<=1)(yield* objectUse(env, run,pending));
}

/** Automatic exploration opens a discovered sealed chest once it stands beside it and nothing else is fighting. */
function* objectAutoStep(env, run) {
    if(progressRunMode(env,run)==='manual'||run.destination||env.deps.state.active(run)||env.owner.enemies.some(e=>e.hp>0))return;
    const row=env.deps.state.autoTarget(run);
    if(row&&objectDistance(env.owner.gridPlayer,row)<=1)(yield* objectUse(env, run,row));
}

function* objectAdvanceEvent(env, run,row,elapsedMs) {
    if(row.phase==='ready'&&row.kind==='ambush'&&objectDistance(env.owner.gridPlayer,row)<=2&&env.deps.state.visible(run,row)) {
        row.phase='warning';row.remainingMs=env.deps.state.warningMs.ambush;
    }
    if(row.phase==='warning') {
        row.remainingMs=Math.max(0,row.remainingMs-elapsedMs);
        if(!row.remainingMs)(yield* objectSpawn(env, run,row));
    }
    (yield* objectFinishWave(env, run,row));
}

function* objectFinishWave(env, run,row) {
    if(row.phase==='active'&&!run.packs.some(p=>p.objectId===row.id&&p.aliveIds.length)) {
        if(row.kind==='nest'&&row.wave<2){row.phase='warning';row.remainingMs=env.deps.state.warningMs.nest;}
        else (yield* objectReward(env, run,row));
    }
}

export function* objectAfterDeath(env, run) {
    if(!run||run.completionApplied||run.status==='failed')return;
    for(const row of objectEntries(run).filter(env.deps.state.isEvent))if(row.phase==='active')(yield* objectAdvanceEvent(env, run,row,0));
    if(!env.deps.state.active(run)&&run.packs.filter(p=>p.stage!==null).every(p=>!p.aliveIds.length))run.status='cleared';
}

/** Only called at authoritative contact time, with the actual damaging cells, even if the monster already died. */
export function* objectArea(env, cells) {
    const run=env.deps.actExplorationState.current(env.owner);
    if(!run||run.status!=='active'||!cells?.length)return;
    if(env.owner.playerHp<=0||env.owner.combatHalted)return;
    const map=env.deps.actExplorationMap.forRun(run),hit=new Set(cells.filter(c=>env.deps.actExplorationMap.walkable(map,c,true)).map(c=>`${c.gx},${c.gy}`));
    for(const row of objectEntries(run).filter(row=>['pot','crate'].includes(row.kind)&&row.phase==='ready').filter(row=>hit.has(`${row.gx},${row.gy}`)))(yield* objectReward(env, run,row));
}

export function* objectStage(env, row) {
    if(row.delivery.startsWith('projectile'))return;
    const footprint=row.options.attackFootprint;
    if(!['arc','nova','blast','cone','line'].includes(footprint?.kind))return;
    if(footprint.kind==='blast'&&!footprint.radius)return;
    let cells=footprint.cells;
    if(row.wave) {
        const wave=row.wave,start=row.at-(row.options.stageDelayMs||0);
        const radius=Math.min(wave.reach,Math.max(0,env.deps.getCombatTime()-start)/wave.msPerCell);
        cells=cells.filter(c=>env.deps.getGridWaveDrawnDistance(wave,c,env.deps.getCombatTime())<=radius);
    } else if(row.whirl)cells=cells.map(c=>({gx:c.gx+env.owner.gridPlayer.gx-row.sourceCell.gx,gy:c.gy+env.owner.gridPlayer.gy-row.sourceCell.gy}));
    (yield* objectArea(env, cells));
}

/** Offline projection (js/combat-replay-projection.js): an object the measured route used. A sealed chest, an ambush or a
 * nest first raises its waves on its cell, each monster resolved by `kill` on the real kill path; then its real reward. */
export function* objectSettleProjected(env, run,row,kill) {
    if(env.deps.state.isEvent(row)) {
        const zone=env.deps.getZone(run.zoneId);
        for(let wave=row.kind==='nest'?2:1;wave>0;wave--,row.wave++) {
            const plan=objectWavePlan(env, run,row,zone);
            // New waves roll every member before any death rolls, exactly like spawn. Sealed chests keep their old order.
            const enemies=plan?objectCreateWave(env, run,row,zone,plan):null;
            // 무리 기록도 남긴다(모두 쓰러진 채, spawn과 같은 모양): 차수와 무리 수가 달라 저장이 불러와지지 않았다(validateEventOwnership, 2026-10-20)
            run.packs.push({key:`${row.id}:${row.wave+1}`,roomId:row.roomId,stage:null,waiting:[],aliveIds:[],eliteIds:[],objectId:row.id,objectWave:row.wave+1});
            for(let index=0;index<objectWaveSize(run,row);index++)kill(Object.assign(enemies?enemies[index]:env.deps.createEnemy(zone,objectWaveMarker(row,index,plan),index),{gx:row.gx,gy:row.gy}));
        }
    }
    (yield* objectReward(env, run,row));
}
