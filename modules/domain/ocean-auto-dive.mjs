/** A manual dive clears the halt state; these predicates only read the current run. */
export function isAutoOceanDive(state) { return !!state.diving && state.autoDive === true; }

export function isOceanAutoRediveHalted(state, missLimit) {
    return state.lastSurfaceReason === 'defeat' || state.fruitlessDives >= missLimit;
}
