const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const passiveSource = fs.readFileSync('js/passives.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const cosmosSource = fs.readFileSync('js/cosmos-atlas.js', 'utf8');
const growthUiSource = fs.readFileSync('js/growth-ui.js', 'utf8');

function extract(source, startNeedle, endNeedle) {
    const start = source.indexOf(startNeedle);
    const end = source.indexOf(endNeedle, start);
    assert(start >= 0 && end > start, `source block not found: ${startNeedle}`);
    return source.slice(start, end);
}

// 부적 판의 이웃 효과 검사는 그루터기 함 부적으로 옮겼다(scripts/smoke-stump-talismans.js).
const salvageBlock = extract(
    passiveSource,
    'function getJewelSalvageShardGain',
    'function destroySelectedCraftItem'
);
let awardedJewelShards = 0;
const salvageContext = {
    awardCurrency(key, amount) { if (key === 'jewelShard') awardedJewelShards += amount; },
    addLog() {}
};
vm.createContext(salvageContext);
vm.runInContext(salvageBlock, salvageContext, { filename: 'jewel-salvage.js' });
assert.strictEqual(salvageContext.salvageJewelObject({ name: '미가공 주얼', rarity: 'normal', stats: [] }, true), 2, 'a normal zero-option jewel must still salvage into shards');
assert.strictEqual(awardedJewelShards, 2);

assert(uiSource.includes('옵션 평균 티어: T${tierSummary.toFixed(1)}'), 'jewel tooltip should show average option tier');
// Jewels go into equipment sockets through one dialog (2026-09-30): every socket kind, the store and its actions in one place.
const socketUiSource = fs.readFileSync('js/equipment-sockets-ui.js', 'utf8');
assert(socketUiSource.includes('equipmentSocketsUi.insert(') && socketUiSource.includes('equipmentSocketsUi.remove('), 'the socket dialog inserts and removes jewels');
assert(socketUiSource.includes("row.kind === 'void' ? '공허 소켓' : "), 'void and abyss sockets share the dialog');
assert(!uiSource.includes('onclick="bulkTalismanUnseal('), 'removed talisman bulk-unseal handler must not remain in the UI');
// Actual normal/rare/unique pickup, capacity and auto-salvage behavior is covered by
// smoke-act-exploration-items.js for both immediate and held delivery.
assert(cosmosSource.includes("addItemToInventory(item, { guaranteedKeep: true })"), 'cosmos boss exclusive equipment must survive full inventory');
assert(cosmosSource.includes("game.noti.items = true"), 'cosmos boss exclusive jewels light the equipment menu');
assert(cosmosSource.includes("game.noti.stump = true"), 'cosmos boss exclusive talismans light the stump box menu');

const growthCardBlock = extract(growthUiSource, 'function renderGrowthItemCard', '// 보관함이 40칸이라');
assert(!growthCardBlock.includes('<summary>관리</summary>'), 'growth item actions must not require an extra management disclosure click');
assert(growthCardBlock.includes('toggleGrowthItemLock') && growthCardBlock.includes('salvageGrowthInventoryItem'), 'growth item lock and salvage actions must remain directly available');

console.log('smoke-jewel-talisman-integrity passed');
