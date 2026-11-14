// 부적(2026-09-30 개편): 그루터기 함의 세 번째 계열(색 없는 한 칸 조각). 판 · 보관함 · 성장(깨어남) · 루프 회귀는
// stump-box.js가, 부적의 줄 · 굴림 · 봉인 풀기 · 밀랍 · 표식 방향은 여기서 맡는다. 이웃 효과 합산은 talisman-effects.js,
// 전투 적용은 talisman-combat.js, 화면은 stump-talisman-ui.js.
// 부적 필드(그루터기 아이템에 함께 저장): { name, rarity: 'magic'|'rare'|'unique', lines: [{ kind: 'stat'|'condition', id, value, wax? }],
//   uniqueId?, special?, uniqueEffect?, moment?, dir?(0 위 · 1 오른쪽 · 2 아래 · 3 왼쪽, 방향이 필요한 고유만), waxed? }.
import { talismanSigned, talismanRound1, talismanNormalizeTalisman, talismanRollNormal, talismanRollUnique, talismanRoll, talismanRerollStatLine, talismanRollOtherUnique, talismanFromCosmos, talismanUnseal, talismanExchange, talismanWax, talismanWaxPreview, talismanTurn, talismanDescribeLine, talismanWildDropsOpen, talismanRollWild, talismanRollWildDrop, talismanReceiveWild, talismanDropWild, talismanConditionDelta, talismanDescribeDelta } from './talismans-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
function createTalismanFormats(env) {
    return Object.freeze({
    pct: (label, v) => `${label} ${talismanSigned(v)}%`, fraction: (label, v) => `${label} ${talismanSigned(v * 100)}%`, count: (label, v) => `${label} +${v}`,
    flag: label => label, seconds: (label, v) => env.deps._t('{label} {v}초', { label, v: talismanSigned(v) }), minus: (label, v) => `${label} −${talismanRound1(v)}`,
    mulUp: (label, m) => `${label} +${talismanRound1((m - 1) * 100)}%`, mulDown: (label, m) => `${label} −${talismanRound1((1 - m) * 100)}%`,
    fractionUp: (label, v) => `${label} +${talismanRound1(v * 100)}%p`, fractionDown: (label, v) => `${label} −${talismanRound1(v * 100)}%`
});
}

function createTalismanEnvironment(deps) {
    const env = { deps };
    env.statPool = new Map(env.deps.TALISMAN_STAT_POOL.map(def => [def.id, def]));
    env.conditionPool = new Map(env.deps.TALISMAN_CONDITION_POOL.map(def => [def.id, def]));
    env.uniquePool = new Map([...env.deps.TALISMAN_UNIQUE_DB, ...env.deps.TALISMAN_WILD_UNIQUE_DB].map(def => [def.id, def]));
    env.wildIds = new Set(env.deps.TALISMAN_WILD_UNIQUE_DB.map(def => def.id));
    env.RARITIES = ['magic', 'rare', 'unique'];
    env.SPECIALS = new Set(['gravity', 'simpleCopy', 'temperance', 'pride', 'moment', 'elementFocus',
    'cosmosChoice', 'cosmosLightningVariance', 'cosmosRepulsion', ...env.deps.TALISMAN_WILD_UNIQUE_DB.map(def => def.special).filter(Boolean)]);
    env.DIRECTIONAL = new Set(['simpleCopy', 'cosmosChoice']);
    env.DIRECTION_NAMES = ['위', '오른쪽', '아래', '왼쪽'];
    env.HEX_FORMS = Object.freeze({ mulUp: v => 1 + v / 100, mulDown: v => 1 - v / 100, flat: v => v });
    env.EFFECT_FORMATS = createTalismanFormats(env);
    return env;
}

export function createTalismans(deps) {
    const env = createTalismanEnvironment(deps);
    return Object.freeze({
        normalizeTalisman: (...args) => talismanNormalizeTalisman(env, ...args),
        rollNormal: (...args) => talismanRollNormal(env, ...args),
        rollUnique: (...args) => talismanRollUnique(env, ...args),
        roll: (...args) => talismanRoll(env, ...args),
        rerollStatLine: (...args) => talismanRerollStatLine(env, ...args),
        rollOtherUnique: (...args) => talismanRollOtherUnique(env, ...args),
        fromCosmos: (...args) => talismanFromCosmos(env, ...args),
        unseal: (...args) => talismanUnseal(env, ...args),
        exchange: (...args) => talismanExchange(env, ...args),
        wax: (...args) => talismanWax(env, ...args),
        waxPreview: (...args) => talismanWaxPreview(env, ...args),
        turn: (...args) => talismanTurn(env, ...args),
        describeLine: (...args) => talismanDescribeLine(env, ...args),
        wildDropsOpen: (...args) => talismanWildDropsOpen(env, ...args),
        rollWild: (...args) => talismanRollWild(env, ...args),
        rollWildDrop: (...args) => talismanRollWildDrop(env, ...args),
        receiveWild: (...args) => talismanReceiveWild(env, ...args),
        dropWild: (...args) => talismanDropWild(env, ...args),
        isWild: id => env.wildIds.has(id),
        conditionDelta: (...args) => talismanConditionDelta(env, ...args),
        describeDelta: (...args) => talismanDescribeDelta(env, ...args),
        isDirectional: item => !!item && env.DIRECTIONAL.has(item.special),
        directionName: dir => env.DIRECTION_NAMES[dir] || env.DIRECTION_NAMES[1],
        conditionDef: id => env.conditionPool.get(id),
        uniqueDef: id => env.uniquePool.get(id),
        statDef: id => env.statPool.get(id)
    });
}
