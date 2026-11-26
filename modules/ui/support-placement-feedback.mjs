import { supportSlotNames } from '../common/support-gems.mjs';
import { inspectSupportPlacement } from '../domain/rune-support-loadout.mjs';

export const boardBudget = (deps, stats) => ({
    capacity: Math.max(0, Math.floor(stats.suppCap || 0)), resonance: deps.gemDropRewards.resonanceCap(deps.game, stats),
    definitions: deps.SUPPORT_GEM_DB, overflow: deps.gemDropRewards.allowsResonanceOverflow(stats),
    conflict: deps.window.GameModules.skills.supports.conflictReason
});

export const planFailure = (deps, plan) => {
    if (deps.game.woodsmanBuildLock) return deps._t('세팅 변경 잠김');
    return plan.conflict || (plan.shortage ? deps._t('공명력 {value} 부족', { value: plan.shortage }) : '');
};

// A full board may still have a valid replacement. All empty slots have the same cost and conflicts.
export function supportLibraryRestriction(deps, stats) {
    const budget = boardBudget(deps, stats);
    const slots = supportSlotNames(deps.game, budget.capacity);
    const destinations = [...new Set(slots)].map(name => slots.indexOf(name));
    return name => {
        if (deps.game.woodsmanBuildLock) return deps._t('세팅 변경 잠김');
        if (deps.game.equippedSupports.includes(name)) return '';
        if (!destinations.length) return deps._t('칸 부족');
        let shortage = Infinity, conflict = '';
        for (const index of destinations) {
            const plan = inspectSupportPlacement(deps.game, { name, index }, budget);
            if (plan.conflict) conflict = plan.conflict;
            else if (!plan.shortage) return '';
            else shortage = Math.min(shortage, plan.shortage);
        }
        return planFailure(deps, Number.isFinite(shortage) ? { shortage } : { conflict });
    };
}
