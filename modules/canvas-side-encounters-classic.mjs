import { createSideEncounterRenderer } from './rendering/side-encounters.mjs';

const native = createSideEncounterRenderer({
    get GRAND_BREACH_ENCOUNTER() { return GRAND_BREACH_ENCOUNTER; },
    get bossAttackView() { return bossAttackView; },
    get image() { return getSkillGemVfxImage; },
    get drawSkillFootprintGround() { return drawSkillFootprintGround; },
    get enemyAttackRules() { return enemyAttackRules; },
    currentGrandRun: () => {
        const owner = window.GameModules.state.game;
        return owner.currentZoneId === 'grand_breach_run' ? owner.voidRift && owner.voidRift.grandRun : null;
    },
    get getCombatTime() { return getCombatTime; },
    isMeteorZone: () => getZone(window.GameModules.state.game.currentZoneId).type === 'meteor',
    get projectSkillFootprint() { return projectSkillFootprint; }
});
safeExposeGlobals({ sideEncounterCanvas: native });
