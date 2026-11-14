// 축약 저장된 장비 줄을 되살린다(saveVersion 20, js/item-save-slim.js)
export function clampFiniteNumber(value, fallback, min, max) {
    let num = Number(value);
    if (!Number.isFinite(num)) num = fallback;
    if (Number.isFinite(min)) num = Math.max(min, num);
    if (Number.isFinite(max)) num = Math.min(max, num);
    return num;
}
