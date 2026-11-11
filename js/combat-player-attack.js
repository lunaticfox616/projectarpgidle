// 주인공의 공격: 키스톤 배율, 투사체 발사, 스킬 적중과 지속 피해 (2026-11-10에 js/combat.js에서 그대로 옮겼다. js/combat.js 뒤에 옮기기 전과 같은 순서로 읽는다.)
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
/** 포션 스킬 키스톤의 명중 피해 배율: 폭발성 증류 ×0.75, 과잉 투여 ×1.5. */
function getPotionKeystoneHitScale(flags) {
    return (flags.explosiveDistill ? 0.75 : 1) * (flags.potionOverdose ? 1.5 : 1);
}

/** 키스톤의 공격 · 시전 속도 감폭: 한 번의 중량 ×0.7, 과잉 투여(포션 스킬) ×0.75. 감폭이 없으면 그대로. */
function scaleKeystoneAttackSpeed(aspd, flags) {
    const scale = (flags.maximumRoll ? 0.7 : 1) * (flags.potionOverdose ? 0.75 : 1);
    return scale < 1 ? Math.max(0.1, aspd * scale) : aspd;
}

/** 천 개의 유리병(고유 허리띠): 예전 물약 넷의 약한 상시 효과. */
function addThousandBottlesStats(bucket) {
    addStatToBucket(bucket, 'armorPct', 25);
    addStatToBucket(bucket, 'resAll', 12);
    addStatToBucket(bucket, 'aspd', 8);
    addStatToBucket(bucket, 'pctDmg', 10);
}

function getPassiveKeystoneHitMultiplier(pStats, target, hitIndex, targetIndex, skillName) {
    const flags = pStats.passiveKeystoneFlags || {};
    let multiplier = 1;
    if (flags.farshot && game.gridPlayer && Number.isFinite(target.gx)) {
        let distance = getGridUnitDistance(game.gridPlayer, target);
        multiplier *= distance >= 3 ? 1.25 : (distance <= 1 ? 0.75 : 1);
    }
    if (flags.projectileFormation && targetIndex > 0) multiplier *= 0.6;
    multiplier *= getPotionKeystoneHitScale(flags);
    if (flags.erosionLegacy && pStats.sSkill.ele === 'chaos') multiplier *= 0.85;
    if (flags.openingHunt) {
        multiplier *= target.passiveOpeningHuntConsumed ? 0.8 : 2;
        target.passiveOpeningHuntConsumed = true;
    }
    if (!flags.channelPath) return multiplier;
    if (!(pStats.sSkill.tags || []).includes('channeling')) {
        game.passiveChannelPath = null;
        return multiplier * 0.8;
    }
    let state = game.passiveChannelPath || {};
    if (hitIndex === 0 && targetIndex === 0) {
        let sameTarget = state.skillName === skillName && String(state.targetId) === String(target.id);
        state = { skillName, targetId: target.id, stacks: sameTarget ? Math.min(6, (state.stacks || 0) + 1) : 1 };
        game.passiveChannelPath = state;
    }
    return multiplier * (1 + Math.max(0, state.stacks || 0) * 0.07);
}

/** Emit confirmed hit presentation, carrying the immutable cast-time attack cells. */
function addPlayerHitVisualFx(pStats, options, targetEnemy, hit) {
    let { stageKind, stageLabel, stageCount, skillName, hitCrit, hitIdx, hitElement, dealtToEnemy, dmg, isStageReplay } = hit;
    addBattleFx('hit', {
        enemyId: targetEnemy.id, targetCell: hasGridCell(targetEnemy) ? getGridUnitCenter(targetEnemy) : null, channelId: options.channelId, color: getElementColor(hitElement), crit: hitCrit,
        projectile: (pStats.sSkill.tags || []).includes('projectile'),
        pierce: pStats.sSkill.targetMode === 'pierce' || stageKind === 'piercePrimary' || stageKind === 'pierceThrough',
        chain: pStats.sSkill.targetMode === 'chain' || stageKind === 'chainJump',
        slam: stageKind === 'slamPrimary' || stageKind === 'slamAftershock',
        stageKind, stageLabel, stageIndex: Math.max(0, Math.floor(Number(options.stageIndex) || 0)),
        repeatIndex: hitIdx, stageCount, chainFromEnemyId: options.chainFromEnemyId,
        skillName: pStats.sSkill.visualName || skillName, damage: dealtToEnemy, rawDamage: dmg,
        damageTextGroupId: options.damageTextGroupId || '', attackFootprint: options.attackFootprint, sourceCell: options.sourceCell,
        duration: 320, element: hitElement, syncToSwing: !isStageReplay, resolvedSkillContact: isStageReplay
    });
}

/** Combat owns damage and movement; gem controllers only return scheduled commands. */
function startSkillGemCombat(stats, options) {
    skillGemCombatRuntime ??= skillGemCasts.createState();
    const name=options.skillName || game.activeSkill;
    initializeSkillGemFacing();
    if (skillGemRuntimeChanged(name)) skillGemCombatRuntime=skillGemCasts.createState();
    const started=skillGemCasts.start(skillGemCombatRuntime,{id:stats.sSkill.nativeCastId,name,stats,
        source:game.gridPlayer,enemies:game.enemies,now:getCombatTime(),visuals:!game.isBackgroundCalculation,
        attackOptions:{forcedCrit:options.forcedCrit,forcedElement:options.forcedElement,
            attackDamageMultiplier:options.attackDamageMultiplier,talentAttackMultiplier:options.talentAttackMultiplier,
            passiveKarmaContext:options.passiveKarmaContext}});
    if (!started) return;
    noteNativeGemSwing(name, stats);
    noteCombatTacticAttack(300);
}

/** 이동기 4종 swing their weapon once at the move's key moment (the tear, the puff, the release, the slam); 암살 kicks off before it
 * vanishes (cast.swing, pose 'kickoff'). */
function noteNativeGemSwing(name, stats) {
    const cast = skillGemCombatRuntime.casts.at(-1), swing = cast && (cast.move ? cast.move.swing : cast.swing);
    if (!swing || game.isBackgroundCalculation) return;
    addBattleFx('playerSwing', { skillName: name, element: stats.sSkill.ele, color: getElementColor(stats.sSkill.ele), pose: swing.pose, contactFrame: swing.contactFrame,
        sourceCell: copyCombatGridCell(game.gridPlayer), impactDelayMs: swing.impact - cast.at, duration: Math.max(80, swing.until - cast.at) });
}

/** 전도성 난격: each arrival strikes at once, so the hero shows the rune's 단타 pose beside the foe (js/skill-gem-casts.js 70); 암살's
 * arrival stabs; 작살화살's pose command hauls on the rope (pose 'pull'). */
function noteNativeGemArrivalSwing(command) {
    if (game.isBackgroundCalculation) return;
    addBattleFx('playerSwing', { skillName: command.name, element: command.element, color: getElementColor(command.element), pose: command.swing.pose,
        sourceCell: copyCombatGridCell(game.gridPlayer), impactDelayMs: command.swing.impactDelayMs, duration: command.swing.duration });
}

function shouldDeferNativeGemCast(stats,options) {
    if (options.stageReplay || !stats.sSkill.nativeCastId) return false;
    if (hasPlayerChannelBreakingAilment() || game.combatHalted) return true;
    if (!skillGemCombatRuntime) return false;
    return skillGemCasts.singleCast.has(stats.sSkill.nativeCastId) && skillGemCombatRuntime.casts.some(c=>c.id===stats.sSkill.nativeCastId);
}

function getAttackProjectileShots(stats) {
    return stats.sSkill.nativeCastId ? stats.projectileExtraShots : rollProjectileExtraShots(stats.projectileExtraShots);
}

function updateSkillGemCombat(stats) {
    const runtime=skillGemCombatRuntime;
    if (!runtime) return;
    if (game.combatHalted || game.playerHp<=0 || skillGemRuntimeChanged(game.activeSkill)) {
        skillGemCombatRuntime=null;cancelCombatChannel();return;
    }
    const commands=skillGemCasts.update(runtime,{source:game.gridPlayer,enemies:game.enemies.concat(getSplashDormantEnemies()),now:getCombatTime()});
    for (const command of commands) applySkillGemCommand(command,stats);
}

/** The main gem's native casts, then the mobility slot's own (js/mobility-skill.js). */
function advanceSkillGemCasts(stats) {
    window.GameModules.combat.supports.tickDots();
    updateSkillGemCombat(stats);
    mobilitySkill.advance();
}

function skillGemRuntimeChanged(name) {
    return !!skillGemCombatRuntime.lastSkill && skillGemCombatRuntime.lastSkill!==name;
}

function initializeSkillGemFacing() {
    for (const enemy of game.enemies) if (!enemy.facingDirection) enemy.facingDirection=skillGemCasts.facing(enemy,game.gridPlayer);
}

/** 석화(79 석화 혼합물, 2026-11-01): 움직이지도 공격하지도 못한다. 행동을 멈추는 일은 기절과 같고(js/enemy-attack-rules.js), 밀리지 않고(pushEnemyAwayOnHit) 그림은 돌빛이다.
 * 보스는 굳지 않는다: 던지는 간격이 굳는 시간보다 짧아 보스의 패턴이 통째로 멈추기 때문이다. 이미 굳었으면 시간만 다시 채운다. */
function petrifyEnemy(enemy,at,seconds) {
    if (enemy.isBoss) return;
    enemy.ailments=Array.isArray(enemy.ailments)?enemy.ailments:[];
    const row=enemy.ailments.find(ail=>ail && ail.petrified);
    if (row) row.time=Math.max(row.time || 0,seconds);
    else enemy.ailments.push({type:'stun',time:seconds,power:0,petrified:true,petrifiedAt:at});
}

function enemyTimeSlowed(enemy) {
    const left=(Number(enemy.timeSlowUntil)||0)-getCombatTime();
    return left>0 && left<=TIME_SLOW_MS;
}

/** 끌어당김 한 번: 보스와 굳은 적은 끌려오지 않는다(밀어내기와 같다, canPushEnemy). */
function pullEnemyToward(enemy,command) {
    if (!canPushEnemy(enemy)) return;
    const goal=command.column===undefined ? command.center : { gx: command.column, gy: enemy.gy };
    for (let step=0; step<command.cells; step++) if (!gridStepToward(enemy,goal.gx,goal.gy,getGridBlockedCells(enemy))) break;
}

function applySkillGemCommand(command,stats) {
    if (command.type==='pose') return noteNativeGemArrivalSwing(command);
    if (command.type === 'bellToll') {
        if (!game.isBackgroundCalculation) addBattleFx('bellToll', { duration: 180 });
        return;
    }
    if (command.type==='teleport') {
        if (!skillGemCasts.free(command.to,game.enemies.filter(e=>e.hp>0))) return;
        actExplorationMotion.cancel(game.actExploration);
        Object.assign(game.gridPlayer,command.to);
        addBattleFx('playerMobility',{skillName:command.name,fromCell:command.from,toCell:command.to,instant:true,duration:180});
        if (command.swing) noteNativeGemArrivalSwing(command);
        return;
    }
    actExplorationProgress.objects.area(command.splashCells);
    actExplorationState.wake(game,getSplashDormantEnemies().filter(e=>command.targets.includes(e.id)));
    const targets=game.enemies.filter(e=>e.hp>0 && command.targets.includes(e.id));
    if (SKILL_GEM_MARKS[command.type]) return SKILL_GEM_MARKS[command.type](command,targets);
    if (command.type==='dot') return applySkillGemDot(command,targets);
    if (!targets.length) return;
    applySkillGemContact(command,targets,stats);
}

function applySkillGemDot(command,targets) {
    for (const enemy of targets) {
        const stats=command.stats,mitigation=getEffectiveEnemyMitigation('chaos',getZone(game.currentZoneId).tier,enemy,stats);
        const attackMultiplier=command.attackOptions?.attackDamageMultiplier ?? 1;
        const damage=applyDamageToEnemyResource(enemy,Math.floor(Math.max(1,Math.floor(stats.baseDmg*stats.dotDamageScale*attackMultiplier*(1-mitigation/100)))*loopMutation.takenMul(enemy,'chaos')));
        addBattleFx('hit',{enemyId:enemy.id,damage,element:'chaos',color:getElementColor('chaos'),duration:240,
            noLine:true,dot:true,resolvedSkillContact:true});
        if (enemy.hp<=0) handleEnemyDeath(enemy,stats);
    }
}

function applySkillGemContact(command,targets) {
    const stats=command.stats;
    const before=targets.map(e=>e.hp+(e.energyShield||0));
    performPlayerAttack({...stats,projectileExtraShots:0},{...command.attackOptions,stageReplay:true,skillName:command.name,
        sourceCell:command.sourceCell,targetEntries:targets.map(e=>({enemyId:e.id,mult:1})),stageRepeatOnce:true,
        restrictRandomTargets:true,skipSlamEcho:true,skipGridControl:true,
        hitDamageMultiplier:(command.bonus?PROJECTILE_BONUS_SHOT_DAMAGE_PCT/100:1)*(command.damagePct??100)/100,damageTextGroupId:command.key});
    window.GameModules.combat.supports.repeatNative(command, targets);
    window.GameModules.combat.supports.augmentNative(command, targets);
    if (!command.ailment) return;
    targets.forEach((enemy,i)=>{
        if (enemy.hp<=0 || enemy.hp+(enemy.energyShield||0)>=before[i]) return;
        const ele=command.ailment==='poison'?'chaos':'phys';
        applyEnemyAilmentFromHit(enemy,{...stats,sSkill:{...stats.sSkill,ele}},stats.baseDmg,false,{primaryAilmentChance:1});
        if (enemy.hp<=0) handleEnemyDeath(enemy,stats); // 촉매 ct8 터뜨림이 쓰러뜨린 적(타격의 죽음 처리는 이미 지났다)
    });
}

function getDefeatRecoveryZoneId() {
    let frontier = Math.max(0, Math.floor(Number(game.maxZoneId) || 0));
    return getZone(frontier) ? frontier : 0;
}

function recordPlayerDefeatStart(zone, options) {
    cosmosRouteRuntime.leave(game, 'failed');
    resetHiddenJournalBossRun();
    addBattleFx('playerDown', { color: '#ff6b6b', duration: 600 });
    dispatchRuntimeEvent('player-defeated', {
        zoneId: zone && zone.id,
        zoneType: zone && zone.type,
        contentContext: getEncounterTelemetryContext(zone),
        background: !!game.isBackgroundCalculation,
        noToast: !!options.noToast
    });
}

/** 자동 진행(다음 지역) 중 스토리 액트에서 쓰러지면 바로 앞 액트로 물러난다 — 같은 무리에 거듭 쓰러지며 탐험 전리품을
 * 잃던 반복을 끊는다. ACT_RETREAT_LEVELS만큼 오르면 holdActRetreat가 다시 앞 액트로 보낸다. Returns the retreat zone name ('' = stays). */
function retreatAfterActDefeat(zone) {
    if (zone?.type !== 'act' || !(zone.id > 0)) return '';
    if ((game.settings.mapCompleteAction || 'nextZone') !== 'nextZone') return '';
    const target = getZone(zone.id - 1);
    if (target?.type !== 'act') return '';
    game.actRetreat = { frontierZoneId: zone.id, level: game.level };
    game.currentZoneId = target.id;
    game.killsInZone = 0;
    return target.name;
}

/** 지금까지 연 구역의 캠페인 패널티(모든 원소 저항과 카오스 저항에서 뺄 값). */
function getCampaignResistPenalty(maxZoneId) {
    return CAMPAIGN_RESIST_PENALTY.zones.filter(zoneId => maxZoneId >= zoneId).length * CAMPAIGN_RESIST_PENALTY.each;
}

exposeFileGlobals({ scaleKeystoneAttackSpeed, addThousandBottlesStats, getPassiveKeystoneHitMultiplier, addPlayerHitVisualFx, startSkillGemCombat, noteNativeGemSwing, shouldDeferNativeGemCast, getAttackProjectileShots, updateSkillGemCombat, advanceSkillGemCasts, skillGemRuntimeChanged, petrifyEnemy, enemyTimeSlowed, pullEnemyToward, getDefeatRecoveryZoneId, recordPlayerDefeatStart, retreatAfterActDefeat, getCampaignResistPenalty });
})();


const isEnemyPetrified=enemy=>Array.isArray(enemy.ailments) && enemy.ailments.some(ail=>ail && ail.petrified && ail.time>0);
/** 시간의 사선(80)의 이동 둔화가 남은 적인가: 저장에서 불러와 전투 시계가 앞서가도 그 길이 안에서만 믿는다. */
const TIME_SLOW_MS=1300,TIME_SLOW_MOVE=0.3;
/** 사슬처럼 따로 시전하는 룬이 적에게 남기는 표시(피해 없음). 끌어당김(2026-11-08 전달본 V3.13의 특이점 분리, 공허의 빙의)은 그 칸 쪽으로 cells걸음까지,
 * column이 있으면 그 세로줄 쪽으로(같은 줄을 지킨다). 약화(공허의 빙의)는 받는 피해를 늘린다(applyVoidWeakMitigation). */
const SKILL_GEM_MARKS=Object.freeze({
    mist(command,targets) { for (const enemy of targets) enemy.holyMistUntil=command.at+4000; },
    petrify(command,targets) { for (const enemy of targets) petrifyEnemy(enemy,command.at,command.ms/1000); },
    timeSlow(command,targets) { for (const enemy of targets) enemy.timeSlowUntil=command.at+command.ms; },
    pull(command,targets) { for (const enemy of targets) pullEnemyToward(enemy,command); },
    weaken(command,targets) { for (const enemy of targets) enemy.voidWeakUntil=command.at+command.ms; }
});


function performPlayerAttack(pStats, attackOptions) {
    let options = attackOptions || {};
    if (window.GameModules.combat.supports.deferAttack(pStats, options)) return;
    // 예약된 시간차 타격은 같은 카운터를 공유하되, 다음 공격은 항상 새 카운터로 시작한다.
    let attackHitGuardCounts = options.attackHitGuardCounts instanceof Map ? options.attackHitGuardCounts : new Map();
    let isStageReplay = !!options.stageReplay;
    if (!isStageReplay) pStats = { ...pStats, projectileExtraShots: getAttackProjectileShots(pStats) };
    if (!isStageReplay && typeof isTalentPlayerAttackDisabled === 'function' && isTalentPlayerAttackDisabled()) return;
    let skillName = options.skillName || game.activeSkill;
    let channelContinuationRequested = !isStageReplay && consumeCombatChannelContinuation(skillName);
    if (!isStageReplay && Array.isArray(game.queenBees) && game.queenBees.length > 0) {
        let now = getCombatTime();
        game.queenBees = game.queenBees.filter(bee => bee && (bee.expiresAt || 0) > now && (bee.attacksLeft || 0) > 0);
        game.queenBees.forEach(bee => {
            if (now < (bee.nextAt || 0)) return;
            bee.nextAt = now + 1000;
            bee.attacksLeft = Math.max(0, Math.floor((bee.attacksLeft || 0) - 1));
            let target = (game.enemies || []).find(e => e && e.hp > 0);
            if (!target) return;
            let beeDmg = Math.max(1, Math.floor((pStats.baseDmg || 1) * ((bee.hitPct || 125) / 100)));
            applyDamageToEnemyResource(target, beeDmg);
        });
    }
    if (!isStageReplay) prepareTalentPlayerAttackContext(pStats);
    // 14 콜로세움 브레이커: 5처치 충전 시 다음 공격을 투기장 일격(광역 5 + 피해 120% 증폭, 단일이면 +20%)으로
    let colosseumStrikeMul = Math.max(0, Number(options.attackDamageMultiplier) || 1), colosseumSavedTargets = null;
    if (!isStageReplay && typeof isTalentCardActive === 'function' && isTalentCardActive('hero2__gladiator') && game.talentRuntime && game.talentRuntime.colosseumReady) {
        game.talentRuntime.colosseumReady = false;
        let aliveCount = (game.enemies || []).filter(e => e && e.hp > 0).length;
        colosseumStrikeMul = 2.2 * (aliveCount <= 1 ? 1.2 : 1);
        colosseumSavedTargets = pStats.sSkill.targets;
        pStats.sSkill.targets = Math.max(5, pStats.sSkill.targets || 1);
    }
    let targets = isStageReplay ? (options.targetEntries || []).map(entry => {
        let enemy = (game.enemies || []).find(row => row && row.id === entry.enemyId && row.hp > 0);
        return enemy ? { enemy: enemy, mult: Math.max(0, Number(entry.mult) || 1) } : null;
    }).filter(Boolean) : getAttackTargets(pStats);
    if (colosseumSavedTargets !== null) pStats.sSkill.targets = colosseumSavedTargets;
    if (targets.length === 0) return;
    let passiveKarmaContext = options.passiveKarmaContext || null;
    if (!isStageReplay && typeof beginPassiveKarmaAttack === 'function') {
        passiveKarmaContext = beginPassiveKarmaAttack(targets[0].enemy, getCombatTime());
    }
    if (!isStageReplay) colosseumStrikeMul *= consumeLoneEvasionCounterMultiplier(pStats, getCombatTime());
    let { landingMs, kickoff } = beginSkillMobility(pStats, targets[0].enemy, isStageReplay);
    let talentMoonReturn = !isStageReplay && typeof getTalentMoonReturnConfig === 'function'
        ? getTalentMoonReturnConfig(targets)
        : null;
    let pendingStages = [];
    let stageKind = options.stageKind || 'primary';
    let stageLabel = options.stageLabel || '직격';
    let stageCount = Math.max(1, Math.floor(Number(options.stageCount) || 1));
    let stageDamageMultiplier = Number.isFinite(Number(options.hitDamageMultiplier)) ? Math.max(0, Number(options.hitDamageMultiplier)) : 1;
    if (!isStageReplay && typeof buildSkillHitSequence === 'function') {
        let sequence = buildSkillHitSequence(skillName, pStats.sSkill, targets);
        if (sequence.length > 0) {
            let firstStage = sequence[0];
            stageKind = firstStage.kind;
            stageLabel = firstStage.label;
            stageCount = sequence.length;
            stageDamageMultiplier = Math.max(0, Number(firstStage.damageMultiplier) || 0);
            pendingStages = sequence;
        }
    }
    let isDotSkill = window.GameModules.combat.supports.nativeDot(pStats.sSkill);
    let previousFanaticismStacks = Math.max(0, Number(pStats.passiveFanaticismStacks) || 0);
    let currentFanaticismStacks = !isStageReplay && typeof recordPassiveFanaticSkillUse === 'function'
        ? recordPassiveFanaticSkillUse(skillName, pStats.devotion) : previousFanaticismStacks;

    // 키스톤으로 보장된 치명타(암살자 a5, 촉매 ct7 공격 스킬)는 적 치명타 저항 굴림도 무시한다.
    let guaranteedCrit = (hasKeystone('a5'))
        || (hasKeystone('ct7') && Array.isArray(pStats.sSkill.tags) && pStats.sSkill.tags.includes('attack'));
    let isCrit = options.forcedCrit !== undefined ? !!options.forcedCrit
        : (guaranteedCrit || (typeof rollTalentPlayerCrit === 'function' ? rollTalentPlayerCrit(pStats.crit) : Math.random() < (pStats.crit / 100)));
    if (!isStageReplay && typeof talentOnPlayerAttack === 'function') talentOnPlayerAttack(pStats, isCrit);
    if (!isStageReplay && hasKeystone('w2') && isCrit) {
        let now = getCombatTime();
        let active = (game.warriorRhythmExpiresAt || 0) > now;
        let stacks = active ? Math.max(0, Math.min(5, Math.floor(game.warriorRhythmStacks || 0))) : 0;
        game.warriorRhythmStacks = Math.min(5, stacks + 1);
        game.warriorRhythmExpiresAt = now + 2000;
    }
    if (!isStageReplay && hasKeystone('g3')) {
        game.gladiatorVeteranCritBonus = Math.max(0, Math.floor(game.gladiatorVeteranCritBonus || 0));
        if (isCrit) game.gladiatorVeteranCritBonus = 0;
        else game.gladiatorVeteranCritBonus = Math.min(100, game.gladiatorVeteranCritBonus + 5);
    }
    let preloadElementalistStacks = getElementalistOverloadStacks();
    if (!isStageReplay && hasKeystone('e8')) {
        recordElementalistOverloadAttack(isCrit);
    }
    if (currentFanaticismStacks !== previousFanaticismStacks) {
        let previousMultiplier = 1 + previousFanaticismStacks * 0.015;
        let currentMultiplier = 1 + currentFanaticismStacks * 0.015;
        colosseumStrikeMul *= currentMultiplier / previousMultiplier;
    }
    let riderCompassReady = !!(pStats.uniqueRiderCompass && (game.lastMoveEndedAt || 0) > 0 && !game.uniqueRiderCompassConsumed);
    // This multiplier travels with the cast. Per-contact critical rolls remain in the hit resolver.
    // 피의 계약(워록 wlk7): 공격마다 생명력의 4%를 소모 가능하면 소모하여 해당 공격의 피해를 1.5배로 만든다.
    if (!isStageReplay && hasKeystone('wlk7')) {
        let bloodPactCost = Math.floor((pStats.maxHp || game.playerHp || 1) * 0.04);
        if (bloodPactCost > 0 && (game.playerHp || 0) > bloodPactCost) {
            game.playerHp -= bloodPactCost;
            colosseumStrikeMul *= 1 + ASCENDANCY_KEYSTONE_VALUES.wlk7.bloodPactMorePct / 100;
        }
    }
    // 공허 특이점(워록 wlk6): 공격 피해가 100%~(100+(저항관통+치명타 피해 배율)의 rangePct%)% 사이에서 균등 분포로 결정된다.
    if (!isStageReplay && hasKeystone('wlk6')) {
        let singularityMaxPct = 100 + (Math.max(0, pStats.resPen || 0) + Math.max(0, pStats.critDmg || 0)) * ASCENDANCY_KEYSTONE_VALUES.wlk6.rangePct / 100;
        let singularityPct = 100 + Math.random() * Math.max(0, singularityMaxPct - 100);
        colosseumStrikeMul *= singularityPct / 100;
    }
    let getHitElement = () => {
        let pool = Array.isArray(pStats.sSkill.randomElementPool) ? pStats.sSkill.randomElementPool.filter(Boolean) : null;
        if (pool && pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
        return pStats.sSkill.ele || 'phys';
    };
    let swingElement = options.forcedElement || getHitElement();
    if (!['phys','fire','cold','light','chaos'].includes(swingElement)) swingElement = (pStats.sSkill && pStats.sSkill.ele) || 'phys';
    if (typeof getTalentDamageConversion === 'function') swingElement = getTalentDamageConversion(swingElement).element;
    let talentAttackMul = Number.isFinite(Number(options.talentAttackMultiplier))
        ? Math.max(0, Number(options.talentAttackMultiplier))
        : getTalentPlayerAttackDamageMultiplier();
    if (!isStageReplay) {
        queuePlayerAttackSequence(pStats, pendingStages, {
            skillName, forcedCrit: isCrit, forcedElement: swingElement, stageCount,
            talentAttackMultiplier: talentAttackMul, attackDamageMultiplier: colosseumStrikeMul,
            talentMoonReturn, attackHitGuardCounts, passiveKarmaContext,
            channelContinuation: channelContinuationRequested, repeatChannelCast: !!options.repeatChannelCast, landingMs, kickoff
        });
        return;
    }

    let zoneTier = getZone(game.currentZoneId).tier;
    let slamEchoPct = 0;
    let slamEchoDelayMs = 1000;
    let slamEchoGuaranteed = false;
    let passiveSlamEchoChance = Math.max(0, Math.min(100, pStats.slamEchoChance || 0)) / 100;
    if (passiveSlamEchoChance > 0 && Array.isArray(pStats.sSkill.tags) && pStats.sSkill.tags.includes('slam')) slamEchoPct = Math.max(slamEchoPct, Math.max(0.25, (Number(pStats.slamEchoDamagePct || 0) / 100)));
    talismanCombat.active().forEach(({ delta }) => {
        if (delta.slamEchoPct) { slamEchoPct = Math.max(slamEchoPct, delta.slamEchoPct); slamEchoGuaranteed = true; }
        if (delta.slamEchoDelaySec) slamEchoDelayMs = Math.max(100, Math.floor(delta.slamEchoDelaySec * 1000));
    });
    let hits = [];
    let totalLeechableDamage = 0;
    let totalChaosDamage = 0;
    let talentMoonPrimaryHit = false;
    let hasSkillConditionalFeedback = !!(pStats.sSkill.activeAilmentDamageMore
        || (pStats.sSkill.consumeAilmentDamageMore || []).length
        || pStats.sSkill.fullLifeDamageMorePct || pStats.sSkill.distanceDamageMoreCapPct);
    let isProjectileSkill = Array.isArray(pStats.sSkill.tags) && pStats.sSkill.tags.includes('projectile');
    let isFanProjectile = isProjectileSkill && pStats.sSkill.projectilePattern && pStats.sSkill.projectilePattern.kind === 'fan';
    let projectileBonusShots = isProjectileSkill && !isFanProjectile ? Math.max(0, Math.floor(pStats.projectileExtraShots || 0)) : 0;
    let curseProjectileExtraHits = 0;
    if (isProjectileSkill) {
        let aliveEnemies = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0);
        for (let enemy of aliveEnemies) {
            let fx = getEnemyConditionDebuffFactor(enemy);
            curseProjectileExtraHits = Math.max(curseProjectileExtraHits, Math.max(0, Math.floor(fx.projectileExtraHits || 0)));
        }
    }
    let projectileRepeatPct = isProjectileSkill ? Math.max(0, Number(pStats.uniqueProjectileDoubleStrikePct) || 0) : 0;
    let uniqueProjectileExtraHits = Math.floor(projectileRepeatPct / 100);
    if (isProjectileSkill && Math.random() * 100 < (projectileRepeatPct % 100)) uniqueProjectileExtraHits += 1;
    let chanceProjExtraShots = (isProjectileSkill && pStats.uniqueProjExtraShotChance && Math.random() * 100 < Number(pStats.uniqueProjExtraShotChance.chance || 0)) ? Math.max(0, Math.floor(pStats.uniqueProjExtraShotChance.shots || 0)) : 0;
    let addedProjectileRepeatCount = projectileBonusShots + chanceProjExtraShots + curseProjectileExtraHits + uniqueProjectileExtraHits;
    let nativeRepeats = options.stageRepeatOnce ? 1 : Math.max(1, Math.floor(pStats.sSkill.multiHit || 1));
    let repeats = Math.max(1, Math.min(12, nativeRepeats + addedProjectileRepeatCount));
    let baseRepeats = nativeRepeats;
    if (hasKeystone('h7')) {
        pStats.sSkill.targets = 1;
    }
    let perEnemyHitCount = new Map();
    let originalPierceTargets = new Set(targets.map(entry => entry && entry.enemy).filter(Boolean));
    let pierceOverkillCarryStartedTargets = new Set();
    let hitSummary = { totalHits: 0, totalDamage: 0, uniqueTargets: new Set() };
    let attackFeedbackGroup = options.damageTextGroupId ? String(options.damageTextGroupId) : '';
    let attackFeedbackKeys = new Set();
    function showAttackFeedback(enemy, cue) {
        if (!cue || !cue.key || !cue.text || attackFeedbackKeys.has(cue.key)) return;
        attackFeedbackKeys.add(cue.key);
        addBattleFx('statusText', {
            enemyId: enemy && enemy.id,
            text: cue.text,
            color: cue.color || '#f3d9a4',
            duration: 900,
            dedupeKey: attackFeedbackGroup ? `attack:${attackFeedbackGroup}:${cue.key}` : '',
            dedupeWindowMs: 1400
        });
    }
    function applyPierceOverkillCarry(sourceEnemy, carryDamage, hitElement, hitCrit, ailmentCarrySourceDamage) {
        let hunterSinglePierce = hasKeystone('h4') && (game.enemies || []).filter(e => e && e.hp > 0).length === 1;
        if ((!pStats.sSkill.pierceOverkillCarry && !hunterSinglePierce) || carryDamage <= 0) return;
        let remainingDamage = Math.max(0, Math.floor(carryDamage));
        let remainingAilmentSourceDamage = Math.max(0, Math.floor(Number(ailmentCarrySourceDamage !== undefined ? ailmentCarrySourceDamage : carryDamage) || 0));
        let visited = new Set(sourceEnemy && sourceEnemy.id ? [sourceEnemy.id] : []);
        let chainSource = sourceEnemy;
        let chainLimit = Math.max(1, Math.min(12, Math.floor(pStats.sSkill.targets || 1)));
        for (let chainIdx = 0; chainIdx < chainLimit && remainingDamage > 0; chainIdx++) {
            let chainTarget = (game.enemies || []).find(enemy => enemy && enemy.hp > 0 && !visited.has(enemy.id)
                && (!pStats.sSkill.pierceOverkillCarry || !originalPierceTargets.has(enemy)));
            if (!chainTarget) return;
            visited.add(chainTarget.id);
            let zone = getZone(game.currentZoneId);
            let chainRes = getEffectiveEnemyMitigation(hitElement, zone.tier, chainTarget, pStats);
            let chainDamage = Math.floor(remainingDamage * (1 - chainRes / 100) * mutationHitScale(chainTarget, hitElement));
            if ((pStats.sSkill.tags || []).includes('projectile')) chainDamage = Math.floor(chainDamage * (chainTarget.projectileDamageTakenMul || 1));
            if (hitElement === 'phys') chainDamage = Math.floor(chainDamage * (chainTarget.physicalDamageTakenMul || 1));
            let dealtToChain = applyDamageToEnemyResource(chainTarget, Math.max(1, chainDamage));
            maybeUnlockChaosRealmFromWoodsman(chainTarget);
            chainTarget.recentHitsTaken = (chainTarget.recentHitsTaken || 0) + 1;
            chainTarget.recentHitsTimer = 1.8;
            totalLeechableDamage += dealtToChain * (chainTarget && chainTarget.leechEffMul !== undefined ? chainTarget.leechEffMul : 1);
            hits.push(dealtToChain);
            notePlayerHitSummary(hitSummary, chainTarget, dealtToChain);
            addBattleFx('hit', {
                enemyId: chainTarget.id,
                color: getElementColor(hitElement),
                crit: hitCrit,
                projectile: true,
                chain: true,
                stageKind: 'chainJump',
                chainFromEnemyId: chainSource && chainSource.id,
                skillName: skillName,
                damage: dealtToChain,
                duration: 320,
                element: hitElement,
                syncToSwing: true
            });
            applyEnemyAilmentFromHit(chainTarget, { ...pStats, sSkill: { ...pStats.sSkill, ele: hitElement } }, remainingDamage, hitCrit, {
                ailmentSourceDamage: remainingAilmentSourceDamage,
                critDotBonusPct: hitCrit ? 50 : 0
            });
            if (chainTarget.hp <= 0) {
                let prevRemainingDamage = remainingDamage;
                remainingDamage = Math.max(0, Math.floor((remainingDamage - dealtToChain) * 0.8));
                let carryRatio = prevRemainingDamage > 0 ? (remainingDamage / prevRemainingDamage) : 0;
                remainingAilmentSourceDamage = Math.max(0, Math.floor(remainingAilmentSourceDamage * carryRatio));
            } else {
                remainingDamage = 0;
                remainingAilmentSourceDamage = 0;
            }
            chainSource = chainTarget;
        }
    }
    let randomTargetCapFallbackUsed = false;
    for (let hitIdx = 0; hitIdx < repeats; hitIdx++) {
        let hitEntries = pStats.sSkill.randomTargetEachHit ? [{ mult: 1 }] : targets;
        hitEntries.forEach((hit, targetIndex) => {
            let targetEnemy = hit.enemy;
            if (pStats.sSkill.randomTargetEachHit) {
                let alive = options.restrictRandomTargets
                    ? targets.map(entry => entry.enemy).filter(enemy => enemy && enemy.hp > 0)
                    : (game.enemies || []).filter(enemy => enemy && enemy.hp > 0);
                if (alive.length <= 0) return;
                let eligible = alive.filter(enemy => (perEnemyHitCount.get(enemy.id) || 0) < 2);
                if (eligible.length > 0) targetEnemy = eligible[Math.floor(Math.random() * eligible.length)];
                else if (!randomTargetCapFallbackUsed) {
                    randomTargetCapFallbackUsed = true;
                    targetEnemy = alive[Math.floor(Math.random() * alive.length)];
                } else return;
            }
            if (!targetEnemy || targetEnemy.hp <= 0) return;
            transferPassiveChaosErosionToTarget(targetEnemy, pStats);
            let priorGuardedHits = Math.max(0, Math.floor(Number(attackHitGuardCounts.get(targetEnemy.id)) || 0));
            let nextHitCount = (perEnemyHitCount.get(targetEnemy.id) || 0) + 1;
            if (pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.projectileFormation && nextHitCount > 1) return;
            perEnemyHitCount.set(targetEnemy.id, nextHitCount);
            let hitElement = swingElement;
            let curseFx = getEnemyConditionDebuffFactor(targetEnemy, pStats);
            let enemyRes = getHitEnemyResistance(hitElement, zoneTier, targetEnemy, pStats, curseFx) - ascendancyNodeRules.armorBreak(targetEnemy, hitElement, getCombatTime());
            if (getPassiveChaosConversionShare(pStats, hitElement) > 0) {
                let chaosShare = getPassiveChaosConversionShare(pStats, hitElement);
                let chaosRes = getEffectiveEnemyMitigation('chaos', zoneTier, targetEnemy, pStats) - (curseFx.resChaosShred || 0);
                enemyRes = enemyRes * (1 - chaosShare) + chaosRes * chaosShare;
            }
            if (targetEnemy && Array.isArray(targetEnemy.ailments)) { let cj = targetEnemy.ailments.find(a => a && a.type === 'cosmosJudgment' && (a.time || 0) > 0); if (cj) enemyRes -= Math.max(0, Number(cj.power || 0)); }
            if (targetEnemy && Array.isArray(targetEnemy.ailments)) { let rs = targetEnemy.ailments.find(a => a && a.type === 'realmAllResDown' && (a.time || 0) > 0); if (rs) enemyRes -= Math.max(0, Math.floor(rs.stacks || 0)) * Math.max(0, Number((pStats.uniqueAllResDownOnHit && pStats.uniqueAllResDownOnHit.perHit) || 0)); }
            let hitCrit = isCrit;
            let passiveGuaranteedCrit = false;
            if (pStats.passiveKeystoneFlags && (pStats.passiveKeystoneFlags.explosiveDistill
                || pStats.passiveKeystoneFlags.taintedWarhead)) hitCrit = false;
            if (pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.fullEvasion
                && (pStats.sSkill.tags || []).includes('melee') && game.passiveFullEvasionCritReady) {
                hitCrit = true;
                passiveGuaranteedCrit = true;
                game.passiveFullEvasionCritReady = false;
            }
            let invertEnemyResistance = false;
            if (['fire', 'cold', 'light'].includes(hitElement) && typeof getPreciseTalentRatio === 'function'
                && Math.random() < 0.15 * getPreciseTalentRatio('hero3__inquisitor')) invertEnemyResistance = true;
            if (invertEnemyResistance) enemyRes = -enemyRes;
            if (pStats.uniqueAllResDownOnHit && targetEnemy) {
                let now = getCombatTime();
                targetEnemy.ailments = Array.isArray(targetEnemy.ailments) ? targetEnemy.ailments : [];
                let row = targetEnemy.ailments.find(a => a && a.type === 'realmAllResDown');
                if (!row) { row = { type: 'realmAllResDown', stacks: 0, time: 0 }; targetEnemy.ailments.push(row); }
                row.stacks = Math.min(Math.max(1, Math.floor(pStats.uniqueAllResDownOnHit.max || 4)), Math.max(0, Math.floor(row.stacks || 0)) + 1);
                row.time = Math.max(row.time || 0, Number(pStats.uniqueAllResDownOnHit.duration || 5));
            }
            let hitBaseDamage = pStats.baseDmg;
            let ailmentBaseDamage = pStats.baseDmg;
            if (hasKeystone('h8')) {
                let critCount = 0;
                let critChancePct = Math.max(0, Number(pStats.crit) || 0);
                while (critChancePct > 0) {
                    let slice = Math.min(100, critChancePct);
                    if (Math.random() * 100 < slice) critCount++;
                    critChancePct -= 100;
                }
                if (critCount > 0) {
                    hitCrit = true;
                    let critMul = Math.max(1, pStats.critDmg / 100);
                    hitBaseDamage = Math.floor(hitBaseDamage * (1 + ((critMul - 1) * critCount)));
                }
            } else {
                hitBaseDamage = hitCrit ? Math.floor(pStats.baseDmg * (pStats.critDmg / 100)) : pStats.baseDmg;
            }
            if (pStats.passiveKeystoneFlags && (pStats.passiveKeystoneFlags.explosiveDistill
                || pStats.passiveKeystoneFlags.taintedWarhead)) {
                hitCrit = false;
                hitBaseDamage = pStats.baseDmg;
            }
            if (hitCrit && !guaranteedCrit && !passiveGuaranteedCrit && (targetEnemy.critResistPct || 0) > 0 && Math.random() * 100 < Math.max(0, Math.min(95, targetEnemy.critResistPct || 0))) {
                hitCrit = false;
                hitBaseDamage = pStats.baseDmg;
            }
            let talentCritDmgMultiplier = typeof getTalentCritDamageMultiplier === 'function' ? getTalentCritDamageMultiplier(hitCrit) : 1;
            if (talentCritDmgMultiplier !== 1) hitBaseDamage = Math.floor(hitBaseDamage * talentCritDmgMultiplier);
            if (hitCrit && (targetEnemy.critDamageResistPct || 0) > 0) {
                let critResist = Math.max(0, Math.min(95, Number(targetEnemy.critDamageResistPct || 0))) / 100;
                let basePart = Math.max(1, Math.floor(pStats.baseDmg || 1));
                hitBaseDamage = Math.max(1, Math.floor(basePart + Math.max(0, hitBaseDamage - basePart) * (1 - critResist)));
            }
            if (riderCompassReady) {
                hitBaseDamage = Math.floor(hitBaseDamage * 2);
                ailmentBaseDamage = Math.floor(ailmentBaseDamage * 2);
                riderCompassReady = false;
                game.uniqueRiderCompassConsumed = true;
            }
            if (hitCrit && hasKeystone('a7') && (game.enemies || []).filter(e => e && e.hp > 0).length === 1) hitBaseDamage *= 1 + ASCENDANCY_KEYSTONE_VALUES.a7.extraHitPct / 100;
            if (hitCrit) hitBaseDamage *= getGemCritHitPerkMul(skillName, pStats);
            let randomElementPct = pStats.randomElementDamagePct && Number(pStats.randomElementDamagePct[hitElement]) ? Number(pStats.randomElementDamagePct[hitElement]) : 0;
            if (randomElementPct) {
                hitBaseDamage = Math.floor(hitBaseDamage * (1 + randomElementPct / 100));
                ailmentBaseDamage = Math.floor(ailmentBaseDamage * (1 + randomElementPct / 100));
            }
            if (hitElement === 'phys') {
                let physMul = Math.max(0, Number(pStats.warriorPhysDamageMultiplier) || 1);
                hitBaseDamage = Math.floor(hitBaseDamage * physMul);
                ailmentBaseDamage = Math.floor(ailmentBaseDamage * physMul);
            }
            if (hasKeystone('h1')) {
                let aliveCnt = (game.enemies || []).filter(e => e && e.hp > 0).length;
                let hunterMul = 1 + (aliveCnt === 1 ? ASCENDANCY_KEYSTONE_VALUES.h1.singleMorePct : ASCENDANCY_KEYSTONE_VALUES.h1.multiMorePct) / 100;
                hitBaseDamage = Math.floor(hitBaseDamage * hunterMul);
                ailmentBaseDamage = Math.floor(ailmentBaseDamage * hunterMul);
            }
            // Soulbinder sb7 player gain is baked into pStats.baseDmg as flat attack power (see getPlayerStats),
            // so the player hit no longer needs a separate summon→player multiplier here.
            [hitBaseDamage, ailmentBaseDamage] = applyAilingTargetDamage(pStats, targetEnemy, hitElement, hitCrit, [hitBaseDamage, ailmentBaseDamage]);
            if (targetEnemy.isBoss) {
                let bossMul = Math.max(0, Number(pStats.bossDamageDealtMultiplier) || 1);
                 bossMul *= (1 + Math.max(0, Number(pStats.bossDamagePct) || 0) / 100);
                 hitBaseDamage = Math.floor(hitBaseDamage * bossMul * (1 + Math.max(0, pStats.cosmosBossDamageMorePct || 0) / 100));
                 ailmentBaseDamage = Math.floor(ailmentBaseDamage * bossMul * (1 + Math.max(0, pStats.cosmosBossDamageMorePct || 0) / 100));
            } else if (targetEnemy.isElite && (pStats.eliteDamagePct || 0) > 0) {
                let eliteMul = 1 + Math.max(0, Number(pStats.eliteDamagePct) || 0) / 100;
                  hitBaseDamage = Math.floor(hitBaseDamage * eliteMul);
                  ailmentBaseDamage = Math.floor(ailmentBaseDamage * eliteMul);
            }
            if (hasKeystone('g5') && game.gladiatorSwiftOpeningReady) {
                hitBaseDamage = Math.floor(hitBaseDamage * 1.30);
                ailmentBaseDamage = Math.floor(ailmentBaseDamage * 1.30);
                game.gladiatorSwiftOpeningReady = false;
            }
            let talentKeystoneMul = 1;
            if (typeof getTalentPrecisePlayerHitMultiplier === 'function') {
                talentKeystoneMul *= getTalentPrecisePlayerHitMultiplier(hitElement);
            }
            if (typeof getTalentButcherBossMultiplier === 'function') talentKeystoneMul *= getTalentButcherBossMultiplier(targetEnemy);
            let talentHitMul = talentAttackMul * talentKeystoneMul * (colosseumStrikeMul || 1);
            talentHitMul *= getPassiveKeystoneHitMultiplier(pStats, targetEnemy, hitIdx, targetIndex, skillName) * ascendancyNodeRules.blastMultiplier(pStats, hitEntries.length);
            hitBaseDamage = Math.floor(hitBaseDamage * talentHitMul);
            ailmentBaseDamage = Math.floor(ailmentBaseDamage * talentHitMul);
            if (pStats.cosmosOrbitCycle && targetEnemy) {
                let cycle = pStats.cosmosOrbitCycle;
                let current = Number.isFinite(targetEnemy.cosmosOrbitMul) ? targetEnemy.cosmosOrbitMul : Number(cycle.high || 1.3);
                hitBaseDamage = Math.floor(hitBaseDamage * current);
                ailmentBaseDamage = Math.floor(ailmentBaseDamage * current);
                let dir = Number.isFinite(targetEnemy.cosmosOrbitDir) ? targetEnemy.cosmosOrbitDir : -1;
                let next = current + (dir * Math.max(0.01, Number(cycle.step || 0.2)));
                if (next <= Number(cycle.low || 0.7)) { next = Number(cycle.low || 0.7); dir = 1; }
                if (next >= Number(cycle.high || 1.3)) { next = Number(cycle.high || 1.3); dir = -1; }
                targetEnemy.cosmosOrbitMul = Number(next.toFixed(2));
                targetEnemy.cosmosOrbitDir = dir;
            }
            let dmg = Math.floor(hitBaseDamage * (hit.mult || 1));
            let ailmentSourceDamage = Math.floor(ailmentBaseDamage * (hit.mult || 1));
            dmg = Math.floor(dmg * stageDamageMultiplier);
            ailmentSourceDamage = Math.floor(ailmentSourceDamage * stageDamageMultiplier);
            let repeatDamageMultiplier = getSkillRepeatDamageMultiplier(pStats.sSkill, hitIdx, baseRepeats);
            dmg = Math.floor(dmg * repeatDamageMultiplier);
            ailmentSourceDamage = Math.floor(ailmentSourceDamage * repeatDamageMultiplier);
            if (!Number.isFinite(dmg)) dmg = 0;
            let minRoll = Math.max(1, Math.floor(pStats.minDmgRoll || 80));
            let maxRoll = Math.max(minRoll, Math.floor(pStats.maxDmgRoll || 100));
            let rollPct = minRoll + Math.random() * (maxRoll - minRoll);
            if (pStats.uniqueCeilingSmashDouble && rollPct >= 140 && Math.random() < 0.15) {
                dmg *= 2;
                ailmentSourceDamage *= 2;
            }
            // 언더독: 이번 타격이 최대 피해 보정으로 굴리지 못했다면 피해 증폭
            if ((pStats.uniqueUnderdogMorePct || 0) > 0 && rollPct < maxRoll) {
                let underdogMul = 1 + Math.max(0, pStats.uniqueUnderdogMorePct) / 100;
                dmg = Math.floor(dmg * underdogMul);
                ailmentSourceDamage = Math.floor(ailmentSourceDamage * underdogMul);
            }
            dmg = Math.floor(dmg * (rollPct / 100));
            ailmentSourceDamage = Math.floor(ailmentSourceDamage * (rollPct / 100));
            if (hitElement === 'chaos') {
                let chaosMultiplier = Math.max(0, Number(pStats.chaosDamageMultiplier) || 1);
                dmg = Math.floor(dmg * chaosMultiplier);
                ailmentSourceDamage = Math.floor(ailmentSourceDamage * chaosMultiplier);
            } else if (getPassiveChaosConversionShare(pStats, hitElement) > 0) {
                let chaosShare = getPassiveChaosConversionShare(pStats, hitElement);
                let convertedMultiplier = 1 - chaosShare + Math.max(0, Number(pStats.chaosDamageMultiplier) || 1) * chaosShare;
                dmg = Math.floor(dmg * convertedMultiplier);
                ailmentSourceDamage = Math.floor(ailmentSourceDamage * convertedMultiplier);
            }
            let cosmosFirstHitRoll = pStats.cosmosAlwaysFirstHit || ((pStats.cosmosAlwaysFirstHitChancePct || 0) > 0 && Math.random() * 100 < (pStats.cosmosAlwaysFirstHitChancePct || 0));
            if ((pStats.firstHitDamageMorePct || 0) > 0 && (cosmosFirstHitRoll || !targetEnemy.firstHitConsumed)) {
                let firstMul = 1 + Math.max(0, Number(pStats.firstHitDamageMorePct || 0)) / 100;
                dmg = Math.floor(dmg * firstMul);
                ailmentSourceDamage = Math.floor(ailmentSourceDamage * firstMul);
            }
            if ((targetEnemy.firstHitGuard || 0) > 0 && (cosmosFirstHitRoll || !targetEnemy.firstHitConsumed)) {
                dmg = Math.floor(dmg * (1 - targetEnemy.firstHitGuard));
                ailmentSourceDamage = Math.floor(ailmentSourceDamage * (1 - targetEnemy.firstHitGuard));
                if (!cosmosFirstHitRoll) targetEnemy.firstHitConsumed = true;
            }
            let hitGuard = Math.max(0, Number(targetEnemy.hitRateGuard) || 0) * Math.min(5, priorGuardedHits);
            if (hitGuard > 0) {
                let hitGuardMul = Math.max(0.2, 1 - hitGuard);
                dmg = Math.floor(dmg * hitGuardMul);
                ailmentSourceDamage = Math.floor(ailmentSourceDamage * hitGuardMul);
            }
            let burstHits = Math.max(0, (targetEnemy.recentHitsTaken || 0) - 2);
            if ((targetEnemy.comboTakenLessPct || 0) > 0 && burstHits > 0) {
                let comboLess = Math.max(0, Math.min(85, Number(targetEnemy.comboTakenLessPct || 0) * Math.min(5, burstHits) / 5));
                dmg = Math.floor(dmg * (1 - comboLess / 100));
                ailmentSourceDamage = Math.floor(ailmentSourceDamage * (1 - comboLess / 100));
            }
            let damageBeforeMitigation = dmg;
            let addedDamageSource = damageBeforeMitigation;
            let ailmentDamageBeforeCritMitigation = Math.max(0, Math.floor(ailmentSourceDamage));
            let skillConditionalCues = hasSkillConditionalFeedback ? [] : null;
            let skillConditionalMultiplier = getSkillConditionalDamageMultiplier(pStats.sSkill, targetEnemy,
                skillConditionalCues ? cue => skillConditionalCues.push(cue) : null);
            dmg = Math.floor(dmg * skillConditionalMultiplier);
            ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * skillConditionalMultiplier);
            dmg = Math.floor(dmg * Math.max(0, pStats.instantDamageMultiplier || 1));
            if ((pStats.cosmosLightningVariance || 0) > 0 && hitElement === 'light') dmg = Math.floor(dmg * (0.8 + Math.random() * 0.7));
            if ((pStats.uniqueDoubleDamageChancePct || 0) > 0 && Math.random() < ((pStats.uniqueDoubleDamageChancePct || 0) / 100)) dmg = Math.floor(dmg * Math.max(1, pStats.uniqueDoubleDamageMultiplier || 2));
            let enemyTotalEvadeChance = getEnemyTotalEvadeChance(targetEnemy, pStats.accuracy);
            if (!pStats.passiveAlwaysHit && !(typeof getTalentAlwaysHit === 'function' && getTalentAlwaysHit())
                && resolveEntropyEvasion(targetEnemy, enemyTotalEvadeChance, getCombatTime())) {
                addBattleFx('enemyEvade', { enemyId: targetEnemy.id, text: _t('회피!'), color: '#c4e2ff', duration: 260 });
                addEvasionCombatLog(targetEnemy, false);
                return;
            }
            if ((targetEnemy.hitRateGuard || 0) > 0) attackHitGuardCounts.set(targetEnemy.id, priorGuardedHits + 1);
            let talentConversion = window.GameModules.combat.supports.splitConversion(typeof getTalentDamageConversion === 'function'
                ? getTalentDamageConversion(hitElement)
                : { mainPct: 1, added: {} }, pStats, hitElement);
            let wisdomMainMultiplier = getPassiveWisdomLeapDamageMultiplier(pStats, hitElement);
            dmg = Math.floor(dmg * Math.max(0, Number(talentConversion.mainPct) || 0)
                * (1 - (enemyRes / 100)) * wisdomMainMultiplier * mutationHitScale(targetEnemy, hitElement));
            damageBeforeMitigation = Math.floor(damageBeforeMitigation * wisdomMainMultiplier);
            ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * wisdomMainMultiplier);
            // Resolve each element before combining the damage portions.
            if (hitElement === 'phys') {
                let physicalTakenMul = targetEnemy.physicalDamageTakenMul || 1;
                dmg = Math.floor(dmg * physicalTakenMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * physicalTakenMul);
            }
            if ((targetEnemy.armorGuard || 0) > 0 && hitElement === 'phys') {
                let armorGuardMul = Math.max(0.2, 1 - targetEnemy.armorGuard);
                dmg = Math.floor(dmg * armorGuardMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * armorGuardMul);
            }
            if (hitElement === 'light') {
                let lightTakenMul = curseFx.lightTakenMul || 1;
                dmg = Math.floor(dmg * lightTakenMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * lightTakenMul);
            }
            if (hitElement === 'chaos') {
                let chaosTakenMul = curseFx.chaosTakenMul || 1;
                // 시체 역병(워록 wlk9): 위축 중첩만큼 받는 카오스 피해 증가, 적중 시 1중첩 추가(최대 10)
                if (hasKeystone('wlk9') && targetEnemy && targetEnemy.hp > 0) {
                    game.enemyWitherStacks = (game.enemyWitherStacks && typeof game.enemyWitherStacks === 'object') ? game.enemyWitherStacks : {};
                    let wStacks = Math.max(0, Math.min(10, Math.floor(game.enemyWitherStacks[targetEnemy.id] || 0)));
                    chaosTakenMul *= (1 + wStacks * ASCENDANCY_KEYSTONE_VALUES.wlk9.chaosTakenPctPerStack / 100);
                    game.enemyWitherStacks[targetEnemy.id] = Math.min(10, wStacks + 1);
                }
                dmg = Math.floor(dmg * chaosTakenMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * chaosTakenMul);
            }
            let addedDamagePctByElement = (pStats && pStats.addedDamagePctByElement) || {};
            ['phys', 'fire', 'cold', 'light', 'chaos'].forEach(addEle => {
                let addPct = Math.max(0, Number(addedDamagePctByElement[addEle] || 0)
                    + Number(talentConversion.added && talentConversion.added[addEle] || 0));
                if (hitElement === 'phys' && addEle === 'fire') {
                    addPct += Math.max(0, Number(pStats.passiveCycleAddedFireFromPhysicalPct) || 0);
                }
                let wisdomAddedMultiplier = getPassiveWisdomLeapDamageMultiplier(pStats, addEle);
                let rawAdded = Math.floor(addedDamageSource * addPct / 100 * wisdomAddedMultiplier);
                if (rawAdded <= 0) return;
                let addRes = getEffectiveEnemyMitigation(addEle, zoneTier, targetEnemy, pStats) - (curseFx.resShred || 0);
                if (addEle === 'fire') addRes -= (curseFx.resFShred || 0);
                if (addEle === 'cold') addRes -= (curseFx.resCShred || 0);
                if (addEle === 'light') addRes -= (curseFx.resLShred || 0);
                if (addEle === 'chaos') addRes -= (curseFx.resChaosShred || 0);
                if (addEle === 'phys') addRes -= (curseFx.physDrShred || 0);
                let mitigatedAdded = Math.floor(rawAdded * (1 - (addRes / 100)) * loopMutation.takenMul(targetEnemy, addEle));
                if (addEle === 'phys') {
                    if (hitElement !== 'phys') mitigatedAdded = Math.floor(mitigatedAdded * Math.max(0, Number(pStats.warriorPhysDamageMultiplier) || 1));
                    mitigatedAdded = Math.floor(mitigatedAdded * (targetEnemy.physicalDamageTakenMul || 1) * Math.max(0.2, 1 - (targetEnemy.armorGuard || 0)));
                }
                if (addEle === 'light') mitigatedAdded = Math.floor(mitigatedAdded * (curseFx.lightTakenMul || 1));
                if (addEle === 'chaos') mitigatedAdded = Math.floor(mitigatedAdded * (curseFx.chaosTakenMul || 1));
                if (mitigatedAdded > 0) dmg += mitigatedAdded;
            });
            // 속성별 기본 피해(flat): 각 속성을 실제 타입으로 적용한다. 치명타/굴림/반복 보정을 함께 받고
            // 해당 속성의 적 저항으로 경감된다.
            let flatElementHitDamage = (pStats && pStats.flatElementHitDamage) || {};
            ['phys', 'fire', 'cold', 'light', 'chaos'].forEach(addEle => {
                let flatBase = Math.max(0, Number(flatElementHitDamage[addEle]) || 0);
                if (flatBase <= 0) return;
                let wisdomFlatMultiplier = getPassiveWisdomLeapDamageMultiplier(pStats, addEle);
                let flatPortion = flatBase * wisdomFlatMultiplier
                    * (hitCrit ? Math.max(1, (Number(pStats.critDmg) || 100) / 100) * talentCritDmgMultiplier : 1)
                    * (rollPct / 100) * (hit.mult || 1) * repeatDamageMultiplier;
                let addRes = getEffectiveEnemyMitigation(addEle, zoneTier, targetEnemy, pStats) - (curseFx.resShred || 0);
                if (addEle === 'fire') addRes -= (curseFx.resFShred || 0);
                if (addEle === 'cold') addRes -= (curseFx.resCShred || 0);
                if (addEle === 'light') addRes -= (curseFx.resLShred || 0);
                if (addEle === 'chaos') addRes -= (curseFx.resChaosShred || 0);
                if (addEle === 'phys') addRes -= (curseFx.physDrShred || 0);
                let mitigatedFlat = Math.floor(flatPortion * (1 - (addRes / 100)) * loopMutation.takenMul(targetEnemy, addEle));
                if (addEle === 'phys') {
                    mitigatedFlat = Math.floor(mitigatedFlat * Math.max(0, Number(pStats.warriorPhysDamageMultiplier) || 1));
                    mitigatedFlat = Math.floor(mitigatedFlat * (targetEnemy.physicalDamageTakenMul || 1) * Math.max(0.2, 1 - (targetEnemy.armorGuard || 0)));
                }
                if (addEle === 'light') mitigatedFlat = Math.floor(mitigatedFlat * (curseFx.lightTakenMul || 1));
                if (addEle === 'chaos') mitigatedFlat = Math.floor(mitigatedFlat * (curseFx.chaosTakenMul || 1));
                if (mitigatedFlat > 0) dmg += mitigatedFlat;
            });
            dmg = Math.floor(dmg * (curseFx.mul || 1));
            ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * (curseFx.mul || 1));
            if ((pStats.sSkill.tags || []).includes('projectile')) {
                let projectileTakenMul = (curseFx.projectileTakenMul || 1) * (targetEnemy.projectileDamageTakenMul || 1);
                dmg = Math.floor(dmg * projectileTakenMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * projectileTakenMul);
            }
            if ((pStats.sSkill.tags || []).includes('spell')) {
                let spellTakenMul = targetEnemy.spellDamageTakenMul || 1;
                dmg = Math.floor(dmg * spellTakenMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * spellTakenMul);
            }
            if (hitCrit) dmg = Math.floor(dmg * (curseFx.critDmgTakenMul || 1));
            let enemyShockTakenIncreasePct = getActiveEnemyShockTakenDamageIncreasePct(targetEnemy, pStats);
            if (enemyShockTakenIncreasePct > 0) {
                let enemyShockTakenMul = 1 + enemyShockTakenIncreasePct / 100;
                dmg = Math.floor(dmg * enemyShockTakenMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * enemyShockTakenMul);
            }
            let shockedIncreaseMul = getShockedEnemyHitDamageIncreaseMultiplier(targetEnemy, pStats);
            if (shockedIncreaseMul > 1) {
                dmg = Math.floor(dmg * shockedIncreaseMul);
            }
            if ((pStats.shockedEnemyHitDamageMorePct || 0) > 0 && Array.isArray(targetEnemy.ailments) && targetEnemy.ailments.some(a => a && a.type === 'shock' && (a.time || 0) > 0)) {
                let shockedMore = 1 + Math.max(0, Number(pStats.shockedEnemyHitDamageMorePct || 0)) / 100;
                dmg = Math.floor(dmg * shockedMore);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * shockedMore);
            }
            if (pStats.uniqueBleedWeightOnBleedingHit && Array.isArray(targetEnemy.ailments) && targetEnemy.ailments.some(a => a && a.type === 'bleed' && (a.time || 0) > 0)) {
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * 2);
            }
            if ((pStats.uniqueBleedingEnemyDamageMorePct || 0) > 0 && Array.isArray(targetEnemy.ailments) && targetEnemy.ailments.some(a => a && a.type === 'bleed' && (a.time || 0) > 0)) {
                let bleedingMore = 1 + Math.max(0, Number(pStats.uniqueBleedingEnemyDamageMorePct) || 0) / 100;
                dmg = Math.floor(dmg * bleedingMore);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * bleedingMore);
            }
            if (pStats.uniqueMeleeArmorAmp && Array.isArray(pStats.sSkill.tags) && pStats.sSkill.tags.includes('melee')) {
                let now = getCombatTime();
                let active = (game.uniqueMeleeArmorAmpExpiresAt || 0) > now;
                let stacks = active ? Math.max(0, Math.floor(game.uniqueMeleeArmorAmpStacks || 0)) : 0;
                game.uniqueMeleeArmorAmpStacks = Math.min(Math.floor(pStats.uniqueMeleeArmorAmp.maxStacks || 3), stacks + 1);
                game.uniqueMeleeArmorAmpExpiresAt = now + Math.floor((pStats.uniqueMeleeArmorAmp.duration || 2) * 1000);
            }
            let keystoneTakenMul = getKeystoneEnemyTakenMultiplier(targetEnemy, hitElement);
            dmg = Math.floor(dmg * keystoneTakenMul);
            ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * keystoneTakenMul);
            dmg = Math.floor(dmg * (getAbyssMonsterScales(getZone(game.currentZoneId)).playerDamageMul || 1));
            if (targetEnemy.isBoss && (pStats.damageScales || {}).talismanBossFinalDmgBonusPct) {
                let talismanBossMul = 1 + ((pStats.damageScales.talismanBossFinalDmgBonusPct || 0) / 100);
                dmg = Math.floor(dmg * talismanBossMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * talismanBossMul);
            }
            let finalDamageMul = Number(pStats.finalDamageMultiplier);
            if (!Number.isFinite(finalDamageMul)) finalDamageMul = 1;
            finalDamageMul = Math.max(0, finalDamageMul);
            dmg = Math.floor(dmg * finalDamageMul);
            ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * finalDamageMul);
            if (passiveKarmaContext && String(passiveKarmaContext.targetId) === String(targetEnemy.id)) {
                let karmaMul = Math.max(1, Number(passiveKarmaContext.multiplier) || 1);
                dmg = Math.floor(dmg * karmaMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * karmaMul);
            }
            if ((pStats.passiveOmniscientTrueDamagePct || 0) > 0) {
                dmg += Math.floor(Math.max(0, Number(pStats.baseDmg) || 0) * pStats.passiveOmniscientTrueDamagePct / 100);
            }
            if (!Number.isFinite(dmg) || dmg < 0) dmg = 0;
            if (hasKeystone('h2') && targetEnemy) {
                targetEnemy.ailments = Array.isArray(targetEnemy.ailments) ? targetEnemy.ailments : [];
                let weak = targetEnemy.ailments.find(a => a && a.type === 'hunterExpose');
                if (weak) weak.time = 3;
                else targetEnemy.ailments.push({ type: 'hunterExpose', time: 3, power: 1 });
            }
            if (hasKeystone('h2') && Array.isArray(targetEnemy.ailments) && targetEnemy.ailments.some(a => a && a.type === 'hunterExpose' && (a.time || 0) > 0)) {
                dmg = Math.floor(dmg * (1 + ASCENDANCY_KEYSTONE_VALUES.h2.takenMorePct / 100));
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * (1 + ASCENDANCY_KEYSTONE_VALUES.h2.takenMorePct / 100));
            }
            if (targetEnemy && targetEnemy.id && pStats.uniqueCursedTakenAndRefresh) {
                let refreshSec = Math.max(0, Number(pStats.uniqueCursedTakenAndRefresh.refreshSec || 0));
                if (refreshSec > 0 && game.enemyConditionDebuffs && Array.isArray(game.enemyConditionDebuffs[targetEnemy.id])) {
                    let nextExpire = getCombatTime() + Math.floor(refreshSec * 1000);
                    game.enemyConditionDebuffs[targetEnemy.id] = game.enemyConditionDebuffs[targetEnemy.id].map(deb => {
                        if (!deb) return deb;
                        if ((deb.expiresAt || 0) > getCombatTime()) deb.expiresAt = Math.max(deb.expiresAt || 0, nextExpire);
                        return deb;
                    });
                }
            }
            let talentWasFull = targetEnemy.hp >= (targetEnemy.maxHp || targetEnemy.hp || 1);
            // 선제 타격: 생명력이 가득 찬 적에게 가하는 첫 타에 추가 피해
            if (talentWasFull && (pStats.firstStrikeDamagePct || 0) > 0) {
                let firstStrikeMul = 1 + Math.max(0, Number(pStats.firstStrikeDamagePct) || 0) / 100;
                dmg = Math.floor(dmg * firstStrikeMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * firstStrikeMul);
            }
            let directHitDistanceMul = getGridDirectHitDistanceMultiplier(game.gridPlayer, targetEnemy);
            dmg = Math.floor(dmg * directHitDistanceMul);
            damageBeforeMitigation = Math.floor(damageBeforeMitigation * directHitDistanceMul);
            ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * directHitDistanceMul);
            targetEnemy.lastHitElement = hitElement;
            let moonShadowRatio = hitCrit && typeof getPreciseTalentRatio === 'function'
                ? 0.20 * getPreciseTalentRatio('hero3__assassin') : 0;
            let normalDamage = moonShadowRatio > 0 ? Math.floor(dmg * (1 - moonShadowRatio)) : dmg;
            let dealtToEnemy = window.GameModules.combat.supports.dealHit(targetEnemy, pStats, normalDamage);
            if (dealtToEnemy > 0) {
                if (skillConditionalCues) skillConditionalCues.forEach(cue => showAttackFeedback(targetEnemy, cue));
                if (stageKind === 'slamAftershock') {
                    showAttackFeedback(targetEnemy, { key:'slam-aftershock', text:stageLabel || '여진', color:'#f0bd79' });
                }
                if (talentWasFull && (pStats.firstStrikeDamagePct || 0) > 0) {
                    showAttackFeedback(targetEnemy, {
                        key: 'first-strike',
                        text: _t('선제 타격'),   // 2026-11-05 사용자: 수치 없이 이름만(전: 선제 타격: 피해 n% 증폭)
                        color: '#ffd27a'
                    });
                }
            }
            if (moonShadowRatio > 0) {
                let trueDamage = Math.max(0, Math.floor(damageBeforeMitigation * moonShadowRatio));
                dealtToEnemy += applyDamageToEnemyResource(targetEnemy, trueDamage);
            }
            // 거역의 번개: 카오스 피해를 받은 적은 생명력 재생이 줄어든다(getTalentEnemyRegenMultiplier).
            if (dealtToEnemy > 0 && hitElement === 'chaos') targetEnemy.talentHitByChaos = true;
            if (dealtToEnemy > 0 && options.talentMoonReturn && targetEnemy.id === options.talentMoonReturn.targetId) {
                talentMoonPrimaryHit = true;
            }
            if (pStats.uniqueRiftWaveOnHit && dealtToEnemy > 0 && Math.random() * 100 < Math.max(0, Number(pStats.uniqueRiftWaveOnHit.chance) || 0)) {
                let waveDamage = Math.max(1, Math.floor(dealtToEnemy * Math.max(0, Number(pStats.uniqueRiftWaveOnHit.damagePct) || 0) / 100));
                (game.enemies || []).forEach(otherEnemy => {
                    if (!otherEnemy || otherEnemy.hp <= 0 || otherEnemy.id === targetEnemy.id) return;
                    let waveDealt = applyDamageToEnemyResource(otherEnemy, waveDamage);
                    if (waveDealt > 0) {
                        addBattleFx('hit', { enemyId: otherEnemy.id, color: '#a879ff', damage: waveDealt, duration: 210, element: 'chaos', syncToSwing: true });
                        if (otherEnemy.hp <= 0) handleEnemyDeath(otherEnemy, pStats);
                    }
                });
            }
            // 처형 일격(장비 옵션): 생명력이 일정 % 이하인 일반/정예 몬스터 즉시 처치(보스 제외)
            if (dmg > 0 && targetEnemy.hp > 0 && !targetEnemy.isBoss && (pStats.cullStrikePct || 0) > 0) {
                let cullThr = Math.max(0, Math.min(20, Number(pStats.cullStrikePct) || 0)) / 100;
                if (cullThr > 0 && (targetEnemy.hp / Math.max(1, targetEnemy.maxHp || targetEnemy.hp || 1)) <= cullThr) {
                    dealtToEnemy += applyDamageToEnemyResource(targetEnemy, getEnemyLifeAndShield(targetEnemy));
                    showAttackFeedback(targetEnemy, { key:'cull', text:_t('처형'), color:'#ff9b79' });
                }
            }
            // 우주 먼지: 공격 시 일정 확률로 일반(비정예/비보스) 적 즉시 처치
            if (dmg > 0 && targetEnemy.hp > 0 && !targetEnemy.isBoss && !targetEnemy.isElite && !targetEnemy.elite
                && (pStats.uniqueInstakillNormalPct || 0) > 0 && Math.random() * 100 < pStats.uniqueInstakillNormalPct) {
                dealtToEnemy += applyDamageToEnemyResource(targetEnemy, getEnemyLifeAndShield(targetEnemy));
                showAttackFeedback(targetEnemy, { key:'instant-kill', text:_t('즉시 처치'), color:'#d7b0ff' });
            }
            // 스팅어: 남아 있는 지속 피해 총량이 생명력과 에너지 보호막을 덮으면 즉시 마무리한다.
            if (dmg > 0 && targetEnemy.hp > 0 && typeof getTalentDotOccupancyDamage === 'function'
                && getTalentDotOccupancyDamage(targetEnemy, pStats) >= getEnemyLifeAndShield(targetEnemy)) {
                dealtToEnemy += applyDamageToEnemyResource(targetEnemy, getEnemyLifeAndShield(targetEnemy));
                showAttackFeedback(targetEnemy, { key:'dot-execute', text:_t('지속 피해 처형'), color:'#c88cff' });
            }
            // 8 심문궁: 표식 누적(쿨타임 아닐 때), 5초 후 processTalentInquisitorMarks에서 폭발
            if (dmg > 0 && targetEnemy.hp > 0 && typeof isTalentCardActive === 'function' && isTalentCardActive('hero1__inquisitor')) {
                game.talentInquisitorMarks = (game.talentInquisitorMarks && typeof game.talentInquisitorMarks === 'object') ? game.talentInquisitorMarks : {};
                let nowMk = getCombatTime();
                let mk = game.talentInquisitorMarks[targetEnemy.id] || { accumulated: 0, explodeAt: 0, cooldownUntil: 0 };
                if ((mk.cooldownUntil || 0) <= nowMk) {
                    if (!mk.explodeAt) mk.explodeAt = nowMk + 5000;
                    mk.accumulated = (mk.accumulated || 0) + dealtToEnemy;
                    game.talentInquisitorMarks[targetEnemy.id] = mk;
                }
            }
            // 6 헥스보우: 저주 걸린 적 공격 시 저주 제거 + 0.2배 광역 폭발
            if (dmg > 0 && typeof isTalentCardActive === 'function' && isTalentCardActive('hero1__warlock')
                && game.enemyConditionDebuffs && Array.isArray(game.enemyConditionDebuffs[targetEnemy.id])
                && game.enemyConditionDebuffs[targetEnemy.id].some(d => d && (d.expiresAt || 0) > getCombatTime())) {
                let activeCurses = game.enemyConditionDebuffs[targetEnemy.id];
                let consumedCurseIndex = activeCurses.findIndex(d => d && (d.expiresAt || 0) > getCombatTime());
                if (consumedCurseIndex >= 0) activeCurses.splice(consumedCurseIndex, 1);
                let splash = Math.max(1, Math.floor(dmg * 0.2));
                (game.enemies || []).forEach(e => {
                    if (!e || e.hp <= 0) return;
                    applyDamageToEnemyResource(e, splash);
                    addBattleFx('hit', { enemyId: e.id, color: getElementColor('chaos'), damage: splash, duration: 220, syncToSwing: true });
                    if (e.hp <= 0) handleEnemyDeath(e, pStats);
                });
            }
            if (targetEnemy.hp <= 0) targetEnemy.lastOverkillDamage = Math.max(0, dmg - dealtToEnemy);
            if (pStats.uniqueMaxRollBonusHit && rollPct >= 130 && dealtToEnemy > 0 && targetEnemy.hp > 0) {
                let bonus = Math.max(1, Math.floor(dealtToEnemy * 0.5));
                dealtToEnemy += applyDamageToEnemyResource(targetEnemy, bonus);
            }
            if (hasKeystone('r5') && targetEnemy.hp > 0) {
                game.rangerWeakpointMarks = game.rangerWeakpointMarks || {};
                let mark = game.rangerWeakpointMarks[targetEnemy.id] || { hits: 0 };
                mark.hits = Math.max(0, Math.floor(mark.hits || 0)) + 1;
                if (mark.hits >= 3) {
                    mark.hits = 0;
                    let bonus = getRangerWeakpointBonus(targetEnemy, dmg);
                    dealtToEnemy += applyDamageToEnemyResource(targetEnemy, bonus);
                    addBattleFx('hit', { enemyId: targetEnemy.id, color: getElementColor('phys'), damage: bonus, duration: 280, element: 'phys', syncToSwing: true });
                }
                game.rangerWeakpointMarks[targetEnemy.id] = mark;
            }
            maybeUnlockChaosRealmFromWoodsman(targetEnemy);
            if (targetEnemy.hp <= 0 && dmg > dealtToEnemy) {
                let overkillDamage = dmg - dealtToEnemy;
                let ailmentOverkillSourceDamage = dmg > 0 ? Math.floor(ailmentDamageBeforeCritMitigation * (overkillDamage / dmg)) : 0;
                let isOriginalPierceTarget = originalPierceTargets.size === 0 || originalPierceTargets.has(targetEnemy);
                let canStartPierceCarry = !pStats.sSkill.pierceOverkillCarry
                    || (isOriginalPierceTarget && !pierceOverkillCarryStartedTargets.has(targetEnemy));
                if (canStartPierceCarry) {
                    if (pStats.sSkill.pierceOverkillCarry) pierceOverkillCarryStartedTargets.add(targetEnemy);
                    applyPierceOverkillCarry(targetEnemy, overkillDamage, hitElement, hitCrit, ailmentOverkillSourceDamage);
                }
            }
            if (!options.skipSlamEcho && slamEchoPct > 0 && (pStats.sSkill.tags || []).includes('slam') && dmg > 0 && targetEnemy.hp > 0 && (slamEchoGuaranteed || passiveSlamEchoChance <= 0 || Math.random() < passiveSlamEchoChance)) {
                let slamEchoBaseDamage = stageKind === 'slamPrimary'
                    ? Math.floor(dmg / Math.max(0.01, stageDamageMultiplier))
                    : dmg;
                game.pendingSlamEchoHits = Array.isArray(game.pendingSlamEchoHits) ? game.pendingSlamEchoHits : [];
                game.pendingSlamEchoHits.push({
                    at: getCombatTime() + slamEchoDelayMs,
                    enemyId: targetEnemy.id,
                    damage: Math.max(1, Math.floor(slamEchoBaseDamage * slamEchoPct)),
                    element: hitElement
                });
            }
            if ((pStats.damageScales || {}).talismanBossFinalDmgBonusPct && targetEnemy.hp > 0 && (targetEnemy.hp / Math.max(1, targetEnemy.maxHp || targetEnemy.hp)) <= 0.05) {
                targetEnemy.hp = 0;
                showAttackFeedback(targetEnemy, { key:'boss-finish', text:_t('마무리'), color:'#f4c779' });
            }
            if (targetEnemy.hp > 0 && !targetEnemy.isBoss && !targetEnemy.isElite && !targetEnemy.elite
                && getCombatTalentCardLevel('hero2__assassin') > 0) {
                let butcherRow = game.talentButcherMarks && game.talentButcherMarks[targetEnemy.id];
                let butcherLifeRatio = targetEnemy.hp / Math.max(1, targetEnemy.maxHp || targetEnemy.hp);
                if (butcherRow && butcherRow.hits >= 4 && butcherLifeRatio <= 0.30) {
                    targetEnemy.hp = 0;
                    showAttackFeedback(targetEnemy, { key:'butcher-execute', text:_t('처형'), color:'#ff9b79' });
                }
            }
            updateTalentButcherHitMark(targetEnemy);
            if (canApplyTalentExecuteThreshold(targetEnemy, pStats.sSkill.executeThreshold) && targetEnemy.hp > 0
                && (targetEnemy.hp / Math.max(1, targetEnemy.maxHp || targetEnemy.hp)) < pStats.sSkill.executeThreshold) {
                targetEnemy.hp = 0;
                showAttackFeedback(targetEnemy, { key:'skill-execute', text:_t('처형'), color:'#ff9b79' });
            }
            if (hasKeystone('g6') && targetEnemy.hp > 0) {
                let executeThreshold = targetEnemy.isBoss ? 0.10 : 0.20;
                if ((targetEnemy.hp / Math.max(1, targetEnemy.maxHp || targetEnemy.hp)) < executeThreshold) {
                    targetEnemy.hp = 0;
                    showAttackFeedback(targetEnemy, { key:'gladiator-execute', text:_t('처형'), color:'#ff9b79' });
                }
            }
            if ((pStats.regenSuppress || 0) > 0) targetEnemy.regenSuppressPct = Math.min(95, (targetEnemy.regenSuppressPct || 0) + pStats.regenSuppress);
            targetEnemy.recentHitsTaken = (targetEnemy.recentHitsTaken || 0) + 1;
            targetEnemy.recentHitsTimer = 1.8;
            if (pStats.uniqueChaosResDownOnHit) {
                game.enemyUniqueChaosResDown = game.enemyUniqueChaosResDown || {};
                let row = game.enemyUniqueChaosResDown[targetEnemy.id] || { stacks: 0, perHit: pStats.uniqueChaosResDownOnHit.perHit, maxStacks: pStats.uniqueChaosResDownOnHit.maxStacks };
                row.stacks = Math.min(row.maxStacks, Math.max(0, row.stacks + 1));
                row.perHit = pStats.uniqueChaosResDownOnHit.perHit;
                row.maxStacks = pStats.uniqueChaosResDownOnHit.maxStacks;
                game.enemyUniqueChaosResDown[targetEnemy.id] = row;
            }

            if (pStats.uniqueStackingElementalResDownOnHit && ['fire','cold','light'].includes(hitElement)) {
                game.enemyUniqueElementalResDown = game.enemyUniqueElementalResDown || {};
                let row = game.enemyUniqueElementalResDown[targetEnemy.id] || { stacks: 0, perHit: pStats.uniqueStackingElementalResDownOnHit.perHit, max: pStats.uniqueStackingElementalResDownOnHit.max };
                row.stacks = Math.min(Math.ceil(row.max / Math.max(1,row.perHit)), Math.max(0, row.stacks + 1));
                row.perHit = pStats.uniqueStackingElementalResDownOnHit.perHit;
                row.max = pStats.uniqueStackingElementalResDownOnHit.max;
                game.enemyUniqueElementalResDown[targetEnemy.id] = row;
            }
            if (pStats.uniqueQueenBeeSummon && Math.random() < Math.max(0, Math.min(1, (pStats.uniqueQueenBeeSummon.chance || 0) / 100))) {
                let bees = game.queenBees || [];
                bees.push({ expiresAt: getCombatTime() + Math.max(1000, Math.floor((pStats.uniqueQueenBeeSummon.attacks || 3) * 1000)), nextAt: getCombatTime() + 1000, attacksLeft: Math.max(1, Math.floor(pStats.uniqueQueenBeeSummon.attacks || 3)), hitPct: Math.max(1, Number(pStats.uniqueQueenBeeSummon.hitPct || 125)) });
                while (bees.length > Math.max(1, Math.floor(pStats.uniqueQueenBeeSummon.maxBees || 10))) bees.shift();
                game.queenBees = bees;
            }
            if (hitCrit && pStats.uniqueMeteorFootsteps && Math.random() < Math.max(0, Math.min(1, (pStats.uniqueMeteorFootsteps.chance || 0) / 100))) {
                let meteor = Math.max(1, Math.floor(dmg * (Math.max(1, Number(pStats.uniqueMeteorFootsteps.damagePct || 180)) / 100)));
                (game.enemies || []).forEach(e => { if (!e || e.hp <= 0) return; applyDamageToEnemyResource(e, meteor); });
            }
            if (pStats.uniqueShockTracer && Array.isArray(targetEnemy.ailments) && targetEnemy.ailments.some(a => a && a.type === 'shock' && (a.time || 0) > 0)) {
                let now = getCombatTime();
                game.uniqueShockTracerNextAt = Number(game.uniqueShockTracerNextAt || 0);
                if (now >= game.uniqueShockTracerNextAt) {
                    let icdMs = Math.max(100, Math.floor((Number(pStats.uniqueShockTracer.icdSec || 0.5)) * 1000));
                    game.uniqueShockTracerNextAt = now + icdMs;
                    let strikePct = Math.max(1, Number(pStats.uniqueShockTracer.strikeDamagePct || 500));
                    let strike = Math.max(1, Math.floor(dmg * (strikePct / 100)));
                    dealtToEnemy += applyDamageToEnemyResource(targetEnemy, strike);
                }
            }
            if (pStats.uniqueDragonVeinGuard && Math.random() < Math.max(0, Math.min(1, (pStats.uniqueDragonVeinGuard.chance || 0) / 100))) {
                let guardAmt = Math.max(1, Math.floor((pStats.maxHp || 0) * Math.max(0, Number(pStats.uniqueDragonVeinGuard.hpPct || 8)) / 100));
                game.playerUniqueGuard = { amount: guardAmt, expiresAt: getCombatTime() + Math.max(500, Math.floor((pStats.uniqueDragonVeinGuard.duration || 2) * 1000)) };
            }

            totalLeechableDamage += dealtToEnemy * (targetEnemy && targetEnemy.leechEffMul !== undefined ? targetEnemy.leechEffMul : 1);
            if (hitElement === 'chaos') totalChaosDamage += dealtToEnemy;
            hits.push(dealtToEnemy);
            notePlayerHitSummary(hitSummary, targetEnemy, dealtToEnemy);
            addPlayerHitVisualFx(pStats, options, targetEnemy, {
                stageKind, stageLabel, stageCount, skillName, hitCrit, hitIdx,
                hitElement, dealtToEnemy, dmg, isStageReplay
            });
            if (hitCrit && hasKeystone('a3')) {
                let now = getCombatTime();
                game.enemyKeystoneDebuffs = game.enemyKeystoneDebuffs || {};
                let list = (game.enemyKeystoneDebuffs[targetEnemy.id] || []).filter(row => row && (row.expiresAt || 0) > now);
                list.push({ type: 'a3', expiresAt: now + 5000 });
                while (list.filter(row => row.type === 'a3').length > 10) { let idx=list.findIndex(row=>row.type==='a3'); if (idx>=0) list.splice(idx,1); else break; }
                game.enemyKeystoneDebuffs[targetEnemy.id] = list;
                targetEnemy.ailments = Array.isArray(targetEnemy.ailments) ? targetEnemy.ailments : [];
                let stacks = list.filter(row => row.type === 'a3').length;
                let mark = targetEnemy.ailments.find(ail => ail && ail.type === 'assassinWeakness');
                if (mark) { mark.time = 5; mark.power = stacks; }
                else targetEnemy.ailments.push({ type: 'assassinWeakness', time: 5, power: stacks });
            }
            if (isDotSkill) applySkillDotFromHit(targetEnemy, damageBeforeMitigation, pStats);
            let ailmentType = getAilmentTypeFromElement(hitElement);
            let conditionAilmentTakenMul = curseFx && curseFx.ailmentTakenMul ? (curseFx.ailmentTakenMul[ailmentType] || 1) : 1;
            let ailmentStats = getSkillAilmentStats(pStats, hitElement, curseFx);
            applyEnemyAilmentFromHit(targetEnemy, ailmentStats, dmg, hitCrit, {
                ailmentSourceDamage: Math.floor(ailmentDamageBeforeCritMitigation * conditionAilmentTakenMul),
                critDotBonusPct: hitCrit ? 50 : 0,
                primaryAilmentChance: options.primaryAilmentChance,
                additionalAilmentChances: regionAffixEffects.extraAilmentChances(pStats)
            });
            spreadSkillAilmentOnHit(targetEnemy, pStats.sSkill, pStats);
            applySkillPeriodicOnHit(targetEnemy, pStats.sSkill, dealtToEnemy, pStats.sSkill.visualName || skillName);
            applySkillGridControlOnHit(targetEnemy, pStats.sSkill, options);
            applySupportEchoOnHit(targetEnemy, pStats, dealtToEnemy);
            applySupportChaosErosionOnHit(targetEnemy, pStats, hitElement);
            applyCosmosJudgmentOnHit(targetEnemy, pStats, hitElement);
            regionAffixEffects.afterHit(pStats, targetEnemy, { crit: hitCrit, damage: dealtToEnemy });
            if (pStats.uniqueAlwaysShock && !pStats.cosmosCometChillNoFreeze) {
                let shockStats = { ...pStats, sSkill: { ...pStats.sSkill, ele: 'light' } };
                let shockHit = Math.max(1, Math.floor(dmg * 0.25 * (1 + Math.max(0, Number(pStats.shockEffectBonusPct)||0)/100)));
                applyEnemyAilmentFromHit(targetEnemy, shockStats, shockHit, true);
            }
        });
    }
    const instantLeechRecovered = applyPlayerHitLeech(pStats, totalLeechableDamage, totalChaosDamage);

    if (!isStageReplay && isCrit && (pStats.uniqueEsRecoverOnCritPct || 0) > 0 && (pStats.energyShield || 0) > 0) {
        let recover = Math.max(1, Math.floor((pStats.energyShield || 0) * ((pStats.uniqueEsRecoverOnCritPct || 0) / 100)));
        game.playerEnergyShield = Math.min(getPlayerEnergyShieldRecoveryCap(pStats), Math.max(0, (game.playerEnergyShield || 0) + recover));
    }
    let firstResolvedSkillHit = !isStageReplay || Number(options.stageIndex) === 0;
    if (firstResolvedSkillHit && isCrit && hitSummary.totalDamage > 0) advanceEnergyShieldRechargeOnCrit(pStats, getCombatTime());

    const hitLog = getPlayerHitCombatLog(hitSummary, { skillName, swingElement, isCrit, isDotSkill, targets, pStats, instantLeechRecovered });
    if (hitLog) addLog(hitLog.line, 'attack-player', hitLog.options);

    performTalentMoonReturn(pStats, options, talentMoonPrimaryHit);

    (game.enemies || []).slice().forEach(enemy => {
        if (enemy && enemy.hp <= 0) handleEnemyDeath(enemy, pStats);
    });
}


safeExposeGlobals({ performPlayerAttack });
