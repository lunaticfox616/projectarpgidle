// 세계수 아틀라스 (docs/atlas-endgame-20260930.md 3절): 지역 · 노드 · 지도석 옵션과 규칙 수치. 모든 수치는 첫 제안값이다.
// 노드 위치와 연결은 지역 번호와 칸(slot)에서 js/atlas.js가 계산한다(바깥 고리 칸 0~2 → 안쪽 칸 7~8).
const ATLAS = Object.freeze({
    zoneId: 'atlas_map',
    stashCap: 120,
    portals: 3,
    maxTier: 16,
    // 등급 T의 몬스터 = 혼돈 깊이 D(T) = 20 + 2(T−1)을 그 깊이가 관문인 루프(D − 10)에서 만난 것과 같다.
    // 1등급은 아틀라스가 열리는 곳(루프 10 · 혼돈 20), 16등급은 루프 40 · 심화 50. 루프가 올라도 등급의 난이도는 그대로다.
    difficulty: Object.freeze({ baseDepth: 20, depthPerTier: 2, loopBehindDepth: 10 }),
    // 맵 크기(생성 맵 size 1~3)가 커지는 등급.
    sizeBands: Object.freeze([6, 12]),
    // 지역 레벨(몬스터 · 아이템 레벨): 1등급 77(혼돈 20과 같다)에서 등급마다 +3 — 고레벨 캐릭터도 높은 등급에서 전리품을 온전히 받는다.
    areaLevel: Object.freeze({ base: 77, perTier: 3 }),
    // 루프마다 이번 루프 혼돈 20을 처음 깨면 받는 지도석(최고 완료 등급 − belowBest).
    starter: Object.freeze({ count: 3, belowBest: 2 }),
    drops: Object.freeze({
        regular: 0.015, elite: 0.08, bossExtra: 0.35,
        // 지도 안에서 떨어진 지도석의 등급: 한 등급 위 · 같은 등급 · 한~세 등급 아래.
        tierUp: 0.2, tierSame: 0.55,
        magic: 0.25, rare: 0.05, qualityChance: 0.3, quality: 10,
        // 지도 밖: 혼돈 20 이상 보스가 낮은 등급 지도석을 드물게 떨어뜨린다(지도석이 바닥났을 때의 입구).
        outsideDepth: 20, outsideBoss: 0.08, outsideTier: 3
    }),
    rarities: Object.freeze({
        normal: Object.freeze({ name: '일반', prefix: 0, suffix: 0, min: 0, max: 0 }),
        magic: Object.freeze({ name: '마법', prefix: 1, suffix: 1, min: 1, max: 2 }),
        rare: Object.freeze({ name: '희귀', prefix: 3, suffix: 3, min: 4, max: 6 })
    }),
    quality: Object.freeze({ max: 20, step: 5 }),
    // 타락: 무변화 · 등급 +1 · 옵션 초과 추가 · 5~6옵션 희귀로 재구성 (가중치).
    corruption: Object.freeze({ none: 30, tier: 25, extra: 25, reforge: 20, bonusQuantity: 10 }),
    regions: Object.freeze([
        { id: 'roots', name: '깊은 뿌리', biome: 'root', ele: 'chaos', tint: '#6f5a86' },
        { id: 'trunk', name: '고목 줄기', biome: 'trunk', ele: 'phys', tint: '#8a6a45' },
        { id: 'canopy', name: '하늘 가지', biome: 'aerial', ele: 'light', tint: '#5f8a9a' },
        { id: 'garden', name: '잊힌 정원', biome: 'courtyard', ele: 'fire', tint: '#9a5f45' },
        { id: 'sanctum', name: '잠든 성소', biome: 'sanctum', ele: 'cold', tint: '#5f7196' }
    ].map(Object.freeze)),
    // [이름, 등급, 보스, 맵 스타일, 바이옴(생략 시 지역 바이옴), 보스 외형(액트 보스 0~9)] — 지역마다 칸 0~8 순서.
    nodes: Object.freeze({
        roots: [
            ['이끼 낀 뿌리굴', 1, '뿌리굴 파수꾼', 'rooms', null, 0], ['젖은 수맥', 2, '수맥의 탐식자', 'descent', null, 3],
            ['균사 동굴', 4, '균사 여왕', 'maze', 'maze', 5], ['가라앉은 뿌리길', 5, '늪뿌리 수문장', 'descent', null, 2],
            ['부식된 저장고', 7, '부패 저장관', 'rooms', 'ruins', 7], ['고목의 무덤', 9, '무덤 수호목', 'gauntlet', null, 1],
            ['검은 수액 샘', 11, '검은 샘의 주인', 'descent', null, 8], ['심근 갱도', 13, '심근 파괴자', 'descent', null, 6],
            ['뿌리의 심장', 15, '뿌리 심장의 망령', 'rooms', null, 9]
        ],
        trunk: [
            ['껍질 틈새', 1, '틈새 사냥꾼', 'gauntlet', null, 1], ['나이테 회랑', 3, '나이테 기록관', 'rooms', null, 4],
            ['옹이 요새', 4, '옹이 성주', 'rooms', 'ruins', 6], ['송진 폭포', 6, '송진 거인', 'descent', null, 2],
            ['벌레 먹은 통로', 8, '천공 여왕', 'maze', 'maze', 5], ['쪼개진 줄기', 10, '쪼개진 기사', 'gauntlet', null, 0],
            ['수관 승강로', 12, '승강로 감시자', 'descent', null, 7], ['벼락 맞은 심재', 14, '벼락의 흔적', 'rooms', null, 8],
            ['줄기의 옥좌', 16, '줄기 옥좌의 군주', 'gauntlet', null, 9]
        ],
        canopy: [
            ['바람 부는 우듬지', 2, '우듬지 매', 'islands', null, 3], ['새둥지 마을', 3, '둥지의 어미', 'rooms', null, 1],
            ['흔들다리', 4, '다리지기', 'gauntlet', null, 0], ['구름 과수원', 5, '과수원 허수아비', 'islands', null, 4],
            ['번개 가지', 8, '뇌운 정령', 'islands', null, 8], ['떠도는 잎섬', 9, '잎섬 방랑자', 'islands', null, 2],
            ['별 맺힌 가지 끝', 12, '별가지 사수', 'gauntlet', null, 6], ['폭풍 둥지', 13, '폭풍의 어미새', 'islands', null, 7],
            ['하늘 꼭대기 제단', 16, '꼭대기 제사장', 'rooms', 'sanctum', 9]
        ],
        garden: [
            ['무너진 온실', 1, '온실 정원사', 'rooms', null, 2], ['가시덤불 미로', 2, '덤불 왕', 'maze', 'maze', 5],
            ['시든 분수대', 3, '분수의 망령', 'rooms', 'ruins', 3], ['불탄 과수원', 6, '잿불 과수지기', 'rooms', null, 4],
            ['석상 정원', 7, '석상 지휘관', 'gauntlet', 'ruins', 6], ['잿빛 화원', 10, '잿빛 화원사', 'rooms', null, 0],
            ['봉인된 식물원', 11, '식물원 관리자', 'maze', 'maze', 7], ['불꽃 덩굴 성벽', 14, '덩굴 성벽의 기사', 'gauntlet', 'ruins', 8],
            ['정원사의 무덤', 15, '첫 정원사', 'rooms', 'ruins', 9]
        ],
        sanctum: [
            ['서리 내린 참배길', 2, '참배길 순례자', 'gauntlet', null, 1], ['얼어붙은 회랑', 3, '회랑 파수병', 'maze', 'maze', 3],
            ['고요한 예배당', 4, '침묵의 사제', 'rooms', null, 4], ['수정 납골당', 5, '납골당 지기', 'maze', 'maze', 2],
            ['봉인 서고', 6, '서고 사서', 'rooms', null, 5], ['빙결 재판정', 9, '빙결 재판관', 'gauntlet', null, 6],
            ['잠든 수도원', 10, '수도원장', 'rooms', null, 0], ['서리 왕관의 전당', 13, '서리 왕관', 'gauntlet', null, 8],
            ['성소의 잠든 눈', 14, '잠든 눈의 수호자', 'maze', 'maze', 9]
        ]
    }),
    // 지도석 옵션. 수치는 굴림(0~1)으로 [min,max] 사이를 고르고, 옵션마다 아이템 수량 · 희귀도 보너스를 더한다(같은 굴림).
    // 효과 키는 js/atlas-maps.js의 effects()가 구역 · 적에 적용한다.
    mods: Object.freeze([
        { id: 'monsterLife', kind: 'prefix', text: '몬스터 생명력 {v}% 증가', min: 20, max: 40, quantity: [6, 10], rarity: [3, 5] },
        { id: 'monsterDamage', kind: 'prefix', text: '몬스터 피해 {v}% 증가', min: 18, max: 32, quantity: [6, 10], rarity: [3, 5] },
        { id: 'monsterSpeed', kind: 'prefix', text: '몬스터 공격 속도 {v}% 증가', min: 15, max: 25, quantity: [6, 9], rarity: [3, 5] },
        { id: 'monsterResist', kind: 'prefix', text: '몬스터 원소 저항 +{v}%', min: 20, max: 30, quantity: [5, 8], rarity: [3, 4] },
        { id: 'monsterArmour', kind: 'prefix', text: '몬스터 물리 피해 감소 +{v}%', min: 10, max: 20, quantity: [5, 8], rarity: [3, 4] },
        { id: 'monsterCrit', kind: 'prefix', text: '몬스터 치명타 확률 +{v}%', min: 10, max: 20, quantity: [5, 8], rarity: [3, 4] },
        { id: 'extraElites', kind: 'prefix', text: '전투 방의 {v}%에 정예 추가', min: 20, max: 35, quantity: [8, 12], rarity: [6, 9] },
        { id: 'packSize', kind: 'prefix', text: '무리마다 몬스터 +{v}', min: 1, max: 2, integer: true, quantity: [8, 14], rarity: [3, 5] },
        { id: 'bossEmpowered', kind: 'prefix', text: '보스 생명력 · 피해 {v}% 증가', min: 30, max: 50, quantity: [6, 10], rarity: [8, 12] },
        { id: 'lessLeech', kind: 'suffix', text: '몬스터에게서 흡수하는 생명력 {v}% 감소', min: 40, max: 60, quantity: [5, 8], rarity: [3, 4] },
        { id: 'penetration', kind: 'suffix', text: '몬스터 저항 관통 +{v}%', min: 8, max: 15, quantity: [6, 9], rarity: [3, 5] },
        { id: 'doubleStrike', kind: 'suffix', text: '몬스터 연속 타격 확률 +{v}%', min: 12, max: 20, quantity: [6, 9], rarity: [3, 5] },
        { id: 'energyShield', kind: 'suffix', text: '몬스터가 생명력의 {v}%만큼 에너지 보호막 보유', min: 25, max: 40, quantity: [6, 10], rarity: [4, 6] },
        { id: 'curseImmune', kind: 'suffix', text: '몬스터 저주 면역', min: 0, max: 0, quantity: [4, 6], rarity: [2, 3] },
        { id: 'burningGround', kind: 'suffix', text: '바닥에 불길 웅덩이가 예고 후 번진다', min: 0, max: 0, quantity: [8, 12], rarity: [5, 7] },
        { id: 'monsterEvasion', kind: 'suffix', text: '몬스터 회피 확률 +{v}%', min: 10, max: 20, quantity: [5, 8], rarity: [3, 4] }
    ].map(Object.freeze)),
    // 노드 지도 좌표(0~100): 칸 0~2는 바깥 고리, 3·4 / 5·6 / 7·8은 안쪽 고리들. 안쪽 고리는 10노드가 36°씩 고르게 선다.
    chart: Object.freeze({ radii: Object.freeze([40, 31, 22.5, 14]), ring: Object.freeze([0, 0, 0, 1, 1, 2, 2, 3, 3]),
        offsets: Object.freeze([-24, 0, 24, -18, 18, -18, 18, -18, 18]), labelRadius: 47.5 }),
    // 바닥 위험 옵션이 쓰는 시련 함정 패턴(js/hazard-evasion.js).
    burningGround: Object.freeze({ pattern: 'pool', warningMs: 1700, intervalMs: 5200 })
});
safeExposeData({ ATLAS });
