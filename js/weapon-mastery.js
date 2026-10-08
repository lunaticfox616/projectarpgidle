// 무기 숙련(data/weapon-mastery.js): 들고 있는 무기 대분류가 처치마다 경험치를 얻고, 레벨과 10단위 특전이 그 무기를 들었을 때의 능력치가
// 된다. 상태는 game.weaponMastery {xp: {대분류: 누적 경험치}}로 루프를 넘어 남는다(js/combat.js triggerSeasonReset은 건드리지 않는다).
// 처치 기록은 js/combat.js recordKillProgress, 능력치는 getPlayerStats의 계정 보상 묶음(applyAccountRewardStats), 화면은
// js/weapon-mastery-ui.js.
const weaponMastery = (() => {
    const M = WEAPON_MASTERY;
    const IDS = Object.freeze(Object.keys(WEAPON_CATEGORIES));
    /** Experience from level to level + 1. */
    const need = level => Math.round(M.curve.base * M.curve.growth ** (level - 1));
    // REACH[L]: total experience at which level L begins (REACH[1] = 0).
    const REACH = [0, 0];
    for (let level = 1; level < M.maxLevel; level++) REACH.push(REACH[level] + need(level));
    const CAP = REACH[M.maxLevel];

    /** The save's record, repaired on read: unknown categories and bad numbers never reach the levels. */
    function ledger(state) {
        const book = state.weaponMastery;
        if (!book || typeof book !== 'object' || !book.xp || typeof book.xp !== 'object' || Array.isArray(book.xp)) state.weaponMastery = { xp: {} };
        return state.weaponMastery;
    }
    function xpOf(state, id) {
        const value = Number(ledger(state).xp[id]);
        return Number.isFinite(value) && value > 0 ? Math.min(CAP, value) : 0;
    }
    function levelAt(xp) {
        let level = 1;
        while (level < M.maxLevel && xp >= REACH[level + 1]) level++;
        return level;
    }
    const level = (state, id) => levelAt(xpOf(state, id));
    /** {level, xp, into, need}: need 0 at the top level. */
    function progress(state, id) {
        const xp = xpOf(state, id), at = levelAt(xp);
        return { level: at, xp, into: xp - REACH[at], need: at >= M.maxLevel ? 0 : REACH[at + 1] - REACH[at] };
    }
    const total = state => IDS.reduce((sum, id) => sum + level(state, id), 0);
    const wielded = state => getWeaponCategoryId(state.equipment && state.equipment['무기']);
    const killXp = enemy => (enemy && enemy.isBoss ? M.killXp.boss : enemy && enemy.isElite ? M.killXp.elite : M.killXp.normal);

    /** A kill with a weapon in hand. Returns the level reached when it rose, else 0. */
    function onKilled(state, enemy) {
        const id = wielded(state);
        if (!id) return 0;
        const before = level(state, id);
        ledger(state).xp[id] = Math.min(CAP, xpOf(state, id) + killXp(enemy));
        const after = level(state, id);
        if (after <= before) return 0;
        dispatchRuntimeEvent('weapon-mastery', { id, level: after, milestone: after % 10 === 0 });
        return after;
    }
    /** The opened milestone lines of a category at a level: [[stat, value], ...] per opened step. */
    const opened = (id, at) => (M.milestones[id] || []).slice(0, Math.floor(at / 10));
    /** The per-level line's value at a level (none at level 1, before any experience). */
    const perLevel = at => M.perLevel.val * (at - 1);
    /** The wielded category's stat lines ({stat, val}); none without a weapon or experience. */
    function lines(state) {
        const id = wielded(state);
        if (!id) return [];
        const at = level(state, id), rows = at > 1 ? [{ stat: M.perLevel.stat, val: perLevel(at) }] : [];
        opened(id, at).forEach(step => step.forEach(([stat, val]) => rows.push({ stat, val })));
        return rows;
    }
    function applyStats(bucket, state) {
        lines(state).forEach(line => addStatToBucket(bucket, line.stat, line.val));
    }
    /** Efficiency the six levels' total adds to offline progress. */
    const offline = state => M.totalSteps.filter(step => total(state) >= step).length * M.offlinePerStep;
    /** Levels gained per category between two states (the settlement result). */
    function gains(before, after) {
        return IDS.map(id => ({ id, from: level(before, id), to: level(after, id) })).filter(row => row.to > row.from);
    }
    return Object.freeze({ ids: IDS, need, reach: level => REACH[level], level, progress, total, wielded, onKilled, opened, perLevel, lines,
        applyStats, offline, gains });
})();
safeExposeGlobals({ weaponMastery });
