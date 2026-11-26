import { activeSupportTier, getSupportResonanceCostAtTier, keepSupportSlotAssignments, supportSlotNames } from '../common/support-gems.mjs';

export function* runeFlowNormalizeSupportLoadout(env, owner, logChange, knownStats, hadOverflowKeystone = false) {
    let stats = knownStats;
    if (!stats) {
        let statsProvider = env.deps.supportStatsProvider;
        if (!statsProvider) return false;
        stats = statsProvider();
    }
    let cap = Math.max(0, Math.floor((stats || {}).suppCap || 0));
    const resonanceCap = env.deps.gemDropRewards.normalizationResonanceCap(owner, stats, hadOverflowKeystone);
    const { equippedSupports, removed } = env.deps.supportRules.normalize(owner, cap, resonanceCap);
    if (!removed.length) return false;
    owner.equippedSupports = equippedSupports;
    owner.supportSlotByName = keepSupportSlotAssignments(owner);
    if (logChange) (yield { kind: 'runeLog', args: [env.deps._t('🟢 장착 한도, 공명력 또는 연결 제약으로 자동 해제: {removed}', { removed: removed.join(', ') }), "attack-monster"] });
    env.deps.playerStatCache.invalidate();
    return removed.length > 0;
}
export const inspectSupportPlacement = (owner, move, budget) => {
    const { name, index, expected } = move;
    const slots = supportSlotNames(owner, budget.capacity);
    const replaced = slots[index];
    const cost = rune => rune ? getSupportResonanceCostAtTier(rune, activeSupportTier(rune, owner, budget.definitions), budget.definitions) : 0;
    const delta = cost(name) - cost(replaced);
    const total = owner.equippedSupports.reduce((sum, rune) => sum + cost(rune), delta);
    const result = { slots, replaced, delta, total, shortage: 0, conflict: '', invalid: false };
    if (!budget.definitions[name] || replaced === undefined || (expected !== undefined && replaced !== expected)
        || !owner.supports.includes(name) || owner.equippedSupports.includes(name)) {
        result.invalid = true;
        return result;
    }
    result.conflict = budget.conflict(name, owner, replaced);
    result.shortage = budget.overflow ? 0 : Math.max(0, total - budget.resonance);
    slots[index] = name;
    return result;
};

/** Move a worn rune between verified slots, or return it to the library with a null destination. */
export function inspectWornSupportMove(owner, name, move, capacity) {
    const { from, index, expected } = move;
    const slots = supportSlotNames(owner, capacity);
    if (!name || !Number.isInteger(from) || slots[from] !== name) return null;
    if (index === null) { slots[from] = ''; return slots; }
    if (!Number.isInteger(index) || index === from || slots[index] === undefined || slots[index] !== expected) return null;
    slots[from] = slots[index];
    slots[index] = name;
    return slots;
}
