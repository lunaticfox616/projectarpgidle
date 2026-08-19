const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
  console,
  Math,
  safeExposeData(values) { Object.assign(context, values); },
  safeExposeGlobals(values) { Object.assign(context, values); },
  addLog() {},
  updateStaticUI() {}
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('data/endgame-progression.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/endgame-progression.js', 'utf8'), context);

context.game = { season: 39, loopCount: 38 };
let result = context.advanceWorldDeckForLoop(context.game, () => 0.5);
assert.strictEqual(result.deck.unlocked, false, 'world cards must stay locked before loop 40');
assert.deepStrictEqual(Array.from(result.deck.pendingChoices), [], 'locked world cards must not roll choices');

context.game.season = 40;
result = context.advanceWorldDeckForLoop(context.game, () => 0.5);
assert.strictEqual(result.deck.unlocked, true, 'world cards must unlock at loop 40');
assert.strictEqual(new Set(Array.from(result.deck.pendingChoices)).size, 3, 'each loop offer must contain three unique cards');
let chosen = result.deck.pendingChoices[0];
assert(context.chooseWorldCard(chosen), 'offered world card must be selectable');
assert.strictEqual(context.game.worldDeck.collection[chosen], 1, 'first selection must collect rank I');
assert.strictEqual(context.game.worldDeck.activeCardId, chosen, 'selected card must become active');
assert.strictEqual(context.game.worldDeck.pendingChoices.length, 0, 'selection must consume the current offer');

context.game.season = 41;
result = context.advanceWorldDeckForLoop(context.game, () => 0.2);
context.game.season = 42;
let rerollCalls = 0;
result = context.advanceWorldDeckForLoop(context.game, () => { rerollCalls += 1; return 0.8; });
assert.strictEqual(result.deck.lastOfferLoop, 42, 'an ignored offer must be replaced when a newer loop starts');
assert(rerollCalls > 0, 'a newer loop must reroll instead of preserving the stale offer');
chosen = result.deck.pendingChoices[0];
assert(context.chooseWorldCard(chosen), 'the current loop offer must remain selectable');
context.advanceWorldDeckForLoop(context.game, () => 0.1);
assert.strictEqual(context.game.worldDeck.pendingChoices.length, 0, 'a selected offer must not regenerate in the same loop');

context.game.season = 50;
result = context.advanceWorldDeckForLoop(context.game, () => 0.25);
assert.strictEqual(result.deck.pruningUnlocked, true, 'pruning must unlock at loop 50');
assert.strictEqual(result.deck.pruningPoints, 1, 'loop 50 must grant one pruning point');
context.advanceWorldDeckForLoop(context.game, () => 0.75);
assert.strictEqual(context.game.worldDeck.pruningPoints, 1, 'repeated normalization must never duplicate pruning points');

const card = context.WORLD_CARD_DB.find(row => row.id === chosen);
context.game.worldDeck.pruningPoints = card.pruneCost;
const before = context.getActiveWorldCardModifiers(context.game);
assert(Object.keys(card.burdenMods).some(key => before[key] !== undefined), 'active unpruned card must apply its burden');
assert(context.pruneWorldCard(chosen), 'collected card must be prunable when points are sufficient');
const after = context.getActiveWorldCardModifiers(context.game);
Object.keys(card.burdenMods).forEach(key => assert.strictEqual(after[key], undefined, `pruning must remove ${key}`));
Object.keys(card.boonMods).forEach(key => assert(after[key] > 1, `pruning must preserve boon ${key}`));

console.log('smoke-world-cards: ok');
