/**
 * 경매장(거래 창의 넷째 칸, 루프 20 해금). 입찰은 없고 모두 즉시 체결된다. 규칙은 modules/domain/auction-*.mjs, 저장은 game.auction.
 * 시세 구간(bucketMs)마다 시세 배율이 바뀌고, 상인 매물이 새로 놓이고, 내 출품에 상인 수요가 한 번 붙는다.
 * 모든 수치가 이 표에 있다. 재료 기준가는 베일라의 표(NPC_CURRENCY_EXCHANGE.prices, 형체 없는 이슬 값)만 쓴다: 두 번째 가격표는 없다.
 * 설계: docs/auction-house-plan-20261121.md(브랜치 auction-house-spec-20261121), 2026-11-22 검토로 고친 값이 여기 있다.
 */
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
            description: '물리, 방어도 장비와 잿불가지, 톱니 화석 값이 올랐습니다.',
            boosts: Object.freeze(['physical', 'armor', 'fossilJagged', 'emberBranch']), dips: Object.freeze(['spell', 'critical', 'fossilRift']) })
    ]),
    // 장비 계열. 장비의 계열은 추가 옵션(stats)의 능력치 태그(STAT_AFFIX_TAGS)를 familyTags로 옮겨 가장 많이 모인 계열이다(같으면 이 순서가
    // 앞선 계열). 해당 태그가 없으면 무기는 attack, 나머지는 armor다.
    families: Object.freeze(['fire', 'cold', 'light', 'chaos', 'physical', 'critical', 'spell', 'summon', 'projectile', 'attack', 'armor', 'resistance']),
    // 능력치 태그(modules/data/affix-tags.mjs) -> 계열. 목록에 없는 태그(damage, elemental, speed, life 같은)는 세지 않는다.
    // 계열 이름은 따로 두지 않고 그 태그의 이름(AFFIX_TAG_LABELS, auctionHouse.familyLabel)을 쓴다: 12계열 모두 태그가 있다.
    familyTags: Object.freeze({ fire: 'fire', cold: 'cold', light: 'light', chaos: 'chaos', physical: 'physical', crit: 'critical', spell: 'spell',
        summon: 'summon', projectile: 'projectile', attack: 'attack', defense: 'armor', resistance: 'resistance' }),
    // 재료 거래: 열쇠는 재화 키. 모두 NPC_CURRENCY_EXCHANGE.prices에서 형체 없는 이슬로 값이 매겨진 재화여야 한다(규칙이 확인한다).
    // bundle: 한 묶음의 개수. 1개 값이 1 이슬보다 작은 재화는 묶음으로만 거래해 반올림으로 값을 만들 수 없게 한다.
    // 목록 안의 다른 재화로 만들 수 있거나 그것으로 바꿀 수 있는 재화는 넣지 않는다: 싸게 사서 바꿔 비싸게 팔면 고리가 된다(2026-11-22 검토:
    // 원시 화석을 사서 복원하면 여기서 파는 화석이 나와 극단 시세에서 7% 남았다, modules/domain/rune-fossil-refining.mjs). 원시 화석을 뺐다.
    materials: Object.freeze({
        keys: Object.freeze(['fossilAbyssal', 'fossilRift', 'fossilJagged', 'fossilPrismatic', 'oilFire', 'oilCold', 'oilLight',
            'oilChaos', 'catalystCrit', 'catalystSummon', 'emberBranch', 'voidChisel', 'magicBud']),
        bundles: Object.freeze({ catalystCrit: 5, catalystSummon: 5, magicBud: 40 }),
        buy: 1.15,      // 사는 값 = 기준가 x 1.15 x 시세(0.98 ~ 1.32배): 베일라(1.8 ~ 2.2배)보다 싸다
        sell: 0.85,     // 파는 값 = 기준가 x 0.85 x 시세, 수수료 8%를 뗀 실수령(0.66 ~ 0.90배): 베일라(0.45 ~ 0.55배)보다 비싸다
        feeRate: 0.08,
        quota: 20       // 품목마다, 사기와 팔기 각각, 한 시세 구간에 20묶음까지
    }),
    // 상인 매물: 구간마다 16개, 저장하지 않고 (seed, bucket, lotZone)에서 다시 만든다. 희귀 장비만(고유는 암거래상이 감정가의 100 ~ 1600배에
    // 팔아서, 감정가로 팔면 그 값을 무너뜨린다). 급매는 0.82 ~ 0.88배, 보통은 0.96 ~ 1.10배. 구간이 열릴 때 이미 팔린 매물이 있다.
    // 값은 새싹으로만 매긴다(이슬 3, 4개 값에서는 시세와 급매가 반올림에 묻힌다). 기준은 감정가와 NPC 상점의 희귀 값 x premium 가운데 큰 쪽이다
    // (희귀 감정가는 대개 1 이슬 아래라 상점보다 싸게 팔렸다).
    gear: Object.freeze({
        // 경매장은 굴린 옵션을 먼저 보여 주고 한 번에 16개를 내놓으므로 상인이 NPC 장비 상점 값의 두 배를 부른다. 첫 어림값이다.
        premium: 2,
        // 희귀를 분해하면 이슬 1개 확정에 많아야 1개를 더 받아 최대 2개다(modules/domain/equipment-salvage-rewards.mjs). 이슬을 새싹으로
        // 바꾸는 가장 좋은 길은 이 경매장의 새싹 묶음을 가장 싸게 사는 것이다. 새싹 시세는 보정 없이 0.90 아래로 가지 않는다(파도 -0.06,
        // 잡음 -0.04, 새싹을 누르는 사건이 없다). 서버 보정 -voteSwing까지 더하면 0.84지만 pulse.min에 막혀 0.85가 보장된 바닥이다:
        // 40개에 기준가 5 x 1.15 x 0.85 = 이슬 4.89개, 이슬 1개에 새싹 8.2개. 그래서 이슬 2개는 많아야 새싹 16.4개이고, 매물은 그보다 비싸야
        // 분해로 남길 수 없다. 암거래상의 새싹 -> 이슬 거래는 반대 방향이라 이 바닥과 관계없다. 분해 보상, 그 환율, 시세 폭이 바뀌면 다시 셈한다.
        floorBud: 17,
        lots: 16,
        bargainChance: 0.24,
        bargain: Object.freeze([0.82, 0.88]),
        normal: Object.freeze([0.96, 1.10]),
        soldBargain: 0.25,
        soldNormal: 0.10,
        merchants: Object.freeze(['시든 도시 중개인', '모루터 감정사', '허공뿌리 행상', '수관 수집상'])
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
