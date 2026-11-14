import { clampNumber } from '../common/numbers.mjs';
import { buildGetZoneDefenseVariance, buildGetBossDefenseTargets, buildGetZoneElementWardProfile } from '../combat/enemy-spawn-wards.mjs';
import { buildGetLoopDefenseScale } from '../domain/enemy-loop-difficulty.mjs';
import { buildByEnemyRank } from '../domain/enemy-spawn-bonuses.mjs';
import { buildApplyCosmosExclusiveTraitToEnemy } from '../combat/cosmos-enemy-traits.mjs';

/** Damage reduction and resistances climb the tier curve to their tier-20 value (bosses specialise in one or two,
 * getBossDefenseTargets); armour and evasion follow the tier and loop. */
export function buildGetEnemyDefence(env, zone, ctx) {
    const { enemyEle, isBoss, isElite, wispDefense } = ctx;
    const zoneProgress = clampNumber(((zone.tier || 1) - 1) / 19, 0, 1);
    const curved = zoneProgress * zoneProgress;
    const variance = buildGetZoneDefenseVariance(env, zone);
    const defenseRamp = clampNumber(curved + variance, 0, 1);
    const bossTargets = isBoss ? buildGetBossDefenseTargets(env, zone, enemyEle) : null;
    const rankDefense = env.deps.ENEMY_DEFENSE_TIER20[isElite ? 'elite' : 'normal'];
    const rampTo = (floor, target) => floor + Math.floor(Math.max(0, target - floor) * defenseRamp);
    const drBase = isBoss ? rampTo(10, bossTargets.dr) : rampTo(0, rankDefense.dr);
    const resistBase = rampTo(5, rankDefense.res);
    const resistBases = isBoss ? { resF: rampTo(15, bossTargets.resF), resC: rampTo(15, bossTargets.resC), resL: rampTo(15, bossTargets.resL) }
        : { resF: resistBase, resC: resistBase, resL: resistBase };
    const chaosResBase = isBoss ? rampTo(15, bossTargets.resChaos) : resistBase;
    return { drBase, resistBases, chaosResBase, ...buildGetEnemyArmourAndEvasion(zone, ctx.loopInputs, { isBoss, isElite, wispDefense }) };
}

export function buildGetEnemyArmourAndEvasion(zone, loopInputs, rank) {
    const defenseTierScale = Math.min(1.9, 0.6 + zone.tier * 0.08);
    const defenseLoopScale = buildGetLoopDefenseScale(loopInputs.loopCount);
    const baseArmor = Math.floor((18 + zone.tier * 26) * defenseTierScale * defenseLoopScale * buildByEnemyRank(rank, [2.2, 1.6, 1]) * rank.wispDefense.armorMul);
    const baseEvasion = Math.floor((16 + zone.tier * 24) * defenseTierScale * defenseLoopScale * buildByEnemyRank(rank, [2.1, 1.5, 1]));
    return { baseArmor, baseEvasion: Math.floor(baseEvasion * rank.wispDefense.evasionMul) };
}

/** The boundary's bonuses, the zone's element ward, the pattern preview, cosmos modifiers, 아스트라's base, the exclusive trait
 * and the woodsman. */
export function buildApplySpawnDefences(env, enemy, zone, spawn) {
    const { cosmosMods, cosmosExclusiveTrait } = spawn.mods;
    buildApplyBoundaryDefenceToEnemy(enemy, zone);
    buildApplyZoneElementWard(env, enemy, zone);
    if (typeof env.deps.refreshBossPatternPreview === 'function') env.deps.refreshBossPatternPreview(enemy);
    if (cosmosMods) buildApplyCosmosModsToEnemy(enemy, zone, cosmosMods, spawn.isBoss);
    if (zone.id === 'cosmos_astra' && spawn.isBoss) {
        enemy.astraBase = {
            dr: enemy.dr, armor: enemy.armor, evasion: enemy.evasion,
            resF: enemy.resF, resC: enemy.resC, resL: enemy.resL, resChaos: enemy.resChaos,
            penetration: enemy.penetration, critChance: enemy.critChance,
            atkMul: enemy.atkMul, attackSpeedVar: enemy.attackSpeedVar, regenRate: enemy.regenRate
        };
    }
    buildApplyCosmosExclusiveTraitToEnemy(enemy, cosmosExclusiveTrait);
    if (enemy.cosmosBossId && typeof env.deps.refreshBossPatternPreview === 'function') env.deps.refreshBossPatternPreview(enemy);
    if (zone.type === 'outsideChaos') buildApplyWoodsmanToEnemy(enemy);
}

export function buildApplyBoundaryDefenceToEnemy(enemy, zone) {
    if (zone.type !== 'beyondBoundary') return;
    enemy.dr = Math.min(90, enemy.dr + Math.max(0, Number(zone.boundaryDrBonus) || 0));
    enemy.penetration += Math.max(0, Number(zone.boundaryPenetrationBonus) || 0);
}

export function buildApplyZoneElementWard(env, enemy, zone) {
    const zoneWard = buildGetZoneElementWardProfile(env, zone);
    if (!zoneWard) return;
    if (zoneWard.elem === 'fire') enemy.resF = Math.min(95, enemy.resF + zoneWard.strength);
    else if (zoneWard.elem === 'cold') enemy.resC = Math.min(95, enemy.resC + zoneWard.strength);
    else if (zoneWard.elem === 'light') enemy.resL = Math.min(95, enemy.resL + zoneWard.strength);
}

/** A cosmos encounter's modifiers: defences, armour and evasion, drops, its cosmos marks, a hybrid element, an energy shield and
 * the trait name. Shared encounter modifiers can adjust stats without adding a named trait. */
export function buildApplyCosmosModsToEnemy(enemy, zone, cosmosMods, isBoss) {
    const resAll = cosmosMods.resAll || 0;
    enemy.dr = Math.min(90, Math.max(0, enemy.dr + (cosmosMods.dr || 0)));
    for (const key of ['resF', 'resC', 'resL', 'resChaos']) enemy[key] = Math.min(95, enemy[key] + resAll + (cosmosMods[key] || 0));
    enemy.armor = Math.floor(enemy.armor * (cosmosMods.armorMul || 1));
    enemy.evasion = Math.floor(enemy.evasion * (cosmosMods.evasionMul || 1));
    enemy.dropMul *= cosmosMods.dropMul || 1;
    buildMarkCosmosEnemy(enemy, zone, isBoss);
    if (cosmosMods.hybridElement) enemy.hybridElement = cosmosMods.hybridElement;
    if (cosmosMods.energyShieldPct) buildGiveEnemyEnergyShield(enemy, cosmosMods.energyShieldPct);
    enemy.traitName = [enemy.traitName, cosmosMods.traitName].filter(Boolean).join(', ');
}

export function buildMarkCosmosEnemy(enemy, zone, isBoss) {
    enemy.cosmosTag = zone.cosmosTag || '';
    enemy.cosmosSizeClass = Math.max(1, Math.floor(zone.sizeClass || 1));
    enemy.cosmosGravity = Math.max(1, Number(zone.gravity || 1));
    enemy.cosmosBossId = isBoss ? zone.cosmosNodeId || null : null;
    enemy.cosmosBaseElement = zone.ele || enemy.ele || 'phys';
}

/** An energy shield of pct% of the monster's life, kept when it already has a larger one, and full. */
export function buildGiveEnemyEnergyShield(enemy, pct) {
    enemy.maxEnergyShield = Math.max(enemy.maxEnergyShield || 0, Math.floor(enemy.maxHp * pct / 100));
    enemy.energyShield = Math.max(enemy.energyShield || 0, enemy.maxEnergyShield);
}

/** 혼돈 밖의 나무꾼: freeze resistance, heavier defences with its resistance bases kept, the armour guard and an evasion chance. */
export function buildApplyWoodsmanToEnemy(enemy) {
    enemy.ailResFreeze = Math.max(Number(enemy.ailResFreeze || 0), 50);
    enemy.isWoodsman = true;
    enemy.dr = Math.max(50, enemy.dr + 8);
    enemy.maxResCap = 85;
    enemy.baseResF = enemy.resF;
    enemy.baseResC = enemy.resC;
    enemy.baseResL = enemy.resL;
    enemy.baseResChaos = enemy.resChaos;
    enemy.armor = Math.floor(enemy.armor * 1.35);
    enemy.evasion = Math.floor(enemy.evasion * 1.3);
    enemy.armorGuard = Math.max(Number(enemy.armorGuard || 0), 0.12);
    enemy.evasionChance = Math.max(Number(enemy.evasionChance || 0), 12);
}
