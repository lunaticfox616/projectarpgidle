import { installGemCastExtensions } from './combat/gem-cast-extensions.mjs';
// The scheduler is installed immediately before this slot; grid/appearance ports remain late-bound.
const skillGemCastsV313 = installGemCastExtensions(skillGemCasts, {
    get getGridUnitDistance() { return getGridUnitDistance; },
    get getGridUnitCells() { return getGridUnitCells; },
    get getGridUnitCenter() { return getGridUnitCenter; },
    get rollProjectileExtraShots() { return rollProjectileExtraShots; },
    get random() { return Math.random; },
    get getHeroAppearanceId() { return getHeroAppearanceId; }
});
safeExposeGlobals({ skillGemCastsV313 });
