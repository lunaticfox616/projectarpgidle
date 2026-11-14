import { createWispActors } from './rendering/wisp-actors.mjs';
import { drawActorShadow } from './rendering/battle-sprite-alpha.mjs';

const native = createWispActors({
    get WISP_SPRITE_CLIPS() { return WISP_SPRITE_CLIPS; },
    get stageAssetRetry() { return stageAssetRetry; },
    get WISP_SPRITE_SHEETS() { return WISP_SPRITE_SHEETS; },
    get WISP_SPRITE_BY_VISUAL() { return WISP_SPRITE_BY_VISUAL; },
    get WISP_SPRITE_BY_ELEMENT() { return WISP_SPRITE_BY_ELEMENT; },
    get battleFx() { return battleFx; },
    get uiDisplay() { return typeof uiDisplay === 'undefined' ? undefined : uiDisplay; },
    get Image() { return typeof Image === 'undefined' ? undefined : Image; },
    get monsterActors() { return monsterActors.renderer; },
    get WISP_SPRITE_FRAME() { return WISP_SPRITE_FRAME; },
    drawPixelShadow: drawActorShadow,
    get drawBattleSpriteImage() { return drawBattleSpriteImage; }
});
const wispActors = {
    draw: (ctx, enemy, p) => native.draw(typeof game === 'undefined' ? undefined : game, ctx, enemy, p),
    barLift: native.barLift,
    clipFrame: native.clipFrame,
    frameAt: native.frameAt
};
safeExposeGlobals({ wispActors });
