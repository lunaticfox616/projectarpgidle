

export function atlasLateLedger(state) { return state.atlas.endgame; }

export function atlasLateDefaults() { return { kills: {}, items: {}, blight: {}, witness: 0, witnessed: [] }; }

export function atlasLateKills(state, id) { return atlasLateLedger(state).kills[id] || 0; }

/** 세계수의 그림자를 한 번이라도 쓰러뜨리면 아틀라스가 깨어난다(후반부가 열린다). */
export function atlasLateAwakened(state) { return atlasLateKills(state, 'pinnacle') > 0; }

export function atlasLateCount(env, state, item) { return Number(env.WALLET[item] ? state.currencies[env.WALLET[item]] : atlasLateLedger(state).items[item]) || 0; }

export function atlasLateStore(env, state, item, value) {
    if (env.WALLET[item]) state.currencies[env.WALLET[item]] = value;
    else atlasLateLedger(state).items[item] = value;
}

export function atlasLateGive(env, state, item, amount) {
    if (!(amount > 0) || !Object.hasOwn(env.E.items, item)) return 0;
    const before = atlasLateCount(env, state, item);
    atlasLateStore(env, state, item, Math.min(env.E.itemCap, before + Math.floor(amount)));
    return atlasLateCount(env, state, item) - before;
}

/** A save from before the altar materials became wallet currencies: the ledger's embers and ichors move to the wallet. */
export function atlasLateMoveAltarMaterials(env, state, raw) {
    const items = raw && raw.items && typeof raw.items === 'object' ? raw.items : null;
    if (!items || !state.currencies) return;
    for (const [item, key] of Object.entries(env.WALLET)) {
        const held = Math.floor(Number(items[item]) || 0);
        if (held > 0) state.currencies[key] = Math.min(env.E.itemCap, (Number(state.currencies[key]) || 0) + held);
        delete items[item];
    }
}

export function atlasLateDef(env, id) { return env.DEFS.get(id) || null; }

export function atlasLateEntryOf(row) { return row.kind === 'league' ? [[row.item, row.need]] : row.entry; }

// ---------------------------------------------------------------- a boss falls
export function atlasLateWitness(env, state, name, bossAct) {
    const book = atlasLateLedger(state);
    book.witness += 1;
    book.witnessed = [...book.witnessed, [name, Number.isInteger(bossAct) ? bossAct : 9]].slice(-env.E.witness.keep);
    return book.witness % env.E.witness.per === 0 ? atlasLateGive(env, state, 'ringInvite', 1) : 0;
}

/** Counts the kill (late bosses and apostles) and says whether this kill woke the atlas. */
export function atlasLateCountKill(env, state, node, apostle) {
    const wasAwake = atlasLateAwakened(state);
    if (env.LATE_BOSSES.has(node.kind)) atlasLateLedger(state).kills[node.id] = atlasLateKills(state, node.id) + 1;
    if (apostle) atlasLateLedger(state).kills[apostle.id] = atlasLateKills(state, apostle.id) + 1;
    return !wasAwake && atlasLateAwakened(state);
}
