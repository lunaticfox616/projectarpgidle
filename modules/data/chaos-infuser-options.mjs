export function createChaosInfuserOptions(CURRENCY_LEGACY_MERGE) {
const CHAOS_INFUSER_OPTIONS = [
    { optionId: 'weapon_flatDmg', id: 'flatDmg', min: 12, max: 18, currency: 'chaos', cost: 6, label: '무기 기본 피해', slots: ['무기'] },
    { optionId: 'weapon_pctDmg', id: 'pctDmg', min: 18, max: 26, currency: 'chaos', cost: 6, label: '무기 피해 증가', slots: ['무기'] },
    { optionId: 'weapon_aspd', id: 'aspd', min: 8, max: 12, currency: 'alteration', cost: 12, label: '무기 공격 속도', slots: ['무기'] },
    { optionId: 'armor_pctHp', id: 'pctHp', min: 12, max: 18, currency: 'exalted', cost: 1, label: '갑옷 생명력 증가', slots: ['갑옷'] },
    { optionId: 'armor_flatHp', id: 'flatHp', min: 55, max: 80, currency: 'transmute', cost: 18, label: '갑옷/완갑 최대 생명력', slots: ['갑옷', '방패'] },
    { optionId: 'armor_defensePct', id: 'armorPct', min: 18, max: 26, currency: 'augment', cost: 12, label: '갑옷/완갑 방어도 증가', slots: ['갑옷', '방패'] },
    { optionId: 'boots_move', id: 'move', min: 16, max: 22, currency: 'exalted', cost: 1, label: '장화 이동 속도', slots: ['신발'] },
    { optionId: 'boots_evasionPct', id: 'evasionPct', min: 18, max: 26, currency: 'augment', cost: 12, label: '장화 회피 증가', slots: ['신발'] },
    { optionId: 'gloves_aspd', id: 'aspd', min: 8, max: 12, currency: 'alteration', cost: 12, label: '장갑 공격 속도', slots: ['장갑'] },
    { optionId: 'gloves_crit', id: 'crit', min: 4, max: 6, currency: 'exalted', cost: 1, label: '장갑 치명타 확률', slots: ['장갑'] },
    { optionId: 'helmet_flatHp', id: 'flatHp', min: 45, max: 70, currency: 'transmute', cost: 14, label: '투구 최대 생명력', slots: ['투구'] },
    { optionId: 'helmet_critDmg', id: 'critDmg', min: 22, max: 32, currency: 'divine', cost: 1, label: '투구 치명타 피해', slots: ['투구'] },
    { optionId: 'belt_pctHp', id: 'pctHp', min: 10, max: 16, currency: 'exalted', cost: 1, label: '허리띠 생명력 증가', slots: ['허리띠'] },
    { optionId: 'belt_flatHp', id: 'flatHp', min: 50, max: 76, currency: 'transmute', cost: 16, label: '허리띠 최대 생명력', slots: ['허리띠'] },
    { optionId: 'jewelry_pctDmg', id: 'pctDmg', min: 16, max: 24, currency: 'chaos', cost: 6, label: '장신구 피해 증가', slots: ['반지', '목걸이'] },
    { optionId: 'jewelry_resPen', id: 'resPen', min: 4, max: 6, currency: 'chaos', cost: 8, label: '장신구 저항 관통', slots: ['반지', '목걸이'] },
    { optionId: 'res_all', id: 'resAll', min: 4, max: 7, currency: 'chaos', cost: 5, label: '낮은 모든 저항', slots: ['투구', '갑옷', '장갑', '신발', '반지', '목걸이', '허리띠', '방패'] },
    { optionId: 'res_fire', id: 'resF', min: 12, max: 18, currency: 'chaos', cost: 5, label: '화염 저항', slots: ['투구', '갑옷', '장갑', '신발', '반지', '목걸이', '허리띠', '방패'] },
    { optionId: 'res_cold', id: 'resC', min: 12, max: 18, currency: 'chaos', cost: 5, label: '냉기 저항', slots: ['투구', '갑옷', '장갑', '신발', '반지', '목걸이', '허리띠', '방패'] },
    { optionId: 'res_light', id: 'resL', min: 12, max: 18, currency: 'chaos', cost: 5, label: '번개 저항', slots: ['투구', '갑옷', '장갑', '신발', '반지', '목걸이', '허리띠', '방패'] },
    { optionId: 'shield_chaos_res', id: 'resChaos', min: 8, max: 12, currency: 'chaos', cost: 6, label: '완갑 카오스 저항', slots: ['방패'] },
    { optionId: 'shield_block_pct', id: 'blockChancePct', min: 16, max: 24, currency: 'augment', cost: 12, label: '기본 막기 확률 증가', slots: ['방패'] }
];
CHAOS_INFUSER_OPTIONS.forEach(option => {
    let merged = Object.entries(CURRENCY_LEGACY_MERGE || {}).find(([, legacyKeys]) => legacyKeys.includes(option.currency));
    if (merged) option.currency = merged[0];
});
return CHAOS_INFUSER_OPTIONS;
}
