export function getDefaultUiPlayerStats() {
    return {
        maxHp: 1, energyShield: 0, baseDmg: 0, directDps: 0, dps: 0, totalDps: 0, summonDps: 0,
        aspd: 1, crit: 0, critDmg: 150, move: 100, moveSpeed: 100, dr: 0, armor: 0, evasion: 0,
        resF: 0, rawResF: 0, resC: 0, rawResC: 0, resL: 0, rawResL: 0, resChaos: 0, rawResChaos: 0, regen: 0, regenSuppress: 0, leech: 0, ds: 0,
        igniteChance: 0, chillChance: 0, freezeChance: 0, poisonChance: 0, bleedChance: 0,
        blockChance: 0, blockChanceMax: 50, deflectChance: 0, deflectDamageReduce: 0,
        suppCap: 0, summonCap: 1, mystique: 0, devotion: 0, cycle: 0,
        passiveFanaticismStacks: 0, passiveRevelationCombatDamageMorePct: 0,
        passiveRevelationGuardTakenLessPct: 0, passiveRevelationLifeBonusPct: 0,
        runeResonancePower: 0, uniqueResonanceFloor: 0, inquisitorResonanceBonus: 0, breakdowns: {}
    };
}

/** Reuse the numeric defaults; normalization still creates a fresh breakdowns object. */
export function uiPlayerStatDefaultTable(runtime) {
    if (!runtime.state.uiPlayerStatDefaults) {
        runtime.state.uiPlayerStatDefaults = runtime.handlers.getDefaultUiPlayerStats();
        delete runtime.state.uiPlayerStatDefaults.breakdowns; // each normalized table gets its own breakdowns object below
    }
    return runtime.state.uiPlayerStatDefaults;
}

/** Every numeric default's key holds a finite number afterwards; a kept number is left as it is. */
export function coerceUiPlayerStatNumbers(normalized, defaults) {
    for (const key in defaults) {
        if (key === 'breakdowns') continue;
        let value = normalized[key];
        if (typeof value === 'number' && Number.isFinite(value)) continue;
        value = Number(value);
        normalized[key] = Number.isFinite(value) ? value : defaults[key];
    }
}

export function normalizeUiPlayerStats(runtime, stats, fallback = {}) {
    let fromFallback = !!((stats && stats.__uiFallbackStats) || (fallback && fallback.__uiFallbackStats));
    let numericDefaults = runtime.handlers.uiPlayerStatDefaultTable();
    let normalized = Object.assign({}, numericDefaults, fallback || {}, (stats && typeof stats === 'object') ? stats : {});
    if (fromFallback) normalized.__uiFallbackStats = true;
    runtime.handlers.coerceUiPlayerStatNumbers(normalized, numericDefaults);
    constrainUiPlayerStats(normalized);
    return normalized;
}

function constrainUiPlayerStats(normalized) {
    normalized.maxHp = Math.max(1, Number(normalized.maxHp) || 1);
    normalized.aspd = Math.max(0.01, Number(normalized.aspd) || 1);
    normalized.move = Math.max(0, Number(normalized.move) || 100);
    normalized.moveSpeed = Math.max(0, Number(normalized.moveSpeed) || 100);
    normalized.critDmg = Number.isFinite(Number(normalized.critDmg)) ? Number(normalized.critDmg) : 150;
    normalized.breakdowns = (normalized.breakdowns && typeof normalized.breakdowns === 'object') ? normalized.breakdowns : {};
}

export function getUiGlobalFunction(runtime, name) {
    // Only the declared domain providers are reachable through the transitional public API.
    let provider = runtime.deps.providers[name];
    if (typeof provider !== 'function' || provider.__placeholderGlobal === true) return null;
    return provider;
}

export function callUiProvider(runtime, name, provider, args = []) {
    try {
        return provider.apply(null, args);
    } catch (error) {
        runtime.deps.console.error(`${name} failed:`, error);
        throw error;
    }
}

export function getUiPlayerStats(runtime, fallback = {}, includeBreakdowns) {
    let provider = runtime.handlers.getUiGlobalFunction('getPlayerStats');
    if (provider) return runtime.handlers.normalizeUiPlayerStats(runtime.handlers.callUiProvider('getPlayerStats', provider, [includeBreakdowns]), fallback);
    if (runtime.state.cachedTooltipStats && runtime.state.cachedTooltipStats.__uiFallbackStats !== true) return runtime.handlers.normalizeUiPlayerStats(runtime.state.cachedTooltipStats, fallback);
    return runtime.handlers.normalizeUiPlayerStats(Object.assign({}, fallback || {}, { __uiFallbackStats: true }), fallback);
}

export function isUiDamageAilmentType(runtime, type) {
    let provider = runtime.handlers.getUiGlobalFunction('isDamageAilmentType');
    if (provider) return !!runtime.handlers.callUiProvider('isDamageAilmentType', provider, [type]);
    return type === 'ignite' || type === 'poison' || type === 'bleed';
}

export function getUiStoredAilmentHitDamage(runtime, ail) {
    let provider = runtime.handlers.getUiGlobalFunction('getStoredAilmentHitDamage');
    if (provider) return Math.max(0, Number(runtime.handlers.callUiProvider('getStoredAilmentHitDamage', provider, [ail])) || 0);
    return Math.max(0, Number((ail && (ail.sourceHitDamage || ail.hitDamage)) || 0) || 0);
}

export function getUiPlayerDamageAilmentDps(runtime, ail, stats) {
    let provider = runtime.handlers.getUiGlobalFunction('getPlayerDamageAilmentDps');
    if (provider) return Math.max(0, Math.floor(Number(runtime.handlers.callUiProvider('getPlayerDamageAilmentDps', provider, [ail, stats])) || 0));
    let source = runtime.handlers.getUiStoredAilmentHitDamage(ail);
    if (source <= 0 && stats && stats.maxHp) source = Math.max(1, Math.floor((stats.maxHp || 1) * 0.08));
    return Math.max(0, Math.floor(source * 0.9));
}

export function getUiEnemyDamageAilmentDps(runtime, ail, stats) {
    let provider = runtime.handlers.getUiGlobalFunction('getEnemyDamageAilmentDps');
    if (provider) return Math.max(0, Math.floor(Number(runtime.handlers.callUiProvider('getEnemyDamageAilmentDps', provider, [ail, stats])) || 0));
    return Math.max(0, Math.floor(runtime.handlers.getUiStoredAilmentHitDamage(ail) * 0.9));
}

export function getUiPlayerShockTakenDamageIncreasePct(runtime, power, stats) {
    let provider = runtime.handlers.getUiGlobalFunction('getPlayerShockTakenDamageIncreasePct');
    if (provider) return Number(runtime.handlers.callUiProvider('getPlayerShockTakenDamageIncreasePct', provider, [stats || {}, power])) || 0;
    let reduction = Math.max(0, Math.min(0.95, Number(stats && stats.shockEffectReducePct || 0) / 100));
    let value = 22 * (1 - reduction);
    return (stats && stats.uniqueShockInvertTaken) ? -value : value;
}

export function getUiEnemyShockTakenDamageIncreasePct(runtime, power, stats) {
    let provider = runtime.handlers.getUiGlobalFunction('getEnemyShockTakenDamageIncreasePct');
    if (provider) return Math.max(0, Number(runtime.handlers.callUiProvider('getEnemyShockTakenDamageIncreasePct', provider, [{ type: 'shock', time: 1, power }, stats || {}])) || 0);
    let base = Math.min(35, 8 + Math.max(0, Number(power || 0)) * 12);
    let bonus = Math.max(0, Number(stats && stats.shockEffectBonusPct) || 0);
    return Math.max(0, Math.min(50, base * (1 + bonus / 100)));
}

export function formatUiTakenDamageShockLine(runtime, value) {
    let pct = Math.abs(Number(value) || 0).toFixed(1).replace(/\.0$/, '');
    return value < 0 ? (0, runtime.deps._t)('받는 피해 감소: {pct}%', { pct }) : (0, runtime.deps._t)('받는 피해 증가: {pct}%', { pct });
}

export function getUiSkillTargets(runtime, stats) {
    let provider = runtime.handlers.getUiGlobalFunction('getSkillTargets');
    return provider ? (runtime.handlers.callUiProvider('getSkillTargets', provider, [stats]) || []) : [];
}

export function getUiCrowdProgressPaused(runtime) {
    let provider = runtime.handlers.getUiGlobalFunction('isCrowdProgressPaused');
    return provider ? !!runtime.handlers.callUiProvider('isCrowdProgressPaused', provider) : false;
}

export function runUiGlobalFunction(runtime, name, args = []) {
    let provider = runtime.handlers.getUiGlobalFunction(name);
    return provider ? runtime.handlers.callUiProvider(name, provider, args) : undefined;
}

export function runUiStartEncounter(runtime) {
    return runtime.handlers.runUiGlobalFunction('startEncounterRun');
}

export function runUiCoreLoop(runtime, nowMs) {
    return runtime.handlers.runUiGlobalFunction('coreLoop', [nowMs]);
}

export function getUiGemPresentation(runtime, name, isSupport, stats) {
    let provider = runtime.handlers.getUiGlobalFunction('getGemPresentation');
    if (provider) return runtime.handlers.callUiProvider('getGemPresentation', provider, [name, isSupport, stats]) || {};
    let db = isSupport ? (runtime.deps.SUPPORT_GEM_DB[name] || {}) : (runtime.deps.SKILL_DB[name] || {});
    const level = fallbackGemLevel(runtime, name, isSupport);
    return isSupport ? fallbackSupportPresentation(db, level, name) : fallbackSkillPresentation(runtime, db, level, name);
}

function fallbackGemLevel(runtime, name, isSupport) {
    let store = isSupport ? (runtime.deps.game.supportGemData || {}) : (runtime.deps.game.gemData || {});
    return Math.max(1, Math.floor(((store[name] || {}).level) || 1));
}

function fallbackSupportPresentation(db, level, name) {
    return { baseLevel: level, totalLevel: level, value: Number(db.baseVal || 0), desc: db.desc || '', statName: db.name || name, statId: db.stat || null, activeTier: 1 };
}

function fallbackSkillPresentation(runtime, db, level, name) {
    return { baseLevel: db.isGem || db.levelable ? level : 0, totalLevel: db.isGem || db.levelable ? level : 0, finalLevel: db.isGem || db.levelable ? level : 0, desc: db.desc || '', statName: name, skill: db, tags: (0, runtime.deps.getSkillTagList)(db) };
}
