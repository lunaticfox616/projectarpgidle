import { STORM, CAULDRON } from './gem-extension-values.mjs';
import { runeCenters } from './gem-extension-common.mjs';

export function runeStormRadius(env, c) { return STORM.radius + env.kit.grow(c.stats); }

export function runeLaunchStorm(env, state, c) { env.kit.launchFlask(state, c); c.index = 0; }

export function runeStepStorm(env, state, c, input) {
    if (!c.index) {
        const boltAt = Math.max(c.nextAt + env.kit.ms(c, STORM.charge), state.stormNext || 0);
        state.stormNext = boltAt + STORM.stagger;
        env.kit.visual(state, c, 'charge', c.nextAt, boltAt - c.nextAt + 40, { landingCell: env.kit.cell(c.aim), stormRadius: runeStormRadius(env, c) });
        c.index = 1; c.nextAt = boltAt;
        return [];
    }
    c.done = true;
    env.kit.visual(state, c, 'bolt', c.nextAt, 820, { landingCell: env.kit.cell(c.aim), stormRadius: runeStormRadius(env, c) });
    return [env.kit.contact(c, env.kit.area(input.enemies, c.aim, 'circle', runeStormRadius(env, c)), c.nextAt, { damagePct: STORM.pct })];
}

export function runeCauldronRadius(env, c) { return CAULDRON.radius + env.kit.grow(c.stats); }

export function runeLaunchCauldron(env, state, c) {
    const impact = c.at + env.kit.ms(c, CAULDRON.impact), pour = env.kit.ms(c, CAULDRON.pour), fall = env.kit.ms(c, CAULDRON.fall), every = env.kit.ms(c, CAULDRON.every);
    env.kit.letGo(c, impact, impact + env.kit.ms(c, CAULDRON.hold));
    c.index = 0; c.every = every; c.nextAt = impact + pour + fall;
    env.kit.visual(state, c, 'cauldron', impact, pour + fall + every * (CAULDRON.pcts.length - 1) + 1080, { landingCell: env.kit.cell(c.aim), cauldronRadius: runeCauldronRadius(env, c),
        cauldronPour: pour, cauldronFall: fall, cauldronEvery: every, cauldronHits: CAULDRON.pcts.length, cauldronDir: env.deps.random() < 0.5 ? 1 : -1 });
}

export function runeStepCauldron(env, state, c, input) {
    const hit = env.kit.area(input.enemies, c.aim, 'circle', runeCauldronRadius(env, c)), at = c.nextAt, index = c.index++;
    if (!index && hit.length) env.kit.visual(state, c, 'splash', at, 400, { targetCells: runeCenters(env, hit) });
    c.done = c.index >= CAULDRON.pcts.length;
    if (!c.done) c.nextAt += c.every;
    return hit.length ? [env.kit.contact(c, hit, at, { damagePct: CAULDRON.pcts[index], key: `${c.key}:${index}` })] : [];
}
