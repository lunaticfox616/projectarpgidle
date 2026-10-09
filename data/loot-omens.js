// 지도 기운과 보물 무리(2026-10-09 사용자 "POE식으로 정말 다양한 아이템 종류가 매판 다르게 드랍되는 느낌", docs/endgame-loot-20261009.md).
// 기운: 아틀라스 지도석(지도 노드의 것)마다 하나가 붙어 그 지도에서 무엇이 잘 나오는지 정한다(js/loot-omens.js). 지도석 희귀도가 세기를
// 정한다(strength, 타락이면 corrupted만큼 더). weight는 뽑힐 비중이고, 그 기운이 줄 것이 아직 하나도 열리지 않았으면 뽑히지 않는다.
//   drops: 처치마다 chance[등급] × 세기로 목록에서 가중치로 하나를 떨어뜨린다(보스는 bossRolls번 더). '@jewel'은 재화가 아니라 주얼
//          한 개. [키, 가중치, 개수]. gemMul: 그 지도 몬스터의 젬 보상 확률 배율(세기만큼). jewel: 그 지도의 '@jewel'이 희귀(rare),
//          고유(unique)일 확률(세기를 곱한다).
//   gear: 장비 기대 개수 배율(quantity), 부위 가중치(slots), 고유 확률 배율(unique), 드랍 변형 배율(variant: 복제, 묶음, 타락).
//          배율은 세기만큼 커진다: 1 + (값 − 1) × 세기.
//   bonus: 그 지도 런의 아틀라스 효과(data/atlas-passives.js labels의 키)에 값 × 세기를 더한다.
// 보물 무리: 지도의 보통 무리가 treasure.packChance로 "보물을 품은" 무리가 되고, 금빛 테를 두른 그 무리의 일반 몬스터 하나가 쓰러지면
// 기운 하나의 목록에서 rolls번, 희귀 장비 rareGear개, uniqueChance로 고유 하나를 쏟아낸다. 그중 golden.chance는 황금 보물이다.
// 모든 수치는 첫 제안값이다(드랍 시뮬레이터 `npm run drop:sim`, 명령줄 `node scripts/drop-simulate.js`).
const LOOT_OMENS = Object.freeze({
    strength: Object.freeze({ normal: 1, magic: 1.5, rare: 2, corrupted: 0.5 }),
    chance: Object.freeze({ regular: 0.05, elite: 0.3, boss: 1 }),
    bossRolls: 3,
    // 떠도는 기운(2026-10-09 사용자: 마법의 새싹은 그대로, 다른 재화를 더): 지도의 기운과 상관없이 정예는 stray.elite 확률로 한 번,
    // 보스는 stray.boss번 다른 처치 드랍 기운 하나에서 뽑는다. 기운이 처치 드랍이 아닌 지도도 판마다 재화의 색이 섞인다.
    stray: Object.freeze({ elite: 0.25, boss: 2 }),
    // 지도의 고유 배율(2026-10-09 사용자: 고유 20판에 하나 → 10판에 하나): 지도 몬스터와 상자의 고유 확률에 곱한다. 고유의 메아리는 그 위에 곱한다.
    uniqueMul: 1.5,
    // 지도 몬스터의 장비(2026-10-09 사용자: 몬스터를 잡는 맛): 일반과 정예 처치의 장비 기대 개수 배율. 상자와 보스 몫은 그대로다.
    killGearMul: 2.2,
    // 지도 보스의 보상(2026-10-09 사용자: 보스가 클라이맥스가 아니다): 장비 items개(extraChance로 하나 더), 앞의 장비부터 minimum의 희귀도
    // 이상. 고유 몫은 보물 무리와 상자에 있으므로 일반 몬스터의 희귀도 띠로 굴린다. 지도와 수호자 지도의 보스만(기억 싸움, 최종 싸움은 없다).
    mapBoss: Object.freeze({ items: 2, extraChance: 0.5, minimum: Object.freeze(['rare', 'magic']) }),
    // 좋은 희귀(2026-10-09): 그 장비가 가질 수 있는 가장 높은 band개 등급(affixTierCap에서 band − 1 아래까지) 안의 옵션이 good줄이면 좋은
    // 발견, great줄이면 큰 발견(js/loot.js lootMoments). 16등급 지도에서 희귀의 약 10%가 좋은, 1%가 큰 발견이다. 옵션 등급 상한이
    // minCap보다 낮은 장비(초반 지역)는 상위 4등급이 거의 모든 등급이라 따지지 않는다.
    fineRare: Object.freeze({ band: 4, good: 2, great: 3, minCap: 12 }),
    list: Object.freeze([
        { id: 'fossil', name: '화석 광맥', note: '화석이 자주 나옵니다', kind: 'drops', weight: 8, tone: '#c9a46a', drops: Object.freeze([
            ['fossil', 40], ['fossilJagged', 6], ['fossilBound', 6], ['fossilGale', 6], ['fossilPrismatic', 5], ['fossilBulwark', 5],
            ['fossilWedge', 5], ['fossilOld', 5], ['fossilRift', 5], ['fossilPrimal', 3], ['fossilAncientPrimal', 1], ['fossilPrimordial', 0.6],
            ['fossilAbyssal', 0.4]]) },
        { id: 'spore', name: '홀씨 비', note: '홀씨가 자주 나옵니다', kind: 'drops', weight: 7, tone: '#9fd46a', drops: Object.freeze([
            ['sporeFire', 1], ['sporeCold', 1], ['sporeLight', 1]]) },
        { id: 'tools', name: '장인의 연장', note: '숫돌, 뿌리철, 보석연마제가 나옵니다', kind: 'drops', weight: 6, tone: '#b8b0a0', drops: Object.freeze([
            ['deepWhetstone', 4], ['rootIron', 4], ['jewelPolish', 4], ['abyssCatalyst', 0.4]]) },
        { id: 'hive', name: '벌집 향기', note: '꽃가루와 벌집 재료가 나옵니다', kind: 'drops', weight: 6, tone: '#ffd25e', drops: Object.freeze([
            ['pollen', 10, 3], ['beeswax', 4], ['venomStinger', 2], ['hiveKey', 0.6], ['enchantedHoney', 0.3]]) },
        { id: 'sky', name: '별똥 비', note: '창공의 정수와 각성 잔향이 나옵니다', kind: 'drops', weight: 6, tone: '#8fd3ff', drops: Object.freeze([
            ['skyEssence', 10], ['condensedSkyPower', 2], ['awakenedEcho', 1.2]]) },
        { id: 'under', name: '지하 광맥', note: '지하계 광석과 룬 조각이 나옵니다', kind: 'drops', weight: 6, tone: '#d8a060', drops: Object.freeze([
            ['underCopper', 8], ['underSilver', 4], ['underGold', 2], ['runeShard', 3]]) },
        { id: 'seal', name: '봉인된 숨결', note: '봉인편린이 나옵니다', kind: 'drops', weight: 6, tone: '#c58cff', drops: Object.freeze([
            ['sealShard', 10], ['strongSealShard', 3], ['radiantSealShard', 0.25]]) },
        { id: 'ocean', name: '밀려온 물결', note: '암초 조각과 심해의 파편이 나옵니다', kind: 'drops', weight: 5, tone: '#6fa8d8', drops: Object.freeze([
            ['reefFragment', 6], ['oceanRerollShard', 3]]) },
        { id: 'ember', name: '잿불 기운', note: '잿불가지가 나옵니다', kind: 'drops', weight: 5, tone: '#ff8a3d', drops: Object.freeze([
            ['emberBranch', 10], ['burningEmberBranch', 0.3]]) },
        { id: 'keys', name: '열쇠 꾸러미', note: '보스 열쇠와 입장 증표가 나옵니다', kind: 'drops', weight: 5, tone: '#e8c27a', drops: Object.freeze([
            ['bossKeyFlame', 3], ['bossKeyFrost', 3], ['bossKeyStorm', 3], ['chaosKey', 2], ['coreKey', 1.5], ['trialKey3', 1], ['rivalKey', 0.6],
            ['beastKeyCerberus', 0.4]]) },
        { id: 'orbs', name: '재화 소나기', note: '제작 재화가 쏟아집니다', kind: 'drops', weight: 4, tone: '#f3d28c', drops: Object.freeze([
            ['magicBud', 10, 2], ['formlessDew', 5], ['blightSpore', 3], ['sapBud', 1.5], ['pruningShears', 1], ['goldenRule', 0.15],
            ['fairyRing', 0.01]]) },
        // 2026-10-10 사용자: 젬의 정원, 보석 광맥, 지도 제작자가 밋밋하면 상향. 젬 보상, 좋은 주얼, 높고 희귀한 지도석이 눈에 띄게 늘었다.
        { id: 'gems', name: '젬의 정원', note: '젬과 각성 잔향이 자주 나옵니다', kind: 'drops', weight: 5, tone: '#7fd99a', drops: Object.freeze([
            ['gemShard', 8], ['awakenedEcho', 3]]), gemMul: 4 },
        { id: 'jewels', name: '보석 광맥', note: '주얼이 많이, 더 좋게 나옵니다', kind: 'drops', weight: 5, tone: '#78cfff', drops: Object.freeze([
            ['jewelShard', 6], ['@jewel', 5]]), jewel: Object.freeze({ rare: 0.35, unique: 0.03 }) },
        { id: 'armory', name: '무기고', note: '무기가 많이 나옵니다', kind: 'gear', weight: 6, tone: '#e0a070',
            gear: Object.freeze({ quantity: 1.7, slots: Object.freeze({ 무기: 6 }) }) },
        { id: 'jewelry', name: '장신구 함', note: '목걸이, 반지, 허리띠가 많이 나옵니다', kind: 'gear', weight: 6, tone: '#e8c27a',
            gear: Object.freeze({ quantity: 1.7, slots: Object.freeze({ 목걸이: 3, 반지: 3, 허리띠: 3 }) }) },
        { id: 'armour', name: '갑주 창고', note: '방어구가 많이 나옵니다', kind: 'gear', weight: 6, tone: '#a8b8c8',
            gear: Object.freeze({ quantity: 1.7, slots: Object.freeze({ 투구: 2, 갑옷: 2, 장갑: 2, 신발: 2, 방패: 2 }) }) },
        { id: 'unique', name: '고유의 메아리', note: '고유 장비가 더 자주 나옵니다', kind: 'gear', weight: 3, tone: '#ffb35c',
            gear: Object.freeze({ quantity: 1.2, unique: 3 }) },
        { id: 'corrupt', name: '타락한 땅', note: '타락 장비가 자주 나옵니다', kind: 'gear', weight: 4, tone: '#e7685c',
            gear: Object.freeze({ quantity: 1.3, variant: Object.freeze({ corrupted: 6 }) }) },
        { id: 'twins', name: '쌍둥이 그림자', note: '같은 장비가 겹쳐 나옵니다', kind: 'gear', weight: 4, tone: '#c8b0e8',
            gear: Object.freeze({ quantity: 1.3, variant: Object.freeze({ duplicate: 6, bundle: 6 }) }) },
        { id: 'maps', name: '지도 제작자', note: '지도석이 많이, 더 좋고 높게 나옵니다', kind: 'bonus', weight: 5, tone: '#d9b066',
            bonus: Object.freeze({ mapDrop: 120, mapRarity: 120, mapQuality: 25, mapTierUp: 20 }) },
        { id: 'fragments', name: '각인 무덤', note: '각인이 자주 나옵니다', kind: 'bonus', weight: 4, tone: '#b8a1df',
            bonus: Object.freeze({ fragmentDrop: 250 }) },
        { id: 'chests', name: '보급 행렬', note: '보급 상자가 늘고 좋아집니다', kind: 'bonus', weight: 5, tone: '#e8c27a',
            bonus: Object.freeze({ chestExtra: 2, chestGrade: 80 }) },
        { id: 'rooms', name: '붐비는 방', note: '콘텐츠 방이 하나 더, 황금 방이 잘 생깁니다', kind: 'bonus', weight: 4, tone: '#ffd75e',
            bonus: Object.freeze({ encounterExtra: 1, goldenRoom: 10 }) },
        { id: 'elites', name: '정예 행렬', note: '정예가 늘고 희귀도가 오릅니다', kind: 'bonus', weight: 5, tone: '#ff9a76',
            bonus: Object.freeze({ extraElite: 40, rarity: 20 }) },
        { id: 'dreams', name: '보스의 꿈', note: '보스의 기억과 변이체가 잘 나옵니다', kind: 'bonus', weight: 3, tone: '#a8c0ff', minLoop: 33,
            bonus: Object.freeze({ memoryDrop: 150, variantChance: 15 }) }
    ].map(Object.freeze)),
    treasure: Object.freeze({ packChance: 0.035, rolls: 8, rareGear: 1, uniqueChance: 0.1, prefix: '보물을 품은', outline: '#ffd75e',
        sparks: '#fff1a8',
        // 황금 보물(체이싱 티어의 갈래): 보물 무리 중 chance가 황금 보물이 되어 rolls번, 고유 하나, jackpot 중 하나(요정의 고리나 체이싱 고유
        // '@chase')를 쏟는다. 무리 키의 해시로 정해진다(Math.random을 쓰지 않음).
        golden: Object.freeze({ chance: 0.04, rolls: 16, prefix: '황금 보물을 품은', outline: '#fff6d8', sparks: '#ffd75e',
            jackpot: Object.freeze([['fairyRing', 1], ['@chase', 1]]) }) }),
    // 발견 등급(js/loot.js lootMoments): 바닥 빛기둥과 소리(js/battle-ground-loot-ui.js), 지도 결과, 드랍 시뮬레이터가 같은 표를 쓴다.
    // jackpot(화면 이름은 체이싱 티어)은 숨 쉬는 굵은 붉은 금빛 빛기둥과 빛살, 붉은 금빛 알림, great는 빛기둥과 큰 소리, good은 반짝임.
    // 재화는 아래 목록이고(어느 콘텐츠에서나 드문 것만 jackpot과
    // great: 깊은 미궁은 원시 고대 화석과 심연 화석을 처치마다 몇 %씩 떨어뜨리므로 화석은 good. 찬란한 봉인편린은 사용자 결정으로 great),
    // 장비는 체이싱 고유 jackpot, 고유와 모든 줄이 특출한 베이스 great, 특출 줄과 타락과 소켓 good. 주얼은 고유 great, 희귀 good.
    // 야생 고유 부적 great. 보물 무리의 보물은 great, 황금 보물은 jackpot.
    moments: Object.freeze({
        jackpot: Object.freeze(['fairyRing', 'ouroboros']),
        great: Object.freeze(['goldenRule', 'burningEmberBranch', 'enchantedHoney', 'abyssCatalyst', 'beastKeyCerberus', 'rivalKey', 'radiantSealShard']),
        good: Object.freeze(['sapBud', 'fossilPrimal', 'fossilAncientPrimal', 'fossilPrimordial', 'fossilAbyssal', 'awakenedEcho', 'condensedSkyPower',
            'chaosKey', 'coreKey', 'strongSealShard', 'underGold', 'venomStinger', 'hiveKey', 'pruningShears', 'trialKey3', 'bossKeyFlame', 'bossKeyFrost',
            'bossKeyStorm'])
    })
});
safeExposeData({ LOOT_OMENS });
