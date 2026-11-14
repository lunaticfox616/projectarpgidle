

export function atlasPassiveTaken(state) { return state.atlas.passives; }

export function atlasPassiveSupported(node, has) { return !node.requires.length || node.requires.some(has); }

export function atlasPassiveLoopOf(env, id) {
    const node = env.NODES.get(id);
    const rooms = node ? Object.keys(node.effect).filter(key => env.ROOM_LOOPS.has(key)).map(key => env.ROOM_LOOPS.get(key)) : [];
    return node ? Math.max(node.minLoop || 0, rooms.length ? Math.min(...rooms) : 0) : 0;
}

export function atlasPassiveWaits(env, state, id) { return (Number(state.season) || 1) < atlasPassiveLoopOf(env, id); }

export function atlasPassiveAvailable(env, state) { return env.deps.atlas.points(state) - atlasPassiveTaken(state).length; }

/** Points that can be spent now: no more than the nodes still open to take this loop (the tab badge; a point beyond them stays
 * banked for a later loop's nodes instead of a "+N" that never clears, 2026-10-18). */
export function atlasPassiveSpendable(env, state) {
    const list = atlasPassiveTaken(state), open = [...env.NODES.keys()].filter(id => !list.includes(id) && !atlasPassiveWaits(env, state, id)).length;
    return Math.max(0, Math.min(atlasPassiveAvailable(env, state), open));
}

export function atlasPassiveReason(env, state, id) {
    const node = env.NODES.get(id), list = atlasPassiveTaken(state);
    if (!node) return '없는 패시브입니다.';
    if (list.includes(id)) return '이미 찍은 패시브입니다.';
    if (atlasPassiveWaits(env, state, id)) return env.deps._t('루프 {id}부터 찍을 수 있습니다.', { id: atlasPassiveLoopOf(env, id) });
    if (atlasPassiveAvailable(env, state) < 1) return '아틀라스 포인트가 부족합니다. 노드를 완료하거나 보너스를 달성하세요.';
    return atlasPassiveSupported(node, req => list.includes(req)) ? '' : '이어진 패시브를 먼저 찍으세요.';
}

export function atlasPassiveAllocate(env, state, id) {
    const why = atlasPassiveReason(env, state, id);
    if (!why) atlasPassiveTaken(state).push(id);
    return why;
}

export function atlasPassiveRefundReason(env, state, id) {
    const list = atlasPassiveTaken(state);
    if (!list.includes(id)) return '찍지 않은 패시브입니다.';
    const orphaned = list.some(other => other !== id && env.NODES.get(other).requires.includes(id)
        && !atlasPassiveSupported(env.NODES.get(other), req => req !== id && list.includes(req)));
    return orphaned ? '이 패시브에 이어진 패시브를 먼저 되돌리세요.' : '';
}

export function atlasPassiveRefund(env, state, id) {
    const why = atlasPassiveRefundReason(env, state, id);
    if (!why) state.atlas.passives = atlasPassiveTaken(state).filter(entry => entry !== id);
    return why;
}

export function atlasPassiveStatus(env, state, id) {
    if (atlasPassiveTaken(state).includes(id)) return 'taken';
    if (atlasPassiveWaits(env, state, id)) return 'locked';
    return atlasPassiveSupported(env.NODES.get(id), req => atlasPassiveTaken(state).includes(req)) ? 'open' : 'locked';
}

/** Summed effects of the given passive ids (and extra effect objects, e.g. fragments) — keys from ATLAS_PASSIVES.labels. */
export function atlasPassiveSum(env, ids, extras = []) {
    const total = {};
    for (const effect of [...ids.map(id => env.NODES.get(id).effect), ...extras]) {
        for (const [key, value] of Object.entries(effect)) total[key] = (total[key] || 0) + value;
    }
    return total;
}

export function atlasPassiveEffects(env, state) { return atlasPassiveSum(env, atlasPassiveTaken(state)); }

/** A switch-like effect (e.g. bee events) is on once any taken passive grants it. Safe before the atlas state exists. */
export function atlasPassiveHas(env, state, key) { return !!(state && state.atlas && Array.isArray(state.atlas.passives)) && (atlasPassiveEffects(env, state)[key] || 0) > 0; }

/** Save boundary: known, unique, supported (a keystone may have been kept by its later notable) and within the points. */
export function atlasPassiveNormalize(env, raw, points) {
    const wanted = [...new Set(Array.isArray(raw) ? raw : [])].filter(id => env.NODES.has(id)), list = [];
    for (let grew = true; grew;) {
        grew = false;
        for (const id of wanted) {
            if (list.includes(id) || list.length >= points || !atlasPassiveSupported(env.NODES.get(id), req => list.includes(req))) continue;
            list.push(id);
            grew = true;
        }
    }
    return list;
}
