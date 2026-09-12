const assert = require('node:assert/strict');
const vm = require('node:vm');
const {buildGameRuntime} = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const originalRandom = Math.random;
try {
    const bases = json("BASE_ITEM_DB.filter(base=>base.slot==='무기')");
    for (const base of bases) {
        runtime.baseId = base.id;
        Math.random = () => 0;
        const low = json('rollBaseStats(BASE_ITEM_DB.find(base=>base.id===baseId),200)');
        Math.random = () => 0.999999;
        const high = json('rollBaseStats(BASE_ITEM_DB.find(base=>base.id===baseId),1)');
        for (let i=0;i<base.baseStats.length;i++) {
            const definition=base.baseStats[i];
            assert.equal(low[i].val,low[i].valMin);
            assert.equal(high[i].val,high[i].valMax);
            assert.equal(low[i].valMax,high[i].valMax,'drop/affix tier cannot strengthen an early base');
            if (!definition.legacyDamageBase) continue;
            assert(definition.base>definition.legacyDamageBase);
            if(base.reqTier===1)assert(definition.base/definition.legacyDamageBase<=1.25);
            if(base.reqTier>=20)assert(definition.base/definition.legacyDamageBase>=2.38);
            assert.equal(high[i].baseDamageBalanceVersion,1);
        }
        runtime.legacyItem={id:9800,slot:'무기',baseId:base.id,baseName:base.name,rarity:'rare',locked:true,
            quality:20,stats:[{id:'crit',val:5,valMin:5,valMax:5,tier:1,affixBalanceVersion:1}],
            baseStats:base.baseStats.map(definition=>{
                const value=definition.legacyDamageBase||definition.base;
                return {id:definition.id,val:Math.floor(value*1.2),valMin:Math.floor(value*.8),
                    valMax:Math.floor(value*1.2),baseRollMin:Math.floor(value*.8),baseRollMax:Math.floor(value*1.2)};
            })};
        const migrated=json('normalizeItem(legacyItem)');
        base.baseStats.forEach((definition,i)=>{
            if(definition.legacyDamageBase)assert.equal(migrated.baseStats[i].val,high[i].valMax);
            else assert.equal(migrated.baseStats[i].val,Math.floor(definition.base*1.2));
        });
        assert.equal(migrated.quality,20);assert.equal(migrated.locked,true);assert.equal(migrated.stats[0].val,5);
        const once=run('JSON.stringify(legacyItem)');
        run('normalizeItem(legacyItem)');assert.equal(run('JSON.stringify(legacyItem)'),once);
    }
    const ranges=json("['rusted_blade','bloodletter_blade','apocalypse_greatblade'].map(id=>rollBaseStats(BASE_ITEM_DB.find(b=>b.id===id),20)[0]).map(s=>[s.valMin,s.valMax])");
    assert.deepEqual(ranges,[[4,6],[30,45],[123,184]]);
    const fresh=json(`(()=>{
        const item=createItemFromBase(BASE_ITEM_DB.find(b=>b.id==='genesis_void_staff'),'normal',20);
        const values=JSON.stringify(item.baseStats);normalizeItem(item);
        return {values:JSON.parse(values),normalized:item.baseStats};
    })()`);
    assert.equal(fresh.values[1].valMin,149);assert.equal(fresh.values[1].valMax,224);
    assert.equal(fresh.values[1].val,fresh.normalized[1].val,'new items cannot receive migration twice');
    const special=json(`normalizeItem({id:9810,slot:'무기',baseId:'apocalypse_greatblade',rarity:'unique',stats:[],
        uniqueEffect:'기존 고유 효과',baseStats:[{id:'flatDmg',val:91,valMin:51,valMax:76,
        baseRollMin:51,baseRollMax:76,exceptional:true,originalVal:76}]})`);
    assert.equal(special.baseStats[0].val,220,'exceptional max+20% survives migration');
    assert.equal(special.baseStats[0].originalVal,184);
    assert.equal(special.baseStats[0].exceptional,true);assert.equal(special.uniqueEffect,'기존 고유 효과');
    const minimum=json("normalizeItem({slot:'무기',baseName:'녹슨 검',stats:[],baseStats:[{id:'flatDmg',val:3,valMin:3,valMax:4}]})");
    assert.equal(minimum.baseStats[0].val,4,'legacy base-name lookup and minimum rank');
    const unknown=json("normalizeItem({slot:'무기',baseId:'unknown',stats:[],baseStats:[{id:'flatDmg',val:500}]})");
    assert.equal(unknown.baseStats[0].val,500,'unknown bases are not guessed or nerfed');
    const ring=json("normalizeItem({slot:'반지',baseId:'copper_ring',stats:[],baseStats:[{id:'flatDmg',val:1}]})");
    assert.equal(ring.baseStats[0].val,1,'other equipment slots remain unchanged');
    const restored=json(`(()=>{
        const old=id=>({id,slot:'무기',baseId:'apocalypse_greatblade',rarity:'normal',stats:[],
            baseStats:[{id:'flatDmg',val:76,valMin:51,valMax:76}]});
        const saved=JSON.parse(JSON.stringify(defaultGame));
        saved.inventory=[old(9820)];saved.equipment['무기']=old(9821);
        saved.equipmentTemporaryStorage=[old(9822)];
        const loaded=mergeDefaults(saved);
        const again=mergeDefaults(JSON.parse(JSON.stringify(loaded)));
        return [again.inventory[0],again.equipment['무기'],again.equipmentTemporaryStorage[0]]
            .map(item=>item.baseStats[0].val);
    })()`);
    assert.deepEqual(restored,[184,184,184],'save load covers equipped, inventory and overflow, once only');
} finally { Math.random=originalRandom; }
console.log('smoke-weapon-base-damage passed');
