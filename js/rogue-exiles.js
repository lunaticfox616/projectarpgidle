function canRollRogueExile(zone, isElite, isBoss) {
    if (!zone || !isElite || isBoss || Math.max(1, Math.floor(game.season || 1)) < ROGUE_EXILE_CONFIG.unlockLoop) return false;
    return ['act', 'abyss', 'chaosRealm', 'labyrinth', 'underworld', 'oceanDepth', 'cosmos', 'skyTower'].includes(zone.type);
}

function getRogueExileEligibleBases(zone, slot) {
    let tier = Math.max(1, Math.floor(Number(zone && zone.tier) || 1));
    return BASE_ITEM_DB.filter(base => base && base.slot === slot && Math.max(1, Math.floor(base.reqTier || 1)) <= tier);
}

function pickRogueExileBase(zone, slot, rng) {
    let rows = getRogueExileEligibleBases(zone, slot);
    if (rows.length <= 0) rows = BASE_ITEM_DB.filter(base => base && base.slot === slot);
    return rows.length > 0 ? rows[Math.floor(rng() * rows.length) % rows.length] : null;
}

function buildRogueExileLoadout(zone, rng = Math.random) {
    let skills = ROGUE_EXILE_CONFIG.skillPool.filter(name => SKILL_DB[name]);
    let skillName = skills[Math.floor(rng() * skills.length) % skills.length];
    let equipment = ROGUE_EXILE_CONFIG.equipmentSlots
        .map(slot => pickRogueExileBase(zone, slot, rng))
        .filter(Boolean);
    return {
        name: ROGUE_EXILE_CONFIG.names[Math.floor(rng() * ROGUE_EXILE_CONFIG.names.length) % ROGUE_EXILE_CONFIG.names.length],
        title: ROGUE_EXILE_CONFIG.titles[Math.floor(rng() * ROGUE_EXILE_CONFIG.titles.length) % ROGUE_EXILE_CONFIG.titles.length],
        skillName,
        equipment
    };
}

function applyRogueBaseStat(enemy, stat) {
    let id = stat && stat.id;
    let value = Math.max(0, Number(stat && stat.base) || 0);
    if (id === 'armor') enemy.armor += Math.floor(value * 1.25);
    else if (id === 'evasion') enemy.evasion += Math.floor(value * 1.25);
    else if (id === 'energyShield') enemy.maxEnergyShield = (enemy.maxEnergyShield || 0) + Math.floor(value * 1.5);
    else if (id === 'flatHp') enemy.maxHp += Math.floor(enemy.maxHp * Math.min(0.18, value / 900));
    else if (id === 'resAll') ['resF', 'resC', 'resL', 'resChaos'].forEach(key => { enemy[key] = Math.min(90, enemy[key] + value); });
    else if (id === 'resF' || id === 'resC' || id === 'resL' || id === 'resChaos') enemy[id] = Math.min(90, enemy[id] + value);
    else if (id === 'aspd') enemy.attackSpeedVar *= 1 + value / 100;
    else if (id === 'crit') enemy.critChance += value;
    else if (['flatDmg', 'spellFlatDmg', 'projectilePctDmg', 'spellFlatPct'].includes(id)) enemy.damageMul *= 1 + Math.min(0.24, value / 240);
}

function applyRogueSkillProfile(enemy, skillName) {
    let skill = SKILL_DB[skillName] || SKILL_DB['기본 공격'];
    let tags = Array.isArray(skill.tags) ? skill.tags : [];
    enemy.ele = skill.ele || enemy.ele;
    enemy.attackKind = tags.includes('melee') ? 'melee' : 'ranged';
    let grid = typeof SKILL_GRID_DB !== 'undefined' ? SKILL_GRID_DB[skillName] : null;
    enemy.attackRange = enemy.attackKind === 'melee' ? 1 : Math.max(3, Math.min(7, Number(grid && grid.range) || 5));
    enemy.attackSpeedVar *= Math.max(0.65, Math.min(1.45, Number(skill.baseSpd) || 1));
    enemy.damageMul *= Math.max(0.82, Math.min(1.55, Number(skill.baseDmg) || 1));
    enemy.critChance += Math.max(0, Number(skill.crit) || 0);
    enemy.leechPct = Math.max(Number(enemy.leechPct) || 0, Math.max(0, Number(skill.leech) || 0) * 10);
    enemy.doubleStrikeChance = Math.max(Number(enemy.doubleStrikeChance) || 0, Math.min(50, Math.max(0, (Number(skill.multiHit) || 1) - 1) * 18));
    enemy.rogueDelivery = tags.includes('projectile') ? 'projectileCell' : (enemy.attackKind === 'ranged' ? 'magicCell' : 'instantTarget');
    if (enemy.ele !== 'phys') enemy.ailmentChance = Math.max(enemy.ailmentChance || 0, 0.16);
}

function applyRogueExileLoadout(enemy, zone, loadout) {
    if (!enemy || !loadout) return enemy;
    enemy.isRogueExile = true;
    enemy.name = `🗡️ ${loadout.name}, ${loadout.title}`;
    enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * ROGUE_EXILE_CONFIG.hpMultiplier));
    enemy.hp = enemy.maxHp;
    enemy.damageMul *= ROGUE_EXILE_CONFIG.damageMultiplier;
    enemy.expMul *= ROGUE_EXILE_CONFIG.expMultiplier;
    enemy.dropMul *= ROGUE_EXILE_CONFIG.dropMultiplier;
    applyRogueSkillProfile(enemy, loadout.skillName);
    loadout.equipment.forEach(base => (base.baseStats || []).forEach(stat => applyRogueBaseStat(enemy, stat)));
    enemy.hp = enemy.maxHp;
    if ((enemy.maxEnergyShield || 0) > 0) enemy.energyShield = enemy.maxEnergyShield;
    enemy.rogueLoadout = {
        skillName: loadout.skillName,
        equipment: loadout.equipment.map(base => ({ id: base.id, slot: base.slot, name: base.name }))
    };
    let gearText = enemy.rogueLoadout.equipment.map(base => base.name).join(', ');
    enemy.traitName = `탈주 유배자 · ${loadout.skillName} · ${gearText}`;
    return enemy;
}

function maybeApplyRogueExile(enemy, zone, isElite, isBoss, rng = Math.random) {
    if (!canRollRogueExile(zone, isElite, isBoss) || rng() >= ROGUE_EXILE_CONFIG.eliteReplacementChance) return enemy;
    return applyRogueExileLoadout(enemy, zone, buildRogueExileLoadout(zone, rng));
}

safeExposeGlobals({ canRollRogueExile, buildRogueExileLoadout, applyRogueExileLoadout, maybeApplyRogueExile });
