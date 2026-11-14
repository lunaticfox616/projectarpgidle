/** Synchronous UI notification boundary. Offline calculation must never dispatch browser effects. */
export function dispatchBrowserRuntimeEvent(target, state, name, detail = {}) {
    if (state && state.isBackgroundCalculation) return false;
    if (!target || typeof target.dispatchEvent !== 'function' || typeof target.CustomEvent !== 'function') return false;
    target.dispatchEvent(new target.CustomEvent(`project-idle:${name}`, { detail }));
    return detail.handled === true;
}
