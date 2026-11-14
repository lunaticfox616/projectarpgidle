import { createStageElementalSpells } from './stage-skill-spells-elemental.mjs';
import { createStageCelestialSpells } from './stage-skill-spells-celestial.mjs';
import { createStageGlassSpells } from './stage-skill-spells-glass.mjs';

/** Elemental, celestial and glass effects share the supplied player and drawing primitives. */
export function createStageSkillSpells(deps) {
    return Object.freeze({
        ...createStageElementalSpells(deps),
        ...createStageCelestialSpells(deps),
        ...createStageGlassSpells(deps)
    });
}
