#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const saveSource = fs.readFileSync('js/save.js', 'utf8');

function createHarness(storageOverrides = {}) {
    const values = new Map(Object.entries(storageOverrides.values || {}));
    const writes = [];
    const localStorage = {
        getItem(key) {
            if (storageOverrides.readError) throw storageOverrides.readError;
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            if (storageOverrides.writeError) throw storageOverrides.writeError;
            writes.push([key, value]);
            values.set(key, value);
        }
    };
    const defaultGame = { saveMeta: { lastModifiedAt: 0, lastCloudSyncAt: 0 }, inventory: [], equipment: {} };
    const exposed = {};
    const loggedErrors = [];
    const context = {
        console: { ...console, error: (...args) => loggedErrors.push(args) },
        localStorage,
        LOCAL_SAVE_KEY: 'current-save',
        LEGACY_SAVE_KEYS: ['legacy-save'],
        defaultGame,
        game: null,
        itemIdCounter: 0,
        cloudState: {},
        cloneDefaultGame: () => JSON.parse(JSON.stringify(defaultGame)),
        mergeDefaults: value => ({ ...JSON.parse(JSON.stringify(defaultGame)), ...value }),
        getZone: () => ({ id: 0 }),
        getAutoProgressZoneId: () => 0,
        scheduleCloudAutoSync() {},
        updateCloudSaveUI() {},
        safeExposeGlobals(map) {
            Object.assign(exposed, map);
            Object.assign(context, map);
        }
    };
    vm.createContext(context);
    vm.runInContext(saveSource, context, { filename: 'js/save.js' });
    return { context, exposed, values, writes, loggedErrors };
}

{
    const harness = createHarness({ values: { 'current-save': '{broken json' } });
    const status = harness.exposed.loadGame();
    assert.strictEqual(status.status, 'corrupt', 'corrupt saves must be reported distinctly');
    assert.strictEqual(status.writable, false, 'corrupt saves must block automatic writes');
    assert(status.backupKey, 'corrupt saves must be preserved under a backup key');
    assert.strictEqual(harness.values.get('current-save'), '{broken json', 'the original save must not be overwritten');
    assert(harness.loggedErrors.length > 0, 'corrupt saves must emit an observable error');
    assert.strictEqual(harness.exposed.saveGame({ skipCloudSync: true }), false, 'normal saves must remain blocked after corrupt load');
    assert.strictEqual(harness.values.get('current-save'), '{broken json', 'blocked autosave must preserve the original save');
}

{
    const readError = new Error('storage denied');
    const harness = createHarness({ readError });
    const status = harness.exposed.loadGame();
    assert.strictEqual(status.status, 'unavailable', 'storage access failures must not look like a missing save');
    assert.strictEqual(status.writable, false, 'storage access failures must block writes');
    assert(harness.loggedErrors.length > 0, 'storage access failures must emit an observable error');
    assert.strictEqual(harness.exposed.saveGame({ skipCloudSync: true }), false, 'saveGame must report blocked persistence');
    assert.strictEqual(harness.writes.length, 0, 'blocked persistence must not attempt a write');
}

{
    const harness = createHarness({ values: { 'current-save': '{broken json' } });
    harness.exposed.loadGame();
    harness.context.game.level = 42;
    assert.strictEqual(
        harness.exposed.persistLocalSave({ touchModifiedAt: false, allowRecoveryWrite: true }),
        true,
        'an explicit recovery source must be able to replace a corrupt local save'
    );
    assert.strictEqual(harness.exposed.getLocalSaveStatus().writable, true, 'successful recovery must re-enable persistence');
    assert.strictEqual(JSON.parse(harness.values.get('current-save')).level, 42, 'recovery writes must persist the replacement snapshot');
}

console.log('save failure boundary smoke checks passed');
