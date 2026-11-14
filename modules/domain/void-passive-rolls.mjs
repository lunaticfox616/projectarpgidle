import { voidRuleGetOwnedTranscendentVoidPassiveIds } from './void-passive-state.mjs';
import { PLUTO_VOID_THRESHOLDS } from '../data/transcendent-void-passives.mjs';

/** 명왕성: 1개 80% · 2개 16% · 3개 3.2% · 4개 0.64% · 5개 0.16%(1/625). 옛 고유 별쐐기의 공허 생성 확률 그대로. */
export function voidRuleRollPlutoVoidCount(thresholds = PLUTO_VOID_THRESHOLDS) {
    const roll = Math.random();
    return thresholds.filter(edge => roll >= edge).length + 1;
}

export function voidRuleRollVoidPassiveOption(env, existingStats) {
    let used = new Set((existingStats || []).map(line => line && line.id));
    let pool = env.deps.VOID_PASSIVE_OPTION_POOL.filter(opt => !used.has(opt.id));
    if (!pool.length) return null;
    let pick = env.deps.rndChoice(pool);
    const step = pick.step || 1, slots = Math.round((pick.max - pick.min) / step);
    return { id: pick.id, val: Number((pick.min + Math.floor(Math.random() * (slots + 1)) * step).toFixed(2)) };
}

/** 마법의 새싹 하나: 옵션을 지우고 1~2줄을 다시 굴린다(제작 창의 한 번 쓰기와 연속 사용이 같이 쓴다). 재화는 부르는 쪽이 줄인다. */
export function voidRuleRollMagicBudOnVoid(env, entry) {
    const nextStats = [], optionCount = 1 + Math.floor(Math.random() * 2);
    for (let index = 0; index < optionCount; index++) {
        const next = voidRuleRollVoidPassiveOption(env, nextStats);
        if (next) nextStats.push(next);
    }
    entry.stats = nextStats;
    entry.rarity = nextStats.length > 0 ? 'magic' : 'normal';
}

export function voidRuleRollTranscendentVoidPassive(env, owner, nodeId) {
    let owned = voidRuleGetOwnedTranscendentVoidPassiveIds(env, owner, nodeId);
    let pool = env.deps.TRANSCENDENT_VOID_PASSIVE_DB.filter(def => !owned.has(def.id));
    if (!pool.length) return null;
    return voidRuleRollTranscendentDef(env.deps.rndChoice(pool));
}

/** 그 초월을 새로 얻을 때의 값(고정, 굴림 함수, 아니면 범위 안에서 굴림). */
export function voidRuleRollTranscendentDef(def) {
    let roll = (min, max, step) => {
        if (!Number.isFinite(Number(min)) || !Number.isFinite(Number(max))) return 0;
        let s = Number.isFinite(Number(step)) ? Number(step) : 1;
        let slots = Math.max(0, Math.floor((Number(max) - Number(min)) / s + 0.00001));
        let value = Number(min) + Math.floor(Math.random() * (slots + 1)) * s;
        return s < 1 ? Number(value.toFixed(2)) : Math.floor(value);
    };
    let value = def.fixed || (def.rollThresholds ? voidRuleRollPlutoVoidCount(def.rollThresholds) : roll(def.min, def.max));
    return { id: def.id, value, value2: roll(def.min2, def.max2, def.step2) };
}

export function voidRuleRerollTranscendentVoidPassive(env, entry) {
    let def = env.deps.TRANSCENDENT_VOID_PASSIVE_DB.find(row => row.id === (entry && entry.id));
    if (!def || def.fixed || !Number.isFinite(Number(def.min))) return entry;
    let roll = (min, max, step) => {
        let s = Number.isFinite(Number(step)) ? Number(step) : 1;
        let slots = Math.max(0, Math.floor((Number(max) - Number(min)) / s + 0.00001));
        let value = Number(min) + Math.floor(Math.random() * (slots + 1)) * s;
        return s < 1 ? Number(value.toFixed(2)) : Math.floor(value);
    };
    return { id: def.id, value: def.rollThresholds ? voidRuleRollPlutoVoidCount(def.rollThresholds) : roll(def.min, def.max), value2: roll(def.min2, def.max2, def.step2) };
}
