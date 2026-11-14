// Ordered combat stages. c is cast-local; h is contact-local; dependencies are explicit at the classic boundary.

function recordRecentHit(c, h) {
    if ((c.pStats.regenSuppress || 0) > 0) h.targetEnemy.regenSuppressPct = Math.min(95, (h.targetEnemy.regenSuppressPct || 0) + c.pStats.regenSuppress);
    h.targetEnemy.recentHitsTaken = (h.targetEnemy.recentHitsTaken || 0) + 1;
    h.targetEnemy.recentHitsTimer = 1.8;
}

function stackChaosResistanceLoss(c, h) {
    if (c.pStats.uniqueChaosResDownOnHit) {
        c.owner.enemyUniqueChaosResDown = c.owner.enemyUniqueChaosResDown || {};
        let row = c.owner.enemyUniqueChaosResDown[h.targetEnemy.id] || { stacks: 0, perHit: c.pStats.uniqueChaosResDownOnHit.perHit, maxStacks: c.pStats.uniqueChaosResDownOnHit.maxStacks };
        row.stacks = Math.min(row.maxStacks, Math.max(0, row.stacks + 1));
        row.perHit = c.pStats.uniqueChaosResDownOnHit.perHit;
        row.maxStacks = c.pStats.uniqueChaosResDownOnHit.maxStacks;
        c.owner.enemyUniqueChaosResDown[h.targetEnemy.id] = row;
    }
}

function stackElementResistanceLoss(c, h) {
    if (c.pStats.uniqueStackingElementalResDownOnHit && ['fire','cold','light'].includes(h.hitElement)) {
        c.owner.enemyUniqueElementalResDown = c.owner.enemyUniqueElementalResDown || {};
        let row = c.owner.enemyUniqueElementalResDown[h.targetEnemy.id] || { stacks: 0, perHit: c.pStats.uniqueStackingElementalResDownOnHit.perHit, max: c.pStats.uniqueStackingElementalResDownOnHit.max };
        row.stacks = Math.min(Math.ceil(row.max / Math.max(1,row.perHit)), Math.max(0, row.stacks + 1));
        row.perHit = c.pStats.uniqueStackingElementalResDownOnHit.perHit;
        row.max = c.pStats.uniqueStackingElementalResDownOnHit.max;
        c.owner.enemyUniqueElementalResDown[h.targetEnemy.id] = row;
    }
}

function summonQueenBee(c) {
    if (c.pStats.uniqueQueenBeeSummon && c.deps.random() < Math.max(0, Math.min(1, (c.pStats.uniqueQueenBeeSummon.chance || 0) / 100))) {
        let bees = c.owner.queenBees || [];
        bees.push({ expiresAt: c.deps.getCombatTime() + Math.max(1000, Math.floor((c.pStats.uniqueQueenBeeSummon.attacks || 3) * 1000)), nextAt: c.deps.getCombatTime() + 1000, attacksLeft: Math.max(1, Math.floor(c.pStats.uniqueQueenBeeSummon.attacks || 3)), hitPct: Math.max(1, Number(c.pStats.uniqueQueenBeeSummon.hitPct || 125)) });
        while (bees.length > Math.max(1, Math.floor(c.pStats.uniqueQueenBeeSummon.maxBees || 10))) bees.shift();
        c.owner.queenBees = bees;
    }
}

function triggerMeteor(c, h) {
    if (h.hitCrit && c.pStats.uniqueMeteorFootsteps && c.deps.random() < Math.max(0, Math.min(1, (c.pStats.uniqueMeteorFootsteps.chance || 0) / 100))) {
        let meteor = Math.max(1, Math.floor(h.dmg * (Math.max(1, Number(c.pStats.uniqueMeteorFootsteps.damagePct || 180)) / 100)));
        (c.owner.enemies || []).forEach(e => { if (!e || e.hp <= 0) return; c.deps.applyDamageToEnemyResource(e, meteor); });
    }
}

function triggerShockTracer(c, h) {
    if (c.pStats.uniqueShockTracer && Array.isArray(h.targetEnemy.ailments) && h.targetEnemy.ailments.some(a => a && a.type === 'shock' && (a.time || 0) > 0)) {
        let now = c.deps.getCombatTime();
        c.owner.uniqueShockTracerNextAt = Number(c.owner.uniqueShockTracerNextAt || 0);
        if (now >= c.owner.uniqueShockTracerNextAt) {
            let icdMs = Math.max(100, Math.floor((Number(c.pStats.uniqueShockTracer.icdSec || 0.5)) * 1000));
            c.owner.uniqueShockTracerNextAt = now + icdMs;
            let strikePct = Math.max(1, Number(c.pStats.uniqueShockTracer.strikeDamagePct || 500));
            let strike = Math.max(1, Math.floor(h.dmg * (strikePct / 100)));
            h.dealtToEnemy += c.deps.applyDamageToEnemyResource(h.targetEnemy, strike);
        }
    }
}

function grantDragonGuard(c) {
    if (c.pStats.uniqueDragonVeinGuard && c.deps.random() < Math.max(0, Math.min(1, (c.pStats.uniqueDragonVeinGuard.chance || 0) / 100))) {
        let guardAmt = Math.max(1, Math.floor((c.pStats.maxHp || 0) * Math.max(0, Number(c.pStats.uniqueDragonVeinGuard.hpPct || 8)) / 100));
        c.owner.playerUniqueGuard = { amount: guardAmt, expiresAt: c.deps.getCombatTime() + Math.max(500, Math.floor((c.pStats.uniqueDragonVeinGuard.duration || 2) * 1000)) };
    }
}

function recordContactSummary(c, h) {
    c.totalLeechableDamage += h.dealtToEnemy * (h.targetEnemy && h.targetEnemy.leechEffMul !== undefined ? h.targetEnemy.leechEffMul : 1);
    if (h.hitElement === 'chaos') c.totalChaosDamage += h.dealtToEnemy;
    c.hits.push(h.dealtToEnemy);
    c.deps.notePlayerHitSummary(c.hitSummary, h.targetEnemy, h.dealtToEnemy);
    c.deps.addPlayerHitVisualFx(c.pStats, c.options, h.targetEnemy, {
        stageKind: c.stageKind, stageLabel: c.stageLabel, stageCount: c.stageCount, skillName: c.skillName, hitCrit: h.hitCrit, hitIdx: h.hitIdx,
        hitElement: h.hitElement, dealtToEnemy: h.dealtToEnemy, dmg: h.dmg, isStageReplay: c.isStageReplay
    });
}

function stackAssassinWeakness(c, h) {
    if (h.hitCrit && c.deps.hasKeystone('a3')) {
        let now = c.deps.getCombatTime();
        c.owner.enemyKeystoneDebuffs = c.owner.enemyKeystoneDebuffs || {};
        let list = (c.owner.enemyKeystoneDebuffs[h.targetEnemy.id] || []).filter(row => row && (row.expiresAt || 0) > now);
        list.push({ type: 'a3', expiresAt: now + 5000 });
        while (list.filter(row => row.type === 'a3').length > 10) { let idx=list.findIndex(row=>row.type==='a3'); if (idx>=0) list.splice(idx,1); else break; }
        c.owner.enemyKeystoneDebuffs[h.targetEnemy.id] = list;
        h.targetEnemy.ailments = Array.isArray(h.targetEnemy.ailments) ? h.targetEnemy.ailments : [];
        let stacks = list.filter(row => row.type === 'a3').length;
        let mark = h.targetEnemy.ailments.find(ail => ail && ail.type === 'assassinWeakness');
        if (mark) { mark.time = 5; mark.power = stacks; }
        else h.targetEnemy.ailments.push({ type: 'assassinWeakness', time: 5, power: stacks });
    }
}

function applyContactAilments(c, h) {
    if (c.isDotSkill) c.deps.applySkillDotFromHit(h.targetEnemy, h.damageBeforeMitigation, c.pStats);
    h.ailmentType = c.deps.getAilmentTypeFromElement(h.hitElement);
    h.conditionAilmentTakenMul = h.curseFx && h.curseFx.ailmentTakenMul ? (h.curseFx.ailmentTakenMul[h.ailmentType] || 1) : 1;
    h.ailmentStats = c.deps.getSkillAilmentStats(c.pStats, h.hitElement, h.curseFx);
    c.deps.applyEnemyAilmentFromHit(h.targetEnemy, h.ailmentStats, h.dmg, h.hitCrit, {
        ailmentSourceDamage: Math.floor(h.ailmentDamageBeforeCritMitigation * h.conditionAilmentTakenMul),
        critDotBonusPct: h.hitCrit ? 50 : 0,
        primaryAilmentChance: c.options.primaryAilmentChance,
        additionalAilmentChances: c.deps.regionAffixEffects.extraAilmentChances(c.pStats)
    });
    c.deps.spreadSkillAilmentOnHit(h.targetEnemy, c.pStats.sSkill, c.pStats);
    c.deps.applySkillPeriodicOnHit(h.targetEnemy, c.pStats.sSkill, h.dealtToEnemy, c.pStats.sSkill.visualName || c.skillName);
    c.deps.applySkillGridControlOnHit(h.targetEnemy, c.pStats.sSkill, c.options);
    c.deps.applySupportEchoOnHit(h.targetEnemy, c.pStats, h.dealtToEnemy);
    c.deps.applySupportChaosErosionOnHit(h.targetEnemy, c.pStats, h.hitElement);
    c.deps.applyCosmosJudgmentOnHit(h.targetEnemy, c.pStats, h.hitElement);
    c.deps.regionAffixEffects.afterHit(c.pStats, h.targetEnemy, { crit: h.hitCrit, damage: h.dealtToEnemy });
}

function applyAlwaysShock(c, h) {
    if (c.pStats.uniqueAlwaysShock && !c.pStats.cosmosCometChillNoFreeze) {
        let shockStats = { ...c.pStats, sSkill: { ...c.pStats.sSkill, ele: 'light' } };
        let shockHit = Math.max(1, Math.floor(h.dmg * 0.25 * (1 + Math.max(0, Number(c.pStats.shockEffectBonusPct)||0)/100)));
        c.deps.applyEnemyAilmentFromHit(h.targetEnemy, shockStats, shockHit, true);
    }
}

// Called once in the original order; false cancels only this cast/contact.
export function finishPlayerContact(c, h) {
    recordRecentHit(c, h);
    stackChaosResistanceLoss(c, h);
    stackElementResistanceLoss(c, h);
    summonQueenBee(c, h);
    triggerMeteor(c, h);
    triggerShockTracer(c, h);
    grantDragonGuard(c, h);
    recordContactSummary(c, h);
    stackAssassinWeakness(c, h);
    applyContactAilments(c, h);
    applyAlwaysShock(c, h);
}
