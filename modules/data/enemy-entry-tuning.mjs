/** First-floor boss easing, shared by encounter creation and map readiness; floors beyond the list receive no easing.
 * The sky tower's tuning history (2026-10-19): the T15 build at loop 15 cleared floor 1 six of six times in ten
 * minutes, five without a death. The underworld's damage 0.74 cleared zero of six; floor 2 then cleared three of six
 * (underworld floor 2: four of six). This is historical tuning evidence, not current migration validation. */
export const ENTRY_BOSS_EASING = /* @__PURE__ */ Object.freeze({
    underworld: /* @__PURE__ */ Object.freeze([/* @__PURE__ */ Object.freeze({ hp: 0.81, damage: 0.74 })]),
    skyTower: /* @__PURE__ */ Object.freeze([
        /* @__PURE__ */ Object.freeze({ hp: 0.81, damage: 0.3 }), /* @__PURE__ */ Object.freeze({ hp: 0.85, damage: 0.45 }), /* @__PURE__ */ Object.freeze({ hp: 0.89, damage: 0.6 }),
        /* @__PURE__ */ Object.freeze({ hp: 0.92, damage: 0.75 }), /* @__PURE__ */ Object.freeze({ hp: 0.96, damage: 0.9 })
    ])
});

export const UNDERWORLD_ENTRY_BENCHMARK_HP_MULTIPLIER = 0.85;
export const UNDERWORLD_ENTRY_BENCHMARK_DAMAGE_MULTIPLIER = 0.82;
