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

/** 대결에서 쓰는 전투 전술(js/combat.js updatePlayerGridEngagement와 같다): 위치 전술(조건부 규칙이 맞지 않을 때의 기본 전술)과
 * 최후방 사격은 전술이 열렸을 때만, 추적자의 다가가는 이동 속도(%)는 늘. */
function getGhostCombatTactics(stats) {
    let unlocked = game.combatTacticsUnlocked === true;
    let flags = stats.passiveKeystoneFlags || {};
    return {
        positionMode: unlocked ? normalizeCombatTacticsSettings(game.settings).positionMode : 'auto',
        farshot: unlocked && flags.farshot === true,
        pursuitMovePct: clampNumber(Number(stats.uniquePursuitMovePct) || 0, 0, 100)
    };
}

/** 움직이며 싸우는 대결의 값(db/operations-and-ghost.sql simulate_ghost_duel): 이동 속도(100이 기본), 주 스킬과 이동 스킬룬의
 * 사거리(칸, js/combat-grid.js getSkillGridProfile), 재사용 대기시간 줄을 더한 이동 스킬룬의 대기, 전술, 다시 보기의 직업과 무기 자세.
 * 서버가 아직 모르는 값은 버리므로 예전 서버에도 그대로 보낼 수 있다. */
function getGhostCombatMotion(stats, skill) {
    let reach = (name, def) => clampNumber(Number(getSkillGridProfile(name, def).range) || 1, 1, 8);
    let mobility = mobilitySkill.equipped(game);
    return {
        moveSpeed: clampNumber(Number(stats.moveSpeed) || 100, 20, 400),
        attackRange: reach(game.activeSkill, skill),
        mobilityRange: mobility ? reach(mobility, SKILL_DB[mobility]) : 0,
        mobilityCooldownMs: mobility ? Math.round(mobilitySkill.cooldownMs(mobility, stats)) : 4000,
        mobilitySkill: mobility || undefined,
        classId: getHeroAppearanceId(),
        stance: SKILL_RUNE_STANCE_BY_CATEGORY[getWeaponCategoryId(game.equipment && game.equipment['무기'])] || 'unarmed'
    };
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
    let appearance = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : game.selectedClassId;
    let appearanceDef = typeof PLAYER_CLASS_DEFS !== 'undefined' ? PLAYER_CLASS_DEFS[appearance] : null;
    return {
        schemaVersion: GHOST_COMBAT_SNAPSHOT_VERSION,
        ascendClass: game && game.ascendClass ? String(game.ascendClass).slice(0, 80) : null,
        heroId: appearanceDef ? appearanceDef.recommendedTalentHeroId : 'hero1',
        talentHeroId: game.bloomedClassThisLoop === game.ascendClass
            && /^hero(?:10|[1-9])$/.test(String(game.bloomedTalentThisLoop || ''))
            ? game.bloomedTalentThisLoop : null,
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
        recoveryPct: getGhostCombatRecoveryPct(stats),
        ...getGhostCombatMotion(stats, skill),
        ...getGhostCombatTactics(stats)
    };
}

safeExposeGlobals({ getGhostCombatSnapshot, getGhostCombatVersion });
