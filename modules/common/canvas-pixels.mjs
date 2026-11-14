/**
 * Aligns an axis-aligned destination rectangle to backing-store pixels.
 * This keeps one-pixel sprite details stable at fractional device scales such as 125%.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {{x: number, y: number, width: number, height: number}}
 */
export function snapCanvasRectToDevicePixels(ctx, x, y, width, height) {
    let transform = ctx.getTransform();
    let scaleX = Number(transform.a);
    let scaleY = Number(transform.d);
    let axisAligned = Number.isFinite(scaleX) && Math.abs(scaleX) > 0.001
        && Number.isFinite(scaleY) && Math.abs(scaleY) > 0.001
        && Math.abs(Number(transform.b) || 0) < 0.001
        && Math.abs(Number(transform.c) || 0) < 0.001;
    if (!axisAligned) return { x, y, width, height };
    let left = (Math.round(x * scaleX + transform.e) - transform.e) / scaleX;
    let top = (Math.round(y * scaleY + transform.f) - transform.f) / scaleY;
    let right = (Math.round((x + width) * scaleX + transform.e) - transform.e) / scaleX;
    let bottom = (Math.round((y + height) * scaleY + transform.f) - transform.f) / scaleY;
    return { x: left, y: top, width: Math.max(1 / Math.abs(scaleX), right - left), height: Math.max(1 / Math.abs(scaleY), bottom - top) };
}
/**
 * 캔버스 글을 정수 화소에서 시작하게 그린다(2026-10-21): 가운데, 오른쪽 맞춤은 왼쪽 시작점으로 바꾸고 그 자리를
 * snapCanvasRectToDevicePixels로 맞춘다. 가운데 맞춘 글은 폭이 홀수면 반 화소에 놓여 번졌다.
 * @param {'fillText'|'strokeText'} method
 */
export function drawCrispCanvasText(ctx, text, x, y, method = 'fillText') {
    const label = String(text), align = ctx.textAlign;
    const width = align === 'center' || align === 'right' || align === 'end' ? ctx.measureText(label).width : 0;
    const at = snapCanvasRectToDevicePixels(ctx, align === 'center' ? x - width / 2 : x - width, y, 0, 0);
    ctx.textAlign = 'left';
    ctx[method](label, at.x, at.y);
    ctx.textAlign = align;
}
