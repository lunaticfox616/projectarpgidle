// 소환수 능력치와 공격 (2026-11-10에 js/combat.js에서 그대로 옮겼다. js/combat.js 뒤에 옮기기 전과 같은 순서로 읽는다.)
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
function getSummonGemLevel(gemName, source, pStats, evaluation) {
    let isSupport = source === 'support';
    let records = isSupport ? (game.supportGemData || {}) : (game.gemData || {});
    let record = records[gemName] || {};
    let baseLevel = Math.max(1, record.level || 1);
    let sources = getTargetGemBonusSources(gemName, pStats && pStats.gemBonusSources, undefined, evaluation);
    let bonus = Math.max(0, Math.floor((sources && sources.total) || 0));
    let engraveBonus = typeof getGemSkyEnhanceGemLevelBonus === 'function' ? getGemSkyEnhanceGemLevelBonus(gemName) : 0;
    // 활성 스킬룬, 룬 표시와 같은 재료 레벨(getSkillRuneBonusLevels: 군주의핵 + 창공의힘 + 각성 + 응축창공). 이게 빠져 있으면 소환 공격 룬에
    // 이 재료들을 투자해도 룬 자체의 "총 레벨" 표시만 오르고 실제 소환수 전투력은 그대로였다.
    let isGem = !isSupport && typeof SKILL_DB !== 'undefined' && SKILL_DB[gemName] && SKILL_DB[gemName].isGem;
    let materialBonus = isGem ? getSkillRuneBonusLevels(gemName, record).materialBonus : 0;
    return Math.max(1, baseLevel + bonus + engraveBonus + materialBonus);
}

function getAttackSummonGrowthSteps(gemLv) {
    let levelSteps = Math.max(0, Math.floor(Number(gemLv || 1)) - 1);
    let pre10Steps = Math.min(8, levelSteps);
    let level10Steps = Math.min(11, Math.max(0, levelSteps - 8));
    // 레벨 21~30 구간(80 → 130으로 상향)과 레벨 31+ 구간(신설, 스텝당 260)을 분리해
    // 20레벨 이상 스케일링을 전반적으로 올리고, 30레벨을 넘기면 훨씬 더 가파르게 오르게 함.
    let level20Steps = Math.min(10, Math.max(0, levelSteps - 19));
    let post30Steps = Math.max(0, levelSteps - 29);
    return 9 + (pre10Steps * 6) + (level10Steps * 29) + (level20Steps * 130) + (post30Steps * 260);
}

function getSummonLevelGrowthSteps(profile, gemLv) {
    return profile && profile.role === 'attack'
        ? getAttackSummonGrowthSteps(gemLv)
        : Math.max(0, Math.floor(Number(gemLv || 1)) - 1);
}

function getSummonScaledBaseDamage(profile, gemLv, pStats) {
    let dmgGrowth = 1 + getGemHighLevelGrowth(getSummonLevelGrowthSteps(profile, gemLv), getSummonLevelGrowthSteps(profile, 19)) * (profile.dmgPerLevelPct || 0.1);
    let flat = Math.max(0, (pStats && pStats.summonFlatDmg) || 0);
    return Math.max(1, Math.floor(((profile.baseDamage || 20) * dmgGrowth) + flat));
}

// Representative attack summon's own per-hit attack power (pre-crit, before any sb7 complement).
// Used by Soulbinder '상호 보완'(sb7) so the player/summon share each other's *attack power* rather
// than the raw %damage stat. Computed from summon-only stats, so it never depends on the player's
// complement bonus — keeping the cross-share free of any feedback loop.
function getRepresentativeSummonAttackPower(summonStats, evaluation) {
    let names = (Array.isArray(game.equippedSummonSkills) ? game.equippedSummonSkills : [])
        .filter(name => SKILL_DB[name] && Array.isArray(SKILL_DB[name].tags) && SKILL_DB[name].tags.includes('summon_attack'));
    let best = 0;
    names.forEach(name => {
        let profile = getSummonProfile(name);
        if (profile.role === 'guard') return;
        const local = window.GameModules.combat.summonSupports.localStats({ gemName: name }, summonStats);
        let gemLv = getSummonGemLevel(name, 'skill', summonStats, evaluation);
        let base = getSummonScaledBaseDamage(profile, gemLv, local);
        let sharedInc = getSummonAverageSharedIncreasePct({ gemName: name }, local);
        let ownMul = (1 + ((local.summonPctDmg || 0) + sharedInc) / 100) * (1 + ((local.summonEfficiency || 0) / 100)) * local.summonSupportEffects.damageMultiplier;
        best = Math.max(best, base * ownMul * gemCoreForge.effects(game.gemData?.[name]).damage);
    });
    return Math.max(0, best);
}

function getSummonMaxHp(profile, gemLevel, pStats) {
    let levelSteps = getSummonLevelGrowthSteps(profile, gemLevel);
    const exponent = profile.hpScaleExp || 1.12;
    let hpGrowth = 1 + getGemHighLevelGrowth(Math.pow(levelSteps, exponent), Math.pow(getSummonLevelGrowthSteps(profile, 19), exponent)) * (profile.hpScaleBase || 0.04);
    let hpMul = 1 + ((pStats.summonHpPct || 0) / 100);
    let effMul = 1 + ((pStats.summonEfficiency || 0) / 100);
    let flags = (pStats && pStats.passiveKeystoneFlags) || {};
    if (flags.proxyCovenant && profile.role === 'guard') hpMul *= 2;
    if (flags.soleMinion && profile.role === 'attack') hpMul *= 1 + Math.max(0, pStats.passiveSoleMinionLostCap || 0) * 0.5;
    return Math.max(1, Math.floor(profile.baseHp * hpGrowth * hpMul * effMul));
}

function getSummonEvasionGrowthSteps(gemLevel) {
    let levelSteps = Math.max(0, Math.floor(Number(gemLevel || 1)) - 1);
    let earlySteps = Math.min(19, levelSteps);
    let post20Steps = Math.max(0, levelSteps - 19);
    return earlySteps + post20Steps * SUMMON_EVASION_POST_20_STEP_MULTIPLIER;
}

function getSummonEvasionRating(profile, gemLevel, pStats) {
    let steps = getSummonEvasionGrowthSteps(gemLevel);
    let growth = 1 + getGemHighLevelGrowth(Math.pow(steps, profile.evasionScaleExp || 1.1), Math.pow(getSummonEvasionGrowthSteps(19), profile.evasionScaleExp || 1.1)) * (profile.evasionScaleBase || 0.015);
    let efficiencyPct = Math.max(0, Number(pStats && pStats.summonEfficiency) || 0);
    let efficiencyMultiplier = 1 + (efficiencyPct * SUMMON_EFFICIENCY_EVASION_RATIO / 100);
    return Math.max(0, Math.floor((profile.baseEvasion || 0) * growth * efficiencyMultiplier));
}

function getSummonRegenPerSec(maxHp) {
    return Math.max(1, Math.floor(Math.max(1, maxHp) * SUMMON_REGEN_PCT_PER_SEC / 100));
}

function buildSummonRuntimeStats(row, pStats, now, gemLv = getSummonGemLevel(row.name, row.source, pStats)) {
    pStats = window.GameModules.combat.summonSupports.localStats({ gemName: row.name }, pStats);
    let profile = getSummonProfile(row.name);
    let isGuard = profile.role === 'guard';
    let levelSteps = getSummonLevelGrowthSteps(profile, gemLv);
    const exponent = profile.armorScaleExp || 1.1;
    let armorGrowth = 1 + getGemHighLevelGrowth(Math.pow(levelSteps, exponent), Math.pow(getSummonLevelGrowthSteps(profile, 19), exponent)) * (profile.armorScaleBase || 0.015);
    let maxHp = Math.max(1, Math.floor(getSummonMaxHp(profile, gemLv, pStats) * window.GameModules.combat.summonSupports.hpMultiplier(pStats)));
    return {
        gemName: row.name,
        slotIdx: row.slotIdx,
        duplicateIndex: row.duplicateIndex || 0,
        role: isGuard ? 'guard' : 'attack',
        gemLevel: gemLv,
        trait: profile.trait || '',
        hp: maxHp,
        maxHp: maxHp,
        regenPerSec: getSummonRegenPerSec(maxHp),
        armor: Math.max(0, Math.floor((profile.baseArmor || 0) * armorGrowth)),
        evasion: getSummonEvasionRating(profile, gemLv, pStats),
        resFire: Math.max(-60, Math.min(90, profile.baseRes.fire || 0)),
        resCold: Math.max(-60, Math.min(90, profile.baseRes.cold || 0)),
        resLight: Math.max(-60, Math.min(90, profile.baseRes.light || 0)),
        resChaos: Math.max(-60, Math.min(90, profile.baseRes.chaos || 0)),
        redirectPct: isGuard ? 100 : Math.max(0, Math.min(100, profile.redirectPct || 0)),
        respawnMs: Math.max(4000, Math.floor((profile.respawnMs || (isGuard ? 8000 : 4000))
            * (((isGuard && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.proxyCovenant)
                || (!isGuard && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.soleMinion)) ? 2 : 1))),
        baseDamage: getSummonScaledBaseDamage(profile, gemLv, pStats),
        ele: profile.ele || 'phys',
        attackSpeedMul: Math.max(0, Number(profile.attackSpeedMul || 1)),
        resPenBonus: Math.max(0, Number(profile.resPenBonus || 0)),
        physIgnoreBonus: Math.max(0, Number(profile.physIgnoreBonus || 0)),
        crit: Math.max(0, profile.baseCrit || 0),
        critDmg: Math.max(100, profile.baseCritDmg || 140),
        dmgRollMinPct: Math.max(1, Math.min(100, Math.floor(profile.dmgRollMinPct || 40))),
        gridRange: Math.max(1, Math.floor(profile.gridRange || 1)),
        alive: true,
        respawnAt: 0,
        nextAttackAt: now + 300
    };
}

function getLimitedSummonPenetrationStats(pStats, summon) {
    pStats = window.GameModules.combat.summonSupports.localStats(summon, pStats);
    let fullPen = hasKeystone('sb6');
    const inheritedResPen = Math.max(0, (pStats.resPen || 0) - window.GameModules.combat.summonSupports.playerSupportValue(pStats, 'resPen'));
    let baseResPen = fullPen ? inheritedResPen : Math.min(40, inheritedResPen * 0.55);
    let basePhysIgnore = Math.min(30, Math.max(0, (pStats.physIgnore || 0) - window.GameModules.combat.summonSupports.playerSupportValue(pStats, 'physIgnore')) * 0.55);
    return {
        // Only these flags are consumed by getEffectiveEnemyMitigation. Avoid copying the entire
        // player stat sheet for every summon hit and every DPS estimate.
        allowNegativePhysIgnore: pStats.allowNegativePhysIgnore,
        crusaderLightningIgnoreRes: pStats.crusaderLightningIgnoreRes,
        crusaderNoResPenOnLightning: pStats.crusaderNoResPenOnLightning,
        resPen: baseResPen + Math.max(0, (summon && summon.resPenBonus) || 0) + Math.max(0, (pStats && pStats.summonResPen) || 0),
        physIgnore: basePhysIgnore + Math.max(0, (summon && summon.physIgnoreBonus) || 0)
    };
}

function getPassiveWisdomLeapDamageMultiplier(pStats, element) {
    let damageElement = String(element || '').replace('lightning', 'light');
    if (damageElement === 'chaos' && pStats && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.absolution) return 0;   // 면죄의 복음
    let selectedElement = pStats && pStats.passiveWisdomElement;
    if (!selectedElement) return 1;
    return damageElement === selectedElement ? 1.2 : 0;
}

/** 피해의 몇 할이 카오스로 바뀌는가: 검은 증류(원소의 50%). 시간왜곡은 2026-11-12부터 변환이 아니다(js/passives.js applyPassiveWrittenKeystoneRules). */
function getPassiveChaosConversionShare(pStats, element) {
    const flags = (pStats && pStats.passiveKeystoneFlags) || {};
    if (element === 'chaos') return 0;
    const distill = flags.blackDistill && ['fire', 'cold', 'light'].includes(element) ? 0.5 : 0;
    return distill;
}

function getLimitedSummonFinalDamageMultiplier(pStats, summon) {
    // 소환수도 플레이어의 일반 최종 피해 배율과 지혜의 도약 속성 선택을 적용받습니다.
    let finalMultiplier = Number(pStats && pStats.finalDamageMultiplier);
    if (!Number.isFinite(finalMultiplier)) finalMultiplier = 1;
    return Math.max(0, finalMultiplier) * getPassiveWisdomLeapDamageMultiplier(pStats, summon && summon.ele);
}

function getLimitedSummonBossDamageMultiplier(pStats, target) {
    if (!target || !target.isBoss) return 1;
    let mul = Math.max(0, Number(pStats && pStats.bossDamageDealtMultiplier) || 1);
    if (mul <= 1) return mul;
    return 1 + Math.min(1.25, (mul - 1) * 0.65);
}

function getSummonAttackIntervalMs(pStats, summon) {
    pStats = window.GameModules.combat.summonSupports.localStats(summon, pStats);
    const forgeSpeed = gemCoreForge.forSkill(summon && summon.gemName).speed;
    if (typeof getPreciseTalentLevel === 'function' && getPreciseTalentLevel('hero3__soulbinder')) {
        return Math.max(120, Math.floor(1000 / (Math.max(0.1, Number(pStats && pStats.aspd) || 1) * forgeSpeed)));
    }
    let profileMul = Math.max(0.1, Number((summon && summon.attackSpeedMul) || 1));
    let summonAspdMul = 1 + Math.max(0, ((pStats && pStats.summonAspd) || 0) / 100);
    return Math.max(120, Math.floor(1000 / (summonAspdMul * profileMul * forgeSpeed * pStats.summonSupportEffects.speedMultiplier)));
}

/** The gem's tags, plus the element a rolling wisp (분광) hits with on this attack. */
function getSummonDamageTags(summon) {
    const skillDef = window.GameModules.combat.summonSupports.skill(summon);
    return new Set(skillDef.tags);
}

function getSummonSharedDamageIncreasePct(summon, pStats) {
    let generic = Math.max(0, Number((pStats && pStats.summonSharedPctDmg) || 0));
    let taggedStats = (pStats && pStats.summonSharedTaggedPctDmg) || {};
    let tags = getSummonDamageTags(summon);
    let tagged = 0;
    Object.keys(TAGGED_DAMAGE_STAT_BY_TAG).forEach(tag => {
        if (!tags.has(tag)) return;
        tagged += Math.max(0, Number(taggedStats[TAGGED_DAMAGE_STAT_BY_TAG[tag]]) || 0);
    });
    return generic + tagged;
}

/** A wisp that rolls its element per attack (분광) gets each element's increase a third of the time: the average. */
function getSummonAverageSharedIncreasePct(summon, pStats) {
    const elements = wispSummons.elements(summon.gemName);
    if (!elements) return getSummonSharedDamageIncreasePct(summon, pStats);
    return elements.reduce((sum, ele) => sum + getSummonSharedDamageIncreasePct({ ...summon, ele }, pStats), 0) / elements.length;
}

/** One summon hit on target (none for an estimate): the base hit, its crit, then the target's scales. options.expected averages the
 * roll and the crit; rollOverridePct and forceCrit fix them. Split into its stages on 2026-10-18; the damage and the ailment source
 * damage change in the same order. */
function getSummonHitDamageInfo(s, pStats, target, options) {
    pStats = window.GameModules.combat.summonSupports.localStats(s, pStats);
    let expected = !!(options && options.expected);
    let ele = s.ele || 'phys';
    let zone = getZone(game.currentZoneId) || getZone(0);
    let zoneTier = (zone && zone.tier) || 1;
    const hit = getSummonBaseHit(s, pStats, options, expected);
    applySummonHitCrit(hit, pStats, options, expected);
    window.GameModules.combat.summonSupports.scaleHit(hit, { s, pStats, target, ele, zone, zoneTier, expected });
    const converted = pStats.summonSupportEffects.conversion;
    return { damage: Math.max(0, Math.floor(hit.dmg)), ailmentSourceDamage: Math.max(0, Math.floor(hit.ailmentSourceDmg)), crit: hit.crit, critChance: hit.critChance, element: converted?.pct === 100 ? converted.element : ele, parts: hit.parts };
}

/** The hit before crits: base damage (keystone sb1 more), increases and efficiency, the summon's roll and keystone sb7's share of the
 * hero's attack power. */
function getSummonBaseHit(s, pStats, options, expected) {
    let base = Math.max(1, Math.floor(s.baseDamage || 20));
    if (hasKeystone('sb1')) base = Math.max(1, Math.floor(base * (1 + ASCENDANCY_KEYSTONE_VALUES.sb1.summonBaseMorePct / 100)));
    let dmgMul = getSummonHitDamageMultiplier(s, pStats);
    const { critChance, critMul } = getSummonCritProfile(s, pStats);
    const hit = { dmg: Math.max(1, base * dmgMul), ailmentSourceDmg: Math.max(1, base * dmgMul), crit: false, critChance, critMul };
    let rollPct = getSummonHitRollPct(s, options, expected);
    hit.dmg *= rollPct / 100;
    hit.ailmentSourceDmg *= rollPct / 100;
    // 상호 보완(sb7): 플레이어 공격력(타격당 기본 피해)의 일부(ASCENDANCY_KEYSTONE_VALUES.sb7)를 소환수 타격에 가산(치명타 적용 전).
    if (hasKeystone('sb7')) {
        let sbPlayerShare = ASCENDANCY_KEYSTONE_VALUES.sb7.sharePct / 100 * Math.max(0, Number((pStats && pStats.sbPlayerAttackPower) || 0));
        if (sbPlayerShare > 0) {
            hit.dmg += sbPlayerShare;
            hit.ailmentSourceDmg += sbPlayerShare;
        }
    }
    return hit;
}

/** Crit chance 5% to 95% and crit damage at least 120%: the summon's own plus the hero's summon crit stats. */
function getSummonCritProfile(s, pStats) {
    pStats = window.GameModules.combat.summonSupports.localStats(s, pStats);
    let critChance = Math.max(0.05, Math.min(0.95, ((s.crit || 0) + (pStats.summonCrit || 0)) / 100));
    let critMul = Math.max(1.2, ((s.critDmg || 140) + (pStats.summonCritDmg || 0)) / 100);
    return { critChance, critMul };
}

function getSummonHitDamageMultiplier(s, pStats) {
    pStats = window.GameModules.combat.summonSupports.localStats(s, pStats);
    let sharedIncreasePct = getSummonSharedDamageIncreasePct(s, pStats);
    // 소환수 효율은 피해 증가(소환수 피해/공유)와 합산이 아니라 별도 곱연산으로 적용합니다.
    let dmgMul = (1 + ((pStats.summonPctDmg || 0) + sharedIncreasePct) / 100)
        * (1 + ((pStats.summonEfficiency || 0) / 100)) * gemCoreForge.forSkill(s.gemName).damage;
    if (s.role === 'attack' && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.soleMinion) {
        dmgMul *= 1 + Math.max(0, Number(pStats.passiveSoleMinionLostCap) || 0) * 0.75;
    }
    return dmgMul * pStats.summonSupportEffects.damageMultiplier;
}

/** 소환수마다 다른 일격 편차(dmgRollMinPct~100%): 버스트형(화염 위습 등)은 편차가 크고 연사형(냉기 위습 등)은 작아, "최소 피해"가
 * 최대 피해 대비 지나치게 미미해지지 않게 한다. An estimate takes the middle; rollOverridePct fixes it. */
function getSummonHitRollPct(s, options, expected) {
    let rollMinPct = Math.max(1, Math.min(100, Math.floor(s.dmgRollMinPct || 40)));
    if (Number.isFinite(options && options.rollOverridePct)) return Math.max(1, Math.min(100, options.rollOverridePct));
    return expected ? ((rollMinPct + 100) / 2) : (rollMinPct + Math.random() * (100 - rollMinPct));
}

/** The crit: an estimate averages it; forceCrit decides it; else a roll. A unique can make a hit that does not crit deal nothing. */
function applySummonHitCrit(hit, pStats, options, expected) {
    if (expected) {
        hit.dmg *= pStats.uniqueSummonNonCritNoDamage ? (hit.critChance * hit.critMul) : ((1 - hit.critChance) + (hit.critChance * hit.critMul));
        return;
    }
    const forced = typeof (options && options.forceCrit) === 'boolean';
    const crits = forced ? options.forceCrit : Math.random() < hit.critChance;
    if (crits) {
        hit.dmg *= hit.critMul;
        hit.crit = true;
    } else if (pStats.uniqueSummonNonCritNoDamage) {
        hit.dmg = 0;
        hit.ailmentSourceDmg = 0;
    }
}

/** Scales both parts of the hit by mul and floors them (each step floors). */
function scaleSummonHit(hit, mul) {
    hit.dmg = Math.floor(hit.dmg * mul);
    hit.ailmentSourceDmg = Math.floor(hit.ailmentSourceDmg * mul);
}

/** The target's side: the boss limit, talisman curses, its resistance after the hero's (limited) penetration, an entropy dodge, the
 * element it takes more of, keystone and abyss scales, the talisman boss bonus, then the summon's final limit. */
function applySummonHitTargetScales(hit, ctx) {
    const { s, pStats, target, ele, zoneTier, expected } = ctx;
    if (target && target.isBoss) {
        let bossMul = getLimitedSummonBossDamageMultiplier(pStats, target);
        hit.dmg *= bossMul;
        hit.ailmentSourceDmg *= bossMul;
    }
    let curseFx = target ? getEnemyConditionDebuffFactor(target, pStats) : { mul: 1, resShred: 0, resFShred: 0, resCShred: 0, resLShred: 0, resChaosShred: 0, physDrShred: 0, lightTakenMul: 1, chaosTakenMul: 1, critDmgTakenMul: 1 };
    let enemyRes = getSummonTargetResistance(ele, zoneTier, target, { pStats, s, curseFx });
    if (!expected && target) dodgeSummonHitByEntropy(hit, target);
    scaleSummonHit(hit, 1 - (enemyRes / 100));
    scaleSummonHit(hit, curseFx.mul || 1);
    applySummonElementTaken(hit, ele, target, curseFx);
    applySummonLateScales(hit, ctx, curseFx);
}

/** 변이시간선의 피해 배율(js/loop-mutation.js takenMul). 면역이면 그 몬스터 위에 '면역'을 띄운다(몬스터마다 0.8초에 한 번). */
function mutationHitScale(enemy, ele) {
    const mul = loopMutation.takenMul(enemy, ele), now = getCombatTime();
    if (mul > 0 || enemy.mutationImmuneFxAt > now) return mul;
    enemy.mutationImmuneFxAt = now + 800;
    addBattleFx('enemyEvade', { enemyId: enemy.id, text: _t('면역'), color: getElementColor(ele), duration: 260 });
    return mul;
}

/** An entropy dodge: the hit does nothing, with its dodge mark and log line. */
function dodgeSummonHitByEntropy(hit, target) {
    if (!resolveEntropyEvasion(target, target.evasionChance || 0, getCombatTime())) return;
    hit.dmg = 0;
    hit.ailmentSourceDmg = 0;
    addBattleFx('enemyEvade', { enemyId: target.id, text: _t('회피!'), color: '#c4e2ff', duration: 260 });
    addEvasionCombatLog(target, false);
}

/** The curses' crit damage taken, the keystones' taken scale, the abyss scale, the talisman boss bonus and the summon's final limit. */
function applySummonLateScales(hit, ctx, curseFx) {
    const { s, pStats, target, ele, zone } = ctx;
    if (hit.crit) hit.dmg = Math.floor(hit.dmg * (curseFx.critDmgTakenMul || 1));
    if (target) scaleSummonHit(hit, getKeystoneEnemyTakenMultiplier(target, ele));
    scaleSummonHit(hit, mutationHitScale(target, ele));
    scaleSummonHit(hit, getAbyssMonsterScales(zone).playerDamageMul || 1);
    if (target && target.isBoss && (pStats.damageScales || {}).talismanBossFinalDmgBonusPct) {
        scaleSummonHit(hit, 1 + ((pStats.damageScales.talismanBossFinalDmgBonusPct || 0) / 100));
    }
    scaleSummonHit(hit, getLimitedSummonFinalDamageMultiplier(pStats, s));
}

/** The target's mitigation against the summon (with the summon's limited penetration), less the curses' shreds. */
function getSummonTargetResistance(ele, zoneTier, target, from) {
    let limitedStats = getLimitedSummonPenetrationStats(from.pStats, from.s);
    let enemyRes = getEffectiveEnemyMitigation(ele, zoneTier, target, limitedStats) - (from.curseFx.resShred || 0);
    const shredKey = Object.hasOwn(SUMMON_CURSE_SHRED_BY_ELEMENT, ele) ? SUMMON_CURSE_SHRED_BY_ELEMENT[ele] : null;
    if (shredKey) enemyRes -= (from.curseFx[shredKey] || 0);
    return enemyRes;
}

/** Physical hits by what the target takes more of physical damage; lightning and chaos by the curses' taken scales. */
function applySummonElementTaken(hit, ele, target, curseFx) {
    if (ele === 'phys' && target) scaleSummonHit(hit, target.physicalDamageTakenMul || 1);
    if (ele === 'light') scaleSummonHit(hit, curseFx.lightTakenMul || 1);
    if (ele === 'chaos') scaleSummonHit(hit, curseFx.chaosTakenMul || 1);
}

function getSummonAilmentStats(pStats, element) {
    let scale = (hasKeystone('sb6')) ? 0.5 : 0.35;
    return {
        ...pStats,
        sSkill: { ...(pStats.sSkill || {}), ele: element || 'phys' },
        igniteChance: Math.max(0, (pStats.igniteChance || 0) * scale),
        chillChance: Math.max(0, (pStats.chillChance || 0) * scale),
        freezeChance: Math.max(0, (pStats.freezeChance || 0) * scale),
        shockChance: Math.max(0, (pStats.shockChance || 0) * scale),
        poisonChance: Math.max(0, (pStats.poisonChance || 0) * scale),
        bleedChance: Math.max(0, (pStats.bleedChance || 0) * scale),
        ailmentResistPenPct: Math.max(0, (pStats.ailmentResistPenPct || 0) * scale),
        ailmentPowerMultiplier: 1 + Math.max(0, ((pStats.ailmentPowerMultiplier || 1) - 1) * scale),
        dotDurationMultiplier: 1 + Math.max(0, ((pStats.dotDurationMultiplier || 1) - 1) * scale)
    };
}

function applySummonAilmentFromHit(target, pStats, hitElement, hitDamage, isCrit, ailmentSourceDamage) {
    if (!target || hitDamage <= 0) return;
    let hasExplicitSource = Number.isFinite(Number(ailmentSourceDamage));
    applyEnemyAilmentFromHit(target, getSummonAilmentStats(pStats, hitElement), hitDamage, isCrit, {
        ailmentSourceDamage: hasExplicitSource ? ailmentSourceDamage : hitDamage,
        critDotBonusPct: (hasExplicitSource && isCrit) ? 50 : 0
    });
}

function resolveActiveSummonGemLevels(pStats, evaluation) {
    // A refresh owns this cache; no stale gem/gear values can survive into another tick.
    const levels = new Map();
    return buildActiveSummonRuntimeDefs(pStats).map(row => {
        const key = `${row.source}:${row.name}`;
        if (!levels.has(key)) levels.set(key, getSummonGemLevel(row.name, row.source, pStats, evaluation));
        return { ...row, gemLevel: levels.get(key) };
    });
}

function calculateSummonDpsRow(row, pStats, target) {
    const profile = getSummonProfile(row.name);
    let gemLv = row.gemLevel;
    let s = {
        gemName: row.name,
        ele: profile.ele || 'phys',
        baseDamage: getSummonScaledBaseDamage(profile, gemLv, pStats),
        attackSpeedMul: Math.max(0.1, Number(profile.attackSpeedMul || 1)),
        resPenBonus: Math.max(0, Number(profile.resPenBonus || 0)),
        physIgnoreBonus: Math.max(0, Number(profile.physIgnoreBonus || 0)),
        crit: Math.max(0, profile.baseCrit || 0),
        critDmg: Math.max(100, profile.baseCritDmg || 140),
        dmgRollMinPct: Math.max(1, Math.min(100, Math.floor(profile.dmgRollMinPct || 40)))
    };
    let intervalSec = getSummonAttackIntervalMs(pStats, s) / 1000;
    let hit = getSummonExpectedHit(s, pStats, target);
    let dps = hit.damage / intervalSec
        * window.GameModules.combat.supports.expectedMultiplier(window.GameModules.combat.summonSupports.skill(s));
    return { s, hit, dps };
}

/** Expected hit; a wisp that rolls its element per attack (분광) averages over its elements. */
function getSummonExpectedHit(s, pStats, target) {
    const elements = wispSummons.elements(s.gemName);
    if (!elements) return getSummonHitDamageInfo(s, pStats, target, { expected: true });
    const hits = elements.map(ele => getSummonHitDamageInfo({ ...s, ele }, pStats, target, { expected: true }));
    return { ...hits[0], damage: hits.reduce((sum, hit) => sum + hit.damage, 0) / hits.length };
}

/** Numeric consumers skip presentation; repeated identical summons share work within this call only. */
function estimateSummonDps(pStats, includeBreakdowns = true, evaluation) {
    if (hasKeystone('sb5')) {
        return { total: 0, activeCount: 0, lines: includeBreakdowns ? [_t('홀로서기 각인: 소환수 직접 공격 비활성화')] : [] };
    }
    const target = (game.enemies || []).find(e => e && e.hp > 0) || null;
    const rows = resolveActiveSummonGemLevels(pStats, evaluation);
    const estimates = new Map();
    let total = 0;
    let activeCount = 0;
    rows.forEach(row => {
        if (getSummonProfile(row.name).role === 'guard') return;
        const key = `${row.gemLevel}:${row.name}`;
        if (!estimates.has(key)) estimates.set(key, calculateSummonDpsRow(row, pStats, target));
        // Keep repeated addition (rather than multiplying by count) to preserve rounding.
        total += estimates.get(key).dps;
        activeCount++;
    });
    const lines = includeBreakdowns ? describeSummonDps(rows, estimates, pStats, activeCount) : [];
    return { total: Math.max(0, total), activeCount, lines };
}

function buildSummonDpsDescriptionGroup(row, pStats, estimate, sbShare) {
    const { s, hit, dps } = estimate;
    pStats = window.GameModules.combat.summonSupports.localStats(s, pStats);
    const sharedInc = getSummonAverageSharedIncreasePct(s, pStats);
    const dmgMul = (1 + (((pStats.summonPctDmg || 0) + sharedInc) / 100)) * (1 + ((pStats.summonEfficiency || 0) / 100))
        * pStats.summonSupportEffects.damageMultiplier;
    const ownAttackPower = (s.baseDamage * dmgMul * gemCoreForge.effects(game.gemData?.[s.gemName]).damage) + sbShare;
    const critChance = Math.max(0.05, Math.min(0.95, ((s.crit || 0) + (pStats.summonCrit || 0)) / 100));
    const critMul = Math.max(1.2, ((s.critDmg || 140) + (pStats.summonCritDmg || 0)) / 100);
    const aps = 1000 / getSummonAttackIntervalMs(pStats, s);
    const penResPen = getLimitedSummonPenetrationStats(pStats, s).resPen;
    return { gemLv: row.gemLevel, s, sharedInc, dmgMul, ownAttackPower, critChance, critMul, aps, penResPen, hit, dps, count: 0 };
}

function describeSummonDps(rows, estimates, pStats, activeCount) {
    const groups = new Map();
    const sbActive = hasKeystone('sb7');
    const sbShare = sbActive ? 0.5 * Math.max(0, Number(pStats.sbPlayerAttackPower || 0)) : 0;
    rows.forEach(row => {
        const estimate = estimates.get(`${row.gemLevel}:${row.name}`);
        if (!estimate) return;
        if (!groups.has(row.name)) groups.set(row.name, buildSummonDpsDescriptionGroup(row, pStats, estimate, sbShare));
        groups.get(row.name).count++;
    });
    const lines = [_t('공격 소환수 {activeCount}기, 소환수별 공격 주기로 합산', { activeCount })];
    groups.forEach((group, name) => lines.push(...describeSummonDpsGroup(name, group, pStats, sbShare)));
    if (sbActive && sbShare > 0) {
        lines.push(_t('상호 보완: 내 공격력 {floor}의 50%(+{floor2})가 소환수 타격마다 가산', { floor: Math.floor(pStats.sbPlayerAttackPower), floor2: Math.floor(sbShare) }));
    }
    if (rows.length > activeCount) lines.push(_t('방어/보조 소환수 {count}기는 DPS에서 제외', { count: rows.length - activeCount }));
    lines.push(_t('소환수 공격력은 피해 증가가 적용된 값이며, 적 저항/최종 피해/보스 피해/관통은 소환수 제한 계수로 반영됩니다.'));
    if (rows.some(row => row.duplicateIndex > 0)) lines.push(_t('남는 소환수 한도는 공격 소환수 중복 소환으로 사용'));
    return lines;
}

function describeSummonDpsGroup(name, g, pStats, sbShare) {
    const lines = [];
    const eleLabel = ele => _t(typeof getDamageElementLabel === 'function' ? getDamageElementLabel(ele) : (ele || 'phys'));
    let mute = (txt) => `<span style="color:var(--copy-muted);">${txt}</span>`;
    const elements = (wispSummons.elements(name) || [g.s.ele]).map(eleLabel).join('/');
    lines.push(`<span style="color:var(--copy-bright); font-weight:600;">${_t(name)}${g.count > 1 ? ` ×${g.count}` : ''}</span>, ${_t('룬 Lv.{level}', { level: g.gemLv })}, ${elements}`);
    lines.push(mute(_t('&nbsp;&nbsp;공격력 {floor} = 기본 피해 {floor2} × 피해증가 {dmgMul}{bonus}', { floor: Math.floor(g.ownAttackPower), floor2: Math.floor(g.s.baseDamage), dmgMul: g.dmgMul.toFixed(2), bonus: sbShare > 0 ? _t(' + 상호보완 {floor}', { floor: Math.floor(sbShare) }) : '' })));
    lines.push(mute(_t('&nbsp;&nbsp;피해 증가 {floor}% (소환수 피해 {floor2}% + 공유 {floor3}%) × 효율 +{floor4}% = ×{dmgMul}', { floor: Math.floor((pStats.summonPctDmg || 0) + g.sharedInc), floor2: Math.floor(pStats.summonPctDmg || 0), floor3: Math.floor(g.sharedInc), floor4: Math.floor(pStats.summonEfficiency || 0), dmgMul: g.dmgMul.toFixed(2) })));
    lines.push(mute(_t('&nbsp;&nbsp;치명타 {value}% × 피해 {floor}%, 공속 {aps}/초, 저항 관통 {floor2}%', { value: (g.critChance * 100).toFixed(1), floor: Math.floor(g.critMul * 100), aps: g.aps.toFixed(2), floor2: Math.floor(g.penResPen) })));
    lines.push(mute(_t('&nbsp;&nbsp;기대 타격 {floor} → 1기당 {floor2} DPS (적 저항/제한 계수 반영)', { floor: Math.floor(g.hit.damage), floor2: Math.floor(g.dps) })));
    return lines;
}

/** Lowest (low roll, no crit) to highest (full roll, crit) hit; a wisp that rolls its element per attack spans them all. */
function getSummonTooltipHitRange(hitProfile, stats) {
    const profiles = (wispSummons.elements(hitProfile.gemName) || [hitProfile.ele]).map(ele => ({ ...hitProfile, ele }));
    const hits = options => profiles.map(profile => getSummonHitDamageInfo(profile, stats, null, options).damage || 1);
    return {
        min: Math.min(...hits({ rollOverridePct: hitProfile.dmgRollMinPct, forceCrit: false })),
        max: Math.max(...hits({ rollOverridePct: 100, forceCrit: true }))
    };
}

function getSummonTooltipPreview(gemName, pStats) {
    let stats = pStats || (typeof getPlayerStats === 'function' ? getPlayerStats() : null) || {};
    stats = window.GameModules.combat.summonSupports.localStats({ gemName }, stats);
    let profile = getSummonProfile(gemName);
    let gemLv = getSummonGemLevel(gemName, SUPPORT_GEM_DB[gemName] ? 'support' : 'skill', stats);
    let hitProfile = {
        gemName: gemName,
        ele: profile.ele || 'phys',
        baseDamage: getSummonScaledBaseDamage(profile, gemLv, stats),
        attackSpeedMul: Math.max(0.1, Number(profile.attackSpeedMul || 1)),
        resPenBonus: Math.max(0, Number(profile.resPenBonus || 0)),
        physIgnoreBonus: Math.max(0, Number(profile.physIgnoreBonus || 0)),
        crit: Math.max(0, profile.baseCrit || 0),
        critDmg: Math.max(100, profile.baseCritDmg || 140),
        dmgRollMinPct: Math.max(1, Math.min(100, Math.floor(profile.dmgRollMinPct || 40)))
    };
    // 실제 전투에서 나올 수 있는 진짜 최소(편차 하한 · 비치명타)~최대(편차 상한 · 치명타) 피해를
    // 그대로 보여준다(이전에는 배율 적용 전 원시 기본값을 "최소"로 잘못 표시했음).
    let hitRange = getSummonTooltipHitRange(hitProfile, stats);
    let maxHp = Math.max(1, Math.floor(getSummonMaxHp(profile, gemLv, stats) * window.GameModules.combat.summonSupports.hpMultiplier(stats)));
    let evasion = getSummonEvasionRating(profile, gemLv, stats);
    const crit = getSummonCritProfile(hitProfile, stats);
    return {
        roleLabel: profile.role === 'guard' ? '방어 소환수' : '공격 소환수',
        trait: profile.trait || '',
        gemLevel: gemLv,
        maxHp: maxHp,
        regenPerSec: getSummonRegenPerSec(maxHp),
        evasion: evasion,
        evadeChancePct: Math.round(getSummonEvadeChance({ evasion: evasion }, null) * 10) / 10,
        hitDamageMin: Math.max(1, Math.floor(hitRange.min)),
        hitDamageMax: Math.max(1, Math.floor(hitRange.max)),
        attackPerSecond: profile.role === 'guard' ? 0 : (Math.round((1000 / getSummonAttackIntervalMs(stats, hitProfile)) * 100) / 100),
        critChancePct: Math.round(crit.critChance * 1000) / 10,
        critDmgPct: Math.round(crit.critMul * 100),
        resPenBonus: Math.max(0, Number(profile.resPenBonus || 0)),
        physIgnoreBonus: Math.max(0, Number(profile.physIgnoreBonus || 0)),
        redirectPct: profile.role === 'guard' || hasKeystone('sb2') ? getSummonRedirectPct(stats) : 0
    };
}

/** The share of a hit the summons take for the hero: the guard redirect stat rounded down, at least 50 with 나눠갖기 (sb2, the closest
 * summon of any role takes it then; otherwise the living guards). */
function getSummonRedirectPct(pStats) {
    const golem = buildActiveSummonRuntimeDefs(pStats).some(row => row.db.tags.includes('summon_guard'));
    const pct = Math.max(0, Math.min(100, Math.floor((pStats.summonGuardRedirectPct || 0) + (golem ? SKILL_DB['수액 골렘 소환'].guardRedirectPct : 0))));
    return hasKeystone('sb2') ? Math.max(pct, 50) : pct;
}

function ensureSummonRuntime(pStats) {
    if (!Array.isArray(game.summons)) game.summons = [];
    game.summonSeq = Math.max(1, Math.floor(game.summonSeq || 1));
    let activeDefs = resolveActiveSummonGemLevels(pStats);
    let activeKeys = new Set(activeDefs.map(row => `${row.gemName || row.name}::${row.slotIdx}`));
    game.summons = game.summons.filter(s => s && activeKeys.has(`${s.gemName}::${s.slotIdx}`));
    let now = getCombatTime();
    activeDefs.forEach(row => {
        let existing = game.summons.find(s => s && s.gemName === row.name && s.slotIdx === row.slotIdx);
        let runtime = buildSummonRuntimeStats(row, pStats, now, row.gemLevel);
        if (existing) {
            let wasAlive = !!existing.alive;
            let hpRatio = (wasAlive && existing.maxHp > 0) ? Math.max(0, Math.min(1, (existing.hp || 0) / existing.maxHp)) : 0;
            let id = existing.id;
            let respawnAt = existing.respawnAt || 0;
            let nextAttackAt = existing.nextAttackAt || now + 300;
            Object.assign(existing, runtime);
            existing.id = id;
            existing.alive = wasAlive;
            existing.hp = wasAlive ? Math.max(1, Math.min(existing.maxHp, Math.floor(existing.maxHp * hpRatio))) : 0;
            existing.respawnAt = respawnAt;
            existing.nextAttackAt = nextAttackAt;
            return;
        }
        game.summons.push({ id: game.summonSeq++, ...runtime });
    });
    game.summons.forEach(s => {
        if (!s || s.alive || !s.respawnAt || now < s.respawnAt) return;
        s.alive = true;
        s.hp = s.maxHp;
        s.respawnAt = 0;
        s.nextAttackAt = now + 300;
    });
    applyGrandlordGhostState();
}

function restoreAndRecallSummons(pStats) {
    ensureSummonRuntime(pStats);
    (game.summons || []).forEach(summon => {
        if (!summon) return;
        summon.alive = true;
        summon.hp = Math.max(1, summon.maxHp || 1);
        summon.respawnAt = 0;
        summon.nextAttackAt = getCombatTime() + 300;
        delete summon.gx;
        delete summon.gy;
    });
    applyGrandlordGhostState();
    ensureCombatGridRuntime();
}

function tickSummonRecovery() {
    (game.summons || []).forEach(summon => {
        if (!summon || !summon.alive || summon.hp >= summon.maxHp) return;
        let regen = Math.max(1, Number(summon.regenPerSec) || 0) * 0.1;
        summon.hp = Math.min(summon.maxHp, summon.hp + regen);
    });
}

function resolveSummonHit(summon, pStats, target, canGrantCritStack, multiplier) {
    let hit = getSummonHitDamageInfo(summon, pStats, target);
    window.GameModules.combat.summonSupports.scaleContact(hit, multiplier);
    let damage = Math.floor(Math.max(0, hit.damage || 0) * ascendancyNodeRules.summonHitMultiplier(pStats)) + ascendancyNodeRules.takeSharedBlow(summon);
    let dealt = applyDamageToEnemyResource(target, damage);
    let leech = window.GameModules.combat.summonSupports.inheritedLeech(pStats);
    if (dealt > 0 && leech > 0) summon.hp = Math.min(summon.maxHp || 1, summon.hp + (dealt * leech / 100));
    if (canGrantCritStack && hit.crit && pStats.uniqueSummonCritAspdStacks) {
        let cfg = pStats.uniqueSummonCritAspdStacks || {};
        let maxStacks = Math.max(1, Math.floor(cfg.maxStacks || 3));
        let now = getCombatTime();
        let current = (game.summonCritAspdExpiresAt || 0) > now ? Math.max(0, Math.floor(game.summonCritAspdStacks || 0)) : 0;
        game.summonCritAspdStacks = Math.min(maxStacks, current + 1);
        game.summonCritAspdPerStack = Math.max(0, Number(cfg.aspd || 10));
        game.summonCritAspdExpiresAt = now + Math.max(1, Number(cfg.duration || 4)) * 1000;
    }
    window.GameModules.combat.summonSupports.afterHit(summon, pStats, target, hit);
    addBattleFx('hit', { enemyId: target.id, color: getElementColor(hit.element), damage: damage, crit: hit.crit, duration: 220, element: hit.element, skillName: summon.gemName, summon: true, syncToSwing: false });
    if (target.hp > 0) return;
    ascendancyNodeRules.onSummonKill(pStats);
    handleEnemyDeath(target, pStats);
}

function getSummonPierceTargets(target, enemies) {
    if (!hasGridCell(target)) return [];
    return enemies.filter(enemy => enemy && enemy !== target && enemy.hp > 0 && hasGridCell(enemy)
        && getGridUnitDistance(target, enemy) <= 1);
}

function runSummonAttackTick(pStats) {
    if (hasKeystone('sb5')) return;
    let now = getCombatTime();
    landSummonAttacks(pStats, now);
    let aliveEnemies = (game.enemies || []).filter(e => e && e.hp > 0);
    if (aliveEnemies.length <= 0) return;
    (game.summons || []).forEach(s => {
        if (!s || !s.alive) return;
        if (s.role !== 'attack') return;
        // 그리드 유닛: 자기 사거리 안의 가장 가까운 적을 치고, 없으면 접근한다.
        let target = findNearestGridEnemy(s, aliveEnemies, Math.max(1, Math.floor(s.gridRange || 1)));
        if (!target) {
            let nearest = findNearestGridEnemy(s, aliveEnemies);
            if (nearest) advanceGridUnitMovement(s, nearest, 0.1, COMBAT_GRID_CONFIG.summonMoveIntervalSec);
            return;
        }
        if (now < (s.nextAttackAt || 0)) return;
        s.nextAttackAt = now + getSummonAttackIntervalMs(pStats, s);
        let pierceTargets = hasKeystone('sb6')
            ? getSummonPierceTargets(target, aliveEnemies)
            : [];
        launchSummonAttack(s, pStats, [target, ...pierceTargets], now);
    });
}

/** One wisp attack (js/wisp-summons.js): the strike frame now; the hits now, or — a thrown orb, shard or root — when it lands. */
function launchSummonAttack(summon, pStats, targets, now) {
    window.GameModules.combat.summonSupports.attackPlan(summon, targets, pStats).forEach((contact, index) => {
        const { target } = contact, shot = wispSummons.launch(summon, [target], now, { ...contact, first: index === 0 });
        addBattleFx('summonAttack', {
            summonId: summon.id, gemName: summon.gemName, targetEnemyId: target.id, targetGx: target.gx, targetGy: target.gy,
            sourceGx: summon.gx, sourceGy: summon.gy, duration: Math.max(220, wispSummons.artMs(summon.gemName, shot.flight))
        });
        shot.now.forEach(hit => resolveSummonStrike(summon, pStats, hit));
    });
}

/** Thrown wisp attacks whose flight ended: they hit if the wisp still stands and the target still lives. */
function landSummonAttacks(pStats, now) {
    wispSummons.due(now).forEach(hit => {
        const summon = (game.summons || []).find(s => s && s.id === hit.summonId && s.alive);
        const target = (game.enemies || []).find(enemy => enemy && enemy.id === hit.enemyId && enemy.hp > 0);
        if (summon && target) resolveSummonStrike(summon, pStats, { ...hit, target });
    });
}

/** hit = { target, first, element }: 분광 위습 strikes with the element rolled for this attack instead of its own. */
function resolveSummonStrike(summon, pStats, hit) {
    const own = summon.ele;
    if (hit.element) summon.ele = hit.element;
    resolveSummonHit(summon, pStats, hit.target, hit.first, hit.multiplier ?? 1);
    summon.ele = own;
}

function markPlayerMovementCompleted() {
    game.lastMoveEndedAt = getCombatTime();
    game.uniqueRiderCompassConsumed = false;
}

function prepareCombatTick(nowMs) {
    game.combatTimeMs = Number.isFinite(nowMs) ? nowMs : getCombatTime() + 100;
    tickOceanOxygen(game.combatTimeMs);
    holdZoneBoundRuns(addLog);
    callOceanGuardianAtBoundary();
    callOceanGuardianAdds(addLog);
    combatIncidents.tick(); // 잔잔한 사건: 달아나는 금빛 수액 슬라임, 세계수의 하품
    releaseExplorationWave(addLog); // 이어지는 무리: 정예 방과 막다른 방이 비면 문이 닫힌 채 새 무리가 선다
    roomInvaders.tick(); // 보스 방의 불청객: 보스가 맞아 내려가면 난입 보스가 들이닥친다
    releaseClosedThirdRing(addLog); // 세 번째 손가락이 사라진 반지3의 반지는 가방으로
    tickWoodsmanCurse();
    if (typeof trackRecordBests === 'function') trackRecordBests();
    const pStats = getPlayerStats(false);
    if (typeof enforceTalentCombatState === 'function') enforceTalentCombatState(pStats);
    game.playerHp = Math.min(game.playerHp, getPlayerRecoveryHpCap(pStats));
    refreshRealmDeathWard(pStats);
    game.lastCombatStats = pStats;
    game.lastCombatStatsAt = getCombatTime();
    ensureSummonRuntime(pStats);
    tickSummonRecovery();
    cosmosRouteRuntime.tickGravity();
    return pStats;
}

function isCombatDecisionPending(state) {
    if(actExplorationProgress.waiting(state))return true;
    return state.pendingLoopHeroSelection || state.pendingLoopDecision || state.pendingLoopReady
        || cosmosRouteRuntime.waiting(state);
}

/** Guard against malformed stat payloads from legacy saves/runtime merges. If ASPD becomes NaN/<=0, pTimer never advances and
 * combat appears frozen. Then the runtime state is made sane and the map progress reconciled. */
function sanitizeTickRuntime(pStats) {
    if (!Number.isFinite(pStats.aspd) || pStats.aspd <= 0) pStats.aspd = 1;
    if (!Number.isFinite(pStats.moveSpeed) || pStats.moveSpeed <= 0) pStats.moveSpeed = 100;
    if (!Number.isFinite(pStats.maxHp) || pStats.maxHp <= 0) pStats.maxHp = 1;
    if (!Number.isFinite(pTimer) || pTimer < 0) pTimer = 0;
    sanitizeCombatRuntimeState();
    reconcileMapProgressRuntimeState();
}

exposeFileGlobals({ getRepresentativeSummonAttackPower, getSummonEvasionRating, buildSummonRuntimeStats, getPassiveWisdomLeapDamageMultiplier, getPassiveChaosConversionShare, getSummonAttackIntervalMs, scaleSummonHit, applySummonHitTargetScales, mutationHitScale, dodgeSummonHitByEntropy, getSummonAilmentStats, applySummonAilmentFromHit, estimateSummonDps, getSummonTooltipPreview, getSummonRedirectPct, ensureSummonRuntime, restoreAndRecallSummons, resolveSummonHit, runSummonAttackTick, markPlayerMovementCompleted, prepareCombatTick, isCombatDecisionPending, sanitizeTickRuntime });
})();


const SUMMON_REGEN_PCT_PER_SEC = 0.75;


const SUMMON_CURSE_SHRED_BY_ELEMENT = Object.freeze({ fire: 'resFShred', cold: 'resCShred', light: 'resLShred', chaos: 'resChaosShred', phys: 'physDrShred' });


/** One combat tick (100 ms). 2026-10-18 split into the steps below (it was one function of complexity 153); the order of every
 * step and random roll is kept. */
function coreLoop(nowMs) {
    if(advanceActExplorationDeparture())return;
    if (isCombatDecisionPending(game)) return;
    const pStats = prepareCombatTick(nowMs);
    sanitizeTickRuntime(pStats);
    applyTickConditions(pStats);
    if (stopTickBeforeCombat(pStats)) return;
    recoverPlayerTick(pStats);
    if (advanceTravelTick()) return;
    syncCrowdPauseState();
    pruneEnemyRuntimeOnSchedule();
    if (beehiveHoldsTick()) return;
    const progressBefore = game.runProgress;
    const zoneNow = getZone(game.currentZoneId);
    tickZoneHazards(zoneNow, pStats);
    const vRift = game.voidRift || (game.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0, pendingWave: false, totalToSpawn: 0, spawnedCount: 0, spawnTick: 0 });
    const holdMapProgress = isMapProgressHeld(zoneNow, vRift);
    if (!holdMapProgress) advanceMapProgress(pStats);
    trackProgressStall(progressBefore);
    const hazardEvasion = updateCombatHazardEvasion(pStats);
    const walkedMs = actExplorationProgress.takeWalkedMs(); // 이번 틱에 걸은 시간: 적이 없어도 비운다
    // 지역 위험(지하계 생명력 흡수 등)이나 지도 진행으로 이 틱에 쓰러졌으면 여기서 처리한다. 2026-10-19 전에는 다음 틱으로 미뤄,
    // 방치 정산이 쓰러진 채로 멈췄다.
    if (game.playerHp <= 0) { handlePlayerDefeat(getZone(game.currentZoneId), pStats, "☠️ 치명상을 입어 쓰러졌습니다.", { fatalElement: 'other', sourceName: '치명상' }); return; }
    if ((game.enemies || []).length > 0) runFightTick(pStats, hazardEvasion, walkedMs);
    settleLastEnemyAttacks(pStats);
    // The void rift step logs and may enter the grand breach through the screen's own calls, handed over here.
    tickVoidRiftWave(getZone(game.currentZoneId), { say: addLog, enterGrand: typeof autoEnterGrandBreachIfReady === 'function' ? autoEnterGrandBreachIfReady : () => false });
    if (game.playerHp <= 0) {
        handlePlayerDefeat(getZone(game.currentZoneId), pStats, "☠️ 상태이상으로 쓰러졌습니다.", { fatalElement: 'other', sourceName: '상태이상' });
        return;
    }
    syncCrowdPauseState();

    if (!holdMapProgress && canFinishAfterTraps()) playerStatCache.during(finishEncounterRun);
}

/** 터지는 중인 함정이 있으면 그 뒤에 끝낸다(경고에서 터지기까지 3초 안쪽). */
const canFinishAfterTraps = () => !trialHazardRuntime.active && actExplorationProgress.canFinish();


safeExposeGlobals({ coreLoop, ensureSummonRuntime, getSummonTooltipPreview, runSummonAttackTick, estimateSummonDps });
