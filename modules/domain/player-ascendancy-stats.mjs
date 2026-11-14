// Ordered transforms of one stat calculation; owns only its numeric output and the per-call skill copy.
// Never group by selected class: borrowed keystones participate at their authored position.
import { computeAscendancyNodeMultipliers } from './player-ascendancy-nodes.mjs';
import { sumOrderedPlayerStatSources } from '../common/stat-bucket.mjs';

// Keep the seven original sources and left-to-right additions, including negative sources before clamping.
function sumSharedSummonStat(input, stat) {
    return Math.max(0, sumOrderedPlayerStatSources(input, stat));
}

const transforms = {
    w1(state, input, deps) {
        state.warriorPhysDamageMultiplier *= 1 + deps.values.w1.physMorePct / 100;
        state.finalArmor = Math.floor(state.finalArmor * (1 + deps.values.w1.armorMorePct / 100));
    },
    w2(state, input, deps) {
        let stacks = input.tick.get('warriorRhythmStacks');
        if (stacks > 0) state.finalAspd = Math.min(12, state.finalAspd * Math.pow(1 + deps.values.w2.aspdPctPerStack / 100, stacks));
    },
    w3(state, input, deps) {
        state.finalBaseDmg = Math.floor(state.finalBaseDmg * (deps.dualWielding() ? 1.08 : 1));
    },
    w4(state, input, deps) {
        state.finalPhysIgnore += deps.values.w4.physIgnore; state.allowNegativePhysIgnore = true;
    },
    w5(state, input) {
        state.warriorPhysDamageMultiplier *= input.tick.get('warriorRageMultiplier');
    },
    nodeMultipliers(state, input, deps) {
        const nodeStats = computeAscendancyNodeMultipliers(input.owner, input.tick, Math.max(1, state.finalMaxHp), deps);
        state.finalRegen *= nodeStats.regenMul;
        if (nodeStats.damageMul !== 1) state.finalBaseDmg = Math.floor(state.finalBaseDmg * nodeStats.damageMul);
        state.warriorTakenDamageMultiplier *= nodeStats.takenMul;
        if (nodeStats.aspdMul !== 1) state.finalAspd = Math.min(12, state.finalAspd * nodeStats.aspdMul);
    },
    w8(state, input, deps) {
        state.finalCrit = Math.min(200, state.finalCrit + deps.values.w8.crit);
        state.finalCritDmg += deps.values.w8.critDmg;
        state.finalAspd = Math.min(12, state.finalAspd * (1 + deps.values.w8.aspdMorePct / 100));
        state.finalMove *= 1 + deps.values.w8.moveMorePct / 100;
        state.finalDamageMultiplier *= 1 + deps.values.w8.damageMorePct / 100;
        state.finalDs += deps.values.w8.ds;
    },
    w9(state, input, deps) {
        state.finalDamageMultiplier *= 1 + deps.values.w9.damageMorePct / 100;
        state.warriorTakenDamageMultiplier *= 1 + deps.values.w9.takenMorePct / 100;
    },
    g1(state, input, deps) {
        if (input.skill.ele === 'phys') state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 + deps.values.g1.physMorePct / 100));
        else state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 - deps.values.g1.otherLessPct / 100));
    },
    g2(state, input, deps) {
        let stacks = input.tick.get('gladiatorFlurryStacks');
        if (stacks > 0) {
            state.finalAspd = Math.min(12, state.finalAspd * (1 + stacks * deps.values.g2.aspdPctPerStack / 100));
            state.finalEvasion = Math.floor(state.finalEvasion * (1 + stacks * 0.03));
        }
    },
    g3(state, input) {
        state.finalCrit = Math.min(100, state.finalCrit + input.tick.get('gladiatorVeteranCrit'));
    },
    g4(state, input, deps) {
        let crowdCount = input.tick.get('aliveEnemies');
        if (crowdCount >= 3) {
            state.finalBaseDmg = Math.floor(state.finalBaseDmg * 1.20);
            state.rawDr += 20;
            state.finalDr = Math.min(deps.physicalCap, state.rawDr);
        }
    },
    g5(state, input) {
        if (input.tick.get('gladiatorSwiftGuard')) state.swiftOpeningTakenMultiplier = 0.70;
    },
    g7(state, input, deps) {
        state.finalDs += Math.min(deps.values.g7.dsMax, Math.floor(Math.max(0, state.finalEvasion) / deps.values.g7.evasionPerDs));
        state.finalCrit += Math.min(deps.values.g7.critMax, Math.floor(Math.max(0, state.finalArmor) / deps.values.g7.armorPerCrit));
    },
    g8(state, input, deps) {
        state.finalDs += deps.values.g8.ds;
        state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 + deps.values.g8.damageMorePct / 100));
        state.bossDamageDealtMultiplier *= 1 + deps.values.g8.bossDamageMorePct / 100;
        state.bossTakenDamageMultiplier *= 1 + deps.values.g8.bossTakenMorePct / 100;
        state.finalRegen *= 0.5;
        state.finalEnergyShieldRegenRate = 0;
    },
    a1(state) {
        state.finalCrit = Math.max(0, state.finalCrit - 6);
        state.finalCritDmg += 66;
    },
    a2(state, input) {
        if (!(input.tick.get('assassinBlurred'))) return;
        state.finalMove *= 1.2;
        state.finalCritDmg += 25;
        state.finalEvasion = Math.floor(state.finalEvasion * 1.2);
    },
    a4(state) {
        state.finalPhysIgnore += 25;
        state.finalResPen += 25;
        state.finalBaseDmg = Math.floor(state.finalBaseDmg * 0.92);
    },
    a6(state, input) {
        const highLifeLimit = Math.max(1, state.finalMaxHp);
        if (input.tick.when('playerHp', hp => (hp / highLifeLimit) > 0.66)) state.finalCritDmg = Math.floor(state.finalCritDmg * 1.2);
        else state.finalEvasion = Math.floor(state.finalEvasion * 1.2);
    },
    a7(state) {
        state.finalCritDmg -= 200;
    },
    a8(state, input, deps) {
        state.finalCritDmg *= deps.values.a8.critDmgMul;
        state.finalBaseDmg = Math.floor(state.finalBaseDmg * 0.75);
    },
    a9(state) {
        state.finalCritDmg = Math.floor(state.finalCritDmg * 1.2);
        state.finalEvasion = Math.floor(state.finalEvasion * 1.2);
    },
    r1(state) {
        state.finalMove *= 1.15;
        state.finalArmor = 0;
        state.finalEnergyShield = 0;
    },
    r2(state, input, deps) {
        state.finalAspd = Math.min(12, state.finalAspd * (1 + deps.values.r2.aspdMorePct / 100));
    },
    r3(state) {
        state.finalMinDmgRoll = Math.max(5, state.finalMinDmgRoll - 10);
    },
    r4(state, input, deps) {
        state.finalAspd = Math.min(12, state.finalAspd * (1 + Math.max(0, state.finalMove) * deps.values.r4.aspdPctPerMovePct / 100));
    },
    r6(state, input, deps) {
        if (!(Array.isArray(input.skill.tags) && input.skill.tags.includes('projectile'))) return;
        input.skill.targets = Math.min(12, Math.max(1, (input.skill.targets || 1) + 1));
        state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 + Math.max(1, Math.floor(input.skill.targets || 1)) * deps.values.r6.damageMorePctPerTarget / 100));
    },
    r8(state) {
        let aspdBonus = Math.max(0, state.finalAspd - 1) * 0.12;
        let moveBonus = Math.max(0, state.finalMove) * 0.0012;
        state.finalAspd = Math.min(12, state.finalAspd * (1 + moveBonus));
        state.finalMove *= (1 + aspdBonus);
        state.finalMaxHp = Math.floor(state.finalMaxHp * 0.85);
    },
    r7(state, input, deps) {
        state.finalCrit = Math.min(100, state.finalCrit + input.tick.get('sinceHitSeconds') * deps.values.r7.critPerSecond);
    },
    h3(state) {
        state.finalEvasion = Math.floor(state.finalEvasion * (1 + Math.max(0, state.finalMove) * 0.002));
    },
    h5(state, input, deps) {
        state.finalCritDmg += deps.values.h5.critDmg; state.finalCrit = Math.max(0, state.finalCrit - deps.values.h5.critLess);
    },
    h6(state, input) {
        if (!(Array.isArray(input.skill.tags) && input.skill.tags.includes('projectile'))) return;
        input.skill.targets = Math.min(12, Math.max(1, (input.skill.targets || 1) + 1));
        // 추가 발사는 보통의 보너스 샷 피해(PROJECTILE_BONUS_SHOT_DAMAGE_PCT)로 맞힌다(2026-10-07 직업 밸런스: 예전 70% 강화는 뺐다).
        state.totalProjectileExtraShots += 1;
    },
    h7(state, input, deps) {
        let solitaryOriginalTargets = Math.max(1, Math.floor(input.skill.targets || 1));
        state.finalDs += deps.solitaryBonus(solitaryOriginalTargets);
        input.skill.targets = 1;
    },
    h8(state, input, deps) {
        let dsAsCrit = Math.max(0, state.finalDs);
        state.finalDs = 0;
        state.finalCrit = Math.min(1000, state.finalCrit + dsAsCrit);
        state.finalCritDmg += deps.values.h8.critDmg;
    },
    h9(state, input) {
        state.finalDamageMultiplier *= (1 + Math.max(0, input.totalAspdPct) / 100);
        state.finalAspd = 1;
    },
    cr1(state) {
        state.finalRegen += 1.5; state.finalRegen *= 1.4;
    },
    cr2(state) {
        state.crusaderLightningIgnoreRes = true;
        state.crusaderNoResPenOnLightning = true;
    },
    cr4(state) {
        let previousMaxResL = state.finalMaxResL;
        state.finalMaxResL = Math.min(90, state.finalMaxResL + 3);
        state.crusaderLightningMaxResBonus = state.finalMaxResL - previousMaxResL;
    },
    cr5(state) {
        state.finalRegen += 3;
        state.finalMaxHp = Math.floor(state.finalMaxHp * 1.15);
        state.finalArmor = Math.floor(state.finalArmor * 1.4);
        state.finalEnergyShield = Math.floor(state.finalEnergyShield * 1.4);
    },
    cr6(state, input, deps) {
        if (!(input.skill.ele === 'light')) return;
        state.finalMaxDmgRoll = Math.floor(state.finalMaxDmgRoll * deps.values.cr6.maxRollMul);
    },
    cr7(state) {
        let addEs = Math.floor(state.finalArmor * 0.5);
        let addArmor = Math.floor(state.finalEnergyShield * 0.5);
        state.finalEnergyShield += addEs;
        state.finalArmor += addArmor;
        state.finalEnergyShieldRechargeDelay = Math.max(0.1, state.finalEnergyShieldRechargeDelay * 0.5);
    },
    cr3(state, input, deps) {
        if (!(input.skill.ele === 'light')) return;
        state.crusaderHolyFlatDmg = Math.floor((Math.max(0, state.finalEnergyShield) / 100) * Math.max(1, Math.floor(input.owner.level || 1)) * deps.values.cr3.levelMulPer100Es);
        state.crusaderHolyScaledDmg = Math.floor(state.crusaderHolyFlatDmg * input.baseDamageIncreaseMultiplier);
        state.finalBaseDmg = Math.max(1, state.finalBaseDmg + state.crusaderHolyScaledDmg);
    },
    cr8(state, input) {
        if (!(input.tick.get('crusaderAegis'))) return;
        state.finalBaseDmg = Math.floor(state.finalBaseDmg * (input.skill.ele === 'light' ? 1.75 : 1));
    },
    e1(state, input) {
        if (input.skill.ele === 'phys' && !input.skillHasElementalConversion) state.finalBaseDmg = 0;
        else state.finalDamageMultiplier *= 1.15;
    },
    e3(state) {
        state.finalMaxHp = Math.floor(state.finalMaxHp * 0.85);
        state.finalEnergyShieldRegenRate += 10;
        state.finalEnergyShieldRechargeDelay = 0;
    },
    e5(state, input) {
        let maxElemRes = Math.max(input.finalResF, input.finalResC, input.finalResL);
        state.elementalistChaosConversionBonus = Math.floor(maxElemRes * 0.5);
        state.finalResChaos = Math.min(input.finalMaxResChaos, state.finalResChaos + state.elementalistChaosConversionBonus);
        state.finalDamageMultiplier *= (1 + Math.max(0, state.finalResChaos) / 100);
    },
    e6(state) {
        state.finalResPen += 20;
        state.finalCritDmg -= 25;
    },
    e9(state, input, deps) {
        state.finalResPen += deps.values.e9.resPen;
    },
    e8(state, input, deps) {
        let stacks = input.tick.get('elementalistOverload');
        state.finalDamageMultiplier *= (1 + stacks * deps.values.e8.morePctPerStack / 100);
        state.finalCrit = Math.max(0, state.finalCrit - stacks);
    },
    e7(state, input, deps) {
        let pool = Array.isArray(input.skill.randomElementPool) ? input.skill.randomElementPool : [];
        if (['fire','cold','light'].every(ele => pool.includes(ele))) {
            state.finalDamageMultiplier *= 1.05;
            state.ailmentPowerMultiplier = Math.max(state.ailmentPowerMultiplier, deps.values.e7.ailmentPowerMul);
        }
    },
    wlk1(state, input, deps) {
        state.chaosDamageMultiplier *= 1 + deps.values.wlk1.chaosMorePct / 100;
    },
    wlk2(state) {
        state.totalDotDamageMultiplier *= 1.20;
        state.instantDamageMultiplier *= 0.90;
    },
    wlk3(state) {
        state.finalEnergyShieldRegenRate = 0;
    },
    wlk6(state, input, deps) {
        state.finalResPen += 21 + Math.max(0, state.finalCrit) * deps.values.wlk6.critToPenPct / 100;
        state.finalCrit = 0;
    },
    wlk8(state, input, deps) {
        state.chaosDamageMultiplier *= 1 + deps.values.wlk8.chaosMorePct / 100;
        state.finalLeech *= 0.5;
        state.finalSpellLeech *= 0.5;
        state.finalRegen *= 0.5;
    },
    wlk5(state) {
        state.dotTickIntervalMultiplier /= 1.50;
        state.dotDurationMultiplier *= 0.5;
    },
    wlk7(state, input, deps) {
        const shieldHalf = state.finalEnergyShield * 0.5;
        if (input.tick.when('playerEnergyShield', shield => shield >= shieldHalf)) state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 + deps.values.wlk7.esDamageMorePct / 100));
    },
    gd1(state) {
        state.finalArmor = Math.floor(state.finalArmor * 1.15);
        state.guardianArmorDamageBonus = true;
    },
    gd2(state, input, deps) {
        state.finalMaxHp = Math.floor(state.finalMaxHp * (1 + deps.values.gd2.lifeMorePct / 100)); state.finalEnergyShield = Math.floor(state.finalEnergyShield * (1 + deps.values.gd2.esMorePct / 100));
    },
    gd3(state) {
        state.finalRegen *= 1.2; state.finalEnergyShieldRegenRate *= 0.8;
    },
    gd4(state, input, deps) {
        let converted = Math.floor(state.finalEvasion * deps.values.gd4.evasionToArmorPct / 100);
        state.finalArmor += converted;
    },
    gd5(state) {
        state.genericTakenDamageMultiplier *= 0.85;
    },
    gd6(state, input) {
        let stacks = input.tick.get('guardianEnduranceStacks'); if (stacks > 0) state.finalArmor = Math.floor(state.finalArmor * (1 + stacks * 0.11)); state.guardianReflectDamage = Math.max(1, Math.floor(state.finalArmor * 0.6));
    },
    armorDamage(state, input, deps) {
        if (state.guardianArmorDamageBonus) state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 + Math.min(deps.values.gd1.damagePctMax, Math.max(0, state.finalArmor) / 100 * deps.values.gd1.damagePctPer100Armor) / 100));
    },
    gd8(state) {
        state.guardianDamageNullifyChance += 30; state.ailmentResistBonusPct += 50;
    },
    gd9(state) {
        state.guardianHitCapPct = 35;
        state.finalRegen *= 0.65;
        state.finalLeech *= 0.65;
        state.finalSpellLeech *= 0.65;
    },
    lastStand(state, input, deps) {
        state.lastStandMaxHp = deps.keystone('gd7', input.owner) ? state.finalMaxHp : null;
        if (state.lastStandMaxHp !== null && input.tick.when('playerHp', hp => (hp / Math.max(1, state.lastStandMaxHp)) <= 0.5)) {
            state.genericTakenDamageMultiplier *= 0.8;
            state.finalBaseDmg = Math.floor(state.finalBaseDmg * 1.3);
        }
    },
    iq3(state) {
        state.finalAspd = Math.max(0.1, state.finalAspd * 0.94);
    },
    resonance(state, input) {
        state.inquisitorResonancePower = Math.max(0, Math.floor((input.owner.resonancePower || 0) + input.bonusResonancePower + input.inquisitorResonanceBonus));
        if (input.cosmosTwinStarResonance) state.inquisitorResonancePower = Math.floor(state.inquisitorResonancePower * Math.max(0, input.cosmosTwinStarResonance.resonanceMul || 1.5));
        state.inquisitorElementalSkill = ['fire', 'cold', 'light'].includes(input.skill.ele) || (Array.isArray(input.skill.randomElementPool) && input.skill.randomElementPool.length > 0);
    },
    iq1(state, input, deps) {
        if (!(state.inquisitorElementalSkill)) return;
        state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 + (state.inquisitorResonancePower * deps.values.iq1.resonancePct / 100) / 100));
    },
    iq2(state) {
        state.finalCrit = Math.max(0, state.finalCrit - 8);
        state.finalCritDmg += 75;
    },
    iq5(state, input, deps) {
        state.finalResPen += deps.values.iq5.resPen; if (input.skill.ele === 'phys' && !input.skillHasElementalConversion) state.finalBaseDmg = 0;
    },
    iq6(state) {
        state.finalMaxHp = Math.floor(state.finalMaxHp * 0.75);
    },
    iq7(state) {
        state.finalCritDmg += state.inquisitorResonancePower;
    },
    iq8(state, input, deps) {
        if (!(state.inquisitorElementalSkill)) return;
        state.inquisitorAbsoluteDoctrinePct = Math.max(0, state.finalResPen) * deps.values.iq8.penToDamagePct / 100;
        state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 + state.inquisitorAbsoluteDoctrinePct / 100));
    },
    sb4(state) {
        state.sbSummonAspdBonus += 25;
    },
    sb6(state) {
        state.finalResPen += 25;
    },
    sb5(state, input, deps) {
        let sumFlat = sumSharedSummonStat(input, 'summonFlatDmg');
        let sumPct = sumSharedSummonStat(input, 'summonPctDmg');
        let sumCrit = sumSharedSummonStat(input, 'summonCrit');
        let sumCritDmg = sumSharedSummonStat(input, 'summonCritDmg');
        let sumAspd = sumSharedSummonStat(input, 'summonAspd');
        const sb5Share = deps.values.sb5.sharePct / 100;
        state.finalBaseDmg += Math.floor(sumFlat * sb5Share);
        state.finalBaseDmg = Math.floor(state.finalBaseDmg * (1 + sumPct * sb5Share / 100));
        state.finalCrit += sumCrit * sb5Share;
        state.finalCritDmg += sumCritDmg * sb5Share;
        state.finalAspd = Math.max(0.1, state.finalAspd * (1 + sumAspd * sb5Share / 100));
    },
    sb7(state, input, deps) {
        // 상호 보완: 플레이어/소환수가 서로의 '공격력'(타격당 기본 피해)의 일부(ASCENDANCY_KEYSTONE_VALUES.sb7)를 나눠 가집니다.
        // 각 측의 공격력은 상대의 보너스를 제외한 자기 스탯만으로 계산하므로 무한 피드백이 없습니다.
        // 플레이어 공격력(보너스 적용 전)을 소환수에게 전달.
        state.sbPlayerAttackPower = Math.max(0, state.finalBaseDmg);
        // 소환수 공격력(대표 소환수의 타격당 기본 피해)의 50%를 플레이어 기본 피해에 가산.
        let summonStatsForShare = {
            summonFlatDmg: sumSharedSummonStat(input, 'summonFlatDmg'),
            summonPctDmg: sumSharedSummonStat(input, 'summonPctDmg'),
            summonEfficiency: sumSharedSummonStat(input, 'summonEfficiency'),
            summonSharedPctDmg: input.summonSharedGeneralPctDmg,
            summonSharedTaggedPctDmg: Object.fromEntries(Array.from(new Set(Object.values(deps.damageTags))).map(statId => [statId, Math.max(0, input.sumStatAcrossBuckets(statId))]))
        };
        state.sbSummonAttackPower = deps.summonPower(summonStatsForShare, input.gemEvaluation);
        if (!deps.keystone('sb5', input.owner)) {
            state.sbSummonShareToPlayer = Math.floor(deps.values.sb7.sharePct / 100 * state.sbSummonAttackPower);
            state.finalBaseDmg += state.sbSummonShareToPlayer;
        }
    },
    ct4(state) {
        state.finalMove *= 1.2;
        state.finalCritDmg += 25;
        state.finalEvasion = Math.floor(state.finalEvasion * 1.2);
    },
    ct6(state, input, deps) {
        state.totalDotDamageMultiplier *= 1 + deps.values.ct6.dotMorePct / 100;
        state.dotDurationMultiplier *= 1 - deps.values.ct6.durationLessPct / 100;
    },
    ct7(state, input, deps) {
        let convertedCritChance = Math.max(0, state.finalCrit) * deps.values.ct7.critChanceToDotPct / 100;
        let convertedCritDamage = Math.max(0, state.finalCritDmg) * deps.values.ct7.critDmgToDotPct / 100;
        state.totalDotDamageMultiplier *= (1 + (convertedCritChance + convertedCritDamage) / 100);
        if (Array.isArray(input.skill.tags) && input.skill.tags.includes('attack')) state.finalCrit = 100;
        state.finalCritDmg = 100 + Math.max(0, (state.totalDotDamageMultiplier - 1) * 100 * 0.2);
    },
    ct9(state, input, deps) {
        state.dotTickIntervalMultiplier *= 1 - deps.values.ct9.fasterPct / 100;
        state.dotDurationMultiplier *= 1 - deps.values.ct9.fasterPct / 100;
    }
};

const order = [
    ["w1", transforms.w1],
    ["w2", transforms.w2],
    ["w3", transforms.w3],
    ["w4", transforms.w4],
    ["w5", transforms.w5],
    [null, transforms.nodeMultipliers],
    ["w8", transforms.w8],
    ["w9", transforms.w9],
    ["g1", transforms.g1],
    ["g2", transforms.g2],
    ["g3", transforms.g3],
    ["g4", transforms.g4],
    ["g5", transforms.g5],
    ["g7", transforms.g7],
    ["g8", transforms.g8],
    ["a1", transforms.a1],
    ["a2", transforms.a2],
    ["a4", transforms.a4],
    ["a6", transforms.a6],
    ["a7", transforms.a7],
    ["a8", transforms.a8],
    ["a9", transforms.a9],
    ["r1", transforms.r1],
    ["r2", transforms.r2],
    ["r3", transforms.r3],
    ["r4", transforms.r4],
    ["r6", transforms.r6],
    ["r8", transforms.r8],
    ["r7", transforms.r7],
    ["h3", transforms.h3],
    ["h5", transforms.h5],
    ["h6", transforms.h6],
    ["h7", transforms.h7],
    ["h8", transforms.h8],
    ["h9", transforms.h9],
    ["cr1", transforms.cr1],
    ["cr2", transforms.cr2],
    ["cr4", transforms.cr4],
    ["cr5", transforms.cr5],
    ["cr6", transforms.cr6],
    ["cr7", transforms.cr7],
    ["cr3", transforms.cr3],
    ["cr8", transforms.cr8],
    ["e1", transforms.e1],
    ["e3", transforms.e3],
    ["e5", transforms.e5],
    ["e6", transforms.e6],
    ["e9", transforms.e9],
    ["e8", transforms.e8],
    ["e7", transforms.e7],
    ["wlk1", transforms.wlk1],
    ["wlk2", transforms.wlk2],
    ["wlk3", transforms.wlk3],
    ["wlk6", transforms.wlk6],
    ["wlk8", transforms.wlk8],
    ["wlk5", transforms.wlk5],
    ["wlk7", transforms.wlk7],
    ["gd1", transforms.gd1],
    ["gd2", transforms.gd2],
    ["gd3", transforms.gd3],
    ["gd4", transforms.gd4],
    ["gd5", transforms.gd5],
    ["gd6", transforms.gd6],
    [null, transforms.armorDamage],
    ["gd8", transforms.gd8],
    ["gd9", transforms.gd9],
    [null, transforms.lastStand],
    ["iq3", transforms.iq3],
    [null, transforms.resonance],
    ["iq1", transforms.iq1],
    ["iq2", transforms.iq2],
    ["iq5", transforms.iq5],
    ["iq6", transforms.iq6],
    ["iq7", transforms.iq7],
    ["iq8", transforms.iq8],
    ["sb4", transforms.sb4],
    ["sb6", transforms.sb6],
    ["sb5", transforms.sb5],
    ["sb7", transforms.sb7],
    ["ct4", transforms.ct4],
    ["ct6", transforms.ct6],
    ["ct7", transforms.ct7],
    ["ct9", transforms.ct9]
];

export function createPlayerAscendancyStats(deps) {
    return Object.freeze({
        nodeMultipliers: (owner, tick, maxLife) => computeAscendancyNodeMultipliers(owner, tick, maxLife, deps),
        transform(initial, input) {
            const state = { ...initial };
            for (const [key, apply] of order) {
                if (key === null || deps.keystone(key, input.owner)) apply(state, input, deps);
            }
            return state;
        }
    });
}
