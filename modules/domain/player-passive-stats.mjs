import { TAGGED_DAMAGE_STAT_BY_TAG } from '../common/stat-bucket.mjs';

const ELEMENT_TAGS = Object.freeze({ fire: 'fire', cold: 'cold', light: 'lightning' });

class PlayerPassiveStats {
    constructor(deps) { this.deps = deps; }

    strongestElement(readStat) {
        return Object.values(ELEMENT_TAGS).reduce((best, tag) => {
            const bonus = readStat(TAGGED_DAMAGE_STAT_BY_TAG[tag]);
            return !best || bonus > best.bonus ? { tag, bonus } : best;
        }, null);
    }

    taggedSkill(skill, strongestElement) {
        const tags = this.deps.damageTags(skill);
        if (strongestElement && Object.hasOwn(ELEMENT_TAGS, skill.ele) && !skill.randomElementPool?.length) {
            Object.values(ELEMENT_TAGS).forEach(tag => tags.delete(tag));
            tags.add(strongestElement.tag);
        }
        return { ...skill, tags: [...tags] };
    }

    supportBudget(owner, input) {
        const { baseSlots, cosmos, unique, runePower, flags } = input;
        let suppCap = cosmos ? Math.max(0, Math.floor(baseSlots * Math.max(0, cosmos.supportCapMul || 0.5))) : baseSlots;
        suppCap += Math.floor(unique.suppCap || 0);
        let inquisitorResonanceBonus = 0;
        if (this.deps.keystone('iq3', owner)) {
            suppCap += 1;
            inquisitorResonanceBonus += 10 + Math.floor(((owner.sealedSkills || []).length + (owner.sealedSupports || []).length) / 4);
        }
        if (this.deps.keystone('iq9', owner)) {
            // iq9 counts resonance before adding its own support slots and iq6's slots.
            inquisitorResonanceBonus += this.deps.values.iq9.resonancePerSupport * Math.max(0, suppCap);
            suppCap += this.deps.values.iq9.extraSupports;
        }
        if (this.deps.keystone('iq6', owner)) suppCap += 1;
        return { suppCap, inquisitorResonanceBonus, runeResonancePower: runePower,
            uniqueResonanceFloor: Math.floor(unique.resonancePower || 0), passiveKeystoneFlags: flags };
    }

    applyResonance(passive, budget, owner) {
        const flags = budget.passiveKeystoneFlags;
        const canOverflow = this.deps.runes.allowsResonanceOverflow(budget);
        if (!flags.fleshResonance && !canOverflow) return 0;
        const free = this.deps.runes.resonanceCap(owner, budget) - this.deps.runes.resonanceUsed(owner);
        if (flags.fleshResonance) passive.flatHp += Math.max(0, free) * 5;
        if (!canOverflow || free >= 0) return 0;
        const penalty = -free;
        ['resF', 'resC', 'resL', 'resChaos'].forEach(stat => { passive[stat] -= penalty; });
        return penalty;
    }
}

export function createPlayerPassiveStats(deps) {
    const runtime = new PlayerPassiveStats(deps);
    return Object.freeze({ strongestElement: runtime.strongestElement.bind(runtime), taggedSkill: runtime.taggedSkill.bind(runtime),
        supportBudget: runtime.supportBudget.bind(runtime), applyResonance: runtime.applyResonance.bind(runtime) });
}
