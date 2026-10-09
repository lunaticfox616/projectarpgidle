// 기억의 잎(2026-10-09, docs/endgame-loot-20261009.md): 세계수가 기억하는 장면이 잎 한 장에 담겨 아틀라스 지도에서 떨어진다. 같은 잎을
// set장 모아 엮으면 reward를 받는다(js/memory-leaves.js, 기록 창 도감의 '기억의 잎'). 잎은 루프를 넘어 남는다(game.atlas.leaves).
// source: region(그 지역 지도), boss(지도 보스), golden(황금 방 몬스터), treasure(보물 무리의 대장), any(어느 지도나). minTier 이상 지도만.
// weight: 한 처치에서 잎이 나올 때 같은 자리의 잎끼리 나눌 비중(큰 묶음일수록 낮다).
// reward: currency [[키, 개수], …] | pick [[키, 개수], …](그중 하나) | unique 이름 | gear {slot, rarity, count} | maps {rarity, count, tierUp}
//         | chase true(체이싱 고유 하나). 모든 수치는 첫 제안값이다(드랍 시뮬레이터로 판마다 잎을 본다).
const MEMORY_LEAVES = Object.freeze({
    // 아틀라스 지도 처치마다 잎이 나올 확률(등급별). 보물 무리의 대장은 treasureMul배.
    chance: Object.freeze({ regular: 0.004, elite: 0.05, boss: 0.35 }),
    treasureMul: 40,
    countCap: 999,
    tone: '#9fe0c0',
    list: Object.freeze([
        { id: 'roots_spring', name: '검은 수액 샘의 잎', set: 3, weight: 3, source: Object.freeze({ region: 'roots' }),
            reward: Object.freeze({ currency: Object.freeze([['fossil', 6], ['fossilPrimal', 2]]) }) },
        { id: 'roots_hive', name: '균사 여왕의 잎', set: 5, weight: 2, source: Object.freeze({ region: 'roots' }),
            reward: Object.freeze({ currency: Object.freeze([['oilChaos', 3], ['catalystChaos', 3]]) }) },
        { id: 'roots_heart', name: '뿌리 심장의 잎', set: 7, weight: 1, minTier: 10, source: Object.freeze({ region: 'roots' }),
            reward: Object.freeze({ unique: '큰뱀의 송곳니' }) },
        { id: 'trunk_ring', name: '나이테 기록관의 잎', set: 3, weight: 3, source: Object.freeze({ region: 'trunk' }),
            reward: Object.freeze({ currency: Object.freeze([['rootIron', 3], ['deepWhetstone', 3]]) }) },
        { id: 'trunk_knight', name: '쪼개진 기사의 잎', set: 5, weight: 2, source: Object.freeze({ region: 'trunk' }),
            reward: Object.freeze({ gear: Object.freeze({ slot: '무기', rarity: 'rare', count: 3 }) }) },
        { id: 'trunk_throne', name: '줄기 옥좌의 잎', set: 7, weight: 1, minTier: 10, source: Object.freeze({ region: 'trunk' }),
            reward: Object.freeze({ unique: '왕을 베는 고목' }) },
        { id: 'canopy_nest', name: '폭풍 둥지의 잎', set: 3, weight: 3, source: Object.freeze({ region: 'canopy' }),
            reward: Object.freeze({ currency: Object.freeze([['skyEssence', 6]]) }) },
        { id: 'canopy_star', name: '별가지 사수의 잎', set: 5, weight: 2, source: Object.freeze({ region: 'canopy' }),
            reward: Object.freeze({ currency: Object.freeze([['awakenedEcho', 2], ['condensedSkyPower', 3]]) }) },
        { id: 'canopy_altar', name: '꼭대기 제단의 잎', set: 7, weight: 1, minTier: 10, source: Object.freeze({ region: 'canopy' }),
            reward: Object.freeze({ unique: '폭풍 군단장의 창끝' }) },
        { id: 'garden_ash', name: '잿빛 화원의 잎', set: 3, weight: 3, source: Object.freeze({ region: 'garden' }),
            reward: Object.freeze({ currency: Object.freeze([['emberBranch', 4]]) }) },
        { id: 'garden_wall', name: '불꽃 덩굴 성벽의 잎', set: 5, weight: 2, source: Object.freeze({ region: 'garden' }),
            reward: Object.freeze({ currency: Object.freeze([['burningEmberBranch', 1], ['oilFire', 3]]) }) },
        { id: 'garden_tomb', name: '첫 정원사의 잎', set: 7, weight: 1, minTier: 10, source: Object.freeze({ region: 'garden' }),
            reward: Object.freeze({ unique: '화염 군주의 숨결' }) },
        { id: 'sanctum_library', name: '봉인 서고의 잎', set: 3, weight: 3, source: Object.freeze({ region: 'sanctum' }),
            reward: Object.freeze({ currency: Object.freeze([['sealShard', 6]]) }) },
        { id: 'sanctum_court', name: '빙결 재판관의 잎', set: 5, weight: 2, source: Object.freeze({ region: 'sanctum' }),
            reward: Object.freeze({ currency: Object.freeze([['strongSealShard', 3], ['oilCold', 3]]) }) },
        { id: 'sanctum_eye', name: '잠든 눈의 잎', set: 7, weight: 1, minTier: 10, source: Object.freeze({ region: 'sanctum' }),
            reward: Object.freeze({ unique: '서리 여제의 인장' }) },
        { id: 'boss_crown', name: '쓰러진 왕관의 잎', set: 5, weight: 3, source: Object.freeze({ boss: true }),
            reward: Object.freeze({ currency: Object.freeze([['goldenRule', 1], ['sapBud', 3]]) }) },
        { id: 'boss_shadow', name: '그림자 뿌리의 잎', set: 6, weight: 2, minTier: 13, source: Object.freeze({ boss: true }),
            reward: Object.freeze({ pick: Object.freeze([['uberRootTicketFlame', 1], ['uberRootTicketFrost', 1], ['uberRootTicketStorm', 1],
                ['uberRootTicketChaos', 1]]) }) },
        { id: 'golden_harvest', name: '황금 수확의 잎', set: 4, weight: 3, source: Object.freeze({ golden: true }),
            reward: Object.freeze({ currency: Object.freeze([['goldenRule', 2]]) }) },
        { id: 'treasure_belt', name: '보물 운반자의 잎', set: 5, weight: 3, source: Object.freeze({ treasure: true }),
            reward: Object.freeze({ unique: '보물 사냥꾼의 띠' }) },
        { id: 'treasure_ring', name: '요정 고리의 잎', set: 9, weight: 1, source: Object.freeze({ treasure: true }),
            reward: Object.freeze({ currency: Object.freeze([['fairyRing', 1]]) }) },
        { id: 'map_maker', name: '지도 제작자의 잎', set: 3, weight: 3, source: Object.freeze({ any: true }),
            reward: Object.freeze({ maps: Object.freeze({ rarity: 'rare', count: 2, tierUp: 1 }) }) },
        { id: 'workshop', name: '공방의 잎', set: 4, weight: 3, source: Object.freeze({ any: true }),
            reward: Object.freeze({ currency: Object.freeze([['sapBud', 4], ['formlessDew', 6]]) }) },
        { id: 'lighthouse', name: '등대지기의 잎', set: 6, weight: 1, minTier: 14, source: Object.freeze({ any: true }),
            reward: Object.freeze({ unique: '등대지기의 눈' }) },
        { id: 'chase', name: '체이싱의 잎', set: 12, weight: 1, minTier: 16, source: Object.freeze({ any: true }),
            reward: Object.freeze({ chase: true }) }
    ].map(Object.freeze))
});
safeExposeData({ MEMORY_LEAVES });
