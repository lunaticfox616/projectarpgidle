const GHOST_COMBAT_SNAPSHOT_VERSION = 1;
const GHOST_COMBAT_RULESET_VERSION = 'ghost-combat-rules-v1';
const GHOST_COMBAT_ELEMENTS = Object.freeze(['phys', 'fire', 'cold', 'light', 'chaos']);
const GHOST_COMBAT_TAGS = new Set(['attack', 'spell', 'melee', 'projectile', 'aoe', 'dot', 'channeling', 'summon', 'summon_attack']);

function getGhostCombatStyle(skill) {
    let tags = skill && Array.isArray(skill.tags) ? skill.tags : [];
    if (tags.includes('summon')) return 'summon';
    if (tags.includes('channeling')) return 'channel';
    if (tags.includes('projectile')) return 'projectile';
    if (tags.includes('dot')) return 'dot';
    if (tags.includes('spell')) return 'spell';
    return 'melee';
}

function getGhostCombatVersion() {
    return GHOST_COMBAT_RULESET_VERSION;
}

function getGhostCombatRecoveryPct(stats) {
    let hp = Math.max(1, Number(stats && stats.maxHp) || 1);
    let energyShield = Math.max(0, Number(stats && stats.energyShield) || 0);
    let lifeRecovery = hp * Math.max(0, Number(stats && stats.regen) || 0) / 100;
    let shieldRecovery = energyShield * Math.max(0, Number(stats && stats.energyShieldRegenRate) || 0) / 100;
    return clampNumber((lifeRecovery + shieldRecovery) * 100 / Math.max(1, hp + energyShield), 0, 10);
}

function getGhostCombatDirectEhp(stats, profile) {
    let rows = profile && profile.elements || {};
    return Object.fromEntries(GHOST_COMBAT_ELEMENTS.map(element => [
        element,
        Math.max(1, Math.floor(Number(rows[element] && rows[element].direct) || 1))
    ]));
}

/**
 * 서버 고스트 판정에 필요한 파생 전투 능력치만 만든다. 저장 원문이나 장비 원본은 포함하지 않는다.
 * @param {Readonly<object>} suppliedStats
 * @returns {object}
 */
function getGhostCombatSnapshot(suppliedStats) {
    let stats = suppliedStats || (typeof getPlayerStats === 'function' ? getPlayerStats() : {});
    let profile = typeof calculatePlayerEhpProfile === 'function'
        ? calculatePlayerEhpProfile(stats) : { elements: {} };
    let skill = stats.sSkill || (typeof SKILL_DB !== 'undefined' && SKILL_DB[game.activeSkill]) || {};
    let activeSkill = String(game && game.activeSkill || '기본 공격');
    let element = GHOST_COMBAT_ELEMENTS.includes(skill.ele) ? skill.ele : 'phys';
    let totalDps = Math.max(1, Math.floor(Number(stats.totalDps) || Number(stats.dps) || 1));
    let dotDps = clampNumber(Number(stats.skillDotDps) || 0, 0, totalDps);
    let summonDps = clampNumber(Number(stats.summonDps) || 0, 0, totalDps);
    let directDps = Math.max(0, totalDps - dotDps - summonDps);
    let appearance = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : game.selectedHeroId;
    return {
        schemaVersion: GHOST_COMBAT_SNAPSHOT_VERSION,
        ascendClass: game && game.ascendClass ? String(game.ascendClass).slice(0, 80) : null,
        heroId: /^hero(?:10|[1-9])$/.test(String(appearance || '')) ? appearance : 'hero1',
        talentHeroId: /^hero(?:10|[1-9])$/.test(String(game.selectedHeroId || '')) ? game.selectedHeroId : 'hero1',
        activeSkill, skillElement: element, style: getGhostCombatStyle(skill),
        tags: (Array.isArray(skill.tags) ? skill.tags : []).filter(tag => GHOST_COMBAT_TAGS.has(tag)).slice(0, 8),
        dps: totalDps, directDps: Math.floor(directDps), dotDps: Math.floor(dotDps), summonDps: Math.floor(summonDps),
        maxHp: Math.max(1, Math.floor(Number(stats.maxHp) || 1)),
        energyShield: Math.max(0, Math.floor(Number(stats.energyShield) || 0)),
        directEhpByElement: getGhostCombatDirectEhp(stats, profile),
        attackSpeed: clampNumber(Number(stats.aspd) || 1, 0.2, 8),
        critChance: clampNumber(Number(stats.crit) || 0, 0, 100),
        critMultiplier: clampNumber((Number(stats.critDmg) || 125) / 100, 1, 20),
        damageRollMinPct: clampNumber(Number(stats.minDmgRoll) || 100, 5, 1000),
        damageRollMaxPct: clampNumber(Number(stats.maxDmgRoll) || 100, 5, 1000),
        doubleStrikeChance: clampNumber(Number(stats.ds) || 0, 0, 500),
        accuracy: Math.max(1, Math.floor(Number(stats.accuracy) || 1)),
        evasion: Math.max(0, Math.floor(Number(stats.evasion) || 0)),
        blockChance: clampNumber(Number(stats.blockChance) || 0, 0, 75),
        deflectChance: clampNumber(Number(stats.deflectChance) || 0, 0, 75),
        deflectDamageReduce: clampNumber(40 + (Number(stats.deflectDamageReduce) || 0), 40, 85),
        leechPct: clampNumber(Number(stats.leech) || 0, 0, 20),
        recoveryPct: getGhostCombatRecoveryPct(stats)
    };
}

safeExposeGlobals({ getGhostCombatSnapshot, getGhostCombatVersion });
