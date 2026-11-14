import { clampNumber } from '../common/numbers.mjs';
import { HERO_SPRITE_CONFIG, HERO_FRAME_META } from '../data/hero-motion-layout.mjs';

export function getSpriteFrameRectByIndex(image, frameIndex, config) {
    if (!image || !config) return null;
    let cols = config.cols || 6;
    let rows = config.rows || 5;
    let frameW = Math.floor(image.width / cols);
    let frameH = Math.floor(image.height / rows);
    let safeIndex = clampNumber(frameIndex, 0, cols * rows - 1);
    let col = safeIndex % cols;
    let row = Math.floor(safeIndex / cols);
    return { sx: col * frameW, sy: row * frameH, sw: frameW, sh: frameH };
}

export function getHeroFrameMeta(frameIndex) {
    return HERO_FRAME_META[frameIndex] || {
        motion: 'idle',
        local: 0,
        pivot: { x: 150, y: 260 },
        hand: { x: 120, y: 155 },
        drawOffset: { x: 0, y: 0 }
    };
}

export function getHeroDrawMetrics(heroWorldX, heroWorldY, frameRect, frameMeta) {
    let scale = HERO_SPRITE_CONFIG.drawHeight / frameRect.sh;
    let drawW = frameRect.sw * scale;
    let drawH = frameRect.sh * scale;
    let pivotX = (frameMeta.pivot.x / 229) * frameRect.sw;
    let pivotY = (frameMeta.pivot.y / 229) * frameRect.sh;
    let offsetX = (frameMeta.drawOffset.x / 300) * frameRect.sw;
    let offsetY = (frameMeta.drawOffset.y / 300) * frameRect.sh;
    let dx = heroWorldX - (pivotX * scale) + (offsetX * scale);
    let dy = heroWorldY - (pivotY * scale) + (offsetY * scale);
    return { drawW, drawH, dx, dy, scaleX: scale, scaleY: scale };
}
