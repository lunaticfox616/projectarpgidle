import { atlasLateKills, atlasLateAwakened, atlasLateDef, atlasLateEntryOf, atlasLateCount, atlasLateStore, atlasLateGive } from './atlas-endgame-ledger.mjs';

// ---------------------------------------------------------------- what is open
/** A league waits for the unlock of its room (data/atlas.js encounters): before it there are no shards. */
export function atlasLateRoomLoop(env, row) { return row.room && env.deps.ATLAS.encounters[row.room] ? env.deps.ATLAS.encounters[row.room].minLoop || 0 : 0; }

export function atlasLateRoomHeld(env, state, row) { const unlock = row.room && env.deps.ATLAS.encounters[row.room]?.unlock; return !unlock || env.deps.contentProgression.holds(unlock, state); }

export function atlasLateAncientDone(state, id) {
    return atlasLateKills(state, id) > 0 || (state.atlas.completed || []).includes(id) || (state.clearedRootBosses || []).includes(id);
}

export function atlasLateAncientGate(env, state, id) {
    const rule = env.deps.ATLAS.lore.bosses.find(row => row.id === id);
    if (!rule || atlasLateAncientDone(state, id)) return '';
    const missing = rule.requires.filter(key => !atlasLateAncientDone(state, key));
    const name = key => env.deps.ATLAS.lore.bosses.find(row => row.id === key)?.name || env.deps.atlas.node(key)?.name || key;
    return missing.length ? env.deps._t('{names} 격파 필요', { names: missing.map(key => env.deps._t(name(key))).join(', ') }) : '';
}

/** 천문도의 보스 자리가 치르는 후반 싸움(개편 C: 벨라-루, 아리안로드, 정원사의 메아리, 나무꾼, 베일라)의 자리, 아니면 null. 그 다섯은
 * 자리가 열렸을 때 열리고(예전 사슬과 깨어남은 막지 않는다), 자리를 완료하기 전에는 바치는 것이 없다. */
export function atlasLateChartGate(env, id) { return env.deps.atlas.gateOf(id); }

/** 비용 없는 첫 도전인지: 그 싸움을 치르는 자리를 아직 완료하지 않았다. */
export function atlasLateFreeEntry(env, state, id) { const gate = atlasLateChartGate(env, id); return !!gate && env.deps.atlas.gateFree(state, gate.id); }

export function atlasLateUnlocked(env, state, row) {
    const gate = atlasLateChartGate(env, row.id);
    if (gate) return env.deps.atlas.status(state, gate.id) !== 'locked';
    if (!atlasLateAwakened(state) || (Number(state.season) || 1) < atlasLateRoomLoop(env, row) || !atlasLateRoomHeld(env, state, row)) return false;
    if (env.deps.ATLAS.lore.bosses.some(rule => rule.id === row.id)) return !atlasLateAncientGate(env, state, row.id);
    return !(row.unlock && row.unlock.kill) || atlasLateKills(state, row.unlock.kill) > 0;
}

export function atlasLateLockText(env, state, row) {
    if (atlasLateChartGate(env, row.id)) return env.deps.atlas.gateLock(state, atlasLateChartGate(env, row.id).id);
    if (atlasLateAwakened(state) && env.deps.ATLAS.lore.bosses.some(rule => rule.id === row.id)) return atlasLateAncientGate(env, state, row.id);
    if (row.unlock && row.unlock.kill) return env.deps._t('{name} 처치 뒤에 열립니다.', { name: atlasLateDef(env, row.unlock.kill).stages[0].name });
    if (atlasLateAwakened(state) && atlasLateRoomLoop(env, row) > 0) return env.deps._t('{name} 해금 뒤에 열립니다.', { name: env.deps.ATLAS.encounters[row.room].name });
    return '세계수의 그림자(정점)를 쓰러뜨리면 아틀라스가 깨어나 열립니다.';
}

export function atlasLateMissingOf(env, state, row) { return atlasLateEntryOf(row).filter(([item, need]) => atlasLateCount(env, state, item) < need); }

/** 바칠 재료가 모자란 까닭('' = 다 있다). */
export function atlasLateOfferingReason(env, state, id) {
    const missing = atlasLateMissingOf(env, state, atlasLateDef(env, id));
    return missing.length ? `재료가 부족합니다: ${missing.map(([item, need]) => `${env.E.items[item].name} ${atlasLateCount(env, state, item)}/${need}`).join(', ')}` : '';
}

/** @returns {string} '' when the fight can open now, otherwise why not (a fight of a chart boss: that boss's rule, atlas gateReason). */
export function atlasLateEntryReason(env, state, id) {
    const row = atlasLateDef(env, id);
    if (!row) return '없는 보스입니다.';
    const gate = atlasLateChartGate(env, id);
    if (gate) return env.deps.atlas.gateReason(state, gate.id);
    const lock = env.deps.atlas.lockReason(state);
    if (lock) return lock;
    if (state.atlas.run) return env.deps.atlas.runOpenReason(state);
    if (!atlasLateUnlocked(env, state, row)) return atlasLateLockText(env, state, row);
    return atlasLateOfferingReason(env, state, id);
}

export function atlasLateSpend(env, state, id) {
    for (const [item, need] of atlasLateEntryOf(atlasLateDef(env, id))) atlasLateStore(env, state, item, atlasLateCount(env, state, item) - need);
}

/** Travel failed right after opening: the offering comes back. */
export function atlasLateRefund(env, state, id) {
    for (const [item, need] of atlasLateEntryOf(atlasLateDef(env, id))) atlasLateGive(env, state, item, need);
}
