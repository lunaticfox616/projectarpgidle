import { clampNumber } from '../common/numbers.mjs';
// Order: base -> Woodsman -> unique shreds -> ignore/penetration -> holy mist -> void weakness.
// Existing enemies already include zone resistance; only an estimate without an enemy uses the zone curve.
export const CURSE_ELEMENT_SHRED_KEYS = Object.freeze({ fire: 'resFShred', cold: 'resCShred', light: 'resLShred', chaos: 'resChaosShred', phys: 'physDrShred' });
const VOID_WEAK_TAKEN_MUL = 1.2;
const WOODSMAN_BASE_RESIST = /* @__PURE__ */ Object.freeze({ fire: 'baseResF', cold: 'baseResC', light: 'baseResL', chaos: 'baseResChaos' });
const RESIST_FIELDS = /* @__PURE__ */ Object.freeze({ phys: 'dr', fire: 'resF', cold: 'resC', light: 'resL', chaos: 'resChaos' });

function getEnemyElementResistance(element, tier, enemy) {
    const progress = clampNumber(((tier || 1) - 1) / 19, 0, 1), curved = progress * progress;
    const base = ['fire', 'cold', 'light', 'chaos'].includes(element) ? 5 + Math.floor(20 * curved) : 0;
    const key = Object.hasOwn(RESIST_FIELDS, element) ? RESIST_FIELDS[element] : null;
    return enemy && key ? enemy[key] || 0 : base;
}

function getWoodsmanResistance(skillEle, enemy, rawMitigation) {
    let missingHpRatio = Math.max(0, Math.min(1, 1 - ((enemy.hp || 0) / enemy.maxHp)));
    let bonusRes = Math.floor(missingHpRatio * 28);
    const key = Object.hasOwn(WOODSMAN_BASE_RESIST, skillEle) ? WOODSMAN_BASE_RESIST[skillEle] : null;
    return key ? (enemy[key] || rawMitigation) + bonusRes : rawMitigation;
}

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

function getPiercedResistance(skillEle, pStats, rawMitigation) {
    if (skillEle === 'light' && pStats && pStats.crusaderLightningIgnoreRes) rawMitigation = 0;
    return rawMitigation - ((skillEle === 'light' && pStats && pStats.crusaderNoResPenOnLightning) ? 0 : Math.max(0, pStats.resPen || 0));
}

function getUniqueElementalShred(enemy, state) {
    const deb = enemy.id && state.enemyUniqueElementalResDown && state.enemyUniqueElementalResDown[enemy.id];
    if (!deb) return 0;
    return Math.min(Math.max(0, Number(deb.max || 20)), Math.max(0, Number(deb.stacks || 0)) * Math.max(0, Number(deb.perHit || 2)));
}

function getUniqueChaosShred(enemy, state) {
    const deb = enemy.id && state.enemyUniqueChaosResDown && state.enemyUniqueChaosResDown[enemy.id];
    return deb ? Math.max(0, (deb.perHit || 0) * (deb.stacks || 0)) : 0;
}

function applyEnemyResistanceShred(skillEle, enemy, rawMitigation, state) {
    if (!enemy) return rawMitigation;
    if (['fire', 'cold', 'light'].includes(skillEle)) return rawMitigation - getUniqueElementalShred(enemy, state);
    if (skillEle !== 'chaos') return rawMitigation;
    rawMitigation -= getUniqueChaosShred(enemy, state);
    if (enemy.chaosErosionShred) rawMitigation -= enemy.chaosErosionShred;
    return rawMitigation;
}

// Stateless calculation owner. State is per call; rule readers are late-bound domain dependencies.
// Resistance values are percentage points; clocks and deadlines are combat milliseconds.
class EnemyMitigation {
    constructor(inputs) { this.inputs = inputs; }

    beforeWeak(skillEle, zoneTier, enemy, stats, state) {
        let raw = getEnemyElementResistance(skillEle, zoneTier, enemy);
        if (enemy && enemy.isWoodsman && enemy.maxHp > 0) raw = getWoodsmanResistance(skillEle, enemy, raw);
        raw = applyEnemyResistanceShred(skillEle, enemy, raw, state);
        if (skillEle === 'phys') return getPhysicalMitigation(raw, stats);
        if (['fire', 'cold', 'light', 'chaos'].includes(skillEle)) return this.elemental(skillEle, enemy, stats, raw);
        return Math.min(80, raw);
    }

    elemental(element, enemy, stats, raw) {
        const elemental = element !== 'chaos';
        if (elemental && this.inputs.ownsKeystone('iq4')) raw = Math.max(0, raw) * this.inputs.keptResistancePct() / 100 + Math.min(0, raw);
        let effective = getPiercedResistance(element, stats, raw);
        const cap = Math.max(0, Number(enemy && enemy.maxResCap) || 80);
        if (effective > 0) effective = Math.min(cap, effective);
        const floor = elemental && this.inputs.ownsKeystone('e9') ? -300 : this.inputs.minimumResistance();
        const resistance = Math.max(floor, effective);
        return this.holyMist(element, enemy, resistance);
    }

    holyMist(element, enemy, resistance) {
        return element === 'fire' && enemy?.holyMistUntil > this.inputs.clock() ? 100 - (100 - resistance) * 1.2 : resistance;
    }

    weak(enemy, mitigation) {
        return enemy?.voidWeakUntil > this.inputs.clock() ? 100 - (100 - mitigation) * VOID_WEAK_TAKEN_MUL : mitigation;
    }

    effective(element, tier, enemy, stats, state) {
        return this.weak(enemy, this.beforeWeak(element, tier, enemy, stats, state));
    }

    hit(element, tier, enemy, source) {
        const { stats, curse, state } = source;
        const elementShred = Number(curse[CURSE_ELEMENT_SHRED_KEYS[element]]) || 0;
        return this.effective(element, tier, enemy, stats, state) - (curse.resShred || 0) - elementShred
            - this.inputs.regionAffixes.resistanceShred(stats, enemy, element);
    }

    ailing(enemy, element, isCrit, damages, source) {
        let mul = this.inputs.regionAffixes.damageMultiplier(source.stats, enemy, element, isCrit, source.state);
        if (this.inputs.ownsKeystone('ct5') && Array.isArray(enemy.ailments) && enemy.ailments.some(a => a && (a.time || 0) > 0)) mul *= 1.2;
        return mul === 1 ? damages : damages.map(value => Math.floor(value * mul));
    }
}

export const createEnemyMitigation = inputs => Object.freeze(new EnemyMitigation(inputs));
