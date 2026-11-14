import { cubeRecipeItems } from './stump-cube-recipes-equipment.mjs';

/** The merged quality (data/stump-cube.js STUMP_CUBE_MERGE): the inputs' average + 1~10% up to the box's quality cap (130%, raised by
 * the loop 35 and 45 unlocks); now and then their best + 1~10% up to the cap, or their average + 11% that may pass the cap (overCap). */
export function cubeRecipeMergedRoll(env, list, state, random) {
    const rolls = list.map(item => Number(item.roll) || 1), cap = env.deps.stumpBox.rollCap(state), rule = env.deps.STUMP_CUBE_MERGE;
    const average = rolls.reduce((sum, roll) => sum + roll, 0) / rolls.length;
    const step = () => (rule.step[0] + Math.floor(random() * (rule.step[1] - rule.step[0] + 1))) / 100, luck = random();
    if (luck < rule.overChance) return { roll: average + rule.over, overCap: true };
    if (luck < rule.overChance + rule.bestChance) return { roll: Math.min(cap, Math.max(...rolls) + step()) };
    return { roll: Math.min(cap, average + step()) };
}

/** The merged seed: same colour, the rolled quality; golden if any was golden, ancient (고대 씨앗) if any was ancient. What it grows into
 * is rolled when it ripens, like any seed. */
export function cubeRecipeStumpMergeSpec(env, list, state, random) {
    return { family: 'seed', color: list[0].color, ...cubeRecipeMergedRoll(env, list, state, random),
        golden: list.some(item => item.golden === true), ancient: list.some(item => item.ancient === true) };
}

export function cubeRecipeStumpMerge(env, [group], state, random) {
    return { ok: true, consumed: group, outputs: [{ kind: 'stump', spec: cubeRecipeStumpMergeSpec(env, cubeRecipeItems(group), state, random) }] };
}

/** Two seeds of one colour turn a seed of another colour into theirs: quality, golden and ancient stay, growth starts over. */
export function cubeRecipeStumpRecolor(env, [donors, [target]], state) {
    const item = target.item, roll = Number(item.roll) || 1;
    const spec = { family: 'seed', color: donors[0].item.color, roll, overCap: roll > env.deps.stumpBox.rollCap(state),
        golden: item.golden === true, ancient: item.ancient === true };
    return { ok: true, consumed: [...donors, target], outputs: [{ kind: 'stump', spec }] };
}

export function cubeRecipeTalismanSource(group) {
    return cubeRecipeItems(group).every(item => item.rarity === 'rare') ? 'radiantSealShard' : 'strongSealShard';
}

export function cubeRecipeTalismanUpgrade(env, [group], state, random) {
    return { ok: true, consumed: group, outputs: [{ kind: 'stump', talisman: env.deps.talismans.roll(cubeRecipeTalismanSource(group), random) }] };
}

export function cubeRecipeTalismanRerollLine(env, [[talisman], [vine]], state, random) {
    if (!env.deps.talismans.rerollStatLine(talisman.item, random)) return { ok: false, reason: env.deps._t('다시 쓸 일반 줄이 없는 부적입니다.') };
    return { ok: true, consumed: [vine], outputs: [{ kind: 'stump', existing: talisman.item }] };
}

export function cubeRecipeTalismanUniqueReroll(env, [group], state, random) {
    const talisman = env.deps.talismans.rollOtherUnique(cubeRecipeItems(group).map(item => item.uniqueId), random);
    return { ok: true, consumed: group, outputs: [{ kind: 'stump', talisman }] };
}

export function cubeRecipeJewelTierRange(group) {
    const top = Math.max(1, ...cubeRecipeItems(group).map(item => Math.floor(Number(item.hiddenTier) || 1)));
    return { min: Math.max(1, top - 1), max: top };
}

export function cubeRecipeJewelFuse(env, [group], state, random) {
    const stats = env.deps.rollJewelCraftStats(3 + (random() < 0.35 ? 1 : 0), null, cubeRecipeJewelTierRange(group));
    if (!stats.length) return { ok: false, reason: env.deps._t('주얼 옵션을 굴리지 못했습니다.') };
    const id = env.deps.nextItemId();
    const jewel = { id, name: env.deps._t('{id} 주얼', { id: env.deps.getStatName(stats[0].id) }), tier: 1,
        hiddenTier: Math.max(1, ...stats.map(stat => stat.tier || 1)), rarity: 'rare', stats };
    return { ok: true, consumed: group, outputs: [{ kind: 'jewel', item: jewel }] };
}

export function cubeRecipeCoreRerollLine(env, [[core], [vine]], state, random) {
    if (!env.deps.coreItems.rerollLine(core.item, random)) return { ok: false, reason: env.deps._t('다시 굴릴 수 없는 코어입니다.') };
    return { ok: true, consumed: [vine], outputs: [{ kind: 'core', existing: core.item }] };
}

export function cubeRecipeCoreReroll(env, [group]) {
    return { ok: true, consumed: group, outputs: [{ kind: 'core', item: env.deps.coreItems.roll() }] };
}
