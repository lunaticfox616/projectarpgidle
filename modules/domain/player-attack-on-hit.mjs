// Ordered combat stages. c is cast-local; h is contact-local; dependencies are explicit at the classic boundary.

function dealContactDamage(c, h) {
    h.targetEnemy.lastHitElement = h.hitElement;
    h.moonShadowRatio = h.hitCrit && typeof c.deps.getPreciseTalentRatio === 'function'
        ? 0.20 * c.deps.getPreciseTalentRatio('hero3__assassin') : 0;
    h.normalDamage = h.moonShadowRatio > 0 ? Math.floor(h.dmg * (1 - h.moonShadowRatio)) : h.dmg;
    h.dealtToEnemy = c.deps.supports.dealHit(h.targetEnemy, c.pStats, h.normalDamage);
}

function showConditionalFeedback(c, h) {
    if (h.dealtToEnemy > 0) {
        if (h.skillConditionalCues) h.skillConditionalCues.forEach(cue => c.showAttackFeedback(h.targetEnemy, cue));
        if (c.stageKind === 'slamAftershock') {
            c.showAttackFeedback(h.targetEnemy, { key:'slam-aftershock', text:c.stageLabel || '여진', color:'#f0bd79' });
        }
        if (h.talentWasFull && (c.pStats.firstStrikeDamagePct || 0) > 0) {
            c.showAttackFeedback(h.targetEnemy, {
                key: 'first-strike',
                text: c.deps._t('선제 타격'),   // 2026-11-05 사용자: 수치 없이 이름만(전: 선제 타격: 피해 n% 증폭)
                color: '#ffd27a'
            });
        }
    }
}

function dealShadowDamage(c, h) {
    if (h.moonShadowRatio > 0) {
        let trueDamage = Math.max(0, Math.floor(h.damageBeforeMitigation * h.moonShadowRatio));
        h.dealtToEnemy += c.deps.applyDamageToEnemyResource(h.targetEnemy, trueDamage);
    }
    if (h.dealtToEnemy > 0 && h.hitElement === 'chaos') h.targetEnemy.talentHitByChaos = true;
    if (h.dealtToEnemy > 0 && c.options.talentMoonReturn && h.targetEnemy.id === c.options.talentMoonReturn.targetId) {
        c.talentMoonPrimaryHit = true;
    }
}

function triggerRiftWave(c, h) {
    if (c.pStats.uniqueRiftWaveOnHit && h.dealtToEnemy > 0 && c.deps.random() * 100 < Math.max(0, Number(c.pStats.uniqueRiftWaveOnHit.chance) || 0)) {
        let waveDamage = Math.max(1, Math.floor(h.dealtToEnemy * Math.max(0, Number(c.pStats.uniqueRiftWaveOnHit.damagePct) || 0) / 100));
        (c.owner.enemies || []).forEach(otherEnemy => {
            if (!otherEnemy || otherEnemy.hp <= 0 || otherEnemy.id === h.targetEnemy.id) return;
            let waveDealt = c.deps.applyDamageToEnemyResource(otherEnemy, waveDamage);
            if (waveDealt > 0) {
                c.deps.addBattleFx('hit', { enemyId: otherEnemy.id, color: '#a879ff', damage: waveDealt, duration: 210, element: 'chaos', syncToSwing: true });
                if (otherEnemy.hp <= 0) c.deps.handleEnemyDeath(otherEnemy, c.pStats);
            }
        });
    }
}

function executeCullStrike(c, h) {
    if (h.dmg > 0 && h.targetEnemy.hp > 0 && !h.targetEnemy.isBoss && (c.pStats.cullStrikePct || 0) > 0) {
        let cullThr = Math.max(0, Math.min(20, Number(c.pStats.cullStrikePct) || 0)) / 100;
        if (cullThr > 0 && withinCullThreshold(h.targetEnemy, cullThr)) {
            h.dealtToEnemy += c.deps.applyDamageToEnemyResource(h.targetEnemy, c.deps.getEnemyLifeAndShield(h.targetEnemy));
            c.showAttackFeedback(h.targetEnemy, { key:'cull', text:c.deps._t('처형'), color:'#ff9b79' });
        }
    }
}

function withinCullThreshold(enemy, threshold) {
    return enemy.hp / Math.max(1, enemy.maxHp || enemy.hp || 1) <= threshold;
}

function executeNormalMonster(c, h) {
    if (h.dmg > 0 && h.targetEnemy.hp > 0 && !h.targetEnemy.isBoss && !h.targetEnemy.isElite && !h.targetEnemy.elite
        && (c.pStats.uniqueInstakillNormalPct || 0) > 0 && c.deps.random() * 100 < c.pStats.uniqueInstakillNormalPct) {
        h.dealtToEnemy += c.deps.applyDamageToEnemyResource(h.targetEnemy, c.deps.getEnemyLifeAndShield(h.targetEnemy));
        c.showAttackFeedback(h.targetEnemy, { key:'instant-kill', text:c.deps._t('즉시 처치'), color:'#d7b0ff' });
    }
}

function executeOccupiedDot(c, h) {
    if (h.dmg > 0 && h.targetEnemy.hp > 0 && typeof c.deps.getTalentDotOccupancyDamage === 'function'
        && c.deps.getTalentDotOccupancyDamage(h.targetEnemy, c.pStats) >= c.deps.getEnemyLifeAndShield(h.targetEnemy)) {
        h.dealtToEnemy += c.deps.applyDamageToEnemyResource(h.targetEnemy, c.deps.getEnemyLifeAndShield(h.targetEnemy));
        c.showAttackFeedback(h.targetEnemy, { key:'dot-execute', text:c.deps._t('지속 피해 처형'), color:'#c88cff' });
    }
}

function accumulateInquisitorMark(c, h) {
    if (h.dmg > 0 && h.targetEnemy.hp > 0 && typeof c.deps.isTalentCardActive === 'function' && c.deps.isTalentCardActive('hero1__inquisitor')) {
        c.owner.talentInquisitorMarks = (c.owner.talentInquisitorMarks && typeof c.owner.talentInquisitorMarks === 'object') ? c.owner.talentInquisitorMarks : {};
        let nowMk = c.deps.getCombatTime();
        let mk = c.owner.talentInquisitorMarks[h.targetEnemy.id] || { accumulated: 0, explodeAt: 0, cooldownUntil: 0 };
        chargeInquisitorMark(c, h, mk, nowMk);
    }
}

function chargeInquisitorMark(c, h, mk, nowMk) {
    if ((mk.cooldownUntil || 0) <= nowMk) {
        if (!mk.explodeAt) mk.explodeAt = nowMk + 5000;
        mk.accumulated = (mk.accumulated || 0) + h.dealtToEnemy;
        c.owner.talentInquisitorMarks[h.targetEnemy.id] = mk;
    }
}

function detonateHexbowCurse(c, h) {
    if (h.dmg > 0 && typeof c.deps.isTalentCardActive === 'function' && c.deps.isTalentCardActive('hero1__warlock')
        && c.owner.enemyConditionDebuffs && Array.isArray(c.owner.enemyConditionDebuffs[h.targetEnemy.id])
        && c.owner.enemyConditionDebuffs[h.targetEnemy.id].some(d => d && (d.expiresAt || 0) > c.deps.getCombatTime())) {
        let activeCurses = c.owner.enemyConditionDebuffs[h.targetEnemy.id];
        let consumedCurseIndex = activeCurses.findIndex(d => d && (d.expiresAt || 0) > c.deps.getCombatTime());
        if (consumedCurseIndex >= 0) activeCurses.splice(consumedCurseIndex, 1);
        let splash = Math.max(1, Math.floor(h.dmg * 0.2));
        (c.owner.enemies || []).forEach(e => {
            if (!e || e.hp <= 0) return;
            c.deps.applyDamageToEnemyResource(e, splash);
            c.deps.addBattleFx('hit', { enemyId: e.id, color: c.deps.getElementColor('chaos'), damage: splash, duration: 220, syncToSwing: true });
            if (e.hp <= 0) c.deps.handleEnemyDeath(e, c.pStats);
        });
    }
}

function applyMaxRollBonus(c, h) {
    if (h.targetEnemy.hp <= 0) h.targetEnemy.lastOverkillDamage = Math.max(0, h.dmg - h.dealtToEnemy);
    if (c.pStats.uniqueMaxRollBonusHit && h.rollPct >= 130 && h.dealtToEnemy > 0 && h.targetEnemy.hp > 0) {
        let bonus = Math.max(1, Math.floor(h.dealtToEnemy * 0.5));
        h.dealtToEnemy += c.deps.applyDamageToEnemyResource(h.targetEnemy, bonus);
    }
}

function applyRangerWeakpoint(c, h) {
    if (c.deps.hasKeystone('r5') && h.targetEnemy.hp > 0) {
        c.owner.rangerWeakpointMarks = c.owner.rangerWeakpointMarks || {};
        let mark = c.owner.rangerWeakpointMarks[h.targetEnemy.id] || { hits: 0 };
        mark.hits = Math.max(0, Math.floor(mark.hits || 0)) + 1;
        if (mark.hits >= 3) {
            mark.hits = 0;
            let bonus = c.deps.getRangerWeakpointBonus(h.targetEnemy, h.dmg);
            h.dealtToEnemy += c.deps.applyDamageToEnemyResource(h.targetEnemy, bonus);
            c.deps.addBattleFx('hit', { enemyId: h.targetEnemy.id, color: c.deps.getElementColor('phys'), damage: bonus, duration: 280, element: 'phys', syncToSwing: true });
        }
        c.owner.rangerWeakpointMarks[h.targetEnemy.id] = mark;
    }
    c.deps.maybeUnlockChaosRealmFromWoodsman(h.targetEnemy);
}

function carryPierceOverkill(c, h) {
    if (h.targetEnemy.hp <= 0 && h.dmg > h.dealtToEnemy) {
        let overkillDamage = h.dmg - h.dealtToEnemy;
        let ailmentOverkillSourceDamage = h.dmg > 0 ? Math.floor(h.ailmentDamageBeforeCritMitigation * (overkillDamage / h.dmg)) : 0;
        let isOriginalPierceTarget = c.originalPierceTargets.size === 0 || c.originalPierceTargets.has(h.targetEnemy);
        let canStartPierceCarry = !c.pStats.sSkill.pierceOverkillCarry
            || (isOriginalPierceTarget && !c.pierceOverkillCarryStartedTargets.has(h.targetEnemy));
        if (canStartPierceCarry) {
            if (c.pStats.sSkill.pierceOverkillCarry) c.pierceOverkillCarryStartedTargets.add(h.targetEnemy);
            c.applyPierceOverkillCarry(h.targetEnemy, overkillDamage, h.hitElement, h.hitCrit, ailmentOverkillSourceDamage);
        }
    }
}

function scheduleSlamEcho(c, h) {
    if (c.options.skipSlamEcho || !(c.slamEchoPct > 0) || !(c.pStats.sSkill.tags || []).includes('slam')) return;
    rollSlamEcho(c, h);
}

function rollSlamEcho(c, h) {
    if (h.dmg > 0 && h.targetEnemy.hp > 0 && (c.slamEchoGuaranteed || c.passiveSlamEchoChance <= 0 || c.deps.random() < c.passiveSlamEchoChance)) {
        let slamEchoBaseDamage = c.stageKind === 'slamPrimary'
            ? Math.floor(h.dmg / Math.max(0.01, c.stageDamageMultiplier))
            : h.dmg;
        c.owner.pendingSlamEchoHits = Array.isArray(c.owner.pendingSlamEchoHits) ? c.owner.pendingSlamEchoHits : [];
        c.owner.pendingSlamEchoHits.push({
            at: c.deps.getCombatTime() + c.slamEchoDelayMs,
            enemyId: h.targetEnemy.id,
            damage: Math.max(1, Math.floor(slamEchoBaseDamage * c.slamEchoPct)),
            element: h.hitElement
        });
    }
}

function executeTalismanBoss(c, h) {
    if ((c.pStats.damageScales || {}).talismanBossFinalDmgBonusPct && h.targetEnemy.hp > 0 && (h.targetEnemy.hp / Math.max(1, h.targetEnemy.maxHp || h.targetEnemy.hp)) <= 0.05) {
        h.targetEnemy.hp = 0;
        c.showAttackFeedback(h.targetEnemy, { key:'boss-finish', text:c.deps._t('마무리'), color:'#f4c779' });
    }
}

function executeTalentChain(c, h) {
    if (h.targetEnemy.hp > 0 && !h.targetEnemy.isBoss && !h.targetEnemy.isElite && !h.targetEnemy.elite
        && c.deps.getCombatTalentCardLevel('hero2__assassin') > 0) {
        executeButcherMark(c, h);
    }
}

function executeButcherMark(c, h) {
    let butcherRow = c.owner.talentButcherMarks && c.owner.talentButcherMarks[h.targetEnemy.id];
    let butcherLifeRatio = h.targetEnemy.hp / Math.max(1, h.targetEnemy.maxHp || h.targetEnemy.hp);
    if (butcherRow && butcherRow.hits >= 4 && butcherLifeRatio <= 0.30) {
        h.targetEnemy.hp = 0;
        c.showAttackFeedback(h.targetEnemy, { key:'butcher-execute', text:c.deps._t('처형'), color:'#ff9b79' });
    }
}

function executeSkillThreshold(c, h) {
    c.deps.updateTalentButcherHitMark(h.targetEnemy);
    if (c.deps.canApplyTalentExecuteThreshold(h.targetEnemy, c.pStats.sSkill.executeThreshold) && h.targetEnemy.hp > 0
                    && (h.targetEnemy.hp / Math.max(1, h.targetEnemy.maxHp || h.targetEnemy.hp)) < c.pStats.sSkill.executeThreshold) {
        h.targetEnemy.hp = 0;
        c.showAttackFeedback(h.targetEnemy, { key:'skill-execute', text:c.deps._t('처형'), color:'#ff9b79' });
    }
}

function executeGladiator(c, h) {
    if (c.deps.hasKeystone('g6') && h.targetEnemy.hp > 0) {
        let executeThreshold = h.targetEnemy.isBoss ? 0.10 : 0.20;
        if ((h.targetEnemy.hp / Math.max(1, h.targetEnemy.maxHp || h.targetEnemy.hp)) < executeThreshold) {
            h.targetEnemy.hp = 0;
            c.showAttackFeedback(h.targetEnemy, { key:'gladiator-execute', text:c.deps._t('처형'), color:'#ff9b79' });
        }
    }
}

// Called once in the original order; false cancels only this cast/contact.
export function applyPlayerContact(c, h) {
    dealContactDamage(c, h);
    showConditionalFeedback(c, h);
    dealShadowDamage(c, h);
    triggerRiftWave(c, h);
    executeCullStrike(c, h);
    executeNormalMonster(c, h);
    executeOccupiedDot(c, h);
    accumulateInquisitorMark(c, h);
    detonateHexbowCurse(c, h);
    applyMaxRollBonus(c, h);
    applyRangerWeakpoint(c, h);
    carryPierceOverkill(c, h);
    scheduleSlamEcho(c, h);
    executeTalismanBoss(c, h);
    executeTalentChain(c, h);
    executeSkillThreshold(c, h);
    executeGladiator(c, h);
}
