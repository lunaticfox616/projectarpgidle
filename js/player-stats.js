// 주인공 능력치 계산(getPlayerStats의 단계들)과 룬 표시 값 (2026-11-10에 js/combat.js에서 그대로 옮겼다. js/combat.js 뒤에 옮기기 전과 같은 순서로 읽는다.)

/** 재사용 대기시간 줄 of one stat evaluation (sum = getPlayerStats' bucket sum), for js/skills.js getSkillCooldownMs: the mobility
 * runes and the talisman curses. cooldownReductionCapBonus is 되감긴 모래시계's (js/combat-build-stats.js UNIQUE_EFFECT_STAT_LINES). */
function collectCooldownStats(sum) {
    const ids = ['cooldownRecovery', 'cooldownReduction', 'mobilityCooldownRecovery', 'mobilityCooldownReduction', 'cooldownReductionCapBonus'];
    return Object.fromEntries(ids.map(id => [id, Math.max(0, sum(id))]));
}

/** Ocean stats of one stat evaluation (sum = getPlayerStats' bucket sum): pressure resistance (with its upgrades), depth gain, rare fish. */
function collectOceanStats(sum) {
    const pressureUpgrade = typeof getOceanPressureResistUpgradePct === 'function' ? getOceanPressureResistUpgradePct() : 0;
    return {
        oceanPressureResist: Math.max(0, Math.min(80, sum('oceanPressureResist') + pressureUpgrade)),
        oceanDepthGainPct: Math.max(0, sum('oceanDepthGainPct')),
        oceanRareFishChancePct: Math.max(0, sum('oceanRareFishChancePct'))
    };
}

/** The next attack's counter multiplier, used once: the lone-evasion counter (unique) and the block empower (region line). */
/** Damage taken after the situational reductions: one or two-plus enemies alive, then the region lines (half life or less, a chilled
 * attacker; js/region-affix-effects.js). */
function applySituationalTakenReduction(dmg, pStats, attacker, aliveEnemies) {
    const crowdPct = aliveEnemies >= 2 ? pStats.takenDamageReduceWhen2EnemiesPct : pStats.takenDamageReduceWhen1EnemyPct;
    const reduced = aliveEnemies >= 1 ? Math.max(1, Math.floor(dmg * (1 - Math.max(0, Math.min(0.9, (crowdPct || 0) / 100))))) : dmg;
    const regionMul = regionAffixEffects.takenDamageMultiplier(pStats, attacker);
    return regionMul === 1 ? reduced : Math.max(1, Math.floor(reduced * regionMul));
}

/** A block's stone shield (talent card), with its status text. */
function grantTalentStoneShieldOnBlock(pStats) {
    if (typeof grantTalentStoneShield !== 'function') return;
    const stoneShield = grantTalentStoneShield(pStats.maxHp);
    if (stoneShield) addBattleFx('statusText', { text: _t('돌 보호막 +{amount}', { amount: stoneShield.amount }), color: '#d8b77a', duration: 300 });
}

/** A block's energy shield recovery (unique): a share of the maximum, up to the recovery cap. */
function recoverEnergyShieldOnBlock(pStats) {
    if (!((pStats.uniqueBlockRecoverEnergyShieldPct || 0) > 0 && (pStats.energyShield || 0) > 0)) return;
    const recover = Math.max(1, Math.floor((pStats.energyShield || 0) * Math.max(0, Number(pStats.uniqueBlockRecoverEnergyShieldPct || 0)) / 100));
    game.playerEnergyShield = Math.min(getPlayerEnergyShieldRecoveryCap(pStats), Math.max(0, Number(game.playerEnergyShield) || 0) + recover);
}

function consumeLoneEvasionCounterMultiplier(pStats, now) {
    let at = Number.isFinite(Number(now)) ? Number(now) : getCombatTime();
    return consumeLoneEvasionCounter(pStats, at) * regionAffixEffects.consumeBlockEmpower(at);
}

function consumeLoneEvasionCounter(pStats, at) {
    let counter = pStats && pStats.uniqueLoneEvasionCounter;
    if (!counter || (game.uniqueLoneEvasionCounterUntil || 0) <= at) return 1;
    game.uniqueLoneEvasionCounterUntil = 0;
    return 1 + Math.max(0, Number(counter.damageMorePct || 20)) / 100;
}

function advanceEnergyShieldRechargeOnCrit(pStats, now) {
    let config = pStats && pStats.uniqueCritAdvanceEsRecharge;
    let at = Number.isFinite(Number(now)) ? Number(now) : getCombatTime();
    let recoveryCap = pStats ? getPlayerEnergyShieldRecoveryCap(pStats) : 0;
    if (!config || recoveryCap <= 0 || (game.playerEnergyShield || 0) >= recoveryCap || (game.uniqueCritEsAdvanceReadyAt || 0) > at) return false;
    let previousHitAt = Number.isFinite(game.playerEsLastHitAt) ? game.playerEsLastHitAt : at;
    game.playerEsLastHitAt = Math.max(0, previousHitAt - Math.max(0, Number(config.advanceSec || 0.25)) * 1000);
    game.uniqueCritEsAdvanceReadyAt = at + Math.max(0, Number(config.cooldownSec || 0.6)) * 1000;
    return true;
}

function triggerUniqueEnergyShieldBreakRecharge(pStats, energyShieldBeforeHit, now) {
    let config = pStats && pStats.uniqueEnergyShieldBreakRecharge;
    let at = Number.isFinite(Number(now)) ? Number(now) : getCombatTime();
    if (!config || energyShieldBeforeHit <= 0 || (game.playerEnergyShield || 0) > 0 || (game.uniqueEnergyShieldBreakRechargeReadyAt || 0) > at) return false;
    game.uniqueEnergyShieldBreakRechargeUntil = at + Math.max(0.1, Number(config.duration || 3)) * 1000;
    game.uniqueEnergyShieldBreakRechargeReadyAt = at + Math.max(0.1, Number(config.cooldown || 12)) * 1000;
    return true;
}

function getEquippedUniqueJewels() {
    return getSocketedJewels().filter(row => row.jewel.rarity === 'unique' && row.jewel.uniqueId);
}

function getLabyrinthShacklesDamageMultiplier(moveSpeed) {
    let reducedMoveSpeed = Math.max(0, Number(moveSpeed || 0) - 100);
    return 1 + (reducedMoveSpeed * 0.5) / 100;
}

function getAbsoluteFloorDamageRoll(maxDamageRoll) {
    return Math.max(5, Number(maxDamageRoll || 0) * 0.85);
}

function getSolitaryHuntDoubleStrikeBonus(originalTargets) {
    let reducedTargets = Math.max(0, Math.floor(Number(originalTargets || 1)) - 1);
    return (Math.min(5, reducedTargets) * ASCENDANCY_KEYSTONE_VALUES.h7.dsPerTarget) + (Math.max(0, reducedTargets - 5) * ASCENDANCY_KEYSTONE_VALUES.h7.dsPerTargetAfterFive);
}

function isDeferredTalentProjectileTargetEffect(effect) {
    if (!effect || effect.key !== 'projectileTargetBonus') return false;
    return effect.cardId === 'hero1__gladiator' || effect.talentCardId === 'hero1__gladiator';
}


/** @param {object|null} buff The active stolen trait; the stat calculator's tick drops it once it expires. */
/** Timed buffs on the reward bucket, each through its tick reader (js/player-stat-cache.js): the elite trait buff and 세계수의 숨결
 * (js/combat-incidents.js breathe). */
function applyTimedRewardStats(tick, bucket) {
    applyEliteTraitBuffStats(tick.get('eliteTraitBuff'), bucket);
    combatIncidents.breathStats(tick.get('incidentBreath')).forEach(([stat, value]) => addStatToBucket(bucket, stat, value));
}
function applyEliteTraitBuffStats(buff, bucket) {
    if (!buff) return;
    let trait = buff.trait || {};
    if (trait.atkMul) addStatToBucket(bucket, 'pctDmg', Math.max(0, (Number(trait.atkMul) - 1) * 100));
    if (trait.attackSpeedVarMul) addStatToBucket(bucket, 'aspd', Math.max(0, (Number(trait.attackSpeedVarMul) - 1) * 100));
    if (trait.hpMul) addStatToBucket(bucket, 'pctHp', Math.max(0, (Number(trait.hpMul) - 1) * 100));
    if (trait.critChanceBonus) addStatToBucket(bucket, 'crit', Number(trait.critChanceBonus || 0));
    if (trait.dr) addStatToBucket(bucket, 'dr', Number(trait.dr || 0));
    ['resF', 'resC', 'resL', 'resChaos'].forEach(stat => {
        if (trait[stat]) addStatToBucket(bucket, stat, Number(trait[stat] || 0));
    });
    if (trait.hitRateGuard) addStatToBucket(bucket, 'evasionPct', Math.max(0, Number(trait.hitRateGuard || 0) * 100));
}

function grantEliteTraitBuffFromEnemy(enemy, pStats) {
    if (!enemy || !enemy.isElite || !pStats || !pStats.uniqueStealEliteTrait) return;
    let trait = enemy.trait || null;
    if (!trait) return;
    let durationMs = Math.max(1000, Math.floor(Number(pStats.uniqueStealEliteTrait.duration || 30) * 1000));
    game.uniqueEliteTraitBuff = { trait: { ...trait }, expiresAt: getCombatTime() + durationMs };
    if (game.settings && game.settings.showCombatLog !== false) addLog(_t('🩸 정예 특성 흡수: {name}', { name: _t(trait.name || '정예 특성') }), 'loot-unique', { noToast: true });
}

const getPassiveSpecialStatBreakdowns = function(rules) {
    const mystique = Math.max(0, Number(rules.mystique && rules.mystique.damagePct) || 0);
    const cycle = Math.max(0, Number(rules.cycle) || 0);
    const devotion = Math.max(0, Number(rules.devotion) || 0);
    const ailmentLabel = _t(getAilmentDisplayLabel(rules.mystique && rules.mystique.ailment));
    const activeCycleLines = (rules.activeCycleBuffEffects || []).map(effect => {
        const stat = P_STATS[effect.stat] || {};
        const suffix = stat.isPct ? '%' : '';
        return _t('{source} 종료 효과: {stat} +{stat2}{suffix}', { source: _t(getAilmentDisplayLabel(effect.source)), stat: _t(getStatName(effect.stat)), stat2: formatValue(effect.stat, effect.val), suffix });
    });
    let revelationEffect = _t('헌신을 1 이상 확보하면 계시를 선택할 수 있습니다.');
    if (devotion > 0 && rules.revelation === 'combat') {
        revelationEffect = _t('주는 피해 {combatDamageMorePct}% 증폭', { combatDamageMorePct: rules.combatDamageMorePct });
    } else if (devotion > 0 && rules.revelation === 'guard') {
        revelationEffect = _t('받는 피해 {guardTakenLessPct}% 감폭', { guardTakenLessPct: rules.guardTakenLessPct });
    } else if (devotion > 0 && rules.revelation === 'life') {
        revelationEffect = _t('최대 생명력/에너지 보호막/초당 재생 각각 +{value}%', { value: formatValue('regen', rules.lifeBonusPct) });
    } else if (devotion > 0 && rules.revelation === 'fanaticism') {
        revelationEffect = _t('열광 {fanaticismStacks}/{floor}, 1당 피해 1.5%, 공격 속도 0.5% 증가', { fanaticismStacks: rules.fanaticismStacks, floor: Math.floor(devotion) });
    }
    return {
        mystique: {
            title: _t('신비'),
            lines: [_t('가장 높은 피해 속성에 대응하는 {ailmentLabel} 강화', { ailmentLabel }),
                _t('{ailmentLabel} 피해 +{value}%, 위력 +{value2}%', { ailmentLabel, value: formatValue('mystique', mystique), value2: formatValue('mystique', mystique) }),
                _t('{ailmentLabel} 유발 확률 +{floor}%p', { ailmentLabel, floor: Math.floor(mystique / 3) })],
            final: formatValue('mystique', mystique)
        },
        cycle: {
            title: _t('순환'),
            lines: [_t('적에게 적용한 상태이상이 종료되면 해당 유형에 따른 강화가 6초간 적용됩니다.'),
                _t('순환 1당 대응 속성 피해 +2%와 유형별 보조 효과를 얻습니다.'),
                ...(activeCycleLines.length > 0 ? activeCycleLines : [_t('현재 활성화된 순환 강화 없음')]),
                rules.cycleAddedFireFromPhysicalPct > 0 ? _t('순환의 원석: 물리 피해의 {value}%를 화염 피해로 추가', { value: rules.cycleAddedFireFromPhysicalPct }) : null
            ].filter(Boolean),
            final: formatValue('cycle', cycle)
        },
        revelation: {
            title: _t('계시'),
            lines: [_t('계시 수치(헌신) {value}', { value: formatValue('devotion', devotion) }), revelationEffect],
            final: _t(devotion > 0 ? rules.revelationLabel : '미해금')
        }
    };
};

/**
 * @param {boolean} includeBreakdowns Build tooltip text for visible stats; replay only needs numeric results.
 * With equipmentView this is the calculation itself: it reads the clock, the hero's life and charges, timed buffs and the enemies
 * only through `tick` (js/player-stat-cache.js). Given a tick (playerStatCache) it returns the part a settlement may keep, which
 * finishPlayerStats completes on every call; without one it returns finished stats as before.
 */
function getPlayerStats(includeBreakdowns = !game.isBackgroundCalculation, attributesOnly = false, equipmentView = false, tick = null) {
    if (!equipmentView) return combatEquipmentStats.read(includeBreakdowns);
    const keepCore = tick !== null;
    tick = tick || playerStatTick.create();
    recomputeCosmosTwinKeystones();
    const safePassives = Array.isArray(game.passives) ? game.passives : [];
    const safeSeasonNodes = Array.isArray(game.seasonNodes) ? game.seasonNodes : [];
    const safeAscendNodes = Array.isArray(game.ascendNodes) ? game.ascendNodes : [];
    const safeRewardBonuses = Array.isArray(game.actRewardBonuses) ? game.actRewardBonuses : [];
    const safeJournalBonuses = Array.isArray(game.journalBonuses) ? game.journalBonuses : [];
    const safeEquippedSupports = Array.isArray(game.equippedSupports) ? game.equippedSupports : [];
    let baseDmg = 16 + (game.level * 1.5);
    let baseHp = 90 + (game.level * 8);
    let baseMove = 100;
    let glovePairAspdBonus = 0;
    let glove1 = game.equipment ? game.equipment['장갑1'] : null;
    let glove2 = game.equipment ? game.equipment['장갑2'] : null;
    if (glove1 && glove2 && glove1.baseId && glove2.baseId && glove1.baseId === glove2.baseId) glovePairAspdBonus = 0.1;

    let passive = createEmptyStatBucket();
    let support = createEmptyStatBucket();
    let season = createEmptyStatBucket();
    let ascend = createEmptyStatBucket();
    let reward = createEmptyStatBucket();
    let starBlessing = createEmptyStatBucket();
    let colonyWardBonus = {};

    let resolvedSources = getPlayerStatSourceItemEntries().map(([slotKey, item]) =>
        [slotKey, item, getResolvedEquipmentStatLists(slotKey, item, game)]);
    let resolvedStats = resolvedSources.map(([, , stats]) => stats);
    let excludedSlots = new Set();
    let barbarismKeystone = findAllocatedPassiveKeystone('야만');
    if (barbarismKeystone) excludedSlots.add('all:무기');
    if (hasKeystone('cr3') && !hasKeystone('cr9')) excludedSlots.add('무기');
    let { gearBase, gearExplicit, localDefenseTotals, globalDefensePct, shieldArmorForDamage, shieldBaseBlockChance,
        shieldBlockChancePct, shieldBlockChanceFlat, equippedUniqueEffects } =
        getCombatEquipmentContributions(resolvedSources, excludedSlots);
    getActiveTalentUniqueEffects().forEach(effect => equippedUniqueEffects.push(effect));
    let equippedUniqueJewels = getEquippedUniqueJewels();
    let activeUniqueIds = new Set(equippedUniqueJewels.map(entry => entry.jewel.uniqueId));
    globalDefensePct = { ...globalDefensePct };
    getMirroredRingJewels().forEach(jewel => getJewelStats(jewel).forEach(stat => { addStatToBucket(gearExplicit, stat.id, stat.val); addGlobalDefensePct(globalDefensePct, stat.id, stat.val); }));
    if (activeUniqueIds.has('uj_old_box')) {
        let r = tick.get('inventoryRarity');
        addStatToBucket(reward, 'aspd', Math.min(30, r.magic * 0.5));
        addStatToBucket(reward, 'pctDmg', Math.min(60, r.rare * 1.2));
        addStatToBucket(reward, 'dr', Math.min(12, r.unique * 1.5));
    }
    if (activeUniqueIds.has('uj_condensed_curse')) addStatToBucket(reward, 'curseCap', 1);
    let uniqueClosedEyes = activeUniqueIds.has('uj_closed_eyes');
    let uniqueXpGainPct = 0, uniqueFlatDmgPerLevel = 0, uniqueEsAmpPct = 0, uniqueShockInvertTaken = false, uniqueAlwaysShock = false, uniqueProjectileDoubleStrikePct = 0;
    let uniqueChaosResDownOnHit = null, uniqueCorpseExplode = null, uniqueInstantLeechPct = 0, uniqueDoubleDamageChancePct = 0, uniqueEsRecoverOnCritPct = 0;
    let uniqueRiderCompass = false, uniqueMaxRollBonusHit = false, uniqueCeilingSmashDouble = false, uniqueMinRollEqualsMaxRoll = false, uniqueHpToPhysPct = false, uniqueImmuneIgnite = false;
    let uniqueFateTwinRollSync=false, uniqueFrostSentinel=false, uniqueShockTracer=null, uniqueVenomStride=null, uniqueBleedBlockHelm=false, uniqueImmuneBleed=false, uniqueImmuneFreeze=false, uniqueCurseCrownPerCursePct=0, uniqueWarcryResonancePct=0, uniqueConditionManual=null, uniqueStackingElementalResDownOnHit=null;
    let uniqueBleedingEnemyDamageMorePct=0, uniqueRiftWaveOnHit=null, uniqueChaosDamageInstantLeechPct=0, uniqueInvulnerableBarrierOnHit=null, uniquePoisonDurationPct=0, uniqueArmorToPhysicalDamagePctPer1000=0, uniqueDeathWard=null;
    let uniqueAllResDownOnHit=null, uniqueKillMoveStacks=null, uniqueCursedTakenAndRefresh=null, uniqueEnemyRegenCutAndMinRoll=null, uniquePhysDrHalfTakenAsMore=null, uniqueArmorAppliesToDot=false, uniqueMeleeArmorAmp=null, uniquePursuitMovePct=0, uniqueRepelMelee=null, uniqueResonanceAndSuppCap=null, uniqueRegenRateAndRegen=null, uniqueMaxHpPct=0, uniqueAllMaxRes=0;
    let uniqueLeechEfficiencyOnKill=null, uniqueOverkillSplash=false, uniqueDragonVeinGuard=null, uniqueGuardianArmor=null, uniqueStealEliteTrait=null, fixedAllMaxRes=null;
    let cosmosAlwaysFirstHit=false, cosmosEnergyShieldBypassPct=0, cosmosOrbitCycle=null, cosmosDeepSeaLeechCaps=null, cosmosTideEsRegenToLife=false, cosmosEqualDamageSplit=false, cosmosBalanceMitigation=false, cosmosTwinStarResonance=null, cosmosJudgmentLightning=null, cosmosDeathResistPct=0, cosmosVerdictSupportDamagePct=0, cosmosGuardianConditionInstant=false, cosmosBossDamageMorePct=0, cosmosCometChillNoFreeze=false;
    let uniqueQueenBeeSummon=null, uniqueBleedWeightOnBleedingHit=false, uniqueGrandBreachCrown=null, uniqueLabyrinthShackles=false, uniqueMeteorFootsteps=null;
    let uniqueRollGapDamage=false, uniqueRollGapCritDs=false, uniqueCrowdEvasionMore=null, uniqueFewEnemyEvasionMore=null, uniqueEsToLightPct=false, uniqueUnderdogMorePct=0, uniqueInstakillNormalPct=0, uniqueProjExtraShotChance=null, projectilePatternEffect=null;
    let uniqueEvasionDance=null, uniqueLoneEvasionCounter=null, uniqueCritAdvanceEsRecharge=null, uniqueEnergyShieldBreakRecharge=null;
    if (activeUniqueIds.has('uj_crown_empty')) {
        let otherUniqueCount = equippedUniqueJewels.filter(entry => entry && entry.jewel && entry.jewel.uniqueId !== 'uj_crown_empty').length;
        if (otherUniqueCount === 0) {
            addStatToBucket(reward, 'pctDmg', 25);
            addStatToBucket(reward, 'gemLevel', 1);
        }
    }
    if (activeUniqueIds.has('uj_condensed_curse')) uniqueCurseCrownPerCursePct = Math.max(uniqueCurseCrownPerCursePct, 10);
    let uniqueSummonDeathDamageBuff=null, uniqueSummonCritAspdStacks=null, uniqueSummonNonCritNoDamage=false;
    let uniqueBlockRecoverEnergyShieldPct=0, uniqueBlockedDamageTakenPct=0, uniqueDeflectStealth=null, uniqueChaosTakenDamageReducePct=0, uniqueLifeRecoupTakenDamage=null, uniqueOverhealCapPct=0;
    // 재능 개화 표면 키스톤과 전직 키스톤의 고유 효과를 같은 파이프라인에 주입(combat-build-stats.js)
    pushBuildKeystoneUniqueEffects(equippedUniqueEffects);
    equippedUniqueEffects.forEach(effect => {
        if (!effect || !effect.key) return;
        let ep = effect.params || {};
        if (effect.key === 'xpGainPct') uniqueXpGainPct += Number(ep.pct || 0);
        else if (effect.key === 'flatDmgPerLevel') uniqueFlatDmgPerLevel += Number(ep.perLevel || 0);
        else if (effect.key === 'esAmpAndRecoverOnCrit') { uniqueEsAmpPct = Math.max(uniqueEsAmpPct, Number(ep.ampPct ?? 50)); uniqueEsRecoverOnCritPct = Math.max(uniqueEsRecoverOnCritPct, Number(ep.recoverPctOnCrit || 2)); }
        else if (effect.key === 'invertShockTaken') uniqueShockInvertTaken = true;
        else if (effect.key === 'alwaysShock') uniqueAlwaysShock = true;
        else if (effect.key === 'projectileDoubleStrikePct') uniqueProjectileDoubleStrikePct += Number(ep.pct || 100);
        else if (effect.key === 'projectilePatternMode' && PROJECTILE_PATTERN_MODE_DB[ep.mode] && !projectilePatternEffect) {
            projectilePatternEffect = {
                mode: ep.mode,
                source: effect.itemName ? _t('{itemName} (고유 장비)', { itemName: effect.itemName }) : '재능',
                damageMultiplier: Number.isFinite(Number(ep.damageMultiplier)) ? Number(ep.damageMultiplier) : null
            };
        }
        else if (effect.key === 'hitApplyChaosResDown') uniqueChaosResDownOnHit = mergeBetterUniqueParams(uniqueChaosResDownOnHit, { perHit: Number(ep.perHit || 3), maxStacks: Number(ep.maxStacks || 10) });
        else if (effect.key === 'corpseExplodeOnKill') uniqueCorpseExplode = mergeBetterUniqueParams(uniqueCorpseExplode, { chance: Number(ep.chance || 15), lifePct: Number(ep.lifePct || 25) });
        else if (effect.key === 'instantLeechAndDoubleDamage') { uniqueInstantLeechPct += Number(ep.instantLeechPct || 25); uniqueDoubleDamageChancePct += Number(ep.doubleDamageChance || 20); }
        else if (effect.key === 'riderCompass') uniqueRiderCompass = true;
        else if (effect.key === 'maxRollBonusHit') uniqueMaxRollBonusHit = true;
        else if (effect.key === 'ceilingSmashDouble') uniqueCeilingSmashDouble = true;
        else if (effect.key === 'minRollEqualsMaxRoll') uniqueMinRollEqualsMaxRoll = true;
        else if (effect.key === 'hpToPhysPct') uniqueHpToPhysPct = true;
        else if (effect.key === 'immuneIgnite') uniqueImmuneIgnite = true;

        else if (effect.key === 'fateTwinRollSync') uniqueFateTwinRollSync = true;
        else if (effect.key === 'frostSentinelBoots') uniqueFrostSentinel = true;
        else if (effect.key === 'shockTracerGreaves') uniqueShockTracer = mergeBetterUniqueParams(uniqueShockTracer, { shockEffectPct: Number(ep.shockEffectPct || 25), strikeDamagePct: Number(ep.strikeDamagePct || 500), icdSec: Number(ep.icdSec || 0.5) });
        else if (effect.key === 'venomStride') {
            uniqueVenomStride = uniqueVenomStride || { poisonMorePct: 0, poisonExtraStack: 0 };
            uniqueVenomStride.poisonMorePct = Math.max(uniqueVenomStride.poisonMorePct, Number(ep.poisonMorePct ?? 30));
            uniqueVenomStride.poisonExtraStack = Math.max(uniqueVenomStride.poisonExtraStack, Number(ep.poisonExtraStack ?? 1));
            addStatToBucket(reward, 'poisonDamageMultiplierPct', Number(ep.poisonMorePct ?? 30));
        }
        else if (effect.key === 'bleedBlockHelm') uniqueBleedBlockHelm = true;
        else if (effect.key === 'curseCrown') { addStatToBucket(reward, 'curseCap', Number(ep.extraCurseCap || 1)); uniqueCurseCrownPerCursePct = Math.max(uniqueCurseCrownPerCursePct, Number(ep.finalDmgPerCursePct || 6)); }
        else if (effect.key === 'warcryResonanceBelt') uniqueWarcryResonancePct = Math.max(uniqueWarcryResonancePct, Number(ep.perWarcryAmpPct || 20));
        else if (effect.key === 'conditionManual') uniqueConditionManual = { durationPct: Number(ep.durationPct || 100), cdrPct: Number(ep.cdrPct || 20) };
        else if (effect.key === 'stackingElementalResDownOnHit') uniqueStackingElementalResDownOnHit = mergeBetterUniqueParams(uniqueStackingElementalResDownOnHit, { perHit: Number(ep.perHit || 2), max: Number(ep.max || 20) });
        else if (effect.key === 'leechEfficiencyOnKill') uniqueLeechEfficiencyOnKill = mergeBetterUniqueParams(uniqueLeechEfficiencyOnKill, { duration: Number(ep.duration || 8), efficiencyPct: Number(ep.efficiencyPct || 100) });
        else if (effect.key === 'overkillSplash') uniqueOverkillSplash = true;
        else if (effect.key === 'dragonVeinGuard') uniqueDragonVeinGuard = mergeBetterUniqueParams(uniqueDragonVeinGuard, { chance: Number(ep.chance || 20), duration: Number(ep.duration || 2), hpPct: Number(ep.hpPct || 8) });
        else if (effect.key === 'guardianArmor') uniqueGuardianArmor = mergeBetterUniqueParams(uniqueGuardianArmor, { takenLessPct: Number(ep.takenLessPct || 8), bossTakenLessPct: Number(ep.bossTakenLessPct || 12) });
        else if (effect.key === 'queenBeeSummonOnHit') uniqueQueenBeeSummon = { chance: Number(ep.chance || 8), hitPct: Number(ep.hitPct || 125), attacks: Number(ep.attacks || 3), maxBees: Number(ep.maxBees || 10) };
        else if (effect.key === 'bleedWeightOnBleedingHit') uniqueBleedWeightOnBleedingHit = true;
        else if (effect.key === 'grandBreachCrown') uniqueGrandBreachCrown = { spellFromEsPct: Number(ep.spellFromEsPct || 10), esPct: Number(ep.esPct || 30) };
        else if (effect.key === 'labyrinthShackles') uniqueLabyrinthShackles = true;
        else if (effect.key === 'rollGapDamagePct') uniqueRollGapDamage = true;
        else if (effect.key === 'rollGapCritAndDs') uniqueRollGapCritDs = true;
        else if (effect.key === 'crowdEvasionMore') uniqueCrowdEvasionMore = { minEnemies: Number(ep.minEnemies || 10), morePct: Number(ep.morePct || 100) };
        else if (effect.key === 'fewEnemyEvasionMore') uniqueFewEnemyEvasionMore = mergeBetterUniqueParams(uniqueFewEnemyEvasionMore, { minEnemies: Number(ep.minEnemies || 1), maxEnemies: Number(ep.maxEnemies || 2), morePct: Number(ep.morePct || 45) });
        else if (effect.key === 'evasionDanceOnEvade') uniqueEvasionDance = mergeBetterUniqueParams(uniqueEvasionDance, { maxStacks: Number(ep.maxStacks || 4), evasionPctPerStack: Number(ep.evasionPctPerStack || 4), movePerStack: Number(ep.movePerStack || 2), duration: Number(ep.duration || 4) });
        else if (effect.key === 'loneEvasionCounter') uniqueLoneEvasionCounter = mergeBetterUniqueParams(uniqueLoneEvasionCounter, { maxEnemies: Number(ep.maxEnemies || 2), damageMorePct: Number(ep.damageMorePct || 20), duration: Number(ep.duration || 3) });
        else if (effect.key === 'critAdvanceEnergyShieldRecharge') uniqueCritAdvanceEsRecharge = { advanceSec: Number(ep.advanceSec || 0.25), cooldownSec: Number(ep.cooldownSec || 0.6) };
        else if (effect.key === 'energyShieldBreakRecharge') uniqueEnergyShieldBreakRecharge = { duration: Number(ep.duration || 3), cooldown: Number(ep.cooldown || 12) };
        else if (effect.key === 'esToLightPct') uniqueEsToLightPct = true;
        else if (effect.key === 'underdogNonMaxRollMorePct') uniqueUnderdogMorePct = Math.max(uniqueUnderdogMorePct, Number(ep.pct || 20));
        else if (effect.key === 'instakillNormalOnHitPct') uniqueInstakillNormalPct = Math.max(uniqueInstakillNormalPct, Number(ep.pct || 5));
        else if (effect.key === 'projectileExtraShotChance') uniqueProjExtraShotChance = mergeBetterUniqueParams(uniqueProjExtraShotChance, { chance: Number(ep.chance || 10), shots: Number(ep.shots || 2) });

        else if (effect.key === 'realmBleedingEnemyDamageMore') uniqueBleedingEnemyDamageMorePct = Math.max(uniqueBleedingEnemyDamageMorePct, Number(ep.morePct || 22));
        else if (effect.key === 'realmRiftWaveOnHit') uniqueRiftWaveOnHit = mergeBetterUniqueParams(uniqueRiftWaveOnHit, { chance: Number(ep.chance || 12), damagePct: Number(ep.damagePct || 80) });
        else if (effect.key === 'realmChaosDamageInstantLeech') uniqueChaosDamageInstantLeechPct = Math.max(uniqueChaosDamageInstantLeechPct, Number(ep.pct || 8));
        else if (effect.key === 'realmInvulnerableBarrierOnHit') uniqueInvulnerableBarrierOnHit = { chance: Number(ep.chance || 10), duration: Number(ep.duration || 1.5) };
        else if (effect.key === 'realmPoisonDuration') uniquePoisonDurationPct = Math.max(uniquePoisonDurationPct, Number(ep.durationPct || 35));
        else if (effect.key === 'realmArmorToPhysicalDamage') uniqueArmorToPhysicalDamagePctPer1000 = Math.max(uniqueArmorToPhysicalDamagePctPer1000, Number(ep.pctPer1000 || 3));
        else if (effect.key === 'realmDeathWard') uniqueDeathWard = mergeBetterUniqueParams(uniqueDeathWard, { hpPct: Number(ep.hpPct || 12), cooldown: Number(ep.cooldown || 20) });
        else if (effect.key === 'realmAllResDownOnHit') uniqueAllResDownOnHit = { perHit: Number(ep.perHit || 5), max: Number(ep.max || 4), duration: Number(ep.duration || 5) };
        else if (effect.key === 'realmKillMoveStacks') uniqueKillMoveStacks = mergeBetterUniqueParams(uniqueKillMoveStacks, { movePerStack: Number(ep.movePerStack || 10), maxStacks: Number(ep.maxStacks || 20), duration: Number(ep.duration || 20), cooldownSec: Number(ep.cooldownSec || 1) });
        else if (effect.key === 'realmCursedTakenAndRefresh') uniqueCursedTakenAndRefresh = { takenMul: Number(ep.takenMul || 1.1), refreshSec: Number(ep.refreshSec || 4) };
        else if (effect.key === 'realmEnemyRegenCutAndMinRoll') uniqueEnemyRegenCutAndMinRoll = { enemyRegenRateMul: Number(ep.enemyRegenRateMul || 0.5), minRoll: Number(ep.minRoll || 10) };
        else if (effect.key === 'realmPhysDrHalfTakenAsMore') uniquePhysDrHalfTakenAsMore = { ratio: Number(ep.ratio || 0.5) };
        else if (effect.key === 'realmArmorAppliesToDot') uniqueArmorAppliesToDot = true;
        else if (effect.key === 'realmMeleeArmorAmp') uniqueMeleeArmorAmp = mergeBetterUniqueParams(uniqueMeleeArmorAmp, { ampPct: Number(ep.ampPct || 5), maxStacks: Number(ep.maxStacks || 3), duration: Number(ep.duration || 2) });
        else if (effect.key === 'realmRepelMelee') uniqueRepelMelee = readRepelMeleeParams(ep);
        else if (effect.key === 'realmResonanceAndSuppCap') uniqueResonanceAndSuppCap = { resonancePower: Number(ep.resonancePower || 150), suppCap: Number(ep.suppCap || 3) };
        else if (effect.key === 'realmRegenRateAndRegen') uniqueRegenRateAndRegen = mergeBetterUniqueParams(uniqueRegenRateAndRegen, { regenRatePct: Number(ep.regenRatePct || 25), regen: Number(ep.regen || 2) });
        else if (effect.key === 'realmMaxHpPct') uniqueMaxHpPct += Number(ep.pctHp || 35);
        else if (effect.key === 'realmAllMaxRes') uniqueAllMaxRes += Number(ep.maxRes || 3);
        else if (effect.key === 'meteorFootsteps') uniqueMeteorFootsteps = { chance: Number(ep.chance || 20), damagePct: Number(ep.damagePct || 180) };
        else if (effect.key === 'summonCapBonus') addStatToBucket(reward, 'summonCap', Number(ep.cap || 1));
        else if (effect.key === 'summonEfficiencyBonus') addStatToBucket(reward, 'summonEfficiency', Number(ep.pct || 10));
        else if (effect.key === 'rightRingSummonCap') { if (effect.sourceSlot === '반지2') addStatToBucket(reward, 'summonCap', Number(ep.cap || 1)); }
        else if (effect.key === 'summonDeathDamageBuff') uniqueSummonDeathDamageBuff = { pct: Number(ep.pct || 40), duration: Number(ep.duration || 4) };
        else if (effect.key === 'summonCritAspdStacks') uniqueSummonCritAspdStacks = { aspd: Number(ep.aspd || 10), maxStacks: Number(ep.maxStacks || 3), duration: Number(ep.duration || 4) };
        else if (effect.key === 'summonNonCritNoDamage') uniqueSummonNonCritNoDamage = true;
        else if (effect.key === 'genericTakenDamageReducePct') addStatToBucket(reward, 'genericTakenDamageReducePct', Number(ep.pct || 0));
        else if (effect.key === 'uniqueBlockChance') addStatToBucket(reward, 'blockChance', Number(ep.chance || 0));
        else if (effect.key === 'uniqueDeflectDamageReduce') addStatToBucket(reward, 'deflectDamageReduce', Number(ep.pct || 0));
        else if (effect.key === 'blockRecoverEnergyShieldPct') uniqueBlockRecoverEnergyShieldPct = Math.max(uniqueBlockRecoverEnergyShieldPct, Number(ep.pct || 2));
        else if (effect.key === 'blockedDamageTakenPct') uniqueBlockedDamageTakenPct = Math.max(uniqueBlockedDamageTakenPct, Number(ep.pct || 0));
        else if (effect.key === 'uniqueTakenReduceWhen2Enemies') addStatToBucket(reward, 'takenDamageReduceWhen2EnemiesPct', Number(ep.pct || 0));
        else if (effect.key === 'uniqueTakenReduceWhen1Enemy') addStatToBucket(reward, 'takenDamageReduceWhen1EnemyPct', Number(ep.pct || 0));
        else if (effect.key === 'uniqueMaxResAll') addStatToBucket(reward, 'maxResAll', Number(ep.pct || 0));
        else if (effect.key === 'deflectGrantShadowStealth') uniqueDeflectStealth = mergeBetterUniqueParams(uniqueDeflectStealth, { duration: Number(ep.duration || 3), move: Number(ep.move || 20), evasionPct: Number(ep.evasionPct || 20), critDmg: Number(ep.critDmg || 20) });
        else if (effect.key === 'chaosTakenDamageReducePct') uniqueChaosTakenDamageReducePct = Math.max(uniqueChaosTakenDamageReducePct, Number(ep.pct || 15));
        else if (effect.key === 'uniqueGemLevelBonus') addStatToBucket(reward, 'gemLevel', Number(ep.level || 1));
        else if (effect.key === 'lifeRecoupTakenDamage') uniqueLifeRecoupTakenDamage = mergeBetterUniqueParams(uniqueLifeRecoupTakenDamage, { pct: Number(ep.pct || 25), duration: Number(ep.duration || 4) });
        else if (effect.key === 'immuneBleed') uniqueImmuneBleed = true;
        else if (effect.key === 'immuneFreeze') uniqueImmuneFreeze = true;
        else if (effect.key === 'lifePctAsEnergyShield') addStatToBucket(reward, 'energyShield', Math.floor(Math.max(0, baseHp) * Math.max(0, Number(ep.pct || 10)) / 100));
        else if (effect.key === 'overhealCapPct') uniqueOverhealCapPct = Math.max(uniqueOverhealCapPct, Number(ep.pct || 0));
        else if (effect.key === 'dsAndTargetAnyBonus') {
            addStatToBucket(reward, 'ds', Number(ep.ds !== undefined ? ep.ds : 8));
            addStatToBucket(reward, 'targetAny', Number(ep.target !== undefined ? ep.target : 1));
        }
        else if (effect.key === 'poisonDamageMorePct') addStatToBucket(reward, 'poisonDamageMultiplierPct', Number(ep.pct || 25));
        else if (effect.key === 'uniqueMinDmgRoll') addStatToBucket(reward, 'minDmgRoll', Number(ep.pct || 5));
        else if (effect.key === 'hitShockedEnemyDamageMorePct') addStatToBucket(reward, 'shockedEnemyHitDamageMorePct', Number(ep.pct || 50));
        else if (effect.key === 'pursuitMoveSpeed') uniquePursuitMovePct = Math.max(uniquePursuitMovePct, readPursuitMovePct(ep));
        else if (effect.key === 'projectileTargetBonus') {
            if (isDeferredTalentProjectileTargetEffect(effect)) return;
            addStatToBucket(reward, 'targetProjectile', Number(ep.target || 1));
        }
        else if (effect.key === 'projectileExtraShotBonus') addStatToBucket(reward, 'projectileExtraShots', Number(ep.shots || 1));
        else if (effect.key === 'igniteDamageMorePct') addStatToBucket(reward, 'igniteDamageMultiplierPct', Number(ep.pct || 25));
        else if (effect.key === 'cosmosFinalDmg') addStatToBucket(reward, 'pctDmg', Number(ep.pct || 12));
        else if (effect.key === 'cosmosTakenLess') addStatToBucket(reward, 'dr', Number(ep.dr || 8));
        else if (effect.key === 'cosmosSpeedBurst') { addStatToBucket(reward, 'move', Number(ep.move || 12)); addStatToBucket(reward, 'aspd', Number(ep.aspd || 10)); }
        else if (effect.key === 'cosmosPenetration') addStatToBucket(reward, 'resPen', Number(ep.pen || 8));
        else if (effect.key === 'cosmosSustain') { addStatToBucket(reward, 'regen', Number(ep.regen || 1.2)); addStatToBucket(reward, 'leech', Number(ep.leech || 0.8)); }
        else if (effect.key === 'cosmosBossSlayer') { addStatToBucket(reward, 'pctDmg', Number(ep.pct || 14)); addStatToBucket(reward, 'critDmg', Number(ep.critDmg || 20)); }
        else if (effect.key === 'cosmosAlwaysFirstHit') cosmosAlwaysFirstHit = true;
        else if (effect.key === 'cosmosEnergyShieldAmpBypass') { uniqueEsAmpPct = Math.max(uniqueEsAmpPct, Number(ep.ampPct || 25)); cosmosEnergyShieldBypassPct = Math.max(cosmosEnergyShieldBypassPct, Number(ep.bypassPct || 25)); }
        else if (effect.key === 'cosmosOrbitCycle') cosmosOrbitCycle = { high: Number(ep.high || 1.3), low: Number(ep.low || 0.7), step: Number(ep.step || 0.2) };
        else if (effect.key === 'cosmosDeepSeaLeechCaps') cosmosDeepSeaLeechCaps = { rateLessPct: Number(ep.rateLessPct || 20), capMul: Number(ep.capMul || 2) };
        else if (effect.key === 'cosmosTideEsRegenToLife') cosmosTideEsRegenToLife = true;
        else if (effect.key === 'cosmosEqualDamageSplit') cosmosEqualDamageSplit = true;
        else if (effect.key === 'cosmosBalanceMitigation') cosmosBalanceMitigation = true;
        else if (effect.key === 'cosmosTwinStarResonance') cosmosTwinStarResonance = { resonanceMul: Number(ep.resonanceMul || 1.5), supportCapMul: Number(ep.supportCapMul || 0.5) };
        else if (effect.key === 'cosmosJudgmentLightning') cosmosJudgmentLightning = { resDown: Number(ep.resDown || 15), duration: Number(ep.duration || 4) };
        else if (effect.key === 'cosmosDeathResist') cosmosDeathResistPct = Math.max(cosmosDeathResistPct, Number(ep.chance || 12));
        else if (effect.key === 'cosmosVerdictSupportDamage') cosmosVerdictSupportDamagePct += Number(ep.morePerSupportPct || 2);
        else if (effect.key === 'cosmosGuardianConditionInstant') cosmosGuardianConditionInstant = true;
        else if (effect.key === 'cosmosBossDamageMore') cosmosBossDamageMorePct = Math.max(cosmosBossDamageMorePct, Number(ep.morePct || 25));
        else if (effect.key === 'cosmosCometChillNoFreeze') cosmosCometChillNoFreeze = true;
        else if (effect.key === 'fixedAllMaxRes') fixedAllMaxRes = Math.max(1, Math.min(90, Number(ep.max || 82)));
        else if (effect.key === 'stealEliteTrait') uniqueStealEliteTrait = { duration: Number(ep.duration || 30) };
        else if (effect.key === 'kaleidoscopeShield' || effect.key === 'mirrorOppositeRing') { /* item stat path handles these */ }
        else if (effect.key === 'thousandBottles') addThousandBottlesStats(reward);
        else if (effect.key === 'cosmosStatBundle') {
            addStatToBucket(reward, 'pctDmg', Number(ep.pctDmg || 0));
            addStatToBucket(reward, 'dr', Number(ep.dr || 0));
            addStatToBucket(reward, 'move', Number(ep.move || 0));
            addStatToBucket(reward, 'aspd', Number(ep.aspd || 0));
            addStatToBucket(reward, 'resPen', Number(ep.resPen || 0));
            addStatToBucket(reward, 'critDmg', Number(ep.critDmg || 0));
            addStatToBucket(reward, 'regen', Number(ep.regen || 0));
            addStatToBucket(reward, 'leech', Number(ep.leech || 0));
        }

        else if (effect.key === 'abyssSocketOnItem' || effect.key === 'abyssSocketAndJewelAmp') { /* handled by item generation/socket stat merge path */ }
        else if (effect.key === 'astraUniqueConvergence') {
            let uniqueCount = Object.values(game.equipment || {}).filter(it => it && it.rarity === 'unique').length;
            let otherUniques = Math.min(Number(ep.capCount || 8), Math.max(0, uniqueCount - 1));
            addStatToBucket(reward, 'pctDmg', otherUniques * Number(ep.pctPerUnique || 5));
        }
    });

    let virtualVoidCount = getVirtualVoidPassiveCount(), weaponStance = getEquippedWeaponStance();
    safePassives.forEach(id => {
        let node = PASSIVE_TREE.nodes[id];
        if (!node) return;
        if (node.kind === 'void') {
            let entry = getVoidPassiveCraft(id);
            passiveRouting.voidStats(entry, game, getVoidLinkScale(id)).forEach(line => addPassiveLineToBucket(passive, line.id, line.val, weaponStance));
            getTranscendentVoidPassiveStats(id, entry, virtualVoidCount).forEach(line => addStatToBucket(passive, line.stat, line.val));
            return;
        }
        getEffectivePassiveNodeEffects(node).forEach(effect => addPassiveLineToBucket(passive, effect.stat, effect.val, weaponStance));
    });

    accumulateCombatSeasonStats(season, safeSeasonNodes, game.seasonNodeLevels);
    accumulateCombatAscendStats(ascend, safeAscendNodes, game.ascendClass);
    safeRewardBonuses.forEach(entry => {
        if (entry && entry.stat) addStatToBucket(reward, entry.stat, entry.value);
    });
    accumulateCombatLoopStats(reward, game.loop10BonusStats, game.loopDeepStats, game.season);
    let chaosRealmBonus = (ensureChaosRealmState().permanentBonuses || {});
    Object.keys(chaosRealmBonus).forEach(statKey => addStatToBucket(reward, statKey, chaosRealmBonus[statKey] || 0));
    const { runeCorpseExplodeChance, runeCorpseExplodeLifePct, runeResonancePower } =
        accumulateCombatRuneStats(reward, game.underworldRunes);
    applyTimedRewardStats(tick, reward);
    applyAccountRewardStats(reward);
    if (typeof getCosmosBossRelicStatTotals === 'function') {
        let relicStats = getCosmosBossRelicStatTotals();
        Object.keys(relicStats).forEach(statKey => addStatToBucket(reward, statKey, relicStats[statKey]));
    }
    safeJournalBonuses.forEach(entry => {
        if (entry && entry.stat) addStatToBucket(reward, entry.stat, entry.value);
    });
    getBeyondBoundaryGlobalStats(game).forEach(stat => addStatToBucket(reward, stat.id, stat.val));
    let heroDef = game.bloomedClassThisLoop === game.ascendClass
        ? HERO_SELECTION_DEFS[game.bloomedTalentThisLoop] : null;
    (heroDef && Array.isArray(heroDef.stats) ? heroDef.stats : []).forEach(row => {
        if (row && row.stat) addStatToBucket(reward, row.stat, row.value);
    });
    if (game.passiveStarEvolution && Array.isArray(game.journalEntries) && game.journalEntries.includes('passive_star_evolution')) {
        Object.keys(PASSIVE_STAR_BLESSING).forEach(statId => addStatToBucket(starBlessing, statId, PASSIVE_STAR_BLESSING[statId]));
    }
    let talismanSummary = talismanEffects.summarize();
    Object.keys(talismanSummary.stats).forEach(stat => addStatToBucket(reward, stat, talismanSummary.stats[stat]));

    function sumNonSupportStat(statId) {
        return gearBase[statId] + gearExplicit[statId] + passive[statId]
            + season[statId] + ascend[statId] + reward[statId] + (starBlessing[statId] || 0);
    }

    if (attributesOnly && !window.GameModules.combat.supports.grantsAttributes(game, safeEquippedSupports)) return readRequirementAttributes({ gearBase, gearExplicit, passive, season, ascend, support, reward, starBlessing }, game);
    // Offline replay already owns a build memo. Foreground inputs live only through this call.
    const gemEvaluation = getBackgroundBuildMemo(game) ? undefined : createGemBonusEvaluation(resolvedStats);
    let gemSources = getTargetGemBonusSources(game.activeSkill, undefined, resolvedStats, gemEvaluation);
    let skill = window.GameModules.combat.supports.activeSkillStats(gemSources.total);
    const supportValues = window.GameModules.combat.supports.values(skill, {names:safeEquippedSupports,
        bonus:name=>getTargetGemBonusSources(name, undefined, resolvedStats, gemEvaluation).total,
        ownStat:sumNonSupportStat, add:(stat,value)=>addStatToBucket(support,stat,value)});

    addConstellationBuffStat(reward, game);
    // 가호는 소환 칸 차례대로 한도 안에 든 것만 걸린다(단 하나의 사역이면 한도 1). 가호는 summonCap을 바꾸지 않으므로 지금 버킷으로 센다.
    const summonCapTotal = () => (gearBase.summonCap || 0) + (gearExplicit.summonCap || 0) + (passive.summonCap || 0) + (season.summonCap || 0) + (ascend.summonCap || 0) + (support.summonCap || 0) + (reward.summonCap || 0);
    // 단 하나의 사역은 공격 소환수만 하나로 줄인다: 수호 골렘과 가호는 그대로(전령이 보조룬이던 때와 같다)
    const blessingCap = findAllocatedPassiveKeystone('단 하나의 사역') ? Infinity : getSummonCapFromSum(summonCapTotal());
    const auraValues = window.GameModules.combat.supports.auraValues(game, name => getTargetGemBonusSources(name, undefined, resolvedStats, gemEvaluation).total, blessingCap);
    Object.entries(auraValues).forEach(([stat, value]) => addStatToBucket(reward, stat, value));
    if (projectilePatternEffect && !skill.projectilePatternSource) skill = applyProjectilePatternMode(skill, projectilePatternEffect.mode, projectilePatternEffect.source, projectilePatternEffect.damageMultiplier);
    let authoredPassiveRules = typeof applyAuthoredPassiveStatRules === 'function'
        ? applyAuthoredPassiveStatRules({
            buckets: { gearBase, gearExplicit, passive, support, season, ascend, reward, starBlessing },
            skillElement: skill.ele,
            skillTags: skill.tags,
            tick
        })
        : { mystique: { ailment: 'bleed', damagePct: 0, potencyPct: 0 }, devotion: 0, cycle: 0,
            revelation: 'combat', revelationLabel: '전투의 계시', wisdomElement: 'fire',
            combatDamageMorePct: 0, guardTakenLessPct: 0, lifeBonusPct: 0,
            cycleAddedFireFromPhysicalPct: 0, fanaticismStacks: 0, activeCycleBuffEffects: [], flags: {} };
    // 범용 스탯 전환 — 힘: 1당 생명력 +2, 5당 물리 피해 +1% / 민첩: 1당 회피 +3, 1당 정확도 +5, 5당 투사체 피해 +1%
    // / 지능: 1당 ES +2, 5당 주문 피해 +1%. 어떤 출처(장비/패시브/보상)의 스탯이든 합산 후 전환된다.
    let totalStrength = Math.max(0, sumStatAcrossBuckets('strength'));
    let totalDexterity = Math.max(0, sumStatAcrossBuckets('dexterity'));
    let totalIntelligence = Math.max(0, sumStatAcrossBuckets('intelligence'));
    if (attributesOnly) return { strength: totalStrength, dexterity: totalDexterity, intelligence: totalIntelligence };
    if (totalStrength > 0) { addStatToBucket(reward, 'flatHp', totalStrength * 2); addStatToBucket(reward, 'physPctDmg', Math.floor(totalStrength / 5)); }
    if (totalDexterity > 0) { addStatToBucket(reward, 'evasion', totalDexterity * 3); addStatToBucket(reward, 'projectilePctDmg', Math.floor(totalDexterity / 5)); }
    if (totalIntelligence > 0) { addStatToBucket(reward, 'energyShield', totalIntelligence * 2); addStatToBucket(reward, 'spellPctDmg', Math.floor(totalIntelligence / 5)); }
    // 레벨 자동 성장보다 민첩과 장비가 정확도의 주 공급원이 되도록 한다.
    let flatAccuracy = Math.max(0, sumStatAcrossBuckets('accuracy'));
    let accuracyBonusPct = Math.max(0, sumStatAcrossBuckets('accuracyBonusPct'));
    let playerAccuracy = calculatePlayerAccuracy(game.level, totalDexterity, flatAccuracy, accuracyBonusPct);
    passive.projectileExtraShots += getBladeBundleShots(totalStrength, totalDexterity, weaponStance);
    let targetBonus = (gearBase.targetAny + gearExplicit.targetAny + passive.targetAny + season.targetAny + ascend.targetAny + reward.targetAny);
    let totalProjectileExtraShots = gearBase.projectileExtraShots + gearExplicit.projectileExtraShots + passive.projectileExtraShots + season.projectileExtraShots + ascend.projectileExtraShots + reward.projectileExtraShots + sumStatAcrossBuckets('projectileExtraChance') / 100;
    if (Array.isArray(skill.tags) && skill.tags.includes('projectile')) targetBonus += (gearBase.targetProjectile + gearExplicit.targetProjectile + passive.targetProjectile + season.targetProjectile + ascend.targetProjectile + reward.targetProjectile);
    if (Array.isArray(skill.tags) && skill.tags.includes('slam')) targetBonus += (gearBase.targetSlam + gearExplicit.targetSlam + passive.targetSlam + season.targetSlam + ascend.targetSlam + reward.targetSlam);
    if (targetBonus > 0) skill.targets = Math.min(Array.isArray(skill.tags) && skill.tags.includes('projectile') ? 12 : 6, Math.max(1, (skill.targets || 1) + Math.floor(targetBonus)));
    else skill.targets = Math.min(6, Math.max(1, skill.targets || 1));
    addUncappedSkillTargets(skill, game.activeSkill); // 각인의 대상 수, 효과 확장 +N: more targets for target gems, the keystone's cost
    skill.projectileChain = (skill.tags || []).includes('projectile') ? sumStatAcrossBuckets('projectileChain') : 0;   // js/combat-grid.js, js/skill-gem-casts.js
    // 재능 개화 카드(장착) 효과를 보상 버킷에 합산 → 이후 모든 최종 스탯/태그 피해에 반영
    let talentStatMap = (typeof getActiveTalentStatMap === 'function') ? getActiveTalentStatMap() : {};
    if (typeof getActiveTalentCardStatBonuses === 'function') applyStatsToBucket(reward, getActiveTalentCardStatBonuses(tick));
    let talentLine = function (stat, suffix) { let v = talentStatMap[stat]; return v ? _t('재능 개화 +{value}{suffix} (위 합계에 포함)', { value: Math.round(v * 100) / 100, suffix: suffix || '%' }) : null; };

    const taggedSkill = authoredPassiveRules.flags.duel ? { ...skill, tags: [...skill.tags, 'spell'] } : skill;
    const damageSkill = { ...taggedSkill, tags: [...getSkillDamageTagSet(taggedSkill)] };
    let gearTagged = getTaggedDamageBreakdown(gearBase, damageSkill);
    let gearExplicitTagged = getTaggedDamageBreakdown(gearExplicit, damageSkill);
    let passiveTagged = getTaggedDamageBreakdown(passive, damageSkill);
    let seasonTagged = getTaggedDamageBreakdown(season, damageSkill);
    let ascendTagged = getTaggedDamageBreakdown(ascend, damageSkill);
    let supportTagged = getTaggedDamageBreakdown(support, damageSkill);
    let rewardTagged = getTaggedDamageBreakdown(reward, damageSkill);
    let starTagged = getTaggedDamageBreakdown(starBlessing, damageSkill);

    let taggedTotal = gearTagged.total + gearExplicitTagged.total + passiveTagged.total + seasonTagged.total + ascendTagged.total + supportTagged.total + rewardTagged.total + starTagged.total;
    let taggedParts = [].concat(gearTagged.parts, gearExplicitTagged.parts, passiveTagged.parts, seasonTagged.parts, ascendTagged.parts, supportTagged.parts, rewardTagged.parts, starTagged.parts);
    let taggedMap = {};
    taggedParts.forEach(part => {
        let tag = Object.keys(TAGGED_DAMAGE_STAT_BY_TAG).find(key => TAGGED_DAMAGE_STAT_BY_TAG[key] === part.statId);
        if (!tag) return;
        taggedMap[tag] = (taggedMap[tag] || 0) + part.value;
    });
    let taggedSummary = Object.keys(taggedMap).map(tag => `${translateSkillTag(tag)} ${Math.floor(taggedMap[tag])}%`);
    let baseTaggedTotal = taggedTotal;
    function sumStatAcrossBuckets(statId) {
        return gearBase[statId] + gearExplicit[statId] + passive[statId] + season[statId] + ascend[statId] + support[statId] + reward[statId] + (starBlessing[statId] || 0);
    }
    let coreCubeAddedDamagePct = {
        phys: sumStatAcrossBuckets('addedPhysDamagePct'),
        fire: sumStatAcrossBuckets('addedFireDamagePct'),
        cold: sumStatAcrossBuckets('addedColdDamagePct'),
        light: sumStatAcrossBuckets('addedLightDamagePct'),
        chaos: sumStatAcrossBuckets('addedChaosDamagePct')
    };
    let coreCubeFlatElementDamage = {
        fire: sumStatAcrossBuckets('fireFlatDmg'),
        cold: sumStatAcrossBuckets('coldFlatDmg'),
        light: sumStatAcrossBuckets('lightFlatDmg'),
        chaos: sumStatAcrossBuckets('chaosFlatDmg')
    };
    let coreCubeFlatElementDamageTotal = Object.values(coreCubeFlatElementDamage).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    let coreCubeTakenFlatReduce = {
        phys: sumStatAcrossBuckets('physFlatTakenReduce'),
        fire: sumStatAcrossBuckets('fireFlatTakenReduce'),
        cold: sumStatAcrossBuckets('coldFlatTakenReduce'),
        light: sumStatAcrossBuckets('lightFlatTakenReduce'),
        chaos: sumStatAcrossBuckets('chaosFlatTakenReduce'),
        all: sumStatAcrossBuckets('allFlatTakenReduce')
    };
    let coreCubePhysTakenAs = {
        fire: sumStatAcrossBuckets('physTakenAsFire'),
        cold: sumStatAcrossBuckets('physTakenAsCold'),
        light: sumStatAcrossBuckets('physTakenAsLight'),
        chaos: sumStatAcrossBuckets('physTakenAsChaos')
    };
    let coreCubeDoubleDamageChance = sumStatAcrossBuckets('doubleDamageChance');
    let coreCubeSlamEchoDamagePct = sumStatAcrossBuckets('slamEchoDamagePct');
    let crusaderThunderDoctrinePct = 0;
    if (hasKeystone('cr2') && skill.ele === 'light') {
        let firePct = sumStatAcrossBuckets('firePctDmg');
        let coldPct = sumStatAcrossBuckets('coldPctDmg');
        crusaderThunderDoctrinePct = Math.max(0, firePct + coldPct);
        if (crusaderThunderDoctrinePct > 0) {
            taggedTotal += crusaderThunderDoctrinePct;
            taggedSummary.push(_t('천뢰 교리: 화염/냉기 피해 {floor}%를 번개 피해에 추가 적용', { floor: Math.floor(crusaderThunderDoctrinePct) }));
        }
    }

    let hasRandomElementConversion = Array.isArray(skill.randomElementPool) && skill.randomElementPool.length > 0;
    let skillHasElementalConversion = hasRandomElementConversion || ['fire','cold','light','chaos'].includes(skill.ele);

    let randomElementDamagePct = Array.isArray(skill.randomElementPool) && skill.randomElementPool.length > 0 ? {
        fire: sumStatAcrossBuckets('firePctDmg'),
        cold: sumStatAcrossBuckets('coldPctDmg'),
        light: sumStatAcrossBuckets('lightPctDmg')
    } : null;
    if (randomElementDamagePct) {
        let randomElementSummary = Object.entries(randomElementDamagePct)
            .filter(([, value]) => value)
            .map(([ele, value]) => `${ele === 'fire' ? _t('화염') : (ele === 'cold' ? _t('냉기') : _t('번개'))} ${Math.floor(value)}%`);
        if (randomElementSummary.length > 0) taggedSummary.push(_t('무작위 원소별 적용: {summary}', { summary: randomElementSummary.join(' / ') }));
    }

    let weaponBaseDmgPct = Math.max(0, gearBase.weaponFlatDmgPct + gearExplicit.weaponFlatDmgPct
        + passive.weaponFlatDmgPct + season.weaponFlatDmgPct + ascend.weaponFlatDmgPct + reward.weaponFlatDmgPct);
    let gearFlatDmg = (gearBase.flatDmg * (1 + weaponBaseDmgPct / 100)) + gearExplicit.flatDmg;
    let passiveFlatDmg = passive.flatDmg + season.flatDmg + ascend.flatDmg + reward.flatDmg;
    let generalPctDmg = gearBase.pctDmg + gearExplicit.pctDmg + passive.pctDmg + season.pctDmg + ascend.pctDmg + support.pctDmg + reward.pctDmg + starBlessing.pctDmg;
    let summonSharedGeneralPctDmg = Math.max(0, generalPctDmg);
    let dotPctDmg = gearBase.dotPctDmg + gearExplicit.dotPctDmg + passive.dotPctDmg + season.dotPctDmg + ascend.dotPctDmg + support.dotPctDmg + reward.dotPctDmg;
    function sumAilmentChanceStat(statId) {
        return (gearBase[statId] || 0) + (gearExplicit[statId] || 0) + (passive[statId] || 0) + (season[statId] || 0) + (ascend[statId] || 0) + (support[statId] || 0) + (reward[statId] || 0) + (starBlessing[statId] || 0);
    }
    let finalIgniteChance = sumAilmentChanceStat('igniteChance');
    let finalChillChance = sumAilmentChanceStat('chillChance');
    let finalFreezeChance = sumAilmentChanceStat('freezeChance');
    let finalShockChance = sumAilmentChanceStat('shockChance');
    let finalPoisonChance = sumAilmentChanceStat('poisonChance');
    let finalBleedChance = sumAilmentChanceStat('bleedChance');
    let ailmentCritChance = { ignite: 25, chill: 25, freeze: 25, shock: 25, poison: 25, bleed: 25 };
    const bleedChanceMultiplier = authoredPassiveRules.flags.bloodCradle ? 0.7 : 1;
    finalBleedChance *= bleedChanceMultiplier;
    ailmentCritChance.bleed *= bleedChanceMultiplier;
    let isSpellSkill = Array.isArray(skill.tags) && skill.tags.includes('spell');
    // Reuse extra casts; this source applies to spells only and cannot recursively repeat itself.
    if (isSpellSkill) reward.ds += sumStatAcrossBuckets('spellRepeatChance');
    let isDotSkill = window.GameModules.combat.supports.nativeDot(skill);
    let spellFlatDmg = 0;
    if (isSpellSkill) {
        let skillLevel = Number.isFinite(skill.finalLevel) ? skill.finalLevel : 1;
        let spellFlatBonus = gearBase.spellFlatDmg + gearExplicit.spellFlatDmg + passive.spellFlatDmg + season.spellFlatDmg + ascend.spellFlatDmg + reward.spellFlatDmg + support.spellFlatDmg;
        if (uniqueGrandBreachCrown) spellFlatBonus += Math.floor(Math.max(0, localDefenseTotals.energyShield) * (Math.max(0, uniqueGrandBreachCrown.spellFromEsPct || 10) / 100));
        let spellFlatPct = gearBase.spellFlatPct + gearExplicit.spellFlatPct + passive.spellFlatPct + season.spellFlatPct + ascend.spellFlatPct + reward.spellFlatPct + support.spellFlatPct;
        spellFlatDmg = Math.max(1, (getGemSpellBaseDamage(skill, skillLevel) + spellFlatBonus) * (1 + spellFlatPct / 100));
        spellFlatDmg *= (1 + Math.max(0, Number(skill.spellFlatMulBonus) || 0) / 100);
        // 부패 증식(워록 wlk2): 지속 피해 배율 20% 증폭과 동일하게 주문 내장 피해도 20% 증가시킨다.
        if (hasKeystone('wlk2')) spellFlatDmg *= 1.20;
    }
    // 속성별 기본 피해(flat)는 일반 피해 풀에 섞지 않고, 아래에서 속성 타입을 유지한 별도 타격으로 적용한다.
    let totalFlatDmg = (isSpellSkill ? spellFlatDmg : (baseDmg + gearFlatDmg + passiveFlatDmg));
    let codexBonusRatio = 1 + (getCodexBonusPct() / 100);

    // 속성별 기본 피해(flat): 무기/반지/장갑의 속성 flat 옵션 + 코어 큐브 속성 flat을 합산하여,
    // 각 속성의 피해% 증가(원소는 원소 피해% 포함)와 전체 피해 증가를 반영한 1타 기준 피해로 환산한다.
    // 실제 타격 시에는 해당 속성 저항으로 경감되고 치명타/굴림 보정을 함께 받는다.
    let flatElementSources = {
        phys: sumStatAcrossBuckets('physFlatDmg'),
        fire: sumStatAcrossBuckets('fireFlatDmg'),
        cold: sumStatAcrossBuckets('coldFlatDmg'),
        light: sumStatAcrossBuckets('lightFlatDmg'),
        chaos: sumStatAcrossBuckets('chaosFlatDmg')
    };
    let flatElementElementalPct = sumStatAcrossBuckets('elementalPctDmg');
    let flatElementPctByEle = {
        phys: sumStatAcrossBuckets('physPctDmg'),
        fire: sumStatAcrossBuckets('firePctDmg') + flatElementElementalPct,
        cold: sumStatAcrossBuckets('coldPctDmg') + flatElementElementalPct,
        light: sumStatAcrossBuckets('lightPctDmg') + flatElementElementalPct,
        chaos: sumStatAcrossBuckets('chaosPctDmg')
    };
    let flatElementSkillMul = (skill.dmg || skill.baseDmg || 1) * codexBonusRatio;
    let flatElementHitDamage = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0 };
    ['phys', 'fire', 'cold', 'light', 'chaos'].forEach(ele => {
        let amt = Math.max(0, Number(flatElementSources[ele]) || 0);
        if (amt <= 0) return;
        let inc = 1 + (generalPctDmg + Math.max(0, flatElementPctByEle[ele])) / 100;
        flatElementHitDamage[ele] = amt * inc * flatElementSkillMul;
    });

    let gearFlatHp = gearBase.flatHp + gearExplicit.flatHp;
    let passiveFlatHp = passive.flatHp + season.flatHp + ascend.flatHp + reward.flatHp;
    let totalFlatHp = baseHp + gearFlatHp + passiveFlatHp + starBlessing.flatHp;
    let totalPctHp = gearBase.pctHp + gearExplicit.pctHp + passive.pctHp + season.pctHp + ascend.pctHp + support.pctHp + reward.pctHp;
    let finalMaxHp = Math.floor(totalFlatHp * (1 + totalPctHp / 100) * codexBonusRatio);

    let hpScaleRatio = Math.max(0, finalMaxHp * (skill.hpDmgScale || 0));
    let hpFlatBonus = Math.floor(totalFlatDmg * hpScaleRatio);
    let scaledFlatDmg = totalFlatDmg + hpFlatBonus;
    if (skill.shieldArmorDamageRatio) {
        scaledFlatDmg = Math.max(1, shieldArmorForDamage * Math.max(0, Number(skill.shieldArmorDamageRatio) || 0));
    }
    let talentSourceStats = {
        elementalPct: sumStatAcrossBuckets('elementalPctDmg'),
        firePct: sumStatAcrossBuckets('firePctDmg'),
        coldPct: sumStatAcrossBuckets('coldPctDmg'),
        lightPct: sumStatAcrossBuckets('lightPctDmg'),
        summonPct: sumStatAcrossBuckets('summonPctDmg')
    };
    let preciseTalentDerived = typeof getTalentPreciseDerivedBonuses === 'function'
        ? getTalentPreciseDerivedBonuses({ ...talentSourceStats, skill })
        : { skillIncreasePct: 0 };
    taggedTotal += Math.max(0, Number(preciseTalentDerived.skillIncreasePct) || 0);
    let baseDamageIncreaseMultiplier = (1 + (generalPctDmg + taggedTotal + (Number(skill.forgeDmgPct) || 0)) / 100) * (skill.dmg || skill.baseDmg || 1) * codexBonusRatio; // + 룬 강화의 피해 증가
    baseDamageIncreaseMultiplier *= (1 + Math.max(0, Number(skill.flatSkillDmgPct) || 0) / 100);
    let finalBaseDmg = Math.floor(scaledFlatDmg * baseDamageIncreaseMultiplier);
    let equippedShield = game.equipment && game.equipment['방패'];
    if (skill.shieldDamageBonusPct && equippedShield && equippedShield.slot === '방패') {
        finalBaseDmg = Math.floor(finalBaseDmg * (1 + Math.max(0, Number(skill.shieldDamageBonusPct) || 0) / 100));
    }

    let gearAspd = gearBase.aspd + gearExplicit.aspd;
    let passiveAspd = passive.aspd + season.aspd + ascend.aspd + reward.aspd;
    let totalAspdPct = gearAspd + passiveAspd + support.aspd + (Number(skill.forgeAspdPct) || 0);   // 룬 강화의 속도 증가도 합한다
    let rawAspd = (1.0 + glovePairAspdBonus) * (1 + totalAspdPct / 100) * (skill.spd || skill.baseSpd || 1) * 0.88;
    // 극한의 속사(레인저 r9): 공격 속도 소프트캡 기준치 +2
    let aspdSoftCapKnee = (hasKeystone('r9')) ? 7 : 5;
    if (typeof getTalentAttackSpeedSoftcapKnee === 'function') aspdSoftCapKnee = getTalentAttackSpeedSoftcapKnee(aspdSoftCapKnee);
    let finalAspd = rawAspd <= aspdSoftCapKnee ? rawAspd : (aspdSoftCapKnee + Math.pow(Math.max(0, rawAspd - aspdSoftCapKnee), 0.72));
    const skillDelayPct = Math.min(SKILL_DELAY_REDUCE_CAP, sumStatAcrossBuckets('skillDelayReduce'));
    finalAspd = Math.min(12, finalAspd / (1 - skillDelayPct / 100));
    finalAspd = scaleKeystoneAttackSpeed(finalAspd, authoredPassiveRules.flags);
    if (authoredPassiveRules.flags.bloodAcceleration && tick.get('leechActive')) {
        finalAspd = Math.min(12, finalAspd * 1.15);
    }

    let gearCrit = gearBase.crit + gearExplicit.crit;
    let passiveCrit = passive.crit + season.crit + ascend.crit + reward.crit;
    let finalCrit = (2.5 + gearCrit + passiveCrit + support.crit + (skill.crit || 0)) * 0.82;
    let finalMove = baseMove + gearBase.move + gearExplicit.move + passive.move + season.move + ascend.move + support.move + reward.move + starBlessing.move;
    if (authoredPassiveRules.flags.bloodAcceleration && tick.get('leechActive')) finalMove *= 1.15;
    let danceStacks = uniqueEvasionDance ? tick.get('evasionDanceStacks') : null;
    let activeEvasionDanceStacks = danceStacks !== null
        ? Math.max(0, Math.min(uniqueEvasionDance.maxStacks, danceStacks))
        : 0;
    if (activeEvasionDanceStacks > 0) finalMove += activeEvasionDanceStacks * Math.max(0, uniqueEvasionDance.movePerStack);
    game.oceanOxygenMaxBonus = Math.max(0, gearBase.oxygenMax + gearExplicit.oxygenMax + passive.oxygenMax + season.oxygenMax + ascend.oxygenMax + reward.oxygenMax);
    game.oceanOxygenDrainReductionPct = Math.max(0, Math.min(80, gearBase.oxygenRegen + gearExplicit.oxygenRegen + passive.oxygenRegen + season.oxygenRegen + ascend.oxygenRegen + reward.oxygenRegen));
    let activeShadowStealth = uniqueDeflectStealth && tick.get('shadowStealth');
    if (activeShadowStealth) finalMove += Math.max(0, Number(uniqueDeflectStealth.move || 20));
    let killMoveStacks = uniqueKillMoveStacks ? tick.get('killMoveStacks') : null;
    if (killMoveStacks !== null) finalMove += killMoveStacks * Math.max(0, Number(uniqueKillMoveStacks.movePerStack || 10));
    finalMove += tick.get('regionMoveBonus');
    let zonePenalty = getZone(game.currentZoneId) || getZone(0);
    // The attack speed this zone takes away (gravity, pressure): other zones' map cards put it back (js/combat-ehp.js).
    let zoneSpeedMultiplier = 1;
    if (zonePenalty && (zonePenalty.type === 'underworld' || (zonePenalty.milestonePinnacle && zonePenalty.underworldPenaltyFloor))) {
        let uf = Math.max(1, Math.floor(zonePenalty.underworldPenaltyFloor || zonePenalty.floor || 1));
        let skyStoneReduction = typeof getSkyStoneReductionPct === 'function' ? getSkyStoneReductionPct() : 0;
        let gravityActionMultiplier = getUnderworldGravityActionMultiplier(uf, skyStoneReduction);
        finalAspd *= gravityActionMultiplier;
        finalMove *= gravityActionMultiplier;
        zoneSpeedMultiplier *= gravityActionMultiplier;
    }
    let oceanPressureDamageMul = 1;
    let oceanCurrentResPenaltyF = 0;
    let oceanCurrentResPenaltyC = 0;
    if (zonePenalty && (zonePenalty.type === 'oceanDepth' || Number(zonePenalty.oceanPressureDepthTier) > 0)) {
        let depthTier = Math.max(0, Math.floor(zonePenalty.oceanPressureDepthTier || zonePenalty.depthTier || 0));
        let pressureResistPct = Math.max(0, Math.min(80, sumStatAcrossBuckets('oceanPressureResist') + (typeof getOceanPressureResistUpgradePct === 'function' ? getOceanPressureResistUpgradePct() : 0)));
        let pressureSlow = Math.min(0.65, depthTier * 0.05) * (1 - pressureResistPct / 100);
        finalAspd *= (1 - pressureSlow);
        zoneSpeedMultiplier *= (1 - pressureSlow);
        oceanPressureDamageMul *= (1 - pressureSlow * 0.6);
        // 이동속도는 수압의 영향을 압축해서 받아 100%에 가깝게 유지(체감 페널티 완만화)
        finalMove *= (1 - pressureSlow * 0.2);
        if (hasOceanCurrent(zonePenalty, 'riptide')) finalMove *= 0.85;
        if (hasOceanCurrent(zonePenalty, 'bioluminescence')) playerAccuracy *= 0.82;
        if (hasOceanCurrent(zonePenalty, 'warm_current')) oceanCurrentResPenaltyF = 12;
        if (hasOceanCurrent(zonePenalty, 'cold_current')) oceanCurrentResPenaltyC = 12;
    }
    if (zonePenalty && zonePenalty.bloomTrial && zonePenalty.underworldPenaltyFloor) {
        // 개화 시련은 입장 기준인 지하계와 같은 중력 완화 수단을 인정한다.
        let uf = Math.max(1, Math.floor(zonePenalty.underworldPenaltyFloor || 1));
        let skyStoneReduction = typeof getSkyStoneReductionPct === 'function' ? getSkyStoneReductionPct() : 0;
        let gravityActionMultiplier = getUnderworldGravityActionMultiplier(uf, skyStoneReduction);
        finalAspd *= gravityActionMultiplier;
        finalMove *= gravityActionMultiplier;
        zoneSpeedMultiplier *= gravityActionMultiplier;
    }
    let currentStatsZone = getZone(game.currentZoneId);
    let activeCosmosMastery = currentStatsZone && currentStatsZone.type === 'cosmos' && typeof window.getCosmosMasteryValue === 'function';
    let cosmosMasteryFinalDamagePct = activeCosmosMastery ? Math.max(0, Number(window.getCosmosMasteryValue('resonanceDrive')) || 0) * 0.6 : 0;
    let cosmosMasteryTakenLessPct = activeCosmosMastery ? Math.max(0, Number(window.getCosmosMasteryValue('riftGuard')) || 0) * 0.7 : 0;
    let cosmosMasteryBossDamagePct = activeCosmosMastery ? Math.max(0, Number(window.getCosmosMasteryValue('starbreaker')) || 0) * 1.8 : 0;
    let finalDamageMultiplier = (1 + cosmosMasteryFinalDamagePct / 100) * oceanPressureDamageMul;
    finalDamageMultiplier *= 1 + Math.max(0, authoredPassiveRules.combatDamageMorePct) / 100;
    finalDamageMultiplier *= 1 + getLoopDeepMorePct(game.loopDeepStats) / 100;
    finalDamageMultiplier *= 1 + getWorldTreeBarkEffect().damagePct / 100;
    if (authoredPassiveRules.flags.selfExperiment) finalDamageMultiplier *= 1 + tick.get('playerAilmentCount') * 0.05;   // 자가실험
    let wisdomLeapActive = typeof findAllocatedPassiveKeystone === 'function'
        && !!findAllocatedPassiveKeystone('지혜의 도약');
    let passiveWisdomElement = wisdomLeapActive ? authoredPassiveRules.wisdomElement : '';
    if (authoredPassiveRules.fanaticismStacks > 0) {
        finalDamageMultiplier *= 1 + authoredPassiveRules.fanaticismStacks * 0.015;
    }
    cosmosBossDamageMorePct = Math.max(cosmosBossDamageMorePct, cosmosMasteryBossDamagePct);
    if (uniqueLabyrinthShackles) {
        finalDamageMultiplier *= getLabyrinthShacklesDamageMultiplier(finalMove);
        finalMove = 100;
    }
    
    let extraFlatArmor = passive.armor + season.armor + ascend.armor + reward.armor;
    let extraFlatEvasion = passive.evasion + season.evasion + ascend.evasion + reward.evasion;
    let extraFlatEnergyShield = passive.energyShield + season.energyShield + ascend.energyShield + reward.energyShield;
    let gearArmor = localDefenseTotals.armor + extraFlatArmor;
    let gearEvasion = localDefenseTotals.evasion + extraFlatEvasion;
    let gearEnergyShield = localDefenseTotals.energyShield + extraFlatEnergyShield;
    let totalArmorPct = passive.armorPct + season.armorPct + ascend.armorPct + reward.armorPct + globalDefensePct.armor;
    let totalEvasionPct = passive.evasionPct + season.evasionPct + ascend.evasionPct + reward.evasionPct + globalDefensePct.evasion + (activeShadowStealth ? Math.max(0, Number(uniqueDeflectStealth.evasionPct || 20)) : 0);
    totalEvasionPct += activeEvasionDanceStacks * Math.max(0, uniqueEvasionDance ? uniqueEvasionDance.evasionPctPerStack : 0);
    let totalEnergyShieldPct = passive.energyShieldPct + season.energyShieldPct + ascend.energyShieldPct + reward.energyShieldPct + globalDefensePct.energyShield;
    let finalArmor = Math.max(0, Math.floor(gearArmor * (1 + totalArmorPct / 100)));
    let finalEvasion = Math.max(0, Math.floor(gearEvasion * (1 + totalEvasionPct / 100)));
    let finalEnergyShield = Math.max(0, Math.floor(gearEnergyShield * (1 + totalEnergyShieldPct / 100)));
    let omniscientKeystone = typeof findAllocatedPassiveKeystone === 'function' && findAllocatedPassiveKeystone('사중합일');
    let omniscientActive = !!omniscientKeystone && totalStrength >= 14 && totalStrength === totalDexterity
        && totalDexterity === totalIntelligence && totalIntelligence === Math.max(0, passive.mystique);
    if (omniscientActive) finalEnergyShield += Math.floor((totalStrength + totalDexterity + totalIntelligence + passive.mystique) * 2);
    if (uniqueGrandBreachCrown) finalEnergyShield = Math.max(0, Math.floor(finalEnergyShield * (1 + Math.max(0, uniqueGrandBreachCrown.esPct || 30) / 100)));
    if (uniqueEsAmpPct > 0) finalEnergyShield = Math.floor(finalEnergyShield * (1 + uniqueEsAmpPct / 100));
    let finalEnergyShieldRegenRate = Math.max(0, 12.5 + gearBase.energyShieldRegen + gearExplicit.energyShieldRegen + passive.energyShieldRegen + season.energyShieldRegen + ascend.energyShieldRegen + support.energyShieldRegen + reward.energyShieldRegen);
    let finalEnergyShieldRechargeDelay = Math.max(0.25, 1 - (gearBase.energyShieldRechargeFaster + gearExplicit.energyShieldRechargeFaster + passive.energyShieldRechargeFaster + season.energyShieldRechargeFaster + ascend.energyShieldRechargeFaster + support.energyShieldRechargeFaster + reward.energyShieldRechargeFaster));
    let referenceIncomingPhysical = Math.max(1, Math.floor((2 + ((getZone(game.currentZoneId) || { tier: 1 }).tier || 1) * 3.1)));
    let armorReduction = getArmorPhysicalReductionPct(finalArmor, referenceIncomingPhysical);
    let enemyAccuracy = getEnemyAccuracyForZone(getZone(game.currentZoneId) || getZone(0));
    let evadeChance = getEvasionChancePct(finalEvasion, enemyAccuracy);
    let finalDeflectChance = Math.max(0, gearBase.deflectChance + gearExplicit.deflectChance + passive.deflectChance + season.deflectChance + ascend.deflectChance + support.deflectChance + reward.deflectChance);
    let finalDeflectDamageReduce = Math.max(0, gearBase.deflectDamageReduce + gearExplicit.deflectDamageReduce + passive.deflectDamageReduce + season.deflectDamageReduce + ascend.deflectDamageReduce + support.deflectDamageReduce + reward.deflectDamageReduce);

    let finalCritDmg = CRIT_DAMAGE_BASE_MULTIPLIER + gearBase.critDmg + gearExplicit.critDmg + passive.critDmg + season.critDmg + ascend.critDmg + support.critDmg + reward.critDmg + (skill.critDmgBonus || 0) + (activeShadowStealth ? Math.max(0, Number(uniqueDeflectStealth.critDmg || 20)) : 0);
    let rawLeech = (skill.leech || 0) + gearBase.leech + gearExplicit.leech + passive.leech + season.leech + ascend.leech + support.leech + reward.leech;
    let wildnessLeech = hasKeystone('sb3') ? 3.5 : 0;
    rawLeech += wildnessLeech;
    let finalLeech = applyLeechSoftcap(rawLeech - wildnessLeech) + wildnessLeech;
    let finalSpellLeech = applyLeechSoftcap(sumStatAcrossBuckets('spellLeech') + (skill.spellLeech || 0));
    if (isSpellSkill) finalCritDmg += sumStatAcrossBuckets('spellCritDmg');
    if (uniqueLeechEfficiencyOnKill && tick.get('leechEfficiency')) {
        finalLeech *= (1 + Math.max(0, uniqueLeechEfficiencyOnKill.efficiencyPct || 0) / 100);
        finalSpellLeech *= (1 + Math.max(0, uniqueLeechEfficiencyOnKill.efficiencyPct || 0) / 100);
    }
    let finalLeechRateCap = gearBase.leechRateCap + gearExplicit.leechRateCap + passive.leechRateCap + season.leechRateCap + ascend.leechRateCap + support.leechRateCap + reward.leechRateCap;
    let finalLeechTotalCap = gearBase.leechTotalCap + gearExplicit.leechTotalCap + passive.leechTotalCap + season.leechTotalCap + ascend.leechTotalCap + support.leechTotalCap + reward.leechTotalCap;
    let finalLeechInstanceCap = gearBase.leechInstanceCap + gearExplicit.leechInstanceCap + passive.leechInstanceCap + season.leechInstanceCap + ascend.leechInstanceCap + support.leechInstanceCap + reward.leechInstanceCap;
    let finalLeechKeepFullLife = gearBase.leechKeepFullLife + gearExplicit.leechKeepFullLife + passive.leechKeepFullLife + season.leechKeepFullLife + ascend.leechKeepFullLife + support.leechKeepFullLife + reward.leechKeepFullLife;
    if (cosmosDeepSeaLeechCaps) {
        finalLeech *= Math.max(0, 1 - Math.max(0, cosmosDeepSeaLeechCaps.rateLessPct || 20) / 100);
        finalSpellLeech *= Math.max(0, 1 - Math.max(0, cosmosDeepSeaLeechCaps.rateLessPct || 20) / 100);
        finalLeechRateCap += LEECH_BASE_RATE_CAP_PCT * Math.max(0, (cosmosDeepSeaLeechCaps.capMul || 2) - 1);
        finalLeechTotalCap += LEECH_BASE_TOTAL_CAP_PCT * Math.max(0, (cosmosDeepSeaLeechCaps.capMul || 2) - 1);
        finalLeechInstanceCap += LEECH_BASE_INSTANCE_CAP_PCT * Math.max(0, (cosmosDeepSeaLeechCaps.capMul || 2) - 1);
    }
    // 저항과 같은 방식으로 상한 적용 전 합계(rawDr)를 함께 들고 다닌다.
    // 캐릭터 탭이 "적용값 (비-제한값)"으로 표기하려면 잘리기 전 값이 필요하다.
    let rawDr = gearBase.dr + gearExplicit.dr + passive.dr + season.dr + ascend.dr + support.dr + reward.dr;
    let finalDr = Math.min(PLAYER_PHYSICAL_REDUCTION_CAP_PCT, rawDr);
    let finalPhysIgnore = gearBase.physIgnore + gearExplicit.physIgnore + passive.physIgnore + season.physIgnore + ascend.physIgnore + support.physIgnore + reward.physIgnore + (skill.physIgnoreBonus || 0);
    let allowNegativePhysIgnore = false;
    let warriorPhysDamageMultiplier = 1;
    let warriorTakenDamageMultiplier = 1;
    let genericTakenDamageMultiplier = 1;
    genericTakenDamageMultiplier *= 1 - Math.max(0, authoredPassiveRules.guardTakenLessPct) / 100;
    let forbiddenManifestation = typeof findAllocatedPassiveKeystone === 'function' && findAllocatedPassiveKeystone('금단의 만상');
    if (forbiddenManifestation) {
        finalArmor = Math.floor(finalArmor * 0.4);
        finalEvasion = Math.floor(finalEvasion * 0.4);
        finalEnergyShield = Math.floor(finalEnergyShield * 0.4);
        finalDeflectChance = Math.min(25, finalDeflectChance);
    }
    if (authoredPassiveRules.fanaticismStacks > 0) {
        let defenseMultiplier = Math.max(0, 1 - authoredPassiveRules.fanaticismStacks * 0.0075);
        finalArmor = Math.floor(finalArmor * defenseMultiplier);
        finalEvasion = Math.floor(finalEvasion * defenseMultiplier);
        finalEnergyShield = Math.floor(finalEnergyShield * defenseMultiplier);
        finalAspd = Math.min(12, finalAspd * (1 + authoredPassiveRules.fanaticismStacks * 0.005));
    }
    let genericTakenDamageReducePct = Math.max(0, Math.min(90, (gearBase.genericTakenDamageReducePct || 0) + (gearExplicit.genericTakenDamageReducePct || 0) + (passive.genericTakenDamageReducePct || 0) + (season.genericTakenDamageReducePct || 0) + (ascend.genericTakenDamageReducePct || 0) + (support.genericTakenDamageReducePct || 0) + (reward.genericTakenDamageReducePct || 0)));
    genericTakenDamageMultiplier *= (1 - genericTakenDamageReducePct / 100);
    let bossDamageDealtMultiplier = 1;
    let bossTakenDamageMultiplier = 1;
    let ailmentResistBonusPct = 0;
    let inquisitorAbsoluteDoctrinePct = 0;
    let inquisitorResonanceBonus = 0;
    let swiftOpeningTakenMultiplier = 1;
    let guardianReflectDamage = 0;
    let guardianBlockChance = 0;
    let guardianDamageNullifyChance = 0;
    let guardianHitCapPct = 0;
    let guardianArmorDamageBonus = false;
    let sbSummonAspdBonus = 0;
    let sbPlayerAttackPower = 0;
    let sbSummonAttackPower = 0;
    let sbSummonShareToPlayer = 0;
    let ailmentResistPenPct = 0;
    let crusaderLightningIgnoreRes = false;
    let crusaderNoResPenOnLightning = false;
    let crusaderHolyFlatDmg = 0;
    let crusaderHolyScaledDmg = 0;
    let baseDsFromSources = gearBase.ds + gearExplicit.ds + passive.ds + season.ds + ascend.ds + support.ds + reward.ds;
    let skillDsBonus = skill.dsBonus || 0;
    let finalDs = baseDsFromSources + skillDsBonus;
    let finalSlamEchoChance = gearBase.slamEchoChance + gearExplicit.slamEchoChance + passive.slamEchoChance + season.slamEchoChance + ascend.slamEchoChance + support.slamEchoChance + reward.slamEchoChance;
    let finalSlamEchoDamagePct = Math.max(0, coreCubeSlamEchoDamagePct || 0);
    let finalRegen = gearBase.regen + gearExplicit.regen + passive.regen + season.regen + ascend.regen + support.regen + reward.regen + (skill.regenBonus || 0);
    let flatRegen = gearBase.regenFlat + gearExplicit.regenFlat + passive.regenFlat + season.regenFlat + ascend.regenFlat + support.regenFlat + reward.regenFlat;
    finalRegen += (flatRegen / Math.max(1, finalMaxHp)) * 100;
    if (cosmosTideEsRegenToLife) { finalRegen += Math.max(0, finalEnergyShieldRegenRate); finalEnergyShieldRegenRate = 0; }
    if (activeUniqueIds.has('uj_hurried_mind')) {
        if (tick.get('aliveEnemies') === 0) finalMove *= 1.5;
    }
    let finalRegenSuppress = gearBase.regenSuppress + gearExplicit.regenSuppress + passive.regenSuppress + season.regenSuppress + ascend.regenSuppress + support.regenSuppress + reward.regenSuppress;
    let finalResPen = gearBase.resPen + gearExplicit.resPen + passive.resPen + season.resPen + ascend.resPen + support.resPen + reward.resPen + (skill.resPenBonus || 0);
    let finalChillEffectReducePct = gearBase.chillEffectReducePct + gearExplicit.chillEffectReducePct + passive.chillEffectReducePct + season.chillEffectReducePct + ascend.chillEffectReducePct + support.chillEffectReducePct + reward.chillEffectReducePct;
    let finalFreezeDurationReducePct = gearBase.freezeDurationReducePct + gearExplicit.freezeDurationReducePct + passive.freezeDurationReducePct + season.freezeDurationReducePct + ascend.freezeDurationReducePct + support.freezeDurationReducePct + reward.freezeDurationReducePct;
    let finalShockEffectReducePct = gearBase.shockEffectReducePct + gearExplicit.shockEffectReducePct + passive.shockEffectReducePct + season.shockEffectReducePct + ascend.shockEffectReducePct + support.shockEffectReducePct + reward.shockEffectReducePct;
    let finalCritResist = (gearBase.critResist || 0) + (gearExplicit.critResist || 0) + (passive.critResist || 0) + (season.critResist || 0) + (ascend.critResist || 0) + (support.critResist || 0) + (reward.critResist || 0);
    let finalIgniteDamageReducePct = gearBase.igniteDamageReducePct + gearExplicit.igniteDamageReducePct + passive.igniteDamageReducePct + season.igniteDamageReducePct + ascend.igniteDamageReducePct + support.igniteDamageReducePct + reward.igniteDamageReducePct;
    let finalBleedDamageReducePct = gearBase.bleedDamageReducePct + gearExplicit.bleedDamageReducePct + passive.bleedDamageReducePct + season.bleedDamageReducePct + ascend.bleedDamageReducePct + support.bleedDamageReducePct + reward.bleedDamageReducePct;
    let finalPoisonDamageReducePct = gearBase.poisonDamageReducePct + gearExplicit.poisonDamageReducePct + passive.poisonDamageReducePct + season.poisonDamageReducePct + ascend.poisonDamageReducePct + support.poisonDamageReducePct + reward.poisonDamageReducePct;
    let finalDotTakenDamageReducePct = gearBase.dotTakenDamageReducePct + gearExplicit.dotTakenDamageReducePct + passive.dotTakenDamageReducePct + season.dotTakenDamageReducePct + ascend.dotTakenDamageReducePct + support.dotTakenDamageReducePct + reward.dotTakenDamageReducePct;
    let finalTakenDamageReduceWhen2EnemiesPct = gearBase.takenDamageReduceWhen2EnemiesPct + gearExplicit.takenDamageReduceWhen2EnemiesPct + passive.takenDamageReduceWhen2EnemiesPct + season.takenDamageReduceWhen2EnemiesPct + ascend.takenDamageReduceWhen2EnemiesPct + support.takenDamageReduceWhen2EnemiesPct + reward.takenDamageReduceWhen2EnemiesPct;
    let finalTakenDamageReduceWhen1EnemyPct = gearBase.takenDamageReduceWhen1EnemyPct + gearExplicit.takenDamageReduceWhen1EnemyPct + passive.takenDamageReduceWhen1EnemyPct + season.takenDamageReduceWhen1EnemyPct + ascend.takenDamageReduceWhen1EnemyPct + support.takenDamageReduceWhen1EnemyPct + reward.takenDamageReduceWhen1EnemyPct;
    let finalIgniteDamageMultiplierPct = gearBase.igniteDamageMultiplierPct + gearExplicit.igniteDamageMultiplierPct + passive.igniteDamageMultiplierPct + season.igniteDamageMultiplierPct + ascend.igniteDamageMultiplierPct + support.igniteDamageMultiplierPct + reward.igniteDamageMultiplierPct;
    let finalPoisonDamageMultiplierPct = gearBase.poisonDamageMultiplierPct + gearExplicit.poisonDamageMultiplierPct + passive.poisonDamageMultiplierPct + season.poisonDamageMultiplierPct + ascend.poisonDamageMultiplierPct + support.poisonDamageMultiplierPct + reward.poisonDamageMultiplierPct;
    let finalChillEffectBonusPct = Math.max(0, sumStatAcrossBuckets('chillEffect'));
    let finalShockEffectBonusPct = (gearExplicit.shockEffect || 0) + (passive.shockEffect || 0) + (season.shockEffect || 0) + (ascend.shockEffect || 0) + (reward.shockEffect || 0) + Math.max(0, Number(uniqueShockTracer && uniqueShockTracer.shockEffectPct || 0));
    let finalMinDmgRoll = Math.max(5, 80 + gearBase.minDmgRoll + gearExplicit.minDmgRoll + passive.minDmgRoll + season.minDmgRoll + ascend.minDmgRoll + support.minDmgRoll + reward.minDmgRoll);
    let finalMaxDmgRoll = Math.max(finalMinDmgRoll, 100 + gearBase.maxDmgRoll + gearExplicit.maxDmgRoll + passive.maxDmgRoll + season.maxDmgRoll + ascend.maxDmgRoll + support.maxDmgRoll + reward.maxDmgRoll);
    if (authoredPassiveRules.flags.maximumRoll) finalMinDmgRoll = finalMaxDmgRoll;
    if (uniqueMaxHpPct) finalMaxHp = Math.floor(finalMaxHp * (1 + Math.max(0, uniqueMaxHpPct) / 100));
    let meleeArmorAmpStacks = uniqueMeleeArmorAmp ? tick.get('meleeArmorAmpStacks') : null;
    if (meleeArmorAmpStacks !== null) {
        let stacks = Math.max(0, Math.min(Math.floor(uniqueMeleeArmorAmp.maxStacks || 3), meleeArmorAmpStacks));
        if (stacks > 0) finalArmor = Math.floor(finalArmor * Math.pow(1 + Math.max(0, Number(uniqueMeleeArmorAmp.ampPct || 5)) / 100, stacks));
    }
    if (uniqueMinRollEqualsMaxRoll) {
        finalMaxDmgRoll = getAbsoluteFloorDamageRoll(finalMaxDmgRoll);
        finalMinDmgRoll = finalMaxDmgRoll;
    }
    if (uniqueHpToPhysPct && skill.ele === 'phys' && !skillHasElementalConversion) finalBaseDmg = Math.floor(finalBaseDmg * (1 + (finalMaxHp / 100) / 100));

    let resistPenalty = getCampaignResistPenalty(game.maxZoneId);
    let resistanceBlendBonus = 0;
    let resistanceBlendMaxBonus = 0;
    let crusaderLightningMaxResBonus = 0;
    let elementalistResistanceShift = { resF: 0, resC: 0, resL: 0, resChaos: 0 };
    let elementalistChaosConversionBonus = 0;
    let sharedElementalMaxRes = gearBase.maxResAll + gearExplicit.maxResAll + passive.maxResAll + season.maxResAll + ascend.maxResAll + support.maxResAll + reward.maxResAll;
    let finalMaxResF = Math.min(90, 75 + sharedElementalMaxRes + gearBase.maxResF + gearExplicit.maxResF + passive.maxResF + season.maxResF + ascend.maxResF + support.maxResF + reward.maxResF);
    let finalMaxResC = Math.min(90, 75 + sharedElementalMaxRes + gearBase.maxResC + gearExplicit.maxResC + passive.maxResC + season.maxResC + ascend.maxResC + support.maxResC + reward.maxResC);
    let finalMaxResL = Math.min(90, 75 + sharedElementalMaxRes + gearBase.maxResL + gearExplicit.maxResL + passive.maxResL + season.maxResL + ascend.maxResL + support.maxResL + reward.maxResL);
    let finalMaxResChaos = Math.min(90, 75 + gearBase.maxResChaos + gearExplicit.maxResChaos + passive.maxResChaos + season.maxResChaos + ascend.maxResChaos + support.maxResChaos + reward.maxResChaos);
    let hasElementalistPrismaticShell = hasKeystone('e2');
    if (hasElementalistPrismaticShell) {
        elementalistResistanceShift = { resF: 15, resC: 15, resL: 15, resChaos: -10 };
        finalMaxResF = Math.min(90, finalMaxResF + 3);
        finalMaxResC = Math.min(90, finalMaxResC + 3);
        finalMaxResL = Math.min(90, finalMaxResL + 3);
    }
    let rawResF = gearBase.resF + gearExplicit.resF + passive.resF + season.resF + ascend.resF + support.resF + reward.resF + elementalistResistanceShift.resF - resistPenalty - oceanCurrentResPenaltyF;
    let rawResC = gearBase.resC + gearExplicit.resC + passive.resC + season.resC + ascend.resC + support.resC + reward.resC + elementalistResistanceShift.resC - resistPenalty - oceanCurrentResPenaltyC;
    let rawResL = gearBase.resL + gearExplicit.resL + passive.resL + season.resL + ascend.resL + support.resL + reward.resL + elementalistResistanceShift.resL - resistPenalty;
    let rawResChaos = gearBase.resChaos + gearExplicit.resChaos + passive.resChaos + season.resChaos + ascend.resChaos + support.resChaos + reward.resChaos + elementalistResistanceShift.resChaos - resistPenalty;
    if (uniqueRegenRateAndRegen) { finalRegen += Number(uniqueRegenRateAndRegen.regen || 0); finalRegen *= (1 + Math.max(0, Number(uniqueRegenRateAndRegen.regenRatePct || 0)) / 100); }
    if (uniqueAllMaxRes) { finalMaxResF += uniqueAllMaxRes; finalMaxResC += uniqueAllMaxRes; finalMaxResL += uniqueAllMaxRes; }
    if (uniqueEnemyRegenCutAndMinRoll) finalMinDmgRoll += Number(uniqueEnemyRegenCutAndMinRoll.minRoll || 0);
    if (hasKeystone('ct2')) {
        resistanceBlendBonus = Math.max(0, dotPctDmg) * ASCENDANCY_KEYSTONE_VALUES.ct2.resPctOfDot / 100;
        resistanceBlendMaxBonus = Math.floor(Math.max(0, dotPctDmg) * ASCENDANCY_KEYSTONE_VALUES.ct2.maxResPctOfDot / 100);
        rawResF += resistanceBlendBonus; rawResC += resistanceBlendBonus; rawResL += resistanceBlendBonus; rawResChaos += resistanceBlendBonus;
        finalMaxResF = Math.min(90, finalMaxResF + resistanceBlendMaxBonus);
        finalMaxResC = Math.min(90, finalMaxResC + resistanceBlendMaxBonus);
        finalMaxResL = Math.min(90, finalMaxResL + resistanceBlendMaxBonus);
        finalMaxResChaos = Math.min(90, finalMaxResChaos + resistanceBlendMaxBonus);
    }
    if (fixedAllMaxRes !== null) {
        finalMaxResF = fixedAllMaxRes;
        finalMaxResC = fixedAllMaxRes;
        finalMaxResL = fixedAllMaxRes;
        finalMaxResChaos = fixedAllMaxRes;
    }
    let finalResF = Math.min(finalMaxResF, rawResF);
    let finalResC = Math.min(finalMaxResC, rawResC);
    let finalResL = Math.min(finalMaxResL, rawResL);
    let warlockElementalOvercapToChaos = (hasKeystone('wlk4'))
        ? (Math.max(0, rawResF - finalMaxResF) + Math.max(0, rawResC - finalMaxResC) + Math.max(0, rawResL - finalMaxResL)) * 0.25
        : 0;
    let finalResChaos = Math.min(finalMaxResChaos, rawResChaos + warlockElementalOvercapToChaos);
    // 액막이 부적(군락 수호구)의 원소 저항/최대 화염 저항도 초과 화염 저항 계수에 반영되도록
    // 화염 저항 오버캡 계산 전에 군락 수호구 보너스를 먼저 합산한다.
    // 2026-10-10부터 액막이는 장비의 액막이 칸(열린 칸만)에서 읽는다(js/colony-wards.js equippedLines).
    let cw = typeof colonyWards === 'object' ? colonyWards.equippedLines(game) : [];
    cw.forEach(w => { if (w && w.stat) colonyWardBonus[w.stat] = (colonyWardBonus[w.stat] || 0) + Number(w.val || 0); });
    let fireResForOvercap = rawResF + (colonyWardBonus.resAll || 0);
    let maxResFForOvercap = Math.min(90, finalMaxResF + (colonyWardBonus.maxResF || 0));
    if (activeUniqueIds.has('uj_burning_will')) {
        let overcapFire = Math.max(0, fireResForOvercap - maxResFForOvercap);
        finalBaseDmg = Math.floor(finalBaseDmg * (1 + Math.min(0.35, overcapFire * 0.005)));
    }
    let regenDmgScale = Math.max(0, Number(skill.regenDmgScale) || 0);
    let regenScaledBonus = regenDmgScale > 0 ? 1 + Math.max(0, finalRegen * regenDmgScale / 100) : 1;
    let fireResOvercap = Math.max(0, fireResForOvercap - maxResFForOvercap);
    let fireResOvercapCap = Number.isFinite(Number(skill.fireResOvercapCap)) ? Math.max(0, Number(skill.fireResOvercapCap)) : Infinity;
    let effectiveFireResOvercap = Math.min(fireResOvercap, fireResOvercapCap);
    let fireResOvercapAdditiveMultiplier = Math.max(0, skill.fireResOvercapMulPerPct || 0);
    let fireResDmgScale = Math.max(0, Number(skill.fireResDmgScale) || 0);
    let fireResScaledBonus = fireResOvercapAdditiveMultiplier > 0
        ? 1 + (effectiveFireResOvercap * fireResOvercapAdditiveMultiplier)
        : (fireResDmgScale > 0 ? 1 + Math.max(0, finalResF * fireResDmgScale) : 1);
    let dotMultiplier = skill.dotMultiplier || 1;
    let dotStatMultiplier = 1 + Math.max(0, dotPctDmg) / 100;
    let totalDotDamageMultiplier = dotMultiplier * dotStatMultiplier;
    let instantDamageMultiplier = 1;
    let ailmentPowerMultiplier = 1 + Math.max(0, sumStatAcrossBuckets('ailmentPotencyPct')) / 100;
    // 상태이상 피해(%): 점화, 중독, 출혈의 피해 증가(종류별 증가와 합산). 패시브 노드와 플라스크 숙련 40레벨이 주는데 합산하는 곳이 없었다(2026-10-17).
    let finalAilmentDamagePct = Math.max(0, sumStatAcrossBuckets('ailmentDamagePct'));
    let talismanBossFinalDmgBonusPct = 0;
    let chaosDamageMultiplier = 1;
    let dotTickIntervalMultiplier = 1;
    let dotDurationMultiplier = 1;
    if (uniqueCurseCrownPerCursePct>0){ let n=tick.get('targetCurseCount'); if(n>0) finalDamageMultiplier*=(1+(n*uniqueCurseCrownPerCursePct)/100);}
    if (cosmosVerdictSupportDamagePct > 0) finalDamageMultiplier *= (1 + (safeEquippedSupports.length * cosmosVerdictSupportDamagePct) / 100);
    finalBaseDmg = Math.floor(finalBaseDmg * regenScaledBonus * fireResScaledBonus);
    if (uniqueArmorToPhysicalDamagePctPer1000 > 0 && skill && skill.ele === 'phys') {
        let armorSteps = Math.max(0, Math.floor(finalArmor / 1000));
        if (armorSteps > 0) finalBaseDmg = Math.floor(finalBaseDmg * (1 + (armorSteps * uniqueArmorToPhysicalDamagePctPer1000) / 100));
    }
    if (uniqueFlatDmgPerLevel > 0) finalBaseDmg += Math.floor(Math.max(1, game.level || 1) * uniqueFlatDmgPerLevel);
    talismanBossFinalDmgBonusPct = Math.max(talismanBossFinalDmgBonusPct, Number(talismanSummary.bossFinalDmgBonusPct) || 0);
    let damageScales = {
        hpFlatBonus: hpFlatBonus,
        hpScaleRatio: hpScaleRatio,
        regen: regenScaledBonus,
        fireRes: fireResScaledBonus,
        fireResOvercap: fireResOvercap,
        effectiveFireResOvercap: effectiveFireResOvercap,
        fireResOvercapCap: fireResOvercapCap,
        rawResF: fireResForOvercap,
        fireResOvercapAdditiveMultiplier: fireResOvercapAdditiveMultiplier,
        dot: dotMultiplier,
        dotStat: dotStatMultiplier,
        randomElementDamagePct: randomElementDamagePct,
        crusaderThunderDoctrinePct: crusaderThunderDoctrinePct,
        talismanBossFinalDmgBonusPct: talismanBossFinalDmgBonusPct
    };
    let suppCap = 2 + gearBase.suppCap + gearExplicit.suppCap + passive.suppCap + season.suppCap + ascend.suppCap + reward.suppCap;
    if (cosmosTwinStarResonance) suppCap = Math.max(0, Math.floor(suppCap * Math.max(0, cosmosTwinStarResonance.supportCapMul || 0.5)));
    if (uniqueResonanceAndSuppCap) suppCap += Math.floor(uniqueResonanceAndSuppCap.suppCap || 0);

    let critChance = finalCrit / 100;
    let critMulti = finalCritDmg / 100;
    let avgHit = finalBaseDmg * (1 - critChance) + finalBaseDmg * critChance * critMulti;
    let finalDps = avgHit * finalAspd;

    // 전직 키스톤의 전투 효과. 키스톤 id는 전직을 통틀어 하나라 hasKeystone만으로 고른 키스톤(그 전직일 때)과 우주계 쌍둥이
    // 키스톤(어느 전직이든)을 함께 가린다. 예전에는 전직별 if/else로 묶여 다른 전직의 쌍둥이 키스톤이 효과가 없었다(2026-10-02).
    // 워리어
    // 1) Base multipliers / penalties
    if (hasKeystone('w1')) {
        warriorPhysDamageMultiplier *= 1 + ASCENDANCY_KEYSTONE_VALUES.w1.physMorePct / 100;
        finalArmor = Math.floor(finalArmor * (1 + ASCENDANCY_KEYSTONE_VALUES.w1.armorMorePct / 100));
    }
    if (hasKeystone('w2')) {
        let stacks = tick.get('warriorRhythmStacks');
        if (stacks > 0) finalAspd = Math.min(12, finalAspd * Math.pow(1 + ASCENDANCY_KEYSTONE_VALUES.w2.aspdPctPerStack / 100, stacks));
    }
    if (hasKeystone('w3')) finalBaseDmg = Math.floor(finalBaseDmg * (isDualWielding() ? 1.08 : 1));
    if (hasKeystone('w4')) { finalPhysIgnore += ASCENDANCY_KEYSTONE_VALUES.w4.physIgnore; allowNegativePhysIgnore = true; }
    if (hasKeystone('w5')) {
        warriorPhysDamageMultiplier *= tick.get('warriorRageMultiplier');
    }
    const lowLifeLimit = Math.max(1, finalMaxHp);
    if (hasKeystone('w7') && tick.when('playerHp', hp => (hp / lowLifeLimit) <= 0.5)) {
        finalBaseDmg = Math.floor(finalBaseDmg * (1 + ASCENDANCY_KEYSTONE_VALUES.w7.damageMorePct / 100));
        warriorTakenDamageMultiplier *= 0.85;
    }
    // 2) Keystone cap/transform phase
    if (hasKeystone('w8')) {
        finalCrit = Math.min(200, finalCrit + ASCENDANCY_KEYSTONE_VALUES.w8.crit);
        finalCritDmg += ASCENDANCY_KEYSTONE_VALUES.w8.critDmg;
        finalAspd = Math.min(12, finalAspd * (1 + ASCENDANCY_KEYSTONE_VALUES.w8.aspdMorePct / 100));
        finalMove *= 1 + ASCENDANCY_KEYSTONE_VALUES.w8.moveMorePct / 100;
        finalDamageMultiplier *= 1 + ASCENDANCY_KEYSTONE_VALUES.w8.damageMorePct / 100;
        finalDs += ASCENDANCY_KEYSTONE_VALUES.w8.ds;
    }
    // 9) 전쟁광: 주는 피해와 받는 피해 증폭(ASCENDANCY_KEYSTONE_VALUES.w9)
    if (hasKeystone('w9')) {
        finalDamageMultiplier *= 1 + ASCENDANCY_KEYSTONE_VALUES.w9.damageMorePct / 100;
        warriorTakenDamageMultiplier *= 1 + ASCENDANCY_KEYSTONE_VALUES.w9.takenMorePct / 100;
    }
    // 글래디에이터
    if (hasKeystone('g1')) {
        if (skill.ele === 'phys') finalBaseDmg = Math.floor(finalBaseDmg * (1 + ASCENDANCY_KEYSTONE_VALUES.g1.physMorePct / 100));
        else finalBaseDmg = Math.floor(finalBaseDmg * (1 - ASCENDANCY_KEYSTONE_VALUES.g1.otherLessPct / 100));
    }
    if (hasKeystone('g2')) {
        let stacks = tick.get('gladiatorFlurryStacks');
        if (stacks > 0) {
            finalAspd = Math.min(12, finalAspd * (1 + stacks * ASCENDANCY_KEYSTONE_VALUES.g2.aspdPctPerStack / 100));
            finalEvasion = Math.floor(finalEvasion * (1 + stacks * 0.03));
        }
    }
    if (hasKeystone('g3')) finalCrit = Math.min(100, finalCrit + tick.get('gladiatorVeteranCrit'));
    if (hasKeystone('g4')) {
        let crowdCount = tick.get('aliveEnemies');
        if (crowdCount >= 3) {
            finalBaseDmg = Math.floor(finalBaseDmg * 1.20);
            rawDr += 20;
            finalDr = Math.min(PLAYER_PHYSICAL_REDUCTION_CAP_PCT, rawDr);
        }
    }
    if (hasKeystone('g5')) {
        if (tick.get('gladiatorSwiftGuard')) swiftOpeningTakenMultiplier = 0.70;
    }
    if (hasKeystone('g7')) {
        finalDs += Math.min(ASCENDANCY_KEYSTONE_VALUES.g7.dsMax, Math.floor(Math.max(0, finalEvasion) / ASCENDANCY_KEYSTONE_VALUES.g7.evasionPerDs));
        finalCrit += Math.min(ASCENDANCY_KEYSTONE_VALUES.g7.critMax, Math.floor(Math.max(0, finalArmor) / ASCENDANCY_KEYSTONE_VALUES.g7.armorPerCrit));
    }
    if (hasKeystone('g8')) {
        finalDs += ASCENDANCY_KEYSTONE_VALUES.g8.ds;
        finalBaseDmg = Math.floor(finalBaseDmg * (1 + ASCENDANCY_KEYSTONE_VALUES.g8.damageMorePct / 100));
        bossDamageDealtMultiplier *= 1 + ASCENDANCY_KEYSTONE_VALUES.g8.bossDamageMorePct / 100;
        bossTakenDamageMultiplier *= 1 + ASCENDANCY_KEYSTONE_VALUES.g8.bossTakenMorePct / 100;
        finalRegen *= 0.5;
        finalEnergyShieldRegenRate = 0;
    }
    // 어쌔신
    if (hasKeystone('a1')) {
        finalCrit = Math.max(0, finalCrit - 6);
        finalCritDmg += 66;
    }
    if (hasKeystone('a2') && tick.get('assassinBlurred')) {
        finalMove *= 1.2;
        finalCritDmg += 25;
        finalEvasion = Math.floor(finalEvasion * 1.2);
    }
    if (hasKeystone('a4')) {
        finalPhysIgnore += 25;
        finalResPen += 25;
        finalBaseDmg = Math.floor(finalBaseDmg * 0.92);
    }
    if (hasKeystone('a6')) {
        const highLifeLimit = Math.max(1, finalMaxHp);
        if (tick.when('playerHp', hp => (hp / highLifeLimit) > 0.66)) finalCritDmg = Math.floor(finalCritDmg * 1.2);
        else finalEvasion = Math.floor(finalEvasion * 1.2);
    }
    if (hasKeystone('a7')) finalCritDmg -= 200;
    if (hasKeystone('a8')) {
        finalCritDmg *= ASCENDANCY_KEYSTONE_VALUES.a8.critDmgMul;
        finalBaseDmg = Math.floor(finalBaseDmg * 0.75);
    }
    // 9) 암영 극의: 치명타 피해 배율 20% 증폭 및 회피 20% 증폭
    if (hasKeystone('a9')) {
        finalCritDmg = Math.floor(finalCritDmg * 1.2);
        finalEvasion = Math.floor(finalEvasion * 1.2);
    }
    // 레인저
    if (hasKeystone('r1')) {
        finalMove *= 1.15;
        finalArmor = 0;
        finalEnergyShield = 0;
    }
    if (hasKeystone('r2')) {
        finalAspd = Math.min(12, finalAspd * (1 + ASCENDANCY_KEYSTONE_VALUES.r2.aspdMorePct / 100));
    }
    if (hasKeystone('r3')) {
        finalMinDmgRoll = Math.max(5, finalMinDmgRoll - 10);
    }
    if (hasKeystone('r4')) finalAspd = Math.min(12, finalAspd * (1 + Math.max(0, finalMove) * ASCENDANCY_KEYSTONE_VALUES.r4.aspdPctPerMovePct / 100));
    if (hasKeystone('r6') && Array.isArray(skill.tags) && skill.tags.includes('projectile')) {
        skill.targets = Math.min(12, Math.max(1, (skill.targets || 1) + 1));
        finalBaseDmg = Math.floor(finalBaseDmg * (1 + Math.max(1, Math.floor(skill.targets || 1)) * ASCENDANCY_KEYSTONE_VALUES.r6.damageMorePctPerTarget / 100));
    }
    if (hasKeystone('r8')) {
        let aspdBonus = Math.max(0, finalAspd - 1) * 0.12;
        let moveBonus = Math.max(0, finalMove) * 0.0012;
        finalAspd = Math.min(12, finalAspd * (1 + moveBonus));
        finalMove *= (1 + aspdBonus);
        finalMaxHp = Math.floor(finalMaxHp * 0.85);
    }
    if (hasKeystone('r7')) {
        finalCrit = Math.min(100, finalCrit + tick.get('sinceHitSeconds') * ASCENDANCY_KEYSTONE_VALUES.r7.critPerSecond);
    }
    // 헌터
    if (hasKeystone('h3')) finalEvasion = Math.floor(finalEvasion * (1 + Math.max(0, finalMove) * 0.002));
    if (hasKeystone('h5')) { finalCritDmg += ASCENDANCY_KEYSTONE_VALUES.h5.critDmg; finalCrit = Math.max(0, finalCrit - ASCENDANCY_KEYSTONE_VALUES.h5.critLess); }
    if (hasKeystone('h6') && Array.isArray(skill.tags) && skill.tags.includes('projectile')) {
        skill.targets = Math.min(12, Math.max(1, (skill.targets || 1) + 1));
        // 추가 발사는 보통의 보너스 샷 피해(PROJECTILE_BONUS_SHOT_DAMAGE_PCT)로 맞힌다(2026-10-07 직업 밸런스: 예전 70% 강화는 뺐다).
        totalProjectileExtraShots += 1;
    }
    if (hasKeystone('h7')) {
        let solitaryOriginalTargets = Math.max(1, Math.floor(skill.targets || 1));
        finalDs += getSolitaryHuntDoubleStrikeBonus(solitaryOriginalTargets);
        skill.targets = 1;
    }
    if (hasKeystone('h8')) {
        let dsAsCrit = Math.max(0, finalDs);
        finalDs = 0;
        finalCrit = Math.min(1000, finalCrit + dsAsCrit);
        finalCritDmg += ASCENDANCY_KEYSTONE_VALUES.h8.critDmg;
    }
    // 9) 일격필살: 공격 속도 1 고정, 공격 속도 증가분을 피해량 증폭으로 전환
    if (hasKeystone('h9')) {
        finalDamageMultiplier *= (1 + Math.max(0, totalAspdPct) / 100);
        finalAspd = 1;
    }
    // 크루세이더
    if (hasKeystone('cr1')) { finalRegen += 1.5; finalRegen *= 1.4; }
    if (hasKeystone('cr2')) {
        crusaderLightningIgnoreRes = true;
        crusaderNoResPenOnLightning = true;
    }
    if (hasKeystone('cr4')) {
        let previousMaxResL = finalMaxResL;
        finalMaxResL = Math.min(90, finalMaxResL + 3);
        crusaderLightningMaxResBonus = finalMaxResL - previousMaxResL;
    }
    if (hasKeystone('cr5')) {
        finalRegen += 3;
        finalMaxHp = Math.floor(finalMaxHp * 1.15);
        finalArmor = Math.floor(finalArmor * 1.4);
        finalEnergyShield = Math.floor(finalEnergyShield * 1.4);
    }
    if (hasKeystone('cr6') && skill.ele === 'light') finalMaxDmgRoll = Math.floor(finalMaxDmgRoll * ASCENDANCY_KEYSTONE_VALUES.cr6.maxRollMul);
    if (hasKeystone('cr7')) {
        let addEs = Math.floor(finalArmor * 0.5);
        let addArmor = Math.floor(finalEnergyShield * 0.5);
        finalEnergyShield += addEs;
        finalArmor += addArmor;
        finalEnergyShieldRechargeDelay = Math.max(0.1, finalEnergyShieldRechargeDelay * 0.5);
    }
    if (hasKeystone('cr3') && skill.ele === 'light') {
        crusaderHolyFlatDmg = Math.floor((Math.max(0, finalEnergyShield) / 100) * Math.max(1, Math.floor(game.level || 1)) * ASCENDANCY_KEYSTONE_VALUES.cr3.levelMulPer100Es);
        crusaderHolyScaledDmg = Math.floor(crusaderHolyFlatDmg * baseDamageIncreaseMultiplier);
        finalBaseDmg = Math.max(1, finalBaseDmg + crusaderHolyScaledDmg);
    }
    if (hasKeystone('cr8') && tick.get('crusaderAegis')) finalBaseDmg = Math.floor(finalBaseDmg * (skill.ele === 'light' ? 1.75 : 1));
    // 엘리멘탈리스트
    if (hasKeystone('e1')) {
        if (skill.ele === 'phys' && !skillHasElementalConversion) finalBaseDmg = 0;
        else finalDamageMultiplier *= 1.15;
    }
    if (hasKeystone('e3')) {
        finalMaxHp = Math.floor(finalMaxHp * 0.85);
        finalEnergyShieldRegenRate += 10;
        finalEnergyShieldRechargeDelay = 0;
    }
    if (hasKeystone('e4')) { /* 융해 결합: 원소 풀 변환은 skill 생성 직후 적용됨 */ }
    if (hasKeystone('e5')) {
        let maxElemRes = Math.max(finalResF, finalResC, finalResL);
        elementalistChaosConversionBonus = Math.floor(maxElemRes * 0.5);
        finalResChaos = Math.min(finalMaxResChaos, finalResChaos + elementalistChaosConversionBonus);
        finalDamageMultiplier *= (1 + Math.max(0, finalResChaos) / 100);
    }
    if (hasKeystone('e6')) {
        finalResPen += 20;
        finalCritDmg -= 25;
    }
    // 9) 절대 관통: 원소 저항 관통(ASCENDANCY_KEYSTONE_VALUES.e9), 관통 하한은 -300%까지(적용은 mitigation 계산부)
    if (hasKeystone('e9')) finalResPen += ASCENDANCY_KEYSTONE_VALUES.e9.resPen;
    if (hasKeystone('e8')) {
        let stacks = tick.get('elementalistOverload');
        finalDamageMultiplier *= (1 + stacks * ASCENDANCY_KEYSTONE_VALUES.e8.morePctPerStack / 100);
        finalCrit = Math.max(0, finalCrit - stacks);
    }
    if (hasKeystone('e7')) {
        let pool = Array.isArray(skill.randomElementPool) ? skill.randomElementPool : [];
        if (['fire','cold','light'].every(ele => pool.includes(ele))) {
            finalDamageMultiplier *= 1.05;
            ailmentPowerMultiplier = Math.max(ailmentPowerMultiplier, ASCENDANCY_KEYSTONE_VALUES.e7.ailmentPowerMul);
        }
    }
    // 워록
    if (hasKeystone('wlk1')) {
        chaosDamageMultiplier *= 1 + ASCENDANCY_KEYSTONE_VALUES.wlk1.chaosMorePct / 100;
    }
    if (hasKeystone('wlk2')) {
        totalDotDamageMultiplier *= 1.20;
        instantDamageMultiplier *= 0.90;
    }
    if (hasKeystone('wlk3')) {
        finalEnergyShieldRegenRate = 0;
    }
    if (hasKeystone('wlk6')) {
        finalResPen += 21 + Math.max(0, finalCrit) * ASCENDANCY_KEYSTONE_VALUES.wlk6.critToPenPct / 100;
        finalCrit = 0;
    }
    if (hasKeystone('wlk8')) {
        chaosDamageMultiplier *= 1 + ASCENDANCY_KEYSTONE_VALUES.wlk8.chaosMorePct / 100;
        finalLeech *= 0.5;
        finalSpellLeech *= 0.5;
        finalRegen *= 0.5;
    }
    if (hasKeystone('wlk5')) {
        dotTickIntervalMultiplier /= 1.50;
        dotDurationMultiplier *= 0.5;
    }
    if (hasKeystone('wlk7')) {
        const shieldHalf = finalEnergyShield * 0.5;
        if (tick.when('playerEnergyShield', shield => shield >= shieldHalf)) finalBaseDmg = Math.floor(finalBaseDmg * (1 + ASCENDANCY_KEYSTONE_VALUES.wlk7.esDamageMorePct / 100));
    }
    // 가디언
    if (hasKeystone('gd1')) {
        finalArmor = Math.floor(finalArmor * 1.15);
        guardianArmorDamageBonus = true;
    }
    if (hasKeystone('gd2')) { finalMaxHp = Math.floor(finalMaxHp * (1 + ASCENDANCY_KEYSTONE_VALUES.gd2.lifeMorePct / 100)); finalEnergyShield = Math.floor(finalEnergyShield * (1 + ASCENDANCY_KEYSTONE_VALUES.gd2.esMorePct / 100)); }
    if (hasKeystone('gd3')) { finalRegen *= 1.2; finalEnergyShieldRegenRate *= 0.8; }
    if (hasKeystone('gd4')) {
        let converted = Math.floor(finalEvasion * ASCENDANCY_KEYSTONE_VALUES.gd4.evasionToArmorPct / 100);
        finalArmor += converted;
    }
    if (hasKeystone('gd5')) {
        genericTakenDamageMultiplier *= 0.85;
    }
    if (hasKeystone('gd6')) { let stacks = tick.get('guardianEnduranceStacks'); if (stacks > 0) finalArmor = Math.floor(finalArmor * (1 + stacks * 0.11)); guardianReflectDamage = Math.max(1, Math.floor(finalArmor * 0.6)); }
    if (guardianArmorDamageBonus) finalBaseDmg = Math.floor(finalBaseDmg * (1 + Math.min(ASCENDANCY_KEYSTONE_VALUES.gd1.damagePctMax, Math.max(0, finalArmor) / 100 * ASCENDANCY_KEYSTONE_VALUES.gd1.damagePctPer100Armor) / 100));
    if (hasKeystone('gd8')) { guardianDamageNullifyChance += 30; ailmentResistBonusPct += 50; }
    if (hasKeystone('gd9')) {
        guardianHitCapPct = 35;
        finalRegen *= 0.65;
        finalLeech *= 0.65;
        finalSpellLeech *= 0.65;
    }
    // The last stand cleanse happens on every call, so finishPlayerStats runs it against this life total.
    const lastStandMaxHp = hasKeystone('gd7') ? finalMaxHp : null;
    if (lastStandMaxHp !== null && tick.when('playerHp', hp => (hp / Math.max(1, lastStandMaxHp)) <= 0.5)) {
        genericTakenDamageMultiplier *= 0.8;
        finalBaseDmg = Math.floor(finalBaseDmg * 1.3);
    }
    // 인퀴지터
    if (hasKeystone('iq3')) {
        let sealedGemCount = (game.sealedSkills || []).length + (game.sealedSupports || []).length;
        inquisitorResonanceBonus = 10 + Math.floor(sealedGemCount / 4);
        suppCap += 1;
        finalAspd = Math.max(0.1, finalAspd * 0.94);
    }
    // 9) 무한한 권능: 확보한 보조스킬룬 한도 1당 공명력(ASCENDANCY_KEYSTONE_VALUES.iq9), 한도를 늘리기 전의 '획득' 한도 기준
    if (hasKeystone('iq9')) inquisitorResonanceBonus += ASCENDANCY_KEYSTONE_VALUES.iq9.resonancePerSupport * Math.max(0, suppCap);
    const bonusResonancePower = getBonusResonancePower(runeResonancePower, reward, passive, gearExplicit);
    let inquisitorResonancePower = Math.max(0, Math.floor((game.resonancePower || 0) + bonusResonancePower + inquisitorResonanceBonus));
    if (cosmosTwinStarResonance) inquisitorResonancePower = Math.floor(inquisitorResonancePower * Math.max(0, cosmosTwinStarResonance.resonanceMul || 1.5));
    let inquisitorElementalSkill = ['fire', 'cold', 'light'].includes(skill.ele) || (Array.isArray(skill.randomElementPool) && skill.randomElementPool.length > 0);
    if (hasKeystone('iq1') && inquisitorElementalSkill) finalBaseDmg = Math.floor(finalBaseDmg * (1 + (inquisitorResonancePower * ASCENDANCY_KEYSTONE_VALUES.iq1.resonancePct / 100) / 100));
    if (hasKeystone('iq2')) {
        finalCrit = Math.max(0, finalCrit - 8);
        finalCritDmg += 75;
    }
    if (hasKeystone('iq5')) { finalResPen += ASCENDANCY_KEYSTONE_VALUES.iq5.resPen; if (skill.ele === 'phys' && !skillHasElementalConversion) finalBaseDmg = 0; }
    if (hasKeystone('iq6')) {
        suppCap += 1;
        finalMaxHp = Math.floor(finalMaxHp * 0.75);
    }
    if (hasKeystone('iq7')) finalCritDmg += inquisitorResonancePower;
    if (hasKeystone('iq8') && inquisitorElementalSkill) {
        inquisitorAbsoluteDoctrinePct = Math.max(0, finalResPen) * ASCENDANCY_KEYSTONE_VALUES.iq8.penToDamagePct / 100;
        finalBaseDmg = Math.floor(finalBaseDmg * (1 + inquisitorAbsoluteDoctrinePct / 100));
    }
    // 무한한 권능: 보조스킬룬 한도 증가(예전에는 무제한이었다. 보조스킬룬 칸이 인퀴지터 폭주의 원인)
    if (hasKeystone('iq9')) suppCap += ASCENDANCY_KEYSTONE_VALUES.iq9.extraSupports;
    // 소울바인더
    if (hasKeystone('sb4')) sbSummonAspdBonus += 25;   // 소환 한도 몫은 getSummonCapFromSum
    if (hasKeystone('sb6')) finalResPen += 25;
    if (hasKeystone('sb5')) {
        let sumFlat = Math.max(0, (gearBase.summonFlatDmg || 0) + (gearExplicit.summonFlatDmg || 0) + (passive.summonFlatDmg || 0) + (season.summonFlatDmg || 0) + (ascend.summonFlatDmg || 0) + (support.summonFlatDmg || 0) + (reward.summonFlatDmg || 0));
        let sumPct = Math.max(0, (gearBase.summonPctDmg || 0) + (gearExplicit.summonPctDmg || 0) + (passive.summonPctDmg || 0) + (season.summonPctDmg || 0) + (ascend.summonPctDmg || 0) + (support.summonPctDmg || 0) + (reward.summonPctDmg || 0));
        let sumCrit = Math.max(0, (gearBase.summonCrit || 0) + (gearExplicit.summonCrit || 0) + (passive.summonCrit || 0) + (season.summonCrit || 0) + (ascend.summonCrit || 0) + (support.summonCrit || 0) + (reward.summonCrit || 0));
        let sumCritDmg = Math.max(0, (gearBase.summonCritDmg || 0) + (gearExplicit.summonCritDmg || 0) + (passive.summonCritDmg || 0) + (season.summonCritDmg || 0) + (ascend.summonCritDmg || 0) + (support.summonCritDmg || 0) + (reward.summonCritDmg || 0));
        let sumAspd = Math.max(0, (gearBase.summonAspd || 0) + (gearExplicit.summonAspd || 0) + (passive.summonAspd || 0) + (season.summonAspd || 0) + (ascend.summonAspd || 0) + (support.summonAspd || 0) + (reward.summonAspd || 0));
        const sb5Share = ASCENDANCY_KEYSTONE_VALUES.sb5.sharePct / 100;
        finalBaseDmg += Math.floor(sumFlat * sb5Share);
        finalBaseDmg = Math.floor(finalBaseDmg * (1 + sumPct * sb5Share / 100));
        finalCrit += sumCrit * sb5Share;
        finalCritDmg += sumCritDmg * sb5Share;
        finalAspd = Math.max(0.1, finalAspd * (1 + sumAspd * sb5Share / 100));
    }
    if (hasKeystone('sb7')) {
        // 상호 보완: 플레이어/소환수가 서로의 '공격력'(타격당 기본 피해)의 일부(ASCENDANCY_KEYSTONE_VALUES.sb7)를 나눠 가집니다.
        // 각 측의 공격력은 상대의 보너스를 제외한 자기 스탯만으로 계산하므로 무한 피드백이 없습니다.
        // 플레이어 공격력(보너스 적용 전)을 소환수에게 전달.
        sbPlayerAttackPower = Math.max(0, finalBaseDmg);
        // 소환수 공격력(대표 소환수의 타격당 기본 피해)의 50%를 플레이어 기본 피해에 가산.
        let summonStatsForShare = {
            summonFlatDmg: Math.max(0, (gearBase.summonFlatDmg || 0) + (gearExplicit.summonFlatDmg || 0) + (passive.summonFlatDmg || 0) + (season.summonFlatDmg || 0) + (ascend.summonFlatDmg || 0) + (support.summonFlatDmg || 0) + (reward.summonFlatDmg || 0)),
            summonPctDmg: Math.max(0, (gearBase.summonPctDmg || 0) + (gearExplicit.summonPctDmg || 0) + (passive.summonPctDmg || 0) + (season.summonPctDmg || 0) + (ascend.summonPctDmg || 0) + (support.summonPctDmg || 0) + (reward.summonPctDmg || 0)),
            summonEfficiency: Math.max(0, (gearBase.summonEfficiency || 0) + (gearExplicit.summonEfficiency || 0) + (passive.summonEfficiency || 0) + (season.summonEfficiency || 0) + (ascend.summonEfficiency || 0) + (support.summonEfficiency || 0) + (reward.summonEfficiency || 0)),
            summonSharedPctDmg: summonSharedGeneralPctDmg,
            summonSharedTaggedPctDmg: Object.fromEntries(Array.from(new Set(Object.values(TAGGED_DAMAGE_STAT_BY_TAG))).map(statId => [statId, Math.max(0, sumStatAcrossBuckets(statId))]))
        };
        sbSummonAttackPower = getRepresentativeSummonAttackPower(summonStatsForShare, gemEvaluation);
        if (!hasKeystone('sb5')) {
            sbSummonShareToPlayer = Math.floor(ASCENDANCY_KEYSTONE_VALUES.sb7.sharePct / 100 * sbSummonAttackPower);
            finalBaseDmg += sbSummonShareToPlayer;
        }
    }
    // 카탈리스트
    if (hasKeystone('ct4')) {
        finalMove *= 1.2;
        finalCritDmg += 25;
        finalEvasion = Math.floor(finalEvasion * 1.2);
    }
    if (hasKeystone('ct6')) {
        totalDotDamageMultiplier *= 1 + ASCENDANCY_KEYSTONE_VALUES.ct6.dotMorePct / 100;
        dotDurationMultiplier *= 1 - ASCENDANCY_KEYSTONE_VALUES.ct6.durationLessPct / 100;
    }
    if (hasKeystone('ct7')) {
        let convertedCritChance = Math.max(0, finalCrit) * ASCENDANCY_KEYSTONE_VALUES.ct7.critChanceToDotPct / 100;
        let convertedCritDamage = Math.max(0, finalCritDmg) * ASCENDANCY_KEYSTONE_VALUES.ct7.critDmgToDotPct / 100;
        totalDotDamageMultiplier *= (1 + (convertedCritChance + convertedCritDamage) / 100);
        if (Array.isArray(skill.tags) && skill.tags.includes('attack')) finalCrit = 100;
        finalCritDmg = 100 + Math.max(0, (totalDotDamageMultiplier - 1) * 100 * 0.2);
    }
    // 9) 급성 발현: 점화/중독/출혈 피해 간격 및 지속 시간 감폭(ASCENDANCY_KEYSTONE_VALUES.ct9, 총 피해 유지, 더 빠르게 폭발)
    if (hasKeystone('ct9')) {
        dotTickIntervalMultiplier *= 1 - ASCENDANCY_KEYSTONE_VALUES.ct9.fasterPct / 100;
        dotDurationMultiplier *= 1 - ASCENDANCY_KEYSTONE_VALUES.ct9.fasterPct / 100;
    }

    finalCritDmg = Math.max(0, finalCritDmg);
    if (authoredPassiveRules.flags.movingWall) {
        finalArmor = Math.max(0, finalArmor + finalEvasion);
        finalEvasion = 0;
    }
    if (authoredPassiveRules.flags.fullEvasion) finalArmor = 0;
    armorReduction = getArmorPhysicalReductionPct(finalArmor, referenceIncomingPhysical);
    evadeChance = getEvasionChancePct(finalEvasion, enemyAccuracy);
    if (authoredPassiveRules.flags.fullEvasion) evadeChance = Math.min(90, evadeChance + 15);

    damageScales.dot = dotMultiplier;
    damageScales.dotStat = dotStatMultiplier;
    damageScales.instantDamageMultiplier = instantDamageMultiplier;
    damageScales.finalDamageMultiplier = finalDamageMultiplier;
    damageScales.ailmentPowerMultiplier = ailmentPowerMultiplier;
    damageScales.chaosDamageMultiplier = chaosDamageMultiplier;
    damageScales.dotTickIntervalMultiplier = dotTickIntervalMultiplier;
    damageScales.dotDurationMultiplier = dotDurationMultiplier;
    damageScales.warlockElementalOvercapToChaos = warlockElementalOvercapToChaos;

    if ((typeof getPreciseTalentLevel === 'function' && (getPreciseTalentLevel('hero4__assassin') || getPreciseTalentLevel('hero6__ranger')))) finalCrit = Math.min(1000, finalCrit);
    else finalCrit = Math.min(100, finalCrit);
    if (skill.cannotCrit && !(hasKeystone('ct7') && Array.isArray(skill.tags) && skill.tags.includes('attack'))) finalCrit = 0;
    // 신성한 맹세: 번개 스킬의 기본 피해가 최대 에너지 보호막 100당 +1%
    if (uniqueEsToLightPct && skill.ele === 'light') finalBaseDmg = Math.floor(finalBaseDmg * (1 + (finalEnergyShield / 100) / 100));
    // 뒤바뀐 운명 / 최대 이윤: 최소~최대 피해 보정 차이를 피해·치명타 피해·연속 타격으로 환산
    let cosmosRollGap = Math.max(0, finalMaxDmgRoll - finalMinDmgRoll);
    if (uniqueRollGapDamage) finalBaseDmg = Math.floor(finalBaseDmg * (1 + cosmosRollGap / 100));
    if (uniqueRollGapCritDs) { finalCritDmg += cosmosRollGap; finalDs += cosmosRollGap; }
    finalDs = Math.max(0, finalDs);
    // 스쳐가는 그림자: 주변 적이 일정 수 이상이면 회피 대폭 증폭
    if (uniqueCrowdEvasionMore) {
        let aliveCnt = tick.get('aliveEnemies');
        if (aliveCnt >= uniqueCrowdEvasionMore.minEnemies) finalEvasion = Math.floor(finalEvasion * (1 + uniqueCrowdEvasionMore.morePct / 100));
    }
    if (uniqueFewEnemyEvasionMore) {
        let aliveCnt = tick.get('aliveEnemies');
        if (aliveCnt >= uniqueFewEnemyEvasionMore.minEnemies && aliveCnt <= uniqueFewEnemyEvasionMore.maxEnemies) finalEvasion = Math.floor(finalEvasion * (1 + uniqueFewEnemyEvasionMore.morePct / 100));
    }
    if (uniqueFateTwinRollSync) {
        let critForTwin = Math.max(0, finalCrit);
        let v = Math.max(finalMinDmgRoll, finalMaxDmgRoll) + (critForTwin * 0.2);
        finalMinDmgRoll = v;
        finalMaxDmgRoll = v;
    }
    let rawFinalCritDmg = Math.max(0, finalCritDmg);
    finalCritDmg = applyCritDamageSoftcap(rawFinalCritDmg);
    let critDmgSoftcapReduction = getCritDamageSoftcapReduction(rawFinalCritDmg);
    critChance = Math.max(0, Math.min(1, finalCrit / 100));
    critMulti = finalCritDmg / 100;
    avgHit = getAverageCriticalHitDamage(finalBaseDmg, finalCrit, finalCritDmg, false);
    finalDps = avgHit * finalAspd;

    let avgRollMultiplier = Math.max(0.05, (finalMinDmgRoll + finalMaxDmgRoll) / 200);
    let expectedDoubleStrikeMultiplier = Math.max(1, 1 + (Math.max(0, finalDs) / 100));
    let coreCubeAddedDamageLabels = { phys: '물리', fire: '화염', cold: '냉기', light: '번개', chaos: '카오스' };
    let coreCubeAddedDamageTotalPct = Math.max(0, Object.values(coreCubeAddedDamagePct).reduce((sum, value) => sum + (Number(value) || 0), 0));
    let coreCubeAddedDamageParts = Object.keys(coreCubeAddedDamagePct)
        .filter(ele => Math.max(0, Number(coreCubeAddedDamagePct[ele] || 0)) > 0)
        .map(ele => `${_t(coreCubeAddedDamageLabels[ele])} ${Math.floor(coreCubeAddedDamagePct[ele])}%`);
    let wisdomPreviewStats = { passiveWisdomElement, passiveKeystoneFlags: authoredPassiveRules.flags };
    let previewTalentConversion = wisdomLeapActive && typeof getTalentDamageConversion === 'function'
        ? getTalentDamageConversion(skill.ele)
        : { element: skill.ele, mainPct: 1, added: {} };
    let previewSkillElement = previewTalentConversion.element || skill.ele;
    let wisdomSkillDamageMultiplier = Math.max(0, Number(previewTalentConversion.mainPct) || 0)
        * getPassiveWisdomLeapDamageMultiplier(wisdomPreviewStats, previewSkillElement);
    let previewAddedDamagePct = { ...coreCubeAddedDamagePct };
    Object.entries(previewTalentConversion.added || {}).forEach(([element, value]) => {
        previewAddedDamagePct[element] = (Number(previewAddedDamagePct[element]) || 0) + (Number(value) || 0);
    });
    let wisdomAddedDamageMultiplier = Object.entries(previewAddedDamagePct).reduce((sum, [element, value]) => {
        let addedRatio = Math.max(0, Number(value) || 0) / 100;
        return sum + addedRatio * getPassiveWisdomLeapDamageMultiplier(wisdomPreviewStats, element);
    }, 0);
    let expectedAddedDamageMultiplier = 1 + coreCubeAddedDamageTotalPct / 100;
    let expectedWisdomDamageMultiplier = wisdomSkillDamageMultiplier + wisdomAddedDamageMultiplier;
    if (expectedAddedDamageMultiplier > 1) damageScales.coreCubeAddedDamageMultiplier = expectedAddedDamageMultiplier;
    if (wisdomLeapActive) damageScales.wisdomLeapDamageMultiplier = expectedWisdomDamageMultiplier;
    // Soulbinder sb7 player gain is now baked into finalBaseDmg as flat attack power, so no separate multiplier here.
    let warriorPhysicalDpsMultiplier = skill.ele === 'phys' ? warriorPhysDamageMultiplier : 1;
    if (wisdomLeapActive) warriorPhysicalDpsMultiplier = previewSkillElement === 'phys' ? warriorPhysDamageMultiplier : 1;
    let dpsDamageMultiplier = instantDamageMultiplier * finalDamageMultiplier * warriorPhysicalDpsMultiplier
        * (previewSkillElement === 'chaos' ? chaosDamageMultiplier : 1);
    let finalDpsAdjusted = finalDps * avgRollMultiplier * expectedDoubleStrikeMultiplier * dpsDamageMultiplier * expectedWisdomDamageMultiplier;
    let flatElementAverage = Object.entries(flatElementHitDamage).reduce((sum, [element, value]) => sum + value
        * getPassiveWisdomLeapDamageMultiplier(wisdomPreviewStats, element) * (element === 'phys' ? warriorPhysDamageMultiplier : 1), 0);
    finalDpsAdjusted += flatElementAverage * (avgHit / Math.max(1, finalBaseDmg)) * finalAspd * avgRollMultiplier
        * expectedDoubleStrikeMultiplier * finalDamageMultiplier;
    let isProjectileSkillForDps = Array.isArray(skill.tags) && skill.tags.includes('projectile');
    let projectileExtraShotsForDps = isProjectileSkillForDps ? Math.max(0, totalProjectileExtraShots || 0) : 0;
    let projectileBonusShotDamagePct = Math.max(0, Number(skill.extraProjectileDamagePct) || PROJECTILE_BONUS_SHOT_DAMAGE_PCT);
    let projectileExtraShotDpsMul = getProjectileExtraShotDpsMultiplier(skill, projectileExtraShotsForDps);
    let estimatedSkillDotDps = 0;
    const nativeDotPattern = skill.nativeCastId === 46 ? skill.combatPattern : null;
    if (isDotSkill && !nativeDotPattern) {
        let dotTickInterval = DOT_TICK_INTERVAL * Math.max(0.05, dotTickIntervalMultiplier);
        let dotDuration = DOT_EFFECT_DURATION * Math.max(0.05, dotDurationMultiplier);
        let expectedDotStackRate = finalAspd * expectedDoubleStrikeMultiplier;
        let expectedDotStacks = Math.max(1, Math.min(DOT_STACK_MAX, Math.floor(expectedDotStackRate * dotDuration)));
        let expectedDotStackMultiplier = getDotStackMultiplier(expectedDotStacks);
        let expectedDotSourceHit = avgHit * avgRollMultiplier * warriorPhysicalDpsMultiplier
            * (previewSkillElement === 'chaos' ? chaosDamageMultiplier : 1) * wisdomSkillDamageMultiplier;
        estimatedSkillDotDps = Math.max(0, expectedDotSourceHit * DOT_TICK_FROM_HIT_RATIO * totalDotDamageMultiplier * expectedDotStackMultiplier / Math.max(0.02, dotTickInterval));
        damageScales.estimatedDotStackRate = expectedDotStackRate;
        damageScales.estimatedDotStacks = expectedDotStacks;
        damageScales.estimatedDotStackMultiplier = expectedDotStackMultiplier;
        damageScales.estimatedSkillDotDps = estimatedSkillDotDps;
    }
    let skillSequenceDpsMultiplier = typeof getSkillHitSequenceDpsMultiplier === 'function'
        ? Math.max(1, Number(getSkillHitSequenceDpsMultiplier(game.activeSkill, skill)) || 1)
        : 1;
    // 부채꼴(연발 사격)은 한 대상이 받는 몫만 DPS로 센다. 옆 화살까지 다 맞을 때는 packDps(js/combat-grid.js splitFanSpreadDps).
    const fanSpread = splitFanSpreadDps(skill, projectileExtraShotDpsMul, skillSequenceDpsMultiplier);
    skillSequenceDpsMultiplier = fanSpread.sequenceDpsMul;
    let finalDpsWithProjectileShots = finalDpsAdjusted * fanSpread.extraShotDpsMul * window.GameModules.combat.supports.expectedMultiplier(skill);
    if (skillSequenceDpsMultiplier > 1) damageScales.skillSequenceMultiplier = skillSequenceDpsMultiplier;
    // Native clock contacts use baseDmg * dotDamageScale, without generic hit/stack effects.
    // The active clock cannot overlap another cast; speed cannot accelerate its ticks.
    let finalPlayerSkillDps = nativeDotPattern
        ? finalBaseDmg * totalDotDamageMultiplier * nativeDotPattern.ticks
            / Math.max(nativeDotPattern.ticks * nativeDotPattern.intervalMs / 1000, 1 / finalAspd)
        : finalDpsWithProjectileShots * skillSequenceDpsMultiplier + estimatedSkillDotDps;
    let flameDecayIgniteTakenMultiplierPreview = skill.flameDecayDebuff ? getFlameDecayIgniteTakenMultiplier({ maxHp: finalMaxHp, sSkill: skill }) : 1;
    let flameDecayDpsLines = [];
    if (includeBreakdowns && skill.flameDecayDebuff) {
        flameDecayDpsLines = [
            _t('화염 부패 기대 지속 DPS {floor} (생명력/초과 화염 저항/지속 피해 배율 적용, 적 저항 적용 전)', { floor: Math.floor(estimatedSkillDotDps) }),
            _t('생명력 계수: 최대 생명력 {floor} → 내장 피해 +{floor2}', { floor: Math.floor(finalMaxHp), floor2: Math.floor(hpFlatBonus) }),
            (skill.regenDmgScale || 0) > 0 ? _t('생명력 재생 계수: {regenScaledBonus}x (재생 {value}%)', { regenScaledBonus: regenScaledBonus.toFixed(2), value: formatValue('regen', finalRegen) }) : null,
            _t('초과 화염 저항 계수: {fireResScaledBonus}x (미적용 화염 저항 {floor}% / 최대 {floor2}%, 초과 {fireResOvercap}% 중 적용 {effectiveFireResOvercap}%)', { fireResScaledBonus: fireResScaledBonus.toFixed(2), floor: Math.floor(fireResForOvercap), floor2: Math.floor(maxResFForOvercap), fireResOvercap: fireResOvercap.toFixed(1), effectiveFireResOvercap: effectiveFireResOvercap.toFixed(1) }),
            _t('지속 피해 총 배율: {totalDotDamageMultiplier}x (스킬 {dotMultiplier}x, 스탯 {dotStatMultiplier}x)', { totalDotDamageMultiplier: totalDotDamageMultiplier.toFixed(2), dotMultiplier: dotMultiplier.toFixed(2), dotStatMultiplier: dotStatMultiplier.toFixed(2) }),
            _t('화염 부패 대상 점화 피해 증폭: {value}x (생명력 100당 {value2}%, 최대 {max}x)', { value: flameDecayIgniteTakenMultiplierPreview.toFixed(2), value2: (Math.max(0, Number(skill.igniteTakenHpScalePer100 || 0)) * 100).toFixed(1), max: (Math.max(1, Number(skill.igniteTakenMaxMultiplier || 0)) || 1).toFixed(1) }),
            _t('실제 적별 화염 부패 DPS는 적 상태이상 툴팁에서 저항/심연 배율까지 반영해 표시됩니다.')
        ].filter(Boolean);
    }

    function makeAilmentChanceBreakdown(title, statId, finalValue, critValue, note, effectLines) {
        return {
            title: _t(title),
            lines: [
                makeSourceLine('장비', (gearBase[statId] || 0) + (gearExplicit[statId] || 0), '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('패시브', (passive[statId] || 0) + (season[statId] || 0) + (ascend[statId] || 0) + (reward[statId] || 0), '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('보조스킬룬', support[statId] || 0, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('성좌 각성', starBlessing[statId] || 0, '%', value => `${value.toFixed(1)}%`),
                note || _t('치명타 시 해당 상태 이상 확률: {floor}%', { floor: Math.floor(critValue) }),
                note ? null : _t('비치명타는 위 확률을 사용하며, 치명타는 해당 상태 이상 확률에 +25%가 추가됩니다.'),
                ...(effectLines || [])
            ].filter(Boolean),
            final: `${Math.max(0, finalValue).toFixed(1)}%`
        };
    }

    function makeAilmentResistBreakdown(title, ailmentLabel, ailmentResValue, finalValue, mitigationLines) {
        return {
            title: _t(title),
            lines: [
                makeSourceLine(_t('{ailmentLabel} 방지 확률', { ailmentLabel: _t(ailmentLabel) }), finalValue, '%', value => `${Math.max(0, value).toFixed(1)}%`),
                _t('계산 기준: {ailmentLabel} 방지 옵션 {ailmentResValue}% + 공통 방지 {floor}%', { ailmentLabel: _t(ailmentLabel), ailmentResValue: Number(ailmentResValue || 0).toFixed(1), floor: Math.floor(ailmentResistBonusPct) }),
                medicineResistanceAilmentBonus.ignite > 0 || medicineResistanceAilmentBonus.freeze > 0 || medicineResistanceAilmentBonus.shock > 0
                    ? _t('약품 내성: 최고 비-제한 원소 저항 상태이상 방지 +100% (점화 {ignite}% / 냉각/동결 {freeze}% / 감전 {shock}%)', { ignite: medicineResistanceAilmentBonus.ignite, freeze: medicineResistanceAilmentBonus.freeze, shock: medicineResistanceAilmentBonus.shock })
                    : null,
                ...(mitigationLines || []),
                _t('피해 저항(화염/냉기/번개/카오스/물리 피해 감소)은 상태이상 방지 확률에 직접 합산되지 않습니다.')
            ].filter(Boolean),
            final: `${Math.max(0, finalValue).toFixed(1)}%`
        };
    }


    finalMaxResF = Math.min(90, finalMaxResF + (colonyWardBonus.maxResF || 0));
    finalMaxResC = Math.min(90, finalMaxResC + (colonyWardBonus.maxResC || 0));
    finalMaxResL = Math.min(90, finalMaxResL + (colonyWardBonus.maxResL || 0));
    finalMaxResChaos = Math.min(90, finalMaxResChaos + (colonyWardBonus.maxResChaos || 0));
    if (fixedAllMaxRes !== null) {
        finalMaxResF = fixedAllMaxRes;
        finalMaxResC = fixedAllMaxRes;
        finalMaxResL = fixedAllMaxRes;
        finalMaxResChaos = fixedAllMaxRes;
    }
    finalMaxHp += (colonyWardBonus.flatHp || 0);
    finalArmor += (colonyWardBonus.armor || 0);
    finalEvasion += (colonyWardBonus.evasion || 0);
    let riderCompassEvasionMorePct = uniqueRiderCompass && finalMove >= 200 ? 20 : 0;
    if (riderCompassEvasionMorePct > 0) finalEvasion = Math.floor(finalEvasion * (1 + riderCompassEvasionMorePct / 100));
    armorReduction = getArmorPhysicalReductionPct(finalArmor, referenceIncomingPhysical);
    evadeChance = getEvasionChancePct(finalEvasion, enemyAccuracy);
    finalEnergyShield += (colonyWardBonus.energyShield || 0);
    rawDr += (colonyWardBonus.dr || 0);
    finalDr = Math.min(PLAYER_PHYSICAL_REDUCTION_CAP_PCT, rawDr);
    finalResF = Math.min(finalMaxResF, finalResF + (colonyWardBonus.resAll || 0));
    finalResC = Math.min(finalMaxResC, finalResC + (colonyWardBonus.resAll || 0));
    finalResL = Math.min(finalMaxResL, finalResL + (colonyWardBonus.resAll || 0));
    finalResChaos = Math.min(finalMaxResChaos, finalResChaos + (colonyWardBonus.resChaos || 0));
    finalRegen += (colonyWardBonus.regenFlat || 0);
    finalEnergyShieldRegenRate += (colonyWardBonus.energyShieldRegen || 0);
    finalCritResist = Math.min(80, finalCritResist + (colonyWardBonus.critResist || 0));
    finalDotTakenDamageReducePct += (colonyWardBonus.dotTakenDamageReducePct || 0);
    finalIgniteDamageReducePct += (colonyWardBonus.igniteDamageReducePct || 0);
    finalBleedDamageReducePct += (colonyWardBonus.bleedDamageReducePct || 0);
    finalPoisonDamageReducePct += (colonyWardBonus.poisonDamageReducePct || 0);
    finalTakenDamageReduceWhen2EnemiesPct += (colonyWardBonus.takenDamageReduceWhen2EnemiesPct || 0);
    finalTakenDamageReduceWhen1EnemyPct += (colonyWardBonus.takenDamageReduceWhen1EnemyPct || 0);

    let uncappedResF = rawResF + (colonyWardBonus.resAll || 0);
    let uncappedResC = rawResC + (colonyWardBonus.resAll || 0);
    let uncappedResL = rawResL + (colonyWardBonus.resAll || 0);
    let uncappedResChaos = rawResChaos + warlockElementalOvercapToChaos + elementalistChaosConversionBonus + (colonyWardBonus.resChaos || 0);
    let medicineResistanceAilmentBonus = { ignite: 0, freeze: 0, shock: 0 };
    if (hasKeystone('ct2')) {
        let highestUncappedElementalResistance = Math.max(uncappedResF, uncappedResC, uncappedResL);
        if (uncappedResF === highestUncappedElementalResistance) medicineResistanceAilmentBonus.ignite = 100;
        if (uncappedResC === highestUncappedElementalResistance) medicineResistanceAilmentBonus.freeze = 100;
        if (uncappedResL === highestUncappedElementalResistance) medicineResistanceAilmentBonus.shock = 100;
    }

    let ailResIgniteTotal = (gearBase.ailResIgnite || 0) + (gearExplicit.ailResIgnite || 0) + (passive.ailResIgnite || 0) + (season.ailResIgnite || 0) + (ascend.ailResIgnite || 0) + (reward.ailResIgnite || 0) + (colonyWardBonus.ailResIgnite || 0) + medicineResistanceAilmentBonus.ignite;
    let ailResFreezeTotal = (gearBase.ailResFreeze || 0) + (gearExplicit.ailResFreeze || 0) + (passive.ailResFreeze || 0) + (season.ailResFreeze || 0) + (ascend.ailResFreeze || 0) + (reward.ailResFreeze || 0) + (colonyWardBonus.ailResFreeze || 0) + medicineResistanceAilmentBonus.freeze;
    let ailResShockTotal = (gearBase.ailResShock || 0) + (gearExplicit.ailResShock || 0) + (passive.ailResShock || 0) + (season.ailResShock || 0) + (ascend.ailResShock || 0) + (reward.ailResShock || 0) + (colonyWardBonus.ailResShock || 0) + medicineResistanceAilmentBonus.shock;
    let ailResPoisonTotal = (gearBase.ailResPoison || 0) + (gearExplicit.ailResPoison || 0) + (passive.ailResPoison || 0) + (season.ailResPoison || 0) + (ascend.ailResPoison || 0) + (reward.ailResPoison || 0) + (colonyWardBonus.ailResPoison || 0);
    let ailResBleedTotal = (gearBase.ailResBleed || 0) + (gearExplicit.ailResBleed || 0) + (passive.ailResBleed || 0) + (season.ailResBleed || 0) + (ascend.ailResBleed || 0) + (reward.ailResBleed || 0) + (colonyWardBonus.ailResBleed || 0);
    let finalAilmentResistIgniteChance = getPlayerAilmentResistChance('ignite', { ailResIgnite: ailResIgniteTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistChillChance = getPlayerAilmentResistChance('chill', { ailResFreeze: ailResFreezeTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistFreezeChance = getPlayerAilmentResistChance('freeze', { ailResFreeze: ailResFreezeTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistShockChance = getPlayerAilmentResistChance('shock', { ailResShock: ailResShockTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistPoisonChance = getPlayerAilmentResistChance('poison', { ailResPoison: ailResPoisonTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistBleedChance = getPlayerAilmentResistChance('bleed', { ailResBleed: ailResBleedTotal, ailmentResistBonusPct }) * 100;
    let catalystAilmentSourceMultiplier = hasKeystone('ct1') ? 2 : 1;
    let makeDamageAilmentEffectLines = (specificLabel, specificPct) => {
        let specificMultiplier = 1 + (Math.max(0, Number(specificPct || 0)) + finalAilmentDamagePct) / 100;
        let totalMultiplier = catalystAilmentSourceMultiplier * totalDotDamageMultiplier * specificMultiplier;
        return [
            _t('지속 피해 배율 스탯: +{max}%', { max: Math.max(0, dotPctDmg).toFixed(1) }),
            catalystAilmentSourceMultiplier > 1 ? _t('과잉 촉매 기준 피해: x{value}', { value: catalystAilmentSourceMultiplier.toFixed(2) }) : null,
            totalDotDamageMultiplier !== dotStatMultiplier ? _t('키스톤/스킬 포함 지속 피해 배율: x{totalDotDamageMultiplier}', { totalDotDamageMultiplier: totalDotDamageMultiplier.toFixed(2) }) : null,
            specificPct > 0 ? `${_t(specificLabel)}: +${Number(specificPct).toFixed(1)}%` : null,
            finalAilmentDamagePct > 0 ? _t('상태이상 피해: +{finalAilmentDamagePct}%', { finalAilmentDamagePct: finalAilmentDamagePct.toFixed(1) }) : null,
            _t('해당 상태이상 피해 총 배율: x{totalMultiplier} (기본 대비 +{max}%)', { totalMultiplier: totalMultiplier.toFixed(2), max: Math.max(0, (totalMultiplier - 1) * 100).toFixed(1) })
        ].filter(Boolean);
    };
    let makeDamageAilmentMitigationLines = (specificLabel, specificPct) => {
        let common = Math.max(0, Math.min(90, Number(finalDotTakenDamageReducePct || 0)));
        let specific = Math.max(0, Math.min(90, Number(specificPct || 0)));
        let combined = (1 - ((1 - common / 100) * (1 - specific / 100))) * 100;
        return [
            _t('받는 지속 피해 감소: {common}%', { common: common.toFixed(1) }),
            `${_t(specificLabel)}: ${specific.toFixed(1)}%`,
            _t('복합 적용 피해 감소: {combined}%', { combined: combined.toFixed(1) })
        ];
    };


    // 완갑/대검 막기 공식(저장 호환을 위해 shield* 변수 이름은 유지).
    // 1) 장비 옵션의 막기 확률(%) 증가는 장비 기본 막기 확률 자체를 상승시킨다.
    // 2) 패시브/키스톤 등 기타 막기 확률(%) 증가는 원본 베이스 막기 확률에서만 %로 증가한다.
    // 3) 막기 확률 +%p는 마지막에 더한다.
    // 4) 최종 상한은 기본 50%, 막기 확률 상한 증가로 최대 75%까지 상승한다.
    let effectiveShieldBaseBlockChance = Math.max(0, shieldBaseBlockChance * (1 + Math.max(0, shieldBlockChancePct) / 100));
    let blockChanceFromOtherPct = Math.max(0,
        guardianBlockChance + gearBase.blockChancePct + passive.blockChancePct + season.blockChancePct + ascend.blockChancePct + support.blockChancePct + reward.blockChancePct
    );
    let flatBlockChanceBonus = Math.max(0, shieldBlockChanceFlat + gearBase.blockChance + passive.blockChance + season.blockChance + ascend.blockChance + support.blockChance + reward.blockChance);
    let finalBlockChanceCap = forbiddenManifestation ? 25 : Math.max(50, Math.min(75, 50 + Math.max(0, sumStatAcrossBuckets('blockChanceMax'))));
    let finalBlockChance = Math.min(finalBlockChanceCap, Math.max(0, effectiveShieldBaseBlockChance + (shieldBaseBlockChance * blockChanceFromOtherPct / 100) + flatBlockChanceBonus));
    if (authoredPassiveRules.flags.fullEvasion || authoredPassiveRules.flags.proxyCovenant) finalBlockChance = 0;

    function formatSignedPercentagePointLine(label, value) {
        let amount = Number(value || 0);
        if (!amount) return null;
        return `${_t(label)} ${amount > 0 ? '+' : ''}${Math.floor(amount)}%p`;
    }

    function formatResistanceSourceLine(label, value) {
        let amount = Number(value || 0);
        if (!amount) return null;
        let rendered = Number.isInteger(amount) ? `${Math.abs(amount)}` : Math.abs(amount).toFixed(1);
        return `${_t(label)} ${amount > 0 ? '+' : '-'}${rendered}%`;
    }

    function makeResistanceBreakdown(title, statId, maxStatId, finalValue, maxValue, extraLines, extraMaxLines) {
        let maxGear = (gearBase[maxStatId] || 0) + (gearExplicit[maxStatId] || 0);
        let maxPassive = (passive[maxStatId] || 0) + (season[maxStatId] || 0) + (ascend[maxStatId] || 0) + (reward[maxStatId] || 0);
        return {
            title: _t(title),
            lines: [
                formatResistanceSourceLine('장비', (gearBase[statId] || 0) + (gearExplicit[statId] || 0)),
                formatResistanceSourceLine('패시브', (passive[statId] || 0) + (season[statId] || 0) + (ascend[statId] || 0) + (reward[statId] || 0)),
                formatResistanceSourceLine('보조스킬룬', support[statId] || 0),
                ...(extraLines || []),
                formatResistanceSourceLine('캠페인 패널티', -resistPenalty),
                _t('최대 저항: {floor}% (기본 75%)', { floor: Math.floor(maxValue) }),
                formatResistanceSourceLine('최대 저항, 장비', maxGear),
                formatResistanceSourceLine('최대 저항, 패시브', maxPassive),
                formatResistanceSourceLine('최대 저항, 보조스킬룬', support[maxStatId] || 0),
                ...(extraMaxLines || [])
            ].filter(Boolean),
            final: `${Math.floor(finalValue)}%`
        };
    }

    let breakdowns = includeBreakdowns ? {
        ...getPassiveSpecialStatBreakdowns(authoredPassiveRules),
        atk: {
            title: _t('공격력'),
            lines: [
                isSpellSkill ? _t('주문 내장 피해 {floor}', { floor: Math.floor(spellFlatDmg) }) : _t('기본 공격력 {floor}', { floor: Math.floor(baseDmg) }),
                isSpellSkill ? null : makeSourceLine('장비', gearFlatDmg),
                isSpellSkill ? null : makeSourceLine('패시브', passiveFlatDmg),
                makeSourceLine('성좌 각성', starBlessing.pctDmg, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('총 피해 증가', generalPctDmg, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('태그 보너스', baseTaggedTotal, '%', value => `${Math.floor(value)}%`),
                talentLine('pctDmg'),
                crusaderThunderDoctrinePct > 0 ? makeSourceLine('천뢰 교리(화염/냉기 → 번개)', crusaderThunderDoctrinePct, '%', value => `${Math.floor(value)}%`) : null,
                crusaderThunderDoctrinePct > 0 ? makeSourceLine('피해 증가 합계', generalPctDmg + taggedTotal, '%', value => `${Math.floor(value)}%`) : null,
                taggedSummary.length > 0 ? _t('적용 태그: {taggedSummary}', { taggedSummary: taggedSummary.join(' / ') }) : null,
                _t('스킬 배율 {dmg}', { dmg: formatPercentMultiplier(skill.dmg || 1) }),
                (skill.hpDmgScale || 0) > 0 ? _t('생명력 계수 내장 피해 +{floor} (최대 생명력 {floor2}, 피해 증가 적용)', { floor: Math.floor(hpFlatBonus), floor2: Math.floor(finalMaxHp) }) : null,
                crusaderHolyFlatDmg > 0 ? _t('신성한 검 번개 기본 피해 +{floor} → {floor2} (피해 증가 적용)', { floor: Math.floor(crusaderHolyFlatDmg), floor2: Math.floor(crusaderHolyScaledDmg) }) : null,
                (skill.regenDmgScale || 0) > 0 ? _t('재생 계수 배율 {regenScaledBonus}x (재생 {value}%)', { regenScaledBonus: regenScaledBonus.toFixed(2), value: formatValue('regen', finalRegen) }) : null,
                (skill.fireResDmgScale || 0) > 0 ? _t('화염 저항 계수 배율 {fireResScaledBonus}x (화염 저항 {floor}%)', { fireResScaledBonus: fireResScaledBonus.toFixed(2), floor: Math.floor(finalResF) }) : null,
                (skill.fireResOvercapMulPerPct || 0) > 0 ? _t('초과 화염 저항 계수 배율 {fireResScaledBonus}x (미적용 화염 저항 {floor}%/{floor2}%, 초과 {fireResOvercap}% 중 적용 {effectiveFireResOvercap}%)', { fireResScaledBonus: fireResScaledBonus.toFixed(2), floor: Math.floor(fireResForOvercap), floor2: Math.floor(maxResFForOvercap), fireResOvercap: fireResOvercap.toFixed(1), effectiveFireResOvercap: effectiveFireResOvercap.toFixed(1) }) : null,
                (skill.dotMultiplier || 1) !== 1 ? _t('스킬 지속 피해 배율 {dotMultiplier}x', { dotMultiplier: dotMultiplier.toFixed(2) }) : null,
                dotPctDmg > 0 ? _t('지속 피해 배율 스탯 {floor}% ({dotStatMultiplier}x)', { floor: Math.floor(dotPctDmg), dotStatMultiplier: dotStatMultiplier.toFixed(2) }) : null,
                instantDamageMultiplier !== 1 ? _t('즉발 피해 배율 {instantDamageMultiplier}x', { instantDamageMultiplier: instantDamageMultiplier.toFixed(2) }) : null,
                finalDamageMultiplier !== 1 ? _t('최종 피해 배율 {finalDamageMultiplier}x', { finalDamageMultiplier: finalDamageMultiplier.toFixed(2) }) : null,
                chaosDamageMultiplier !== 1 ? _t('카오스 피해 배율 {chaosDamageMultiplier}x', { chaosDamageMultiplier: chaosDamageMultiplier.toFixed(2) }) : null,
                skill.convertedToChaos ? _t('워록 심연 각인: 모든 공격 피해를 카오스 피해로 적용') : null,
                (hasKeystone('sb7') && sbSummonShareToPlayer > 0) ? _t('상호 보완: 소환수 공격력 {floor}의 75% → 기본 피해 +{floor2}', { floor: Math.floor(sbSummonAttackPower), floor2: Math.floor(sbSummonShareToPlayer) }) : null,
                (hasKeystone('sb7') && !hasKeystone('sb5') && sbPlayerAttackPower > 0) ? _t('상호 보완: 내 공격력 {floor}의 75%(+{floor2})를 각 소환수 타격에 전달', { floor: Math.floor(sbPlayerAttackPower), floor2: Math.floor(0.75 * sbPlayerAttackPower) }) : null,
                _t('피해 범위 {floor}% ~ {floor2}%', { floor: Math.floor(finalMinDmgRoll), floor2: Math.floor(finalMaxDmgRoll) })
            ].filter(Boolean),
            final: `${Math.floor(finalBaseDmg)}`
        },
        aps: {
            title: _t('공속'),
            lines: [
                _t('기본 1.00'),
                makeSourceLine('장비', gearAspd, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passiveAspd, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조스킬룬', support.aspd, '%', value => `${Math.floor(value)}%`),
                talentLine('aspd'),
                glovePairAspdBonus > 0 ? _t('동형 장갑 세트 보너스 +{glovePairAspdBonus} 기본 공속', { glovePairAspdBonus: glovePairAspdBonus.toFixed(2) }) : null,
                _t('공격 속도 배율 {spd}', { spd: formatPercentMultiplier(skill.spd || 1) }),
                skillDelayPct > 0 ? _t('스킬 딜레이 감소 {skillDelayPct}%: 공격 횟수와 DPS {value}', { skillDelayPct, value: formatPercentMultiplier(1 / (1 - skillDelayPct / 100)) }) : null,
                rawAspd > 5 ? _t('소프트캡 적용중 (원시 {rawAspd} → 최종 {finalAspd})', { rawAspd: rawAspd.toFixed(2), finalAspd: finalAspd.toFixed(2) }) : null
            ].filter(Boolean),
            final: `${finalAspd.toFixed(2)}`
        },
        crit: {
            title: _t('치명타 확률'),
            lines: [
                _t('기본 2.5%'),
                makeSourceLine('장비', gearCrit, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('패시브', passiveCrit, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('보조스킬룬', support.crit, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('스킬', skill.crit || 0, '%', value => `${value.toFixed(1)}%`),
                talentLine('crit')
            ].filter(Boolean),
            final: `${finalCrit.toFixed(1)}%`
        },
        critDmg: {
            title: _t('치명타 피해'),
            lines: [
                _t('기본 {value}%', { value: CRIT_DAMAGE_BASE_MULTIPLIER }),
                makeSourceLine('장비', gearBase.critDmg + gearExplicit.critDmg, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.critDmg + season.critDmg + ascend.critDmg + reward.critDmg, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조스킬룬', support.critDmg, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('스킬/특수 효과', (skill.critDmgBonus || 0) + (activeShadowStealth ? Math.max(0, Number(uniqueDeflectStealth.critDmg || 20)) : 0), '%', value => `${Math.floor(value)}%`),
                ...(critDmgSoftcapReduction > 0 ? [makeSourceLine('소프트캡(200/400/800/1200)', -critDmgSoftcapReduction, '%', value => `${Math.floor(value)}%`)] : []),
                talentLine('critDmg')
            ].filter(Boolean),
            final: `${Math.floor(finalCritDmg)}%`
        },
        move: {
            title: _t('이동 속도'),
            lines: [
                _t('기본 100%'),
                makeSourceLine('장비', gearBase.move + gearExplicit.move, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.move + season.move + ascend.move + reward.move, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('성좌 각성', starBlessing.move, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조스킬룬', support.move, '%', value => `${Math.floor(value)}%`),
                talentLine('move'),
                _t('전장 이동: 칸당 {value}초, 초당 {value2}칸', { value: (COMBAT_GRID_CONFIG.playerMoveIntervalSec * 100 / finalMove).toFixed(2), value2: (finalMove / (COMBAT_GRID_CONFIG.playerMoveIntervalSec * 100)).toFixed(2) }),
                _t('지도 진행도: 기본 대비 {value}배 ({value2}{floor}%)', { value: (finalMove / 100).toFixed(2), value2: finalMove >= 100 ? '+' : '', floor: Math.floor(finalMove - 100) }),
                _t('구간 이동: {max}초', { max: Math.max(0.5, 1.2 * 100 / finalMove).toFixed(2) })
            ].filter(Boolean),
            final: `${Math.floor(finalMove)}%`
        },
        hp: {
            title: _t('최대 생명력'),
            lines: [
                _t('기본 생명력 {floor}', { floor: Math.floor(baseHp) }),
                makeSourceLine('장비', gearFlatHp),
                makeSourceLine('패시브', passiveFlatHp),
                makeSourceLine('성좌 각성', starBlessing.flatHp),
                makeSourceLine('생명력 증가', totalPctHp, '%', value => `${Math.floor(value)}%`),
                talentLine('pctHp')
            ].filter(Boolean),
            final: `${Math.floor(finalMaxHp)}`
        },
        regen: {
            title: _t('초당 재생'),
            lines: [
                makeSourceLine('장비', gearBase.regen + gearExplicit.regen, '%', value => `${formatValue('regen', value)}%`),
                makeSourceLine('패시브', passive.regen + season.regen + ascend.regen + reward.regen, '%', value => `${formatValue('regen', value)}%`),
                makeSourceLine('보조스킬룬', support.regen, '%', value => `${formatValue('regen', value)}%`),
                talentLine('regen')
            ].filter(Boolean),
            final: `${formatValue('regen', finalRegen)}%`
        },
        regenSuppress: {
            title: _t('재생 억제'),
            lines: [
                makeSourceLine('장비', gearBase.regenSuppress + gearExplicit.regenSuppress, '%', value => `${formatValue('regenSuppress', value)}%`),
                makeSourceLine('패시브', passive.regenSuppress + season.regenSuppress + ascend.regenSuppress + reward.regenSuppress, '%', value => `${formatValue('regenSuppress', value)}%`),
                makeSourceLine('보조스킬룬', support.regenSuppress, '%', value => `${formatValue('regenSuppress', value)}%`),
                _t('공격 시 적의 생명력 재생을 해당 수치(%)만큼 줄여주는 옵션입니다.')
            ].filter(Boolean),
            final: `${formatValue('regenSuppress', finalRegenSuppress)}%`
        },
        leech: {
            title: _t('공격 피해의 생명력 흡수'),
            lines: [
                makeSourceLine('스킬', skill.leech || 0, '%', value => `${formatValue('leech', value)}%`),
                makeSourceLine('장비', gearBase.leech + gearExplicit.leech, '%', value => `${formatValue('leech', value)}%`),
                makeSourceLine('패시브', passive.leech + season.leech + ascend.leech + reward.leech, '%', value => `${formatValue('leech', value)}%`),
                makeSourceLine('보조스킬룬', support.leech, '%', value => `${formatValue('leech', value)}%`),
                skill.instantLeech ? _t('흡혈 관통: 이 룬으로 준 피해의 흡혈은 인스턴스 대신 즉시 회복되며 1회 흡혈량 캡을 적용받습니다.') : _t('타격 시 즉시 회복 대신 흡혈 인스턴스 생성'),
                (hasKeystone('wlk3')) ? _t('금단 대가: 흡혈 {value}', { value: skill.instantLeech ? _t('즉시 회복이 생명력 대신 에너지 보호막에 적용됩니다.') : _t('인스턴스가 생명력 대신 에너지 보호막에 저장/회복됩니다.') }) : null,
                _t('일반 흡혈 캡: 타격당 최대 생명력 {value}%, 전체 저장 {LEECH_BASE_TOTAL_CAP_PCT}%, 인스턴스당 초당 {LEECH_BASE_RATE_CAP_PCT}%', { value: LEECH_BASE_INSTANCE_CAP_PCT, LEECH_BASE_TOTAL_CAP_PCT, LEECH_BASE_RATE_CAP_PCT }),
                _t('일반 흡혈 추가 캡: 회복 속도 +{value}%p, 전체 +{value2}%p, 타격당 +{value3}%p', { value: formatValue('leechRateCap', finalLeechRateCap), value2: formatValue('leechTotalCap', finalLeechTotalCap), value3: formatValue('leechInstanceCap', finalLeechInstanceCap) }),
                _t('적용 전 {value}% → 적용 후 {value2}%', { value: formatValue('leech', rawLeech), value2: formatValue('leech', finalLeech) })
            ].filter(Boolean),
            final: `${formatValue('leech', finalLeech)}%`
        },
        spellLeech: {
            title: _t('주문 피해의 생명력 흡수'),
            lines: [makeSourceLine('스킬', skill.spellLeech || 0, '%', value => `${formatValue('spellLeech', value)}%`),
                makeSourceLine('장비', gearBase.spellLeech + gearExplicit.spellLeech, '%', value => `${formatValue('spellLeech', value)}%`),
                makeSourceLine('기타 성장', passive.spellLeech + season.spellLeech + ascend.spellLeech + support.spellLeech + reward.spellLeech, '%', value => `${formatValue('spellLeech', value)}%`),
                _t('주문 타격 피해에만 적용됩니다. 지속 피해에는 적용되지 않습니다.')].filter(Boolean),
            final: `${formatValue('spellLeech', finalSpellLeech)}%`
        },
        ds: {
            title: _t('연속 타격'),
            lines: [
                makeSourceLine('장비', gearBase.ds + gearExplicit.ds, '%p', value => `${Math.floor(value)}%p`),
                makeSourceLine('패시브', passive.ds + season.ds + ascend.ds + reward.ds, '%p', value => `${Math.floor(value)}%p`),
                makeSourceLine('보조스킬룬', support.ds, '%p', value => `${Math.floor(value)}%p`),
                makeSourceLine('스킬', skillDsBonus, '%p', value => `${Math.floor(value)}%p`),
                formatSignedPercentagePointLine('기타 효과', finalDs - baseDsFromSources - skillDsBonus),
                _t('각 수치는 연속 타격 확률에 합산되는 %p입니다.')
            ].filter(Boolean),
            final: `${Math.floor(finalDs)}%`
        },
        dr: {
            title: _t('물리 피해 감소'),
            lines: [
                makeSourceLine('장비', gearBase.dr + gearExplicit.dr, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.dr + season.dr + ascend.dr + reward.dr, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조스킬룬', support.dr, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: rawDr > finalDr ? _t('{floor}% (상한 {value}% 적용, 합계 {floor2}%)', { floor: Math.floor(finalDr), value: PLAYER_PHYSICAL_REDUCTION_CAP_PCT, floor2: Math.floor(rawDr) }) : `${Math.floor(finalDr)}%`
        },
        armor: {
            title: _t('방어도'),
            lines: [
                makeSourceLine('장비', gearBase.armor + gearExplicit.armor),
                makeSourceLine('패시브', passive.armor + season.armor + ascend.armor + reward.armor),
                makeSourceLine('방어도 증가', totalArmorPct, '%', value => `${Math.floor(value)}%`),
                _t('예상 물리 피해 감소율(기준 타격 {floor}): {armorReduction}%', { floor: Math.floor(referenceIncomingPhysical), armorReduction: armorReduction.toFixed(1) })
            ].filter(Boolean),
            final: `${Math.floor(finalArmor)}`
        },
        evasion: {
            title: _t('회피'),
            lines: [
                makeSourceLine('장비', gearBase.evasion + gearExplicit.evasion),
                makeSourceLine('패시브', passive.evasion + season.evasion + ascend.evasion + reward.evasion),
                makeSourceLine('회피 증가', totalEvasionPct, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('기수의 나침반 증폭', riderCompassEvasionMorePct, '%', value => `${Math.floor(value)}%`),
                _t('예상 회피 확률(동일 레벨 적 기준): {evadeChance}%', { evadeChance: evadeChance.toFixed(1) }),
                _t('정확도: {floor} (힘 {floor2}, 민첩 {floor3}, 지능 {floor4})', { floor: Math.floor(playerAccuracy), floor2: Math.floor(totalStrength), floor3: Math.floor(totalDexterity), floor4: Math.floor(totalIntelligence) })
            ].filter(Boolean),
            final: `${Math.floor(finalEvasion)}`
        },
        energyShield: {
            title: _t('에너지 보호막'),
            lines: [
                makeSourceLine('장비', gearBase.energyShield + gearExplicit.energyShield),
                makeSourceLine('패시브', passive.energyShield + season.energyShield + ascend.energyShield + reward.energyShield),
                makeSourceLine('보호막 증가', totalEnergyShieldPct, '%', value => `${Math.floor(value)}%`),
                _t('재충전 대기시간: {value}초', { value: finalEnergyShieldRechargeDelay.toFixed(2) }),
                _t('에너지 보호막 재생량: 초당 {floor} ({value}%)', { floor: Math.floor(finalEnergyShield * (finalEnergyShieldRegenRate / 100)), value: finalEnergyShieldRegenRate.toFixed(1) })
            ].filter(Boolean),
            final: `${Math.floor(finalEnergyShield)}`
        },
        accuracy: {
            title: _t('정확도'),
            lines: [
                _t('기본 {PLAYER_ACCURACY_BASE} + 레벨 성장(레벨 {max} × {value} = {value2})', { PLAYER_ACCURACY_BASE, max: Math.max(1, Math.floor(game.level || 1)), value: PLAYER_ACCURACY_PER_LEVEL, value2: Math.max(1, Math.floor(game.level || 1)) * PLAYER_ACCURACY_PER_LEVEL }),
                makeSourceLine(_t('민첩 파생(민첩 × {value})', { value: PLAYER_ACCURACY_PER_DEXTERITY }), totalDexterity * PLAYER_ACCURACY_PER_DEXTERITY),
                makeSourceLine('장비/기타 정확도', flatAccuracy),
                makeSourceLine('정확도 보정', accuracyBonusPct, '%', value => `${Math.floor(value)}%`),
                _t('효과: 적의 회피 수치와 대결해 명중을 판정합니다. 정확도가 높을수록 고회피 적에게 덜 빗나갑니다.'),
                _t('예: 회피 500 적 상대 예상 명중률 {floor}%, 회피 2000 적 상대 {floor2}%', { floor: Math.floor(100 - getEnemyTotalEvadeChance({ evasion: 500 }, playerAccuracy)), floor2: Math.floor(100 - getEnemyTotalEvadeChance({ evasion: 2000 }, playerAccuracy)) }),
                _t('적 회피 대비 빗나감은 최대 45%p, 적의 별도 회피 확률 옵션과 합쳐 총 70%가 상한입니다.')
            ].filter(Boolean),
            final: `${Math.floor(playerAccuracy)}`
        },
        strength: {
            title: _t('힘'),
            lines: [_t('1당 최대 생명력 +2, 5당 물리 피해 +1%'), _t('최대 생명력 +{floor}, 물리 피해 +{floor2}%', { floor: Math.floor(totalStrength * 2), floor2: Math.floor(totalStrength / 5) })],
            final: `${Math.floor(totalStrength)}`
        },
        dexterity: {
            title: _t('민첩'),
            lines: [_t('1당 회피 +3, 정확도 +{value}, 5당 투사체 피해 +1%', { value: PLAYER_ACCURACY_PER_DEXTERITY }), _t('회피 +{floor}, 정확도 +{floor2}, 투사체 피해 +{floor3}%', { floor: Math.floor(totalDexterity * 3), floor2: Math.floor(totalDexterity * PLAYER_ACCURACY_PER_DEXTERITY), floor3: Math.floor(totalDexterity / 5) })],
            final: `${Math.floor(totalDexterity)}`
        },
        intelligence: {
            title: _t('지능'),
            lines: [_t('1당 에너지 보호막 +2, 5당 주문 피해 +1%'), _t('에너지 보호막 +{floor}, 주문 피해 +{floor2}%', { floor: Math.floor(totalIntelligence * 2), floor2: Math.floor(totalIntelligence / 5) })],
            final: `${Math.floor(totalIntelligence)}`
        },
        blockChance: {
            title: _t('막기 확률'),
            lines: [
                makeSourceLine('완갑과 대검 기본 막기', shieldBaseBlockChance, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('장비 막기 확률 증가', shieldBlockChancePct, '%', value => `${value.toFixed(1)}%`),
                effectiveShieldBaseBlockChance !== shieldBaseBlockChance ? _t('증가 적용 기본 막기: {value}%', { value: effectiveShieldBaseBlockChance.toFixed(1) }) : null,
                makeSourceLine('기타 막기 확률 증가', blockChanceFromOtherPct, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('막기 확률 보너스', flatBlockChanceBonus, '%', value => `${value.toFixed(1)}%`),
                _t('막기 확률 상한: {finalBlockChanceCap}%', { finalBlockChanceCap: finalBlockChanceCap.toFixed(1) }),
                _t('몬스터의 일반 타격 피해를 막으면 해당 타격 피해를 받지 않습니다.')
            ].filter(Boolean),
            final: `${finalBlockChance.toFixed(1)}%`
        },
        blockChanceMax: {
            title: _t('막기 확률 상한'),
            lines: [
                _t('기본 막기 확률 상한 50%'),
                makeSourceLine('상한 증가', Math.max(0, sumStatAcrossBuckets('blockChanceMax')), '%', value => `${value.toFixed(1)}%`),
                _t('상한 증가는 최대 75%까지 적용됩니다.')
            ],
            final: `${finalBlockChanceCap.toFixed(1)}%`
        },
        deflectChance: {
            title: _t('비껴내기 확률'),
            lines: [
                makeSourceLine('장비', gearBase.deflectChance + gearExplicit.deflectChance, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('패시브', passive.deflectChance + season.deflectChance + ascend.deflectChance + reward.deflectChance, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('보조스킬룬', support.deflectChance, '%', value => `${value.toFixed(1)}%`),
                _t('비껴내기 성공 시 피해 감소: {min}%', { min: Math.min(85, 40 + finalDeflectDamageReduce).toFixed(1) }),
                _t('기본 피해 감소 40%에 비껴내기 피해 감소 옵션이 더해지며, 최대 85%까지 적용됩니다.')
            ].filter(Boolean),
            final: `${finalDeflectChance.toFixed(1)}%`
        },
        deflectDamageReduce: {
            title: _t('비껴내기 피해 감소'),
            lines: [
                makeSourceLine('장비', gearBase.deflectDamageReduce + gearExplicit.deflectDamageReduce, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('패시브', passive.deflectDamageReduce + season.deflectDamageReduce + ascend.deflectDamageReduce + reward.deflectDamageReduce, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('보조스킬룬', support.deflectDamageReduce, '%', value => `${value.toFixed(1)}%`),
                _t('실제 감소율은 기본 40% + 이 수치입니다.')
            ].filter(Boolean),
            final: `${finalDeflectDamageReduce.toFixed(1)}%`
        },
        physIgnore: {
            title: _t('물리 피해 감소 무시'),
            lines: [
                makeSourceLine('장비', gearBase.physIgnore + gearExplicit.physIgnore, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.physIgnore + season.physIgnore + ascend.physIgnore + reward.physIgnore, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조스킬룬', support.physIgnore, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('각인', skill.physIgnoreBonus || 0, '%', value => `${Math.floor(value)}%`),
                _t('적의 양수 물리 피해 감소만 0%까지 깎습니다.')
            ].filter(Boolean),
            final: `${Math.floor(finalPhysIgnore)}%`
        },
        resPen: {
            title: _t('저항 관통'),
            lines: [
                makeSourceLine('장비', gearBase.resPen + gearExplicit.resPen, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.resPen + season.resPen + ascend.resPen + reward.resPen, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조스킬룬', support.resPen, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('각인', skill.resPenBonus || 0, '%', value => `${Math.floor(value)}%`),
                _t('원소/카오스 저항은 음수까지 떨어질 수 있으며, 음수만큼 추가 피해를 줍니다.')
            ].filter(Boolean),
            final: `${Math.floor(finalResPen)}%`
        },
        resF: makeResistanceBreakdown('화염 저항', 'resF', 'maxResF', finalResF, finalMaxResF, [
            formatResistanceSourceLine('약품 내성', resistanceBlendBonus),
            formatResistanceSourceLine('분광 외피', elementalistResistanceShift.resF),
            formatResistanceSourceLine('군락 수호구', colonyWardBonus.resAll || 0)
        ], [
            formatResistanceSourceLine('최대 저항, 공통 효과', sharedElementalMaxRes),
            formatResistanceSourceLine('최대 저항, 영역 고유 효과', uniqueAllMaxRes),
            formatResistanceSourceLine('최대 저항, 약품 내성', resistanceBlendMaxBonus),
            formatResistanceSourceLine('최대 저항, 분광 외피', hasElementalistPrismaticShell ? 3 : 0),
            formatResistanceSourceLine('최대 저항, 군락 수호구', colonyWardBonus.maxResF || 0)
        ]),
        resC: makeResistanceBreakdown('냉기 저항', 'resC', 'maxResC', finalResC, finalMaxResC, [
            formatResistanceSourceLine('약품 내성', resistanceBlendBonus),
            formatResistanceSourceLine('분광 외피', elementalistResistanceShift.resC),
            formatResistanceSourceLine('군락 수호구', colonyWardBonus.resAll || 0)
        ], [
            formatResistanceSourceLine('최대 저항, 공통 효과', sharedElementalMaxRes),
            formatResistanceSourceLine('최대 저항, 영역 고유 효과', uniqueAllMaxRes),
            formatResistanceSourceLine('최대 저항, 약품 내성', resistanceBlendMaxBonus),
            formatResistanceSourceLine('최대 저항, 분광 외피', hasElementalistPrismaticShell ? 3 : 0),
            formatResistanceSourceLine('최대 저항, 군락 수호구', colonyWardBonus.maxResC || 0)
        ]),
        resL: makeResistanceBreakdown('번개 저항', 'resL', 'maxResL', finalResL, finalMaxResL, [
            formatResistanceSourceLine('약품 내성', resistanceBlendBonus),
            formatResistanceSourceLine('분광 외피', elementalistResistanceShift.resL),
            formatResistanceSourceLine('군락 수호구', colonyWardBonus.resAll || 0)
        ], [
            formatResistanceSourceLine('최대 저항, 공통 효과', sharedElementalMaxRes),
            formatResistanceSourceLine('최대 저항, 영역 고유 효과', uniqueAllMaxRes),
            formatResistanceSourceLine('최대 저항, 약품 내성', resistanceBlendMaxBonus),
            formatResistanceSourceLine('최대 저항, 분광 외피', hasElementalistPrismaticShell ? 3 : 0),
            formatResistanceSourceLine('최대 저항, 전하 보루', crusaderLightningMaxResBonus),
            formatResistanceSourceLine('최대 저항, 군락 수호구', colonyWardBonus.maxResL || 0)
        ]),
        resChaos: makeResistanceBreakdown('카오스 저항', 'resChaos', 'maxResChaos', finalResChaos, finalMaxResChaos, [
            formatResistanceSourceLine('약품 내성', resistanceBlendBonus),
            formatResistanceSourceLine('암흑 치환', warlockElementalOvercapToChaos),
            formatResistanceSourceLine('분광 외피', elementalistResistanceShift.resChaos),
            formatResistanceSourceLine('공허 결합', elementalistChaosConversionBonus),
            formatResistanceSourceLine('군락 수호구', colonyWardBonus.resChaos || 0)
        ], [
            formatResistanceSourceLine('최대 저항, 약품 내성', resistanceBlendMaxBonus),
            formatResistanceSourceLine('최대 저항, 군락 수호구', colonyWardBonus.maxResChaos || 0)
        ]),

        ailmentResist: {
            title: _t('상태이상 방지 확률'),
            lines: [
                _t('점화 방지: {value}%', { value: finalAilmentResistIgniteChance.toFixed(1) }),
                _t('냉각 방지: {value}%', { value: finalAilmentResistChillChance.toFixed(1) }),
                _t('동결 방지: {value}%', { value: finalAilmentResistFreezeChance.toFixed(1) }),
                _t('감전 방지: {value}%', { value: finalAilmentResistShockChance.toFixed(1) }),
                _t('중독 방지: {value}%', { value: finalAilmentResistPoisonChance.toFixed(1) }),
                _t('출혈 방지: {value}%', { value: finalAilmentResistBleedChance.toFixed(1) })
            ],
            final: _t('{floor}% 공통 방지', { floor: Math.floor(ailmentResistBonusPct) })
        },
        dmgRoll: {
            title: _t('피해 보정 범위'),
            lines: [
                makeSourceLine('최소', finalMinDmgRoll, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('최대', finalMaxDmgRoll, '%', value => `${Math.floor(value)}%`)
            ],
            final: `${Math.floor(finalMinDmgRoll)}% ~ ${Math.floor(finalMaxDmgRoll)}%`
        },
        igniteChance: makeAilmentChanceBreakdown('점화 확률', 'igniteChance', finalIgniteChance, ailmentCritChance.ignite, null, makeDamageAilmentEffectLines('점화 피해 증가', finalIgniteDamageMultiplierPct)),
        chillChance: makeAilmentChanceBreakdown('냉각 확률', 'chillChance', finalChillChance, ailmentCritChance.chill, null, [_t('냉각은 피해형 상태이상이 아니며 적의 행동 속도를 감소시킵니다.')]),
        freezeChance: makeAilmentChanceBreakdown('동결 확률', 'freezeChance', finalFreezeChance, ailmentCritChance.freeze, _t('냉기 피해 치명타는 동결 시도를 보장합니다. 그 외에는 해당 확률로 동결을 시도하며, 시도 성공 후 적의 최대 생명력 대비 타격 피해로 동결 적용 판정을 합니다.'), [_t('동결은 피해형 상태이상이 아니며 적의 행동을 정지시킵니다.')]),
        shockChance: makeAilmentChanceBreakdown('감전 확률', 'shockChance', finalShockChance, ailmentCritChance.shock, null, [_t('감전 효과 증가: +{max}%', { max: Math.max(0, finalShockEffectBonusPct).toFixed(1) }), _t('감전은 직접 피해를 주지 않고 대상이 받는 피해를 증가시킵니다.')]),
        ailmentResistIgniteChance: makeAilmentResistBreakdown('점화 저항 확률', '점화', ailResIgniteTotal, finalAilmentResistIgniteChance, makeDamageAilmentMitigationLines('점화 피해 감소', finalIgniteDamageReducePct)),
        ailmentResistChillChance: makeAilmentResistBreakdown('냉각 저항 확률', '냉각', ailResFreezeTotal, finalAilmentResistChillChance, [_t('냉각 효과 감소: {max}%', { max: Math.max(0, finalChillEffectReducePct).toFixed(1) })]),
        ailmentResistFreezeChance: makeAilmentResistBreakdown('동결 저항 확률', '동결', ailResFreezeTotal, finalAilmentResistFreezeChance, [_t('동결 지속시간 감소: {max}%', { max: Math.max(0, finalFreezeDurationReducePct).toFixed(1) })]),
        ailmentResistShockChance: makeAilmentResistBreakdown('감전 저항 확률', '감전', ailResShockTotal, finalAilmentResistShockChance, [_t('감전 효과 감소: {max}%', { max: Math.max(0, finalShockEffectReducePct).toFixed(1) })]),
        ailmentResistPoisonChance: makeAilmentResistBreakdown('중독 저항 확률', '중독', ailResPoisonTotal, finalAilmentResistPoisonChance, makeDamageAilmentMitigationLines('중독 피해 감소', finalPoisonDamageReducePct)),
        ailmentResistBleedChance: makeAilmentResistBreakdown('출혈 저항 확률', '출혈', ailResBleedTotal, finalAilmentResistBleedChance, makeDamageAilmentMitigationLines('출혈 피해 감소', finalBleedDamageReducePct)),
        poisonChance: makeAilmentChanceBreakdown('중독 확률', 'poisonChance', finalPoisonChance, ailmentCritChance.poison, null, makeDamageAilmentEffectLines('중독 피해 증가', finalPoisonDamageMultiplierPct)),
        bleedChance: makeAilmentChanceBreakdown('출혈 확률', 'bleedChance', finalBleedChance, ailmentCritChance.bleed, null, makeDamageAilmentEffectLines('출혈 전용 피해 증가', 0)),
        dps: {
            title: 'DPS',
            lines: nativeDotPattern ? [
                _t('지속 피해 1회 {floor}', { floor: Math.floor(finalBaseDmg * totalDotDamageMultiplier) }),
                _t('{value}초마다 {ticks}회', { value: nativeDotPattern.intervalMs / 1000, ticks: nativeDotPattern.ticks }),
                _t('중복 시전 불가')
            ] : [
                _t('평균 한 방 {floor}', { floor: Math.floor(avgHit) }),
                _t('공격 속도 {finalAspd}', { finalAspd: finalAspd.toFixed(2) }),
                _t('치명 기대값 반영'),
                crusaderThunderDoctrinePct > 0 ? _t('천뢰 교리 반영: 화염/냉기 피해 증가 +{floor}%가 번개 공격력/평균 한 방/DPS에 적용', { floor: Math.floor(crusaderThunderDoctrinePct) }) : null,
                inquisitorAbsoluteDoctrinePct > 0 ? _t('절대 교리 반영: 저항 관통 +{floor}%가 원소 피해/평균 한 방/DPS에 적용', { floor: Math.floor(inquisitorAbsoluteDoctrinePct) }) : null,
                _t('피해 보정 기대값 x{avgRollMultiplier} ({floor}~{floor2}%)', { avgRollMultiplier: avgRollMultiplier.toFixed(2), floor: Math.floor(finalMinDmgRoll), floor2: Math.floor(finalMaxDmgRoll) }),
                _t('연속 타격 기대값 x{value} ({floor}%)', { value: expectedDoubleStrikeMultiplier.toFixed(2), floor: Math.floor(finalDs) }),
                coreCubeAddedDamageTotalPct > 0 ? _t('추가 피해 x{value} (총 피해의 {floor}% → {coreCubeAddedDamageParts})', { value: expectedAddedDamageMultiplier.toFixed(2), floor: Math.floor(coreCubeAddedDamageTotalPct), coreCubeAddedDamageParts: coreCubeAddedDamageParts.join(' / ') }) : null,
                isProjectileSkillForDps && fanSpread.extraShotDpsMul > 1 ? _t('투사체 추가 발사 기대값 x{value} (추가 확률 {value2}%, 발사 상한 반영, 발당 {round}% 피해)', { value: projectileExtraShotDpsMul.toFixed(2), value2: formatValue('projectileExtraChance', projectileExtraShotsForDps * 100), round: Math.round(projectileBonusShotDamagePct) }) : null,
                skillSequenceDpsMultiplier > 1 ? _t('강타 여진 기대값 x{value} (본 타격 후 독립 여진)', { value: skillSequenceDpsMultiplier.toFixed(2) }) : null,
                estimatedSkillDotDps > 0 ? _t('지속 피해 기대값 +{floor} DPS (틱 {value}% / {max}초, 예상 중첩 {floor2}/{DOT_STACK_MAX})', { floor: Math.floor(estimatedSkillDotDps), value: DOT_TICK_FROM_HIT_RATIO * 100, max: Math.max(0.02, DOT_TICK_INTERVAL * Math.max(0.05, dotTickIntervalMultiplier)).toFixed(2), floor2: Math.floor((damageScales.estimatedDotStacks || 1)), DOT_STACK_MAX }) : null,
                warriorPhysicalDpsMultiplier > 1 ? _t('격노 순환 x{value} ({get}/{WARRIOR_RAGE_STACK_MAX}중첩)', { value: warriorPhysicalDpsMultiplier.toFixed(2), get: tick.get('warriorRageStacks'), WARRIOR_RAGE_STACK_MAX }) : null,
                (hasKeystone('sb7') && sbSummonShareToPlayer > 0) ? _t('상호 보완: 소환수 공격력 공유로 기본 피해 +{floor} 반영 (DPS 포함)', { floor: Math.floor(sbSummonShareToPlayer) }) : null
            ].concat(getFanSpreadDpsLines(fanSpread, finalPlayerSkillDps), flameDecayDpsLines).filter(Boolean),
            final: `${Math.floor(finalPlayerSkillDps)}`
        },
        gem: {
            title: _t('룬 레벨 보너스'),
            lines: [
                makeSourceLine('패시브', gemSources.passive + gemSources.reward),
                makeSourceLine('장비', gemSources.gear)
            ].filter(Boolean),
            final: _t('총 +{total}', { total: gemSources.total })
        }
    } : null;


    let enemy = {
        activeZoneId: game.currentZoneId,
        activeUnderworldFloor: currentStatsZone && currentStatsZone.type === 'underworld' ? currentStatsZone.floor : 0,
        zoneSpeedMultiplier,
        zoneDamageMultiplier: oceanPressureDamageMul,
        underworldGravityReductionPct: Math.max(0, Math.min(75,
            typeof getSkyStoneReductionPct === 'function' ? getSkyStoneReductionPct() : 0)),
        baseDmg: finalBaseDmg,
        damageIncreasePct: Math.max(0, generalPctDmg + taggedTotal),
        maxHp: finalMaxHp,
        lifeRecoveryCap: getPlayerRecoveryHpCap({ maxHp: finalMaxHp, uniqueOverhealCapPct: uniqueOverhealCapPct }, tick),
        aspd: finalAspd || 1.0,
        crit: finalCrit,
        rawCrit: finalCrit,
        moveSpeed: finalMove, sightRange: Math.max(0, gearBase.sight + gearExplicit.sight), sightCap: Math.max(0, gearExplicit.sightCap), chestGrade: Math.max(0, gearExplicit.chestGrade),
        chillEffectReducePct: finalChillEffectReducePct,
        critTakenDamageReducePct: sumStatAcrossBuckets('critTakenDamageReducePct'),
        igniteTakenDurationReducePct: sumStatAcrossBuckets('igniteTakenDurationReducePct'),
        shockTakenDurationReducePct: sumStatAcrossBuckets('shockTakenDurationReducePct'),
        coldTakenDurationReducePct: sumStatAcrossBuckets('coldTakenDurationReducePct'),
        poisonTakenDurationReducePct: sumStatAcrossBuckets('poisonTakenDurationReducePct'),
        bleedTakenDurationReducePct: sumStatAcrossBuckets('bleedTakenDurationReducePct'),
        freezeDurationReducePct: finalFreezeDurationReducePct,
        shockEffectReducePct: finalShockEffectReducePct,
        igniteDamageReducePct: finalIgniteDamageReducePct,
        bleedDamageReducePct: finalBleedDamageReducePct,
        poisonDamageReducePct: finalPoisonDamageReducePct,
        fireTakenDamageReducePct: Math.max(0, colonyWardBonus.fireTakenDamageReducePct || 0),
        coldTakenDamageReducePct: Math.max(0, colonyWardBonus.coldTakenDamageReducePct || 0),
        lightTakenDamageReducePct: Math.max(0, colonyWardBonus.lightTakenDamageReducePct || 0),
        chaosTakenDamageReducePct: Math.max(0, colonyWardBonus.chaosTakenDamageReducePct || 0),
        dotTakenDamageReducePct: finalDotTakenDamageReducePct,
        takenDamageReduceWhen2EnemiesPct: finalTakenDamageReduceWhen2EnemiesPct,
        takenDamageReduceWhen1EnemyPct: finalTakenDamageReduceWhen1EnemyPct,
        igniteDamageMultiplierPct: finalIgniteDamageMultiplierPct,
        dps: finalPlayerSkillDps || 0,
        hitDps: finalDpsWithProjectileShots || 0,
        packDps: (finalPlayerSkillDps || 0) * fanSpread.packMul,
        skillDotDps: estimatedSkillDotDps || 0,
        dpsBaseNoProjectileShots: finalDpsAdjusted || 0,
        critDmg: finalCritDmg,
        rawCritDmg: rawFinalCritDmg,
        regen: finalRegen,
        regenSuppress: finalRegenSuppress,
        leech: finalLeech,
        summonInheritedLeech: finalLeech * (applyLeechSoftcap(rawLeech - wildnessLeech - support.leech) + wildnessLeech) / Math.max(0.0001, applyLeechSoftcap(rawLeech - wildnessLeech) + wildnessLeech),
        spellLeech: finalSpellLeech,
        leechRateCap: finalLeechRateCap,
        leechTotalCap: finalLeechTotalCap,
        leechInstanceCap: finalLeechInstanceCap,
        leechKeepFullLife: finalLeechKeepFullLife,
        dr: finalDr,
        rawDr: rawDr,
        physIgnore: finalPhysIgnore,
        allowNegativePhysIgnore: allowNegativePhysIgnore,
        warriorPhysDamageMultiplier: warriorPhysDamageMultiplier,
        warriorTakenDamageMultiplier: warriorTakenDamageMultiplier,
        genericTakenDamageMultiplier: genericTakenDamageMultiplier,
        bossDamageDealtMultiplier: bossDamageDealtMultiplier,
        bossTakenDamageMultiplier: bossTakenDamageMultiplier,
        swiftOpeningTakenMultiplier: swiftOpeningTakenMultiplier,
        guardianReflectDamage: guardianReflectDamage,
        guardianBlockChance: guardianBlockChance,
        guardianDamageNullifyChance: guardianDamageNullifyChance,
        guardianHitCapPct: guardianHitCapPct,
        shieldBaseBlockChance: shieldBaseBlockChance,
        effectiveShieldBaseBlockChance: effectiveShieldBaseBlockChance,
        shieldBlockChancePct: shieldBlockChancePct,
        shieldBlockChanceFlat: shieldBlockChanceFlat,
        blockChance: finalBlockChance,
        blockChanceMax: finalBlockChanceCap,
        deflectChance: finalDeflectChance,
        deflectDamageReduce: finalDeflectDamageReduce,
        ailmentResistBonusPct: ailmentResistBonusPct,
        ailmentResistPenPct: ailmentResistPenPct,
        crusaderLightningIgnoreRes: crusaderLightningIgnoreRes,
        crusaderNoResPenOnLightning: crusaderNoResPenOnLightning,
        ds: finalDs,
        slamEchoChance: finalSlamEchoChance,
        slamEchoDamagePct: finalSlamEchoDamagePct,
        minDmgRoll: finalMinDmgRoll,
        maxDmgRoll: finalMaxDmgRoll,
        gemLv: gemSources.total,
        gemBonusSources: gemSources,
        glovePairAspdBonus: glovePairAspdBonus,
        suppCap: suppCap,
        expGain: season.expGain + reward.expGain + uniqueXpGainPct,
        sSkill: skill,
        resPen: finalResPen,
        resF: finalResF,
        rawResF: uncappedResF,
        resC: finalResC,
        rawResC: uncappedResC,
        resL: finalResL,
        rawResL: uncappedResL,
        maxResF: finalMaxResF,
        maxResC: finalMaxResC,
        maxResL: finalMaxResL,
        maxResChaos: finalMaxResChaos,
        resChaos: finalResChaos,
        rawResChaos: uncappedResChaos,
        critResist: Math.max(0, Math.min(80, finalCritResist)),
        ailResIgnite: ailResIgniteTotal,
        ailResShock: ailResShockTotal,
        ailResFreeze: ailResFreezeTotal,
        ailResPoison: ailResPoisonTotal,
        ailResBleed: ailResBleedTotal,
        ailmentResistIgniteChance: finalAilmentResistIgniteChance,
        ailmentResistChillChance: finalAilmentResistChillChance,
        ailmentResistFreezeChance: finalAilmentResistFreezeChance,
        ailmentResistShockChance: finalAilmentResistShockChance,
        ailmentResistPoisonChance: finalAilmentResistPoisonChance,
        ailmentResistBleedChance: finalAilmentResistBleedChance,
        resistPenalty: resistPenalty,
        dotDamageScale: totalDotDamageMultiplier,
        flameDecayIgniteTakenMultiplier: flameDecayIgniteTakenMultiplierPreview,
        dotCritBonusScale: dotMultiplier,
        instantDamageMultiplier: instantDamageMultiplier,
        finalDamageMultiplier: finalDamageMultiplier,
        ailmentPowerMultiplier: ailmentPowerMultiplier, ailmentDamagePct: finalAilmentDamagePct,
        mystique: Math.max(0, passive.mystique),
        devotion: authoredPassiveRules.devotion,
        cycle: authoredPassiveRules.cycle,
        passiveRevelation: authoredPassiveRules.revelation,
        passiveRevelationLabel: authoredPassiveRules.revelationLabel,
        passiveRevelationCombatDamageMorePct: authoredPassiveRules.combatDamageMorePct,
        passiveRevelationGuardTakenLessPct: authoredPassiveRules.guardTakenLessPct,
        passiveRevelationLifeBonusPct: authoredPassiveRules.lifeBonusPct,
        passiveWisdomElement: passiveWisdomElement,
        mystiqueAilmentType: authoredPassiveRules.mystique.ailment,
        mystiqueAilmentDamagePct: authoredPassiveRules.mystique.damagePct,
        mystiqueAilmentPotencyPct: authoredPassiveRules.mystique.potencyPct,
        passiveForbiddenManifestation: !!forbiddenManifestation,
        passiveAshura: typeof findAllocatedPassiveKeystone === 'function' && !!findAllocatedPassiveKeystone('아슈라'),
        passiveCycleAddedFireFromPhysicalPct: authoredPassiveRules.cycleAddedFireFromPhysicalPct,
        passiveFanaticismStacks: authoredPassiveRules.fanaticismStacks,
        passiveKeystoneFlags: authoredPassiveRules.flags,
        passiveOmniscientTrueDamagePct: omniscientActive ? Math.min(25, totalStrength * 0.5) : 0,
        passiveAlwaysHit: !!barbarismKeystone,
        chillEffectBonusPct: finalChillEffectBonusPct,
        shockEffectBonusPct: finalShockEffectBonusPct,
        chaosDamageMultiplier: chaosDamageMultiplier,
        dotTickIntervalMultiplier: dotTickIntervalMultiplier,
        dotDurationMultiplier: dotDurationMultiplier,
        ailmentDurationPct: Object.fromEntries(['ignite', 'chill', 'freeze', 'shock', 'poison', 'bleed'].map(type => [type, sumStatAcrossBuckets(`${type}DurationPct`)])),
        igniteChance: finalIgniteChance,
        chillChance: finalChillChance,
        freezeChance: finalFreezeChance,
        shockChance: finalShockChance,
        poisonChance: finalPoisonChance,
        bleedChance: finalBleedChance,
        ailmentCritChance: ailmentCritChance,
        damageScales: damageScales,
        randomElementDamagePct: randomElementDamagePct,
        addedDamagePctByElement: coreCubeAddedDamagePct,
        flatElementDamage: coreCubeFlatElementDamage,
        flatElementHitDamage: flatElementHitDamage,
        takenFlatReduce: coreCubeTakenFlatReduce,
        physTakenAs: coreCubePhysTakenAs,
        talismanBossFinalDmgBonusPct: talismanBossFinalDmgBonusPct,
        armor: finalArmor,
        evasion: finalEvasion,
        energyShield: finalEnergyShield,
        armorReduction: armorReduction,
        evadeChance: evadeChance,
        enemyAccuracy: enemyAccuracy,
        accuracy: playerAccuracy,
        strength: totalStrength,
        dexterity: totalDexterity,
        intelligence: totalIntelligence,
        energyShieldRegenRate: finalEnergyShieldRegenRate,
        energyShieldRechargeDelay: finalEnergyShieldRechargeDelay,
        projectileExtraShots: Math.max(0, totalProjectileExtraShots),
        breakdowns: breakdowns,
        uniqueClosedEyes: uniqueClosedEyes,
        uniqueShockInvertTaken: uniqueShockInvertTaken,
        uniqueAlwaysShock: uniqueAlwaysShock,
        uniqueProjectileDoubleStrikePct: uniqueProjectileDoubleStrikePct,
        uniqueChaosResDownOnHit: uniqueChaosResDownOnHit,
        uniqueCorpseExplode: uniqueCorpseExplode,
        uniqueInstantLeechPct: uniqueInstantLeechPct + Math.max(0, reward.uniqueInstantLeechPct || 0),
        uniqueDoubleDamageChancePct: uniqueDoubleDamageChancePct + Math.max(0, coreCubeDoubleDamageChance || 0),
        uniqueDoubleDamageMultiplier: 2 + Math.max(0, sumStatAcrossBuckets('doubleDamageMultiplierPct') || 0) / 100,
        uniqueEsRecoverOnCritPct: uniqueEsRecoverOnCritPct,
        uniqueEvasionDance: uniqueEvasionDance,
        uniqueLoneEvasionCounter: uniqueLoneEvasionCounter,
        uniqueCritAdvanceEsRecharge: uniqueCritAdvanceEsRecharge,
        uniqueEnergyShieldBreakRecharge: uniqueEnergyShieldBreakRecharge,
        uniqueRiderCompass: uniqueRiderCompass,
        uniqueMaxRollBonusHit: uniqueMaxRollBonusHit,
        uniqueCeilingSmashDouble: uniqueCeilingSmashDouble,
        uniqueUnderdogMorePct: uniqueUnderdogMorePct,
        uniqueInstakillNormalPct: uniqueInstakillNormalPct,
        uniqueProjExtraShotChance: uniqueProjExtraShotChance,
        uniqueConditionManual: uniqueConditionManual, uniqueWarcryResonancePct: uniqueWarcryResonancePct, cosmosGuardianAlways: cosmosGuardianConditionInstant,
        uniqueStackingElementalResDownOnHit: uniqueStackingElementalResDownOnHit,
        uniqueBleedingEnemyDamageMorePct: uniqueBleedingEnemyDamageMorePct,
        uniqueRiftWaveOnHit: uniqueRiftWaveOnHit,
        uniqueChaosDamageInstantLeechPct: uniqueChaosDamageInstantLeechPct,
        uniqueInvulnerableBarrierOnHit: uniqueInvulnerableBarrierOnHit,
        uniquePoisonDurationPct: uniquePoisonDurationPct,
        uniqueDeathWard: uniqueDeathWard,
        uniqueLeechEfficiencyOnKill: uniqueLeechEfficiencyOnKill,
        uniqueKillMoveStacks: uniqueKillMoveStacks, uniqueEnemyRegenCutAndMinRoll: uniqueEnemyRegenCutAndMinRoll, uniqueAllResDownOnHit: uniqueAllResDownOnHit, uniqueCursedTakenAndRefresh: uniqueCursedTakenAndRefresh, uniquePhysDrHalfTakenAsMore: uniquePhysDrHalfTakenAsMore, uniqueMeleeArmorAmp: uniqueMeleeArmorAmp, uniqueArmorAppliesToDot: uniqueArmorAppliesToDot, uniquePursuitMovePct: uniquePursuitMovePct, uniqueRepelMelee: uniqueRepelMelee,
        uniqueResonanceFloor: uniqueResonanceAndSuppCap ? Math.floor(uniqueResonanceAndSuppCap.resonancePower || 0) : 0,
        inquisitorResonanceBonus: inquisitorResonanceBonus,
        uniqueOverkillSplash: uniqueOverkillSplash,
        uniqueDragonVeinGuard: uniqueDragonVeinGuard,
        uniqueGuardianArmor: uniqueGuardianArmor,
        uniqueStealEliteTrait: uniqueStealEliteTrait,
        uniqueQueenBeeSummon: uniqueQueenBeeSummon,
        uniqueSummonDeathDamageBuff: uniqueSummonDeathDamageBuff,
        uniqueSummonCritAspdStacks: uniqueSummonCritAspdStacks,
        uniqueSummonNonCritNoDamage: uniqueSummonNonCritNoDamage,
        uniqueBlockRecoverEnergyShieldPct: uniqueBlockRecoverEnergyShieldPct,
        uniqueBlockedDamageTakenPct: uniqueBlockedDamageTakenPct,
        uniqueDeflectStealth: uniqueDeflectStealth,
        uniqueChaosTakenDamageReducePct: uniqueChaosTakenDamageReducePct,
        uniqueLifeRecoupTakenDamage: uniqueLifeRecoupTakenDamage,
        uniqueOverhealCapPct: uniqueOverhealCapPct,
        cosmosAlwaysFirstHit: cosmosAlwaysFirstHit,
        cosmosEnergyShieldBypassPct: cosmosEnergyShieldBypassPct,
        cosmosOrbitCycle: cosmosOrbitCycle,
        cosmosEqualDamageSplit: cosmosEqualDamageSplit,
        cosmosBalanceMitigation: cosmosBalanceMitigation,
        cosmosJudgmentLightning: cosmosJudgmentLightning,
        cosmosDeathResistPct: Math.max(cosmosDeathResistPct, reward.cosmosDeathResistPct || 0),
        cosmosBossDamageMorePct: Math.max(cosmosBossDamageMorePct, reward.cosmosBossDamageMorePct || 0),
        cosmosMasteryFinalDamagePct: cosmosMasteryFinalDamagePct,
        cosmosMasteryTakenLessPct: cosmosMasteryTakenLessPct,
        cosmosCometChillNoFreeze: cosmosCometChillNoFreeze,
        cosmosLightningVariance: reward.cosmosLightningVariance || 0,
        firstHitDamageMorePct: reward.firstHitDamageMorePct || 0,
        cosmosAlwaysFirstHitChancePct: reward.cosmosAlwaysFirstHitChancePct || 0,
        uniqueBleedWeightOnBleedingHit: uniqueBleedWeightOnBleedingHit,
        uniqueImmuneBleed: uniqueImmuneBleed,
        uniqueImmuneFreeze: uniqueImmuneFreeze,
        uniqueMeteorFootsteps: uniqueMeteorFootsteps,
        uniqueShockTracer: uniqueShockTracer,
        uniquePoisonExtraStacks: uniqueVenomStride ? Math.max(0, Math.floor(uniqueVenomStride.poisonExtraStack || 0)) : 0,
        runeCorpseExplodeChance: runeCorpseExplodeChance,
        runeCorpseExplodeLifePct: runeCorpseExplodeLifePct,
        runeResonancePower: bonusResonancePower,
        supportScaleBases: Object.fromEntries(Array.from(new Set(Object.values(TAGGED_DAMAGE_STAT_BY_TAG))).map(statId => [statId, Math.max(0, sumNonSupportStat(statId))])),
        summonFlatDmg: Math.max(0, (gearBase.summonFlatDmg || 0) + (gearExplicit.summonFlatDmg || 0) + (passive.summonFlatDmg || 0) + (season.summonFlatDmg || 0) + (ascend.summonFlatDmg || 0) + (support.summonFlatDmg || 0) + (reward.summonFlatDmg || 0)),
        summonPctDmg: Math.max(0, (gearBase.summonPctDmg || 0) + (gearExplicit.summonPctDmg || 0) + (passive.summonPctDmg || 0) + (season.summonPctDmg || 0) + (ascend.summonPctDmg || 0) + (support.summonPctDmg || 0) + (reward.summonPctDmg || 0) + tick.get('summonDeathDamagePct')),
        summonSharedPctDmg: summonSharedGeneralPctDmg,
        supportValues,
        supportAuraFlat: window.GameModules.combat.supports.auraFlat(auraValues),
        summonSharedTaggedPctDmg: Object.fromEntries(Array.from(new Set(Object.values(TAGGED_DAMAGE_STAT_BY_TAG))).map(statId => [statId, Math.max(0, sumStatAcrossBuckets(statId) - (support[statId] || 0))])),
        summonAspd: Math.max(0, (gearBase.summonAspd || 0) + (gearExplicit.summonAspd || 0) + (passive.summonAspd || 0) + (season.summonAspd || 0) + (ascend.summonAspd || 0) + (support.summonAspd || 0) + (reward.summonAspd || 0) + sbSummonAspdBonus + tick.get('summonCritAspd')),
        summonHpPct: Math.max(0, (gearBase.summonHpPct || 0) + (gearExplicit.summonHpPct || 0) + (passive.summonHpPct || 0) + (season.summonHpPct || 0) + (ascend.summonHpPct || 0) + (support.summonHpPct || 0) + (reward.summonHpPct || 0)),
        summonCrit: Math.max(0, (gearBase.summonCrit || 0) + (gearExplicit.summonCrit || 0) + (passive.summonCrit || 0) + (season.summonCrit || 0) + (ascend.summonCrit || 0) + (support.summonCrit || 0) + (reward.summonCrit || 0)),
        summonCritDmg: Math.max(0, (gearBase.summonCritDmg || 0) + (gearExplicit.summonCritDmg || 0) + (passive.summonCritDmg || 0) + (season.summonCritDmg || 0) + (ascend.summonCritDmg || 0) + (support.summonCritDmg || 0) + (reward.summonCritDmg || 0)),
        summonCap: getSummonCapFromSum(summonCapTotal()),
        curseCap: 1 + sumStatAcrossBuckets('curseCap') + ((hasKeystone('wlk9')) ? 1 : 0),
        summonEfficiency: Math.max(0, (gearBase.summonEfficiency || 0) + (gearExplicit.summonEfficiency || 0) + (passive.summonEfficiency || 0) + (season.summonEfficiency || 0) + (ascend.summonEfficiency || 0) + (support.summonEfficiency || 0) + (reward.summonEfficiency || 0)),
        summonResPen: Math.max(0, (gearBase.summonResPen || 0) + (gearExplicit.summonResPen || 0) + (passive.summonResPen || 0) + (season.summonResPen || 0) + (ascend.summonResPen || 0) + (support.summonResPen || 0) + (reward.summonResPen || 0)),
        summonGuardRedirectPct: Math.max(0, Math.min(100, (gearBase.summonGuardRedirectPct || 0) + (gearExplicit.summonGuardRedirectPct || 0) + (passive.summonGuardRedirectPct || 0) + (season.summonGuardRedirectPct || 0) + (ascend.summonGuardRedirectPct || 0) + (support.summonGuardRedirectPct || 0) + (reward.summonGuardRedirectPct || 0))),
        poisonDamageMultiplierPct: Math.max(0, finalPoisonDamageMultiplierPct),
        shockedEnemyHitDamagePct: Math.max(0, sumStatAcrossBuckets('shockedEnemyHitDamagePct')),
        shockedEnemyHitDamageMorePct: Math.max(0, (gearBase.shockedEnemyHitDamageMorePct || 0) + (gearExplicit.shockedEnemyHitDamageMorePct || 0) + (passive.shockedEnemyHitDamageMorePct || 0) + (season.shockedEnemyHitDamageMorePct || 0) + (ascend.shockedEnemyHitDamageMorePct || 0) + (support.shockedEnemyHitDamageMorePct || 0) + (reward.shockedEnemyHitDamageMorePct || 0)),
        sbPlayerAttackPower: Math.max(0, sbPlayerAttackPower),
        ...collectOceanStats(sumStatAcrossBuckets), ...collectCooldownStats(sumStatAcrossBuckets),
        regionAffix: regionAffixEffects.collect(sumStatAcrossBuckets),
        bossDamagePct: Math.max(0, sumStatAcrossBuckets('bossDamagePct')),
        eliteDamagePct: Math.max(0, sumStatAcrossBuckets('eliteDamagePct')),
        firstStrikeDamagePct: Math.max(0, sumStatAcrossBuckets('firstStrikeDamagePct')),
        cullStrikePct: Math.max(0, Math.min(20, sumStatAcrossBuckets('cullStrikePct'))),
        echoPower: Math.max(0, sumStatAcrossBuckets('echoPower')),
        chaosErosion: Math.max(0, sumStatAcrossBuckets('chaosErosion')),
        chaosErosionCap: Math.max(0, sumStatAcrossBuckets('chaosErosionCap'))
    };
    enemy.passiveSoleMinionLostCap = authoredPassiveRules.flags.soleMinion
        ? Math.max(0, enemy.summonCap - 1) : 0;
    enemy.talentSourceStats = talentSourceStats;
    if (typeof applyTalentPrecisePostStats === 'function') applyTalentPrecisePostStats(enemy);
    const core = { stats: enemy, gemEvaluation, lastStandMaxHp,
        immunity: { ignite: uniqueImmuneIgnite, frostSentinel: uniqueFrostSentinel, freeze: uniqueImmuneFreeze,
            shock: !!uniqueShockTracer, bleed: uniqueBleedBlockHelm || uniqueImmuneBleed, closedEyes: uniqueClosedEyes } };
    return keepCore ? core : finishPlayerStats(core, includeBreakdowns);
}

/**
 * The per-call end of getPlayerStats on a fresh copy: callers adjust the stats they get (condition buffs, chill, skill targets),
 * and a settlement may answer many calls with one kept calculation (js/player-stat-cache.js). Then the guardian last stand
 * cleanse, the summon DPS estimate against the current target and the immunity lines, in their old order. (The old end also
 * added the shock tracer's shock effect to the reward bucket after the stats were built, which nothing read.)
 */
function finishPlayerStats(core, includeBreakdowns) {
    const enemy = { ...core.stats };
    if (enemy.sSkill) enemy.sSkill = { ...enemy.sSkill };
    if (enemy.breakdowns) enemy.breakdowns = { ...enemy.breakdowns };
    if (core.lastStandMaxHp !== null) cleanseGuardianLastStand(core.lastStandMaxHp);
    let summonEstimate = estimateSummonDps(enemy, includeBreakdowns, core.gemEvaluation);
    enemy.summonDps = Math.max(0, summonEstimate.total || 0);
    enemy.directDps = Math.max(0, enemy.dps || 0);
    enemy.totalDps = enemy.directDps + enemy.summonDps;
    appendPlayerDpsBreakdowns(enemy, summonEstimate);
    applyStatImmunities(enemy, core.immunity);
    return enemy;
}

/** gd7 last stand: at half life or less, ailments are cleansed at most every 5 seconds. */
function cleanseGuardianLastStand(maxHp) {
    if (!((game.playerHp / Math.max(1, maxHp)) <= 0.5)) return;
    let now = getCombatTime();
    if ((game.guardianLastStandCleanseAt || 0) + 5000 <= now) {
        game.playerAilments = [];
        game.guardianLastStandCleanseAt = now;
    }
}

function applyStatImmunities(enemy, immunity) {
    if (immunity.ignite) enemy.immuneIgnite = true;
    if (immunity.frostSentinel) { enemy.immuneChill = true; enemy.immuneFreeze = true; }
    if (immunity.freeze) enemy.immuneFreeze = true;
    if (immunity.shock) enemy.immuneShock = true;
    if (immunity.bleed) enemy.immuneBleed = true;
    if (immunity.closedEyes) {
        enemy.immuneIgnite = true;
        enemy.immuneChill = true;
        enemy.immuneFreeze = true;
        enemy.immuneShock = true;
        enemy.immuneBleed = true;
        enemy.immunePoison = true;
    }
}

function appendPlayerDpsBreakdowns(stats, summonEstimate) {
    if (!stats.breakdowns) return;
    let directLines = stats.breakdowns.dps.lines;
    stats.breakdowns.directDps = {
        title: _t('직접 DPS'), lines: directLines.slice(), final: `${Math.floor(stats.directDps)}`
    };
    stats.breakdowns.summonDps = {
        title: _t('소환 DPS'), lines: summonEstimate.lines || [], final: `${Math.floor(stats.summonDps)}`
    };
    stats.breakdowns.summonCap = {
        title: _t('소환수 한도'),
        lines: [
            _t('현재 소환 한도 {summonCap}', { summonCap: stats.summonCap }),
            _t('최대 소환 한도 {summonCapMaximum}', { summonCapMaximum: getSummonCapMaximum() }),
            _t(hasKeystone('sb9') ? '대군주: 현재 생명력이 가장 낮은 하위 1/3(최대 4기)이 유령 상태' : '기본 최대 한도 8')
        ],
        final: _t('{summonCap} / 최대 {summonCapMaximum}', { summonCap: stats.summonCap, summonCapMaximum: getSummonCapMaximum() })
    };
    stats.breakdowns.dps = {
        title: _t('총 DPS'),
        lines: [
            _t('직접 DPS {floor}', { floor: Math.floor(stats.directDps) }),
            _t('예상 소환 DPS {floor}', { floor: Math.floor(stats.summonDps) }),
            _t('총 DPS = 직접 DPS + 예상 소환 DPS')
        ].concat(directLines),
        final: `${Math.floor(stats.totalDps)}`
    };
}

/** A rune's shown numbers: a support rune's value at its level and active tier, else the skill at its final level (cores, quality,
 * the sky tower boost, a projectile pattern). Split by kind on 2026-10-18, same calls in the same order. */
function getGemPresentation(name, isSupport, statsOverride) {
    let stats = statsOverride || getPlayerStats();
    let targetGemSources = getTargetGemBonusSources(name, stats.gemBonusSources);
    if (isSupport) return getSupportGemPresentation(name, stats, targetGemSources, typeof getSupportActiveTier === 'function' ? getSupportActiveTier : null);
    return getSkillGemPresentation(name, stats, targetGemSources);
}
/** A support rune's value at its level and tier (activeTierOf: ui.js's reader of the chosen tier, null in runs without it). */
function getSupportGemPresentation(name, stats, targetGemSources, activeTierOf) {
    let gem = normalizeGemRecord((game.supportGemData || {})[name]);
    let db = SUPPORT_GEM_DB[name];
    if (!db) return { baseLevel: gem.level, totalLevel: gem.level, value: 0, desc: _t('정의되지 않은 보조스킬룬'), statName: name, statId: null, gemBonusSources: targetGemSources };
    let totalLevel = Math.max(1, gem.level + targetGemSources.total);
    let val = db.baseVal + (getGemLevelGrowthSteps(totalLevel) * db.scale);
    const { activeTier, tierMul } = getSupportGemTier(name, gem, activeTierOf);
    let ratioPct = db.tierValues ? db.tierValues[activeTier - 1] : val * tierMul;
    let scaleBase = db.scaleWithOwnStat ? Math.max(0, Number(stats.supportScaleBases && stats.supportScaleBases[db.scaleWithOwnStat]) || 0) : 0;
    let value = db.scaleWithOwnStat ? scaleBase * (ratioPct / 100) : ratioPct;
    return { baseLevel: gem.level, totalLevel: totalLevel, value: value, desc: db.desc, statName: db.name, statId: db.stat, activeTier: activeTier, gemBonusSources: targetGemSources, scaleWithOwnStat: db.scaleWithOwnStat || null, scaleBase: scaleBase, scaleRatioPct: ratioPct };
}
/** A support rune's active tier and its multiplier (fallbacks for runs without the tier helpers). */
function getSupportGemTier(name, gem, activeTierOf) {
    let activeTier = activeTierOf ? activeTierOf(name) : Math.max(1, Math.min((typeof getSupportTierCap === 'function' ? getSupportTierCap(name) : 3), Math.floor(gem.activeTier || gem.unlockedTier || 1)));
    let tierMul = typeof getSupportTierMultiplier === 'function' ? getSupportTierMultiplier(name, activeTier) : (activeTier === 1 ? 1 : activeTier === 2 ? 1.55 : 2.2);
    return { activeTier, tierMul };
}
/** A skill rune's levels, its leveled skill with a projectile pattern, and its core fields. */
function getSkillGemPresentation(name, stats, targetGemSources) {
    let db = SKILL_DB[name];
    if (!db) return { baseLevel: 0, totalLevel: 0, finalLevel: 0, desc: _t('정의되지 않은 스킬'), skill: SKILL_DB['기본 공격'], tags: ['attack'] };
    if (!db.isGem && !db.levelable) return { baseLevel: 0, totalLevel: 0, finalLevel: 0, desc: db.desc, statName: name, skill: db, tags: getSkillTagList(db) };
    game.gemData = game.gemData || {};
    let gem = normalizeGemRecord((game.gemData || {})[name]);
    if (db.levelable) game.gemData[name] = gem;
    const levels = getSkillGemLevels(name, db, gem, targetGemSources);
    let skill = window.GameModules.combat.supports.resolve(applyGemPresentationPattern(name, getLeveledGemSkill(db, gem, levels.finalLevel), stats));
    return {
        baseLevel: gem.level, totalLevel: levels.totalLevel, finalLevel: levels.finalLevel, materialBonus: levels.materialBonus, permanentSkyBonus: levels.permanentSkyBonus, engraveLevel: levels.engraveLevel,
        ...getSkillGemCoreFields(gem), desc: db.desc, skill: skill, tags: getSkillTagList(skill), gemBonusSources: targetGemSources
    };
}
/** The sky tower boost, the core and awakening levels, the gear levels, the sky engraving's rune levels (as getActiveSkillStats), and
 * the total and final (base capped at 20) levels. */
function getSkillGemLevels(name, db, gem, targetGemSources) {
    const { permanentSkyBonus, materialBonus, engraveLevel } = db.isGem ? getSkillRuneBonusLevels(name, gem) : NO_RUNE_BONUS_LEVELS;
    let levelBonus = db.isGem ? targetGemSources.total : 0;
    let totalLevel = gem.level + levelBonus + materialBonus + engraveLevel;
    let finalLevel = Math.min(20, gem.level) + levelBonus + materialBonus + engraveLevel;
    return { permanentSkyBonus, materialBonus, engraveLevel, totalLevel, finalLevel };
}
/** The skill's damage, speed and crit at the final level, with quality and the core forge's damage and speed. */
function getLeveledGemSkill(db, gem, finalLevel) {
    let skill = { ...db };
    skill.dmg = skill.baseDmg + (getGemLevelGrowthSteps(finalLevel) * skill.dmgScale);
    skill.spd = skill.baseSpd + (getGemLevelGrowthSteps(finalLevel) * skill.spdScale);
    if (skill.critScale) skill.crit = (skill.crit || 0) + (getGemLevelGrowthSteps(finalLevel, 0) * skill.critScale);
    let qualityMul = 1 + Math.max(0, Math.min(20, gem.quality || 0)) / 200;
    skill.dmg *= qualityMul * (db.isGem ? gemCoreForge.effects(gem).damage : 1);
    skill.spd *= qualityMul * (db.isGem ? gemCoreForge.effects(gem).speed : 1);
    return skill;
}
/** The active skill's projectile pattern from the stats, else the sky tower's for this skill. */
function applyGemPresentationPattern(name, skill, stats) {
    let activePattern = name === game.activeSkill && stats.sSkill && stats.sSkill.projectilePatternSource
        ? stats.sSkill : null;
    let patternMode = activePattern && activePattern.projectilePattern
        ? activePattern.projectilePattern.mode : getSkyProjectilePatternMode(name);
    if (patternMode) skill = applyProjectilePatternMode(skill, patternMode, activePattern ? activePattern.projectilePatternSource : '창공 각인', activePattern ? activePattern.projectilePatternDamageMultiplier : null);
    return skill;
}
function getSkillGemCoreFields(gem) {
    return { enhanceLevel: gem.enhanceLevel || 0, skyEnhanceCap: gem.skyEnhanceCap || 1, quality: gem.quality || 0, awakened: !!gem.awakened };
}

safeExposeGlobals({ getPlayerStats, getGemPresentation });

// Stable calculator entry for isolated requirement views, independent of public instrumentation wrappers.
const equipmentStatCalculator = getPlayerStats;
