#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const context = {
  window: {},
  console,
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('data/maps.js', 'utf8'), context);

const journal = context.JOURNAL_DB;
assert.strictEqual(journal.immortal.bonus.stat, 'passivePoint', 'immortal journal must grant the intended permanent passive point');
assert.strictEqual(journal.immortal.bonus.value, 1, 'immortal journal must grant exactly one permanent passive point');
assert.strictEqual(journal.immortal.bonus.label, '영구 패시브 포인트 +1', 'immortal journal tooltip must match the applied passive point bonus');
assert.strictEqual(journal.level_200.bonus.stat, 'expGain', 'level 200 hidden journal must grant experience gain');
assert.strictEqual(journal.level_200.bonus.value, 2, 'level 200 hidden journal must grant +2% experience');
assert(context.JOURNAL_ENTRY_ORDER.includes('level_200'), 'level 200 hidden journal must be ordered for display');
assert.strictEqual(journal.passive_star_evolution.bonus, undefined, 'passive star evolution journal must not duplicate the existing stat effect');
assert(journal.passive_star_evolution.displayEffect.includes('피해 +24%'), 'passive star evolution journal must summarize current damage blessing');
assert(journal.passive_star_evolution.displayEffect.includes('최대 생명력 +140'), 'passive star evolution journal must summarize current HP blessing');
assert(journal.passive_star_evolution.displayEffect.includes('이동 속도 +10%'), 'passive star evolution journal must summarize current movement blessing');

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
assert(uiSource.includes("if (game.level >= 200) unlockJournalEntry('level_200')"), 'level 200 unlock must run from unlock checks');
assert(uiSource.includes('def.displayEffect'), 'journal UI must render non-duplicating display-only effects');
assert(uiSource.includes("entry.bonus.stat === 'passivePoint'"), 'save normalization must treat passive-point journals as immediate points');
assert(uiSource.includes("entry.entryId === 'immortal' && entry.stat === 'flatHp'"), 'save normalization must migrate the legacy immortal HP journal bonus');
assert(uiSource.includes("return entry.stat !== 'passivePoint'"), 'save normalization must migrate wrongly serialized passive-point journal bonuses');
assert(uiSource.includes("key === 'woodsmanTouch' ? ' woodsman-touch-currency'"), 'woodsman touch currency card must receive the rare currency class');
assert(uiSource.includes("orbKey === 'woodsmanTouch'") && uiSource.includes('class="woodsman-touch-name"'), 'woodsman touch name must use the rare styled font class');
assert(uiSource.includes("if (merged.passiveStarEvolution && !merged.journalEntries.includes('passive_star_evolution')) merged.journalEntries.push('passive_star_evolution');"), 'legacy star-awakened saves must have the hidden journal completed during normalization');

const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
assert(passivesSource.includes('function getClaimedJournalPassivePointTotal(state)'), 'claimed passive-point journal rewards must be centrally totaled');
assert(passivesSource.includes("entry.bonus.stat !== 'passivePoint'"), 'journal passive point total must only count passive-point rewards');

const totalStart = passivesSource.indexOf('function getClaimedJournalPassivePointTotal(state)');
const totalEnd = passivesSource.indexOf('function grantJournalBonus(entryId)', totalStart);
assert(totalStart >= 0 && totalEnd > totalStart, 'journal passive point total helper must be discoverable');
vm.runInContext(passivesSource.slice(totalStart, totalEnd), context);
assert.strictEqual(context.getClaimedJournalPassivePointTotal({
  journalEntries: ['immortal', 'woodsman_echo'],
  journalBonusClaims: { immortal: true, woodsman_echo: true },
}), 2, 'claimed passive-point journals must stack once each');
assert.strictEqual(context.getClaimedJournalPassivePointTotal({
  journalEntries: ['immortal'],
  journalBonusClaims: { immortal: false },
}), 0, 'unclaimed passive-point journals must not be counted on loop reset');
assert(passivesSource.includes("unlockJournalEntry('passive_star_evolution')"), 'passive star evolution must unlock its journal entry');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
assert(combatSource.includes('getClaimedJournalPassivePointTotal(game)'), 'loop reset must restore claimed permanent journal passive points');
assert(combatSource.includes("game.passiveStarEvolution && Array.isArray(game.journalEntries) && game.journalEntries.includes('passive_star_evolution')"), 'star awakening stats must require the matching hidden journal completion');

const indexHtml = fs.readFileSync('index.html', 'utf8');
assert(indexHtml.includes('id="ui-colony-header">군락지 방어전</h2>'), 'colony defense header must not include the broken insect icon');

const polishCss = fs.readFileSync('css/ui-polish.css', 'utf8');
assert(polishCss.includes('.currency-card.woodsman-touch-currency::before'), 'woodsman touch glow border pseudo-element must be defined');
assert(polishCss.includes('animation: woodsman-touch-border-spin 8s linear infinite'), 'woodsman touch glow border must rotate slowly');
assert(polishCss.includes('.woodsman-touch-name') && polishCss.includes('color: #9dffc8'), 'woodsman touch font color must be distinct from ordinary currency names');

console.log('hidden journal and woodsman touch UI smoke checks passed');
