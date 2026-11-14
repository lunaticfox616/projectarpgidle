import { createEquipmentRequirements } from './domain/equipment-requirements.mjs';

// Temporary calculator context until every calculator input is explicit. GameState is the sole current-save owner.
const withEquipmentCalculationOwner = (owner, calculate) => {
    const state = window.GameModules.state, live = state.game;
    try { state.game = owner; return calculate(); }
    finally { state.game = live; }
};
const inspectSavedRuneBuild = (owner, selected) => withEquipmentCalculationOwner(owner, () => {
    const main = selected.activeSkill;
    if (!canUseSkillWithCurrentEquipment(main)) return { ok: false, reason: `${main}: ${getSkillRuneWeaponNote(main)}` };
    const stats = getPlayerStats(false), runes = window.GameModules.skills.loadouts;
    if (!runes.equals(selected, owner)) return { ok: false, reason: _t('현재 장비로 저장된 룬 구성을 유지할 수 없습니다.') };
    return runes.inspect(selected, owner, stats);
});
const requirements = createEquipmentRequirements({
    requirements: item => levelProgression.requirements(item), statName: key => getStatName(key), translate: (...args) => _t(...args),
    offhandLocked: owner => typeof hasKeystone === 'function' && !hasKeystone('w3', owner),
    thirdFingerOpen: owner => typeof getTranscendentVoidPassiveCount === 'function' && getTranscendentVoidPassiveCount('thirdFinger', owner) > 0,
    memo: owner => getBackgroundBuildMemo(owner), signature: owner => getPersistentBuildSignature(owner),
    attributes: owner => withEquipmentCalculationOwner(owner, () => equipmentStatCalculator(false, true, true)),
    inspectBuild: inspectSavedRuneBuild, get runes() { return window.GameModules.skills.loadouts; },
    readStats: (owner, includeBreakdowns, memo, status) => playerStatCache.read(includeBreakdowns, memo, status, owner)
});
const finishBuildLoadout = owner => {
    if (owner !== game) return;
    playerStatCache.invalidate();
    window.GameModules.state.combat.pendingSkillStageHits = [];
    window.GameModules.state.combat.skillGemCombatRuntime = null;
    resetCombatChannelRuntime();
    mobilitySkill.reset(true);
    wispSummons.reset();
};
const combatEquipmentStats = Object.freeze({ ...requirements,
    inspect: (item, slot, owner = game) => requirements.inspect(item, slot, owner),
    read: (includeBreakdowns, owner = game) => owner === game
        ? requirements.read(owner, includeBreakdowns)
        : withEquipmentCalculationOwner(owner, () => requirements.read(owner, includeBreakdowns)),
    finishBuildLoadout
});
safeExposeGlobals({ combatEquipmentStats });
