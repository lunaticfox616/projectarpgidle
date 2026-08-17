function getShrineBlessingIdByLegacyName(name) {
    return Object.keys(SHRINE_BLESSING_DB).find(id => SHRINE_BLESSING_DB[id].name === name) || null;
}

function normalizeShrineBlessingId(rawState) {
    if (SHRINE_BLESSING_DB[rawState.activeId]) return rawState.activeId;
    if (!rawState.active || typeof rawState.active !== 'object') return null;
    let legacyExpiry = Number(rawState.active.expiresAt) || 0;
    if (legacyExpiry > 0 && legacyExpiry <= Date.now()) return null;
    return getShrineBlessingIdByLegacyName(rawState.active.name);
}

function ensureShrineState(targetGame = game) {
    let raw = targetGame.shrineState && typeof targetGame.shrineState === 'object'
        ? targetGame.shrineState
        : {};
    let guaranteedAt = SHRINE_ENCOUNTER_CONFIG.guaranteedAt;
    raw.activeId = normalizeShrineBlessingId(raw);
    raw.pity = Math.max(0, Math.min(guaranteedAt - 1, Math.floor(Number(raw.pity) || 0)));
    raw.spawned = Math.max(0, Math.floor(Number(raw.spawned) || 0));
    raw.claimed = Math.max(0, Math.floor(Number(raw.claimed) || 0));
    delete raw.active;
    delete raw.nextRollAt;
    targetGame.shrineState = raw;
    return raw;
}

function isShrineEligibleZone(zone) {
    return !!zone && SHRINE_ENCOUNTER_CONFIG.eligibleZoneTypes.includes(zone.type);
}

function getActiveShrineBlessing(targetGame = game) {
    let state = ensureShrineState(targetGame);
    return state.activeId ? SHRINE_BLESSING_DB[state.activeId] || null : null;
}

function rollShrineBlessingId() {
    let ids = Object.keys(SHRINE_BLESSING_DB);
    return ids[Math.floor(Math.random() * ids.length)] || ids[0];
}

function advanceShrineAfterEncounter(zone, targetGame = game) {
    let state = ensureShrineState(targetGame);
    if (!isShrineEligibleZone(zone)) return { spawned: false, reason: 'ineligible' };
    if (state.activeId) return { spawned: false, reason: 'pending' };
    let config = SHRINE_ENCOUNTER_CONFIG;
    let chance = Math.min(1, config.baseChance + (state.pity * config.pityChancePerClear));
    let guaranteed = state.pity >= config.guaranteedAt - 1;
    if (!guaranteed && Math.random() >= chance) {
        state.pity = Math.min(config.guaranteedAt - 1, state.pity + 1);
        return { spawned: false, reason: 'miss', chance };
    }
    state.activeId = rollShrineBlessingId();
    state.pity = 0;
    state.spawned++;
    return { spawned: true, blessing: SHRINE_BLESSING_DB[state.activeId] };
}

function claimActiveShrine(targetGame = game, now = Date.now()) {
    let state = ensureShrineState(targetGame);
    let blessing = state.activeId ? SHRINE_BLESSING_DB[state.activeId] || null : null;
    if (!blessing) return { claimed: false, reason: 'missing' };
    targetGame.shrineBuff = {
        id: blessing.id,
        name: blessing.name,
        detail: blessing.detail,
        stat: blessing.stat,
        value: blessing.value,
        expiresAt: now + SHRINE_ENCOUNTER_CONFIG.buffDurationMs
    };
    state.activeId = null;
    state.claimed++;
    return { claimed: true, blessing };
}

const shrineRuntime = Object.freeze({
    ensureState: ensureShrineState,
    isEligibleZone: isShrineEligibleZone,
    getActiveBlessing: getActiveShrineBlessing,
    advanceAfterEncounter: advanceShrineAfterEncounter,
    claimActive: claimActiveShrine
});

safeExposeGlobals({ shrineRuntime });
