// 그루터기 함(Stump Box) 정적 데이터. 설계: docs/stump-cube-game-design.md.
// 실행 로직에 의존하지 않는다(data/ 계층). 수치는 첫 시안이며 플레이 기록으로 조정한다.
//
// 씨앗은 꽃 또는 열매로, 수액은 호박석으로 자란다. 판(5×5)에 놓인 것만 처치로 자라고, 다 자란 것만 능력치를 준다.
// 같은 색 3개 이상이 다 자라 억제되지 않으면 그 색 능력치가 10% 오르고(공명), 상극색이 상하좌우로 맞닿으면
// 둘 다 멈춘다(억제: 능력치·성장 0, 공명 개수에서 빠짐). 위치·줄·모양 규칙은 없다(생장판과 다른 점).
// 부적(2026-09-30, 예전 부적 판 · 생장판 · 컨디션 젬 자리)은 색 없는 세 번째 계열이다. 판에서 처치로 깨어나고,
// 공명 · 억제에 끼지 않는다. 줄과 이웃 효과는 data/talismans.js.

const STUMP_BOX_SIZE = 5;

const STUMP_BOX_COLORS = Object.freeze({
    fire: Object.freeze({ label: '화염', tone: '#f07a34' }),
    cold: Object.freeze({ label: '냉기', tone: '#6cb8ec' }),
    lightning: Object.freeze({ label: '번개', tone: '#f0cc3a' }),
    chaos: Object.freeze({ label: '카오스', tone: '#b070dc' })
});
// 상극: 화염↔냉기, 번개↔카오스. 이 표 한 곳에서만 정한다.
const STUMP_BOX_OPPOSITES = Object.freeze({ fire: 'cold', cold: 'fire', lightning: 'chaos', chaos: 'lightning' });

// 칸 해금 순서(칸 번호 = 줄 × 5 + 칸): 가운데 십자 5 → 3×3의 네 모서리 → 바깥 십자 끝 → 바깥 테 둘레 → 네 모서리.
const STUMP_BOX_CELL_ORDER = Object.freeze([12, 7, 11, 13, 17, 6, 8, 16, 18, 2, 10, 14, 22, 1, 9, 23, 15, 3, 19, 21, 5, 0, 4, 24, 20]);
// 최고 도달 루프에 따라 자동으로 열린다(콘텐츠 포인트 없음). 첫 획득(루프 1 액트 10)에 가운데 3×3 9칸이 열리고,
// 그 뒤 everyLoops 루프마다 위 순서대로 한 칸씩 열린다(2026-09-30 사용자 결정: 9칸에서 한 칸씩 → 루프 17에 25칸).
// 간격을 바꾸면 data/maps.js 로드맵의 그루터기 함 줄(루프 2 · 17)도 함께 고친다.
const STUMP_BOX_OPENING = Object.freeze({ start: 9, everyLoops: 1 });

// 성장: 판 위에서 억제되지 않은 미성숙품만 처치마다 자란다. 절반에서 새싹/송진, 다 차면 꽃·열매/호박석.
// 부적은 절반 단계 없이 다 차면 깨어난다.
const STUMP_BOX_GROWTH = Object.freeze({
    need: Object.freeze({ seed: 400, sap: 500, talisman: 300 }),
    perKill: Object.freeze({ normal: 1, elite: 6, boss: 30 }),
    sproutAt: 0.5
});

// 전용 드랍: 함을 얻은 뒤 모든 처치에서 장비 드랍과 따로 굴린다. 색은 고르게, 계열은 씨앗 60% · 수액 40%.
const STUMP_BOX_DROPS = Object.freeze({
    chance: Object.freeze({ normal: 0.004, elite: 0.04, boss: 0.35 }),
    sapShare: 0.4,
    roll: Object.freeze({ min: 0.8, max: 1.2 })
});
// 보관된 씨앗 · 수액의 품질 범위. 드랍은 위 roll 범위로 굴리고, 조합창 합치기만 130%까지 올린다(data/stump-cube.js).
const STUMP_BOX_ROLL_LIMIT = Object.freeze({ min: 0.8, max: 1.3 });

const STUMP_BOX_STORAGE = 50;
const STUMP_BOX_RESONANCE = Object.freeze({ count: 3, bonusPct: 10 });

// 접붙이기(2026-10-01, 보조 콘텐츠 통합 7단계 — 가지치기 자리, 사용자 결정 "칸 강화 5단계"): 최고 도달 루프가 startLoop 이상이면
// 루프마다 pointsPerLoop점(저장하지 않고 루프에서 계산). 칸마다 maxRank단계, n단계에 n점. 단계마다 그 칸에 놓인 씨앗 · 수액의
// 능력치와 부적 자신의 줄 +pctPerRank%. 마름병 포자 refundSpores개로 한 단계 되돌린다(점수는 돌아온다). 수치는 9단계에서 맞춘다.
// startLoop를 바꾸면 data/maps.js 로드맵의 루프 18 줄도 함께 고친다.
// 단계당 +10%(9단계 측정: +6%는 옛 가지치기 피해 +6~18% · 생명력 +3~13%의 절반에 못 미쳤다).
const STUMP_BOX_GRAFT = Object.freeze({ startLoop: 18, pointsPerLoop: 3, maxRank: 5, pctPerRank: 10, refundSpores: 1 });

// 다 자란 아이템의 능력치(품질 100% 기준, 실제 = 값 × 품질). stat은 createEmptyStatBucket의 키.
// 꽃 = 그 원소 스킬에만 붙는 피해(현재 공격 젬 태그 조건), 열매 = 전투 상황 조건, 호박석 = 고정 저항.
const STUMP_BOX_YIELDS = Object.freeze({
    flower: Object.freeze({
        fire: Object.freeze({ stat: 'firePctDmg', value: 6, text: '화염 피해 +{v}%' }),
        cold: Object.freeze({ stat: 'coldPctDmg', value: 6, text: '냉기 피해 +{v}%' }),
        lightning: Object.freeze({ stat: 'lightPctDmg', value: 6, text: '번개 피해 +{v}%' }),
        chaos: Object.freeze({ stat: 'chaosPctDmg', value: 6, text: '카오스 피해 +{v}%' })
    }),
    fruit: Object.freeze({
        fire: Object.freeze({ stat: 'bossDamagePct', value: 4, text: '보스 상대 피해 +{v}%' }),
        cold: Object.freeze({ stat: 'takenDamageReduceWhen1EnemyPct', value: 2, text: '적이 하나일 때 받는 피해 -{v}%' }),
        lightning: Object.freeze({ stat: 'eliteDamagePct', value: 5, text: '정예 상대 피해 +{v}%' }),
        chaos: Object.freeze({ stat: 'firstStrikeDamagePct', value: 8, text: '첫 타격 피해 +{v}%' })
    }),
    amber: Object.freeze({
        fire: Object.freeze({ stat: 'resF', value: 5, text: '화염 저항 +{v}%' }),
        cold: Object.freeze({ stat: 'resC', value: 5, text: '냉기 저항 +{v}%' }),
        lightning: Object.freeze({ stat: 'resL', value: 5, text: '번개 저항 +{v}%' }),
        chaos: Object.freeze({ stat: 'resChaos', value: 4, text: '카오스 저항 +{v}%' })
    })
});

// 단계 이름과 아이콘 모양(assets/px/stump/<모양>-<색>.png, scripts/build-stump-icons.cjs).
const STUMP_BOX_STAGES = Object.freeze({
    seed: Object.freeze({ label: '씨앗', icon: 'seed' }),
    sprout: Object.freeze({ label: '새싹', icon: 'sprout' }),
    flower: Object.freeze({ label: '꽃', icon: 'flower' }),
    fruit: Object.freeze({ label: '열매', icon: 'fruit' }),
    sap: Object.freeze({ label: '수액', icon: 'sap' }),
    resin: Object.freeze({ label: '송진', icon: 'resin' }),
    amber: Object.freeze({ label: '호박석', icon: 'amber' }),
    sealed: Object.freeze({ label: '잠든 부적', icon: 'sealed' }),
    talisman: Object.freeze({ label: '부적', icon: 'talisman' })
});

safeExposeData({
    STUMP_BOX_SIZE, STUMP_BOX_COLORS, STUMP_BOX_OPPOSITES, STUMP_BOX_CELL_ORDER, STUMP_BOX_OPENING,
    STUMP_BOX_GROWTH, STUMP_BOX_DROPS, STUMP_BOX_ROLL_LIMIT, STUMP_BOX_STORAGE, STUMP_BOX_RESONANCE, STUMP_BOX_GRAFT, STUMP_BOX_YIELDS, STUMP_BOX_STAGES
});
