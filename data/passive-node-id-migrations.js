'use strict';

// Version 22 originally retained 35 identifiers from an external reference export: a three-letter prefix and '2_'
// (PASSIVE_NODE_ID_LEGACY_PREFIX) before the part listed below. Keep these aliases only at the save boundary so existing
// allocations survive the switch to project-owned identifiers. New game data must only use the mapped values.
const PASSIVE_NODE_ID_LEGACY_PREFIX = /^[a-z]{3}2_/;
const PASSIVE_NODE_ID_MIGRATIONS = Object.freeze({
    '1207': 'pt_base_path_001',
    '1826': 'pt_spine_warrior_left_05',
    '17726': 'pt_spine_warrior_left_11',
    '17729': 'pt_spine_warrior_left_10',
    '17871': 'pt_spine_warrior_left_09',
    '17994': 'pt_spine_warrior_left_08',
    '18004': 'pt_spine_warrior_left_07',
    '18186': 'pt_spine_warrior_left_06',
    '18374': 'pt_spine_warrior_left_04',
    '18407': 'pt_spine_warrior_left_03',
    '18451': 'pt_spine_warrior_left_02',
    '22290': 'pt_spine_warrior_left_01',
    '26196': 'pt_void_southeast',
    '26725': 'pt_void_south',
    '42460': 'pt_base_path_002',
    '44683': 'pt_start_occultist',
    '47175': 'pt_start_wanderer',
    '47856': 'pt_base_path_003',
    '50459': 'pt_start_cleric',
    '50986': 'pt_start_warrior',
    '53196': 'pt_base_path_004',
    '54127': 'pt_void_southwest',
    '54447': 'pt_start_alchemist',
    '58593': 'pt_base_path_005',
    '60735': 'pt_void_northwest',
    '61419': 'pt_void_north',
    '61525': 'pt_start_archer',
    '61834': 'pt_void_northeast',
    '64370': 'pt_base_path_006',
    core_hex_01: 'pt_core_keystone_01',
    core_hex_02: 'pt_core_keystone_02',
    core_hex_03: 'pt_core_keystone_03',
    core_hex_04: 'pt_core_keystone_04',
    core_hex_05: 'pt_core_keystone_05',
    core_hex_06: 'pt_core_keystone_06'
});

if (typeof safeExposeData === 'function') safeExposeData({ PASSIVE_NODE_ID_LEGACY_PREFIX, PASSIVE_NODE_ID_MIGRATIONS });
if (typeof module !== 'undefined' && module.exports) module.exports = { PASSIVE_NODE_ID_LEGACY_PREFIX, PASSIVE_NODE_ID_MIGRATIONS };
