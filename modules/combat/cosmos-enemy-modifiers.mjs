

// 데이터(zone.bossMods)로 선언한 고정 보스 수정자. cosmosMods와 같은 shape를 반환해
// createEnemy의 기존 소비처를 그대로 재사용한다. (버려진 날붙이 등 시즌 보스 개성 부여용)
export function buildGetZoneStaticBossMods(zone, isBoss) {
    if (!isBoss || !zone || !zone.bossMods || typeof zone.bossMods !== 'object') return null;
    return zone.bossMods;
}

export function buildApplyCosmosDirectiveModifiers(env, modifiers, zone) {
    const directive = zone && zone.cosmosDirective && typeof zone.cosmosDirective === 'object'
        ? zone.cosmosDirective : null;
    if (!directive) return modifiers;
    modifiers.hpMul *= Math.max(0.5, Math.min(3, Number(directive.enemyHpMul) || 1));
    modifiers.damageMul *= Math.max(0.5, Math.min(3, Number(directive.enemyDamageMul) || 1));
    modifiers.attackSpeedMul *= Math.max(0.5, Math.min(2, Number(directive.enemyAttackSpeedMul) || 1));
    const name = String(directive.name || '').trim();
    if (name) modifiers.traitName = env.deps._t('{traitName}, 탐사:{name}', { traitName: modifiers.traitName, name });
    return modifiers;
}

export function buildGetCosmosEnemyModifiers(env, zone, isElite, isBoss) {
    if (!zone || zone.type !== 'cosmos') return null;
    const { mod, tag, bossMul } = cosmosModifierBase(env, zone, isElite, isBoss);
    applyCosmosTagModifiers(mod, tag);
    applyGalaxyEnvironment(env, mod, zone);
    mod.hpMul = Math.max(0.5, mod.hpMul * bossMul * buildGetCosmosNonBossHpMultiplier(zone, isElite, isBoss));
    mod.damageMul = Math.max(0.5, mod.damageMul * (isBoss ? 1.1 : 1));
    applyGalaxyBossModifiers(env, mod, zone, isBoss);
    return buildApplyCosmosDirectiveModifiers(env, env.deps.cosmosRouteRuntime.modifyEncounter(mod, zone, isBoss), zone);
}

function cosmosModifierBase(env, zone, isElite, isBoss) {
    let tag = String(zone.cosmosTag || '').trim();
    let sizeClass = Math.max(1, Math.min(5, Math.floor(zone.sizeClass || 1)));
    let gravity = Math.max(1, Number(zone.gravity || 1));
    let sizePressure = Math.max(0, sizeClass - 1);
    let gravityHarness = env.deps.cosmosGravityHarness;
    let gravityPressure = Math.max(0, gravity - 1) * Math.max(0.5, 1 - gravityHarness * 0.01);
    let bossMul = isBoss ? 1.35 : (isElite ? 1.12 : 1);
    let mod = {
        hpMul: 1 + sizePressure * 0.10 + gravityPressure * 0.13,
        damageMul: 1 + sizePressure * 0.025 + gravityPressure * 0.055,
        atkMul: 1 + gravityPressure * 0.035,
        attackSpeedMul: Math.max(0.72, 1 - gravityPressure * 0.018 + sizePressure * 0.012),
        dr: Math.floor(sizePressure * 2 + gravityPressure * 3),
        resAll: Math.floor(gravityPressure * 4),
        armorMul: 1 + sizePressure * 0.09 + gravityPressure * 0.08,
        evasionMul: 1 + Math.max(0, 3 - sizeClass) * 0.035,
        critChanceBonus: 0,
        penetration: Math.floor(gravityPressure * 2),
        regenMul: 1,
        ailmentChanceBonus: 0,
        firstHitGuard: 0,
        patternMode: null,
        traitName: env.deps._t('우주계:{tag} {sizeClass}등급/{gravity}g', { tag: tag || 'stellar', sizeClass, gravity: gravity.toFixed(1) })
    };
    return { mod, tag, bossMul };
}

const tagMods = {
    gateway: { resAll: 3, firstHitGuard: 0.08 },
    arcane: { resChaos: 8, penetration: 3 },
    cold: { resC: 14, attackSpeedMul: 0.94, ailmentChanceBonus: 0.04 },
    fire: { resF: 14, damageMul: 0.09, ailmentChanceBonus: 0.03 },
    hunt: { attackSpeedMul: 1.08, critChanceBonus: 5 },
    venom: { resChaos: 10, regenMul: 1.25, ailmentChanceBonus: 0.05 },
    relic: { armorMul: 1.16, dr: 4 },
    guard: { dr: 7, firstHitGuard: 0.14 },
    speed: { attackSpeedMul: 1.18, evasionMul: 1.18 },
    projectile: { penetration: 5, damageMul: 0.04 },
    map: { resAll: 5, evasionMul: 1.08 },
    seed: { regenMul: 1.45 },
    shield: { firstHitGuard: 0.20, resAll: 5 },
    loop: { attackSpeedMul: 1.08, hpMul: 0.08 },
    wealth: { dropMul: 1.08 },
    mirror: { evasionMul: 1.14, firstHitGuard: 0.10 },
    vital: { hpMul: 0.18, regenMul: 1.35 },
    crit: { critChanceBonus: 9 },
    belt: { armorMul: 1.12, resAll: 4 },
    gate: { penetration: 4, resChaos: 8 },
    bind: { attackSpeedMul: 0.92, dr: 5 },
    reflect: { firstHitGuard: 0.18, resAll: 4 },
    aoe: { damageMul: 0.10, hpMul: 0.08 },
    curse: { resChaos: 14, ailmentChanceBonus: 0.06 },
    charge: { atkMul: 0.12, penetration: 4 },
    chaos: { resChaos: 16, damageMul: 0.08 },
    warp: { attackSpeedMul: 1.12, evasionMul: 1.1 },
    asteroid: { armorMul: 1.08, dropMul: 1.04 },
    boss: { hpMul: 0.35, damageMul: 0.18, dr: 8, resAll: 8, penetration: 6, critChanceBonus: 7, firstHitGuard: 0.22, patternMode: 'cosmos' }
};

function applyCosmosTagModifiers(mod, tag) {
    let extra = tagMods[tag] || {};
    Object.keys(extra).forEach(key => {
        if (key === 'patternMode') mod.patternMode = extra[key];
        else if (key === 'traitName') mod.traitName = extra[key];
        else if (key === 'attackSpeedMul' || key === 'armorMul' || key === 'evasionMul' || key === 'regenMul' || key === 'dropMul') mod[key] = (mod[key] || 1) * extra[key];
        else mod[key] = (mod[key] || 0) + extra[key];
    });
}

function applyGalaxyEnvironment(env, mod, zone) {
    const galaxyEnvironment = Array.isArray(env.deps.cosmosGalaxyEnvironment)
        ? env.deps.cosmosGalaxyEnvironment.find(row => row && row.galaxy === Math.floor(zone.cosmosGalaxy || 0)) : null;
    Object.keys(galaxyEnvironment || {}).forEach(key => {
        if (['name', 'summary', 'counter', 'galaxy'].includes(key)) return;
        if (key === 'hybridElement') mod.hybridElement = galaxyEnvironment[key];
        else if (key === 'energyShieldPct') mod.energyShieldPct = Math.max(mod.energyShieldPct || 0, galaxyEnvironment[key]);
        else if (['attackSpeedMul', 'armorMul', 'evasionMul'].includes(key)) mod[key] = (mod[key] || 1) * galaxyEnvironment[key];
        else mod[key] = (mod[key] || 0) + galaxyEnvironment[key];
    });
}

function applyGalaxyBossModifiers(env, mod, zone, isBoss) {
    const galaxyBossMechanic = isBoss && typeof env.deps.getCosmosGalaxyBossMechanic === 'function'
        ? env.deps.getCosmosGalaxyBossMechanic(zone.cosmosNodeId) : null;
    if (galaxyBossMechanic) {
        mod.hpMul += 0.22;
        mod.damageMul += 0.08;
        mod.hpMul *= Math.max(0.5, Number(galaxyBossMechanic.hpScale || 1));
        mod.damageMul *= Math.max(0.2, Number(galaxyBossMechanic.damageScale || 1));
        mod.dr += 5;
        mod.resAll += 5;
        mod.penetration += 4;
        mod.critChanceBonus += 5;
        mod.patternMode = 'cosmosBoss';
        mod.traitName = env.deps._t('은하 보스: {name}', { name: galaxyBossMechanic.name });
    }
}

export function buildGetCosmosNonBossHpMultiplier(zone, isElite, isBoss) {
    if (isBoss) return 1;
    const galaxy = Math.max(1, Math.min(5, Math.floor(Number(zone && zone.cosmosGalaxy) || 1)));
    const galaxyMultiplier = 4 + (galaxy - 1) * 0.125;
    return galaxyMultiplier * (isElite ? 1.35 : 1);
}
