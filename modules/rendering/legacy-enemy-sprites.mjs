import { clampNumber } from '../common/numbers.mjs';
import { getEnemyOutlineStyle } from './enemy-outline.mjs';
import { drawFallbackEnemy } from './fallback-actor-art.mjs';

function getBossAssetVariantEntry(enemy, enemyAtlas) {
    if (!enemy || !enemy.isBoss || !enemy.bossAssetKey || !enemyAtlas) return null;
    let bossImage = (enemyAtlas.bossImages || {})[enemy.bossAssetKey];
    if (!bossImage) return null;
    return {
        image: bossImage,
        frame: { x: 0, y: 0, width: bossImage.width, height: bossImage.height, basisHeight: bossImage.height }
    };
}

function pickBattleEnemyVariant(enemy, enemyAtlas) {
    if (!enemyAtlas) return null;
    const kind = enemy.isBoss ? 'boss' : (enemy.isElite ? 'elite' : 'normal');
    const pool = enemyPool(enemyAtlas, kind);
    if (pool.length === 0) return null;
    return pickSeededEnemyVariant(enemy, pool);
}

const FALLBACK_POOLS = { normal: ['slime', 'bandit', 'shadow', 'wraith'], elite: ['knight', 'skeleton', 'shadow', 'wraith'], boss: ['boss', 'knight', 'skeleton'] };
function enemyPool(atlas, kind) {
    const configured = (atlas.variants || {})[kind] || [];
    if (configured.length) return configured.slice();
    const frames = atlas.frames || {};
    return FALLBACK_POOLS[kind].map(key => ({ image: atlas.image, frame: frames[key] })).filter(entry => entry.frame);
}

function pickSeededEnemyVariant(enemy, pool) {
    if (enemy.spriteVariantId) {
        let assignedVariant = pool.find(entry => entry && entry.id === enemy.spriteVariantId);
        if (assignedVariant) return assignedVariant;
    }
    let variantSeed = Math.abs(enemy.variantSeed || enemy.id || 1);
    let elementOffset = enemy.ele === 'fire' ? 1 : (enemy.ele === 'cold' ? 2 : (enemy.ele === 'light' ? 3 : (enemy.ele === 'chaos' ? 4 : 0)));
    return pool[(variantSeed + elementOffset) % pool.length];
}

function directionEntry(variant, facing) {
    return variant && variant.directions ? (variant.directions[facing] || variant.directions.south) : variant;
}

function attackFramesFor(entry) {
    if (Array.isArray(entry && entry.attackFrames)) return entry.attackFrames;
    const animations = entry && entry.animations;
    return animations && Array.isArray(animations.attack) ? animations.attack : [];
}

function movementFrame(entry, enemy, motion) {
    const frames = Array.isArray(entry && entry.frames) ? entry.frames : [];
    const phase = (Number(motion.now) || 0) + Math.abs(Number(enemy.variantSeed || enemy.id || 0)) * 41;
    const index = motion.moving === true && frames.length > 0 ? Math.floor(phase / 190) % frames.length : 0;
    return frames[index] || {};
}

function resolveEnemySpriteMotion(variantEntry, enemy, motion) {
    const { attackMotion, facingDirection } = motion;
    const directionalEntry = directionEntry(variantEntry, facingDirection);
    const attackFrames = attackFramesFor(directionalEntry);
    if (attackMotion && attackFrames.length > 0) {
        let index = Math.floor(clampNumber(attackMotion.progress, 0, 0.999) * attackFrames.length);
        return { entry: attackFrames[index] || {}, x: 0, y: 0 };
    }
    return {
        entry: movementFrame(directionalEntry, enemy, motion),
        x: attackMotion ? attackMotion.x : 0,
        y: attackMotion ? attackMotion.y : 0
    };
}

function enemyFrame(atlas, variant, animated) {
    return { frame: animated.frame || variant.frame || atlas.frames.bandit || atlas.frames.slime,
        image: animated.image || variant.image || atlas.image };
}

function enemyDimensions(enemy, scale) {
    const size = enemy.isBoss ? 70 : (enemy.isElite ? 52 : 44);
    const basis = enemy.isBoss ? 2.55 : (enemy.isElite ? 2.2 : 1.95);
    const ratio = enemy.isBoss ? scale / 2.55 : 1;
    return { size: size * (scale / basis), shadowWidth: enemy.isBoss ? 22 * ratio : 9, shadowHeight: enemy.isBoss ? 7 * ratio : 4 };
}

class LegacyEnemyRenderer {
    constructor(deps) { this.deps = deps; }
    draw(ctx, enemy, input) {
        const assets = this.deps.assets;
        if (assets.ready && assets.atlas && assets.atlas.enemies) this.drawAtlas(ctx, enemy, input);
        else drawFallbackEnemy(ctx, enemy, input, this.deps.drawPixelShadow);
    }
    drawAtlas(ctx, enemy, input) {
        let { x, y, scale, flash, attackMotion } = input;
        let enemyAtlas = this.deps.assets.atlas.enemies;
        let variantEntry = getBossAssetVariantEntry(enemy, enemyAtlas) || pickBattleEnemyVariant(enemy, enemyAtlas) || {};
        let spriteMotion = resolveEnemySpriteMotion(variantEntry, enemy, input);
        x += spriteMotion.x;
        y += spriteMotion.y;
        let groundY = y + 2;
        const { frame, image } = enemyFrame(enemyAtlas, variantEntry, spriteMotion.entry);
        const dimensions = enemyDimensions(enemy, scale);
        let outline = getEnemyOutlineStyle(enemy, this.deps.outlinePalette);
        this.deps.noteEnemyDrawnHeight(enemy, dimensions.size);
        this.deps.drawPixelShadow(ctx, x, groundY, dimensions.shadowWidth, dimensions.shadowHeight, 0.17);
        ctx.save();
        if (enemy.bossVisualTint != null) ctx.filter = `hue-rotate(${enemy.bossVisualTint}deg) saturate(1.28) brightness(1.08)`;
        this.deps.drawBattleSprite(ctx, image, frame, x, groundY, dimensions.size, {
            smoothing: enemy.bossAssetKey ? 'high' : 'low',
            outlineColor: outline.color,
            outlineThickness: outline.thickness,
            outlineAlpha: outline.alpha,
            flipX: this.deps.shouldMirrorEnemySprite(enemy),
            offsetY: this.deps.bossAttackView.spriteOffsetY(attackMotion, frame),
            flash
        });
        ctx.restore();
    }
}

export function createLegacyEnemyRenderer(deps) {
    const owner = new LegacyEnemyRenderer(deps);
    return Object.freeze({ draw: owner.draw.bind(owner) });
}
