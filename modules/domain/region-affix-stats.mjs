// Region affix arithmetic and its own timed records; no attacks, rewards, rendering or game singleton.
function value(pStats, id) {
    return Math.max(0, Number(pStats && pStats.regionAffix && pStats.regionAffix[id]) || 0);
}

function num(raw) { return Number(raw) || 0; }

function activeRow(enemy, type) {
    return (enemy && Array.isArray(enemy.ailments) ? enemy.ailments : []).find(row => row && row.type === type && (row.time || 0) > 0) || null;
}

function hasAilment(enemy, type) { return !!activeRow(enemy, type); }

class RegionAffixStats {
    constructor(definitions, rules) {
        this.ids = Object.freeze(definitions.map(row => row.statId));
        this.rules = rules;
        Object.assign(this, { value, num, activeRow, hasAilment });
    }

    collect(sum) {
        return Object.freeze(Object.fromEntries(this.ids.map(id => [id, Math.max(0, Number(sum(id)) || 0)])));
    }

    resistanceShred(pStats, enemy, element) {
        if (element === 'light' && hasAilment(enemy, 'shock')) return value(pStats, 'regionShockedLightPen');
        const shred = element === 'chaos' ? activeRow(enemy, 'regionChaosShred') : null;
        return shred ? num(shred.stacks) * num(shred.power) : 0;
    }

    elementMultiplier(pStats, element, state) {
        if (element === 'phys') return 1 + Math.floor(num(pStats.armor) / this.rules.armorStep) * value(pStats, 'regionArmorToPhys') / 100;
        if (element === 'chaos') return 1 + Math.max(0, num(pStats.rawResChaos) - num(pStats.maxResChaos)) * value(pStats, 'regionChaosOvercap') / 100;
        const fullLife = element === 'fire' && num(state.playerHp) >= num(pStats.maxHp);
        return fullLife ? 1 + value(pStats, 'regionFullLifeFire') / 100 : 1;
    }

    damageMultiplier(pStats, enemy, element, isCrit, state) {
        if (!pStats || !pStats.regionAffix) return 1;
        let mul = this.elementMultiplier(pStats, element, state);
        if (hasAilment(enemy, 'bleed')) mul *= 1 + value(pStats, 'regionBleedingDamage') / 100;
        if (hasAilment(enemy, 'ignite')) mul *= 1 + value(pStats, 'regionIgnitedDamage') / 100;
        if (isCrit && hasAilment(enemy, 'freeze')) mul *= 1 + value(pStats, 'regionFrozenCritDamage') / 100;
        return mul;
    }

    stackChaosShred(pStats, enemy) {
        const pct = value(pStats, 'regionChaosShred');
        if (pct <= 0) return;
        enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
        let row = enemy.ailments.find(a => a && a.type === 'regionChaosShred');
        if (!row) enemy.ailments.push(row = { type: 'regionChaosShred', stacks: 0, power: 0, time: 0 });
        row.stacks = Math.min(this.rules.chaosShredStacks, num(row.stacks) + 1);
        row.power = Math.max(num(row.power), pct);
        row.time = this.rules.chaosShredSec;
    }

    extraAilmentChances(pStats) {
        const pct = value(pStats, 'regionChillOnHit');
        return pct > 0 ? { chill: Math.min(1, pct / 100) } : undefined;
    }

    ailmentDurationMultiplier(pStats, type) {
        return type === 'ignite' ? 1 + value(pStats, 'regionIgniteDuration') / 100 : 1;
    }

    onBlock(pStats, now, state) {
        const pct = value(pStats, 'regionBlockEmpower');
        if (pct > 0) state.regionBlockEmpower = { pct, until: now + this.rules.blockEmpowerMs };
    }

    consumeBlockEmpower(now, state) {
        const buff = state.regionBlockEmpower;
        if (!buff || num(buff.until) <= now) return 1;
        state.regionBlockEmpower = null;
        return 1 + Math.max(0, num(buff.pct)) / 100;
    }

    takenDamageMultiplier(pStats, attacker, state) {
        if (!pStats || !pStats.regionAffix) return 1;
        let pct = num(state.playerHp) <= num(pStats.maxHp) * this.rules.lowLifeRatio ? value(pStats, 'regionLowLifeDR') : 0;
        if (hasAilment(attacker, 'chill')) pct += value(pStats, 'regionChilledAttackerDR');
        return 1 - Math.min(this.rules.takenReductionCapPct, pct) / 100;
    }

    moveBonus(now, state) {
        const buff = state.regionCritMove;
        return buff && num(buff.until) > now ? Math.max(0, num(buff.pct)) : 0;
    }
}

export const createRegionAffixStats = (definitions, rules) => Object.freeze(new RegionAffixStats(definitions, rules));
