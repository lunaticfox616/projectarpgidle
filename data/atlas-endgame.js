// 아틀라스 후반부 (docs/atlas-pinnacles-20261002.md 2-1, 3절): 세계수의 그림자(정점)를 처음 쓰러뜨리면 아틀라스가 깨어나 넓어진다.
// 리그닌 이야기에 맞춘 최종 보스 다섯(정원사의 메아리, 밑거름의 장로, 나이테를 엮는 자, 검은 태양의 대사제, 세계수를 갉는 자)과, 지도 속 콘텐츠 방마다의
// 리그 우두머리. 싸움은 아틀라스 지도 장치 런 그대로다(포털 · 보관 · 정산, js/atlas-run.js) — 다만 지도석 대신 재료를 바친다.
// 재료(items)와 진행(처치, 마름, 목격)은 루프를 넘어 남고 시대 재생 때 사라진다. 수치는 모두 첫 제안값이다.
const ATLAS_ENDGAME = Object.freeze({
    // 후반부 재료. 지역 수호자 가위 조각 다섯(정원사), 마름 조각 넷(장로), 초대장(나이테), 잉걸(대사제), 허기의 즙(갉는 자),
    // 리그 조각 넷(지도 속 방에서).
    items: Object.freeze({
        shearRoots: Object.freeze({ name: '뿌리 가위 조각', from: '수호자 「검은 뿌리」' }),
        shearTrunk: Object.freeze({ name: '줄기 가위 조각', from: '수호자 「나이테 왕」' }),
        shearCanopy: Object.freeze({ name: '가지 가위 조각', from: '수호자 「폭풍 날개」' }),
        shearGarden: Object.freeze({ name: '정원 가위 조각', from: '수호자 「잿불 정원사」' }),
        shearSanctum: Object.freeze({ name: '성소 가위 조각', from: '수호자 「서리 눈」' }),
        rotHusk: Object.freeze({ name: '껍질 마름 조각', from: '껍질의 사도' }),
        rotSap: Object.freeze({ name: '수액 마름 조각', from: '수액의 사도' }),
        rotRoot: Object.freeze({ name: '뿌리 마름 조각', from: '뿌리의 사도' }),
        rotSeed: Object.freeze({ name: '씨앗 마름 조각', from: '씨앗의 사도' }),
        ringInvite: Object.freeze({ name: '나이테 초대장', from: '후반부 보스를 다섯 번 쓰러뜨릴 때마다' }),
        ember: Object.freeze({ name: '성화 잉걸', from: '지도 속 붉은 제단' }),
        ichor: Object.freeze({ name: '허기의 즙', from: '지도 속 푸른 제단' }),
        voidSplinter: Object.freeze({ name: '공허 조각', from: '지도 속 공허 균열' }),
        royalHoney: Object.freeze({ name: '왕실 꿀', from: '지도 속 벌집' }),
        vaultKey: Object.freeze({ name: '금고 열쇠 조각', from: '지도 속 보물 방' }),
        starShard: Object.freeze({ name: '별 조각', from: '지도 속 운석 분화구' }),
        // 루프 30 뒤 방 넷의 리그 조각(2026-10-09).
        emberCinder: Object.freeze({ name: '타다 남은 불씨', from: '지도 속 잿불 터' }),
        amberDrop: Object.freeze({ name: '굳은 수액 방울', from: '지도 속 수액 상처' }),
        witheredPetal: Object.freeze({ name: '시든 꽃잎', from: '지도 속 시든 정원' }),
        saplingBud: Object.freeze({ name: '어린 눈', from: '지도 속 묘목장' })
    }),
    itemCap: 99,
    // 투기장 바닥 위험(시련 함정 양식, apexes[].hazard)이 기록과 쓰러짐 문구에 남는 이름. 원소는 그 보스의 ele.
    hazardName: '바닥 함정',
    // 지역 수호자 → 깨어난 뒤 처치마다 주는 가위 조각(지역 id).
    guardianShears: Object.freeze({ roots: 'shearRoots', trunk: 'shearTrunk', canopy: 'shearCanopy', garden: 'shearGarden', sanctum: 'shearSanctum' }),
    // 특수기: every 번째 공격마다 telegraph 모양(data/constants.js bossPatternProfiles)으로 피해 × damageMul. 나머지 공격은 전조.
    // damageMul은 기존 보스 양식의 최고치(1.55)를 넘지 않는다 — 전투력 추정(getMaximumBossPatternDamageMultiplier)이 그대로 맞는다.
    mechanics: Object.freeze({
        prune: Object.freeze({ name: '가지치기', every: 3, telegraph: 'lane', damageMul: 1.5 }),
        graft: Object.freeze({ name: '접붙이기', every: 3, telegraph: 'split', damageMul: 1.4 }),
        verdict: Object.freeze({ name: '밑거름의 판결', every: 4, telegraph: 'pulse', damageMul: 1.55 }),
        decay: Object.freeze({ name: '썩음 번짐', every: 3, telegraph: 'ring', damageMul: 1.45 }),
        swarm: Object.freeze({ name: '사도들의 행진', every: 3, telegraph: 'wave', damageMul: 1.4 }),
        compost: Object.freeze({ name: '밑거름 삼키기', every: 2, telegraph: 'pulse', damageMul: 1.35 }),
        weave: Object.freeze({ name: '나이테 엮기', every: 3, telegraph: 'fan', damageMul: 1.4 }),
        echo: Object.freeze({ name: '엮인 기억', every: 3, telegraph: 'impact', damageMul: 1.45 }),
        memory: Object.freeze({ name: '되감긴 나이테', every: 2, telegraph: 'wave', damageMul: 1.4 }),
        pyre: Object.freeze({ name: '성화', every: 3, telegraph: 'ring', damageMul: 1.5 }),
        hymn: Object.freeze({ name: '부제들의 성가', every: 3, telegraph: 'fan', damageMul: 1.35 }),
        blackSun: Object.freeze({ name: '검은 태양', every: 3, telegraph: 'beam', damageMul: 1.55 }),
        gnaw: Object.freeze({ name: '갉아먹기', every: 3, telegraph: 'charge', damageMul: 1.5 }),
        tendril: Object.freeze({ name: '뿌리 촉수', every: 3, telegraph: 'lane', damageMul: 1.4 }),
        hunger: Object.freeze({ name: '모두 삼키기', every: 2, telegraph: 'pulse', damageMul: 1.4 }),
        rift: Object.freeze({ name: '공허 가르기', every: 3, telegraph: 'beam', damageMul: 1.45 }),
        sting: Object.freeze({ name: '여왕의 독침', every: 3, telegraph: 'split', damageMul: 1.4 }),
        vault: Object.freeze({ name: '금고 봉인', every: 4, telegraph: 'ring', damageMul: 1.5 }),
        starfall: Object.freeze({ name: '별똥 비', every: 3, telegraph: 'impact', damageMul: 1.5 }),
        // 루프 30 뒤 방 넷의 리그 우두머리(2026-10-09).
        cinderRain: Object.freeze({ name: '잿불 비', every: 3, telegraph: 'impact', damageMul: 1.5 }),
        ashTide: Object.freeze({ name: '재의 물결', every: 3, telegraph: 'wave', damageMul: 1.45 }),
        amberSeal: Object.freeze({ name: '호박 굳히기', every: 4, telegraph: 'ring', damageMul: 1.55 }),
        sapBurst: Object.freeze({ name: '수액 분출', every: 3, telegraph: 'split', damageMul: 1.4 }),
        witherBloom: Object.freeze({ name: '시든 꽃가루', every: 3, telegraph: 'pulse', damageMul: 1.4 }),
        thornLash: Object.freeze({ name: '가시 채찍', every: 3, telegraph: 'lane', damageMul: 1.45 }),
        saplingRush: Object.freeze({ name: '묘목 돌진', every: 3, telegraph: 'charge', damageMul: 1.45 }),
        rootSnare: Object.freeze({ name: '뿌리 올가미', every: 3, telegraph: 'fan', damageMul: 1.4 })
    }),
    // 최종 보스. tier = 기본 등급(씨앗마다 2씩 오른다, 24까지). act = 투기장 액트 지도(보스 방 앞에서 시작), bossAct = 그림(액트 보스 0~9).
    // how: 최종 보기 카드의 한 줄(바칠 재료를 얻는 곳).
    // unlock: 'awakened'(그림자 첫 처치) 또는 { kill: 노드 id }. entry: 바칠 재료. stages: 차례로 나오는 몸(4까지) — name, bossAct, mechanic,
    // echo(나이테: 목격한 보스의 메아리, 번호는 최근 순). hazard: 바닥 위험(시련 함정 양식).
    apexes: Object.freeze([
        Object.freeze({
            id: 'apex_gardener', name: '정원사의 메아리', domain: '정원사의 정원', act: 6, bossAct: 5, ele: 'phys', tier: 18,
            how: '깨어난 뒤 지역 수호자를 쓰러뜨리면 그 지역의 가위 조각을 줍니다.',
            unlock: 'awakened', entry: Object.freeze([['shearRoots', 1], ['shearTrunk', 1], ['shearCanopy', 1], ['shearGarden', 1], ['shearSanctum', 1]]),
            hpMul: 5, damageMul: 1.6, hazard: Object.freeze({ pattern: 'line', warningMs: 1700, intervalMs: 6200 }),
            stages: Object.freeze([
                Object.freeze({ name: '정원사의 메아리', bossAct: 5, mechanic: 'prune' }),
                Object.freeze({ name: '접붙이는 정원사', bossAct: 5, mechanic: 'graft' }),
                Object.freeze({ name: '판결하는 정원사', bossAct: 5, mechanic: 'verdict' })
            ]),
            rewards: Object.freeze([['goldenRule', 3], ['sapBud', 4], ['formlessDew', 10]]), unique: '정원사의 가지 왕관'
        }),
        Object.freeze({
            id: 'apex_compost', name: '밑거름의 장로', domain: '밑거름의 우물', act: 5, bossAct: 0, ele: 'chaos', tier: 20,
            how: '마름이 번진 지도의 사도를 쓰러뜨리면 마름 조각을 줍니다.',
            unlock: Object.freeze({ kill: 'apex_gardener' }), entry: Object.freeze([['rotHusk', 1], ['rotSap', 1], ['rotRoot', 1], ['rotSeed', 1]]),
            hpMul: 5.5, damageMul: 1.7, hazard: Object.freeze({ pattern: 'pool', warningMs: 1650, intervalMs: 5600 }),
            stages: Object.freeze([
                Object.freeze({ name: '밑거름의 장로', bossAct: 0, mechanic: 'decay' }),
                Object.freeze({ name: '마름의 사도들', bossAct: 6, mechanic: 'swarm' }),
                Object.freeze({ name: '깨어난 장로', bossAct: 0, mechanic: 'compost' })
            ]),
            rewards: Object.freeze([['goldenRule', 3], ['blightSpore', 6], ['emberBranch', 3]]), unique: '장로의 썩은 심장'
        }),
        Object.freeze({
            id: 'apex_weaver', name: '나이테를 엮는 자', domain: '나이테의 방', act: 10, bossAct: 8, ele: 'chaos', tier: 22,
            how: '후반부 보스를 다섯 번 쓰러뜨릴 때마다 초대장을 받습니다.',
            unlock: 'awakened', entry: Object.freeze([['ringInvite', 1]]),
            hpMul: 6, damageMul: 1.75, hazard: null,
            stages: Object.freeze([
                Object.freeze({ name: '나이테를 엮는 자', bossAct: 8, mechanic: 'weave' }),
                Object.freeze({ echo: 0, mechanic: 'echo' }),
                Object.freeze({ echo: 1, mechanic: 'echo' }),
                Object.freeze({ name: '나이테를 엮는 자', bossAct: 8, mechanic: 'memory' })
            ]),
            rewards: Object.freeze([['goldenRule', 5], ['sapBud', 6], ['emberBranch', 4]]), unique: '엮인 나이테'
        }),
        Object.freeze({
            id: 'apex_archbishop', name: '검은 태양의 대사제', domain: '황금 길의 끝', act: 2, bossAct: 1, ele: 'fire', tier: 20,
            how: '지도 속 붉은 제단을 비우면 성화 잉걸을 줍니다.',
            unlock: 'awakened', entry: Object.freeze([['ember', 10]]),
            hpMul: 6, damageMul: 1.7, hazard: Object.freeze({ pattern: 'cross', warningMs: 1550, intervalMs: 5000 }),
            stages: Object.freeze([
                Object.freeze({ name: '성화를 든 대사제', bossAct: 1, mechanic: 'pyre' }),
                Object.freeze({ name: '부제들의 성가대', bossAct: 7, mechanic: 'hymn' }),
                Object.freeze({ name: '검은 태양의 대사제', bossAct: 1, mechanic: 'blackSun' })
            ]),
            rewards: Object.freeze([['goldenRule', 3], ['emberBranch', 6], ['magicBud', 30]]), unique: '대사제의 성화 장갑'
        }),
        Object.freeze({
            id: 'apex_devourer', name: '세계수를 갉는 자', domain: '허기의 둥지', act: 3, bossAct: 2, ele: 'chaos', tier: 20,
            how: '지도 속 푸른 제단을 비우면 허기의 즙을 줍니다.',
            unlock: 'awakened', entry: Object.freeze([['ichor', 10]]),
            hpMul: 6, damageMul: 1.7, hazard: Object.freeze({ pattern: 'block', warningMs: 1550, intervalMs: 4800 }),
            stages: Object.freeze([
                Object.freeze({ name: '갉는 자', bossAct: 2, mechanic: 'gnaw' }),
                Object.freeze({ name: '뿌리 촉수 무리', bossAct: 6, mechanic: 'tendril' }),
                Object.freeze({ name: '끝없는 허기', bossAct: 2, mechanic: 'hunger' })
            ]),
            rewards: Object.freeze([['goldenRule', 3], ['formlessDew', 16], ['sapBud', 4]]), unique: '갉는 자의 이빨띠'
        })
    ]),
    // 리그 우두머리: 지도 속 콘텐츠 방(data/atlas.js encounters)이 깨어난 뒤 그 리그의 조각도 준다. 조각 need개로 우두머리와 싸운다.
    // need는 제단 재료(잉걸 10)와 지도 수가 비슷하도록: 방이 제단보다 드물고(5~9 %), 방마다 조각 3 + 0.15 × 등급.
    leagues: Object.freeze([
        Object.freeze({
            id: 'league_breach', room: 'breach', name: '공허 균열', boss: '공허를 여는 자', act: 8, bossAct: 7, ele: 'chaos', tier: 16,
            how: '지도 속 공허 균열을 비우면 공허 조각을 줍니다.',
            item: 'voidSplinter', need: 12, shards: Object.freeze([3, 0.15]), hpMul: 3.5, damageMul: 1.45,
            stages: Object.freeze([
                Object.freeze({ name: '공허를 여는 자', bossAct: 7, mechanic: 'rift' }),
                Object.freeze({ name: '열린 공허의 군주', bossAct: 7, mechanic: 'rift' })
            ]),
            rewards: Object.freeze([['voidChisel', 8], ['jewelShard', 4]]), unique: '대균열의 왕관'
        }),
        Object.freeze({
            id: 'league_hive', room: 'hive', name: '벌집', boss: '벌집 여왕', act: 9, bossAct: 8, ele: 'chaos', tier: 16, bodyVisual: 'hive-queen',
            how: '지도 속 벌집을 비우면 왕실 꿀을 줍니다.',
            item: 'royalHoney', need: 12, shards: Object.freeze([3, 0.15]), hpMul: 3.5, damageMul: 1.45,
            stages: Object.freeze([
                Object.freeze({ name: '벌집 여왕', bossAct: 8, mechanic: 'sting' }),
                Object.freeze({ name: '분노한 벌집 여왕', bossAct: 8, mechanic: 'sting' })
            ]),
            rewards: Object.freeze([['venomStinger', 3], ['enchantedHoney', 1], ['pollen', 30]]), unique: '벌집 여왕의 명령'
        }),
        Object.freeze({
            id: 'league_treasure', room: 'treasure', name: '보물 방', boss: '금고지기', act: 4, bossAct: 3, ele: 'phys', tier: 16,
            how: '지도 속 보물 방을 비우면 금고 열쇠 조각을 줍니다.',
            item: 'vaultKey', need: 12, shards: Object.freeze([3, 0.15]), hpMul: 3.5, damageMul: 1.45,
            stages: Object.freeze([
                Object.freeze({ name: '금고지기', bossAct: 3, mechanic: 'vault' }),
                Object.freeze({ name: '봉인을 푼 금고지기', bossAct: 3, mechanic: 'vault' })
            ]),
            rewards: Object.freeze([['magicBud', 30], ['formlessDew', 10], ['sapBud', 3], ['goldenRule', 1]]), unique: '금고지기의 열쇠꾸러미'
        }),
        Object.freeze({
            id: 'league_meteor', room: 'meteor', name: '운석 분화구', boss: '검은 별의 심장', act: 7, bossAct: 9, ele: 'light', tier: 16,
            how: '지도 속 운석 분화구를 비우면 별 조각을 줍니다.',
            item: 'starShard', need: 12, shards: Object.freeze([3, 0.15]), hpMul: 3.5, damageMul: 1.45,
            stages: Object.freeze([
                Object.freeze({ name: '검은 별의 심장', bossAct: 9, mechanic: 'starfall' }),
                Object.freeze({ name: '타오르는 검은 별', bossAct: 9, mechanic: 'starfall' })
            ]),
            rewards: Object.freeze([['skyEssence', 6], ['goldenRule', 1]]), unique: '낙성의 발자취'
        }),
        // 루프 30 뒤 방 넷(2026-10-09): 그 방의 지역 투기장(act)과 원소, 18등급. 카드는 방이 나오는 루프(minLoop)부터 열린다
        // (js/atlas-endgame.js unlocked). 고유는 이 우두머리만 준다(data/items.js 리그 우두머리 고유).
        Object.freeze({
            id: 'league_ember', room: 'emberField', name: '잿불 터', boss: '잿불 군주', act: 2, bossAct: 4, ele: 'fire', tier: 18,
            how: '지도 속 잿불 터를 비우면 타다 남은 불씨를 줍니다.',
            item: 'emberCinder', need: 12, shards: Object.freeze([3, 0.15]), hpMul: 3.6, damageMul: 1.45,
            stages: Object.freeze([
                Object.freeze({ name: '잿불 군주', bossAct: 4, mechanic: 'cinderRain' }),
                Object.freeze({ name: '다시 타오른 잿불 군주', bossAct: 4, mechanic: 'ashTide' })
            ]),
            rewards: Object.freeze([['burningEmberBranch', 2], ['emberBranch', 8], ['goldenRule', 1]]), unique: '잿불 군주의 심장'
        }),
        Object.freeze({
            id: 'league_sap', room: 'sapWound', name: '수액 상처', boss: '호박 거인', act: 7, bossAct: 6, ele: 'phys', tier: 18,
            how: '지도 속 수액 상처를 비우면 굳은 수액 방울을 줍니다.',
            item: 'amberDrop', need: 12, shards: Object.freeze([3, 0.15]), hpMul: 3.6, damageMul: 1.45,
            stages: Object.freeze([
                Object.freeze({ name: '호박 거인', bossAct: 6, mechanic: 'amberSeal' }),
                Object.freeze({ name: '금이 간 호박 거인', bossAct: 6, mechanic: 'sapBurst' })
            ]),
            rewards: Object.freeze([['catalystCrit', 2], ['catalystSummon', 1], ['sapBud', 2]]), unique: '호박에 갇힌 시간'
        }),
        Object.freeze({
            id: 'league_withered', room: 'witheredGarden', name: '시든 정원', boss: '시든 꽃의 여왕', act: 1, bossAct: 0, ele: 'chaos', tier: 18,
            how: '지도 속 시든 정원을 비우면 시든 꽃잎을 줍니다.',
            item: 'witheredPetal', need: 12, shards: Object.freeze([3, 0.15]), hpMul: 3.6, damageMul: 1.45,
            stages: Object.freeze([
                Object.freeze({ name: '시든 꽃의 여왕', bossAct: 0, mechanic: 'witherBloom' }),
                Object.freeze({ name: '가시를 두른 여왕', bossAct: 0, mechanic: 'thornLash' })
            ]),
            rewards: Object.freeze([['oilFire', 2], ['oilCold', 2], ['oilLight', 2], ['oilChaos', 2]]), unique: '마른 꽃잎 고리'
        }),
        Object.freeze({
            id: 'league_nursery', room: 'nursery', name: '묘목장', boss: '묘목장의 어미나무', act: 3, bossAct: 8, ele: 'light', tier: 18,
            how: '지도 속 묘목장을 비우면 어린 눈을 줍니다.',
            item: 'saplingBud', need: 12, shards: Object.freeze([3, 0.15]), hpMul: 3.6, damageMul: 1.45,
            stages: Object.freeze([
                Object.freeze({ name: '묘목장의 어미나무', bossAct: 8, mechanic: 'saplingRush' }),
                Object.freeze({ name: '뿌리를 뻗은 어미나무', bossAct: 8, mechanic: 'rootSnare' })
            ]),
            rewards: Object.freeze([['blightSpore', 6], ['magicBud', 20], ['sapBud', 2]]), unique: '어미나무의 손길'
        })
    ]),
    // 정원사를 처음 쓰러뜨린 뒤부터 지도를 마칠 때마다 그 지역의 마름이 1씩 오른다(10까지). 마름 n인 지역의 지도는 n × chancePerLevel %로
    // 보스 대신 마름의 사도가 지키고, 사도는 자기 마름 조각을 준다.
    blight: Object.freeze({ max: 10, perMap: 1, chancePerLevel: 8, hpMul: 1.6, damageMul: 1.25 }),
    apostles: Object.freeze([
        Object.freeze({ id: 'apostleRoot', name: '뿌리의 사도', item: 'rotRoot', bossAct: 0, regions: Object.freeze(['roots']) }),
        Object.freeze({ id: 'apostleHusk', name: '껍질의 사도', item: 'rotHusk', bossAct: 6, regions: Object.freeze(['trunk', 'sanctum']) }),
        Object.freeze({ id: 'apostleSeed', name: '씨앗의 사도', item: 'rotSeed', bossAct: 8, regions: Object.freeze(['canopy']) }),
        Object.freeze({ id: 'apostleSap', name: '수액의 사도', item: 'rotSap', bossAct: 4, regions: Object.freeze(['garden']) })
    ]),
    // 나이테를 엮는 자는 깨어난 뒤의 후반부 보스(수호자 · 정점 · 사도 · 최종 보스 · 리그 우두머리) 처치를 목격한다.
    // per번마다 초대장 하나(재료 한도까지). 싸움의 메아리는 가장 최근에 목격한 보스들이다(keep개를 기억, 생명력 × echoHpMul).
    witness: Object.freeze({ per: 5, keep: 6, echoHpMul: 0.6 }),
    // 제단: 깨어난 뒤 지도마다 chance %로 붉은 제단(대사제)과 푸른 제단(갉는 자) 방이 콘텐츠 방과 따로 altarLimit개까지 생긴다
    // (data/atlas.js encounters, js/atlas-encounters.js roll). 방을 비우면 그 재료.
    altars: Object.freeze({
        redAltar: Object.freeze({ item: 'ember', amount: Object.freeze([2, 0.12]) }),
        blueAltar: Object.freeze({ item: 'ichor', amount: Object.freeze([2, 0.12]) })
    }),
    // 처음 쓰러뜨리면 고유 장비가 반드시, 그 뒤로는 uniqueChance로.
    uniqueChance: Object.freeze({ apex: 0.25, league: 0.15 })
});
safeExposeData({ ATLAS_ENDGAME });
