const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const r = buildGameRuntime();
const run = code => vm.runInContext(code, r);
const json = code => JSON.parse(run('JSON.stringify(' + code + ')'));
const random = Math.random;
try {
    const defs = json('MOD_DB');
    for (const mod of defs) {
        for (let i = 0; i < mod.tierValues.length; i++) {
            const range = mod.tierValues[i];
            const [min, max] = Array.isArray(range) ? range : [range,range];
            assert(min <= max, mod.id + ' valid range');
            const previous = mod.tierValues[i-1];
            if (i && !['shieldMaxResAll','summonWeaponGemLevel'].includes(mod.id)) assert(min > (Array.isArray(previous) ? previous[1] : previous), mod.id + ' tiers must not overlap');
        }
    }
    // Check the actual roll endpoints, including compound substats; no values may fall between tiers.
    const dualDefs = json(`MOD_DB.filter(mod => getDefenseTypeForAffixStat(mod.statId || mod.id)).map(mod =>
        makeDualDefenseAffixMod({baseStats:[{id:'armor',val:30},{id:'evasion',val:30},{id:'energyShield',val:30}]},mod))`);
    for (const mod of [...defs, ...dualDefs].filter(m => !m.fixedValue && !['shieldMaxResAll','summonWeaponGemLevel'].includes(m.id))) {
        for (const definition of [mod, ...(mod.compound || [])]) {
            r.continuousMod = definition;
            const unit = definition.tierValues.flat().every(Number.isInteger) ? 1 : 0.01;
            let previousMax;
            for (let tier = 1; tier <= definition.tierValues.length; tier++) {
                r.continuousTier = tier;
                Math.random = () => 0;
                const lower = json('rollTierValueAffix(continuousMod, continuousMod.statId || continuousMod.id, continuousTier)');
                Math.random = () => 0.999999999;
                const upper = json('rollTierValueAffix(continuousMod, continuousMod.statId || continuousMod.id, continuousTier)');
                assert.equal(lower.val, lower.valMin);
                assert.equal(upper.val, upper.valMax);
                if (previousMax !== undefined) assert.equal(Math.round((lower.val - previousMax) * 100), unit * 100,
                    `${mod.id}/${definition.statId || definition.id} T${tier} must follow the previous roll without gaps`);
                if (upper.val > lower.val) {
                    Math.random = () => 1.1 / (Math.round((upper.val - lower.val) / unit) + 1);
                    assert.equal(run('rollTierValueAffix(continuousMod, continuousMod.statId || continuousMod.id, continuousTier).val'),
                        Number((lower.val + unit).toFixed(2)), 'the first step within a tier must also be rollable');
                }
                previousMax = upper.val;
            }
        }
    }
    Math.random = random;
    for (const id of ['resF','resC','resL']) {
        r.modId = id;
        const stat = json("rollAffixValueInTierRange(MOD_DB.find(m=>m.id===modId),20,20)");
        assert.deepEqual([stat.valMin,stat.valMax],[46,48]);
    }
    const weaponTyped = defs.find(m=>m.id==='weaponFireFlatDmg').tierValues;
    const weaponGeneric = defs.find(m=>m.id==='flatDmg').tierValues;
    weaponTyped.forEach((pair,i)=>assert(pair[0] > weaponGeneric[i][1]));
    for (const slot of ['ring','glove']) {
        const generic=defs.find(m=>m.id===slot+'FlatDmg').tierValues;
        const physical=defs.find(m=>m.id===slot+'PhysFlatDmg').tierValues;
        const typed=defs.find(m=>m.id===slot+'FireFlatDmg').tierValues;
        typed.forEach((pair,i)=>assert(pair[0] > Math.max(generic[i][1],physical[i][1]),slot+' typed damage must exceed generic and physical in every tier'));
    }
    assert(weaponTyped[19][0]-weaponTyped[18][0] > weaponTyped[1][0]-weaponTyped[0][0], 'higher tiers accelerate');
    const fixed = json("rollAffixValueInTierRange(MOD_DB.find(m=>m.id==='suppCap'),20,20)");
    assert.equal(fixed.fixedValue,true);
    assert.equal(fixed.tier,1);
    for (const id of ['fossilGemPulse','fossilSupportLink']) {
        r.fixedModId=id;
        for (const expression of [
            'rollAffixValue(FOSSIL_EXCLUSIVE_MODS.find(m=>m.id===fixedModId),20)',
            'rollAffixValueInTierRange(FOSSIL_EXCLUSIVE_MODS.find(m=>m.id===fixedModId),20,20)'
        ]) {
            r.fixedRoll=run(expression);
            assert.equal(r.fixedRoll.val,1);
            assert.match(run('getItemAffixTierHtml(fixedRoll)'),/\[T0\]/);
        }
    }
    assert.match(run("getItemAffixTierHtml({id:'gemLevel',val:1,tier:20,fossilExclusiveDrop:true})"),/\[T0\]/);
    assert.match(run("getItemAffixTierHtml({id:'suppCap',val:1,tier:17,fossilExclusiveSpore:true})"),/\[T0\]/);
    assert.match(run("getItemAffixTierHtml({id:'move',val:35,fossilExclusive:true})"),/\[T0\]/);
    assert.match(run("getItemAffixTierHtml({id:'spellLeech',val:1.68,valMin:1.68,valMax:1.68,tier:20})"),/\[T20\]/);
    assert.match(run("getItemAffixTierHtml({id:'flatDmg',val:20,tier:0})"),/\[U\]/);
    Math.random=()=>0.999999;
    const leech = json("rollAffixValueInTierRange(MOD_DB.find(m=>m.id==='spellLeech'),20,20)");
    assert.equal(leech.val,leech.valMax);
    r.line=leech;
    Math.random=()=>0;
    run('rerollStoredAffixValue(line,false)');
    assert.equal(r.line.val,leech.valMin);

    const migrated = json(`(()=> {
        const item={id:301,slot:'무기',rarity:'rare',locked:true,baseStats:[],stats:[
            {id:'projectileExtraShots',val:11,valMin:11,valMax:11},
            {id:'flatDmg',val:69,valMin:63,valMax:69,tier:20,lockedByHoney:true}]};
        normalizeItem(item);
        const once=JSON.stringify(item);
        normalizeItem(item);
        return {item,idempotent:once===JSON.stringify(item)};
    })()`);
    assert(migrated.idempotent);
    assert.equal(migrated.item.id,301);
    assert.equal(migrated.item.locked,true);
    assert.equal(migrated.item.stats[0].id,'projectileExtraChance');
    assert.equal(migrated.item.stats[0].val,550);
    assert.equal(migrated.item.stats[1].val,155);
    assert.equal(migrated.item.stats[1].lockedByHoney,true);
    const preserved = json(`(()=> {
        const item={id:304,slot:'장갑',rarity:'rare',locked:true,baseStats:[{id:'armor',val:10}],stats:[
            {id:'strength',val:21,valMin:20,valMax:23,tier:2,affixBalanceVersion:1,lockedByHoney:true},
            {id:'armor',sourceModId:'compoundArmor',val:10,valMin:10,valMax:11,tier:2,affixBalanceVersion:1,
                extraStats:[{id:'armorPct',val:4.5,valMin:4.2,valMax:4.9,tier:2}]},
            {id:'strength',val:300,valMin:128,valMax:131,tier:20,affixBalanceVersion:1}]};
        normalizeItem(item);
        const once=JSON.stringify(item);
        normalizeItem(item);
        return {item,idempotent:once===JSON.stringify(item)};
    })()`);
    assert(preserved.idempotent);
    assert.equal(preserved.item.id,304);
    assert(preserved.item.locked);
    assert(preserved.item.stats[0].lockedByHoney);
    assert.equal(preserved.item.stats[0].val,21,'already balanced rolls keep their actual value');
    assert.deepEqual([preserved.item.stats[0].valMin,preserved.item.stats[0].valMax],[18,23]);
    assert.equal(preserved.item.stats[1].extraStats[0].val,4.5,'compound substats without a stored version also keep their value');
    assert.equal(preserved.item.stats[1].extraStats[0].valMin,3.71);
    assert.equal(preserved.item.stats[2].val,300,'crafting overflow must not be clamped');
    r.updatedAffix=preserved.item.stats[0];
    Math.random=()=>0;
    run('rerollStoredAffixValue(updatedAffix,false)');
    assert.equal(r.updatedAffix.val,18,'existing gear can reroll a previously missing value');
    Math.random=()=>0.999999;
    const unique = json(`normalizeItem({id:302,slot:'무기',rarity:'unique',baseStats:[],stats:[
        {id:'resF',val:100,valMin:90,valMax:100,tier:20},
        {id:'projectileExtraShots',val:2,valMin:1,valMax:2}]})`);
    assert.equal(unique.stats[0].val,100,'unique resist ranges remain separate');
    assert.equal(unique.stats[1].val,100,'unique count affixes use the same conversion');

    let seed=981;
    Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    const duplicateCount = run(`(()=> {
        let duplicates=0;
        for(let i=0;i<200;i++) {
            const item={slot:'갑옷',rarity:'rare',baseStats:[{id:'armor',val:100},{id:'evasion',val:100}],stats:[]};
            rerollExplicitMods(item,'rare',20);
            const ids=item.stats.flatMap(s=>[s.id,...(s.extraStats||[]).map(e=>e.id)]);
            if(new Set(ids).size!==ids.length) duplicates++;
        }
        return duplicates;
    })()`);
    assert.equal(duplicateCount,0,'batch rolls cannot duplicate any compound stat');
    assert.equal(run("getAvailableMods({slot:'갑옷',baseStats:[{id:'armor',val:100}],stats:[{id:'armorPct',val:20}]}).some(m=>m.id==='compoundArmor')"),false);
    const amplification=json(`(()=> {
        const item={slot:'갑옷',quality:20,qualityAttribute:'defense',baseStats:[],
            stats:[{id:'armor',val:100,extraStats:[{id:'armorPct',val:20}]},{id:'fossilRiftAmp',val:50}]};
        const before=JSON.stringify(item);
        const result=getResolvedEquipmentStatLists('갑옷',item,game,false);
        return {stat:result.explicitStats[0],unchanged:before===JSON.stringify(item)};
    })()`);
    assert.equal(amplification.stat.val,180);
    assert.equal(amplification.stat.extraStats[0].val,36);
    assert(amplification.unchanged);

    Math.random=()=>0.49;
    assert.deepEqual(json('[0,0.5,1,5.5].map(rollProjectileExtraShots)'),[0,1,1,6]);
    Math.random=()=>0.5;
    assert.deepEqual(json('[0,0.5,1,5.5].map(rollProjectileExtraShots)'),[0,0,1,5]);
    assert.equal(run("getProjectileExtraShotDpsMultiplier({tags:['projectile']},100)"),5.4);
    assert.equal(run("getProjectileExtraShotDpsMultiplier({tags:['attack']},100)"),1);
    assert.equal(run("getProjectileExtraShotDpsMultiplier({tags:['projectile'],multiHit:3},100)"),2.2);
    const fan=json("[0,4,100].map(n=>getProjectileExtraShotDpsMultiplier({tags:['projectile'],projectilePattern:{kind:'fan',rays:4}},n))");
    assert(fan[1]>fan[0]);
    assert.equal(fan[1],fan[2]);


    const actualShots = json(`[0,550,1100,2200].map(chance=>{
        game=JSON.parse(JSON.stringify(defaultGame));
        game.activeSkill='관통 사격';game.skills=['관통 사격'];
        game.gemData['관통 사격']={level:1,exp:0,quality:0};
        game.gridPlayer={gx:1,gy:6,gridMoveTimer:0};
        game.equipment['무기']={id:99001,slot:'무기',rarity:'rare',
            baseStats:[{id:'flatDmg',val:100}],stats:[{id:'projectileExtraChance',val:chance}]};
        const p=getPlayerStats(),dps=p.dps;
        p.baseDmg=1000;p.minDmgRoll=p.maxDmgRoll=100;p.accuracy=1e6;p.crit=0;
        const e={id:99002,hp:1e9,maxHp:1e9,gx:3,gy:6,gridMoveTimer:0,attackKind:'melee',
            attackRange:1,ele:'phys',ailments:[],attackTimer:0,atkMul:1,attackSpeedVar:1,damageMul:1};
        game.enemies=[e];pendingSkillStageHits=[];
        Math.random=()=>0.49;
        performPlayerAttack(p);
        pendingSkillStageHits.forEach(row=>row.at=0);processPendingSkillStageHits();
        return {damage:1e9-e.hp,dps,expectedExtra:p.projectileExtraShots};
    })`);
    assert.equal(actualShots[1].expectedExtra,5.5,'attack rolls must not mutate the cached build stats');
    assert.equal(actualShots[1].damage,actualShots[0].damage*3.4,'550% successful remainder produces six extra 40% hits');
    assert.equal(actualShots[2].damage,actualShots[3].damage,'actual combat remains capped');
    assert.equal(actualShots[2].dps,actualShots[3].dps,'DPS comparison also stops at the combat cap');
    assert(Math.abs(actualShots[2].dps/actualShots[0].dps-actualShots[2].damage/actualShots[0].damage)<1e-8);

    const typeDamage = json(`(()=>{
        const bucket=createEmptyStatBucket();addStatToBucket(bucket,'attackPctDmg',100);addStatToBucket(bucket,'spellPctDmg',60);
        return [getTaggedDamageBreakdown(bucket,{tags:['attack']}).total,getTaggedDamageBreakdown(bucket,{tags:['spell']}).total];
    })()`);
    assert.deepEqual(typeDamage,[100,60],'attack and spell increased damage apply only to matching tags');

    const recovery=json(`(()=> {
        game=JSON.parse(JSON.stringify(defaultGame));
        game.playerHp=1;
        const p={...getPlayerStats(),maxHp:1000,energyShield:1000,leech:1,spellLeech:0,sSkill:{tags:['attack']},uniqueInstantLeechPct:0,uniqueChaosDamageInstantLeechPct:0};
        applyPlayerHitLeech(p,1000,0); tickPlayerLeech(p,1);
        const attackHp=game.playerHp;
        game.playerHp=1; game.playerLeechInstances=[];
        p.sSkill.tags=['spell'];
        applyPlayerHitLeech(p,1000,0); tickPlayerLeech(p,1);
        const spellWithout=game.playerHp;
        p.spellLeech=2;
        applyPlayerHitLeech(p,1000,0); tickPlayerLeech(p,1);
        const spellWith=game.playerHp;
        game.playerLeechInstances=[];game.playerEnergyShield=0;game.playerHp=1;
        p.passiveKeystoneFlags={soulSanctuary:true};
        applyPlayerHitLeech(p,1000,0);tickPlayerLeech(p,1);
        return {attackHp,spellWithout,spellWith,es:game.playerEnergyShield,hp:game.playerHp};
    })()`);
    assert(recovery.attackHp>1);
    assert.equal(recovery.spellWithout,1,'ordinary leech must not heal from spells');
    assert(recovery.spellWith>1,'explicit spell leech must heal');
    assert.equal(recovery.hp,1);
    assert(recovery.es>0,'Soul Sanctuary routes spell leech into energy shield');
} finally { Math.random=random; }
console.log('smoke-equipment-affix-rebalance passed');
