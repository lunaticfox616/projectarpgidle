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
    return {
        revelation,
        keystoneChoices: { ...choices, wisdom_leap_element: wisdom },
        cycleBuffs,
        fanaticism: { skillName: String(fanaticism.skillName || ''), stacks: Math.max(0, Math.floor(fanaticism.stacks || 0)) },
        karma
    };
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

export function passiveRuleEnsurePassiveSpecializationState(env, owner) {
    owner.passiveSpecialization = passiveRuleNormalizePassiveSpecializationState(env, owner.passiveSpecialization,
        { migrateWisdomBranchChoice: true, passiveIds: owner.passives });
    return owner.passiveSpecialization;
}
