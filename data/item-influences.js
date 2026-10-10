// 영향 장비와 뒤바뀐 고유(2026-10-10 사용자 /goal: "부위별 좀 더 다양한 옵션이 붙으면 ... 지역 수호자랑 마름 사도 영향을 받은 아이템
// 들도 ... 테두리 및 툴팁 박스 테두리에 영향을 받았다는 것을 알 수 있게 ... 수호자랑 마름 사도는 베이스 옵션 말고 추가 옵션들 중에 전용
// 옵션 ... 기억 던전에도 뒤바뀐 고유 ... 바뀐 옵션은 알기 쉽게").
// 붉은 제단(검은 태양의 대사제)과 푸른 제단(세계수를 갉는 자)의 영향은 베이스 옵션 한 줄을 그 제단의 줄로 바꾼다: 제작실에서 성화 잉걸,
// 허기의 즙을 쓰거나, 제단 방의 몬스터가 떨어뜨린 장비가 가끔 달고 나온다. 줄은 부위마다 다르다.
// 지역 수호자와 마름 사도의 영향은 그 장비의 추가 옵션 풀에 전용 줄을 더한다(세계수 기운과 같은 방식, data/region-affixes.js):
// 그 보스의 보상 장비는 모두, 그 싸움터의 장비는 가끔 영향을 띠고 떨어질 때 전용 줄 하나를 단다. 줄 수는 그대로다(사용자: 줄을
// 더 다는 것은 밸붕). 규칙은 js/item-influences.js, 화면은 js/item-influences-ui.js와 css/item-influences.css.
// name: 줄 끝 표식, label: 장비 이름 아래 한 줄(2026-10-10 사용자: "태양 아이템, 허기 아이템, 수호자 아이템, 마름 아이템, 뒤바뀐 아이템").
// stack: 같은 stack끼리만 한 장비에 함께 받는다(태양 + 허기). stack이 없는 영향은 하나만 받고 다른 영향과 함께 받지 못한다
// (사용자 규칙, 새로 생기는 영향도 이 규칙을 따른다). 함께 받으면 테두리는 왼쪽이 첫째, 오른쪽이 둘째 색(js/item-influences-ui.js).
// found: 어디서 얻는지 한 줄. feeds: 그 콘텐츠가 바칠 재료를 대는 최종 보스(아틀라스 최종 보기의 그 카드에 found 줄이 붙는다,
// 수호자는 수호자 노드에도). 툴팁에서 설명을 뺐으니 처음 보는 사람이 찾아갈 곳이다.
const ITEM_INFLUENCES = Object.freeze({
    red: Object.freeze({ name: '태양', label: '태양 아이템', source: '검은 태양의 대사제', tone: '#ff7a45', line: 'base', stack: 'altar', currency: 'altarEmber', room: 'redAltar',
        found: '붉은 제단 장비, 성화 잉걸로 새김', feeds: 'apex_archbishop' }),
    blue: Object.freeze({ name: '허기', label: '허기 아이템', source: '세계수를 갉는 자', tone: '#3fd6c6', line: 'base', stack: 'altar', currency: 'altarIchor', room: 'blueAltar',
        found: '푸른 제단 장비, 허기의 즙으로 새김', feeds: 'apex_devourer' }),
    guardian: Object.freeze({ name: '수호자', label: '수호자 아이템', source: '지역 수호자', tone: '#dfe9f6', line: 'explicit',
        found: '지역 수호자 보상 장비', feeds: 'apex_gardener' }),
    blight: Object.freeze({ name: '마름', label: '마름 아이템', source: '마름 사도', tone: '#a6d44a', line: 'explicit',
        found: '사도 보상 장비', feeds: 'apex_compost' })
});

const ITEM_INFLUENCE_RULES = Object.freeze({
    // 제단 방의 몬스터가 떨어뜨린 장비(제단 줄이 있는 부위)가 그 제단의 영향 줄을 달고 나올 확률.
    altarDropChance: 0.2,
    // 수호자 투기장과 사도가 지키는 지도의 몬스터 장비가 영향을 띨 확률. 수호자와 사도의 보상 장비는 모두 띤다.
    fieldChance: 0.08,
    // 영향 줄의 티어: 장비의 추가 옵션 티어 상한(affixTierCap)에서 이만큼 아래까지.
    tierSpread: 5
});

const { ALTAR_INFLUENCE_LINES, INFLUENCE_AFFIX_MODS } = (() => {
    /** 20 contiguous tier ranges from min (T1 low) to max (T20 high): whole steps, or 0.01 steps when asked or when the range is too
     * narrow for 20 whole steps. No overlap and no gap between tiers (the same shape as data/region-affixes.js). */
    const itemInfluenceTiers = (min, max, decimal) => {
        const fine = decimal || Math.round(max - min) + 1 < 20, unit = fine ? 0.01 : 1, units = Math.round((max - min) / unit) + 1;
        const round = value => Math.round(value * 100) / 100, out = [];
        let low = min;
        for (let tier = 0; tier < 20; tier++) {
            const width = Math.floor(units * (tier + 1) / 20) - Math.floor(units * tier / 20);
            const high = round(low + (width - 1) * unit);
            out.push(Object.freeze([low, high]));
            low = round(high + unit);
        }
        return Object.freeze(out);
    };

    // 제단 영향: 베이스 옵션 한 줄을 바꾸는 줄. 부위마다 다섯 줄. [능력치, T1 최저, T20 최고, 소수]. 일반 추가 옵션 20티어의 절반쯤이다.
    const altarLines = (() => {
        const line = (statId, min, max, decimal) => Object.freeze({ statId, tierValues: itemInfluenceTiers(min, max, decimal) });
        const slots = rows => Object.freeze(Object.fromEntries(Object.entries(rows).map(([slot, list]) => [slot, Object.freeze(list.map(row => line(...row)))])));
        return Object.freeze({
            // 성화와 검은 태양: 불, 점화, 번지는 불길, 성가의 빠르기, 치명.
            red: slots({
                투구: [['firePctDmg', 6, 65], ['critDmg', 8, 70], ['aoePctDmg', 6, 60], ['maxResF', 0.5, 4, true], ['resPen', 1, 12]],
                갑옷: [['maxResF', 0.5, 4, true], ['firePctDmg', 6, 65], ['pctHp', 3, 32], ['igniteDamageMultiplierPct', 4, 40], ['dr', 2, 22]],
                장갑: [['igniteChance', 2, 25], ['igniteDamageMultiplierPct', 4, 40], ['aspd', 2, 22], ['fireFlatDmg', 6, 80], ['crit', 0.5, 5.5, true]],
                신발: [['move', 3, 24], ['resF', 3, 26], ['aspd', 2, 18], ['ds', 4, 34], ['critDmg', 8, 60]],
                방패: [['maxResF', 0.5, 4, true], ['firePctDmg', 6, 65], ['igniteChance', 2, 20], ['aoePctDmg', 6, 55], ['critDmg', 8, 60]],
                허리띠: [['pctHp', 3, 32], ['firePctDmg', 6, 60], ['igniteDamageMultiplierPct', 4, 35], ['resF', 3, 26], ['aspd', 2, 18]]
            }),
            // 허기와 갉음: 카오스, 흡혈과 재생, 출혈, 강한 먹잇감.
            blue: slots({
                투구: [['chaosPctDmg', 6, 65], ['spellLeech', 0.1, 0.9, true], ['maxResChaos', 0.5, 3, true], ['bossDamagePct', 3, 30], ['resChaos', 2, 18]],
                갑옷: [['maxResChaos', 0.5, 3, true], ['pctHp', 3, 32], ['regen', 0.2, 1.2, true], ['regenFlat', 10, 120], ['resChaos', 2, 18]],
                장갑: [['leech', 0.1, 0.9, true], ['bleedChance', 2, 25], ['chaosFlatDmg', 6, 80], ['chaosPctDmg', 6, 60], ['aspd', 2, 18]],
                신발: [['move', 3, 24], ['resChaos', 2, 18], ['leech', 0.1, 0.6, true], ['regenFlat', 10, 120], ['bleedChance', 2, 20]],
                방패: [['maxResChaos', 0.5, 3, true], ['chaosPctDmg', 6, 60], ['spellLeech', 0.1, 0.8, true], ['regen', 0.2, 1, true], ['bossDamagePct', 3, 25]],
                허리띠: [['pctHp', 3, 32], ['leech', 0.1, 0.6, true], ['bossDamagePct', 3, 30], ['regen', 0.2, 1.2, true], ['chaosPctDmg', 6, 55]]
            })
        });
    })();

    // 수호자와 마름의 전용 추가 옵션: MOD_DB 끝에 influences와 함께 들어간다(js/state.js). 그 영향을 띤 장비의 옵션 풀에만 있고, 다시
    // 굴려도 나올 수 있다. 일반 희귀에는 붙지 않는 능력치(고유에만 있던 줄 포함)로 부위마다 둘 이상.
    const affixMods = (() => {
        const row = influence => ([id, statId], type, statName, slots, [min, max, decimal]) => Object.freeze({ id, statId, type, statName,
            slots: Object.freeze(slots), influences: Object.freeze([influence]), weight: 0.6, affixBalanceVersion: 2,
            tierValues: itemInfluenceTiers(min, max, decimal) });
        const [guardian, blight] = ['guardian', 'blight'].map(row);
        return Object.freeze([
            // 지역 수호자: 버티고 막고, 보스를 상대하고, 흔들림 없이 친다.
            guardian(['guardianBlockMax', 'blockChanceMax'], 'suffix', '막기 확률 최대치(+%p)', ['방패', '갑옷', '허리띠'], [0.5, 4, true]),
            guardian(['guardianDotTaken', 'dotTakenDamageReducePct'], 'suffix', '받는 지속 피해 감소(%)', ['투구', '갑옷', '신발', '허리띠'], [2, 16]),
            guardian(['guardianEsRegen', 'energyShieldRegen'], 'suffix', '에너지 보호막 재생률(%)', ['투구', '갑옷', '방패', '신발'], [2, 16]),
            guardian(['guardianMaxResAll', 'maxResAll'], 'suffix', '모든 원소 최대 저항(%)', ['투구', '갑옷', '허리띠'], [0.5, 2.5, true]),
            guardian(['guardianMinRoll', 'minDmgRoll'], 'prefix', '최소 피해 보정(%)', ['장갑', '반지', '목걸이'], [3, 25]),
            guardian(['guardianBoss', 'bossDamagePct'], 'prefix', '보스 처치 피해(%)', ['무기', '장갑', '목걸이', '반지'], [4, 40]),
            guardian(['guardianFirstStrike', 'firstStrikeDamagePct'], 'prefix', '선제 타격 피해(%)', ['무기', '장갑', '신발'], [6, 60]),
            guardian(['guardianDouble', 'doubleDamageChance'], 'suffix', '확률로 2배의 피해를 줌(%)', ['무기', '목걸이', '반지'], [1, 8, true]),
            // 마름 사도: 썩히고 퍼뜨리고, 낫지 못하게 하고, 들쭉날쭉 세게 친다.
            blight(['blightPoisonChance', 'poisonChance'], 'suffix', '중독 확률(%)', ['무기', '장갑', '반지', '목걸이', '방패'], [2, 25]),
            blight(['blightPoisonDamage', 'poisonDamageMultiplierPct'], 'prefix', '중독 피해 증가(%)', ['무기', '장갑', '반지', '허리띠'], [5, 50]),
            blight(['blightRegenSuppress', 'regenSuppress'], 'suffix', '재생 억제(%)', ['무기', '투구', '장갑'], [0.2, 1.6, true]),
            blight(['blightRotDamage', 'dotPctDmg'], 'prefix', '지속 피해 배율(%)', ['투구', '갑옷', '허리띠', '신발'], [4, 40]),
            blight(['blightElite', 'eliteDamagePct'], 'prefix', '정예 처치 피해(%)', ['투구', '목걸이', '신발'], [4, 40]),
            blight(['blightMaxRoll', 'maxDmgRoll'], 'prefix', '최대 피해 보정(%)', ['장갑', '반지', '목걸이'], [3, 25]),
            blight(['blightChaosRes', 'maxResChaos'], 'suffix', '최대 카오스 저항(%)', ['갑옷', '방패', '허리띠'], [0.5, 3, true])
        ]);
    })();
    return { ALTAR_INFLUENCE_LINES: altarLines, INFLUENCE_AFFIX_MODS: affixMods };
})();

// 뒤바뀐 고유(기억 던전의 주요 보상, data/memory-dungeon.js swap): 고유의 줄 하나가 이 목록의 다른 줄로 바뀐다. 후보는 그 고유의
// 줄과 태그가 겹치는 것(data/affix-tags.js), 수치는 바뀐 줄이 범위에서 굴린 자리만큼(좋게 굴린 줄은 좋게). 줄 수는 그대로다.
// [능력치, 최저, 최고]: 고유에 붙는 줄의 범위에 맞춘 값.
const SWAPPED_UNIQUE_LINES = Object.freeze([
    ['firePctDmg', 20, 45], ['coldPctDmg', 20, 45], ['lightPctDmg', 20, 45], ['chaosPctDmg', 20, 45], ['physPctDmg', 20, 45],
    ['dotPctDmg', 15, 35], ['aoePctDmg', 15, 35], ['critDmg', 20, 60], ['crit', 2, 6], ['aspd', 6, 15], ['move', 6, 15],
    ['pctHp', 8, 20], ['flatHp', 40, 120], ['resAll', 8, 20], ['dr', 6, 15], ['leech', 0.4, 1.2], ['regen', 0.4, 1.2],
    ['energyShieldRegen', 6, 16], ['dotTakenDamageReducePct', 5, 12], ['blockChanceMax', 1, 3], ['resPen', 4, 12],
    ['igniteChance', 8, 25], ['igniteDamageMultiplierPct', 15, 35], ['poisonChance', 8, 25], ['poisonDamageMultiplierPct', 15, 35],
    ['bleedChance', 8, 25], ['minDmgRoll', 5, 20], ['maxDmgRoll', 5, 20], ['eliteDamagePct', 15, 35], ['bossDamagePct', 15, 35],
    ['spellCritDmg', 20, 40], ['doubleDamageChance', 3, 8], ['firstStrikeDamagePct', 15, 45]
].map(([statId, min, max]) => Object.freeze({ statId, min, max })));

// 뒤바뀐 고유의 화면(테두리, 이름 아래 한 줄, 줄 표식): 기억의 보스가 물드는 보랏빛.
const SWAPPED_UNIQUE_META = Object.freeze({ name: '뒤바뀐', label: '뒤바뀐 아이템', tone: '#c792ff' });

if (typeof safeExposeData === 'function') safeExposeData({ ITEM_INFLUENCES, ITEM_INFLUENCE_RULES, ALTAR_INFLUENCE_LINES, INFLUENCE_AFFIX_MODS,
    SWAPPED_UNIQUE_LINES, SWAPPED_UNIQUE_META });
