// 세계수 아틀라스 패시브 (docs/atlas-endgame-20260930.md 3절): 완료 · 보너스로 얻은 아틀라스 포인트를 쓴다(노드 1개 = 1점).
// 갈래마다 뿌리 1 → 세 줄기(작은 노드 2 + 주요 노드 1) → 핵심 노드 2(두 주요 노드 중 하나가 있으면 열림) = 12노드.
// requires는 "이 중 하나라도 찍혀 있으면" 찍을 수 있다는 뜻이다. 효과 키는 js/atlas-passives.js가 더한다(수치는 첫 제안값).
const ATLAS_PASSIVES = Object.freeze({
    wheels: Object.freeze([
        { id: 'sustain', name: '뿌리 · 지도 유지', tint: '#6f5a86', nodes: [
            ['s_r', '지도석 감지', [], { mapDrop: 10 }],
            ['s_a1', '지도석 발견', ['s_r'], { mapDrop: 10 }], ['s_a2', '지도석 발견', ['s_a1'], { mapDrop: 10 }],
            ['s_aN', '풍요로운 뿌리', ['s_a2'], { mapDrop: 20, starter: 1 }, true],
            ['s_b1', '상승 기류', ['s_r'], { mapTierUp: 3 }], ['s_b2', '상승 기류', ['s_b1'], { mapTierUp: 3 }],
            ['s_bN', '등급의 사다리', ['s_b2'], { mapTierUp: 8 }, true],
            ['s_c1', '좋은 지도석', ['s_r'], { mapRarity: 15 }], ['s_c2', '좋은 지도석', ['s_c1'], { mapRarity: 15 }],
            ['s_cN', '지도 제작자', ['s_c2'], { mapRarity: 20, mapQuality: 20 }, true],
            ['s_k1', '끝없는 뿌리', ['s_aN', 's_bN'], { starter: 2, mapDrop: 15 }, 'key'],
            ['s_k2', '여분의 포털', ['s_bN', 's_cN'], { portals: 1 }, 'key']
        ] },
        { id: 'loot', name: '줄기 · 수량과 희귀도', tint: '#8a6a45', nodes: [
            ['l_r', '풍성한 수확', [], { quantity: 4 }],
            ['l_a1', '넉넉한 수확', ['l_r'], { quantity: 4 }], ['l_a2', '넉넉한 수확', ['l_a1'], { quantity: 4 }],
            ['l_aN', '무성한 줄기', ['l_a2'], { quantity: 10, packSize: 1 }, true],
            ['l_b1', '빛나는 수액', ['l_r'], { rarity: 6 }], ['l_b2', '빛나는 수액', ['l_b1'], { rarity: 6 }],
            ['l_bN', '황금 수액', ['l_b2'], { rarity: 20 }, true],
            ['l_c1', '정예의 기척', ['l_r'], { extraElite: 5 }], ['l_c2', '정예의 기척', ['l_c1'], { extraElite: 5 }],
            ['l_cN', '정예의 옹이', ['l_c2'], { extraElite: 15, quantity: 5 }, true],
            ['l_k1', '끝없는 무리', ['l_aN', 'l_cN'], { packSize: 1, monsterLife: 15 }, 'key'],
            ['l_k2', '탐욕', ['l_aN', 'l_bN'], { quantity: 15, rarity: 15, monsterDamage: 10 }, 'key']
        ] },
        { id: 'boss', name: '가지 · 보스와 각인', tint: '#5f8a9a', nodes: [
            ['b_r', '각인 탐색', [], { fragmentDrop: 15 }],
            ['b_a1', '각인 수집', ['b_r'], { fragmentDrop: 15 }], ['b_a2', '각인 수집', ['b_a1'], { fragmentDrop: 15 }],
            ['b_aN', '각인 수집가', ['b_a2'], { fragmentDrop: 30 }, true],
            ['b_b1', '보스의 흔적', ['b_r'], { bossMap: 10 }], ['b_b2', '보스의 흔적', ['b_b1'], { bossMap: 10 }],
            ['b_bN', '보스 사냥꾼', ['b_b2'], { bossMap: 25, bossRarity: 30 }, true],
            ['b_c1', '아끼는 손', ['b_r'], { fragmentKeep: 8 }], ['b_c2', '아끼는 손', ['b_c1'], { fragmentKeep: 8 }],
            ['b_cN', '되돌아오는 각인', ['b_c2'], { fragmentKeep: 20 }, true],
            ['b_k1', '세 번째 홈', ['b_aN', 'b_cN'], { slots: 1 }, 'key'],
            ['b_k2', '강대한 보스', ['b_aN', 'b_bN'], { bossLife: 40, bossMap: 50, bossRarity: 50 }, 'key']
        ] },
        { id: 'content', name: '잎 · 지도 속 콘텐츠', tint: '#9a5f45', nodes: [
            ['e_r', '세계의 메아리', [], { breach: 3, hive: 3, treasure: 3, meteor: 3 }],
            ['e_a1', '공허의 기척', ['e_r'], { breach: 8 }], ['e_a2', '공허의 기척', ['e_a1'], { breach: 8 }],
            ['e_aN', '공허의 틈', ['e_a2'], { breach: 12, breachReward: 50 }, true],
            ['e_b1', '윙윙거리는 잎', ['e_r'], { hive: 8 }], ['e_b2', '윙윙거리는 잎', ['e_b1'], { hive: 8 }],
            ['e_bN', '벌집 가지', ['e_b2'], { hive: 12, hiveReward: 50 }, true],
            ['e_c1', '반짝이는 흙', ['e_r'], { treasure: 8 }], ['e_c2', '반짝이는 흙', ['e_c1'], { treasure: 8 }],
            ['e_cN', '숨겨진 보물', ['e_c2'], { treasure: 12, treasureReward: 50 }, true],
            ['e_k1', '떨어지는 별', ['e_aN', 'e_bN'], { meteor: 20, meteorReward: 50 }, 'key'],
            ['e_k2', '겹치는 세계', ['e_bN', 'e_cN'], { encounterExtra: 1 }, 'key']
        ] }
    ].map(wheel => Object.freeze({ ...wheel, nodes: Object.freeze(wheel.nodes.map(([id, name, requires, effect, rank = false]) =>
        Object.freeze({ id, name, requires: Object.freeze(requires), effect: Object.freeze(effect), rank: rank === 'key' ? 'keystone' : (rank ? 'notable' : 'small') }))) }))),
    // 효과 이름(패시브 화면). % 붙는 키는 수치 뒤에 %를, 나머지는 그대로 쓴다.
    labels: Object.freeze({
        mapDrop: ['지도석 드롭', '%'], mapTierUp: ['높은 등급 지도석', '%p'], mapRarity: ['마법 · 희귀 지도석', '%'], mapQuality: ['품질 붙은 지도석', '%p'],
        starter: ['루프 시작 지도석', '개'], portals: ['포털', '개'], quantity: ['아이템 수량', '%'], rarity: ['아이템 희귀도', '%'],
        packSize: ['무리마다 몬스터', ''], extraElite: ['전투 방 정예', '%p'], monsterLife: ['몬스터 생명력', '%'], monsterDamage: ['몬스터 피해', '%'],
        fragmentDrop: ['각인 드롭', '%'], bossMap: ['보스 추가 지도석', '%p'], bossRarity: ['보스 아이템 희귀도', '%'], fragmentKeep: ['각인 보존', '%p'],
        slots: ['각인 홈', '개'], bossLife: ['보스 생명력 · 피해', '%'], breach: ['공허 균열 방', '%p'], hive: ['벌집 방', '%p'],
        treasure: ['보물 방', '%p'], meteor: ['운석 분화구', '%p'], breachReward: ['공허 균열 보상', '%'], hiveReward: ['벌집 보상', '%'],
        treasureReward: ['보물 보상', '%'], meteorReward: ['운석 보상', '%'], encounterExtra: ['지도마다 조우', '개']
    })
});
safeExposeData({ ATLAS_PASSIVES });
