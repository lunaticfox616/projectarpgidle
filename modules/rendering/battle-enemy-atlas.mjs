import { isPreCleanedBattleSheet } from '../browser/battle-sheet-policy.mjs';
import { sanitizeLocalMonsterBackdropSheet } from '../browser/battle-monster-matte.mjs';
import { sanitizeWhiteBackdropSheet } from '../browser/battle-white-matte.mjs';
import { sanitizeBattleSheet } from '../browser/battle-sheet-matte.mjs';

export function getWispAtlasFrame(cell, motion, directionIndex, frameIndex) {
    const animated = motion !== 'idle';
    const tileWidth = animated ? 576 : 256;
    const tileHeight = animated ? 256 : 64;
    return {
        x: (cell % 3) * tileWidth + (animated ? frameIndex : directionIndex) * 64,
        y: Math.floor(cell / 3) * tileHeight + (animated ? directionIndex * 64 : 0),
        width: 64,
        height: 64,
        anchorX: 32,
        anchorY: 62,
        basisHeight: 64
    };
}

export function buildWispEnemyVariants(inputs, images) {
    if (typeof inputs.WISP_MONSTER_VISUALS === 'undefined') return [];
    const attackImage = images.wispEnemyAttack;
    const glowImage = images.wispEnemyGlow;
    if (!attackImage || !glowImage) return [];
    const directions = ['south', 'north', 'west', 'east'];
    return inputs.WISP_MONSTER_VISUALS.map(wisp => {
        const directional = Object.fromEntries(directions.map((direction, directionIndex) => {
            const frames = Array.from({ length: 9 }, (_, frameIndex) => ({
                image: glowImage,
                frame: getWispAtlasFrame(wisp.cell, 'glow', directionIndex, frameIndex)
            }));
            const attackFrames = Array.from({ length: 9 }, (_, frameIndex) => ({
                image: attackImage,
                frame: getWispAtlasFrame(wisp.cell, 'attack', directionIndex, frameIndex)
            }));
            return [direction, { image: glowImage, frame: frames[0].frame, frames, attackFrames }];
        }));
        return {
            id: wisp.id, skinId: wisp.id, label: wisp.name,
            image: glowImage, frame: directional.south.frame,
            frames: directional.south.frames, attackFrames: directional.south.attackFrames,
            directions: directional
        };
    });
}

export function buildEnemyTransparentImage(inputs, image) {
    if (!image || isPreCleanedBattleSheet('enemies')) return image;
    try {
        return sanitizeLocalMonsterBackdropSheet(inputs, sanitizeWhiteBackdropSheet(inputs, sanitizeBattleSheet(inputs, image)));
    } catch {
        return sanitizeLocalMonsterBackdropSheet(inputs, sanitizeWhiteBackdropSheet(inputs, image));
    }
}
