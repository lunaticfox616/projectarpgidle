import { PLAYER_STAT_READERS } from './player-stat-readers.mjs';

// Object-valued readers compare by contents, not identity (buff records may be built anew).
const fingerprint = value => value !== null && typeof value === 'object' ? JSON.stringify(value) : value;

export function createPlayerStatTick(deps) {
    let observer = null;
    const readValue = (name, state, now) => {
        if (!observer) return PLAYER_STAT_READERS[name](state, now, deps);
        observer.reading(true);
        try { return PLAYER_STAT_READERS[name](state, now, deps); } finally { observer.reading(false); }
    };
    const create = state => {
        const now = deps.now(), values = new Map(), read = new Set(), tests = [];
        const value = name => {
            if (!values.has(name)) values.set(name, readValue(name, state, now));
            return values.get(name);
        };
        return {
            get(name) { read.add(name); return value(name); },
            when(name, test) { const result = test(value(name)); tests.push([name, test, result]); return result; },
            restart() { read.clear(); tests.length = 0; },
            reads() { return { values: [...read].map(name => [name, fingerprint(values.get(name))]), tests: tests.slice() }; }
        };
    };
    const matches = (tick, reads) => reads.values.every(([name, print]) => Object.is(fingerprint(tick.get(name)), print))
        && reads.tests.every(([name, test, result]) => tick.when(name, test) === result);
    return Object.freeze({ create, matches, observe: next => { observer = next || null; }, names: Object.keys(PLAYER_STAT_READERS) });
}
