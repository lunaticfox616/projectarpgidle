

/** known: recipe ids already announced (조합법 발견); null until the first foreground check records what is open silently. */
export function cubeEmpty() {
    return { slots: [], known: null };
}

export function cubeInGrid(env, value) {
    return Number.isInteger(value) && value >= 0 && value < env.SIZE;
}

export function cubeValidSlot(env, raw) {
    return !!raw && env.KINDS.includes(raw.kind) && (typeof raw.id === 'string' || Number.isSafeInteger(raw.id)) && cubeInGrid(env, raw.x) && cubeInGrid(env, raw.y);
}

/** Save boundary: keeps well-formed references only (whether they still point at something is checked when read). */
export function cubeNormalize(env, raw) {
    const slots = (raw && Array.isArray(raw.slots) ? raw.slots : []).filter((...args) => cubeValidSlot(env, ...args)).slice(0, env.SIZE * env.SIZE)
        .filter((slot, at, all) => all.findIndex(other => other.kind === slot.kind && other.id === slot.id) === at)
        .map(({ kind, id, x, y }) => ({ kind, id, x, y }));
    const known = raw && Array.isArray(raw.known) ? env.deps.STUMP_CUBE_RECIPES.map(recipe => recipe.id).filter(id => raw.known.includes(id)) : null;
    return { slots, known };
}

export function cubeOf(state) {
    if (!state.stumpCube || !Array.isArray(state.stumpCube.slots)) state.stumpCube = cubeEmpty();
    return state.stumpCube;
}
