/**
 * 영향 장비와 뒤바뀐 고유(data/item-influences.js). 화면은 js/item-influences-ui.js.
 * item.influence: 'guardian' | 'blight', 그 장비의 추가 옵션 풀에 전용 줄이 더해진다(js/item-rolls.js isModForOrigin).
 * baseStats[i].altar: 'red' | 'blue', 제단이 바꾼 베이스 옵션 줄. replaced는 그 자리에 있던 줄.
 * item.swappedUnique: 기억 던전에서 줄 하나가 바뀐 고유. 바뀐 줄은 stats[i].swapped와 replaced.
 */
import { influenceInfluenceKeys, influenceCanTake, influenceIsModForInfluence, influenceLineInfluence, influenceIsAltarCurrency, influenceAltarOfCurrency, influenceAltarUseReason, influenceApplyAltar, influenceUseAltarCurrency, influenceBossInfluence, influenceStampInfluence, influenceOnDrop, influenceNormalizeInfluences, influenceSwapChance, influenceSwapUnique } from './item-influences-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createItemInfluences(deps) {
    const env = { deps };
    env.ALTARS = Object.freeze(Object.keys(env.deps.ALTAR_INFLUENCE_LINES));
    env.EXPLICIT = Object.freeze(Object.keys(env.deps.ITEM_INFLUENCES).filter(key => env.deps.ITEM_INFLUENCES[key].line === 'explicit'));
    env.CURRENCY_ALTAR = Object.freeze(Object.fromEntries(env.ALTARS.map(key => [env.deps.ITEM_INFLUENCES[key].currency, key])));
    env.ROOM_ALTAR = Object.freeze(Object.fromEntries(env.ALTARS.map(key => [env.deps.ITEM_INFLUENCES[key].room, key])));
    env.MOD_INFLUENCE = new Map(env.deps.INFLUENCE_AFFIX_MODS.map(mod => [mod.id, mod.influences[0]]));
    env.DEFENSE = new Set(['armor', 'evasion', 'energyShield']);
    env.SPECIFIC_TAGS = new Set(['fire', 'cold', 'light', 'chaos', 'physical', 'crit', 'speed', 'dot', 'projectile', 'melee', 'aoe',
    'summon', 'life', 'defense', 'resistance', 'recovery', 'penetration', 'attribute']);
    return Object.freeze({
        influenceKeys: (...args) => influenceInfluenceKeys(env, ...args),
        canTake: (...args) => influenceCanTake(env, ...args),
        isModForInfluence: influenceIsModForInfluence,
        lineInfluence: (...args) => influenceLineInfluence(env, ...args),
        isAltarCurrency: (...args) => influenceIsAltarCurrency(env, ...args),
        altarOfCurrency: (...args) => influenceAltarOfCurrency(env, ...args),
        altarUseReason: (...args) => influenceAltarUseReason(env, ...args),
        applyAltar: (...args) => influenceApplyAltar(env, ...args),
        useAltarCurrency: (...args) => influenceUseAltarCurrency(env, ...args),
        bossInfluence: influenceBossInfluence,
        stampInfluence: (...args) => influenceStampInfluence(env, ...args),
        onDrop: (...args) => influenceOnDrop(env, ...args),
        normalizeInfluences: (...args) => influenceNormalizeInfluences(env, ...args),
        swapChance: (...args) => influenceSwapChance(env, ...args),
        swapUnique: (...args) => influenceSwapUnique(env, ...args)
    });
}
