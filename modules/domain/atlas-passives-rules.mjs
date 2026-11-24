// 아틀라스 패시브의 별 24개(천문도 표 passive, 개편 2026-11-24 B). env: { deps, STARS, NEIGHBOURS, STARTS, MILESTONES, MAX, MAP_IDS, KEYS }.

export function atlasStarTaken(state) { return state.atlas.passives; }

/** 이정표가 세는 수: 첫 완료한 천문도의 일반 지도(보스, 후반 싸움, 기억 싸움과 다시 깬 지도는 세지 않는다). */
export function atlasStarFirstClears(env, state) { return state.atlas.completed.filter(id => env.MAP_IDS.has(id)).length; }

/** 패시브 포인트: 지나온 이정표 하나에 1점, 시대 재생 특전 오래된 수액의 점수를 더하되 최대(18)를 넘지 않는다. */
export function atlasStarPoints(env, state) {
    const clears = atlasStarFirstClears(env, state), reached = env.MILESTONES.filter(need => need <= clears).length;
    return Math.min(env.MAX, reached + env.deps.atlasEpoch.points(state));
}

export function atlasStarAvailable(env, state) { return Math.max(0, atlasStarPoints(env, state) - atlasStarTaken(state).length); }

/** 다음 1점의 이정표(첫 완료 수), 모두 지났으면 null. */
export function atlasStarNextMilestone(env, state) {
    const clears = atlasStarFirstClears(env, state);
    return env.MILESTONES.find(need => need > clears) ?? null;
}

/** 시작 별이거나, 이어진 별 하나가 list에 있다. */
export function atlasStarReachable(env, id, list) { return env.STARTS.has(id) || [...(env.NEIGHBOURS.get(id) || [])].some(other => list.includes(other)); }

/** list의 모든 별이 list 안의 별을 거쳐 할당된 시작 별에 이어져 있는가. */
export function atlasStarConnected(env, list) {
    const seen = new Set(list.filter(id => env.STARTS.has(id))), queue = [...seen];
    while (queue.length) {
        for (const next of env.NEIGHBOURS.get(queue.pop())) {
            if (!list.includes(next) || seen.has(next)) continue;
            seen.add(next);
            queue.push(next);
        }
    }
    return seen.size === new Set(list).size;
}

/** 열린 지도(어떤 싸움이든)가 있는 동안은 별을 바꾸지 않는다. */
export function atlasStarLockedReason(state) { return state.atlas.run ? '열린 탐사를 마치면 변경할 수 있습니다.' : ''; }

/** 할당을 막는 까닭, 할 수 있으면 ''. 이미 할당한 별도 ''(할당은 아무것도 하지 않는다). */
export function atlasStarReason(env, state, id) {
    const locked = atlasStarLockedReason(state), list = atlasStarTaken(state);
    if (locked || list.includes(id)) return locked;
    if (!env.STARS.has(id) || !atlasStarReachable(env, id, list)) return '연결된 별 중 하나를 먼저 할당해야 합니다.';
    return atlasStarAvailable(env, state) < 1 ? '사용 가능한 패시브 포인트가 필요합니다.' : '';
}

export function atlasStarAllocate(env, state, id) {
    const why = atlasStarReason(env, state, id);
    if (!why && !atlasStarTaken(state).includes(id)) atlasStarTaken(state).push(id);
    return why;
}

/** 회수를 막는 까닭: 열린 지도, 남은 별이 시작 별과 끊기는 회수. 할당하지 않은 별은 ''(회수는 아무것도 하지 않는다). */
export function atlasStarRefundReason(env, state, id) {
    const locked = atlasStarLockedReason(state), list = atlasStarTaken(state);
    if (locked || !list.includes(id)) return locked;
    return atlasStarConnected(env, list.filter(other => other !== id)) ? '' : '시작 별과의 연결이 끊기는 별부터 회수해야 합니다.';
}

export function atlasStarRefund(env, state, id) {
    const why = atlasStarRefundReason(env, state, id);
    if (!why) state.atlas.passives = atlasStarTaken(state).filter(other => other !== id);
    return why;
}

/** 'taken' | 'open' | 'locked': 할당함, 이어져 있어 할당할 수 있는 자리, 이어지지 않은 자리(포인트와 열린 지도는 따지지 않는다). */
export function atlasStarStatus(env, state, id) {
    const list = atlasStarTaken(state);
    if (list.includes(id)) return 'taken';
    return atlasStarReachable(env, id, list) ? 'open' : 'locked';
}

/** side 쪽 별의 효과 합(천문도의 그 side 지도에만 닿는다). 키는 별들의 bonuses 키, 없는 효과는 0. side가 null이면 모두 0. */
export function atlasStarTerms(env, state, side) {
    const terms = Object.fromEntries(env.KEYS.map(key => [key, 0]));
    const stars = side && state ? atlasStarTaken(state).map(id => env.STARS.get(id)).filter(star => star.side === side) : [];
    for (const star of stars) for (const [key, value] of Object.entries(star.bonuses)) terms[key] += value;
    return terms;
}

/** 저장 경계: 아는 별만, 한 번씩, 저장된 차례대로 시작 별에 이어지는 것만, 포인트 안에서(그 저장의 완료와 시대 재생 특전으로 센다). */
export function atlasStarNormalize(env, raw, state) {
    const wanted = [...new Set(Array.isArray(raw) ? raw : [])].filter(id => env.STARS.has(id)), budget = atlasStarPoints(env, state), list = [];
    for (let grew = true; grew;) {
        const next = wanted.find(id => !list.includes(id) && list.length < budget && atlasStarReachable(env, id, list));
        grew = next !== undefined;
        if (grew) list.push(next);
    }
    return list;
}

/** A saved open run's frozen star terms: the known keys, finite and bounded (an older run has none: all 0). */
export function atlasStarNormalizeTerms(env, raw) {
    const terms = {};
    for (const key of env.KEYS) {
        const value = Number(raw && raw[key]);
        terms[key] = Number.isFinite(value) ? Math.max(-10, Math.min(1000, value)) : 0;
    }
    return terms;
}
