// 대상 고르기와 전술 이동, 피해 경감, 몬스터 만들기와 루프 배율 (2026-11-10에 js/combat.js에서 그대로 옮겼다. js/combat.js 뒤에 옮기기 전과 같은 순서로 읽는다.)
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
/** Targets that go past the cap of 6 (projectiles 12): a target engraving (js/skills.js engraveTargets, 파동 분산 +2) and effect
 * expansion (js/skill-effect-expansion.js applyToSkill). The cap took the engraving away (2026-10-20 hunt: 6 → 6, only its -5% damage). */
function addUncappedSkillTargets(skill, name) {
    skill.targets = Math.max(1, (skill.targets || 1) + Math.max(0, Math.floor(Number(skill.engraveTargets) || 0)));
    skillEffectExpansion.applyToSkill(skill, name);
}

/** Who the gem aims at first: the monster the player locked on (js/act-exploration-state.js lockOn), else the target the tactics
 * hold for a moment. Null when neither applies (the nearest in range). */
function getSkillTargetPreference(tactics, now) {
    const locked = actExplorationState.lockedEnemy(actExplorationState.current(game));
    if (!tactics && !locked) return null;
    const held = tactics && now < combatTacticsRuntime.targetLockedUntil ? combatTacticsRuntime.targetId : null;
    return { targetPriority: tactics ? tactics.targetPriority : undefined, preferredEnemyId: locked ? locked.id : held };
}

/** options.dormant: monsters that have not noticed the hero, which the area may catch but the gem never aims at. */
function selectCombatGemTargets(name,skill,source,enemies,options) {
    if (skill.nativeCastId) return skillGemCasts.targets(skill.nativeCastId,source,enemies,skillEffectExpansion.extra(skill)).map(enemy=>({enemy,mult:1}));
    const dormant=options && options.dormant;
    if (!dormant || !dormant.length) return selectGridSkillTargets(name,skill,source,enemies,options);
    return selectGridSkillTargets(name,skill,source,enemies.concat(dormant),{...options,splashOnly:new Set(dormant)});
}

/** Monsters near the hero that have not noticed him (data ACT_EXPLORATION_VISION splashReach, 2026-10-04 user): an area attack that
 * lands on unseen ground hits whatever stands there. Empty outside a map exploration. */
function getSplashDormantEnemies() {
    return actExplorationState.dormantNear(game,game.gridPlayer,ACT_EXPLORATION_VISION.splashReach);
}

/** The attack's own targets: its area may catch monsters that have not noticed the hero, and the strike pulls them into the fight. */
function getAttackTargets(pStats) {
    let targets = getSkillTargets(pStats, getSplashDormantEnemies());
    actExplorationState.wake(game, targets.map(hit => hit.enemy));
    return targets;
}

function getPlayerTacticalMovePlan(pStats, target) {
    let tactics = resolveConditionalCombatTactics(normalizeCombatTacticsSettings(game.settings), pStats, game, getCombatTime());
    let profile = getSkillGridProfile(game.activeSkill, pStats.sSkill);
    let distance = getGridUnitDistance(game.gridPlayer, target);
    if (pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.farshot && distance < 3) {
        return { direction: 'away', range: Math.max(3, Number(profile.range) || 1) };
    }
    if (tactics.positionMode === 'auto') return null;
    if (tactics.positionMode === 'pressure') return distance > 1 ? { direction: 'toward', range: profile.range } : null;
    let desiredRange = Math.max(1, Math.floor(Number(profile.range) || 1));
    return desiredRange > 1 && distance < desiredRange ? { direction: 'away', range: desiredRange } : null;
}

function tryPlayerTacticalMove(pStats, target, plan, now) {
    if (!plan || now < combatTacticsRuntime.nextMoveAt || isPlayerAttackRecovering(now)) return false;
    if (plan.direction === 'away' && combatTacticsRuntime.consecutiveRetreats >= COMBAT_TACTIC_MAX_RETREATS) return false;
    let moveSpeed = Number.isFinite(pStats.moveSpeed) && pStats.moveSpeed > 0 ? pStats.moveSpeed : 100;
    let result = advanceGridTacticalMovement(game.gridPlayer, target, {
        direction: plan.direction,
        maxRange: plan.range,
        previousCell: combatTacticsRuntime.previousCell,
        dtSec: 0.1,
        intervalSec: COMBAT_GRID_CONFIG.playerMoveIntervalSec * (100 / moveSpeed),
        keepRows: getSkillBand(game.activeSkill, pStats.sSkill).rows
    });
    if (!result.moved) return false;
    let delayMs = Math.round(getTacticalMoveAttackDelayMs(moveSpeed) * 0.45);
    combatTacticsRuntime.previousCell = result.from;
    combatTacticsRuntime.attackDelayUntil = Math.max(combatTacticsRuntime.attackDelayUntil, now + delayMs);
    combatTacticsRuntime.nextMoveAt = now + delayMs;
    if (result.retreat) combatTacticsRuntime.consecutiveRetreats++;
    return true;
}

function movePlayerForCharge(target, maxCells) {
    actExplorationMotion.cancel(game.actExploration);
    let origin = copyCombatGridCell(game.gridPlayer);
    let moved = false;
    for (let step = 0; step < maxCells; step++) {
        if (getGridUnitDistance(game.gridPlayer, target) <= 1) break;
        if (!gridStepToward(game.gridPlayer, target.gx, target.gy, getGridBlockedCells(game.gridPlayer))) break;
        moved = true;
    }
    return moved ? origin : null;
}

function movePlayerForBlink(target) {
    if (getGridUnitDistance(game.gridPlayer, target) <= 1) return null;
    let destination = findFreeGridCell(getGridBlockedCells(game.gridPlayer), target);
    if (!destination || getGridUnitDistance(destination, target) > 1) return null;
    let origin = copyCombatGridCell(game.gridPlayer);
    if (origin && origin.gx === destination.gx && origin.gy === destination.gy) return null;
    actExplorationMotion.cancel(game.actExploration);
    game.gridPlayer.gx = destination.gx;
    game.gridPlayer.gy = destination.gy;
    return origin;
}

/** The attack's own move (mobilityPattern): landingMs, the airborne time the hit waits for (0 when it did not move or does not leap);
 * kickoff, a plain blink (그림자 점멸): the stage hero kicks off before it vanishes (2026-10-20 스킬룬 전달본 v42, js/canvas-stage-actors.js). */
function beginSkillMobility(pStats, target, isStageReplay) {
    const moved = !isStageReplay && applySkillMobilityBeforeAttack(pStats.sSkill, target, pStats);
    const landingMs = moved ? Math.max(0, Number(pStats.sSkill.mobilityPattern.airMs) || 0) : 0;
    return { landingMs, kickoff: moved && isKickoffBlink(pStats.sSkill.mobilityPattern) };
}

function applySkillMobilityBeforeAttack(skill, target, pStats) {
    let pattern = skill && skill.mobilityPattern;
    if (!pattern || !target || !hasGridCell(target) || !hasGridCell(game.gridPlayer)) return false;
    let maxCells = Math.max(1, Math.min(6, Math.floor(Number(pattern.maxCells) || 1)));
    let origin = pattern.kind === 'blink' ? movePlayerForBlink(target) : movePlayerForCharge(target, maxCells);
    if (!origin) return false;
    let moveSpeed = Number.isFinite(pStats.moveSpeed) && pStats.moveSpeed > 0 ? pStats.moveSpeed : 100;
    let delayMs = getTacticalMoveAttackDelayMs(moveSpeed);
    combatTacticsRuntime.attackDelayUntil = Math.max(combatTacticsRuntime.attackDelayUntil, getCombatTime() + delayMs);
    addBattleFx('playerMobility', { skillName: game.activeSkill, fromCell: origin, toCell: copyCombatGridCell(game.gridPlayer), duration: pattern.kind === 'blink' ? 180 : 280,
        kickoff: isKickoffBlink(pattern) });
    return true;
}

/** Complete walking (a finished step continues the approach inside the tick) before the foreground renderer reads it. */
function advancePlayerExplorationFrame(now, pStats) {
    if (actExplorationState.current(game)) actExplorationProgress.tick(now, pStats);
}

/** actExplorationProgress.tick calls this when an exploration step ends, on a foreground frame or inside a combat tick.
 * Continue an out-of-range approach at once, without executing an attack
 * or advancing combat timers. Actual attacks remain owned by coreLoop.
 */
function continuePlayerExplorationApproach(pStats) {
    if (actExplorationProgress.holdPosition(false) || hasPlayerChannelBreakingAilment()) return;
    const warned = getBossWarningCells(game, pendingEnemyCombatAttacks);
    if (isTrialHazardPositionHeld() || (warned.length && isApexFight())) return;
    const approach = bossWarningApproach(warned);
    if (approach.hold) return;
    if (getCombatChannelGate(pStats, getCombatTime()).locked) return;
    if (getSkillTargets(pStats).length > 0) return;
    updatePlayerGridEngagement(pStats, { avoidCells: { hard: approach.block, soft: groundHazardCells(), warned: approach.block } });
}

/**
 * 그리드 교전 상태를 갱신한다. 현재 스킬 사거리 안에 대상이 있으면 true,
 * 없으면 접근 중인 적을 유지하며 한 칸씩 이동시키고 false를 반환한다.
 * @param {Readonly<object>} pStats getPlayerStats 결과
 * @param {{holdPosition?:boolean}} [options] 이동을 막고 현재 사거리 안 공격만 허용할지
 * @returns {boolean} 이번 틱에 공격이 가능한지
 */
function updatePlayerGridEngagement(pStats, options) {
    if(actExplorationProgress.moving() || mobilitySkill.moving())return false;
    let config = options || {};
    let alive = (game.enemies || []).filter(enemy => enemy.hp > 0);
    if (alive.length === 0) return false;
    syncCombatTacticsEncounterRuntime();
    let targets = getSkillTargets(pStats);
    if (!config.holdPosition && approachLockedEnemy(pStats, targets, config.avoidCells)) return false;
    if (targets.length > 0) {
        combatTacticsRuntime.approachTargetId = null;
        let now = getCombatTime();
        let stalled = now - combatTacticsRuntime.lastAttackAt >= COMBAT_TACTIC_STALL_MS;
        let plan = !config.holdPosition && !hasHardDanger(config.avoidCells) && game.combatTacticsUnlocked && !stalled
            ? getPlayerTacticalMovePlan(pStats, targets[0].enemy)
            : null;
        if (tryPlayerTacticalMove(pStats, targets[0].enemy, plan, now)) return false;
        return true;
    }
    if (config.holdPosition) return false;
    let nearest = resolvePlayerApproachTarget(alive);
    if (!nearest) return false;
    if (isPlayerAttackRecovering()) return false;
    approachPlayerTarget(pStats, alive, nearest, config.avoidCells);
    return false;
}

/** One hero step toward its approach target. When no step leads toward it (its way shut by other monsters: 2026-10-19 a melee hero
 * stood still in a one-tile passage while the ranged harpy holding it shot at it), the nearest monster a step leads toward becomes
 * the target. @returns {boolean} whether a step began */
function approachPlayerTarget(pStats, alive, target, avoidCells) {
    const stepSec = getPlayerGridStepSec(pStats), cell = getPlayerApproachCell(pStats, target);
    if (!warningAllowsStep(cell, avoidCells)) return false;
    if (advanceGridUnitMovement(game.gridPlayer, cell, 0.1, stepSec, avoidCells)) return true;
    const canStep = enemy => canGridUnitStepToward(game.gridPlayer, getPlayerApproachCell(pStats, enemy), avoidCells);
    if (canStep(target)) return false;
    const open = findNearestGridEnemy(game.gridPlayer, alive.filter(enemy => enemy !== target && canStep(enemy)));
    if (!open || !warningAllowsStep(getPlayerApproachCell(pStats, open), avoidCells)) return false;
    combatTacticsRuntime.approachTargetId = open.id;
    return advanceGridUnitMovement(game.gridPlayer, getPlayerApproachCell(pStats, open), 0, stepSec, avoidCells);
}

/** One hero step toward its target, in seconds (move speed 100 = playerMoveIntervalSec). Every caller steps toward a monster, so
 * the 추적자 boots' pursuit speed (uniquePursuitMovePct) counts here and nowhere else. */
function getPlayerGridStepSec(pStats) {
    let moveSpeed = Number.isFinite(pStats.moveSpeed) && pStats.moveSpeed > 0 ? pStats.moveSpeed : 100;
    moveSpeed *= 1 + Math.max(0, Number(pStats.uniquePursuitMovePct) || 0) / 100;
    return COMBAT_GRID_CONFIG.playerMoveIntervalSec * (100 / moveSpeed);
}

/** A locked-on monster (js/act-exploration-state.js lockOn) that this attack does not reach: the hero steps toward it instead.
 * When no step toward it is free, the hero fights whatever it reaches. A warning blocks fallback walking to another target.
 * @returns {boolean} whether this tick is held for the locked approach (walking, or waiting outside a warning) */
function approachLockedEnemy(pStats, targets, avoidCells) {
    const locked = actExplorationState.lockedEnemy(actExplorationState.current(game));
    if (!locked || !game.enemies.includes(locked) || targets.some(hit => hit.enemy === locked) || isPlayerAttackRecovering()) return false;
    const cell = getPlayerApproachCell(pStats, locked);
    if (!warningAllowsStep(cell, avoidCells)) return targets.length === 0;
    return advanceGridUnitMovement(game.gridPlayer, cell, 0.1, getPlayerGridStepSec(pStats), avoidCells);
}

/** A warning may stop the ordinary approach, but never redirects it into an automatic dodge or a different target. */
function warningAllowsStep(target, avoidCells) {
    const warned = avoidCells?.warned;
    if (!warned?.length) return true;
    const keys = new Set(warned.map(cell => gridCellKey(cell.gx, cell.gy)));
    const baseHard = avoidCells.hard.filter(cell => !keys.has(gridCellKey(cell.gx, cell.gy)));
    const ordinary = getGridApproachStep(game.gridPlayer, target, { ...avoidCells, hard: baseHard });
    const safe = getGridApproachStep(game.gridPlayer, target, avoidCells);
    return !!ordinary && !!safe && ordinary.gx === safe.gx && ordinary.gy === safe.gy;
}

/** 다가갈 자리: 옆으로만 치는 룬(js/combat-grid.js getSkillBand)이면 그 적이 띠 안에 드는 가장 가까운 자리(줄을 맞춘다), 아니면 그 적. */
function getPlayerApproachCell(pStats, enemy) {
    const band = getSkillBand(game.activeSkill, pStats.sSkill);
    return band.rows ? getGridBandApproachCell(game.gridPlayer, enemy, band) : enemy;
}

function rollEnemyTrait(zone, isElite, isBoss, seed) {
    if (!isElite && !isBoss) return null;
    let list = ENEMY_TRAIT_POOL.slice();
    if (zone && zone.type === 'trial' && zone.id === 'trial_3') {
        list = list.filter(trait => trait.id !== 'bloodless');
    }
    if (zone && zone.type === 'trial' && zone.id === 'trial_4') {
        list = list.map(trait => trait.id === 'bloodless'
            ? { ...trait, id: 'leechResist_trial4', name: '흡혈저항', leechEffMul: 0.45 }
            : trait);
    }
    if ((game.season || 1) >= 10 && zone && zone.type === 'abyss' && zone.ele === 'chaos') {
        list.unshift({ id: 'veryFast_loop10', name: '매우 빠름', outlineColor: '#82d8de', attackSpeedVarMul: 1.34, expMul: 1.10, dropMul: 1.08 });
    }
    let idx = Math.abs(seed || 0) % list.length;
    return { ...list[idx] };
}

function applyDamageToEnemyResource(enemy, damage) {
    let remaining = Math.max(0, Math.floor(Number(damage) || 0));
    if (!enemy || remaining <= 0) return 0;
    let dealt = 0;
    if ((enemy.energyShield || 0) > 0) {
        let absorbed = Math.min(Math.max(0, Math.floor(enemy.energyShield || 0)), remaining);
        enemy.energyShield = Math.max(0, Math.floor(enemy.energyShield || 0) - absorbed);
        remaining -= absorbed;
        dealt += absorbed;
    }
    if (remaining > 0) {
        let beforeHp = Math.max(0, Math.floor(enemy.hp || 0));
        enemy.hp = Math.max(0, beforeHp - remaining);
        dealt += Math.max(0, beforeHp - enemy.hp);
    }
    combatIncidents.noteDamage(enemy, dealt); // 행운의 숫자
    return dealt;
}

/** 즉시 처치, 처형이 줄 피해: 남은 생명력에 에너지 보호막까지(applyDamageToEnemyResource가 보호막부터 깎는다). */
function getEnemyLifeAndShield(enemy) {
    return Math.max(0, Number(enemy.hp) || 0) + Math.max(0, Number(enemy.energyShield) || 0);
}

function getEnemyLifeDamagePct(enemy) {
    if (!enemy || !(enemy.maxHp > 0)) return 0;
    return Math.max(0, Math.min(100, (1 - (Math.max(0, enemy.hp || 0) / Math.max(1, enemy.maxHp || 1))) * 100));
}

function maybeUnlockChaosRealmFromWoodsman(enemy, options) {
    if (!enemy || !enemy.isBoss) return;
    let zone = getZone(game.currentZoneId) || getZone(0);
    if (!zone || zone.id !== OUTSIDE_CHAOS_ZONE_ID) return;
    let st = ensureChaosRealmState();
    let pct = getEnemyLifeDamagePct(enemy);
    st.woodsmanBestDamagePct = Math.max(st.woodsmanBestDamagePct || 0, pct);
    if (options && options.finalize && !st.unlocked && st.woodsmanBestDamagePct >= 10) {
        st.unlocked = true;
        st.highestFloor = Math.max(1, Math.floor(st.highestFloor || 0));
        game.noti.map = true;
        addLog(_t('🌌 나무꾼의 경계가 갈라지며 혼돈계가 해금되었습니다.'), 'loot-unique');
        if (typeof queueTutorialNotice === 'function') queueOpenContentNotice('chaosRealm', 'unlock_chaos_realm', '혼돈계', '나무꾼의 경계가 갈라져 혼돈계가 열렸습니다.\n‘지도 → 혼돈계’에서 루프가 바뀌어도 이어지는 영구 등반에 도전하세요.', 'tab-map', 'map-tab-chaos-realm');
    }
    if (options && options.log) {
        addLog(_t('🪓 나무꾼 피해율 기록: {woodsmanBestDamagePct}% / 해금 조건 10%', { woodsmanBestDamagePct: st.woodsmanBestDamagePct.toFixed(1) }), st.woodsmanBestDamagePct >= 10 ? 'season-up' : 'attack-monster');
    }
}

function applyChaosRealmAffixesToEnemy(enemy, zone) {
    if (!enemy || !zone || (zone.type !== 'chaosRealm' && !zone.bloomTrialAffixFloor)) return enemy;
    let floor = Math.max(1, Math.floor(zone.bloomTrialAffixFloor || zone.floor || 1));
    let scale = getChaosRealmAffixScale(floor);
    let affixes = getChaosRealmAffixes(floor);
    enemy.chaosRealmFloor = floor;
    enemy.chaosRealmAffixes = affixes;
    enemy.traitName = affixes.map(a => a.name).join(', ');
    affixes.forEach(affix => {
        let s = affix.scale || scale;
        if (affix.id === 'elemental_wall') { enemy.resF += Math.floor(58 * s); enemy.resC += Math.floor(58 * s); enemy.resL += Math.floor(58 * s); }
        if (affix.id === 'iron_bark') { enemy.dr += Math.floor(34 * s); enemy.armorGuard = Math.max(enemy.armorGuard || 0, 0.16 + 0.05 * s); }
        if (affix.id === 'mirage_step') enemy.evasionChance = Math.max(enemy.evasionChance || 0, Math.min(55, 22 + floor * 0.9));
        if (affix.id === 'soul_shell') { enemy.maxEnergyShield = Math.max(enemy.maxEnergyShield || 0, enemy.maxHp); enemy.energyShield = enemy.maxEnergyShield; }
        if (affix.id === 'projectile_dampening') enemy.projectileDamageTakenMul = Math.min(enemy.projectileDamageTakenMul || 1, 0.5);
        if (affix.id === 'spell_dampening') enemy.spellDamageTakenMul = Math.min(enemy.spellDamageTakenMul || 1, 0.5);
        if (affix.id === 'blood_drinker') enemy.leechPct = Math.max(enemy.leechPct || 0, 2.5 + floor * 0.08);
        if (affix.id === 'bloodless') enemy.leechEffMul = Math.min(enemy.leechEffMul || 1, Math.max(0.08, 0.28 - floor * 0.002));
        if (affix.id === 'curse_blade') { enemy.curseBlade = true; enemy.atkMul = (enemy.atkMul || 1) * (1.18 + floor * 0.006); enemy.penetration += Math.floor(8 * s); }
        if (affix.id === 'curse_immune') enemy.curseImmune = true;
        if (affix.id === 'phys_dampening') enemy.physicalDamageTakenMul = Math.min(enemy.physicalDamageTakenMul || 1, 0.5);
        if (affix.id === 'deadly_crit') { enemy.critChance += Math.floor(18 * s); enemy.critDamageMul = Math.max(enemy.critDamageMul || 1.55, 1.95 + floor * 0.01); }
        if (affix.id === 'multi_strike') enemy.doubleStrikeChance = Math.max(enemy.doubleStrikeChance || 0, Math.min(45, 18 + floor * 0.6));
        if (affix.id === 'deep_penetration') enemy.penetration += Math.floor(18 * s);
    });
    return enemy;
}

/** Zone-wide enemy modifiers: chaos-realm floor affixes and atlas map mods (js/atlas-maps.js). */
function applyZoneEnemyMods(enemy, zone) {
    applyChaosRealmAffixesToEnemy(enemy, zone);
    return atlasMaps.applyEnemyMods(enemy, zone);
}

function getChaosRealmBonusSummary() {
    let b = (ensureChaosRealmState().permanentBonuses || {});
    return [_t('피해 +{pctDmg}%', { pctDmg: (b.pctDmg||0).toFixed(1) }), _t('이속 +{move}%', { move: (b.move||0).toFixed(1) }), _t('생명력 +{pctHp}%', { pctHp: (b.pctHp||0).toFixed(1) }), _t('카오스저항 +{floor}%', { floor: Math.floor(b.resChaos||0) }), _t('치명 +{floor}%', { floor: Math.floor(b.crit||0) }), _t('관통 +{floor}%', { floor: Math.floor(b.resPen||0) }), _t('방어/회피/보호막 +{floor}%', { floor: Math.floor(b.armorPct||0) }), _t('치피 +{floor}%', { floor: Math.floor(b.critDmg||0) }), _t('공속 +{floor}%', { floor: Math.floor(b.aspd||0) })].join(', ');
}

function grantChaosRealmFloorBonus(floor) {
    let st = ensureChaosRealmState();
    let b = st.permanentBonuses;
    b.pctDmg += 0.5;
    b.move += 0.5;
    if (floor % 3 === 0) b.pctHp += 1;
    if (floor % 5 === 0) b.resChaos += 1;
    if (floor % 10 === 0) b.crit += 1;
    if (floor % 15 === 0) { b.armorPct += 10; b.evasionPct += 10; b.energyShieldPct += 10; }
    if (floor % 25 === 0) { b.critDmg += 5; b.aspd += 5; }
    addLog(_t('🌌 혼돈계 {floor}층 최초 돌파 보너스: {chaosRealmBonusSummary}', { floor, chaosRealmBonusSummary: getChaosRealmBonusSummary() }), 'loot-unique');
}

function getEnemyElementResistance(skillEle, zoneTier, enemy) {
    let baseRes = 0;
    let zoneProgress = clampNumber(((zoneTier || 1) - 1) / 19, 0, 1);
    let curved = zoneProgress * zoneProgress;
    if (skillEle === 'fire' || skillEle === 'cold' || skillEle === 'light') baseRes = 5 + Math.floor(20 * curved);
    else if (skillEle === 'chaos') baseRes = 5 + Math.floor(20 * curved);
    if (!enemy) return baseRes;
    // 생성된 적의 저항에는 지역 단계·등급·특성·콘텐츠 보너스가 이미 합산되어 있다.
    // 실제 대상을 계산할 때 baseRes를 다시 더하면 지역 저항이 이중 적용된다.
    if (skillEle === 'fire') return enemy.resF || 0;
    if (skillEle === 'cold') return enemy.resC || 0;
    if (skillEle === 'light') return enemy.resL || 0;
    if (skillEle === 'chaos') return enemy.resChaos || 0;
    if (skillEle === 'phys') return enemy.dr || 0;
    return baseRes;
}

/** The target's resistance to one hit: its mitigation less the curse shreds (all and this element) and the region shreds
 * (a shocked target's lightning resistance, the chaos shred stacks; js/region-affix-effects.js). */
/** Damage against an ailing target, as [hit, ailment]: the ct5 keystone (any ailment, ×1.2) and the region lines (bleeding, ignited,
 * a crit on a frozen target, the element bonuses; js/region-affix-effects.js). */
/** The cosmos judgment mark of a lightning hit: lowers the target's resistance for a while (refreshed, not stacked). */
function applyCosmosJudgmentOnHit(enemy, pStats, element) {
    const judgment = pStats.cosmosJudgmentLightning;
    if (!judgment || element !== 'light') return;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    const mark = enemy.ailments.find(ail => ail && ail.type === 'cosmosJudgment');
    if (mark) mark.time = Math.max(mark.time || 0, Number(judgment.duration || 4));
    else enemy.ailments.push({ type: 'cosmosJudgment', time: Number(judgment.duration || 4), power: Number(judgment.resDown || 15) });
}

function applyAilingTargetDamage(pStats, enemy, element, isCrit, damages) {
    let mul = regionAffixEffects.damageMultiplier(pStats, enemy, element, isCrit);
    if (hasKeystone('ct5') && Array.isArray(enemy.ailments) && enemy.ailments.some(a => a && (a.time || 0) > 0)) mul *= 1.2;
    return mul === 1 ? damages : damages.map(value => Math.floor(value * mul));
}

function getHitEnemyResistance(element, zoneTier, enemy, pStats, curseFx) {
    const elementShred = Number(curseFx[CURSE_ELEMENT_SHRED_KEYS[element]]) || 0;
    return getEffectiveEnemyMitigation(element, zoneTier, enemy, pStats) - (curseFx.resShred || 0) - elementShred
        - regionAffixEffects.resistanceShred(pStats, enemy, element);
}

function applyVoidWeakMitigation(enemy, mitigation) {
    return enemy?.voidWeakUntil > getCombatTime() ? 100 - (100 - mitigation) * VOID_WEAK_TAKEN_MUL : mitigation;
}

function getEnemyMitigationBeforeWeak(skillEle, zoneTier, enemy, pStats) {
    let rawMitigation = getEnemyElementResistance(skillEle, zoneTier, enemy);
    if (enemy && enemy.isWoodsman && enemy.maxHp > 0) rawMitigation = getWoodsmanResistance(skillEle, enemy, rawMitigation);
    rawMitigation = applyEnemyResistanceShred(skillEle, enemy, rawMitigation);
    if (skillEle === 'phys') return getPhysicalMitigation(rawMitigation, pStats);
    if (skillEle === 'fire' || skillEle === 'cold' || skillEle === 'light' || skillEle === 'chaos') return getElementalMitigation(skillEle, enemy, pStats, rawMitigation);
    return Math.min(80, rawMitigation);
}

/** 혼돈 밖의 나무꾼: its base resistance of the element plus up to 28 as it loses life. */
function getWoodsmanResistance(skillEle, enemy, rawMitigation) {
    let missingHpRatio = Math.max(0, Math.min(1, 1 - ((enemy.hp || 0) / enemy.maxHp)));
    let bonusRes = Math.floor(missingHpRatio * 28);
    const key = Object.hasOwn(WOODSMAN_BASE_RESIST, skillEle) ? WOODSMAN_BASE_RESIST[skillEle] : null;
    return key ? (enemy[key] || rawMitigation) + bonusRes : rawMitigation;
}

/** The shreds on the enemy: a unique's elemental resistance down (fire, cold, lightning), a unique's chaos resistance down and chaos
 * erosion (chaos). */
function applyEnemyResistanceShred(skillEle, enemy, rawMitigation) {
    if (!enemy) return rawMitigation;
    if (['fire', 'cold', 'light'].includes(skillEle)) return rawMitigation - getUniqueElementalShred(enemy);
    if (skillEle !== 'chaos') return rawMitigation;
    rawMitigation -= getUniqueChaosShred(enemy);
    if (enemy.chaosErosionShred) rawMitigation -= enemy.chaosErosionShred;
    return rawMitigation;
}

function getUniqueElementalShred(enemy) {
    const deb = enemy.id && game.enemyUniqueElementalResDown && game.enemyUniqueElementalResDown[enemy.id];
    if (!deb) return 0;
    return Math.min(Math.max(0, Number(deb.max || 20)), Math.max(0, Number(deb.stacks || 0)) * Math.max(0, Number(deb.perHit || 2)));
}

function getUniqueChaosShred(enemy) {
    const deb = enemy.id && game.enemyUniqueChaosResDown && game.enemyUniqueChaosResDown[enemy.id];
    return deb ? Math.max(0, (deb.perHit || 0) * (deb.stacks || 0)) : 0;
}

/** Physical: damage reduction capped at 80, less the hero's physical ignore (below 0 only with allowNegativePhysIgnore); a negative
 * reduction counts as it is. */
function getPhysicalMitigation(rawMitigation, pStats) {
    let cappedReduction = Math.max(0, Math.min(80, rawMitigation));
    let ignoreAmount = Math.max(0, Number(pStats.physIgnore) || 0);
    if (cappedReduction > 0) {
        cappedReduction = (pStats && pStats.allowNegativePhysIgnore)
            ? (cappedReduction - ignoreAmount)
            : Math.max(0, cappedReduction - ignoreAmount);
    }
    if (rawMitigation < 0) return rawMitigation;
    return cappedReduction;
}

/** Fire, cold, lightning and chaos: keystone iq4 keeps part of a positive elemental resistance, the hero's penetration, the enemy's
 * resistance cap, the penetration floor (keystone e9: -300 for the elements), then 성수 안개. */
function getElementalMitigation(skillEle, enemy, pStats, rawMitigation) {
    const elemental = skillEle !== 'chaos';
    if (elemental && hasKeystone('iq4')) rawMitigation = Math.max(0, rawMitigation) * ASCENDANCY_KEYSTONE_VALUES.iq4.resistanceKeptPct / 100 + Math.min(0, rawMitigation);
    let effective = getPiercedResistance(skillEle, pStats, rawMitigation);
    let cap = Math.max(0, Number(enemy && enemy.maxResCap) || 80);
    if (effective > 0) effective = Math.min(cap, effective);
    // 절대 관통(엘리멘탈리스트 e9): 원소 저항 관통 하한을 -300%까지 확장
    let minPen = (elemental && hasKeystone('e9')) ? -300 : MIN_PENETRATED_RESISTANCE;
    const resistance = Math.max(minPen, effective);
    return applyHolyMistMitigation(skillEle,enemy,resistance);
}

/** Resistance less the hero's penetration; 성전사 lightning may ignore resistance or take no penetration. */
function getPiercedResistance(skillEle, pStats, rawMitigation) {
    if (skillEle === 'light' && pStats && pStats.crusaderLightningIgnoreRes) rawMitigation = 0;
    return rawMitigation - ((skillEle === 'light' && pStats && pStats.crusaderNoResPenOnLightning) ? 0 : Math.max(0, pStats.resPen || 0));
}

function applyHolyMistMitigation(element,enemy,resistance) {
    return element==='fire' && enemy?.holyMistUntil>getCombatTime() ? 100-(100-resistance)*1.2 : resistance;
}

function getTierDropMulWithCaps(tier, zone) {
    let t = Math.max(1, Math.floor(Number(tier) || 1));
    let preSoft = Math.min(10, t - 1);
    let postSoft = Math.max(0, Math.min(20, t) - 10);
    let baseMul = 1 + preSoft * 0.02 + postSoft * 0.008;
    if (zone && zone.type === 'labyrinth') {
        let floor = Math.max(1, Math.floor(zone.floor || 1));
        let floor30SoftCapMul = 1.236;
        if (floor <= 30) return baseMul;
        if (floor <= 200) return Math.min(baseMul, floor30SoftCapMul);
        return floor30SoftCapMul;
    }
    return baseMul;
}

/**
 * Tier-20 defense values of a boss (data/maps.js ENEMY_DEFENSE_TIER20, BOSS_DEFENSE_SPECIALTIES): one or two of physical damage
 * reduction and the fire, cold and lightning resistances reach the specialty value, the rest match an elite. Fixed and
 * other-content bosses use the specialty value for every defense.
 * @returns {{dr:number,resF:number,resC:number,resL:number,resChaos:number}} percent values reached at zone tier 20
 */
function getBossDefenseTargets(zone, ele) {
    const rules = BOSS_DEFENSE_SPECIALTIES, values = ENEMY_DEFENSE_TIER20;
    const byValues = ({ dr, res }) => ({ dr, resF: res, resC: res, resL: res, resChaos: res });
    const special = byValues(values.bossSpecialty);
    const fixed = zone.loopScaleExempt || Number.isFinite(zone.fixedSeason) || zone.difficultyBenchmark || zone.milestonePinnacle;
    if (fixed || !['act', 'abyss'].includes(zone.type)) return special;
    const seed = hashSeed(String(zone.id) + ':boss-guard') >>> 0;
    const first = rules.byElement[ele] || rules.stats[seed % rules.stats.length];
    const rest = rules.stats.filter(stat => stat !== first);
    const second = (seed >>> 8) % 1000 < rules.secondChance * 1000 ? rest[(seed >>> 16) % rest.length] : null;
    const targets = byValues(values.elite);
    [first, second].filter(Boolean).forEach(stat => { targets[stat] = special[stat]; });
    return targets;
}

function getZoneDefenseVariance(zone) {
    let key = String((zone && zone.id) || 'zone');
    let seed = Math.abs(hashSeed(key + ':def-var')) % 7;
    return (seed - 3) * 0.02;
}

/** A zone's element ward (the resistance its monsters share), fixed by the zone's id or name; built once per zone (two string hashes
 * for every spawned monster before). */
function getZoneElementWardProfile(zone) {
    if (!zone) return null;
    const cacheKey = zone.type + '|' + zone.id + '|' + zone.name;
    if (zoneElementWardProfiles.has(cacheKey)) return zoneElementWardProfiles.get(cacheKey);
    if (zoneElementWardProfiles.size >= 512) zoneElementWardProfiles.clear();
    const profile = rollZoneElementWardProfile(zone);
    zoneElementWardProfiles.set(cacheKey, profile);
    return profile;
}

function rollZoneElementWardProfile(zone) {
    let specialBossZone = zone.type === 'outsideChaos'
        || zone.id === 'beehive_run'
        || zone.id === 'grand_breach_run'
        || zone.type === 'meteor'
        || zone.type === 'seasonBoss'
        || zone.type === 'trial';
    if (specialBossZone) return null;
    let key = String(zone.id || zone.name || 'zone');
    let elemList = ['fire', 'cold', 'light'];
    let elem = elemList[Math.abs(hashSeed(key + ':elem-ward')) % elemList.length];
    let strength = 6 + (Math.abs(hashSeed(key + ':elem-ward-strength')) % 13);
    return { elem: elem, strength: strength };
}

/** A cosmos zone's own enemy trait from its mechanic (scaled by rank, planet size and gravity), with a boss's debuffs; null elsewhere.
 * Each mechanic's fields in COSMOS_TRAIT_ARCHETYPES (2026-10-18, same fields in the same order). */
function getCosmosExclusiveEnemyTrait(zone, isElite, isBoss, seed) {
    if (!zone || zone.type !== 'cosmos') return null;
    const sizeClass = Math.max(1, Math.min(5, Math.floor(zone.sizeClass || 1)));
    const gravity = Math.max(1, Number(zone.gravity || 1));
    const rankPower = isBoss ? 1.45 : (isElite ? 1 : 0.72);
    const power = rankPower * (1 + Math.max(0, sizeClass - 1) * 0.06 + Math.max(0, gravity - 1) * 0.04);
    const mechanic = cosmosRouteRuntime.mechanic(zone, isBoss, seed);
    if (!mechanic) return null;
    const archetype = mechanic.id;
    const trait = {
        id: `cosmos_${archetype}`,
        name: '',
        expMul: 1 + (isBoss ? 0.16 : (isElite ? 0.08 : 0.03)),
        dropMul: 1 + (isBoss ? 0.12 : (isElite ? 0.06 : 0.02)),
        bossDebuffs: []
    };
    if (Object.hasOwn(COSMOS_TRAIT_ARCHETYPES, archetype)) COSMOS_TRAIT_ARCHETYPES[archetype](trait, { name: _t('우주계: {name}', { name: mechanic.name }), isBoss, power, seed });
    if (isBoss) {
        trait.bossDebuffs = (Object.hasOwn(COSMOS_BOSS_DEBUFF_SETS, archetype) ? COSMOS_BOSS_DEBUFF_SETS[archetype] : ['cosmos_res_down']).slice();
        trait.debuffPower = Math.min(1.7, power);
    }
    return trait;
}

function applyCosmosExclusiveTraitToEnemy(enemy, trait) {
    if (!enemy || !trait) return;
    enemy.traitName = enemy.traitName ? `${enemy.traitName}, ${trait.name}` : trait.name;
    if (Number.isFinite(trait.dr)) enemy.dr = Math.min(90, Math.max(0, enemy.dr + trait.dr));
    if (Number.isFinite(trait.resAll)) {
        enemy.resF = Math.min(95, enemy.resF + trait.resAll);
        enemy.resC = Math.min(95, enemy.resC + trait.resAll);
        enemy.resL = Math.min(95, enemy.resL + trait.resAll);
        enemy.resChaos = Math.min(95, enemy.resChaos + trait.resAll);
    }
    if (Number.isFinite(trait.armorMul)) enemy.armor = Math.floor(enemy.armor * Math.max(0.1, trait.armorMul));
    if (Number.isFinite(trait.evasionMul)) enemy.evasion = Math.floor(enemy.evasion * Math.max(0.1, trait.evasionMul));
    if (Number.isFinite(trait.armorGuard)) enemy.armorGuard = Math.max(Number(enemy.armorGuard || 0), trait.armorGuard);
    if (Number.isFinite(trait.evasionChance)) enemy.evasionChance = Math.max(Number(enemy.evasionChance || 0), Math.min(78, trait.evasionChance));
    if (Number.isFinite(trait.hitRateGuard)) enemy.hitRateGuard = Math.max(Number(enemy.hitRateGuard || 0), trait.hitRateGuard);
    if (Number.isFinite(trait.comboTakenLessPct)) enemy.comboTakenLessPct = Math.max(Number(enemy.comboTakenLessPct || 0), trait.comboTakenLessPct);
    if (Number.isFinite(trait.critResistPct)) enemy.critResistPct = Math.max(Number(enemy.critResistPct || 0), trait.critResistPct);
    if (Number.isFinite(trait.critDamageResistPct)) enemy.critDamageResistPct = Math.max(Number(enemy.critDamageResistPct || 0), trait.critDamageResistPct);
    if (Number.isFinite(trait.penetration)) enemy.penetration = Math.max(Number(enemy.penetration || 0), Number(enemy.penetration || 0) + trait.penetration);
    if (Number.isFinite(trait.energyShieldPct)) {
        enemy.maxEnergyShield = Math.max(Math.floor(Number(enemy.maxEnergyShield || 0)), Math.floor((enemy.maxHp || 1) * trait.energyShieldPct / 100));
        enemy.energyShield = Math.max(Math.floor(Number(enemy.energyShield || 0)), enemy.maxEnergyShield);
    }
    if (Array.isArray(trait.bossDebuffs) && trait.bossDebuffs.length > 0) {
        enemy.cosmosBossDebuffs = trait.bossDebuffs.slice();
        enemy.cosmosBossDebuffPower = Math.max(1, Number(trait.debuffPower || 1));
    }
}

function getCosmosDebuffSpec(type, power) {
    const p = Math.max(1, Number(power || 1));
    const table = {
        cosmos_regen_down: { type, label: _t('재생 효율 감소'), value: Math.min(70, Math.floor(32 * p)), duration: 5.5 },
        cosmos_leech_down: { type, label: _t('흡혈 효율 감소'), value: Math.min(75, Math.floor(36 * p)), duration: 5.5 },
        cosmos_res_down: { type, label: _t('저항 감소'), value: Math.min(38, Math.floor(16 * p)), duration: 5.0 },
        cosmos_aspd_down: { type, label: _t('공격 속도 감소'), value: Math.min(46, Math.floor(20 * p)), duration: 4.5 }
    };
    return table[type] || null;
}

function applyCosmosBossPlayerDebuff(enemy) {
    if (!enemy || !enemy.isBoss || !Array.isArray(enemy.cosmosBossDebuffs) || enemy.cosmosBossDebuffs.length <= 0) return;
    if (typeof getCosmosGalaxyBossMechanic === 'function' && getCosmosGalaxyBossMechanic(enemy.cosmosBossId)) return;
    const now = getCombatTime();
    if (now < Math.floor(enemy.nextCosmosBossDebuffAt || 0)) return;
    enemy.nextCosmosBossDebuffAt = now + 3200;
    const type = enemy.cosmosBossDebuffs[Math.abs((enemy.variantSeed || 0) + Math.floor(now / 3200)) % enemy.cosmosBossDebuffs.length];
    const spec = getCosmosDebuffSpec(type, enemy.cosmosBossDebuffPower || 1);
    if (!spec) return;
    game.cosmosPlayerDebuffs = Array.isArray(game.cosmosPlayerDebuffs) ? game.cosmosPlayerDebuffs : [];
    let row = game.cosmosPlayerDebuffs.find(d => d && d.type === spec.type);
    if (!row) { row = { type: spec.type, label: spec.label, value: 0, expiresAt: 0, durationMs: 0 }; game.cosmosPlayerDebuffs.push(row); }
    row.label = _t(spec.label);
    row.value = Math.max(Number(row.value || 0), spec.value);
    row.durationMs = Math.floor(spec.duration * 1000);
    row.expiresAt = Math.max(Number(row.expiresAt || 0), now + Math.floor(spec.duration * 1000));
    if (game.settings && game.settings.showCombatLog) addLog(_t('🌌 {name}의 우주계 보스 디버프: {label} -{value}%', { name: i18n.enemyName(enemy.name), label: _t(spec.label), value: spec.value }), 'attack-monster', { noToast: true });
}

function getCosmosBossAttackElement(enemy, pattern, pStats) {
    if (!pattern) return enemy && (enemy.cosmosBaseElement || enemy.ele) || 'phys';
    const elements = ['fire', 'cold', 'light', 'chaos'];
    if (pattern.elementRule === 'alternatingWeakest' && pattern.attackNumber % 2 === 1) return 'phys';
    if (pattern.elementRule === 'weakestResistance' || pattern.elementRule === 'alternatingWeakest') {
        if (!pattern.isSpecial && pattern.elementRule !== 'alternatingWeakest') return enemy.cosmosBaseElement || enemy.ele || 'phys';
        return elements.reduce((weakest, element) => {
            const current = Number((pStats && pStats[`res${element === 'fire' ? 'F' : element === 'cold' ? 'C' : element === 'light' ? 'L' : 'Chaos'}`]) || 0);
            const weakestValue = Number((pStats && pStats[`res${weakest === 'fire' ? 'F' : weakest === 'cold' ? 'C' : weakest === 'light' ? 'L' : 'Chaos'}`]) || 0);
            return current < weakestValue ? element : weakest;
        }, elements[0]);
    }
    if (!pattern || !pattern.isSpecial) return enemy.cosmosBaseElement || enemy.ele || 'phys';
    if (pattern.elementRule === 'physical') return 'phys';
    if (pattern.elementRule === 'chaos') return 'chaos';
    return enemy.cosmosBaseElement || enemy.ele || 'phys';
}

function applyCosmosBossSpecialDebuff(enemy, type) {
    const spec = getCosmosDebuffSpec(type, enemy.cosmosBossDebuffPower || 1);
    if (!spec) return;
    game.cosmosPlayerDebuffs = Array.isArray(game.cosmosPlayerDebuffs) ? game.cosmosPlayerDebuffs : [];
    let row = game.cosmosPlayerDebuffs.find(debuff => debuff && debuff.type === spec.type);
    if (!row) {
        row = { type: spec.type, label: spec.label, value: 0, expiresAt: 0, durationMs: 0 };
        game.cosmosPlayerDebuffs.push(row);
    }
    row.label = _t(spec.label);
    row.value = Math.max(Number(row.value || 0), spec.value);
    row.durationMs = Math.floor(spec.duration * 1000);
    row.expiresAt = Math.max(Number(row.expiresAt || 0), getCombatTime() + row.durationMs);
}

function applyCosmosBossAttackSetup(enemy, pattern, pStats) {
    if (!enemy || !pattern || pattern.cosmosSetupApplied) return pattern;
    pattern.cosmosSetupApplied = true;
    enemy.ele = getCosmosBossAttackElement(enemy, pattern, pStats);
    if (pattern.shieldRestorePct > 0 && enemy.maxEnergyShield > 0) {
        const restore = Math.max(1, Math.floor(enemy.maxEnergyShield * pattern.shieldRestorePct / 100));
        enemy.energyShield = Math.min(enemy.maxEnergyShield, Math.max(0, enemy.energyShield || 0) + restore);
    }
    if (pattern.debuffType) applyCosmosBossSpecialDebuff(enemy, pattern.debuffType);
    if (pattern.moveCounterPct > 0) {
        const moveBonus = Math.max(0, Number((pStats && pStats.moveSpeed) || 100) - 100);
        const moveRatio = Math.max(0, Math.min(1, moveBonus / 70));
        const extraDamage = Math.max(0, Number(pattern.damageMul || 1) - 1);
        pattern.damageMul = 1 + extraDamage * (1 - moveRatio * pattern.moveCounterPct / 100);
        pattern.countered = moveRatio >= 0.98;
    }
    return pattern;
}

function applyCosmosPlayerDebuffsToStats(pStats) {
    game.cosmosPlayerDebuffs = Array.isArray(game.cosmosPlayerDebuffs) ? game.cosmosPlayerDebuffs : [];
    const currentZone = getZone(game.currentZoneId);
    if (!currentZone || currentZone.type !== 'cosmos') {
        game.cosmosPlayerDebuffs = [];
        return;
    }
    const now = getCombatTime();
    game.cosmosPlayerDebuffs = game.cosmosPlayerDebuffs.filter(d => d && (d.expiresAt || 0) > now);
    game.cosmosPlayerDebuffs.forEach(d => {
        const value = Math.max(0, Math.min(90, Number(d.value || 0)));
        if (d.type === 'cosmos_regen_down') {
            pStats.regen = Math.max(0, (pStats.regen || 0) * (1 - value / 100));
            pStats.energyShieldRegenRate = Math.max(0, (pStats.energyShieldRegenRate || 0) * (1 - value / 100));
        } else if (d.type === 'cosmos_leech_down') {
            pStats.leech = Math.max(0, (pStats.leech || 0) * (1 - value / 100));
            pStats.spellLeech = Math.max(0, (pStats.spellLeech || 0) * (1 - value / 100));
        } else if (d.type === 'cosmos_res_down') {
            pStats.resF -= value;
            pStats.resC -= value;
            pStats.resL -= value;
            pStats.resChaos -= value;
        } else if (d.type === 'cosmos_aspd_down') {
            pStats.aspd *= Math.max(0.2, 1 - value / 100);
        }
    });
}

// 데이터(zone.bossMods)로 선언한 고정 보스 수정자. cosmosMods와 같은 shape를 반환해
// createEnemy의 기존 소비처를 그대로 재사용한다. (버려진 날붙이 등 시즌 보스 개성 부여용)
function getZoneStaticBossMods(zone, isBoss) {
    if (!isBoss || !zone || !zone.bossMods || typeof zone.bossMods !== 'object') return null;
    return zone.bossMods;
}

function applyCosmosDirectiveModifiers(modifiers, zone) {
    const directive = zone && zone.cosmosDirective && typeof zone.cosmosDirective === 'object'
        ? zone.cosmosDirective : null;
    if (!directive) return modifiers;
    modifiers.hpMul *= Math.max(0.5, Math.min(3, Number(directive.enemyHpMul) || 1));
    modifiers.damageMul *= Math.max(0.5, Math.min(3, Number(directive.enemyDamageMul) || 1));
    modifiers.attackSpeedMul *= Math.max(0.5, Math.min(2, Number(directive.enemyAttackSpeedMul) || 1));
    const name = String(directive.name || '').trim();
    if (name) modifiers.traitName = _t('{traitName}, 탐사:{name}', { traitName: modifiers.traitName, name });
    return modifiers;
}

function getCosmosEnemyModifiers(zone, isElite, isBoss) {
    if (!zone || zone.type !== 'cosmos') return null;
    let tag = String(zone.cosmosTag || '').trim();
    let sizeClass = Math.max(1, Math.min(5, Math.floor(zone.sizeClass || 1)));
    let gravity = Math.max(1, Number(zone.gravity || 1));
    let sizePressure = Math.max(0, sizeClass - 1);
    let gravityHarness = typeof window.getCosmosMasteryValue === 'function' ? Math.max(0, Number(window.getCosmosMasteryValue('gravityHarness')) || 0) : 0;
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
        traitName: _t('우주계:{tag} {sizeClass}등급/{gravity}g', { tag: tag || 'stellar', sizeClass, gravity: gravity.toFixed(1) })
    };
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
    let extra = tagMods[tag] || {};
    Object.keys(extra).forEach(key => {
        if (key === 'patternMode') mod.patternMode = extra[key];
        else if (key === 'traitName') mod.traitName = extra[key];
        else if (key === 'attackSpeedMul' || key === 'armorMul' || key === 'evasionMul' || key === 'regenMul' || key === 'dropMul') mod[key] = (mod[key] || 1) * extra[key];
        else mod[key] = (mod[key] || 0) + extra[key];
    });
    const galaxyEnvironment = Array.isArray(globalThis.COSMOS_GALAXY_ENVIRONMENT_DB)
        ? globalThis.COSMOS_GALAXY_ENVIRONMENT_DB.find(row => row && row.galaxy === Math.floor(zone.cosmosGalaxy || 0)) : null;
    Object.keys(galaxyEnvironment || {}).forEach(key => {
        if (key === 'name' || key === 'summary' || key === 'counter' || key === 'galaxy') return;
        if (key === 'hybridElement') mod.hybridElement = galaxyEnvironment[key];
        else if (key === 'energyShieldPct') mod.energyShieldPct = Math.max(mod.energyShieldPct || 0, galaxyEnvironment[key]);
        else if (key === 'attackSpeedMul' || key === 'armorMul' || key === 'evasionMul') mod[key] = (mod[key] || 1) * galaxyEnvironment[key];
        else mod[key] = (mod[key] || 0) + galaxyEnvironment[key];
    });
    mod.hpMul = Math.max(0.5, mod.hpMul * bossMul * getCosmosNonBossHpMultiplier(zone, isElite, isBoss));
    mod.damageMul = Math.max(0.5, mod.damageMul * (isBoss ? 1.1 : 1));
    const galaxyBossMechanic = isBoss && typeof getCosmosGalaxyBossMechanic === 'function'
        ? getCosmosGalaxyBossMechanic(zone.cosmosNodeId) : null;
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
        mod.traitName = _t('은하 보스: {name}', { name: galaxyBossMechanic.name });
    }
    return applyCosmosDirectiveModifiers(cosmosRouteRuntime.modifyEncounter(mod, zone, isBoss), zone);
}

// 루프 20 이후 적 강화(특히 생명력) 곡선을 완만하게 만든다.
// 20루프까지는 그대로 누적하고, 그 이후 추가되는 루프의 기울기를 절반으로 줄인다.
// (season/loopCount 기준 depth 19 = 루프 20)
function getSoftenedLoopDepth(depth) {
    let d = Math.max(0, depth || 0);
    const knee = 19;
    if (d <= knee) return d;
    return knee + (d - knee) * 0.5;
}

// 존 성격별 루프 난이도 입력값(시즌·루프 카운트)을 결정한다. HP·방어·공격 스케일이 공통으로 사용.
//  - trial/outsideChaos 또는 zone.loopScaleExempt(데이터 플래그, 예: 버려진 날붙이 결투):
//    특정 조합/빌드의 실력을 시험하는 고정 관문 — 루프 인플레이션을 받지 않고
//    zone.fixedDifficultyMul(데이터)로만 난이도를 조절한다.
//  - act: 매 루프 레벨 1부터 다시 지나는 재성장 구간 — ACT_LOOP_SCALE_CAP까지만 세지고 이후 고정.
//  - cosmos: 나무꾼 이후 고정 성장계단. 일반 루프 인플레이션은 30에서 고정하고
//    우주계 루프와 노드 티어로만 추가 난이도를 올린다.
//  - 그 외(엔드리스 파밍 콘텐츠): 제한 없이 루프 스케일을 따른다.
function getLoopDifficultyInputs(zone) {
    const fixed = getFixedLoopDifficultyInputs(zone);
    if (fixed) return fixed;
    let exempt = !!zone && (zone.type === 'trial' || zone.type === 'outsideChaos' || !!zone.loopScaleExempt);
    if (exempt) return { exempt: true, seasonLoops: 0, loopCount: 0 };
    let cap = getLoopScaleCap(zone);
    return {
        exempt: false,
        seasonLoops: Math.min(cap, Math.max(0, (game.season || 1) - 1)),
        loopCount: Math.min(cap, Math.max(0, Math.floor(game.loopCount || 0)))
    };
}

/** 지역이 세는 루프 상한: 액트 ACT_LOOP_SCALE_CAP, 혼돈은 그 위로 층마다 CHAOS_LOOP_RAMP_PER_DEPTH씩(data/maps.js), 우주계 30, 그 밖은 없음. */
function getLoopScaleCap(zone) {
    if (!zone) return Infinity;
    if (zone.type === 'act') return ACT_LOOP_SCALE_CAP;
    if (zone.type === 'abyss') return ACT_LOOP_SCALE_CAP + getAbyssDepthFromZoneId(zone.id) * CHAOS_LOOP_RAMP_PER_DEPTH;
    return zone.type === 'cosmos' ? 30 : Infinity;
}

// 고정 난이도: 벤치마크 콘텐츠는 루프 30으로, 세계수 아틀라스 지도는 등급이 정한 루프(zone.fixedSeason)로 계산한다.
function getFixedLoopDifficultyInputs(zone) {
    if (getDifficultyBenchmarkProfile(zone)) return { exempt: false, seasonLoops: 30, loopCount: 30 };
    if (!zone || !Number.isFinite(zone.fixedSeason)) return null;
    const loops = Math.max(0, Math.floor(zone.fixedSeason) - 1);
    return { exempt: false, seasonLoops: loops, loopCount: loops };
}

// 방어(장갑/회피) 루프 배율: 루프24까지는 기존과 동일하게 커지고(2.2 상한 도달),
// 그 이후로도 getLoopHpScale처럼 완만하게 계속 증가한다(하드 상한 없음).
// 기존에는 루프24 이후 완전히 동결되어, 무한히 성장하는 플레이어 관통/저항무시 스탯에
// 보스 방어가 전혀 대응하지 못하고 "고루프 보스가 너무 쉬워지는" 원인이 되었다.
function getLoopDefenseScale(loopCount) {
    let loop = Math.max(0, loopCount || 0);
    const bands = [
        { upTo: 24, rate: 0.05 },
        { upTo: 60, rate: 0.02 },
        { upTo: Infinity, rate: 0.008 }
    ];
    let scale = 1, prevBound = 0;
    for (let band of bands) {
        scale += Math.max(0, Math.min(loop, band.upTo) - prevBound) * band.rate;
        prevBound = band.upTo;
        if (loop <= band.upTo) break;
    }
    return scale;
}

/** 1 + depth × per-loop growth of monster life or damage (data/maps.js MONSTER_LOOP_GROWTH); tierShare is the zone's 0..1 tier share.
 * Cosmos keeps the values it was tuned on (its own node tiers carry its difficulty). */
function getMonsterLoopGrowthScale(zone, kind, seasonDepth, tierShare) {
    const growth = (zone && zone.type === 'cosmos' ? MONSTER_LOOP_GROWTH.fixed : MONSTER_LOOP_GROWTH)[kind];
    return 1 + seasonDepth * (growth.base + tierShare * growth.tier);
}

/** 우주계 은하와 그 최종 보스(잔향체 아스트라, 벤치마크 cosmosFinal): 노드 등급으로 난이도를 올리는 별도 사다리라 예전 루프 공식을 쓴다. */
function isCosmosLadderZone(zone) {
    return !!zone && (zone.type === 'cosmos' || zone.difficultyBenchmark === 'cosmosFinal');
}

/** 몬스터 생명력의 루프 배율. 루프를 타는 지역은 지역 단계와 무관한 한 곡선(data/maps.js MONSTER_LOOP_HP_CURVE), 루프를 타지 않는
 * 지역(시련 등)은 플레이어 루프의 보정 곡선, 우주계는 노드 등급에 맞춰 둔 예전 공식(성장 × 루프 카운트 × 보정)을 쓴다.
 * 전투(createEnemy)와 권장 전투력(estimateMapZonePowerRequirements)이 같은 값을 쓴다. */
function getMonsterLoopHpMultiplier(zone, loopInputs, tierProgress) {
    if (isCosmosLadderZone(zone)) {
        return getMonsterLoopGrowthScale(zone, 'hp', getSoftenedLoopDepth(loopInputs.seasonLoops), tierProgress)
            * getLoopHpScale(loopInputs.loopCount) * getMonsterLoopPowerScale(zone, 'hp');
    }
    if (loopInputs.exempt) return getMonsterLoopPowerScale(zone, 'hp');
    return interpolateLoopCurve(MONSTER_LOOP_HP_CURVE, loopInputs.seasonLoops + 1);
}

/** 보스 생명력에 더 곱하는 완화 배율(data/maps.js): 지역 단계(tier)의 BOSS_TIER_HP_EASE 곡선, 그리고 루프 생명력 배율(loopMul)
 * 가운데 1을 넘는 몫은 BOSS_LOOP_HP_SHARE만 남긴다(1 이하는 그대로). 전투(createEnemy)와 권장 전투력이 같은 값을 쓴다. */
function getBossHpEase(tier, loopMul) {
    const loopShare = loopMul > 1 ? (1 + (loopMul - 1) * BOSS_LOOP_HP_SHARE) / loopMul : 1;
    return loopShare * interpolateLoopCurve(BOSS_TIER_HP_EASE, Number(tier) || 1);
}

/** 정예 생명력 배율 1.4 + 루프 몫. 루프 몫은 +0.3까지(2026-10-06): 예전엔 상한 없이 루프 30에 2.6배까지 커져 루프 배율과 겹쳤다.
 * 우주계 사다리는 예전 그대로. 전투(createEnemy)와 아틀라스 무리 권장 전투력(getAtlasPackReadiness)이 같은 값을 쓴다. */
function getEliteLoopHpMultiplier(zone, loopCount) {
    const share = getSoftenedLoopDepth(loopCount) * 0.05;
    return 1.4 + (isCosmosLadderZone(zone) ? share : Math.min(0.3, share));
}

/** 몬스터 생명력 · 피해의 루프 배율(data/maps.js MONSTER_LOOP_POWER_SCALE). 루프는 지역 난이도가 쓰는 루프(액트 상한 ·
 * 아틀라스 지도의 고정 루프 그대로), 루프를 타지 않는 지역(시련 등)은 플레이어의 루프. 전투와 권장 전투력 표시가 같은 값을 쓴다. */
function getMonsterLoopPowerScale(zone, kind) {
    const inputs = getLoopDifficultyInputs(zone);
    const loop = inputs.exempt ? Math.max(1, Math.floor(game.season || 1)) : inputs.seasonLoops + 1;
    return interpolateLoopCurve(MONSTER_LOOP_POWER_SCALE[kind], loop);
}

/** [[루프, 값], …] 사이를 직선으로 잇는다. 첫 점 앞은 첫 값, 마지막 점 뒤는 마지막 값. */
function interpolateLoopCurve(points, loop) {
    if (!Array.isArray(points) || !points.length) return 1;
    if (loop <= points[0][0]) return points[0][1];
    const next = points.findIndex(point => loop <= point[0]);
    if (next < 0) return points[points.length - 1][1];
    const [x0, y0] = points[next - 1], [x1, y1] = points[next];
    return y0 + (y1 - y0) * (loop - x0) / (x1 - x0);
}

function getLoopHpScale(loopCount) {
    let loop = Math.max(0, loopCount || 0);
    const bands = [
        { upTo: 1, rate: 0.12 },
        { upTo: 10, rate: 0.10 },
        { upTo: 20, rate: 0.08 },
        { upTo: 40, rate: 0.04 },
        { upTo: 100, rate: 0.018 },
        { upTo: Infinity, rate: 0.006 }
    ];
    let scale = 1, prevBound = 0;
    for (let band of bands) {
        scale += Math.max(0, Math.min(loop, band.upTo) - prevBound) * band.rate;
        prevBound = band.upTo;
        if (loop <= band.upTo) break;
    }
    return scale;
}

/** Chaos bosses borrow a random act boss; an atlas node keeps its own (zone.bossAct). */
function getChaosBossVisual(zone, variantSeed) {
    if (!zone || !['abyss', 'chaosRealm', 'atlasMap'].includes(zone.type) || typeof getBossAssetKeyForZone !== 'function') return null;
    const seed = Math.abs(Math.floor(variantSeed || 0)), fixedAct = Number.isInteger(zone.bossAct);
    const actId = fixedAct ? zone.bossAct : seed % 10;
    // 액트와 그 안의 모습을 같은 나머지로 고르면 일부 모습(예: 액트 4의 첫째)이 절대 나오지 않는다.
    const assetKey = getBossAssetKeyForZone({ type: 'act', id: actId }, fixedAct ? seed : Math.floor(seed / 10));
    let hues = [286, 318, 202, 266, 334, 178, 244, 302, 222, 274];
    return { assetKey: assetKey, tint: hues[actId] };
}

function isUnderworldEntryBenchmark(zone) {
    return !!zone && zone.difficultyBenchmark === 'underworld1';
}

function getDifficultyBenchmarkProfile(zone) {
    const benchmark = String(zone && zone.difficultyBenchmark || '');
    if (benchmark === 'rival31') return { hp: 1, damage: 1, attackRate: 1, clearTimeSec: 30 };
    if (benchmark === 'underworld1') return { hp: 5, damage: 0.78, attackRate: 0.76, clearTimeSec: 24 };
    if (benchmark === 'underworld30') return { hp: 5 * (1 + 29 * 0.045), damage: 0.78, attackRate: 0.76, clearTimeSec: 30 };
    if (benchmark === 'ocean1000') return { hp: 5 * (1 + 10 * 0.05), damage: 1, attackRate: 1, clearTimeSec: 30 };
    if (benchmark === 'sky30') return { hp: 4.2 * (1 + 29 * 0.035), damage: 1.08, attackRate: 1.05, clearTimeSec: 30 };
    if (benchmark === 'cosmosFinal') return { hp: 1, damage: 1, attackRate: 1, clearTimeSec: 45 };
    return null;
}

/** A boss's entry easing: the underworld entry benchmark's own, else its floor's in ENTRY_BOSS_EASING (the underworld's floor 1, the sky
 * tower's floors 1-5), else none. Boss life, boss hits and the panel's recommended power all read it. */
function getEntryBossTuning(zone, isBoss) {
    if (!isBoss || !zone) return { hp: 1, damage: 1 };
    if (isUnderworldEntryBenchmark(zone)) {
        return { hp: UNDERWORLD_ENTRY_BENCHMARK_HP_MULTIPLIER, damage: UNDERWORLD_ENTRY_BENCHMARK_DAMAGE_MULTIPLIER };
    }
    const floors = Object.hasOwn(ENTRY_BOSS_EASING, zone.type) ? ENTRY_BOSS_EASING[zone.type] : [];
    return floors[Math.max(1, Math.floor(Number(zone.floor) || 1)) - 1] || { hp: 1, damage: 1 };
}

function getUnderworldEnemyDamageMultiplier(zone) {
    if (!zone || zone.type !== 'underworld') return 1;
    let floor = Math.max(1, Math.floor(Number(zone.floor) || 1));
    let mediumStart = UNDERWORLD_DIFFICULTY_CONFIG.flatDamageThroughFloor;
    let deepStart = UNDERWORLD_DIFFICULTY_CONFIG.mediumDamageThroughFloor;
    let deepEnd = UNDERWORLD_DIFFICULTY_CONFIG.deepDamageThroughFloor;
    let mediumFloors = Math.min(Math.max(0, floor - mediumStart), deepStart - mediumStart);
    let deepFloors = Math.min(Math.max(0, floor - deepStart), deepEnd - deepStart);
    return 1
        + mediumFloors * UNDERWORLD_DIFFICULTY_CONFIG.mediumDamagePerFloor
        + deepFloors * UNDERWORLD_DIFFICULTY_CONFIG.deepDamagePerFloor;
}

function getWispEnemyDefenseBonuses(monsterVariant) {
    const isWisp = !!(monsterVariant && String(monsterVariant.id || '').startsWith('wisp-'));
    const elements = new Set(isWisp && Array.isArray(monsterVariant.elements) ? monsterVariant.elements : []);
    const rules = isWisp ? WISP_ENEMY_RULES : WISP_NEUTRAL_RULES;
    return {
        isWisp,
        evasionMul: rules.evasionMul,
        armorMul: rules.armorMul,
        hpMul: rules.hpMul,
        dr: elements.has('phys') ? 18 : 0,
        resF: elements.has('fire') ? 30 : 0,
        resC: elements.has('cold') ? 30 : 0,
        resL: elements.has('light') ? 30 : 0,
        resChaos: elements.has('chaos') ? 30 : 0
    };
}

/** Wisps drop skill gems more often (data/bosses.js WISP_ENEMY_RULES). */
/** Wisps drop gems more often, and so does an atlas map with the 룬의 정원 omen (enemy.gemDropMul, js/atlas-maps.js applyEnemyMods). */
function getEnemyGemDropMul(enemy) {
    const wisp = enemy && enemy.monsterArchetype === 'wisp' ? WISP_ENEMY_RULES.gemDropMul : 1;
    return wisp * (Number(enemy && enemy.gemDropMul) || 1);
}

/** A new monster for zone at marker (its spawn record) in group groupIndex. Split into its steps on 2026-10-18 (it was one function
 * of complexity 254): the same steps and random rolls in the same order, the record's fields in the same order. */
function createEnemy(zone, marker, groupIndex) {
    const level = levelProgression.monsterLevel(zone, marker);
    zone = levelProgression.combatZone(zone);
    const loopInputs = getLoopDifficultyInputs(zone);
    const tierProgress = clampNumber(((zone.tier || 1) - 1) / 18, 0, 1);
    const abyssScale = getAbyssMonsterScales(zone);
    const markedBoss = !!marker.boss;
    const isElite = !!marker.elite && !markedBoss;
    let hp = getEnemyBaseHp(zone, { loopInputs, tierProgress, abyssScale, isBoss: markedBoss, isElite });
    const enemyEle = cosmosRouteRuntime.enemyElement(zone, markedBoss, pickEnemyElement(zone, getEnemyElementPool(zone), markedBoss));
    // 혼돈 밖의 나무꾼 is always a boss, with 120 times the life
    const woodsman = zone.type === 'outsideChaos';
    const isBoss = markedBoss || woodsman;
    if (woodsman) hp = Math.floor(hp * 120);
    let name = isBoss ? `👿 ${getBossNameForZone(zone, marker.storyStage ?? 0)}` : _t('{split} 추종자', { split: zone.name.split(':')[0] });
    const { zoneSeed, variantSeed } = getEnemySeeds(zone, marker, groupIndex);
    const look = getEnemyLook(zone, marker, { isBoss, isElite, enemyEle, variantSeed });
    hp = Math.floor(hp * look.wispDefense.hpMul);
    name = getEnemyLookName(name, isBoss, isElite, look);
    const cosmosMods = getCosmosEnemyModifiers(zone, isElite, isBoss) || getZoneStaticBossMods(zone, isBoss);
    const mods = { trait: look.trait, cosmosMods, cosmosExclusiveTrait: getCosmosExclusiveEnemyTrait(zone, isElite, isBoss, variantSeed) };
    hp = applyEnemyTraitHp(hp, mods);
    const isSky = rollEnemySky(zone, isBoss);
    if (isSky) name = _t('부유하는 {name}', { name });
    const defence = getEnemyDefence(zone, { enemyEle, isBoss, isElite, loopInputs, wispDefense: look.wispDefense });
    const rolled = { hybridElement: rollEnemyHybridElement(zone, isBoss), patternMode: rollEnemyPatternMode(cosmosMods, isBoss) };
    const spawn = { level, hp, name, isElite, isBoss, groupIndex, zoneSeed, variantSeed, enemyEle, abyssScale, look, mods, defence, rolled, isSky, plainBoss: !!marker.plainBoss };
    const enemy = buildEnemyRecord(zone, marker, spawn);
    finishEnemySpawn(enemy, zone, spawn);
    if (typeof primeEnemyHpDamageGhost === 'function') primeEnemyHpDamageGhost(enemy.id, 100);
    return enemy;
}

/** The zone's seed and the monster's variant seed (its look, trait and swing rhythm). */
function getEnemySeeds(zone, marker, groupIndex) {
    const zoneSeed = Number.isFinite(zone.id) ? zone.id : hashSeed(zone.id || zone.name || 'zone');
    return { zoneSeed, variantSeed: ((zoneSeed + 1) * 37 + (marker.at || 0) * 13 + groupIndex * 17) % 997 };
}

/** A monster's life before its look and traits: the tier and loop curves, each content's own scale, elites and bosses. */
function getEnemyBaseHp(zone, ctx) {
    const { loopInputs, tierProgress, isBoss, isElite } = ctx;
    const lateGameHpScale = 1 + (tierProgress * 9);
    let hp = Math.floor(((56 + zone.tier * 30) * 1.15) * lateGameHpScale * getMonsterLoopHpMultiplier(zone, loopInputs, tierProgress));
    if (loopInputs.exempt) hp = Math.floor(hp * (Number(zone.fixedDifficultyMul) || 1));
    hp = applyContentEnemyHp(zone, hp, isBoss, isElite);
    if (isElite) hp = Math.floor(hp * getEliteLoopHpMultiplier(zone, loopInputs.loopCount));
    if (isBoss) hp = Math.floor(hp * (1.8 + zone.tier * 0.6) * getBossHpEase(zone.tier, getMonsterLoopHpMultiplier(zone, loopInputs, tierProgress)));
    if (isBoss) hp = Math.floor(hp * (1 + (tierProgress * 4)));
    return applyEnemyHpScales(zone, hp, isBoss, ctx.abyssScale);
}

/** Deep chaos's normal monsters, the chaos realm, a benchmark profile or the sky tower, underworld and ocean, the boundary. */
function applyContentEnemyHp(zone, hp, isBoss, isElite) {
    if (zone.type === 'abyss' && !isElite && !isBoss) hp = applyDeepChaosNormalHp(zone, hp);
    if (zone.type === 'chaosRealm') {
        const realmFloor = Math.max(1, Math.floor(zone.floor || 1));
        // 혼돈계 1층 기준 난이도를 심화 혼돈 30급으로 맞추고, 층이 오를수록 완만히 추가 상승.
        const realmBaseMul = 5;
        const realmFloorMul = 1 + Math.max(0, realmFloor - 1) * 0.06;
        hp = Math.floor(hp * realmBaseMul * realmFloorMul);
    }
    hp = applyFloorContentEnemyHp(zone, hp);
    if (zone.type === 'beyondBoundary') hp = Math.floor(hp * Math.max(1, Number(zone.boundaryHpMul) || 1));
    return hp;
}

function applyDeepChaosNormalHp(zone, hp) {
    const abyssDepth = Math.max(1, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1));
    const hpRamp = Math.min(0.20, Math.max(0, abyssDepth - 1) * 0.015);
    const deepNormalHpMul = abyssDepth >= 21 && abyssDepth <= 30 ? 1.2 : 1;
    return Math.floor(hp * (1 + hpRamp) * deepNormalHpMul);
}

/** A benchmark profile's life scale, else the sky tower's, underworld's or ocean's by floor. */
function applyFloorContentEnemyHp(zone, hp) {
    const benchmarkProfile = getDifficultyBenchmarkProfile(zone);
    if (benchmarkProfile) return Math.floor(hp * benchmarkProfile.hp);
    if (zone.type === 'skyTower') {
        const towerFloor = Math.max(1, Math.floor(zone.floor || 1));
        return Math.floor(hp * 4.2 * (1 + Math.max(0, towerFloor - 1) * 0.035));
    }
    if (zone.type === 'underworld') {
        const underFloor = Math.max(1, Math.floor(zone.floor || 1));
        return Math.floor(hp * 5 * (1 + Math.max(0, underFloor - 1) * 0.045));
    }
    if (zone.type !== 'oceanDepth') return hp;
    const depthTier = Math.max(0, Math.floor(zone.depthTier || 0));
    // 수심 0m 진입 시점 난이도를 혼돈심화 21층 부근(혼돈계 floor1 hp배율 5와 유사한 강도)에 맞추고, 100m(depthTier 1)마다 완만히 추가 상승.
    const oceanBaseMul = 5;
    const oceanTierMul = 1 + depthTier * 0.05;
    return Math.floor(hp * oceanBaseMul * oceanTierMul);
}

/** The underworld entry boss, the map's and the abyss's life scales, the flat 0.92, at least 1, and trial 3's boss at 85%. */
function applyEnemyHpScales(zone, hp, isBoss, abyssScale) {
    const entryTuning = getEntryBossTuning(zone, isBoss);
    hp = Math.floor(hp * entryTuning.hp * (zone.mapHpMul || 1));
    hp = Math.floor(hp * (abyssScale.hpMul || 1) * (isBoss ? (abyssScale.bossMul || 1) : 1));
    hp = Math.max(1, Math.floor(hp * 0.92));
    if (isBoss && zone.type === 'trial' && zone.id === 'trial_3') hp = Math.floor(hp * 0.85);
    return hp;
}

/** What the monster looks like and is: a boss's art, its trait, a realm visual or a monster variant, wisp defenses. */
function getEnemyLook(zone, marker, ctx) {
    const { isBoss, isElite, enemyEle, variantSeed } = ctx;
    const art = getEnemyBossArt(zone, marker, isBoss, variantSeed);
    const trait = rollEnemyTrait(zone, isElite, isBoss, variantSeed);
    const realmVisualSet = typeof getRealmMonsterVisualSet === 'function' ? getRealmMonsterVisualSet(zone) : null;
    const realmVisual = getRealmVisualFor(realmVisualSet, isBoss, isElite, variantSeed, marker.packVisualId);
    const monsterVariant = !realmVisual && !isBoss && typeof getMonsterVariantDefinition === 'function'
        ? getMonsterVariantDefinition(variantSeed, enemyEle, zone, marker)
        : null;
    const wispDefense = getWispEnemyDefenseBonuses(monsterVariant);
    return { ...art, trait, realmVisualSet, realmVisual, monsterVariant, wispDefense, wispVisual: wispDefense.isWisp ? monsterVariant : null };
}

/** An atlas boss keeps its own roster identity. Act art remains the fallback for an undelivered sheet. */
function getEnemyBossArt(zone, marker, isBoss, variantSeed) {
    const chaosBossVisual = isBoss ? getChaosBossVisual(zone, variantSeed) : null;
    const bossAssetKey = chaosBossVisual ? chaosBossVisual.assetKey : (isBoss && typeof getBossAssetKeyForZone === 'function' ? getBossAssetKeyForZone(zone, variantSeed, marker.storyStage ?? 0) : null);
    const bossVisualId = isBoss ? zone.bossVisualId || null : null;
    return { chaosBossVisual: bossVisualId ? null : chaosBossVisual, bossAssetKey, bossVisualId };
}

/** A pack may choose a nonboss body from its own realm without changing the member's elite rank or trait roll. */
function getRealmVisualFor(realmVisualSet, isBoss, isElite, variantSeed, packVisualId) {
    const requested = !isBoss && realmVisualSet?.members.find(member => member.id === packVisualId && member.role !== 'boss');
    if (requested) return requested;
    const realmVisualRole = isBoss ? 'boss' : (isElite ? 'elite' : 'normal');
    return typeof getRealmMonsterVisualDefinition === 'function' ? getRealmMonsterVisualDefinition(realmVisualSet, realmVisualRole, variantSeed) : null;
}

/** A realm visual's or monster variant's name, else name; an elite's trait name goes before it. A boss keeps name. */
function getEnemyLookName(name, isBoss, isElite, look) {
    if (isBoss) return name;
    const shown = look.realmVisual || look.monsterVariant;
    if (shown) return isElite && look.trait ? `${look.trait.name} ${shown.name}` : shown.name;
    return isElite && look.trait ? `${look.trait.name} ${name}` : name;
}

/** Life scaled by the trait, the cosmos modifiers and the cosmos exclusive trait, in that order. */
function applyEnemyTraitHp(hp, mods) {
    for (const source of [mods.trait, mods.cosmosMods, mods.cosmosExclusiveTrait]) if (source && source.hpMul) hp = Math.floor(hp * source.hpMul);
    return hp;
}

/** Damage reduction and resistances climb the tier curve to their tier-20 value (bosses specialise in one or two,
 * getBossDefenseTargets); armour and evasion follow the tier and loop. */
function getEnemyDefence(zone, ctx) {
    const { enemyEle, isBoss, isElite, wispDefense } = ctx;
    const zoneProgress = clampNumber(((zone.tier || 1) - 1) / 19, 0, 1);
    const curved = zoneProgress * zoneProgress;
    const variance = getZoneDefenseVariance(zone);
    const defenseRamp = clampNumber(curved + variance, 0, 1);
    const bossTargets = isBoss ? getBossDefenseTargets(zone, enemyEle) : null;
    const rankDefense = ENEMY_DEFENSE_TIER20[isElite ? 'elite' : 'normal'];
    const rampTo = (floor, target) => floor + Math.floor(Math.max(0, target - floor) * defenseRamp);
    const drBase = isBoss ? rampTo(10, bossTargets.dr) : rampTo(0, rankDefense.dr);
    const resistBase = rampTo(5, rankDefense.res);
    const resistBases = isBoss ? { resF: rampTo(15, bossTargets.resF), resC: rampTo(15, bossTargets.resC), resL: rampTo(15, bossTargets.resL) }
        : { resF: resistBase, resC: resistBase, resL: resistBase };
    const chaosResBase = isBoss ? rampTo(15, bossTargets.resChaos) : resistBase;
    return { drBase, resistBases, chaosResBase, ...getEnemyArmourAndEvasion(zone, ctx.loopInputs, { isBoss, isElite, wispDefense }) };
}

function getEnemyArmourAndEvasion(zone, loopInputs, rank) {
    const defenseTierScale = Math.min(1.9, 0.6 + zone.tier * 0.08);
    const defenseLoopScale = getLoopDefenseScale(loopInputs.loopCount);
    const baseArmor = Math.floor((18 + zone.tier * 26) * defenseTierScale * defenseLoopScale * byEnemyRank(rank, [2.2, 1.6, 1]) * rank.wispDefense.armorMul);
    const baseEvasion = Math.floor((16 + zone.tier * 24) * defenseTierScale * defenseLoopScale * byEnemyRank(rank, [2.1, 1.5, 1]));
    return { baseArmor, baseEvasion: Math.floor(baseEvasion * rank.wispDefense.evasionMul) };
}

/** From loop 3 the second element a monster mixes in: a boss's own pair's second, else a random chaos boss element. */
function rollEnemyHybridElement(zone, isBoss) {
    return (game.season || 1) >= 3 ? ((isBoss && getChaosBossElements(zone)) || [null, rndChoice(CHAOS_BOSS_ELEMENTS)])[1] : null;
}

/** The cosmos encounter's pattern, else a boss's random one of this loop's modes. */
function rollEnemyPatternMode(cosmosMods, isBoss) {
    return (cosmosMods && cosmosMods.patternMode) || (isBoss
        ? (rndChoice(getBossPatternModesForLoop(game.season || 1)) || null)
        : null);
}

/** The new monster's record, its fields in their fixed order. */
function buildEnemyRecord(zone, marker, spawn) {
    const { look, mods, defence, rolled } = spawn;
    const pressure = getEnemyPressureRecord(zone, mods.cosmosMods, spawn);
    const guards = getEnemyGuardRecord(look.trait, mods.cosmosMods, spawn.isBoss);
    return {
        ...getEnemyIdentityRecord(marker, spawn),
        ele: spawn.enemyEle,
        ...getEnemyResistRecord(defence, look.trait, spawn.abyssScale, look.wispDefense),
        armor: defence.baseArmor,
        evasion: defence.baseEvasion,
        ...getEnemyOffenceRecord(zone, mods, spawn),
        regenRate: pressure.regenRate,
        regenSuppressPct: 0,
        penetration: pressure.penetration,
        resistanceReduction: pressure.resistanceReduction,
        hybridElement: rolled.hybridElement,
        ailmentChance: pressure.ailmentChance,
        firstHitGuard: guards.firstHitGuard,
        hitRateGuard: guards.hitRateGuard,
        recentHitsTaken: 0,
        recentHitsTimer: 0,
        patternMode: rolled.patternMode,
        patternAttackCount: 0,
        nextPatternState: null,
        patternTelegraphKey: null,
        patternTelegraphStartedAt: 0,
        ...getEnemyCapRecord(zone),
        ...getEnemyTraitRecord(look.trait, spawn.isElite),
        ...getEnemyRewardRecord(zone, mods),
        isSky: spawn.isSky
    };
}

/** The record's head: the next id, level, life, name, rank, boss art, spawn place, swing rhythm and look. */
function getEnemyIdentityRecord(marker, spawn) {
    const { look } = spawn;
    return {
        id: game.nextEnemyId++,
        level: spawn.level,
        hp: spawn.hp,
        maxHp: spawn.hp,
        name: spawn.name,
        isElite: spawn.isElite,
        isBoss: spawn.isBoss,
        bossAssetKey: look.bossAssetKey,
        bossVisualTint: look.chaosBossVisual ? look.chaosBossVisual.tint : null,
        attackTimer: (((spawn.zoneSeed + 1) * 13 + (marker.at || 0) * 3 + spawn.groupIndex * 7) % 10) / 20,
        spawnAt: marker.at,
        groupIndex: spawn.groupIndex,
        variantSeed: spawn.variantSeed,
        spriteVariantId: look.monsterVariant ? look.monsterVariant.id : null,
        monsterArchetype: look.wispVisual ? 'wisp' : null,
        monsterVisualSetId: look.realmVisualSet ? look.realmVisualSet.id : null,
        monsterVisualId: look.bossVisualId || (look.realmVisual ? look.realmVisual.id : null),
        baseMonsterName: look.realmVisual ? look.realmVisual.name : (look.monsterVariant ? look.monsterVariant.name : null)
    };
}

/** Damage reduction and the four resistances: the defence bases, the trait's, the abyss bonus (resistances) and wisp defenses,
 * capped at 90 and 95. */
function getEnemyResistRecord(defence, trait, abyssScale, wispDefense) {
    const res = (base, key) => Math.min(95, base + enemyBonus(trait, key) + (abyssScale.resistBonus || 0) + wispDefense[key]);
    return {
        dr: Math.min(90, Math.max(0, defence.drBase + enemyBonus(trait, 'dr') + wispDefense.dr)),
        resF: res(defence.resistBases.resF, 'resF'),
        resC: res(defence.resistBases.resC, 'resC'),
        resL: res(defence.resistBases.resL, 'resL'),
        resChaos: res(defence.chaosResBase, 'resChaos')
    };
}

/** Attack and damage scales, swing rhythm and crit chance (from loop 2 a base by rank) from the trait, the cosmos modifiers,
 * the exclusive trait, the woodsman, the map and the boundary. */
function getEnemyOffenceRecord(zone, mods, spawn) {
    const { trait, cosmosMods, cosmosExclusiveTrait } = mods;
    const woodsman = zone.type === 'outsideChaos';
    const guardEscort = zone.type === 'cosmos' && zone.cosmosHabitat === 'guard' && spawn.isElite && spawn.look.realmVisual?.id === 'cosmos-ooze';
    // Replaces the former ranged windup with slower charge, without changing movement or damage per hit.
    const escortAttackSpeed = guardEscort ? COSMOS_ROUTE_G1.habitats.guard.escortAttackSpeed : 1;
    return {
        atkMul: enemyBonus(trait, 'atkMul', 1) * enemyBonus(cosmosMods, 'atkMul', 1) * enemyBonus(cosmosExclusiveTrait, 'atkMul', 1),
        damageMul: (zone.mapDamageMul || 1) * (woodsman ? 2 : 1) * enemyBonus(cosmosMods, 'damageMul', 1) * enemyBonus(cosmosExclusiveTrait, 'damageMul', 1) * boundaryMul(zone, 'boundaryDamageMul'),
        attackSpeedVar: (0.85 + (((spawn.variantSeed % 11) / 10) * 0.5)) * enemyBonus(trait, 'attackSpeedVarMul', 1) * (woodsman ? 1.5 : 1) * enemyBonus(cosmosMods, 'attackSpeedMul', 1) * enemyBonus(cosmosExclusiveTrait, 'attackSpeedVarMul', 1) * boundaryMul(zone, 'boundaryAttackSpeedMul') * escortAttackSpeed,
        critChance: fromLoopOn(2, byEnemyRank(spawn, [16, 10, 4])) + enemyBonus(trait, 'critChanceBonus') + enemyBonus(cosmosMods, 'critChanceBonus') + enemyBonus(cosmosExclusiveTrait, 'critChanceBonus')
    };
}

/** Regeneration (from loop 3; the woodsman's a tenth), resistance pressure (from loop 4; deep chaos lowers resistance instead of
 * piercing it) and the ailment chance (from loop 4). */
function getEnemyPressureRecord(zone, cosmosMods, rank) {
    const regenMul = ((zone.type === 'outsideChaos' && rank.isBoss) ? 0.1 : 1) * enemyBonus(cosmosMods, 'regenMul', 1);
    const baselineResistancePressure = fromLoopOn(4, byEnemyRank(rank, [14, 8, 3]));
    const isDeepChaos = zone.type === 'abyss';
    return {
        regenRate: Math.max(fromLoopOn(3, byEnemyRank(rank, [0.004, 0.0022, 0.0012])) * 0.12 * regenMul, Number(zone.boundaryRegenRate) || 0),
        penetration: (isDeepChaos ? 0 : baselineResistancePressure) + enemyBonus(cosmosMods, 'penetration'),
        resistanceReduction: isDeepChaos ? baselineResistancePressure : 0,
        ailmentChance: fromLoopOn(4, byEnemyRank(rank, [0.14, 0.08, 0.03])) + enemyBonus(cosmosMods, 'ailmentChanceBonus')
    };
}

/** From loop 5 the first-hit guard (a boss's 0.75, else the trait's) and the hit rate guard. */
function getEnemyGuardRecord(trait, cosmosMods, isBoss) {
    return {
        firstHitGuard: Math.max(fromLoopOn(5, isBoss ? 0.75 : ((trait && trait.firstHitGuard) || 0)), enemyBonus(cosmosMods, 'firstHitGuard')),
        hitRateGuard: fromLoopOn(5, (trait && trait.hitRateGuard) || (isBoss ? 0.06 : 0))
    };
}

/** The woodsman, 아스트라 and milestone pinnacles take no execute and no life-scaled damage. */
function getEnemyCapRecord(zone) {
    const capped = zone.type === 'outsideChaos' || zone.id === 'cosmos_astra' || !!zone.milestonePinnacle;
    return { disableExecute: capped, disableHpScaleDamage: capped };
}

function getEnemyTraitRecord(trait, isElite) {
    return {
        trait: trait ? { ...trait } : null,
        traitName: trait ? trait.name : null,
        traitOutlineColor: isElite && trait ? trait.outlineColor || '#e2b94f' : null,
        leechEffMul: trait && Number.isFinite(trait.leechEffMul) ? Math.max(0, trait.leechEffMul) : 1
    };
}

function getEnemyRewardRecord(zone, mods) {
    const reward = boundaryMul(zone, 'boundaryRewardMul') * loopMutation.rewardMul(zone);
    return {
        expMul: enemyRewardMul(mods.trait, 'expMul') * enemyRewardMul(mods.cosmosExclusiveTrait, 'expMul') * reward,
        dropMul: enemyRewardMul(mods.trait, 'dropMul') * enemyRewardMul(mods.cosmosExclusiveTrait, 'dropMul') * getTierDropMulWithCaps(zone.tier, zone) * reward
    };
}

function hardenMeteorCore(enemy, ele) {
    const key = METEOR_CORE_GUARD[ele] || 'resF';
    enemy[key] = Math.min(key === 'dr' ? 90 : 95, (enemy[key] || 0) + 12);
}

/** The new monster's last steps: its defences, zone mods, the grand breach tuning, the grid profile, the severed wanderer, a boss's
 * last steps, the board carrier and root bearer marks. */
function tuneMeteorEnemy(enemy, zone) {
    if (zone.type !== 'meteor') return;
    // 운석의 종류(data/maps.js METEOR_KINDS)가 속성을 정한다: 핵은 제 속성의 저항(물리는 피해 감소)이 오르고, 호위 사수는 eliteEle.
    const kind = METEOR_KINDS.find(row => row.id === zone.meteorKind) || METEOR_KINDS[0];
    enemy.ele = kind.ele;
    if (enemy.isBoss) {
        hardenMeteorCore(enemy, kind.ele);
    } else if (enemy.isElite) {
        enemy.ele = kind.eliteEle || kind.ele;
        enemy.attackRange = COMBAT_GRID_CONFIG.rangedEnemyMaxRange;
        enemy.attackDelivery = 'projectileCell';
        enemy.projectileToEdge = true;
        enemy.attackCastMs = 900;
        enemy.attackCastSpecial = true;
        enemy.attackLabel = '별철 관통';
    } else if (enemy.monsterVisualId === 'meteor-shard') {
        enemy.attackSpeedVar *= 1.2;
        enemy.maxHp = Math.floor(enemy.maxHp * 0.85);
    } else {
        enemy.dr = Math.min(90, enemy.dr + 6);
        enemy.maxHp = Math.floor(enemy.maxHp * 1.2);
    }
    enemy.hp = enemy.maxHp;
}

function finishEnemySpawn(enemy, zone, spawn) {
    applySpawnDefences(enemy, zone, spawn);
    applyZoneEnemyMods(enemy, zone);
    applyGrandBreachMobTuning(zone, enemy);
    assignEnemyGridCombatProfile(enemy);
    tuneMeteorEnemy(enemy, zone);
    if (typeof maybeApplySeveredWanderer === 'function') maybeApplySeveredWanderer(enemy, zone, spawn.isElite, spawn.isBoss);
    if (!spawn.plainBoss) finishBossSpawn(enemy, zone);
    atlasBoard.markCarrier(game, enemy, zone);
    atlasEndgame.markOmenBearer(game, enemy, zone);
}

/** The boundary's bonuses, the zone's element ward, the pattern preview, cosmos modifiers, 아스트라's base, the exclusive trait
 * and the woodsman. */
function applySpawnDefences(enemy, zone, spawn) {
    const { cosmosMods, cosmosExclusiveTrait } = spawn.mods;
    applyBoundaryDefenceToEnemy(enemy, zone);
    applyZoneElementWard(enemy, zone);
    if (typeof refreshBossPatternPreview === 'function') refreshBossPatternPreview(enemy);
    if (cosmosMods) applyCosmosModsToEnemy(enemy, zone, cosmosMods, spawn.isBoss);
    if (zone.id === 'cosmos_astra' && spawn.isBoss) {
        enemy.astraBase = {
            dr: enemy.dr, armor: enemy.armor, evasion: enemy.evasion,
            resF: enemy.resF, resC: enemy.resC, resL: enemy.resL, resChaos: enemy.resChaos,
            penetration: enemy.penetration, critChance: enemy.critChance,
            atkMul: enemy.atkMul, attackSpeedVar: enemy.attackSpeedVar, regenRate: enemy.regenRate
        };
    }
    applyCosmosExclusiveTraitToEnemy(enemy, cosmosExclusiveTrait);
    if (enemy.cosmosBossId && typeof refreshBossPatternPreview === 'function') refreshBossPatternPreview(enemy);
    if (zone.type === 'outsideChaos') applyWoodsmanToEnemy(enemy);
}

function applyBoundaryDefenceToEnemy(enemy, zone) {
    if (zone.type !== 'beyondBoundary') return;
    enemy.dr = Math.min(90, enemy.dr + Math.max(0, Number(zone.boundaryDrBonus) || 0));
    enemy.penetration += Math.max(0, Number(zone.boundaryPenetrationBonus) || 0);
}

function applyZoneElementWard(enemy, zone) {
    const zoneWard = getZoneElementWardProfile(zone);
    if (!zoneWard) return;
    if (zoneWard.elem === 'fire') enemy.resF = Math.min(95, enemy.resF + zoneWard.strength);
    else if (zoneWard.elem === 'cold') enemy.resC = Math.min(95, enemy.resC + zoneWard.strength);
    else if (zoneWard.elem === 'light') enemy.resL = Math.min(95, enemy.resL + zoneWard.strength);
}

/** A cosmos encounter's modifiers: defences, armour and evasion, drops, its cosmos marks, a hybrid element, an energy shield and
 * the trait name. Shared encounter modifiers can adjust stats without adding a named trait. */
function applyCosmosModsToEnemy(enemy, zone, cosmosMods, isBoss) {
    const resAll = cosmosMods.resAll || 0;
    enemy.dr = Math.min(90, Math.max(0, enemy.dr + (cosmosMods.dr || 0)));
    for (const key of ['resF', 'resC', 'resL', 'resChaos']) enemy[key] = Math.min(95, enemy[key] + resAll + (cosmosMods[key] || 0));
    enemy.armor = Math.floor(enemy.armor * (cosmosMods.armorMul || 1));
    enemy.evasion = Math.floor(enemy.evasion * (cosmosMods.evasionMul || 1));
    enemy.dropMul *= cosmosMods.dropMul || 1;
    markCosmosEnemy(enemy, zone, isBoss);
    if (cosmosMods.hybridElement) enemy.hybridElement = cosmosMods.hybridElement;
    if (cosmosMods.energyShieldPct) giveEnemyEnergyShield(enemy, cosmosMods.energyShieldPct);
    enemy.traitName = [enemy.traitName, cosmosMods.traitName].filter(Boolean).join(', ');
}

function markCosmosEnemy(enemy, zone, isBoss) {
    enemy.cosmosTag = zone.cosmosTag || '';
    enemy.cosmosSizeClass = Math.max(1, Math.floor(zone.sizeClass || 1));
    enemy.cosmosGravity = Math.max(1, Number(zone.gravity || 1));
    enemy.cosmosBossId = isBoss ? zone.cosmosNodeId || null : null;
    enemy.cosmosBaseElement = zone.ele || enemy.ele || 'phys';
}

/** An energy shield of pct% of the monster's life, kept when it already has a larger one, and full. */
function giveEnemyEnergyShield(enemy, pct) {
    enemy.maxEnergyShield = Math.max(enemy.maxEnergyShield || 0, Math.floor(enemy.maxHp * pct / 100));
    enemy.energyShield = Math.max(enemy.energyShield || 0, enemy.maxEnergyShield);
}

/** 혼돈 밖의 나무꾼: freeze resistance, heavier defences with its resistance bases kept, the armour guard and an evasion chance. */
function applyWoodsmanToEnemy(enemy) {
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

/** A boss's last spawn steps: the hidden journal run and, from loop 33, a rare variant (js/boss-variants.js). */
function finishBossSpawn(enemy, zone) {
    if (!enemy.isBoss) return;
    startHiddenJournalBossRun(enemy, zone);
    if (typeof bossVariants === 'object') bossVariants.maybeApply(enemy, zone);
}

function getZoneEncounterProfile(zone) {
    if (zone.type === 'beyondBoundary') {
        let difficulty = Math.max(1, Math.floor(Number(zone.boundaryDifficultyTier) || Number(zone.boundaryTier) || 1));
        let displayTier = Math.max(1, Math.floor(Number(zone.boundaryTier) || 1));
        return {
            markerCount: Math.min(8, 3 + Math.floor(difficulty / 20)), minPack: 2,
            maxPack: Math.min(7, 3 + Math.floor(difficulty / 12)),
            eliteChance: Math.min(0.65, 0.2 + difficulty * 0.008),
            bossAdds: Math.min(4, Math.floor(difficulty / 15)), label: _t('경계 너머 {displayTier}단계', { displayTier })
        };
    }
    if (zone.type === 'cosmos') {
        let gravity = Math.max(1, Number(zone.gravity || 1));
        let sizeClass = Math.max(1, Math.floor(zone.sizeClass || 1));
        let markerCount = Math.max(4, Math.min(12, 4 + sizeClass + Math.floor((gravity - 1) * 4)));
        let minPack = Math.max(2, Math.min(6, 2 + Math.floor(sizeClass / 2)));
        let maxPack = Math.max(minPack, Math.min(9, minPack + 2 + Math.floor((gravity - 1) * 2)));
        return cosmosRouteRuntime.encounterProfile(zone, { markerCount, minPack, maxPack, eliteChance: Math.min(0.75, 0.16 + sizeClass * 0.05), bossAdds: 2 + Math.floor(sizeClass / 2), label: zone.name || '우주계' });
    }
    if (zone.type === 'chaosRealm') return getChaosRealmEncounterProfile(zone);
    if (zone.type === 'skyTower') {
        let floor = Math.max(1, Math.floor(zone.floor || 1));
        let minPack = Math.min(9, 2 + Math.floor(floor / 10));
        let maxPack = Math.min(10, minPack + 2 + Math.floor(floor / 18));
        return { markerCount: 40 + Math.floor(floor / 3), minPack: minPack, maxPack: Math.max(minPack, maxPack), eliteChance: Math.min(0.5, 0.18 + floor * 0.006), bossAdds: 2 + Math.floor(floor / 12), label: _t('창공의 탑 {floor}층', { floor }) };
    }
    if (zone.type === 'underworld') return getUnderworldEncounterProfile(zone);
    if (zone.type === 'meteor') return { markerCount: 2, minPack: 2, maxPack: 3, eliteChance: 0.5, bossAdds: 0, label: _t('운석') };
    if (zone.type === 'trial') return { markerCount: 3, minPack: 1, maxPack: 2, eliteChance: 1, bossAdds: 2, label: _t('시련') };
    if (zone.type === 'timeRift') {
        let pressure = Math.max(1, Math.floor(zone.pressure || 1));
        return { markerCount: 3 + Math.floor(pressure / 3), minPack: 2, maxPack: Math.min(6, 3 + Math.floor(pressure / 4)), eliteChance: Math.min(0.8, 0.3 + pressure * 0.05), bossAdds: 1 + Math.floor(pressure / 5), label: _t('시간의 균열 (시간압 {pressure})', { pressure }) };
    }
    if (zone.type === 'seasonBoss') return { markerCount: 1, minPack: 1, maxPack: 1, eliteChance: 1, bossAdds: 0, label: _t('보스') };
    if (zone.type === 'labyrinth') return getLabyrinthEncounterProfile(zone);
    if (zone.type === 'abyss') return getAbyssEncounterProfile(zone);
    if (zone.type === 'oceanDepth') {
        let depthTier = Math.max(0, Math.floor(zone.depthTier || 0));
        let minPack = Math.min(6, 2 + Math.floor(depthTier / 4));
        let maxPack = Math.min(8, minPack + 2);
        return {
            markerCount: 4 + Math.floor(depthTier * 0.5),
            minPack: minPack,
            maxPack: maxPack,
            eliteChance: Math.min(0.4, 0.08 + depthTier * 0.01),
            bossAdds: 0,
            label: zone.name || '심해'
        };
    }
    let minPack = 1;
    let zoneIdNum = Number.isFinite(zone.id) ? zone.id : (Number(zone.tier) || 1);
    let maxPack = Math.min(3, 1 + Math.floor((zoneIdNum + 2) / 3));
    return {
        markerCount: 3 + Math.floor(zone.tier * 0.8),
        minPack: minPack,
        maxPack: maxPack,
        eliteChance: 0.05 + zone.tier * 0.015,
        bossAdds: zone.tier >= 4 ? 1 : 0,
        label: _t('{minPack}-{maxPack}기', { minPack, maxPack })
    };
}

function resolveMapEstimateContentScale(zone) {
    const benchmark = getDifficultyBenchmarkProfile(zone);
    if (benchmark) {
        return {
            hp: benchmark.hp * (zone.type === 'beyondBoundary' ? Math.max(1, Number(zone.boundaryHpMul) || 1) : 1),
            damage: benchmark.damage * (zone.type === 'beyondBoundary' ? Math.max(1, Number(zone.boundaryDamageMul) || 1) : 1),
            clearTimeSec: benchmark.clearTimeSec
        };
    }
    let scale = { hp: 1, damage: 1, clearTimeSec: 24 };
    let floor = Math.max(1, Math.floor(Number(zone.floor) || 1));
    if (zone.type === 'act') scale.clearTimeSec = 18;
    if (zone.type === 'chaosRealm') scale.hp = 5 * (1 + (floor - 1) * 0.06);
    if (zone.type === 'underworld') {
        scale.hp = 5 * (1 + (floor - 1) * 0.045);
        scale.damage = 0.78 * getUnderworldEnemyDamageMultiplier(zone);
    }
    if (zone.type === 'oceanDepth') scale.hp = 5 * (1 + Math.max(0, Math.floor(zone.depthTier || 0)) * 0.05);
    if (zone.type === 'timeRift' || zone.type === 'seasonBoss') scale.clearTimeSec = 30;
    if (zone.type === 'beehive') scale.clearTimeSec = 30;
    if (zone.type === 'colony') {
        scale.hp = 3.4;
        scale.damage = 1.45;
    }
    if (zone.type === 'grandBreach') scale.clearTimeSec = 35;
    if (zone.type === 'cosmos') {
        const galaxyBoss = typeof getCosmosGalaxyBossMechanic === 'function'
            && !!getCosmosGalaxyBossMechanic(zone.cosmosNodeId);
        scale.clearTimeSec = galaxyBoss ? 55 : 40;
    }
    return scale;
}

exposeFileGlobals({ addUncappedSkillTargets, getSkillTargetPreference, selectCombatGemTargets, getSplashDormantEnemies, getAttackTargets, beginSkillMobility, applySkillMobilityBeforeAttack, advancePlayerExplorationFrame, continuePlayerExplorationApproach, updatePlayerGridEngagement, warningAllowsStep, applyDamageToEnemyResource, getEnemyLifeAndShield, maybeUnlockChaosRealmFromWoodsman, applyZoneEnemyMods, grantChaosRealmFloorBonus, applyCosmosJudgmentOnHit, applyAilingTargetDamage, getHitEnemyResistance, applyVoidWeakMitigation, getEnemyMitigationBeforeWeak, getBossDefenseTargets, getCosmosExclusiveEnemyTrait, applyCosmosBossPlayerDebuff, applyCosmosBossAttackSetup, applyCosmosPlayerDebuffsToStats, getCosmosEnemyModifiers, getSoftenedLoopDepth, getLoopDifficultyInputs, getMonsterLoopGrowthScale, getMonsterLoopHpMultiplier, getBossHpEase, getEliteLoopHpMultiplier, getMonsterLoopPowerScale, interpolateLoopCurve, getLoopHpScale, getDifficultyBenchmarkProfile, getEntryBossTuning, getUnderworldEnemyDamageMultiplier, getWispEnemyDefenseBonuses, getEnemyGemDropMul, createEnemy, getEnemySeeds, getEnemyRewardRecord, tuneMeteorEnemy, giveEnemyEnergyShield, finishBossSpawn, getZoneEncounterProfile, resolveMapEstimateContentScale });
})();

/** Targets of the active gem in range now. dormant: monsters that have not noticed the hero yet, which only the attack itself
 * passes (getAttackTargets): they can be caught by the area, never aimed at. Checks and previews leave them out. */
function getSkillTargets(pStats, dormant = []) {
    let living = (game.enemies || []).filter(enemy => enemy.hp > 0);
    // 시야 밖 몬스터(2026-10-09 사용자): 영웅이 직접 노리지 못하고, 시야 안 몬스터를 친 범위, 연쇄, 부채꼴에만 휘말린다(알아채지 않은
    // 몬스터와 같은 길, options.dormant). 노릴 몬스터가 없으면 영웅은 가장 가까운 몬스터 쪽으로 걸어간다(updatePlayerGridEngagement).
    let alive = living.filter(enemy => actExplorationState.inSight(enemy));
    if (alive.length === 0) return [];
    ensureCombatGridRuntime();
    let skill = pStats.sSkill;
    let pattern = skill && skill.projectilePattern;
    if (pattern && pattern.kind === 'fan' && pStats.projectileExtraShots > 0) {
        let rays = Math.min(8, Math.max(1, Math.floor(pattern.rays || 1)) + Math.floor(pStats.projectileExtraShots));
        skill = { ...skill, targets: rays, projectilePattern: { ...pattern, rays } };
    }
    let now = getCombatTime();
    let tactics = game.combatTacticsUnlocked ? resolveConditionalCombatTactics(normalizeCombatTacticsSettings(game.settings), pStats, game, now) : null;
    let options = getSkillTargetPreference(tactics, now);
    let unseen = living.filter(enemy => !alive.includes(enemy));
    let targets = selectCombatGemTargets(game.activeSkill, skill, game.gridPlayer, alive, { ...options, dormant: dormant.concat(unseen) });
    if (tactics && targets.length > 0 && String(targets[0].enemy.id) !== String(combatTacticsRuntime.targetId)) {
        combatTacticsRuntime.targetId = targets[0].enemy.id;
        combatTacticsRuntime.targetLockedUntil = now + COMBAT_TACTIC_TARGET_LOCK_MS;
    }
    return targets;
}


/** 공중에 뜨지 않는 점멸(그림자 점멸): 무대의 주인공이 박차고 나간 뒤 사라진다. */
const isKickoffBlink = pattern => pattern.kind === 'blink' && !(Number(pattern.airMs) > 0);


/** Danger the hero must not step into (avoid: { hard, soft }, js/combat.js updateCombatHazardEvasion): tactical moves wait for it. */
const hasHardDanger = avoid => Boolean(avoid && avoid.hard && avoid.hard.length);


const CURSE_ELEMENT_SHRED_KEYS = Object.freeze({ fire: 'resFShred', cold: 'resCShred', light: 'resLShred', chaos: 'resChaosShred', phys: 'physDrShred' });


/** The enemy's mitigation against a hit of skillEle: its resistance (the woodsman's climbs as it loses life), less the shreds on
 * it, then the physical or elemental rules. Split into its steps on 2026-10-18 with the same reads in the same order. */
/** 공허의 빙의(2026-11-08 전달본 V3.13)의 약화: 4초 동안 모든 피해를 20% 더 받는다. 저항을 그만큼 낮춘 값이다(신성한 안개와 같은 길). */
const VOID_WEAK_TAKEN_MUL = 1.2;
function getEffectiveEnemyMitigation(skillEle, zoneTier, enemy, pStats) {
    return applyVoidWeakMitigation(enemy, getEnemyMitigationBeforeWeak(skillEle, zoneTier, enemy, pStats));
}
const WOODSMAN_BASE_RESIST = Object.freeze({ fire: 'baseResF', cold: 'baseResC', light: 'baseResL', chaos: 'baseResChaos' });


const zoneElementWardProfiles = new Map(); // zone type, id and name -> the profile below (read only by applyZoneElementWard)

/** Each cosmos mechanic's trait fields (c: the trait name, boss or not, the power, the seed). */
const COSMOS_TRAIT_ARCHETYPES = Object.freeze({
    critResist: (trait, c) => {
        trait.name = c.name;
        trait.critResistPct = Math.floor((c.isBoss ? 42 : 26) * c.power);
        trait.critDamageResistPct = Math.floor((c.isBoss ? 38 : 22) * c.power);
    },
    critDamageResist: (trait, c) => {
        trait.name = c.name;
        trait.critDamageResistPct = Math.floor((c.isBoss ? 58 : 36) * c.power);
        trait.dr = Math.floor((c.isBoss ? 10 : 6) * c.power);
        trait.armorMul = 1 + (c.isBoss ? 0.85 : 0.55) * c.power;
    },
    comboGuard: (trait, c) => {
        trait.name = c.name;
        trait.hitRateGuard = Math.min(0.28, (c.isBoss ? 0.12 : 0.08) * c.power);
        trait.comboTakenLessPct = Math.min(70, Math.floor((c.isBoss ? 38 : 24) * c.power));
    },
    heavySlow: (trait, c) => {
        trait.name = c.name;
        trait.atkMul = 1 + (c.isBoss ? 0.62 : 0.38) * c.power;
        trait.damageMul = 1 + (c.isBoss ? 0.28 : 0.16) * c.power;
        trait.attackSpeedVarMul = Math.max(0.42, 1 - (c.isBoss ? 0.32 : 0.22) * c.power);
        trait.penetration = Math.floor((c.isBoss ? 8 : 4) * c.power);
    },
    fast: (trait, c) => {
        trait.name = c.name;
        trait.attackSpeedVarMul = 1 + (c.isBoss ? 0.55 : 0.34) * c.power;
        trait.critChanceBonus = Math.floor((c.isBoss ? 12 : 7) * c.power);
        trait.evasionChance = Math.floor((c.isBoss ? 18 : 10) * c.power);
    },
    energyShield: (trait, c) => {
        const esPct = Math.min(100, Math.max(50, Math.floor(50 + ((Math.abs(c.seed || 0) % 51)) + (c.isBoss ? 18 : 0))));
        trait.name = `${c.name} ${esPct}%`;
        trait.energyShieldPct = esPct;
        trait.resAll = Math.floor((c.isBoss ? 8 : 4) * c.power);
    },
    evasion: (trait, c) => {
        trait.name = c.name;
        trait.evasionMul = 1 + (c.isBoss ? 1.65 : 1.05) * c.power;
        trait.evasionChance = Math.min(72, Math.floor((c.isBoss ? 42 : 28) * c.power));
    },
    armor: (trait, c) => {
        trait.name = c.name;
        trait.armorMul = 1 + (c.isBoss ? 2.2 : 1.35) * c.power;
        trait.armorGuard = Math.min(0.72, (c.isBoss ? 0.36 : 0.24) * c.power);
        trait.dr = Math.floor((c.isBoss ? 14 : 8) * c.power);
    }
});
/** The two debuffs a cosmos boss of each mechanic lays on the hero. */
const COSMOS_BOSS_DEBUFF_SETS = Object.freeze({
    critResist: ['cosmos_res_down', 'cosmos_aspd_down'],
    critDamageResist: ['cosmos_regen_down', 'cosmos_res_down'],
    comboGuard: ['cosmos_aspd_down', 'cosmos_leech_down'],
    heavySlow: ['cosmos_res_down', 'cosmos_regen_down'],
    fast: ['cosmos_aspd_down', 'cosmos_leech_down'],
    energyShield: ['cosmos_regen_down', 'cosmos_leech_down'],
    evasion: ['cosmos_aspd_down', 'cosmos_res_down'],
    armor: ['cosmos_leech_down', 'cosmos_regen_down']
});


const getCosmosNonBossHpMultiplier = function (zone, isElite, isBoss) {
    if (isBoss) return 1;
    const galaxy = Math.max(1, Math.min(5, Math.floor(Number(zone && zone.cosmosGalaxy) || 1)));
    const galaxyMultiplier = 4 + (galaxy - 1) * 0.125;
    return galaxyMultiplier * (isElite ? 1.35 : 1);
};


/** The pool a monster's element is picked from: a chaos zone's four, else physical, the zone's own and the four. */
const getEnemyElementPool = zone => (zone.ele === 'chaos' ? ['fire','cold','light','chaos'] : ['phys', zone.ele || 'phys', 'fire', 'cold', 'light', 'chaos']);


/** From loop 4 a deep chaos monster that is not a boss floats 8% of the time. */
const rollEnemySky = (zone, isBoss) => (game.season || 1) >= 4 && zone.type === 'abyss' && !isBoss && Math.random() < 0.08;


/** values[0] for a boss, [1] for an elite, [2] for a normal monster (rank: its isBoss and isElite). */
const byEnemyRank = (rank, values) => (rank.isBoss ? values[0] : (rank.isElite ? values[1] : values[2]));
/** value from loop n on, else 0. */
const fromLoopOn = (n, value) => ((game.season || 1) >= n ? value : 0);
/** source[key] when it is set, else fallback: a trait's or modifier's bonus on a new monster. */
const enemyBonus = (source, key, fallback = 0) => (source && source[key] ? source[key] : fallback);
/** A finite reward scale of at least 1 from source (a trait's exp or drop scale), else 1. */
const enemyRewardMul = (source, key) => (source && Number.isFinite(source[key]) ? Math.max(1, source[key]) : 1);
/** The boundary's scale of key (at least 1) beyond the boundary, else 1. */
const boundaryMul = (zone, key) => (zone.type === 'beyondBoundary' ? Math.max(1, Number(zone[key]) || 1) : 1);

/** The meteor core resists its own element by 12 more (to 95); a physical one takes 12 less physical damage instead (to 90). */
const METEOR_CORE_GUARD = Object.freeze({ fire: 'resF', cold: 'resC', light: 'resL', chaos: 'resChaos', phys: 'dr' });


const getChaosRealmEncounterProfile = function (zone) {
    let floor = Math.max(1, Math.floor(zone.floor || 1));
    return {
        markerCount: Math.min(16, 4 + Math.floor(floor / 8)),
        minPack: 2,
        maxPack: Math.min(8, 3 + Math.floor(floor / 6)),
        eliteChance: 0.35,
        bossAdds: Math.min(6, 2 + Math.floor(floor / 12)),
        label: _t('혼돈계 {floor}층', { floor })
    };
};

const getUnderworldEncounterProfile = function (zone) {
    let floor = Math.max(1, Math.floor(zone.floor || 1));
    let minPack = Math.min(7, 3 + Math.floor(floor / 12));
    let maxPack = Math.max(minPack, Math.min(9, minPack + 2 + Math.floor(floor / 20)));
    return {
        markerCount: Math.min(16, 5 + Math.floor(floor / 8)), minPack, maxPack,
        eliteChance: Math.min(0.55, 0.2 + floor * 0.012),
        bossAdds: Math.min(6, 2 + Math.floor(floor / 20)), label: _t('지하계 {floor}층', { floor })
    };
};

const getLabyrinthEncounterProfile = function (zone) {
    let floor = Math.max(1, Math.floor(zone.floor || 1));
    let minPack = Math.min(7, 2 + Math.floor(floor / 10));
    let maxPack = Math.max(minPack, Math.min(9, minPack + 2));
    return {
        markerCount: Math.min(18, 5 + Math.floor(floor / 5)), minPack, maxPack,
        eliteChance: Math.min(0.46, 0.14 + floor * 0.009),
        bossAdds: floor % 5 === 0 ? 2 : 1, label: _t('미궁 {floor}층', { floor })
    };
};

const getAbyssEncounterProfile = function (zone) {
    let scale = getAbyssMonsterScales(zone);
    let depth = Math.max(1, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1));
    let minPack = Math.max(1, Math.floor((2 + Math.floor(zone.tier / 7)) * (scale.hordeMul || 1)));
    let maxPack = Math.max(minPack, Math.floor(Math.min(10, 4 + Math.floor(zone.tier * 0.42)) * (scale.hordeMul || 1)));
    let markerCount = Math.max(6, Math.floor((8 + Math.floor(zone.tier * 0.48)) * (scale.mapLengthMul || 1)));
    let bossAdds = 2 + Math.floor(zone.tier / 4);
    if (depth >= 21) {
        minPack = Math.min(7, minPack);
        maxPack = Math.max(minPack, Math.min(11, maxPack));
        markerCount = Math.min(20, markerCount);
        bossAdds = Math.min(7, bossAdds);
    }
    return {
        markerCount, minPack, maxPack,
        eliteChance: Math.min(0.8, 0.13 + zone.tier * 0.012 + (scale.eliteBonus || 0)),
        bossAdds, label: _t('{minPack}-{maxPack}기', { minPack, maxPack })
    };
};


safeExposeGlobals({ getSkillTargets, updatePlayerGridEngagement, applySkillMobilityBeforeAttack, createEnemy, grantChaosRealmFloorBonus, maybeUnlockChaosRealmFromWoodsman });
