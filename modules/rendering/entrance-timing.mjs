/** Presentation-only easing shared by boss arrival and observer awakening. */
export function ease(t) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3); }
export const share = (value, from, until) => Math.max(0, Math.min(1, (value - from) / (until - from)));
