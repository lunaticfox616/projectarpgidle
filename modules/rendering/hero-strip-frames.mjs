import { withImageRef, inferStripFallbackColumns, resolveHeroMotionStripAnchor } from './hero-frame-layout.mjs';
import { sortSheetComponents, detectSpriteComponents, padSpriteRect } from '../browser/sprite-components.mjs';
import { heroStripFrameCounts } from '../data/legacy-hero-frames.mjs';

export function buildFixedStripFramesFromImage(inputs, image, frameCount) {
    if (!image || !Number.isFinite(frameCount) || frameCount <= 0) return [];
    let frames = [];
    for (let i = 0; i < frameCount; i++) {
        let x = Math.round(i * image.width / frameCount);
        let nextX = i === frameCount - 1 ? image.width : Math.round((i + 1) * image.width / frameCount);
        let raw = { x: x, y: 0, width: Math.max(1, nextX - x), height: image.height };
        let trimmed = inputs.trimRectToContent(image, raw, 1);
        if (trimmed && trimmed.width >= 10 && trimmed.height >= 10) frames.push(withImageRef(image, trimmed));
        else frames.push(withImageRef(image, raw));
    }
    return frames.filter(Boolean);
}

export function buildStripFramesFromImage(inputs, image, minArea, frameCount) {
    if (!image) return [];
    if (Number.isFinite(frameCount) && frameCount > 0) {
        let fixedFrames = buildFixedStripFramesFromImage(inputs, image, frameCount);
        if (fixedFrames.length > 0) return fixedFrames;
    }
    let detected = sortSheetComponents(detectSpriteComponents(inputs, image, minArea || 220))
        .map(rect => inputs.trimRectToContent(image, padSpriteRect(rect, image, 2), 2))
        .filter(rect => rect && rect.width >= 22 && rect.height >= 38)
        .map(rect => withImageRef(image, rect))
        .filter(Boolean);
    if (detected.length > 0) return detected;
    let fallbackCols = inferStripFallbackColumns(image);
    return buildFixedStripFramesFromImage(inputs, image, fallbackCols);
}

export function getHeroStripAnchor(inputs, image, frameCount) {
    if (!image || !Number.isFinite(frameCount) || frameCount <= 0) return null;
    let frameWidth = Math.max(1, Math.round(image.width / frameCount));
    let raw = { x: 0, y: 0, width: frameWidth, height: image.height };
    let content = inputs.trimRectToContent(image, raw, 1) || raw;
    return {
        xRatio: 0.5,
        anchorY: content.y + content.height - raw.y,
        basisHeight: Math.max(1, content.height)
    };
}

export function buildAnchoredHeroStripFrames(image, frameCount, anchor) {
    if (!image || !anchor || !Number.isFinite(frameCount) || frameCount <= 0) return [];
    let frames = [];
    for (let i = 0; i < frameCount; i++) {
        let x = Math.round(i * image.width / frameCount);
        let nextX = i === frameCount - 1 ? image.width : Math.round((i + 1) * image.width / frameCount);
        let raw = { x: x, y: 0, width: Math.max(1, nextX - x), height: image.height };
        frames.push(withImageRef(image, {
            ...raw,
            anchorX: raw.width * anchor.xRatio,
            anchorY: anchor.anchorY,
            basisHeight: anchor.basisHeight
        }));
    }
    return frames.filter(Boolean);
}

export function buildDirectionalHeroAttackFrames(inputs, directionKeys, anchor, motionAnchors) {
    let result = {};
    Object.entries(directionKeys || {}).forEach(([direction, keys]) => {
        let variants = (Array.isArray(keys) ? keys : []).map((key, index) => {
            let image = inputs.battleAssets.images[key];
            let frameCount = heroStripFrameCounts[key] || inferStripFallbackColumns(image);
            let motionAnchor = resolveHeroMotionStripAnchor(anchor, motionAnchors, 'attack', index, direction);
            return buildAnchoredHeroStripFrames(image, frameCount, motionAnchor);
        }).filter(frames => frames.length > 0);
        if (variants.length > 0) result[direction] = variants;
    });
    return result;
}

export function buildHeroFrameSetFromStripKeys(inputs, stripKeys, heroId) {
    if (!stripKeys) return null;
    let motionDefinition = typeof inputs.PLAYER_CLASS_DEFS === 'object'
        ? inputs.PLAYER_CLASS_DEFS[heroId]
        : null;
    let motionAnchors = motionDefinition && motionDefinition.motionAnchors;
    let idleImage = inputs.battleAssets.images[stripKeys.idle];
    let idleCount = heroStripFrameCounts[stripKeys.idle];
    let anchor = getHeroStripAnchor(inputs, idleImage, idleCount);
    let idleAnchor = resolveHeroMotionStripAnchor(anchor, motionAnchors, 'idle', 0);
    let walkAnchor = resolveHeroMotionStripAnchor(anchor, motionAnchors, 'walk', 0);
    let { idleFrames, idleDirections, walkFrames, walkDirections } = buildHeroStripMotionFrames({ idleImage, idleCount, idleAnchor, stripKeys, inputs, anchor, motionAnchors, walkAnchor });
    let { attackVariants, attackDirections, attackVariantWeights, attackFrames } = buildHeroStripAttackFrames({ stripKeys, inputs, anchor, motionAnchors, motionDefinition });
    let hurtFrames = buildAnchoredHeroStripFrames(inputs.battleAssets.images[stripKeys.hurt], heroStripFrameCounts[stripKeys.hurt], idleAnchor);
    let downFrames = buildAnchoredHeroStripFrames(inputs.battleAssets.images[stripKeys.death], heroStripFrameCounts[stripKeys.death], idleAnchor);
    if (idleFrames.length === 0 || walkFrames.length === 0 || attackFrames.length === 0) return null;
    let hold = idleFrames[0] || walkFrames[0] || attackFrames[0];
    return describeHeroStripFrames({ idleFrames, idleDirections, walkFrames, walkDirections, attackDirections, attackFrames, hurtFrames, hold, downFrames, attackVariants, attackVariantWeights });
}

function buildHeroStripMotionFrames({ idleImage, idleCount, idleAnchor, stripKeys, inputs, anchor, motionAnchors, walkAnchor }) {
    let idleFrames = buildAnchoredHeroStripFrames(idleImage, idleCount, idleAnchor);
    let idleDirections = Object.fromEntries(Object.entries(stripKeys.idleDirections || {}).map(([direction, key]) => [
        direction,
        buildAnchoredHeroStripFrames(inputs.battleAssets.images[key], heroStripFrameCounts[key] || idleCount, resolveHeroMotionStripAnchor(anchor, motionAnchors, 'idle', 0, direction))
        ]).filter(entry => entry[1].length > 0));
    let walkFrames = buildAnchoredHeroStripFrames(inputs.battleAssets.images[stripKeys.walk], heroStripFrameCounts[stripKeys.walk], walkAnchor);
    let walkDirections = Object.fromEntries(Object.entries(stripKeys.walkDirections || {}).map(([direction, key]) => [
        direction,
        buildAnchoredHeroStripFrames(inputs.battleAssets.images[key], heroStripFrameCounts[key] || heroStripFrameCounts[stripKeys.walk], resolveHeroMotionStripAnchor(anchor, motionAnchors, 'walk', 0, direction))
        ]).filter(entry => entry[1].length > 0));
    return { idleFrames, idleDirections, walkFrames, walkDirections };
}

function buildHeroStripAttackFrames({ stripKeys, inputs, anchor, motionAnchors, motionDefinition }) {
    let attackKeys = Array.isArray(stripKeys.attacks) && stripKeys.attacks.length > 0 ? stripKeys.attacks : [stripKeys.attack];
    let attackVariants = attackKeys.map((key, index) => buildAnchoredHeroStripFrames(
            inputs.battleAssets.images[key], heroStripFrameCounts[key],
            resolveHeroMotionStripAnchor(anchor, motionAnchors, 'attack', index)
    )).filter(frames => frames.length > 0);
    let attackDirections = buildDirectionalHeroAttackFrames(inputs, stripKeys.attackDirections, anchor, motionAnchors);
    let attackVariantWeights = motionDefinition && Array.isArray(motionDefinition.attackVariantWeights)
        && motionDefinition.attackVariantWeights.length === attackVariants.length
        ? motionDefinition.attackVariantWeights.slice()
        : null;
    let attackFrames = attackVariants[0] || [];
    return { attackVariants, attackDirections, attackVariantWeights, attackFrames };
}

function describeHeroStripFrames({ idleFrames, idleDirections, walkFrames, walkDirections, attackDirections, attackFrames, hurtFrames, hold, downFrames, attackVariants, attackVariantWeights }) {
    return {
        characterAnimations: describeHeroStripAnimations({ idleFrames, idleDirections, walkFrames, walkDirections, attackDirections, attackFrames, hurtFrames, hold, downFrames }),
        clipLoop: {
            idle: true,
            walk_or_run: true,
            sword_attack_body: false,
            cast_body: false,
            hurt: false,
            down_or_knockdown: false,
            bow_attack_body: false
        },
        idle: idleFrames,
        idleDirections: idleDirections,
        walk: walkFrames,
        run: walkFrames,
        attackVariants: attackVariants,
        attackDirections: attackDirections,
        attackVariantWeights: attackVariantWeights,
        swordCombo: attackFrames,
        castCombo: attackFrames,
        projectileCombo: attackFrames,
        bowCombo: attackFrames,
        hurt: hurtFrames,
        down: downFrames,
        attack: attackFrames[0] || hold || null,
        sideIdle: hold || null,
        sideWalk: walkFrames[0] || hold || null,
        frontIdle: hold || null,
        frontGuard: idleFrames[1] || hold || null
    };
}

function describeHeroStripAnimations({ idleFrames, idleDirections, walkFrames, walkDirections, attackDirections, attackFrames, hurtFrames, hold, downFrames }) { return {
        idle: idleFrames,
        idleDirections: idleDirections,
        walk_or_run: walkFrames,
        walkDirections: walkDirections,
        attackDirections: attackDirections,
        sword_attack_body: attackFrames,
        cast_body: attackFrames,
        hurt: hurtFrames.length > 0 ? hurtFrames : [hold].filter(Boolean),
        down_or_knockdown: downFrames.length > 0 ? downFrames : (hurtFrames.length > 0 ? hurtFrames : [hold].filter(Boolean)),
        bow_attack_body: attackFrames
    }; }
