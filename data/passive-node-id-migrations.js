'use strict';

// Version 22 originally retained 35 identifiers from an external reference export.
// Keep these aliases only at the save boundary so existing allocations survive the
// switch to project-owned identifiers. New game data must only use the mapped values.
const PASSIVE_NODE_ID_MIGRATIONS = Object.freeze({
    poe2_1207: 'pt_base_path_001',
    poe2_1826: 'pt_spine_warrior_left_05',
    poe2_17726: 'pt_spine_warrior_left_11',
    poe2_17729: 'pt_spine_warrior_left_10',
    poe2_17871: 'pt_spine_warrior_left_09',
    poe2_17994: 'pt_spine_warrior_left_08',
    poe2_18004: 'pt_spine_warrior_left_07',
    poe2_18186: 'pt_spine_warrior_left_06',
    poe2_18374: 'pt_spine_warrior_left_04',
    poe2_18407: 'pt_spine_warrior_left_03',
    poe2_18451: 'pt_spine_warrior_left_02',
    poe2_22290: 'pt_spine_warrior_left_01',
    poe2_26196: 'pt_void_southeast',
    poe2_26725: 'pt_void_south',
    poe2_42460: 'pt_base_path_002',
    poe2_44683: 'pt_start_occultist',
    poe2_47175: 'pt_start_wanderer',
    poe2_47856: 'pt_base_path_003',
    poe2_50459: 'pt_start_cleric',
    poe2_50986: 'pt_start_warrior',
    poe2_53196: 'pt_base_path_004',
    poe2_54127: 'pt_void_southwest',
    poe2_54447: 'pt_start_alchemist',
    poe2_58593: 'pt_base_path_005',
    poe2_60735: 'pt_void_northwest',
    poe2_61419: 'pt_void_north',
    poe2_61525: 'pt_start_archer',
    poe2_61834: 'pt_void_northeast',
    poe2_64370: 'pt_base_path_006',
    poe2_core_hex_01: 'pt_core_keystone_01',
    poe2_core_hex_02: 'pt_core_keystone_02',
    poe2_core_hex_03: 'pt_core_keystone_03',
    poe2_core_hex_04: 'pt_core_keystone_04',
    poe2_core_hex_05: 'pt_core_keystone_05',
    poe2_core_hex_06: 'pt_core_keystone_06'
});

if (typeof safeExposeData === 'function') safeExposeData({ PASSIVE_NODE_ID_MIGRATIONS });
if (typeof module !== 'undefined' && module.exports) module.exports = { PASSIVE_NODE_ID_MIGRATIONS };
