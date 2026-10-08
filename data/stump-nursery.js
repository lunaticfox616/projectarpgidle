// 묘목장(12번 루프 39)과 고대 씨앗(루프 42), 2026-10-08, docs/loop-content-12-plan-20261008.md: 아틀라스 콘텐츠 방 '묘목장'(data/atlas.js
// encounters.nursery)의 묘목 무리가 그 지도 지역 색의 씨앗과 수액을 떨어뜨린다(보통 드롭보다 품질이 높고 황금이 잦다). 방을 비우면
// 하나는 반드시, 드물게 불씨의 흉터(포식). 루프 42부터 묘목장과 최종 보스가 드물게 고대 씨앗을 준다: 다 자라면 모든 색의 공명에
// 하나로 세고, 이웃 칸(상하좌우)의 접붙이기를 한 단계 올린다(효과는 js/stump-box.js, 규칙은 js/stump-nursery.js).
const STUMP_NURSERY = Object.freeze({
    minLoop: 39,
    // 지도 지역 → 씨앗과 수액의 색(고목 줄기는 무작위).
    regionColors: Object.freeze({ roots: 'chaos', canopy: 'lightning', garden: 'fire', sanctum: 'cold' }),
    // 처치 드롭 확률(일반, 정예), 수액의 몫, 품질 범위(처치, 방 정리), 황금 확률의 배수(보통 드롭의 황금 확률 × 이것), 방 정리의 흉터 확률.
    killChance: Object.freeze({ normal: 0.04, elite: 0.3 }),
    sapShare: 0.4,
    killRoll: Object.freeze([0.95, 1.2]),
    clearRoll: Object.freeze([1, 1.25]),
    goldenMul: 3,
    scarChance: 0.1,
    // 고대 씨앗: 여는 루프, 묘목장 정리와 최종 보스 처치의 확률, 품질 범위.
    ancient: Object.freeze({ minLoop: 42, roomChance: 0.05, apexChance: 0.25, roll: Object.freeze([1, 1.2]) })
});

if (typeof safeExposeData === 'function') safeExposeData({ STUMP_NURSERY });
