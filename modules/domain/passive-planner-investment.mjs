import { plannerEnsurePassiveTreePlannerState } from './passive-planner-state.mjs';

export function plannerGetPassiveAutoInvestPreset(env, owner) {
    if (owner.woodsmanBuildLock || !env.deps.contentProgression.canOpen('tab-char', owner)) return null;
    const planner = plannerEnsurePassiveTreePlannerState(env, owner);
    return planner.autoInvest ? planner.presets[planner.activeSlot] : null;
}

export function* plannerRunPassiveTreeAutoInvest(env, owner) {
    const preset = plannerGetPassiveAutoInvestPreset(env, owner);
    if (!preset) return { nodes: 0, points: 0 };
    const result = { nodes: 0, points: 0 };
    let guard = Math.min(preset.nodeIds.length + 1, Math.max(0, Math.floor(owner.passivePoints || 0)) + 1);
    while (guard-- > 0 && owner.passivePoints > 0) {
        const activated = yield* investNextPresetNode(env, owner, preset);
        if (!activated) break;
        result.nodes += activated.path.length;
        result.points += activated.cost;
    }
    if (result.nodes > 0) {
        yield { kind: 'passiveReachable', args: [] };
        yield { kind: 'passiveVisibility', args: [] };
    }
    return result;
}

function* investNextPresetNode(env, owner, preset) {
    // Preserve saved investment order; never skip a blocked node or buy an unexpected route.
    const targetId = preset.nodeIds.find(id => !(owner.passives || []).includes(id));
    if (!targetId) return null;
    const path = env.deps.allocation.getPassiveActivationPath(owner, targetId);
    if (path.length <= 0 || path.length > owner.passivePoints) return null;
    const attributeStat = preset.attributeChoices[targetId] || owner.passiveAttributePreference || 'strength';
    const activated = yield* env.deps.allocation.activatePassivePath(owner, targetId, { attributeStat });
    if (!activated.activated || activated.cost <= 0) return null;
    yield* env.deps.allocation.unlockPassiveStarEvolution(owner, { silent: true });
    restorePresetAttributes(owner, preset, activated.path);
    return activated;
}

function restorePresetAttributes(owner, preset, path) {
    path.forEach(id => {
        const savedStat = preset.attributeChoices[id];
        if (savedStat) owner.passiveAttributeChoices[id] = savedStat;
    });
}
