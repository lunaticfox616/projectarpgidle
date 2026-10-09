// 세계수 아틀라스 (docs/atlas-endgame-20260930.md 3절): 지역 · 노드 · 지도석 옵션과 규칙 수치. 모든 수치는 첫 제안값이다.
// 노드 위치와 연결은 지역 번호와 칸(slot)에서 js/atlas.js가 계산한다(바깥 고리 칸 0~2 → 안쪽 칸 7~8).
const ATLAS = Object.freeze({
    zoneId: 'atlas_map',
    stashCap: 120,
    portals: 3,
    // 등급 T의 몬스터 = 혼돈 깊이 D(T) = 20 + 2(T−1)을 그 깊이가 관문인 루프(D − 10)에서 만난 것과 같다.
    // 1등급은 아틀라스가 열리는 곳(루프 10 · 혼돈 20), 16등급은 루프 40 · 심화 50. 루프가 올라도 등급의 난이도는 그대로다.
    difficulty: Object.freeze({ baseDepth: 20, depthPerTier: 2, loopBehindDepth: 10 }),
    // 지역 레벨(몬스터 · 아이템 레벨): 1등급 77(혼돈 20과 같다)에서 등급마다 +3 — 고레벨 캐릭터도 높은 등급에서 전리품을 온전히 받는다.
    areaLevel: Object.freeze({ base: 77, perTier: 3 }),
    // 루프마다 이번 루프 혼돈 20을 처음 깨면 받는 지도석(최고 완료 등급 − belowBest).
    starter: Object.freeze({ count: 3, belowBest: 2 }),
    drops: Object.freeze({
        // 2026-10-09 사용자: 지도석이 넘쳐 귀한 맛이 없다 → 16등급에서 같은 등급 이상이 판마다 1.3개 안팎(드랍 시뮬레이터, 패시브 없이).
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
        { id: 'roots', name: '깊은 뿌리', act: 1, ele: 'chaos', tint: '#6f5a86' },
        { id: 'trunk', name: '고목 줄기', act: 7, ele: 'phys', tint: '#8a6a45' },
        { id: 'canopy', name: '하늘 가지', act: 3, ele: 'light', tint: '#5f8a9a' },
        { id: 'garden', name: '잊힌 정원', act: 2, ele: 'fire', tint: '#9a5f45' },
        { id: 'sanctum', name: '잠든 성소', act: 5, ele: 'cold', tint: '#5f7196' }
    ].map(Object.freeze)),
    // [이름, 등급, 보스, 액트 지도(1~10, 그려 둔 지도를 다시 씀 — js/exploration-layouts.js), 보스 외형(액트 보스 0~9)] — 지역마다 칸 0~8 순서.
    nodes: Object.freeze({
        roots: [
            ['이끼 낀 뿌리굴', 1, '뿌리굴 파수꾼', 1, 0], ['젖은 수맥', 2, '수맥의 탐식자', 5, 3],
            ['균사 동굴', 4, '균사 여왕', 4, 5], ['가라앉은 뿌리길', 5, '늪뿌리 수문장', 3, 2],
            ['부식된 저장고', 7, '부패 저장관', 6, 7], ['고목의 무덤', 9, '무덤 수호목', 7, 1],
            ['검은 수액 샘', 11, '검은 샘의 주인', 5, 8], ['심근 갱도', 13, '심근 파괴자', 1, 6],
            ['뿌리의 심장', 15, '뿌리 심장의 망령', 10, 9]
        ],
        trunk: [
            ['껍질 틈새', 1, '틈새 사냥꾼', 7, 1], ['나이테 회랑', 3, '나이테 기록관', 4, 4],
            ['옹이 요새', 4, '옹이 성주', 6, 6], ['송진 폭포', 6, '송진 거인', 7, 2],
            ['벌레 먹은 통로', 8, '천공 여왕', 4, 5], ['쪼개진 줄기', 10, '쪼개진 기사', 7, 0],
            ['수관 승강로', 12, '승강로 감시자', 3, 7], ['벼락 맞은 심재', 14, '벼락의 흔적', 8, 8],
            ['줄기의 옥좌', 16, '줄기 옥좌의 군주', 10, 9]
        ],
        canopy: [
            ['바람 부는 우듬지', 2, '우듬지 매', 3, 3], ['새둥지 마을', 3, '둥지의 어미', 9, 1],
            ['흔들다리', 4, '다리지기', 3, 0], ['구름 과수원', 5, '과수원 허수아비', 9, 4],
            ['번개 가지', 8, '뇌운 정령', 8, 8], ['떠도는 잎섬', 9, '잎섬 방랑자', 3, 2],
            ['별 맺힌 가지 끝', 12, '별가지 사수', 10, 6], ['폭풍 둥지', 13, '폭풍의 어미새', 8, 7],
            ['하늘 꼭대기 제단', 16, '꼭대기 제사장', 5, 9]
        ],
        garden: [
            ['무너진 온실', 1, '온실 정원사', 2, 2], ['가시덤불 미로', 2, '덤불 왕', 4, 5],
            ['시든 분수대', 3, '분수의 망령', 6, 3], ['불탄 과수원', 6, '잿불 과수지기', 9, 4],
            ['석상 정원', 7, '석상 지휘관', 6, 6], ['잿빛 화원', 10, '잿빛 화원사', 2, 0],
            ['봉인된 식물원', 11, '식물원 관리자', 4, 7], ['불꽃 덩굴 성벽', 14, '덩굴 성벽의 기사', 6, 8],
            ['정원사의 무덤', 15, '첫 정원사', 6, 9]
        ],
        sanctum: [
            ['서리 내린 참배길', 2, '참배길 순례자', 5, 1], ['얼어붙은 회랑', 3, '회랑 파수병', 4, 3],
            ['고요한 예배당', 4, '침묵의 사제', 5, 4], ['수정 납골당', 5, '납골당 지기', 4, 2],
            ['봉인 서고', 6, '서고 사서', 4, 5], ['빙결 재판정', 9, '빙결 재판관', 8, 6],
            ['잠든 수도원', 10, '수도원장', 5, 0], ['서리 왕관의 전당', 13, '서리 왕관', 10, 8],
            ['성소의 잠든 눈', 14, '잠든 눈의 수호자', 8, 9]
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
        { id: 'bossEmpowered', kind: 'prefix', text: '보스 생명력, 피해 {v}% 증가', min: 30, max: 50, quantity: [6, 10], rarity: [8, 12] },
        { id: 'lessLeech', kind: 'suffix', text: '몬스터에게서 흡수하는 생명력 {v}% 감소', min: 40, max: 60, quantity: [5, 8], rarity: [3, 4] },
        { id: 'penetration', kind: 'suffix', text: '몬스터 저항 관통 +{v}%', min: 8, max: 15, quantity: [6, 9], rarity: [3, 5] },
        { id: 'doubleStrike', kind: 'suffix', text: '몬스터 연속 타격 확률 +{v}%', min: 12, max: 20, quantity: [6, 9], rarity: [3, 5] },
        { id: 'energyShield', kind: 'suffix', text: '몬스터가 생명력의 {v}%만큼 에너지 보호막 보유', min: 25, max: 40, quantity: [6, 10], rarity: [4, 6] },
        { id: 'curseImmune', kind: 'suffix', text: '몬스터 저주 면역', min: 0, max: 0, quantity: [4, 6], rarity: [2, 3] },
        { id: 'burningGround', kind: 'suffix', text: '바닥에 불길 웅덩이가 예고 후 번진다', min: 0, max: 0, quantity: [8, 12], rarity: [5, 7] },
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
    encounters: Object.freeze({
        breach: Object.freeze({ name: '공허 균열', chance: 8, packExtra: 4, prefix: '공허의', enemy: Object.freeze({ hp: 2, damage: 1.3, attack: 1.25, exp: 2 }),
            rewards: Object.freeze([['voidChisel', 2, 0.15], ['jewelShard', 0, 0.12]]), mapChance: 0.3,
            golden: Object.freeze([['voidChisel', 2], ['jewelShard', 2]]), chest: Object.freeze(['voidChisel', 1]) }),
        // 정예 수호벌은 벌집 세트에서 같은 이름의 그림(hive-guard)을 쓴다(2026-10-07 검토: 여왕 근위벌 그림이라 외형 기록의 이름이 달랐다).
        hive: Object.freeze({ name: '벌집', chance: 8, packExtra: 3, names: Object.freeze(['벌집 전투벌', '정예 수호벌']), visuals: Object.freeze(['hive-worker', 'hive-guard']), enemy: Object.freeze({ hp: 1.2, damage: 1, attack: 1.3, exp: 1.3 }),
            rewards: Object.freeze([['pollen', 6, 0.5], ['venomStinger', 0, 0.06], ['enchantedHoney', 0.08, 0]]), mapChance: 0.15,
            golden: Object.freeze([['enchantedHoney', 1]]), chest: Object.freeze(['pollen', 6]) }),
        treasure: Object.freeze({ name: '보물 방', chance: 10, packExtra: 1, prefix: '보물 수호', enemy: Object.freeze({ hp: 1.5, damage: 1.1, attack: 1, exp: 1.5 }),
            rewards: Object.freeze([['magicBud', 4, 0.4], ['formlessDew', 2, 0.15], ['sapBud', 1, 0.08], ['goldenRule', 0.1, 0]]), mapChance: 0.5,
            golden: Object.freeze([['goldenRule', 1]]), chest: Object.freeze(['sapBud', 1]) }),
        meteor: Object.freeze({ name: '운석 분화구', chance: 6, packExtra: 2, prefix: '별에 물든', enemy: Object.freeze({ hp: 1.6, damage: 1.2, attack: 1.1, exp: 1.6 }),
            rewards: Object.freeze([['skyEssence', 0.8, 0.06]]), mapChance: 0.2,
            golden: Object.freeze([['skyEssence', 3]]), chest: Object.freeze(['skyEssence', 1]) }),
        // 잿불 터(12번 루프 30, data/ember-corruption.js): 잿불 무리(화염으로 치고, 잿불 테와 불씨가 보인다)가 잿불가지와 드물게
        // 타오른 잿불가지를 떨어뜨린다. 루프 30부터(minLoop), 잊힌 정원(화염 지역) 지도에서는 두 배로 자주(regionChance).
        emberField: Object.freeze({ name: '잿불 터', chance: 8, packExtra: 3, prefix: '잿불', minLoop: 30, regionChance: Object.freeze({ garden: 2 }),
            ele: 'fire', outline: '#ffb347', sparks: '#ff9a3c', enemy: Object.freeze({ hp: 1.5, damage: 1.25, attack: 1.15, exp: 1.6 }),
            rewards: Object.freeze([['emberBranch', 2, 0.1], ['burningEmberBranch', 0.1, 0]]), mapChance: 0.15,
            golden: Object.freeze([['burningEmberBranch', 1]]), chest: Object.freeze(['emberBranch', 2]) }),
        // 수액 상처(12번 루프 32, data/sap-catalysts.js): 세계수의 상처에서 굳은 수액 무리(단단하다, 호박 테와 수액 방울)가 기폭제를
        // 떨어뜨린다. 루프 32부터, 고목 줄기 지도에서 두 배. 방을 비우면 무작위 한 종류의 기폭제(키 목록이면 하나를 고른다).
        sapWound: Object.freeze({ name: '수액 상처', chance: 8, packExtra: 3, prefix: '수액', minLoop: 32, regionChance: Object.freeze({ trunk: 2 }),
            outline: '#e8c15a', sparks: '#f2b33d', enemy: Object.freeze({ hp: 2, damage: 1.1, attack: 0.95, exp: 1.7 }),
            rewards: Object.freeze([[Object.freeze(['catalystFire','catalystCold','catalystLight','catalystChaos','catalystCrit','catalystSummon']), 1, 0.1]]), mapChance: 0.15,
            golden: Object.freeze([[Object.freeze(['catalystFire','catalystCold','catalystLight','catalystChaos','catalystCrit','catalystSummon']), 2]]),
            chest: Object.freeze([Object.freeze(['catalystFire','catalystCold','catalystLight','catalystChaos','catalystCrit','catalystSummon']), 1]),
            // 지역 기폭제: 목록에서 고를 때 encounterRegionShare만큼 그 지도 지역의 것(줄기는 치명)이 나온다.
            regionKeys: Object.freeze({ garden: 'catalystFire', sanctum: 'catalystCold', canopy: 'catalystLight', roots: 'catalystChaos', trunk: 'catalystCrit' }) }),
        // 시든 정원(12번 루프 36, data/garden-oils.js): 시든 무리(카오스로 친다, 마른 잎 테와 꽃잎)가 정원 기름을 떨어뜨린다. 루프 36부터,
        // 깊은 뿌리 지도에서 두 배. 방을 비우면 무작위 한 색의 기름 2 + 등급당 0.15.
        // 묘목장(12번 루프 39, data/stump-nursery.js): 묘목 무리(초록 테와 잎사귀)가 그 지도 지역 색의 씨앗과 수액을 떨어뜨리고, 방을 비우면
        // 하나는 반드시(js/atlas-run.js clearRoom). 루프 39부터, 하늘 가지 지도에서 두 배.
        nursery: Object.freeze({ name: '묘목장', chance: 8, packExtra: 2, prefix: '묘목', minLoop: 39, regionChance: Object.freeze({ canopy: 2 }),
            outline: '#7fd99a', sparks: '#b8f0a0', enemy: Object.freeze({ hp: 1.3, damage: 1.1, attack: 1.05, exp: 1.5 }),
            rewards: Object.freeze([['magicBud', 3, 0.2]]), mapChance: 0.15 }),
        witheredGarden: Object.freeze({ name: '시든 정원', chance: 8, packExtra: 3, prefix: '시든', minLoop: 36, regionChance: Object.freeze({ roots: 2 }),
            ele: 'chaos', outline: '#a8c97f', sparks: '#cfe0a0', enemy: Object.freeze({ hp: 1.4, damage: 1.2, attack: 1.1, exp: 1.6 }),
            rewards: Object.freeze([[Object.freeze(['oilFire','oilCold','oilLight','oilChaos']), 2, 0.15]]), mapChance: 0.15,
            golden: Object.freeze([[Object.freeze(['oilFire','oilCold','oilLight','oilChaos']), 2]]), chest: Object.freeze([Object.freeze(['oilFire','oilCold','oilLight','oilChaos']), 1]),
            // 지역 기름: 목록에서 고를 때 encounterRegionShare만큼 그 지도 지역의 색(줄기는 무작위)이 나온다.
            regionKeys: Object.freeze({ garden: 'oilFire', sanctum: 'oilCold', canopy: 'oilLight', roots: 'oilChaos' }) }),
        // 깨어난 뒤(late): 붉은 제단(총주교)과 푸른 제단(포식자). 방을 비우면 잉걸 · 허기의 즙(data/atlas-endgame.js altars).
        redAltar: Object.freeze({ name: '붉은 제단', chance: 12, packExtra: 3, prefix: '성화의', late: true, enemy: Object.freeze({ hp: 1.8, damage: 1.3, attack: 1.15, exp: 1.8 }),
            rewards: Object.freeze([['magicBud', 2, 0.2]]), mapChance: 0.1 }),
        blueAltar: Object.freeze({ name: '푸른 제단', chance: 12, packExtra: 3, prefix: '허기진', late: true, enemy: Object.freeze({ hp: 1.8, damage: 1.3, attack: 1.15, exp: 1.8 }),
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
    encounterLoopBonus: Object.freeze([Object.freeze({ loop: 50, extra: 1 }), Object.freeze({ loop: 75, extra: 1 })]),
    // 깨어난 뒤의 제단(late)은 콘텐츠 방 자리를 나눠 쓰지 않고 따로 이만큼까지(그래서 깨어나도 기존 방 확률이 줄지 않는다).
    altarLimit: 1,
    // 지역 수호자: 지역의 가장 안쪽 노드(칸 7 · 8)와 이어진 투기장. [보스 이름, 처치마다 주는 정점 파편(뿌리 입장권, null = 가장 적은 것), 보스 외형].
    // 수호자 지도석은 그 지역 13등급 이상 지도의 보스가 떨어뜨린다(수호자 노드가 열려 있을 때).
    guardians: Object.freeze({
        roots: Object.freeze(['수호자 「검은 뿌리」', 'uberRootTicketChaos', 9]),
        trunk: Object.freeze(['수호자 「나이테 왕」', null, 7]),
        canopy: Object.freeze(['수호자 「폭풍 날개」', 'uberRootTicketStorm', 8]),
        garden: Object.freeze(['수호자 「잿불 정원사」', 'uberRootTicketFlame', 4]),
        sanctum: Object.freeze(['수호자 「서리 눈」', 'uberRootTicketFrost', 3])
    }),
    guardianRules: Object.freeze({ tier: 16, minTier: 13, dropChance: 0.15, hpMul: 2.5, damageMul: 1.3, radius: 9 }),
    // 정점: 뿌리 입장권 4종을 하나씩 바쳐 여는 세계수의 그림자(3단계 보스). 처치마다 씨앗 하나(최대 4).
    pinnacle: Object.freeze({ name: '세계수의 그림자', boss: '세계수의 그림자', bossAct: 9, act: 1, stages: 3, hpMul: 4, damageMul: 1.5,
        tickets: Object.freeze(['uberRootTicketFlame', 'uberRootTicketFrost', 'uberRootTicketStorm', 'uberRootTicketChaos']),
        rewards: Object.freeze([['goldenRule', 2], ['sapBud', 3], ['formlessDew', 8]]) }),
    // 세계수 씨앗: 하나마다 모든 노드 등급 +2(최대 4개 → 24등급). 4개면 경계 너머의 루프 50 조건을 대신한다
    // (data/endgame-progression.js BEYOND_BOUNDARY_UNLOCK_SEEDS).
    seeds: Object.freeze({ max: 4, tierStep: 2 }),
    tierCap: 24,
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
safeExposeData({ ATLAS });
