import { passiveRuleGetPassiveWisdomElementFromNodeIds } from './passive-tree-access.mjs';

/**
 * @param {{revelation?: string, keystoneChoices?: Record<string, string>, cycleBuffs?: Array<Record<string, number|string>>, fanaticism?: Record<string, number|string>, karma?: Record<string, unknown>}|null|undefined} value
 * @param {{migrateWisdomBranchChoice?: boolean, passiveIds?: string[]}|undefined} options
 * @returns {{revelation: string, keystoneChoices: Record<string, string>, cycleBuffs: Array<Record<string, number|string>>, fanaticism: {skillName: string, stacks: number}, karma: {byEnemy: Record<string, number>, buff: Record<string, number|string>|null}}}
 */
export function passiveRuleNormalizePassiveSpecializationState(env, value, options) {
    let source = value && typeof value === 'object' ? value : {};
    let revelation = env.deps.PASSIVE_REVELATION_IDS.includes(source.revelation) ? source.revelation : 'combat';
    const { choices, wisdom } = specializationChoices(env, source, options);
    let fanaticism = source.fanaticism && typeof source.fanaticism === 'object' ? source.fanaticism : {};
    const karma = normalizeKarma(source);
    const cycleBuffs = normalizeCycleBuffs(env, source);
    const state = {
        revelation,
        keystoneChoices: { ...choices, wisdom_leap_element: wisdom },
        cycleBuffs,
        fanaticism: { skillName: String(fanaticism.skillName || ''), stacks: Math.max(0, Math.floor(fanaticism.stacks || 0)) },
        karma
    };
    env.normalizedSpecializations.add(state);
    return state;
}

function specializationChoices(env, source, options) {
    let choices = source.keystoneChoices && typeof source.keystoneChoices === 'object' ? source.keystoneChoices : {};
    let wisdom = env.deps.PASSIVE_WISDOM_ELEMENTS.includes(choices.wisdom_leap_element) ? choices.wisdom_leap_element : 'fire';
    const migrateBranch = options && options.migrateWisdomBranchChoice;
    const branchWisdom = migrateBranch ? passiveRuleGetPassiveWisdomElementFromNodeIds(env, options.passiveIds) : '';
    if (migrateBranch) wisdom = branchWisdom;
    return { choices, wisdom };
}

function normalizeKarma(source) {
    let karmaSource = source.karma && typeof source.karma === 'object' ? source.karma : {};
    let karmaByEnemy = karmaSource.byEnemy && typeof karmaSource.byEnemy === 'object' ? karmaSource.byEnemy : {};
    let normalizedKarma = {};
    Object.keys(karmaByEnemy).forEach(enemyId => {
        const amount = Math.max(0, Math.floor(Number(karmaByEnemy[enemyId]) || 0));
        if (amount > 0) normalizedKarma[String(enemyId)] = amount;
    });
    return { byEnemy: normalizedKarma, buff: normalizeKarmaBuff(karmaSource) };
}

function karmaBuffFields(karmaBuff) {
    return {
        targetId: String(karmaBuff.targetId || ''),
        morePct: Math.max(0, Number(karmaBuff.morePct) || 0),
        expiresAt: Math.max(0, Number(karmaBuff.expiresAt) || 0),
        actionsLeft: Math.max(0, Math.floor(Number(karmaBuff.actionsLeft) || 0))
    };
}

function normalizeKarmaBuff(karmaSource) {
    let karmaBuff = karmaSource.buff && typeof karmaSource.buff === 'object' ? karmaSource.buff : null;
    if (karmaBuff) {
        karmaBuff = karmaBuffFields(karmaBuff);
        if (!karmaBuff.targetId || karmaBuff.morePct <= 0 || karmaBuff.actionsLeft <= 0) karmaBuff = null;
    }
    return karmaBuff;
}

function normalizeCycleBuffs(env, source) {
    return (Array.isArray(source.cycleBuffs) ? source.cycleBuffs : []).filter(buff => buff
        && env.deps.PASSIVE_CYCLE_BUFF_EFFECTS[buff.type] && Number.isFinite(Number(buff.cycle)) && Number.isFinite(Number(buff.expiresAt)))
        .map(buff => ({ type: buff.type, cycle: Math.max(0, Number(buff.cycle)), expiresAt: Math.max(0, Number(buff.expiresAt)) }));
}

/** The state for a calculation copy of a game (stat previews, equipment analysis). The karma history is shared, not copied:
 * only combat writes it (passive-karma-rules.mjs), a stat read never does, and keyed by enemy id it keeps every elite that ever
 * hit the hero (a save held 32,405). Everything else is copied. A copy of a validated state needs no validation again.
 * @param {ReturnType<typeof passiveRuleNormalizePassiveSpecializationState>|undefined} state */
export const passiveRuleCopyPassiveSpecializationState = (env, state) => {
    if (!state || typeof state !== 'object') return state;
    const karma = state.karma && typeof state.karma === 'object' ? state.karma : null;
    const copy = JSON.parse(JSON.stringify(karma ? { ...state, karma: { ...karma, byEnemy: undefined } } : state));
    if (karma && karma.byEnemy !== undefined) copy.karma.byEnemy = karma.byEnemy;
    if (env.normalizedSpecializations.has(state)) env.normalizedSpecializations.add(copy);
    return copy;
};

export function passiveRuleEnsurePassiveSpecializationState(env, owner) {
    let state = owner.passiveSpecialization;
    // Save restoration normalizes once. JSON replay/preview copies and replaced states cross
    // this boundary again; the weak set never retains an old save or caches combat values.
    if (!env.normalizedSpecializations.has(state)) {
        state = passiveRuleNormalizePassiveSpecializationState(env, state);
        owner.passiveSpecialization = state;
    }
    // Allocation may change without replacing the state. Combat writers already validate
    // karma, cycle buffs and fanaticism, so do not copy their growing histories on reads.
    state.keystoneChoices.wisdom_leap_element = passiveRuleGetPassiveWisdomElementFromNodeIds(env, owner.passives);
    return state;
}
