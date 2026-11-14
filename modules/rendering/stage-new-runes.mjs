import { createStageSkillRaw } from './stage-skill-raw.mjs';
import { createStageNewRuneEffects } from './stage-new-rune-effects.mjs';

/** One cache owner; each action keeps its own playback state. */
export function createStageNewRunes(deps) {
    const shared = createStageSkillRaw(deps);
    const part0 = createStageNewRuneEffects(deps, shared);
    return Object.freeze({
        raw: shared.drawRaw.bind(shared),
        tint: shared.tintRaw.bind(shared),
        homingFly: part0.homingFly.bind(part0),
        petrifyBurst: part0.petrifyBurst.bind(part0),
        timeField: part0.timeField.bind(part0),
        fieldBusy: part0.fieldBusy,
        timeBlades: part0.timeBlades.bind(part0),
        timeBounce: part0.timeBounce.bind(part0),
        glazeOf: part0.glazeOf.bind(part0),
        heldAt: part0.heldAt.bind(part0)
    });
}
