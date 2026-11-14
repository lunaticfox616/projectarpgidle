export const BOSS_PATTERN_NAMES = /* @__PURE__ */ Object.freeze({
        intro: '세 가지 특수기',
        burst: '연속 참격',
        slam: '파쇄 강타',
        ramp: '격앙',
        cosmos: '성좌 순환',
        coreFrenzy: '핵 폭주',
        cosmosBoss: '은하 고유 기믹',
        apex: '후반부 보스 고유 기믹',
        rootGrinder: '회전 톱날'
    });

export const BOSS_PATTERN_DESCRIPTIONS = /* @__PURE__ */ Object.freeze({
        intro: '때때로 예고한 칸에 특수기를 씁니다. 생명력이 적을수록 자주 쓰고, 보스마다 세 가지(갈래 사격, 연쇄 폭발, 이중 파동 등) 가운데 하나를 고르며 같은 특수기를 잇달아 쓰지 않습니다. 예고가 뜨면 이동 스킬을 눌러 범위를 벗어날 수 있습니다.',
        burst: '때때로 연속 참격으로 피해가 30% 증가합니다. 생명력이 적을수록 자주 씁니다.',
        slam: '때때로 파쇄 강타로 피해가 55% 증가합니다. 생명력이 적을수록 자주 씁니다.',
        ramp: '생명력이 낮아질수록 최대 3단계까지 격앙하여 공격 피해가 증가합니다. 때때로 영웅 자리에 충격파를 내고, 생명력이 적을수록 자주 냅니다.',
        cosmos: '연속 참격/파쇄 강타/격앙을 차례로 순환합니다.',
        coreFrenzy: '연속 참격, 파쇄 강타, 격앙을 차례로 씁니다.',
        cosmosBoss: '은하 보스마다 고유한 공격 순서와 파훼 조건을 사용합니다.',
        apex: '아틀라스 후반부 보스는 단계마다 이름이 붙은 특수기를 정해진 횟수마다 예고한 뒤 씁니다.',
        rootGrinder: '공격마다 예고한 칸을 톱날로 여러 번 갈아 냅니다. 칸에 머무르는 동안 계속 맞습니다.'
    });

export const BOSS_PATTERN_PEAK_DAMAGE_MULTIPLIERS = /* @__PURE__ */ Object.freeze({
        intro: 1.15,
        burst: 1.30,
        slam: 1.55,
        ramp: 1.21,
        cosmos: 1.34,
        coreFrenzy: 1.34
    });

// 특수기를 쓰는 때(2026-10-16 사용자 "피 기준으로 무조건 그 패턴만 쓰는게 아니라, 피가 많아도 쓸 가능성이 있고, 랜덤하고, 피가 적으면
    // 더 쓸 확률이 높되, 같은 패턴은 약간의 쿨타임"): n번째 공격마다가 아니라 공격마다 굴린다. 생명력이 가득하면 SPECIAL_ODDS.full,
    // 바닥이면 SPECIAL_ODDS.empty(사이는 직선). 첫 공격과 특수기 바로 다음 공격은 보통 공격이고, PITY번 넘게 없으면 다음은 특수기다.
    // 같은 모양은 SHAPE_REST번의 공격이 지나야 다시 고른다. 굴림은 보스와 공격 번호로 정해지고(hashSeed) 그 공격을 처음 내다볼 때의
    // 생명력으로 한 번 정해 enemy.specialPlan에 둔다: 예고가 그려지는 동안 생명력이 줄어도 바뀌지 않는다.
    export const SPECIAL_ODDS = /* @__PURE__ */ Object.freeze({ full: 0.22, empty: 0.8 });

// 특수기를 쓰는 때(2026-10-16 사용자 "피 기준으로 무조건 그 패턴만 쓰는게 아니라, 피가 많아도 쓸 가능성이 있고, 랜덤하고, 피가 적으면
    // 더 쓸 확률이 높되, 같은 패턴은 약간의 쿨타임"): n번째 공격마다가 아니라 공격마다 굴린다. 생명력이 가득하면 SPECIAL_ODDS.full,
    // 바닥이면 SPECIAL_ODDS.empty(사이는 직선). 첫 공격과 특수기 바로 다음 공격은 보통 공격이고, PITY번 넘게 없으면 다음은 특수기다.
    // 같은 모양은 SHAPE_REST번의 공격이 지나야 다시 고른다. 굴림은 보스와 공격 번호로 정해지고(hashSeed) 그 공격을 처음 내다볼 때의
    // 생명력으로 한 번 정해 enemy.specialPlan에 둔다: 예고가 그려지는 동안 생명력이 줄어도 바뀌지 않는다.
    export const SHAPE_REST = 4;

// 특수기를 쓰는 때(2026-10-16 사용자 "피 기준으로 무조건 그 패턴만 쓰는게 아니라, 피가 많아도 쓸 가능성이 있고, 랜덤하고, 피가 적으면
    // 더 쓸 확률이 높되, 같은 패턴은 약간의 쿨타임"): n번째 공격마다가 아니라 공격마다 굴린다. 생명력이 가득하면 SPECIAL_ODDS.full,
    // 바닥이면 SPECIAL_ODDS.empty(사이는 직선). 첫 공격과 특수기 바로 다음 공격은 보통 공격이고, PITY번 넘게 없으면 다음은 특수기다.
    // 같은 모양은 SHAPE_REST번의 공격이 지나야 다시 고른다. 굴림은 보스와 공격 번호로 정해지고(hashSeed) 그 공격을 처음 내다볼 때의
    // 생명력으로 한 번 정해 enemy.specialPlan에 둔다: 예고가 그려지는 동안 생명력이 줄어도 바뀌지 않는다.
    export const PITY = 5;

// Bosses that carry their own special table: cosmos galaxy bosses (js/cosmos-rules.js) and the awakened atlas's late bosses
    // (js/atlas-endgame.js, a named special every n-th attack per stage).
    export const OWN_PATTERN_MODES = /* @__PURE__ */ new Set(['cosmosBoss', 'apex', 'rootGrinder']);

// Time to resume filling the gauge after the last special impact. Own boss tables retain their authored timing.
    export const SPECIAL_RECOVERY_MS = /* @__PURE__ */ Object.freeze({ intro: 600, burst: 450, slam: 750, ramp: 350 });

// 핵 폭주는 매 공격이 특수기라 숨 고르기를 절반만 둔다: 초당 피해가 파쇄 강타 단계와 같거나 조금(공격 속도에 따라 9%까지) 높다.
    // 성좌 순환처럼 없애면 21~37% 높았고, 보통만큼 두면 12% 낮았다(2026-10-23 측정, 생명력 40%에서 60번 공격).
    export const CORE_FRENZY_RECOVERY_SHARE = 0.5;
