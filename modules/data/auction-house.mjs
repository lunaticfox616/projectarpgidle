/**
 * 경매장(거래 창의 넷째 칸, 루프 20 해금). 입찰은 없고 모두 즉시 체결된다. 규칙은 modules/domain/auction-*.mjs, 저장은 game.auction.
 * 시세 구간(bucketMs)마다 시세 배율이 바뀌고, 상인 매물 한 묶음이 생기고(매물은 구간 안에서 하나씩 놓이고 하나씩 내려간다), 내 출품에 상인 수요가 한 번 붙는다.
 * 모든 수치가 이 표에 있다. 재료 기준가는 베일라의 표(NPC_CURRENCY_EXCHANGE.prices, 이슬 값이나 새싹 값을 표의 새싹 값으로 바꾼 값)만 쓴다: 두 번째 가격표는 없다.
 * 설계: docs/auction-house-plan-20261121.md(브랜치 auction-house-spec-20261121), 2026-11-22 검토로 고친 값이 여기 있다.
 */
// 경매장 재료의 묶음(차례가 화면과 시세 열쇠의 차례다). 아래 AUCTION_HOUSE.materials의 설명을 본다.
const MATERIAL_GROUPS = Object.freeze([
    Object.freeze({ id: 'craft', label: '특수 제작', keys: Object.freeze(['emberBranch', 'burningEmberBranch', 'voidChisel', 'venomStinger', 'enchantedHoney',
        'oceanRerollShard', 'altarEmber', 'altarIchor']) }),
    Object.freeze({ id: 'quality', label: '퀄리티', keys: Object.freeze(['deepWhetstone', 'rootIron', 'jewelPolish', 'abyssCatalyst']) }),
    Object.freeze({ id: 'catalyst', label: '기폭제', keys: Object.freeze(['catalystPhys', 'catalystFire', 'catalystCold', 'catalystLight', 'catalystChaos',
        'catalystCrit', 'catalystSummon']) }),
    Object.freeze({ id: 'oil', label: '기름', keys: Object.freeze(['oilFire', 'oilCold', 'oilLight', 'oilChaos']) }),
    Object.freeze({ id: 'fossil', label: '화석', keys: Object.freeze(['fossilBulwark', 'fossilWedge', 'fossilOld', 'fossilRift']) }),
    Object.freeze({ id: 'ticket', label: '입장권', keys: Object.freeze(['bossKeyFlame', 'bossKeyFrost', 'bossKeyStorm', 'beastKeyCerberus', 'trialKey3',
        'chaosKey', 'coreKey', 'hiveKey', 'colonyTrace']) }),
    Object.freeze({ id: 'stuff', label: '재료', keys: Object.freeze(['bossCore', 'underCopper', 'underSilver', 'underGold', 'skyEssence', 'jewelShard',
        'runeShard', 'pollen', 'beeswax', 'sealShard', 'strongSealShard', 'radiantSealShard', 'reefFragment', 'colonyShard']) })
]);

const AUCTION_HOUSE = Object.freeze({
    // 15분: 시세가 자주 바뀌어 다시 볼 까닭이 되면서도 매 틱 계산할 일은 없다(구간이 바뀔 때만 계산한다).
    bucketMs: 900000,
    // 오프라인 정산 상한 48구간 = 12시간: 가판대의 오프라인 상한과 같다. 시계를 크게 돌려도 이 이상은 정산하지 않는다.
    offlineBuckets: 48,
    // 시세 배율. factor(bucket, key) = round2(clamp(1 + 파도 + 잡음 + 사건 + 서버 보정)). 모든 플레이어가 같은 값을 본다(저장마다의
    // 씨앗이 들어가지 않는다). min/max가 무차익의 바탕이다: 최고 매도 실수령(0.85 x 1.15 x 0.92)이 최저 매수(1.15 x 0.85)보다 낮다.
    pulse: Object.freeze({
        min: 0.85, max: 1.15,
        wave: 0.06,         // 느린 파도: sin(bucket x 0.42 + 열쇠마다의 위상)
        noise: 0.04,        // 구간과 열쇠로 정해지는 잡음(±)
        eventBoost: 0.09,   // 사건이 띄우는 열쇠
        eventDip: -0.08,    // 사건이 누르는 열쇠
        history: 24,        // 그래프에 보이는 지난 구간 수(6시간)
        voteSwing: 0.06     // 서버 시세 보정(db/auction-hybrid-20261121.sql의 0.06과 같다)의 한도(±), 그래도 min/max 밖으로는 못 간다
    }),
    // 시세 사건: 구간 번호를 6으로 나눈 나머지로 돌아간다. boosts/dips는 계열이나 재료 열쇠다(띄우는 정도는 pulse.eventBoost/eventDip).
    events: Object.freeze([
        Object.freeze({ id: 'underworld_heat', title: '지하계 열기 고조',
            description: '지핵 도전자가 늘어 화염 계열 장비와 불씨 기름 수요가 급등했습니다.',
            boosts: Object.freeze(['fire', 'critical', 'oilFire', 'emberBranch']), dips: Object.freeze(['cold', 'armor', 'oilCold']) }),
        Object.freeze({ id: 'void_breach_surge', title: '공허 대균열 개방',
            description: '카오스 저항과 균열 화석, 공허의 끌 거래가 활발하고 물리 계열 매물 값이 내렸습니다.',
            boosts: Object.freeze(['chaos', 'spell', 'fossilRift', 'voidChisel', 'oilChaos']), dips: Object.freeze(['physical', 'attack', 'fossilJagged']) }),
        Object.freeze({ id: 'sky_storm_front', title: '수관 폭풍 전조',
            description: '창공의 탑 등반이 늘어 번개, 투사체 장비와 뇌우 기름 값이 올랐습니다.',
            boosts: Object.freeze(['light', 'projectile', 'oilLight', 'catalystCrit']), dips: Object.freeze(['summon', 'oilFire', 'catalystSummon']) }),
        Object.freeze({ id: 'labyrinth_rush', title: '고대 미궁 개방 주간',
            description: '화석 복원 수요가 몰려 심연, 프리즘 화석 값이 오르고 방어구 값이 내렸습니다.',
            boosts: Object.freeze(['fossilAbyssal', 'fossilPrismatic', 'summon']), dips: Object.freeze(['armor', 'resistance', 'oilLight']) }),
        Object.freeze({ id: 'cosmos_resonance', title: '성간 공명기',
            description: '치명타, 주문, 소환 장비와 기폭제, 공허의 끌 값이 함께 올랐습니다.',
            boosts: Object.freeze(['critical', 'spell', 'summon', 'catalystCrit', 'catalystSummon', 'voidChisel']), dips: Object.freeze(['physical', 'oilChaos']) }),
        Object.freeze({ id: 'guild_clearance', title: '대장장이 길드 정산',
            description: '물리, 방어 장비와 잿불가지, 톱니 화석 값이 올랐습니다.',
            boosts: Object.freeze(['physical', 'armor', 'fossilJagged', 'emberBranch']), dips: Object.freeze(['spell', 'critical', 'fossilRift']) })
    ]),
    // 장비 계열. 장비의 계열은 추가 옵션(stats)의 능력치 태그(STAT_AFFIX_TAGS)를 familyTags로 옮겨 가장 많이 모인 계열이다(같으면 이 순서가
    // 앞선 계열). 해당 태그가 없으면 무기는 attack, 나머지는 armor다.
    families: Object.freeze(['fire', 'cold', 'light', 'chaos', 'physical', 'critical', 'spell', 'summon', 'projectile', 'attack', 'armor', 'resistance']),
    // 능력치 태그(modules/data/affix-tags.mjs) -> 계열. 목록에 없는 태그(damage, elemental, speed, life 같은)는 세지 않는다.
    // 계열 이름은 따로 두지 않고 그 태그의 이름(AFFIX_TAG_LABELS, auctionHouse.familyLabel)을 쓴다: 12계열 모두 태그가 있다.
    familyTags: Object.freeze({ fire: 'fire', cold: 'cold', light: 'light', chaos: 'chaos', physical: 'physical', crit: 'critical', spell: 'spell',
        summon: 'summon', projectile: 'projectile', attack: 'attack', defense: 'armor', resistance: 'resistance' }),
    // 재료 거래: 열쇠는 재화 키. 모두 NPC_CURRENCY_EXCHANGE.prices에서 형체 없는 이슬이나 마법의 새싹(표의 새싹 값으로 이슬로 바꾼다)으로
    // 값이 매겨진 재화여야 한다(규칙이 확인한다). 화면은 groups의 차례로 묶어 보여 주고, keys는 그 차례의 한 줄 목록이다(시세 열쇠, 저장 복원,
    // db/auction-hybrid-20261121.sql의 pulse_keys가 이 차례를 쓴다). label은 지갑, 제작 보관함, 베일라 창이 이미 쓰는 이름이다.
    // bundle: 한 묶음의 개수. 한 묶음 값이 이슬 몇 개가 되게 해 반올림으로 값을 만들 수 없게 한다.
    // 고리 검사(2026-11-22, 사는 값 최저 0.9775 x 기준가, 파는 실수령 최고 0.899 x 기준가): 게임 안에서 기준가의 0.90배보다 싸게 얻거나
    // 0.9775배보다 비싸게 팔 길, 또는 바꿔서 늘릴 길이 있는 재화는 넣지 않는다. 뺀 것:
    //   형체 없는 이슬: 값을 치르는 재화다.
    //   수액 봉우리, 황금률: 암거래상에서 서로, 또 이슬과 바뀐다. 봉우리를 싸게 팔면 황금률 값이 반으로 준다.
    //   황금률로 값이 매겨진 재화(pruningShears, fairyRing, memoryImprint, omen 다섯, rivalKey, cosmosSovereignKey, uberRootTicket 넷, awakenedEcho)와
    //   ouroboros: 최상위 재화는 드랍과 베일라에만 둔다.
    //   미궁 화석, 원시 화석, 고대 원시 화석: 정제와 복원(modules/domain/rune-fossil-refining.mjs)이 공짜로 다른 화석과 재화를 낸다.
    //   톱니, 속박, 돌풍, 프리즘, 심연 화석: 베일라가 미궁 화석을 이슬 2개 안팎에 팔고 정제가 그것을 이 다섯 가운데 하나로 바꾼다(기준가 5 ~ 10).
    //   태고 화석: 베일라의 고대 원시 화석(이슬 54개부터)을 복원하면 태고 화석과 다른 화석, 황금률이 나와 여기서 팔면 값의 1.04배까지 돌아온다
    //   (황금률을 암거래상의 가장 좋은 교환 66 이슬로 셌을 때).
    //   마법의 새싹: 암거래상 교환이 새싹 5 ~ 7개에 이슬 1개를 준다(베일라 표의 값은 새싹 8개에 이슬 1개).
    //   축복의 꽃잎, 마름병 포자: 암거래상 교환이 기준가 4보다 싼 이슬 2 ~ 4개에 판다.
    materials: Object.freeze({
        groups: MATERIAL_GROUPS,
        keys: Object.freeze(MATERIAL_GROUPS.flatMap(group => group.keys)),
        bundles: Object.freeze({ deepWhetstone: 10, rootIron: 10, jewelPolish: 10, abyssCatalyst: 5, catalystPhys: 5, catalystFire: 5, catalystCold: 5,
            catalystLight: 5, catalystChaos: 5, catalystCrit: 5, catalystSummon: 5, colonyTrace: 3, underCopper: 5, skyEssence: 5, jewelShard: 5,
            runeShard: 20, pollen: 20, beeswax: 10, sealShard: 5, reefFragment: 10, colonyShard: 10 }),
        buy: 1.15,      // 사는 값 = 기준가 x 1.15 x 시세(0.98 ~ 1.32배): 베일라(1.8 ~ 2.2배)보다 싸다
        sell: 0.85,     // 파는 값 = 기준가 x 0.85 x 시세, 수수료 8%를 뗀 실수령(0.66 ~ 0.90배): 베일라(0.45 ~ 0.55배)보다 비싸다
        feeRate: 0.08,
        quota: 20,      // 품목마다, 사기와 팔기 각각, 한 시세 구간에 20묶음까지(quotas에 적은 품목은 그 수)
        // 입장권은 3, 귀하고 비싼 재료는 5: 한 구간에 쌓아 두고 쓰는 물건이 아니다.
        quotas: Object.freeze({ bossKeyFlame: 3, bossKeyFrost: 3, bossKeyStorm: 3, beastKeyCerberus: 3, trialKey3: 3, chaosKey: 3, coreKey: 3, hiveKey: 3,
            colonyTrace: 3, altarEmber: 5, altarIchor: 5, bossCore: 5, enchantedHoney: 5, burningEmberBranch: 5, radiantSealShard: 5 })
    }),
    // 상인 매물: 구간 b마다 batch개의 묶음이 생기고, 저장하지 않고 (seed, b, b의 지역)에서 다시 만든다. 등급은 rarities의 수를 씨앗으로 섞어 매물 번호마다 정한다.
    // 매물마다 제 주사위로 놓이는 때(구간 안 아무 때), 머무는 시간(lifeMs), 다른 손님에게 팔리는지와 그때를 정한다: 목록은 그 시각에 놓여 있는 매물이다.
    // 일반은 옵션 없는 베이스, 마법과 희귀는 게임의 굴림, 고유는 그 지역에서 암거래상이 내놓을 수 있는 고유(체이스 고유 제외)다.
    // 지역은 다섯 개마다 셋을 묶음의 지역과 그 앞 보통 지역 둘(번호 순서)에서 번갈아, 둘을 그보다 앞의 보통 지역(0 ~ 지역 - 3)에 고르게 나눈다.
    // 부위는 드랍 부위를 고르게 돌며(무기는 한 바퀴에 두 번) 같은 부위의 베이스가 겹치지 않게 고른다. 싸게 내놓은 매물(bargain)은 0.82 ~ 0.88배,
    // 보통은 0.96 ~ 1.10배(화면은 둘을 나누지 않는다). 값은 놓일 때(태어난 구간의 시세) 정해져 내려갈 때까지 그대로다.
    // 값: 일반, 마법, 희귀는 새싹(이슬 3, 4개 값에서는 시세와 흔들림이 반올림에 묻힌다), 고유는 암거래상처럼 황금률. 일반, 마법, 희귀의 기준은
    // 감정가와 NPC 상점이 그 등급에 매기는 값 x premium[등급] 가운데 큰 쪽에 옵션 궁합(synergy, 마법과 희귀만)과 변형 배율(variants)을 곱한 값,
    // 고유의 기준은 암거래상이 그 고유에 부르는 값이다. 산 장비는 다시 팔 수 없어 값이 높아도 고리가 없다.
    gear: Object.freeze({
        // 경매장은 굴린 옵션을 먼저 보여 주고 한 번에 여러 개를 내놓으므로 상인이 NPC 장비 상점 값보다 더 부른다(희귀 두 배). 첫 어림값이다.
        premium: Object.freeze({ normal: 1, magic: 1.25, rare: 2 }),
        // 바닥값(일반, 마법, 희귀는 새싹, 고유는 황금률) = 그 등급을 분해해 많이 받을 수 있는 것을 그 재화로 바꾼 가장 좋은 값, 올림 + 1
        // (modules/domain/equipment-salvage-rewards.mjs, 2026-11-22 셈):
        //   일반, 마법: 새싹 1개 -> 2. 희귀: 이슬 많아야 2개, 이슬을 새싹으로는 베일라가 가장 좋다(새싹 1개에 이슬 0.125 x 2 x 0.9 = 0.225개,
        //   암거래상에는 이슬 -> 새싹 교환이 없다): 새싹 8.9개 -> 10. 고유: 이슬 2 + 수액 봉우리 1 + 황금률 1(체이스 고유는 매물에 없다).
        //   이슬 -> 황금률은 암거래상의 가장 좋은 굴림(이슬 9.82개에 봉우리 1개, 봉우리 3개에 황금률 1개 = 이슬 29.45개), 봉우리 -> 황금률 1/3:
        //   황금률 1.40개 -> 2(고유만 올림으로 끝낸다: 1 더하면 암거래상이 1 ~ 2에 파는 낮은 고유가 모두 3이 된다). 고유는 암거래상의 가장 싼 값 아래로도 내려가지 않는다. 분해 보상, 환율, 베일라와 암거래상의 폭이 바뀌면 다시 셈한다.
        floor: Object.freeze({ normal: 2, magic: 2, rare: 10, unique: 2 }),
        // 한 구간에 생기는 매물 수. 매물마다 평균 45분 머물러 어느 때나 팔리지 않은 매물이 50개 남짓 보인다.
        batch: 20,
        // 묶음의 등급별 매물 수(합이 batch). 매물 i의 등급은 seed:bucket:rarity 주사위로 섞은 이 목록의 i번째다(생성이 바뀌어도 그대로).
        rarities: Object.freeze([['unique', 1], ['rare', 10], ['magic', 5], ['normal', 4]]),
        // 매물이 머무는 시간(ms, 20 ~ 70분에서 고르게). 놓이는 때는 태어난 구간 안에서 고르게. 목록은 머무는 시간의 최대에서 셈한 지난 구간까지 본다.
        lifeMs: Object.freeze([1200000, 4200000]),
        // 다른 손님에게 팔릴 확률(보통, 싸게 내놓은 매물)과 팔리는 때(머무는 시간의 0.15 ~ 0.9 지점). 팔린 매물은 soldShowMs(3분) 동안 팔림으로 남는다.
        soldChance: Object.freeze({ npc: 0.35, bargain: 0.6 }),
        soldAt: Object.freeze([0.15, 0.9]),
        soldShowMs: 180000,
        // 최근 거래에 보이는 팔린 매물 수(새것부터).
        recentTrades: 30,
        // 지역 나눔: 매물 다섯 개(every)마다 top개는 사다리, 나머지는 사다리보다 앞의 보통 지역. 앞 지역이 없으면 모두 사다리.
        spread: Object.freeze({ every: 5, top: 3 }),
        // 드랍이 가질 수 있는 변형(게임의 함수로 붙인다)과 매물에 붙는 확률, 감정가와 상점 값이 반영하지 않아 곱하는 배율.
        // exceptional: 특출난 베이스(드랍은 베이스 줄마다 1%), socket: 공허 소켓 장신구(드랍은 5%), corrupted: 타락(드랍은 루프 2부터 3%, 마법과 희귀).
        variants: Object.freeze({
            exceptional: Object.freeze({ chance: 0.1, price: 1.6 }),
            socket: Object.freeze({ chance: 0.2, price: 1.5 }),
            corrupted: Object.freeze({ chance: 0.08, price: 1.25 })
        }),
        // 지역 사다리: 묶음의 지역(맨 위)과 그 앞의 보통 지역(번호 하나씩 앞) 몇 개까지. 매물 i는 사다리[i % 길이]에서 굴린다.
        ladder: 3,
        // 부위 계획에서 무기가 한 바퀴에 나오는 횟수, 같은 부위에서 이미 나온 베이스를 피해 다시 고르는 횟수.
        weaponTurns: 2,
        baseRetries: 12,
        // 옵션 궁합: 매물의 계열 F(auctionItemFamily)에 맞춰 추가 옵션 줄마다 점수를 매긴다. F를 가진 줄 1, F는 없고 affinity[F]의 계열을 가진
        // 줄 near(0.5), 나머지 0. 점수 합 s로 1 + perCube x s x s x s(최대 cap, 점수가 높을수록 가파르게)를 곱하고, 줄의 단계가 굴릴 수 있던 폭(1 ~ affixTierCap, 높을수록
        // 좋다)의 어디쯤인지의 평균 q로 rollMin + rollSpan x q를 곱한다. 상인 매물만 쓴다(내 출품의 감정가와 전당 전시는 그대로다).
        synergy: Object.freeze({
            near: 0.5, perCube: 0.15, cap: 20, rollMin: 0.8, rollSpan: 0.7,
            affinity: Object.freeze({
                fire: Object.freeze(['critical', 'spell', 'attack', 'projectile']),
                cold: Object.freeze(['critical', 'spell', 'attack', 'projectile']),
                light: Object.freeze(['critical', 'spell', 'attack', 'projectile']),
                chaos: Object.freeze(['critical', 'spell', 'attack', 'projectile']),
                physical: Object.freeze(['critical', 'attack', 'projectile']),
                critical: Object.freeze(['fire', 'cold', 'light', 'chaos', 'physical', 'spell', 'attack', 'projectile']),
                spell: Object.freeze(['fire', 'cold', 'light', 'chaos', 'critical']),
                attack: Object.freeze(['fire', 'cold', 'light', 'chaos', 'physical', 'critical', 'projectile']),
                projectile: Object.freeze(['fire', 'cold', 'light', 'chaos', 'physical', 'critical', 'attack']),
                summon: Object.freeze([]),
                armor: Object.freeze(['resistance']),
                resistance: Object.freeze(['armor'])
            })
        }),
        bargainChance: 0.24,
        bargain: Object.freeze([0.82, 0.88]),
        normal: Object.freeze([0.96, 1.10]),
        // 판매자 이름 = 앞말 x 뒷말(화면은 두 말을 옮겨 '{prefix} {suffix}'로 잇는다). 묶음마다 sellersPerBatch명을 seed:bucket:seller 주사위로 뽑아
        // 묶음의 매물에 하나씩 나눠 준다(한 판매자에 두세 개). 앞말의 넷 뒤는 게임의 장소 이름 그대로다(modules/data/maps.mjs의 액트 이름,
        // modules/data/stage-regions.mjs의 지역 이름). 저장(내 출품의 구매자)은 두 목록의 번호다: 목록은 끝에만 더한다.
        sellers: Object.freeze({
            prefixes: Object.freeze(['시든 도시', '모루터', '허공뿌리', '수관', '뿌리끝 성소', '가지치기의 중정', '갈림뿌리 미궁', '말라가는 큰 줄기',
                '비탄의 교차', '합일의 차륜', '고대 미궁', '지하계', '창공의 탑', '심해']),
            suffixes: Object.freeze(['전사', '비술사', '궁수', '성직자', '연금술사', '방랑자', '중개인', '감정사', '행상인', '수집가', '대장장이', '세공사',
                '약초꾼', '사냥꾼', '광부', '순례자', '용병', '학자', '뱃사람', '수도사'])
        }),
        sellersPerBatch: 8
    }),
    // 내 출품: 3칸. 구간이 바뀔 때마다 한 번 상인 수요가 붙고(최대 buckets번), 못 팔리면 기간이 끝난다. 값은 감정가(그 구간 시세)의 1.2배까지,
    // 최소 2(수수료 1을 떼고 1이 남는다). chances: [호가 / 감정가 상한, 판매 확률], 상한을 넘으면(시세가 떨어져서) overChance.
    // 1.2배 상한이 없으면 아무 값이나 구간마다 8%로 팔려 재화를 찍어 낸다(시안의 문제를 고쳤다).
    myLots: Object.freeze({
        slots: 3,
        buckets: 3,
        askMax: 1.2,
        askMin: 2,
        feeRate: 0.08,
        chances: Object.freeze([Object.freeze([0.95, 0.92]), Object.freeze([1.12, 0.65]), Object.freeze([1.20, 0.30])]),
        overChance: 0.08
    }),
    // 'hybrid': 화면이 장비 전당의 전시품도 함께 보여 준다. 'pulse_only': 상인 매물만(서버는 시세 보정만 준다). 저장하지 않는 운영 설정이다.
    modes: Object.freeze(['hybrid', 'pulse_only']),
    defaultMode: 'hybrid',
    // 반올림의 여유(부동소수 오차). 내는 값은 올림, 받는 값은 내림.
    epsilon: 1e-9
});

export { AUCTION_HOUSE };
