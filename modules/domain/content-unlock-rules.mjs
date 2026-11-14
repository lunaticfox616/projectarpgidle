

/** How an unlock opens: 'paid' with 해금 points in the unlock tab, 'auto' by itself once its conditions are met.
 * 2026-11-02 사용자: NPC에게서 무료로 받는 해금은 없앴다. */
export function contentKind(def) {
    return def.cost > 0 ? 'paid' : 'auto';
}

/** What must be open first: the row it grows from (after), then any other prerequisite (requires). */
export function contentParents(def) {
    return [...new Set([def.after, ...(def.requires || [])].filter(Boolean))];
}

export function contentRequirements(env, id, owner) {
    const def = env.definitions.get(id);
    if (!def) return [];
    const rows = [[env.deps._t('루프 {minLoop}', { minLoop: def.minLoop }), owner.season >= def.minLoop]];
    for (const key of contentParents(def)) rows.push([env.deps._t('{name} 해금', { name: env.deps._t(env.definitions.get(key).name) }), contentIsUnlocked(env, key, owner)]);
    if (def.progress) rows.push(...env.progressChecks[def.progress](owner));
    return rows.map(([label, met, route]) => ({ label, met: !!met, route }));
}

export function contentMeetsUsageGate(def, owner) {
    // 해금 루프를 늦춘 콘텐츠(def.hardMinLoop, 뜨개질 2026-10-22): 저장에 남은 구매·상속·자동·레거시 기록이 있어도 그 루프 전에는 닫는다.
    // 기록은 지우지 않으므로 루프가 닿으면 그대로 다시 열린다.
    if (def.hardMinLoop && !(owner.season >= def.minLoop)) return false;
    if (def.id !== 'battleTrials') return true;
    const state = owner.contentProgression;
    return owner.season >= def.minLoop && !!state
        && (state.unlocked.includes('trials') || state.inherited.includes('trials'));
}

export function contentIsUnlocked(env, id, owner) {
    const def = env.definitions.get(id);
    if (!def || !contentMeetsUsageGate(def, owner)) return false;
    const state = owner.contentProgression;
    if (!state) return true;
    if (state.unlocked.includes(id) || state.inherited.includes(id)) return true;
    if (contentKind(def) !== 'auto') return false;
    if (state.automatic.includes(id)) return true;
    return contentAutomaticAccess(env, def, owner);
}

export function contentAutomaticAccess(env, def, owner) {
    if (!contentOwnConditionsMet(env, def, owner)) return false;
    // 자동 콘텐츠도 나무를 따른다(앞 해금이 열려야 열린다). 트리 전의 저장(looseContent)은 그때처럼 앞 해금을 따지지 않는다.
    return !!owner.contentProgression.looseContent || contentEarlierRowsOpen(env, def, owner);
}

export function contentOwnConditionsMet(env, def, owner) { return owner.season >= def.minLoop && (!def.progress || env.progressChecks[def.progress](owner).every(row => row[1])); }

/** Whether every row before this one is open: walked up the tree, so a chain of automatic rows reads as one. */
export function contentEarlierRowsOpen(env, def, owner) {
    const state = owner.contentProgression, waiting = contentParents(def);
    while (waiting.length) {
        const row = env.definitions.get(waiting.pop());
        if (!contentMeetsUsageGate(row, owner)) return false;
        if (state.unlocked.includes(row.id) || state.inherited.includes(row.id) || state.automatic.includes(row.id)) continue;
        if (contentKind(row) !== 'auto' || !contentOwnConditionsMet(env, row, owner)) return false;
        waiting.push(...contentParents(row));
    }
    return true;
}

/** 나무에 새로 오른 줄(def.since)을 쓰는 코드의 읽기. 그루터기 함과 아틀라스는 불러오는 중에(장부 복원 전에) 이것을 읽어 봉인 칸, 품질, 접붙이기 단계를 깎으므로
 * 적힌 기록을 그대로 본다: 트리 전의 기록이나 장부 없는 상태는 그때 규칙대로 루프만 보고(복원하면 그 줄을 물려받는다), 그 뒤의 기록은 산 줄과 물려받은 줄을 본다.
 * loop: 잴 루프를 부르는 쪽이 정할 때(아틀라스 방 굴림). */
export function contentHolds(env, id, owner, loop = null) {
    const def = env.definitions.get(id);
    if (!def) return false;
    return contentIsTreeRecord(env, owner?.contentProgression) ? contentHeldInRecord(owner.contentProgression, id) : contentReachedLoop(owner, loop) >= (def.formerLoop || def.minLoop);
}

export function contentIsTreeRecord(env, state) { return !!state && Number(state.version) >= env.LEDGER_VERSION; }

export function contentHeldInRecord(state, id) { return [state.unlocked, state.inherited].some(list => Array.isArray(list) && list.includes(id)); }

export function contentReachedLoop(owner, loop) { return loop === null ? Math.max(Number(owner?.season) || 1, Number(owner?.contentProgression?.highestLoop) || 1) : loop; }

/** How many steps of a 강화 series (data/content-progression.js CONTENT_UNLOCK_SERIES) the ledger holds: bought or inherited.
 * It reads the record as it is, so it also counts a saved one before the load restores it, and no record counts none. */
export function contentRank(env, series, owner) {
    const state = owner.contentProgression;
    if (!state) return 0;
    const owned = new Set([...(Array.isArray(state.unlocked) ? state.unlocked : []), ...(Array.isArray(state.inherited) ? state.inherited : [])]);
    return env.deps.CONTENT_UNLOCK_CATALOG.filter(def => def.series === series && owned.has(def.id)).length;
}

/** Natural loot only: discovery prerequisites and shared combat keys must not depend on paid growth. */
export function contentCanDropCurrency(env, key, owner) {
    const unlocks = env.deps.ORB_DB[env.deps.getCanonicalCurrencyKey(key)]?.dropUnlocks;
    return !unlocks || unlocks.some(id => contentIsUnlocked(env, id, owner));
}

/** Content-specific equipment becomes eligible only after its source content is open. */
export function contentCanDropUnique(env, unique, owner) { return !!unique && (!unique.contentUnlock || contentIsUnlocked(env, unique.contentUnlock, owner)); }

export function contentCanOpenMap(owner) {
    return owner.season >= 2 || owner.maxZoneId >= 1 || owner.unlocks.map || owner.contentProgression.legacy === true;
}

/** Whether owner has met an NPC on the maps (meeting turns unlocks.npcs on): the NPC section of 거래 shows them. */
export function contentNpcsMet(owner) { return !!(owner.unlocks && owner.unlocks.npcs) || Object.keys(owner.npcMet || {}).length > 0; }

export function contentCanOpen(env, route, owner) {
    if (!env.opening.canOpen(owner, route)) return false;
    if (!owner.contentProgression || !route || env.coreRoutes.has(route)) return true;
    if (env.progressRoutes[route]) return env.progressRoutes[route](owner);
    const feature = env.routes.get(route);
    return !!feature && contentIsUnlocked(env, feature, owner);
}
