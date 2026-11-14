import { COSMOS_TRAIT_ARCHETYPES, COSMOS_BOSS_DEBUFF_SETS } from '../combat/enemy-spawn-values.mjs';

/** A cosmos zone's own enemy trait from its mechanic (scaled by rank, planet size and gravity), with a boss's debuffs; null elsewhere.
 * Each mechanic's fields in COSMOS_TRAIT_ARCHETYPES (2026-10-18, same fields in the same order). */
export function buildGetCosmosExclusiveEnemyTrait(env, zone, isElite, isBoss, seed) {
    if (!zone || zone.type !== 'cosmos') return null;
    const power = cosmosTraitPower(zone, isElite, isBoss);
    const mechanic = env.deps.cosmosRouteRuntime.mechanic(zone, isBoss, seed);
    if (!mechanic) return null;
    const archetype = mechanic.id;
    const trait = cosmosTraitRecord(archetype, isElite, isBoss);
    if (Object.hasOwn(COSMOS_TRAIT_ARCHETYPES, archetype)) COSMOS_TRAIT_ARCHETYPES[archetype](trait, { name: env.deps._t('우주계: {name}', { name: mechanic.name }), isBoss, power, seed });
    if (isBoss) {
        trait.bossDebuffs = (Object.hasOwn(COSMOS_BOSS_DEBUFF_SETS, archetype) ? COSMOS_BOSS_DEBUFF_SETS[archetype] : ['cosmos_res_down']).slice();
        trait.debuffPower = Math.min(1.7, power);
    }
    return trait;
}

function cosmosTraitPower(zone, isElite, isBoss) {
    const sizeClass = Math.max(1, Math.min(5, Math.floor(zone.sizeClass || 1)));
    const gravity = Math.max(1, Number(zone.gravity || 1));
    const rankPower = isBoss ? 1.45 : (isElite ? 1 : 0.72);
    return rankPower * (1 + Math.max(0, sizeClass - 1) * 0.06 + Math.max(0, gravity - 1) * 0.04);
}

function cosmosTraitRecord(archetype, isElite, isBoss) {
    return {
        id: `cosmos_${archetype}`,
        name: '',
        expMul: 1 + (isBoss ? 0.16 : (isElite ? 0.08 : 0.03)),
        dropMul: 1 + (isBoss ? 0.12 : (isElite ? 0.06 : 0.02)),
        bossDebuffs: []
    };
}

export function buildApplyCosmosExclusiveTraitToEnemy(enemy, trait) {
    if (!enemy || !trait) return;
    enemy.traitName = enemy.traitName ? `${enemy.traitName}, ${trait.name}` : trait.name;
    applyTraitDefences(enemy, trait);
    applyTraitHitGuards(enemy, trait);
    applyTraitCritAndPenetration(enemy, trait);
    applyTraitShieldAndDebuffs(enemy, trait);
}

function applyTraitDefences(enemy, trait) {
    if (Number.isFinite(trait.dr)) enemy.dr = Math.min(90, Math.max(0, enemy.dr + trait.dr));
    if (Number.isFinite(trait.resAll)) {
        enemy.resF = Math.min(95, enemy.resF + trait.resAll);
        enemy.resC = Math.min(95, enemy.resC + trait.resAll);
        enemy.resL = Math.min(95, enemy.resL + trait.resAll);
        enemy.resChaos = Math.min(95, enemy.resChaos + trait.resAll);
    }
    if (Number.isFinite(trait.armorMul)) enemy.armor = Math.floor(enemy.armor * Math.max(0.1, trait.armorMul));
    if (Number.isFinite(trait.evasionMul)) enemy.evasion = Math.floor(enemy.evasion * Math.max(0.1, trait.evasionMul));
}

function applyTraitHitGuards(enemy, trait) {
    if (Number.isFinite(trait.armorGuard)) enemy.armorGuard = Math.max(Number(enemy.armorGuard || 0), trait.armorGuard);
    if (Number.isFinite(trait.evasionChance)) enemy.evasionChance = Math.max(Number(enemy.evasionChance || 0), Math.min(78, trait.evasionChance));
    if (Number.isFinite(trait.hitRateGuard)) enemy.hitRateGuard = Math.max(Number(enemy.hitRateGuard || 0), trait.hitRateGuard);
    if (Number.isFinite(trait.comboTakenLessPct)) enemy.comboTakenLessPct = Math.max(Number(enemy.comboTakenLessPct || 0), trait.comboTakenLessPct);
}

function applyTraitCritAndPenetration(enemy, trait) {
    if (Number.isFinite(trait.critResistPct)) enemy.critResistPct = Math.max(Number(enemy.critResistPct || 0), trait.critResistPct);
    if (Number.isFinite(trait.critDamageResistPct)) enemy.critDamageResistPct = Math.max(Number(enemy.critDamageResistPct || 0), trait.critDamageResistPct);
    if (Number.isFinite(trait.penetration)) enemy.penetration = Math.max(Number(enemy.penetration || 0), Number(enemy.penetration || 0) + trait.penetration);
}

function applyTraitShieldAndDebuffs(enemy, trait) {
    if (Number.isFinite(trait.energyShieldPct)) {
        enemy.maxEnergyShield = Math.max(Math.floor(Number(enemy.maxEnergyShield || 0)), Math.floor((enemy.maxHp || 1) * trait.energyShieldPct / 100));
        enemy.energyShield = Math.max(Math.floor(Number(enemy.energyShield || 0)), enemy.maxEnergyShield);
    }
    if (Array.isArray(trait.bossDebuffs) && trait.bossDebuffs.length > 0) {
        enemy.cosmosBossDebuffs = trait.bossDebuffs.slice();
        enemy.cosmosBossDebuffPower = Math.max(1, Number(trait.debuffPower || 1));
    }
}
