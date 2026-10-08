// Shared by the stat cache smokes (scripts/smoke-player-stat-cache*.js). Each string runs inside a game runtime.
'use strict';

/** Every kept answer is compared with a fresh calculation, and a kept calculation must not change after it was handed out. */
const SHADOW = `window.__shadow = { diffs: [], mutated: [] };
    (() => {
        const seen = new WeakMap();
        const firstDifference = (a, b) => Object.keys({ ...a, ...b }).find(key => JSON.stringify(a[key]) !== JSON.stringify(b[key]));
        playerStatCache.verify((stats, kept, fresh) => {
            const core = JSON.stringify(kept.core.stats);
            if (!seen.has(kept.core)) seen.set(kept.core, core);
            else if (seen.get(kept.core) !== core && __shadow.mutated.length < 5) __shadow.mutated.push(firstDifference(JSON.parse(seen.get(kept.core)), kept.core.stats));
            const again = fresh();
            if (JSON.stringify(stats) !== JSON.stringify(again) && __shadow.diffs.length < 5) __shadow.diffs.push(firstDifference(stats, again));
        });
    })();`;

/**
 * Second-level reads of object-valued game fields made by the calculation outside tick readers. A read is covered when the build
 * signature holds it (BUILD_STAT_FIELDS whole, BUILD_STAT_PARTS listed keys), the field is a declared context field, or a shape
 * normalizer (ensure*, normalize*) reads it while tidying the object.
 */
const NESTED = `window.__nested = (() => {
    const done = new WeakSet(), seen = new Map(), whole = new Set(BUILD_STAT_FIELDS);
    const covered = (field, key) => whole.has(field) || (BUILD_STAT_PARTS[field] || []).includes(key)
        || Object.prototype.hasOwnProperty.call(PLAYER_STAT_CONTEXT_FIELDS, field);
    let calculating = 0, reading = 0;
    const readerName = () => {
        const frame = (new Error().stack || '').split('\\n')[3] || '';
        const match = frame.match(/at (?:Object\\.)?([\\w$.]+) \\(/);
        return match ? match[1] : frame.trim();
    };
    function instrument(field, object) {
        if (!object || typeof object !== 'object' || Array.isArray(object) || done.has(object)) return;
        done.add(object);
        for (const key of Object.keys(object)) {
            const d = Object.getOwnPropertyDescriptor(object, key);
            if (!d || !('value' in d) || !d.configurable || covered(field, key)) continue;
            let value = d.value;
            Object.defineProperty(object, key, { enumerable: d.enumerable, configurable: true,
                get() {
                    if (calculating && !reading) { const id = field + '.' + key + ' (' + readerName() + ')'; seen.set(id, (seen.get(id) || 0) + 1); }
                    return value;
                },
                set(next) { value = next; } });
        }
    }
    playerStatCache.observe({ calculating(on) {
        if (!on) { calculating--; return; }
        calculating++;
        for (const field of Object.keys(game)) instrument(field, game[field]);
    } });
    playerStatTick.observe({ reading(on) { reading += on ? 1 : -1; } });
    return { uncovered: () => [...seen.keys()].filter(id => !/\\((ensure|normalize)[A-Z]/.test(id)) };
})();`;

function readShadow(run) {
    return JSON.parse(run('JSON.stringify({ ...__shadow, nested: window.__nested ? __nested.uncovered() : [], health: playerStatCache.report() })'));
}

/** The kept answers must match fresh ones, nothing may change them, and every nested read must be covered. */
function assertShadow(assert, label, shadow) {
    assert.deepEqual(shadow.diffs, [], `${label}: kept stats differ from fresh ones`);
    assert.deepEqual(shadow.mutated, [], `${label}: a kept calculation was changed after it was handed out`);
    assert.deepEqual(shadow.nested, [], `${label}: the stat calculation reads game values the cache key does not cover. `
        + 'Declare them in data/build-stat-inputs.js (BUILD_STAT_FIELDS, BUILD_STAT_PARTS or PLAYER_STAT_CONTEXT_FIELDS), '
        + 'or read values that change during a fight through playerStatTick (js/player-stat-cache.js).');
    assert.equal(shadow.health.repairs, 0, `${label}: the self-check had to repair a kept calculation (${shadow.health.lastRepair.join(', ')})`);
}

module.exports = { SHADOW, NESTED, readShadow, assertShadow };
