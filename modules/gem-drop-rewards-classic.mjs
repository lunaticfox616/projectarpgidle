import { createGemDropRewards } from './domain/gem-drop-rewards.mjs';
// Retire with the classic consumers. The support table is assembled later by state.js.
const gemDropRewards = createGemDropRewards({
    skills: SKILL_DB, get supports() { return SUPPORT_GEM_DB; }, get forge() { return GEM_CORE_FORGE; }
});
safeExposeGlobals({ gemDropRewards });
