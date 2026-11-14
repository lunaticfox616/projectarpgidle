import { CURSE_ELEMENT_SHRED_KEYS } from './enemy-mitigation.mjs';

// Ordered combat stages. c is cast-local; h is contact-local; dependencies are explicit at the classic boundary.

function prepareConditionalHit(c, h) {
    h.ailmentDamageBeforeCritMitigation = Math.max(0, Math.floor(h.ailmentSourceDamage));
    h.skillConditionalCues = c.hasSkillConditionalFeedback ? [] : null;
    h.skillConditionalMultiplier = c.deps.getSkillConditionalDamageMultiplier(c.pStats.sSkill, h.targetEnemy,
        h.skillConditionalCues ? cue => h.skillConditionalCues.push(cue) : null);
    h.dmg = Math.floor(h.dmg * h.skillConditionalMultiplier);
    h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * h.skillConditionalMultiplier);
    h.dmg = Math.floor(h.dmg * Math.max(0, c.pStats.instantDamageMultiplier || 1));
    rollConditionalDamage(c, h);
    h.enemyTotalEvadeChance = c.deps.getEnemyTotalEvadeChance(h.targetEnemy, c.pStats.accuracy);
}

function rollConditionalDamage(c, h) {
    if ((c.pStats.cosmosLightningVariance || 0) > 0 && h.hitElement === 'light') h.dmg = Math.floor(h.dmg * (0.8 + c.deps.random() * 0.7));
    if ((c.pStats.uniqueDoubleDamageChancePct || 0) > 0 && c.deps.random() < ((c.pStats.uniqueDoubleDamageChancePct || 0) / 100)) h.dmg = Math.floor(h.dmg * Math.max(1, c.pStats.uniqueDoubleDamageMultiplier || 2));

}

function evadeContact(c, h) {
    if (!c.pStats.passiveAlwaysHit && !(typeof c.deps.getTalentAlwaysHit === 'function' && c.deps.getTalentAlwaysHit())
                    && c.deps.resolveEntropyEvasion(h.targetEnemy, h.enemyTotalEvadeChance, c.deps.getCombatTime())) {
        c.deps.addBattleFx('enemyEvade', { enemyId: h.targetEnemy.id, text: c.deps._t('회피!'), color: '#c4e2ff', duration: 260 });
        c.deps.addEvasionCombatLog(h.targetEnemy, false);
        return false;
    }
    if ((h.targetEnemy.hitRateGuard || 0) > 0) c.attackHitGuardCounts.set(h.targetEnemy.id, h.priorGuardedHits + 1);
}

function convertMainDamage(c, h) {
    h.talentConversion = c.deps.supports.splitConversion(typeof c.deps.getTalentDamageConversion === 'function'
        ? c.deps.getTalentDamageConversion(h.hitElement)
        : { mainPct: 1, added: {} }, c.pStats, h.hitElement);
    h.wisdomMainMultiplier = c.deps.getPassiveWisdomLeapDamageMultiplier(c.pStats, h.hitElement);
    h.dmg = Math.floor(h.dmg * Math.max(0, Number(h.talentConversion.mainPct) || 0)
                    * (1 - (h.enemyRes / 100)) * h.wisdomMainMultiplier * c.deps.mutationHitScale(h.targetEnemy, h.hitElement));
    h.damageBeforeMitigation = Math.floor(h.damageBeforeMitigation * h.wisdomMainMultiplier);
    h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * h.wisdomMainMultiplier);
}

function applyPhysicalMitigation(c, h) {
    if (h.hitElement === 'phys') {
        let physicalTakenMul = h.targetEnemy.physicalDamageTakenMul || 1;
        h.dmg = Math.floor(h.dmg * physicalTakenMul);
        h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * physicalTakenMul);
    }
    if ((h.targetEnemy.armorGuard || 0) > 0 && h.hitElement === 'phys') {
        let armorGuardMul = Math.max(0.2, 1 - h.targetEnemy.armorGuard);
        h.dmg = Math.floor(h.dmg * armorGuardMul);
        h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * armorGuardMul);
    }
}

function applyElementMitigation(c, h) {
    if (h.hitElement === 'light') {
        let lightTakenMul = h.curseFx.lightTakenMul || 1;
        h.dmg = Math.floor(h.dmg * lightTakenMul);
        h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * lightTakenMul);
    }
    applyChaosTaken(c, h);
}

function applyChaosTaken(c, h) {
    if (h.hitElement === 'chaos') {
        let chaosTakenMul = h.curseFx.chaosTakenMul || 1;
        // 시체 역병(워록 wlk9): 위축 중첩만큼 받는 카오스 피해 증가, 적중 시 1중첩 추가(최대 10)
        if (c.deps.hasKeystone('wlk9') && h.targetEnemy && h.targetEnemy.hp > 0) {
            c.owner.enemyWitherStacks = (c.owner.enemyWitherStacks && typeof c.owner.enemyWitherStacks === 'object') ? c.owner.enemyWitherStacks : {};
            let wStacks = Math.max(0, Math.min(10, Math.floor(c.owner.enemyWitherStacks[h.targetEnemy.id] || 0)));
            chaosTakenMul *= (1 + wStacks * c.deps.ASCENDANCY_KEYSTONE_VALUES.wlk9.chaosTakenPctPerStack / 100);
            c.owner.enemyWitherStacks[h.targetEnemy.id] = Math.min(10, wStacks + 1);
        }
        h.dmg = Math.floor(h.dmg * chaosTakenMul);
        h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * chaosTakenMul);
    }
}

// Converted percentages use the pre-conditional source; flat hits use crit/roll/repeat.
// Keep their rounding and warrior scaling distinct before the shared resistance calculation.
function addConvertedElements(c, h) {
    h.addedDamagePctByElement = (c.pStats && c.pStats.addedDamagePctByElement) || {};
    for (const element of ['phys', 'fire', 'cold', 'light', 'chaos']) {
        const pct = addedElementPercent(c, h, element);
        const wisdom = c.deps.getPassiveWisdomLeapDamageMultiplier(c.pStats, element);
        const raw = Math.floor(h.addedDamageSource * pct / 100 * wisdom);
        if (raw <= 0) continue;
        const damage = mitigateAddedElement(c, h, element, raw, h.hitElement !== 'phys');
        if (damage > 0) h.dmg += damage;
    }
}

function addedElementPercent(c, h, element) {
    let pct = Math.max(0, Number(h.addedDamagePctByElement[element] || 0)
        + Number(h.talentConversion.added && h.talentConversion.added[element] || 0));
    if (h.hitElement === 'phys' && element === 'fire') pct += Math.max(0, Number(c.pStats.passiveCycleAddedFireFromPhysicalPct) || 0);
    return pct;
}

function addFlatElements(c, h) {
    h.flatElementHitDamage = (c.pStats && c.pStats.flatElementHitDamage) || {};
    for (const element of ['phys', 'fire', 'cold', 'light', 'chaos']) {
        const base = Math.max(0, Number(h.flatElementHitDamage[element]) || 0);
        if (base <= 0) continue;
        const wisdom = c.deps.getPassiveWisdomLeapDamageMultiplier(c.pStats, element);
        const raw = base * wisdom
            * (h.hitCrit ? Math.max(1, (Number(c.pStats.critDmg) || 100) / 100) * h.talentCritDmgMultiplier : 1)
            * (h.rollPct / 100) * (h.hit.mult || 1) * h.repeatDamageMultiplier;
        const damage = mitigateAddedElement(c, h, element, raw, true);
        if (damage > 0) h.dmg += damage;
    }
}

function mitigateAddedElement(c, h, element, raw, scaleWarrior) {
    const resistance = c.deps.getEffectiveEnemyMitigation(element, c.zoneTier, h.targetEnemy, c.pStats)
        - (h.curseFx.resShred || 0) - (h.curseFx[CURSE_ELEMENT_SHRED_KEYS[element]] || 0);
    let damage = Math.floor(raw * (1 - resistance / 100) * c.deps.loopMutation.takenMul(h.targetEnemy, element));
    if (element === 'phys') return mitigateAddedPhysical(c, h, damage, scaleWarrior);
    if (element === 'light') damage = Math.floor(damage * (h.curseFx.lightTakenMul || 1));
    if (element === 'chaos') damage = Math.floor(damage * (h.curseFx.chaosTakenMul || 1));
    return damage;
}

function mitigateAddedPhysical(c, h, damage, scaleWarrior) {
    if (scaleWarrior) damage = Math.floor(damage * Math.max(0, Number(c.pStats.warriorPhysDamageMultiplier) || 1));
    return Math.floor(damage * (h.targetEnemy.physicalDamageTakenMul || 1) * Math.max(0.2, 1 - (h.targetEnemy.armorGuard || 0)));
}

function applyCurseTaken(c, h) {
    h.dmg = Math.floor(h.dmg * (h.curseFx.mul || 1));
    h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * (h.curseFx.mul || 1));
    if ((c.pStats.sSkill.tags || []).includes('projectile')) {
        let projectileTakenMul = (h.curseFx.projectileTakenMul || 1) * (h.targetEnemy.projectileDamageTakenMul || 1);
        h.dmg = Math.floor(h.dmg * projectileTakenMul);
        h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * projectileTakenMul);
    }
    applySpellCurseTaken(c, h);
}

function applySpellCurseTaken(c, h) {
    if ((c.pStats.sSkill.tags || []).includes('spell')) {
        let spellTakenMul = h.targetEnemy.spellDamageTakenMul || 1;
        h.dmg = Math.floor(h.dmg * spellTakenMul);
        h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * spellTakenMul);
    }
    if (h.hitCrit) h.dmg = Math.floor(h.dmg * (h.curseFx.critDmgTakenMul || 1));
}

function applyShockIncrease(c, h) {
    h.enemyShockTakenIncreasePct = c.deps.getActiveEnemyShockTakenDamageIncreasePct(h.targetEnemy, c.pStats);
    if (h.enemyShockTakenIncreasePct > 0) {
        let enemyShockTakenMul = 1 + h.enemyShockTakenIncreasePct / 100;
        h.dmg = Math.floor(h.dmg * enemyShockTakenMul);
        h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * enemyShockTakenMul);
    }
    h.shockedIncreaseMul = c.deps.getShockedEnemyHitDamageIncreaseMultiplier(h.targetEnemy, c.pStats);
    if (h.shockedIncreaseMul > 1) {
        h.dmg = Math.floor(h.dmg * h.shockedIncreaseMul);
    }
}

function applyShockedMore(c, h) {
    if ((c.pStats.shockedEnemyHitDamageMorePct || 0) > 0 && Array.isArray(h.targetEnemy.ailments) && h.targetEnemy.ailments.some(a => a && a.type === 'shock' && (a.time || 0) > 0)) {
        let shockedMore = 1 + Math.max(0, Number(c.pStats.shockedEnemyHitDamageMorePct || 0)) / 100;
        h.dmg = Math.floor(h.dmg * shockedMore);
        h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * shockedMore);
    }
}

function applyBleedingWeight(c, h) {
    if (c.pStats.uniqueBleedWeightOnBleedingHit && Array.isArray(h.targetEnemy.ailments) && h.targetEnemy.ailments.some(a => a && a.type === 'bleed' && (a.time || 0) > 0)) {
        h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * 2);
    }
}

function applyBleedingMore(c, h) {
    if ((c.pStats.uniqueBleedingEnemyDamageMorePct || 0) > 0 && Array.isArray(h.targetEnemy.ailments) && h.targetEnemy.ailments.some(a => a && a.type === 'bleed' && (a.time || 0) > 0)) {
        let bleedingMore = 1 + Math.max(0, Number(c.pStats.uniqueBleedingEnemyDamageMorePct) || 0) / 100;
        h.dmg = Math.floor(h.dmg * bleedingMore);
        h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * bleedingMore);
    }
}

function applyArmorAmplifier(c) {
    if (c.pStats.uniqueMeleeArmorAmp && Array.isArray(c.pStats.sSkill.tags) && c.pStats.sSkill.tags.includes('melee')) {
        let now = c.deps.getCombatTime();
        let active = (c.owner.uniqueMeleeArmorAmpExpiresAt || 0) > now;
        let stacks = active ? Math.max(0, Math.floor(c.owner.uniqueMeleeArmorAmpStacks || 0)) : 0;
        c.owner.uniqueMeleeArmorAmpStacks = Math.min(Math.floor(c.pStats.uniqueMeleeArmorAmp.maxStacks || 3), stacks + 1);
        c.owner.uniqueMeleeArmorAmpExpiresAt = now + Math.floor((c.pStats.uniqueMeleeArmorAmp.duration || 2) * 1000);
    }
}

function applyFinalTaken(c, h) {
    h.keystoneTakenMul = c.deps.getKeystoneEnemyTakenMultiplier(h.targetEnemy, h.hitElement);
    h.dmg = Math.floor(h.dmg * h.keystoneTakenMul);
    h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * h.keystoneTakenMul);
    h.dmg = Math.floor(h.dmg * (c.deps.getAbyssMonsterScales(c.deps.getZone(c.owner.currentZoneId)).playerDamageMul || 1));
    if (h.targetEnemy.isBoss && (c.pStats.damageScales || {}).talismanBossFinalDmgBonusPct) {
        let talismanBossMul = 1 + ((c.pStats.damageScales.talismanBossFinalDmgBonusPct || 0) / 100);
        h.dmg = Math.floor(h.dmg * talismanBossMul);
        h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * talismanBossMul);
    }
    h.finalDamageMul = Number(c.pStats.finalDamageMultiplier);
    if (!Number.isFinite(h.finalDamageMul)) h.finalDamageMul = 1;
    h.finalDamageMul = Math.max(0, h.finalDamageMul);
    h.dmg = Math.floor(h.dmg * h.finalDamageMul);
    h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * h.finalDamageMul);
}

function applyKarmaAndTrueDamage(c, h) {
    if (c.passiveKarmaContext && String(c.passiveKarmaContext.targetId) === String(h.targetEnemy.id)) {
        let karmaMul = Math.max(1, Number(c.passiveKarmaContext.multiplier) || 1);
        h.dmg = Math.floor(h.dmg * karmaMul);
        h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * karmaMul);
    }
    if ((c.pStats.passiveOmniscientTrueDamagePct || 0) > 0) {
        h.dmg += Math.floor(Math.max(0, Number(c.pStats.baseDmg) || 0) * c.pStats.passiveOmniscientTrueDamagePct / 100);
    }
    if (!Number.isFinite(h.dmg) || h.dmg < 0) h.dmg = 0;
}

function applyHunterVulnerability(c, h) {
    if (c.deps.hasKeystone('h2') && h.targetEnemy) {
        h.targetEnemy.ailments = Array.isArray(h.targetEnemy.ailments) ? h.targetEnemy.ailments : [];
        let weak = h.targetEnemy.ailments.find(a => a && a.type === 'hunterExpose');
        if (weak) weak.time = 3;
        else h.targetEnemy.ailments.push({ type: 'hunterExpose', time: 3, power: 1 });
    }
    if (c.deps.hasKeystone('h2') && Array.isArray(h.targetEnemy.ailments) && h.targetEnemy.ailments.some(a => a && a.type === 'hunterExpose' && (a.time || 0) > 0)) {
        h.dmg = Math.floor(h.dmg * (1 + c.deps.ASCENDANCY_KEYSTONE_VALUES.h2.takenMorePct / 100));
        h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * (1 + c.deps.ASCENDANCY_KEYSTONE_VALUES.h2.takenMorePct / 100));
    }
}

function refreshHitCurse(c, h) {
    if (h.targetEnemy && h.targetEnemy.id && c.pStats.uniqueCursedTakenAndRefresh) {
        let refreshSec = Math.max(0, Number(c.pStats.uniqueCursedTakenAndRefresh.refreshSec || 0));
        if (refreshSec > 0 && c.owner.enemyConditionDebuffs && Array.isArray(c.owner.enemyConditionDebuffs[h.targetEnemy.id])) {
            let nextExpire = c.deps.getCombatTime() + Math.floor(refreshSec * 1000);
            c.owner.enemyConditionDebuffs[h.targetEnemy.id] = c.owner.enemyConditionDebuffs[h.targetEnemy.id].map(deb => {
                if (!deb) return deb;
                if ((deb.expiresAt || 0) > c.deps.getCombatTime()) deb.expiresAt = Math.max(deb.expiresAt || 0, nextExpire);
                return deb;
            });
        }
    }
}

function applyFirstStrikeAndDistance(c, h) {
    h.talentWasFull = h.targetEnemy.hp >= (h.targetEnemy.maxHp || h.targetEnemy.hp || 1);
    if (h.talentWasFull && (c.pStats.firstStrikeDamagePct || 0) > 0) {
        let firstStrikeMul = 1 + Math.max(0, Number(c.pStats.firstStrikeDamagePct) || 0) / 100;
        h.dmg = Math.floor(h.dmg * firstStrikeMul);
        h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * firstStrikeMul);
    }
    h.directHitDistanceMul = c.deps.getGridDirectHitDistanceMultiplier(c.owner.gridPlayer, h.targetEnemy);
    h.dmg = Math.floor(h.dmg * h.directHitDistanceMul);
    h.damageBeforeMitigation = Math.floor(h.damageBeforeMitigation * h.directHitDistanceMul);
    h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * h.directHitDistanceMul);
}

// Called once in the original order; false cancels only this cast/contact.
export function mitigatePlayerContact(c, h) {
    prepareConditionalHit(c, h);
    if (evadeContact(c, h) === false) return false;
    convertMainDamage(c, h);
    applyPhysicalMitigation(c, h);
    applyElementMitigation(c, h);
    addConvertedElements(c, h);
    addFlatElements(c, h);
    applyCurseTaken(c, h);
    applyShockIncrease(c, h);
    applyShockedMore(c, h);
    applyBleedingWeight(c, h);
    applyBleedingMore(c, h);
    applyArmorAmplifier(c, h);
    applyFinalTaken(c, h);
    applyKarmaAndTrueDamage(c, h);
    applyHunterVulnerability(c, h);
    refreshHitCurse(c, h);
    applyFirstStrikeAndDistance(c, h);
}
