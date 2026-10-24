const backgroundBuildMemos = new WeakMap();

/** The values of one equipment object. A stat read that masks disabled slots (combatEquipmentStats.read) swaps state.equipment
 * for the active gear while it reads, so the masked and the real gear each keep their own values. */
function getEquipmentMemoValues(byEquipment, state) {
    const key = state.equipment || state;
    let values = byEquipment.get(key);
    if (!values) byEquipment.set(key, values = new Map());
    return values;
}

// One synchronous screen draw shares the same build memo (withBuildMemoPass): the rune screen recounted the jewel and unique gem
// levels for each of ~140 rune cards, 290 ms a draw (2026-10-25). Nothing edits the build while it draws.
let buildMemoPass = null;
function getBuildMemoPassValues(state) {
    if (!buildMemoPass || buildMemoPass.owner !== state || !state.equipment) return null;
    return getEquipmentMemoValues(buildMemoPass.byEquipment, state);
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
    // Not the equipment reference: the disabled-slot mask swaps it on every stat read, and each swap emptied the memo (an
    // endgame build with one disabled slot settled at about half speed, 2026-10-25). New gear gets its own values instead.
    const revision = [state.loopKills, state.loopDeaths, state.level, state.season, state.maxZoneId,
        state.currentZoneId, state.passives, state.actRewardBonuses?.length, state.journalBonuses?.length];
    let memo = backgroundBuildMemos.get(state);
    if (!memo || revision.some((value, index) => value !== memo.revision[index])) {
        memo = { revision, byEquipment: new WeakMap() };
        backgroundBuildMemos.set(state, memo);
    }
    return getEquipmentMemoValues(memo.byEquipment, state);
}

/** Drops every kept value of a settlement state, the masked gear's too (after a kill or a projected cycle). */
function clearBackgroundBuildMemo(state) {
    backgroundBuildMemos.delete(state);
}
