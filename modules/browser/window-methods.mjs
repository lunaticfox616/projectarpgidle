// Stable browser ports preserve the Window receiver and read the current platform function at invocation.
// Native methods must not be called with a module dependency object as their receiver.
export const windowAtob = (...args) => globalThis.atob(...args);
export const windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
export const windowCancelIdleCallback = (...args) => globalThis.cancelIdleCallback(...args);
export const windowClearInterval = (...args) => globalThis.clearInterval(...args);
export const windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
export const windowFetch = (...args) => globalThis.fetch(...args);
export const windowGetComputedStyle = (...args) => globalThis.getComputedStyle(...args);
export const windowMatchMedia = (...args) => globalThis.matchMedia(...args);
export const windowQueueMicrotask = (...args) => globalThis.queueMicrotask(...args);
export const windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
export const windowRequestIdleCallback = (...args) => globalThis.requestIdleCallback(...args);
export const windowSetInterval = (...args) => globalThis.setInterval(...args);
export const windowSetTimeout = (...args) => globalThis.setTimeout(...args);
export const windowStructuredClone = (...args) => globalThis.structuredClone(...args);
