

/** The trunk guardian gives whichever ticket the player holds fewest of. */
export function atlasCoreGuardianTicket(env, state, node) {
    if (node.ticket) return node.ticket;
    return env.deps.ATLAS.pinnacle.tickets.reduce((low, key) => ((state.currencies[key] || 0) < (state.currencies[low] || 0) ? key : low));
}

/** What a boss kill beyond ordinary completion earns: a guardian's ticket, the pinnacle's seed and rewards. */
export function atlasCoreBossSpoils(env, state, node) {
    if (node.kind === 'guardian') return { ticket: atlasCoreGuardianTicket(env, state, node) };
    if (node.kind !== 'pinnacle') return {};
    const seed = state.atlas.seeds < env.deps.ATLAS.seeds.max;
    if (seed) state.atlas.seeds += 1;
    return { seed, seeds: state.atlas.seeds, rewards: env.deps.ATLAS.pinnacle.rewards };
}
