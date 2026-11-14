import { createStageRuneRemakes } from './rendering/stage-rune-remakes.mjs';

const native = createStageRuneRemakes({
    get stageSkillKit() { return stageSkillKit; },
    get stageNewRunes() { return stageNewRunes; },
    get stageSkillVfx() { return stageSkillVfx; },
    get stageActors() { return stageActors; },
    get stageGothicRemakes() { return stageGothicRemakes; },
    get getHeroAppearanceId() { return getHeroAppearanceId; },
    get STAGE_SKILL_VFX() { return STAGE_SKILL_VFX; },
    get getStageHeroStance() { return getStageHeroStance; },
    get hasGridCell() { return hasGridCell; },
    get getGridUnitDistance() { return getGridUnitDistance; }
});
const stageRuneRemakes = Object.freeze({
    cloudBurst: native.cloudBurst,
    mistStart: native.mistStart,
    slam: native.slam,
    hasRaw: native.hasRaw,
    meteorFlight: native.meteorFlight,
    meteorImpact: native.meteorImpact,
    warlockHit: native.warlockHit,
    warlockWindup: (kind, fx) => native.warlockWindup(game, kind, fx),
    clock: native.clock
});
safeExposeGlobals({ stageRuneRemakes });
