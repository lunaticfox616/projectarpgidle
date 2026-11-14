/** A kill in the colony run, and when the wave's kills are in, the wave's end. */
export function* killAdvanceColonyWaveOnKill(env, zone, enemy) {
    if (!zone || zone.id !== 'colony_run' || !env.owner.colony || !env.owner.colony.inRun) return;
    killReleaseColonyBossLootOnKill(env, enemy);
    env.owner.colony.kills = Math.max(0, Math.floor((env.owner.colony.kills || 0) + 1));
    if ((env.owner.colony.kills || 0) >= Math.max(1, Math.floor(env.owner.colony.requiredKills || 1))) (yield* killCompleteColonyWave(env, zone, enemy));
}

export function killReleaseColonyBossLootOnKill(env, enemy) {
    if (env.owner.colony.wave%5===0 && enemy?.isBoss) env.owner.colony.bossLootCell={gx:enemy.gx,gy:enemy.gy};
    if (env.owner.colony.bossLootCell) env.deps.actExplorationState.groundLoot.releaseEncounter(env.owner.colony,env.owner.colony.bossLootCell);
}

export function killGrantColonyWaveCurrencies(env, completedWave) {
    // A wave's own rewards come at once (the log says so); only kill drops wait for the overlord
    const shards=1+Math.floor(completedWave/3);
    env.deps.awardCurrency('colonyShard',shards);
    if(Math.random()<0.35)env.deps.awardCurrency('formlessDew',1,'drop');
    if(completedWave%10===0)env.deps.awardCurrency('colonyTrace',1);
    return shards;
}

export function killRepairColonyDefenseCore(env) {
    const run=env.deps.getColonyRoomRun(),colony=env.owner.colony;
    if(!run || !env.deps.actExplorationMap.forRun(run).colonyDefense || colony.coreMaxHp<=0)return;
    colony.coreHp=Math.min(colony.coreMaxHp,colony.coreHp+Math.max(1,Math.floor(colony.coreMaxHp*0.1)));
}

/** A colony wave's rewards (shards, a chance of dew, a trace every 10th wave, a ward) and the next wave. */
export function* killCompleteColonyWave(env, zone, lastEnemy) {
    if(!env.owner.colony?.inRun)return;
    const completedWave = Math.max(1, Math.floor(env.owner.colony.wave || 1));
    const shardReward=killGrantColonyWaveCurrencies(env, completedWave);
    // 액막이도 바닥에(5웨이브마다 반드시, 나머지 웨이브 28%, js/colony-wards.js rollColonyWave): 마지막 몬스터 자리에서 다른 드랍과 함께 기다린다.
    (yield { kind: 'announceColonyWard', args: [env.deps.colonyWards.rollColonyWave(completedWave, zone, Math.random, lastEnemy)] });
    killReleaseCompletedColonyWaveLoot(env, completedWave,lastEnemy);
    env.owner.colony.wave = Math.max(1, Math.floor((env.owner.colony.wave || 1) + 1));
    env.owner.colony.highestWave = Math.max(Math.floor(env.owner.colony.highestWave || 1), env.owner.colony.wave);
    if (env.owner.colony.highestWave >= 11) env.deps.unlockJournalEntry('colony_wave_10');
    env.owner.colony.kills = 0;
    env.owner.colony.requiredKills = env.deps.getColonyWaveEnemyCount(env.owner.colony.wave);
    killRepairColonyDefenseCore(env);
    // The same arena raises the next wave on the next tick; a legacy board still spawns now.
    if (!env.deps.getColonyRoomRun() && !env.owner.colony.lootPending) env.deps.spawnColonyWave();
    (yield { kind: 'killSay', args: [env.deps._t('🪲 군락지 {completedWave}웨이브 완료. 군락지 편린 +{shardReward}{value}', { completedWave, shardReward, value: completedWave % 10 === 0 ? env.deps._t(', 군락지 흔적 +1') : '' }), 'loot-magic'] });
    (yield { kind: 'queueImportantSave', args: [200] });
}

export function killReleaseCompletedColonyWaveLoot(env, completedWave, lastEnemy) {
    if(completedWave%5===0) {
        env.deps.actExplorationState.groundLoot.releaseEncounter(env.owner.colony,env.owner.colony.bossLootCell || lastEnemy);
        env.owner.colony.lootPending=true;
    }
    env.owner.colony.bossLootCell=null;
}
