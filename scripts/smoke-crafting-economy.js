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
    Math: Object.create(Math)
};
salvageContext.Math.random = () => 0.99;
vm.createContext(salvageContext);
vm.runInContext(salvageBlock, salvageContext, { filename: 'salvage-economy.js' });

let rewards = salvageContext.salvageItemObject({ rarity: 'magic', name: '매직', stats: [], hiddenTier: 1 }, true);
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

const useCurrencyBlock = extract(passiveSource, 'async function useCurrency(currencyKey) {', 'function isMarketUnlocked');
const rerollPrecheck = useCurrencyBlock.indexOf("if (sporeMode !== 'none' && usesSporeAffix && isRerollSporeCurrency)");
const currencySpend = useCurrencyBlock.indexOf('game.currencies[currencyKey]--');
assert(rerollPrecheck >= 0 && currencySpend > rerollPrecheck, 'spore affordability must be resolved before the orb is spent');
assert(
    !useCurrencyBlock.slice(currencySpend).includes('consumeSpore(sporeMode)'),
    'spores must never be consumed after the orb is spent or the item is mutated'
);
assert(
    useCurrencyBlock.includes('if (getSelectedCraftItem() !== item || (game.currencies[currencyKey] || 0) <= 0)'),
    'rare currency confirmation must revalidate the selected crafting target before mutation'
);

const annulBlock = extract(itemSource, 'async function marketAnnulSelectedStat', 'async function marketExpandInventoryByDivine');
const bulkJewelSalvageBlock = extract(passiveSource, 'async function bulkSalvageJewels()', 'async function toggleJewelAutoSalvage');
const protectedItem = {
    name: '보호 장비',
    rarity: 'rare',
    stats: [
        { id: 'flatHp', statName: '생명력', val: 10, lockedByHoney: true },
        { id: 'crit', statName: '치명타', val: 5 }
    ]
};
const annulLogs = [];
const annulContext = {
    game: { currencies: { goldenRule: 2 } },
    isMarketUnlocked: () => true,
    getSelectedCraftItem: () => protectedItem,
    getAnnulmentRemovableStats: item => item.stats.map((stat, index) => ({ stat, index })).filter(row => !row.stat.lockedByHoney && !row.stat.lockedByRift && !row.stat.encroachedFinal && !row.stat.unremovable),
    requestGameConfirmation: async () => true,
    getStatName: id => id,
    updateItemName() {},
    updateStaticUI() {},
    addLog(message) { annulLogs.push(message); }
};
vm.createContext(annulContext);
vm.runInContext(annulBlock, annulContext, { filename: 'market-annul.js' });

(async () => {
    await annulContext.marketAnnulSelectedStat(0);
    assert.strictEqual(protectedItem.stats.length, 2, 'market service must preserve a honey-locked affix');
    assert.strictEqual(annulContext.game.currencies.goldenRule, 2, 'rejected protected removal must not spend currency');

    await annulContext.marketAnnulSelectedStat(1);
    assert.deepStrictEqual(Array.from(protectedItem.stats, stat => stat.id), ['flatHp'], 'market service should remove the selected removable affix');
    assert.strictEqual(annulContext.game.currencies.goldenRule, 0);

    const originalJewel = { name: '확인 대상', rarity: 'rare', locked: false };
    const newlyDroppedJewel = { name: '확인 후 드랍', rarity: 'rare', locked: false };
    const jewelSalvageContext = {
        game: { woodsmanBuildLock: false, jewelInventory: [originalJewel] },
        JEWEL_RARITY_ORDER: ['normal', 'magic', 'rare', 'unique'],
        document: { getElementById(id) { return { checked: id === 'chk-jewel-salvage-rare' }; } },
        getJewelSalvageShardGain: () => 1,
        requestGameConfirmation: async () => { jewelSalvageContext.game.jewelInventory.push(newlyDroppedJewel); return true; },
        salvageJewelObject: () => 1,
        updateStaticUI() {},
        addLog() {}
    };
    vm.createContext(jewelSalvageContext);
    vm.runInContext(bulkJewelSalvageBlock, jewelSalvageContext, { filename: 'bulk-jewel-salvage.js' });
    await jewelSalvageContext.bulkSalvageJewels();
    assert.deepStrictEqual(Array.from(jewelSalvageContext.game.jewelInventory, jewel => jewel.name), ['확인 후 드랍'], 'bulk salvage must not include jewels acquired while the confirmation is open');

    assert(uiSource.includes("return { enabled: false, reason: `홀씨 부족"), 'crafting UI should explain insufficient spore cost');
    assert(uiSource.includes("onclick=\"useCurrency('${key}')\" ${useState.enabled ? '' : 'disabled'}"), 'desktop crafting buttons should honor the computed use state');
    assert(uiSource.includes('const targetSet = new Set(targetItems);'), 'search-based equipment salvage should keep a confirmation-time target snapshot');
    assert(uiSource.includes('const targetSet = new Set(targets);'), 'search-based jewel salvage should keep a confirmation-time target snapshot');
    assert(!cardSource.includes('getItemSalvagePreviewText(item, true)'), 'compact inventory cards should not spend metadata space on salvage materials');
    assert(cardSource.includes('getItemSalvagePreviewText(item, false)'), 'the destructive action should retain a detailed salvage preview in its own hint');
    console.log('smoke-crafting-economy passed');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
