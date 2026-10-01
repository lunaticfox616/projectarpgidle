const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const read = code => vm.runInContext(code, runtime);
const clone = value => JSON.parse(JSON.stringify(value));
runtime.Math = Object.create(Math);
runtime.Math.random = () => 0.999999;
const bases = read('BASE_ITEM_DB'), mods = read('MOD_DB'), appraisal = runtime.itemAppraisal;

function item(baseId, modIds = [], tier = 15, rarity = 'rare') {
    const base = bases.find(row => row.id === baseId);
    assert(base, baseId);
    const gear = runtime.createItemFromBase(base, rarity, 20, { affixTierCap: 20 });
    gear.affixTierCap = 20;
    gear.stats = modIds.map(id => {
        const mod = mods.find(row => row.id === id && row.slots.includes(base.slot));
        assert(mod, `${id} on ${baseId}`);
        return runtime.rollAffixValueInTierRange(mod, tier, tier);
    });
    return gear;
}
const quote = (gear, currency) => clone(appraisal.quote(gear, currency));
const round = value => Math.round(value * 100) / 100;

// Actual crafted affixes share tier and roll quality; utility must not cost the same as core build power.
const speed = quote(item('hide_gloves', ['aspd']));
const life = quote(item('hide_gloves', ['flatHp']));
const utility = quote(item('hide_gloves', ['regenSuppressGloves']));
assert(speed.marketValue > utility.marketValue && life.marketValue > utility.marketValue, 'offense/survival have distinct values even below one dew');
assert(speed.affixes[0].weight > utility.affixes[0].weight);
const enabler = quote(item('bone_amulet', ['gemLevel'], 1));
assert(enabler.affixes[0].value > quote(item('bone_amulet', ['regenSuppressAmulet'], 1)).affixes[0].value);
assert.equal(enabler.quality, 100, 'a fixed +1 is fully rolled, not a 50% roll');

let prior = 0;
for (let tier = 1; tier <= 20; tier++) {
    const value = quote(item('rusted_blade', ['flatDmg'], tier)).affixes[0];
    assert.equal(value.tier, tier);
    assert(value.value > prior, `T${tier} must improve actual damage-affix value`);
    prior = value.value;
}
const gear = item('rusted_blade', ['flatDmg','aspd','crit']);
const perfect = quote(gear);
gear.stats.forEach(stat => { stat.val = stat.valMin; });
assert(quote(gear).marketValue < perfect.marketValue, 'within-tier roll quality changes continuous value');
assert.equal(quote(gear).quality, 0);
gear.stats.forEach(stat => { delete stat.valMin; delete stat.valMax; });
assert.equal(quote(gear).quality, 50, 'legacy affixes with missing roll ranges remain appraisable');
gear.stats.forEach(stat => { stat.valMin = null; stat.valMax = null; });
assert.equal(quote(gear).quality, 50, 'null ranges are unknown, not fixed perfect rolls');
gear.stats.forEach(stat => { stat.tier = 1.5; });
assert(quote(gear).affixes.every(stat => stat.tier === 1 && Number.isFinite(stat.value)));

const coherent = item('stormbolt_launcher', ['projectilePctDmg','aspd','crit']);
const copied = clone(coherent), expected = quote(coherent);
copied.stats.reverse(); copied.baseStats.reverse();
assert.deepEqual(quote(copied), expected, 'stat ordering does not affect any displayed appraisal');
copied.stats.push(...clone(copied.stats));
assert.deepEqual(quote(copied), expected, 'duplicate lines cannot mint option value or synergy');
copied.stats.unshift({ ...copied.stats[0], tier: 1, val: 1, valMin: 1, valMax: 2 });
assert.deepEqual(quote(copied), expected, 'the strongest duplicate wins regardless of input order');
const compound = clone(coherent);
compound.stats[0].extraStats = compound.stats.splice(1);
assert.deepEqual(quote(compound), expected, 'compound representation has identical value');
const attackBase = item('bloodletter_blade', []);
attackBase.stats = clone(coherent.stats);
assert(expected.breakdown.synergy > quote(attackBase).breakdown.synergy, 'projectile implicits reward matching projectile options');
const matchingElement = quote(item('rusted_blade', ['weaponFireFlatDmg','firePctDmg'], 20));
const mixedElement = quote(item('rusted_blade', ['weaponFireFlatDmg','coldPctDmg'], 20));
assert(matchingElement.marketValue > mixedElement.marketValue, 'matching elemental flat/increased damage has a real synergy premium');
assert.equal(mixedElement.breakdown.synergy, 0, 'unrelated elements do not form a coherent pair');
const mixedGems = item('bone_amulet', []);
mixedGems.stats = ['shieldSpellGemLevel','summonWeaponGemLevel'].map(id => runtime.rollAffixValueInTierRange(mods.find(mod => mod.id === id), 1, 1));
assert.equal(quote(mixedGems).breakdown.synergy, 0, 'legacy spell and summon gem levels cannot multiply each other');
const casterProjectile = item('rift_scepter', ['projectilePctDmg','spellFlatDmg','spellFlatPct','crit'], 20);
const mixedProjectile = item('rift_scepter', ['projectilePctDmg','flatDmg','spellFlatPct','crit'], 20);
assert(quote(casterProjectile).breakdown.synergy > quote(mixedProjectile).breakdown.synergy,
    'attack flat damage cannot become another coherent spell-projectile option');
const fastCaster = item('rift_scepter', ['spellFlatDmg','spellFlatPct','spellPctDmg','crit','aspd'], 20);
const leechCaster = item('rift_scepter', ['spellFlatDmg','spellFlatPct','spellPctDmg','crit','spellLeech'], 20);
assert(quote(fastCaster).marketValue > quote(leechCaster).marketValue,
    'the real shared cast-speed stat remains a coherent caster option, ahead of lower-weight leech');
const nakedDefense = item('gilded_barbute', ['flatHp','resF'], 20);
assert(quote(nakedDefense).breakdown.synergy <= quote(nakedDefense).breakdown.affixes * 0.08 + 0.01,
    'generic survival lines cannot receive armor alignment without an armor option');

// Same-slot/same-requirement-tier bases retain the value difference in their actual rolled implicits.
const weakBase = quote(item('gilded_barbute', ['flatHp']));
const strongBase = quote(item('warded_sallet', ['flatHp']));
assert(strongBase.breakdown.base > weakBase.breakdown.base);
assert(quote(item('apocalypse_greatblade', ['flatDmg'])).breakdown.base > quote(item('rusted_blade', ['flatDmg'])).breakdown.base);
const lowImplicit = item('warded_sallet', ['flatHp']);
lowImplicit.baseStats.forEach(stat => { stat.val = stat.valMin; });
assert(quote(lowImplicit).breakdown.base < strongBase.breakdown.base, 'implicit rolls matter too');
assert(expected.baseLabel.includes('투사체') && expected.baseLabel.includes('폭전 발사기'));

for (const value of [perfect, expected, weakBase, strongBase, enabler]) {
    assert.equal(round(value.affixes.reduce((total, line) => total + line.value, 0)), value.breakdown.affixes);
    assert(value.marketValue > 0 && value.marketValue < 1, 'ordinary samples retain a sub-dew value without a free one-dew floor');
    assert(value.ceiling >= value.fair && value.fair >= 1);
    assert(!value.capped);
}
const untouched = clone(coherent), originalQuote = quote(coherent);
read('game.level=999; game.currencies.formlessDew=999999; game.playerStall.proceeds=999; game.equipment={};');
assert.deepEqual(quote(coherent), originalQuote, 'player wealth/build never changes the price');
assert.deepEqual(clone(coherent), untouched, 'appraisal is read-only');
assert.equal(appraisal.quote(null), null);
assert.equal(appraisal.quote({ ...coherent, baseId: 'missing', baseName: 'missing' }), null);
assert.equal(appraisal.quote({ ...coherent, rarity: 'invalid' }), null);
const malformed = clone(coherent);
malformed.stats = [null, { id: 'flatDmg', val: NaN }, { id: 'aspd', val: -1 }];
assert.equal(quote(malformed).options, 0);

// Every live ordinary affix has an explicit category; new options must make a conscious tuning choice.
const covered = new Set(read('PLAYER_STALL_APPRAISAL.statGroups').flatMap(group => group.ids));
for (const mod of mods) assert(covered.has(mod.statId || mod.id), `Missing appraisal category: ${mod.id}`);
const exchange = read('MARKET_EXCHANGES').find(row => row.from === 'goldenRule' && row.to === 'formlessDew');
const budExchange = read('MARKET_EXCHANGES').find(row => row.from === 'magicBud' && row.to === 'formlessDew');
const goldPurchase = read('MARKET_EXCHANGES').find(row => row.from === 'formlessDew' && row.to === 'goldenRule');
assert.equal(appraisal.unitValue('magicBud'), budExchange.gain / budExchange.need);
assert.equal(appraisal.unitValue('formlessDew'), 1);
assert.equal(appraisal.unitValue('goldenRule'), goldPurchase.need / goldPurchase.gain);
assert.throws(() => appraisal.unitValue('ouroboros'), /Unsupported stall currency/);
assert.equal(appraisal.quote(coherent, 'ouroboros'), null);
const junk = item('rusted_blade', [], 1, 'normal'), junkDew = quote(junk), junkBud = quote(junk, 'magicBud');
assert.equal(junkDew.marketValue, junkBud.marketValue, 'currency selection does not increase the item valuation');
assert.equal(junkDew.fair, 1);
assert.equal(junkBud.fair, 1);
assert.equal(junkDew.recommendedCurrency, 'magicBud');
assert(junkDew.marketValue < 0.1 && junkDew.demand < 0.000001, 'garbage is not normally worth the minimum one-dew ask');
assert(junkBud.demand > junkDew.demand * 1000, 'a low-denomination ask is much easier to sell');
const junkGold = quote(junk, 'goldenRule');
assert.equal(junkGold.fair, 1);
assert.equal(junkGold.ceiling, 0, 'high denominations have no forced one-unit sale floor');
assert.equal(junkGold.demand, 0);
assert.equal(junkGold.eligible, false);
const premiumIds = ['flatDmg','weaponFlatDmgPct','attackPctDmg','aspd','crit','critDmg'];
const premium = [3,4,6].map(count => item('apocalypse_greatblade', premiumIds.slice(0, count), 20));
const premiumPrices = premium.map(gear => quote(gear));
assert(premiumPrices[0].marketValue > 1);
assert(premiumPrices[1].marketValue > premiumPrices[0].marketValue * 6, 'crossing into a strong four-option build has a convex premium');
assert(premiumPrices[2].marketValue > premiumPrices[1].marketValue * 2);
assert(premiumPrices[2].marketValue >= 2000 && premiumPrices[2].marketValue <= 3000, 'perfect six-option gear enters the twenty-to-thirty-gold range');
assert.equal(premiumPrices[2].recommendedCurrency, 'goldenRule');
assert(quote(premium[2], 'goldenRule').fair >= 20 && quote(premium[2], 'goldenRule').fair <= 30 && quote(premium[2], 'goldenRule').eligible);
assert(quote(premium[1]).marketValue < 100, 'four strong options retain their old price tier');
assert(quote(item('apocalypse_greatblade', premiumIds, 10), 'goldenRule').ceiling === 0, 'six mediocre tiers do not automatically become elite gold gear');
assert.equal(quote(item('apocalypse_greatblade', premiumIds, 15), 'goldenRule').fair, 1);
let lastSubGold = null, firstGold = null;
for (let percentile = 0; percentile <= 100; percentile++) {
    const nearBoundary = clone(premium[2]);
    nearBoundary.stats.forEach(stat => { stat.val = stat.valMin + (stat.valMax - stat.valMin) * percentile / 100; });
    const value = quote(nearBoundary, 'goldenRule');
    if (value.marketValue < appraisal.unitValue('goldenRule')) lastSubGold = value;
    else { firstGold = value; break; }
}
assert(lastSubGold && firstGold, 'real roll-quality range crosses the gold boundary');
assert(lastSubGold.ceiling === 0 && lastSubGold.demand === 0 && lastSubGold.recommendedCurrency === 'formlessDew');
assert(firstGold.ceiling >= 1 && firstGold.demand === 1 && firstGold.recommendedCurrency === 'goldenRule');
assert(quote(item('apocalypse_greatblade', ['flatDmg','spellFlatDmg','summonFlatDmg','summonCrit','accuracy','crit'], 20)).marketValue < 100,
    'six unrelated T20 options do not receive the elite coherent-combination premium');
const saturated = item('apocalypse_greatblade', mods.filter(mod => mod.slots.includes('무기')).map(mod => mod.id), 20);
assert.equal(quote(saturated).marketValue, 5000, 'even a malformed overfilled item cannot exceed the hard market cap');
assert.equal(quote(saturated, 'magicBud').ceiling, 25000, 'per-transaction payment ceilings remain finite');
assert(quote(saturated, 'magicBud').capped);
const goldenCopy = clone(premium[2]), goldenExpected = quote(goldenCopy, 'goldenRule');
goldenCopy.stats.reverse(); goldenCopy.stats.push(...clone(goldenCopy.stats));
assert.deepEqual(quote(goldenCopy, 'goldenRule'), goldenExpected, 'elite synergy is order independent and duplicate proof');
for (const candidate of [...premium, casterProjectile, saturated]) {
    const value = quote(candidate);
    assert(value.breakdown.synergy <= round(value.breakdown.affixes * 0.5), 'overlapping families never add beyond the single-family 50% cap');
}

for (const unique of read('UNIQUE_DB')) {
    runtime.Math.random = () => 0.999999;
    const uniqueItem = runtime.generateUniqueItem(unique.reqTier || 1, unique.slots[0], unique.name, { type: 'act' });
    runtime.Math.random = () => 0;
    const merchant = runtime.createBlackMarketUniqueOffer(unique, unique.reqTier || 1);
    for (const currency of read('PLAYER_STALL_RULES.currencies')) {
        const value = quote(uniqueItem, currency), paymentUnit = read('PLAYER_STALL_RULES.paymentDew')[currency];
        assert(value.marketValue <= 5000 && value.ceiling * paymentUnit <= 5000);
        assert(value.fair >= 1 && Number.isSafeInteger(value.ceiling));
        assert(value.eligible ? value.fair <= value.ceiling : value.ceiling === 0 && value.demand === 0);
        assert(value.ceiling * appraisal.unitValue(currency) <= merchant.price * exchange.gain / exchange.need * 0.6, unique.name);
        assert(value.ceiling * paymentUnit <= merchant.price * exchange.gain / exchange.need, `Discounted resale arbitrage: ${unique.name}`);
    }
}
for (const base of bases.filter(row => runtime.isBaseEligibleForBlackMarket(row) && row.reqTier <= 15)) {
    runtime.Math.random = () => 0.999999;
    const naked = runtime.createItemFromBase(base, 'normal', 15, { affixTierCap: 15 });
    naked.baseStats.forEach(stat => { stat.val = Math.max(stat.val, stat.valMax) * 10; });
    for (const currency of read('PLAYER_STALL_RULES.currencies')) {
        const value = quote(naked, currency);
        assert(value.ceiling * appraisal.unitValue(currency) <= Math.floor(9 * 0.6), `Merchant base arbitrage: ${base.id}`);
        assert(value.ceiling * read('PLAYER_STALL_RULES.paymentDew')[currency] <= 9, `Discounted base resale arbitrage: ${base.id}`);
        assert(value.eligible ? value.fair <= value.ceiling : value.ceiling === 0 && value.demand === 0);
    }
}
assert.equal(read('PLAYER_STALL_RULES.maxPaymentDew'), 5000);
console.log('item appraisal: coherent-family premiums, exceptional 20-30 gold tail, three currency units, duplicate protection and merchant resale caps passed');
