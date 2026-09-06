function canRollSeveredWanderer(zone, isElite, isBoss) {
    let loop = Math.max(1, Math.floor(Number(game.season) || 1));
    if (!zone || !isElite || isBoss || loop < SEVERED_WANDERER_CONFIG.unlockLoop) return false;
    return ['act', 'abyss', 'chaosRealm', 'labyrinth', 'underworld', 'oceanDepth', 'cosmos', 'skyTower'].includes(zone.type);
}

function getSeveredWandererEligibleBases(zone, slot) {
    let tier = Math.max(1, Math.floor(Number(zone && zone.tier) || 1));
    return BASE_ITEM_DB.filter(base => base && base.slot === slot && Math.max(1, Math.floor(base.reqTier || 1)) <= tier);
}

function pickSeveredWandererBase(zone, slot, rng) {
    let rows = getSeveredWandererEligibleBases(zone, slot);
    if (rows.length <= 0) rows = BASE_ITEM_DB.filter(base => base && base.slot === slot);
    return rows.length > 0 ? rows[Math.floor(rng() * rows.length) % rows.length] : null;
}

function buildSeveredWandererLoadout(zone, rng = Math.random) {
    let skills = SEVERED_WANDERER_CONFIG.skillPool.filter(name => SKILL_DB[name]);
    let equipment = SEVERED_WANDERER_CONFIG.equipmentSlots
        .map(slot => pickSeveredWandererBase(zone, slot, rng)).filter(Boolean);
    return {
        name: SEVERED_WANDERER_CONFIG.names[Math.floor(rng() * SEVERED_WANDERER_CONFIG.names.length) % SEVERED_WANDERER_CONFIG.names.length],
        title: SEVERED_WANDERER_CONFIG.titles[Math.floor(rng() * SEVERED_WANDERER_CONFIG.titles.length) % SEVERED_WANDERER_CONFIG.titles.length],
        skillName: skills[Math.floor(rng() * skills.length) % skills.length],
        equipment
    };
}

function applyWandererBaseStat(enemy, stat) {
    let id = stat && stat.id;
    let value = Math.max(0, Number(stat && stat.base) || 0);
    if (id === 'armor') enemy.armor += Math.floor(value * 1.15);
    else if (id === 'evasion') enemy.evasion += Math.floor(value * 1.15);
    else if (id === 'energyShield') enemy.maxEnergyShield = (enemy.maxEnergyShield || 0) + Math.floor(value * 1.25);
    else if (id === 'flatHp') enemy.maxHp += Math.floor(enemy.maxHp * Math.min(0.12, value / 1200));
    else if (id === 'resAll') ['resF', 'resC', 'resL', 'resChaos'].forEach(key => { enemy[key] += value; });
    else if (['resF', 'resC', 'resL', 'resChaos'].includes(id)) enemy[id] += value;
    else if (id === 'aspd') enemy.attackSpeedVar *= 1 + value / 100;
    else if (id === 'crit') enemy.critChance += value;
    else if (['flatDmg', 'spellFlatDmg', 'projectilePctDmg', 'spellFlatPct'].includes(id)) enemy.damageMul *= 1 + Math.min(0.2, value / 280);
}

function applyWandererSkillProfile(enemy, skillName) {
    let skill = SKILL_DB[skillName] || SKILL_DB['기본 공격'];
    let tags = Array.isArray(skill.tags) ? skill.tags : [];
    enemy.ele = skill.ele || enemy.ele;
    enemy.attackKind = tags.includes('melee') ? 'melee' : 'ranged';
    let grid = typeof SKILL_GRID_DB !== 'undefined' ? SKILL_GRID_DB[skillName] : null;
    enemy.attackRange = enemy.attackKind === 'melee' ? 1 : Math.max(3, Math.min(7, Number(grid && grid.range) || 5));
    enemy.attackSpeedVar *= Math.max(0.7, Math.min(1.35, Number(skill.baseSpd) || 1));
    enemy.damageMul *= Math.max(0.85, Math.min(1.45, Number(skill.baseDmg) || 1));
    enemy.critChance += Math.max(0, Number(skill.crit) || 0);
    enemy.leechPct = Math.max(Number(enemy.leechPct) || 0, Math.max(0, Number(skill.leech) || 0) * 8);
    enemy.doubleStrikeChance = Math.max(Number(enemy.doubleStrikeChance) || 0, Math.min(35, Math.max(0, (Number(skill.multiHit) || 1) - 1) * 14));
    enemy.wandererDelivery = tags.includes('projectile') ? 'projectileCell' : (enemy.attackKind === 'ranged' ? 'magicCell' : 'instantTarget');
    if (enemy.ele !== 'phys') enemy.ailmentChance = Math.max(enemy.ailmentChance || 0, 0.12);
}

function clampWandererCombatStats(enemy, baseline) {
    let config = SEVERED_WANDERER_CONFIG;
    enemy.maxHp = Math.floor(Math.min(baseline.maxHp * config.maxHpMultiplier,
        Math.max(baseline.maxHp * config.hpMultiplier, enemy.maxHp)));
    enemy.damageMul = Math.min(baseline.damageMul * config.maxDamageMultiplier,
        Math.max(baseline.damageMul * config.minDamageMultiplier, enemy.damageMul));
    enemy.attackSpeedVar = Math.min(baseline.attackSpeedVar * config.maxAttackSpeedMultiplier,
        Math.max(baseline.attackSpeedVar * config.minAttackSpeedMultiplier, enemy.attackSpeedVar));
    enemy.maxEnergyShield = Math.min(enemy.maxEnergyShield || 0, Math.floor(enemy.maxHp * config.maxEnergyShieldRatio));
    ['resF', 'resC', 'resL', 'resChaos'].forEach(key => { enemy[key] = Math.min(config.resistanceCap, enemy[key]); });
}

function applySeveredWandererLoadout(enemy, loadout) {
    if (!enemy || !loadout) return enemy;
    let baseline = { maxHp: enemy.maxHp, damageMul: enemy.damageMul, attackSpeedVar: enemy.attackSpeedVar };
    enemy.isSeveredWanderer = true;
    enemy.name = `⚔️ ${loadout.name}, ${loadout.title}`;
    enemy.maxHp *= SEVERED_WANDERER_CONFIG.hpMultiplier;
    enemy.damageMul *= SEVERED_WANDERER_CONFIG.minDamageMultiplier;
    enemy.expMul *= SEVERED_WANDERER_CONFIG.expMultiplier;
    enemy.dropMul *= SEVERED_WANDERER_CONFIG.dropMultiplier;
    applyWandererSkillProfile(enemy, loadout.skillName);
    loadout.equipment.forEach(base => (base.baseStats || []).forEach(stat => applyWandererBaseStat(enemy, stat)));
    clampWandererCombatStats(enemy, baseline);
    enemy.hp = enemy.maxHp;
    enemy.energyShield = enemy.maxEnergyShield || 0;
    enemy.wandererLoadout = {
        skillName: loadout.skillName,
        equipment: loadout.equipment.map(base => ({ id: base.id, slot: base.slot, name: base.name }))
    };
    let gearText = enemy.wandererLoadout.equipment.map(base => base.name).join(', ');
    enemy.traitName = `단절된 방랑자 · ${loadout.skillName} · ${gearText}`;
    return enemy;
}

function maybeApplySeveredWanderer(enemy, zone, isElite, isBoss, rng = Math.random) {
    if (!canRollSeveredWanderer(zone, isElite, isBoss) || rng() >= SEVERED_WANDERER_CONFIG.eliteReplacementChance) return enemy;
    return applySeveredWandererLoadout(enemy, buildSeveredWandererLoadout(zone, rng));
}

safeExposeGlobals({ canRollSeveredWanderer, buildSeveredWandererLoadout,
    applySeveredWandererLoadout, maybeApplySeveredWanderer });
