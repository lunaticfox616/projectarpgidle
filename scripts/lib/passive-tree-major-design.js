'use strict';

function major(name, firstStat, firstValue, secondStat, secondValue) {
    return Object.freeze({
        name,
        effects: Object.freeze([
            Object.freeze([firstStat, firstValue]),
            Object.freeze([secondStat, secondValue])
        ])
    });
}

// Each entry is intentionally assigned after reviewing its position, connected nodes,
// and local branch theme. Do not replace this table with score-based profile selection.
const MANUAL_MAJOR_DESIGNS = Object.freeze({
    // Existing one-line or underpowered majors.
    expansion_archer_arrow_fan_04: major('쏟아지는 화살', 'projectilePctDmg', 30, 'aspd', 8),
    expansion_archer_arrow_fan_10: major('갈라지는 화살촉', 'projectilePctDmg', 25, 'critDmg', 30),
    expansion_archer_crossbow_01: major('신속 장전', 'projectilePctDmg', 25, 'aspd', 8),
    expansion_archer_crossbow_09: major('철갑 관통탄', 'physPctDmg', 30, 'physIgnore', 6),
    expansion_occult_grimoire_24: major('의식의 왜곡', 'chaosPctDmg', 30, 'resPen', 6),
    completion_wanderer_dagger_09: major('그림자의 보법', 'meleePctDmg', 25, 'move', 6),
    completion_wanderer_dagger_15: major('파고드는 칼끝', 'meleePctDmg', 30, 'physIgnore', 6),

    // 9 o'clock: projectile, evasion, and ailment branches.
    v13_balance_center_left_orbit_07: major('궤도 조준', 'projectilePctDmg', 30, 'crit', 5),
    n9uurfbq5iu: major('질풍의 진군', 'pctDmg', 25, 'move', 6),
    nhz88k1d1br: major('정조준의 생존술', 'evasionPct', 25, 'resAll', 8),
    nwwz8hsk1ha: major('바람의 잔상', 'evasionPct', 30, 'move', 5),
    nf57f2xdc9q: major('질풍의 응시', 'pctDmg', 25, 'evasionPct', 20),
    completion_archer_reticle_17: major('치명적 행군', 'pctDmg', 30, 'move', 4),
    npjajqi2tcj: major('꿰뚫는 독시선', 'dotPctDmg', 30, 'poisonDamageMultiplierPct', 15),
    nu3wveecvnr: major('매의 생존본능', 'evasionPct', 20, 'flatHp', 50),
    npc7ayw2l4u: major('추적자의 퇴로', 'move', 8, 'resAll', 6),

    // 11 o'clock: ranged advance and alchemical transition.
    nu22weubz09: major('먼거리 진군', 'pctDmg', 30, 'move', 5),
    v13_balance_archer_quiver_12: major('사냥꾼의 대비', 'evasionPct', 25, 'pctDmg', 20),
    v13_balance_archer_arrowhead_01: major('심장 관통의 의지', 'pctDmg', 35, 'flatHp', 40),
    n0syjlnechx: major('꿰뚫는 대비', 'pctDmg', 25, 'resAll', 8),
    nv4s9u8dlfr: major('증류된 반사', 'evasionPct', 30, 'resAll', 6),
    njal44w2b1f: major('농축된 발놀림', 'move', 8, 'evasionPct', 20),
    ny32dfbvb6m: major('정제된 외피', 'energyShieldPct', 25, 'evasionPct', 20),
    n7fk4zu2l4u: major('증류된 퇴로', 'energyShieldPct', 20, 'move', 6),

    // 1 o'clock: ailment, spell, chaos, and energy-shield branches.
    nsdu4kbcvnr: major('변성의 전진', 'pctDmg', 25, 'energyShieldPct', 20),
    n02uryx34v1: major('농축된 맹독', 'dotPctDmg', 30, 'poisonChance', 15),
    nbvnhnpwsjx: major('변성의 주문행진', 'pctDmg', 30, 'energyShieldPct', 15),
    nqcn7k4wy3x: major('휘발성 장막', 'energyShieldPct', 30, 'resAll', 8),
    ncbzsciwy3x: major('금단의 피난처', 'energyShieldPct', 25, 'flatHp', 50),
    expansion_occult_ritual_eye_01: major('의식의 전진', 'pctDmg', 25, 'energyShieldPct', 25),
    nxpbq1fpr3m: major('차원의 성약', 'spellPctDmg', 30, 'chaosPctDmg', 20),
    n41x9l9wy3x: major('심연의 방벽', 'resAll', 10, 'energyShieldPct', 20),
    expansion_occult_ritual_eye_07: major('심연의 대비', 'pctDmg', 30, 'resAll', 8),
    n7czou0nlyk: major('심연의 보호막', 'energyShieldPct', 30, 'resAll', 10),
    ns77vwqwy3x: major('봉인된 도약', 'energyShieldPct', 35, 'move', 4),
    n5qbn9tzm38: major('금단의 복음', 'chaosPctDmg', 30, 'resPen', 6),
    neryoj6rg9p: major('봉인된 주문핵', 'spellPctDmg', 30, 'aspd', 8),
    n6mg44h34v1: major('차원의 조율', 'elementalPctDmg', 30, 'resAll', 8),

    // 3 o'clock: summons, elemental spell routes, and cleric defenses.
    npynrdvcvnr: major('공허한 회복막', 'energyShieldPct', 25, 'regen', 1),
    nmw6zlmrzvb: major('권속의 파쇄명령', 'summonPctDmg', 30, 'summonResPen', 6),
    nuh4qfz2tcj: major('의식의 생명벽', 'resAll', 10, 'flatHp', 60),
    nyjhqoqs0fe: major('공허 화염', 'firePctDmg', 30, 'igniteChance', 15),
    nhenzv8gp4i: major('금단의 불씨', 'firePctDmg', 30, 'regen', 1),
    nyqgwi51dd9: major('공허한 보루', 'pctHp', 10, 'resAll', 8),
    ndru1xggqhg: major('차원의 전류', 'lightPctDmg', 25, 'move', 6),
    ne2e0yialni: major('차원의 피난처', 'energyShieldPct', 30, 'flatHp', 40),
    v13_balance_center_left_diamond_05: major('계시의 방패', 'blockChance', 6, 'resAll', 10),
    nlwk06igprm: major('금단의 설화', 'coldPctDmg', 30, 'resAll', 6),
    ncnp3nqdwx7: major('차원의 유영', 'energyShieldPct', 25, 'move', 5),
    n3j2xrf67a0: major('계시의 핵', 'resAll', 10, 'pctHp', 8),
    nmo6q7fndtf: major('성스러운 성벽', 'armorPct', 30, 'pctHp', 8),
    nlqo2t92tcj: major('수호의 성약', 'pctHp', 10, 'regen', 1),

    // 5 o'clock: shield, armor, life, and warrior impact branches.
    n9i7lxbn61q: major('수호의 장막', 'armorPct', 25, 'resAll', 8),
    ng0exfvfgrq: major('성스러운 거체', 'pctHp', 10, 'flatHp', 60),
    ntb4libq9dr: major('정화의 방패', 'armorPct', 30, 'regen', 1),
    n1i8zw24wgm: major('성스러운 공세', 'pctDmg', 25, 'pctHp', 8),
    n2bs598tfi6: major('빛나는 성벽', 'resAll', 10, 'armorPct', 20),
    n7u6tr9kzle: major('전장의 파문', 'physPctDmg', 30, 'slamPctDmg', 25),
    norpezlnq9b: major('강철의 갑주', 'armorPct', 35, 'flatHp', 50),
    nqz2dbdeewm: major('철벽의 파문', 'pctHp', 12, 'regen', 1.5),
    n72oz4iiz00: major('강철의 공세', 'pctDmg', 30, 'flatHp', 60),
    nnbzzntdgnd: major('불굴의 방벽', 'armorPct', 35, 'resAll', 8),
    nicztbc2l4u: major('불굴의 회전참', 'meleePctDmg', 30, 'bleedChance', 15),
    nfg2t1alyub: major('강철의 절개', 'pctDmg', 35, 'armorPct', 15),

    // 7 o'clock: bruiser, duelist, and mobile-defense branches.
    nbx06u2cvnr: major('파쇄하는 회귀', 'pctDmg', 25, 'regen', 1),
    n0f1v7y34v1: major('강철의 회귀', 'armorPct', 25, 'move', 5),
    nu0ebumgsuw: major('철벽의 갑주', 'armorPct', 40, 'flatHp', 40),
    nqgg7me1kn9: major('맹렬한 상흔', 'pctDmg', 30, 'pctHp', 6),
    n9fixcygsuw: major('불굴의 윤회', 'pctHp', 10, 'move', 5),
    nlmhp5bgsuw: major('선봉의 방패', 'armorPct', 35, 'evasionPct', 25),
    ns0bc85cg2f: major('불굴의 격돌', 'pctDmg', 35, 'resAll', 6),
    n7izfqmirgh: major('그림자의 잔상', 'evasionPct', 35, 'pctHp', 6),
    v13_balance_center_left_triad_04: major('그림자의 진군', 'pctDmg', 25, 'move', 6),
    nivvye75zvd: major('흔적 없는 혈맥', 'pctHp', 10, 'evasionPct', 20),
    nfy49tagsuw: major('그림자의 칼끝', 'pctDmg', 30, 'move', 8),
    na7qk4f860i: major('황혼의 혈맥', 'pctDmg', 25, 'flatHp', 75),
    nm0tdylgsuw: major('기습의 잔상', 'evasionPct', 40, 'move', 4),
    nlvsbo234v1: major('흔적 없는 윤회', 'evasionPct', 25, 'regen', 1),
    nbva0jzcvnr: major('흔적 없는 병증', 'pctDmg', 25, 'evasionPct', 20),
    nzadgax39m6: major('침묵의 감각', 'evasionPct', 30, 'flatHp', 50),
    nzmu51v4gcm: major('황혼의 발놀림', 'pctDmg', 30, 'evasionPct', 15),
    nf1njb1k1ha: major('기습의 반사', 'evasionPct', 35, 'resAll', 6),
    nsro5qcydmk: major('추적자의 귀환', 'move', 8, 'flatHp', 40),

    // Attribute-heavy majors replaced with local combat or defense choices.
    noe0mym4aqq: major('강철의 혈맥', 'pctHp', 12, 'armorPct', 25),
    nmon3e1tgnr: major('맹렬한 완력', 'meleePctDmg', 30, 'regen', 1),
    n7rmdxbrpjt: major('빛나는 보호막', 'energyShieldPct', 35, 'resAll', 8),
    nro2nbecg2f: major('날렵한 완력', 'pctDmg', 30, 'flatHp', 60),
    naem45q3jy1: major('봉인된 통찰', 'energyShieldPct', 30, 'resAll', 8),
    nqzyecy6fxn: major('수호의 통찰', 'energyShieldPct', 35, 'pctHp', 6),
    nnqk3s9omrm: major('성스러운 지식', 'pctDmg', 25, 'energyShieldPct', 30),
    ni9hodoqwye: major('성스러운 정신', 'spellPctDmg', 25, 'aspd', 8),
    n8d1gctqxj7: major('공허한 지식', 'chaosPctDmg', 30, 'spellPctDmg', 20),
    n5v4zgvwy3x: major('촉매의 정신', 'energyShieldPct', 25, 'move', 6),
    ng1r1xtwy3x: major('증류된 정신', 'potionPctDmg', 25, 'aspd', 8),
    nt4ioiq3nuu: major('날렵한 감각', 'meleePctDmg', 30, 'crit', 5),
    nmmtu8r7lar: major('그림자의 반사', 'evasionPct', 35, 'move', 6),
    ngy6g9i8hmb: major('침묵의 발놀림', 'meleePctDmg', 30, 'critDmg', 30),
    n0lgg0gio3j: major('날렵한 거체', 'pctDmg', 25, 'regen', 1),
    n6o95mt7heo: major('꿰뚫는 반사', 'pctDmg', 30, 'evasionPct', 20),
    n0nf6dwk1ha: major('정조준의 감각', 'pctDmg', 30, 'move', 5),
    n02xuvik1ha: major('날렵한 발놀림', 'pctDmg', 25, 'move', 8),
    nmpyir31zo8: major('촉매의 감각', 'evasionPct', 30, 'move', 6),
    expansion_archer_arrow_fan_07: major('세 갈래 궤적', 'projectilePctDmg', 30, 'projectileExtraShots', 1),
    expansion_archer_longbow_05: major('흔들림 없는 손', 'projectilePctDmg', 35, 'accuracyBonusPct', 10),
    expansion_occult_grimoire_01: major('금서의 서문', 'spellPctDmg', 30, 'chaosPctDmg', 20),
    n99gnyxyu0e: major('수호의 외피', 'energyShieldPct', 35, 'resAll', 8),
    n81t4885y2x: major('그림자의 감각', 'meleePctDmg', 30, 'move', 6),
    v13_balance_archer_arrowhead_06: major('정조준의 몸놀림', 'pctDmg', 30, 'move', 8),
    v13_balance_center_dimensional_prism_01: major('변성의 정신', 'elementalPctDmg', 30, 'spellPctDmg', 20),
    v13_balance_cycle_infinity_12: major('굳건한 혈맥', 'armorPct', 30, 'regen', 1),
    v13_balance_center_left_eye_09: major('파쇄하는 완력', 'physPctDmg', 30, 'flatHp', 60),
    v13_bulk_연금술사_2_07: major('농축된 정신', 'potionPctDmg', 30, 'aspd', 8),
    v13_bulk_연금술사_4_07: major('정제된 정신', 'dotPctDmg', 30, 'aspd', 8),
    v13_bulk_비술사_5_08: major('촉매의 지식', 'spellPctDmg', 30, 'crit', 5),
    v13_bulk_전사_2_01: major('불굴의 거체', 'pctHp', 12, 'regen', 1),
    v13_bulk_전사_2_09: major('맹렬한 거체', 'physPctDmg', 30, 'flatHp', 60),
    ngnw13esowq: major('변성의 감각', 'potionPctDmg', 30, 'evasionPct', 20),
    ngyd9e4ve2j: major('정조준의 반사', 'projectilePctDmg', 30, 'accuracyBonusPct', 10),
    nwhjmdbwg8o: major('휘발성 반사', 'potionPctDmg', 25, 'crit', 5),
    n309epcyifr: major('서약의 혈맥', 'blockChance', 6, 'flatHp', 60),
    n6f879js9gb: major('정화의 정신', 'energyShieldPct', 35, 'regen', 1),

    // Two adjacent cleric majors intentionally lead to mitigation or sustain.
    v13_bulk_성직자_1_10: major('굳건한 장막', 'energyShieldPct', 30, 'resAll', 8),
    v13_bulk_성직자_1_11: major('회복의 외피', 'energyShieldPct', 25, 'regen', 1)
});

function getManualMajorDesign(nodeId) {
    return MANUAL_MAJOR_DESIGNS[String(nodeId)] || null;
}

module.exports = { getManualMajorDesign, MANUAL_MAJOR_DESIGNS };
