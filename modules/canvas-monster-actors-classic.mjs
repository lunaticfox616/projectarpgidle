import { createMonsterActors } from './rendering/monster-actors.mjs';

const native = createMonsterActors({
    get outlinePalette() { return BATTLE_SPRITE_OUTLINES; },
    get stageAssetRetry() { return stageAssetRetry; },
    get MONSTER_STAGE_KIND() { return MONSTER_STAGE_KIND; },
    get MONSTER_SPRITE_SHEETS() { return typeof MONSTER_SPRITE_SHEETS === 'undefined' ? undefined : MONSTER_SPRITE_SHEETS; },
    get MONSTER_SPRITE_KINDS() { return MONSTER_SPRITE_KINDS; },
    get MONSTER_STAGE_SHEETS() { return MONSTER_STAGE_SHEETS; },
    get WISP_SPRITE_BY_VISUAL() { return typeof WISP_SPRITE_BY_VISUAL === 'undefined' ? undefined : WISP_SPRITE_BY_VISUAL; },
    get battleFx() { return battleFx; },
    warningShare: enemy => bossAttackView.timing.warningShare(enemy),
    get getCombatTime() { return getCombatTime; },
    get clampNumber() { return clampNumber; },
    strikeHoldMs: enemy => bossMoveView.motion.strikeHoldMs(enemy),
    get woodsmanAttackFxElement() { return woodsmanAttackFxElement; },
    get uiDisplay() { return typeof uiDisplay === 'undefined' ? undefined : uiDisplay; },
    get document() { return document; },
    get stageActors() { return stageActors; },
    get stageDots() { return stageDots; },
    get drawBattleSpriteImage() { return drawBattleSpriteImage; },
    get stageRings() { return stageRings; },
    get Image() { return typeof Image === 'undefined' ? undefined : Image; },
    get stageRoster() { return stageRoster.renderer; },
    get stageView() { return stageView; },
    get noteEnemyDrawnHeight() { return noteEnemyDrawnHeight; }
});
const monsterActors = {
    draw: (ctx, enemy, p) => native.draw(typeof game === 'undefined' ? undefined : game, ctx, enemy, p),
    isSheetMonster: native.isSheetMonster,
    clipFrame: native.clipFrame,
    frameAt: native.frameAt,
    attackFrame: native.attackFrame,
    snap: native.snap,
    motion: native.motion,
    renderer: Object.freeze({ draw: native.draw })
};
safeExposeGlobals({ monsterActors });
