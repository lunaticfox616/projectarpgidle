import { plannerMigratePassiveNodeIdList, plannerMigratePassiveNodeIdRecord } from './passive-planner-migrations.mjs';

export function plannerNormalizePassiveTreePreset(env, raw, slotIndex) {
    if (!raw || typeof raw !== 'object') return null;
    const nodeIds = plannerMigratePassiveNodeIdList(env, raw.nodeIds)
        .filter(id => typeof id === 'string' && env.deps.PASSIVE_TREE.nodes[id] && env.deps.PASSIVE_TREE.nodes[id].kind !== 'start');
    const choices = plannerMigratePassiveNodeIdRecord(env, raw.attributeChoices);
    const attributeChoices = {};
    nodeIds.forEach(id => {
        if (env.deps.PASSIVE_TREE.nodes[id].kind !== 'attribute') return;
        const stat = choices[id];
        if (['strength', 'dexterity', 'intelligence'].includes(stat)) attributeChoices[id] = stat;
    });
    const fallbackName = env.deps._t('프리셋 {value}', { value: slotIndex + 1 });
    const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 24) : fallbackName;
    return { name, nodeIds, attributeChoices };
}

export function plannerNormalizePassiveTreePlannerState(env, raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const layoutMatches = Number(source.layoutVersion) === env.deps.PASSIVE_LAYOUT_VERSION;
    const slots = layoutMatches && Array.isArray(source.presets) ? source.presets : [];
    const presets = Array.from({ length: env.deps.PASSIVE_TREE_PRESET_SLOTS }, (_, index) => plannerNormalizePassiveTreePreset(env, slots[index], index));
    let activeSlot = Math.floor(Number(source.activeSlot));
    if (!Number.isFinite(activeSlot) || activeSlot < 0 || activeSlot >= env.deps.PASSIVE_TREE_PRESET_SLOTS) activeSlot = 0;
    return { layoutVersion: env.deps.PASSIVE_LAYOUT_VERSION, activeSlot, autoInvest: layoutMatches && !!source.autoInvest, presets };
}

export function plannerEnsurePassiveTreePlannerState(env, owner) {
    owner.settings = owner.settings && typeof owner.settings === 'object' ? owner.settings : {};
    owner.settings.passiveTreePlanner = plannerNormalizePassiveTreePlannerState(env, owner.settings.passiveTreePlanner);
    return owner.settings.passiveTreePlanner;
}
