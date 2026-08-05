const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function readFunction(source, name) {
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

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const gridSource = fs.readFileSync('js/combat-grid.js', 'utf8');
const context = {
  game: {
    ascendClass: 'soulbinder',
    gridPlayer: { gx: 0, gy: 0 },
    enemies: [],
    summons: [
      { id: 1, alive: true, hp: 10, maxHp: 100 },
      { id: 2, alive: true, hp: 80, maxHp: 100 },
      { id: 3, alive: true, hp: 40, maxHp: 100 },
      { id: 4, alive: true, hp: 70, maxHp: 100 },
      { id: 5, alive: true, hp: 30, maxHp: 100 },
      { id: 6, alive: true, hp: 5, maxHp: 100 }
    ]
  },
  COMBAT_GRID_CONFIG: { size: 8 },
  hasKeystone(id) { return id === 'sb9'; }
};
vm.createContext(context);

[
  'getSummonCapMaximum',
  'getSummonRuntimeCap',
  'applyGrandlordGhostState',
  'applyMonsterDamageToSummon',
  'getEnemyPreferredGridTarget',
  'getMapProgressGainMultiplier',
  'generateEncounterPlan'
].forEach(name => vm.runInContext(readFunction(combatSource, name), context, { filename: name }));
[
  'isGridCellInBounds',
  'gridChebyshevDist',
  'gridCellKey',
  'hasGridCell',
  'getGridBlockedCells'
].forEach(name => vm.runInContext(readFunction(gridSource, name), context, { filename: name }));

assert.strictEqual(context.getSummonCapMaximum(), 12, 'Grandlord must raise the summon cap maximum to 12');
assert.strictEqual(context.getSummonRuntimeCap({ summonCap: 20 }), 12, 'runtime summons must respect the raised maximum');
context.applyGrandlordGhostState();
assert.deepStrictEqual(context.game.summons.filter(summon => summon.isGhost).map(summon => summon.id), [1, 6], 'Grandlord must ghost the lowest-current-life third of living summons');
assert.strictEqual(context.applyMonsterDamageToSummon(context.game.summons[0], 99, {}, {}), 0, 'ghost summons must not take monster damage');
assert.strictEqual(context.game.summons[0].hp, 10, 'ghost damage immunity must preserve health');

context.game.summons = [
  { id: 1, alive: true, hp: 20, isGhost: true, gx: 3, gy: 3 },
  { id: 2, alive: true, hp: 20, gx: 4, gy: 4 }
];
let blocked = context.getGridBlockedCells();
assert.strictEqual(blocked.has('3,3'), false, 'ghost summons must not reserve a grid cell');
assert.strictEqual(blocked.has('4,4'), true, 'corporeal summons must keep reserving a grid cell');
let target = context.getEnemyPreferredGridTarget({ gx: 2, gy: 2 });
assert.strictEqual(target, context.game.gridPlayer, 'enemies must ignore closer ghost summons when choosing a target');

assert.strictEqual(context.getMapProgressGainMultiplier({ type: 'seasonBoss' }), 2, 'root boss maps must fill their progress gauge twice as fast');
assert.strictEqual(context.getMapProgressGainMultiplier({ type: 'act' }), 1, 'non-root maps must keep their existing progress speed');
assert.strictEqual(context.generateEncounterPlan({ type: 'seasonBoss' })[0].at, 100, 'root boss maps must keep the full 100% encounter threshold');
assert.deepStrictEqual(
  Array.from(context.generateEncounterPlan({ id: 's6_beast_cerberus', type: 'seasonBoss' }), marker => marker.at),
  [33, 66, 100],
  'multi-phase root bosses must keep their phase thresholds while progress fills faster'
);

console.log('smoke-grandlord-summons passed');
