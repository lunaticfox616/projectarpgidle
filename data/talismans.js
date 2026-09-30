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

// 조건부 줄(예전 컨디션 젬의 수호 · 함성 · 저주): 수호 · 함성은 조건이 맞는 동안 능력치를 더하고, 저주는 일정 간격으로
// 적 하나에 걸린다. text의 {v}는 굴린 값.
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
    { id: 'hex_vulnerable', kind: 'curse', effect: 'enemyTakenMul', min: 5, max: 12, step: 1,
        text: '8초마다 적 하나를 저주: 6초 동안 받는 피해 +{v}%' },
    { id: 'hex_enfeeble', kind: 'curse', effect: 'enemyDmgMul', min: 6, max: 14, step: 1,
        text: '8초마다 적 하나를 저주: 6초 동안 주는 피해 −{v}%' },
    { id: 'hex_break', kind: 'curse', effect: 'enemyResShred', min: 6, max: 15, step: 1,
        text: '8초마다 적 하나를 저주: 6초 동안 원소 저항 −{v}' }
]);
const TALISMAN_HEX_RULES = Object.freeze({ intervalMs: 8000, durationMs: 6000, lowLifePct: 50, crowdCount: 3 });

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
    TALISMAN_CONDITION_POOL, TALISMAN_HEX_RULES, TALISMAN_UNIQUE_DB, TALISMAN_ELEMENT_FOCUS });
