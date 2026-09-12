const backgroundBuildMemos = new WeakMap();

function getPersistentBuildSignature(owner, includeInventory = false) {
    const inputs = BUILD_STAT_FIELDS.filter(key => includeInventory || key !== 'inventory').map(key => owner[key]);
    Object.entries(BUILD_STAT_PARTS).forEach(([key, fields]) => inputs.push(fields.map(field => owner[key]?.[field])));
    inputs.push((owner.flasks?.utils || []).map(flask => flask && flask.key));
    return JSON.stringify(inputs, (key, value) => ['locked', 'exp', 'xp'].includes(key) ? undefined : value);
}

/**
 * Replay owns an isolated snapshot: equipment/board/passive selections cannot be edited between
 * kills, level-ups, defeats and map transitions. Only static build inputs are cached.
 * Reward-list growth also invalidates during a kill's reward processing. Weak keys
 * prevent retention after settlement; foreground evaluations always read fresh inputs.
 * @param {typeof defaultGame} state
 * @returns {Map<string, unknown>|null}
 */
function getBackgroundBuildMemo(state) {
    if (!state.isBackgroundCalculation) return null;
    const revision = [state.loopKills, state.loopDeaths, state.level, state.season, state.maxZoneId,
        state.currentZoneId, state.equipment, state.growthBoard, state.passives, state.arcana,
        state.actRewardBonuses?.length, state.journalBonuses?.length];
    let memo = backgroundBuildMemos.get(state);
    if (!memo || revision.some((value, index) => value !== memo.revision[index])) {
        memo = { revision, values: new Map() };
        backgroundBuildMemos.set(state, memo);
    }
    return memo.values;
}
