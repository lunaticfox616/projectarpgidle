

export function allocationGetPassiveApexNodeIds(env) {
    return Object.values(env.deps.PASSIVE_TREE.nodes)
        .filter(node => node.kind === 'apex')
        .map(node => node.id);
}

export function allocationGetPassiveOuterVoidNodes(env) {
    return Object.values(env.deps.PASSIVE_TREE.nodes || {}).filter(node => node.kind === 'void' && node.voidRing === 'outer');
}

/** 성좌 각성: 직업 방향의 공허 소켓 여섯(voidRing 'outer')을 모두 찍으면 영구히 각성한다(2026-11-01 사용자, 초월 조건을 뺐다).
 * 그 소켓이 없는 옛 트리는 별끝 노드 규칙을 쓴다. */
export function allocationGetPassiveConstellationAwakeningProgress(env, owner) {
    const outerVoids = allocationGetPassiveOuterVoidNodes(env);
    const owned = new Set(owner && owner.passives || []);
    if (outerVoids.length === 0) {
        const apexIds = allocationGetPassiveApexNodeIds(env);
        return { mode: 'legacy_apex', required: apexIds.length, completed: apexIds.filter(id => owned.has(id)).length, allocated: 0 };
    }
    const allocated = outerVoids.filter(node => owned.has(node.id));
    return { mode: 'outer_void', required: outerVoids.length, allocated: allocated.length, completed: allocated.length };
}

export function* allocationUnlockPassiveStarEvolution(env, owner, options) {
    options = options || {};
    if (!owner || owner.passiveStarEvolution) return false;
    const progress = allocationGetPassiveConstellationAwakeningProgress(env, owner);
    if (progress.required <= 0 || progress.completed < progress.required) return false;

    owner.passiveStarEvolution = true;
    owner.passiveStarEvolutionSource = progress.mode;
    (yield { kind: 'passiveJournal', args: ['passive_star_evolution', owner] });
    const revealIds = progress.mode === 'outer_void'
        ? allocationGetPassiveOuterVoidNodes(env).map(node => node.id)
        : allocationGetPassiveApexNodeIds(env);
    for (const id of revealIds) (yield { kind: 'passiveReveal', args: [id, {
        forcePulse: !options.silent,
        noBurst: !!options.silent,
        radius: env.deps.PASSIVE_DISCOVERY_RADIUS + 240,
        edgeDepth: 2
    }] });
    owner.noti.char = true;

    if (!options.silent) {
        (yield { kind: 'passiveLog', args: [env.deps._t('✨ 별의 공명이 일어납니다.'), 'loot-rare'] });
        (yield { kind: 'passiveTutorial', args: ['passive_star_evolution', env.deps._t('성좌 각성'), progress.mode === 'outer_void'
                ? '직업 공허 소켓 여섯을 모두 활성화해 성좌가 각성했습니다.\n각성은 영구히 유지됩니다.\n별의 공명으로 피해/생명력/이동 속도가 오릅니다.'
                : '별끝 특수 노드를 모두 활성화해 성좌가 각성했습니다.\n각성은 영구히 유지됩니다.\n별의 공명으로 피해/생명력/이동 속도가 오릅니다.', 'tab-char'] });
    }
    return true;
}
