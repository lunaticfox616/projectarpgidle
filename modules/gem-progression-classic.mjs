import { normalizeGemRecord as normalizeRecord } from './state/gem-records.mjs';
import { getGemHighLevelGrowth, getGemLevelGrowthSteps, getGemSpellBaseDamage } from './domain/gem-growth.mjs';
import { getRuneLevelReq as levelRequired, getRuneLevelNote as levelNote } from './domain/rune-requirements.mjs';
// Retire with the classic state/skills consumers. Minimal tools may omit unused requirement tables.
const requirements = { get skills() { return SKILL_RUNE_LEVEL_REQ; }, get supports() { return SUPPORT_RUNE_LEVEL_REQ; } };
const normalizeGemRecord = raw => normalizeRecord(raw, GEM_CORE_FORGE);
const getRuneLevelReq = (name, support = false) => levelRequired(name, support, requirements);
const getRuneLevelNote = (name, support = false, state = game) => levelNote(name, support, state, requirements, _t);
safeExposeGlobals({ normalizeGemRecord, getGemHighLevelGrowth, getGemLevelGrowthSteps, getGemSpellBaseDamage, getRuneLevelReq, getRuneLevelNote });
