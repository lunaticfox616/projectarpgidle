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

function runEnterUnderworld(state, requestedFloor, canEnter = true) {
    let zoneChanges = 0;
    const context = {
        Math,
        Number,
        game: state,
        UNDERWORLD_ZONE_ID: 'underworld',
        canEnterUnderworld: () => canEnter,
        isBeehiveRunLockedForMapTravel: () => false,
        changeZone(zoneId) { state.currentZoneId = zoneId; zoneChanges += 1; },
        updateStaticUI() {},
        addLog() {}
    };
    vm.createContext(context);
    vm.runInContext(readFunctionSource('enterUnderworldFloor'), context, { filename: 'underworld-floor-entry.js' });
    context.enterUnderworldFloor(requestedFloor);
    return zoneChanges;
}

{
    const state = { underworldProgress: { highestFloor: 18, currentFloor: 7 } };
    assert.strictEqual(runEnterUnderworld(state, 18), 1, '최고층 즉시 입장은 지역을 한 번만 변경해야 한다');
    assert.strictEqual(state.underworldProgress.currentFloor, 18, '선택한 최고층이 현재 층에 반영되어야 한다');
    assert.strictEqual(state.currentZoneId, 'underworld', '지하계 지역으로 입장해야 한다');
    assert.strictEqual(runEnterUnderworld(state, 19), 0, '도달하지 않은 층에는 즉시 입장할 수 없어야 한다');
    assert.strictEqual(runEnterUnderworld(state, 5, false), 0, '입장 조건이 잠겼으면 빠른 입장도 우회할 수 없어야 한다');
}

console.log('smoke-underworld-rune-upgrade passed');
