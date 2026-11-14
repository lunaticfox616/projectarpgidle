/** Temporary handlers for callers that run before their owner scripts.
 * Remove each fallback with its last pre-owner caller; real exports replace the marked functions.
 * These never become the authoritative combat or presentation implementation. */
export function installStartupFallbacks(bridge, deps) {
    const target = bridge.target;
    bridge.install('getPlayerStats', fallbackStats);
    bridge.install('getSkillTargets', () => []);
    if (typeof target.ENEMY_CROWD_PAUSE_LIMIT === 'undefined') target.ENEMY_CROWD_PAUSE_LIMIT = 20;
    bridge.install('isCrowdProgressPaused', () => false);
    bridge.install('isDamageAilmentType', type => type === 'ignite' || type === 'poison' || type === 'bleed');
    bridge.install('getStoredAilmentHitDamage', storedHitDamage);
    bridge.install('getDamageAilmentBaseDpsFromHit', ailmentBaseDps);
    bridge.install('getEnemyDamageAilmentDps', (ail, stats) => enemyAilmentDps(target, ail, stats));
    bridge.install('getPlayerDamageAilmentDps', (ail, stats) => playerAilmentDps(target, ail, stats));
    installStartupActions(bridge, deps);
    bridge.install('getGemPresentation', (name, support) => gemPresentation(deps, name, support));
}

function fallbackStats() {
    return {
        maxHp: 1, energyShield: 0, baseDmg: 0, directDps: 0, dps: 0, totalDps: 0, summonDps: 0,
        aspd: 1, crit: 0, critDmg: 150, move: 100, moveSpeed: 100, dr: 0, armor: 0, evasion: 0,
        resF: 0, resC: 0, resL: 0, resChaos: 0, regen: 0, regenSuppress: 0, leech: 0, ds: 0,
        igniteChance: 0, chillChance: 0, freezeChance: 0, shockChance: 0, poisonChance: 0, bleedChance: 0,
        blockChance: 0, blockChanceMax: 50, deflectChance: 0, deflectDamageReduce: 0,
        suppCap: 0, summonCap: 1, runeResonancePower: 0, uniqueResonanceFloor: 0, inquisitorResonanceBonus: 0,
        breakdowns: {}, __uiFallbackStats: true
    };
}

function storedHitDamage(ail) {
    return ail ? Math.max(0, Number(ail.sourceHitDamage || ail.hitDamage || 0) || 0) : 0;
}

function ailmentBaseDps(hitDamage, _power, scale, critDotBonusPct, critDotBonusScale) {
    const source = Math.max(0, Number(hitDamage) || 0);
    if (source <= 0) return 0;
    const baseScale = Math.max(0.01, Number(scale) || 1);
    const bonusPct = Math.max(0, Number(critDotBonusPct) || 0);
    const bonusScale = Math.max(0.01, Number(critDotBonusScale) || 1);
    return Math.max(1, Math.floor(source * 0.90 * (baseScale + (bonusPct / 100) * bonusScale)));
}

function enemyAilmentDps(target, ail, stats) {
    const scale = Math.max(0.01, (stats && Number.isFinite(stats.dotDamageScale)) ? stats.dotDamageScale : 1);
    const dps = target.getDamageAilmentBaseDpsFromHit(target.getStoredAilmentHitDamage(ail),
        ail ? ail.power : 0, scale, ail ? ail.critDotBonusPct : 0, stats ? stats.dotCritBonusScale : 1);
    return applyEnemyAilmentBonus(dps, ail, stats);
}

function applyEnemyAilmentBonus(dps, ail, stats) {
    if (ail && ail.type === 'ignite') return Math.floor(dps * (1 + Math.max(0, Number(stats && stats.igniteDamageMultiplierPct) || 0) / 100));
    if (ail && ail.type === 'poison') return Math.floor(dps * (1 + Math.max(0, Number(stats && stats.poisonDamageMultiplierPct) || 0) / 100));
    return dps;
}

function playerAilmentDps(target, ail, stats) {
    let source = target.getStoredAilmentHitDamage(ail);
    if (source <= 0 && stats && stats.maxHp) source = Math.max(1, Math.floor((stats.maxHp || 1) * 0.08));
    return target.getDamageAilmentBaseDpsFromHit(source, ail ? ail.power : 0, 1, ail ? ail.critDotBonusPct : 0, stats ? stats.dotCritBonusScale : 1);
}

function installStartupActions(bridge, deps) {
    bridge.install('startEncounterRun', () => {
        const state = deps.game;
        if (!state) return;
        state.encounterPlan = Array.isArray(state.encounterPlan) ? state.encounterPlan : [];
        state.encounterIndex = Math.max(0, Math.floor(state.encounterIndex || 0));
    }, { queue: true });
    bridge.install('coreLoop', () => undefined);
    bridge.install('updateStaticUI', () => undefined, { queue: true });
    bridge.install('startMoving', () => {
        const state = deps.game;
        if (!state) return;
        state.combatHalted = false;
        state.isTownReturning = false;
        state.moveTimer = Math.max(0, Number(state.moveTimer) || 0);
        state.moveTotalTime = Math.max(0, Number(state.moveTotalTime) || 0);
    }, { queue: true });
    bridge.install('returnToTown', () => {
        const state = deps.game;
        if (!state) return;
        state.isTownReturning = false;
        state.combatHalted = true;
        state.enemies = [];
    }, { queue: true });
    // The real handlers consume pendingLoopDecision/pendingLoopReady. Keep flags intact until replay.
    for (const name of ['triggerSeasonReset', 'chooseLoopAdvance', 'confirmLoopReady', 'enterOutsideChaos']) {
        bridge.install(name, () => undefined, { queue: true });
    }
}

function gemLevel(deps, name, isSupport) {
    try {
        const state = deps.game;
        const store = (state && (isSupport ? state.supportGemData : state.gemData)) || {};
        return Math.max(1, Math.floor((store[name] && store[name].level) || 1));
    } catch (error) {
        deps.logger.error('gem presentation fallback state read failed:', error);
        return 1;
    }
}

function gemPresentation(deps, name, isSupport) {
    const catalog = isSupport ? deps.supports : deps.skills;
    const db = (catalog && catalog[name]) || {}, level = gemLevel(deps, name, isSupport);
    if (isSupport) return supportGemPresentation(db, name, level);
    const displayedLevel = db.isGem || db.levelable ? level : 0;
    return {
        baseLevel: displayedLevel, totalLevel: displayedLevel, finalLevel: displayedLevel,
        desc: db.desc || '', statName: name, skill: db, tags: deps.getSkillTagList(db)
    };
}

function supportGemPresentation(db, name, level) {
    return {
        baseLevel: level, totalLevel: level, value: Number(db.baseVal || 0), desc: db.desc || '',
        statName: db.name || name, statId: db.stat || null, activeTier: 1
    };
}
