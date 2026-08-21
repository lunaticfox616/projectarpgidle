const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
  console,
  safeExposeData(values) { Object.assign(context, values); },
  safeExposeGlobals(values) { Object.assign(context, values); }
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('data/constants.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('data/endgame-progression.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/hideout.js', 'utf8'), context);

context.HIDEOUT_DECOR_DB.forEach(decor => {
  assert(decor.asset.startsWith('assets/hideout/decor/') && decor.asset.endsWith('.webp'), `${decor.id} must use dedicated compressed hideout art`);
  assert(fs.existsSync(decor.asset), `${decor.id} decor asset must exist`);
  assert(decor.footprint && decor.footprint.columns >= 1 && decor.footprint.rows >= 1, `${decor.id} must define its grid footprint`);
  if (decor.action) {
    assert(decor.action.label && decor.action.label.endsWith('탭'), `${decor.id} must name its hover destination tab`);
    assert(decor.renderScale > 0 && decor.renderScale <= 1, `${decor.id} must define a cell-bounded art scale`);
    assert(decor.directionalAsset && decor.directionalAsset.endsWith('.webp'), `${decor.id} must define a WebP directional sheet`);
    assert(fs.existsSync(decor.directionalAsset), `${decor.id} directional sheet must exist`);
    assert(fs.statSync(decor.directionalAsset).size <= 96 * 1024, `${decor.id} directional sheet must stay below 96 KB`);
  }
});
const directionalBytes = context.HIDEOUT_DECOR_DB
  .filter(decor => decor.action)
  .reduce((total, decor) => total + fs.statSync(decor.directionalAsset).size, 0);
assert(directionalBytes <= 384 * 1024, 'all functional directional sheets must stay below 384 KB total');
assert.strictEqual(context.HIDEOUT_GRID_COLUMNS, context.COMBAT_GRID_CONFIG.size, 'hideout columns must match the combat grid');
assert.strictEqual(context.HIDEOUT_GRID_ROWS, context.COMBAT_GRID_CONFIG.size, 'hideout rows must match the combat grid');
assert.strictEqual(context.HIDEOUT_PLAYER_CELL, 49, 'the reserved hideout idle cell must match the combat player spawn');
assert.strictEqual(JSON.stringify([0, 1, 2, 3].map(context.getHideoutDecorSpriteCell)),
  '[{"column":1,"row":0},{"column":1,"row":1},{"column":0,"row":1},{"column":0,"row":0}]',
  'directional frames must follow the alternating isometric footprint axes');

context.game = { season: 4, loopCount: 3, maxZoneId: 4, claimedActRewards: [], journalEntries: [], hideout: null };
assert.strictEqual(context.isHideoutUnlocked(context.game), false, 'hideout must stay locked before act 5 completion');
assert.strictEqual(context.ensureHideoutState(context.game).placements.length, 0, 'locked hideout must not receive default stations');

context.game.maxZoneId = 5;
let state = context.ensureHideoutState(context.game);
assert.strictEqual(context.isHideoutUnlocked(context.game), true, 'act 5 progress must unlock the hideout');
assert(state.placements.length >= 3, 'first hideout visit must place core functional stations');
assert.strictEqual(new Set(Array.from(state.placements, row => row.decorId)).size, state.placements.length, 'default layout must not duplicate a station');
const defaultOccupiedCells = state.placements.flatMap(row => Array.from(context.getHideoutPlacementCells(row)));
assert.strictEqual(new Set(defaultOccupiedCells).size, defaultOccupiedCells.length, 'default multi-cell footprints must not overlap');
assert(!defaultOccupiedCells.includes(context.HIDEOUT_PLAYER_CELL), 'default decor must leave the player idle cell open');
assert(context.setHideoutActive(true, context.game), 'an unlocked hideout can become the active combat scene');
assert.strictEqual(context.isHideoutActive(context.game), true, 'active hideout state must be observable');
context.setHideoutActive(false, context.game);

const first = state.placements[0];
const second = state.placements[1];
const firstCell = first.cell;
const secondCell = second.cell;
assert(context.placeHideoutDecor(first.decorId, secondCell), 'placed decor must move to another cell');
state = context.ensureHideoutState(context.game);
assert.strictEqual(state.placements.find(row => row.decorId === first.decorId).cell, secondCell, 'moving onto an occupied cell must take its position');
assert.strictEqual(state.placements.find(row => row.decorId === second.decorId).cell, firstCell, 'occupied decor must swap back to the old position');
const rotationBefore = state.placements.find(row => row.decorId === first.decorId).rotation;
assert(context.rotateHideoutDecor(first.decorId), 'a placed decor must rotate when its turned footprint fits');
state = context.ensureHideoutState(context.game);
assert.strictEqual(state.placements.find(row => row.decorId === first.decorId).rotation, (rotationBefore + 1) % 4, 'rotation must persist as quarter turns');
assert.strictEqual(JSON.stringify(context.getHideoutDecorFootprint(first.decorId, rotationBefore)), '{"columns":2,"rows":1}');
assert.strictEqual(JSON.stringify(context.getHideoutDecorFootprint(first.decorId, rotationBefore + 1)), '{"columns":1,"rows":2}', 'a quarter turn must swap footprint axes');

context.game.journalEntries.push('woodsman');
assert(context.getUnlockedHideoutDecor(context.game).some(row => row.id === 'woodsman_trophy'), 'boss journal must unlock its trophy decor');
assert(context.placeHideoutDecor('woodsman_trophy', 0), 'unlocked trophy must be placeable');
assert(context.removeHideoutDecor('woodsman_trophy'), 'placed trophy must be recoverable to the library');
assert(!context.ensureHideoutState(context.game).placements.some(row => row.decorId === 'woodsman_trophy'), 'recovered trophy must leave the grid');

const normalized = context.normalizeHideoutState({ placements:[
  { decorId:'stash', cell:1 }, { decorId:'stash', cell:2 }, { decorId:'forge', cell:1 }, { decorId:'invalid', cell:3 }
] }, context.game);
assert.deepStrictEqual(Array.from(normalized.placements, row => `${row.decorId}:${row.cell}`), ['stash:1'], 'load normalization must reject duplicate objects, overlaps, and unknown ids');
assert.strictEqual(normalized.gridVersion, context.HIDEOUT_GRID_VERSION, 'legacy 6x4 saves must migrate to the current grid version');
const migratedCorner = context.normalizeHideoutState({ gridVersion:1, placements:[{ decorId:'forge', cell:23 }] }, context.game);
assert.deepStrictEqual(Array.from(migratedCorner.placements, row => `${row.decorId}:${row.cell}`), ['forge:54'], 'legacy bottom-right decor must shift just enough for its full footprint to remain in the grid');
const malformed = context.normalizeHideoutState({ gridVersion:2, placements:[{ decorId:'stash' }] }, context.game);
assert.strictEqual(malformed.placements.length, 0, 'missing placement cells must be rejected instead of becoming NaN cells');
const corruptEdge = context.normalizeHideoutState({ gridVersion:2, placements:[{ decorId:'stash', cell:99 }] }, context.game);
assert.strictEqual(corruptEdge.placements.length, 0, 'corrupt out-of-range saved cells must not be clamped into a valid placement');
assert.strictEqual(context.placeHideoutDecor('forge', context.HIDEOUT_PLAYER_CELL), false, 'decor cannot occupy the player idle cell');
assert.strictEqual(context.placeHideoutDecor('forge', 63), false, 'multi-cell decor cannot extend beyond the hideout grid');

let saveCount = 0;
context.document = { getElementById() { return null; } };
context.escapeHTML = value => String(value);
context.saveGame = () => { saveCount += 1; };
vm.runInContext(fs.readFileSync('js/hideout-ui.js', 'utf8'), context);
context.selectHideoutDecor('stash');
assert(context.placeSelectedHideoutDecorAndSave(4), 'click placement must use the UI persistence boundary');
assert.strictEqual(saveCount, 1, 'successful click placement saves immediately');
assert(context.rotateHideoutDecorAndSave('stash'), 'the UI rotation action must rotate placed decor');
assert.strictEqual(saveCount, 2, 'successful rotation saves immediately');
assert(context.recoverHideoutDecor('stash'), 'the UI recovery action must remove the placed decor');
assert.strictEqual(saveCount, 3, 'successful recovery saves immediately');
context.selectHideoutDecor('forge');
assert.strictEqual(context.placeSelectedHideoutDecorAndSave(-1), false, 'invalid placement remains rejected');
assert.strictEqual(saveCount, 3, 'failed placement must not write a save');

console.log('smoke-hideout: ok');
