import { createStageRoster } from './rendering/stage-roster.mjs';

const native = createStageRoster({
    get outlinePalette() { return BATTLE_SPRITE_OUTLINES; },
    get MONSTER_STAGE_ROSTER() { return typeof MONSTER_STAGE_ROSTER === 'undefined' ? undefined : MONSTER_STAGE_ROSTER; },
    get stagePictures() { return stagePictures; },
    get performance() { return performance; },
    get OUTSIDE_CHAOS_ZONE_ID() { return OUTSIDE_CHAOS_ZONE_ID; },
    get WOODSMAN_BATTLE() { return WOODSMAN_BATTLE; },
    get monsterMotion() { return monsterActors.motion; },
    get stageStride() { return stageStride; },
    get uiDisplay() { return uiDisplay; },
    get stageNewRunes() { return stageNewRunes; },
    get BEYOND_BOUNDARY_UNLOCK_BOSS_ID() { return BEYOND_BOUNDARY_UNLOCK_BOSS_ID; },
    get document() { return document; },
    get stageActors() { return stageActors; },
    get getBossDrawScale() { return getBossDrawScale; },
    get getStageLookScale() { return getStageLookScale; },
    get STAGE_INKED_LOOKS() { return STAGE_INKED_LOOKS; },
    get stageRings() { return stageRings; },
    get combatIncidents() { return typeof combatIncidents === 'undefined' ? undefined : combatIncidents; },
    get noteEnemyDrawnHeight() { return noteEnemyDrawnHeight; },
    get stageView() { return stageView; },
    get stageDots() { return stageDots; },
    get i18n() { return i18n; }
});
const stageRoster = Object.freeze({
    draw: (ctx, enemy, p) => native.draw((typeof game === 'undefined' ? undefined : game), ctx, enemy, p),
    drawDeath: (ctx, enemy, p) => native.drawDeath((typeof game === 'undefined' ? undefined : game), ctx, enemy, p),
    drawClip: (ctx, enemy, p, art) => native.drawClip((typeof game === 'undefined' ? undefined : game), ctx, enemy, p, art),
    looks: native.looks,
    keepFor: (enemies) => native.keepFor((typeof game === 'undefined' ? undefined : game), enemies),
    placementOf: native.placementOf,
    headOrigin: native.headOrigin,
    bodySize: (enemy, tile) => native.bodySize((typeof game === 'undefined' ? undefined : game), enemy, tile),
    renderer: Object.freeze({ draw: native.draw, drawClip: native.drawClip }),
    preparation: Object.freeze({ keepFor: native.keepFor })
});
safeExposeGlobals({ stageRoster });
