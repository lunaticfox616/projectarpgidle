// 장비 툴팁의 표시 규칙(2026-10-03): 추가 옵션의 순서와 방어도, 회피, 에너지 보호막 수치. 게임 툴팁(js/ui.js showItemTooltip)과
// 공개 프로필의 장비 카드(js/social.js)가 같은 규칙을 쓰도록 한 곳에 둔다. DOM 없음.
const itemTooltipRules = (() => {
    // 추가 옵션 묶음, 이 순서로 보인다: 에너지 보호막, 방어도, 회피, 생명력, 저항, 피해, 치명타, 속도. 그 밖은 맨 뒤.
    // 옵션 이름(소문자)이 목록에 있거나 조각을 품으면 그 묶음이다.
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

    function statOrder(statId) {
        const key = String(statId || '').toLowerCase();
        const index = STAT_GROUPS.findIndex(([names, parts]) => names.includes(key) || parts.some(part => key.includes(part)));
        return index < 0 ? 99 : index + 1;
    }

    /** Sort comparator for explicit affixes: group order, then stat id. */
    function compareStats(a, b) {
        const aKey = a && (a.id || a.stat), bKey = b && (b.id || b.stat);
        return statOrder(aKey) - statOrder(bKey) || String(aKey || '').localeCompare(String(bKey || ''));
    }

    function defenseTable() {
        return { armor: 0, evasion: 0, energyShield: 0 };
    }

    // 잠식 특수 옵션과 복합 옵션도 실제 전투 계산과 같은 방식으로 베이스 방어 수치에 반영한다.
    function defenseSources(item) {
        const lines = (item.stats || []).concat(item.chaosInfusion ? [item.chaosInfusion] : [], getImmutableItemSpecialStats(item));
        return lines.filter(Boolean).flatMap(stat => [stat].concat(Array.isArray(stat.extraStats) ? stat.extraStats : [])).filter(Boolean);
    }

    /** Base and final armour, evasion and energy shield: (base + flat) × (1 + %/100), floored. The base counts a unique's
     * 기본 옵션 배율 (getUniqueImplicitMultiplier) like the stat calculation. */
    function defenseView(item) {
        const base = defenseTable(), flat = defenseTable(), pct = defenseTable(), implicit = getUniqueImplicitMultiplier(item);
        (item.baseStats || []).forEach(stat => { if (stat && Object.hasOwn(base, stat.id)) base[stat.id] += Number(stat.val || 0) * implicit; });
        defenseSources(item).forEach(stat => {
            if (Object.hasOwn(flat, stat.id)) flat[stat.id] += Number(stat.val || 0);
            if (Object.hasOwn(DEFENSE_PCT, stat.id)) pct[DEFENSE_PCT[stat.id]] += Number(stat.val || 0);
        });
        const view = Object.fromEntries(DEFENSE_IDS.map(id => [id, Math.floor((base[id] + flat[id]) * (1 + pct[id] / 100))]));
        return { ...view, base };
    }

    return Object.freeze({ statOrder, compareStats, defenseView, DEFENSE_IDS });
})();
safeExposeGlobals({ itemTooltipRules });
