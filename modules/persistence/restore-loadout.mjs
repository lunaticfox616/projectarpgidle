import { summon, finishLoadout } from './saved-support-runes.mjs';
import { estimateSummonEquipCapForMergedSave } from './saved-summon-capacity.mjs';
import { normalizeGemEnhanceTargetSave } from './saved-gems.mjs';

export function restoreSummonCounts(deps, context) {
    restoreOwnedSummonNames(deps, context);
    restoreSummonCountLedger(deps, context);
}

export function restoreSummonCapacity(deps, context) {
    finishLoadout(deps, context.merged, context.saveSummonCap, context.hasSavedSummonSkillCounts, context.supportRuneMigration.root.equip);
    if (context.supportRuneMigration.locked) {
        const snapshot = context.merged.woodsmanBuildSnapshot;
        const hadCounts = !!snapshot.summonSkillCounts;
        finishLoadout(deps, snapshot, estimateSummonEquipCapForMergedSave(deps, { ...context.merged, ...snapshot }), hadCounts, context.supportRuneMigration.locked.equip);
    }
    context.merged.summonLoadoutInitialized = true;
    normalizeGemEnhanceTargetSave(deps, context.merged);
    if (typeof context.merged.currentZoneId === 'string' && /^\d+$/.test(context.merged.currentZoneId)) context.merged.currentZoneId = parseInt(context.merged.currentZoneId, 10);
}

function restoreOwnedSummonNames(deps, context) {
    context.merged.equippedSummonSkills = Array.isArray(context.merged.equippedSummonSkills)
        ? Array.from(new Set(context.merged.equippedSummonSkills.filter(name => {
            return summon(deps, name) && context.merged.skills.includes(name);
        })))
        : [];
    context.hasSavedSummonSkillCounts = !!(context.save && Object.prototype.hasOwnProperty.call(context.save, 'summonSkillCounts') && context.save.summonSkillCounts && typeof context.save.summonSkillCounts === 'object');
}

function restoreSummonCountLedger(deps, context) {
    context.merged.summonSkillCounts = context.hasSavedSummonSkillCounts ? { ...context.merged.summonSkillCounts } : {};
    Object.keys(context.merged.summonSkillCounts).forEach(name => { if (!context.merged.equippedSummonSkills.includes(name)) delete context.merged.summonSkillCounts[name]; });
    if (context.hasSavedSummonSkillCounts) context.merged.equippedSummonSkills.forEach(name => { context.merged.summonSkillCounts[name] = Math.max(1, Math.floor(Number(context.merged.summonSkillCounts[name]) || 1)); });
    let ownedSummonAttackSkills = (Array.isArray(context.merged.skills) ? context.merged.skills : []).filter(name => {
        let def = deps.SKILL_DB[name] || {};
        return !!(def && Array.isArray(def.tags) && def.tags.includes('summon_attack'));
    });
    context.saveSummonCap = estimateSummonEquipCapForMergedSave(deps, context.merged);
    if (!context.merged.summonLoadoutInitialized && context.merged.equippedSummonSkills.length === 0 && ownedSummonAttackSkills.length > 0) {
        context.merged.equippedSummonSkills = ownedSummonAttackSkills.slice(0, context.saveSummonCap);
        if (context.hasSavedSummonSkillCounts) context.merged.equippedSummonSkills.forEach(name => { context.merged.summonSkillCounts[name] = Math.max(1, Math.floor(Number(context.merged.summonSkillCounts[name]) || 1)); });
    }
}
