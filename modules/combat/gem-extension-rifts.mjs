import { RIFT, ISSEN } from './gem-extension-values.mjs';
import { runeFaceTo, runeFoeOf, runeLive, runeDue, runeSettle, runeByNear, runeCenters } from './gem-extension-common.mjs';

/** 틈의 칸: 가운데 줄(column), 반폭(half), 끌어당기는 반폭(band), 주인공 줄(row). g는 효과 확장. */
export function runeRiftShape(g, source, face) {
    const half = RIFT.half + RIFT.grow * g / 2;
    return { column: source.gx + face * RIFT.middle, half, band: half + RIFT.pull + RIFT.grow * g, row: source.gy };
}

export function runeInBand(env, e, s, width) { return env.deps.getGridUnitCells(e).some(p => Math.abs(p.gx - s.column) <= width && Math.abs(p.gy - s.row) <= RIFT.depth); }

export function runeRiftTargets(env, id, source, foes, extra) {
    const shapes = [-1, 1].map(face => runeRiftShape(extra, source, face));
    return foes.filter(e => shapes.some(s => runeInBand(env, e, s, s.band)));
}

export function runeLaunchRift(env, state, c, enemies) {
    const face = runeFaceTo(env, c, runeFoeOf(c, enemies)), impact = c.at + env.kit.ms(c, RIFT.impact);
    c.shape = runeRiftShape(env.kit.grow(c.stats), c.source, face);
    env.kit.letGo(c, impact, impact + env.kit.ms(c, RIFT.hold));
    c.queue = [{ at: impact, kind: 'cut' }, { at: impact + env.kit.ms(c, RIFT.pullAt), kind: 'pull' }, { at: impact + env.kit.ms(c, RIFT.close), kind: 'collapse' }];
    c.nextAt = impact;
    env.kit.visual(state, c, 'rift', impact, env.kit.ms(c, RIFT.close) + 220, { riftColumn: c.shape.column, riftHalf: c.shape.half, riftTop: c.shape.row - RIFT.depth,
        riftBottom: c.shape.row + RIFT.depth, riftClose: env.kit.ms(c, RIFT.close), riftFace: face });
}

export function runeRiftRow(env, state, c, row, foes) {
    const s = c.shape, onLine = foes.filter(e => runeInBand(env, e, s, s.half));
    if (row.kind === 'pull') {
        const pulled = foes.filter(e => runeInBand(env, e, s, s.band) && !onLine.includes(e));
        return pulled.length ? [{ type: 'pull', targets: pulled.map(e => e.id), at: row.at, column: s.column, cells: Math.ceil(s.band - s.half) }] : [];
    }
    if (row.kind === 'collapse') env.kit.visual(state, c, 'collapse', row.at, 420, { riftColumn: s.column, riftTop: s.row - RIFT.depth, riftBottom: s.row + RIFT.depth });
    return onLine.length ? [env.kit.contact(c, onLine, row.at, { damagePct: row.kind === 'collapse' ? RIFT.pct : 100, key: `${c.key}:${row.kind}` })] : [];
}

export function runeStepRift(env, state, c, input) {
    const foes = runeLive(input.enemies), commands = [];
    for (const row of runeDue(c, input.now)) commands.push(...runeRiftRow(env, state, c, row, foes));
    runeSettle(c);
    return commands;
}

export function runeIssenBand(env, source, depth) { return e => env.deps.getGridUnitCells(e).some(p => Math.abs(p.gy - source.gy) <= depth && Math.abs(p.gx - source.gx) <= ISSEN.reach); }

export function runeIssenDepth(extra) { return ISSEN.depth + ISSEN.grow * extra; }

export function runeIssenTargets(env, id, source, foes, extra) { return foes.filter(runeIssenBand(env, source, runeIssenDepth(extra))); }

export function runeLaunchIssen(env, state, c, enemies) {
    const face = runeFaceTo(env, c, runeFoeOf(c, enemies)), impact = c.at + env.kit.ms(c, ISSEN.impact), delay = env.kit.ms(c, ISSEN.delay);
    c.depth = runeIssenDepth(env.kit.grow(c.stats)); c.face = face;
    env.kit.letGo(c, impact, impact + env.kit.ms(c, ISSEN.hold));
    c.nextAt = impact + delay;
    env.kit.visual(state, c, 'line', impact, delay + 260, { issenRow: c.source.gy, issenDepth: c.depth, issenDelay: delay, issenFace: face, issenReach: ISSEN.reach });
}

export function runeStepIssen(env, state, c, input) {
    const hit = runeLive(input.enemies).filter(runeIssenBand(env, c.source, c.depth)).sort(runeByNear(env, c.source));
    c.done = true;
    if (!hit.length) return [];
    env.kit.visual(state, c, 'cut', c.nextAt, 400, { targetCells: runeCenters(env, hit.slice(0, ISSEN.cuts)), issenFace: c.face });
    return [env.kit.contact(c, hit, c.nextAt)];
}
