// 장비 툴팁의 표시 규칙(2026-10-03): 추가 옵션의 순서와 방어도, 회피, 에너지 보호막 수치. 게임 툴팁(js/ui.js showItemTooltip)과
// 공개 프로필의 장비 카드(js/social.js)가 같은 규칙을 쓰도록 한 곳에 둔다. DOM 없음.
import { itemTooltipStatOrder, itemTooltipCompareStats, itemTooltipDefenseView } from './item-tooltip-calculations.mjs';

const STAT_GROUPS = Object.freeze([
    [['energyshield', 'energyshieldpct', 'energyshieldregen', 'es'], ['energyshield']],
    [['armor', 'armorpct', 'dr'], ['armor']],
    [['evasion', 'evasionpct', 'deflectchance', 'deflectdamagereduce'], ['evasion', 'deflect']],
    [['flathp', 'pcthp', 'regen', 'regenflat'], ['hp', 'life']],
    [['resf', 'resc', 'resl', 'resall', 'reschaos'], ['res']],
    [['firepctdmg', 'coldpctdmg', 'lightpctdmg', 'chaospctdmg', 'dotpctdmg', 'pctdmg'], ['dmg', 'dot']],
    [['crit', 'critdmg'], ['crit']],
    [['aspd', 'move'], ['speed', 'move']]
]);
const DEFENSE_IDS = Object.freeze(['armor', 'evasion', 'energyShield']);
const DEFENSE_PCT = Object.freeze({ armorPct: 'armor', evasionPct: 'evasion', energyShieldPct: 'energyShield' });

/** Shared immutable display ordering; calculations only read the supplied item. */
export function createItemTooltipRules(deps) {
    const env = { deps, STAT_GROUPS, DEFENSE_IDS, DEFENSE_PCT };
    return Object.freeze({ statOrder: (...args) => itemTooltipStatOrder(env, ...args), compareStats: (...args) => itemTooltipCompareStats(env, ...args), defenseView: (...args) => itemTooltipDefenseView(env, ...args), DEFENSE_IDS: env.DEFENSE_IDS });
}
