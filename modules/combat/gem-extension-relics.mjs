import { BELL, CHANDELIER, GAVEL } from './gem-extension-values.mjs';
import { runeWithin, runeLive, runeDue, runeSettle, runeFaceTo, runeFoeOf, runeCenters, runeByNear } from './gem-extension-common.mjs';

export function runeBellRadius(env, c) { return BELL.radius + env.kit.grow(c.stats); }

export function runeLaunchBell(env, state, c) {
    const impact = c.at + env.kit.ms(c, BELL.impact), tolls = BELL.tolls.map(t => env.kit.ms(c, t)), wave = env.kit.ms(c, BELL.wave);
    env.kit.letGo(c, impact, impact + env.kit.ms(c, BELL.hold));
    c.wave = wave;
    c.queue = tolls.map((t, i) => ({ at: impact + t, kind: 'toll', index: i }));
    c.nextAt = c.queue[0].at;
    env.kit.visual(state, c, 'bell', impact, tolls[tolls.length - 1] + wave + 520, { landingCell: env.kit.cell(c.aim), bellRadius: runeBellRadius(env, c), bellDrop: env.kit.ms(c, BELL.drop),
        bellTolls: tolls, bellWave: wave });
}

export function runeBellToll(env, state, c, row, foes) {
    const radius = runeBellRadius(env, c);
    for (const foe of foes.filter(e => runeWithin(env, e, c.aim, radius))) {
        const d = Math.min(1, env.kit.distance(env.deps.getGridUnitCenter(foe), c.aim) / radius), mul = 1 - (1 - BELL.least / 100) * d;
        c.queue.push({ at: row.at + Math.round(d * c.wave), kind: 'hit', id: foe.id, pct: BELL.pcts[row.index] * mul, index: row.index });
    }
    return state.visuals === false ? [] : [{ type: 'bellToll' }];
}

export function runeBellHit(env, c, row, foes) {
    const foe = foes.find(e => e.id === row.id);
    return foe ? [env.kit.contact(c, [foe], row.at, { damagePct: row.pct, key: `${c.key}:${row.index}` })] : [];
}

export function runeStepBell(env, state, c, input) {
    const foes = runeLive(input.enemies), commands = [];
    for (const row of runeDue(c, input.now)) commands.push(...(row.kind === 'toll' ? runeBellToll(env, state, c, row, foes) : runeBellHit(env, c, row, foes)));
    runeSettle(c);
    return commands;
}

export function runeChandRadius(env, c) { return CHANDELIER.radius + env.kit.grow(c.stats); }

export function runeLaunchChandelier(env, state, c, enemies) {
    const mage = env.deps.getHeroAppearanceId() === 'occultist', impact = c.at + env.kit.ms(c, mage ? CHANDELIER.mageContact : CHANDELIER.contact);
    const hang = env.kit.ms(c, CHANDELIER.hang), fall = env.kit.ms(c, CHANDELIER.fall);
    env.kit.letGo(c, impact, impact + env.kit.ms(c, CHANDELIER.hold));
    c.swing.contactFrame = mage ? CHANDELIER.mageFrame : CHANDELIER.frame;
    c.index = 0; c.nextAt = impact + hang + fall;
    env.kit.visual(state, c, 'chandelier', impact, hang + fall + 1100, { landingCell: env.kit.cell(c.aim), chandRadius: runeChandRadius(env, c), chandHang: hang, chandFall: fall,
        chandFace: runeFaceTo(env, c, runeFoeOf(c, enemies)) });
}

export function runeStepChandelier(env, state, c, input) {
    if (!c.index) {
        const hit = env.kit.area(input.enemies, c.aim, 'circle', runeChandRadius(env, c)), at = c.nextAt;
        c.struck = hit.map(e => e.id); c.index = 1; c.nextAt = at + env.kit.ms(c, CHANDELIER.fireLag); c.done = !hit.length;
        return hit.length ? [env.kit.contact(c, hit, at, { damagePct: CHANDELIER.pct, key: `${c.key}:phys` })] : [];
    }
    c.done = true;
    const burn = runeLive(input.enemies).filter(e => c.struck.includes(e.id));
    if (!burn.length) return [];
    env.kit.visual(state, c, 'burn', c.nextAt, 360, { targetCells: runeCenters(env, burn) });
    return [env.kit.contact(c, burn, c.nextAt, { damagePct: CHANDELIER.pct, key: `${c.key}:fire`, attackOptions: { ...c.attackOptions, forcedElement: 'fire' } })];
}

export function runeGavelDepth(extra) { return GAVEL.depth + GAVEL.grow * extra; }

export function runeGavelBox(env, source, face, depth) { return e => env.deps.getGridUnitCells(e).some(p => {
    const ahead = (p.gx - source.gx) * face;
    return ahead >= GAVEL.near && ahead <= GAVEL.far && Math.abs(p.gy - source.gy) <= depth;
}); }

export function runeGavelTargets(env, id, source, foes, extra) { return foes.filter(e => [-1, 1].some(face => runeGavelBox(env, source, face, runeGavelDepth(extra))(e))); }

export function runeGavelCells(source, face, depth) {
    const out = [], rows = Math.floor(depth);
    for (let ahead = Math.ceil(GAVEL.near); ahead < GAVEL.far; ahead++) for (let dy = -rows; dy <= rows; dy++) out.push({ gx: source.gx + face * ahead, gy: source.gy + dy });
    return out;
}

export function runeLaunchGavel(env, state, c, enemies) {
    const face = runeFaceTo(env, c, runeFoeOf(c, enemies)), impact = c.at + env.kit.ms(c, GAVEL.impact), windup = env.kit.ms(c, GAVEL.windup), swing = env.kit.ms(c, GAVEL.swing);
    c.face = face; c.depth = runeGavelDepth(env.kit.grow(c.stats));
    env.kit.letGo(c, impact, impact + env.kit.ms(c, GAVEL.hold));
    c.queue = [{ at: impact + windup + swing, kind: 'slam' }];
    c.nextAt = c.queue[0].at;
    env.kit.visual(state, c, 'gavel', impact, windup + swing + 820, { gavelFace: face, gavelLength: GAVEL.length, gavelWindup: windup, gavelSwing: swing,
        gavelDepth: c.depth, gavelCells: runeGavelCells(c.source, face, c.depth) });
}

export function runeGavelRow(env, state, c, row, foes) {
    if (row.kind === 'slam') {
        const hit = foes.filter(runeGavelBox(env, c.source, c.face, c.depth)).sort(runeByNear(env, c.source)), start = row.at + env.kit.ms(c, GAVEL.verdict.delay);
        hit.forEach((foe, i) => c.queue.push({ at: start + env.kit.ms(c, GAVEL.verdict.gap * i), kind: 'bolt', id: foe.id, index: i }));
        return hit.length ? [env.kit.contact(c, hit, row.at, { damagePct: GAVEL.pct, key: `${c.key}:slam` })] : [];
    }
    const foe = foes.find(e => e.id === row.id);
    if (!foe) return [];
    if (row.kind === 'bolt') {
        env.kit.visual(state, c, 'verdict', row.at, 400, { targetCells: [env.deps.getGridUnitCenter(foe)], landingCell: env.deps.getGridUnitCenter(foe) });
        c.queue.push({ ...row, at: row.at + env.kit.ms(c, GAVEL.verdict.lag), kind: 'guilty' });
        return [];
    }
    return [env.kit.contact(c, [foe], row.at, { damagePct: GAVEL.verdict.pct, key: `${c.key}:v${row.index}` })];
}

export function runeStepGavel(env, state, c, input) {
    const foes = runeLive(input.enemies), commands = [];
    for (const row of runeDue(c, input.now)) commands.push(...runeGavelRow(env, state, c, row, foes));
    runeSettle(c);
    return commands;
}
