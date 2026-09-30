// 부적(2026-09-30 개편): 그루터기 함 판에 놓는 한 칸짜리 조각(씨앗 · 수액 다음의 세 번째 계열, 색 없음).
// 예전 부적 판 · 생장판 · 컨디션 젬을 대신한다. 부적은 일반 줄(능력치)과 조건부 줄(수호 · 함성 · 저주)을 1~3개 갖고,
// 고유 부적은 고정 줄이나 판의 상하좌우 이웃 효과를 가진다. 깨어나는 성장량은 data/stump-box.js(STUMP_BOX_GROWTH).

// 봉인편린으로 부적을 푼다(예전 부적 해제 그대로 미궁 편린을 쓴다). mul: 일반 · 조건부 줄 굴림 배율.
const TALISMAN_UNSEAL_RULES = Object.freeze({
    sealShard: { cost: 1, lines: [1, 2], conditionChance: 0.2, mul: 1, uniqueChance: 0.005 },
    strongSealShard: { cost: 1, lines: [2, 2], conditionChance: 0.25, mul: 1.35, uniqueChance: 0.03 },
    radiantSealShard: { cost: 1, lines: [2, 3], conditionChance: 0.3, mul: 1.6, uniqueChance: 0.24 }
});
// 편린 교환: 봉인편린 80 → 강력한 기운의 봉인편린 1, 그것 40 → 찬란한 봉인편린 1.
const TALISMAN_SHARD_EXCHANGE = Object.freeze([
    { from: 'sealShard', to: 'strongSealShard', cost: 80 },
    { from: 'strongSealShard', to: 'radiantSealShard', cost: 40 }
]);
// 밀랍: 가장 약한 일반 줄 하나를 이 비율만큼 한 줄 더(부적마다 한 번, 예전 부적 밀랍 그대로).
const TALISMAN_WAX_COPY_PCT = 35;
// 희귀도 색(화면): 그루터기 함의 원소 색과 겹치지 않게 고른다.
const TALISMAN_RARITY_TONES = Object.freeze({ magic: '#8fa9d6', rare: '#d8bc58', unique: '#dc7a3c' });

// 일반 줄: 예전 부적 옵션 28종 + 원소 · 치명 줄(예전 생장판 줄에서).
const TALISMAN_STAT_POOL = Object.freeze([
    { id: 'pctDmg', min: 6, max: 14, step: 1 }, { id: 'flatHp', min: 28, max: 75, step: 1 },
    { id: 'crit', min: 1, max: 4, step: 0.5 }, { id: 'aspd', min: 2, max: 8, step: 0.5 },
    { id: 'resPen', min: 1, max: 5, step: 0.5 }, { id: 'dr', min: 2, max: 7, step: 0.5 },
    { id: 'pctHp', min: 4, max: 12, step: 1 }, { id: 'move', min: 2, max: 8, step: 1 },
    { id: 'dotPctDmg', min: 4, max: 14, step: 1 }, { id: 'minDmgRoll', min: 1, max: 3, step: 1 },
    { id: 'maxDmgRoll', min: 1, max: 3, step: 1 }, { id: 'armorPct', min: 4, max: 12, step: 1 },
    { id: 'evasionPct', min: 4, max: 12, step: 1 }, { id: 'energyShieldPct', min: 4, max: 12, step: 1 },
    { id: 'summonFlatDmg', min: 4, max: 12, step: 1 }, { id: 'summonPctDmg', min: 6, max: 16, step: 1 },
    { id: 'summonAspd', min: 3, max: 9, step: 0.5 }, { id: 'summonHpPct', min: 6, max: 16, step: 1 },
    { id: 'summonCrit', min: 1, max: 4, step: 0.5 }, { id: 'summonCritDmg', min: 10, max: 28, step: 1 },
    { id: 'summonEfficiency', min: 4, max: 12, step: 1 }, { id: 'summonResPen', min: 1, max: 5, step: 0.5 },
    { id: 'ailResIgnite', min: 12.5, max: 50, step: 0.5 }, { id: 'ailResShock', min: 12.5, max: 50, step: 0.5 },
    { id: 'ailResFreeze', min: 12.5, max: 50, step: 0.5 }, { id: 'ailResPoison', min: 12.5, max: 50, step: 0.5 },
    { id: 'ailResBleed', min: 12.5, max: 50, step: 0.5 },
    { id: 'firePctDmg', min: 6, max: 16, step: 1 }, { id: 'coldPctDmg', min: 6, max: 16, step: 1 },
    { id: 'lightPctDmg', min: 6, max: 16, step: 1 }, { id: 'chaosPctDmg', min: 6, max: 16, step: 1 },
    { id: 'physPctDmg', min: 6, max: 16, step: 1 }, { id: 'critDmg', min: 8, max: 22, step: 1 },
    { id: 'resAll', min: 3, max: 8, step: 1 }
]);

// 조건부 줄(예전 컨디션 젬 자리): 수호 · 함성은 조건이 맞는 동안 효과를 더하고, 저주는 8초마다 적 하나에 6초 동안 걸린다.
// 같은 줄(id)이 여럿이면 가장 센 하나만 쓴다(예전 젬처럼 겹치지 않는다). 두 가지 줄이 있다.
//   한 가지 능력치 줄: stat(수호 · 함성) 또는 effect · form(저주)에 굴린 값 {v}가 그대로 들어간다.
//   젬 줄: 예전 컨디션 젬의 효과표(delta)를 그대로 가지고, 굴린 값은 위력 %다(효과표 × 위력 / 100).
// when: lowLife 생명력 50% 이하 · fullLife 생명력 가득 · boss 보스와 싸우는 중 · crowd 살아 있는 적 3마리 이상.
const TALISMAN_CONDITION_POWER = Object.freeze({ min: 60, max: 100, step: 5 });
const TALISMAN_CONDITION_POOL = Object.freeze([
    { id: 'guard_low_life', kind: 'guard', when: 'lowLife', stat: 'dr', min: 6, max: 14, step: 1,
        text: '생명력 50% 이하일 때 받는 물리 피해 감소 +{v}%' },
    { id: 'guard_low_life_regen', kind: 'guard', when: 'lowLife', stat: 'regen', min: 1, max: 3, step: 0.5,
        text: '생명력 50% 이하일 때 생명력 재생 +{v}%' },
    { id: 'cry_boss', kind: 'warcry', when: 'boss', stat: 'pctDmg', min: 10, max: 22, step: 1,
        text: '보스와 싸우는 동안 피해 +{v}%' },
    { id: 'cry_crowd', kind: 'warcry', when: 'crowd', stat: 'aspd', min: 6, max: 14, step: 1,
        text: '적이 3마리 이상이면 공격 속도 +{v}%' },
    { id: 'cry_full_life', kind: 'warcry', when: 'fullLife', stat: 'crit', min: 2, max: 5, step: 0.5,
        text: '생명력이 가득하면 치명타 확률 +{v}%' },
    { id: 'hex_vulnerable', kind: 'curse', effect: 'enemyTakenMul', form: 'mulUp', min: 5, max: 12, step: 1,
        text: '8초마다 적 하나를 저주: 6초 동안 받는 피해 +{v}%' },
    { id: 'hex_enfeeble', kind: 'curse', effect: 'enemyDmgMul', form: 'mulDown', min: 6, max: 14, step: 1,
        text: '8초마다 적 하나를 저주: 6초 동안 주는 피해 −{v}%' },
    { id: 'hex_break', kind: 'curse', effect: 'enemyResShred', form: 'flat', min: 6, max: 15, step: 1,
        text: '8초마다 적 하나를 저주: 6초 동안 원소 저항 −{v}' },
    // 수호(생명력 50% 이하)
    { id: 'guard_elemental_veil', kind: 'guard', when: 'lowLife', name: '원소 장막', ...TALISMAN_CONDITION_POWER, delta: { dr: 22, resAll: 10, maxResAll: 4 } },
    { id: 'guard_iron_oath', kind: 'guard', when: 'lowLife', name: '철의 맹세', ...TALISMAN_CONDITION_POWER, delta: { dr: 25, aspd: -8, armorMul: 0.2 } },
    { id: 'guard_frost_wall', kind: 'guard', when: 'lowLife', name: '서리 장벽', ...TALISMAN_CONDITION_POWER,
        delta: { dr: 14, cleanseChill: 1, cleanseFreeze: 1, immuneChill: 1, immuneFreeze: 1 } },
    { id: 'guard_storm_wall', kind: 'guard', when: 'lowLife', name: '폭풍 장벽', ...TALISMAN_CONDITION_POWER, delta: { dr: 15, move: 16, aspd: 10, cleanseShock: 1, immuneShock: 1 } },
    { id: 'guard_abyss_shell', kind: 'guard', when: 'lowLife', name: '심연 껍질', ...TALISMAN_CONDITION_POWER, delta: { dr: 20, regen: 1, resChaos: 12 } },
    { id: 'guard_lava_wall', kind: 'guard', when: 'lowLife', name: '용암 벽', ...TALISMAN_CONDITION_POWER, delta: { dr: 15, cleanseIgnite: 1, immuneIgnite: 1 } },
    { id: 'guard_poison_cure', kind: 'guard', when: 'lowLife', name: '이독제독', ...TALISMAN_CONDITION_POWER, delta: { dr: 18, poisonToHeal: 1 } },
    { id: 'guard_undying', kind: 'guard', when: 'lowLife', name: '불멸의 힘', ...TALISMAN_CONDITION_POWER, delta: { delayedRegenFromTakenDamage: 0.25 } },
    { id: 'guard_overcharge', kind: 'guard', when: 'lowLife', name: '에너지 과다', ...TALISMAN_CONDITION_POWER,
        delta: { dr: 10, energyShieldRegen: 12.5, energyShieldRechargeDelayDelta: -0.5 } },
    { id: 'guard_bloodless', kind: 'guard', when: 'lowLife', name: '무혈', ...TALISMAN_CONDITION_POWER, delta: { dr: 14, cleanseBleed: 1, immuneBleed: 1, disableEnemyLeech: 1 } },
    // 함성
    { id: 'cry_battlefield', kind: 'warcry', when: 'boss', name: '전장의 함성', ...TALISMAN_CONDITION_POWER, delta: { pctDmg: 16, aspd: 12, dr: 6, drCapBonus: 3, move: 8 } },
    { id: 'cry_blood', kind: 'warcry', when: 'fullLife', name: '피의 함성', ...TALISMAN_CONDITION_POWER, delta: { pctDmg: 22, leech: 0.9 } },
    { id: 'cry_tracker', kind: 'warcry', when: 'crowd', name: '추적자의 함성', ...TALISMAN_CONDITION_POWER, delta: { aspd: 14, targetAny: 1, crit: 6, move: 12 } },
    { id: 'cry_furnace', kind: 'warcry', when: 'boss', name: '용광의 외침', ...TALISMAN_CONDITION_POWER, delta: { pctDmg: 15, fireBonus: 0.12, leech: 0.4, regen: 0.8 } },
    { id: 'cry_glacier', kind: 'warcry', when: 'crowd', name: '빙하의 포효', ...TALISMAN_CONDITION_POWER,
        delta: { pctDmg: 13, coldBonus: 0.12, dr: 8, drCapBonus: 3, energyShieldRegen: 2 } },
    { id: 'cry_storm', kind: 'warcry', when: 'fullLife', name: '폭풍의 고함', ...TALISMAN_CONDITION_POWER, delta: { aspd: 16, crit: 5 } },
    { id: 'cry_void', kind: 'warcry', when: 'boss', name: '공허의 외침', ...TALISMAN_CONDITION_POWER, delta: { pctDmg: 17, chaosBonus: 0.15, resPen: 8, leech: 0.7 } },
    { id: 'cry_last_stand', kind: 'warcry', when: 'lowLife', name: '결전 신호', ...TALISMAN_CONDITION_POWER, delta: { pctDmg: 18, dr: -4, critDmg: 30, resPen: 6 } },
    { id: 'cry_quake', kind: 'warcry', when: 'crowd', name: '지진의 함성', ...TALISMAN_CONDITION_POWER, delta: { slamEchoPct: 0.25, slamEchoDelaySec: 1 } },
    // 저주
    { id: 'hex_ash_mark', kind: 'curse', name: '재의 표식', ...TALISMAN_CONDITION_POWER, delta: { enemyResFShred: 10, igniteChanceAdd: 0.15, igniteTakenMul: 1.1 } },
    { id: 'hex_frost_brand', kind: 'curse', name: '빙결의 낙인', ...TALISMAN_CONDITION_POWER,
        delta: { enemyResCShred: 10, chillChanceAdd: 0.1, freezeChanceAdd: 0.1, chillTakenMul: 1.1, freezeTakenMul: 1.1 } },
    { id: 'hex_shock_glyph', kind: 'curse', name: '감전 문양', ...TALISMAN_CONDITION_POWER, delta: { enemyResLShred: 10, shockChanceAdd: 0.1, shockTakenMul: 1.1 } },
    { id: 'hex_rot_seal', kind: 'curse', name: '부패 각인', ...TALISMAN_CONDITION_POWER, delta: { enemyResChaosShred: 10, poisonChanceAdd: 0.1, poisonTakenMul: 1.1 } },
    { id: 'hex_rift', kind: 'curse', name: '균열 저주', ...TALISMAN_CONDITION_POWER, delta: { enemyResShred: 15, enemyResChaosShred: 15 } },
    { id: 'hex_frail_brand', kind: 'curse', name: '취약의 낙인', ...TALISMAN_CONDITION_POWER, delta: { enemyTakenMul: 1.1, enemyCritDmgTakenMul: 1.12 } },
    { id: 'hex_withering', kind: 'curse', name: '쇠약의 기도', ...TALISMAN_CONDITION_POWER, delta: { enemyDmgMul: 0.9, enemyAspdSlow: 0.1 } },
    { id: 'hex_burning_guilt', kind: 'curse', name: '타오른 죄책', ...TALISMAN_CONDITION_POWER, delta: { enemyResFShred: 8, fireDotTakenMul: 1.06, igniteTakenMul: 1.06 } },
    { id: 'hex_thunder_bind', kind: 'curse', name: '천둥 포박', ...TALISMAN_CONDITION_POWER, delta: { enemyLightTakenMul: 1.1, enemyCritDmgTakenMul: 1.1 } },
    { id: 'hex_severing', kind: 'curse', name: '절단의 맹세', ...TALISMAN_CONDITION_POWER, delta: { enemyPhysDrShred: 10, bleedChanceAdd: 0.1, bleedTakenMul: 1.15 } },
    { id: 'hex_abyss_ring', kind: 'curse', name: '심연 고리', ...TALISMAN_CONDITION_POWER, delta: { enemyResChaosShred: 10, enemyChaosTakenMul: 1.1 } },
    { id: 'hex_festering', kind: 'curse', name: '상처 악화', ...TALISMAN_CONDITION_POWER, delta: { enemyRegenRateMul: 0.6 } },
    { id: 'hex_weak_point', kind: 'curse', name: '약점 조준', ...TALISMAN_CONDITION_POWER, delta: { enemyProjectileTakenMul: 1.1, projectileExtraHits: 2 } }
]);
// 젬 줄의 효과 이름과 표시 방식. fixed: 위력과 상관없이 그대로(한도 · 추가 타격 · 대상 수 · 지연 · 면역 같은 것).
// form: pct(+v%) · fraction(+v×100%) · count(+v) · flag(이름만) · seconds(v초) · minus(−v) · mulUp(+(m−1)%) · mulDown(−(1−m)%).
const TALISMAN_CONDITION_EFFECTS = Object.freeze({
    pctDmg: ['피해', 'pct'], aspd: ['공격 속도', 'pct'], dr: ['받는 물리 피해 감소', 'pct'], drCapBonus: ['물리 피해 감소 한도', 'pct', 'fixed'],
    move: ['이동 속도', 'pct'], leech: ['생명력 흡수', 'pct'], targetAny: ['스킬 대상', 'count', 'fixed'], crit: ['치명타 확률', 'pct'],
    critDmg: ['치명타 피해', 'pct'], regen: ['초당 생명력 재생', 'pct'], resPen: ['저항 관통', 'pct'], resAll: ['모든 원소 저항', 'pct'],
    maxResAll: ['원소 저항(한도 밖)', 'pct'], resChaos: ['카오스 저항', 'pct'], armorMul: ['물리 피해 감소에 방어도 비례 추가', 'fraction'],
    fireBonus: ['화염 스킬 피해', 'fraction'], coldBonus: ['냉기 스킬 피해', 'fraction'], chaosBonus: ['카오스 스킬 피해', 'fraction'],
    energyShieldRegen: ['에너지 보호막 재생', 'pct'], energyShieldRechargeDelayDelta: ['보호막 재충전 대기', 'seconds', 'fixed'],
    delayedRegenFromTakenDamage: ['받은 피해를 4초에 걸쳐 되찾음', 'fraction'], poisonToHeal: ['중독이 회복으로 바뀜', 'flag', 'fixed'],
    disableEnemyLeech: ['적의 흡혈 차단', 'flag', 'fixed'], immuneIgnite: ['점화 면역', 'flag', 'fixed'], immuneChill: ['냉각 면역', 'flag', 'fixed'],
    immuneFreeze: ['동결 면역', 'flag', 'fixed'], immuneShock: ['감전 면역', 'flag', 'fixed'], immuneBleed: ['출혈 면역', 'flag', 'fixed'],
    cleanseIgnite: ['', 'flag', 'fixed'], cleanseChill: ['', 'flag', 'fixed'], cleanseFreeze: ['', 'flag', 'fixed'], cleanseShock: ['', 'flag', 'fixed'],
    cleanseBleed: ['', 'flag', 'fixed'], slamEchoPct: ['강타 후속 타격 피해', 'fraction'], slamEchoDelaySec: ['후속 타격 지연', 'seconds', 'fixed'],
    enemyResShred: ['원소 저항', 'minus'], enemyResFShred: ['화염 저항', 'minus'], enemyResCShred: ['냉기 저항', 'minus'],
    enemyResLShred: ['번개 저항', 'minus'], enemyResChaosShred: ['카오스 저항', 'minus'], enemyPhysDrShred: ['물리 피해 감소', 'minus'],
    enemyTakenMul: ['받는 피해', 'mulUp'], enemyCritDmgTakenMul: ['받는 치명타 피해', 'mulUp'], enemyDmgMul: ['주는 피해', 'mulDown'],
    enemyAspdSlow: ['공격 속도', 'fractionDown'], enemyRegenRateMul: ['생명력 재생', 'mulDown'], enemyProjectileTakenMul: ['받는 투사체 피해', 'mulUp'],
    enemyLightTakenMul: ['받는 번개 피해', 'mulUp'], enemyChaosTakenMul: ['받는 카오스 피해', 'mulUp'], fireDotTakenMul: ['받는 화염 지속 피해', 'mulUp'],
    projectileExtraHits: ['투사체 추가 타격', 'count', 'fixed'], igniteChanceAdd: ['점화 확률', 'fractionUp'], igniteTakenMul: ['점화 피해', 'mulUp'],
    chillChanceAdd: ['냉각 확률', 'fractionUp'], chillTakenMul: ['냉각 효과', 'mulUp'], freezeChanceAdd: ['동결 확률', 'fractionUp'],
    freezeTakenMul: ['동결 효과', 'mulUp'], shockChanceAdd: ['감전 확률', 'fractionUp'], shockTakenMul: ['감전 효과', 'mulUp'],
    poisonChanceAdd: ['중독 확률', 'fractionUp'], poisonTakenMul: ['중독 피해', 'mulUp'], bleedChanceAdd: ['출혈 확률', 'fractionUp'],
    bleedTakenMul: ['출혈 피해', 'mulUp']
});
const TALISMAN_CONDITION_WHEN = Object.freeze({ lowLife: '생명력 50% 이하일 때', fullLife: '생명력이 가득하면', boss: '보스와 싸우는 동안',
    crowd: '적이 3마리 이상이면' });
const TALISMAN_HEX_RULES = Object.freeze({ intervalMs: 8000, durationMs: 6000, lowLifePct: 50, fullLifePct: 99.5, crowdCount: 3 });

// 고유 부적(예전 고유 부적 그대로, 이웃 효과는 그루터기 함 판의 상하좌우로 판정).
const TALISMAN_UNIQUE_DB = Object.freeze([
    { id: 'ut_z_1', name: '굽이치는 전류', lines: [['aspd', 9], ['lightPctDmg', 16]] },
    { id: 'ut_z_2', name: '균열의 발걸음', lines: [['move', 11], ['resPen', 8]] },
    { id: 'ut_s_1', name: '감긴 덩굴', lines: [['flatHp', 90], ['regen', 1.4]] },
    { id: 'ut_s_2', name: '쐐기 관통', lines: [['physPctDmg', 16], ['crit', 3]] },
    { id: 'ut_l_1', name: '황혼의 궤적', lines: [['dotPctDmg', 18], ['chaosPctDmg', 14]] },
    { id: 'ut_l_2', name: '강철 결의', lines: [['armorPct', 18], ['dr', 7]] },
    { id: 'ut_j_1', name: '냉광의 비늘', lines: [['coldPctDmg', 16], ['freezeChance', 10]] },
    { id: 'ut_j_2', name: '파열의 첨탑', lines: [['critDmg', 30], ['maxDmgRoll', 6]] },
    { id: 'ut_i_1', name: '장궁의 선', lines: [['projectilePctDmg', 18], ['targetProjectile', 1]] },
    { id: 'ut_i_2', name: '붉은 맥동', lines: [['firePctDmg', 17], ['igniteChance', 12]] },
    { id: 'ut_o_1', name: '쌍환의 방패', lines: [['resAll', 12], ['energyShieldPct', 16]] },
    { id: 'ut_o_2', name: '이중 심장', lines: [['pctHp', 12], ['regen', 1.2]] },
    { id: 'ut_t_1', name: '왕좌의 창끝', lines: [['pctDmg', 18], ['aspd', 10]] },
    { id: 'ut_t_2', name: '교차 절개', lines: [['meleePctDmg', 18], ['crit', 3.5]] },
    { id: 'ut_soul_shepherd', name: '영혼 목자의 계약', lines: [['summonGemLevel', 2], ['summonPctDmg', 20], ['summonHpPct', 16]] },
    { id: 'ut_gravity', name: '중력', special: 'gravity', uniqueEffect: '맞닿은 부적의 일반 줄을 25% 더 얻습니다.' },
    { id: 'ut_simple', name: '단순한 부적', special: 'simpleCopy', uniqueEffect: '표식 방향으로 맞닿은 부적의 일반 줄을 한 번 더 얻습니다.' },
    { id: 'ut_temperance', name: '절제의 미덕', special: 'temperance', uniqueEffect: '일반 줄 세 개를 굴림 배율 없이 가집니다.' },
    { id: 'ut_pride', name: '오만', special: 'pride',
        uniqueEffect: '맞닿은 조각이 없으면 스킬 젬 레벨 +1 · 보조 젬 한도 +1, 하나면 보조 젬 한도 +1, 둘 이상이면 피해 +15% · 공격 속도 +10%' },
    { id: 'ut_moment', name: '찰나', special: 'moment', momentMin: 5, momentMax: 15,
        uniqueEffect: '보스에게 주는 최종 피해가 늘어나고, 생명력 5% 이하인 보스를 즉시 쓰러뜨립니다.' },
    { id: 'ut_fire_focus', name: '불타는 부적', special: 'elementFocus', elem: 'fire' },
    { id: 'ut_cold_focus', name: '서릿빛 부적', special: 'elementFocus', elem: 'cold' },
    { id: 'ut_light_focus', name: '뇌전의 부적', special: 'elementFocus', elem: 'light' },
    { id: 'ut_phys_focus', name: '쇄격의 부적', special: 'elementFocus', elem: 'phys' },
    { id: 'ut_chaos_focus', name: '심연의 부적', special: 'elementFocus', elem: 'chaos' }
]);
// 원소 집중 고유: 젬 레벨 1~3 · 그 원소 피해 5~15% · 그 원소 저항 5~15%.
const TALISMAN_ELEMENT_FOCUS = Object.freeze({
    fire: ['fireGemLevel', 'firePctDmg', 'resF'], cold: ['coldGemLevel', 'coldPctDmg', 'resC'],
    light: ['lightGemLevel', 'lightPctDmg', 'resL'], phys: ['physGemLevel', 'physPctDmg', 'dr'],
    chaos: ['chaosGemLevel', 'chaosPctDmg', 'resChaos']
});

safeExposeData({ TALISMAN_UNSEAL_RULES, TALISMAN_SHARD_EXCHANGE, TALISMAN_WAX_COPY_PCT, TALISMAN_RARITY_TONES, TALISMAN_STAT_POOL,
    TALISMAN_CONDITION_POOL, TALISMAN_CONDITION_EFFECTS, TALISMAN_CONDITION_WHEN, TALISMAN_HEX_RULES, TALISMAN_UNIQUE_DB, TALISMAN_ELEMENT_FOCUS });
