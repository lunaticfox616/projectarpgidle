

export function leafDefaults() { return { version: 2, seen: [] }; }

export function leafStore(state) { return state.atlas.leaves; }

export function leafValidIds(env, ids) { return [...new Set(ids)].filter(id => env.BY_ID.has(id)); }

export function leafPositiveKeys(raw) { return Object.keys(raw && typeof raw === 'object' ? raw : {})
    .filter(id => Number.isFinite(Number(raw[id])) && Number(raw[id]) > 0); }

/** 구 수량/교환 기록은 폐기하되 실제로 발견했던 잎은 새 저널로 이어진다. 반복 복원해도 같은 결과다. */
export function leafNormalize(env, raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    return { ...leafDefaults(), seen: leafValidIds(env, [...(Array.isArray(src.seen) ? src.seen : []),
        ...leafPositiveKeys(src.counts), ...leafPositiveKeys(src.woven)]) };
}

export function leafSourceMatches(source, zone, enemy) {
    if (source.node) return zone.atlasNode === source.node;
    if (source.treasure) return !!enemy.treasureCarrier;
    if (source.golden) return !!enemy.atlasGolden;
    if (source.boss) return !!enemy.isBoss;
    return !!source.any;
}

export function leafPoolFor(env, state, zone, enemy) {
    const seen = new Set(leafStore(state).seen);
    for (const row of state.actExploration?.groundLoot || []) if (row.kind === 'leaf') seen.add(row.leaf);
    const open = env.deps.MEMORY_LEAVES.list.filter(leaf => !seen.has(leaf.id)
        && (leaf.minTier || 0) <= (Number(zone.atlasTier) || 0) && leafSourceMatches(leaf.source, zone, enemy));
    const special = open.filter(leafIsSpecialLeaf);
    return special.length ? special : open;
}

export function leafRankOf(enemy) { return enemy.isBoss ? 'boss' : enemy.isElite ? 'elite' : 'regular'; }

// 보물 운반자와 황금 배율은 그 몬스터만의 잎(보물, 황금)이 남았을 때만: 다 찾은 뒤에는 일반 잎이 보물 운반자에게서 24%로 나왔다
export function leafSpecialMul(env, enemy) { return enemy.treasureCarrier ? env.deps.MEMORY_LEAVES.treasureMul : enemy.atlasGolden ? env.deps.MEMORY_LEAVES.goldenMul : 1; }

export function leafIsSpecialLeaf(leaf) { return !!(leaf.source.treasure || leaf.source.golden); }

export function leafDropChance(env, enemy, pool) { return env.deps.MEMORY_LEAVES.chance[leafRankOf(enemy)] * (pool.some(leafIsSpecialLeaf) ? leafSpecialMul(env, enemy) : 1); }

export function leafIsAtlasKill(state, zone, enemy) { return !!state.atlas?.unlocked && zone?.type === 'atlasMap' && !!enemy && !enemy.noLoot; }

export function leafRollKill(env, state, zone, enemy, random) {
    if (!leafIsAtlasKill(state, zone, enemy)) return null;
    if (leafStore(state).seen.length === env.deps.MEMORY_LEAVES.list.length) return null;
    const pool = leafPoolFor(env, state, zone, enemy), total = pool.reduce((sum, leaf) => sum + leaf.weight, 0);
    if (random() >= leafDropChance(env, enemy, pool)) return null;
    if (!total) return null;
    let roll = random() * total;
    return (pool.find(leaf => (roll -= leaf.weight) < 0) || pool[pool.length - 1]).id;
}

/** grantJournalBonus의 중복 가드와 능력치 캐시 무효화를 그대로 쓴다. 별도 state는 로드 정산용이다. */
export function* leafReceive(env, state, id) {
    const leaf = env.BY_ID.get(id);
    if (!leaf || leafStore(state).seen.includes(id)) return null;
    leafStore(state).seen.push(id);
    yield { kind: 'unlockLeafJournal', args: [leaf.journal, state] };
    return { id, name: leaf.name, first: true, journal: leaf.journal, bonus: leaf.bonus.label };
}

/** 저장 복원 시 발견 이력과 저널을 양방향으로 맞춘다. 보너스는 기존 로드 재구성에서 한 번만 적용된다. */
export function leafRestoreJournal(env, state, entries) {
    // 손상된 아틀라스(문자열, 숫자)는 아래 아틀라스 정규화가 새로 만든다: 여기서 읽으면 불러오기 전체가 손상 저장으로 막혔다
    if (!state.atlas || typeof state.atlas !== 'object') return;
    // 저널 복원이 아틀라스 정규화보다 먼저 실행된다. 구 수량만 있는 저장도 여기서 발견으로 변환한다.
    state.atlas.leaves = leafNormalize(env, state.atlas.leaves);
    const seen = new Set(state.atlas.leaves.seen);
    for (const leaf of env.deps.MEMORY_LEAVES.list) {
        if (seen.has(leaf.id)) entries.add(leaf.journal);
        if (entries.has(leaf.journal)) seen.add(leaf.id);
    }
    state.atlas.leaves.seen = [...seen];
}

export function leafMomentOf() { return 'great'; }

export function leafBonusText(leaf) { return leaf.bonus.label; }

export function leafSourceText(env, leaf) {
    const source = leaf.source, tier = leaf.minTier ? env.deps._t(', {minTier}등급 이상', { minTier: leaf.minTier }) : '';
    if (source.node) return `${env.deps.atlas.nodes.find(node => node.id === source.node)?.name || source.node}${tier}`;
    if (source.boss) return env.deps._t('지도 보스{tier}', { tier });
    if (source.golden) return env.deps._t('황금 방{tier}', { tier });
    if (source.treasure) return env.deps._t('보물 무리{tier}', { tier });
    return env.deps._t('어느 지도나{tier}', { tier });
}

export function leafGainedBetween(env, before, after) {
    const seen = new Set(before?.seen || []);
    const fresh = (after?.seen || []).filter(id => !seen.has(id) && env.BY_ID.has(id)).map(id => env.BY_ID.get(id).name);
    return { total: fresh.length, fresh };
}
