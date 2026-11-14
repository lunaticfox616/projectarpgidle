/** Discard effects tied to the room being left, in their existing drawing order.
 * Visual queues are not combat state and are never serialized into the save. */
export function clearStageRoomEffects(visual, effects) {
    Object.assign(visual, { damageTexts: [], projectiles: [], skillEffects: [] });
    if (visual.enemyHitPulses) visual.enemyHitPulses.clear();
    effects.stageSkillVfx.clear();
    effects.stageSkillSigil.clear();
    if (typeof effects.redrawnSkillFx === 'object') effects.redrawnSkillFx.reset();
    if (typeof effects.attackFxClear === 'function') effects.attackFxClear();
}
