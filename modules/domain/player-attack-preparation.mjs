// Ordered combat stages. c is cast-local; h is contact-local; dependencies are explicit at the classic boundary.

function startAttack(c) {
    c.options = c.attackOptions || {};
    if (c.deps.supports.deferAttack(c.pStats, c.options)) return false;
    c.attackHitGuardCounts = c.options.attackHitGuardCounts instanceof Map ? c.options.attackHitGuardCounts : new Map();
    c.isStageReplay = !!c.options.stageReplay;
    if (!c.isStageReplay) c.pStats = { ...c.pStats, projectileExtraShots: c.deps.getAttackProjectileShots(c.pStats) };
    if (!c.isStageReplay && typeof c.deps.isTalentPlayerAttackDisabled === 'function' && c.deps.isTalentPlayerAttackDisabled()) return false;
    c.skillName = c.options.skillName || c.owner.activeSkill;
    c.channelContinuationRequested = !c.isStageReplay && c.deps.consumeCombatChannelContinuation(c.skillName);
}

function tickQueenBees(c) {
    if (!c.isStageReplay && Array.isArray(c.owner.queenBees) && c.owner.queenBees.length > 0) {
        let now = c.deps.getCombatTime();
        c.owner.queenBees = c.owner.queenBees.filter(bee => bee && (bee.expiresAt || 0) > now && (bee.attacksLeft || 0) > 0);
        c.owner.queenBees.forEach(bee => {
            if (now < (bee.nextAt || 0)) return;
            bee.nextAt = now + 1000;
            bee.attacksLeft = Math.max(0, Math.floor((bee.attacksLeft || 0) - 1));
            let target = (c.owner.enemies || []).find(e => e && e.hp > 0);
            if (!target) return;
            let beeDmg = Math.max(1, Math.floor((c.pStats.baseDmg || 1) * ((bee.hitPct || 125) / 100)));
            c.deps.applyDamageToEnemyResource(target, beeDmg);
        });
    }
}

function prepareTalentAttack(c) {
    if (!c.isStageReplay) c.deps.prepareTalentPlayerAttackContext(c.pStats);
    c.colosseumStrikeMul = Math.max(0, Number(c.options.attackDamageMultiplier) || 1);
    c.colosseumSavedTargets = null;
}

function prepareColosseumStrike(c) {
    if (!c.isStageReplay && typeof c.deps.isTalentCardActive === 'function' && c.deps.isTalentCardActive('hero2__gladiator') && c.owner.talentRuntime && c.owner.talentRuntime.colosseumReady) {
        c.owner.talentRuntime.colosseumReady = false;
        let aliveCount = (c.owner.enemies || []).filter(e => e && e.hp > 0).length;
        c.colosseumStrikeMul = 2.2 * (aliveCount <= 1 ? 1.2 : 1);
        c.colosseumSavedTargets = c.pStats.sSkill.targets;
        c.pStats.sSkill.targets = Math.max(5, c.pStats.sSkill.targets || 1);
    }
}

function selectAttackTargets(c) {
    c.targets = c.isStageReplay ? (c.options.targetEntries || []).map(entry => {
        let enemy = (c.owner.enemies || []).find(row => row && row.id === entry.enemyId && row.hp > 0);
        return enemy ? { enemy: enemy, mult: Math.max(0, Number(entry.mult) || 1) } : null;
    }).filter(Boolean) : c.deps.getAttackTargets(c.pStats);
    if (c.colosseumSavedTargets !== null) c.pStats.sSkill.targets = c.colosseumSavedTargets;
    if (c.targets.length === 0) return false;
}

function beginAttackMobility(c) {
    c.passiveKarmaContext = c.options.passiveKarmaContext || null;
    if (!c.isStageReplay && typeof c.deps.beginPassiveKarmaAttack === 'function') {
        c.passiveKarmaContext = c.deps.beginPassiveKarmaAttack(c.targets[0].enemy, c.deps.getCombatTime());
    }
    if (!c.isStageReplay) c.colosseumStrikeMul *= c.deps.consumeLoneEvasionCounterMultiplier(c.pStats, c.deps.getCombatTime());
    ({ landingMs: c.landingMs, kickoff: c.kickoff } = c.deps.beginSkillMobility(c.pStats, c.targets[0].enemy, c.isStageReplay));
    c.talentMoonReturn = !c.isStageReplay && typeof c.deps.getTalentMoonReturnConfig === 'function'
        ? c.deps.getTalentMoonReturnConfig(c.targets)
        : null;
}

function selectHitSequence(c) {
    c.pendingStages = [];
    c.stageKind = c.options.stageKind || 'primary';
    c.stageLabel = c.options.stageLabel || '직격';
    c.stageCount = Math.max(1, Math.floor(Number(c.options.stageCount) || 1));
    c.stageDamageMultiplier = Number.isFinite(Number(c.options.hitDamageMultiplier)) ? Math.max(0, Number(c.options.hitDamageMultiplier)) : 1;
    if (!c.isStageReplay && typeof c.deps.buildSkillHitSequence === 'function') {
        let sequence = c.deps.buildSkillHitSequence(c.skillName, c.pStats.sSkill, c.targets);
        if (sequence.length > 0) {
            let firstStage = sequence[0];
            c.stageKind = firstStage.kind;
            c.stageLabel = firstStage.label;
            c.stageCount = sequence.length;
            c.stageDamageMultiplier = Math.max(0, Number(firstStage.damageMultiplier) || 0);
            c.pendingStages = sequence;
        }
    }
}

function recordFanaticism(c) {
    c.isDotSkill = c.deps.supports.nativeDot(c.pStats.sSkill);
    c.previousFanaticismStacks = Math.max(0, Number(c.pStats.passiveFanaticismStacks) || 0);
    c.currentFanaticismStacks = !c.isStageReplay && typeof c.deps.recordPassiveFanaticSkillUse === 'function'
        ? c.deps.recordPassiveFanaticSkillUse(c.skillName, c.pStats.devotion) : c.previousFanaticismStacks;
}

function rollAttackCritical(c) {
    c.guaranteedCrit = (c.deps.hasKeystone('a5'))
            || (c.deps.hasKeystone('ct7') && Array.isArray(c.pStats.sSkill.tags) && c.pStats.sSkill.tags.includes('attack'));
    c.isCrit = c.options.forcedCrit !== undefined ? !!c.options.forcedCrit
        : (c.guaranteedCrit || (typeof c.deps.rollTalentPlayerCrit === 'function' ? c.deps.rollTalentPlayerCrit(c.pStats.crit) : c.deps.random() < (c.pStats.crit / 100)));
    if (!c.isStageReplay && typeof c.deps.talentOnPlayerAttack === 'function') c.deps.talentOnPlayerAttack(c.pStats, c.isCrit);
}

function recordWarriorRhythm(c) {
    if (!c.isStageReplay && c.deps.hasKeystone('w2') && c.isCrit) {
        let now = c.deps.getCombatTime();
        let active = (c.owner.warriorRhythmExpiresAt || 0) > now;
        let stacks = active ? Math.max(0, Math.min(5, Math.floor(c.owner.warriorRhythmStacks || 0))) : 0;
        c.owner.warriorRhythmStacks = Math.min(5, stacks + 1);
        c.owner.warriorRhythmExpiresAt = now + 2000;
    }
}

function recordVeteranCritical(c) {
    if (!c.isStageReplay && c.deps.hasKeystone('g3')) {
        c.owner.gladiatorVeteranCritBonus = Math.max(0, Math.floor(c.owner.gladiatorVeteranCritBonus || 0));
        if (c.isCrit) c.owner.gladiatorVeteranCritBonus = 0;
        else c.owner.gladiatorVeteranCritBonus = Math.min(100, c.owner.gladiatorVeteranCritBonus + 5);
    }
}

function recordOverload(c) {
    c.preloadElementalistStacks = c.deps.getElementalistOverloadStacks();
    if (!c.isStageReplay && c.deps.hasKeystone('e8')) {
        c.deps.recordElementalistOverloadAttack(c.isCrit);
    }
    if (c.currentFanaticismStacks !== c.previousFanaticismStacks) {
        let previousMultiplier = 1 + c.previousFanaticismStacks * 0.015;
        let currentMultiplier = 1 + c.currentFanaticismStacks * 0.015;
        c.colosseumStrikeMul *= currentMultiplier / previousMultiplier;
    }
}

function prepareRiderCompass(c) {
    c.riderCompassReady = !!(c.pStats.uniqueRiderCompass && (c.owner.lastMoveEndedAt || 0) > 0 && !c.owner.uniqueRiderCompassConsumed);
}

function consumeBloodPact(c) {
    if (!c.isStageReplay && c.deps.hasKeystone('wlk7')) {
        let bloodPactCost = Math.floor((c.pStats.maxHp || c.owner.playerHp || 1) * 0.04);
        if (bloodPactCost > 0 && (c.owner.playerHp || 0) > bloodPactCost) {
            c.owner.playerHp -= bloodPactCost;
            c.colosseumStrikeMul *= 1 + c.deps.ASCENDANCY_KEYSTONE_VALUES.wlk7.bloodPactMorePct / 100;
        }
    }
}

function rollSingularity(c) {
    if (!c.isStageReplay && c.deps.hasKeystone('wlk6')) {
        let singularityMaxPct = 100 + (Math.max(0, c.pStats.resPen || 0) + Math.max(0, c.pStats.critDmg || 0)) * c.deps.ASCENDANCY_KEYSTONE_VALUES.wlk6.rangePct / 100;
        let singularityPct = 100 + c.deps.random() * Math.max(0, singularityMaxPct - 100);
        c.colosseumStrikeMul *= singularityPct / 100;
    }
}

function selectAttackElement(c) {
    c.getHitElement = () => {
        let pool = Array.isArray(c.pStats.sSkill.randomElementPool) ? c.pStats.sSkill.randomElementPool.filter(Boolean) : null;
        if (pool && pool.length > 0) return pool[Math.floor(c.deps.random() * pool.length)];
        return c.pStats.sSkill.ele || 'phys';
    };
    c.swingElement = c.options.forcedElement || c.getHitElement();
    if (!['phys','fire','cold','light','chaos'].includes(c.swingElement)) c.swingElement = (c.pStats.sSkill && c.pStats.sSkill.ele) || 'phys';
    if (typeof c.deps.getTalentDamageConversion === 'function') c.swingElement = c.deps.getTalentDamageConversion(c.swingElement).element;
}

function readTalentAttackMultiplier(c) {
    c.talentAttackMul = Number.isFinite(Number(c.options.talentAttackMultiplier))
        ? Math.max(0, Number(c.options.talentAttackMultiplier))
        : c.deps.getTalentPlayerAttackDamageMultiplier();
}

function queueInitialCast(c) {
    if (!c.isStageReplay) {
        c.deps.queuePlayerAttackSequence(c.pStats, c.pendingStages, {
            skillName: c.skillName, forcedCrit: c.isCrit, forcedElement: c.swingElement, stageCount: c.stageCount,
            talentAttackMultiplier: c.talentAttackMul, attackDamageMultiplier: c.colosseumStrikeMul,
            talentMoonReturn: c.talentMoonReturn, attackHitGuardCounts: c.attackHitGuardCounts, passiveKarmaContext: c.passiveKarmaContext,
            channelContinuation: c.channelContinuationRequested, repeatChannelCast: !!c.options.repeatChannelCast, landingMs: c.landingMs, kickoff: c.kickoff
        });
        return false;
    }
}

function prepareSlamEcho(c) {
    c.zoneTier = c.deps.getZone(c.owner.currentZoneId).tier;
    c.slamEchoPct = 0;
    c.slamEchoDelayMs = 1000;
    c.slamEchoGuaranteed = false;
    c.passiveSlamEchoChance = Math.max(0, Math.min(100, c.pStats.slamEchoChance || 0)) / 100;
    if (c.passiveSlamEchoChance > 0 && Array.isArray(c.pStats.sSkill.tags) && c.pStats.sSkill.tags.includes('slam')) c.slamEchoPct = Math.max(c.slamEchoPct, Math.max(0.25, (Number(c.pStats.slamEchoDamagePct || 0) / 100)));
    c.deps.talismanCombat.active().forEach(({ delta }) => {
        if (delta.slamEchoPct) { c.slamEchoPct = Math.max(c.slamEchoPct, delta.slamEchoPct); c.slamEchoGuaranteed = true; }
        if (delta.slamEchoDelaySec) c.slamEchoDelayMs = Math.max(100, Math.floor(delta.slamEchoDelaySec * 1000));
    });
    c.hits = [];
    c.totalLeechableDamage = 0;
    c.totalChaosDamage = 0;
    c.talentMoonPrimaryHit = false;
}

function prepareProjectileFeedback(c) {
    c.hasSkillConditionalFeedback = hasConditionalCue(c.pStats.sSkill);
    c.isProjectileSkill = Array.isArray(c.pStats.sSkill.tags) && c.pStats.sSkill.tags.includes('projectile');
    c.isFanProjectile = c.isProjectileSkill && c.pStats.sSkill.projectilePattern && c.pStats.sSkill.projectilePattern.kind === 'fan';
    c.projectileBonusShots = c.isProjectileSkill && !c.isFanProjectile ? Math.max(0, Math.floor(c.pStats.projectileExtraShots || 0)) : 0;
    c.curseProjectileExtraHits = 0;
}

function hasConditionalCue(skill) {
    return !!(skill.activeAilmentDamageMore || (skill.consumeAilmentDamageMore || []).length
        || skill.fullLifeDamageMorePct || skill.distanceDamageMoreCapPct);
}

function readCurseProjectileRepeats(c) {
    if (c.isProjectileSkill) {
        let aliveEnemies = (c.owner.enemies || []).filter(enemy => enemy && enemy.hp > 0);
        for (let enemy of aliveEnemies) {
            let fx = c.deps.getEnemyConditionDebuffFactor(enemy);
            c.curseProjectileExtraHits = Math.max(c.curseProjectileExtraHits, Math.max(0, Math.floor(fx.projectileExtraHits || 0)));
        }
    }
}

function rollProjectileRepeats(c) {
    c.projectileRepeatPct = c.isProjectileSkill ? Math.max(0, Number(c.pStats.uniqueProjectileDoubleStrikePct) || 0) : 0;
    c.uniqueProjectileExtraHits = Math.floor(c.projectileRepeatPct / 100);
    if (c.isProjectileSkill && c.deps.random() * 100 < (c.projectileRepeatPct % 100)) c.uniqueProjectileExtraHits += 1;
    c.chanceProjExtraShots = (c.isProjectileSkill && c.pStats.uniqueProjExtraShotChance && c.deps.random() * 100 < Number(c.pStats.uniqueProjExtraShotChance.chance || 0)) ? Math.max(0, Math.floor(c.pStats.uniqueProjExtraShotChance.shots || 0)) : 0;
}

function countAttackRepeats(c) {
    c.addedProjectileRepeatCount = c.projectileBonusShots + c.chanceProjExtraShots + c.curseProjectileExtraHits + c.uniqueProjectileExtraHits;
    c.nativeRepeats = c.options.stageRepeatOnce ? 1 : Math.max(1, Math.floor(c.pStats.sSkill.multiHit || 1));
    c.repeats = Math.max(1, Math.min(12, c.nativeRepeats + c.addedProjectileRepeatCount));
    c.baseRepeats = c.nativeRepeats;
    if (c.deps.hasKeystone('h7')) {
        c.pStats.sSkill.targets = 1;
    }
}

function createHitTracking(c) {
    c.perEnemyHitCount = new Map();
    c.originalPierceTargets = new Set(c.targets.map(entry => entry && entry.enemy).filter(Boolean));
    c.pierceOverkillCarryStartedTargets = new Set();
    c.hitSummary = { totalHits: 0, totalDamage: 0, uniqueTargets: new Set() };
    c.attackFeedbackGroup = c.options.damageTextGroupId ? String(c.options.damageTextGroupId) : '';
    c.attackFeedbackKeys = new Set();
}

// Called once in the original order; false cancels only this cast/contact.
export function preparePlayerCast(c) {
    if (startAttack(c) === false) return false;
    tickQueenBees(c);
    prepareTalentAttack(c);
    prepareColosseumStrike(c);
    if (selectAttackTargets(c) === false) return false;
    beginAttackMobility(c);
    selectHitSequence(c);
    recordFanaticism(c);
    rollAttackCritical(c);
    recordWarriorRhythm(c);
    recordVeteranCritical(c);
    recordOverload(c);
    prepareRiderCompass(c);
    consumeBloodPact(c);
    rollSingularity(c);
    selectAttackElement(c);
    readTalentAttackMultiplier(c);
    if (queueInitialCast(c) === false) return false;
    prepareSlamEcho(c);
    prepareProjectileFeedback(c);
    readCurseProjectileRepeats(c);
    rollProjectileRepeats(c);
    countAttackRepeats(c);
    createHitTracking(c);
}
