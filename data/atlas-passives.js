// 세계수 아틀라스 패시브 (docs/atlas-endgame-20260930.md 3절): 완료 · 보너스로 얻은 아틀라스 포인트를 쓴다(노드 1개 = 1점).
// 갈래마다 뿌리 1 → 세 줄기(작은 노드 2 · 주요 노드 · 끝) · 줄기 사이를 잇는 노드 3 · 핵심 노드 3(두 주요 노드 중 하나가 있으면 열림)
// = 19노드. 끝 · 사이 · 세 번째 핵심(2026-09-30 추가)은 모두 기존 노드 뒤에 붙어, 예전 저장의 찍은 노드가 끊기지 않는다.
// 화면 배치(가운데 뿌리 · 육각으로 맞물린 고리 넷)는 js/atlas-passives-ui.js가 id로 정한다: _r 뿌리, _a1~_aT 줄기, _ab 사이, _k 핵심.
// requires는 "이 중 하나라도 찍혀 있으면" 찍을 수 있다는 뜻이다. 효과 키는 js/atlas-passives.js가 더한다(수치는 첫 제안값).
const ATLAS_PASSIVES = Object.freeze({
    wheels: Object.freeze([
        { id: 'sustain', name: '뿌리: 지도 유지', tint: '#6f5a86', nodes: [
            ['s_r', '지도석 감지', [], { mapDrop: 10 }],
            ['s_a1', '지도석 발견', ['s_r'], { mapDrop: 10 }], ['s_a2', '지도석 발견', ['s_a1'], { mapDrop: 10 }],
            ['s_aN', '풍요로운 뿌리', ['s_a2'], { mapDrop: 20, starter: 1 }, true],
            ['s_b1', '상승 기류', ['s_r'], { mapTierUp: 3 }], ['s_b2', '상승 기류', ['s_b1'], { mapTierUp: 3 }],
            ['s_bN', '등급의 사다리', ['s_b2'], { mapTierUp: 8 }, true],
            ['s_c1', '좋은 지도석', ['s_r'], { mapRarity: 15 }], ['s_c2', '좋은 지도석', ['s_c1'], { mapRarity: 15 }],
            ['s_cN', '지도 제작자', ['s_c2'], { mapRarity: 20, mapQuality: 20 }, true],
            ['s_k1', '끝없는 뿌리', ['s_aN', 's_bN'], { starter: 2, mapDrop: 15 }, 'key'],
            ['s_k2', '여분의 포털', ['s_bN', 's_cN'], { portals: 1 }, 'key'],
            ['s_aT', '뿌리 내린 발견', ['s_aN'], { mapDrop: 15 }], ['s_bT', '높은 가지', ['s_bN'], { mapTierUp: 5 }],
            ['s_cT', '정교한 제작', ['s_cN'], { mapRarity: 10, mapQuality: 10 }],
            ['s_ab', '뿌리와 기류', ['s_a2', 's_b2'], { mapDrop: 5, mapTierUp: 2 }], ['s_bc', '기류와 결', ['s_b2', 's_c2'], { mapTierUp: 2, mapRarity: 8 }],
            ['s_ca', '결과 뿌리', ['s_c2', 's_a2'], { mapRarity: 8, mapDrop: 5 }],
            ['s_k3', '지도 장인', ['s_cN', 's_aN'], { mapQuality: 30, mapRarity: 20, starter: 1 }, 'key']
        ] },
        { id: 'loot', name: '줄기: 수량과 희귀도', tint: '#8a6a45', nodes: [
            ['l_r', '풍성한 수확', [], { quantity: 4 }],
            ['l_a1', '넉넉한 수확', ['l_r'], { quantity: 4 }], ['l_a2', '넉넉한 수확', ['l_a1'], { quantity: 4 }],
            ['l_aN', '무성한 줄기', ['l_a2'], { quantity: 10, packSize: 1 }, true],
            ['l_b1', '빛나는 수액', ['l_r'], { rarity: 6 }], ['l_b2', '빛나는 수액', ['l_b1'], { rarity: 6 }],
            ['l_bN', '황금 수액', ['l_b2'], { rarity: 20 }, true],
            ['l_c1', '정예의 기척', ['l_r'], { extraElite: 5 }], ['l_c2', '정예의 기척', ['l_c1'], { extraElite: 5 }],
            ['l_cN', '정예의 옹이', ['l_c2'], { extraElite: 15, quantity: 5 }, true],
            ['l_k1', '끝없는 무리', ['l_aN', 'l_cN'], { packSize: 1, monsterLife: 15 }, 'key'],
            ['l_k2', '탐욕', ['l_aN', 'l_bN'], { quantity: 15, rarity: 15, monsterDamage: 10 }, 'key'],
            ['l_aT', '가득 찬 곳간', ['l_aN'], { quantity: 6 }], ['l_bT', '짙은 수액', ['l_bN'], { rarity: 10 }],
            ['l_cT', '정예 무리', ['l_cN'], { extraElite: 8 }],
            ['l_ab', '풍성한 빛', ['l_a2', 'l_b2'], { quantity: 2, rarity: 3 }], ['l_bc', '빛나는 정예', ['l_b2', 'l_c2'], { rarity: 3, extraElite: 3 }],
            ['l_ca', '정예의 수확', ['l_c2', 'l_a2'], { extraElite: 3, quantity: 2 }],
            ['l_k3', '황금 옹이', ['l_bN', 'l_cN'], { rarity: 25, extraElite: 20, monsterLife: 20 }, 'key']
        ] },
        { id: 'boss', name: '가지: 보스와 각인', tint: '#5f8a9a', nodes: [
            ['b_r', '각인 탐색', [], { fragmentDrop: 15 }],
            ['b_a1', '각인 수집', ['b_r'], { fragmentDrop: 15 }], ['b_a2', '각인 수집', ['b_a1'], { fragmentDrop: 15 }],
            ['b_aN', '각인 수집가', ['b_a2'], { fragmentDrop: 30 }, true],
            ['b_b1', '보스의 흔적', ['b_r'], { bossMap: 10 }], ['b_b2', '보스의 흔적', ['b_b1'], { bossMap: 10 }],
            ['b_bN', '보스 사냥꾼', ['b_b2'], { bossMap: 25, bossRarity: 30 }, true],
            ['b_c1', '아끼는 손', ['b_r'], { fragmentKeep: 8 }], ['b_c2', '아끼는 손', ['b_c1'], { fragmentKeep: 8 }],
            ['b_cN', '되돌아오는 각인', ['b_c2'], { fragmentKeep: 20 }, true],
            ['b_k1', '세 번째 홈', ['b_aN', 'b_cN'], { slots: 1 }, 'key'],
            ['b_k2', '강대한 보스', ['b_aN', 'b_bN'], { bossLife: 40, bossMap: 50, bossRarity: 50 }, 'key'],
            ['b_aT', '각인 사냥', ['b_aN'], { fragmentDrop: 20 }], ['b_bT', '보스의 기억', ['b_bN'], { bossMap: 15, bossRarity: 15 }],
            ['b_cT', '단단한 손', ['b_cN'], { fragmentKeep: 10 }],
            ['b_ab', '흔적 수집', ['b_a2', 'b_b2'], { fragmentDrop: 8, bossMap: 5 }], ['b_bc', '남는 흔적', ['b_b2', 'b_c2'], { bossMap: 5, fragmentKeep: 4 }],
            ['b_ca', '아끼는 수집', ['b_c2', 'b_a2'], { fragmentKeep: 4, fragmentDrop: 8 }],
            ['b_k3', '보스의 인장', ['b_bN', 'b_cN'], { bossMap: 40, fragmentKeep: 15 }, 'key']
        ] },
        { id: 'content', name: '잎: 지도 속 콘텐츠', tint: '#9a5f45', nodes: [
            ['e_r', '세계의 메아리', [], { breach: 3, hive: 3, treasure: 3, meteor: 3 }],
            ['e_a1', '공허의 기척', ['e_r'], { breach: 8 }], ['e_a2', '공허의 기척', ['e_a1'], { breach: 8 }],
            ['e_aN', '공허의 틈', ['e_a2'], { breach: 12, breachReward: 50 }, true],
            ['e_b1', '윙윙거리는 잎', ['e_r'], { hive: 8 }], ['e_b2', '윙윙거리는 잎', ['e_b1'], { hive: 8 }],
            ['e_bN', '벌집 가지', ['e_b2'], { hive: 12, hiveReward: 50 }, true],
            ['e_c1', '반짝이는 흙', ['e_r'], { treasure: 8 }], ['e_c2', '반짝이는 흙', ['e_c1'], { treasure: 8 }],
            ['e_cN', '숨겨진 보물', ['e_c2'], { treasure: 12, treasureReward: 50 }, true],
            ['e_k1', '떨어지는 별', ['e_aN', 'e_bN'], { meteor: 20, meteorReward: 50, constellation: 1 }, 'key'],
            ['e_k2', '겹치는 세계', ['e_bN', 'e_cN'], { encounterExtra: 1 }, 'key'],
            ['e_aT', '깊은 균열', ['e_aN'], { breach: 10, breachReward: 25 }], ['e_bT', '여왕의 방', ['e_bN'], { hive: 10, hiveReward: 25, beeEvents: 1 }],
            ['e_cT', '보물 지도', ['e_cN'], { treasure: 10, treasureReward: 25 }],
            ['e_ab', '공허의 벌집', ['e_a2', 'e_b2'], { breach: 4, hive: 4 }], ['e_bc', '꿀과 흙', ['e_b2', 'e_c2'], { hive: 4, treasure: 4 }],
            ['e_ca', '균열 속 흙', ['e_c2', 'e_a2'], { treasure: 4, breach: 4 }],
            ['e_k3', '갈라진 세계', ['e_cN', 'e_aN'], { breach: 10, treasure: 10, breachReward: 30, treasureReward: 30 }, 'key']
        ] },
        // 열매(2026-10-09 사용자: 콘텐츠별 보상 세팅, 2번): 루프 30 뒤의 방 넷과 기억 던전, 변이체를 노리는 갈래. 줄기 셋은 잿불 터,
        // 수액 상처, 시든 정원. 핵심 노드는 묘목장(잎 갈래의 운석 자리), 황금 수확(모든 방의 황금 방과 보급 상자 등급), 되감긴 기억(기억과
        // 변이체). 갈래는 minLoop에 열리고, 방 노드는 그 방이 열리는 루프부터 찍는다(js/atlas-passives.js loopOf). 여섯째 값은 노드의 루프.
        { id: 'fruit', name: '열매: 깊은 콘텐츠', tint: '#7d8a45', minLoop: 30, nodes: [
            ['f_r', '맺히는 열매', [], { emberField: 3, sapWound: 3, witheredGarden: 3, nursery: 3 }],
            ['f_a1', '잿불 냄새', ['f_r'], { emberField: 8 }], ['f_a2', '잿불 냄새', ['f_a1'], { emberField: 8 }],
            ['f_aN', '타오르는 터', ['f_a2'], { emberField: 12, emberFieldReward: 50 }, true],
            ['f_b1', '스미는 수액', ['f_r'], { sapWound: 8 }], ['f_b2', '스미는 수액', ['f_b1'], { sapWound: 8 }],
            ['f_bN', '깊은 상처', ['f_b2'], { sapWound: 12, sapWoundReward: 50 }, true],
            ['f_c1', '마른 꽃잎', ['f_r'], { witheredGarden: 8 }], ['f_c2', '마른 꽃잎', ['f_c1'], { witheredGarden: 8 }],
            ['f_cN', '시든 화원', ['f_c2'], { witheredGarden: 12, witheredGardenReward: 50 }, true],
            ['f_k1', '묘목의 숲', ['f_aN', 'f_bN'], { nursery: 20, nurseryReward: 50 }, 'key'],
            ['f_k2', '황금 수확', ['f_bN', 'f_cN'], { goldenRoom: 5, chestGrade: 100 }, 'key'],
            ['f_aT', '꺼지지 않는 불씨', ['f_aN'], { emberField: 10, emberFieldReward: 25 }], ['f_bT', '굳은 호박', ['f_bN'], { sapWound: 10, sapWoundReward: 25 }],
            ['f_cT', '짙은 기름', ['f_cN'], { witheredGarden: 10, witheredGardenReward: 25 }],
            ['f_ab', '불붙은 수액', ['f_a2', 'f_b2'], { emberField: 4, sapWound: 4 }], ['f_bc', '수액 먹은 꽃', ['f_b2', 'f_c2'], { sapWound: 4, witheredGarden: 4 }],
            ['f_ca', '재 덮인 정원', ['f_c2', 'f_a2'], { witheredGarden: 4, emberField: 4 }],
            ['f_k3', '되감긴 기억', ['f_cN', 'f_aN'], { memoryDrop: 50, variantChance: 4 }, 'key', 33]
        ] }
    ].map(wheel => Object.freeze({ ...wheel, nodes: Object.freeze(wheel.nodes.map(([id, name, requires, effect, rank = false, minLoop = 0]) =>
        Object.freeze({ id, name, requires: Object.freeze(requires), effect: Object.freeze(effect), rank: rank === 'key' ? 'keystone' : (rank ? 'notable' : 'small'),
            minLoop: Math.max(wheel.minLoop || 0, minLoop) }))) }))),
    // 효과 이름(패시브 화면). % 붙는 키는 수치 뒤에 %를, 나머지는 그대로 쓴다.
    labels: Object.freeze({
        mapDrop: ['지도석 드롭', '%'], mapTierUp: ['높은 등급 지도석', '%p'], mapRarity: ['마법과 희귀 지도석', '%'], mapQuality: ['품질 붙은 지도석', '%p'],
        starter: ['루프 시작 지도석', '개'], portals: ['포털', '개'], quantity: ['아이템 수량', '%'], rarity: ['아이템 희귀도', '%'],
        packSize: ['무리마다 몬스터', ''], extraElite: ['전투 방 정예', '%p'], monsterLife: ['몬스터 생명력', '%'], monsterDamage: ['몬스터 피해', '%'],
        fragmentDrop: ['각인 드롭', '%'], bossMap: ['보스 추가 지도석', '%p'], bossRarity: ['보스 아이템 희귀도', '%'], fragmentKeep: ['각인 보존', '%p'],
        slots: ['각인 홈', '개'], bossLife: ['보스 생명력과 피해', '%'], breach: ['공허 균열 방', '%p'], hive: ['벌집 방', '%p'],
        treasure: ['보물 방', '%p'], meteor: ['운석 분화구', '%p'], breachReward: ['공허 균열 보상', '%'], hiveReward: ['벌집 보상', '%'],
        treasureReward: ['보물 보상', '%'], meteorReward: ['운석 보상', '%'], encounterExtra: ['지도마다 조우', '개'],
        // 열매 갈래와 보급 각인(2026-10-09): 새 방 넷의 빈도와 보상, 황금 방, 보급 상자, 기억, 변이체.
        emberField: ['잿불 터 방', '%p'], sapWound: ['수액 상처 방', '%p'], witheredGarden: ['시든 정원 방', '%p'], nursery: ['묘목장 방', '%p'],
        emberFieldReward: ['잿불 터 보상', '%'], sapWoundReward: ['수액 상처 보상', '%'], witheredGardenReward: ['시든 정원 보상', '%'],
        nurseryReward: ['묘목장 보상', '%'], goldenRoom: ['황금 방', '%p'], chestGrade: ['은빛과 황금 보급 상자', '%'],
        memoryDrop: ['보스의 기억', '%'], variantChance: ['보스 변이체', '%p'], chestExtra: ['보급 상자', '개'],
        chestMinGrade: ['보급 상자가 모두 은빛 이상', 'on'],
        // 켜기만 하는 효과(값 없이 이름만 보인다): 예전 양봉업자 · 천문학자 기능(2026-10-01).
        beeEvents: ['지도 처치 중 벌 이벤트(꽃가루 10)', 'on'], constellation: ['운석 정산마다 별자리 관측(루프 후 유지)', 'on']
    })
});
safeExposeData({ ATLAS_PASSIVES });
