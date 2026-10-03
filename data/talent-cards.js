// 재능 개화 카드 정의. 2026-10-02 재능 정리: 카드는 전직마다 한 장(18장), 그 전직이 속한 직업의 대표 재능 × 전직이다
// (js/talent-cards.js getTalentBloomCardKeyForAscendancy). 그 열여덟 장 말고 남은 옛 카드 스무 장은 얻을 수 없고, 효과만
// 전직 키스톤이나 고유 주얼(bloomMechanic)이 켠다. 나머지 옛 카드는 지웠고, 불러온 옛 카드는 같은 전직의 카드로 합쳐진다.
// 옛 카드(전직 12)는 기획 엑셀 기준이고, 새 전직 여섯의 카드(대표 재능 × 전직)는 재능과 전직의 대표 능력치에
// 고유 효과 하나를 더한 카드다(수치 임시).
// surface.desc는 기획 원문이며, 옛 surface 메타데이터는 마이그레이션 이력으로만 보존한다.
// 실제 장착 수치와 고유 행동의 단일 계약은 TALENT_PRECISE_CARD_RULES 및 재능 런타임이 소유한다.
const TALENT_BLOOM_CARD_DEFS = {
    // hero1 (궁수)
    'hero1__gladiator': { name: "플레쳐", surface: {"desc": "3회째 공격 시마다 해당 공격 스킬 타겟 수 +3 및 피해 +33%", "precise": true, "uniq": [{"key": "projectileTargetBonus", "params": {"target": 3}}]}, hidden: [{"stat": "aspd", "lv10": 2}] },
    'hero1__ranger': { name: "미스트랄", surface: {"desc": "공격 시 바람의 힘을 획득. 바람의 힘은 중첩 당 이동속도와 공격속도 4% 부여. (최대 10중첩, 지속시간 2초)", "runtime": {"key": "mistral", "maxStacks": 10, "durationMs": 2000, "aspdPerStackAtLevel10": 4, "movePerStackAtLevel10": 4}}, hidden: [{"stat": "move", "lv10": 2}] },
    'hero1__warlock': { name: "헥스보우", surface: {"desc": "저주에 걸린 적을 공격 시 해당 저주를 제거하며 폭발시켜 0.2배의 추가 피해를 적 전체에게 줌", "precise": true, "ops": [{"stat": "aoePctDmg", "perLevel": 2}]}, hidden: [{"stat": "chaosPctDmg", "lv10": 4}] },
    'hero1__inquisitor': { name: "심문궁", surface: {"desc": "공격 시 심판 표식을 남겨 다음 5초간의 피해를 누적, 5초 후 표식이 폭발하여 누적된 피해의 12%를 적에게 줌. (쿨타임 6초)", "precise": true}, hidden: [{"stat": "crit", "lv10": 1}] },
    'hero1__catalyst': { name: "스팅어", surface: {"desc": "지속 피해 점유 수치가 해당 적의 남은 생명력보다 높으면 해당 적 마무리 타격", "ops": [{"stat": "dotPctDmg", "perLevel": 2}]}, hidden: [{"stat": "dotPctDmg", "lv10": 4}] },
    'hero1__hunter': { name: "더블헌터", surface: {"desc": "적이 1명일 경우 치명타 피해 배율 12% 증폭", "dmg": {"perLevel": 1.2, "when": "fewEnemies", "threshold": 1}}, hidden: [{"stat": "critDmg", "lv10": 12}] },
    // hero2 (전사)
    'hero2__warrior': { name: "땅울림", surface: {"desc": "부적의 함성 줄이 조건과 상관없이 늘 켜지지만, 가장 센 함성 줄 하나의 효과만 적용됨. 활성 함성 수 판정은 모두 유지됨.", "runtime": {"key": "instantWarcry", "latestEffectOnly": true}}, hidden: [{"stat": "slamPctDmg", "lv10": 8}] },
    'hero2__gladiator': { name: "콜로세움 브레이커", surface: {"desc": "적을 처치할 때마다 관중의 함성 1중첩 획득. 5중첩 시 다음 공격이 투기장 일격으로 변해 주변 적 5명에게 120% 피해를 주고, 적이 1명뿐이면 피해가 20% 증폭됨.", "precise": true}, hidden: [{"stat": "aoePctDmg", "lv10": 4}] },
    'hero2__assassin': { name: "도살자", surface: {"desc": "같은 적을 4회 공격하면 도살 표식을 새김. 표식 대상이 최대 생명력 30% 이하가 되면 다음 공격이 피해량과 무관하게 일반 몬스터를 마무리하고, 보스에게는 잃은 생명력 비례 추가 피해(잃은 생명력 50%에서 최대 12%)를 줌.", "dmg": {"perLevel": 1.2, "when": "vsBoss"}}, hidden: [{"stat": "physPctDmg", "lv10": 4}] },
    'hero2__guardian': { name: "스톤쉴드", surface: {"desc": "막기 성공 후 2초간 유지되는 별도의 돌 보호막을 얻음. 돌 보호막의 양은 최대 생명력의 10%.", "runtime": {"key": "stoneShield", "durationMs": 2000, "maxHpPctAtLevel10": 10}}, hidden: [{"stat": "armorPct", "lv10": 5}] },
    // hero3 (드루이드)
    'hero3__gladiator': { name: "숲마당 투사", surface: {"desc": "전투 구역을 숲마당으로 취급함. 숲마당 안에서는 플레이어와 몬스터의 모든 공격이 반드시 명중함", "ops": [{"stat": "pctDmg", "perLevel": 1}]}, hidden: [{"stat": "pctDmg", "lv10": 5}] },
    'hero3__assassin': { name: "달그림자", surface: {"desc": "적에게 치명타 적중 시 피해의 20%가 달그림자 피해로 전환. 달그림자 피해는 대상의 모든 피해 감소 기제를 무시한 고정 피해임.", "ops": [{"stat": "critDmg", "perLevel": 2}, {"stat": "resPen", "perLevel": 2}]}, hidden: [{"stat": "crit", "lv10": 1.5}] },
    'hero3__inquisitor': { name: "푸른심판관", surface: {"desc": "원소 공격 시 15% 확률로 푸른 심판을 적용하여 적 원소 저항을 반대로 간주", "ops": [{"stat": "resPen", "perLevel": 2}, {"stat": "elementalPctDmg", "perLevel": 2}]}, hidden: [{"stat": "elementalPctDmg", "lv10": 3}] },
    'hero3__soulbinder': { name: "뿌리결속자", surface: {"desc": "소환수의 공격 속도는 플레이어의 공격 속도와 같음, 대신 플레이어는 공격불가.", "ops": [{"stat": "summonAspd", "perLevel": 5}, {"stat": "summonPctDmg", "perLevel": 4}]}, hidden: [{"stat": "summonAspd", "lv10": 5}] },
    'hero3__catalyst': { name: "시드그로워", surface: {"desc": "상태이상이 만료될 때 즉시 사라지지 않고 씨앗으로 남음. 씨앗이 있는 적에게 다른 상태이상을 부여하면 이전 상태이상의 남은 피해가 꽃피어 들어감.", "ops": [{"stat": "dotPctDmg", "perLevel": 2}]}, hidden: [{"stat": "dotPctDmg", "lv10": 6}] },
    // hero4 (블레이드)
    'hero4__gladiator': { name: "소드댄서", surface: {"desc": "공격 속도 소프트캡이 5부터가 아닌 6부터 적용됨", "ops": [{"stat": "aspd", "perLevel": 2}]}, hidden: [{"stat": "aspd", "lv10": 4}] },
    'hero4__assassin': { name: "그림자날", surface: {"desc": "치명타 확률 행운 판정, 치명타 확률이 100% 이상이면  치명타 피해 배율 +25%", "ops": [{"stat": "crit", "perLevel": 1}, {"stat": "critDmg", "perLevel": 2.5}]}, hidden: [{"stat": "crit", "lv10": 1}] },
    'hero4__hunter': { name: "달을쫓는칼날", surface: {"desc": "적이 하나뿐이면 참격이 되돌아와 같은 대상을 한 번 더 스침. 되돌아온 참격은 원 피해의 20%의 피해만 주지만 명중 판정과 상태이상 판정을 따로 가짐.", "runtime": {"key": "moonReturn", "damagePct": 20}}, hidden: [{"stat": "physPctDmg", "lv10": 4}] },
    // hero5 (성기사)
    'hero5__assassin': { name: "거역자", surface: {"desc": "번개 피해가 카오스 피해로 전환됨. 카오스 피해를 준 적의 생명력 재생 50% 감소", "ops": [{"stat": "chaosPctDmg", "perLevel": 3}]}, hidden: [{"stat": "chaosPctDmg", "lv10": 5}] },
    'hero5__ranger': { name: "순례자", surface: {"desc": "물리 피해의 50%가 번개 피해로 전환", "ops": [{"stat": "addedLightDamagePct", "perLevel": 5}]}, hidden: [{"stat": "lightPctDmg", "lv10": 6}] },
    'hero5__warlock': { name: "녹턴", surface: {"desc": "적에게 거는 저주의 지속시간이 무제한", "uniq": [{"key": "curseCrown", "params": {"extraCurseCap": 1, "finalDmgPerCursePct": 8}}]}, hidden: [{"stat": "resPen", "lv10": 3}] },
    'hero5__guardian': { name: "성위", surface: {"desc": "적에게 공격을 받을 때 잃은 생명력의 4%를 얻은 후 피해를 받음", "uniq": [{"key": "lifeRecoupTakenDamage", "params": {"pct": 8, "duration": 2}}]}, hidden: [{"stat": "pctHp", "lv10": 4}] },
    'hero5__inquisitor': { name: "재판관", surface: {"desc": "남은 공명력의 25%만큼 피해 증가 보너스를 얻음", "ops": [{"stat": "pctDmg", "perLevel": 2}]}, hidden: [{"stat": "pctDmg", "lv10": 4}] },
    'hero5__crusader': { name: "기사단장", surface: {"desc": "에너지 보호막 및 생명력의 12%만큼 초과 회복 가능", "uniq": [{"key": "overhealCapPct", "params": {"pct": 12}}], "ops": [{"stat": "regen", "perLevel": 1}, {"stat": "energyShieldPct", "perLevel": 2}]}, hidden: [{"stat": "pctHp", "lv10": 3}] },
    // hero6 (저격수)
    'hero6__gladiator': { name: "데드아이", surface: {"desc": "투사체를 삼갈래로 분산 발사. 투사체 추가 발사 +1 및 연속타격 확률 50%", "uniq": [{"key": "projectilePatternMode", "params": {"mode": "split"}}, {"key": "projectileDoubleStrikePct", "params": {"pct": 50}}, {"key": "projectileExtraShotBonus", "params": {"shots": 1}}]}, hidden: [{"stat": "projectilePctDmg", "lv10": 2}] },
    'hero6__ranger': { name: "샤프슈터", surface: {"desc": "치명타 확률에 행운 부여. 치명타 확률이 100%를 넘으면 초과분의 50%를 치명타 피해 배율로 전환.", "ops": [{"stat": "crit", "perLevel": 1.5}, {"stat": "critDmg", "perLevel": 2}]}, hidden: [{"stat": "critDmg", "lv10": 6}] },
    'hero6__catalyst': { name: "니트로 사이트", surface: {"desc": "점화 피해가 점화 확률의 40% 확률로 30% 증폭될 수 있음. 증폭된 점화 위에 새로운 점화가 걸리면 폭발하여 남은 점화 피해의 15%를 즉시 폭발시킴", "uniq": [{"key": "igniteDamageMorePct", "perLevelParams": {"pct": 6}}]}, hidden: [{"stat": "igniteChance", "lv10": 5}] },
    // hero7 (소환사)
    // hero8 (수호자)
    // hero9 (원소술사)
    'hero9__elementalist': { name: "엘리멘탈 아티스트", surface: {"desc": "화염·냉기·번개 피해 +14%. 세 원소 피해 증가량 중 가장 낮은 값에 추가로 +10% 보정.", "ops": [{"stat": "elementalPctDmg", "perLevel": 2.4}]}, hidden: [{"stat": "elementalPctDmg", "lv10": 6}] },
    'hero9__warlock': { name: "보이드", surface: {"desc": "카오스 피해 10% 증폭, 지속 피해 배율 10% 증폭 저항 관통 +5%. 적에게 원소 상태이상을 걸 때 그 대신 중독이 걸림", "ops": [{"stat": "chaosPctDmg", "perLevel": 1}, {"stat": "dotPctDmg", "perLevel": 1}, {"stat": "resPen", "perLevel": 0.5}, {"stat": "poisonChance", "perLevel": 2}]}, hidden: [{"stat": "chaosPctDmg", "lv10": 4}] },
    'hero9__soulbinder': { name: "별혼술사", surface: {"desc": "소환수 피해 증가량의 20%를 원소 피해 증가로도 적용. 원소 피해 증가량의 10%를 소환수 피해 증가로도 적용.", "ops": [{"stat": "summonPctDmg", "perLevel": 2}, {"stat": "elementalPctDmg", "perLevel": 1}]}, hidden: [{"stat": "summonPctDmg", "lv10": 4}] },
    'hero9__crusader': { name: "엘리멘탈 크루세이더", surface: {"desc": "생명력이 1로 고정되는 대신 받는 카오스 피해 50% 감소", "uniq": [{"key": "lifePctAsEnergyShield", "perLevelParams": {"pct": 9}}, {"key": "chaosTakenDamageReducePct", "perLevelParams": {"pct": 5}}]}, hidden: [{"stat": "resChaos", "lv10": 8}] },
    // hero10 (연금술사)
    'hero10__catalyst': { name: "마그눔 오푸스", surface: {"desc": "점화·중독 피해 배율 +28%. 대신 점화·중독이 아닌 상태이상을 걸 수 없음", "uniq": [{"key": "igniteDamageMorePct", "perLevelParams": {"pct": 2.8}}, {"key": "poisonDamageMorePct", "perLevelParams": {"pct": 2.8}}], "runtime": {"key": "ailmentWhitelist", "allowed": ["ignite", "poison"]}}, hidden: [{"stat": "igniteChance", "lv10": 8}, {"stat": "poisonChance", "lv10": 8}] },
    // 2026-10-02에 더한 전직 여섯의 카드(직업의 대표 재능 × 전직)
    'hero1__stormarcher': { name: "천둥 화살비", surface: { desc: "투사체 피해 +25%, 번개 피해 +30%, 감전된 적에게 주는 피해 +12%" }, hidden: [{"stat":"move","lv10":3}] },
    'hero2__berserker': { name: "피의 함성", surface: { desc: "근접 피해 +25%, 공격 속도 +8%, 활성 함성마다 피해 +10%" }, hidden: [{"stat":"leech","lv10":0.3}] },
    'hero2__juggernaut': { name: "대지 분쇄자", surface: { desc: "근접 피해 +25%, 강타 피해 +30%, 활성 함성마다 피해 +8%" }, hidden: [{"stat":"armorPct","lv10":6}] },
    'hero4__bladedancer': { name: "그림자 무희", surface: { desc: "치명타 피해 +30%, 회피 +15%, 비껴내기 피해 감소 +8%" }, hidden: [{"stat":"aspd","lv10":3}] },
    'hero10__grovewarden': { name: "독초 정원", surface: { desc: "지속 피해 배율 +25%, 냉기 피해 +30%, 중독 피해 +15%" }, hidden: [{"stat":"regen","lv10":0.3}] },
    'hero10__bombardier': { name: "독연기 폭탄", surface: { desc: "지속 피해 배율 +25%, 포션 스킬 피해 +30%, 중독 피해 +12%" }, hidden: [{"stat":"aoePctDmg","lv10":6}] },
};

// 2026-10-02에 더한 전직 여섯의 카드(mechanic 'statCard')는 능력치 둘(재능, 전직)과 고유 효과 하나다.
// 고유 효과는 합산, 큰 값, 켜고 끄는 키만 쓴다(나중 줄이 앞 줄을 덮는 키는 카드가 맨 뒤라 장비 수치를 덮는다).
// 표면 효과의 실제 전투 계약. 기존 surface.ops/dmg/uniq는 초기 프로토타입 수치이므로
// 정밀 구현에서는 이 표만 단일 출처로 사용한다. stats의 수치는 카드 10레벨 기준이며
// discrete/unique 효과는 카드가 장착되는 즉시 온전히 활성화된다.
const TALENT_PRECISE_CARD_RULES = Object.freeze({
    'hero1__gladiator': { mechanic: 'fletcher' },
    'hero1__ranger': { mechanic: 'mistral' },
    'hero1__warlock': { mechanic: 'hexBow' },
    'hero1__inquisitor': { mechanic: 'judgmentMark' },
    'hero1__catalyst': { mechanic: 'dotOccupancyCull' },
    'hero1__hunter': { mechanic: 'singleEnemyCritDamage' },

    'hero2__warrior': { mechanic: 'earthshaker' },
    'hero2__gladiator': { mechanic: 'colosseumStrike' },
    'hero2__assassin': { mechanic: 'butcherMark' },
    'hero2__guardian': { mechanic: 'stoneShield' },

    'hero3__gladiator': { mechanic: 'forestArena' },
    'hero3__assassin': { mechanic: 'moonShadow' },
    'hero3__inquisitor': { mechanic: 'blueJudgment' },
    'hero3__soulbinder': { mechanic: 'rootBinder' },
    'hero3__catalyst': { mechanic: 'seedGrower' },

    'hero4__gladiator': { mechanic: 'softcapSix' },
    'hero4__assassin': { mechanic: 'luckyPlayerCrit' },
    'hero4__hunter': { mechanic: 'moonReturn' },

    'hero5__assassin': { mechanic: 'lightningToChaos' },
    'hero5__ranger': { mechanic: 'physicalToLightning' },
    'hero5__warlock': { mechanic: 'infiniteCurse' },
    'hero5__guardian': { mechanic: 'preHitRecovery' },
    'hero5__inquisitor': { mechanic: 'remainingResonance' },
    'hero5__crusader': { mechanic: 'overRecovery', uniques: [{ key: 'overhealCapPct', params: { pct: 12 } }] },

    'hero6__gladiator': { mechanic: 'deadeye', uniques: [
        { key: 'projectilePatternMode', params: { mode: 'split' } },
        { key: 'projectileDoubleStrikePct', params: { pct: 50 } },
        { key: 'projectileExtraShotBonus', params: { shots: 1 } }
    ] },
    'hero6__ranger': { mechanic: 'sharpshooter' },
    'hero6__catalyst': { mechanic: 'nitroIgnite' },



    'hero9__elementalist': { mechanic: 'elementalArtist', stats: { firePctDmg: 14, coldPctDmg: 14, lightPctDmg: 14 } },
    'hero9__warlock': { mechanic: 'void', stats: { resPen: 5 } },
    'hero9__soulbinder': { mechanic: 'starSoul' },
    'hero9__crusader': { mechanic: 'elementalCrusader', uniques: [{ key: 'chaosTakenDamageReducePct', params: { pct: 50 } }] },

    'hero10__catalyst': { mechanic: 'magnumOpus', uniques: [{ key: 'igniteDamageMorePct', params: { pct: 28 } }, { key: 'poisonDamageMorePct', params: { pct: 28 } }] },
    // 2026-10-02에 더한 전직 여섯의 카드(직업의 대표 재능 × 전직)
    'hero1__stormarcher': { mechanic: 'statCard', stats: { projectilePctDmg: 25, lightPctDmg: 30 }, uniques: [{ key: 'hitShockedEnemyDamageMorePct', params: {pct: 12} }] },
    'hero2__berserker': { mechanic: 'statCard', stats: { meleePctDmg: 25, aspd: 8 }, uniques: [{ key: 'warcryResonanceBelt', params: {perWarcryAmpPct: 10} }] },
    'hero2__juggernaut': { mechanic: 'statCard', stats: { meleePctDmg: 25, slamPctDmg: 30 }, uniques: [{ key: 'warcryResonanceBelt', params: {perWarcryAmpPct: 8} }] },
    'hero4__bladedancer': { mechanic: 'statCard', stats: { critDmg: 30, evasionPct: 15 }, uniques: [{ key: 'uniqueDeflectDamageReduce', params: {pct: 8} }] },
    'hero10__grovewarden': { mechanic: 'statCard', stats: { dotPctDmg: 25, coldPctDmg: 30 }, uniques: [{ key: 'poisonDamageMorePct', params: {pct: 15} }] },
    'hero10__bombardier': { mechanic: 'statCard', stats: { dotPctDmg: 25, potionPctDmg: 30 }, uniques: [{ key: 'poisonDamageMorePct', params: {pct: 12} }] },
});
if (typeof module !== 'undefined' && module.exports) { module.exports = { TALENT_BLOOM_CARD_DEFS }; }
