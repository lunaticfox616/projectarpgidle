import { plannerEnsurePassiveTreePlannerState, plannerNormalizePassiveTreePreset } from './passive-planner-state.mjs';

export function plannerSaveCurrentPassiveTreePreset(env, owner, slotIndex, name) {
    const planner = plannerEnsurePassiveTreePlannerState(env, owner);
    const slot = Math.max(0, Math.min(env.deps.PASSIVE_TREE_PRESET_SLOTS - 1, Math.floor(Number(slotIndex) || 0)));
    const nodeIds = (owner.passives || []).filter(id => env.deps.PASSIVE_TREE.nodes[id] && env.deps.PASSIVE_TREE.nodes[id].kind !== 'start');
    const attributeChoices = {};
    nodeIds.forEach(id => {
        const stat = (owner.passiveAttributeChoices || {})[id];
        if (['strength', 'dexterity', 'intelligence'].includes(stat)) attributeChoices[id] = stat;
    });
    planner.presets[slot] = plannerNormalizePassiveTreePreset(env, { name, nodeIds, attributeChoices }, slot);
    planner.activeSlot = slot;
    return planner.presets[slot];
}

export function plannerSetActivePassiveTreePreset(env, owner, slotIndex) {
    const planner = plannerEnsurePassiveTreePlannerState(env, owner);
    const slot = Math.floor(Number(slotIndex));
    if (!Number.isFinite(slot) || slot < 0 || slot >= env.deps.PASSIVE_TREE_PRESET_SLOTS) return false;
    planner.activeSlot = slot;
    return true;
}

export function plannerSetPassiveTreeAutoInvest(env, owner, enabled) {
    const planner = plannerEnsurePassiveTreePlannerState(env, owner);
    planner.autoInvest = !!enabled;
    return planner.autoInvest;
}

export function plannerEncodePassiveTreePreset(env, owner, slotIndex) {
    const planner = plannerEnsurePassiveTreePlannerState(env, owner);
    const preset = planner.presets[Math.floor(Number(slotIndex))];
    if (!preset) return '';
    const payload = JSON.stringify({ v: 1, layout: env.deps.PASSIVE_LAYOUT_VERSION, name: preset.name, nodeIds: preset.nodeIds, attributeChoices: preset.attributeChoices });
    return `PT1.${env.deps.encodePresetPayload(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')}`;
}

export function plannerDecodePassiveTreePreset(env, code) {
    const raw = String(code || '').trim();
    if (!raw.startsWith('PT1.')) throw new Error('지원하지 않는 프리셋 코드입니다.');
    let body = raw.slice(4).replace(/-/g, '+').replace(/_/g, '/');
    body += '='.repeat((4 - body.length % 4) % 4);
    const parsed = JSON.parse(env.deps.decodePresetPayload(body));
    if (!parsed || parsed.v !== 1) throw new Error('프리셋 버전이 올바르지 않습니다.');
    if (Number.isFinite(parsed.layout) && parsed.layout !== env.deps.PASSIVE_LAYOUT_VERSION) throw new Error('현재 스킬트리 배치와 호환되지 않는 프리셋입니다.');
    return parsed;
}

export function plannerImportPassiveTreePreset(env, owner, slotIndex, code) {
    const planner = plannerEnsurePassiveTreePlannerState(env, owner);
    const slot = Math.max(0, Math.min(env.deps.PASSIVE_TREE_PRESET_SLOTS - 1, Math.floor(Number(slotIndex) || 0)));
    const preset = plannerNormalizePassiveTreePreset(env, plannerDecodePassiveTreePreset(env, code), slot);
    if (!preset || preset.nodeIds.length === 0) throw new Error('투자 노드가 없는 프리셋입니다.');
    planner.presets[slot] = preset;
    planner.activeSlot = slot;
    return preset;
}
