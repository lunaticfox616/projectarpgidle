const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);
run('game.contentProgression.inherited = ["craft"]');

function loadUiFunction(name) {
    const source = fs.readFileSync('js/ui.js', 'utf8');
    const start = source.indexOf(`function ${name}(`);
    assert(start >= 0, `${name} must exist in ui.js`);
    const open = source.indexOf('{', start);
    let depth = 0;
    for (let index = open; index < source.length; index++) {
        if (source[index] === '{') depth++;
        else if (source[index] === '}' && --depth === 0) {
            vm.runInContext(source.slice(start, index + 1), context, { filename: `ui-${name}.js` });
            return;
        }
    }
    throw new Error(`${name} body was not closed`);
}

function setCraftItem(item, mode) {
    run(`(function () {
        game.inventory = [${JSON.stringify(item)}];
        game.currencies.formlessDew = 1;
        game.currencies.sporeFire = 100;
        game.currencies.sporeCold = 100;
        game.currencies.sporeLight = 100;
        game.sporeCraftModes.formlessDew = '${mode}';
        window.__sporeCraftLogs = [];
        addLog = message => window.__sporeCraftLogs.push(String(message));
        selectForCrafting(${item.id}, false);
    })()`);
}

function makeBoots(id) {
    return {
        id,
        slot: '신발',
        baseId: 'spore_test_boots',
        baseName: '홀씨 검증 장화',
        name: '희귀한 홀씨 검증 장화',
        rarity: 'rare',
        itemTier: 10,
        hiddenTier: 10,
        affixTierCap: 10,
        baseStats: [{ id: 'evasion', val: 100 }],
        stats: []
    };
}

function makeGrowthFlower(id) {
    return {
        id,
        growthBaseId: 'gf_sun_bloom',
        growthShapeId: 'dot1',
        growthCategory: 'flower',
        slot: '무기',
        baseId: null,
        baseName: '홀씨 검증 꽃',
        name: '희귀한 홀씨 검증 꽃',
        rarity: 'rare',
        itemTier: 10,
        hiddenTier: 10,
        affixTierCap: 10,
        baseStats: [],
        stats: [{ id: 'strength', statName: '힘', val: 20, tier: 5 }],
        growthTags: [],
        growthRemovedTags: []
    };
}

function craftSnapshot() {
    return run('JSON.stringify({item:game.inventory[0],currencies:game.currencies,expertise:game.expertise})');
}

async function verifySporeSourceLimits() {
    setCraftItem({...makeBoots(980200),slot:'무기'},'fire');
    run("game.currencies.sapBud=5; game.sporeCraftModes.sapBud='fire'; game.expertise.levels.mycologist=15;");
    await run("useCurrency('sapBud')");
    assert.strictEqual(run("game.inventory[0].stats.filter(stat=>equipmentCrafting.getSource(stat)==='spore').length"),1);
    let before=craftSnapshot();
    assert.strictEqual(run("getCraftOrbUseState('sapBud',game.inventory[0]).enabled"),false);
    await run("useCurrency('sapBud')");
    assert.strictEqual(craftSnapshot(),before,'repeat additive spores must not spend or mutate anything');
    run("game.sporeCraftModes.sapBud='none';");
    await run("useCurrency('sapBud')");
    assert.strictEqual(run('game.inventory[0].stats.length'),2,'ordinary addition remains available');
    run('game.currencies.formlessDew=3;');
    for(let i=0;i<2;i++) {
        assert.strictEqual(run("getCraftOrbUseState('formlessDew',game.inventory[0]).enabled"),true);
        await run("useCurrency('formlessDew')");
        assert.strictEqual(run("game.inventory[0].stats.filter(stat=>equipmentCrafting.getSource(stat)==='spore').length"),1);
    }
    run("game.inventory[0].stats.find(stat=>stat.craftSource==='spore').lockedByHoney=true;");
    before=craftSnapshot();
    await run("useCurrency('formlessDew')");
    assert.strictEqual(craftSnapshot(),before,'a locked spore affix must not be duplicated by a reroll');
    setCraftItem({...makeBoots(980201),slot:'무기',stats:[{id:'resF',val:20,craftSource:'spore'}]},'none');
    run('game.currencies.fossil=3; applyRiftSporeToSelectedItem();');
    assert.strictEqual(run("game.inventory[0].stats.filter(stat=>equipmentCrafting.getSource(stat)==='spore').length"),1);
    assert.strictEqual(run("game.inventory[0].stats.filter(stat=>equipmentCrafting.getSource(stat)==='fossil').length"),1);
    before=craftSnapshot();
    run('applyRiftSporeToSelectedItem()');
    assert.strictEqual(craftSnapshot(),before,'rift spores add a fossil effect and cannot add a second one');
    setCraftItem({...makeBoots(980202),stats:Array.from({length:6},(_,i)=>({id:'locked'+i,val:1,lockedByHoney:true}))},'fire');
    before=craftSnapshot();
    await run("useCurrency('formlessDew')");
    assert.strictEqual(craftSnapshot(),before,'full locked items must not spend spores or receive a seventh affix');
}

function verifyFossilSourceLimits() {
    setCraftItem({...makeBoots(980210),slot:'무기',stats:[{id:'resF',val:20,craftSource:'spore',lockedByHoney:true}]},'none');
    run('game.season=3; game.currencies.fossilJagged=4;');
    for(let i=0;i<2;i++) {
        run("applyFossilChaosCraft('fossilJagged')");
        assert.strictEqual(run("game.inventory[0].stats.filter(stat=>equipmentCrafting.getSource(stat)==='fossil').length"),1);
        assert.strictEqual(run("game.inventory[0].stats.filter(stat=>equipmentCrafting.getSource(stat)==='spore').length"),1);
        assert(run('game.inventory[0].stats.length<=6'));
    }
    let before=craftSnapshot();
    run('applyRiftSporeToSelectedItem()');
    assert.strictEqual(craftSnapshot(),before,'a standard fossil effect also blocks additive rift spores');
    run("game.inventory[0].stats.find(stat=>stat.craftSource==='fossil').lockedByHoney=true;");
    before=craftSnapshot();
    run("applyFossilChaosCraft('fossilJagged')");
    assert.strictEqual(craftSnapshot(),before,'locked fossil effects cannot survive alongside a second fossil guarantee');
    setCraftItem({...makeBoots(980211),slot:'무기'},'none');
    run('game.currencies.fossilRift=4;');
    for(let i=0;i<2;i++) {
        run("applyFossilChaosCraft('fossilRift')");
        assert.strictEqual(run("game.inventory[0].stats.filter(stat=>stat.id==='fossilRiftBlank').length"),1);
        assert.strictEqual(run("game.inventory[0].stats.filter(stat=>stat.id==='fossilRiftAmp').length"),1);
        assert(run('game.inventory[0].stats.length<=6'));
        if(i===0) run("game.inventory[0].stats.find(stat=>stat.id==='fossilRiftBlank').lockedByHoney=true;");
    }
    assert.strictEqual(run("game.inventory[0].stats.find(stat=>stat.id==='fossilRiftBlank').lockedByHoney"),true,'same rift reroll preserves the existing marker and its lock');
    before=craftSnapshot();
    run("applyFossilChaosCraft('fossilJagged')");
    assert.strictEqual(craftSnapshot(),before,'a permanent rift marker prevents adding a different fossil effect');
    run("game.inventory[0].stats.find(stat=>stat.id==='fossilRiftAmp').lockedByHoney=true;");
    before=craftSnapshot();
    run("applyFossilChaosCraft('fossilRift')");
    assert.strictEqual(craftSnapshot(),before,'rift rerolls must respect a honey-locked amplifier');
}

function verifyCraftSourceSaveCompatibility() {
    const legacy={...makeBoots(980220),stats:[
        {id:'gemLevel',val:1,tier:20,fossilExclusiveSpore:true},
        {id:'move',val:35,fossilExclusive:true},
        {id:'resF',val:10,tier:19,affixBalanceVersion:1},
        {id:'resC',val:10,tier:19,affixBalanceVersion:1,craftSource:'unknown'}
    ]};
    context.legacyCraft=legacy;
    run('normalizeItem(legacyCraft);');
    assert.strictEqual(run('legacyCraft.stats[0].craftSource'),'fossil');
    assert.strictEqual(run('legacyCraft.stats[1].craftSource'),'fossil');
    assert.strictEqual(run('legacyCraft.stats[2].craftSource'),undefined,'high tier alone never proves spore origin');
    assert.strictEqual(run('legacyCraft.stats[3].craftSource'),undefined);
    assert(run("getItemAffixTierHtml(legacyCraft.stats[1]).includes('[T0]')"));
    const saved=run('JSON.stringify(legacyCraft)');
    run('legacyCraft=JSON.parse(JSON.stringify(legacyCraft));normalizeItem(legacyCraft);');
    assert.strictEqual(run('JSON.stringify(legacyCraft)'),saved);
    assert(run("equipmentCrafting.getBlockReason({stats:[{id:'resF',craftSource:'transplant'}]},'transplant',true).length>0"));
    assert.strictEqual(run("equipmentCrafting.getBlockReason({stats:[{id:'resF',craftSource:'spore'}]},'transplant')"),'');
}

(async () => {
    const originalRandom = context.Math.random;
    try {
        loadUiFunction('getCraftOrbUseState');
        await verifySporeSourceLimits();
        verifyFossilSourceLimits();
        verifyCraftSourceSaveCompatibility();
        // Actual crafts: added flat damage must be selectable, and T20 spores must no longer force T19+.
        let seed = 91026;
        context.Math.random = () => ((seed = (Math.imul(seed,1664525) + 1013904223) >>> 0) / 4294967296);
        for (const [mode,id] of [['fire','fireFlatDmg'],['cold','coldFlatDmg'],['light','lightFlatDmg'],['chaos','chaosFlatDmg'],['damage','spellFlatDmg']]) {
            let found = false;
            let foundLowerTier = false;
            for (let attempt = 0; attempt < 150; attempt++) {
                const weapon = {...makeBoots(980100), slot:'무기', hiddenTier:20, itemTier:20, affixTierCap:20};
                setCraftItem(weapon,mode);
                await run("useCurrency('formlessDew')");
                context.expectedFlatId=id;
                found ||= run(`window.__sporeCraftLogs.some(message => message.includes('홀씨 보장: '+getStatName(expectedFlatId)))`);
                const guaranteed = JSON.parse(run(`JSON.stringify((()=>{
                    const name=window.__sporeCraftLogs.find(message=>message.includes('홀씨 보장: ')).split('홀씨 보장: ')[1];
                    return game.inventory[0].stats.find(stat=>stat.statName===name);
                })())`));
                assert(guaranteed.fixedValue || (guaranteed.tier>=9 && guaranteed.tier<=20));
                foundLowerTier ||= !guaranteed.fixedValue && guaranteed.tier<19;
            }
            assert(found, `${mode} spores must guarantee ${id} in actual crafting outcomes`);
            assert(foundLowerTier, `${mode} spores must allow the full configured tier range`);
        }
        const flatOnlyBoots = makeBoots(980101);
        flatOnlyBoots.stats = [{id:'fireFlatDmg',val:100},{id:'resC',val:10,lockedByHoney:true}];
        setCraftItem(flatOnlyBoots,'none');
        run('game.expertise.levels.mycologist=15; applyCorruptSporeToSelectedItem()');
        assert.strictEqual(run('game.inventory[0].stats.length'),1);
        assert.strictEqual(run('game.inventory[0].stats[0].id'),'resC');
        run(`game.currencies.magicBud = 1;`);
        const fullMagicUseState = JSON.parse(run(`JSON.stringify(getCraftOrbUseState('magicBud', {
            rarity: 'magic', stats: [{ id: 'flatHp' }, { id: 'resF' }]
        }))`));
        assert.strictEqual(fullMagicUseState.enabled, true,
            'magic bud must reroll a two-affix magic item instead of being treated as an augment');

        setCraftItem(makeBoots(980001), 'damage');
        const before = run('JSON.stringify({ item: game.inventory[0], currencies: game.currencies })');
        await run("useCurrency('formlessDew')");
        const after = run('JSON.stringify({ item: game.inventory[0], currencies: game.currencies })');
        assert.strictEqual(after, before, 'an unavailable spore target must not reroll the item or spend any currency');
        assert(run("window.__sporeCraftLogs.some(message => message.includes('출현 가능한 옵션이 없어 제작할 수 없습니다'))"),
            'an unavailable spore target must explain why crafting is blocked');

        setCraftItem(makeBoots(980002), 'fire');
        const critRollAfterFlatHp = run(`(function () {
            let pool = getAvailableMods(game.inventory[0]);
            pool.splice(pool.findIndex(mod => (mod.statId || mod.id) === 'flatHp'), 1);
            let total = pool.reduce((sum, mod) => sum + Math.max(0.01, Number(mod.weight) || 1), 0);
            let beforeCrit = 0;
            for (let mod of pool) {
                let weight = Math.max(0.01, Number(mod.weight) || 1);
                if ((mod.statId || mod.id) === 'crit') return (beforeCrit + weight / 2) / total;
                beforeCrit += weight;
            }
            return -1;
        })()`);
        assert(critRollAfterFlatHp >= 0, 'the regression fixture requires a boot critical affix');
        const rolls = [0, 0, 0, 0, critRollAfterFlatHp, 0, 0];
        context.Math.random = () => rolls.length ? rolls.shift() : 0.99;
        await run("useCurrency('formlessDew')");
        const statIds = JSON.parse(run('JSON.stringify(game.inventory[0].stats.map(stat => stat.id))'));
        assert.strictEqual(new Set(statIds).size, statIds.length,
            `spore targeting must not duplicate an affix already generated by the reroll: ${statIds.join(', ')}`);

        const growthFlower = makeGrowthFlower(980006);
        run(`(function () {
            game.growthInventory = [${JSON.stringify(growthFlower)}];
            game.currencies.sapBud = 1;
            game.currencies.sporeFire = 100;
            game.currencies.sporeCold = 100;
            game.currencies.sporeLight = 100;
            game.sporeCraftModes.sapBud = 'fire';
            selectForCrafting(${growthFlower.id}, false);
        })()`);
        const growthSporeBefore = run('JSON.stringify({ fire: game.currencies.sporeFire, cold: game.currencies.sporeCold, light: game.currencies.sporeLight })');
        context.Math.random = () => 0;
        await run("useCurrency('sapBud')");
        const growthSporeAfter = run('JSON.stringify({ fire: game.currencies.sporeFire, cold: game.currencies.sporeCold, light: game.currencies.sporeLight })');
        assert.strictEqual(growthSporeAfter, growthSporeBefore,
            'growth-board refining must ignore a stale equipment spore mode without consuming spores');
        assert.strictEqual(run('game.growthInventory[0].stats.length'), 2,
            'ignoring a stale spore mode must still allow the ordinary growth-board craft');
        const growthStatIds = JSON.parse(run('JSON.stringify(game.growthInventory[0].stats.map(stat => stat.id))'));
        const fireGuaranteedIds = new Set(['firePctDmg', 'resF', 'aspd', 'crit', 'critDmg', 'resPen', 'ds', 'targetAny', 'targetProjectile']);
        assert(!fireGuaranteedIds.has(growthStatIds[1]),
            `growth-board refining must not guarantee the stale fire-spore tag: ${growthStatIds.join(', ')}`);

        run(`(function () {
            game.expertise.levels.mycologist = 15;
            game.currencies.sporeFire = 100;
            game.currencies.sporeCold = 100;
            game.currencies.sporeLight = 100;
        })()`);
        const specialSporeBefore = run('JSON.stringify(game.currencies)');
        run('applyCorruptSporeToSelectedItem()');
        run('applyRiftSporeToSelectedItem()');
        assert.strictEqual(run('JSON.stringify(game.currencies)'), specialSporeBefore,
            'special spore crafts must reject growth-board items without spending any currency');
        assert(run("window.__sporeCraftLogs.some(message => message.includes('홀씨 제작은 장비에만'))"),
            'growth-board targets must explain that special spore crafting is equipment-only');

        run(`(function () {
            game.jewelInventory = [{ id: 980007, name: '홀씨 검증 주얼', rarity: 'normal', stats: [] }];
            game.currencies.magicBud = 1;
            game.currencies.sporeFire = 100;
            game.currencies.sporeCold = 100;
            game.currencies.sporeLight = 100;
            game.sporeCraftModes.magicBud = 'fire';
            selectJewelCraftTarget(0);
        })()`);
        const jewelSporeBefore = run('JSON.stringify({ fire: game.currencies.sporeFire, cold: game.currencies.sporeCold, light: game.currencies.sporeLight })');
        await run("useCurrencyOnJewel('magicBud')");
        assert.strictEqual(run('JSON.stringify({ fire: game.currencies.sporeFire, cold: game.currencies.sporeCold, light: game.currencies.sporeLight })'), jewelSporeBefore,
            'jewel refining must never consume spores from an equipment spore mode');

        const oldFossilBoots = makeBoots(980003);
        oldFossilBoots.stats = [{ id: 'move', statName: '군단 진군', val: 35, fossilExclusive: true }];
        run(`(function () {
            game.season = 3;
            game.inventory = [${JSON.stringify(oldFossilBoots)}];
            game.currencies.fossilOld = 1;
            selectForCrafting(${oldFossilBoots.id}, false);
            applyFossilChaosCraft('fossilOld');
        })()`);
        assert.strictEqual(run('game.currencies.fossilOld'), 0,
            'full fossil rerolls must count a replaceable existing fossil affix as an eligible outcome');
        const oldFossilStatIds = JSON.parse(run('JSON.stringify(game.inventory[0].stats.map(stat => stat.id))'));
        assert.strictEqual(oldFossilStatIds.filter(id => id === 'move').length, 1,
            'the rerolled fossil result must still contain no duplicate affix ids');

        const lockedOldFossilBoots = makeBoots(980005);
        lockedOldFossilBoots.chaosInfusion = { id: 'resC', val: 8 };
        lockedOldFossilBoots.stats = [{ id: 'move', statName: '군단 진군', val: 35, fossilExclusive: true, lockedByHoney: true }];
        run(`(function () {
            game.inventory = [${JSON.stringify(lockedOldFossilBoots)}];
            game.currencies.fossilOld = 1;
            selectForCrafting(${lockedOldFossilBoots.id}, false);
            applyFossilChaosCraft('fossilOld');
        })()`);
        assert.strictEqual(run('game.currencies.fossilOld'), 1,
            'an additive conflict with a preserved fossil affix must block without spending currency');
        assert.strictEqual(run('game.inventory[0].chaosInfusion.id'), 'resC',
            'a failed fossil eligibility check must not partially clear the existing infusion');

        const boundBoots = makeBoots(980004);
        run(`(function () {
            game.inventory = [${JSON.stringify(boundBoots)}];
            game.currencies.fossilBound = 1;
            selectForCrafting(${boundBoots.id}, false);
        })()`);
        context.Math.random = () => 0.999999;
        run("applyFossilChaosCraft('fossilBound')");
        const boundFirstStat = JSON.parse(run('JSON.stringify(game.inventory[0].stats[0])'));
        assert(['evasion', 'evasionPct'].includes(boundFirstStat.id),
            `bound fossil must include the matching evasion defense family, got ${boundFirstStat.id}`);

        const tooltip = {
            classList: { contains() { return false; }, remove() {} }, style: {}, innerHTML: '',
            getBoundingClientRect: () => ({ width: 240, height: 80 })
        };
        context.document.getElementById = id => id === 'info-tooltip' ? tooltip : null;
        context.showSporeCraftTooltip({ clientX: 10, clientY: 10 }, 'corrupt');
        assert(tooltip.innerHTML.includes('원소 피해·원소 저항 옵션 1개'), 'the corrupt spore tooltip must explain its removal effect');
        context.showSporeCraftTooltip({ clientX: 10, clientY: 10 }, 'rift');
        assert(tooltip.innerHTML.includes('화석 전용 옵션 1개'), 'the rift spore tooltip must explain its addition effect');
        const uiSource = fs.readFileSync('js/ui.js', 'utf8');
        assert(uiSource.includes("showSporeCraftTooltip(event,'corrupt')")
            && uiSource.includes("showSporeCraftTooltip(event,'rift')"),
        'both spore action buttons must connect to the effect tooltip');
    } finally {
        context.Math.random = originalRandom;
    }

    console.log('smoke-spore-crafting passed');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
