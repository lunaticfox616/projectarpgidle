

export function* objectInitialize(env, run,zone) {
    if(!['act','abyss','atlasMap'].includes(zone.type)||env.deps.actExplorationState.packRooms(env.deps.actExplorationMap.forRun(run)).length<2)return;
    const atlasMap=zone.type==='atlasMap',saved=atlasMap&&env.owner.atlas.run?.objects;
    if(saved&&(yield* objectRestoreSaved(env, run,saved)))return;
    run.objects=env.deps.state.create(run,objectConfiguration(env, run,zone));
    objectRemember(env, run);
}

/** A re-entered atlas map takes its saved objects when their cells fit this map (checked here: the load checks the copy's shape
 * only, js/exploration-objects.js restoreAtlas). A copy placed on another layout (a room stage setting changed since) is left
 * behind with a warning, and the map gets new objects. */
function* objectRestoreSaved(env, run,saved) {
    run.objects=JSON.parse(JSON.stringify(saved));run.objects.pendingId=null;
    try{env.deps.state.validate(run);return true;}
    catch(error){(yield {kind:'reportObjectRestoreFailure',args:['atlas map objects left behind:',error.message]});run.objects=undefined;return false;}
}

/** The facing a re-entered atlas map must keep so its saved object cells still fit; null for a fresh facing. */
export function objectSavedFacing(env, zone) {
    const saved=zone?.type==='atlasMap'?env.owner.atlas.run?.objects:null;
    return Number.isInteger(saved?.rotation)?saved.rotation:null;
}

function objectConfiguration(env, run,zone) {
    return {seed:Math.floor(env.deps.random()*4294967296),loop:env.owner.season||1,allowEvent:zone.type!=='atlasMap',
        excludedRooms:run.packs.filter(p=>p.encounter).map(p=>p.roomId),
        quantity:Math.min(4,1+Math.max(0,zone.atlasLootQuantity||0)/100),
        rarity:Math.min(500,Math.max(0,zone.atlasLootRarity||0)),chest:objectChestRules(env, zone)};
}

/** An atlas map's chest rules (js/atlas.js chestRules) plus the hero's 보급 상자 등급 확률 (보물 사냥꾼의 띠, stats.chestGrade) on the
 * silver and gold odds. Null when neither applies, so an ordinary map keeps its exact draws. */
function objectChestRules(env, zone) {
    const luck=Math.max(0,Number(env.deps.getPlayerStats().chestGrade)||0),atlasRules=zone.atlasChest||null;
    if(!luck)return atlasRules;
    return {extra:0,min:0,...atlasRules,grade:(Number(atlasRules&&atlasRules.grade)||0)+luck};
}

export function objectRemember(env, run) {
    if(run.zoneId===env.deps.ATLAS.zoneId&&env.owner.atlas.run)env.owner.atlas.run.objects=JSON.parse(JSON.stringify(run.objects));
}
