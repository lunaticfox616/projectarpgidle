// 무기 대분류 여섯 (docs/weapon-categories-20261001.md): 대검 · 곡도 · 단궁 · 오브 · 플라스크 · 향로.
// id는 주인공 그림의 무기(data/hana-weapon-combos.js weapons)와 같다. 대분류 안에서는 여러 바탕(검, 도끼, 창, 지팡이 ...)이
// 있어도 된다. 직업과 묶지 않는다: 요구 능력치만 맞으면 어느 직업이든 끼고, 주인공 그림은 낀 무기의 대분류를 든다.
// root: 그 대분류를 든 뿌리 촉수 몬스터(assets/enemies/roots/{root}-*.png, data/bosses.js ROOT_MONSTER_VISUALS).
const WEAPON_CATEGORIES = Object.freeze({
    greatsword: Object.freeze({ name: '대검', root: 'greatsword' }),
    scimitar: Object.freeze({ name: '곡도', root: 'curvedblade' }),
    shortbow: Object.freeze({ name: '단궁', root: 'shortbow' }),
    orb: Object.freeze({ name: '오브', root: 'orb' }),
    flask: Object.freeze({ name: '플라스크', root: 'flask' }),
    censer: Object.freeze({ name: '향로', root: 'censer' })
});

// 무기 바탕(js/state.js BASE_ITEM_DB, slot '무기') → 대분류. 새 무기 바탕은 반드시 여기에 넣는다(scripts/smoke-weapon-categories.js).
// 대검: 양손 대검과 장병기(창 · 글레이브 · 랜스). 곡도: 한손 검 · 도끼 · 송곳 · 곡도(전부 힘과 민첩). 단궁: 활 · 발사기 · 발리스타 · 레일건.
// 바탕 승급은 같은 대분류 안에서만 한다(js/items.js getBaseUpgradeCandidates).
// 오브: 주문 무기와 소환 무기 전부(완드 · 로드 · 홀 · 초점봉 · 지팡이 · 사역봉).
const WEAPON_BASE_CATEGORIES = Object.freeze({
    dull_greatsword: 'greatsword', iron_greatsword: 'greatsword', warden_greatsword: 'greatsword',
    executioner_blade: 'greatsword', doomcleaver_blade: 'greatsword', apocalypse_greatblade: 'greatsword',
    abyss_spear: 'greatsword', gale_fang_spear: 'greatsword', echo_lance: 'greatsword', tempest_pike: 'greatsword',
    cyclone_glaive: 'greatsword', tempestlord_lance: 'greatsword', cosmos_prism_lance: 'greatsword',
    rusted_blade: 'scimitar', hunter_axe: 'scimitar', root_blade_fang: 'scimitar', bloodletter_blade: 'scimitar', chaos_realm_fang: 'scimitar',
    crescent_scimitar: 'scimitar', blackiron_scimitar: 'scimitar', eclipse_scimitar: 'scimitar',
    hunting_shortbow: 'shortbow', windlash_bow: 'shortbow', needle_recurve: 'shortbow', stormbolt_launcher: 'shortbow', seeker_railgun: 'shortbow',
    starfall_ballista: 'shortbow', tempest_volley: 'shortbow', meteor_repeater: 'shortbow',
    apprentice_familiar_wand: 'orb', pact_familiar_wand: 'orb', nova_rod: 'orb', spirit_call_wand: 'orb', ember_wand: 'orb',
    spiritbound_wand: 'orb', rift_scepter: 'orb', gravebind_scepter: 'orb', echo_focus: 'orb', ritual_familiar_staff: 'orb',
    void_archon_staff: 'orb', abyss_chant_staff: 'orb', astral_familiar_staff: 'orb', archon_familiar_staff: 'orb', genesis_void_staff: 'orb',
    cracked_flask: 'flask', catalyst_flask: 'flask', volatile_flask: 'flask', alchemist_retort: 'flask', philosopher_flask: 'flask',
    tin_censer: 'censer', incense_censer: 'censer', ember_censer: 'censer', chapel_censer: 'censer', sunrise_censer: 'censer'
});

safeExposeData({ WEAPON_CATEGORIES, WEAPON_BASE_CATEGORIES });

// 대분류에 어울리지 않는 무기 추가 옵션(js/state.js MOD_DB id): 그 대분류 무기에서는 weight배로 덜 붙는다(2026-10-07 드랍 풀 1단계,
// js/passives.js getAvailableMods). 스킬은 무기를 가리지 않으므로 막지 않고 줄이기만 한다. 대분류 전용 줄은 MOD_DB weaponCategories.
const WEAPON_CATEGORY_OFF_MODS = Object.freeze({
    weight: 0.25,
    byCategory: Object.freeze({
        greatsword: ['projectilePctDmg', 'targetProjectile', 'projectileExtraShots', 'spellFlatDmg', 'spellFlatPct', 'spellPctDmg', 'spellLeech'],
        scimitar: ['projectilePctDmg', 'targetProjectile', 'projectileExtraShots', 'spellFlatDmg', 'spellFlatPct', 'spellPctDmg', 'spellLeech'],
        censer: ['projectilePctDmg', 'targetProjectile', 'projectileExtraShots'],
        shortbow: ['meleePctDmg', 'targetSlam', 'spellFlatDmg', 'spellFlatPct', 'spellPctDmg', 'spellLeech'],
        orb: ['meleePctDmg', 'targetSlam', 'attackPctDmg', 'leech'],
        flask: ['meleePctDmg', 'targetSlam']
    })
});
safeExposeData({ WEAPON_CATEGORY_OFF_MODS });
