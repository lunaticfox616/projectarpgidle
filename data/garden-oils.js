// 시든 정원(12번 루프 36, 2026-10-08, docs/loop-content-12-plan-20261008.md): 아틀라스 콘텐츠 방 '시든 정원'(data/atlas.js
// encounters.witheredGarden)의 시든 무리가 정원 기름을 떨어뜨린다. 목걸이에 기름 셋을 바르면 그 조합이 보여 주는 패시브 주요 노드
// 셋 가운데 하나가 목걸이에 새겨진다(포인트 없이 그 노드의 효과). 조합 표는 루프마다 바뀌어 매 루프 새로 찾는다. 기름 색은 그루터기
// 함의 색과 같고, 같은 색 열매(다 자란 씨앗) 둘로도 기름 하나를 만든다(조합창 fruit_oil). 규칙은 js/garden-oils.js.
const GARDEN_OILS = Object.freeze({
    minLoop: 36,
    // 기름: 재화 키, 그루터기 함 색, 이름.
    oils: Object.freeze([
        { key: 'oilFire', color: 'fire', name: '불씨 기름' },
        { key: 'oilCold', color: 'cold', name: '서리 기름' },
        { key: 'oilLight', color: 'lightning', name: '뇌우 기름' },
        { key: 'oilChaos', color: 'chaos', name: '그늘 기름' }
    ].map(Object.freeze)),
    // 한 번 바르는 기름 수, 보여 주는 노드 수, 같은 색 셋일 때의 최소 힘 단계(패시브 노드 powerBand).
    perAnoint: 3,
    offers: 3,
    pureBand: 2,
    // 색마다 그 색이 부르는 패시브 주요 노드의 갈래(archetype). 갈래가 없는 노드는 바를 수 없다.
    pools: Object.freeze({
        fire: Object.freeze(['strength', 'melee', 'physical', 'armor', 'shield', 'fire', 'slam', 'channel_guard', 'guard_regen', 'life', 'bleed', 'duel', 'atk']),
        cold: Object.freeze(['dexterity', 'evasion', 'cold', 'projectile', 'range_roll', 'cold_poison', 'area_projectile', 'precision', 'targets', 'volley', 'accuracy']),
        lightning: Object.freeze(['intelligence', 'spell', 'energyShield', 'lightning', 'elemental', 'mystique', 'devotion', 'energy', 'echo', 'area', 'arcane']),
        chaos: Object.freeze(['chaos', 'cycle', 'potion', 'ailment', 'poison_projectile', 'dot_spell', 'energy_poison', 'summon', 'maximum_resist',
            'summon_efficiency', 'guard_summon'])
    }),
    // 시든 무리의 처치 드롭(무작위 색 기름 하나): 일반과 정예.
    killDrops: Object.freeze({ normal: 0.05, elite: 0.3 }),
    // 열매 조합: 같은 색 열매 둘 → 그 색 기름 하나.
    fruitCost: 2
});

if (typeof safeExposeData === 'function') safeExposeData({ GARDEN_OILS });
