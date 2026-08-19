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
vm.runInContext(fs.readFileSync('data/endgame-progression.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/hideout.js', 'utf8'), context);

context.game = { season: 4, loopCount: 3, maxZoneId: 4, claimedActRewards: [], journalEntries: [], hideout: null };
assert.strictEqual(context.isHideoutUnlocked(context.game), false, 'hideout must stay locked before act 5 completion');
assert.strictEqual(context.ensureHideoutState(context.game).placements.length, 0, 'locked hideout must not receive default stations');

context.game.maxZoneId = 5;
let state = context.ensureHideoutState(context.game);
assert.strictEqual(context.isHideoutUnlocked(context.game), true, 'act 5 progress must unlock the hideout');
assert(state.placements.length >= 3, 'first hideout visit must place core functional stations');
assert.strictEqual(new Set(Array.from(state.placements, row => row.decorId)).size, state.placements.length, 'default layout must not duplicate a station');
assert.strictEqual(new Set(Array.from(state.placements, row => row.cell)).size, state.placements.length, 'default layout must not overlap cells');

const first = state.placements[0];
const second = state.placements[1];
const firstCell = first.cell;
const secondCell = second.cell;
assert(context.placeHideoutDecor(first.decorId, secondCell), 'placed decor must move to another cell');
state = context.ensureHideoutState(context.game);
assert.strictEqual(state.placements.find(row => row.decorId === first.decorId).cell, secondCell, 'moving onto an occupied cell must take its position');
assert.strictEqual(state.placements.find(row => row.decorId === second.decorId).cell, firstCell, 'occupied decor must swap back to the old position');

context.game.journalEntries.push('woodsman');
assert(context.getUnlockedHideoutDecor(context.game).some(row => row.id === 'woodsman_trophy'), 'boss journal must unlock its trophy decor');
assert(context.placeHideoutDecor('woodsman_trophy', 0), 'unlocked trophy must be placeable');
assert(context.removeHideoutDecor('woodsman_trophy'), 'placed trophy must be recoverable to the library');
assert(!context.ensureHideoutState(context.game).placements.some(row => row.decorId === 'woodsman_trophy'), 'recovered trophy must leave the grid');

const normalized = context.normalizeHideoutState({ placements:[
  { decorId:'stash', cell:1 }, { decorId:'stash', cell:2 }, { decorId:'forge', cell:1 }, { decorId:'invalid', cell:3 }
] }, context.game);
assert.deepStrictEqual(Array.from(normalized.placements, row => `${row.decorId}:${row.cell}`), ['stash:1'], 'load normalization must reject duplicate objects, overlaps, and unknown ids');

console.log('smoke-hideout: ok');
