const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
  console,
  Math,
  safeExposeData(values) { Object.assign(context, values); },
  safeExposeGlobals(values) { Object.assign(context, values); }
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('data/endgame-progression.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/endgame-progression.js', 'utf8'), context);

context.game = { season: 31, loopCount: 30, unlocks: {}, noti: {} };
const ordinaryBoss = { isBoss: true };
assert.strictEqual(context.getSealedArcanaCardDropChance({ type: 'act' }, ordinaryBoss), 0, 'ordinary bosses must never drop sealed Arcana cards');
assert.strictEqual(context.getSealedArcanaCardDropChance({ type: 'cosmos' }, ordinaryBoss), context.ARCANA_SEALED_CARD_DROP_CHANCE, 'Cosmos bosses use the chase drop chance');
assert.strictEqual(context.getSealedArcanaCardDropChance({ type: 'seasonBoss', cosmosCapstone: true }, ordinaryBoss), context.ARCANA_CAPSTONE_DROP_CHANCE, 'the Cosmos capstone must use its dedicated chance');
assert.strictEqual(context.tryDropSealedArcanaCard({ type: 'cosmos' }, ordinaryBoss, context.game, () => 1).dropped, false, 'a failed drop roll must not mutate inventory');
const firstDrop = context.tryDropSealedArcanaCard({ type: 'cosmos' }, ordinaryBoss, context.game, () => 0);
assert.strictEqual(firstDrop.dropped, true, 'a successful roll grants one sealed card');
assert.strictEqual(firstDrop.unlockedNow, true, 'the first successful drop must signal the one-time unlock');
assert.strictEqual(context.game.arcana.sealedCards, 1);
assert.strictEqual(context.game.unlocks.arcana, true, 'the first sealed card permanently unlocks Arcana');

const questOwner = { season:31, loopCount:30, unlocks:{}, noti:{}, cosmosAtlas:{ cleared:[] } };
let questResult = context.recordArcanaQuestCosmosExploration('planet-0', questOwner);
assert(questResult.startedNow && questResult.current === 1, 'the first distinct Cosmos clear starts the guaranteed Arcana quest');
assert.strictEqual(questOwner.arcana.sealedCards, 0, 'the first exploration starts the quest without paying its final reward early');
assert.strictEqual(context.recordArcanaQuestCosmosExploration('planet-0', questOwner).changed, false, 'repeating one node cannot advance the quest');
for (let index = 1; index < context.ARCANA_QUEST_EXPLORATION_TARGET; index++) {
  questResult = context.recordArcanaQuestCosmosExploration(`planet-${index}`, questOwner);
  if (index === 3) assert(questResult.stageChanged && questResult.stage.id === 'decode', 'the quest line advances to glyph decoding after four explorations');
  if (index === 7) assert(questResult.stageChanged && questResult.stage.id === 'restore', 'the quest line advances to seal restoration after eight explorations');
}
assert(questResult.completedNow && questResult.rewarded, 'the reviewed amount of distinct exploration must complete the quest');
assert.strictEqual(questOwner.arcana.sealedCards, 1, 'the quest grants exactly one sealed card');
assert.strictEqual(questOwner.unlocks.arcana, true, 'the guaranteed quest reward unlocks Arcana');
context.recordArcanaQuestCosmosExploration('planet-extra', questOwner);
assert.strictEqual(questOwner.arcana.sealedCards, 1, 'exploration after completion cannot repeat the guaranteed reward');

const returningOwner = {
  season:31, loopCount:30, unlocks:{}, noti:{},
  cosmosAtlas:{ cleared:Array.from({ length:context.ARCANA_QUEST_EXPLORATION_TARGET }, (_, index) => `old-${index}`) }
};
assert(context.reconcileArcanaQuestFromCosmos(returningOwner).completedNow, 'existing Cosmos clears must be credited retroactively');
assert.strictEqual(returningOwner.arcana.sealedCards, 1, 'retroactive reconciliation grants the quest reward once');
assert.strictEqual(context.reconcileArcanaQuestFromCosmos(returningOwner).completedNow, false);
assert.strictEqual(returningOwner.arcana.sealedCards, 1, 'reloading a migrated save cannot duplicate the quest reward');

context.grantSealedArcanaCard(2, context.game);
const first = context.unsealArcanaCard(context.game, () => 0);
const duplicate = context.unsealArcanaCard(context.game, () => 0);
const second = context.unsealArcanaCard(context.game, () => 0.05);
assert(first.ok && duplicate.ok && second.ok, 'sealed cards must become physical card copies');
assert(context.equipArcanaCard(first.copy.uid, 'deck', 0, context.game).ok);
assert.strictEqual(context.equipArcanaCard(first.copy.uid, 'equipment', '무기', context.game).code, 'already_equipped', 'one copy cannot occupy two destinations');
assert.strictEqual(context.equipArcanaCard(duplicate.copy.uid, 'deck', 1, context.game).code, 'duplicate_deck_card', 'a deck cannot contain duplicate Arcana identities');
assert(context.equipArcanaCard(duplicate.copy.uid, 'equipment', '무기', context.game).ok, 'a spare copy may reinforce an equipment slot');
const deckBeforeInvalidTargets = JSON.stringify(context.game.arcana.deckSlots);
[undefined, NaN, 1.5, -1, context.ARCANA_DECK_SLOT_COUNT].forEach(target => {
  assert.strictEqual(context.equipArcanaCard(second.copy.uid, 'deck', target, context.game).code, 'invalid_slot', `invalid deck target ${String(target)} must be rejected`);
  assert.strictEqual(JSON.stringify(context.game.arcana.deckSlots), deckBeforeInvalidTargets, 'invalid deck targets must not mutate slots');
});
assert.strictEqual(Object.prototype.hasOwnProperty.call(context.game.arcana.deckSlots, 'NaN'), false, 'invalid input must not create an array property named NaN');
assert(context.equipArcanaCard(second.copy.uid, 'deck', 1, context.game).ok, 'a different Arcana identity may enter the deck');

const deckStats = Array.from(context.getArcanaDeckStats(context.game));
assert(deckStats.some(stat => stat.id === 'move' && stat.val === 1), 'deck placement must grant its global effect');
const amplified = Array.from(context.applyArcanaSlotAmplification([{ id:'move', val:10 }, { id:'flatHp', val:20, extraStats:[{ id:'move', val:5 }] }], '무기', context.game));
assert.strictEqual(amplified[0].val, 11, 'equipment placement amplifies only matching item stats');
assert.strictEqual(amplified[1].val, 20, 'equipment placement must leave unrelated stats unchanged');
assert.strictEqual(amplified[1].extraStats[0].val, 5.5, 'matching sub-lines on compound options must also be amplified');

const starOwner = { arcana:context.createDefaultArcanaState() };
starOwner.arcana.cards.push({ uid:1, cardId:'star', obtainedLoop:31 });
const starRule = context.getArcanaCardGemDamageRule(1, starOwner);
assert.deepStrictEqual(Array.from([starRule.perLevelPct, starRule.capPct]), [3, 15], 'the Star must convert effective gem levels into capped gem damage');
assert.strictEqual(context.getArcanaCardSlotAmplifier(1, starOwner), null, 'the Star must not retain its obsolete fractional level amplifier');
const strength = context.ARCANA_CARD_DB.find(card => card.id === 'strength');
const temperance = context.ARCANA_CARD_DB.find(card => card.id === 'temperance');
const tower = context.ARCANA_CARD_DB.find(card => card.id === 'tower');
const judgment = context.ARCANA_CARD_DB.find(card => card.id === 'judgment');
assert(!strength.slotAmp.statIds.includes('flatDmg'), 'Strength must not silently amplify non-physical damage');
assert(!temperance.slotAmp.statIds.includes('resAll'), 'Temperance must match its regeneration and leech description');
assert(!tower.slotAmp.statIds.includes('flatHp') && tower.slotAmp.statIds.includes('evasion'), 'Tower must target the displayed base defenses');
assert(!judgment.slotAmp.statIds.includes('pctDmg'), 'Judgment must not become a generic damage amplifier');

const corrupted = context.normalizeArcanaState({
  cards: [{ uid:1, cardId:'wanderer' }, { uid:2, cardId:'wanderer' }],
  deckSlots: [1, 2], equipmentSlots: { 무기:1 }
});
assert.deepStrictEqual(Array.from(corrupted.deckSlots), [1, null, null, null], 'normalization removes duplicate deck identities');
assert.strictEqual(corrupted.equipmentSlots['무기'], null, 'normalization enforces one destination per physical copy');

const treeOwner = { season: 17, loopCount: 16 };
let advance = context.advancePruningTreeForLoop(treeOwner);
assert.strictEqual(advance.tree.unlocked, false, 'pruning stays locked before loop 18');
treeOwner.season = 18;
advance = context.advancePruningTreeForLoop(treeOwner);
assert.strictEqual(advance.granted, 1, 'loop 18 grants the first growth point');
assert.strictEqual(context.advancePruningTreeForLoop(treeOwner).granted, 0, 'repeated reconciliation cannot duplicate growth points');
treeOwner.pruningTree.growthPoints = 10;
assert.strictEqual(context.investPruningNode('deep_root', treeOwner).code, 'requirements', 'child branches require their parent ranks');
assert(context.investPruningNode('first_ring', treeOwner).ok);
assert(context.investPruningNode('first_ring', treeOwner).ok);
assert(context.investPruningNode('first_ring', treeOwner).ok);
assert(context.investPruningNode('deep_root', treeOwner).ok);
const treeStats = Array.from(context.getPruningTreeStats(treeOwner));
assert(treeStats.some(stat => stat.id === 'flatHp' && stat.val === 12), 'node ranks must aggregate conservative permanent stats');
assert(treeStats.some(stat => stat.id === 'resAll' && stat.val === 0.15));
assert(treeStats.some(stat => stat.id === 'move' && stat.val === -0.15), 'each growth rank must add its burden at the same time');
assert(treeStats.some(stat => stat.id === 'pctDmg' && stat.val === -0.1), 'child growth must also contribute its declared burden');
const deepRankBeforePrune = treeOwner.pruningTree.nodeRanks.deep_root;
assert(context.prunePruningNodePenalty('deep_root', treeOwner).ok, 'a player may spend a growth point to prune one active burden');
assert.strictEqual(treeOwner.pruningTree.nodeRanks.deep_root, deepRankBeforePrune, 'pruning a burden must preserve the earned positive rank');
const prunedStats = Array.from(context.getPruningTreeStats(treeOwner));
assert(!prunedStats.some(stat => stat.id === 'pctDmg'), 'pruning the only burden rank removes that penalty from final stats');
assert(prunedStats.some(stat => stat.id === 'resAll' && stat.val === 0.15), 'pruning must preserve the branch benefit');
assert.strictEqual(context.prunePruningNodePenalty('deep_root', treeOwner).code, 'no_penalty', 'a removed burden cannot be pruned twice');

const catchupOwner = { season: 21, loopCount: 20 };
assert.strictEqual(context.advancePruningTreeForLoop(catchupOwner).granted, 4, 'older saves receive each missed loop growth point exactly once');
assert.strictEqual(context.advancePruningTreeForLoop(catchupOwner).granted, 0);

const earlyUnlockOwner = {
  season:30, loopCount:29, unlocks:{ pruning:true }, noti:{},
  pruningTree:{ version:2, unlocked:true, growthPoints:26, nodeRanks:{}, prunedPenaltyRanks:{}, lastGrantedLoop:30 }
};
const reclaimed = context.advancePruningTreeForLoop(earlyUnlockOwner);
assert.strictEqual(reclaimed.granted, 0, 'reclaiming legacy points must not issue another loop reward');
assert.strictEqual(reclaimed.tree.growthPoints, 13, 'loop 30 keeps only the loop 18 through 30 entitlement');
assert.strictEqual(reclaimed.tree.version, context.PRUNING_TREE_STATE_VERSION, 'the one-time point reclaim must migrate the tree state');
assert.strictEqual(context.advancePruningTreeForLoop(earlyUnlockOwner).granted, 0, 'the point reclaim must be idempotent');

const investedLegacyOwner = {
  season:30, loopCount:29, unlocks:{ pruning:true }, noti:{},
  pruningTree:{ version:2, unlocked:true, growthPoints:11, nodeRanks:{ first_ring:5, deep_root:5, red_root:5 }, prunedPenaltyRanks:{}, lastGrantedLoop:30 }
};
const investedMigration = context.advancePruningTreeForLoop(investedLegacyOwner);
assert.strictEqual(investedMigration.tree.growthPoints, 0, 'spent legacy points above the new entitlement cannot remain spendable');
assert.strictEqual(investedMigration.tree.nodeRanks.first_ring, 5, 'the reclaim must not destroy an already built tree');
assert.strictEqual(investedMigration.tree.lastGrantedLoop, 32, 'excess invested points defer future grants until the entitlement catches up');
investedLegacyOwner.season = 32;
investedLegacyOwner.loopCount = 31;
assert.strictEqual(context.advancePruningTreeForLoop(investedLegacyOwner).granted, 0, 'legacy point debt cannot grant another point early');
investedLegacyOwner.season = 33;
investedLegacyOwner.loopCount = 32;
assert.strictEqual(context.advancePruningTreeForLoop(investedLegacyOwner).granted, 1, 'point grants resume when the new entitlement exceeds prior spending');

context.game = { season: 31, loopCount: 30, unlocks: {}, noti: {} };
context.grantSealedArcanaCard(1, context.game);
const uiCard = context.unsealArcanaCard(context.game, () => 0);
const panel = { innerHTML:'', __lastHtml:null };
context.escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
context.document = { getElementById(id) { return id === 'ui-arcana-panel' ? panel : null; } };
context.addLog = () => {};
context.saveGame = () => {};
vm.runInContext(fs.readFileSync('js/endgame-progression-ui.js', 'utf8'), context);
context.renderArcanaPanel();
assert(panel.innerHTML.includes('미사용 카드 <small>1장 보유</small>'), 'the Arcana header must count only unplaced copies');
context.selectArcanaCard(uiCard.copy.uid);
const weaponButton = panel.innerHTML.match(/<button class="arcana-destination empty"[^>]*onclick="([^"]+)"[^>]*>\s*<span class="arcana-slot-label">무기<\/span>/);
assert(weaponButton, 'the weapon destination must render a complete clickable handler attribute');
const handler = weaponButton[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
vm.runInContext(handler, context);
assert.strictEqual(context.game.arcana.equipmentSlots['무기'], uiCard.copy.uid, 'clicking the rendered equipment destination must place the selected card');
assert(panel.innerHTML.includes('미사용 카드 <small>0장 보유</small>'), 'placing a card must update the unused count');

console.log('smoke-arcana-pruning: ok');
