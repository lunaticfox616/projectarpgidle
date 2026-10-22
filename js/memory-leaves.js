/** 기억의 잎은 최초 발견형 저널이다. 보유 수량/교환은 없고 발견만 루프를 넘어 남는다.
 * 실제 획득과 저장 복원 모두 기존 저널 보너스 경로를 사용한다. 읽기는 보상을 주지 않는다. */
const memoryLeaves = (() => {
    const BY_ID = new Map(MEMORY_LEAVES.list.map(leaf => [leaf.id, leaf]));
    const defaults = () => ({ version: 2, seen: [] });
    const store = state => state.atlas.leaves;
    const validIds = ids => [...new Set(ids)].filter(id => BY_ID.has(id));
    const positiveKeys = raw => Object.keys(raw && typeof raw === 'object' ? raw : {})
        .filter(id => Number.isFinite(Number(raw[id])) && Number(raw[id]) > 0);

    /** 구 수량/교환 기록은 폐기하되 실제로 발견했던 잎은 새 저널로 이어진다. 반복 복원해도 같은 결과다. */
    function normalize(raw) {
        const src = raw && typeof raw === 'object' ? raw : {};
        return { ...defaults(), seen: validIds([...(Array.isArray(src.seen) ? src.seen : []),
            ...positiveKeys(src.counts), ...positiveKeys(src.woven)]) };
    }
    function sourceMatches(source, zone, enemy) {
        if (source.node) return zone.atlasNode === source.node;
        if (source.treasure) return !!enemy.treasureCarrier;
        if (source.golden) return !!enemy.atlasGolden;
        if (source.boss) return !!enemy.isBoss;
        return !!source.any;
    }
    function poolFor(state, zone, enemy) {
        const seen = new Set(store(state).seen);
        for (const row of state.actExploration?.groundLoot || []) if (row.kind === 'leaf') seen.add(row.leaf);
        const open = MEMORY_LEAVES.list.filter(leaf => !seen.has(leaf.id)
            && (leaf.minTier || 0) <= (Number(zone.atlasTier) || 0) && sourceMatches(leaf.source, zone, enemy));
        const special = open.filter(isSpecialLeaf);
        return special.length ? special : open;
    }
    const rankOf = enemy => (enemy.isBoss ? 'boss' : enemy.isElite ? 'elite' : 'regular');
    // 보물 운반자와 황금 배율은 그 몬스터만의 잎(보물, 황금)이 남았을 때만: 다 찾은 뒤에는 일반 잎이 보물 운반자에게서 24%로 나왔다
    const specialMul = enemy => (enemy.treasureCarrier ? MEMORY_LEAVES.treasureMul : enemy.atlasGolden ? MEMORY_LEAVES.goldenMul : 1);
    const isSpecialLeaf = leaf => !!(leaf.source.treasure || leaf.source.golden);
    const dropChance = (enemy, pool) => MEMORY_LEAVES.chance[rankOf(enemy)] * (pool.some(isSpecialLeaf) ? specialMul(enemy) : 1);
    const isAtlasKill = (state, zone, enemy) => !!state.atlas?.unlocked && zone?.type === 'atlasMap' && !!enemy && !enemy.noLoot;
    function rollKill(state, zone, enemy, random) {
        if (!isAtlasKill(state, zone, enemy)) return null;
        if (store(state).seen.length === MEMORY_LEAVES.list.length) return null;
        const pool = poolFor(state, zone, enemy), total = pool.reduce((sum, leaf) => sum + leaf.weight, 0);
        if (random() >= dropChance(enemy, pool)) return null;
        if (!total) return null;
        let roll = random() * total;
        return (pool.find(leaf => (roll -= leaf.weight) < 0) || pool[pool.length - 1]).id;
    }
    /** grantJournalBonus의 중복 가드와 능력치 캐시 무효화를 그대로 쓴다. 별도 state는 로드 정산용이다. */
    function receive(state, id) {
        const leaf = BY_ID.get(id);
        if (!leaf || store(state).seen.includes(id)) return null;
        store(state).seen.push(id);
        unlockJournalEntry(leaf.journal, state);
        return { id, name: leaf.name, first: true, journal: leaf.journal, bonus: leaf.bonus.label };
    }
    /** 저장 복원 시 발견 이력과 저널을 양방향으로 맞춘다. 보너스는 기존 로드 재구성에서 한 번만 적용된다. */
    function restoreJournal(state, entries) {
        // 손상된 아틀라스(문자열, 숫자)는 아래 아틀라스 정규화가 새로 만든다: 여기서 읽으면 불러오기 전체가 손상 저장으로 막혔다
        if (!state.atlas || typeof state.atlas !== 'object') return;
        // 저널 복원이 아틀라스 정규화보다 먼저 실행된다. 구 수량만 있는 저장도 여기서 발견으로 변환한다.
        state.atlas.leaves = normalize(state.atlas.leaves);
        const seen = new Set(state.atlas.leaves.seen);
        for (const leaf of MEMORY_LEAVES.list) {
            if (seen.has(leaf.id)) entries.add(leaf.journal);
            if (entries.has(leaf.journal)) seen.add(leaf.id);
        }
        state.atlas.leaves.seen = [...seen];
    }
    const momentOf = () => 'great';
    const bonusText = leaf => leaf.bonus.label;
    function sourceText(leaf) {
        const source = leaf.source, tier = leaf.minTier ? `, ${leaf.minTier}등급 이상` : '';
        if (source.node) return `${atlas.nodes.find(node => node.id === source.node)?.name || source.node}${tier}`;
        if (source.boss) return `지도 보스${tier}`;
        if (source.golden) return `황금 방${tier}`;
        if (source.treasure) return `보물 무리${tier}`;
        return `어느 지도나${tier}`;
    }
    function gainedBetween(before, after) {
        const seen = new Set(before?.seen || []);
        const fresh = (after?.seen || []).filter(id => !seen.has(id) && BY_ID.has(id)).map(id => BY_ID.get(id).name);
        return { total: fresh.length, fresh };
    }
    return Object.freeze({ defaults, normalize, rollKill, receive, momentOf, bonusText, sourceText, gainedBetween, restoreJournal,
        leaf: id => BY_ID.get(id) || null, validId: id => BY_ID.has(id), list: MEMORY_LEAVES.list });
})();
safeExposeGlobals({ memoryLeaves });
