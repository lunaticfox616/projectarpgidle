// 조합창(2026-09-30, 그루터기 함 아래 4×4): 재료를 넣고 [조합]하면 맞는 조합법대로 바뀐다.
// 재료는 장비(인벤토리 칸 크기 그대로, 무기는 가장 커도 넓은 대검의 2×4) · 그루터기 아이템(씨앗 · 부적) ·
// 주얼 · 코어. 조합법은 모양을 묻지 않는다(무엇이 몇 개인지만 본다). 재화 비용은 조합할 때 함께 낸다.
// 2026-10-10 사용자: 같은 고유 2개를 조합하려면 2×3 대검 둘이 나란히 들어가야 해서 3×3에서 4×4로 넓혔다. 2026-10-26 대검이 2×4가
// 되어도 둘이 4×4에 나란히 들어간다.
// 2026-10-25 사용자: 그루터기 함 판과 같은 5×5 틀에 그린다(틀 위 보석으로 판과 서로 바꾼다). 4×4 저장의 칸은 그대로 맞는다.
// 다른 장비 조합법은 "장비 1 + 촉매(다 자란 꽃, 열매, 뿌리 · 주얼)"다. 2026-11-04 사용자: 수액과 호박석을 없애고 호박석이 하던 일을
// 뿌리(희귀 장비 단련, 기폭제 만들기)와 덩굴(기폭제 바꾸기, 부적 옵션 리롤, 코어 옵션 리롤)이 나눠 맡는다.
// inputs의 각 줄은 서로 겹치지 않는 조건이다. kind: equipment | stump | jewel | core.
//   rarity: 희귀도(목록이면 그 가운데 하나) · family: 그루터기 계열 · ripe: true면 다 자란 것만, false면 자라는 씨앗만
//   path: 다 자란 씨앗의 종류(꽃, 열매, 덩굴, 뿌리; 목록이면 그 가운데 하나) · socketable: 공허 소켓을 뚫을 수 있는 장신구
//   uniqueKey: 그 고유(효과 키)만 · reveal.hidden: 책에 나오지 않는 히든 조합(재료가 맞으면 조합은 된다)
//   same: 그 줄의 재료끼리 같아야 하는 것(slot 부위 · color 색 · family 계열 · path 다 자란 종류 · name 고유 이름 · base 베이스).
//   unlike: 그 줄의 재료가 앞 줄 재료와 달라야 하는 것(color).
//   need · result · note는 조합법 책에 쓰는 문장(재료, 결과, 덧붙임 한 줄).
const STUMP_CUBE_SIZE = 5;
// 씨앗 합치기의 품질(2026-10-29 사용자): 보통은 세 재료의 평균 품질에 1~10%를 더한다(해금된 품질 상한까지). bestChance의 확률로
// 가장 높은 품질에 1~10%(상한까지), overChance의 확률로 평균 품질에 over를 더하고 이때는 상한을 넘을 수 있다(상한 + over까지).
const STUMP_CUBE_MERGE = Object.freeze({ step: Object.freeze([1, 10]), bestChance: 0.1, overChance: 0.05, over: 0.11 });
// 고유 장비 리롤(2026-10-30 사용자: 15%에서 10%로): 새 고유가 특출난 베이스(베이스 줄 하나가 최고 굴림의 120%)가 될 확률.
const STUMP_CUBE_UNIQUE_EXCEPTIONAL_CHANCE = 0.1;
// 희귀 장비 특출 베이스(2026-10-30 사용자): 같은 베이스 희귀 3개로 만든 희귀가 특출난 베이스가 될 확률.
const STUMP_CUBE_RARE_EXCEPTIONAL_CHANCE = 0.1;
// 기폭제 바꾸기(2026-10-30 사용자): 덩굴 하나로 다른 기폭제 셋을 덩굴 색의 기폭제 셋으로 바꾼다(js/sap-catalysts.js, 2026-11-04 전: 호박석).
const STUMP_CUBE_CATALYST_EXCHANGE = 3;
const STUMP_CUBE_RECIPES = Object.freeze([
    { id: 'equip_magic_upgrade', reveal: { harvest: ['flower', 'fruit'] }, group: '장비', need: '마법 장비 1 + 꽃이나 열매 1', name: '마법 장비 승급',
        result: '희귀 장비 1', note: '베이스 유지 및 옵션 리롤',
        inputs: [{ kind: 'equipment', rarity: 'magic', count: 1 }, { kind: 'stump', family: 'seed', path: ['flower', 'fruit'], ripe: true, count: 1 }], cost: {} },
    { id: 'equip_rare_tier', reveal: { harvest: ['root'] }, group: '장비', need: '희귀 장비 1 + 뿌리 2', name: '희귀 장비 단련',
        result: '같은 부위의 티어 +1 희귀 장비', note: '티어 상한: 현재',
        inputs: [{ kind: 'equipment', rarity: 'rare', count: 1 }, { kind: 'stump', family: 'seed', path: 'root', ripe: true, count: 2 }], cost: { formlessDew: 1 } },
    { id: 'equip_rare_exceptional', group: '장비', need: '같은 베이스 희귀 장비 3', name: '희귀 장비 특출 베이스',
        result: '같은 베이스 희귀 장비 1', note: `옵션 리롤 (특출난 베이스가 될 확률 ${Math.round(STUMP_CUBE_RARE_EXCEPTIONAL_CHANCE * 100)}%)`,
        inputs: [{ kind: 'equipment', rarity: 'rare', count: 3, same: ['base'] }], cost: {} },
    { id: 'equip_unique_remake', group: '장비', need: '같은 고유 장비 2', name: '고유 장비 리롤',
        result: '같은 고유 장비 1', note: `옵션 리롤 (특출난 베이스가 될 확률 ${Math.round(STUMP_CUBE_UNIQUE_EXCEPTIONAL_CHANCE * 100)}%)`,
        inputs: [{ kind: 'equipment', rarity: 'unique', count: 2, same: ['name'] }], cost: {} },
    { id: 'equip_unique_reroll', reveal: { harvest: ['flower', 'fruit'] }, group: '장비', need: '고유 장비 1 + 꽃이나 열매 3', name: '고유 장비 순환',
        result: '같은 부위의 무작위 고유 장비로 변환',
        inputs: [{ kind: 'equipment', rarity: 'unique', count: 1 }, { kind: 'stump', family: 'seed', path: ['flower', 'fruit'], ripe: true, count: 3 }], cost: {} },
    // 히든 조합(2026-11-03 사용자): 조합법 책에 나오지 않는다(reveal.hidden). 네 수확물 고유(uniqueKey: 효과 키, 2026-11-04 덩굴 고유를 더했다)가
    // 풍작의 갑주가 된다. 뿌리에 얽힌 시간의 효과 키 amberTime은 옛 이름(호박에 갇힌 시간) 그대로다: 저장된 장비가 그 키를 들고 있다.
    { id: 'equip_harvest_armour', reveal: { hidden: true }, group: '장비', need: '마른 꽃잎 고리 + 떨어지지 않는 열매 + 감기는 덩굴손 + 뿌리에 얽힌 시간', name: '풍작의 갑주',
        result: '풍작의 갑주 1(꽃, 열매, 덩굴, 뿌리 소켓)', note: '네 고유의 소켓에 든 것은 돌려받습니다.',
        inputs: [{ kind: 'equipment', rarity: 'unique', uniqueKey: 'witheredEcho', count: 1 }, { kind: 'equipment', rarity: 'unique', uniqueKey: 'fruitSocket', count: 1 },
            { kind: 'equipment', rarity: 'unique', uniqueKey: 'vineSocket', count: 1 }, { kind: 'equipment', rarity: 'unique', uniqueKey: 'amberTime', count: 1 }], cost: {} },
    { id: 'equip_socket_jewel', reveal: { content: 'jewel' }, group: '장비', need: '장신구 1 + 주얼 3', name: '장신구 주얼 융합',
        result: '세 개의 주얼 중 하나가 끼워진 장신구, 주얼 해제 불가능', note: '공허 소켓을 하나 뚫어 끼움(뚫을 수 있는 장신구만)',
        inputs: [{ kind: 'equipment', socketable: true, count: 1 }, { kind: 'jewel', count: 3 }], cost: {} },
    // 씨앗은 자라는 것끼리만(2026-11-04): 다 자란 것은 종류가 정해져 합치면 그 종류를 잃는다. 보관함 위 [자동합성]이 같은 묶음을 모두 합친다.
    { id: 'stump_merge', group: '그루터기', need: '같은 색 씨앗 3', name: '씨앗 합치기',
        result: '같은 색 씨앗 1, 품질은 평균 +1~10%', note: '낮은 확률로 더 좋은 결과 가능',
        inputs: [{ kind: 'stump', family: 'seed', ripe: false, count: 3, same: ['color'] }], cost: {} },
    { id: 'stump_recolor', group: '그루터기', need: '씨앗 1 + 다른 색 씨앗 2', name: '씨앗 색 바꾸기',
        result: '두 씨앗 색의 씨앗 1', note: '품질 유지, 성장 초기화',
        inputs: [{ kind: 'stump', family: 'seed', ripe: false, count: 2, same: ['color'] }, { kind: 'stump', family: 'seed', ripe: false, count: 1, unlike: 'color' }], cost: {} },
    { id: 'root_catalyst', reveal: { harvest: ['root'], loop: 32 }, group: '그루터기', need: '같은 색 뿌리 2', name: '뿌리 기폭제',
        result: '그 색의 기폭제 1', note: '장비 품질 속성(물리, 화염, 냉기, 번개, 카오스), 루프 32부터',
        inputs: [{ kind: 'stump', family: 'seed', path: 'root', ripe: true, count: 2, same: ['color'] }], cost: {} },
    { id: 'fruit_oil', reveal: { harvest: ['fruit'], loop: 36 }, group: '그루터기', need: '같은 색 열매 2', name: '열매 기름',
        result: '그 색의 정원 기름 1', note: '목걸이에 바르는 기름, 루프 36부터',
        inputs: [{ kind: 'stump', family: 'seed', path: 'fruit', ripe: true, count: 2, same: ['color'] }], cost: {} },
    // costText: 조합할 때 정해지는 비용의 글(기폭제 바꾸기는 덩굴 색이 아닌 기폭제 셋을 무작위로 낸다, js/sap-catalysts.js).
    { id: 'catalyst_exchange', reveal: { harvest: ['vine'], loop: 32 }, group: '그루터기', need: '덩굴 1', name: '기폭제 바꾸기',
        result: `그 색의 기폭제 ${STUMP_CUBE_CATALYST_EXCHANGE}`, costText: `덩굴 색이 아닌 기폭제 ${STUMP_CUBE_CATALYST_EXCHANGE} (무작위)`,
        inputs: [{ kind: 'stump', family: 'seed', path: 'vine', ripe: true, count: 1 }], cost: {} },
    { id: 'talisman_upgrade', reveal: { content: 'talisman' }, group: '부적', need: '부적 3(고유 제외)', name: '부적 리롤', result: '새 부적 1', note: '강력한 기운의 봉인편린 등급, 셋 다 희귀면 찬란한 봉인편린 등급',
        inputs: [{ kind: 'stump', family: 'talisman', rarity: ['magic', 'rare'], count: 3 }], cost: {} },
    { id: 'talisman_reroll_line', reveal: { content: 'talisman', harvest: ['vine'] }, group: '부적', need: '부적 1(고유 제외) + 덩굴 1', name: '부적 옵션 리롤', result: '부적의 일반 옵션 1줄 다시 굴림', note: '강력한 기운의 봉인편린 배율',
        inputs: [{ kind: 'stump', family: 'talisman', rarity: ['magic', 'rare'], count: 1 }, { kind: 'stump', family: 'seed', path: 'vine', ripe: true, count: 1 }],
        cost: { sealShard: 1 } },
    { id: 'talisman_unique_reroll', reveal: { content: 'talisman' }, group: '부적', need: '고유 부적 2', name: '고유 부적 순환', result: '다른 고유 부적 1',
        inputs: [{ kind: 'stump', family: 'talisman', rarity: 'unique', count: 2 }], cost: { strongSealShard: 1 } },
    { id: 'jewel_fuse', reveal: { content: 'jewel' }, group: '주얼', need: '주얼 3(고유 제외)', name: '주얼 융합', result: '희귀 주얼 1(옵션 3~4줄)', note: '재료 가운데 가장 높은 등급 범위',
        inputs: [{ kind: 'jewel', rarity: ['magic', 'rare'], count: 3 }], cost: { jewelShard: 10 } },
    { id: 'core_reroll', reveal: { content: 'cube' }, group: '코어', need: '코어 3(완전한 코어 제외)', name: '코어 리롤', result: '새 코어 1',
        inputs: [{ kind: 'core', rarity: ['rare'], count: 3 }], cost: {} },
    { id: 'core_reroll_line', reveal: { content: 'cube', harvest: ['vine'] }, group: '코어', need: '코어 1(완전한 코어 제외) + 덩굴 1', name: '코어 옵션 리롤',
        result: '코어의 옵션 1줄 다시 굴림',
        inputs: [{ kind: 'core', rarity: ['rare'], count: 1 }, { kind: 'stump', family: 'seed', path: 'vine', ripe: true, count: 1 }], cost: {} }
]);
export { STUMP_CUBE_SIZE, STUMP_CUBE_MERGE, STUMP_CUBE_UNIQUE_EXCEPTIONAL_CHANCE, STUMP_CUBE_RARE_EXCEPTIONAL_CHANCE, STUMP_CUBE_CATALYST_EXCHANGE, STUMP_CUBE_RECIPES };
