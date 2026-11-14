import { runGetColonyRoomRun, runColonyDefenseCoreLost, runCountColonyWaveAlive } from './colony-wave-rooms.mjs';
import { runColonyFinishScheduled, runColonyRecordEnd } from './colony-run-controls.mjs';
import { runSpawnColonyWave } from './colony-wave-spawn.mjs';
import { COLONY_MANUAL_LOOT_WAIT_MS } from './core-values.mjs';

/** 군락지의 한 틱: 살아 있는 적이 없으면 웨이브를 부른다. 방 단위 지도에서는 걸음도 여기서 돈다(군락지는 진행 막대가 멈춰 있어
 * advanceMapProgress를 거치지 않는다). 끝 방(지배체)을 비운 뒤에는 떨어진 것을 주울 때까지 다음 지도를 열지 않는다. */
export function* runTickColonyRun(env, pStats) {
    const run=runGetColonyRoomRun(env),settling=!!run && run.status==='cleared' && !env.deps.actExplorationProgress.canFinish();
    if(runColonyDefenseCoreLost(env, run)) {
        yield* runFailColonyDefense(env);
        return;
    }
    yield* runFinishColonyLootWait(env, run);
    if (yield* runColonyFinishScheduled(env, run)) return;
    if(!settling && !env.owner.colony.lootPending && runCountColonyWaveAlive(env)===0)runSpawnColonyWave(env);
    if(runGetColonyRoomRun(env))env.deps.actExplorationProgress.advance(pStats);
}

export function* runCollectManualColonyFloorLate(env, run, colony) {
    if(env.deps.actExplorationProgress.runMode(run)!=='manual')return;
    if(!env.memo.colonyLootWaits.has(colony))env.memo.colonyLootWaits.set(colony,env.deps.getCombatTime());
    if(env.deps.getCombatTime()-env.memo.colonyLootWaits.get(colony)>=COLONY_MANUAL_LOOT_WAIT_MS)(yield { kind: 'collectExplorationFloorLoot', args: [env.deps.actExplorationState.groundLoot.takeAll(run)] });
}

export function* runFinishColonyLootWait(env, run) {
    const colony=env.owner.colony;
    if(!colony.lootPending)return;
    if(run?.groundLoot?.length)yield* runCollectManualColonyFloorLate(env, run,colony);
    if(run?.groundLoot?.length)return;
    colony.lootPending=false;
    env.memo.colonyLootWaits.delete(colony);
}

/** A destroyed core ends the attempt immediately; prior completed-wave rewards remain in the bag. */
export function* runFailColonyDefense(env) {
    const colony=env.owner.colony;
    if(!colony?.inRun)return;
    const failedWave=Math.max(1,Math.floor(colony.wave || 1));
    const returnZoneId=env.deps.defeatReturnZone(colony.returnZoneId);
    runColonyRecordEnd(env, 'core');
    Object.assign(colony,{coreHp:0,failedWave,inRun:false,returnZoneId:null});
    colony.lootPending=false;
    colony.bossLootCell=null;
    env.deps.actExplorationState.groundLoot.discardEncounter(env.owner,'colony_run');
    env.deps.actExplorationProgress.defeat(env.owner);
    env.deps.actExplorationProgress.depart(env.owner);
    env.deps.clearDefeatedEncounter();
    (yield { kind: 'resetBattleRuntimeVisuals', args: [] });
    env.owner.currentZoneId=returnZoneId;
    env.owner.killsInZone=0;
    env.owner.combatHalted=false;
    (yield { kind: 'requestHeavyUiRefresh', args: [] });
    (yield { kind: 'dispatchRuntimeEvent', args: ['colony-defense-failed',{wave:failedWave,returnZoneId,background:!!env.owner.isBackgroundCalculation}] });
    (yield { kind: 'queueImportantSave', args: [200] });
}
