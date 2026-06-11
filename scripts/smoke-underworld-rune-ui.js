#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const ui = fs.readFileSync('js/ui.js', 'utf8');
const css = fs.readFileSync('css/components.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert(ui.includes('class="underworld-rune-slot ${unlocked ? \'unlocked\' : \'locked\'}"'), 'underworld slots must render as persistent numbered buttons');
assert(ui.includes('onclick="openUnderworldRuneOverlay(${idx})"'), 'unlocked rune slot buttons must open the selection overlay');
assert(ui.includes('onclick="openUnderworldRuneUpgradeOverlay()"'), 'rune upgrade button must open a target selection overlay');
assert(ui.includes('function openUnderworldRuneOverlay(slotIndex)'), 'rune selection overlay opener must exist');
assert(ui.includes('function equipUnderworldRuneToSlot(slotIndex, no)'), 'rune overlay must equip a chosen rune into a slot');
assert(ui.includes('function unequipUnderworldRuneSlot(slotIndex)'), 'rune overlay must support clearing the selected slot');
assert(ui.includes('function openUnderworldRuneUpgradeOverlay()'), 'rune upgrade overlay opener must exist');
assert(ui.includes('function upgradeUnderworldRune(fromNo)'), 'rune upgrade action must accept the selected source rune');
assert(ui.includes('onmouseenter="showUnderworldRuneTooltip(event,${runeNo})"'), 'owned rune chips must show rune effect tooltips on hover');
assert(ui.includes('buildUnderworldRuneTooltipHtml(no)'), 'rune tooltip must be rendered from the rune definition and bonus state');
assert(ui.includes('getUnderworldRuneEffectHtml(no)'), 'slot labels must include the rune effect summary');
assert(ui.includes('openUnderworldRuneOverlay,'), 'rune overlay opener must be explicitly exposed for inline handlers');
assert(ui.includes('openUnderworldRuneUpgradeOverlay,'), 'rune upgrade overlay opener must be explicitly exposed for inline handlers');
assert(css.includes('.underworld-rune-slots'), 'underworld rune slot grid styles must exist');
assert(css.includes('.underworld-rune-overlay'), 'underworld rune overlay styles must exist');
assert(/css\/components\.css\?v=[^"']+/.test(index), 'component CSS cache buster must be versioned for UI styles');
assert(/js\/ui\.js\?v=[^"']+/.test(index), 'UI script must use a versioned cache buster');

const start = ui.indexOf('function getUnderworldRuneDef(no)');
const end = ui.indexOf('function switchMapSubtab(subtabId)', start);
const ensureStart = ui.indexOf('function ensureUnderworldRuneState()');
const ensureEnd = ui.indexOf('function getUnderworldRuneDef(no)', ensureStart);
assert(start >= 0 && end > start, 'underworld rune UI runtime block must be discoverable');
assert(ensureStart >= 0 && ensureEnd > ensureStart, 'underworld rune state normalizer must be discoverable');
const updates = { count: 0 };
const logs = [];
const sandbox = {
    game: {
        underworldRunes: {
            unlockedSlots: 2,
            unlockedRunesMaxNumber: 2,
            obtainedRunes: [1, 2],
            equippedRunes: [null, 1, null, null, null, null],
            enhanceLvByNo: {},
            bonusLinesByNo: {}
        },
        currencies: { runeShard: 5 }
    },
    UNDERWORLD_RUNE_DB: [
        { no: 1, name: '초생', stat: 'flatHp', val: 30 },
        { no: 2, name: '절단', stat: 'flatDmg', val: 8 }
    ],
    document: { getElementById() { return null; } },
    getStatName(id) { return id; },
    formatValue(id, value) { return String(value); },
    getItemStatToneColor() { return '#fff'; },
    escapeHTML(value) { return String(value); },
    hideInfoTooltip() {},
    showInfoTooltipHtml() {},
    addLog(message, type) { logs.push({ message, type }); return message; },
    updateStaticUI() { updates.count += 1; }
};
vm.runInNewContext(`${ui.slice(ensureStart, ensureEnd)}\n${ui.slice(start, end)}\nthis.equipUnderworldRuneToSlot = equipUnderworldRuneToSlot;\nthis.unequipUnderworldRuneSlot = unequipUnderworldRuneSlot;
this.upgradeUnderworldRune = upgradeUnderworldRune;`, sandbox);

sandbox.equipUnderworldRuneToSlot(0, 2);
assert.strictEqual(sandbox.game.underworldRunes.equippedRunes[0], 2, 'overlay equip should replace the selected unlocked slot only');
assert.strictEqual(sandbox.game.underworldRunes.equippedRunes[1], 1, 'overlay equip should not disturb other slots');
assert.strictEqual(updates.count, 1, 'overlay equip should refresh the UI once');
sandbox.equipUnderworldRuneToSlot(5, 1);
assert.strictEqual(sandbox.game.underworldRunes.equippedRunes[5], null, 'overlay equip should ignore locked slots');
sandbox.unequipUnderworldRuneSlot(0);
assert.strictEqual(sandbox.game.underworldRunes.equippedRunes[0], null, 'overlay unequip should clear the selected slot');
assert.strictEqual(updates.count, 2, 'overlay unequip should refresh the UI once');

sandbox.game.underworldRunes.obtainedRunes = [1, 1, 1, 2];
sandbox.game.underworldRunes.equippedRunes = [null, 1, null, null, null, null];
sandbox.upgradeUnderworldRune(1);
assert.deepStrictEqual(sandbox.game.underworldRunes.obtainedRunes, [2], 'selected rune upgrade should consume source runes and auto-equip the newly added next rune');
assert.strictEqual(sandbox.game.underworldRunes.equippedRunes[0], 2, 'upgraded rune should auto-equip into the first empty unlocked slot');
assert.strictEqual(sandbox.game.underworldRunes.equippedRunes[1], null, 'source rune copies in equipped slots should be cleared during upgrade');
assert.strictEqual(sandbox.game.currencies.runeShard, 0, 'selected rune upgrade should consume the selected rune shard cost');
assert.strictEqual(updates.count, 3, 'selected rune upgrade should refresh the UI once');
assert(logs.some(entry => entry.message.includes('룬 승급 성공: 룬1×3')), 'selected rune upgrade should produce an observable success log');

console.log('underworld rune UI smoke checks passed');
