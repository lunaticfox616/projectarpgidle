

/** Experience from level to level + 1. */
export function masteryNeed(env, level) { return Math.round(env.M.curve.base * env.M.curve.growth ** (level - 1)); }

/** reach[L]: total experience at which level L begins (reach[1] = 0) on a curve. */
export function masteryReachTable(env, curve) {
    const reach = [0, 0];
    for (let at = 1; at < env.M.maxLevel; at++) reach.push(reach[at] + Math.round(curve.base * curve.growth ** (at - 1)));
    return reach;
}

export function masteryLevelOn(env, reach, xp) {
    let at = 1;
    while (at < env.M.maxLevel && xp >= reach[at + 1]) at++;
    return at;
}

/** Experience on an earlier curve moved to the current one: the same level, the same share of the way to the next. */
export function masteryUpgradeXp(env, xp, past) {
    const at = masteryLevelOn(env, past, xp);
    if (at >= env.M.maxLevel) return env.CAP;
    const share = (xp - past[at]) / (past[at + 1] - past[at]);
    return Math.round(env.REACH[at] + share * (env.REACH[at + 1] - env.REACH[at]));
}

/** A record kept on an earlier curve (data/weapon-mastery.js pastCurves; a record without v is from the first) keeps its levels;
 * once per save (book.v). */
export function masteryUpgrade(env, book) {
    const past = env.PAST_REACH[book.v] || env.PAST_REACH[1];
    Object.keys(book.xp).forEach(id => {
        const xp = Number(book.xp[id]);
        if (Number.isFinite(xp) && xp > 0) book.xp[id] = masteryUpgradeXp(env, xp, past);
    });
    book.v = env.M.curveVersion;
}

/** The save's record, repaired on read: unknown categories and bad numbers never reach the levels. */
export function masteryLedger(env, state) {
    const book = state.weaponMastery;
    if (!book || typeof book !== 'object' || !book.xp || typeof book.xp !== 'object' || Array.isArray(book.xp)) state.weaponMastery = { xp: {} };
    if (state.weaponMastery.v !== env.M.curveVersion) masteryUpgrade(env, state.weaponMastery);
    return state.weaponMastery;
}

export function masteryXpOf(env, state, id) {
    const value = Number(masteryLedger(env, state).xp[id]);
    return Number.isFinite(value) && value > 0 ? Math.min(env.CAP, value) : 0;
}

export function masteryLevelAt(env, xp) { return masteryLevelOn(env, env.REACH, xp); }

export function masteryLevel(env, state, id) { return masteryLevelAt(env, masteryXpOf(env, state, id)); }

/** {level, xp, into, need}: need 0 at the top level. */
export function masteryProgress(env, state, id) {
    const xp = masteryXpOf(env, state, id), at = masteryLevelAt(env, xp);
    return { level: at, xp, into: xp - env.REACH[at], need: at >= env.M.maxLevel ? 0 : env.REACH[at + 1] - env.REACH[at] };
}

export function masteryTotal(env, state) { return env.IDS.reduce((sum, id) => sum + masteryLevel(env, state, id), 0); }

export function masteryWielded(env, state) { return env.deps.getWeaponCategoryId(state.equipment && state.equipment['무기']); }

export function masteryKillXp(env, enemy) { return enemy && enemy.isBoss ? env.M.killXp.boss : enemy && enemy.isElite ? env.M.killXp.elite : env.M.killXp.normal; }

/** A kill with a weapon in hand. Returns the level reached when it rose, else 0. */
export function* masteryOnKilled(env, state, enemy) {
    const id = masteryWielded(env, state);
    if (!id) return 0;
    const before = masteryLevel(env, state, id);
    masteryLedger(env, state).xp[id] = Math.min(env.CAP, masteryXpOf(env, state, id) + masteryKillXp(env, enemy));
    const after = masteryLevel(env, state, id);
    if (after <= before) return 0;
    yield { kind: 'dispatchRuntimeEvent', args: ['weapon-mastery', { id, level: after, milestone: after % 10 === 0 }] };
    return after;
}

/** The opened milestone lines of a category at a level: [[stat, value], ...] per opened step. */
export function masteryOpened(env, id, at) { return (env.M.milestones[id] || []).slice(0, Math.floor(at / 10)); }

/** The per-level line's value at a level (none at level 1, before any experience). */
export function masteryPerLevel(env, at) { return env.M.perLevel.val * (at - 1); }

/** The wielded category's stat lines ({stat, val}); none without a weapon or experience. */
export function masteryLines(env, state) {
    const id = masteryWielded(env, state);
    if (!id) return [];
    const at = masteryLevel(env, state, id), rows = at > 1 ? [{ stat: env.M.perLevel.stat, val: masteryPerLevel(env, at) }] : [];
    masteryOpened(env, id, at).forEach(step => step.forEach(([stat, val]) => rows.push({ stat, val })));
    return rows;
}

export function masteryApplyStats(env, bucket, state) {
    masteryLines(env, state).forEach(line => env.deps.addStatToBucket(bucket, line.stat, line.val));
}

/** Efficiency the six levels' total adds to offline progress. */
export function masteryOffline(env, state) { return env.M.totalSteps.filter(step => masteryTotal(env, state) >= step).length * env.M.offlinePerStep; }

/** Levels gained per category between two states (the settlement result). */
export function masteryGains(env, before, after) {
    return env.IDS.map(id => ({ id, from: masteryLevel(env, before, id), to: masteryLevel(env, after, id) })).filter(row => row.to > row.from);
}
