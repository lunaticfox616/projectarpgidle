// CSS 1px must cover a whole number of device pixels to retain pixel-font edges.
export const PC_SCALE_STEPS = Object.freeze([100, 150, 200]);
const floorDpr = dpr => Math.max(1, Math.floor((dpr || 1) + 1e-6));
const deviceMultiple = (step, dpr) => step / 100 * floorDpr(dpr);
export function isCrispStep(step, dpr) {
    const multiple = deviceMultiple(step, dpr);
    return Math.abs(multiple - Math.round(multiple)) < 1e-6;
}
export function nearestPcScaleStep(wanted, dpr) {
    return PC_SCALE_STEPS.slice().sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted)
        || Number(isCrispStep(b, dpr)) - Number(isCrispStep(a, dpr)) || a - b)[0];
}
export function recommendedScale(deviceWidth, dpr) {
    const distance = step => Math.abs(deviceWidth / deviceMultiple(step, dpr) - 1920);
    return PC_SCALE_STEPS.filter(step => isCrispStep(step, dpr)).sort((a, b) => distance(a) - distance(b) || a - b)[0];
}
export function scaledMediaText(query, factor) {
    return query.replace(/((?:min-|max-)?(?:width|height)\s*:\s*)([\d.]+)(px|em|rem)/g,
        (_, prefix, value, unit) => `${prefix}${Number(value) * factor}${unit}`);
}
