// 세계수 아틀라스 (docs/atlas-endgame-20260930.md 3절): 지역 · 노드 · 지도석 옵션과 규칙 수치. 모든 수치는 첫 제안값이다.
// 노드 위치와 방향 연결은 lore에 정의하고 js/atlas.js가 읽는다.
const ATLAS = Object.freeze({
    zoneId: 'atlas_map',
    // 아틀라스는 마지막 엔드게임(2026-11-06 사용자: 루프 25쯤, 지금 열리는 때는 너무 어렵다): 이 루프부터 이번 루프의 혼돈 20을 깨면 열린다.
    // 이미 열린 저장은 그대로다. 등급의 난이도는 루프와 상관없이 같다(아래 difficulty).
    unlockLoop: 25,
    stashCap: 120,
    portals: 3,
    // 등급 T의 몬스터 = 혼돈 깊이 D(T) = 20 + 2(T−1)을 그 깊이가 관문인 루프(D − 10)에서 만난 것과 같다.
    // 1등급은 루프 10 · 혼돈 20의 몬스터, 16등급은 루프 40 · 심화 50. 루프가 올라도 등급의 난이도는 그대로다.
    difficulty: Object.freeze({ baseDepth: 20, depthPerTier: 2, loopBehindDepth: 10 }),
    // 지역 레벨(몬스터 · 아이템 레벨): 1등급 77(혼돈 20과 같다)에서 등급마다 +3 — 고레벨 캐릭터도 높은 등급에서 전리품을 온전히 받는다.
    areaLevel: Object.freeze({ base: 77, perTier: 3 }),
    // 루프마다 이번 루프 혼돈 20을 처음 깨면 받는 지도석(최고 완료 등급 − belowBest).
    starter: Object.freeze({ count: 3, belowBest: 2 }),
    drops: Object.freeze({
        // 2026-10-09 사용자: 지도석이 넘쳐 귀한 맛이 없다 → 당시 시뮬레이터에서 16등급 동급 이상 약 1.3개/판(패시브 없이)로 조정.
        // 현재 작성 지도 표본은 다르다. 2026-10-23 trunk_8 2,000회: 기본 0.8935, 지도 유지 4포인트 1.2735. 조건은 docs/atlas-pinnacles-20261002.md.
        regular: 0.004, elite: 0.03, bossExtra: 0.05,
        // 지도 안에서 떨어진 지도석의 등급: 한 등급 위 · 같은 등급 · 한~세 등급 아래.
        tierUp: 0.2, tierSame: 0.5,
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
        { id: 'roots', name: '자립의 혈맥', act: 1, ele: 'chaos', tint: '#6f5a86' },
        { id: 'trunk', name: '최초의 경계', act: 7, ele: 'phys', tint: '#8a6a45' },
        { id: 'canopy', name: '창공의 경계', act: 3, ele: 'light', tint: '#5f8a9a' },
        { id: 'garden', name: '검은 화로', act: 2, ele: 'fire', tint: '#9a5f45' },
        { id: 'sanctum', name: '태고의 바다', act: 5, ele: 'cold', tint: '#5f7196' }
    ].map(Object.freeze)),
    // [이름, 등급, 보스, 액트 지도(1~10, 그려 둔 지도를 다시 씀 — js/exploration-layouts.js), 보스 외형(액트 보스 0~9)] — 지역마다 칸 0~8 순서.
    nodes: Object.freeze({
        roots: [
            ['붉은 이끼 여울', 1, '검은 뿌리의 잔영', 1, 0], ['스스로 흐르는 수맥', 2, '수맥의 탐식자', 5, 3],
            ['군집의 요람', 4, '독무 정원의 포자어미', 4, 5], ['혈맥 갈림길', 5, '늪뿌리 수문장', 3, 2],
            ['빈 껍질 저장고', 7, '밑거름의 잔재', 6, 7], ['첫 무리의 무덤', 9, '땅속 군주의 잔영', 7, 1],
            ['생명핵의 샘', 11, '검은 샘의 주인', 5, 8], ['뿔의 회랑', 13, '심근 파괴자', 1, 6],
            ['자립의 심장', 15, '뿌리 심장의 망령', 10, 9]
        ],
        trunk: [
            // 지역 수호자(T16) 뒤에 열리는 갈래: 당시 지도석 드롭 범위(T13~16)에 맞춘다. 보유 지도석의 등급은 보존한다.
            ['낡은 껍질 문턱', 13, '틈새 사냥꾼', 7, 1], ['첫 나이테 회랑', 13, '나이테를 엮는 잔영', 4, 4],
            ['경계의 요새', 14, '미궁의 옹이 수호자', 6, 6], ['굳은 황금수액', 14, '길잃은 성핵 거신', 7, 2],
            ['비어 있는 생장로', 15, '천공 여왕', 4, 5], ['갈라진 시작점', 15, '무딘 날의 잔향', 7, 0],
            ['관측의 계단', 16, '승강로 감시자', 3, 7], ['태초의 심재', 16, '벼락의 흔적', 8, 8],
            ['기원 관측대', 16, '줄기 옥좌의 군주', 10, 9]
        ],
        canopy: [
            ['바람의 초소', 2, '우듬지 매', 3, 3], ['떠 있는 망루', 3, '둥지를 지키는 그리핀', 9, 1],
            ['단절된 잔교', 4, '십자 회랑의 잔영', 3, 0], ['창백한 구름길', 5, '나무꾼의 흐릿한 잔상', 9, 4],
            ['벼락의 표석', 8, '뇌운 정령', 8, 8], ['경계의 섬', 9, '떠도는 창공 거신', 3, 2],
            ['달빛 관문', 12, '폭풍군단의 척후장', 10, 6], ['폭풍의 둥지', 13, '폭풍의 어미새', 8, 7],
            ['엘라하의 전정', 16, '꼭대기 제사장', 5, 9]
        ],
        garden: [
            ['잿빛 진입로', 1, '정원사의 흐린 메아리', 2, 2], ['식은 도가니', 2, '덤불 왕', 4, 5],
            ['검은 잉걸 마당', 3, '분수의 망령', 6, 3], ['그을린 수로', 6, '과수원의 불씨군주', 9, 4],
            ['벼림의 작업장', 7, '칼날 회랑의 석상 수호자', 6, 6], ['꺼지지 않는 화원', 10, '시든 화원의 갉는 자', 2, 0],
            ['봉인된 화실', 11, '빛바랜 관측자의 잔영', 4, 7], ['검은 불꽃 성벽', 14, '덩굴 성벽의 기사', 6, 8],
            ['화로의 문턱', 15, '첫 정원사', 6, 9]
        ],
        sanctum: [
            ['기억의 해안', 2, '참배길 순례자', 5, 1], ['가라앉은 회랑', 3, '서리여제의 잔상', 4, 3],
            ['조류의 예배당', 4, '빛바랜 태양의 사제', 5, 4], ['퇴적된 기록실', 5, '납골당의 시간 파수꾼', 4, 2],
            ['무광의 서고', 6, '서고 사서', 4, 5], ['역류하는 해구', 9, '빙결 재판관', 8, 6],
            ['침묵의 수도원', 10, '잠든 삼원 제단', 5, 0], ['심연의 왕관', 13, '서리 왕관', 10, 8],
            ['태초의 검은 물', 14, '잠든 눈의 수호자', 8, 9]
        ]
    }),
    // 2026-11-08: 고대의 다섯 터전. id와 보유 지도석 등급을 보존한다. links는 진행 방향이다.
    lore: Object.freeze({
        regions: Object.freeze({
            roots: Object.freeze({"path":"sun","note":"어머니 나무에 기대지 않고 생명을 잇는 군집의 땅.","scene":"colony"}),
            garden: Object.freeze({"path":"sun","note":"빛보다 오래된 불꽃과 벼림의 흔적이 남은 터전.","scene":"underworld"}),
            canopy: Object.freeze({"path":"moon","note":"세계수의 침식을 막는 오래된 바람과 달빛의 경계.","scene":"sky"}),
            sanctum: Object.freeze({"path":"moon","note":"회귀에도 지워지지 않은 기억이 가라앉은 심연.","scene":"ocean-lightless"}),
            trunk: Object.freeze({"path":"origin","note":"두 계열의 흔적이 만나는, 어머니 나무가 시작되기 전의 자리.","scene":"beyond"}),
        }),
        bosses: Object.freeze([
            Object.freeze({"id":"apex_archbishop","name":"화로의 괴브니우","path":"sun","region":"garden","requires":["garden_g"]}),
            Object.freeze({"id":"apex_devourer","name":"혈맥의 케르눈노스","path":"sun","region":"roots","requires":["roots_g"]}),
            Object.freeze({"id":"pinnacle_underking","name":"태양의 존재, 벨라-루","path":"sun","requires":["apex_archbishop","apex_devourer"],"scene":"underworld"}),
            Object.freeze({"id":"pinnacle_leviathan","name":"심연의 비포르네우스","path":"moon","region":"sanctum","requires":["sanctum_g"],"scene":"ocean-trench"}),
            Object.freeze({"id":"pinnacle_sky","name":"창공의 엘라하","path":"moon","region":"canopy","requires":["canopy_g"],"scene":"sky"}),
            Object.freeze({"id":"cosmos_astra","name":"달의 존재, 아리안로드","path":"moon","requires":["pinnacle_leviathan","pinnacle_sky"],"scene":"cosmos"}),
            Object.freeze({"id":"woodsman","name":"나무꾼","path":"pinnacle","requires":["pinnacle_underking","cosmos_astra"],"scene":"beyond"}),
            Object.freeze({"id":"pinnacle_observer","name":"경계의 관측자 베일라","path":"pinnacle","requires":["woodsman","apex_archbishop","apex_devourer","pinnacle_underking","pinnacle_leviathan","pinnacle_sky","cosmos_astra"],"scene":"beyond"}),
        ]),
        entryNodes: Object.freeze(["roots_0","garden_0","canopy_0","sanctum_0"]),
        links: Object.freeze([
            Object.freeze(["roots_0","roots_1"]),Object.freeze(["roots_0","roots_2"]),Object.freeze(["roots_1","roots_3"]),Object.freeze(["roots_2","roots_4"]),Object.freeze(["roots_3","roots_5"]),Object.freeze(["roots_4","roots_5"]),Object.freeze(["roots_4","roots_6"]),Object.freeze(["roots_5","roots_7"]),Object.freeze(["roots_6","roots_8"]),Object.freeze(["roots_7","roots_g"]),Object.freeze(["roots_8","roots_g"]),Object.freeze(["roots_g","trunk_0"]),
            Object.freeze(["garden_0","garden_1"]),Object.freeze(["garden_1","garden_2"]),Object.freeze(["garden_1","garden_3"]),Object.freeze(["garden_2","garden_4"]),Object.freeze(["garden_3","garden_4"]),Object.freeze(["garden_4","garden_5"]),Object.freeze(["garden_4","garden_6"]),Object.freeze(["garden_5","garden_7"]),Object.freeze(["garden_6","garden_8"]),Object.freeze(["garden_7","garden_g"]),Object.freeze(["garden_8","garden_g"]),Object.freeze(["garden_g","trunk_0"]),
            Object.freeze(["canopy_0","canopy_1"]),Object.freeze(["canopy_0","canopy_2"]),Object.freeze(["canopy_1","canopy_3"]),Object.freeze(["canopy_2","canopy_4"]),Object.freeze(["canopy_3","canopy_5"]),Object.freeze(["canopy_4","canopy_6"]),Object.freeze(["canopy_5","canopy_7"]),Object.freeze(["canopy_6","canopy_8"]),Object.freeze(["canopy_7","canopy_8"]),Object.freeze(["canopy_8","canopy_g"]),Object.freeze(["canopy_g","trunk_0"]),
            Object.freeze(["sanctum_0","sanctum_1"]),Object.freeze(["sanctum_1","sanctum_2"]),Object.freeze(["sanctum_1","sanctum_3"]),Object.freeze(["sanctum_2","sanctum_4"]),Object.freeze(["sanctum_3","sanctum_5"]),Object.freeze(["sanctum_4","sanctum_6"]),Object.freeze(["sanctum_5","sanctum_6"]),Object.freeze(["sanctum_6","sanctum_7"]),Object.freeze(["sanctum_6","sanctum_8"]),Object.freeze(["sanctum_7","sanctum_g"]),Object.freeze(["sanctum_8","sanctum_g"]),Object.freeze(["sanctum_g","trunk_0"]),
            Object.freeze(["trunk_0","trunk_1"]),Object.freeze(["trunk_0","trunk_2"]),Object.freeze(["trunk_1","trunk_3"]),Object.freeze(["trunk_2","trunk_4"]),Object.freeze(["trunk_3","trunk_5"]),Object.freeze(["trunk_4","trunk_6"]),Object.freeze(["trunk_5","trunk_7"]),Object.freeze(["trunk_6","trunk_8"]),Object.freeze(["trunk_7","trunk_g"]),Object.freeze(["trunk_8","trunk_g"]),
        ]),
        points: Object.freeze([[50,88],[28,72],[72,72],[22,54],[78,54],[28,36],[72,36],[32,19],[68,19]]),
        guardian: Object.freeze([50,8])
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
        { id: 'bossEmpowered', kind: 'prefix', text: '보스 생명력, 피해 {v}% 증가', min: 30, max: 50, quantity: [6, 10], rarity: [8, 12] },
        { id: 'lessLeech', kind: 'suffix', text: '몬스터에게서 흡수하는 생명력 {v}% 감소', min: 40, max: 60, quantity: [5, 8], rarity: [3, 4] },
        { id: 'penetration', kind: 'suffix', text: '몬스터 저항 관통 +{v}%', min: 8, max: 15, quantity: [6, 9], rarity: [3, 5] },
        { id: 'doubleStrike', kind: 'suffix', text: '몬스터 연속 타격 확률 +{v}%', min: 12, max: 20, quantity: [6, 9], rarity: [3, 5] },
        { id: 'energyShield', kind: 'suffix', text: '몬스터가 생명력의 {v}%만큼 에너지 보호막 보유', min: 25, max: 40, quantity: [6, 10], rarity: [4, 6] },
        { id: 'curseImmune', kind: 'suffix', text: '몬스터 저주 면역', min: 0, max: 0, quantity: [4, 6], rarity: [2, 3] },
        { id: 'burningGround', kind: 'suffix', text: '예고 후 용암 지대가 5초 지속, 화염 지속 피해', min: 0, max: 0, quantity: [8, 12], rarity: [5, 7] },
        { id: 'frozenGround', kind: 'suffix', text: '예고 후 빙결 지대가 5초 지속, 냉각', min: 0, max: 0, quantity: [6, 9], rarity: [4, 6] },
        { id: 'corrosiveGround', kind: 'suffix', text: '예고 후 부식 지대가 5초 지속, 카오스 지속 피해', min: 0, max: 0, quantity: [8, 12], rarity: [5, 7] },
        { id: 'shockedGround', kind: 'suffix', text: '예고 후 감전 지대가 5초 지속, 받는 피해 증가', min: 0, max: 0, quantity: [7, 10], rarity: [5, 7] },
        { id: 'monsterEvasion', kind: 'suffix', text: '몬스터 회피 확률 +{v}%', min: 10, max: 20, quantity: [5, 8], rarity: [3, 4] }
    ].map(Object.freeze)),
    // 각인: 지도 장치 홈(기본 2)에 끼워 두면 지도를 열 때 1개씩 쓴다. 지도 안 정예 · 보스가 떨어뜨리고 루프마다 비운다.
    // effect 키는 아틀라스 패시브와 같다(js/atlas-passives.js). encounter는 그 콘텐츠 방을 반드시 만든다.
    // minLoop(또는 encounter 방의 minLoop) 전에는 떨어지지 않고 지도 장치에도 보이지 않는다(js/atlas.js fragmentOpen).
    fragments: Object.freeze([
        { id: 'packs', name: '무리 각인', effect: { packSize: 1, quantity: 8 } },
        { id: 'elites', name: '정예 각인', effect: { extraElite: 30, rarity: 10 } },
        { id: 'maps', name: '지도 각인', effect: { mapDrop: 60 } },
        { id: 'boss', name: '보스 각인', effect: { bossLife: 40, bossMap: 50, bossRarity: 50 } },
        { id: 'breach', name: '균열 각인', encounter: 'breach' },
        { id: 'hive', name: '벌집 각인', encounter: 'hive' },
        { id: 'treasure', name: '보물 각인', encounter: 'treasure' },
        { id: 'meteor', name: '운석 각인', encounter: 'meteor' },
        // 열매 갈래(2026-10-09): 루프 30 뒤의 방 넷을 확정하는 각인과, 보급 상자를 하나 더 두고 모두 은빛 이상으로 만드는 보급 각인.
        { id: 'emberField', name: '잿불 각인', encounter: 'emberField' },
        { id: 'sapWound', name: '수액 각인', encounter: 'sapWound' },
        { id: 'witheredGarden', name: '시든 각인', encounter: 'witheredGarden' },
        { id: 'nursery', name: '묘목 각인', encounter: 'nursery' },
        { id: 'supply', name: '보급 각인', effect: { chestExtra: 1, chestMinGrade: 1 }, minLoop: 30 }
    ].map(Object.freeze)),
    // held: fragments one open map keeps for its boss (like its map drops) — the save boundary uses the same cap.
    fragmentRules: Object.freeze({ slots: 2, elite: 0.03, boss: 0.25, cap: 99, held: 50 }),
    // 지도 속 콘텐츠 방: 정예가 이끄는 무리(보스 관문을 함께 봉인)에 그 콘텐츠의 적 보정이 붙고, 방을 비우면 그 콘텐츠의 재화를 맵
    // 전리품으로 받는다(쓰러지면 잃는다). 보상 [재화, 기본, 등급당] — 기대값의 소수부는 확률로 1개 더.
    // chance: 지도마다 그 방이 생길 기본 확률(%). 패시브 · 각인이 더한다. 지도마다 굴려 생기는 방은 encounterLimit개까지.
    // roster: 그 콘텐츠의 실제 외형을 일반/정예별로 순환 배치한다. 이름과 공격 방식은 data/bosses.js의 같은 외형을 따른다.
    encounters: Object.freeze({
        breach: Object.freeze({ name: '공허 균열', chance: 8, packExtra: 4, enemy: Object.freeze({ hp: 2, damage: 1.3, attack: 1.25, exp: 2 }),
            roster: Object.freeze({ normal: Object.freeze(['breach-scout', 'breach-reflux']), elite: Object.freeze(['breach-veil', 'breach-venom']) }),
            rewards: Object.freeze([['voidChisel', 2, 0.15], ['jewelShard', 0, 0.12]]), mapChance: 0.3,
            golden: Object.freeze([['voidChisel', 2], ['jewelShard', 2]]), chest: Object.freeze(['voidChisel', 1]) }),
        hive: Object.freeze({ name: '벌집', chance: 8, packExtra: 3, enemy: Object.freeze({ hp: 1.2, damage: 1, attack: 1.3, exp: 1.3 }),
            roster: Object.freeze({ normal: Object.freeze(['hive-worker', 'hive-drone', 'hive-scout', 'hive-nurse']), elite: Object.freeze(['hive-guard', 'hive-royal']) }),
            rewards: Object.freeze([['pollen', 6, 0.5], ['venomStinger', 0, 0.06], ['enchantedHoney', 0.08, 0]]), mapChance: 0.15,
            golden: Object.freeze([['enchantedHoney', 1]]), chest: Object.freeze(['pollen', 6]) }),
        treasure: Object.freeze({ name: '보물 방', chance: 10, packExtra: 1, prefix: '보물 수호', enemy: Object.freeze({ hp: 1.5, damage: 1.1, attack: 1, exp: 1.5 }),
            rewards: Object.freeze([['magicBud', 4, 0.4], ['formlessDew', 2, 0.15], ['sapBud', 1, 0.08], ['goldenRule', 0.1, 0]]), mapChance: 0.5,
            golden: Object.freeze([['goldenRule', 1]]), chest: Object.freeze(['sapBud', 1]) }),
        meteor: Object.freeze({ name: '운석 분화구', chance: 6, packExtra: 2, enemy: Object.freeze({ hp: 1.6, damage: 1.2, attack: 1.1, exp: 1.6 }),
            roster: Object.freeze({ normal: Object.freeze(['meteor-shard', 'meteor-melt']), elite: Object.freeze(['meteor-sentinel']) }),
            rewards: Object.freeze([['skyEssence', 0.8, 0.06]]), mapChance: 0.2,
            golden: Object.freeze([['skyEssence', 3]]), chest: Object.freeze(['skyEssence', 1]) }),
        // 잿불 터(12번 루프 30, data/ember-corruption.js): 잿불 무리(화염으로 치고, 잿불 테와 불씨가 보인다)가 잿불가지와 드물게
        // 타오른 잿불가지를 떨어뜨린다. 루프 30부터(minLoop), 잊힌 정원(화염 지역) 지도에서는 두 배로 자주(regionChance).
        emberField: Object.freeze({ name: '잿불 터', chance: 8, packExtra: 3, prefix: '잿불', minLoop: 30, unlock: 'emberField', regionChance: Object.freeze({ garden: 2 }),
            ele: 'fire', outline: '#ffb347', sparks: '#ff9a3c', enemy: Object.freeze({ hp: 1.5, damage: 1.25, attack: 1.15, exp: 1.6 }),
            rewards: Object.freeze([['emberBranch', 2, 0.1], ['burningEmberBranch', 0.1, 0]]), mapChance: 0.15,
            golden: Object.freeze([['burningEmberBranch', 1]]), chest: Object.freeze(['emberBranch', 2]) }),
        // 수액 상처(12번 루프 32, data/sap-catalysts.js): 세계수의 상처에서 굳은 수액 무리(단단하다, 호박 테와 수액 방울)가 기폭제를
        // 떨어뜨린다. 루프 32부터, 고목 줄기 지도에서 두 배. 방을 비우면 무작위 한 종류의 기폭제(키 목록이면 하나를 고른다).
        sapWound: Object.freeze({ name: '수액 상처', chance: 8, packExtra: 3, prefix: '수액', minLoop: 32, unlock: 'sapWound', regionChance: Object.freeze({ trunk: 2 }),
            outline: '#e8c15a', sparks: '#f2b33d', enemy: Object.freeze({ hp: 2, damage: 1.1, attack: 0.95, exp: 1.7 }),
            rewards: Object.freeze([[Object.freeze(['catalystPhys','catalystFire','catalystCold','catalystLight','catalystChaos','catalystCrit','catalystSummon']), 1, 0.1]]), mapChance: 0.15,
            golden: Object.freeze([[Object.freeze(['catalystPhys','catalystFire','catalystCold','catalystLight','catalystChaos','catalystCrit','catalystSummon']), 2]]),
            chest: Object.freeze([Object.freeze(['catalystPhys','catalystFire','catalystCold','catalystLight','catalystChaos','catalystCrit','catalystSummon']), 1]),
            // 지역 기폭제: 목록에서 고를 때 encounterRegionShare만큼 그 지도 지역의 것(줄기는 치명)이 나온다.
            regionKeys: Object.freeze({ garden: 'catalystFire', sanctum: 'catalystCold', canopy: 'catalystLight', roots: 'catalystChaos', trunk: 'catalystCrit' }) }),
        // 시든 정원(12번 루프 36, data/garden-oils.js): 시든 무리(카오스로 친다, 마른 잎 테와 꽃잎)가 정원 기름을 떨어뜨린다. 루프 36부터,
        // 깊은 뿌리 지도에서 두 배. 방을 비우면 무작위 한 색의 기름 2 + 등급당 0.15.
        // 묘목장(12번 루프 39, data/stump-nursery.js): 묘목 무리(초록 테와 잎사귀)가 그 지도 지역 색의 씨앗을 떨어뜨리고, 방을 비우면
        // 하나는 반드시(js/atlas-run.js clearRoom). 루프 39부터, 하늘 가지 지도에서 두 배.
        nursery: Object.freeze({ name: '묘목장', chance: 8, packExtra: 2, prefix: '묘목', minLoop: 39, unlock: 'nursery', regionChance: Object.freeze({ canopy: 2 }),
            ordinaryRoster: Object.freeze(['atlas-canopy-leafglider', 'atlas-canopy-leafglider', 'postchaos-inverted-sapling']),
            outline: '#7fd99a', sparks: '#b8f0a0', enemy: Object.freeze({ hp: 1.3, damage: 1.1, attack: 1.05, exp: 1.5 }),
            rewards: Object.freeze([['magicBud', 3, 0.2]]), mapChance: 0.15 }),
        witheredGarden: Object.freeze({ name: '시든 정원', chance: 8, packExtra: 3, prefix: '시든', minLoop: 36, unlock: 'garden', regionChance: Object.freeze({ roots: 2 }),
            // 희귀 굴림과 정예를 남기고 보통 슬롯 최대 둘에만 전열·후열을 지정한다. ownLook을 켜는 roster와 다르다.
            ordinaryRoster: Object.freeze(['atlas-garden-bonsai-snail', 'act9-chorus-bulbs']),
            ele: 'chaos', outline: '#a8c97f', sparks: '#cfe0a0', enemy: Object.freeze({ hp: 1.4, damage: 1.2, attack: 1.1, exp: 1.6 }),
            rewards: Object.freeze([[Object.freeze(['oilFire','oilCold','oilLight','oilChaos']), 2, 0.15]]), mapChance: 0.15,
            golden: Object.freeze([[Object.freeze(['oilFire','oilCold','oilLight','oilChaos']), 2]]), chest: Object.freeze([Object.freeze(['oilFire','oilCold','oilLight','oilChaos']), 1]),
            // 지역 기름: 목록에서 고를 때 encounterRegionShare만큼 그 지도 지역의 색(줄기는 무작위)이 나온다.
            regionKeys: Object.freeze({ garden: 'oilFire', sanctum: 'oilCold', canopy: 'oilLight', roots: 'oilChaos' }) }),
        // 깨어난 뒤(late): 붉은 제단(대사제)과 푸른 제단(갉는 자). 방을 비우면 잉걸 · 허기의 즙(data/atlas-endgame.js altars).
        redAltar: Object.freeze({ name: '붉은 제단', chance: 12, packExtra: 3, prefix: '성화의', late: true, enemy: Object.freeze({ hp: 1.8, damage: 1.3, attack: 1.15, exp: 1.8 }),
            ordinaryRoster: Object.freeze(['deacon-act8-melee', 'deacon-act8-ranged', 'deacon-act8-ranged']),
            rewards: Object.freeze([['magicBud', 2, 0.2]]), mapChance: 0.1 }),
        blueAltar: Object.freeze({ name: '푸른 제단', chance: 12, packExtra: 3, prefix: '허기진', late: true, enemy: Object.freeze({ hp: 1.8, damage: 1.3, attack: 1, exp: 1.8 }),
            ordinaryRoster: Object.freeze(['act7-husk-stag', 'act7-husk-stag', 'act10-graft-beast']),
            rewards: Object.freeze([['formlessDew', 1, 0.1]]), mapChance: 0.1 })
    }),
    encounterLimit: 1,
    // 황금 방(2026-10-09 사용자 "더 좋은 상자가 뜰 확률"): 지도의 콘텐츠 방이 chance %(+ 패시브 goldenRoom %p)로 황금 방이 된다.
    // 몬스터가 hpMul, damageMul만큼 세고 금빛 테를 두르며, 방을 비우면 보상이 rewardMul배에 그 방의 golden 보상이 더해진다
    // (묘목장은 선물 하나 더). 지도 uid와 방 종류의 해시로 정해 지도마다 고정이고 다른 굴림을 밀지 않는다. 제단(late)은 아니다.
    goldenRoom: Object.freeze({ chance: 5, hpMul: 1.4, damageMul: 1.2, rewardMul: 3, outline: '#ffd75e', sparks: '#fff1a8', prefix: '황금' }),
    // 목록 보상(기폭제, 기름)에서 그 지도 지역의 것(encounters[].regionKeys)이 나오는 몫. 나머지는 목록에서 무작위.
    encounterRegionShare: 0.5,
    // 깊어지는 해금(12번 루프 50): 지도마다 콘텐츠 방이 하나 더(패시브와 각인의 몫과 따로). 루프 75에 하나 더(2026-10-09,
    // 루프 50 이후 이정표).
    encounterLoopBonus: Object.freeze([Object.freeze({ loop: 50, extra: 1, unlock: 'roomOne' }), Object.freeze({ loop: 75, extra: 1, unlock: 'roomTwo' })]),
    // 깨어난 뒤의 제단(late)은 콘텐츠 방 자리를 나눠 쓰지 않고 따로 이만큼까지(그래서 깨어나도 기존 방 확률이 줄지 않는다).
    altarLimit: 1,
    // 지역 수호자: 지역의 가장 안쪽 노드(칸 7 · 8)와 이어진 투기장. [보스 이름, 처치마다 주는 정점 파편(뿌리 입장권, null = 가장 적은 것), 보스 외형].
    // 수호자 지도석은 그 지역 13등급 이상 지도의 보스가 떨어뜨린다(수호자 노드가 열려 있을 때).
    guardians: Object.freeze({
        roots: Object.freeze(['수호자 「검은 뿌리」', 'uberRootTicketChaos', 9, 'guardian-roots']),
        trunk: Object.freeze(['수호자 「나이테 왕」', null, 7, 'guardian-trunk']),
        canopy: Object.freeze(['수호자 「폭풍 날개」', 'uberRootTicketStorm', 8, 'guardian-canopy']),
        garden: Object.freeze(['수호자 「잿불 정원사」', 'uberRootTicketFlame', 4, 'guardian-garden']),
        sanctum: Object.freeze(['수호자 「서리 눈」', 'uberRootTicketFrost', 3, 'guardian-sanctum'])
    }),
    guardianRules: Object.freeze({ tier: 16, minTier: 13, dropChance: 0.15, hpMul: 2.5, damageMul: 1.3, radius: 9 }),
    // 정점: 뿌리 입장권 4종을 하나씩 바쳐 여는 세계수의 그림자(3단계 보스). 처치마다 씨앗 하나(최대 4).
    pinnacle: Object.freeze({ name: '세계수의 그림자', boss: '세계수의 그림자', bossAct: 9, bossVisualId: 'atlas_pinnacle', act: 1, stages: 3, hpMul: 4, damageMul: 1.5,
        tickets: Object.freeze(['uberRootTicketFlame', 'uberRootTicketFrost', 'uberRootTicketStorm', 'uberRootTicketChaos']),
        rewards: Object.freeze([['goldenRule', 2], ['sapBud', 3], ['formlessDew', 8]]) }),
    // 세계수 씨앗: 하나마다 모든 노드 등급 +2(최대 4개 → 24등급). 4개면 경계 너머의 루프 50 조건을 대신한다
    // (data/endgame-progression.js BEYOND_BOUNDARY_UNLOCK_SEEDS).
    seeds: Object.freeze({ max: 4, tierStep: 2 }),
    tierCap: 24,
    // 등급의 빛깔(2026-11-06 사용자: 규칙 없이 보기만): 흰색 1~6, 노란색 7~11, 빨간색 12 이상(씨앗으로 오른 등급 포함).
    tierBands: Object.freeze([Object.freeze({ id: 'white', max: 6, tone: '#ece6d8' }), Object.freeze({ id: 'yellow', max: 11, tone: '#f0c95c' }),
        Object.freeze({ id: 'red', max: Infinity, tone: '#ec6a55' })]),
    // 같은 등급 지도석 셋을 합치면 한 등급 위 지도석 하나(지금 갈 수 있는 그 등급 노드, 떨어진 지도석과 같은 규칙으로 품질과 기운).
    combine: Object.freeze({ count: 3 }),
    // 고등급 보상(2026-10-09, 루프 50 이후 레벨 디자인): 장비 등급은 16등급에서 T20에 닿는다(js/atlas.js lootTier). 그 위 등급마다
    // 아이템 수량 +quantity%, 희귀도 +rarity%, 고유 중 체이싱 고유 확률 +chase%(js/atlas-maps.js effects, chaseMul).
    overTier: Object.freeze({ from: 16, quantity: 8, rarity: 12, chase: 25 }),
    // 시대 재생(아틀라스 위의 환생 층): 씨앗 4개를 모으면 아틀라스 진행(완료 · 보너스 · 패시브 · 씨앗)을 되돌리고 세계수 정수를 받는다.
    // 정수 = 기본 + 완료 5개마다 1 + 보너스 5개마다 1 + 씨앗마다 1. 특전 한 단계의 값 = 다음 단계 번호 × costStep.
    epoch: Object.freeze({
        essence: Object.freeze({ base: 2, perCompleted: 5, perBonus: 5, perSeed: 1 }),
        costStep: 1,
        perks: Object.freeze([
            { id: 'mapDrop', name: '풍요의 뿌리', max: 5, effect: Object.freeze({ mapDrop: 15 }) },
            { id: 'quantity', name: '시대의 수확', max: 5, effect: Object.freeze({ quantity: 5 }) },
            { id: 'points', name: '오래된 수액', max: 5, points: 2 },
            { id: 'starter', name: '기억된 지도', max: 3, effect: Object.freeze({ starter: 1 }) },
            { id: 'slots', name: '넓은 장치', max: 1, effect: Object.freeze({ slots: 1 }) },
            { id: 'supply', name: '시작 보급', max: 3, supply: Object.freeze([['magicBud', 20], ['formlessDew', 5], ['sapBud', 1]]) },
            // 방치 효율 2(2026-10-08, data/offline-progress.js): 단계마다 방치 효율 +2%p.
            { id: 'calm', name: '고요한 시대', max: 3, offline: 0.02 },
            // 남는 정수의 쓸 곳(2026-10-09, 루프 50 이후 레벨 디자인): 다른 특전을 다 사면(정수 64, 시대 셋쯤) 정수가 쌓이기만 했다.
            // 20단계에 정수 210이라 시대를 열 번 넘게 돈다.
            { id: 'ages', name: '쌓인 시대', max: 20, effect: Object.freeze({ rarity: 3 }) }
        ].map(Object.freeze))
    }),
    // 노드 지도 좌표(0~100): 칸 0~2는 바깥 고리, 3·4 / 5·6 / 7·8은 안쪽 고리들. 안쪽 고리는 10노드가 36°씩 고르게 선다.
    chart: Object.freeze({ radii: Object.freeze([42, 33, 24.5, 16.5]), ring: Object.freeze([0, 0, 0, 1, 1, 2, 2, 3, 3]),
        offsets: Object.freeze([-24, 0, 24, -18, 18, -18, 18, -18, 18]) }),
    // 바닥 위험 옵션이 쓰는 시련 함정 패턴(js/hazard-evasion.js).
    burningGround: Object.freeze({ pattern: 'pool', warningMs: 1700, intervalMs: 5200 }),
    // 이름을 바꾼 저장 id(2026-10-08): 예전 id의 FNV-1a 32비트 해시(16진수) → 새 id. 저장을 불러올 때 아틀라스, 탐험 지도, 적 상태
    // 안의 예전 id를 새 id로 바꾼다(js/atlas.js renameSavedIds). 예전 id는 해시로만 적는다.
    renamed: Object.freeze({ '1cc6d67d': 'apex_weaver', 'b334c8e6': 'apex_compost', '494387fb': 'apex_archbishop', '6eb4b0a7': 'apex_devourer', '9ece5360': 'redAltar', 'b36db136': 'blueAltar' })
});
export { ATLAS };
