

export function wandererCanRollSeveredWanderer(env, zone, isElite, isBoss, owner) {
    let loop = Math.max(1, Math.floor(Number(owner.season) || 1));
    if (!zone || !isElite || isBoss || loop < env.deps.SEVERED_WANDERER_CONFIG.unlockLoop) return false;
    return ['act', 'abyss', 'chaosRealm', 'labyrinth', 'underworld', 'oceanDepth', 'cosmos', 'skyTower'].includes(zone.type);
}

export function wandererGetSeveredWandererEligibleBases(env, zone, slot) {
    let tier = Math.max(1, Math.floor(Number(zone && zone.tier) || 1));
    return env.deps.BASE_ITEM_DB.filter(base => base && base.slot === slot && Math.max(1, Math.floor(base.reqTier || 1)) <= tier);
}

export function wandererPickSeveredWandererBase(env, zone, slot, rng) {
    let rows = wandererGetSeveredWandererEligibleBases(env, zone, slot);
    if (rows.length <= 0) rows = env.deps.BASE_ITEM_DB.filter(base => base && base.slot === slot);
    return rows.length > 0 ? rows[Math.floor(rng() * rows.length) % rows.length] : null;
}

export function wandererBuildSeveredWandererLoadout(env, zone, rng = Math.random) {
    let skills = env.deps.SEVERED_WANDERER_CONFIG.skillPool.filter(name => env.deps.SKILL_DB[name]);
    let equipment = env.deps.SEVERED_WANDERER_CONFIG.equipmentSlots
        .map(slot => wandererPickSeveredWandererBase(env, zone, slot, rng)).filter(Boolean);
    return {
        name: env.deps.SEVERED_WANDERER_CONFIG.names[Math.floor(rng() * env.deps.SEVERED_WANDERER_CONFIG.names.length) % env.deps.SEVERED_WANDERER_CONFIG.names.length],
        title: env.deps.SEVERED_WANDERER_CONFIG.titles[Math.floor(rng() * env.deps.SEVERED_WANDERER_CONFIG.titles.length) % env.deps.SEVERED_WANDERER_CONFIG.titles.length],
        skillName: skills[Math.floor(rng() * skills.length) % skills.length],
        equipment
    };
}

export function wandererApplyWandererBaseStat(enemy, stat) {
    if (!stat) return;
    let id = stat.id;
    let value = Math.max(0, Number(stat.base) || 0);
    if (id === 'armor') enemy.armor += Math.floor(value * 1.15);
    else if (id === 'evasion') enemy.evasion += Math.floor(value * 1.15);
    else if (id === 'energyShield') enemy.maxEnergyShield = (enemy.maxEnergyShield || 0) + Math.floor(value * 1.25);
    else if (id === 'flatHp') enemy.maxHp += Math.floor(enemy.maxHp * Math.min(0.12, value / 1200));
    else if (id === 'resAll') ['resF', 'resC', 'resL', 'resChaos'].forEach(key => { enemy[key] += value; });
    else if (['resF', 'resC', 'resL', 'resChaos'].includes(id)) enemy[id] += value;
    else wandererApplyOffenseStat(enemy, id, value);
}

function wandererApplyOffenseStat(enemy, id, value) {
    if (id === 'aspd') enemy.attackSpeedVar *= 1 + value / 100;
    else if (id === 'crit') enemy.critChance += value;
    else if (['flatDmg', 'spellFlatDmg', 'projectilePctDmg', 'spellFlatPct'].includes(id)) enemy.damageMul *= 1 + Math.min(0.2, value / 280);
}

export function wandererApplyWandererSkillProfile(env, enemy, skillName) {
    let skill = env.deps.SKILL_DB[skillName] || env.deps.SKILL_DB['기본 공격'];
    let tags = Array.isArray(skill.tags) ? skill.tags : [];
    enemy.ele = skill.ele || enemy.ele;
    wandererApplySkillRange(env, enemy, tags, skillName);
    wandererApplySkillCadence(enemy, skill);
    enemy.wandererDelivery = tags.includes('projectile') ? 'projectileCell' : (enemy.attackKind === 'ranged' ? 'magicCell' : 'instantTarget');
    if (enemy.ele !== 'phys') enemy.ailmentChance = Math.max(enemy.ailmentChance || 0, 0.12);
}

function wandererApplySkillRange(env, enemy, tags, skillName) {
    enemy.attackKind = tags.includes('melee') ? 'melee' : 'ranged';
    let grid = typeof env.deps.SKILL_GRID_DB !== 'undefined' ? env.deps.SKILL_GRID_DB[skillName] : null;
    enemy.attackRange = enemy.attackKind === 'melee' ? 1 : Math.max(3, Math.min(7, Number(grid && grid.range) || 5));
}

function wandererApplySkillCadence(enemy, skill) {
    enemy.attackSpeedVar *= Math.max(0.7, Math.min(1.35, Number(skill.baseSpd) || 1));
    enemy.damageMul *= Math.max(0.85, Math.min(1.45, Number(skill.baseDmg) || 1));
    enemy.critChance += Math.max(0, Number(skill.crit) || 0);
    enemy.leechPct = Math.max(Number(enemy.leechPct) || 0, Math.max(0, Number(skill.leech) || 0) * 8);
    enemy.doubleStrikeChance = Math.max(Number(enemy.doubleStrikeChance) || 0, Math.min(35, Math.max(0, (Number(skill.multiHit) || 1) - 1) * 14));
}

export function wandererClampWandererCombatStats(env, enemy, baseline) {
    let config = env.deps.SEVERED_WANDERER_CONFIG;
    enemy.maxHp = Math.floor(Math.min(baseline.maxHp * config.maxHpMultiplier,
        Math.max(baseline.maxHp * config.hpMultiplier, enemy.maxHp)));
    enemy.damageMul = Math.min(baseline.damageMul * config.maxDamageMultiplier,
        Math.max(baseline.damageMul * config.minDamageMultiplier, enemy.damageMul));
    enemy.attackSpeedVar = Math.min(baseline.attackSpeedVar * config.maxAttackSpeedMultiplier,
        Math.max(baseline.attackSpeedVar * config.minAttackSpeedMultiplier, enemy.attackSpeedVar));
    enemy.maxEnergyShield = Math.min(enemy.maxEnergyShield || 0, Math.floor(enemy.maxHp * config.maxEnergyShieldRatio));
    ['resF', 'resC', 'resL', 'resChaos'].forEach(key => { enemy[key] = Math.min(config.resistanceCap, enemy[key]); });
}

export function wandererApplySeveredWandererLoadout(env, enemy, loadout) {
    if (!enemy || !loadout) return enemy;
    let baseline = { maxHp: enemy.maxHp, damageMul: enemy.damageMul, attackSpeedVar: enemy.attackSpeedVar };
    enemy.isSeveredWanderer = true;
    enemy.name = `⚔️ ${loadout.name}, ${loadout.title}`;
    enemy.maxHp *= env.deps.SEVERED_WANDERER_CONFIG.hpMultiplier;
    enemy.damageMul *= env.deps.SEVERED_WANDERER_CONFIG.minDamageMultiplier;
    enemy.expMul *= env.deps.SEVERED_WANDERER_CONFIG.expMultiplier;
    enemy.dropMul *= env.deps.SEVERED_WANDERER_CONFIG.dropMultiplier;
    wandererApplyWandererSkillProfile(env, enemy, loadout.skillName);
    loadout.equipment.forEach(base => (base.baseStats || []).forEach(stat => wandererApplyWandererBaseStat(enemy, stat)));
    wandererClampWandererCombatStats(env, enemy, baseline);
    enemy.hp = enemy.maxHp;
    enemy.energyShield = enemy.maxEnergyShield || 0;
    enemy.wandererLoadout = {
        skillName: loadout.skillName,
        equipment: loadout.equipment.map(base => ({ id: base.id, slot: base.slot, name: base.name }))
    };
    let gearText = enemy.wandererLoadout.equipment.map(base => base.name).join(', ');
    enemy.traitName = env.deps._t('단절된 방랑자, {skillName}, {gearText}', { skillName: loadout.skillName, gearText });
    return enemy;
}

export function wandererMaybeApplySeveredWanderer(env, enemy, zone, isElite, ...selection) {
const [isBoss, rng = Math.random, owner] = selection;
    if (!wandererCanRollSeveredWanderer(env, zone, isElite, isBoss, owner) || rng() >= env.deps.SEVERED_WANDERER_CONFIG.eliteReplacementChance) return enemy;
    return wandererApplySeveredWandererLoadout(env, enemy, wandererBuildSeveredWandererLoadout(env, zone, rng));
}
