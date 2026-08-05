const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function readFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  let depth = 0;
  for (let index = source.indexOf('{', start); index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] !== '}') continue;
    depth--;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} must have a closing brace`);
}

const context = {
  game: {
    activeSkill: 'voidSummon',
    equipment: {},
    passives: ['genericGemNode', 'chaosGemNode', 'elementalGemNode'],
    gemData: {
      voidSummon: { level: 5 },
      fireSummon: { level: 5 },
      materialSummon: { level: 4, bossCoreLevel: 2, skyCoreLevel: 1, awakened: true }
    },
    supportGemData: { summonSupport: { level: 3, bossCoreLevel: 5 } },
    actRewardBonuses: [],
    journalBonuses: [],
    talismanPlacements: {},
    starWedge: {}
  },
  SKILL_DB: {
    voidSummon: { isGem: true, tags: ['summon', 'summon_attack', 'chaos'] },
    fireSummon: { isGem: true, tags: ['summon', 'summon_attack', 'fire', 'elemental'] },
    materialSummon: { isGem: true, tags: ['summon', 'summon_attack', 'physical'] }
  },
  SUPPORT_GEM_DB: { summonSupport: { tags: ['summon'] } },
  PASSIVE_TREE: {
    nodes: {
      genericGemNode: { stat: 'gemLevel', val: 2 },
      chaosGemNode: { stat: 'chaosGemLevel', val: 3 },
      elementalGemNode: { stat: 'elementalGemLevel', val: 1 }
    }
  },
  getTargetGemBonusSources(name) { return context.getGemBonusSources(name); },
  getGemSkyEnhanceGemLevelBonus() { return 0; },
  getSkyTowerGemBoostLevel(name) { return name === 'materialSummon' ? 3 : 0; },
  safeExposeGlobals(map) { Object.assign(context, map); }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

vm.runInContext(fs.readFileSync('js/skills.js', 'utf8'), context, { filename: 'js/skills.js' });
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
vm.runInContext(`${readFunctionSource(combatSource, 'getSummonGemLevel')}; this.getSummonGemLevel = getSummonGemLevel;`, context, { filename: 'getSummonGemLevel' });

assert.strictEqual(context.getGemBonusSources('voidSummon').total, 5, 'chaos summon gems must receive generic and chaos passive gem levels');
assert.strictEqual(context.getSummonGemLevel('voidSummon', 'skill'), 10, 'summon runtime level must include chaos passive gem levels');
assert.strictEqual(context.getGemBonusSources('fireSummon').total, 3, 'non-chaos summon gems must not receive chaos-only passive gem levels');
assert.strictEqual(context.getSummonGemLevel('fireSummon', 'skill'), 8, 'elemental summon runtime level must keep matching tag bonuses');

// 군주의핵(bossCoreLevel)·창공의힘(skyCoreLevel)·각성(awakened)·응축창공(getSkyTowerGemBoostLevel)으로
// 투자한 재료 보너스는 getGemPresentation()의 활성 스킬 젬 총 레벨에 그대로 반영되는데,
// 소환 공격 젬의 실제 전투 레벨(getSummonGemLevel)에서도 똑같이 반영되어야 한다.
// baseLevel 4 + bonus 2(genericGemNode는 태그 무관 공통 젬 레벨) + engrave 0
// + materialBonus(bossCore 2 + skyCore 1 + awakened 2 + skyTower 3 = 8) = 14
assert.strictEqual(context.getSummonGemLevel('materialSummon', 'skill'), 14, '군주의핵/창공의힘/각성/응축창공 보너스가 소환수 실제 레벨에 반영되어야 한다');

// 보조 젬(support)에는 애초에 군주의핵/창공의힘/각성 시스템이 적용되지 않으므로(getGemPresentation의
// support 분기에는 materialBonus가 없음), 소환 보조 젬에도 이 보너스를 더하면 안 된다.
// baseLevel 3 + bonus 2(genericGemNode) + materialBonus 0(보조 젬은 제외) = 5 — bossCoreLevel 5는 무시되어야 한다.
assert.strictEqual(context.getSummonGemLevel('summonSupport', 'support'), 5, '보조 젬은 materialBonus 없이 기본 레벨+공통 보너스만 반영해야 한다');

console.log('smoke-summon-tag-gem-level passed');
