export const PASSIVE_REVELATION_IDS = Object.freeze(['combat', 'guard', 'life']);

export const PASSIVE_REVELATION_LABELS = Object.freeze({
    combat: '전투의 계시', guard: '수호의 계시', life: '생명의 성약', fanaticism: '광신'
});

export const PASSIVE_WISDOM_ELEMENTS = Object.freeze(['fire', 'cold', 'lightning', 'chaos']);

export const PASSIVE_WISDOM_ELEMENT_BY_NODE_ID = Object.freeze({
    nmvzwisdomf: 'fire', nmvzwisdomc: 'cold', nmvzwisdoml: 'lightning', nmvzwisdomd: 'chaos',
    nhenzv8gp4i: 'fire',
    nlwk06igprm: 'cold',
    ndru1xggqhg: 'lightning',
    nwn5msikamo: 'chaos'
});

export const PASSIVE_AILMENT_BY_ELEMENT = Object.freeze({ phys: 'bleed', fire: 'ignite', cold: 'chill', light: 'shock', chaos: 'poison' });

export const PASSIVE_KARMA_PER_TARGET_CAP = 500;

export const PASSIVE_KEYSTONE_NODE_ID_BY_TITLE = Object.freeze({
    '균형의 공명': 'pt_keystone_balance_resonance',
    '세 갈래 불빛': 'pt_keystone_three_lights',
    '회심의 일격': 'pt_keystone_critical_conversion',
    '육신의 공명': 'nmwc5dia92',
    '의지의 공명': 'nmwc5lu2h3',
    '금단의 만상': 'pt_core_keystone_01',
    '타락한 복음': 'pt_core_keystone_02',
    '육신과 정신의 성약': 'pt_core_keystone_03',
    '카르마': 'pt_core_keystone_04',
    '아슈라': 'pt_core_keystone_05',
    '사중합일': 'pt_core_keystone_06',
    '순환의 원석': 'npqq5m7h2ri',
    '야만': 'n39ip40yc3d',
    '헌신의 서약': 'nv67fzprmet',
    '몰아의 통로': 'nkr7zwrymol',
    '최후방 사격': 'nxsxdk1yr2y',
    '결투의 규율': 'n2c51dapljo',
    '피빛 요람': 'pt_warrior_blood_cradle',
    '지혜의 도약': 'nkf64engb6m',
    '혼의 성소': 'backbone_branch_occultist_cleric_center_occultist_cleric_channel_guard_keystone',
    '움직이는 성벽': 'backbone_branch_cleric_warrior_center_cleric_warrior_guard_regen_keystone',
    '피의 가속': 'backbone_branch_warrior_wanderer_center_warrior_wanderer_roll_speed_keystone',
    '선제 사냥': 'backbone_branch_wanderer_archer_center_wanderer_archer_range_roll_keystone',
    '오염된 탄두': 'backbone_branch_archer_alchemist_center_archer_alchemist_area_projectile_keystone',
    '검은 증류': 'backbone_branch_alchemist_occultist_center_alchemist_occultist_energy_poison_keystone',
    '단일 해석': 'backbone_branch_occultist_outer_2_mystique_single_keystone',
    '남겨진 잠식': 'backbone_branch_occultist_outer_4_occultist_summon_keystone',
    '삼중 계시': 'backbone_branch_cleric_outer_1_devotion_triple_keystone',
    '대리 성약': 'backbone_branch_cleric_outer_4_cleric_summon_efficiency_keystone',
    '역행 순환': 'backbone_branch_warrior_outer_1_cycle_reverse_keystone',
    '한 번의 중량': 'backbone_branch_warrior_outer_4_warrior_bleed_keystone',
    '완전 회피': 'backbone_branch_wanderer_outer_4_wanderer_duel_keystone',
    '관통 행렬': 'backbone_branch_archer_outer_4_archer_physical_keystone',
    '과잉 투여': 'backbone_branch_alchemist_outer_1_universal_flask_keystone',
    '단 하나의 사역': 'backbone_branch_alchemist_outer_2_universal_summon_keystone',
    '폭발성 증류': 'backbone_branch_alchemist_outer_4_alchemist_resist_keystone'
});

export const PASSIVE_CYCLE_BUFF_EFFECTS = Object.freeze({
    ignite: [{ stat: 'firePctDmg', perCycle: 2 }],
    chill: [{ stat: 'coldPctDmg', perCycle: 2 }, { stat: 'move', perCycle: 0.5 }],
    freeze: [{ stat: 'coldPctDmg', perCycle: 2 }, { stat: 'energyShieldPct', perCycle: 1 }],
    shock: [{ stat: 'lightPctDmg', perCycle: 2 }, { stat: 'aspd', perCycle: 0.5 }],
    poison: [{ stat: 'chaosPctDmg', perCycle: 2 }, { stat: 'regen', perCycle: 0.1 }],
    bleed: [{ stat: 'physPctDmg', perCycle: 2 }, { stat: 'armorPct', perCycle: 1 }]
});

export const PASSIVE_START_GATE_CLASS_BY_TITLE = Object.freeze({ '연금술의 가지': 'alchemist', '지식의 가지': 'occultist', '바람결의 가지': 'archer', '믿음의 줄기': 'cleric', '자유의 줄기': 'wanderer', '힘의 뿌리': 'warrior' });

export const PASSIVE_TREE_PRESET_SLOTS = 3;
