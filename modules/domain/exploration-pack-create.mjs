import { packMarkExplorationPackShape, packMarkExplorationAlertPack } from './exploration-pack-rules.mjs';

// c.owner is the current game state, supplied for each call; deps are legacy domain services.
/** 무리의 한 자리에 설 적. 그 자리에 따로 정한 배역(role: 케르베로스의 머리와 몸통)이 있으면 그 표식으로 만들고, 만든 뒤 꾸민다. */
export function packCreateExplorationPackEnemy(c, zone, marker, index, role) {
    const enemy=c.deps.createEnemy((role && role.zone) || zone,role?{...marker,...role.marker}:marker,index);
    if(role)role.dress(enemy);
    return enemy;
}

/** 콘텐츠 외형을 최종 확정한 뒤 그 몸에 맞는 공격 방식을 적용한다. 수치 보정은 한 번만 한다. */
export function packTuneExplorationEncounterEnemy(c, enemy, encounter, zone) {
    if(!encounter)return;
    c.deps.atlasEncounters.tuneEnemy(enemy,encounter,zone);
    if(c.deps.atlasEncounters.hasOwnLook(encounter))c.deps.assignEnemyGridCombatProfile(enemy);
}

export function packCreateActExplorationPack(c, zone, room, stage, {encounter = null, formation = null} = {}) {
    const shape=c.deps.formation.prepare(zone,room,stage,encounter,formation),{key,at,cells,elite}=shape,waiting=[];
    const cast=(formation && formation.cast) || [];
    const roster=c.deps.formation.roster(zone,stage,encounter,shape,formation);
    cells.forEach((cell,index)=>{
        const marker={at,count:1,boss:stage!==null,elite:elite && index===0,storyStage:stage,ownLook:c.deps.atlasEncounters.hasOwnLook(encounter),packVisualId:roster[index]};
        const enemy=packCreateExplorationPackEnemy(c, zone,marker,index,cast[index]);
        packTuneExplorationEncounterEnemy(c, enemy,encounter,zone);
        if(stage!==null && zone.atlasStages)c.deps.atlasEndgame.tuneStage(enemy,zone,stage);
        if(stage!==null && zone.memoryTier)c.deps.memoryDungeon.tuneBoss(enemy,zone.memoryTier);
        if(stage!==null && typeof c.deps.bossVariants==='object')c.deps.bossVariants.dress(enemy);
        Object.assign(enemy,cell,{gridMoveTimer:0,regenBank:0,spawnStamp:0,explorationPack:key});
        waiting.push(enemy);
    });
    c.deps.formation.placeRanks(waiting,formation);
    const pack={key,roomId:room.id,stage,waiting,aliveIds:waiting.map(enemy=>enemy.id),eliteIds:waiting.filter(enemy=>enemy.isElite).map(enemy=>enemy.id)};
    packMarkExplorationPackShape(pack,encounter,shape,formation);
    packMarkExplorationAlertPack(c, pack);
    c.deps.atlasFinds.dressTreasurePack(zone,pack);
    return pack;
}
