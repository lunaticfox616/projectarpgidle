import { createCombatFeedbackRenderer } from './rendering/combat-feedback.mjs';

const native = createCombatFeedbackRenderer({
    get ACT_EXPLORATION_ALERT() { return ACT_EXPLORATION_ALERT; },
    get SKILL_DB() { return SKILL_DB; },
    get SKILL_RUNE_FAMILY() { return SKILL_RUNE_FAMILY; },
    get _t() { return _t; },
    get addBattleFx() { return addBattleFx; },
    events: window,
    get battlePixelFont() { return battlePixelFont; },
    get battleVisualState() { return battleVisualState; },
    hidden: () => document.hidden,
    get drawCrispCanvasText() { return drawCrispCanvasText; },
    background: () => window.GameModules.state.game.isBackgroundCalculation,
    hitEmphasis: () => window.GameModules.state.game.settings?.hitEmphasis,
    get getEquippedWeaponStance() { return getEquippedWeaponStance; },
    get playUiFeedbackSound() { return playUiFeedbackSound; },
    get stageSkillRules() { return stageSkillRules; },
    get stripDecorativeEmoji() { return stripDecorativeEmoji; },
    reducedEffects: () => uiDisplay.reducedEffects()
});
worldTreeSkillFx.feedback = native;
