// Read-only runtime survey; synthetic encounters do not establish player clear times or build balance.
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();

function auditMapZone(kind, value, season) {
    game = mergeDefaults({}); window.game = game;
    game.season = season; game.loopCount = season - 1;
    let id;
    switch (kind) {
        case 'act': id = value - 1; break;
        case 'abyss': id = getAbyssZoneIdForDepth(value); break;
        case 'chaos': ensureChaosRealmState().currentFloor = value; id = CHAOS_REALM_ZONE_ID; break;
        case 'underworld': game.underworldProgress.currentFloor = value; id = UNDERWORLD_ZONE_ID; break;
        case 'labyrinth': game.labyrinthFloor = value; id = LABYRINTH_ZONE_ID; break;
        case 'ocean': ensureOceanState().depthM = value; id = OCEAN_ZONE_ID; break;
        case 'sky': Object.assign(ensureSkyTowerState(),{highestFloor:value,currentFloor:value}); id = SKY_TOWER_ZONE_ID; break;
        case 'meteor': game.starWedge.activeMeteorTier = value; id = METEOR_FALL_ZONE_ID; break;
        case 'hive': game.beehive.branchStep = value; id = 'beehive_run'; break;
        case 'colony': game.colony.wave = value; id = 'colony_run'; break;
        case 'breach': id = 'grand_breach_run'; break;
        case 'cosmos':
            game.cosmosAtlas.activeChallenge = {tier:57 + (value - 1) * 5,galaxy:value,lootTier:(value - 1) * 5 + 1};
            id = 'cosmos_challenge'; break;
        case 'boundary': game.beyondBoundary.selectedTier = value; id = BEYOND_BOUNDARY_ZONE_ID; break;
        case 'past': ensureTimeRiftState().pressure = value; id = TIME_RIFT_PAST_ZONE_ID; break;
        case 'future': ensureTimeRiftState().pressure = value; id = TIME_RIFT_FUTURE_ZONE_ID; break;
        default: id = value;
    }
    game.currentZoneId = id;
    const zone = getZone(id);
    if (!zone) throw new Error(`Unknown survey zone: ${kind} ${value}`);
    const enemy = createEnemy(zone, {boss:true}, 0);
    game.level = enemy.level;
    const estimate = estimateMapZonePowerRequirements(zone);
    const cap = Math.min(getRealmEquipmentHiddenTierCap(zone), levelProgression.maxDropTier(enemy.level));
    const row = {kind,value,loop:season,id:zone.id,name:zone.name,level:levelProgression.areaLevel(zone),
        bossLevel:enemy.level,hp:enemy.maxHp,recommendedDps:estimate.dps,recommendedEhp:estimate.ehp,
        sameLevelExperience:getEnemyExperienceReward(enemy,getPlayerStats(false)),dropCap:cap,
        affixCap:Math.min(levelProgression.affixCap(enemy.level),getRealmEquipmentAffixTierCap(zone,cap))};
    row.finite = [row.level,row.hp,row.recommendedDps,row.recommendedEhp,row.sameLevelExperience]
        .every(number => Number.isFinite(number) && number > 0);
    return row;
}

vm.runInContext(auditMapZone.toString(), runtime);
const ranges = {act:[1,3,6,10],abyss:[1,10,20,21,50,100,500],chaos:[1,10,20,30],
    underworld:[1,10,20,30,100,299,300,301,400],labyrinth:[1,10,29,30,50,100,200],ocean:[0,100,500,1000],
    sky:[1,10,30,100],meteor:[8,20,40],hive:[1,6,10],colony:[1,5,10,20,50],breach:[1],
    cosmos:[1,2,3,4,5],boundary:[1,10,30,100],past:[1,5,10],future:[1,5,10]};
ranges.named = vm.runInContext('[...TRIAL_ZONES,...SEASON_BOSS_ZONES].map(zone=>zone.id)',runtime);
const rows = [];
for (const loop of [1,50]) for (const [kind, values] of Object.entries(ranges)) for (const value of values) {
    rows.push(vm.runInContext(`auditMapZone(${JSON.stringify(kind)},${JSON.stringify(value)},${loop})`, runtime));
}
console.log(JSON.stringify({method:'deterministic boss/stat survey; ignores access gates and player equipment; not a clear-time simulation',rows},null,2));
if (rows.some(row => !row.finite)) process.exitCode = 1;
