export const GRID_CARDINAL_STEPS=Object.freeze([
    Object.freeze({ dx: -1, dy: 0 }), Object.freeze({ dx: 1, dy: 0 }),
    Object.freeze({ dx: 0, dy: -1 }), Object.freeze({ dx: 0, dy: 1 })
]);
export const GRID_EIGHT_STEPS=Object.freeze(GRID_CARDINAL_STEPS.concat([
    Object.freeze({ dx: -1, dy: -1 }), Object.freeze({ dx: 1, dy: -1 }),
    Object.freeze({ dx: -1, dy: 1 }), Object.freeze({ dx: 1, dy: 1 })
]));
export const HERO_HALF_CELLS=0.45;
