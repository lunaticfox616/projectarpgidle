import { normalizeGemRecord } from '../state/gem-records.mjs';
import { gainGemExperience, playerExperienceRequired } from './experience.mjs';

// Kill progression mutates only its explicit state. Presentation, healing, unlocks, stats and saving stay with the caller.
class KillProgression {
    constructor(rules) { this.rules = rules; }

    /** kind is experience or gemExperience; world contains the current state and resolved zone/depth scales. */
    reward(enemy, stats, kind, world) {
        const { state, zone, abyssScale, abyssDepth } = world, levels = this.rules.levels;
        const level = levels.monsterLevel(zone, enemy);
        let exp = Math.floor(levels.monsterExperience(level) * levels.loopExperienceMultiplier(state.season, state.level, level));
        if (enemy.isElite) exp = Math.floor(exp * 1.8);
        if (enemy.isBoss) exp = Math.floor(exp * 6);
        exp = Math.floor(exp * (enemy.expMul || 1));
        exp = Math.floor(exp * (1 + stats.expGain / 100) * (abyssScale.expMul || 1));
        if (abyssDepth > 1) exp = Math.floor(exp * Math.max(0.68, 1 - (abyssDepth - 1) * 0.012));
        return Math.max(0, Math.floor(exp * levels.rewardMultiplier(zone, enemy, state.level, kind)));
    }

    /** Resolve worn slots at the call boundary: an active mobility cast must not hide the actual main gem. */
    wornGems(state, stats, amount, slots) {
        const mainSkill = slots.main === state.activeSkill ? stats.sSkill : (this.rules.skills[slots.main] || {});
        const worn = new Set([(mainSkill.isGem || mainSkill.levelable) && slots.main, slots.mobility].filter(Boolean));
        state.gemData = state.gemData || {};
        return [...worn].filter(name => this.normalizedGem(state, name, amount));
    }

    normalizedGem(state, name, amount) {
        state.gemData[name] = normalizeGemRecord(state.gemData[name], this.rules.forge);
        return gainGemExperience(state.gemData[name], amount, this.rules.experience) > 0;
    }

    /** Consume fully and emit each level notification before asking for the next entry.
     * Capture the list length as the original forEach did; duplicate equipped names retain their original behavior. */
    *summonGems(state, amount) {
        state.equippedSummonSkills = Array.isArray(state.equippedSummonSkills) ? state.equippedSummonSkills : [];
        const names = state.equippedSummonSkills, count = names.length;
        for (let i = 0; i < count; i++) {
            if (!(i in names)) continue;
            const name = names[i], def = this.rules.skills[name] || {};
            if (!Array.isArray(def.tags) || !def.tags.includes('summon')) continue;
            state.gemData = state.gemData || {};
            if (this.normalizedGem(state, name, amount)) yield name;
        }
    }

    *supportGems(state, amount) {
        const names = state.equippedSupports || [], count = names.length;
        for (let i = 0; i < count; i++) {
            if (!(i in names)) continue;
            const name = names[i], gem = state.supportGemData[name];
            if (gem && gainGemExperience(gem, amount, this.rules.experience) > 0) yield name;
        }
    }

    /** Each yielded level is already applied. Finish its point/heal/unlock effects before advancing again.
     * The 50-level guard and max-level XP discard match the old settlement, including saved overflow. */
    *levels(state) {
        let required = playerExperienceRequired(state.level, this.rules.experience), guard = 0;
        while (state.level < this.rules.maxLevel && state.exp >= required && guard < 50) {
            state.exp -= required;
            state.level++;
            yield state.level;
            required = playerExperienceRequired(state.level, this.rules.experience);
            guard++;
        }
        if (state.level >= this.rules.maxLevel) state.exp = 0;
    }

    awardPoint(state, unlocked) {
        if (state.season >= 2 || unlocked) state.passivePoints++;
        if (unlocked) state.noti.char = true;
    }
}

export const createKillProgression = rules => Object.freeze(new KillProgression(rules));
