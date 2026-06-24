const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const itemSource = fs.readFileSync('data/items.js', 'utf8');
const cosmosSource = fs.readFileSync('js/cosmos-atlas.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(itemSource, sandbox);

const rewards = sandbox.window.COSMOS_BOSS_REWARD_DB;
const uniqueDb = sandbox.window.UNIQUE_DB;
const expectedBossIds = ['planet-46', 'planet-47', 'planet-48', 'planet-49', 'planet-45'];

const expectedSpecs = {
  'planet-46': { equipment: ['우연한 충돌', '하말리스의 균열', '궤도'], jewel: '운석 파편', talisman: '하말리스의 충돌' },
  'planet-47': { equipment: ['디프다르의 낫', '심해', '조수'], jewel: '디프다르의 혈석', talisman: '디프다르의 조류' },
  'planet-48': { equipment: ['완벽한 균형', '주베누비아의 천칭', '쌍성'], jewel: '주베누비아의 균형', talisman: '주베누비아의 선택' },
  'planet-49': { equipment: ['주벤샤말의 심판하는 창', '최종 관문', '판결문'], jewel: '주벤샤말의 심판', talisman: '주벤샤말의 판결' },
  'planet-45': { equipment: ['인력', '태초의 대폭발', '에니프론의 혜성'], jewel: '바래진 우주석', talisman: '척력' }
};
const expectedEffectKeys = new Set([
  'cosmosAlwaysFirstHit', 'cosmosEnergyShieldAmpBypass', 'cosmosOrbitCycle',
  'instantLeechAndDoubleDamage', 'cosmosDeepSeaLeechCaps', 'cosmosTideEsRegenToLife',
  'cosmosEqualDamageSplit', 'cosmosBalanceMitigation', 'cosmosTwinStarResonance',
  'cosmosJudgmentLightning', 'cosmosDeathResist', 'cosmosVerdictSupportDamage',
  'cosmosGuardianConditionInstant', 'cosmosBossDamageMore', 'cosmosCometChillNoFreeze'
]);

assert(rewards && typeof rewards === 'object', 'cosmos boss reward DB must be exposed from data/items.js');
assert.deepStrictEqual(Object.keys(rewards).sort(), expectedBossIds.slice().sort(), 'five galaxy bosses must have exclusive reward specs');

const equipmentNames = new Set();
expectedBossIds.forEach(bossId => {
  const spec = rewards[bossId];
  assert.deepEqual(spec.equipment, expectedSpecs[bossId].equipment, `${bossId} must use the requested exclusive equipment names`);
  assert(spec.jewel && spec.jewel.id && spec.jewel.name === expectedSpecs[bossId].jewel, `${bossId} must have the requested exclusive jewel`);
  assert(spec.talisman && spec.talisman.id && spec.talisman.name === expectedSpecs[bossId].talisman, `${bossId} must have the requested exclusive talisman`);
  spec.equipment.forEach(name => equipmentNames.add(name));
});

assert.strictEqual(equipmentNames.size, 15, 'exclusive boss equipment names must be unique across all bosses');
const bossUniques = uniqueDb.filter(unique => unique && unique.dropOnly && unique.dropOnly.type === 'cosmosBoss');
assert.strictEqual(bossUniques.length, 15, 'UNIQUE_DB must contain exactly 15 cosmos boss-only unique equipment entries');

bossUniques.forEach(unique => {
  assert(equipmentNames.has(unique.name), `${unique.name} must be referenced by the boss reward DB`);
  assert(expectedBossIds.includes(unique.dropOnly.bossId), `${unique.name} must be restricted to one known cosmos boss`);
  assert(Array.isArray(unique.stats) && unique.stats.length >= 5, `${unique.name} must have at least five unique stat lines`);
  assert(expectedEffectKeys.has(unique.uniqueEffectKey), `${unique.name} must use an implemented requested cosmos effect key`);
});

assert(cosmosSource.includes('const COSMOS_BOSS_EQUIPMENT_DROP_CHANCE = 0.012;'), 'equipment drop chance must remain very low');
assert(cosmosSource.includes('const COSMOS_BOSS_JEWEL_DROP_CHANCE = 0.005;'), 'jewel drop chance must remain very low');
assert(cosmosSource.includes('const COSMOS_BOSS_TALISMAN_DROP_CHANCE = 0.005;'), 'talisman drop chance must remain very low');
assert.strictEqual(bossUniques.filter(unique => expectedEffectKeys.has(unique.uniqueEffectKey)).length, 15, 'all requested cosmos boss unique effects must be present');
assert(combatSource.includes('getCosmosEqualSplitDamageBreakdown'), 'cosmos equal damage split must be implemented in monster damage resolution');
assert(combatSource.includes('getCosmosBalancedMitigationPct'), 'cosmos balance mitigation must be implemented in monster damage resolution');
assert(cosmosSource.includes('function grantCosmosBossExclusiveDrops(node)'), 'cosmos boss exclusive grant helper must exist');
assert(cosmosSource.includes("if (node.tag === 'boss') grantCosmosBossExclusiveDrops(node);"), 'boss completion must roll exclusive drops');

console.log('cosmos boss exclusive drop data and wiring smoke checks passed');
