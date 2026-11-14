

export function buildApplyChaosRealmAffixesToEnemy(env, enemy, zone) {
    if (!enemy || !zone || (zone.type !== 'chaosRealm' && !zone.bloomTrialAffixFloor)) return enemy;
    let floor = Math.max(1, Math.floor(zone.bloomTrialAffixFloor || zone.floor || 1));
    let scale = env.deps.getChaosRealmAffixScale(floor);
    let affixes = env.deps.getChaosRealmAffixes(floor);
    enemy.chaosRealmFloor = floor;
    enemy.chaosRealmAffixes = affixes;
    enemy.traitName = affixes.map(a => a.name).join(', ');
    affixes.forEach(affix => {
        let s = affix.scale || scale;
        applyChaosDefence(enemy, affix, floor, s);
        applyChaosLeechAndDampening(enemy, affix, floor);
        applyChaosCurses(enemy, affix, floor, s);
        applyChaosStrikes(enemy, affix, floor, s);
    });
    return enemy;
}

function applyChaosDefence(enemy, affix, floor, s) {
    if (affix.id === 'elemental_wall') { enemy.resF += Math.floor(58 * s); enemy.resC += Math.floor(58 * s); enemy.resL += Math.floor(58 * s); }
    if (affix.id === 'iron_bark') { enemy.dr += Math.floor(34 * s); enemy.armorGuard = Math.max(enemy.armorGuard || 0, 0.16 + 0.05 * s); }
    if (affix.id === 'mirage_step') enemy.evasionChance = Math.max(enemy.evasionChance || 0, Math.min(55, 22 + floor * 0.9));
    if (affix.id === 'soul_shell') { enemy.maxEnergyShield = Math.max(enemy.maxEnergyShield || 0, enemy.maxHp); enemy.energyShield = enemy.maxEnergyShield; }
}

function applyChaosLeechAndDampening(enemy, affix, floor) {
    if (affix.id === 'projectile_dampening') enemy.projectileDamageTakenMul = Math.min(enemy.projectileDamageTakenMul || 1, 0.5);
    if (affix.id === 'spell_dampening') enemy.spellDamageTakenMul = Math.min(enemy.spellDamageTakenMul || 1, 0.5);
    if (affix.id === 'blood_drinker') enemy.leechPct = Math.max(enemy.leechPct || 0, 2.5 + floor * 0.08);
    if (affix.id === 'bloodless') enemy.leechEffMul = Math.min(enemy.leechEffMul || 1, Math.max(0.08, 0.28 - floor * 0.002));
}

function applyChaosCurses(enemy, affix, floor, s) {
    if (affix.id === 'curse_blade') { enemy.curseBlade = true; enemy.atkMul = (enemy.atkMul || 1) * (1.18 + floor * 0.006); enemy.penetration += Math.floor(8 * s); }
    if (affix.id === 'curse_immune') enemy.curseImmune = true;
    if (affix.id === 'phys_dampening') enemy.physicalDamageTakenMul = Math.min(enemy.physicalDamageTakenMul || 1, 0.5);
}

function applyChaosStrikes(enemy, affix, floor, s) {
    if (affix.id === 'deadly_crit') { enemy.critChance += Math.floor(18 * s); enemy.critDamageMul = Math.max(enemy.critDamageMul || 1.55, 1.95 + floor * 0.01); }
    if (affix.id === 'multi_strike') enemy.doubleStrikeChance = Math.max(enemy.doubleStrikeChance || 0, Math.min(45, 18 + floor * 0.6));
    if (affix.id === 'deep_penetration') enemy.penetration += Math.floor(18 * s);
}

/** Zone-wide enemy modifiers: chaos-realm floor affixes and atlas map mods (js/atlas-maps.js). */
export function buildApplyZoneEnemyMods(env, enemy, zone) {
    buildApplyChaosRealmAffixesToEnemy(env, enemy, zone);
    return env.deps.atlasMaps.applyEnemyMods(enemy, zone);
}
