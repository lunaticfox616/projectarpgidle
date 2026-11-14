import { passiveRuleFindAllocatedPassiveKeystone } from './passive-keystone-lookup.mjs';
import { passiveRuleEnsurePassiveSpecializationState } from './passive-specialization-state.mjs';

export function passiveRuleGetMystiqueAffinity(env, mystique, damageByElement) {
    const amount = Math.max(0, Number(mystique) || 0);
    const elements = ['phys', 'fire', 'cold', 'light', 'chaos'];
    const totals = damageByElement && typeof damageByElement === 'object' ? damageByElement : {};
    const element = elements.reduce((best, current) => Number(totals[current] || 0) > Number(totals[best] || 0) ? current : best, 'phys');
    return { element, ailment: env.deps.PASSIVE_AILMENT_BY_ELEMENT[element], damagePct: amount,
        potencyPct: amount, chancePct: Math.floor(amount / 3) };
}

export function passiveRuleRecordPassiveCycleAilmentEnd(env, owner, ailmentType, cycle, now) {
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, '역행 순환')) return false;
    if (!env.deps.PASSIVE_CYCLE_BUFF_EFFECTS[ailmentType] || !(Number(cycle) > 0)) return false;
    const state = passiveRuleEnsurePassiveSpecializationState(env, owner), timestamp = Number.isFinite(now) ? now : env.deps.getCombatTime();
    state.cycleBuffs = state.cycleBuffs.filter(buff => buff && buff.type !== ailmentType && buff.expiresAt > timestamp);
    state.cycleBuffs.push({ type: ailmentType, cycle: Math.max(0, Number(cycle)), expiresAt: timestamp + 6000 });
    return true;
}

export function passiveRuleRecordPassiveCycleAilmentStart(env, owner, ailmentType, cycle, now) {
    if (!passiveRuleFindAllocatedPassiveKeystone(env, owner, '역행 순환')) return false;
    if (!env.deps.PASSIVE_CYCLE_BUFF_EFFECTS[ailmentType] || !(Number(cycle) > 0)) return false;
    const state = passiveRuleEnsurePassiveSpecializationState(env, owner), timestamp = Number.isFinite(now) ? now : env.deps.getCombatTime();
    state.cycleBuffs = [{ type: ailmentType, cycle: Math.max(0, Number(cycle)) * 0.5, expiresAt: timestamp + 6000 }];
    return true;
}

export function passiveRuleGetActivePassiveCycleBuffEffects(env, owner, now) {
    const state = passiveRuleEnsurePassiveSpecializationState(env, owner), timestamp = Number.isFinite(now) ? now : env.deps.getCombatTime();
    state.cycleBuffs = state.cycleBuffs.filter(buff => buff && buff.expiresAt > timestamp);
    return state.cycleBuffs.flatMap(buff => (env.deps.PASSIVE_CYCLE_BUFF_EFFECTS[buff.type] || [])
        .map(effect => ({ stat: effect.stat, val: effect.perCycle * buff.cycle, source: buff.type })));
}

export function passiveRuleRecordPassiveFanaticSkillUse(env, owner, skillName, devotion) {
    const state = passiveRuleEnsurePassiveSpecializationState(env, owner), cap = Math.max(0, Math.floor(Number(devotion) || 0));
    if (!passiveRuleFindAllocatedPassiveKeystone(env, owner, '타락한 복음') || cap <= 0) {
        state.fanaticism = { skillName: '', stacks: 0 };
        return 0;
    }
    const normalizedName = String(skillName || '');
    const stacks = state.fanaticism.skillName === normalizedName ? state.fanaticism.stacks + 1 : 1;
    state.fanaticism = { skillName: normalizedName, stacks: Math.min(cap, stacks) };
    return state.fanaticism.stacks;
}
