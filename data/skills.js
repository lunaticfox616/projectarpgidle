if (typeof safeExposeData !== 'function') throw new Error('data/constants.js must load before data/skills.js');

// 투사체 '추가 발사'(장비/패시브/유니크/부적으로 얻는 보너스 샷)의 기본 피해 비율(%).
// 과거에는 보너스 샷이 100% 피해로 반복되어 추가 발사 +5 = DPS ×6이라는 천장 뚫는 곱연산이 됐다.
// 이제 보너스 샷은 기본적으로 기본 타격의 이 비율만큼만 피해를 준다(추가 발사 +5 = ×3.0).
// 스킬이 extraProjectileDamagePct를 직접 정의하면(예: 연발 사격 45) 그 값이 우선한다.
const PROJECTILE_BONUS_SHOT_DAMAGE_PCT = 40;

// 투사체의 기본/변경 발사 방식. 실제 판정과 툴팁이 함께 소비하는 단일 정의다.
const PROJECTILE_PATTERN_MODE_DB = Object.freeze({
    pierce: { label: '직선 관통' },
    chain: { label: '연쇄 투척' },
    fan: { label: '부채꼴 연사' },
    delayedBlast: { label: '관통 후 지연 폭발' },
    lob: { label: '곡사 투척' },
    // spreadDeg: 가운데 투사체는 대상을 겨누고 양옆은 45도(2026-10-07). 예전에는 8방향으로만 쏘아 가로세로와 대각선 밖의 대상을
    // 가운데 투사체도 빗나갔다(연발 사격과 같은 문제). 폭은 예전 8방향과 같다.
    split: { label: '삼갈래 분산', kind: 'fan', rays: 3, spreadDeg: 45, targetMode: 'spread', minTargets: 3, damageMultiplier: 0.72, extraProjectileDamagePct: 45 },
    focus: { label: '단일 집속', kind: 'line', targetMode: 'single', targetLimit: 1, damageMultiplier: 1.55, extraProjectileDamagePct: 40 },
    return: { label: '귀환 궤도', kind: 'line', targetMode: 'pierce', damageMultiplier: 0.9, combatPattern: { kind: 'boomerang', returnDelayMs: 160 } }
});

/** Basic projectile travel is straight. Optional projectilePattern.trajectory='stages'
 * preserves each hit stage's source/target route for custom bouncing or branching skills.
 * Chain, fan, return and authored combatPattern.stages retain separate routes automatically.
 * This changes presentation only; combatPattern owns hit geometry, timing and damage.
 * An authored combatPattern owns a fixed cast aim and ordered phases (milliseconds).
 * Each stage defines label, delayMs, damagePct and optional grid overrides, element or skipGridControl.
 * Grid overrides are merged with SKILL_GRID_DB before calculating BOTH collision and visual footprints.
 * Phases replay once; each phase's damagePct is a percentage of the existing base hit coefficient.
 */
const SKILL_DB = {
    '기본 공격': { isGem: false, levelable: true, baseDmg: 1.0, baseSpd: 1.0, dmgScale: 0.05, spdScale: 0.01, leech: 0, crit: 0, ele: 'phys', targetMode: 'single', targets: 1, desc: '가장 가까운 적 하나를 가격합니다. 레벨업당 피해 배율 +5%, 공격 속도 +1%가 적용됩니다.', tags: ['attack', 'melee', 'physical'] },
    '이중 베기': { isGem: true, baseDmg: 0.6, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0.03, spdScale: 0.02, ele: 'phys', multiHit: 2, repeatHitDamagePct: 100, targetMode: 'cleave', targets: 2, desc: 'X자로 엇갈리게 두 번 벱니다. 두 번 모두 같은 피해를 줍니다.', tags: ['attack', 'melee', 'physical'] },
    '강타': { isGem: true, baseDmg: 2.5, baseSpd: 0.5, leech: 0, crit: 5, dmgScale: 0.15, spdScale: 0, ele: 'phys', targetMode: 'single', targets: 1, aftershockDamagePct: 38, aftershockDelayMs: 420, desc: '총 피해의 62%를 본 타격으로 주고, 0.42초 후 나머지 38%를 여진으로 가합니다.', tags: ['attack', 'melee', 'physical', 'slam'] },
    '흡혈 관통': { isGem: true, baseDmg: 1.0, baseSpd: 1.0, leech: 0.5, instantLeech: true, crit: 5, dmgScale: 0.05, spdScale: 0.01, ele: 'phys', targetMode: 'pierce', targets: 3, desc: '피의 바늘이 앞 2칸을 꿰뚫어 적 셋을 찌릅니다. 이 룬으로 준 피해의 흡혈은 즉시 회복됩니다.', tags: ['attack', 'melee', 'physical'] },
    '기습 공격': { isGem: true, baseDmg: 1.35, baseSpd: 0.9, leech: 0, crit: 15, dmgScale: 0.05, spdScale: 0.01, ele: 'phys', fullLifeDamageMorePct: 35, targetMode: 'single', targets: 1, desc: '생명력이 가득 찬 적에게 35% 증폭된 피해를 주는 선제 처형기입니다.', tags: ['attack', 'melee', 'physical'] },
    '회오리': { isGem: true, baseDmg: 0.34, baseSpd: 1.65, leech: 0, crit: 0, dmgScale: 0.014, spdScale: 0.04, ele: 'phys', crowdDamageMorePerEnemyPct: 4, crowdDamageMoreCapPct: 28, targetMode: 'whirl', targets: 8, desc: '0.08초마다 회전하며 그 순간 서 있는 칸 둘레의 아직 베지 않은 적을 하나씩 벱니다(움직이는 중에도 이어짐). 자신을 포위한 적 한 기당 피해가 4%씩 최대 28% 증폭됩니다.', tags: ['attack', 'melee', 'physical', 'aoe'] },
    '번개 타격': { isGem: true, baseDmg: 1.15, baseSpd: 1.15, leech: 0, crit: 5, dmgScale: 0.06, spdScale: 0.03, ele: 'light', chainStepDamagePct: -12, ailmentChanceBonus: { shock: 25 }, targetMode: 'chain', targets: 3, desc: '첫 대상을 강하게 타격한 뒤 연쇄됩니다. 도약마다 피해가 12% 감소하고 감전 확률이 25% 증가합니다.', tags: ['attack', 'melee', 'elemental', 'lightning', 'chain'] },
    '얼음 창': { isGem: true, baseDmg: 1.7, baseSpd: 0.75, leech: 0, crit: 8, critScale: 0.5, dmgScale: 0.1, spdScale: 0, ele: 'cold', projectileTravelTimeMultiplier: 0.28, projectilePattern: { mode: 'pierce', kind: 'line' }, targetMode: 'pierce', targets: 2, desc: '매우 빠른 빙창이 적 둘을 꿰뚫습니다. 추가 치명타는 룬 레벨에 따라 성장합니다.', tags: ['attack', 'projectile', 'elemental', 'cold'] },
    '화염 참격': { isGem: true, baseDmg: 1.16, baseSpd: 1.05, leech: 0, crit: 5, dmgScale: 0.065, spdScale: 0.02, ele: 'fire', targetMode: 'cleave', targets: 2, ailmentChanceBonus: { ignite: 25 }, activeAilmentDamageMore: { type: 'ignite', pct: 15 }, desc: '점화 확률 +25%. 점화 중인 적에게 주는 적중 피해가 15% 증폭됩니다.', tags: ['attack', 'melee', 'elemental', 'fire'] },
    '독창 투척': { isGem: true, baseDmg: 0.92, baseSpd: 1.15, leech: 0, crit: 8, dmgScale: 0.045, spdScale: 0.03, ele: 'chaos', projectilePattern: { mode: 'chain', kind: 'chain' }, targetMode: 'chain', targets: 2, ailmentChanceBonus: { poison: 30 }, ailmentSpreadOnHit: { type: 'poison', chance: 0.65, targets: 1 }, desc: '중독 확률 +30%. 중독된 적을 적중하면 65% 확률로 다른 적 하나에게 중독을 전파합니다.', tags: ['attack', 'projectile', 'chaos'] },
    '번개 창': { isGem: true, baseDmg: 1.4, baseSpd: 0.95, leech: 0, crit: 10, dmgScale: 0.08, spdScale: 0.02, ele: 'light', projectilePattern: { mode: 'pierce', kind: 'line' }, distanceDamageMorePerCellPct: 6, distanceDamageMoreCapPct: 30, ailmentChanceBonus: { shock: 20 }, targetMode: 'pierce', targets: 3, desc: '거리가 한 칸 멀어질 때마다 피해가 6%씩 최대 30% 증폭되는 관통 번개 창입니다.', tags: ['attack', 'projectile', 'elemental', 'lightning'] },
    '관통 사격': { isGem: true, baseDmg: 1.25, baseSpd: 1.08, leech: 0, crit: 7, dmgScale: 0.07, spdScale: 0.03, ele: 'phys', projectilePattern: { mode: 'pierce', kind: 'line' }, targetMode: 'pierce', targets: 4, pierceOverkillCarry: true, desc: '각 원본 타겟의 처치 후 남은 피해가 다른 적에게 이어지고, 전달 피해가 다시 초과되면 연속 관통합니다. 전이될 때마다 전달 피해가 80%로 감쇄합니다.', tags: ['attack', 'projectile', 'physical'] },
    '공허 가르기': { isGem: true, baseDmg: 1.5, baseSpd: 0.62, leech: 0, crit: 6, dmgScale: 0.08, spdScale: 0.01, ele: 'chaos', ailmentChanceBonus: { poison: 25 }, targetMode: 'cleave', targets: 3, pullTowardImpactCells: 2, combatPattern: { kind: 'authored', stages: [{ label: '공허 가르기', delayMs: 0, damagePct: 100, skipGridControl: true }, { label: '틈 닫힘', delayMs: 560, damagePct: 50, grid: { kind: 'blast', radius: 2, shape: 'circle' } }] }, desc: '허공을 3칸 길이로 갈라 공허 틈을 엽니다. 틈이 닫히며 둘레 2칸 안 적을 끌어당겨 피해의 50%를 한 번 더 줍니다.', tags: ['attack', 'melee', 'chaos', 'aoe'] },
    '대지의 함성': { isGem: true, baseDmg: 1.0, baseSpd: 0.9, leech: 0, crit: 3, dmgScale: 0.05, spdScale: 0.02, hpDmgScale: 0.000125, regenDmgScale: 4.2, combatPattern: { kind: 'radialBurst', waveMsPerCell: 110 }, desc: '크게 외쳐 자신을 중심으로 마름모 진동파를 퍼뜨립니다. 생명력과 재생력을 피해로 바꿉니다.', ele: 'phys', targetMode: 'cleave', targets: 4, tags: ['attack', 'aoe', 'physical', 'shout'] },
    '화염 부패': { isGem: true, baseDmg: 0.42, baseSpd: 0.78, leech: 0, crit: 0, dmgScale: 0.03, spdScale: 0.01, ele: 'fire', targetMode: 'all', targets: 99, hpDmgScale: 0.00009, fireResOvercapMulPerPct: 0.1, fireResOvercapCap: 75, flameDecayDebuff: true, igniteTakenHpScalePer100: 0.08, igniteTakenMaxMultiplier: 5, dotMultiplier: 1.45, spellFlatBase: 7, spellFlatScale: 1.5, desc: '십자 범위에 낮은 부패의 불길을 남깁니다. 공격력 없이 생명력/초과 화염 저항 계수로 화염 지속 피해를 퍼뜨립니다. 이미 타는 적에게 다시 맞히면 남은 피해를 한 번에 주고 둘레 2칸에 70%로 터지며 가까운 적 셋에게 옮겨 붙습니다. 타는 채 죽어도 터집니다.', hideCombatScales: ['regen', 'fireRes'], tags: ['spell', 'dot', 'aoe', 'fire'] },
    '빙결 침식': { isGem: true, baseDmg: 0.31, baseSpd: 0.84, leech: 0, crit: 0, dmgScale: 0.022, spdScale: 0.01, ele: 'cold', targetMode: 'all', targets: 99, dotMultiplier: 1.3, spellFlatBase: 22, spellFlatScale: 4.8, dotStackDamagePct: 14, dotStackSlowPct: 4, dotStackCap: 5, combatPattern: { kind: 'authored', stages: [{ label: '서리 균열', delayMs: 0, damagePct: 34, grid: { radius: 0 } }, { label: '침식 확산', delayMs: 240, damagePct: 33, grid: { radius: 1 } }, { label: '침식 완성', delayMs: 480, damagePct: 33, grid: { radius: 2 } }] }, desc: '서리가 중심에서 마름모 범위로 3단계 확산합니다. 반복 적용할 때마다 최대 5중첩까지 냉기 지속 피해가 14%, 둔화가 4%씩 누적됩니다.', tags: ['spell', 'dot', 'aoe', 'cold'] },
    '서리 파동': { isGem: true, baseDmg: 1.08, baseSpd: 0.95, leech: 0, crit: 8, dmgScale: 0.05, spdScale: 0.02, ele: 'cold', targetMode: 'cleave', targets: 3, spellFlatBase: 20, spellFlatScale: 4.5, combatPattern: { kind: 'moving', intervalMs: 160 }, desc: '전방의 칸을 0.16초 간격으로 천천히 훑는 냉기 파동 주문입니다.', tags: ['spell', 'cold', 'aoe'] },
    '뇌운 낙뢰': { isGem: true, baseDmg: 0.88, baseSpd: 1.02, leech: 0, crit: 10, dmgScale: 0.044, spdScale: 0.02, ele: 'light', targetMode: 'chain', targets: 4, spellFlatBase: 20, spellFlatScale: 4.4, periodicOnHit: { chance: 0.4, hits: 4, interval: 0.6, damagePct: 22, ele: 'light' }, desc: '적중 시 40% 확률로 뇌운을 적용해 0.6초마다 적중 피해의 22%를 4회 가합니다.', tags: ['spell', 'lightning', 'chain'] },
    '심연 전염': { isGem: true, baseDmg: 0.28, baseSpd: 0.88, leech: 0, crit: 0, dmgScale: 0.018, spdScale: 0.01, ele: 'chaos', targetMode: 'chain', targets: 4, dotMultiplier: 1.42, spellFlatBase: 21, spellFlatScale: 4.9, dotTransferOnDeath: { targets: 1, remainingDamagePct: 100 }, desc: '2칸 이내의 적에게 차례로 감염이 건너갑니다. 감염된 적이 처치되면 남은 지속 피해를 다른 적 하나에게 이전합니다.', tags: ['spell', 'dot', 'chaos', 'aoe'] },
    // 2026-10-07 사용자 결정: 너무 약했다(한 대상 실제 피해가 기본 공격보다 낮았다). 가운데 화살 0.36 → 0.92(한 대상 DPS를 다른
    // 직업 시작 룬 중앙값의 0.8배 안으로), 옆 화살 34% → 40%,
    // 부채꼴은 8방향(45도, 90도)에서 대상을 겨눈 20도 간격으로 좁혔다(SKILL_GRID_DB spreadDeg; 15도는 9×8 판에서 화살 줄이 겹쳤다).
    '연발 사격': { isGem: true, baseDmg: 0.92, baseSpd: 1.18, leech: 0, crit: 5, dmgScale: 0.018, spdScale: 0.025, ele: 'phys', extraProjectileDamagePct: 40, projectilePattern: { mode: 'fan', kind: 'fan', rays: 5 }, targetMode: 'spread', targets: 5, desc: '전방 좁은 부채꼴(20도 간격)로 화살 5발을 쏩니다. 가운데 화살은 대상을 겨누고, 옆 화살은 각각 기본 타격 피해의 40%로 그 방향의 다른 적을 맞힙니다.', tags: ['attack', 'projectile', 'physical'] },
    '폭열 창탄': { isGem: true, baseDmg: 1.0, baseSpd: 1.02, leech: 0, crit: 8, dmgScale: 0.06, spdScale: 0.03, ele: 'fire', projectilePattern: { mode: 'delayedBlast', kind: 'line' }, targetMode: 'pierce', targets: 4, ailmentChanceBonus: { ignite: 25 }, periodicOnHit: { chance: 1, hits: 1, interval: 0.25, damagePct: 25, ele: 'fire' }, desc: '관통 후 0.25초 뒤 타격 피해의 25%로 폭발하며 점화 확률이 25% 증가합니다.', tags: ['attack', 'projectile', 'fire', 'elemental'] },
    '암흑 파열': { isGem: true, baseDmg: 1.12, baseSpd: 0.98, leech: 0, crit: 9, dmgScale: 0.055, spdScale: 0.02, ele: 'chaos', targetMode: 'single', targets: 1, spellFlatBase: 27, spellFlatScale: 5.1, missingLifeDamagePct: 30, executeThreshold: 0.15, desc: '적이 잃은 생명력 비율만큼 최대 30% 피해가 증가하며, 생명력 15% 미만인 일반 적을 처형합니다.', tags: ['spell', 'chaos'] },
    '중력 붕괴': { isGem: true, baseDmg: 1.1, baseSpd: 0.9, leech: 0, crit: 6, dmgScale: 0.05, spdScale: 0.02, ele: 'phys', targetMode: 'cleave', targets: 3, spellFlatBase: 27, spellFlatScale: 5.3, spellEarlyMul: 0.75, spellEarlyUntil: 10, pullTowardImpactCells: 1, combatPattern: { kind: 'authored', stages: [{ label: '중력 견인', delayMs: 0, damagePct: 30, grid: { radius: 2, shape: 'circle' } }, { label: '중심 압축', delayMs: 320, damagePct: 70, grid: { radius: 1, shape: 'circle' }, skipGridControl: true }] }, desc: '넓은 중력장으로 적을 중심에 1칸 끌어당긴 뒤, 0.32초 후 좁은 중심부를 압축합니다.', tags: ['spell', 'physical', 'aoe'] },
    '화염 폭풍핵': { isGem: true, baseDmg: 1.12, baseSpd: 0.96, leech: 0, crit: 8, dmgScale: 0.055, spdScale: 0.02, ele: 'fire', targetMode: 'cleave', targets: 3, spellFlatBase: 24, spellFlatScale: 5.1, combatPattern: { kind: 'field', hits: 3, intervalMs: 260, damagePct: 34 }, desc: '목표 지역에 폭풍핵을 남겨 0.26초 간격으로 타격 피해의 34%를 3회 줍니다.', tags: ['spell', 'fire', 'aoe'] },
    '빙결 파열창': { isGem: true, baseDmg: 1.16, baseSpd: 0.93, leech: 0, crit: 9, dmgScale: 0.058, spdScale: 0.018, ele: 'cold', targetMode: 'pierce', targets: 3, spellFlatBase: 25, spellFlatScale: 5.3, consumeAilmentDamageMore: [{ type: 'freeze', pct: 40 }, { type: 'chill', pct: 20 }], desc: '빙결 파편 창을 꿰뚫어 쏘는 냉기 주문입니다. 냉각된 적에게 적중 시 냉각을 소모해 20% 증폭된 피해를 주고, 동결된 적에게 적중 시 동결을 소모해 40% 증폭된 피해를 줍니다.', tags: ['spell', 'cold'] },
    '천뢰 분기': { isGem: true, baseDmg: 1.08, baseSpd: 1.0, leech: 0, crit: 10, dmgScale: 0.052, spdScale: 0.022, ele: 'light', targetMode: 'chain', targets: 4, spellFlatBase: 23, spellFlatScale: 4.9, ailmentChanceBonus: { shock: 20 }, periodicOnHit: { chance: 0.5, hits: 1, interval: 0.18, damagePct: 25, ele: 'light' }, desc: '첫 적을 맞힌 번개가 그 적 주변 3칸의 적에게 동시에 갈라집니다. 감전 확률이 20% 증가하며, 적중 시 50% 확률로 0.18초 뒤 타격 피해의 25%인 낙뢰가 떨어집니다.', tags: ['spell', 'lightning', 'chain'] },
    '유성 낙화': { isGem: true, baseDmg: 2.85, baseSpd: 0.52, leech: 0, crit: 12, dmgScale: 0.12, spdScale: 0.006, ele: 'fire', targetMode: 'all', targets: 6, spellFlatBase: 30, spellFlatScale: 6.2, combatPattern: { kind: 'meteor', groundHits: 3, groundIntervalMs: 600, groundDamagePct: 8 }, desc: '무기 피해 대신 주문 내장 화염 피해로 작은 유성을 빠르게 떨어뜨립니다. 충돌 뒤 1.8초간 불길 지대를 남겨 타격 피해의 8%를 3회 주며, 첫 불길은 점화 확률이 100%입니다.', tags: ['spell', 'aoe', 'fire'] },
    '난타 눈보라': { isGem: true, baseDmg: 0.52, baseSpd: 0.88, leech: 0, crit: 5, dmgScale: 0.026, spdScale: 0.016, ele: 'cold', multiHit: 4, randomTargetEachHit: true, targetMode: 'all', targets: 7, spellFlatBase: 22, spellFlatScale: 4.7, combatPattern: { kind: 'field', hits: 4, intervalMs: 300 }, desc: '마름모 지대에 바람과 고드름이 교차합니다. 목표 지역에 눈보라를 유지해 0.3초 간격으로 무작위 적을 4회 타격합니다.', tags: ['spell', 'cold', 'aoe'] },
    '번개 각인': { isGem: true, baseDmg: 1.46, baseSpd: 0.72, leech: 0, crit: 8, dmgScale: 0.075, spdScale: 0.012, ele: 'light', targetMode: 'cleave', targets: 4, spellFlatBase: 28, spellFlatScale: 5.4, combatPattern: { kind: 'mine', armDelayMs: 460 }, ailmentChanceBonus: { shock: 20 }, desc: '가장 밀집된 목표 지역에 번개 각인을 설치합니다. 0.46초 뒤 십자 범위가 폭발하며 감전 확률이 20% 증가합니다.', tags: ['spell', 'lightning', 'aoe', 'mine'] },
    '원소 포션 투척': { isGem: true, baseDmg: 0.84, baseSpd: 1.04, leech: 0, crit: 6, dmgScale: 0.045, spdScale: 0.025, ele: 'light', targetMode: 'cleave', targets: 4, spellFlatBase: 22, spellFlatScale: 4.8, projectileTravelTimeMultiplier: 0.5556, projectilePattern: { mode: 'lob', kind: 'blast' }, combatPattern: { kind: 'field', hits: 3, intervalMs: 240, damagePct: 34 }, desc: '포션을 포물선으로 던져 반경 1칸의 원소 웅덩이를 남깁니다. 연금술 포션을 투척해 화염/냉기/번개 중 하나의 웅덩이를 만듭니다. 0.24초 간격으로 3회 타격합니다.', tags: ['spell', 'projectile', 'elemental', 'aoe', 'potion'] },
    '그림자 점멸': { isGem: true, baseDmg: 1.68, baseSpd: 0.56, leech: 0, crit: 14, dmgScale: 0.085, spdScale: 0.008, ele: 'chaos', targetMode: 'single', targets: 1, mobilityPattern: { kind: 'blink', maxCells: 6 }, desc: '최대 6칸 안의 적 옆으로 점멸해 베어냅니다. 같은 칸을 반복 왕복하지 않으며 낮은 공격 속도로 재사용을 제한합니다.', tags: ['attack', 'melee', 'chaos', 'mobility'] },
    '용화 숨결': { isGem: true, baseDmg: 0.5, baseSpd: 0.68, leech: 0, crit: 5, dmgScale: 0.027, spdScale: 0.012, ele: 'fire', targetMode: 'spread', targets: 5, spellFlatBase: 19, spellFlatScale: 4.4, combatPattern: { kind: 'channel', hits: 4, intervalMs: 220, damagePct: 27 }, ailmentChanceBonus: { ignite: 25 }, desc: '이동을 멈추고 전방 부채꼴을 좌우로 오가는 불길로 4회 쓸어냅니다. 군중 제어에 걸리면 남은 숨결이 취소됩니다.', tags: ['spell', 'fire', 'aoe', 'channeling'] },
    // 2026-10-17 스킬룬 인계(v32)의 새 룬 17종(60~76번). 피해 = 인계의 피해 / 100, 공격 속도는 같은 슬롯의 룬과 초당 피해가 비슷하게.
    '참격파': { isGem: true, baseDmg: 1.4, baseSpd: 0.85, leech: 0, crit: 5, dmgScale: 0.07, spdScale: 0.015, ele: 'phys', targetMode: 'cleave', targets: 3, combatPattern: { kind: 'moving', intervalMs: 80 }, desc: '크게 베어 바닥을 긁으며 나아가는 칼바람을 3칸 보냅니다.', tags: ['attack', 'melee', 'physical', 'aoe'] },
    '올려 베기': { isGem: true, baseDmg: 1.2, baseSpd: 0.95, leech: 0, crit: 5, dmgScale: 0.06, spdScale: 0.015, ele: 'phys', targetMode: 'cleave', targets: 2, launchMs: 420, desc: '아래에서 위로 베어 올려 맞은 적을 0.42초 띄웁니다. 떠 있는 동안 적은 움직이지도 공격하지도 못합니다.', tags: ['attack', 'melee', 'physical'] },
    '돌진': { isGem: true, baseDmg: 1.1, baseSpd: 0.8, leech: 0, crit: 4, dmgScale: 0.055, spdScale: 0.012, ele: 'phys', targetMode: 'cleave', targets: 3, mobilityPattern: { kind: 'charge', maxCells: 3 }, pushAwayCells: 1, mobilityCooldownMs: 3000, desc: '앞으로 3칸 돌진하며 부딪친 적 셋을 밀어냅니다.', tags: ['attack', 'melee', 'physical', 'mobility'] },
    '도약 강타': { isGem: true, baseDmg: 1.6, baseSpd: 0.7, leech: 0, crit: 6, dmgScale: 0.08, spdScale: 0.01, ele: 'phys', targetMode: 'cleave', targets: 4, mobilityPattern: { kind: 'blink', maxCells: 4, airMs: 300 }, mobilityCooldownMs: 4000, desc: '4칸 안 적 앞으로 뛰어올라 내려찍어, 착지 둘레의 적 넷을 칩니다.', tags: ['attack', 'melee', 'physical', 'aoe', 'mobility', 'slam'] },
    '섬머솔트 슬래시': { isGem: true, baseDmg: 2.2, baseSpd: 0.55, leech: 0, crit: 8, dmgScale: 0.11, spdScale: 0.008, ele: 'phys', targetMode: 'cleave', targets: 3, mobilityPattern: { kind: 'charge', maxCells: 2, airMs: 360 }, mobilityCooldownMs: 4000, desc: '앞으로 공중제비를 돌며 2칸 나아가, 착지와 함께 앞을 크게 내려벱니다.', tags: ['attack', 'melee', 'physical', 'aoe', 'mobility'] },
    '불사르기': { isGem: true, baseDmg: 1.7, baseSpd: 0.7, leech: 0, crit: 5, dmgScale: 0.085, spdScale: 0.012, ele: 'fire', targetMode: 'cleave', targets: 5, pushAwayCells: 1, ailmentChanceBonus: { ignite: 25 }, desc: '무기를 치켜들었다 내려치며 앞쪽으로 넓게 불길을 터뜨려 적을 밀어냅니다.', tags: ['attack', 'melee', 'elemental', 'fire', 'aoe', 'slam'] },
    '부싯돌 베기': { isGem: true, baseDmg: 1.3, baseSpd: 0.9, leech: 0, crit: 6, dmgScale: 0.065, spdScale: 0.015, ele: 'fire', projectileTravelTimeMultiplier: 1.4, projectilePattern: { mode: 'pierce', kind: 'line' }, targetMode: 'pierce', targets: 3, ailmentChanceBonus: { ignite: 20 }, desc: '무기 끝으로 바닥을 긁어 불꽃을 일으킨 뒤 올려 베어, 바닥을 타고 달리는 화염 검기를 5칸 날립니다.', tags: ['attack', 'melee', 'elemental', 'fire', 'projectile'] },
    '폭발성 타격': { isGem: true, baseDmg: 1.6, baseSpd: 0.75, leech: 0, crit: 5, dmgScale: 0.08, spdScale: 0.012, ele: 'fire', targetMode: 'cleave', targets: 6, combatPattern: { kind: 'authored', stages: [{ label: '폭발성 타격', delayMs: 0, damagePct: 55, grid: { kind: 'melee', range: 1 } }, { label: '불씨 폭발', delayMs: 300, damagePct: 45, grid: { kind: 'blast', range: 1, radius: 1, shape: 'circle' } }] }, ailmentChanceBonus: { ignite: 20 }, desc: '친 자리에 불씨를 심고 0.3초 뒤 주변까지 폭발합니다. 본 타격 55%, 폭발 45%.', tags: ['attack', 'melee', 'elemental', 'fire', 'aoe'] },
    '피뢰침': { isGem: true, baseDmg: 0.8, baseSpd: 1.0, leech: 0, crit: 5, dmgScale: 0.04, spdScale: 0.015, ele: 'light', targetMode: 'cleave', targets: 6, combatPattern: { kind: 'field', hits: 4, intervalMs: 220, damagePct: 30 }, ailmentChanceBonus: { shock: 20 }, desc: '무기를 높이 들어 몸 둘레 2칸에 정전기를 일으켜 0.22초마다 4번 번개 피해를 줍니다(한 번에 30%).', tags: ['attack', 'melee', 'elemental', 'lightning', 'aoe'] },
    '신성한 단두대': { isGem: true, baseDmg: 1.5, baseSpd: 0.72, leech: 0, crit: 8, dmgScale: 0.075, spdScale: 0.01, ele: 'light', targetMode: 'all', targets: 4, combatPattern: { kind: 'authored', keepCastTargets: true, stages: [{ label: '빛의 단두대', delayMs: 320, damagePct: 100 }] }, ailmentChanceBonus: { shock: 20 }, desc: '시전하면 둘레 2칸 안 적 넷의 머리 위에 빛의 단두대가 나타나 벼락과 함께 칼날이 떨어집니다.', tags: ['attack', 'melee', 'elemental', 'lightning', 'aoe'] },
    '전도성 난격': { isGem: true, baseDmg: 0.4, baseSpd: 0.42, leech: 0, crit: 5, dmgScale: 0.02, spdScale: 0.008, ele: 'light', targetMode: 'cleave', targets: 3, combatPattern: { kind: 'channel', hits: 8, intervalMs: 150, damagePct: 100, finisher: { label: '마무리 내려치기', damagePct: 200, grid: { kind: 'arc', range: 2 } }, advanceCells: 1 }, ailmentChanceBonus: { shock: 15 }, desc: '무기를 마구 휘두르며 천천히 앞으로 걷습니다. 0.15초마다 앞의 적 셋을 8번 베고, 끝에 크게 한 번 내리칩니다(200%). 군중 제어에 걸리면 남은 난격이 취소됩니다.', tags: ['attack', 'melee', 'elemental', 'lightning', 'channeling'] },
    '서리베기': { isGem: true, baseDmg: 1.25, baseSpd: 1.0, leech: 0, crit: 5, dmgScale: 0.065, spdScale: 0.02, ele: 'cold', targetMode: 'cleave', targets: 2, ailmentChanceBonus: { chill: 25 }, desc: '얼음 안개가 서린 칼로 정면을 넓게 벱니다. 냉각 확률 +25%.', tags: ['attack', 'melee', 'elemental', 'cold'] },
    '얼어붙은 고리': { isGem: true, baseDmg: 1.1, baseSpd: 0.95, leech: 0, crit: 5, dmgScale: 0.055, spdScale: 0.015, ele: 'cold', targetMode: 'cleave', targets: 6, combatPattern: { kind: 'authored', stages: [{ label: '얼음 칼날', delayMs: 0, damagePct: 100 }, { label: '얼음 파동', delayMs: 400, damagePct: 50, grid: { kind: 'nova', range: 2, radius: 2, shape: 'circle' } }] }, ailmentChanceBonus: { chill: 25 }, desc: '몸을 한 바퀴 돌려 둘레를 얼음 칼날 고리로 벱니다. 벤 뒤 고리가 바닥에 내려앉아 2칸까지 퍼지는 얼음 파동이 한 번 더 칩니다(50%).', tags: ['attack', 'melee', 'elemental', 'cold', 'aoe'] },
    '혹한의 지진': { isGem: true, baseDmg: 2.1, baseSpd: 0.58, leech: 0, crit: 5, dmgScale: 0.105, spdScale: 0.008, ele: 'cold', targetMode: 'cleave', targets: 6, combatPattern: { kind: 'authored', stages: [{ label: '내리찍기', delayMs: 0, damagePct: 45, grid: { kind: 'melee', range: 1 } }, { label: '얼음 기둥', delayMs: 260, damagePct: 55, grid: { kind: 'cone', range: 3 } }] }, ailmentChanceBonus: { freeze: 15 }, desc: '바닥을 내리찍으면 0.26초 뒤 앞쪽 부채꼴을 따라 얼음 기둥이 솟아 적을 칩니다. 내리찍기 45%, 얼음 기둥 55%.', tags: ['attack', 'melee', 'elemental', 'cold', 'aoe', 'slam'] },
    '불씨의 함성': { isGem: true, baseDmg: 1.1, baseSpd: 0.95, leech: 0, crit: 3, dmgScale: 0.055, spdScale: 0.015, ele: 'fire', targetMode: 'cleave', targets: 6, combatPattern: { kind: 'authored', stages: [{ label: '불씨 폭발', delayMs: 0, damagePct: 60 }, { label: '타오르는 바닥', delayMs: 300, damagePct: 10 }, { label: '타오르는 바닥', delayMs: 600, damagePct: 10 }, { label: '타오르는 바닥', delayMs: 900, damagePct: 10 }, { label: '타오르는 바닥', delayMs: 1200, damagePct: 10 }] }, ailmentChanceBonus: { ignite: 20 }, desc: '외침과 함께 둘레가 터지고(60%), 2칸 안 바닥이 1.2초 동안 타오릅니다(10%씩 4번).', tags: ['attack', 'aoe', 'elemental', 'fire', 'shout'] },
    '서리바람 내지르기': { isGem: true, baseDmg: 0.95, baseSpd: 1.0, leech: 0, crit: 3, dmgScale: 0.048, spdScale: 0.015, ele: 'cold', targetMode: 'cleave', targets: 6, combatPattern: { kind: 'radialBurst', waveMsPerCell: 100 }, ailmentChanceBonus: { chill: 25 }, desc: '앞으로 내지른 냉기 파동이 부채꼴로 4칸 퍼지며 닿는 적부터 맞습니다.', tags: ['attack', 'aoe', 'elemental', 'cold', 'shout'] },
    '화살비': { isGem: true, baseDmg: 1.0, baseSpd: 0.55, leech: 0, crit: 6, dmgScale: 0.05, spdScale: 0.01, ele: 'phys', targetMode: 'all', targets: 6, projectilePattern: { mode: 'lob', kind: 'blast', fixed: true }, rangeText: '발사 방식: 하늘로 쏘아 올림, 사거리 7칸, 대상 둘레 1칸, 고유 궤적', combatPattern: { kind: 'authored', stages: [{ label: '화살비', delayMs: 380, damagePct: 100 }, { label: '화살비', delayMs: 600, damagePct: 30 }, { label: '화살비', delayMs: 820, damagePct: 30 }, { label: '화살비', delayMs: 1040, damagePct: 30 }, { label: '화살비', delayMs: 1260, damagePct: 30 }] }, desc: '하늘로 화살을 쏘아 올려 7칸 안 대상 둘레에 화살비를 내립니다. 떨어질 때 100%, 0.22초마다 30%씩 4번 더.', tags: ['attack', 'projectile', 'physical', 'aoe'] },
    // 위습 정령 소환 6종 (스킬 변경분 2, 2026-09-30): 동물 소환 8종을 대신한다. 시트·비행 시간 data/wisp-summons.js, 수치 combat.js getSummonProfile.
    '화염 위습 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'fire', targetMode: 'single', targets: 1, desc: '공격형 소환수 룬. 상하좌우로 불꽃 꼬리가 달린 화염 위습 정령을 소환합니다. 위습이 불덩이를 포물선으로 던져 화염 피해를 줍니다.', tags: ['summon', 'summon_attack', 'fire', 'elemental'] },
    '냉기 위습 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'cold', targetMode: 'single', targets: 1, desc: '공격형 소환수 룬. 얼음 수정 모양의 냉기 위습 정령을 소환합니다. 위습이 얼음 조각을 곧게 던져 냉기 피해를 줍니다.', tags: ['summon', 'summon_attack', 'cold', 'elemental'] },
    '번개 위습 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'light', targetMode: 'single', targets: 1, desc: '공격형 소환수 룬. 전기 구체 모양의 번개 위습 정령을 소환합니다. 위습이 대상에게 전류를 흘려 감전시키는 번개 피해를 줍니다.', tags: ['summon', 'summon_attack', 'lightning', 'elemental'] },
    '물리 위습 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'phys', targetMode: 'single', targets: 1, desc: '공격형 소환수 룬. 고목 씨앗 모양의 물리 위습 정령을 소환합니다. 위습이 땅속으로 뿌리를 보내 대상을 옭아매는 물리 피해를 줍니다.', tags: ['summon', 'summon_attack', 'physical'] },
    '카오스 위습 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'chaos', targetMode: 'single', targets: 1, desc: '공격형 소환수 룬. 눈이 하나 있는 보라빛 구체의 카오스 위습 정령을 소환합니다. 위습이 공허 구슬을 포물선으로 던지고 떨어진 자리에 카오스 안개를 남깁니다.', tags: ['summon', 'summon_attack', 'chaos'] },
    '분광 위습 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1.0, leech: 0, crit: 0, dmgScale: 0, spdScale: 0, ele: 'light', elementLabel: '삼원소', targetMode: 'single', targets: 1, desc: '공격형 소환수 룬. 화염/냉기/번개 세 구체가 서로 도는 분광 위습 정령을 소환합니다. 위습이 삼원소가 꼬인 광선을 쏘아 공격마다 화염/냉기/번개 중 하나로 피해를 줍니다.', tags: ['summon', 'summon_attack', 'elemental'] }
};

// 루프 시작 후 첫 처치에 재능(시작 캐릭터)별로 확정 지급되는 스킬룬.
// 매 루프 "기본 공격"만 들고 시작하는 공백을 메우는 용도라, 각 재능의 주력 태그 안에서
// 일부러 하위권 화력의 룬을 골랐다(강한 룬은 그대로 드랍/보상으로 찾는 재미를 유지).
const LOOP_STARTER_GEM_BY_HERO = {
    hero1: '연발 사격',    // 궁수 (투사체) — 투사체 태그 중 하위권 화력
    hero2: '이중 베기',    // 전사 (근접·물리) — 근접/물리 태그 중 하위권 화력
    hero3: '서리바람 내지르기',    // 드루이드 (원소) — 원소 태그 중 하위권 화력
    hero4: '흡혈 관통',    // 블레이드 — 흡혈 컨셉을 유지한 하위권 근접 룬(스킬룬 인계로 카오스 일격 흡혈 타격이 물리 관통 흡혈 관통이 됐다). 2026-10-17 룬 고정 측정: 혼돈 3에 129분, 42번 쓰러짐(전도성 난격이면 1루프 88분, 0번)
    hero5: '번개 타격',    // 성기사 (물리+번개) — 전사/수호자와 겹치지 않게 번개 계열로 차별화
    hero6: '독창 투척',    // 저격수 (투사체) — 궁수와 다른 투사체 룬
    hero7: '물리 위습 소환', // 소환사 (소환) — 물리 속성 소환수
    hero8: '중력 붕괴',    // 수호자 (근접·물리) — 전사와 다른 물리 룬(주문형)
    hero9: '서리바람 내지르기',    // 원소술사 (원소) — 원소 태그 중 하위권 화력
    hero10: '빙결 침식'    // 연금술사 (지속피해) — 지속피해 태그 중 하위권 화력
};

// v3.38 gem balance: coefficients are per confirmed contact.
Object.assign(SKILL_DB, {
    "탄성 플라스크": {"isGem":true,"ele":"chaos","baseSpd":0.5,"desc":"적 사이를 4번 튕기는 카오스 플라스크. 떨어질 때마다 1칸 안에 작은 중독 폭발(30%)이 일고, 둘레에 다른 적이 없으면 같은 적에게 다시 튕깁니다.","tags":["spell","projectile","chaos","potion"],"combatPattern":{"kind":"bouncingFlask","hits":4},"baseDmg":0.7,"dmgScale":0.038,"spdScale":0.008,"spellFlatBase":20,"spellFlatScale":4.4,"crit":6,"nativeCastId":44,"leech":0,"targets":99,"category":"spell","rangeText":"최대 4회 연쇄"},
    "신성한 기도": {"isGem":true,"category":"attack","ele":"light","baseSpd":0.68,"desc":"기도하면 둘레 3칸 안 적마다 번개 창이 하나씩 내리꽂힙니다","tags":["attack","lightning","aoe","elemental","shout"],"targetMode":"all-enemies-around-caster","combatPattern":{"kind":"radiantLance","hits":1},"baseDmg":2.65,"dmgScale":0.15,"spdScale":0.01,"crit":6,"nativeCastId":45,"leech":0,"targets":99,"rangeText":"주변 3칸, 적이 있는 칸에 낙하"},
    "시간 가속": {"isGem":true,"category":"spell","ele":"chaos","baseSpd":1,"damageType":"dot","desc":"5초간 자신을 따라오는 카오스 지속 피해","tags":["spell","chaos","aoe","dot","duration"],"targetMode":"all-enemies-around-caster","combatPattern":{"kind":"timeAcceleration","durationMs":5000,"intervalMs":1000,"ticks":5,"initialTick":false},"baseDmg":0.7,"dmgScale":0.038,"spdScale":0,"spellFlatBase":24,"spellFlatScale":5,"crit":0,"nativeCastId":46,"leech":0,"targets":99,"rangeText":"원형 반경 3칸, 1초마다 5회"},
    "폭발 혼합물": {"isGem":true,"category":"attack","ele":"fire","baseSpd":0.78,"desc":"투척 지점 3×3 화염 폭발","tags":["attack","projectile","fire","aoe","elemental","potion"],"targetMode":"aimed-cell","combatPattern":{"kind":"explosiveMixture","impacts":1,"homing":false},"baseDmg":2.5,"dmgScale":0.15,"spdScale":0.014,"crit":6,"nativeCastId":47,"leech":0,"targets":99,"rangeText":"사거리 4칸, 착지 지점 3×3"},
    "과냉각 혼합물": {"isGem":true,"category":"attack","ele":"cold","baseSpd":0.76,"desc":"적에게 직접 투척, 착지 타격과 바깥으로 퍼지는 냉기 고리","tags":["attack","projectile","cold","aoe","elemental","potion"],"targetMode":"aimed-annuli","combatPattern":{"kind":"supercooledMixture","impacts":3,"radii":[1,2,3],"centerHit":true},"baseDmg":2.65,"dmgScale":0.14,"spdScale":0.012,"crit":6,"nativeCastId":48,"leech":0,"targets":99,"rangeText":"사거리 4칸, 반경 1→2→3 고리"},
    "빈 플라스크": {"isGem":true,"category":"attack","ele":"phys","baseSpd":0.78,"desc":"빈 병 적중 후 유리 파편 1~4개 발사","tags":["attack","projectile","physical","potion"],"targetMode":"flask-then-shards","combatPattern":{"kind":"emptyFlask","baseShards":[1,4],"extraProjectileChance":true},"baseDmg":0.48,"dmgScale":0.032,"spdScale":0.012,"crit":6,"nativeCastId":49,"leech":0,"targets":99,"rangeText":"사거리 4칸, 파편 사거리 3칸"},
    "신성한 안개": {"isGem":true,"category":"spell","ele":"fire","baseSpd":0.9,"desc":"인접 8칸 화염 주문, 받는 화염 피해 +20%, 4초","tags":["spell","fire","aoe","debuff","elemental"],"targetMode":"self-adjacent","combatPattern":{"kind":"holyMist","radius":1,"hits":1},"baseDmg":1.4,"dmgScale":0.072,"spdScale":0.016,"spellFlatBase":22,"spellFlatScale":4.8,"crit":6,"nativeCastId":50,"leech":0,"targets":99,"rangeText":"주변 1칸, 인접 8칸"},
    "파문심판": {"isGem":true,"category":"attack","ele":"light","baseSpd":0.78,"desc":"향로를 앞으로 휘둘러, 전방 2칸 지점 십자 5칸에 번개를 떨어뜨립니다","tags":["attack","light","aoe","elemental"],"targetMode":"forward-two-cross","combatPattern":{"kind":"rippleJudgment","forwardCells":2,"crossRadius":1},"baseDmg":2.5,"dmgScale":0.14,"spdScale":0.014,"crit":8,"nativeCastId":51,"leech":0,"targets":99,"rangeText":"전방 2칸, 십자 5칸"},
    "암살": {"isGem":true,"ele":"phys","category":"attack","baseSpd":0.74,"targetMode":"behind-target","targets":99,"desc":"적 뒤로 순간이동 후 찌르기(뒤가 막히면 가까운 옆, 그다음 반대쪽 옆), 중독 또는 출혈 30%","tags":["attack","melee","physical","mobility","dagger"],"combatPattern":{"kind":"assassination","range":4},"baseDmg":2.85,"dmgScale":0.16,"spdScale":0.012,"crit":10,"nativeCastId":52,"leech":0,"rangeText":"사거리 4칸, 뒤/좌우 칸 중 한 곳이 비어 있어야 함"},
});
// 이동기 4종 (스킬 변경분 2, 2026-09-30 · 인계 mob4_core.js). Worn in the 이동 스킬 slot (js/mobility-skill.js) and cast
// by js/skill-gem-casts.js. Damage and cooldowns are provisional (handoff §8-5); 향로구름 deals no damage.
Object.assign(SKILL_DB, {
    "차원찢기": {"isGem":true,"category":"spell","ele":"chaos","baseSpd":0.8,"targetMode":"aimed-cell","targets":99,"nativeCastId":54,
        "desc":"오브로 허공을 갈라 차원의 틈을 열고 들어가, 최대 4칸 떨어진 빈 칸의 틈에서 나옵니다. 두 틈이 닫히는 순간 도착 칸 둘레 8칸의 적에게 카오스 피해를 줍니다.",
        "tags":["spell","chaos","aoe","mobility"],"baseDmg":1.6,"dmgScale":0.085,"spdScale":0.01,"spellFlatBase":22,"spellFlatScale":4.8,"crit":6,"leech":0,
        "mobilityCooldownMs":4000,"rangeText":"사거리 4칸, 도착 칸 둘레 8칸"},
    "향로구름": {"isGem":true,"category":"spell","ele":"fire","baseSpd":0.9,"targetMode":"nearest-enemy","targets":99,"nativeCastId":55,
        "desc":"향로를 휘둘러 연막 구름에 몸을 숨기고, 최대 5칸 안의 적 곁 빈 칸으로 순간이동합니다. 도착한 자리에도 연막이 피어오릅니다. 피해 없음.",
        "tags":["spell","mobility"],"baseDmg":0,"dmgScale":0,"spdScale":0.01,"crit":0,"leech":0,
        "mobilityCooldownMs":3000,"rangeText":"사거리 5칸, 적 곁으로 순간이동, 피해 없음"},
    "작살화살": {"isGem":true,"category":"attack","ele":"phys","baseSpd":0.8,"targetMode":"nearest-enemy","targets":99,"nativeCastId":56,
        "desc":"줄이 달린 작살화살을 쏴 최대 5칸 안의 적에게 물리 피해를 주고, 줄을 당겨 그 적 바로 앞 칸까지 끌려갑니다. 이미 붙어 있으면 끌려가지 않습니다.",
        "tags":["attack","projectile","physical","mobility"],"baseDmg":1.7,"dmgScale":0.09,"spdScale":0.01,"crit":8,"leech":0,
        "mobilityCooldownMs":4000,"rangeText":"사거리 5칸, 적 앞 칸까지 끌려감"}
});
// The mobility slot's cooldowns for the mobility gems that were main gems before (provisional).
Object.assign(SKILL_DB['그림자 점멸'], { mobilityCooldownMs: 3500 });
Object.assign(SKILL_DB['암살'], { mobilityCooldownMs: 4000 });
// These authored flask trajectories own their contacts; generic pattern engraving cannot replace them.
for (const name of ['탄성 플라스크','폭발 혼합물','과냉각 혼합물','빈 플라스크']) {
    SKILL_DB[name].projectilePattern = { mode: 'lob', kind: 'blast', fixed: true };
    SKILL_DB[name].rangeText = '발사 방식: ' + SKILL_DB[name].rangeText + ', 고유 궤적';
}
// 작살화살's harpoon flies on its own rope: one straight shot that no engraving replaces.
Object.assign(SKILL_DB['작살화살'], { projectilePattern: { mode: 'focus', kind: 'line', fixed: true },
    rangeText: '발사 방식: ' + SKILL_DB['작살화살'].rangeText + ', 고유 궤적' });
/** 지운 룬 → 그 룬을 가진 저장이 대신 받는 룬 (2026-10-13 사용자: "인계에 없는 룬 5개는 삭제해줘". 스킬 이펙트 인계가 뺀 다섯 룬이다).
 * 룬 기록(레벨, 강화, 품질, 각성, 각인)은 대신 받는 룬으로 옮기고, 그 룬을 이미 가졌으면 더 자란 쪽을 남긴다
 * (js/save-migration-wisp-summons.js: 예전 소환 룬을 위습 룬으로 옮긴 길을 같이 쓴다). 끼고 있던 자리도 대신 받는 룬이 잇는다.
 * 고른 기준은 같은 속성과 같은 갈래(근접 공격, 주문, 이동기)다. 공중강타는 인계의 결정대로 방패 돌진이 대신한다. */
const RETIRED_GEM_SUCCESSORS = Object.freeze({
    '삼원 파동': '화염 폭풍핵', '뇌격 삼연타': '번개 타격', '집중 광선': '천뢰 분기', '공허 절삭광': '암흑 파열', '공중강타': '돌진',
    // 2026-10-17 스킬룬 인계(v32): 같은 번호의 이름이 바뀐 룬 9종(기록이 그대로 옮겨 간다)
    '연속 베기': '이중 베기', '묵직한 강타': '강타', '흡혈 타격': '흡혈 관통', '암살자의 일격': '기습 공격', '회오리바람': '회오리',
    '공허 베기': '공허 가르기', '불멸의 진동': '대지의 함성', '룬 지뢰': '번개 각인', '광창 강림': '신성한 기도',
    // 같은 인계가 지운 9종: 같은 속성, 같은 갈래(무기 무관 공격 → 함성, 근접, 투사체, 이동기)에서 고른 대신 받는 룬
    '서리 폭발': '서리바람 내지르기', '연쇄 폭풍': '신성한 기도', '인과': '대지의 함성', '지진 파쇄': '강타', '용암 강타': '폭발성 타격',
    '혈기 폭쇄': '흡혈 관통', '독니 사출': '독창 투척', '방패 투척': '참격파', '방패 돌진': '돌진'
});
safeExposeData({ SKILL_DB, LOOP_STARTER_GEM_BY_HERO, PROJECTILE_PATTERN_MODE_DB, RETIRED_GEM_SUCCESSORS });

/** 스킬룬 계열 → 쓸 수 있는 무기 자세(data/stage-view.js STAGE_VIEW.stances). 2026-10-17 스킬룬 인계(v32) §4의 사용자 결정: 근접 = 맨손, 검방패,
 * 단검, 향로 / 투사체 = 활, 오브, 단검 / 주문, 위습 = 맨손 제외 / 함성 = 일곱 무기 모두 / 전용 = 그 무기만. 이동기는 전용 무기로만 쓰되
 * 근접 물리 이동기 셋(돌진, 도약 강타, 섬머솔트 슬래시)은 근접 계열이라 근접 무기 넷이 함께 쓴다. 기본 공격은 어느 무기로나 쓴다. */
const SKILL_RUNE_WEAPONS = Object.freeze({
    melee: Object.freeze(['unarmed', 'swordshield', 'dagger', 'censer']),
    shout: Object.freeze(['unarmed', 'swordshield', 'dagger', 'bow', 'orb', 'flask', 'censer']),
    projectile: Object.freeze(['dagger', 'bow', 'orb']),
    spell: Object.freeze(['swordshield', 'dagger', 'bow', 'orb', 'flask', 'censer']),
    wisp: Object.freeze(['swordshield', 'dagger', 'bow', 'orb', 'flask', 'censer']),
    bow: Object.freeze(['bow']), dagger: Object.freeze(['dagger']), orb: Object.freeze(['orb']), censer: Object.freeze(['censer']), flask: Object.freeze(['flask'])
});
/** 룬 → 계열(인계의 66종 그대로). 여기에 없는 룬(기본 공격)은 무기를 가리지 않는다. */
const SKILL_RUNE_FAMILY = Object.freeze({
    // melee
    '이중 베기': 'melee',
    '강타': 'melee',
    '흡혈 관통': 'melee',
    '기습 공격': 'melee',
    '회오리': 'melee',
    '참격파': 'melee',
    '올려 베기': 'melee',
    '돌진': 'melee',
    '도약 강타': 'melee',
    '섬머솔트 슬래시': 'melee',
    '화염 참격': 'melee',
    '불사르기': 'melee',
    '부싯돌 베기': 'melee',
    '폭발성 타격': 'melee',
    '서리베기': 'melee',
    '얼어붙은 고리': 'melee',
    '혹한의 지진': 'melee',
    '번개 타격': 'melee',
    '피뢰침': 'melee',
    '신성한 단두대': 'melee',
    '전도성 난격': 'melee',
    '공허 가르기': 'melee',
    // shout
    '대지의 함성': 'shout',
    '불씨의 함성': 'shout',
    '서리바람 내지르기': 'shout',
    '신성한 기도': 'shout',
    // projectile
    '얼음 창': 'projectile',
    '독창 투척': 'projectile',
    '번개 창': 'projectile',
    '폭열 창탄': 'projectile',
    // spell
    '화염 부패': 'spell',
    '빙결 침식': 'spell',
    '서리 파동': 'spell',
    '뇌운 낙뢰': 'spell',
    '심연 전염': 'spell',
    '암흑 파열': 'spell',
    '중력 붕괴': 'spell',
    '화염 폭풍핵': 'spell',
    '빙결 파열창': 'spell',
    '천뢰 분기': 'spell',
    '유성 낙화': 'spell',
    '난타 눈보라': 'spell',
    '번개 각인': 'spell',
    '용화 숨결': 'spell',
    '시간 가속': 'spell',
    // wisp
    '화염 위습 소환': 'wisp',
    '냉기 위습 소환': 'wisp',
    '번개 위습 소환': 'wisp',
    '물리 위습 소환': 'wisp',
    '카오스 위습 소환': 'wisp',
    '분광 위습 소환': 'wisp',
    // bow
    '관통 사격': 'bow',
    '연발 사격': 'bow',
    '화살비': 'bow',
    '작살화살': 'bow',
    // dagger
    '암살': 'dagger',
    '그림자 점멸': 'dagger',
    // orb
    '차원찢기': 'orb',
    // censer
    '신성한 안개': 'censer',
    '파문심판': 'censer',
    '향로구름': 'censer',
    // flask
    '원소 포션 투척': 'flask',
    '탄성 플라스크': 'flask',
    '폭발 혼합물': 'flask',
    '과냉각 혼합물': 'flask',
    '빈 플라스크': 'flask',
});
/** 낀 무기의 대분류(data/weapon-categories.js) → 무기 자세. 대검은 자세 그림이 없어 검방패를 들고(사용자 결정), 방패를 함께 낀 곡도도 검방패다.
 * 무대의 주인공 그림(js/canvas-stage-actors.js)도 이 표로 자세를 정한다. */
const SKILL_RUNE_STANCE_BY_CATEGORY = Object.freeze({ greatsword: 'swordshield', scimitar: 'dagger', shortbow: 'bow', orb: 'orb', flask: 'flask', censer: 'censer' });
const SKILL_RUNE_STANCE_LABELS = Object.freeze({ unarmed: '맨손', swordshield: '검방패', dagger: '단검', bow: '활', orb: '오브', flask: '플라스크', censer: '향로' });
/** 지금 무기로 못 쓰는 룬의 카드와 알림에 붙는 이유(계열마다). 전용 계열은 그 무기 이름이 붙는다. */
const SKILL_RUNE_WEAPON_NOTES = Object.freeze({ melee: '근접 무기 필요', projectile: '활, 오브, 단검 필요', spell: '무기 필요', wisp: '무기 필요' });
safeExposeData({ SKILL_RUNE_WEAPONS, SKILL_RUNE_FAMILY, SKILL_RUNE_STANCE_BY_CATEGORY, SKILL_RUNE_STANCE_LABELS, SKILL_RUNE_WEAPON_NOTES });


// signature 스킬은 전용 이미지 프레임을 재생한다. 모든 액티브 룬을 명시하여 누락을 검사한다.
const SKILL_GEM_VFX_PROFILES = Object.freeze({
    '탄성 플라스크': {family:'worldTree',scale:1,impactVfx:false},
    '신성한 기도': {family:'worldTree',scale:1,impactVfx:false},
    '시간 가속': {family:'worldTree',scale:1,impactVfx:false},
    '폭발 혼합물': {family:'worldTree',scale:1,impactVfx:false},
    '과냉각 혼합물': {family:'worldTree',scale:1,impactVfx:false},
    '빈 플라스크': {family:'worldTree',scale:1,impactVfx:false},
    '신성한 안개': {family:'worldTree',scale:1,impactVfx:false},
    '파문심판': {family:'worldTree',scale:1,impactVfx:false},
    '암살': {family:'worldTree',scale:1,impactVfx:false},
    '차원찢기': {family:'worldTree',scale:1,impactVfx:false},
    '향로구름': {family:'worldTree',scale:1,impactVfx:false},
    '작살화살': {family:'worldTree',scale:1,impactVfx:false},
    '기본 공격': { family: 'slash', scale: 0.82 },
    '이중 베기': { family: 'continuousSlash', scale: 1, repeats: 1, impactAccentVfx: false },
    '강타': { family: 'slam', scale: 0.92, sigil: 2 },
    '흡혈 관통': { family: 'slash', scale: 0.78, accent: 'blood', sigil: 3 },
    '기습 공격': { family: 'iai', scale: 0.92, sharp: true, sigil: 4 },
    '회오리': { family: 'whirlwind', scale: 1.02, sigil: 5 },
    '번개 타격': { family: 'chain', primaryFamily: 'slash', scale: 0.86, sigil: 6 },
    '얼음 창': { family: 'projectile', scale: 0.92, sigil: 7 },
    '화염 참격': { family: 'slash', scale: 0.9, sigil: 8 },
    '독창 투척': { family: 'projectile', scale: 0.82, sigil: 9 },
    '번개 창': { family: 'projectile', scale: 0.9, impactVfx: false, sigilVfx: false, sigil: 11 },
    '관통 사격': { family: 'projectile', scale: 0.86, sigil: 14 },
    '공허 가르기': { signature: 'voidSlash', family: 'slash', impactVfx: false, scale: 0.94, sigil: 16 },
    '대지의 함성': { signature: 'resonance', impactVfx: false, family: 'burst', scale: 0.98, sigil: 18 },
    '화염 부패': { signature: 'decay', impactVfx: false, family: 'dot', scale: 1.04, sigil: 19 },
    '빙결 침식': { signature: 'erosion', impactVfx: false, family: 'dot', scale: 0.98, sigil: 20 },
    '서리 파동': { family: 'burst', scale: 0.92, sigil: 21 },
    '뇌운 낙뢰': { family: 'stormStrike', scale: 0.96, impactParticles: false, impactAccentVfx: false, maxActiveImpacts: 4, sigilVfx: false, sigil: 22 },
    '심연 전염': { signature: 'infection', impactVfx: false, family: 'dot', scale: 1.02, sigil: 23 },
    '연발 사격': { family: 'projectile', scale: 0.7, sigil: 25 },
    '폭열 창탄': { family: 'projectile', scale: 0.9, sigil: 26 },
    '암흑 파열': { family: 'burst', scale: 0.84, sigil: 27 },
    '중력 붕괴': { signature: 'gravity', impactVfx: false, family: 'burst', scale: 0.96, sigil: 28 },
    '화염 폭풍핵': { signature: 'fireCore', family: 'fireCore', scale: 0.74, impactVfx: false, sigil: 29 },
    '빙결 파열창': { family: 'projectile', scale: 0.94, sigil: 30 },
    '천뢰 분기': { signature: 'fork', family: 'chain', scale: 0.98, sigil: 31 },
    '유성 낙화': { family: 'slam', scale: 1.18, sigil: 34 },
    '난타 눈보라': { signature: 'blizzard', family: 'blizzard', scale: 0.84, repeats: 1, impactVfx: false, sigil: 35 },
    '번개 각인': { signature: 'mine', family: 'mine', scale: 0.98, impactVfx: false, sigil: 43 },
    '원소 포션 투척': { signature: 'potion', impactVfx: false, family: 'projectile', projectileStyle: 'potion', scale: 0.86, sigil: 44 },
    '그림자 점멸': { signature: 'blink', family: 'iai', scale: 1.0, accent: 'chaos', sigil: 46 },
    '용화 숨결': { family: 'breath', channelAsset: 'dragonBreath', scale: 1.02, impactVfx: false, sigilVfx: false, sigil: 48 },
    '참격파': { family: 'slash', scale: 0.96 },
    '올려 베기': { family: 'slash', scale: 0.9 },
    '돌진': { signature: 'charge', family: 'charge', scale: 1.0, sigilVfx: false, impactAccentVfx: false },
    '도약 강타': { family: 'slam', scale: 1.04 },
    '섬머솔트 슬래시': { family: 'slash', scale: 1.0 },
    '불사르기': { family: 'slash', scale: 1.0 },
    '부싯돌 베기': { family: 'projectile', scale: 0.9 },
    '폭발성 타격': { family: 'slam', scale: 0.92 },
    '피뢰침': { family: 'burst', scale: 0.96 },
    '신성한 단두대': { family: 'burst', scale: 0.96 },
    '전도성 난격': { family: 'slash', scale: 0.86 },
    '서리베기': { family: 'slash', scale: 0.9 },
    '얼어붙은 고리': { family: 'whirlwind', scale: 0.96 },
    '혹한의 지진': { family: 'slam', scale: 1.0 },
    '불씨의 함성': { family: 'burst', scale: 0.98 },
    '서리바람 내지르기': { family: 'burst', scale: 0.98 },
    '화살비': { family: 'burst', scale: 0.96 },
    '화염 위습 소환': { family: 'summon', scale: 0.8, impactVfx: false },
    '냉기 위습 소환': { family: 'summon', scale: 0.8, impactVfx: false },
    '번개 위습 소환': { family: 'summon', scale: 0.8, impactVfx: false },
    '물리 위습 소환': { family: 'summon', scale: 0.8, impactVfx: false },
    '카오스 위습 소환': { family: 'summon', scale: 0.8, impactVfx: false },
    '분광 위습 소환': { family: 'summon', scale: 0.8, impactVfx: false }
});

safeExposeData({ SKILL_GEM_VFX_PROFILES });

// Skill effect textures are data, shared by the runtime manifest and the asset editor.
const SKILL_AREA_VFX_ASSETS = Object.freeze({
    skillFxWorldTree: 'assets/effects/world-tree-skills-v338.webp',
    skillFxBasicSlash: 'assets/effects/basic-slash-sheet.png',
    skillFxDoubleSlash: 'assets/effects/double-slash-sheet.png',
    skillFxGravitySheet: 'assets/effects/pixel-gravity-sheet-v1.png',
    skillFxFrostErosionSheet: 'assets/effects/pixel-frost-erosion-sheet-v2.png',
    skillFxFireCoreSheet: 'assets/effects/pixel-fire-core-sheet-v1.png',
    skillFxDecaySheet: 'assets/effects/pixel-flame-decay-sheet-v1.png',
    skillFxAbyssSheet: 'assets/effects/pixel-abyss-contagion-sheet-v1.png',
    skillFxSignatureLava: 'assets/effects/skill-lava-sheet-v1.png',
    skillFxSignatureVoidSlash: 'assets/effects/skill-voidSlash-sheet-v1.png',
    skillFxSignatureBlood: 'assets/effects/skill-blood-sheet-v1.png',
    skillFxSignatureChainStorm: 'assets/effects/skill-chainStorm-sheet-v1.png',
    skillFxSignatureResonance: 'assets/effects/skill-resonance-sheet-v1.png',
    skillFxSignatureFork: 'assets/effects/skill-fork-sheet-v1.png',
    skillFxSignatureBlizzard: 'assets/effects/skill-blizzard-sheet-v1.png',
    skillFxSignatureMine: 'assets/effects/skill-mine-sheet-v1.png',
    skillFxSignaturePotion: 'assets/effects/skill-potion-sheet-v1.png',
    skillFxSignatureCharge: 'assets/effects/skill-charge-sheet-v1.png',
    skillFxSignatureBlink: 'assets/effects/skill-blink-sheet-v1.png',
    skillFxRadialWave: 'assets/effects/skill-radial-wave-v1.png',
    skillFxEarthCrack: 'assets/effects/pixel-earth-crack-v1.png'
});
safeExposeData({ SKILL_AREA_VFX_ASSETS });

/** Sprite definitions share a 4x4 grid; hitStart separates preparation from release frames.
 * Layout changes only image placement; the combat snapshot still owns collision and clipping.
 * @typedef {{asset:string,layout:string,hitStart:number,alpha:number,hold?:boolean,staticFrame?:boolean}} SkillSignatureSprite
 * @type {Readonly<Record<string,SkillSignatureSprite>>}
 */
const SKILL_SIGNATURE_SPRITES = Object.freeze({
    gravity: {asset:'skillFxGravitySheet',layout:'area',hitStart:7,alpha:0.72},
    erosion: {asset:'skillFxFrostErosionSheet',layout:'area',hitStart:7,alpha:0.72,staticFrame:true},
    decay: {asset:'skillFxDecaySheet',layout:'area',hitStart:7,alpha:0.8},
    infection: {asset:'skillFxAbyssSheet',layout:'link',hitStart:7,alpha:0.8},
    fireCore: {asset:'skillFxFireCoreSheet',layout:'area',hitStart:7,alpha:0.78,hold:true},
    lava: {asset:'skillFxSignatureLava',layout:'cone',hitStart:4,alpha:0.95},
    voidSlash: {asset:'skillFxSignatureVoidSlash',layout:'line',hitStart:4,alpha:0.95},
    blood: {asset:'skillFxSignatureBlood',layout:'area',hitStart:4,alpha:0.9},
    chainStorm: {asset:'skillFxSignatureChainStorm',layout:'link',hitStart:4,alpha:0.95},
    resonance: {asset:'skillFxSignatureResonance',layout:'wave',hitStart:4,alpha:0.65},
    fork: {asset:'skillFxSignatureFork',layout:'link',hitStart:4,alpha:0.95},
    blizzard: {asset:'skillFxSignatureBlizzard',layout:'area',hitStart:4,alpha:0.65,hold:true},
    mine: {asset:'skillFxSignatureMine',layout:'area',hitStart:4,alpha:0.9},
    potion: {asset:'skillFxSignaturePotion',layout:'potion',hitStart:4,alpha:0.64,hold:true},
    charge: {asset:'skillFxSignatureCharge',layout:'impact',hitStart:4,alpha:0.95},
    blink: {asset:'skillFxSignatureBlink',layout:'impact',hitStart:4,alpha:0.92},
});
safeExposeData({ SKILL_SIGNATURE_SPRITES });

// 전투 룬 카드와 각인 공방에서 사용하는 고유 룬 초상화.
// 경로를 한 곳에서 관리해 카드, 툴팁, 각인 오버레이가 같은 이미지를 공유한다.
const SKILL_GEM_ART_PATHS = Object.freeze({
    "탄성 플라스크": "assets/gems/world-tree/bouncing-flask.png",
    "신성한 기도": "assets/gems/world-tree/radiant-lance.png",
    "시간 가속": "assets/gems/world-tree/time-acceleration.png",
    "폭발 혼합물": "assets/gems/world-tree/explosive-mixture.png",
    "과냉각 혼합물": "assets/gems/world-tree/supercooled-mixture.png",
    "빈 플라스크": "assets/gems/world-tree/empty-flask.png",
    "신성한 안개": "assets/gems/world-tree/holy-mist.png",
    "파문심판": "assets/gems/world-tree/ripple-judgment.png",
    "암살": "assets/gems/world-tree/assassination.png",
    '이중 베기': 'assets/gems/world-tree/continuous-slash.png',
    '강타': 'assets/gems/world-tree/heavy-slam.png',
    '흡혈 관통': 'assets/gems/world-tree/vampiric-strike.png',
    '기습 공격': 'assets/gems/world-tree/assassin-strike.png',
    '회오리': 'assets/gems/world-tree/whirlwind.png',
    '번개 타격': 'assets/gems/world-tree/lightning-strike.png',
    '얼음 창': 'assets/gems/world-tree/ice-spear.png',
    '화염 참격': 'assets/gems/world-tree/flame-slash.png',
    '독창 투척': 'assets/gems/world-tree/poison-spear.png',
    '번개 창': 'assets/gems/world-tree/lightning-spear.png',
    '관통 사격': 'assets/gems/world-tree/piercing-shot.png',
    '공허 가르기': 'assets/gems/world-tree/void-slash.png',
    '대지의 함성': 'assets/gems/world-tree/immortal-vibration.png',
    '화염 부패': 'assets/gems/world-tree/flame-decay.png',
    '빙결 침식': 'assets/gems/world-tree/frost-erosion.png',
    '서리 파동': 'assets/gems/world-tree/frost-wave.png',
    '뇌운 낙뢰': 'assets/gems/world-tree/thundercloud-strike.png',
    '심연 전염': 'assets/gems/world-tree/abyss-contagion.png',
    '연발 사격': 'assets/gems/world-tree/rapid-shot.png',
    '폭열 창탄': 'assets/gems/world-tree/explosive-lance.png',
    '암흑 파열': 'assets/gems/world-tree/dark-rupture.png',
    '중력 붕괴': 'assets/gems/world-tree/gravity-collapse.png',
    '화염 폭풍핵': 'assets/gems/world-tree/firestorm-core.png',
    '빙결 파열창': 'assets/gems/world-tree/frozen-rift-spear.png',
    '천뢰 분기': 'assets/gems/world-tree/heavenly-branch.png',
    '유성 낙화': 'assets/gems/world-tree/meteor-fall.png',
    '난타 눈보라': 'assets/gems/world-tree/bludgeoning-blizzard.png',
    '번개 각인': 'assets/gems/world-tree/rune-mine.png',
    '원소 포션 투척': 'assets/gems/world-tree/elemental-potion-throw.png',
    '그림자 점멸': 'assets/gems/world-tree/shadow-blink.png',
    '용화 숨결': 'assets/gems/world-tree/dragon-breath.png',
    // 새 룬 17종은 제 그림이 오기 전까지 가까운 룬의 그림을 빌린다(지운 룬의 그림 포함).
    '참격파': 'assets/gems/world-tree/shield-throw.png',
    '올려 베기': 'assets/gems/world-tree/continuous-slash.png',
    '돌진': 'assets/gems/world-tree/shield-charge.png',
    '도약 강타': 'assets/gems/world-tree/earthquake-shatter.png',
    '섬머솔트 슬래시': 'assets/gems/world-tree/causality.png',
    '불사르기': 'assets/gems/world-tree/molten-slam.png',
    '부싯돌 베기': 'assets/gems/world-tree/flame-slash.png',
    '폭발성 타격': 'assets/gems/world-tree/explosive-lance.png',
    '피뢰침': 'assets/gems/world-tree/lightning-strike.png',
    '신성한 단두대': 'assets/gems/world-tree/radiant-lance.png',
    '전도성 난격': 'assets/gems/world-tree/chain-storm.png',
    '서리베기': 'assets/gems/world-tree/frost-wave.png',
    '얼어붙은 고리': 'assets/gems/world-tree/frost-burst.png',
    '혹한의 지진': 'assets/gems/world-tree/frozen-rift-spear.png',
    '불씨의 함성': 'assets/gems/world-tree/firestorm-core.png',
    '서리바람 내지르기': 'assets/gems/world-tree/frost-erosion.png',
    '화살비': 'assets/gems/world-tree/rapid-shot.png',
    '화염 위습 소환': 'assets/gems/active/summon-wisp-fire-v1.png',
    '냉기 위습 소환': 'assets/gems/active/summon-wisp-cold-v1.png',
    '번개 위습 소환': 'assets/gems/active/summon-wisp-light-v1.png',
    '물리 위습 소환': 'assets/gems/active/summon-wisp-phys-v1.png',
    '카오스 위습 소환': 'assets/gems/active/summon-wisp-chaos-v1.png',
    '분광 위습 소환': 'assets/gems/active/summon-wisp-spectral-v1.png',
    '차원찢기': 'assets/gems/world-tree/dimension-rift.png',
    '향로구름': 'assets/gems/world-tree/censer-cloud.png',
    '작살화살': 'assets/gems/world-tree/harpoon-arrow.png',
});

safeExposeData({ SKILL_GEM_ART_PATHS });

// 스킬룬별 8x8 그리드 공격 범위 프로필.
// kind:
//  - melee: 플레이어 인접(range) 칸의 단일 대상만 타격
//  - arc:   플레이어 기준 대상 방향 전방 부채꼴(대상 칸 + 플레이어·대상 모두에 인접한 칸)
//  - nova:  플레이어 자신 중심 radius칸 이내 전부
//  - line:  플레이어에서 대상 방향 직선을 range칸까지 관통
//  - chain: range칸 이내 첫 대상 적중 후 jump칸 이내 다른 적으로 연쇄
//  - blast: range칸 이내 대상 칸 중심 radius칸 폭발(0이면 원거리 단일)
//  - cone:  대상 방향으로 빈틈없이 채운 부채꼴 숨결(중심선 range칸)
//  - fan:   대상 방향을 중심으로 rays개의 직선 투사체를 부채꼴로 발사
// range/jump는 체비셰프 거리다. radius는 shape로 circle/diamond/square/cross/diagonal/ring을 선택한다.
const SKILL_GRID_DB = {
    "탄성 플라스크": {"kind":"chain","range":9},
    "신성한 기도": {"kind":"nova","range":3,"radius":3,"shape":"square","impactRadius":0},
    "시간 가속": {"kind":"nova","range":3,"radius":3,"shape":"circle","distanceMetric":"euclidean"},
    "폭발 혼합물": {"kind":"blast","range":4,"radius":1,"shape":"square","distanceMetric":"euclidean"},
    "과냉각 혼합물": {"kind":"blast","range":4,"radius":3,"shape":"ring","distanceMetric":"euclidean"},
    "빈 플라스크": {"kind":"chain","range":4},
    "신성한 안개": {"kind":"nova","range":1,"radius":1,"shape":"square"},
    "파문심판": {"kind":"blast","range":2,"radius":1,"shape":"cross"},
    "암살": {"kind":"melee","range":4},
    '기본 공격':     { kind: 'melee', range: 1 },
    '이중 베기':     { kind: 'arc',   range: 1 },
    '강타':   { kind: 'melee', range: 1 },
    '흡혈 관통':     { kind: 'line',  range: 2 },
    '기습 공격': { kind: 'melee', range: 1 },
    '회오리':    { kind: 'nova',  range: 1, radius: 1, shape: 'square' },
    '번개 타격':     { kind: 'chain', range: 1, jump: 3 },
    '얼음 창':       { kind: 'line',  range: 7 },
    '화염 참격':     { kind: 'arc',   range: 1 },
    '독창 투척':     { kind: 'chain', range: 5, jump: 3 },
    '번개 창':       { kind: 'line',  range: 7 },
    '관통 사격':     { kind: 'line',  range: 7 },
    '공허 가르기':     { kind: 'line', range: 3 },
    '대지의 함성':   { kind: 'nova', range: 2, radius: 2, shape: 'diamond' },
    '화염 부패':     { kind: 'blast', range: 6, radius: 1, shape: 'cross' },
    '빙결 침식':     { kind: 'blast', range: 6, radius: 2, shape: 'diamond' },
    '서리 파동':     { kind: 'line',  range: 5 },
    '뇌운 낙뢰':     { kind: 'chain', range: 6, jump: 3 },
    '심연 전염':     { kind: 'chain', range: 5, jump: 2 },
    '연발 사격':     { kind: 'fan',   range: 6, rays: 5, spreadDeg: 20 },
    '폭열 창탄':     { kind: 'line',  range: 7 },
    '암흑 파열':     { kind: 'blast', range: 6, radius: 0 },
    '중력 붕괴':     { kind: 'blast', range: 5, radius: 2, shape: 'circle' },
    '화염 폭풍핵':   { kind: 'blast', range: 5, radius: 1, shape: 'circle' },
    '빙결 파열창':   { kind: 'line',  range: 6 },
    '천뢰 분기':     { kind: 'chain', range: 6, jump: 3, fork: true },
    '유성 낙화':     { kind: 'blast', range: 6, radius: 2, shape: 'circle' },
    '난타 눈보라':   { kind: 'blast', range: 5, radius: 2, shape: 'diamond' },
    '번개 각인':       { kind: 'blast', range: 5, radius: 2, shape: 'cross' },
    '원소 포션 투척': { kind: 'blast', range: 5, radius: 1, shape: 'circle' },
    '그림자 점멸':   { kind: 'melee', range: 6 },
    '용화 숨결':     { kind: 'cone',  range: 4 },
    '참격파': { kind: 'line', range: 3 },
    '올려 베기': { kind: 'arc', range: 1 },
    '돌진': { kind: 'arc', range: 3 },
    '도약 강타': { kind: 'blast', range: 4, radius: 1, shape: 'square' },
    '섬머솔트 슬래시': { kind: 'cone', range: 2 },
    '불사르기': { kind: 'cone', range: 3 },
    '부싯돌 베기': { kind: 'line', range: 5 },
    '폭발성 타격': { kind: 'melee', range: 1 },
    '피뢰침': { kind: 'nova', range: 2, radius: 2, shape: 'circle' },
    '신성한 단두대': { kind: 'nova', range: 2, radius: 2, shape: 'circle' },
    '전도성 난격': { kind: 'arc', range: 1 },
    '서리베기': { kind: 'arc', range: 1 },
    '얼어붙은 고리': { kind: 'nova', range: 1, radius: 1, shape: 'circle' },
    '혹한의 지진': { kind: 'melee', range: 1 },
    '불씨의 함성': { kind: 'nova', range: 2, radius: 2, shape: 'circle' },
    '서리바람 내지르기': { kind: 'cone', range: 4 },
    '화살비': { kind: 'blast', range: 7, radius: 1, shape: 'circle' },
    '차원찢기':      { kind: 'blast', range: 4, radius: 1, shape: 'square' },
    '향로구름':      { kind: 'melee', range: 5 },
    '작살화살':      { kind: 'line',  range: 5 },
    // 소환 룬 카드에는 소환수 본체가 실제로 사용하는 공격 사거리를 표시한다.
    '화염 위습 소환':   { kind: 'summon', range: 4 },
    '냉기 위습 소환':   { kind: 'summon', range: 4 },
    '번개 위습 소환':   { kind: 'summon', range: 3 },
    '물리 위습 소환':   { kind: 'summon', range: 3 },
    '카오스 위습 소환': { kind: 'summon', range: 4 },
    '분광 위습 소환':   { kind: 'summon', range: 4 }
};

safeExposeData({ SKILL_GRID_DB });


const CONDITION_PATTERN_TRIGGER_DB = Object.freeze([
  // 기본 조건은 전투 전술(액트 3 클리어)과 함께 열린다. 고급 조건만 추가 진행을 요구한다.
  { id:'hp_below', label:'생명력 이하', valueKind:'percent' },
  { id:'hp_above', label:'생명력 이상', valueKind:'percent' },
  { id:'enemy_many', label:'적 수 이상', valueKind:'count' },
  { id:'enemy_few', label:'적 수 이하', valueKind:'count' },
  { id:'es_below', label:'보호막 이하', valueKind:'percent' },
  { id:'es_above', label:'보호막 이상', valueKind:'percent' },
  { id:'boss_present', label:'보스 등장', valueKind:'none' },
  { id:'boss_warning', label:'내 위치에 보스 패턴 예고', valueKind:'none' },
  { id:'boss_absent', label:'보스 없음', valueKind:'none' },
  { id:'elite_present', label:'정예 등장', valueKind:'none', unlock:{ loop:5 } },
  { id:'ailment_active', label:'상태이상 보유', valueKind:'ailment', unlock:{ loop:8 } },
  { id:'distance_at_least', label:'가장 가까운 적 거리 이상', valueKind:'cells', unlock:{ loop:10 } },
  { id:'distance_at_most', label:'가장 가까운 적 거리 이하', valueKind:'cells', unlock:{ loop:10 } },
  { id:'recently_hit', label:'최근 피격', valueKind:'seconds', unlock:{ loop:15 } },
  { id:'boss_hp_below', label:'보스 생명력 이하', valueKind:'percent', unlock:{ journal:'woodsman' } },
  { id:'alone_with_boss', label:'보스와 단독 교전', valueKind:'none', unlock:{ journal:'cosmos_astra' } }
]);

const CONDITION_PATTERN_ACTION_DB = Object.freeze([
  { id:'target_nearest', label:'가장 가까운 적 우선', valueKind:'none', tactic:{ targetPriority:'nearest' } },
  { id:'target_weakest', label:'약한 적 마무리', valueKind:'none', tactic:{ targetPriority:'weakest' }, unlock:{ loop:5 } },
  { id:'target_dangerous', label:'위험한 적 우선', valueKind:'none', tactic:{ targetPriority:'dangerous' }, unlock:{ loop:8 } },
  { id:'target_dense', label:'밀집 지역 우선', valueKind:'none', tactic:{ targetPriority:'dense' }, unlock:{ loop:10 } },
  { id:'position_auto', label:'기본 위치 운용', valueKind:'none', tactic:{ positionMode:'auto' } },
  { id:'position_pressure', label:'근접 압박', valueKind:'none', tactic:{ positionMode:'pressure' }, unlock:{ loop:8 } },
  { id:'position_keep_range', label:'거리 유지', valueKind:'none', tactic:{ positionMode:'keepRange' }, unlock:{ loop:10 } },
  // 예전 귀환 룬: 조건이 맞으면 마을로 돌아간다(5초에 한 번, 열린 지도의 마지막 포털은 쓰지 않는다).
  { id:'return_town', label:'마을로 귀환', valueKind:'none', cooldownMs:5000, unlock:{ act:3 } }
]);

safeExposeData({ CONDITION_PATTERN_TRIGGER_DB, CONDITION_PATTERN_ACTION_DB });
