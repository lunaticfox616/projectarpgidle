export const HERO_SPRITE_CONFIG = { cols: 6, rows: 5, drawHeight: 58, anchorX: 0.5, anchorY: 0.92 };

export const HERO_MOTIONS = {
    walk: [0, 1, 2, 3],
    run: [4, 5, 6, 7],
    hit: [8, 9],
    idle: [10, 11, 12, 13],
    slash: [14, 15, 16, 17],
    throw: [18, 19, 20, 21],
    cast: [22, 23, 24, 25],
    bow: [26, 27, 28, 29]
};

export const HERO_FRAME_META = {
    0: { motion: 'walk', local: 0, pivot: { x: 150, y: 260 }, hand: { x: 120, y: 155 }, drawOffset: { x: 0, y: 0 } },
    1: { motion: 'walk', local: 1, pivot: { x: 150, y: 260 }, hand: { x: 122, y: 154 }, drawOffset: { x: 0, y: 0 } },
    2: { motion: 'walk', local: 2, pivot: { x: 150, y: 260 }, hand: { x: 124, y: 153 }, drawOffset: { x: 0, y: 0 } },
    3: { motion: 'walk', local: 3, pivot: { x: 150, y: 260 }, hand: { x: 126, y: 154 }, drawOffset: { x: 0, y: 0 } },
    4: { motion: 'run', local: 0, pivot: { x: 150, y: 260 }, hand: { x: 122, y: 154 }, drawOffset: { x: 0, y: 0 } },
    5: { motion: 'run', local: 1, pivot: { x: 150, y: 260 }, hand: { x: 125, y: 152 }, drawOffset: { x: 0, y: 0 } },
    6: { motion: 'run', local: 2, pivot: { x: 150, y: 260 }, hand: { x: 127, y: 151 }, drawOffset: { x: 0, y: 0 } },
    7: { motion: 'run', local: 3, pivot: { x: 150, y: 260 }, hand: { x: 129, y: 152 }, drawOffset: { x: 0, y: 0 } },
    8: { motion: 'hit', local: 0, pivot: { x: 150, y: 260 }, hand: { x: 121, y: 156 }, drawOffset: { x: 0, y: 0 } },
    9: { motion: 'hit', local: 1, pivot: { x: 150, y: 260 }, hand: { x: 119, y: 158 }, drawOffset: { x: 0, y: 0 } },
    10: { motion: 'idle', local: 0, pivot: { x: 150, y: 260 }, hand: { x: 120, y: 155 }, drawOffset: { x: 0, y: 0 } },
    11: { motion: 'idle', local: 1, pivot: { x: 150, y: 260 }, hand: { x: 121, y: 154 }, drawOffset: { x: 0, y: 0 } },
    12: { motion: 'idle', local: 2, pivot: { x: 150, y: 260 }, hand: { x: 122, y: 155 }, drawOffset: { x: 0, y: 0 } },
    13: { motion: 'idle', local: 3, pivot: { x: 150, y: 260 }, hand: { x: 121, y: 156 }, drawOffset: { x: 0, y: 0 } },
    14: { motion: 'slash', local: 0, pivot: { x: 150, y: 260 }, hand: { x: 125, y: 145 }, drawOffset: { x: 0, y: 0 } },
    15: { motion: 'slash', local: 1, pivot: { x: 150, y: 260 }, hand: { x: 142, y: 138 }, drawOffset: { x: 0, y: 0 } },
    16: { motion: 'slash', local: 2, pivot: { x: 150, y: 260 }, hand: { x: 160, y: 135 }, drawOffset: { x: 0, y: 0 } },
    17: { motion: 'slash', local: 3, pivot: { x: 150, y: 260 }, hand: { x: 148, y: 145 }, drawOffset: { x: 0, y: 0 } },
    18: { motion: 'throw', local: 0, pivot: { x: 150, y: 260 }, hand: { x: 92, y: 140 }, drawOffset: { x: 0, y: 0 } },
    19: { motion: 'throw', local: 1, pivot: { x: 150, y: 260 }, hand: { x: 112, y: 130 }, drawOffset: { x: 0, y: 0 } },
    20: { motion: 'throw', local: 2, pivot: { x: 150, y: 260 }, hand: { x: 135, y: 125 }, drawOffset: { x: 0, y: 0 } },
    21: { motion: 'throw', local: 3, pivot: { x: 150, y: 260 }, hand: { x: 150, y: 130 }, drawOffset: { x: 0, y: 0 } },
    22: { motion: 'cast', local: 0, pivot: { x: 150, y: 260 }, hand: { x: 95, y: 140 }, drawOffset: { x: 0, y: 0 } },
    23: { motion: 'cast', local: 1, pivot: { x: 150, y: 260 }, hand: { x: 118, y: 132 }, drawOffset: { x: 0, y: 0 } },
    24: { motion: 'cast', local: 2, pivot: { x: 150, y: 260 }, hand: { x: 138, y: 125 }, drawOffset: { x: 0, y: 0 } },
    25: { motion: 'cast', local: 3, pivot: { x: 150, y: 260 }, hand: { x: 150, y: 122 }, drawOffset: { x: 0, y: 0 } },
    26: { motion: 'bow', local: 0, pivot: { x: 150, y: 260 }, hand: { x: 88, y: 138 }, drawOffset: { x: 0, y: 0 } },
    27: { motion: 'bow', local: 1, pivot: { x: 150, y: 260 }, hand: { x: 105, y: 132 }, drawOffset: { x: 0, y: 0 } },
    28: { motion: 'bow', local: 2, pivot: { x: 150, y: 260 }, hand: { x: 122, y: 130 }, drawOffset: { x: 0, y: 0 } },
    29: { motion: 'bow', local: 3, pivot: { x: 150, y: 260 }, hand: { x: 138, y: 130 }, drawOffset: { x: 0, y: 0 } }
};

export const SKILL_CONFIG = {
    1: { id: 'basic_slash', motion: 'slash' },
    2: { id: 'heavy_smash', motion: 'slash' },
    3: { id: 'dagger_throw', motion: 'throw' },
    4: { id: 'bow_shot', motion: 'bow' },
    5: { id: 'spear_thrust', motion: 'throw' },
    6: { id: 'staff_cast', motion: 'cast' },
    7: { id: 'scythe_swing', motion: 'slash' },
    8: { id: 'magic_cast', motion: 'cast' }
};
