const backgroundBuildMemos = new WeakMap();

// One synchronous screen draw shares the same build memo (withBuildMemoPass): the rune screen recounted the jewel and unique gem
// levels for each of ~140 rune cards, 290 ms a draw (2026-10-25). Nothing edits the build while it draws. Values are kept per
// equipment object, so a stat read that masks disabled slots (combatEquipmentStats.read) never shares the unmasked values.
let buildMemoPass = null;
function getBuildMemoPassValues(state) {
    if (!buildMemoPass || buildMemoPass.owner !== state || !state.equipment) return null;
    let values = buildMemoPass.byEquipment.get(state.equipment);
    if (!values) buildMemoPass.byEquipment.set(state.equipment, values = new Map());
    return values;
}
/** Runs draw with the build memo on for game (foreground only; nested calls join the outer pass). @returns what draw returns. */
function withBuildMemoPass(draw) {
    if (buildMemoPass) return draw();
    buildMemoPass = { owner: game, byEquipment: new WeakMap() };
    try { return draw(); } finally { buildMemoPass = null; }
}

function getPersistentBuildSignature(owner, includeInventory = false) {
    const inputs = BUILD_STAT_FIELDS.filter(key => includeInventory || key !== 'inventory').map(key => owner[key]);
    Object.entries(BUILD_STAT_PARTS).forEach(([key, fields]) => inputs.push(fields.map(field => owner[key]?.[field])));
    return JSON.stringify(inputs, (key, value) => ['locked', 'exp', 'xp', 'uniqueBaseLegacy'].includes(key) ? undefined : value);
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
    if (!state.isBackgroundCalculation) return getBuildMemoPassValues(state);
    const revision = [state.loopKills, state.loopDeaths, state.level, state.season, state.maxZoneId,
        state.currentZoneId, state.equipment, state.passives,
        state.actRewardBonuses?.length, state.journalBonuses?.length];
    let memo = backgroundBuildMemos.get(state);
    if (!memo || revision.some((value, index) => value !== memo.revision[index])) {
        memo = { revision, values: new Map() };
        backgroundBuildMemos.set(state, memo);
    }
    return memo.values;
}
