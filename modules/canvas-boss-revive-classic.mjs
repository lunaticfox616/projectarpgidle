import { createBossRevive } from './rendering/boss-revive.mjs';

const native = createBossRevive({
    get STAGE_BOSS_REVIVAL() { return STAGE_BOSS_REVIVAL; },
    get i18n() { return i18n; },
    get drawCrispCanvasText() { return drawCrispCanvasText; }
});
const bossRevive = Object.freeze({
    draw: native.draw
});
safeExposeGlobals({ bossRevive });
