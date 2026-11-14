

export function atlasEraLedger(state) { return state.atlas.epoch; }

export function atlasEraRank(state, id) { return atlasEraLedger(state).perks[id] || 0; }

export function atlasEraMapNodes(env, state) { return state.atlas.completed.filter(id => (env.deps.atlas.node(id) || {}).kind === 'map').length; }

export function atlasEraReason(env, state) {
    if (state.atlas.seeds < env.deps.ATLAS.seeds.max) return env.deps._t('세계수 씨앗 {max}개가 필요합니다(지금 {seeds}개). 정점을 쓰러뜨리면 하나씩 얻습니다.', { max: env.deps.ATLAS.seeds.max, seeds: state.atlas.seeds });
    return env.deps.atlas.runOpenReason(state);
}

export function atlasEraEssenceFor(env, state) {
    const rule = env.deps.ATLAS.epoch.essence;
    return rule.base + Math.floor(atlasEraMapNodes(env, state) / rule.perCompleted) + Math.floor(state.atlas.bonus.length / rule.perBonus)
        + state.atlas.seeds * rule.perSeed;
}

/** 시대 재생: 진행을 되돌리고 정수를 받는다. 해금 · 자동 지도 · 각인 홈 설정 · 특전은 남는다. @returns {string} '' when done. */
export function atlasEraRebirth(env, state) {
    const why = atlasEraReason(env, state);
    if (why) return why;
    const epoch = atlasEraLedger(state), gained = atlasEraEssenceFor(env, state);
    epoch.count += 1;
    epoch.essence += gained;
    Object.assign(state.atlas, { completed: [], bonus: [], passives: [], seeds: 0, stash: [], fragments: {}, lastResult: null, starterSeason: 0 });
    env.deps.atlasEndgame.reset(state); // 후반부(깨어남 · 처치 · 재료 · 마름 · 목격)도 처음부터
    env.deps.atlas.setLoadout(state, state.atlas.loadout); // the passive slot is gone with the passives
    return '';
}

export function atlasEraCost(env, state, id) { return (atlasEraRank(state, id) + 1) * env.deps.ATLAS.epoch.costStep; }

export function atlasEraBuyReason(env, state, id) {
    const perk = env.PERKS.get(id);
    if (!perk) return '없는 특전입니다.';
    if (atlasEraRank(state, id) >= perk.max) return '이미 가장 높은 단계입니다.';
    return atlasEraLedger(state).essence >= atlasEraCost(env, state, id) ? '' : env.deps._t('세계수 정수가 부족합니다(필요 {state}).', { state: atlasEraCost(env, state, id) });
}

export function atlasEraBuy(env, state, id) {
    const why = atlasEraBuyReason(env, state, id);
    if (why) return why;
    atlasEraLedger(state).essence -= atlasEraCost(env, state, id);
    atlasEraLedger(state).perks[id] = atlasEraRank(state, id) + 1;
    return '';
}

/** Effect objects for the atlas bonus sum (keys shared with the passives): each perk's effect × its rank. */
export function atlasEraEffects(env, state) {
    return env.deps.ATLAS.epoch.perks.filter(perk => perk.effect && atlasEraRank(state, perk.id))
        .map(perk => Object.fromEntries(Object.entries(perk.effect).map(([key, value]) => [key, value * atlasEraRank(state, perk.id)])));
}

export function atlasEraPoints(env, state) { return env.deps.ATLAS.epoch.perks.reduce((sum, perk) => sum + (perk.points || 0) * atlasEraRank(state, perk.id), 0); }

/** 고요한 시대: 방치 효율(data/offline-progress.js)에 더하는 비율. */
export function atlasEraOffline(env, state) { return env.deps.ATLAS.epoch.perks.reduce((sum, perk) => sum + (perk.offline || 0) * atlasEraRank(state, perk.id), 0); }

/** 시작 보급: 새 루프의 빈 지갑에 들어가는 재화. */
export function atlasEraSupply(env, state) {
    const perk = env.PERKS.get('supply'), level = atlasEraRank(state, 'supply');
    return level ? perk.supply.map(([key, amount]) => [key, amount * level]) : [];
}

export function atlasEraNormalize(env, raw) {
    const source = raw && typeof raw === 'object' ? raw : {}, perks = {};
    for (const perk of env.deps.ATLAS.epoch.perks) {
        const value = Math.floor(Number(source.perks && source.perks[perk.id]) || 0);
        if (value > 0) perks[perk.id] = Math.min(perk.max, value);
    }
    const count = value => Math.max(0, Math.min(1e6, Math.floor(Number(value) || 0)));
    return { count: count(source.count), essence: count(source.essence), perks };
}
