'use strict';
/* 액트별 모양(그린 화풍, 2026-10-02). 색은 pal.cjs. 바닥·벽(또는 허공)·소품을 어떻게 그릴지만 적는다.
 * floor.base / floor.paths(통로): earth | flags(불규칙 판석) | slabs(깎은 판석) | planks(널빤지). floor.plaza: 방 가운데 포장.
 * band.style(벽 윗면): rock | coping(갓돌) | hedge(생울타리) | grain(나무결) | blossom(꽃덤불). fill이면 벽 덩어리를 다 채운다.
 * face.style(북쪽 벽 앞면): rock | masonry(깎은 돌, arches면 아치 벽감) | bark(나무껍질) | shelves(책장).
 * abyss: 벽 대신 허공에 뜬 판(가장자리, 밑면, sky). rooms: 방 역할별 소품, scatter: 벽가에 흩을 소품과 비중. */
const LOOKS = {
    1: {
        title: '뿌리끝 성소', shape: 'organic', faceH: 20,
        floor: { base: 'earth', plaza: { kind: 'flags', sx: 14, sy: 10, chips: 0.45, tufts: 0.006, damp: true, joint: 'earth1' } },
        band: { style: 'rock', width: 10, roots: true }, face: { style: 'rock', roots: true }, sky: 'flat', moss: 1,
        litter: ['twig', 'leaf', 'pebble', 'bone'], webs: true, landing: true, fireflies: 'gold',
        rooms: { entry: 'candles', boss: 'torch', elite: 'skulls', optional: 'grave', landmarks: ['torch', 'grave', 'shrooms', 'boulder', 'planks'] },
        scatter: { shrooms: 2, boulder: 3, skulls: 1, candles: 2, planks: 1, grave: 1 }
    },
    2: {
        title: '가지치기의 중정', shape: 'straight', faceH: 22,
        floor: { base: 'slabs', slab: { rowH: 16, widths: [16, 16, 16, 32], chips: 0.3, cracks: 0.06, damp: true, lift: 1 } },
        band: { style: 'hedge', width: 11, fill: true, pebbles: false }, face: { style: 'masonry', arches: true, roots: true }, sky: 'flat', moss: 0.6,
        litter: ['leaf', 'pebble'], litterDensity: 700, webs: false,
        rooms: { entry: 'lantern', boss: 'lantern', elite: 'statue', optional: 'urn', landmarks: ['lantern', 'statue', 'topiary', 'urn', 'bench'] },
        scatter: { topiary: 3, urn: 2, lantern: 1, bench: 1, boulder: 1 }
    },
    3: {
        title: '허공뿌리 현수림', shape: 'organic', abyss: true,
        floor: { base: 'flags', flag: { sx: 13, sy: 10, chips: 0.4, damp: true, lift: 0 }, paths: 'planks' },
        sky: 'mist', moss: 0.5, litter: ['twig', 'bone', 'pebble'], webs: false, fireflies: 'gold',
        rooms: { entry: 'candles', boss: 'torch', elite: 'skulls', optional: 'grave', landmarks: ['torch', 'skulls', 'boulder', 'candles'] },
        scatter: { boulder: 3, skulls: 2, torch: 1, planks: 1 }
    },
    4: {
        title: '갈림뿌리 미궁', shape: 'straight', faceH: 22,
        floor: { base: 'planks', plankDir: 'x', paths: 'slabs', slab: { rowH: 8, minW: 9, maxW: 15, chips: 0.3 } },
        band: { style: 'coping', width: 10 }, face: { style: 'shelves' }, sky: 'flat', moss: 0.25,
        litter: ['pebble', 'bone'], webs: true,
        rooms: { entry: 'candles', boss: 'torch', elite: 'skulls', optional: 'potions', landmarks: ['crate', 'barrel', 'potions', 'candles'] },
        scatter: { crate: 2, barrel: 2, potions: 2, candles: 2, skulls: 1 }
    },
    5: {
        title: '지주근의 침묵 성소', shape: 'straight', faceH: 22,
        floor: { base: 'slabs', slab: { rowH: 10, minW: 12, maxW: 22, chips: 0.3, cracks: 0.08, damp: true } },
        band: { style: 'coping', width: 10 }, face: { style: 'masonry', arches: true, roots: true }, sky: 'flat', moss: 0.8,
        litter: ['pebble', 'bone', 'twig'], webs: true,
        rooms: { entry: 'candles', boss: 'torch', elite: 'statue', optional: 'grave', landmarks: ['pool', 'grave', 'candles', 'statue'] },
        scatter: { grave: 2, candles: 2, urn: 1, rubble: 1 }
    },
    6: {
        title: '무너진 중정', shape: 'straight', faceH: 18,
        floor: { base: 'earth', plaza: { kind: 'slabs', rowH: 8, minW: 9, maxW: 16, chips: 0.6, cracks: 0.2, missing: 0.1, scale: 0.92 } },
        band: { style: 'coping', width: 9 }, face: { style: 'masonry' }, sky: 'flat', moss: 0.5,
        litter: ['grass', 'leaf', 'pebble', 'grass'], webs: false,
        rooms: { entry: 'candles', boss: 'torch', elite: 'rubble', optional: 'urn', landmarks: ['birch', 'rubble', 'urn', 'statue'] },
        scatter: { birch: 2, rubble: 2, dryGrass: 3, urn: 1 }
    },
    7: {
        title: '말라가는 큰 줄기', shape: 'organic', faceH: 20,
        floor: { base: 'planks' }, band: { style: 'grain', width: 10 }, face: { style: 'bark', fungus: true }, sky: 'flat', moss: 0.3,
        litter: ['twig', 'pebble'], webs: true,
        rooms: { entry: 'candles', boss: 'torch', elite: 'sapCrystal', optional: 'sapCrystal', landmarks: ['sapCrystal', 'crate', 'planks', 'barrel'] },
        scatter: { sapCrystal: 2, crate: 1, barrel: 1, planks: 1, shrooms: 1 }
    },
    8: {
        title: '끝없는 장막의 줄기', shape: 'organic', abyss: true,
        floor: { base: 'flags', flag: { sx: 13, sy: 10, chips: 0.4 }, paths: 'planks' }, sky: 'petals', wisteria: true, moss: 0.4,
        litter: ['petal', 'pebble', 'petal'], webs: false,
        rooms: { entry: 'candles', boss: 'torch', elite: 'wisteriaTree', optional: 'lantern', landmarks: ['wisteriaTree', 'candles', 'lantern'] },
        scatter: { wisteriaTree: 1, candles: 2, boulder: 1 }
    },
    9: {
        title: '비탄의 교차', shape: 'organic', faceH: 20,
        floor: { base: 'earth', plaza: { kind: 'flags', sx: 14, sy: 10, chips: 0.45, damp: true, joint: 'earth1' } },
        band: { style: 'blossom', width: 10 }, face: { style: 'rock' }, sky: 'flat', moss: 0.5,
        litter: ['petal', 'petal', 'twig', 'pebble'], webs: false, fireflies: 'blossom',
        rooms: { entry: 'candles', boss: 'torch', elite: 'grave', optional: 'blossomTree', landmarks: ['blossomTree', 'grave', 'candles', 'lantern'] },
        scatter: { blossomTree: 1, grave: 2, candles: 2, boulder: 1 }
    },
    10: {
        title: '합일의 차륜', shape: 'straight', abyss: true,
        floor: { base: 'slabs', slab: { rowH: 16, widths: [16, 16, 32], chips: 0.15, cracks: 0.04, gold: 0.12 } }, sky: 'stars', moss: 0,
        litter: [], webs: false,
        // 차륜 성물은 정예 방 · 이정표 방에만(흩지 않는다): 자주 보이면 특별함이 사라진다.
        rooms: { entry: 'brazierBlue', boss: 'brazierBlue', elite: 'wheelRelic', optional: 'spire', landmarks: ['spire', 'wheelRelic', 'brazierBlue'] },
        scatter: { spire: 2, brazierBlue: 1 }
    }
};
module.exports = { LOOKS };
