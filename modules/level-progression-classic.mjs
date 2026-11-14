// Remove this boundary/build entry when all classic consumers import the module.
import { createLevelProgression } from './level-progression.mjs';
import { playerExperienceRequired, gemExperienceRequired, gainGemExperience as gainExperience } from './domain/experience.mjs';
const levelProgression = createLevelProgression(LEVEL_PROGRESSION, () => BASE_ITEM_DB, UNIQUE_EQUIPMENT_RULES);
const getExpReq = level => playerExperienceRequired(level, LEVEL_PROGRESSION);
const getGemReqExp = level => gemExperienceRequired(level, LEVEL_PROGRESSION);
const gainGemExperience = (gem, amount) => gainExperience(gem, amount, LEVEL_PROGRESSION);
safeExposeGlobals({ levelProgression, getExpReq, getGemReqExp, gainGemExperience });
