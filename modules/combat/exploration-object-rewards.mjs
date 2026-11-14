import { objectCancel, objectDistance } from './exploration-object-rules.mjs';
import { objectRemember } from './exploration-object-setup.mjs';

export function* objectReward(env, run,row) {
    if(row.phase==='spent')return;
    const prop=['pot','crate'].includes(row.kind),rng=env.deps.state.random((run.objects.seed+Math.abs(env.deps.hashSeed(row.id)))>>>0);
    const drop=env.deps.state.solid({...row,phase:'spent'})?objectSpillCell(env, run,row):row;
    const enemy=objectChestEnemy(env, run,drop);
    const items=prop?objectRollPropItems(env, run,enemy,rng):objectRollItems(env, run,row,enemy,rng);
    row.phase='spent';row.remainingMs=0;
    if(run.objects.pendingId===row.id){objectCancel(run);run.destination=null;}
    objectRemember(env, run);
    env.deps.combatLootReceipts.capture(env.owner,()=>objectPay(env, run,row,{prop,items,enemy,rng}));
    (yield {kind:'dispatchRuntimeEvent',args:['exploration-object',{kind:'reward',name:env.deps.state.name(row),objectKind:row.kind,
        grade:row.grade,cell:{gx:row.gx,gy:row.gy}}]});
    if(!env.owner.isBackgroundCalculation)(yield {kind:'queueImportantSave',args:[220]});
}

/** The chest's stand-in enemy carries an atlas map's per-enemy loot multipliers like its monsters (js/loot-omens.js enemyMods): a gear
 * omen's equipment count and the unique chance. */
function objectChestEnemy(env, run,cell) {
    const mods=env.deps.lootOmens.enemyMods(env.deps.getZone(run.zoneId));
    const enemy={id:0,gx:cell.gx,gy:cell.gy,isBoss:false,isElite:false};
    return mods?Object.assign(enemy,{equipmentDropMul:mods.equipmentMul,uniqueChanceMul:mods.uniqueMul}):enemy;
}

/** An opened chest still stands on its cell: its loot falls beside it (a free neighbour near the hero, not the hero's cell), in front of it
 * or at its side, never on the cell behind it: the standing chest is drawn over that cell (2026-10-16 사용자: 아이템이 상자에 가려짐). */
function objectSpillCell(env, run,row) {
    const map=env.deps.actExplorationMap.forRun(run),solid=env.deps.state.solidCells(run);
    const hero=env.owner.gridPlayer,free=env.deps.actExplorationMap.neighbors(map,row).filter(c=>!solid.has(`${c.gx},${c.gy}`));
    // Nearest the hero, but never under the hero's own feet.
    const behind=c=>Number(c.gy<row.gy);
    free.sort((a,b)=>behind(a)-behind(b)||Number(objectDistance(a,hero)===0)-Number(objectDistance(b,hero)===0)||objectDistance(a,hero)-objectDistance(b,hero));
    return free[0]||row;
}

/** Item rolls: the map quantity plus the chest grade's extra rolls. The grade's first rolls always give an item, the first
 * `rare` of them at least rare; every item takes one drop-variant draw scaled by the grade (data/maps.js EXPLORATION_CHEST_GRADES). */
function objectRollItems(env, run,row,enemy,rng) {
    const grade=env.deps.state.grade(row)||{rolls:0,guaranteed:0,rare:0,variantScale:1};
    const quantity=run.objects.quantity*(enemy.equipmentDropMul||1),count=Math.floor(quantity)+Number(rng()<quantity%1)+grade.rolls,items=[];
    const zone=env.deps.getZone(run.zoneId),always=env.deps.state.isEvent(row)||!env.deps.contentProgression.canDropCurrency('magicBud');
    for(let i=0;i<count;i++) {
        if(!always&&i>=grade.guaranteed&&rng()>=.45)continue;
        const rare=i<grade.rare||rng()<Math.min(.65,.18+run.objects.rarity/1000);
        const drop=env.deps.equipmentDropVariants.expand(env.deps.generateEquipmentDrop(enemy,{zone,minimumRarity:rare?'rare':'magic'}),{rng,scale:grade.variantScale});
        items.push(...drop.items);
    }
    return items;
}

/** A pot or crate now and then holds one piece of equipment (data/maps.js EXPLORATION_PROP_LOOT), more with the map's item
 * quantity. Before 2026-10-07 it held only currency, so a loop-1 pot was always empty. */
function objectRollPropItems(env, run,enemy,rng) {
    if(rng()>=Math.min(1,env.deps.EXPLORATION_PROP_LOOT.itemChance*run.objects.quantity*(enemy.equipmentDropMul||1)))return [];
    const item=env.deps.generateEquipmentDrop(enemy,{zone:env.deps.getZone(run.zoneId)});
    return item?[item]:[];
}

function objectPay(env, run,row,drop) {
    const {prop,items,enemy,rng}=drop;
    for(const item of items)env.deps.keepEquipmentDrop(enemy,item);
    objectPayChestContent(env, run,row,enemy,rng);
    if(prop&&rng()>=env.deps.EXPLORATION_PROP_LOOT.currencyChance)return;
    const key=env.deps.contentProgression.canDropCurrency('magicBud')?'magicBud':'formlessDew';
    if(!env.deps.contentProgression.canDropCurrency(key))return;
    const base=prop?1:env.deps.state.isEvent(row)?3:env.deps.state.grade(row).currency;
    const scaled=base*run.objects.quantity,amount=Math.floor(scaled)+Number(rng()<scaled%1);
    env.deps.keepCurrencyDrop(enemy,key,amount);
}

/** An atlas map's golden supply chest also holds one find of the map's content rooms (js/atlas-encounters.js chestReward). */
function objectPayChestContent(env, run,row,enemy,rng) {
    const zone=env.deps.getZone(run.zoneId);
    if(row.grade!=='gold'||!zone||zone.type!=='atlasMap')return;
    const find=env.deps.atlasEncounters.chestReward(zone,rng);
    if(find)env.deps.keepCurrencyDrop(enemy,find[0],find[1]);
}
