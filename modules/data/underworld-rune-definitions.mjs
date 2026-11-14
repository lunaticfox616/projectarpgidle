/** Authored definitions formerly owned by state.js. Shared once by the runtime entry. */
const UNDERWORLD_RUNE_DB = [
    { no: 1, id: 'uw_rune_1', name: '초생', stat: 'flatHp', val: 30 },
    { no: 2, id: 'uw_rune_2', name: '절단', stat: 'flatDmg', val: 8 },
    { no: 3, id: 'uw_rune_3', name: '강벽', stat: 'armor', val: 30 },
    { no: 4, id: 'uw_rune_4', name: '경풍', stat: 'evasion', val: 30 },
    { no: 5, id: 'uw_rune_5', name: '영갑', stat: 'energyShield', val: 30 },
    { no: 6, id: 'uw_rune_6', name: '화관', stat: 'resF', val: 3 },
    { no: 7, id: 'uw_rune_7', name: '설관', stat: 'resC', val: 3 },
    { no: 8, id: 'uw_rune_8', name: '뢰관', stat: 'resL', val: 3 },
    { no: 9, id: 'uw_rune_9', name: '공식', stat: 'resChaos', val: 1.5 },
    { no: 10, id: 'uw_rune_10', name: '균결', stat: 'resAll', val: 1 },
    { no: 11, id: 'uw_rune_11', name: '혈전', stat: 'physPctDmg', val: 12 },
    { no: 12, id: 'uw_rune_12', name: '염전', stat: 'firePctDmg', val: 12 },
    { no: 13, id: 'uw_rune_13', name: '빙전', stat: 'coldPctDmg', val: 12 },
    { no: 14, id: 'uw_rune_14', name: '뢰전', stat: 'lightPctDmg', val: 12 },
    { no: 15, id: 'uw_rune_15', name: '허전', stat: 'chaosPctDmg', val: 12 },
    { no: 16, id: 'uw_rune_16', name: '비화', stat: 'corpseExplodeChance', val: 5 },
    { no: 17, id: 'uw_rune_17', name: '분화', stat: 'corpseExplodeLifePct', val: 8 },
    { no: 18, id: 'uw_rune_18', name: '극염', stat: 'maxResF', val: 1 },
    { no: 19, id: 'uw_rune_19', name: '극한', stat: 'maxResC', val: 1 },
    { no: 20, id: 'uw_rune_20', name: '극뢰', stat: 'maxResL', val: 1 },
    { no: 21, id: 'uw_rune_21', name: '천공', stat: 'resPen', val: 5 },
    { no: 22, id: 'uw_rune_22', name: '심절', stat: 'physIgnore', val: 5 },
    { no: 23, id: 'uw_rune_23', name: '공율', stat: 'resonancePower', val: 10 },
    { no: 24, id: 'uw_rune_24', name: '추동', stat: 'move', val: 3 },
    { no: 25, id: 'uw_rune_25', name: '속결', stat: 'aspd', val: 3 },
    { no: 26, id: 'uw_rune_26', name: '예각', stat: 'crit', val: 1 },
    { no: 27, id: 'uw_rune_27', name: '쇄광', stat: 'critDmg', val: 3 },
    { no: 28, id: 'uw_rune_28', name: '연격', stat: 'ds', val: 2 },
    { no: 29, id: 'uw_rune_29', name: '저류', stat: 'minDmgRoll', val: 2 },
    { no: 30, id: 'uw_rune_30', name: '고조', stat: 'maxDmgRoll', val: 2 }
];

export function createRunesDefinitions() {

return { UNDERWORLD_RUNE_DB };
}
