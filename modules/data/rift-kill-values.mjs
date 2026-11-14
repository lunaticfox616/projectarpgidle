export const GRAND_BREACH_BASE_ROLE = /* @__PURE__ */ Object.freeze({ hp: 1, speed: 1, damage: 1, penetration: 0, chaosRes: 0, ailment: 0 });

export const GRAND_BREACH_ROLE_TUNING = /* @__PURE__ */ Object.freeze({
    'breach-scout': /* @__PURE__ */ Object.freeze({ ...GRAND_BREACH_BASE_ROLE, hp: 0.82, speed: 1.22 }),
    'breach-reflux': /* @__PURE__ */ Object.freeze({ ...GRAND_BREACH_BASE_ROLE, damage: 1.15, penetration: 4 }),
    'breach-veil': /* @__PURE__ */ Object.freeze({ ...GRAND_BREACH_BASE_ROLE, hp: 1.25, chaosRes: 12 }),
    'breach-venom': /* @__PURE__ */ Object.freeze({ ...GRAND_BREACH_BASE_ROLE, hp: 1.2, ailment: 0.12 })
});
