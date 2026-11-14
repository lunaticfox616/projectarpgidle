export const COSMOS_TRAIT_ARCHETYPES = /* @__PURE__ */ Object.freeze({
    critResist: (trait, c) => {
        trait.name = c.name;
        trait.critResistPct = Math.floor((c.isBoss ? 42 : 26) * c.power);
        trait.critDamageResistPct = Math.floor((c.isBoss ? 38 : 22) * c.power);
    },
    critDamageResist: (trait, c) => {
        trait.name = c.name;
        trait.critDamageResistPct = Math.floor((c.isBoss ? 58 : 36) * c.power);
        trait.dr = Math.floor((c.isBoss ? 10 : 6) * c.power);
        trait.armorMul = 1 + (c.isBoss ? 0.85 : 0.55) * c.power;
    },
    comboGuard: (trait, c) => {
        trait.name = c.name;
        trait.hitRateGuard = Math.min(0.28, (c.isBoss ? 0.12 : 0.08) * c.power);
        trait.comboTakenLessPct = Math.min(70, Math.floor((c.isBoss ? 38 : 24) * c.power));
    },
    heavySlow: (trait, c) => {
        trait.name = c.name;
        trait.atkMul = 1 + (c.isBoss ? 0.62 : 0.38) * c.power;
        trait.damageMul = 1 + (c.isBoss ? 0.28 : 0.16) * c.power;
        trait.attackSpeedVarMul = Math.max(0.42, 1 - (c.isBoss ? 0.32 : 0.22) * c.power);
        trait.penetration = Math.floor((c.isBoss ? 8 : 4) * c.power);
    },
    fast: (trait, c) => {
        trait.name = c.name;
        trait.attackSpeedVarMul = 1 + (c.isBoss ? 0.55 : 0.34) * c.power;
        trait.critChanceBonus = Math.floor((c.isBoss ? 12 : 7) * c.power);
        trait.evasionChance = Math.floor((c.isBoss ? 18 : 10) * c.power);
    },
    energyShield: (trait, c) => {
        const esPct = Math.min(100, Math.max(50, Math.floor(50 + ((Math.abs(c.seed || 0) % 51)) + (c.isBoss ? 18 : 0))));
        trait.name = `${c.name} ${esPct}%`;
        trait.energyShieldPct = esPct;
        trait.resAll = Math.floor((c.isBoss ? 8 : 4) * c.power);
    },
    evasion: (trait, c) => {
        trait.name = c.name;
        trait.evasionMul = 1 + (c.isBoss ? 1.65 : 1.05) * c.power;
        trait.evasionChance = Math.min(72, Math.floor((c.isBoss ? 42 : 28) * c.power));
    },
    armor: (trait, c) => {
        trait.name = c.name;
        trait.armorMul = 1 + (c.isBoss ? 2.2 : 1.35) * c.power;
        trait.armorGuard = Math.min(0.72, (c.isBoss ? 0.36 : 0.24) * c.power);
        trait.dr = Math.floor((c.isBoss ? 14 : 8) * c.power);
    }
});

export const COSMOS_BOSS_DEBUFF_SETS = /* @__PURE__ */ Object.freeze({
    critResist: ['cosmos_res_down', 'cosmos_aspd_down'],
    critDamageResist: ['cosmos_regen_down', 'cosmos_res_down'],
    comboGuard: ['cosmos_aspd_down', 'cosmos_leech_down'],
    heavySlow: ['cosmos_res_down', 'cosmos_regen_down'],
    fast: ['cosmos_aspd_down', 'cosmos_leech_down'],
    energyShield: ['cosmos_regen_down', 'cosmos_leech_down'],
    evasion: ['cosmos_aspd_down', 'cosmos_res_down'],
    armor: ['cosmos_leech_down', 'cosmos_regen_down']
});

export const METEOR_CORE_GUARD = /* @__PURE__ */ Object.freeze({ fire: 'resF', cold: 'resC', light: 'resL', chaos: 'resChaos', phys: 'dr' });
