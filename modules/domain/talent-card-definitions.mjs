import { TALENT_CARD_MAX_LEVEL } from '../data/talent-card-settings.mjs';


export function bloomGetTalentBloomClassOfAscendancy(env, ascendId) {
    return Object.keys(env.deps.ASCENDANCIES_BY_PLAYER_CLASS).find(classId => env.deps.ASCENDANCIES_BY_PLAYER_CLASS[classId].includes(ascendId)) || null;
}

export function bloomGetTalentBloomHeroIdForAscendancy(env, ascendId) {
    const classDef = env.deps.PLAYER_CLASS_DEFS[bloomGetTalentBloomClassOfAscendancy(env, ascendId)];
    return classDef && env.deps.HERO_SELECTION_DEFS[classDef.recommendedTalentHeroId] ? classDef.recommendedTalentHeroId : null;
}

export function bloomGetTalentBloomCardKeyForAscendancy(env, ascendId) {
    const heroId = bloomGetTalentBloomHeroIdForAscendancy(env, ascendId);
    const key = heroId ? bloomMakeTalentComboKey(heroId, ascendId) : null;
    return key && env.deps.TALENT_BLOOM_CARD_DEFS[key] ? key : null;
}

export function bloomGetTalentBloomCardKeys(env) {
    return Object.values(env.deps.ASCENDANCIES_BY_PLAYER_CLASS).flat().map((...args) => bloomGetTalentBloomCardKeyForAscendancy(env, ...args)).filter(Boolean);
}

export function bloomGetTalentCardDef(env, heroId, classKey) {
    let key = bloomMakeTalentComboKey(heroId, classKey);
    if (typeof env.deps.TALENT_BLOOM_CARD_DEFS !== 'undefined' && env.deps.TALENT_BLOOM_CARD_DEFS[key]) return env.deps.TALENT_BLOOM_CARD_DEFS[key];
    return null;
}

export function bloomGetTalentCardRuntimeDefinition(env, comboKey) {
    let { heroId, classKey } = bloomParseTalentComboKey(comboKey);
    let def = bloomGetTalentCardDef(env, heroId, classKey);
    return def && def.surface && def.surface.runtime ? def.surface.runtime : null;
}

export function bloomParseTalentComboKey(comboKey) {
    let parts = String(comboKey || '').split('__');
    return { heroId: parts[0] || 'hero1', classKey: parts[1] || 'none' };
}

export function bloomMakeTalentComboKey(heroId, classKey) {
    return `${heroId || 'hero1'}__${classKey || 'none'}`;
}

export function bloomGetTalentPreciseRule(env, comboKey) {
    if (typeof env.deps.TALENT_PRECISE_CARD_RULES === 'undefined') return null;
    return env.deps.TALENT_PRECISE_CARD_RULES[String(comboKey || '')] || null;
}

export function bloomTalentHiddenList(def) {
    if (!def || !def.hidden) return [];
    if (Array.isArray(def.hidden)) return def.hidden;
    return [def.hidden];
}

export function bloomTalentHiddenVal(h, lv) {
    // lv10 = 만렙(10레벨) 수치 → 현재 레벨 비례. (구버전 perLevel 도 호환)
    let base = (h.lv10 !== undefined) ? (Number(h.lv10) || 0) * lv / TALENT_CARD_MAX_LEVEL : (Number(h.perLevel) || 0) * lv;
    return Math.round(base * 100) / 100;
}

export function bloomGetTalentCardStatBonuses(env, heroId, classKey, level) {
    let lv = Math.max(1, Math.min(TALENT_CARD_MAX_LEVEL, Math.floor(level || 1)));
    let def = bloomGetTalentCardDef(env, heroId, classKey);
    if (!def) return [];
    let out = [];
    bloomTalentHiddenList(def).forEach(h => { if (h && h.stat) out.push({ stat: h.stat, val: bloomTalentHiddenVal(h, lv), kind: 'hidden' }); });
    let rule = bloomGetTalentPreciseRule(env, bloomMakeTalentComboKey(heroId, classKey));
    Object.entries((rule && rule.stats) || {}).forEach(([stat, valueAtLevel10]) => {
        out.push({ stat, val: (Number(valueAtLevel10) || 0) * lv / TALENT_CARD_MAX_LEVEL, kind: 'surface' });
    });
    return out;
}

export function bloomGetTalentCardUniqEffects(env, heroId, classKey, level) {
    let lv = Math.max(1, Math.min(TALENT_CARD_MAX_LEVEL, Math.floor(level || 1)));
    let def = bloomGetTalentCardDef(env, heroId, classKey);
    let rule = bloomGetTalentPreciseRule(env, bloomMakeTalentComboKey(heroId, classKey));
    if (!def || !rule || !Array.isArray(rule.uniques)) return [];
    let cardName = def.name || `${heroId} ${classKey}`;
    return rule.uniques.map(u => {
        if (!u || !u.key) return null;
        let params = Object.assign({}, u.params || {});
        if (u.perLevelParams) Object.keys(u.perLevelParams).forEach(p => { params[p] = (u.perLevelParams[p] || 0) * lv; });
        let cardId = bloomMakeTalentComboKey(heroId, classKey);
        return {
            key: u.key,
            params: params,
            itemName: '개화 키스톤: ' + cardName,
            sourceSlot: 'talentKeystone',
            cardId: cardId,
            talentCardId: cardId
        };
    }).filter(Boolean);
}
