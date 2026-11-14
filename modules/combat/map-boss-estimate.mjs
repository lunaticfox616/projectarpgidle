import { buildGetCosmosExclusiveEnemyTrait } from '../combat/cosmos-enemy-traits.mjs';
import { buildGetCosmosEnemyModifiers } from '../combat/cosmos-enemy-modifiers.mjs';
import { buildGetSoftenedLoopDepth, buildGetLoopDifficultyInputs, buildGetMonsterLoopHpMultiplier, buildGetBossHpEase, buildGetMonsterLoopGrowthScale, buildGetMonsterLoopPowerScale } from '../domain/enemy-loop-difficulty.mjs';
import { clampNumber } from '../common/numbers.mjs';
import { buildGetEntryBossTuning, buildResolveMapEstimateContentScale } from '../domain/enemy-content-difficulty.mjs';
import { effectGetMapEstimateThreatProfile, effectGetMapEstimateThreatMods, effectGetMapEstimateDamageElements, effectGetMapEstimateZonePenalties } from '../combat/map-threat-estimate.mjs';
import { effectGetAtlasPackReadiness } from '../combat/atlas-pack-estimate.mjs';
import { effectGetChaosBossElements } from '../combat/encounter-elements.mjs';

/**
 * 지도 카드에 표시할 대략적인 보스전 기준치다.
 * @param {{type:string,tier:number,id:(number|string),ele?:string}} zone
 * @returns {{dps:number,ehp:number,element:string,clearTimeSec:number,basis:string}|null}
 */
/** The power a zone asks for (its boss's life against the clear time, the boss threat window, peak hit, resistance pressure), for
 * the map and atlas readiness; null for kinds it cannot estimate. Split into its parts on 2026-10-18; the products keep their order. */
export function effectEstimateMapZonePowerRequirements(env, zone) {
    const supportedTypes = ['act', 'abyss', 'labyrinth', 'underworld', 'chaosRealm', 'oceanDepth', 'skyTower', 'seasonBoss', 'timeRift', 'meteor', 'beehive', 'colony', 'grandBreach', 'trial', 'cosmos', 'beyondBoundary', 'atlasMap'];
    if (!zone || !supportedTypes.includes(zone.type)) return null;
    let tier = Math.max(1, Number(env.deps.levelProgression.combatZone(zone).tier) || 1);
    let loopInputs = buildGetLoopDifficultyInputs(env, zone);
    let seasonDepth = buildGetSoftenedLoopDepth(loopInputs.seasonLoops);
    let tierProgress = clampNumber((tier - 1) / 18, 0, 1);
    let hp = effectGetMapEstimateMonsterHp(env, zone, tier, loopInputs, tierProgress);
    let abyssScale = env.deps.getAbyssMonsterScales(zone);
    let contentScale = buildResolveMapEstimateContentScale(env, zone);
    const { bossMods, cosmosTrait } = effectGetMapEstimateBossMods(env, zone);
    const entryTuning = buildGetEntryBossTuning(zone, true);
    const parts = { hp, tier, tierProgress, loopInputs, seasonDepth, abyssScale, contentScale, bossMods, cosmosTrait, entryTuning };
    let bossHp = effectGetMapEstimateBossHp(env, zone, parts);
    let bossHit = effectGetMapEstimateBossHit(env, zone, parts);
    const threat = effectGetMapEstimateThreatProfile(env, zone, effectGetMapEstimateThreatMods(bossMods, cosmosTrait), { baseHit: bossHit, seasonDepth, tier });
    return effectGetAtlasPackReadiness(env, zone, hp, {
        dps: Math.max(1, Math.round(env.deps.getMapBossRequiredDps(bossHp, contentScale.clearTimeSec, zone.boundaryRegenRate))),
        ehp: Math.max(1, Math.round(threat.threatWindow)),
        peakHit: Math.max(1, Math.round(threat.peakHit)),
        resistancePressure: threat.resistancePressure,
        elements: effectGetChaosBossElements(env, zone) || effectGetMapEstimateDamageElements(env, zone),
        playerDpsMultiplier: 1,
        ...effectGetMapEstimateZonePenalties(zone),
        zoneId: zone.id,
        element: String(zone.ele || 'phys'),
        clearTimeSec: contentScale.clearTimeSec,
        basis: 'bossThreatWindow'
    });
}

/** A normal monster's life at the zone's tier and loop (a fixed-difficulty zone by its scale). */
export function effectGetMapEstimateMonsterHp(env, zone, tier, loopInputs, tierProgress) {
    let hp = ((56 + tier * 30) * 1.15)
        * (1 + tierProgress * 9)
        * buildGetMonsterLoopHpMultiplier(env, zone, loopInputs, tierProgress);
    if (loopInputs.exempt) hp *= Number(zone.fixedDifficultyMul) || 1;
    return hp;
}

/** The zone's boss modifiers (a cosmos encounter's, else the zone's own) and a cosmos boss's exclusive trait. */
export function effectGetMapEstimateBossMods(env, zone) {
    let bossMods = (zone.bossMods && typeof zone.bossMods === 'object') ? zone.bossMods : {};
    if (zone.type === 'cosmos') bossMods = buildGetCosmosEnemyModifiers(env, zone, false, true) || bossMods;
    let cosmosTrait = zone.type === 'cosmos' ? buildGetCosmosExclusiveEnemyTrait(env, zone, false, true, env.deps.hashSeed(zone.cosmosNodeId || zone.id)) : null;
    return { bossMods, cosmosTrait };
}

/** The boss's life with its energy shield, the underworld entry tuning and trial 3's 85%. */
export function effectGetMapEstimateBossHp(env, zone, p) {
    const { hp, tier, tierProgress, loopInputs, contentScale, bossMods, cosmosTrait } = p;
    const k = effectGetMapEstimateBossHpFactors(zone, p);
    let bossHp = hp * (1.8 + tier * 0.6) * (1 + tierProgress * 4) * buildGetBossHpEase(env, tier, buildGetMonsterLoopHpMultiplier(env, zone, loopInputs, tierProgress))
        * k.abyssHp * k.abyssBoss * 0.92
        * contentScale.hp * k.modHp * k.mapHp
        * k.traitHp;
    let estimateEnergyShieldPct = Math.max(Number(bossMods.energyShieldPct || 0), Number(cosmosTrait && cosmosTrait.energyShieldPct || 0));
    if (estimateEnergyShieldPct > 0) bossHp *= 1 + estimateEnergyShieldPct / 100;
    bossHp *= p.entryTuning.hp;
    if (zone.type === 'trial' && zone.id === 'trial_3') bossHp *= 0.85;
    return bossHp;
}

/** The boss's hit: tier and loop growth, the abyss, content, modifier and map scales, the early-act ease from loop 3, the underworld
 * entry tuning and the loop power scale. */
export function effectGetMapEstimateBossHit(env, zone, p) {
    const { tier, seasonDepth, contentScale } = p;
    let tierPressure = clampNumber((tier - 1) / 10, 0, 1);
    const k = effectGetMapEstimateBossHitFactors(zone, p);
    let bossHit = (2.4 + tier * 3.35) * 1.15
        * buildGetMonsterLoopGrowthScale(env, zone, 'damage', seasonDepth, tierPressure)
        * (1.14 + tier * 0.16) * 1.34
        * k.abyssDmg * k.abyssTaken * k.abyssBoss
        * contentScale.damage * k.modDmg * k.mapDmg
        * k.traitDmg;
    if (zone.type === 'act' && Number(zone.id) <= 1 && (env.owner.season || 1) >= 3) bossHit *= 0.58;
    bossHit *= p.entryTuning.damage * buildGetMonsterLoopPowerScale(env, zone, 'damage');
    return bossHit;
}

/** The boss life's scales that default to 1: the abyss life and boss scales, the modifiers' and map's life, a cosmos trait's life. */
export function effectGetMapEstimateBossHpFactors(zone, p) {
    const { abyssScale, bossMods, cosmosTrait } = p;
    return { abyssHp: abyssScale.hpMul || 1, abyssBoss: abyssScale.bossMul || 1, modHp: bossMods.hpMul || 1, mapHp: zone.mapHpMul || 1,
        traitHp: cosmosTrait && cosmosTrait.hpMul ? cosmosTrait.hpMul : 1 };
}

/** The boss hit's scales that default to 1: the abyss damage, taken and boss scales, the modifiers' and map's damage, a cosmos trait's
 * damage. */
export function effectGetMapEstimateBossHitFactors(zone, p) {
    const { abyssScale, bossMods, cosmosTrait } = p;
    return { abyssDmg: abyssScale.dmgMul || 1, abyssTaken: abyssScale.playerTakenMul || 1, abyssBoss: abyssScale.bossMul || 1, modDmg: bossMods.damageMul || 1,
        mapDmg: zone.mapDamageMul || 1, traitDmg: cosmosTrait && cosmosTrait.damageMul ? cosmosTrait.damageMul : 1 };
}
