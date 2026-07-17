const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const itemSource = fs.readFileSync('data/items.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const saveSource = fs.readFileSync('js/save.js', 'utf8');

const dataContext = {
    console,
    safeExposeData(map) { Object.assign(dataContext, map); }
};
vm.createContext(dataContext);
vm.runInContext(itemSource, dataContext, { filename: 'data/items.js' });

const realmUniques = dataContext.UNIQUE_DB.filter(item => item && item.realmCodexOnly);
assert(realmUniques.length > 0, 'realm codex uniques should be generated');
assert.deepStrictEqual(
    Array.from(realmUniques.filter(item => !item.uniqueEffectKey), item => item.name),
    [],
    'every realm-exclusive unique should have a functional unique effect key'
);
assert.deepStrictEqual(
    Array.from(dataContext.UNIQUE_DB.filter(item => !item.uniqueEffectKey), item => item.name),
    [],
    'every unique item should have a player-facing gameplay identity'
);
assert.deepStrictEqual(
    Array.from(
        dataContext.UNIQUE_DB.filter(item => (item.stats || []).filter(stat => stat.id === 'projectileExtraShots').length > 1),
        item => item.name
    ),
    [],
    'unique items should not contain duplicate projectile shot stat rows'
);
const implementedMatch = combatSource.match(/let implemented = new Set\(\[([\s\S]*?)\]\);/);
assert(implementedMatch, 'unique effect implementation registry should exist');
const implementedKeys = new Set(vm.runInNewContext(`[${implementedMatch[1]}]`));
const declaredKeys = Array.from(new Set(dataContext.UNIQUE_DB.map(item => item.uniqueEffectKey).filter(Boolean)));
assert.deepStrictEqual(
    declaredKeys.filter(key => !implementedKeys.has(key)),
    [],
    'the implementation report should recognize every declared unique effect'
);

const expectedEffects = {
    '파열의 언약': ['realmBleedingEnemyDamageMore', { morePct: 22 }],
    '균열의 정수': ['realmRiftWaveOnHit', { chance: 12, damagePct: 80 }],
    '공허의 갈고리': ['realmChaosDamageInstantLeech', { pct: 8 }],
    '타락각 투구': ['venomStride', { poisonMorePct: 0, poisonExtraStack: 1 }],
    '균열군주의 피부': ['realmInvulnerableBarrierOnHit', { chance: 10, duration: 1.5 }],
    '독성 심연갑': ['realmPoisonDuration', { durationPct: 35 }],
    '심층 제련검': ['realmArmorToPhysicalDamage', { pctPer1000: 3 }],
    '망자 감시투구': ['realmDeathWard', { hpPct: 12, cooldown: 20 }]
};
Object.entries(expectedEffects).forEach(([name, expected]) => {
    const item = dataContext.UNIQUE_DB.find(row => row.name === name);
    assert(item, `${name} should exist`);
    assert.strictEqual(item.uniqueEffectKey, expected[0], `${name} should use the intended runtime key`);
    assert.deepStrictEqual(
        JSON.parse(JSON.stringify(item.uniqueEffectParams || {})),
        expected[1],
        `${name} should expose the intended effect parameters`
    );
});

const cosmosVenom = itemSource.match(/\{ name: '독보의 자취',[^\n]+\}/);
assert(cosmosVenom && cosmosVenom[0].includes('poisonMorePct: 25'), 'cosmos venom effect parameters should match its 25% description');

const wardStart = combatSource.indexOf('function refreshRealmDeathWard');
const wardEnd = combatSource.indexOf('function getAscendKeystoneOwnerClass', wardStart);
assert(wardStart >= 0 && wardEnd > wardStart, 'death ward helper block should exist');
const wardContext = {
    game: { settings: { showCombatLog: false } },
    addLog() {},
    addBattleFx() {}
};
vm.createContext(wardContext);
vm.runInContext(combatSource.slice(wardStart, wardEnd), wardContext, { filename: 'realm-death-ward.js' });

const stats = { maxHp: 1000, uniqueDeathWard: { hpPct: 12, cooldown: 20 } };
let ward = wardContext.refreshRealmDeathWard(stats);
assert.strictEqual(ward.amount, 120, 'death ward should initialize from maximum life');
assert.strictEqual(wardContext.absorbDamageWithRealmDeathWard(50, stats), 0, 'death ward should fully absorb a smaller hit');
assert.strictEqual(wardContext.game.realmDeathWard.amount, 70);
assert.strictEqual(wardContext.absorbDamageWithRealmDeathWard(100, stats), 30, 'death ward should pass overflow damage through');
assert.strictEqual(wardContext.game.realmDeathWard.amount, 0);
assert(wardContext.game.realmDeathWard.readyAt > Date.now(), 'depleted death ward should start its recharge');

assert(combatSource.includes("if (hitElement === 'chaos') totalChaosDamage += dealtToEnemy;"), 'chaos hits should feed instant chaos leech');
assert(combatSource.includes('durationMul *= 1 + Math.max(0, Number(pStats.uniquePoisonDurationPct)'), 'poison duration unique should affect poison only');
assert(combatSource.includes("skill.ele === 'phys'"), 'armor conversion unique should be limited to physical skills');
assert(!combatSource.includes('if (uniqueVenomStride) finalDamageMultiplier *= 1.30'), 'venom stride must not multiply every damage type');
assert(combatSource.includes('projectileRepeatPct % 100'), 'fractional projectile repeat chance should work below 100%');
assert(!combatSource.includes('dmg = Math.max(1, Math.floor(dmg * (1 - bossLess / 100)));'), 'boss guardian reduction should replace, not stack with, the normal value');
assert(combatSource.includes("addBattleFx('trialTrap', { color: '#c49bff'"), 'realm invulnerability should block trial traps');
assert(combatSource.includes('75 + sharedElementalMaxRes + gearBase.maxResF'), 'shared maximum elemental resistance must affect fire resistance cap');
assert(combatSource.includes('75 + sharedElementalMaxRes + gearBase.maxResC'), 'shared maximum elemental resistance must affect cold resistance cap');
assert(combatSource.includes('75 + sharedElementalMaxRes + gearBase.maxResL'), 'shared maximum elemental resistance must affect lightning resistance cap');
assert(!combatSource.includes('75 + sharedElementalMaxRes + gearBase.maxResChaos'), 'maximum elemental resistance must not affect chaos resistance cap');
assert(uiSource.includes('감시 보호막 ${wardAmount}/'), 'death ward should be visible in the player HUD');
assert(uiSource.includes('균열 장막 ${Math.ceil'), 'realm invulnerability should be visible in the player HUD');
assert(uiSource.includes('getUniqueEffectApplicationHint'), 'equipment tooltips should explain how unique effects become active');
assert(uiSource.includes('◆ 획득: ${escapeHTML(item.uniqueEffect)}'), 'equipment comparison should disclose gained unique effects');
assert(uiSource.includes('◇ 상실: ${escapeHTML(backup.uniqueEffect)}'), 'equipment comparison should disclose lost unique effects');
assert(uiSource.includes('} finally {\n                game.equipment[targetSlot] = backup;'), 'equipment comparison must restore preview equipment even when stat calculation fails');
assert(saveSource.includes('payload.realmDeathWard = null;'), 'cloud snapshots should not persist transient ward state');

console.log('smoke-realm-unique-effects passed');
