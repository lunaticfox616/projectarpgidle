import { windowAtob } from './browser/window-methods.mjs';
import { createFxRemake } from './rendering/fx-remake.mjs';

const native = createFxRemake({
    get parseInt() { return parseInt; },
    get HANA_SKILL_FX() { return typeof HANA_SKILL_FX === 'undefined' ? undefined : HANA_SKILL_FX; },
    get atob() { return typeof atob === 'undefined' ? undefined : windowAtob; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get battleCanvasBox() { return window.GameModules.battlefieldPresentation?.canvasBox; },
    get PROJECTILE_SPRITE_SCALE() { return PROJECTILE_SPRITE_SCALE; },
    get stagePictures() { return stagePictures; }
});
const fxRemake = Object.freeze({
    begin: (target, projection) => native.begin((typeof game === 'undefined' ? undefined : game), target, projection),
    end: native.end,
    discard: native.discard,
    isOpen: native.isOpen,
    projection: native.projection,
    isEnabled: () => native.isEnabled((typeof game === 'undefined' ? undefined : game)),
    capture: native.capture,
    drawDots: native.drawDots,
    ring: native.ring,
    projectile: native.projectile,
    hasProjectile: (id) => native.hasProjectile((typeof game === 'undefined' ? undefined : game), id),
    brass: native.brass,
    prepareSheet: (image) => native.prepareSheet((typeof game === 'undefined' ? undefined : game), image),
    ELEMENT_RAMPS: native.ELEMENT_RAMPS
});
safeExposeGlobals({ fxRemake });
