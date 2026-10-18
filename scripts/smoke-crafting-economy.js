const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const passiveSource = fs.readFileSync('js/passives.js', 'utf8');
const itemSource = fs.readFileSync('js/items.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const cardSource = fs.readFileSync('js/canvas-passive-tree.js', 'utf8');

function extract(source, startNeedle, endNeedle) {
    const start = source.indexOf(startNeedle);
    const end = source.indexOf(endNeedle, start);
    assert(start >= 0 && end > start, `source block not found: ${startNeedle}`);
    return source.slice(start, end);
}

const salvageBlock = extract(passiveSource, 'function isChaseUniqueItem', 'function salvageItem(');
const awarded = {};
const salvageContext = {
    UNIQUE_DB: [],
    ORB_DB: {
        magicBud: { name: '마법의 새싹' },
        formlessDew: { name: '형체 없는 이슬' },
        sapBud: { name: '수액 봉오리' },
        goldenRule: { name: '황금률' }
    },
    getCanonicalCurrencyKey(key) {
        const aliases = { transmute: 'magicBud', alteration: 'magicBud', alchemy: 'formlessDew', chaos: 'formlessDew', exalted: 'sapBud', divine: 'goldenRule' };
        return aliases[key] || key;
    },
    getItemCraftTier(item) { return item.hiddenTier || 1; },
    getItemExplicitOptionCount(item) { return (item.stats || []).length; },
    awardCurrency(key, amount) { awarded[key] = (awarded[key] || 0) + amount; },
    addLog() {},
    game: { jewelInventory: [] },
    bagItems: { isSpecial: () => false }, // 주얼, 코어, 액막이 해체는 js/bag-items.js가 따로 맡는다
    safeExposeGlobals(map) { Object.assign(salvageContext, map); },
    Math: Object.create(Math)
};
salvageContext.Math.random = () => 0.99;
vm.createContext(salvageContext);
// Salvage hands socketed jewels back first (js/equipment-sockets.js returnJewels).
vm.runInContext(fs.readFileSync('js/equipment-sockets.js', 'utf8'), salvageContext, { filename: 'equipment-sockets.js' });
vm.runInContext(salvageBlock, salvageContext, { filename: 'salvage-economy.js' });

let rewards = salvageContext.salvageItemObject({ rarity: 'magic', name: '마법', stats: [], hiddenTier: 1 }, true);
assert.deepStrictEqual(JSON.parse(JSON.stringify(rewards)), { magicBud: 1 }, 'magic salvage must return the consolidated magic currency');

rewards = salvageContext.salvageItemObject({ rarity: 'rare', name: '레어', stats: [{}, {}, {}, {}, {}, {}], hiddenTier: 20 }, true);
assert.deepStrictEqual(JSON.parse(JSON.stringify(rewards)), { formlessDew: 1 }, 'rare salvage must return the consolidated rare reroll currency');

salvageContext.Math.random = () => 0;
rewards = salvageContext.salvageItemObject({ rarity: 'rare', name: '고티어 레어', stats: [{}, {}, {}, {}, {}, {}], hiddenTier: 20 }, true);
assert.strictEqual(rewards.formlessDew, 2, 'guaranteed and bonus rewards must merge under one consolidated key');

rewards = salvageContext.salvageItemObject({ rarity: 'unique', name: '고유', stats: [], hiddenTier: 20 }, true, { noDivine: true });
assert.strictEqual(rewards.formlessDew, 2, 'unique salvage should always return a baseline reward');
assert.strictEqual(rewards.sapBud, 1);
assert.strictEqual(rewards.goldenRule, undefined, 'inventory overflow salvage must not roll golden rule currency');
assert(salvageContext.getItemSalvagePreviewText({ rarity: 'rare', stats: [], hiddenTier: 10 }, true).includes('형체 없는 이슬'), 'salvage preview must use the consolidated currency name');
assert.strictEqual(salvageContext.formatSalvageRewardSummary({ alteration: 1, transmute: 2 }), '마법의 새싹 +3', 'legacy reward keys must be consolidated before display');

// Confirmation-time target changes are exercised against the full runtime below.

const annulBlock = extract(itemSource, 'async function marketAnnulSelectedStat', 'function getBaseDefenseProfile');
const jewelSalvageBlock = extract(passiveSource, 'async function salvageJewel(jewelId)', 'function isChaseUniqueItem');
const protectedItem = {
    name: '보호 장비',
    rarity: 'rare',
    stats: [
        { id: 'flatHp', statName: '생명력', val: 10, lockedByHoney: true },
        { id: 'crit', statName: '치명타', val: 5 }
    ]
};
const annulLogs = [];
let annulPrompt = '';
const annulContext = {
    game: { currencies: { goldenRule: 2 } },
    isMarketUnlocked: () => true,
    getSelectedCraftItem: () => protectedItem,
    getAnnulmentRemovableStats: item => item.stats.map((stat, index) => ({ stat, index })).filter(row => !row.stat.lockedByHoney && !row.stat.lockedByRift && !row.stat.encroachedFinal && !row.stat.unremovable),
    requestGameConfirmation: async message => { annulPrompt = message; return true; },
    getStatName: id => id,
    updateItemName() {},
    updateStaticUI() {},
    addLog(message) { annulLogs.push(message); }
};
vm.createContext(annulContext);
vm.runInContext(annulBlock, annulContext, { filename: 'market-annul.js' });

(async () => {
    const runtime = require('./lib/game-runtime').buildGameRuntime();
    const run = code => vm.runInContext(code, runtime);
    // A key that is no craft currency (the old 'divine', merged into 황금률) is refused before anything is paid or changed; useCurrency
    // has no confirmation left, so nothing can change between its checks and its effect (2026-10-18).
    run(`game.inventory=[1,2].map(id=>({id,slot:'신발',rarity:'rare',name:'확인 검증',itemTier:10,hiddenTier:10,baseStats:[],stats:[{id:'flatHp',val:10,tier:3}]}));game.currencies.divine=1;selectForCrafting(1,false);`);
    const equipmentBefore = run('JSON.stringify(game.inventory)');
    await run("useCurrency('divine')");
    assert.strictEqual(run('JSON.stringify(game.inventory)'), equipmentBefore, 'a key that is no craft currency changes nothing');
    assert.strictEqual(run('game.currencies.divine'), 1, 'a key that is no craft currency spends nothing');
    await annulContext.marketAnnulSelectedStat(0);
    assert.strictEqual(protectedItem.stats.length, 2, 'market service must preserve a honey-locked affix');
    assert.strictEqual(annulContext.game.currencies.goldenRule, 2, 'rejected protected removal must not spend currency');

    await annulContext.marketAnnulSelectedStat(1);
    assert.deepStrictEqual(Array.from(protectedItem.stats, stat => stat.id), ['flatHp'], 'market service should remove the selected removable affix');
    assert.strictEqual(annulContext.game.currencies.goldenRule, 0);
    assert(annulPrompt.includes('황금률 2개') && !annulPrompt.includes('오브'), 'market confirmation must name the currency that is actually spent');

    // A unique jewel asks first; if it left the bag while the question was open (for example into a socket), nothing is salvaged.
    const uniqueJewel = { id: 7, name: '확인 대상', rarity: 'unique', slot: '주얼' };
    const salvaged = [];
    const jewelSalvageContext = {
        game: { inventory: [uniqueJewel, { id: 8, name: '남는 주얼', rarity: 'magic', slot: '주얼' }] },
        bagItems: {
            jewels: () => jewelSalvageContext.game.inventory.slice(),
            take: jewel => {
                const index = jewelSalvageContext.game.inventory.indexOf(jewel);
                if (index >= 0) jewelSalvageContext.game.inventory.splice(index, 1);
                return index >= 0;
            }
        },
        getJewelSalvageShardGain: () => 18,
        requestGameConfirmation: async () => { jewelSalvageContext.game.inventory.shift(); return true; },
        salvageJewelObject: jewel => salvaged.push(jewel.id),
        updateStaticUI() {}
    };
    vm.createContext(jewelSalvageContext);
    vm.runInContext(jewelSalvageBlock, jewelSalvageContext, { filename: 'jewel-salvage.js' });
    assert.strictEqual(await jewelSalvageContext.salvageJewel(7), false, 'a jewel that left the store during confirmation is not salvaged');
    assert.deepStrictEqual(salvaged, []);
    assert.strictEqual(await jewelSalvageContext.salvageJewel(8), true, 'ordinary jewels salvage without a question');
    assert.deepStrictEqual(salvaged, [8]);
    assert.deepStrictEqual(Array.from(jewelSalvageContext.game.inventory), []);

    assert(uiSource.includes("return { enabled: false, reason: `홀씨 부족"), 'crafting UI should explain insufficient spore cost');
    // Enabled/disabled controls and payment are exercised in crafting-workspace.spec.js.
    assert(uiSource.includes('confirmedSalvageTargets(targetItems)'), 'search-based equipment salvage should keep a confirmation-time target snapshot');
    assert(!cardSource.includes('getItemSalvagePreviewText(item, true)'), 'compact inventory cards should not spend metadata space on salvage materials');
    assert(cardSource.includes('getItemSalvagePreviewText(item, false)'), 'the destructive action should retain a detailed salvage preview in its own hint');

    // 제작 연구(js/crafting-goal-options.js rehearse): practice rolls a copy only. Nothing in the save changes and no item id is taken,
    // so a practice result can never become a second item or cost anything (2026-10-18 check).
    const { run: runGame } = require('./lib/replay-fixture')(41);
    runGame(`game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',level:90,season:12});game.inventory=[];
        globalThis.__item=createItemFromBase(BASE_ITEM_DB.find(base=>base.slot==='투구'&&(base.reqTier||1)<=15&&!base.dropOnly),'rare',15);
        addItemToInventory(__item,{ignoreFilter:true,ignoreAutoSalvage:true,skipAutoEquip:true});`);
    assert.strictEqual(runGame(`(()=>{const before=JSON.stringify(game),id=itemIdCounter,recipe={key:'formlessDew',kind:'reroll',label:''};
        for(let i=0;i<200;i++)['none','fire'].forEach(mode=>craftingGoalOptions.rehearse(__item,recipe,mode));
        return JSON.stringify(game)===before&&itemIdCounter===id;})()`), true, 'crafting practice must leave the save and item ids untouched');
    // 제작 뿌리(data/items.js CRAFT_OMENS): the craft the armed omen changes spends exactly one and disarms it; another craft leaves it
    // armed; practice with it spends nothing (2026-10-18).
    assert.strictEqual(runGame(`(()=>{selectForCrafting(__item.id,false);game.currencies.formlessDew=3;game.currencies.pruningShears=2;game.currencies.omenCompost=2;
        equipmentCrafting.armOmen(game,'omenCompost');const before=JSON.stringify(game);
        craftingGoalOptions.rehearse(__item,{key:'formlessDew',kind:'reroll',label:''},'none',equipmentCrafting.omenSpec('omenCompost'));
        const practiced=JSON.stringify(game)===before;useCurrency('pruningShears');const kept=game.currencies.omenCompost===2&&!!game.craftOmen;
        useCurrency('formlessDew');const spent=game.currencies.omenCompost===1&&game.craftOmen===null;useCurrency('formlessDew');
        return practiced&&kept&&spent&&game.currencies.omenCompost===1&&game.currencies.formlessDew===1;})()`), true,
        'a craft omen is spent once by the craft it changes, never by another craft or by practice');
    // 성화의 뿌리 pick and 기억 조각칼 only rewrite the same item: the bag keeps its count and no item id is taken (2026-10-18).
    assert.strictEqual(runGame(`(()=>{const bag=game.inventory.length,id=itemIdCounter;game.currencies.formlessDew=2;game.currencies.omenPyre=1;game.currencies.memoryImprint=1;
        equipmentCrafting.engrave(game,__item);equipmentCrafting.armOmen(game,'omenPyre');useCurrency('formlessDew');
        const picked=equipmentCrafting.pickChoice(game,1)===__item,restored=equipmentCrafting.restoreImprint(__item).ok;
        return picked&&restored&&game.inventory.length===bag&&itemIdCounter===id&&game.currencies.omenPyre===0&&game.currencies.memoryImprint===0;})()`), true,
        'a 성화의 뿌리 pick and a 기억 조각칼 restore change the same item and cost one each');
    console.log('smoke-crafting-economy passed');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
