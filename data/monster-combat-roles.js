/** Species fighting roles. Distances are grid cells, stepSec is seconds and castMs/flightMs are milliseconds.
 * These change movement and delivery only: damage, life, rewards and boss/content tuning keep their owners.
 * Saves keep valid profiles unless a visual's melee/ranged kind changed (the existing migration resets those profiles).
 * Movement reads the same species rule as the drawn stride.
 */
const MONSTER_COMBAT_ROLES = (() => {
    const profiles = Object.freeze({
        pursuer: Object.freeze({ stepSec: 0.4, range: 1, delivery: 'instantTarget', castMs: 0 }),
        frontline: Object.freeze({ stepSec: 0.6, range: 2, delivery: 'instantTarget', castMs: 0 }),
        heavy: Object.freeze({ stepSec: 0.6, range: 1, delivery: 'instantTarget', castMs: 0 }),
        marksman: Object.freeze({ stepSec: 0.5, range: 4, delivery: 'projectileCell', castMs: 450 }),
        piercer: Object.freeze({ stepSec: 0.5, range: 5, delivery: 'projectileCell', castMs: 450, eliteCastMs: 900, toEdge: true }),
        bombardier: Object.freeze({ stepSec: 0.6, range: 4, delivery: 'magicCell', castMs: 650, flightMs: 900,
            special: true, label: '집중 포격' }),
        hiveMarksman: Object.freeze({ range: 3, delivery: 'projectileCell', castMs: 450 }),
        hiveBombardier: Object.freeze({ range: 3, delivery: 'magicCell', castMs: 650, flightMs: 900,
            special: true, label: '꿀주머니 투척' }),
        oceanCarrier: Object.freeze({ stepSec: 0.7, range: 1, delivery: 'instantTarget', castMs: 0 }),
        oceanOracle: Object.freeze({ stepSec: 0.6, range: 4, delivery: 'magicCell', castMs: 650, flightMs: 900,
            special: true, label: '수압 응집' }),
        riftArchiveMoth: Object.freeze({ stepSec: 0.6, range: 4, delivery: 'magicCell', castMs: 650, flightMs: 900,
            special: true, label: '기록 파열' })
    });
    const byVisual = Object.freeze(Object.fromEntries([
        ['pursuer', ['act1-ant', 'act3-ant', 'act4-ant', 'act5-ant', 'act7-crackback-tick', 'act7-husk-stag', 'atlas-canopy-leafglider', 'root-scimitar']],
        ['frontline', ['act1-worm', 'act3-worm', 'act4-worm', 'act5-worm', 'deacon-act2-melee', 'deacon-act6-melee', 'deacon-act7-melee', 'deacon-act8-melee', 'act10-graft-beast', 'root-greatsword']],
        ['heavy', ['act1-slime', 'act3-slime', 'act4-slime', 'act5-slime', 'atlas-garden-bonsai-snail']],
        ['marksman', ['act8-veil-moth', 'act9-dirge-crane', 'deacon-act6-ranged', 'deacon-act7-ranged', 'root-shortbow']],
        ['piercer', ['deacon-act2-ranged', 'deacon-act8-ranged']],
        ['bombardier', ['act9-chorus-bulbs', 'postchaos-inverted-sapling', 'root-orb', 'root-flask']]
    ].flatMap(([role, ids]) => ids.map(id => [id, role]))));
    const byRealm = Object.freeze({
        hive: Object.freeze({ 'hive-scout': 'hiveMarksman', 'hive-nurse': 'hiveBombardier' }),
        sky: Object.freeze({ 'sky-harpy': 'pursuer' }),
        cosmos: Object.freeze({ 'cosmos-star': 'pursuer', 'cosmos-ooze': 'heavy' }),
        riftPast: Object.freeze({ 'rift-oath-warden': 'frontline', 'rift-seed-lantern': 'marksman' }),
        riftFuture: Object.freeze({ 'rift-ashen-hound': 'pursuer', 'rift-seed-lantern': 'marksman',
            'rift-archive-moth': 'riftArchiveMoth' }),
        underworld: Object.freeze({ 'underworld-hound': 'pursuer', 'underworld-beetle': 'heavy',
            'underworld-obsidian-centipede': 'frontline' }),
        ocean: Object.freeze({ 'ocean-angler': 'pursuer', 'ocean-crab': 'frontline',
            'ocean-shell': 'oceanCarrier', 'ocean-oracle': 'oceanOracle' })
    });
    /** Optional nests use egg-bearing creatures, even in courts whose ordinary pool contains only deacons.
     * Nest rows are the two waves of three; ambush rows include the optional fifth member. Rare rolls still take precedence. */
    const burrow = act => [[`act${act}-worm`, `act${act}-worm`, `act${act}-ant`], [`act${act}-worm`, `act${act}-ant`, `act${act}-ant`]];
    const bugs = act => ({ nest: burrow(act), ambush: [`act${act}-worm`, `act${act}-ant`, `act${act}-ant`, `act${act}-slime`, `act${act}-ant`] });
    const objectEncounters = Object.freeze(Object.fromEntries(Object.entries({
        1: bugs(1),
        2: { nest: burrow(1), ambush: ['deacon-act2-melee', 'deacon-act2-melee', 'deacon-act2-ranged', 'deacon-act2-ranged', 'deacon-act2-melee'] },
        3: bugs(3), 4: bugs(4), 5: bugs(5),
        6: { nest: burrow(5), ambush: ['deacon-act6-melee', 'deacon-act6-melee', 'deacon-act6-ranged', 'act7-husk-stag', 'act7-husk-stag'] },
        7: { nest: [['act5-worm', 'act5-worm', 'act7-crackback-tick'], ['act5-worm', 'act7-crackback-tick', 'act7-crackback-tick']],
            ambush: ['deacon-act7-melee', 'act7-crackback-tick', 'act7-crackback-tick', 'deacon-act7-ranged', 'act7-crackback-tick'] },
        8: { nest: [['act7-crackback-tick', 'act7-crackback-tick', 'act8-veil-moth'], ['act7-crackback-tick', 'act8-veil-moth', 'act8-veil-moth']],
            ambush: ['deacon-act8-melee', 'act8-shroud-toad', 'act8-veil-moth', 'act8-veil-moth', 'act8-shroud-toad'] },
        9: { nest: [['act3-worm', 'act3-worm', 'act8-veil-moth'], ['act7-crackback-tick', 'act7-crackback-tick', 'act8-veil-moth']],
            ambush: ['deacon-act8-melee', 'deacon-act8-melee', 'act9-dirge-crane', 'act9-chorus-bulbs', 'deacon-act8-melee'] },
        10: { nest: [['act5-worm', 'act5-worm', 'act8-veil-moth'], ['act7-crackback-tick', 'act8-veil-moth', 'act8-veil-moth']],
            ambush: ['act10-graft-beast', 'act10-graft-beast', 'act10-graft-beast', 'act9-chorus-bulbs', 'act10-graft-beast'] }
    }).map(([act, row]) => [act, Object.freeze({ nest: Object.freeze(row.nest.map(wave => Object.freeze(wave))), ambush: Object.freeze(row.ambush) })])));
    /** Realm opt-ins are explicit: colony/atlas bees and bosses keep their own attacks and movement. */
    function of(enemy) {
        if (!enemy || enemy.isBoss || enemy.isSeveredWanderer) return null;
        const visual = enemy.spriteVariantId || enemy.monsterVisualId;
        const roles = enemy.monsterVisualSetId ? byRealm[enemy.monsterVisualSetId] : byVisual;
        return profiles[roles?.[visual]] || null;
    }
    /** Existing enemy attack fields only; applying this after a picture change never multiplies stats. */
    function profile(enemy) {
        const role = of(enemy);
        if (!role) return null;
        return { attackRange: role.range, attackDelivery: role.delivery, projectileToEdge: !!role.toEdge,
            attackCastMs: enemy.isElite && role.eliteCastMs || role.castMs, attackCastSpecial: !!role.special,
            attackLabel: role.label || (role.toEdge ? '관통 사격' : '') };
    }
    return Object.freeze({ profiles, byVisual, objectEncounters, of, profile });
})();
safeExposeData({ MONSTER_COMBAT_ROLES });
