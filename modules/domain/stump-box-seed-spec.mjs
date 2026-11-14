import { stumpPlacedItems } from './stump-box-board-items.mjs';
import { stumpOf } from './stump-box-state.mjs';
import { stumpClampRoll } from './stump-box-item-values.mjs';
import { stumpIconPath, stumpLabel } from './stump-box-item-view.mjs';

// ── 드랍 ───────────────────────────────────────────────
/** Half the drops take a colour from the board (weighted by how many sit there), the rest any colour. */
export function stumpDropColor(env, state, random) {
    const placed = stumpPlacedItems(stumpOf(env, state)).map(item => item.color).filter(Boolean);
    const pool = placed.length && random() < env.deps.STUMP_BOX_DROPS.boardColorShare ? placed : env.COLORS;
    return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

/** A dropped seed, not yet in the box: { family, color, roll, golden }. random() → [0, 1). The 씨앗 비 omen drops one as it is. */
export function stumpSeedDropSpec(env, state, random) {
    const spec = { family: 'seed', color: stumpDropColor(env, state, random), roll: stumpClampRoll(env, env.deps.STUMP_BOX_DROPS.roll.min + random() * (env.deps.STUMP_BOX_DROPS.roll.max - env.deps.STUMP_BOX_DROPS.roll.min)) };
    spec.golden = random() < env.deps.STUMP_BOX_RIPENING.golden.dropChance;
    return spec;
}

/** A floor row's rolled drop as a look-only item: its picture and name on the ground (js/battle-ground-loot-ui.js). */
export function stumpDropView(spec) { return { ...spec, xp: 0, ripe: false }; }

export function stumpDropIcon(env, spec) { return stumpIconPath(env, stumpDropView(spec)); }

export function stumpDropName(env, spec) { return stumpLabel(env, stumpDropView(spec)); }

export function stumpValidDrop(env, spec) { return !!spec && env.FAMILIES.includes(spec.family) && env.COLORS.includes(spec.color) && Number.isFinite(spec.roll); }
