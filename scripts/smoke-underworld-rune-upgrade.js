const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/ui.js', 'utf8');

function readFunctionSource(name) {
    const start = source.indexOf(`function ${name}(`);
    assert(start >= 0, `${name} must exist`);
    const bodyStart = source.indexOf('{', source.indexOf(')', start));
    let depth = 0;
    for (let index = bodyStart; index < source.length; index++) {
        if (source[index] === '{') depth++;
        if (source[index] !== '}') continue;
        depth--;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`${name} must have a closing brace`);
}

function runUpgrade(state) {
    const context = {
        Math,
        Number,
        Array,
        game: state,
        UNDERWORLD_RUNE_DB: [],
        addLog() {},
        closeUnderworldRuneOverlay() {},
        updateStaticUI() {}
    };
    vm.createContext(context);
    vm.runInContext([
        readFunctionSource('ensureUnderworldRuneState'),
        readFunctionSource('getUnderworldRuneDef'),
        readFunctionSource('getUnderworldRuneCountMap'),
        readFunctionSource('autoEquipUnderworldRune'),
        readFunctionSource('upgradeUnderworldRune')
    ].join('\n'), context, { filename: 'underworld-rune-upgrade.js' });
    context.upgradeUnderworldRune(1);
}

{
    const state = {
        currencies: { runeShard: 20 },
        underworldRunes: {
            unlockedSlots: 3,
            unlockedRunesMaxNumber: 2,
            obtainedRunes: [1, 1, 1],
            equippedRunes: [1, 1, null, null, null, null],
            enhanceLvByNo: {},
            bonusLinesByNo: {}
        }
    };
    runUpgrade(state);
    assert.deepStrictEqual(state.underworldRunes.equippedRunes.slice(0, 3), [1, 1, 2], 'upgrading inventory runes must preserve equipped copies');
    assert.deepStrictEqual(state.underworldRunes.obtainedRunes, [], 'only the three inventory materials must be consumed');
    assert.strictEqual(state.currencies.runeShard, 15, 'the upgrade must spend its rune-shard cost once');
}

{
    const state = {
        currencies: { runeShard: 20 },
        underworldRunes: {
            unlockedSlots: 2,
            unlockedRunesMaxNumber: 2,
            obtainedRunes: [1, 1, 1],
            equippedRunes: [1, 1, null, null, null, null],
            enhanceLvByNo: {},
            bonusLinesByNo: {}
        }
    };
    runUpgrade(state);
    assert.deepStrictEqual(state.underworldRunes.equippedRunes.slice(0, 2), [1, 1], 'full rune slots must not destroy equipped copies during an upgrade');
    assert.deepStrictEqual(state.underworldRunes.obtainedRunes, [2], 'the upgraded rune must remain in inventory when no slot is available');
}

console.log('smoke-underworld-rune-upgrade passed');
