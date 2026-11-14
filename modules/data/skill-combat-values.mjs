export const ELEMENTAL_HIT_AILMENTS = ['ignite', 'chill', 'freeze', 'shock'];

// A chaos depth's boss always strikes with the same element and adds the next one (2026-10-04): a random element decided a chaos 20
// clear more than the build did (a build with low chaos resistance lived or died by the draw). Depth d: CHAOS_BOSS_ELEMENTS[d mod 4]
// then the following one, so chaos 20 is fire with cold and the map estimate names the two resistances to prepare.
export const CHAOS_BOSS_ELEMENTS = /* @__PURE__ */ Object.freeze(['fire', 'cold', 'light', 'chaos']);

/** 화염 부패(2026-10-17 스킬룬 인계 v32): 이미 걸린 적에게 다시 맞히면 남은 틱 피해를 한 번에 주고 둘레 마름모 2칸에 그 타격의 70%로 터지며,
 * 폭발에 휘말린 가까운 적 가운데 아직 타지 않는 셋에게 새로 옮겨 붙는다. 걸린 채 죽어도 같은 폭발이 터진다(옮겨 붙지는 않는다).
 * 같은 시전이 막 붙인 불은 그 시전 안에서 다시 터지지 않는다(settleMs). 수치는 인계의 제안 값이다. */
export const FLAME_DECAY_BURST = /* @__PURE__ */ Object.freeze({ radius: 2, pct: 70, spread: 3, settleMs: 100 });

export const SKILL_PERIODIC_CHAIN_CAP = 12;

export const WOODSMAN_PHASE_OLD_FINAL_PROGRESS = 0.75;

export const WOODSMAN_PHASE_NEW_FINAL_PROGRESS = 0.95;

export const WOODSMAN_ELEMENTS = /* @__PURE__ */ Object.freeze(['phys', 'fire', 'cold', 'light', 'chaos']);

// 잔향체 아스트라(cosmos_astra): 우주 5개 은하 보스를 모두 격파해야 도전할 수 있는 최종 보스.
// 그 다섯 보스의 정체성(견고/흡수/균형/심판/충격)을 4.5초 주기로 순환하며 방어·공격 프로필이 계속 바뀐다.
export const COSMOS_ASTRA_STANCES = [
    { name: '하말리스의 메아리: 견고', ele: 'phys', drAdd: 20, armorMul: 1.7 },
    { name: '디프다르의 메아리: 흡수', ele: 'chaos', regenMul: 8, resChaosAdd: 22 },
    { name: '주베누비아의 메아리: 균형', ele: 'phys', resAllAdd: 18, drAdd: 8 },
    { name: '주벤샤말의 메아리: 심판', ele: 'light', penetrationAdd: 26, critChanceAdd: 18, atkMulMul: 1.15 },
    { name: '에니프론의 메아리: 충격', ele: 'fire', atkMulMul: 1.75, attackSpeedVarMul: 1.4 }
];

export const COSMOS_ASTRA_STANCE_CYCLE_MS = 4500;
