// 조합창(2026-09-30, 그루터기 함 아래 3×3): 재료를 넣고 [조합]하면 맞는 조합법대로 바뀐다.
// 재료는 장비(인벤토리 칸 크기 그대로, 무기는 가장 커도 대검의 2×3) · 그루터기 아이템(씨앗 · 수액 · 부적) ·
// 주얼 · 코어. 조합법은 모양을 묻지 않는다(무엇이 몇 개인지만 본다). 재화 비용은 조합할 때 함께 낸다.
// 3×3에는 2×2 장비가 하나만 들어가므로 장비 조합법은 "장비 1 + 촉매(다 자란 씨앗 · 호박석 · 주얼)"다.
// inputs의 각 줄은 서로 겹치지 않는 조건이다. kind: equipment | stump | jewel | core.
//   rarity: 희귀도(목록이면 그 가운데 하나) · family: 그루터기 계열 · ripe: 다 자란 것만 · socketable: 공허 소켓을 뚫을 수 있는 장신구
//   same: 그 줄의 재료끼리 같아야 하는 것(slot 부위 · color 색 · family 계열). need · result는 화면에 쓰는 문장.
const STUMP_CUBE_SIZE = 3;
const STUMP_CUBE_STUMP_ROLL_STEP = 0.1;
const STUMP_CUBE_RECIPES = Object.freeze([
    { id: 'equip_magic_upgrade', group: '장비', need: '마법 장비 1 + 다 자란 씨앗(꽃 · 열매) 1', name: '마법 장비 승급',
        result: '같은 베이스 · 티어의 희귀 장비 1(옵션 새로)',
        inputs: [{ kind: 'equipment', rarity: 'magic', count: 1 }, { kind: 'stump', family: 'seed', ripe: true, count: 1 }], cost: {} },
    { id: 'equip_rare_tier', group: '장비', need: '희귀 장비 1 + 호박석(다 자란 수액) 2', name: '희귀 장비 단련',
        result: '같은 부위 희귀 장비 1, 티어 +1(지금 레벨에서 떨어지는 티어까지)',
        inputs: [{ kind: 'equipment', rarity: 'rare', count: 1 }, { kind: 'stump', family: 'sap', ripe: true, count: 2 }], cost: { formlessDew: 1 } },
    { id: 'equip_unique_reroll', group: '장비', need: '고유 장비 1 + 다 자란 씨앗(꽃 · 열매) 3', name: '고유 장비 순환',
        result: '같은 부위의 다른 고유 장비 1(같은 티어)',
        inputs: [{ kind: 'equipment', rarity: 'unique', count: 1 }, { kind: 'stump', family: 'seed', ripe: true, count: 3 }], cost: {} },
    { id: 'equip_socket_jewel', group: '장비', need: '소켓을 뚫을 수 있는 장신구 1 + 주얼 1', name: '소켓 뚫어 끼우기', result: '장신구에 공허 소켓을 뚫고 그 주얼을 끼운다',
        inputs: [{ kind: 'equipment', socketable: true, count: 1 }, { kind: 'jewel', count: 1 }], cost: { voidChisel: 1 } },
    { id: 'stump_merge', group: '그루터기', need: '같은 색 · 같은 계열 씨앗 또는 수액 3', name: '씨앗 · 수액 합치기', result: '같은 색 · 계열 1, 품질 = 가장 높은 품질 +10%(최대 130%)',
        inputs: [{ kind: 'stump', family: ['seed', 'sap'], count: 3, same: ['color', 'family'] }], cost: {} },
    { id: 'talisman_upgrade', group: '부적', need: '부적 3(고유 제외)', name: '부적 거듭 풀기', result: '새 부적 1(강력한 기운의 봉인편린으로 푼 것, 셋 다 희귀면 찬란한 봉인편린)',
        inputs: [{ kind: 'stump', family: 'talisman', rarity: ['magic', 'rare'], count: 3 }], cost: {} },
    { id: 'talisman_reroll_line', group: '부적', need: '부적 1(고유 제외) + 다 자란 수액(호박석) 1', name: '부적 줄 다시 쓰기', result: '부적의 일반 줄 하나를 새로 굴린다(강력한 기운의 봉인편린 배율)',
        inputs: [{ kind: 'stump', family: 'talisman', rarity: ['magic', 'rare'], count: 1 }, { kind: 'stump', family: 'sap', ripe: true, count: 1 }],
        cost: { sealShard: 1 } },
    { id: 'talisman_unique_reroll', group: '부적', need: '고유 부적 2', name: '고유 부적 순환', result: '다른 고유 부적 1',
        inputs: [{ kind: 'stump', family: 'talisman', rarity: 'unique', count: 2 }], cost: { strongSealShard: 1 } },
    { id: 'jewel_fuse', group: '주얼', need: '주얼 3(고유 제외)', name: '주얼 융합', result: '희귀 주얼 1(옵션 3~4줄, 재료 가운데 가장 높은 등급 범위)',
        inputs: [{ kind: 'jewel', rarity: ['magic', 'rare'], count: 3 }], cost: { jewelShard: 10 } },
    { id: 'core_reroll', group: '코어', need: '코어 3', name: '코어 다시 빚기', result: '새 코어 1',
        inputs: [{ kind: 'core', count: 3 }], cost: {} }
]);

safeExposeData({ STUMP_CUBE_SIZE, STUMP_CUBE_STUMP_ROLL_STEP, STUMP_CUBE_RECIPES });
