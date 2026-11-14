import { createSkillSignatureRenderer } from './rendering/skill-signatures.mjs';

const native = createSkillSignatureRenderer({
    get SKILL_GEM_VFX_PROFILES() { return SKILL_GEM_VFX_PROFILES; },
    get SKILL_SIGNATURE_SPRITES() { return SKILL_SIGNATURE_SPRITES; },
    image: key => battleAssets && battleAssets.images ? battleAssets.images[key] : null,
    get projectSkillFootprint() { return projectSkillFootprint; }
});
window.GameModules.skillSignatureRenderer = native;
safeExposeGlobals({
    getSkillGemVfxImage: native.getSkillGemVfxImage,
    drawSkillSpriteFrame: native.drawSkillSpriteFrame,
    drawSkillSignatureTravel: native.drawSkillSignatureTravel,
    drawSkillSignatureImpact: native.drawSkillSignatureImpact
});
