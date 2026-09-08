const assert = require('assert');
const {prepare} = require('./audit-combat-20260905');

{
    const {runtime:r, state, enemy} = prepare();
    state.maxZoneId = 2;
    state.settings.showLootLog = false;
    state.isBackgroundCalculation = true; // DOM-free reward execution; foreground presentation has a browser check.
    state.settings.autoEquipEmptySlots = false;
    r.Math.random = () => 0.99;
    const before = state.currencies.magicBud;
    for (let index=0; index<9; index++) r.rollLootForEnemy({...enemy,id:200+index,isBoss:true});
    assert.strictEqual(state.equipmentDropProgress, 144, 'nine missed bosses bank weighted progress');
    assert.strictEqual(state.inventory.length, 0, 'guarantee cannot trigger early');
    r.rollLootForEnemy({...enemy,id:209,isBoss:true});
    assert.strictEqual(state.inventory.length, 1, 'tenth missed boss guarantees equipment');
    assert.strictEqual(state.inventory[0].rarity, 'rare', 'dry-streak reward has useful minimum rarity');
    assert.strictEqual(state.equipmentDropProgress, 0, 'accepted reward resets the progress');
    assert.strictEqual(state.currencies.magicBud-before, 0, 'boss kills do not guarantee basic crafting resources');
}

{
    const {runtime:r, state, enemy} = prepare();
    r.Math.random = () => 0.009;
    state.settings.showLootLog = false;
    state.isBackgroundCalculation = true;
    state.settings.autoEquipEmptySlots = false;
    r.rollLootForEnemy({...enemy,dropMul:2});
    assert.strictEqual(state.inventory.length, 1, 'enemy loot bonus affects equipment, not only currencies');
    const zone = {id:1,type:'act'};
    assert.strictEqual(r.getEquipmentDropChances(zone,{dropMul:2}).equipment, 0.0153);
    assert.strictEqual(r.getEquipmentDropChances(zone,{dropMul:2}).growth, 0.006, 'growth still has its own base chance');
    assert.strictEqual(r.getEnemyLootDropMultiplier({type:'underworld'},{dropMul:100}), 1.125, 'endless caps and content multiplier apply once');
    assert(Number.isFinite(r.getEquipmentDropChances({type:'labyrinth'},enemy).equipment), 'missing floor uses the entry floor');
}

{
    const {runtime:r, state} = prepare();
    r.Math.random = () => 0.99;
    state.equipmentDropProgress = 159;
    const held = r.rollEquipmentDrop({type:'underworld'}, {}, 0);
    assert.strictEqual(held.dropped, false);assert.strictEqual(held.nextProgress, 159.5);
    assert.strictEqual(state.equipmentDropProgress, 159, 'planning never mutates saved progress');
    state.equipmentDropProgress = held.nextProgress;
    assert.strictEqual(r.rollEquipmentDrop({type:'underworld'}, {}, 0).guaranteed, true);
    const restored = r.mergeDefaults(JSON.parse(r.serializeSaveState(state)));
    assert.strictEqual(restored.equipmentDropProgress, 159.5, 'half credits survive save and reload');
    assert.strictEqual(r.mergeDefaults({...state,equipmentDropProgress:159.5}).equipmentDropProgress, 159.5, 'existing credits remain valid without scaling or resetting');
    const priorSave = r.mergeDefaults({...state,equipmentDropProgress:239.5});
    assert.strictEqual(priorSave.equipmentDropProgress, 159.5, 'progress above the restored threshold is capped just before a guaranteed drop');
    state.equipmentDropProgress = priorSave.equipmentDropProgress;
    assert.strictEqual(r.rollEquipmentDrop({type:'underworld'}, {}, 0).guaranteed, true, 'even a half-credit kill completes a migrated near-guarantee');
    for (const bad of [NaN, Infinity, 'invalid', -9]) {
        assert.strictEqual(r.mergeDefaults({...state,equipmentDropProgress:bad}).equipmentDropProgress, 0);
    }
    assert.strictEqual(r.mergeDefaults({}).equipmentDropProgress, 0, 'old saves receive no invented backpay');
    const migrated = r.mergeDefaults({...state,currencies:{transmute:3,magicBud:2}});
    assert.strictEqual(migrated.currencies.magicBud, 5, 'currency alias migration remains additive once');
    assert.strictEqual(r.mergeDefaults(JSON.parse(r.serializeSaveState(migrated))).currencies.magicBud, 5, 'reload cannot duplicate legacy currency');
}

{
    const {runtime:r, run, state, enemy} = prepare();
    state.equipmentDropProgress = 159;state.moveTimer=0;state.runProgress=20;
    state.settings.showLootLog=false;enemy.hp=1;enemy.maxHp=1;enemy.noAttack=true;
    state.settings.autoEquipEmptySlots=false;
    const replay = r.simulateBackgroundCombat({snapshot:state,elapsedMs:2500});
    assert(replay.metrics.kills>=1, 'offline replay reaches a real kill');
    assert(replay.game.inventory.some(item=>item.rarity==='rare' || item.rarity==='unique'), 'offline kills receive the same guarantee');
    assert.strictEqual(state.equipmentDropProgress, 159, 'isolated calculation does not alter the live progress');
    assert.strictEqual(run('game'), state);
}
{
    const {runtime:r, state} = prepare();
    state.maxZoneId = 2;
    const zone = {id:1,type:'act'};
    for (const [enemy,chance] of [[{},0.00765],[{isElite:true},0.034],[{isBoss:true},0.13175]]) {
        assert.strictEqual(r.getEquipmentDropChances(zone,enemy).equipment, chance);
        r.Math.random = () => chance - 0.000001;
        assert.strictEqual(r.rollEquipmentDrop(zone,enemy,chance).dropped, true);
        r.Math.random = () => chance;
        assert.strictEqual(r.rollEquipmentDrop(zone,enemy,chance).dropped, false, 'ordinary equipment rolls use a strict probability boundary');
    }
    r.Math.random = () => 0.99;
    const boss = {isBoss:true};
    const roll = r.rollEquipmentDrop(zone,boss,1);
    assert.strictEqual(roll.minimumRarity, null, 'a boss does not impose a minimum rarity');
    assert.strictEqual(r.generateEquipmentDrop(boss,{minimumRarity:roll.minimumRarity}).rarity, 'normal', 'an ordinary boss drop can actually generate a normal item');
    assert.strictEqual(r.getCurrencyDrops(boss).length, 0, 'a failed boss currency roll awards nothing');
    for (const [enemy,chance] of [[{},0.00765],[{isElite:true},0.068],[boss,0.204]]) {
        for (const [sample,expected] of [[chance-0.000001,1],[chance,0]]) {
            let first = true;
            r.Math.random = () => { if (!first) return 0.99; first = false; return sample; };
            assert.strictEqual(r.getCurrencyDrops(enemy).length, expected, 'common currency rolls honor the reduced threshold');
        }
    }
}
{
    const {runtime:r, state} = prepare();
    state.season = 31;state.maxZoneId = 99;state.unlockedTrials = ['trial_3'];
    const cases = [
        ['underworld_core','coreKey',{},0.0006],
        ['underworld_core','coreKey',{isElite:true},0.003],
        ['underworld_core','coreKey',{isBoss:true},0.015],
        ['underworld_core','uberRootTicketFlame',{isBoss:true},0.0025],
        ['underworld_core','trialKey3',{isElite:true},0.001],
        ['underworld_core','trialKey3',{isBoss:true},0.015],
        ['chaos_realm','trialKey3',{isBoss:true},0.015],
        ['underworld_core','bossKeyFlame',{isBoss:true},0.022],
        ['underworld_core','rivalKey',{isBoss:true},0.05],
        ['chaos_realm','chaosKey',{isBoss:true},0.012]
    ];
    for (const [zone,key,enemy,chance] of cases) {
        state.currentZoneId = zone;
        const before = JSON.stringify(state);
        for (const [sample,expected] of [[chance-1e-9,true],[chance,false]]) {
            r.Math.random = () => sample;
            const drops = r.getCurrencyDrops(enemy).filter(row => row[0] === key);
            assert.strictEqual(drops.length, expected ? 1 : 0, `${zone} ${key} honors its own drop threshold`);
            if (expected) assert.strictEqual(drops[0][1], 1, 'ticket rolls award one entry');
        }
        assert.strictEqual(JSON.stringify(state), before, 'planning ticket drops cannot mutate game state');
    }
    state.currentZoneId = 'underworld_core';r.Math.random = () => 0;
    assert(!r.getCurrencyDrops({isElite:true}).some(([key]) => key.startsWith('uberRootTicket')), 'uber tickets require a boss');
    assert(!r.getCurrencyDrops({}).some(([key]) => key === 'trialKey3'), 'regular enemies cannot drop trial tickets');
    state.unlockedTrials = [];state.completedTrials = [];
    assert(!r.getCurrencyDrops({isBoss:true}).some(([key]) => key === 'trialKey3'), 'trial access still gates retry tickets');
    state.currentZoneId = 'chaos_realm';
    assert(!r.getCurrencyDrops({isBoss:true}).some(([key]) => key === 'coreKey' || key.startsWith('uberRootTicket')), 'underworld tickets stay exclusive to underworld');
}
console.log('smoke-loot-rewards passed');
