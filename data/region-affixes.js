// 세계수 기운(12번 루프 27, 2026-10-08, docs/loop-content-12-plan-20261008.md): 아틀라스 지도에서 떨어진 장비는 그 지역을 기억하고
// (item.dropRegion), 그 장비의 옵션 풀에 그 지역 전용 줄이 더해진다. 줄 수는 그대로(접두 3, 접미 3)라 더 다는 것이 아니라 나올 수
// 있는 것이다(사용자: 줄을 더 다는 것은 밸붕). 줄은 MOD_DB 끝에 regions와 함께 들어간다(무기 대분류 줄과 같은 방식).
// 수치만 높은 줄이 아니라 조건이나 발동이 있는 특색 있는 효과로 지역마다 4줄(사용자: "단순히 더 좋은 옵션이 아니라 특색이 있는
// 다양한 옵션"). 효과는 js/region-affix-effects.js가 전투의 적중, 처치, 막기, 피격 자리에서 계산한다.
const REGION_AFFIX_RULES = Object.freeze({ minLoop: 27 });

// 효과의 고정 수치(줄 값이 아닌 것): 번짐과 파편의 거리(칸, 체비쇼프), 번개가 튀는 거리와 피해, 버프 시간, 카오스 저항 감소의
// 중첩과 시간, 생명력 절반 기준, 방어도 한 단계, 받는 피해 감소의 상한.
const REGION_AFFIX_EFFECTS = Object.freeze({
    spreadRange: 2, chainRange: 3, chainDamagePct: 40, shatterRange: 2, critMoveMs: 2000, blockEmpowerMs: 3000,
    chaosShredStacks: 5, chaosShredSec: 4, lowLifeRatio: 0.5, armorStep: 1000, takenReductionCapPct: 60
});

// 화면의 지역 색(툴팁의 줄과 '세계수 기운' 줄): 어두운 툴팁에서 읽히는 밝은 색. 지도 그림의 색은 data/atlas.js tint.
const REGION_AFFIX_TONES = Object.freeze({ roots: '#c6a3ff', trunk: '#e3b77d', canopy: '#9fe3ff', garden: '#ff9f72', sanctum: '#a9c9ff' });

const REGION_AFFIX_MODS = (() => {
    /** 20 contiguous tier ranges from min (T1 low) to max (T20 high) in whole or 0.01 steps: no overlap and no gap between tiers. */
    function tiers(min, max, decimal) {
        const unit = decimal ? 0.01 : 1, units = Math.round((max - min) / unit) + 1, round = value => Math.round(value * 100) / 100;
        const out = [];
        let low = min;
        for (let tier = 0; tier < 20; tier++) {
            const width = Math.floor(units * (tier + 1) / 20) - Math.floor(units * tier / 20);
            const high = round(low + (width - 1) * unit);
            out.push(Object.freeze([low, high]));
            low = round(high + unit);
        }
        return Object.freeze(out);
    }
    const region = name => (id, type, statName, slots, [min, max, decimal]) => Object.freeze({ id, statId: id, type, statName,
        slots: Object.freeze(slots), regions: Object.freeze([name]), weight: 0.5, affixBalanceVersion: 2, tierValues: tiers(min, max, decimal) });
    const [roots, trunk, canopy, garden, sanctum] = ['roots', 'trunk', 'canopy', 'garden', 'sanctum'].map(region);
    return Object.freeze([
        // 깊은 뿌리(카오스): 중독이 번지고, 저항을 갉고, 중독된 적에게서 생명을 빨고, 넘치는 카오스 저항이 힘이 된다.
        roots('regionPoisonSpread', 'suffix', '중독된 적 처치 시 주변에 중독 번짐(%)', ['무기', '장갑', '반지'], [20, 100]),
        roots('regionChaosShred', 'prefix', '적중 시 적 카오스 저항 감소(%, 5중첩)', ['무기', '목걸이', '장갑'], [0.5, 3, true]),
        roots('regionPoisonedLeech', 'suffix', '중독된 적에게 준 피해 생명력 흡수(%)', ['투구', '갑옷', '허리띠'], [0.3, 2.2, true]),
        roots('regionChaosOvercap', 'prefix', '초과 카오스 저항 1%마다 카오스 피해(%)', ['갑옷', '방패', '목걸이'], [0.5, 2.5, true]),
        // 고목 줄기(물리): 막고 되받아치고, 단단할수록 세고, 피 흘리는 적을 쪼개고, 쓰러질 듯할 때 버틴다.
        trunk('regionBlockEmpower', 'suffix', '막기 후 다음 공격 피해 증가(%)', ['방패', '장갑', '갑옷'], [20, 120]),
        trunk('regionArmorToPhys', 'prefix', '방어도 1000마다 물리 피해(%)', ['갑옷', '방패', '투구'], [0.5, 4, true]),
        trunk('regionBleedingDamage', 'prefix', '출혈 중인 적에게 주는 피해 증가(%)', ['무기', '장갑', '반지'], [14, 140]),
        trunk('regionLowLifeDR', 'suffix', '생명력 절반 이하일 때 받는 피해 감소(%)', ['갑옷', '허리띠', '신발'], [3, 22]),
        // 하늘 가지(번개): 번개가 튀고, 치명타 뒤에 바람을 타고, 감전이 번지고, 감전된 적의 번개 저항을 뚫는다.
        canopy('regionShockChain', 'prefix', '감전된 적 적중 시 번개 튐 확률(%)', ['무기', '장갑', '반지'], [5, 40]),
        canopy('regionCritMove', 'suffix', '치명타 후 2초간 이동 속도(%)', ['신발', '장갑', '목걸이'], [5, 24]),
        canopy('regionShockSpread', 'suffix', '감전된 적 처치 시 주변에 감전 번짐(%)', ['무기', '투구', '반지'], [30, 100]),
        canopy('regionShockedLightPen', 'prefix', '감전된 적의 번개 저항 무시(%)', ['무기', '목걸이', '투구'], [2, 21]),
        // 잊힌 정원(화염): 불씨가 옮겨 붙고, 온전할 때 더 타오르고, 오래 타고, 타는 적을 더 찌른다.
        garden('regionIgniteSpread', 'suffix', '점화된 적 처치 시 주변에 점화 번짐(%)', ['무기', '장갑', '목걸이'], [20, 100]),
        garden('regionFullLifeFire', 'prefix', '생명력이 가득할 때 화염 피해(%)', ['투구', '갑옷', '목걸이'], [14, 140]),
        garden('regionIgniteDuration', 'suffix', '점화 지속 시간(%)', ['무기', '반지', '허리띠'], [10, 80]),
        garden('regionIgnitedDamage', 'prefix', '점화된 적에게 주는 피해 증가(%)', ['무기', '장갑', '반지'], [14, 140]),
        // 잠든 성소(냉기): 얼어붙은 적을 깨뜨리고, 깨진 얼음이 튀고, 무엇으로 쳐도 식히고, 식은 적의 공격이 무디다.
        sanctum('regionFrozenCritDamage', 'prefix', '동결된 적에게 치명타 피해 증가(%)', ['무기', '장갑', '반지'], [20, 160]),
        sanctum('regionShatter', 'suffix', '동결된 적 처치 시 얼음 파편(적 최대 생명력 %)', ['무기', '목걸이', '투구'], [5, 40]),
        sanctum('regionChillOnHit', 'suffix', '적중 시 냉각 확률(%)', ['장갑', '반지', '신발'], [3, 22]),
        sanctum('regionChilledAttackerDR', 'suffix', '냉각된 적에게 받는 피해 감소(%)', ['갑옷', '방패', '허리띠'], [3, 22])
    ]);
})();

if (typeof safeExposeData === 'function') safeExposeData({ REGION_AFFIX_RULES, REGION_AFFIX_EFFECTS, REGION_AFFIX_TONES, REGION_AFFIX_MODS });
