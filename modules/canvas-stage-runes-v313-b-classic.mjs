import { createStageRunesV313B } from './rendering/stage-runes-v313-b.mjs';
import { createStageRunesV325 } from './rendering/stage-runes-v325.mjs';
import { soulShieldView } from './domain/player-soul-shield.mjs';

const native = createStageRunesV313B({
    get stageSkillKit() { return stageSkillKit; },
    get stageSkillStrokes() { return stageSkillStrokes; },
    get STAGE_SKILL_VFX() { return STAGE_SKILL_VFX; },
    get stageSkillVfx() { return stageSkillVfx; },
    get document() { return document; },
    get stageSkillDraws() { return stageSkillDraws; },
    get stageGothicRemakes() { return stageGothicRemakes; }
});
// 2026-11-26 전달본 V3.24 후속, V3.25의 룬(96, 97, 99)도 새 전역 없이 같은 묶음에 둔다.
const later = createStageRunesV325({
    get stageSkillKit() { return stageSkillKit; },
    get stageSkillStrokes() { return stageSkillStrokes; },
    get STAGE_SKILL_VFX() { return STAGE_SKILL_VFX; },
    get stageSkillVfx() { return stageSkillVfx; },
    get document() { return document; },
    get stagePictures() { return stagePictures; },
    soulShieldState: () => soulShieldView(window.GameModules.state.combat?.soulShield, game.playerEnergyShield, getCombatTime())
});
const stageRunesV313B = Object.freeze({
    stormFlight: native.stormFlight,
    stormCharge: native.stormCharge,
    stormBolt: native.stormBolt,
    cauldron: native.cauldron,
    cauldronSplash: native.cauldronSplash,
    bell: native.bell,
    chandelier: native.chandelier,
    chandelierBurn: native.chandelierBurn,
    gavel: native.gavel,
    verdict: native.verdict,
    pact: later.pact,
    soul: later.soul,
    shield: later.shield,
    punch: later.punch,
    warmV325: later.warm
});
safeExposeGlobals({ stageRunesV313B });
