'use strict';
/* 액트별 모양. 예전 전투 디오라마(assets/background/act1~10.png)의 재질·벽·바닥 무늬·소품을 위에서 본 도트 맵으로 옮긴 표.
 * shape: organic(칸 경계를 둥글고 삐뚤게) | straight(칸 경계 그대로 — 건축물 방).
 * paving[].where: rooms | paths | corridors | all. ornament.kind: arcs | border | rings | quatrefoil | burst | cross | sunburst | ringwalk.
 * wall.face: earth | arches | balustrade | library | bark | wisteria | railing | obsidian | none. wall.top: roots | masonry | bark | void | canopy. */
const ROOMS = ['battle', 'entry', 'elite', 'optional'];

const THEMES = {
    1: {
        title: '뿌리끝 성소', shape: 'organic',
        floor: { base: 2, band: 'grass', bandW: 2, patch: 1.2, specks: ['pebble', 'speck', 'crack', 'leaf', 'leaf', 'bone'] },
        paving: [{ style: 'slabs', where: 'rooms', inset: 6, ruin: 0.16, roomRuin: 0.28, tones: [1, 2, 2], mossy: 0.3, cracks: 0.25 }],
        ornament: { kind: 'burst', roles: ROOMS, inset: 4 },
        floorRoots: 30, puddles: 16,
        wall: { top: 'roots', face: 'earth', faceH: 17, fungus: 0.45 },
        lamp: 'candles', bossLamp: 'brazier', landmarks: ['colonnade', 'ring', 'stump', 'pool', 'statues'], elite: 'webs', optional: 'shrine',
        treasure: 'shrooms', pool: 'moss', pillarRoots: true, boost: 1.3,
        scatter: { rock: 2, shrooms: 3, candles: 2, leaves: 3, bones: 1, skull: 0.6, grave: 1 }, scatterN: 80
    },
    2: {
        title: '가지치기의 중정', shape: 'straight',
        floor: { base: 2, band: null, specks: ['crack', 'speck'] },
        paving: [{ style: 'slabs', where: 'all', ruin: 0.02, roomRuin: 0.03, tones: [2, 2, 3], mossy: 0.06, cracks: 0.12, grout: ['stone', 0] }],
        ornament: { kind: 'arcs', roles: ['battle', 'elite', 'optional'], inset: 6, look: { style: 'gold', ramp: 'warm', level: 2 } },
        floorRoots: 14,
        wall: { top: 'masonry', face: 'arches', faceH: 24, jitter: false, edge: 70, buttress: 26, deep: 30, deepW: 8, fade: 40 },
        lamp: 'lantern', bossLamp: 'lantern', landmarks: ['statues', 'urn', 'ring', 'colonnade'], elite: 'statues', optional: 'shrine',
        treasure: 'candles', mossyRocks: false, arenaRoots: false, boost: 1.1,
        scatter: { urn: 2, lantern: 1, candles: 1, rock: 1 }, scatterN: 36
    },
    3: {
        title: '허공뿌리 현수림', shape: 'organic',
        floor: { base: 3, band: 'grass', bandW: 3, patch: 1.15, specks: ['fiber', 'twig', 'speck', 'crack'] },
        paving: [{ style: 'slabs', where: 'rooms', inset: 4, ruin: 0.08, roomRuin: 0.12, tones: [2, 3, 3], mossy: 0.05, cracks: 0.4 },
            { style: 'planks', where: 'corridors', ramp: 'wood', ruin: 0.04, width: 9, tones: [2, 3, 3], mossy: 0 }],
        ornament: null, floorRoots: 16,
        wall: { top: 'void', face: 'none', faceH: 0, rimRoots: 70 },
        lamp: 'brazier', bossLamp: 'brazier', landmarks: ['bones', 'bigrock', 'twigs'], elite: 'bones', optional: 'shrine', treasure: 'crystals',
        boost: 1.2, scatter: { rock: 2, twigs: 2, bones: 2, bigrock: 1 }, scatterN: 70
    },
    4: {
        title: '갈림뿌리 미궁', shape: 'straight',
        floor: { base: 2, band: null, specks: ['crack', 'speck', 'twig'] },
        paving: [{ style: 'slabs', where: 'all', ruin: 0.05, roomRuin: 0.08, tones: [1, 2, 2], mossy: 0.04, cracks: 0.15, grout: ['dirt', 0] }],
        ornament: { kind: 'cross', roles: ROOMS, inset: 2 },
        floorRoots: 40,
        wall: { top: 'roots', face: 'library', faceH: 24, jitter: false, fungus: 0.08 },
        lamp: 'lantern', bossLamp: 'brazier', landmarks: ['crate', 'colonnade', 'crystals', 'pool'], pool: 'teal', elite: 'crystals', optional: 'shrine',
        treasure: 'candles', pillarRoots: true, boost: 1.25, scatter: { crate: 2, candles: 1, bones: 1, rock: 1 }, scatterN: 50
    },
    5: {
        title: '지주근의 침묵 성소', shape: 'straight',
        floor: { base: 2, band: null, specks: ['crack', 'pebble', 'speck'] },
        paving: [{ style: 'slabs', where: 'all', ruin: 0.1, roomRuin: 0.1, tones: [1, 2, 2], mossy: 0.1, cracks: 0.2, grout: ['dirt', 0] }],
        ornament: { kind: 'rings', roles: ['battle', 'elite', 'optional'], inset: 6, look: { style: 'pale', ramp: 'stone', level: 4 } },
        floorRoots: 22,
        wall: { top: 'masonry', face: 'balustrade', faceH: 22, jitter: false, doors: true, edge: 50, buttress: 22, fade: 26 },
        lamp: 'brazier', bossLamp: 'brazier', landmarks: ['statues', 'pool', 'candles', 'colonnade'], pool: 'teal', elite: 'candles', optional: 'shrine',
        treasure: 'candles', pillarRoots: true, boost: 1.3, scatter: { grave: 2, candles: 1, bones: 1, rock: 1 }, scatterN: 50
    },
    6: {
        title: '무너진 중정', shape: 'straight',
        floor: { base: 2, band: 'grass', bandW: 2, patch: 1.2, specks: ['crack', 'pebble', 'blade'] },
        paving: [{ style: 'slabs', where: 'all', ruin: 0.12, roomRuin: 0.16, tones: [1, 2, 2], mossy: 0.12, cracks: 0.35, grout: ['dirt', 0] }],
        ornament: { kind: 'quatrefoil', roles: ['battle', 'elite', 'optional'], inset: 6, look: { style: 'etched' } },
        floorRoots: 18,
        wall: { top: 'masonry', face: 'balustrade', faceH: 16, jitter: false, birch: true, edge: 30, buttress: 10, fade: 24 },
        lamp: 'brazier', bossLamp: 'brazier', landmarks: ['broken_statue', 'urn', 'colonnade', 'ring'], statue: 'broken_statue', elite: 'broken_statue',
        optional: 'shrine', treasure: 'candles', boost: 1.2, scatter: { rock: 3, bigrock: 2, twigs: 1, broken_statue: 0.5, urn: 0.5 }, scatterN: 60
    },
    7: {
        title: '말라가는 큰 줄기', shape: 'organic',
        floor: { base: 3, band: null, specks: ['crack', 'fiber', 'speck'] },
        paving: [{ style: 'planks', where: 'all', ramp: 'wood', ruin: 0.03, roomRuin: 0.05, tones: [2, 3, 3], mossy: 0 }],
        ornament: { kind: 'sunburst', roles: ROOMS, inset: 0 },
        floorRoots: 12,
        wall: { top: 'bark', face: 'bark', faceH: 18, fungi: true },
        lamp: 'lantern', bossLamp: 'lantern', landmarks: ['crate', 'candles', 'colonnade', 'pool'], pool: 'teal', elite: 'crystals', optional: 'shrine',
        treasure: 'crystals', boost: 1.3, scatter: { crate: 2, twigs: 2, rock: 1, bones: 1 }, scatterN: 60
    },
    8: {
        title: '끝없는 장막의 줄기', shape: 'organic',
        floor: { base: 3, band: null, specks: ['crack', 'speck', 'petal'] },
        paving: [{ style: 'slabs', where: 'all', ruin: 0.03, roomRuin: 0.03, tones: [1, 2, 2], mossy: 0, cracks: 0.08, grout: ['dirt', 0] }],
        ornament: { kind: 'ringwalk', roles: ROOMS, inset: 0 },
        floorRoots: 0,
        wall: { top: 'void', face: 'wisteria', faceH: 18, veil: true },
        lamp: 'lantern', bossLamp: 'lantern', landmarks: ['candles', 'statues', 'blossom', 'statues'], elite: 'candles', optional: 'shrine', treasure: 'crystals',
        mossyRocks: false, arenaRoots: false, boost: 1.4, scatter: { blossom: 3, candles: 1, rock: 1 }, scatterN: 60
    },
    9: {
        title: '비탄의 교차', shape: 'organic',
        floor: { base: 3, band: null, specks: ['petal', 'petal', 'twig', 'crack'] },
        paving: [{ style: 'slabs', where: 'all', ruin: 0.04, roomRuin: 0.05, tones: [2, 2, 3], mossy: 0.04, cracks: 0.1, grout: ['dirt', 0] }],
        ornament: { kind: 'arcs', roles: ['battle', 'elite', 'optional'], inset: 6, look: { style: 'pale', ramp: 'stone', level: 5 } },
        floorRoots: 24,
        wall: { top: 'canopy', face: 'railing', faceH: 16, flowers: 0.16, flowerRamp: 'teal' },
        lamp: 'lantern', bossLamp: 'lantern', landmarks: ['blossom', 'stump', 'twigs', 'statues'], elite: 'cocoon', optional: 'shrine', treasure: 'blossom',
        boost: 1.2, scatter: { blossom: 3, twigs: 2, rock: 1 }, scatterN: 70
    },
    10: {
        title: '합일의 차륜', shape: 'straight',
        floor: { base: 2, band: null, specks: ['star', 'speck'] },
        paving: [{ style: 'slabs', where: 'all', ruin: 0.02, roomRuin: 0.02, tones: [1, 2, 2], mossy: 0, cracks: 0.06, grout: ['dirt', 0] }],
        ornament: { kind: 'rings', roles: ['battle', 'elite', 'optional', 'entry'], inset: 5, look: { style: 'gold', ramp: 'warm', level: 2 } },
        floorRoots: 0,
        wall: { top: 'void', face: 'obsidian', faceH: 18, jitter: false, stars: true },
        lamp: 'brazier', bossLamp: 'brazier', landmarks: ['gold_statue', 'ring', 'statues', 'colonnade'], statue: 'gold_statue', ring: 'warm', ringGlow: true,
        elite: 'gold_statue', optional: 'shrine', treasure: 'crystals', mossyRocks: false, arenaRoots: false, boost: 1.2,
        scatter: { rock: 1, urn: 1, candles: 1 }, scatterN: 30
    }
};

module.exports = { THEMES };
