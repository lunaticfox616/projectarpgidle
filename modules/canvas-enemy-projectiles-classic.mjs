import { createEnemyProjectiles } from './rendering/enemy-projectiles.mjs';

const native = createEnemyProjectiles({
    get getSkillGemVfxImage() { return getSkillGemVfxImage; },
    get getCombatTime() { return getCombatTime; },
    get clampNumber() { return clampNumber; },
    chorusMouth: (enemy, projection) => stageRoster.chorusMouth(enemy, projection),
    get clipSkillFootprintTerrain() { return clipSkillFootprintTerrain; },
    get clipSkillFootprint() { return clipSkillFootprint; }
});
const enemyProjectileSprites = {
    draw: native.draw,
    isGround: native.isGround,
    groundArea: native.groundArea,
    drawGround: native.drawGround,
    warningComet: native.warningComet,
    isChorusShot: native.isChorusShot,
    chorusContact: native.chorusContact
};
safeExposeGlobals({ enemyProjectileSprites });
