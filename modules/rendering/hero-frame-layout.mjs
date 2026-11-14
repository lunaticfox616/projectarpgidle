import { heroParts } from '../data/legacy-hero-frames.mjs';

export function resolveHeroMotionStripAnchor(baseAnchor, motionAnchors, motion, variantIndex, direction) {
    if (!baseAnchor) return null;
    motionAnchors = { ...motionAnchors, ...(motionAnchors && motionAnchors[direction]) };
    let configured = motion === 'attack' && motionAnchors && Array.isArray(motionAnchors.attacks)
        ? motionAnchors.attacks[variantIndex]
        : (motionAnchors && motionAnchors[motion]);
    if (!Number.isFinite(configured)) return baseAnchor;
    return { ...baseAnchor, anchorY: configured };
}

export function hasUsableFrame(frame) {
    return !!(frame && Number.isFinite(frame.width) && Number.isFinite(frame.height) && frame.width >= 18 && frame.height >= 24);
}

export function isNearSize(image, width, height, tolerance) {
    let tw = tolerance || 0.035;
    let th = tolerance || 0.035;
    return Math.abs((image.width || 0) - width) <= width * tw && Math.abs((image.height || 0) - height) <= height * th;
}

export function buildScaledHeroParts(image) {
    let scaleX = image.width / 1536;
    let scaleY = image.height / 1024;
    return heroParts.map(part => ({
        x: Math.max(0, Math.round(part.x * scaleX)),
        y: Math.max(0, Math.round(part.y * scaleY)),
        width: Math.max(10, Math.round(part.width * scaleX)),
        height: Math.max(10, Math.round(part.height * scaleY))
    }));
}

export function withImageRef(image, frame) {
    if (!image || !frame) return null;
    return { ...frame, image: image };
}

export function inferStripFallbackColumns(image) {
    let width = Math.max(1, Math.round(image && image.width || 1));
    let height = Math.max(1, Math.round(image && image.height || 1));
    let squareFrameCols = width / height;
    let roundedSquareFrameCols = Math.round(squareFrameCols);
    if (roundedSquareFrameCols >= 1 && Math.abs(squareFrameCols - roundedSquareFrameCols) <= 0.02) {
        return roundedSquareFrameCols;
    }
    return Math.max(1, Math.round(width / 80));
}
