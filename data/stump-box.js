// 그루터기 함(Stump Box) 정적 데이터. 설계: docs/stump-cube-game-design.md.
// 실행 로직에 의존하지 않는다(data/ 계층). 수치는 첫 시안이며 플레이 기록으로 조정한다.
//
// 씨앗(2026-11-04 사용자: 수액을 없애고 씨앗 하나로)은 다 자라는 순간 꽃, 열매, 덩굴, 뿌리 가운데 하나로 무작위로 정해진다. 그 전에는
// 속성과 품질만 보인다. 판(5×5)에 놓인 것만 처치로 자라고, 다 자란 것만 능력치를 준다.
// 오행의 상극(STUMP_BOX_OVERCOMES)이 상하좌우로 맞닿으면 지는 쪽이 멈춘다(억제: 능력치·성장 0). 지는 쪽 곁에 그것을 낳는
// 상생(STUMP_BOX_FEEDS) 색이 있으면 풀린다. 공명, 반극, 상생, 규율의 자리 규칙(STUMP_BOX_SYNERGY)은 js/stump-box.js 판 시너지 절이 정한다.
// 부적(2026-09-30, 예전 부적 판 · 생장판 · 컨디션 룬 자리)은 색 없는 세 번째 계열이다. 판에서 처치로 깨어나고,
// 공명 · 억제에 끼지 않는다. 줄과 이웃 효과는 data/talismans.js.

const STUMP_BOX_SIZE = 5;

const STUMP_BOX_COLORS = Object.freeze({
    physical: Object.freeze({ label: '물리', tone: '#c9a27a' }),
    cold: Object.freeze({ label: '냉기', tone: '#6cb8ec' }),
    lightning: Object.freeze({ label: '번개', tone: '#f0cc3a' }),
    fire: Object.freeze({ label: '화염', tone: '#f07a34' }),
    chaos: Object.freeze({ label: '카오스', tone: '#b070dc' })
});
// 오행(2026-11-04 사용자): 목 = 물리, 화 = 화염, 토 = 카오스, 금 = 번개, 수 = 냉기. 이 두 표 한 곳에서만 정한다.
// 상극(이기는 색 → 지는 색): 목극토, 토극수, 수극화, 화극금, 금극목. 맞닿으면 지는 색만 멈춘다.
const STUMP_BOX_OVERCOMES = Object.freeze({ physical: 'chaos', chaos: 'cold', cold: 'fire', fire: 'lightning', lightning: 'physical' });
// 상생(낳는 색 → 받는 색): 목생화, 화생토, 토생금, 금생수, 수생목. 지는 색 곁에 그것을 낳는 색이 있으면 멈춤이 풀린다.
const STUMP_BOX_FEEDS = Object.freeze({ physical: 'fire', fire: 'chaos', chaos: 'lightning', lightning: 'cold', cold: 'physical' });

// 칸 해금 순서(칸 번호 = 줄 × 5 + 칸): 가운데 십자 5 → 3×3의 네 모서리 → 바깥 십자 끝 → 바깥 테 둘레 → 네 모서리.
const STUMP_BOX_CELL_ORDER = Object.freeze([12, 7, 11, 13, 17, 6, 8, 16, 18, 2, 10, 14, 22, 1, 9, 23, 15, 3, 19, 21, 5, 0, 4, 24, 20]);
// 최고 도달 루프에 따라 자동으로 열린다(콘텐츠 포인트 없음). 첫 획득(루프 1 액트 10)에 가운데 3×3 9칸이 열리고,
// 그 뒤 everyLoops 루프마다 위 순서대로 한 칸씩 열린다(2026-09-30 사용자 결정: 9칸에서 한 칸씩 → 루프 17에 25칸).
// 간격을 바꾸면 data/maps.js 로드맵의 그루터기 함 줄(루프 2 · 17)도 함께 고친다.
const STUMP_BOX_OPENING = Object.freeze({ start: 9, everyLoops: 1 });

// 성장: 판 위에서 억제되지 않은 미성숙품만 처치마다 자란다. 다 차면 씨앗은 꽃, 열매, 덩굴, 뿌리 가운데 하나가 되고(2026-11-04 사용자:
// 새싹 단계는 없앴다), 부적은 깨어난다.
// 2026-10-09 사용자 "씨앗/수액 등의 성장(거름 포함) 지금보다 훨씬 어렵게": 필요량 8배(v1Need가 그 전 값). 방치 정산 측정으로 시간당
// 처치가 시작 무렵 약 1,200, 후반 약 2,500이고 처치 하나가 평균 약 2.7 자라게 하므로, 씨앗 하나가 처치만으로 시작 무렵 약 1시간,
// 후반 약 30분 걸린다(전에는 7분과 4분쯤). 판 1 저장을 열면 자라던 비율은 그대로, 다 자란 것은 다 자란 채로 옮긴다(js/stump-box.js upgradeGrowth).
// 2026-10-15 사용자 "성장 속도 지금보단 2배정도 빨라도": 처치마다 자라는 양과 거름을 2배로 했다(필요량은 그대로라 저장된 진행 비율은
// 바뀌지 않는다). 루프 2 실제 플레이로 씨앗 하나가 약 108분에서 약 54분, 새싹까지 약 27분이다.
// legacySapNeed: 옛 저장의 수액이 다 자란(호박석) 경험치. 불러올 때 뿌리로 옮기는 데만 쓴다(js/stump-box.js cleanItemFields).
const STUMP_BOX_GROWTH = Object.freeze({
    need: Object.freeze({ seed: 3200, talisman: 2400, scar: 3200 }),
    v1Need: Object.freeze({ seed: 400, talisman: 300, scar: 400 }),
    legacySapNeed: 4000,
    perKill: Object.freeze({ normal: 2, elite: 12, boss: 60 })
});
// 씨앗이 무엇이 될지는 다 자라는 순간 같은 확률로 정해진다(2026-11-04 사용자: 키우기 전에는 모른다).
const STUMP_BOX_KINDS = Object.freeze(['flower', 'fruit', 'vine', 'root']);

// 전용 드랍: 함을 얻은 뒤 모든 처치에서 장비 드랍과 따로 굴린다. 모두 씨앗이다(2026-11-04, 전: 씨앗 60% · 수액 40%).
// 색(2026-10-06): 절반은 판에 놓인 것들의 색에서(놓인 개수만큼 무겁게), 나머지는 다섯 색에서 고르게 고른다.
// 색을 고르게만 굴리면 대부분이 지금 판과 상관없는 색이라, 판이 오래 비어 있었다.
const STUMP_BOX_DROPS = Object.freeze({
    chance: Object.freeze({ normal: 0.003, elite: 0.03, boss: 0.28 }),
    boardColorShare: 0.5,
    roll: Object.freeze({ min: 0.8, max: 1.2 })
});
// 거름(2026-10-06): 보관함의 씨앗 하나를 판에 뿌리면 사라지고, 판에서 자라는 것(억제되지 않은 미성숙품과 잠든 부적)
// 모두가 growth × 품질만큼 자란다. 보관함이 가득 찬 채 떨어진 씨앗도 버려지지 않고 거름이 된다.
// 쓸 데 없던 다른 색 드랍이 판을 앞당기는 재료가 되고, 새 루프에 다시 키우는 시간을 플레이어가 줄일 수 있다.
// 120은 보통 처치 60번이다(씨앗 하나 3,200). 2026-10-09에 100에서 60으로 줄였고(필요량은 8배라 거름 하나의 몫은 약 1/13),
// 2026-10-15 처치 성장과 함께 2배로 올렸다.
const STUMP_BOX_COMPOST = Object.freeze({ growth: 120 });
// 생육함(2026-11-03 사용자): 판처럼 놓지만 효과 없이 경험치만 받는다. 판이 받는 경험치의 rate배, 해금(stumpNurseryRate) 단계마다 ratePerRank씩 늘어 100%까지.
const STUMP_BOX_NURSERY = Object.freeze({ rate: 0.1, ratePerRank: 0.1 });
// 보관된 씨앗의 품질 범위. 드랍은 위 roll 범위로 굴리고, 조합창 합치기만 130%까지 올린다(data/stump-cube.js).
const STUMP_BOX_ROLL_LIMIT = Object.freeze({ min: 0.8, max: 1.3 });

// 보관함(부적과 같이 쓴다): 50칸에서 시작해 아래 해금 표의 storage만큼 늘어난다(stumpBox.storageLimit).
const STUMP_BOX_STORAGE_BASE = 50;
// 판 시너지(2026-11-04 사용자, 전: 다 자란 같은 색 3개 이상이면 판 어디에 있든 그 색 +10%): 공명은 곧은 줄 셋, 상생은 비활성화를
// 막아 줄 때만, 규율은 다섯 색 한 줄. 한 아이템의 보너스는 더한다.
const STUMP_BOX_SYNERGY = Object.freeze({
    resonance: Object.freeze({ label: '공명', length: 3, bonusPct: 10 }),
    feed: Object.freeze({ label: '상생', bonusPct: 10 }),
    discipline: Object.freeze({ label: '규율', bonusPct: 15 })
});

// 수확 일지(2026-10-07 해금 1차 A1): 처음 다 자란 꽃, 열매, 덩굴, 뿌리 × 5색 20칸(키 = 아이콘 이름 '<모양>-<색>', 2026-11-04 전: 꽃, 열매, 호박석 × 4색).
// 한 줄(같은 모양 다섯 색)을 채우면 한 번 선물: 색을 골라 받는 씨앗 1개, 품질은 드랍 최고.
const STUMP_BOX_HARVEST = Object.freeze({ rows: STUMP_BOX_KINDS, giftRoll: STUMP_BOX_DROPS.roll.max });

// 그루터기 함 해금(2026-10-07 1차, docs/stump-box-unlocks-review-20261007.md). 조건은 저장하지 않고 계산한다:
// loop = 최고 도달 루프 이상, journal = 그 저널을 얻음, harvestRows = 수확 일지에서 채운 줄 수 이상,
// harvestCells = 수확 일지 칸 수 이상, harvestRow = 그 줄(같은 것 네 색)을 채움.
// 2026-10-08 다음 해금(16번, 사용자 결정): 거름 한꺼번에, 번식, 씨앗 주머니, 봉인 칸(무료)과 포식, 품질 상한, 접붙이기 6단계.
const STUMP_BOX_UNLOCKS = Object.freeze([
    Object.freeze({ id: 'storage_harvest', label: '보관함 +25', when: Object.freeze({ harvestRows: 1 }), storage: 25 }),
    Object.freeze({ id: 'storage_labyrinth', label: '보관함 +25', when: Object.freeze({ journal: 'labyrinth_10' }), storage: 25 }),
    // 뿌리 기억(2026-11-04 사용자, 전: 루프가 바뀌어도 성장 완료된 아이템의 경험치 25%, 나무꾼의 잔상 저널로 50% 유지): 봉인 칸 밖이 모두
    // 사라지게 되어 봉인 칸 +1이 됐다. id는 그대로다(본 해금 알림과 저장의 해금 기록).
    Object.freeze({ id: 'root_memory_loop', label: '뿌리 기억, 봉인 칸 +1', when: Object.freeze({ content: 'rootMemory' }), sealSlots: 1, rootMemory: true }),
    Object.freeze({ id: 'root_memory_echo', label: '뿌리 기억 2, 봉인 칸 +1', when: Object.freeze({ journal: 'woodsman_echo' }), sealSlots: 1, rootMemory: true }),
    Object.freeze({ id: 'compost_bulk', label: '일괄 거름 사용', when: Object.freeze({ harvestCells: 4 }), bulkCompost: true }),
    Object.freeze({ id: 'breeding', label: '번식', when: Object.freeze({ harvestRow: 'fruit' }), breeding: true }),
    Object.freeze({ id: 'pouch_meteor_fall', label: '씨앗 주머니', when: Object.freeze({ journal: 'meteor_fall' }), pouch: true }),
    Object.freeze({ id: 'pouch_beehive_queen', label: '씨앗 주머니', when: Object.freeze({ journal: 'beehive_queen' }), pouch: true }),
    Object.freeze({ id: 'pouch_void_grand_breach', label: '씨앗 주머니', when: Object.freeze({ journal: 'void_grand_breach' }), pouch: true }),
    Object.freeze({ id: 'seal_1', label: '봉인 칸 1, 포식', when: Object.freeze({ content: 'stumpSeal1' }), sealSlots: 1, devour: true }),
    Object.freeze({ id: 'seal_2', label: '봉인 칸 2', when: Object.freeze({ content: 'stumpSeal2' }), sealSlots: 1 }),
    Object.freeze({ id: 'quality_140', label: '품질 상한 140%', when: Object.freeze({ content: 'stumpQuality1' }), qualityCap: 1.4 }),
    Object.freeze({ id: 'seal_3', label: '봉인 칸 3', when: Object.freeze({ content: 'stumpSeal3' }), sealSlots: 1 }),
    Object.freeze({ id: 'quality_150', label: '품질 상한 150%, 접붙이기 6단계', when: Object.freeze({ content: 'stumpQuality2' }), qualityCap: 1.5, graftRanks: 1 }),
    // 루프 50 이후 이정표(2026-10-09, data/maps.js SEASON_CONTENT_ROADMAP): 봉인 칸, 품질 상한, 접붙이기 단계가 이어서 열린다.
    Object.freeze({ id: 'seal_4', label: '봉인 칸 4', when: Object.freeze({ content: 'stumpSeal4' }), sealSlots: 1 }),
    Object.freeze({ id: 'quality_160', label: '품질 상한 160%, 접붙이기 7단계', when: Object.freeze({ content: 'stumpQuality3' }), qualityCap: 1.6, graftRanks: 1 }),
    Object.freeze({ id: 'seal_5', label: '봉인 칸 5', when: Object.freeze({ content: 'stumpSeal5' }), sealSlots: 1 }),
    Object.freeze({ id: 'quality_170', label: '품질 상한 170%, 접붙이기 8단계', when: Object.freeze({ content: 'stumpQuality4' }), qualityCap: 1.7, graftRanks: 1 }),
    Object.freeze({ id: 'seal_6', label: '봉인 칸 6', when: Object.freeze({ content: 'stumpSeal6' }), sealSlots: 1 }),
    Object.freeze({ id: 'quality_180', label: '품질 상한 180%, 접붙이기 9단계', when: Object.freeze({ content: 'stumpQuality5' }), qualityCap: 1.8, graftRanks: 1 })
]);

// 다 자라는 순간(16번): 씨앗이 다 자라면 한 번 굴린다. 봉인 칸의 것은 굴린 그대로 루프를 넘긴다(그 밖의 것은 루프와 함께 사라진다).
// bumper = 풍작(이번에 다 자란 동안 품질 +quality), golden = 황금(모든 줄 ×mul; 다 자랄 때 chance, 함 드랍 dropChance, 번식은
// STUMP_BOX_BREEDING). 추가 줄 수는 품질이 확률만 바꾼다(사용자: 품질로 정해지면 재미없다): lineOdds의 품질 사이는 선형으로 잇는다.
// 줄 값은 STUMP_BOX_EXTRA_LINES 기준값의 lineValue배(무작위)다. 확률은 사용자가 두 번 낮췄다(2026-10-08).
// 보스 상대 피해 추가 줄(2026-11-03 사용자 너프): 기준값이 낮고, 다른 줄의 절반 확률로 뽑히며, 값의 폭도 더 낮은 곳에서 시작한다. weight, span이 없는 줄은 1과 lineValue.
const BOSS_EXTRA_LINE = Object.freeze({ stat: 'bossDamagePct', value: 1.5, weight: 0.5, span: Object.freeze({ min: 0.4, max: 1 }), text: '보스 상대 피해 +{v}%' });
const STUMP_BOX_RIPENING = Object.freeze({
    // Once per bloom. These unique lines never scale with quality, resonance or grafts.
    // 2026-11-04: 물리 줄, 덩굴(새로), 뿌리(옛 호박석 그대로에 물리)를 더했다. 수치는 사용자에게 표로 보인 첫 시안이다.
    albino: Object.freeze({ chance: 0.0001, tone: '#e8ddff', variants: Object.freeze({
        flower: Object.freeze({
            physical: [{ stat: 'physGemLevel', value: 3, text: '물리 스킬룬 레벨 +{v}' }],
            fire: [{ stat: 'fireGemLevel', value: 3, text: '화염 스킬룬 레벨 +{v}' }],
            cold: [{ stat: 'coldGemLevel', value: 3, text: '냉기 스킬룬 레벨 +{v}' }],
            lightning: [{ stat: 'lightGemLevel', value: 3, text: '번개 스킬룬 레벨 +{v}' }],
            chaos: [{ stat: 'chaosGemLevel', value: 3, text: '카오스 스킬룬 레벨 +{v}' }]
        }),
        fruit: Object.freeze({
            physical: [{ stat: 'gemLevel', value: 1, text: '모든 스킬룬 레벨 +{v}' }],
            fire: [{ stat: 'meleeGemLevel', value: 3, text: '근접 스킬룬 레벨 +{v}' }, { stat: 'slamGemLevel', value: 2, text: '강타 스킬룬 레벨 +{v}' }],
            cold: [{ stat: 'spellGemLevel', value: 3, text: '주문 스킬룬 레벨 +{v}' }],
            lightning: [{ stat: 'projectileGemLevel', value: 3, text: '투사체 스킬룬 레벨 +{v}' }],
            chaos: [{ stat: 'summonGemLevel', value: 3, text: '소환수 공격 스킬룬 레벨 +{v}' }, { stat: 'dotGemLevel', value: 2, text: '지속 스킬룬 레벨 +{v}' }]
        }),
        vine: Object.freeze({
            physical: [{ stat: 'ds', value: 15, text: '연속 타격 확률 +{v}%' }],
            fire: [{ stat: 'move', value: 20, text: '이동 속도 +{v}%' }],
            cold: [{ stat: 'cooldownReduction', value: 15, text: '재사용 대기시간 감소 +{v}%' }],
            lightning: [{ stat: 'aspd', value: 15, text: '공격/시전 속도 +{v}%' }],
            chaos: [{ stat: 'skillDelayReduce', value: 10, text: '공격 딜레이 감소 +{v}%' }]
        }),
        root: Object.freeze({
            physical: [{ stat: 'doubleDamageChance', value: 10, text: '두 배 피해 확률 +{v}%' }],
            fire: [{ stat: 'runeResonancePower', value: 50, text: '공명력 +{v}' }],
            cold: [{ stat: 'spellRepeatChance', value: 25, text: '주문 이중 시전 확률 +{v}%' }],
            lightning: [{ stat: 'projectileExtraShots', value: 2, text: '투사체 추가 발사 +{v}' }],
            chaos: [{ stat: 'suppCap', value: 1, text: '보조스킬룬 한도 +{v}' }, { stat: 'runeResonancePower', value: 20, text: '공명력 +{v}' }]
        })
    }) }),
    bumper: Object.freeze({ chance: 0.08, quality: 0.1 }),
    golden: Object.freeze({ chance: 0.005, dropChance: 0.001, mul: 1.2 }),
    lineOdds: Object.freeze([
        Object.freeze({ roll: 0.8, odds: Object.freeze([0.65, 0.30, 0.045, 0.005]) }),
        Object.freeze({ roll: 1.0, odds: Object.freeze([0.55, 0.37, 0.07, 0.01]) }),
        Object.freeze({ roll: 1.3, odds: Object.freeze([0.40, 0.45, 0.125, 0.025]) }),
        Object.freeze({ roll: 1.5, odds: Object.freeze([0.32, 0.47, 0.17, 0.04]) })
    ]),
    lineValue: Object.freeze({ min: 0.7, max: 1.3 })
});
// 추가 줄 후보(품질 100% 기준값, 본 줄의 절반쯤): 종류와 색마다 여섯(2026-11-04 사용자: 더 다양하게, 전: 셋). 꽃은 그 원소의 상태 이상과
// 공격 갈래, 열매는 자기 것이 아닌 상황 줄, 덩굴은 다른 덩굴의 본 줄 절반과 재사용 대기시간, 뿌리는 방어(옛 호박석의 셋을 품는다).
// 옛 저장의 줄이 남도록 전의 후보는 모두 그대로 들어 있다(js/stump-box.js cleanHarvest는 후보에 없는 줄을 버린다).
const STUMP_LINE = Object.freeze({
    bleedChance: { stat: 'bleedChance', value: 3, text: '출혈 확률 +{v}%' },
    bleedDuration: { stat: 'bleedDurationPct', value: 5, text: '출혈 지속시간 +{v}%' },
    physIgnore: { stat: 'physIgnore', value: 1.5, text: '물리 피해 감소 무시 +{v}%' },
    igniteChance: { stat: 'igniteChance', value: 3, text: '점화 확률 +{v}%' },
    igniteEffect: { stat: 'igniteDamageMultiplierPct', value: 5, text: '점화 효율 +{v}%' },
    freezeChance: { stat: 'freezeChance', value: 3, text: '동결 확률 +{v}%' },
    chillEffect: { stat: 'chillEffect', value: 5, text: '냉각 효율 +{v}%' },
    shockChance: { stat: 'shockChance', value: 3, text: '감전 확률 +{v}%' },
    shockEffect: { stat: 'shockEffect', value: 5, text: '감전 효율 +{v}%' },
    poisonChance: { stat: 'poisonChance', value: 3, text: '중독 확률 +{v}%' },
    poisonDamage: { stat: 'poisonDamageMultiplierPct', value: 5, text: '중독 피해 +{v}%' },
    dot: { stat: 'dotPctDmg', value: 3, text: '지속 피해 배율 +{v}%' },
    resPen: { stat: 'resPen', value: 1.5, text: '저항 관통 +{v}%' },
    melee: { stat: 'meleePctDmg', value: 4, text: '근접 피해 +{v}%' },
    projectile: { stat: 'projectilePctDmg', value: 4, text: '투사체 피해 +{v}%' },
    area: { stat: 'aoePctDmg', value: 4, text: '범위 피해 +{v}%' },
    ailmentDamage: { stat: 'ailmentDamagePct', value: 4, text: '상태이상 피해 +{v}%' },
    ailmentPotency: { stat: 'ailmentPotencyPct', value: 3, text: '상태이상 위력 +{v}%' },
    shocked: { stat: 'shockedEnemyHitDamagePct', value: 4, text: '감전된 적에게 주는 명중 피해 +{v}%' },
    crit: { stat: 'crit', value: 1, text: '치명타 확률 +{v}%' },
    critDamage: { stat: 'critDmg', value: 6, text: '치명타 피해 +{v}%' },
    spellCrit: { stat: 'spellCritDmg', value: 8, text: '주문 치명타 피해 +{v}%' },
    elite: { stat: 'eliteDamagePct', value: 2.5, text: '정예 상대 피해 +{v}%' },
    firstStrike: { stat: 'firstStrikeDamagePct', value: 4, text: '첫 타격 피해 +{v}%' },
    alone: { stat: 'takenDamageReduceWhen1EnemyPct', value: 1, text: '적이 하나일 때 받는 피해 -{v}%' },
    crowd: { stat: 'takenDamageReduceWhen2EnemiesPct', value: 1, text: '적이 둘 이상일 때 받는 피해 -{v}%' },
    double: { stat: 'doubleDamageChance', value: 1, text: '피해 2배 확률 +{v}%' },
    cull: { stat: 'cullStrikePct', value: 1, text: '처형 일격 +{v}%' },
    critTaken: { stat: 'critTakenDamageReducePct', value: 2.5, text: '치명타로 받는 피해 -{v}%' },
    taken: { stat: 'genericTakenDamageReducePct', value: 1, text: '받는 피해 -{v}%' },
    cooldown: { stat: 'cooldownReduction', value: 2, text: '재사용 대기시간 감소 +{v}%' },
    mobilityCooldown: { stat: 'mobilityCooldownReduction', value: 4, text: '이동 룬 재사용 대기시간 감소 +{v}%' },
    hp: { stat: 'pctHp', value: 2, text: '생명력 +{v}%' },
    flatHp: { stat: 'flatHp', value: 20, text: '최대 생명력 +{v}' },
    resAll: { stat: 'resAll', value: 2, text: '모든 원소 저항 +{v}%' },
    armor: { stat: 'armorPct', value: 4, text: '방어도 +{v}%' },
    evasion: { stat: 'evasionPct', value: 4, text: '회피 +{v}%' },
    shield: { stat: 'energyShieldPct', value: 4, text: '에너지 보호막 +{v}%' },
    regen: { stat: 'regen', value: 0.2, text: '초당 생명력 재생 +{v}%' }
});
const linesOf = (...keys) => Object.freeze(keys.map(key => (typeof key === 'string' ? Object.freeze(STUMP_LINE[key]) : Object.freeze(key))));
// 덩굴의 본 줄(속도)은 STUMP_BOX_YIELDS.vine이 이 표를 쓰고, 추가 줄은 다른 덩굴의 본 줄 절반에 재사용 대기시간 둘을 더한다.
const VINE_YIELDS = Object.freeze({
    physical: Object.freeze({ stat: 'ds', value: 2, text: '연속 타격 확률 +{v}%' }),
    cold: Object.freeze({ stat: 'cooldownRecovery', value: 6, text: '재사용 대기시간 회복 속도 +{v}%' }),
    lightning: Object.freeze({ stat: 'aspd', value: 3, text: '공격/시전 속도 +{v}%' }),
    fire: Object.freeze({ stat: 'move', value: 4, text: '이동 속도 +{v}%' }),
    chaos: Object.freeze({ stat: 'skillDelayReduce', value: 1, text: '공격 딜레이 감소 +{v}%' })
});
const VINE_EXTRA_LINES = Object.freeze(Object.fromEntries(Object.keys(VINE_YIELDS).map(color => [color, linesOf(
    ...Object.entries(VINE_YIELDS).filter(([other]) => other !== color).map(([, line]) => ({ ...line, value: line.value / 2 })), 'cooldown', 'mobilityCooldown')])));
const STUMP_BOX_EXTRA_LINES = Object.freeze({
    flower: Object.freeze({
        physical: linesOf('bleedChance', 'bleedDuration', 'physIgnore', 'melee', 'critDamage', 'area'),
        cold: linesOf('freezeChance', 'chillEffect', 'resPen', 'spellCrit', 'projectile', 'crit'),
        lightning: linesOf('shockChance', 'shockEffect', 'resPen', 'shocked', 'projectile', 'critDamage'),
        fire: linesOf('igniteChance', 'igniteEffect', 'resPen', 'ailmentDamage', 'area', 'crit'),
        chaos: linesOf('poisonChance', 'poisonDamage', 'dot', 'ailmentPotency', 'area', 'resPen')
    }),
    fruit: Object.freeze({
        physical: linesOf(BOSS_EXTRA_LINE, 'elite', 'firstStrike', 'alone', 'double', 'cull'),
        cold: linesOf(BOSS_EXTRA_LINE, 'elite', 'firstStrike', 'crowd', 'double', 'critTaken'),
        lightning: linesOf(BOSS_EXTRA_LINE, 'firstStrike', 'alone', 'crowd', 'cull', 'double'),
        fire: linesOf('elite', 'firstStrike', 'alone', 'crowd', 'double', 'cull'),
        chaos: linesOf(BOSS_EXTRA_LINE, 'elite', 'alone', 'crowd', 'cull', 'critTaken')
    }),
    vine: VINE_EXTRA_LINES,
    root: Object.freeze({
        physical: linesOf('armor', 'hp', 'critTaken', 'taken', 'flatHp', 'resAll'),
        cold: linesOf({ stat: 'maxResC', value: 0.5, text: '최대 냉기 저항 +{v}%' }, 'hp', 'evasion', 'flatHp', 'taken', 'resAll'),
        lightning: linesOf({ stat: 'maxResL', value: 0.5, text: '최대 번개 저항 +{v}%' }, 'hp', 'shield', 'flatHp', 'taken', 'resAll'),
        fire: linesOf({ stat: 'maxResF', value: 0.5, text: '최대 화염 저항 +{v}%' }, 'hp', 'armor', 'flatHp', 'taken', 'resAll'),
        chaos: linesOf({ stat: 'maxResChaos', value: 0.5, text: '최대 카오스 저항 +{v}%' }, 'hp', 'regen', 'flatHp', 'taken', 'critTaken')
    })
});
// 포식(16번, 사용자 설계): 불씨의 흉터는 씨앗처럼 판에서 자라 깨어나고, 깨어나면 흡수한 능력치를 준다. 루프를 넘길 때 봉인 칸에서
// 깨어난 흉터는 둘레 8칸(판 밖과 닫힌 칸도 센다)에서 한 칸을 똑같은 확률로 골라, 씨앗이면 먹고 그 기본, 추가, 알비노 줄을 absorb.ripe만큼
// 흡수한다(공명과 접붙이기는 빼고 품질과 황금은 넣는다). 자라던 씨앗은 먹혀도 아무것도 주지 않는다(2026-11-04 사용자: 효과가 없으므로).
// 빈칸, 부적, 다른 흉터를 고르면 그 루프의 기회가 사라진다. 흡수는 능력치마다 그 능력치의 가장 큰 기준값 × capMul까지 쌓이고, 능력치는
// maxLines줄까지다(다 찬 뒤 새 능력치는 사라진다). 판에는 하나만 놓는다(js/stump-box.js ONE_ON_BOARD): 새 흉터는 옵션을 다시 뽑을 때 바꿔 쓴다.
// 봉인 칸 밖의 흉터는 루프와 함께 사라진다. 봉인 칸이 열려야(seal_1) 얻는다: 포식이 열릴 때 하나(box.scarGift), 아틀라스 최종 보스(정점
// 다섯) 처치마다 bossChance, 번식 돌연변이. tone은 화면의 불씨 색.
const STUMP_BOX_SCAR = Object.freeze({ name: '불씨의 흉터', absorb: Object.freeze({ ripe: 0.5 }), capMul: 3, maxLines: 3, bossChance: 0.15,
    tone: '#e0561a' });
// 번식(16번, 수확 일지 열매 줄): 루프를 넘길 때 다 자란 열매마다 씨앗 하나가 보관함으로(가득 차면 거름). 품질은 드랍처럼 굴린다.
// 돌연변이: color = 다른 색, golden = 황금 씨앗, scar = 씨앗 대신 불씨의 흉터(포식이 열린 뒤).
const STUMP_BOX_BREEDING = Object.freeze({ mutation: Object.freeze({ color: 0.05, golden: 0.005, scar: 0.003 }) });
// 씨앗 주머니(16번): 해금 줄의 저널마다 한 번. 열면 무작위 씨앗 offers개 가운데 하나를 고른다(고르기 전에는 저장해 두어 다시 굴리지 않는다).
const STUMP_BOX_SEED_POUCH = Object.freeze({ offers: 3, roll: Object.freeze({ min: 0.9, max: 1.2 }) });
// 일괄 거름 사용과 일괄 버리기(16번, 2026-10-09 이름과 버리기): 보관함 분류(전체나 한 색)의 씨앗을 한 번에. 누르면 무엇을
// 쓰는지 먼저 보여 준다. 거름은 색마다 품질이 가장 좋은 keep개, 황금, 고대 씨앗을 남긴다(합치기 재료). 버리기는 황금, 고대
// 씨앗과 자란(경험치가 있는) 씨앗만 남긴다(2026-10-17 사용자: 셋씩 남기니 75개 가운데 25개만 버려졌다).
const STUMP_BOX_BULK_COMPOST = Object.freeze({ keep: 3 });
// 부적 도감(16번): 고유 부적과 야생 고유 부적의 첫 획득. every종마다 보관함 +storage.
const STUMP_BOX_TALISMAN_CODEX = Object.freeze({ every: 5, storage: 2 });

// 접붙이기(2026-10-01, 보조 콘텐츠 통합 7단계 — 가지치기 자리, 사용자 결정 "칸 강화 5단계"): 최고 도달 루프가 startLoop 이상이면
// 루프마다 pointsPerLoop점(저장하지 않고 루프에서 계산). 칸마다 maxRank단계, n단계에 n점. 단계마다 그 칸에 놓인 씨앗 · 수액의
// 능력치와 부적 자신의 줄 +pctPerRank%. 마름병 포자 refundSpores개로 한 단계 되돌린다(점수는 돌아온다). 수치는 9단계에서 맞춘다.
// startLoop를 바꾸면 data/maps.js 로드맵의 루프 18 줄도 함께 고친다.
// 단계당 +10%(9단계 측정: +6%는 옛 가지치기 피해 +6~18% · 생명력 +3~13%의 절반에 못 미쳤다).
// journalPoints(2026-10-07 해금 1차 C2): 저널 하나마다 더하는 점수(정점 보스 4개 +3, 버려진 날 6개 +2, 최대 +24).
const STUMP_BOX_GRAFT = Object.freeze({ startLoop: 18, pointsPerLoop: 3, maxRank: 5, pctPerRank: 10, refundSpores: 1,
    journalPoints: Object.freeze({ pinnacle_underking: 3, pinnacle_leviathan: 3, pinnacle_sky: 3, pinnacle_observer: 3,
        rival_overheat: 2, rival_dull: 2, rival_glutton: 2, rival_afterimage: 2, rival_backedge: 2, rival_masterwork: 2 }) });

// 다 자란 아이템의 능력치(품질 100% 기준, 실제 = 값 × 품질). stat은 createEmptyStatBucket의 키.
// 꽃 = 그 원소 스킬에만 붙는 피해(현재 공격 룬 태그 조건), 열매 = 전투 상황 조건, 덩굴 = 속도, 뿌리 = 고정 저항(옛 호박석, 물리는 물리 피해 감소).
const STUMP_BOX_YIELDS = Object.freeze({
    flower: Object.freeze({
        physical: Object.freeze({ stat: 'physPctDmg', value: 6, text: '물리 피해 +{v}%' }),
        fire: Object.freeze({ stat: 'firePctDmg', value: 6, text: '화염 피해 +{v}%' }),
        cold: Object.freeze({ stat: 'coldPctDmg', value: 6, text: '냉기 피해 +{v}%' }),
        lightning: Object.freeze({ stat: 'lightPctDmg', value: 6, text: '번개 피해 +{v}%' }),
        chaos: Object.freeze({ stat: 'chaosPctDmg', value: 6, text: '카오스 피해 +{v}%' })
    }),
    fruit: Object.freeze({
        physical: Object.freeze({ stat: 'takenDamageReduceWhen2EnemiesPct', value: 2, text: '적이 둘 이상일 때 받는 피해 -{v}%' }),
        fire: Object.freeze({ stat: 'bossDamagePct', value: 3, text: '보스 상대 피해 +{v}%' }),
        cold: Object.freeze({ stat: 'takenDamageReduceWhen1EnemyPct', value: 2, text: '적이 하나일 때 받는 피해 -{v}%' }),
        lightning: Object.freeze({ stat: 'eliteDamagePct', value: 5, text: '정예 상대 피해 +{v}%' }),
        chaos: Object.freeze({ stat: 'firstStrikeDamagePct', value: 8, text: '첫 타격 피해 +{v}%' })
    }),
    vine: VINE_YIELDS,
    root: Object.freeze({
        physical: Object.freeze({ stat: 'dr', value: 2, text: '물리 피해 감소 +{v}%' }),
        fire: Object.freeze({ stat: 'resF', value: 5, text: '화염 저항 +{v}%' }),
        cold: Object.freeze({ stat: 'resC', value: 5, text: '냉기 저항 +{v}%' }),
        lightning: Object.freeze({ stat: 'resL', value: 5, text: '번개 저항 +{v}%' }),
        chaos: Object.freeze({ stat: 'resChaos', value: 3, text: '카오스 저항 +{v}%' })
    })
});

// 단계 이름과 아이콘 모양(assets/items/stump-pixel-v1/<모양>-<색>.png). 이전 assets/px/stump 원본은 보존한다.
const STUMP_BOX_STAGES = Object.freeze({
    seed: Object.freeze({ label: '씨앗', icon: 'seed' }),
    flower: Object.freeze({ label: '꽃', icon: 'flower' }),
    fruit: Object.freeze({ label: '열매', icon: 'fruit' }),
    vine: Object.freeze({ label: '덩굴', icon: 'vine' }),
    root: Object.freeze({ label: '뿌리', icon: 'root' }),
    sealed: Object.freeze({ label: '잠든 부적', icon: 'sealed' }),
    talisman: Object.freeze({ label: '부적', icon: 'talisman' }),
    scarAsleep: Object.freeze({ label: '식은 흉터', icon: 'scar-ash' }),
    scar: Object.freeze({ label: '불씨의 흉터', icon: 'scar-ember' })
});

// 고대 씨앗(12번 루프 42, data/stump-nursery.js, js/stump-nursery.js): 다 자라면 공명과 규율의 줄에서 어느 색이든 되고(곁에 있어도 줄을
// 깨지 않는다), 상하좌우 이웃 칸의 접붙이기를 이만큼 올린다(자기 칸은 그대로).
const STUMP_BOX_ANCIENT = Object.freeze({ graftRanks: 1 });

safeExposeData({
    STUMP_BOX_SIZE, STUMP_BOX_COLORS, STUMP_BOX_OVERCOMES, STUMP_BOX_FEEDS, STUMP_BOX_CELL_ORDER, STUMP_BOX_OPENING,
    STUMP_BOX_GROWTH, STUMP_BOX_KINDS, STUMP_BOX_DROPS, STUMP_BOX_COMPOST, STUMP_BOX_NURSERY, STUMP_BOX_ROLL_LIMIT, STUMP_BOX_STORAGE_BASE, STUMP_BOX_SYNERGY, STUMP_BOX_GRAFT, STUMP_BOX_YIELDS, STUMP_BOX_STAGES,
    STUMP_BOX_HARVEST, STUMP_BOX_UNLOCKS, STUMP_BOX_RIPENING, STUMP_BOX_EXTRA_LINES, STUMP_BOX_SCAR, STUMP_BOX_BREEDING, STUMP_BOX_SEED_POUCH,
    STUMP_BOX_BULK_COMPOST, STUMP_BOX_TALISMAN_CODEX, STUMP_BOX_ANCIENT
});
