// One mark over a monster's head (2026-11-26 user: every attribute stood over the head; show only the strongest, the most dangerous
// or the one the fight needs). modules/rendering/battlefield-labels.mjs shows the attribute with the highest group, then the highest
// weight; a tie keeps the order of the trait line. Each row is [group, weight]:
//   3 react: a mechanic the player must answer (punishes standing in place, reflects hits, blocks or dulls hits, halves one kind of
//     damage, stops leech, drains the dive);
//   2 danger: raises the damage the hero takes (harder or faster hits, crits, piercing, slows, curses);
//   1 strength: makes the monster tougher (life, shields, resistances, armour, evasion).
// A part of the trait line that is none of these (a named special monster such as a severed wanderer) ranks 0 and shows only when
// nothing else does. The element is not ranked: the head never showed it (the target bar lists it). Keys are the attribute ids of
// their sources: hunt (data/hunt-traits.mjs), elite (data/bosses.mjs ENEMY_TRAIT_POOL), chaos (CHAOS_REALM_AFFIX_POOL in
// data/world-progression-definitions.mjs), cosmos (data/maps.mjs COSMOS_MECHANIC_DB).
const rows = table => Object.freeze(Object.fromEntries(Object.entries(table).map(([id, rank]) => [id, Object.freeze(rank)])));

export const ENEMY_MARK_RANKS = Object.freeze({
    hunt: rows({
        ring: [3, 9], lava: [3, 8], nova: [3, 7], thorns: [3, 6], bond: [3, 5],
        volley: [2, 6], hex: [2, 6], frost: [2, 3], leech: [2, 2],
        colossus: [1, 6], brood: [1, 1]
    }),
    elite: rows({
        bulwark: [3, 4], pressureCrush: [3, 3], oxygenLeech: [3, 3], duelist: [3, 2], accuracyWard: [3, 2], bloodless: [3, 2], leechResist: [3, 1],
        veryStrong: [2, 6], deadly: [2, 5], rapid: [2, 4], currentSwift: [2, 4], strong: [2, 3], veryFast: [2, 3], swiftHands: [2, 2],
        tenacious: [1, 3], fortified: [1, 3], physWard: [1, 2], fireWard: [1, 2], coldWard: [1, 2], lightWard: [1, 2], chaosWard: [1, 2]
    }),
    chaos: rows({
        projectile_dampening: [3, 3], spell_dampening: [3, 3], phys_dampening: [3, 3], bloodless: [3, 2], curse_immune: [3, 1],
        curse_blade: [2, 5], deadly_crit: [2, 5], multi_strike: [2, 4], deep_penetration: [2, 4], blood_drinker: [2, 2],
        soul_shell: [1, 5], elemental_wall: [1, 4], iron_bark: [1, 4], mirage_step: [1, 4]
    }),
    cosmos: rows({
        critResist: [3, 3], comboGuard: [3, 3],
        heavySlow: [2, 5], fast: [2, 4],
        energyShield: [1, 5], critDamageResist: [1, 4], armor: [1, 4], evasion: [1, 4]
    })
});
