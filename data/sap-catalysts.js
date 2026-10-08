// 수액 상처(12번 루프 32, 2026-10-08, docs/loop-content-12-plan-20261008.md): 아틀라스 콘텐츠 방 '수액 상처'(data/atlas.js
// encounters.sapWound)의 수액 무리가 기폭제를 떨어뜨린다. 기폭제는 장비의 품질 속성을 그 태그로 바꾸고 품질을 올린다(품질은 그 태그
// 줄을 품질 %만큼 키운다, js/equipment-stat-resolution.js). 화염, 냉기, 번개, 카오스 기폭제는 그루터기 함의 같은 색 호박석 둘로도
// 만든다(조합창, data/stump-cube.js amber_catalyst). 치명과 소환은 이 콘텐츠에만 있는 품질 속성이다. 규칙은 js/sap-catalysts.js.
const SAP_CATALYSTS = Object.freeze({
    minLoop: 32,
    // 한 번에 더하는 품질과 그 상한(타락한 장비는 제작할 수 없으니 기폭제도 못 쓴다: 품질 30은 잿불의 몫).
    quality: 2,
    cap: 20,
    // 기폭제: 재화 키, 품질 속성(data/affix-tags.js AFFIX_TAG_LISTS.quality), 짝이 되는 그루터기 함 색(호박석 조합).
    kinds: Object.freeze([
        { key: 'catalystFire', mode: 'fire', color: 'fire' },
        { key: 'catalystCold', mode: 'cold', color: 'cold' },
        { key: 'catalystLight', mode: 'light', color: 'lightning' },
        { key: 'catalystChaos', mode: 'chaos', color: 'chaos' },
        { key: 'catalystCrit', mode: 'crit', color: null },
        { key: 'catalystSummon', mode: 'summon', color: null }
    ].map(Object.freeze)),
    // 수액 무리의 처치 드롭(무작위 기폭제 하나): 일반과 정예.
    killDrops: Object.freeze({ normal: 0.04, elite: 0.25 }),
    // 호박석 조합: 같은 색의 다 자란 수액 둘 → 그 색의 기폭제 하나.
    amberCost: 2
});

if (typeof safeExposeData === 'function') safeExposeData({ SAP_CATALYSTS });
