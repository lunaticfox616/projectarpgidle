import { packCreateActExplorationPack } from '../domain/exploration-pack-create.mjs';
import { packExplorationWaveCells } from '../domain/exploration-pack-placement.mjs';
import { RESCUE_STRIKE } from '../domain/exploration-pack-rules.mjs';

// Explicit current owner and combat services; yielded presentation commands are applied by the entry adapter.
/** 전투 틱마다: 주인공이 선 방이 비었고 그 방에 이어지는 무리가 남았으면(js/act-exploration-doors.js waveDue: 그동안 문은 닫혀 있다)
 * delayMs 뒤에 그 방 원래 무리의 자리에 보통 무리 하나를 세운다. 세운 무리는 곧 주인공을 알아채고 덤빈다. */
export function* flowReleaseExplorationWave(env, log) {
    const pending=waitingRoomWave(env);
    if(!pending)return;
    const {run,map,room,wave}=pending;
    const now=env.deps.getCombatTime();
    if(wave.at===null){wave.at=now+env.deps.ACT_EXPLORATION_WAVES.delayMs;return;}
    if(now<wave.at)return;
    const zone=env.deps.getZone(env.owner.currentZoneId),number=wave.total-wave.left+1,count=env.deps.formation.count(zone,null,{});
    const pack=packCreateActExplorationPack(env, zone,room,null,{encounter: null,formation: {wave:number,cells:packExplorationWaveCells(env, map,room,count)}});
    run.packs.push(pack);
    Object.assign(wave,{left:wave.left-1,at:null});
    for(const enemy of pack.waiting)(yield {kind:'addBattleFx',args:['enemySpawn',{enemyId:enemy.id,color:env.deps.getElementColor(enemy.ele),duration:420,boss:false}]});
    if(env.owner.settings.showSpawnLog!==false)(yield {kind:'waveLog',logger:log,args:[env.deps._t('⚠️ 무리가 더 몰려옵니다({number}/{total})', { number, total: wave.total }),'attack-monster']});
}

function waitingRoomWave(env) {
    const run=env.deps.actExplorationState.current(env.owner),map=run && run.status==='active'?env.deps.actExplorationDoors.stageMap(run):null;
    const room=map?env.deps.actExplorationRooms.roomAt(map,env.owner.gridPlayer):null,wave=room && env.deps.actExplorationDoors.waveDue(run,room)?run.waves[room.id]:null;
    return wave?{run,map,room,wave}:null;
}

export function* flowStrikeRescueTarget(enemy) {
    const npc=enemy.rescue;
    if(!npc)return false;
    if(enemy.hp<enemy.maxHp || !Number.isFinite(npc.gx) || !(npc.patient || npc.strikes<RESCUE_STRIKE.maxStrikes)){delete enemy.rescue;return false;}
    enemy.attackTimer=(Number(enemy.attackTimer)||0)+0.1*RESCUE_STRIKE.rate;
    if(enemy.attackTimer<1)return true;
    enemy.attackTimer-=1;
    npc.strikes++;
    (yield {kind:'announceEnemyAttackRelease',args:[enemy, null, 'instantTarget', npc]});
    (yield {kind:'addBattleFx',args:['npcStruck',{gx:npc.gx,gy:npc.gy,duration:RESCUE_STRIKE.fxMs}]});
    return true;
}

/** 방 단위 지도에서 보스가 깨어나 싸움에 드는 순간에 거는 그 콘텐츠의 규칙. 판에서는 싸움이 열릴 때 걸리던 것이다: 혼돈 밖의 나무꾼의 저주
 * (걸어가는 동안은 쌓이지 않는다). */
export function flowBeginRoomBossRules(env, zone) {
    if(zone && zone.type==='outsideChaos' && !env.owner.woodsmanCurseActive)env.deps.startWoodsmanCurse();
}

/** Apply one hive wave's difficulty once, then give each bee its own combat role. */
export function flowTuneBeehiveWaveEnemy(env, enemy, zone, isBoss, empower) {
    if (isBoss) {
        enemy.name = '👑 벌집 여왕';
        enemy.ele = 'chaos';
        enemy.ailmentChance += 0.12;
        enemy.traitName = env.deps._t('독침 여왕 (군체 강화 {floor})', { floor: Math.floor(empower || 0) });
        return enemy;
    }
    enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * zone.waveHpMul));
    enemy.atkMul *= zone.waveAttackRateMul;
    enemy.damageMul *= zone.waveDamageMul;
    const role = enemy.monsterVisualId;
    if (role === 'hive-drone') {
        enemy.maxHp = Math.floor(enemy.maxHp * 1.2);
        enemy.damageMul *= 1.12;
    } else if (role === 'hive-scout') {
        enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * 0.78));
        enemy.attackSpeedVar *= 1.25;
    } else if (role === 'hive-nurse') {
        enemy.maxHp = Math.floor(enemy.maxHp * 1.12);
        enemy.regenRate += 0.003;
        env.deps.giveEnemyEnergyShield(enemy, 20);
    } else if (role === 'hive-guard') {
        enemy.maxHp = Math.floor(enemy.maxHp * 1.3);
        enemy.dr = Math.min(90, enemy.dr + 6);
    } else if (role === 'hive-royal') {
        enemy.maxHp = Math.floor(enemy.maxHp * 1.15);
        enemy.penetration += 8;
        enemy.attackSpeedVar *= 1.12;
    }
    enemy.hp = enemy.maxHp;
    return enemy;
}

/** 벌집 원정이 방 단위 지도를 걷고 있으면 그 탐험, 판에서 싸우면 null. */
export function flowGetBeehiveRoomRun(env) {
    const run=env.deps.actExplorationState.current(env.owner);
    return run && run.rooms && env.owner.currentZoneId==='beehive_run' ? run : null;
}

/** 아직 정산하지 않은 벌집의 적: 체력 0도 사망 정산 전에는 남겨 센다. 방에서 기다리는 여왕은 제 차례에 센다. */
export function flowCountBeehiveWaveAlive(env) {
    const fighting=(env.owner.enemies||[]).length,run=flowGetBeehiveRoomRun(env);
    if(!run)return fighting;
    return fighting+run.packs.filter(pack=>pack.stage===null || env.owner.beehive.queenActive).reduce((sum,pack)=>sum+pack.waiting.length,0);
}
