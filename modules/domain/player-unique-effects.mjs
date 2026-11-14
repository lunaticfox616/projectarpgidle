import { addStatToBucket } from '../common/stat-bucket.mjs';

// Defaults are primitives; every evaluation owns its effect records and modifies only its caller's reward bucket.
const DEFAULT_EFFECTS = Object.freeze({
    uniqueXpGainPct: 0, uniqueFlatDmgPerLevel: 0, uniqueEsAmpPct: 0,
    uniqueShockInvertTaken: false, uniqueAlwaysShock: false, uniqueProjectileDoubleStrikePct: 0,
    uniqueChaosResDownOnHit: null, uniqueCorpseExplode: null, uniqueInstantLeechPct: 0,
    uniqueDoubleDamageChancePct: 0, uniqueEsRecoverOnCritPct: 0, uniqueRiderCompass: false,
    uniqueMaxRollBonusHit: false, uniqueCeilingSmashDouble: false, uniqueMinRollEqualsMaxRoll: false,
    uniqueHpToPhysPct: false, uniqueImmuneIgnite: false, uniqueFateTwinRollSync: false,
    uniqueFrostSentinel: false, uniqueShockTracer: null, uniqueVenomStride: null,
    uniqueBleedBlockHelm: false, uniqueImmuneBleed: false, uniqueImmuneFreeze: false,
    uniqueCurseCrownPerCursePct: 0, uniqueWarcryResonancePct: 0, uniqueConditionManual: null,
    uniqueStackingElementalResDownOnHit: null, uniqueBleedingEnemyDamageMorePct: 0, uniqueRiftWaveOnHit: null,
    uniqueChaosDamageInstantLeechPct: 0, uniqueInvulnerableBarrierOnHit: null, uniquePoisonDurationPct: 0,
    uniqueArmorToPhysicalDamagePctPer1000: 0, uniqueDeathWard: null, uniqueAllResDownOnHit: null,
    uniqueKillMoveStacks: null, uniqueCursedTakenAndRefresh: null, uniqueEnemyRegenCutAndMinRoll: null,
    uniquePhysDrHalfTakenAsMore: null, uniqueArmorAppliesToDot: false, uniqueMeleeArmorAmp: null,
    uniquePursuitMovePct: 0, uniqueRepelMelee: null, uniqueResonanceAndSuppCap: null,
    uniqueRegenRateAndRegen: null, uniqueMaxHpPct: 0, uniqueAllMaxRes: 0,
    uniqueLeechEfficiencyOnKill: null, uniqueOverkillSplash: false, uniqueDragonVeinGuard: null,
    uniqueGuardianArmor: null, uniqueStealEliteTrait: null, fixedAllMaxRes: null,
    cosmosAlwaysFirstHit: false, cosmosEnergyShieldBypassPct: 0, cosmosOrbitCycle: null,
    cosmosDeepSeaLeechCaps: null, cosmosTideEsRegenToLife: false, cosmosEqualDamageSplit: false,
    cosmosBalanceMitigation: false, cosmosTwinStarResonance: null, cosmosJudgmentLightning: null,
    cosmosDeathResistPct: 0, cosmosVerdictSupportDamagePct: 0, cosmosGuardianConditionInstant: false,
    cosmosBossDamageMorePct: 0, cosmosCometChillNoFreeze: false, uniqueQueenBeeSummon: null,
    uniqueBleedWeightOnBleedingHit: false, uniqueGrandBreachCrown: null, uniqueLabyrinthShackles: false,
    uniqueMeteorFootsteps: null, uniqueRollGapDamage: false, uniqueRollGapCritDs: false,
    uniqueCrowdEvasionMore: null, uniqueFewEnemyEvasionMore: null, uniqueEsToLightPct: false,
    uniqueUnderdogMorePct: 0, uniqueInstakillNormalPct: 0, uniqueProjExtraShotChance: null,
    projectilePatternEffect: null, uniqueEvasionDance: null, uniqueLoneEvasionCounter: null,
    uniqueCritAdvanceEsRecharge: null, uniqueEnergyShieldBreakRecharge: null, uniqueSummonDeathDamageBuff: null,
    uniqueSummonCritAspdStacks: null, uniqueSummonNonCritNoDamage: false, uniqueBlockRecoverEnergyShieldPct: 0,
    uniqueBlockedDamageTakenPct: 0, uniqueDeflectStealth: null, uniqueChaosTakenDamageReducePct: 0,
    uniqueLifeRecoupTakenDamage: null, uniqueOverhealCapPct: 0,
});

const EFFECTS = Object.freeze({
    "xpGainPct": (result, context, ep) => { result.uniqueXpGainPct += Number(ep.pct || 0); },
    "flatDmgPerLevel": (result, context, ep) => { result.uniqueFlatDmgPerLevel += Number(ep.perLevel || 0); },
    "esAmpAndRecoverOnCrit": (result, context, ep) => { result.uniqueEsAmpPct = Math.max(result.uniqueEsAmpPct, Number(ep.ampPct ?? 50)); result.uniqueEsRecoverOnCritPct = Math.max(result.uniqueEsRecoverOnCritPct, Number(ep.recoverPctOnCrit || 2)); },
    "invertShockTaken": (result) => { result.uniqueShockInvertTaken = true; },
    "alwaysShock": (result) => { result.uniqueAlwaysShock = true; },
    "projectileDoubleStrikePct": (result, context, ep) => { result.uniqueProjectileDoubleStrikePct += Number(ep.pct || 100); },
    "projectilePatternMode": (result, context, ep, effect, deps) => {
        if (!(deps.projectilePatterns[ep.mode] && !result.projectilePatternEffect)) return;
        result.projectilePatternEffect = {
            mode: ep.mode,
            source: effect.itemName ? deps.translate('{itemName} (고유 장비)', { itemName: effect.itemName }) : '재능',
            damageMultiplier: Number.isFinite(Number(ep.damageMultiplier)) ? Number(ep.damageMultiplier) : null
        };
    },
    "hitApplyChaosResDown": (result, context, ep, effect, deps) => { result.uniqueChaosResDownOnHit = deps.mergeParams(result.uniqueChaosResDownOnHit, { perHit: Number(ep.perHit || 3), maxStacks: Number(ep.maxStacks || 10) }); },
    "corpseExplodeOnKill": (result, context, ep, effect, deps) => { result.uniqueCorpseExplode = deps.mergeParams(result.uniqueCorpseExplode, { chance: Number(ep.chance || 15), lifePct: Number(ep.lifePct || 25) }); },
    "instantLeechAndDoubleDamage": (result, context, ep) => { result.uniqueInstantLeechPct += Number(ep.instantLeechPct || 25); result.uniqueDoubleDamageChancePct += Number(ep.doubleDamageChance || 20); },
    "riderCompass": (result) => { result.uniqueRiderCompass = true; },
    "maxRollBonusHit": (result) => { result.uniqueMaxRollBonusHit = true; },
    "ceilingSmashDouble": (result) => { result.uniqueCeilingSmashDouble = true; },
    "minRollEqualsMaxRoll": (result) => { result.uniqueMinRollEqualsMaxRoll = true; },
    "hpToPhysPct": (result) => { result.uniqueHpToPhysPct = true; },
    "immuneIgnite": (result) => { result.uniqueImmuneIgnite = true; },
    "fateTwinRollSync": (result) => { result.uniqueFateTwinRollSync = true; },
    "frostSentinelBoots": (result) => { result.uniqueFrostSentinel = true; },
    "shockTracerGreaves": (result, context, ep, effect, deps) => { result.uniqueShockTracer = deps.mergeParams(result.uniqueShockTracer, { shockEffectPct: Number(ep.shockEffectPct || 25), strikeDamagePct: Number(ep.strikeDamagePct || 500), icdSec: Number(ep.icdSec || 0.5) }); },
    "venomStride": (result, context, ep) => { result.uniqueVenomStride = result.uniqueVenomStride || { poisonMorePct: 0, poisonExtraStack: 0 };
            result.uniqueVenomStride.poisonMorePct = Math.max(result.uniqueVenomStride.poisonMorePct, Number(ep.poisonMorePct ?? 30));
            result.uniqueVenomStride.poisonExtraStack = Math.max(result.uniqueVenomStride.poisonExtraStack, Number(ep.poisonExtraStack ?? 1));
            addStatToBucket(context.reward, 'poisonDamageMultiplierPct', Number(ep.poisonMorePct ?? 30)); },
    "bleedBlockHelm": (result) => { result.uniqueBleedBlockHelm = true; },
    "curseCrown": (result, context, ep) => { addStatToBucket(context.reward, 'curseCap', Number(ep.extraCurseCap || 1)); result.uniqueCurseCrownPerCursePct = Math.max(result.uniqueCurseCrownPerCursePct, Number(ep.finalDmgPerCursePct || 6)); },
    "warcryResonanceBelt": (result, context, ep) => { result.uniqueWarcryResonancePct = Math.max(result.uniqueWarcryResonancePct, Number(ep.perWarcryAmpPct || 20)); },
    "conditionManual": (result, context, ep) => { result.uniqueConditionManual = { durationPct: Number(ep.durationPct || 100), cdrPct: Number(ep.cdrPct || 20) }; },
    "stackingElementalResDownOnHit": (result, context, ep, effect, deps) => { result.uniqueStackingElementalResDownOnHit = deps.mergeParams(result.uniqueStackingElementalResDownOnHit, { perHit: Number(ep.perHit || 2), max: Number(ep.max || 20) }); },
    "leechEfficiencyOnKill": (result, context, ep, effect, deps) => { result.uniqueLeechEfficiencyOnKill = deps.mergeParams(result.uniqueLeechEfficiencyOnKill, { duration: Number(ep.duration || 8), efficiencyPct: Number(ep.efficiencyPct || 100) }); },
    "overkillSplash": (result) => { result.uniqueOverkillSplash = true; },
    "dragonVeinGuard": (result, context, ep, effect, deps) => { result.uniqueDragonVeinGuard = deps.mergeParams(result.uniqueDragonVeinGuard, { chance: Number(ep.chance || 20), duration: Number(ep.duration || 2), hpPct: Number(ep.hpPct || 8) }); },
    "guardianArmor": (result, context, ep, effect, deps) => { result.uniqueGuardianArmor = deps.mergeParams(result.uniqueGuardianArmor, { takenLessPct: Number(ep.takenLessPct || 8), bossTakenLessPct: Number(ep.bossTakenLessPct || 12) }); },
    "queenBeeSummonOnHit": (result, context, ep) => { result.uniqueQueenBeeSummon = { chance: Number(ep.chance || 8), hitPct: Number(ep.hitPct || 125), attacks: Number(ep.attacks || 3), maxBees: Number(ep.maxBees || 10) }; },
    "bleedWeightOnBleedingHit": (result) => { result.uniqueBleedWeightOnBleedingHit = true; },
    "grandBreachCrown": (result, context, ep) => { result.uniqueGrandBreachCrown = { spellFromEsPct: Number(ep.spellFromEsPct || 10), esPct: Number(ep.esPct || 30) }; },
    "labyrinthShackles": (result) => { result.uniqueLabyrinthShackles = true; },
    "rollGapDamagePct": (result) => { result.uniqueRollGapDamage = true; },
    "rollGapCritAndDs": (result) => { result.uniqueRollGapCritDs = true; },
    "crowdEvasionMore": (result, context, ep) => { result.uniqueCrowdEvasionMore = { minEnemies: Number(ep.minEnemies || 10), morePct: Number(ep.morePct || 100) }; },
    "fewEnemyEvasionMore": (result, context, ep, effect, deps) => { result.uniqueFewEnemyEvasionMore = deps.mergeParams(result.uniqueFewEnemyEvasionMore, { minEnemies: Number(ep.minEnemies || 1), maxEnemies: Number(ep.maxEnemies || 2), morePct: Number(ep.morePct || 45) }); },
    "evasionDanceOnEvade": (result, context, ep, effect, deps) => { result.uniqueEvasionDance = deps.mergeParams(result.uniqueEvasionDance, { maxStacks: Number(ep.maxStacks || 4), evasionPctPerStack: Number(ep.evasionPctPerStack || 4), movePerStack: Number(ep.movePerStack || 2), duration: Number(ep.duration || 4) }); },
    "loneEvasionCounter": (result, context, ep, effect, deps) => { result.uniqueLoneEvasionCounter = deps.mergeParams(result.uniqueLoneEvasionCounter, { maxEnemies: Number(ep.maxEnemies || 2), damageMorePct: Number(ep.damageMorePct || 20), duration: Number(ep.duration || 3) }); },
    "critAdvanceEnergyShieldRecharge": (result, context, ep) => { result.uniqueCritAdvanceEsRecharge = { advanceSec: Number(ep.advanceSec || 0.25), cooldownSec: Number(ep.cooldownSec || 0.6) }; },
    "energyShieldBreakRecharge": (result, context, ep) => { result.uniqueEnergyShieldBreakRecharge = { duration: Number(ep.duration || 3), cooldown: Number(ep.cooldown || 12) }; },
    "esToLightPct": (result) => { result.uniqueEsToLightPct = true; },
    "underdogNonMaxRollMorePct": (result, context, ep) => { result.uniqueUnderdogMorePct = Math.max(result.uniqueUnderdogMorePct, Number(ep.pct || 20)); },
    "instakillNormalOnHitPct": (result, context, ep) => { result.uniqueInstakillNormalPct = Math.max(result.uniqueInstakillNormalPct, Number(ep.pct || 5)); },
    "projectileExtraShotChance": (result, context, ep, effect, deps) => { result.uniqueProjExtraShotChance = deps.mergeParams(result.uniqueProjExtraShotChance, { chance: Number(ep.chance || 10), shots: Number(ep.shots || 2) }); },
    "realmBleedingEnemyDamageMore": (result, context, ep) => { result.uniqueBleedingEnemyDamageMorePct = Math.max(result.uniqueBleedingEnemyDamageMorePct, Number(ep.morePct || 22)); },
    "realmRiftWaveOnHit": (result, context, ep, effect, deps) => { result.uniqueRiftWaveOnHit = deps.mergeParams(result.uniqueRiftWaveOnHit, { chance: Number(ep.chance || 12), damagePct: Number(ep.damagePct || 80) }); },
    "realmChaosDamageInstantLeech": (result, context, ep) => { result.uniqueChaosDamageInstantLeechPct = Math.max(result.uniqueChaosDamageInstantLeechPct, Number(ep.pct || 8)); },
    "realmInvulnerableBarrierOnHit": (result, context, ep) => { result.uniqueInvulnerableBarrierOnHit = { chance: Number(ep.chance || 10), duration: Number(ep.duration || 1.5) }; },
    "realmPoisonDuration": (result, context, ep) => { result.uniquePoisonDurationPct = Math.max(result.uniquePoisonDurationPct, Number(ep.durationPct || 35)); },
    "realmArmorToPhysicalDamage": (result, context, ep) => { result.uniqueArmorToPhysicalDamagePctPer1000 = Math.max(result.uniqueArmorToPhysicalDamagePctPer1000, Number(ep.pctPer1000 || 3)); },
    "realmDeathWard": (result, context, ep, effect, deps) => { result.uniqueDeathWard = deps.mergeParams(result.uniqueDeathWard, { hpPct: Number(ep.hpPct || 12), cooldown: Number(ep.cooldown || 20) }); },
    "realmAllResDownOnHit": (result, context, ep) => { result.uniqueAllResDownOnHit = { perHit: Number(ep.perHit || 5), max: Number(ep.max || 4), duration: Number(ep.duration || 5) }; },
    "realmKillMoveStacks": (result, context, ep, effect, deps) => { result.uniqueKillMoveStacks = deps.mergeParams(result.uniqueKillMoveStacks, { movePerStack: Number(ep.movePerStack || 10), maxStacks: Number(ep.maxStacks || 20), duration: Number(ep.duration || 20), cooldownSec: Number(ep.cooldownSec || 1) }); },
    "realmCursedTakenAndRefresh": (result, context, ep) => { result.uniqueCursedTakenAndRefresh = { takenMul: Number(ep.takenMul || 1.1), refreshSec: Number(ep.refreshSec || 4) }; },
    "realmEnemyRegenCutAndMinRoll": (result, context, ep) => { result.uniqueEnemyRegenCutAndMinRoll = { enemyRegenRateMul: Number(ep.enemyRegenRateMul || 0.5), minRoll: Number(ep.minRoll || 10) }; },
    "realmPhysDrHalfTakenAsMore": (result, context, ep) => { result.uniquePhysDrHalfTakenAsMore = { ratio: Number(ep.ratio || 0.5) }; },
    "realmArmorAppliesToDot": (result) => { result.uniqueArmorAppliesToDot = true; },
    "realmMeleeArmorAmp": (result, context, ep, effect, deps) => { result.uniqueMeleeArmorAmp = deps.mergeParams(result.uniqueMeleeArmorAmp, { ampPct: Number(ep.ampPct || 5), maxStacks: Number(ep.maxStacks || 3), duration: Number(ep.duration || 2) }); },
    "realmRepelMelee": (result, context, ep, effect, deps) => { result.uniqueRepelMelee = deps.repelParams(ep); },
    "realmResonanceAndSuppCap": (result, context, ep) => { result.uniqueResonanceAndSuppCap = { resonancePower: Number(ep.resonancePower || 150), suppCap: Number(ep.suppCap || 3) }; },
    "realmRegenRateAndRegen": (result, context, ep, effect, deps) => { result.uniqueRegenRateAndRegen = deps.mergeParams(result.uniqueRegenRateAndRegen, { regenRatePct: Number(ep.regenRatePct || 25), regen: Number(ep.regen || 2) }); },
    "realmMaxHpPct": (result, context, ep) => { result.uniqueMaxHpPct += Number(ep.pctHp || 35); },
    "realmAllMaxRes": (result, context, ep) => { result.uniqueAllMaxRes += Number(ep.maxRes || 3); },
    "meteorFootsteps": (result, context, ep) => { result.uniqueMeteorFootsteps = { chance: Number(ep.chance || 20), damagePct: Number(ep.damagePct || 180) }; },
    "summonCapBonus": (result, context, ep) => { addStatToBucket(context.reward, 'summonCap', Number(ep.cap || 1)); },
    "summonEfficiencyBonus": (result, context, ep) => { addStatToBucket(context.reward, 'summonEfficiency', Number(ep.pct || 10)); },
    "rightRingSummonCap": (result, context, ep, effect) => { if (effect.sourceSlot === '반지2') addStatToBucket(context.reward, 'summonCap', Number(ep.cap || 1)); },
    "summonDeathDamageBuff": (result, context, ep) => { result.uniqueSummonDeathDamageBuff = { pct: Number(ep.pct || 40), duration: Number(ep.duration || 4) }; },
    "summonCritAspdStacks": (result, context, ep) => { result.uniqueSummonCritAspdStacks = { aspd: Number(ep.aspd || 10), maxStacks: Number(ep.maxStacks || 3), duration: Number(ep.duration || 4) }; },
    "summonNonCritNoDamage": (result) => { result.uniqueSummonNonCritNoDamage = true; },
    "genericTakenDamageReducePct": (result, context, ep) => { addStatToBucket(context.reward, 'genericTakenDamageReducePct', Number(ep.pct || 0)); },
    "uniqueBlockChance": (result, context, ep) => { addStatToBucket(context.reward, 'blockChance', Number(ep.chance || 0)); },
    "uniqueDeflectDamageReduce": (result, context, ep) => { addStatToBucket(context.reward, 'deflectDamageReduce', Number(ep.pct || 0)); },
    "blockRecoverEnergyShieldPct": (result, context, ep) => { result.uniqueBlockRecoverEnergyShieldPct = Math.max(result.uniqueBlockRecoverEnergyShieldPct, Number(ep.pct || 2)); },
    "blockedDamageTakenPct": (result, context, ep) => { result.uniqueBlockedDamageTakenPct = Math.max(result.uniqueBlockedDamageTakenPct, Number(ep.pct || 0)); },
    "uniqueTakenReduceWhen2Enemies": (result, context, ep) => { addStatToBucket(context.reward, 'takenDamageReduceWhen2EnemiesPct', Number(ep.pct || 0)); },
    "uniqueTakenReduceWhen1Enemy": (result, context, ep) => { addStatToBucket(context.reward, 'takenDamageReduceWhen1EnemyPct', Number(ep.pct || 0)); },
    "uniqueMaxResAll": (result, context, ep) => { addStatToBucket(context.reward, 'maxResAll', Number(ep.pct || 0)); },
    "deflectGrantShadowStealth": (result, context, ep, effect, deps) => { result.uniqueDeflectStealth = deps.mergeParams(result.uniqueDeflectStealth, { duration: Number(ep.duration || 3), move: Number(ep.move || 20), evasionPct: Number(ep.evasionPct || 20), critDmg: Number(ep.critDmg || 20) }); },
    "chaosTakenDamageReducePct": (result, context, ep) => { result.uniqueChaosTakenDamageReducePct = Math.max(result.uniqueChaosTakenDamageReducePct, Number(ep.pct || 15)); },
    "uniqueGemLevelBonus": (result, context, ep) => { addStatToBucket(context.reward, 'gemLevel', Number(ep.level || 1)); },
    "lifeRecoupTakenDamage": (result, context, ep, effect, deps) => { result.uniqueLifeRecoupTakenDamage = deps.mergeParams(result.uniqueLifeRecoupTakenDamage, { pct: Number(ep.pct || 25), duration: Number(ep.duration || 4) }); },
    "immuneBleed": (result) => { result.uniqueImmuneBleed = true; },
    "immuneFreeze": (result) => { result.uniqueImmuneFreeze = true; },
    "lifePctAsEnergyShield": (result, context, ep) => { addStatToBucket(context.reward, 'energyShield', Math.floor(Math.max(0, context.baseHp) * Math.max(0, Number(ep.pct || 10)) / 100)); },
    "overhealCapPct": (result, context, ep) => { result.uniqueOverhealCapPct = Math.max(result.uniqueOverhealCapPct, Number(ep.pct || 0)); },
    "dsAndTargetAnyBonus": (result, context, ep) => { addStatToBucket(context.reward, 'ds', Number(ep.ds !== undefined ? ep.ds : 8));
            addStatToBucket(context.reward, 'targetAny', Number(ep.target !== undefined ? ep.target : 1)); },
    "poisonDamageMorePct": (result, context, ep) => { addStatToBucket(context.reward, 'poisonDamageMultiplierPct', Number(ep.pct || 25)); },
    "uniqueMinDmgRoll": (result, context, ep) => { addStatToBucket(context.reward, 'minDmgRoll', Number(ep.pct || 5)); },
    "hitShockedEnemyDamageMorePct": (result, context, ep) => { addStatToBucket(context.reward, 'shockedEnemyHitDamageMorePct', Number(ep.pct || 50)); },
    "pursuitMoveSpeed": (result, context, ep, effect, deps) => { result.uniquePursuitMovePct = Math.max(result.uniquePursuitMovePct, deps.pursuitPct(ep)); },
    "projectileTargetBonus": (result, context, ep, effect, deps) => { if (deps.deferredTarget(effect)) return;
            addStatToBucket(context.reward, 'targetProjectile', Number(ep.target || 1)); },
    "projectileExtraShotBonus": (result, context, ep) => { addStatToBucket(context.reward, 'projectileExtraShots', Number(ep.shots || 1)); },
    "igniteDamageMorePct": (result, context, ep) => { addStatToBucket(context.reward, 'igniteDamageMultiplierPct', Number(ep.pct || 25)); },
    "cosmosFinalDmg": (result, context, ep) => { addStatToBucket(context.reward, 'pctDmg', Number(ep.pct || 12)); },
    "cosmosTakenLess": (result, context, ep) => { addStatToBucket(context.reward, 'dr', Number(ep.dr || 8)); },
    "cosmosSpeedBurst": (result, context, ep) => { addStatToBucket(context.reward, 'move', Number(ep.move || 12)); addStatToBucket(context.reward, 'aspd', Number(ep.aspd || 10)); },
    "cosmosPenetration": (result, context, ep) => { addStatToBucket(context.reward, 'resPen', Number(ep.pen || 8)); },
    "cosmosSustain": (result, context, ep) => { addStatToBucket(context.reward, 'regen', Number(ep.regen || 1.2)); addStatToBucket(context.reward, 'leech', Number(ep.leech || 0.8)); },
    "cosmosBossSlayer": (result, context, ep) => { addStatToBucket(context.reward, 'pctDmg', Number(ep.pct || 14)); addStatToBucket(context.reward, 'critDmg', Number(ep.critDmg || 20)); },
    "cosmosAlwaysFirstHit": (result) => { result.cosmosAlwaysFirstHit = true; },
    "cosmosEnergyShieldAmpBypass": (result, context, ep) => { result.uniqueEsAmpPct = Math.max(result.uniqueEsAmpPct, Number(ep.ampPct || 25)); result.cosmosEnergyShieldBypassPct = Math.max(result.cosmosEnergyShieldBypassPct, Number(ep.bypassPct || 25)); },
    "cosmosOrbitCycle": (result, context, ep) => { result.cosmosOrbitCycle = { high: Number(ep.high || 1.3), low: Number(ep.low || 0.7), step: Number(ep.step || 0.2) }; },
    "cosmosDeepSeaLeechCaps": (result, context, ep) => { result.cosmosDeepSeaLeechCaps = { rateLessPct: Number(ep.rateLessPct || 20), capMul: Number(ep.capMul || 2) }; },
    "cosmosTideEsRegenToLife": (result) => { result.cosmosTideEsRegenToLife = true; },
    "cosmosEqualDamageSplit": (result) => { result.cosmosEqualDamageSplit = true; },
    "cosmosBalanceMitigation": (result) => { result.cosmosBalanceMitigation = true; },
    "cosmosTwinStarResonance": (result, context, ep) => { result.cosmosTwinStarResonance = { resonanceMul: Number(ep.resonanceMul || 1.5), supportCapMul: Number(ep.supportCapMul || 0.5) }; },
    "cosmosJudgmentLightning": (result, context, ep) => { result.cosmosJudgmentLightning = { resDown: Number(ep.resDown || 15), duration: Number(ep.duration || 4) }; },
    "cosmosDeathResist": (result, context, ep) => { result.cosmosDeathResistPct = Math.max(result.cosmosDeathResistPct, Number(ep.chance || 12)); },
    "cosmosVerdictSupportDamage": (result, context, ep) => { result.cosmosVerdictSupportDamagePct += Number(ep.morePerSupportPct || 2); },
    "cosmosGuardianConditionInstant": (result) => { result.cosmosGuardianConditionInstant = true; },
    "cosmosBossDamageMore": (result, context, ep) => { result.cosmosBossDamageMorePct = Math.max(result.cosmosBossDamageMorePct, Number(ep.morePct || 25)); },
    "cosmosCometChillNoFreeze": (result) => { result.cosmosCometChillNoFreeze = true; },
    "fixedAllMaxRes": (result, context, ep) => { result.fixedAllMaxRes = Math.max(1, Math.min(90, Number(ep.max || 82))); },
    "stealEliteTrait": (result, context, ep) => { result.uniqueStealEliteTrait = { duration: Number(ep.duration || 30) }; },
    "thousandBottles": (result, context, ep, effect, deps) => { deps.bottleStats(context.reward); },
    "cosmosStatBundle": (result, context, ep) => {
        addStatToBucket(context.reward, 'pctDmg', Number(ep.pctDmg || 0));
        addStatToBucket(context.reward, 'dr', Number(ep.dr || 0));
        addStatToBucket(context.reward, 'move', Number(ep.move || 0));
        addStatToBucket(context.reward, 'aspd', Number(ep.aspd || 0));
        addStatToBucket(context.reward, 'resPen', Number(ep.resPen || 0));
        addStatToBucket(context.reward, 'critDmg', Number(ep.critDmg || 0));
        addStatToBucket(context.reward, 'regen', Number(ep.regen || 0));
        addStatToBucket(context.reward, 'leech', Number(ep.leech || 0));
    },
    "astraUniqueConvergence": (result, context, ep) => {
        const uniqueCount = Object.values(context.owner.equipment || {}).filter(it => it && it.rarity === 'unique').length;
        const otherUniques = Math.min(Number(ep.capCount || 8), Math.max(0, uniqueCount - 1));
        addStatToBucket(context.reward, 'pctDmg', otherUniques * Number(ep.pctPerUnique || 5));
    },
});

export function createPlayerUniqueEffects(deps) {
    const evaluate = (owner, input) => {
        const context = { ...input, owner };
        const result = { uniqueClosedEyes: context.activeUniqueIds.has('uj_closed_eyes'), ...DEFAULT_EFFECTS };
        if (context.activeUniqueIds.has('uj_crown_empty')) {
            const otherUniqueCount = context.equippedUniqueJewels.filter(entry => entry && entry.jewel && entry.jewel.uniqueId !== 'uj_crown_empty').length;
            if (otherUniqueCount === 0) {
                addStatToBucket(context.reward, 'pctDmg', 25);
                addStatToBucket(context.reward, 'gemLevel', 1);
            }
        }
        if (context.activeUniqueIds.has('uj_condensed_curse')) result.uniqueCurseCrownPerCursePct = Math.max(result.uniqueCurseCrownPerCursePct, 10);
        for (const effect of context.effects) {
            if (!effect || !effect.key || !Object.hasOwn(EFFECTS, effect.key)) continue;
            EFFECTS[effect.key](result, context, effect.params || {}, effect, deps);
        }
        return result;
    };
    return Object.freeze({ evaluate });
}
