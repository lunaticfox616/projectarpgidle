import { createBasicSkills } from './domain/basic-skills.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';

const rules = createBasicSkills({
    get SKILL_RUNE_STANCE_BY_CATEGORY() { return SKILL_RUNE_STANCE_BY_CATEGORY; },
    get HANA_WEAPON_COMBOS() { return HANA_WEAPON_COMBOS; },
    get BASIC_SKILL_ROWS() { return BASIC_SKILL_ROWS; },
    get contentProgression() { return contentProgression; },
    get loopMutation() { return loopMutation; },
    get hasSkillGemOwned() { return hasSkillGemOwned; },
    get BASIC_SKILL_ELEMENTS() { return BASIC_SKILL_ELEMENTS; }
});
const effects = { fitStarterWeapon: () => fitActiveSkillToWeapon() };
const basicSkills = Object.freeze({
    ...rules,
    choiceCount: (state = game) => rules.choiceCount(state),
    offer: (state = game, random = Math.random) => rules.offer(state, random),
    grant: (state, classId, ele) => consumeDomainCommands(rules.grant(state, classId, ele), effects),
    autoPick: (state = game) => rules.autoPick(state)
});
safeExposeGlobals({ basicSkills });
