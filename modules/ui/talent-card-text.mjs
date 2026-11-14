import { TALENT_STAT_LABELS, formatTalentUniqueLabel } from './talent-card-labels.mjs';
import { TALENT_CARD_MAX_LEVEL } from '../data/talent-card-settings.mjs';
import { bloomGetTalentPreciseRule, bloomGetTalentCardDef, bloomMakeTalentComboKey, bloomTalentHiddenList, bloomTalentHiddenVal } from '../domain/talent-card-definitions.mjs';

export function bloomGetTalentStatLabel(env, stat) {
    if (TALENT_STAT_LABELS[stat]) return TALENT_STAT_LABELS[stat];
    if (typeof env.deps.P_STATS !== 'undefined' && env.deps.P_STATS[stat] && env.deps.P_STATS[stat].name) return env.deps.P_STATS[stat].name;
    if (typeof env.deps.getStatName === 'function') return env.deps.getStatName(stat);
    return stat;
}

export function bloomGetTalentRuntimeAppliedText(env, runtime, level) {
    if (!runtime || !runtime.key) return '';
    let levelRatio = level / TALENT_CARD_MAX_LEVEL;
    if (runtime.key === 'mistral') return mistralAppliedText(env, runtime, levelRatio);
    if (runtime.key === 'stoneShield') return stoneShieldAppliedText(env, runtime, levelRatio);
    if (runtime.key === 'moonReturn') return env.deps._t('단일 적에게 원 피해의 {damagePct}% 추가 타격', { damagePct: runtime.damagePct });
    if (runtime.key === 'ailmentWhitelist') return '적에게 점화와 중독만 걸 수 있음';
    if (runtime.key === 'instantWarcry') return runtime.latestEffectOnly
        ? '함성 시전 시간 0초, 마지막 함성 하나의 고유 효과만 유효, 활성 함성 수는 모두 셈'
        : '함성 시전 시간 0초';
    return '';
}

function mistralAppliedText(env, runtime, levelRatio) {
    const aspd = Math.round((Number(runtime.aspdPerStackAtLevel10) || 0) * levelRatio * 100) / 100;
    const move = Math.round((Number(runtime.movePerStackAtLevel10) || 0) * levelRatio * 100) / 100;
    return env.deps._t('중첩마다 공격 속도 +{aspd}%, 이동 속도 +{move}%(최대 {maxStacks}중첩)', { aspd, move, maxStacks: runtime.maxStacks });
}

function stoneShieldAppliedText(env, runtime, levelRatio) {
    const pct = Math.round((Number(runtime.maxHpPctAtLevel10) || 0) * levelRatio * 100) / 100;
    return env.deps._t('막기 시 최대 생명력의 {pct}% 돌 보호막', { pct });
}

export function bloomGetTalentPreciseAppliedParts(env, comboKey, surface, level) {
    let applied = [];
    let rule = bloomGetTalentPreciseRule(env, comboKey);
    Object.entries((rule && rule.stats) || {}).forEach(([stat, levelTenValue]) => {
        let value = Math.round((Number(levelTenValue) || 0) * level / TALENT_CARD_MAX_LEVEL * 100) / 100;
        applied.push({ text: `${bloomGetTalentStatLabel(env, stat)} ${value >= 0 ? '+' : ''}${value}%`, stat });
    });
    ((rule && rule.uniques) || []).forEach(unique => {
        if (!unique || !unique.key) return;
        let params = Object.assign({}, unique.params || {});
        if (unique.perLevelParams) Object.keys(unique.perLevelParams).forEach(key => {
            params[key] = (Number(unique.perLevelParams[key]) || 0) * level;
        });
        applied.push({ text: bloomGetTalentUniqLabel(env, unique.key, params), stat: null });
    });
    let runtimeText = bloomGetTalentRuntimeAppliedText(env, surface.runtime, level);
    if (runtimeText) applied.push({ text: runtimeText, stat: null });
    return applied;
}

export function bloomGetTalentCardEffectParts(env, heroId, classKey, level) {
    let lv = Math.max(1, Math.min(TALENT_CARD_MAX_LEVEL, Math.floor(level || 1)));
    let def = bloomGetTalentCardDef(env, heroId, classKey);
    if (!def) return null;
    let applied = def.surface ? bloomGetTalentPreciseAppliedParts(env, bloomMakeTalentComboKey(heroId, classKey), def.surface, lv) : [];
    let hidden = bloomTalentHiddenList(def).filter(h => h && h.stat)
        .map(h => ({ text: `${bloomGetTalentStatLabel(env, h.stat)} +${bloomTalentHiddenVal(h, lv)}%`, stat: h.stat }));
    return { level: lv, surface: (def.surface && def.surface.desc) || '', applied, hidden };
}

export function bloomGetTalentUniqLabel(env, key, p) {
    return formatTalentUniqueLabel(key, p, env.deps);
}

export function bloomGetTalentCardName(env, heroId, classKey) {
    let heroLabel = (typeof env.deps.getHeroSelectionDef === 'function') ? env.deps.getHeroSelectionDef(heroId).label : heroId;
    let classLabel = (typeof env.deps.CLASS_TEMPLATES !== 'undefined' && env.deps.CLASS_TEMPLATES[classKey]) ? env.deps.CLASS_TEMPLATES[classKey].name : '미전직';
    // 카드 이름 = 재능 + 전직을 융합한 전직명. (부제에 원본 재능/전직을 함께 표기)
    let def = bloomGetTalentCardDef(env, heroId, classKey);
    let bloomName = (def && def.name) ? def.name : `${heroLabel} ${classLabel}`;
    return { heroLabel, classLabel, bloomName };
}
