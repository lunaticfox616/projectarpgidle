export const BOSS_MOVE_RULES = /* @__PURE__ */ Object.freeze({
    volley: /* @__PURE__ */ Object.freeze({ firstMs: 140, stepMs: 110 }),
    chain: /* @__PURE__ */ Object.freeze({ firstMs: 280, stepMs: 150 }),
    beam: /* @__PURE__ */ Object.freeze({ firstMs: 320, tickMs: 450, ticks: 4, tickShare: 0.45 }),
    rings: /* @__PURE__ */ Object.freeze({ firstMs: 500, gapMs: 650 }),
    cross: /* @__PURE__ */ Object.freeze({ firstMs: 500, gapMs: 300 }),
    scatter: /* @__PURE__ */ Object.freeze({ firstMs: 420, gapMs: 300, waves: 3 }),
    grind: /* @__PURE__ */ Object.freeze({ firstMs: 120, tickMs: 190, ticks: 7, tickShare: 0.3 })
});

export const BOSS_MOVE_INTRO = /* @__PURE__ */ Object.freeze({
    melee: /* @__PURE__ */ Object.freeze(['impact', 'lane', 'pulse']),
    ground: /* @__PURE__ */ Object.freeze(['pulse', 'lane', 'ring']),
    projectile: /* @__PURE__ */ Object.freeze(['impact', 'fan', 'beam']),
    wave: /* @__PURE__ */ Object.freeze(['fan', 'wave', 'lane']),
    beam: /* @__PURE__ */ Object.freeze(['beam', 'impact', 'fan']),
    fall: /* @__PURE__ */ Object.freeze(['ring', 'impact', 'pulse']),
    none: /* @__PURE__ */ Object.freeze(['impact', 'wave'])
});

export const BOSS_MOVE_STYLE_BY_VISUAL = /* @__PURE__ */ Object.freeze({ cosmos_astra: null, pinnacle_leviathan: 'projectile' });

export const BOSS_MOVE_NAMES = /* @__PURE__ */ Object.freeze({
    impact: '지면 강타', wave: '십자 강타', pulse: '이중 파동',
    beam: /* @__PURE__ */ Object.freeze({ beam: '관통 광선', other: '집중 사격' }),
    fan: /* @__PURE__ */ Object.freeze({ melee: '세 갈래 균열', ground: '세 갈래 분출', other: '갈래 사격' }),
    lane: /* @__PURE__ */ Object.freeze({ ground: '뿌리 분출', other: '연쇄 폭발' }),
    ring: /* @__PURE__ */ Object.freeze({ fall: '낙하 공격', other: '흩뿌리기' })
});

export const LINGER_MS = 900;

export const SHIFT_TIMING = /* @__PURE__ */ Object.freeze({ blink: { warning: 1200, land: 600 }, ambush: { warning: 1100, land: 400 } });

export const FAMILIES = /* @__PURE__ */ Object.freeze({ ray: ['fan', 'lane'], area: ['ring', 'pulse', 'wave', 'impact'] });

export const OPEN_MS = 1560;

export const FLOOR_MS = 4000;

export const IMPACT_MS = 160;

export const divisionCue = /* @__PURE__ */ Object.freeze({ close: 450, shade: 2090, black: 2390, reveal: 2550, end: 3310 });

export const SEAL_CAST_MS = 4200;

export const SEAL_IMPACT_MS = 100;

export const SEAL_LOCK_MS = 1000;

export const BEFORE = /* @__PURE__ */ Object.freeze([
            { kind: 'sight', label: '관측선', warningMs: 1250, damageMul: 1.12 },
            { kind: 'mark', label: '성좌 표식', warningMs: 1450, damageMul: 1.24 }
        ]);

export const LASER = { kind: 'dualLaser', label: '이중 경계 광선', warningMs: 2100, damageMul: 1.28 };

export const FLOOD = { kind: 'dualFlood', label: '경계 범람', warningMs: 3600, damageMul: 1.26 };

export const DIVIDED = /* @__PURE__ */ Object.freeze([LASER, FLOOD, LASER]);

// Keep the whole immutable initializer removable when a bundle imports only geometry.
export const AFTER = /* @__PURE__ */ (() => Object.freeze([
            LASER,
            { kind: 'collapse', label: '발판 붕괴', warningMs: 2000, damageMul: 1.34 },
            FLOOD,
            { kind: 'seal', label: '영구 봉인', warningMs: SEAL_CAST_MS - SEAL_IMPACT_MS, damageMul: 1 },
            LASER
        ]))();
