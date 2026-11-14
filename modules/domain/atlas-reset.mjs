

/** 새 루프: 지도석 · 각인 · 열린 지도를 비우고, 시대 재생 특전의 시작 보급을 빈 지갑에 넣는다(지갑 초기화 뒤에 불린다). */
export function atlasCoreOnLoopReset(env, state) {
    // 후반부 재료는 루프를 넘어 남으니 끝나지 않은 싸움에 바친 것은 돌려준다(지도석과 입장권은 루프마다 비워진다).
    const run = state.atlas.run;
    if (run && run.map.memory) env.deps.memoryDungeon.refund(state, run.map);
    else if (run && env.deps.atlasEndgame.isFight(run.map.node)) env.deps.atlasEndgame.refund(state, run.map.node);
    Object.assign(state.atlas, { stash: [], fragments: {}, run: null, lastResult: null });
    for (const [key, amount] of env.deps.atlasEpoch.supply(state)) state.currencies[key] = (state.currencies[key] || 0) + amount;
}

export function atlasCoreTravelReason(env, state, id) {
    return id === env.deps.ATLAS.zoneId && !state.atlas.run ? '지도 장치에서 지도석을 열어야 들어갈 수 있습니다.' : '';
}
