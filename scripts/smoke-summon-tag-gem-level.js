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
    gemData: { voidSummon: { level: 5 }, fireSummon: { level: 5 } },
    actRewardBonuses: [],
    journalBonuses: [],
    talismanPlacements: {},
    starWedge: {}
  },
  SKILL_DB: {
    voidSummon: { isGem: true, tags: ['summon', 'summon_attack', 'chaos'] },
    fireSummon: { isGem: true, tags: ['summon', 'summon_attack', 'fire', 'elemental'] }
  },
  SUPPORT_GEM_DB: {},
  PASSIVE_TREE: {
    nodes: {
      genericGemNode: { stat: 'gemLevel', val: 2 },
      chaosGemNode: { stat: 'chaosGemLevel', val: 3 },
      elementalGemNode: { stat: 'elementalGemLevel', val: 1 }
    }
  },
  getTargetGemBonusSources(name) { return context.getGemBonusSources(name); },
  getGemSkyEnhanceGemLevelBonus() { return 0; },
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

console.log('smoke-summon-tag-gem-level passed');
