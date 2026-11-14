import { atlasLateKills, atlasLateLedger } from './atlas-endgame-ledger.mjs';

// ---------------------------------------------------------------- the run's share
/** A blighted region's map is sometimes held by one of the apostles of 밑거름의 장로 instead of its own boss (after the gardener falls). */
export function atlasLateRollApostle(env, state, node, random) {
    if (!node || node.kind !== 'map' || atlasLateKills(state, 'apex_gardener') < 1) return null;
    const level = atlasLateLedger(state).blight[node.region] || 0;
    if (random() * 100 >= level * env.E.blight.chancePerLevel) return null;
    const pool = env.E.apostles.filter(row => row.regions.includes(node.region));
    return pool.length ? pool[Math.floor(random() * pool.length)].id : null;
}

/** The weaver's echoes: the bosses she witnessed most recently (newest first). */
export function atlasLateEchoesFor(state, node) { return node && node.id === 'apex_weaver' ? atlasLateLedger(state).witnessed.slice(-2).reverse() : []; }

export function atlasLateRunExtra(env, state, node, random) {
    return { apostle: atlasLateRollApostle(env, state, node, random), items: {}, echoes: atlasLateEchoesFor(state, node) };
}

/** Whole counts 1..cap under known keys only (unknown and broken entries are dropped). */
export function atlasLateCapped(raw, keys, cap) {
    const out = {};
    for (const key of keys) {
        const value = Math.floor(Number(raw && raw[key]) || 0);
        if (value > 0) out[key] = Math.min(cap, value);
    }
    return out;
}

export function atlasLateValidEcho(row) { return Array.isArray(row) && typeof row[0] === 'string' && row[0].length <= 40 && Number.isInteger(row[1]) && row[1] >= 0 && row[1] <= 9; }

export function atlasLateNormalizeRun(env, raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return { apostle: env.APOSTLES.has(source.apostle) ? source.apostle : null, items: atlasLateCapped(source.items, env.ITEM_IDS, env.E.itemCap * 10),
        echoes: (Array.isArray(source.echoes) ? source.echoes : []).filter(atlasLateValidEcho).slice(0, 2) };
}
