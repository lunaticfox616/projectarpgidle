// Ordered combat stages. c is cast-local; h is contact-local; dependencies are explicit at the classic boundary.

function rollHunterCritical(c, h) {
    h.hitBaseDamage = c.pStats.baseDmg;
    h.ailmentBaseDamage = c.pStats.baseDmg;
    if (c.deps.hasKeystone('h8')) {
        let critCount = 0;
        let critChancePct = Math.max(0, Number(c.pStats.crit) || 0);
        while (critChancePct > 0) {
            let slice = Math.min(100, critChancePct);
            if (c.deps.random() * 100 < slice) critCount++;
            critChancePct -= 100;
        }
        if (critCount > 0) {
            h.hitCrit = true;
            let critMul = Math.max(1, c.pStats.critDmg / 100);
            h.hitBaseDamage = Math.floor(h.hitBaseDamage * (1 + ((critMul - 1) * critCount)));
        }
    } else {
        h.hitBaseDamage = h.hitCrit ? Math.floor(c.pStats.baseDmg * (c.pStats.critDmg / 100)) : c.pStats.baseDmg;
    }
}

function clearForbiddenCritical(c, h) {
    if (c.pStats.passiveKeystoneFlags && (c.pStats.passiveKeystoneFlags.explosiveDistill
        || c.pStats.passiveKeystoneFlags.taintedWarhead)) {
        h.hitCrit = false;
        h.hitBaseDamage = c.pStats.baseDmg;
    }
}

function resistCriticalChance(c, h) {
    if (h.hitCrit && !c.guaranteedCrit && !h.passiveGuaranteedCrit && (h.targetEnemy.critResistPct || 0) > 0 && c.deps.random() * 100 < Math.max(0, Math.min(95, h.targetEnemy.critResistPct || 0))) {
        h.hitCrit = false;
        h.hitBaseDamage = c.pStats.baseDmg;
    }
}

function scaleTalentCritical(c, h) {
    h.talentCritDmgMultiplier = typeof c.deps.getTalentCritDamageMultiplier === 'function' ? c.deps.getTalentCritDamageMultiplier(h.hitCrit) : 1;
    if (h.talentCritDmgMultiplier !== 1) h.hitBaseDamage = Math.floor(h.hitBaseDamage * h.talentCritDmgMultiplier);
    if (h.hitCrit && (h.targetEnemy.critDamageResistPct || 0) > 0) {
        let critResist = Math.max(0, Math.min(95, Number(h.targetEnemy.critDamageResistPct || 0))) / 100;
        let basePart = Math.max(1, Math.floor(c.pStats.baseDmg || 1));
        h.hitBaseDamage = Math.max(1, Math.floor(basePart + Math.max(0, h.hitBaseDamage - basePart) * (1 - critResist)));
    }
}

function consumeRiderCompass(c, h) {
    if (c.riderCompassReady) {
        h.hitBaseDamage = Math.floor(h.hitBaseDamage * 2);
        h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * 2);
        c.riderCompassReady = false;
        c.owner.uniqueRiderCompassConsumed = true;
    }
}

function scaleCriticalAndElement(c, h) {
    if (h.hitCrit && c.deps.hasKeystone('a7') && (c.owner.enemies || []).filter(e => e && e.hp > 0).length === 1) h.hitBaseDamage *= 1 + c.deps.ASCENDANCY_KEYSTONE_VALUES.a7.extraHitPct / 100;
    if (h.hitCrit) h.hitBaseDamage *= c.deps.getGemCritHitPerkMul(c.skillName, c.pStats);
    h.randomElementPct = c.pStats.randomElementDamagePct && Number(c.pStats.randomElementDamagePct[h.hitElement]) ? Number(c.pStats.randomElementDamagePct[h.hitElement]) : 0;
    if (h.randomElementPct) {
        h.hitBaseDamage = Math.floor(h.hitBaseDamage * (1 + h.randomElementPct / 100));
        h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * (1 + h.randomElementPct / 100));
    }
}

function scalePhysicalHit(c, h) {
    if (h.hitElement === 'phys') {
        let physMul = Math.max(0, Number(c.pStats.warriorPhysDamageMultiplier) || 1);
        h.hitBaseDamage = Math.floor(h.hitBaseDamage * physMul);
        h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * physMul);
    }
}

function scaleLoneHunter(c, h) {
    if (c.deps.hasKeystone('h1')) {
        let aliveCnt = (c.owner.enemies || []).filter(e => e && e.hp > 0).length;
        let hunterMul = 1 + (aliveCnt === 1 ? c.deps.ASCENDANCY_KEYSTONE_VALUES.h1.singleMorePct : c.deps.ASCENDANCY_KEYSTONE_VALUES.h1.multiMorePct) / 100;
        h.hitBaseDamage = Math.floor(h.hitBaseDamage * hunterMul);
        h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * hunterMul);
    }
}

function scaleAilmentAndBossHit(c, h) {
    [h.hitBaseDamage, h.ailmentBaseDamage] = c.deps.applyAilingTargetDamage(c.pStats, h.targetEnemy, h.hitElement, h.hitCrit, [h.hitBaseDamage, h.ailmentBaseDamage]);
    if (h.targetEnemy.isBoss) {
        let bossMul = Math.max(0, Number(c.pStats.bossDamageDealtMultiplier) || 1);
        bossMul *= (1 + Math.max(0, Number(c.pStats.bossDamagePct) || 0) / 100);
        h.hitBaseDamage = Math.floor(h.hitBaseDamage * bossMul * (1 + Math.max(0, c.pStats.cosmosBossDamageMorePct || 0) / 100));
        h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * bossMul * (1 + Math.max(0, c.pStats.cosmosBossDamageMorePct || 0) / 100));
    } else if (h.targetEnemy.isElite && (c.pStats.eliteDamagePct || 0) > 0) {
        let eliteMul = 1 + Math.max(0, Number(c.pStats.eliteDamagePct) || 0) / 100;
        h.hitBaseDamage = Math.floor(h.hitBaseDamage * eliteMul);
        h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * eliteMul);
    }
}

function consumeSwiftOpening(c, h) {
    if (c.deps.hasKeystone('g5') && c.owner.gladiatorSwiftOpeningReady) {
        h.hitBaseDamage = Math.floor(h.hitBaseDamage * 1.30);
        h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * 1.30);
        c.owner.gladiatorSwiftOpeningReady = false;
    }
}

function scaleTalentHit(c, h) {
    h.talentKeystoneMul = 1;
    if (typeof c.deps.getTalentPrecisePlayerHitMultiplier === 'function') {
        h.talentKeystoneMul *= c.deps.getTalentPrecisePlayerHitMultiplier(h.hitElement);
    }
    if (typeof c.deps.getTalentButcherBossMultiplier === 'function') h.talentKeystoneMul *= c.deps.getTalentButcherBossMultiplier(h.targetEnemy);
    h.talentHitMul = c.talentAttackMul * h.talentKeystoneMul * (c.colosseumStrikeMul || 1);
    h.talentHitMul *= c.deps.getPassiveKeystoneHitMultiplier(c.pStats, h.targetEnemy, h.hitIdx, h.targetIndex, c.skillName) * c.deps.ascendancyNodeRules.blastMultiplier(c.pStats, h.hitEntries.length);
    h.hitBaseDamage = Math.floor(h.hitBaseDamage * h.talentHitMul);
    h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * h.talentHitMul);
}

function advanceOrbitMultiplier(c, h) {
    if (c.pStats.cosmosOrbitCycle && h.targetEnemy) {
        let cycle = c.pStats.cosmosOrbitCycle;
        let current = Number.isFinite(h.targetEnemy.cosmosOrbitMul) ? h.targetEnemy.cosmosOrbitMul : Number(cycle.high || 1.3);
        h.hitBaseDamage = Math.floor(h.hitBaseDamage * current);
        h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * current);
        advanceOrbitState(h.targetEnemy, cycle, current);
    }
}

function advanceOrbitState(enemy, cycle, current) {
    let dir = Number.isFinite(enemy.cosmosOrbitDir) ? enemy.cosmosOrbitDir : -1;
    let next = current + (dir * Math.max(0.01, Number(cycle.step || 0.2)));
    if (next <= Number(cycle.low || 0.7)) { next = Number(cycle.low || 0.7); dir = 1; }
    if (next >= Number(cycle.high || 1.3)) { next = Number(cycle.high || 1.3); dir = -1; }
    enemy.cosmosOrbitMul = Number(next.toFixed(2));
    enemy.cosmosOrbitDir = dir;
}

function rollHitDamage(c, h) {
    h.dmg = Math.floor(h.hitBaseDamage * (h.hit.mult || 1));
    h.ailmentSourceDamage = Math.floor(h.ailmentBaseDamage * (h.hit.mult || 1));
    h.dmg = Math.floor(h.dmg * c.stageDamageMultiplier);
    h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * c.stageDamageMultiplier);
    h.repeatDamageMultiplier = c.deps.getSkillRepeatDamageMultiplier(c.pStats.sSkill, h.hitIdx, c.baseRepeats);
    h.dmg = Math.floor(h.dmg * h.repeatDamageMultiplier);
    h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * h.repeatDamageMultiplier);
    if (!Number.isFinite(h.dmg)) h.dmg = 0;
    h.minRoll = Math.max(1, Math.floor(c.pStats.minDmgRoll || 80));
    h.maxRoll = Math.max(h.minRoll, Math.floor(c.pStats.maxDmgRoll || 100));
    h.rollPct = h.minRoll + c.deps.random() * (h.maxRoll - h.minRoll);
    if (c.pStats.uniqueCeilingSmashDouble && h.rollPct >= 140 && c.deps.random() < 0.15) {
        h.dmg *= 2;
        h.ailmentSourceDamage *= 2;
    }
}

function scaleUnderdogRoll(c, h) {
    if ((c.pStats.uniqueUnderdogMorePct || 0) > 0 && h.rollPct < h.maxRoll) {
        let underdogMul = 1 + Math.max(0, c.pStats.uniqueUnderdogMorePct) / 100;
        h.dmg = Math.floor(h.dmg * underdogMul);
        h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * underdogMul);
    }
    h.dmg = Math.floor(h.dmg * (h.rollPct / 100));
    h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * (h.rollPct / 100));
}

function scaleChaosRoll(c, h) {
    if (h.hitElement === 'chaos') {
        let chaosMultiplier = Math.max(0, Number(c.pStats.chaosDamageMultiplier) || 1);
        h.dmg = Math.floor(h.dmg * chaosMultiplier);
        h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * chaosMultiplier);
    } else if (c.deps.getPassiveChaosConversionShare(c.pStats, h.hitElement) > 0) {
        let chaosShare = c.deps.getPassiveChaosConversionShare(c.pStats, h.hitElement);
        let convertedMultiplier = 1 - chaosShare + Math.max(0, Number(c.pStats.chaosDamageMultiplier) || 1) * chaosShare;
        h.dmg = Math.floor(h.dmg * convertedMultiplier);
        h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * convertedMultiplier);
    }
}

function rollFirstHit(c, h) {
    h.cosmosFirstHitRoll = c.pStats.cosmosAlwaysFirstHit || ((c.pStats.cosmosAlwaysFirstHitChancePct || 0) > 0 && c.deps.random() * 100 < (c.pStats.cosmosAlwaysFirstHitChancePct || 0));
    if ((c.pStats.firstHitDamageMorePct || 0) > 0 && (h.cosmosFirstHitRoll || !h.targetEnemy.firstHitConsumed)) {
        let firstMul = 1 + Math.max(0, Number(c.pStats.firstHitDamageMorePct || 0)) / 100;
        h.dmg = Math.floor(h.dmg * firstMul);
        h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * firstMul);
    }
}

function applyFirstHitGuard(c, h) {
    if ((h.targetEnemy.firstHitGuard || 0) > 0 && (h.cosmosFirstHitRoll || !h.targetEnemy.firstHitConsumed)) {
        h.dmg = Math.floor(h.dmg * (1 - h.targetEnemy.firstHitGuard));
        h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * (1 - h.targetEnemy.firstHitGuard));
        if (!h.cosmosFirstHitRoll) h.targetEnemy.firstHitConsumed = true;
    }
}

function applyRepeatedHitGuard(c, h) {
    h.hitGuard = Math.max(0, Number(h.targetEnemy.hitRateGuard) || 0) * Math.min(5, h.priorGuardedHits);
    if (h.hitGuard > 0) {
        let hitGuardMul = Math.max(0.2, 1 - h.hitGuard);
        h.dmg = Math.floor(h.dmg * hitGuardMul);
        h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * hitGuardMul);
    }
}

function applyBurstGuard(c, h) {
    h.burstHits = Math.max(0, (h.targetEnemy.recentHitsTaken || 0) - 2);
    if ((h.targetEnemy.comboTakenLessPct || 0) > 0 && h.burstHits > 0) {
        let comboLess = Math.max(0, Math.min(85, Number(h.targetEnemy.comboTakenLessPct || 0) * Math.min(5, h.burstHits) / 5));
        h.dmg = Math.floor(h.dmg * (1 - comboLess / 100));
        h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * (1 - comboLess / 100));
    }
    h.damageBeforeMitigation = h.dmg;
    h.addedDamageSource = h.damageBeforeMitigation;
}

// Called once in the original order; false cancels only this cast/contact.
export function rollPlayerContact(c, h) {
    rollHunterCritical(c, h);
    clearForbiddenCritical(c, h);
    resistCriticalChance(c, h);
    scaleTalentCritical(c, h);
    consumeRiderCompass(c, h);
    scaleCriticalAndElement(c, h);
    scalePhysicalHit(c, h);
    scaleLoneHunter(c, h);
    scaleAilmentAndBossHit(c, h);
    consumeSwiftOpening(c, h);
    scaleTalentHit(c, h);
    advanceOrbitMultiplier(c, h);
    rollHitDamage(c, h);
    scaleUnderdogRoll(c, h);
    scaleChaosRoll(c, h);
    rollFirstHit(c, h);
    applyFirstHitGuard(c, h);
    applyRepeatedHitGuard(c, h);
    applyBurstGuard(c, h);
}
