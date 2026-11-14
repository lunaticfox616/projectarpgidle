import { cubeUsable, cubeEntries } from './stump-cube-materials.mjs';

/** Stored items of one kind the cube may take (bag gear, stump storage, jewels, cores), whether inside the cube or not. */
export function cubeStoredUsable(env, kind, state) {
    const pools = {
        equipment: () => (state.inventory || []).filter(item => !env.deps.bagItems.isSpecial(item)),
        stump: () => ((state.stumpBox && state.stumpBox.items) || []).filter(item => !env.deps.stumpBox.isPlaced(state, item.id)),
        jewel: () => env.deps.bagItems.jewels(state),
        core: () => env.deps.bagItems.cores(state),
        wallet: () => env.deps.stumpBox.walletPieces(state, env.SIZE * env.SIZE)
    };
    return pools[kind]().filter(item => cubeUsable(env, kind, item));
}

/** Items of one kind that could go in now (not already inside, not locked or placed); of currency, the next unit of each stack. */
export function cubeCandidates(env, kind, state) {
    const inside = new Set(cubeEntries(env, state).filter(entry => entry.kind === kind).map(entry => entry.id));
    const free = cubeStoredUsable(env, kind, state).filter(item => !inside.has(kind === 'equipment' ? env.deps.equipmentLoadoutRuntime.getItemIdentity(item) : item.id));
    return kind === 'wallet' ? free.filter((piece, at) => free.findIndex(other => other.walletKey === piece.walletKey) === at) : free;
}
