import { VOID } from './gem-extension-values.mjs';
import { runeWithin, runeByNear, runeLive, runeDue, runeSettle } from './gem-extension-common.mjs';

export function runeVoidRadius(extra) { return VOID.radius + extra; }

export function runeVoidTargets(env, id, source, foes, extra) { return foes.filter(e => runeWithin(env, e, source, runeVoidRadius(extra))); }

export function runeLaunchVoid(env, state, c) {
    const impact = c.at + env.kit.ms(c, VOID.impact);
    env.kit.letGo(c, impact, impact + env.kit.ms(c, VOID.hold));
    c.queue = [{ at: impact, kind: 'shout' }];
    c.nextAt = impact;
}

export function runeVoidShout(env, state, c, row, foes) {
    const radius = runeVoidRadius(env.kit.grow(c.stats)), list = foes.filter(e => runeWithin(env, e, c.source, radius)).sort(runeByNear(env, c.source)), spot = env.kit.cell(c.source);
    env.kit.visual(state, c, 'pull', row.at, 420, { voidCenter: spot, voidRadius: radius });
    list.forEach((foe, i) => {
        env.kit.visual(state, c, 'spirit', row.at + env.kit.ms(c, VOID.spirit + i * VOID.gap), VOID.fly, { sourceCell: spot, landingCell: env.deps.getGridUnitCenter(foe), targetCells: [env.deps.getGridUnitCenter(foe)], spiritIndex: i });
        c.queue.push({ at: row.at + env.kit.ms(c, VOID.hit + i * VOID.gap), kind: 'possess', id: foe.id, index: i });
    });
    const far = list.filter(e => env.deps.getGridUnitDistance(c.source, e) > 1);
    return far.length ? [{ type: 'pull', targets: far.map(e => e.id), at: row.at, center: spot, cells: VOID.pullCells }] : [];
}

/** 약화된 적의 표시: 한 사건에 모아 시간만 새로 한다(신성한 안개의 markMistTargets와 같은 길). */
export function runeMarkWeak(env, state, c, foe, at) {
    const open = state.voidWeak && at < state.voidWeak.at + state.voidWeak.duration;
    if (!open) state.voidWeak = env.kit.visual(state, c, 'weak', at, VOID.weak, { voidTargets: [] });
    const rows = new Map(state.voidWeak.voidTargets.filter(row => row.expiresAt > at).map(row => [row.id, row]));
    rows.set(foe.id, { id: foe.id, appliedAt: rows.get(foe.id)?.appliedAt ?? at, expiresAt: at + VOID.weak });
    state.voidWeak.voidTargets = [...rows.values()];
    state.voidWeak.duration = at + VOID.weak - state.voidWeak.at;
}

export function runeVoidPossess(env, state, c, row, foes) {
    const foe = foes.find(e => e.id === row.id);
    if (!foe) return [];
    runeMarkWeak(env, state, c, foe, row.at);
    return [env.kit.contact(c, [foe], row.at, { key: `${c.key}:${row.index}` }), { type: 'weaken', targets: [foe.id], at: row.at, ms: VOID.weak }];
}

export function runeStepVoid(env, state, c, input) {
    const foes = runeLive(input.enemies), commands = [];
    for (const row of runeDue(c, input.now)) commands.push(...(row.kind === 'shout' ? runeVoidShout(env, state, c, row, foes) : runeVoidPossess(env, state, c, row, foes)));
    runeSettle(c);
    return commands;
}
