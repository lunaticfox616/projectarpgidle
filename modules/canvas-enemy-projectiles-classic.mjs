import { createEnemyProjectiles } from './rendering/enemy-projectiles.mjs';

const native = createEnemyProjectiles({
    get getSkillGemVfxImage() { return getSkillGemVfxImage; },
    get clampNumber() { return clampNumber; },
    get clipSkillFootprintTerrain() { return clipSkillFootprintTerrain; },
    get clipSkillFootprint() { return clipSkillFootprint; }
});
const enemyProjectileSprites = {
    draw: native.draw,
    isGround: native.isGround,
    groundArea: native.groundArea,
    drawGround: native.drawGround
};
safeExposeGlobals({ enemyProjectileSprites });
