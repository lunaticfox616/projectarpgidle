// Story scenes keep the words spoken in them: the journal quotes written before the illustrations (the gardener's verdict,
// the druid's "첫 번째 날붙이" reveal the woodsman and the abandoned blades build on, the dying words) sit on the scene
// where they are said, and the act title card is presentation only.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const read = code => JSON.parse(JSON.stringify(vm.runInContext(code, runtime)));

const scenes = read('STORY_JOURNAL_SCENES');
const quotes = read('STORY_SCENE_QUOTES');
const sceneIds = new Set(scenes.map(scene => scene.id));
assert.strictEqual(Object.keys(quotes).length, 10, 'prologue and acts 2–10 each keep their spoken lines');
for (const [sceneId, quote] of Object.entries(quotes)) {
    assert(sceneIds.has(sceneId), `${sceneId}: a quote belongs to an existing scene`);
    assert(quote.lines.length > 0 && quote.lines.every(line => line.startsWith('“')), `${sceneId}: spoken lines, in quotes`);
    const narration = scenes.find(scene => scene.id === sceneId).lines;
    assert(quote.lines.every(line => !narration.includes(line)), `${sceneId}: the quote is not a copy of the narration`);
}
assert(quotes.act_5_end.lines.includes('“나무꾼의 손에서 빠진, 첫 번째 날붙이였구나.”'), 'the first-blade reveal is back in act 5');
assert.strictEqual(quotes.act_5_end.before, true, 'last words come before the druid opens the path');
assert.strictEqual(quotes.act_10_end.before, false, 'a closing reflection comes after the scene');
assert.deepStrictEqual(read('JOURNAL_DB.act_5.scenes'), ['act_5_end'], 'journal entries still read their illustrated scenes');

// The title card only reads the current act; drawing it must not change combat or progression state.
const before = read('JSON.stringify([game.currentZoneId, game.level, game.playerHp, game.journalEntries])');
assert.doesNotThrow(() => vm.runInContext(`(function () {
    const noop = () => {};
    const ctx = { save: noop, restore: noop, fillRect: noop, fillText: noop, strokeText: noop,
        measureText: () => ({ width: 40 }), createLinearGradient: () => ({ addColorStop: noop }) };
    game.currentZoneId = 4;
    actTitleCard.draw(ctx, 1440, 900, 1000);
    actTitleCard.draw(ctx, 1440, 900, 2000);
})()`, runtime), 'the act title card draws against a plain 2D context');
vm.runInContext('game.currentZoneId = JSON.parse(' + JSON.stringify(before) + ')[0];', runtime);
assert.strictEqual(read('JSON.stringify([game.currentZoneId, game.level, game.playerHp, game.journalEntries])'), before,
    'the title card never changes game state');

console.log('story quotes: spoken lines restored on their scenes; title card is display only');
