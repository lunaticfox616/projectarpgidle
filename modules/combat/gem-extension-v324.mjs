// 2026-11-27 V3.24 시뮬레이터의 93 불의 세례(리메이크 V3.15.3), 94 독사의 춤(리메이크 V3.16.7), 95 강림(11-13 사용자 결정)의 판정. 그림은 무대가 그린다
// (modules/rendering/stage-fire-baptism.mjs, stage-viper-dance.mjs, stage-descent.mjs). 수치는 modules/combat/gem-extension-values.mjs PENDULUM, VIPER, DESCENT.
import { PENDULUM, VIPER, DESCENT, TAU } from './gem-extension-values.mjs';
import { runeLive, runeWithin, runeDue, runeSettle, runeFaceTo, runeFoeOf } from './gem-extension-common.mjs';
import { REPEAT_GAP_MS } from '../domain/support-attack.mjs';
import { DAMAGE_AILMENT_DPS_SHARE } from '../domain/ailment-dot-damage.mjs';

/** 불의 세례의 줄: 주인공 줄 위아래 depth칸(효과 확장 1마다 grow칸 더), 앞뒤 reach칸. */
export function runeBaptismDepth(extra) { return PENDULUM.depth + PENDULUM.grow * extra; }

export function runeBaptismIn(env, source, depth) {
    return e => env.deps.getGridUnitCells(e).some(p => Math.abs(p.gy - source.gy) <= depth && Math.abs(p.gx - source.gx) <= PENDULUM.reach);
}

export function runeBaptismTargets(env, id, source, foes, extra) { return foes.filter(runeBaptismIn(env, source, runeBaptismDepth(extra))); }

/** 대향로가 그 적(몸 가운데)을 지나는 때(ms, 가로지르기 시작에서). 향로의 가로 자리 -face × swing × cos(πu)를 거꾸로 푼다(시뮬레이터 doPendulum):
 * 등 뒤 끝은 바로, 시전한 자리는 반쯤, 앞 끝은 마지막에 지난다. swing칸보다 먼 적은 끝에서 맞는다. */
export function runeBaptismPassMs(env, source, foe, face, sweep) {
    const along = Math.max(-1, Math.min(1, face * (env.deps.getGridUnitCenter(foe).gx - source.gx) / PENDULUM.swing));
    return Math.round(sweep * Math.acos(-along) / Math.PI);
}

/** 그 줄의 칸(소품을 깨는 칸, modules/combat/gem-cast-common.mjs gemContactCells). */
export function runeBaptismCells(c) {
    const cells = [], depth = Math.floor(c.depth || PENDULUM.depth);
    for (let dy = -depth; dy <= depth; dy++) for (let dx = -PENDULUM.reach; dx <= PENDULUM.reach; dx++) cells.push({ gx: c.source.gx + dx, gy: c.source.gy + dy });
    return cells;
}

/** 불의 세례: 향로의 단타가 놓이면 천장에 매단 대향로가 줄을 한 번 가로지른다. 들어오는 쪽은 같은 전투의 주 시전마다 바뀐다(첫 시전은 등 뒤에서 앞으로).
 * 이중 발동이 붙으면 둘째 향로가 반대쪽에서 다시 가로지른다(REPEAT_GAP_MS 뒤, 둘째 피해 몫). 반복은 이 판정이 맡는다(contact ownRepeat). */
export function runeLaunchBaptism(env, state, c, enemies) {
    const impact = c.at + env.kit.ms(c, PENDULUM.release), repeat = c.stats.sSkill.supportEffects?.repeat;
    const face = state.baptismFace ? -state.baptismFace : runeFaceTo(env, c, runeFoeOf(c, enemies));
    state.baptismFace = face;
    env.kit.letGo(c, impact, impact + env.kit.ms(c, PENDULUM.hold));
    c.depth = runeBaptismDepth(env.kit.grow(c.stats));
    c.queue = [{ at: impact, kind: 'pass', face, pct: PENDULUM.pct }];
    if (repeat) {
        c.queue.push({ at: impact + REPEAT_GAP_MS, kind: 'pass', face: -face, pct: PENDULUM.pct * repeat.damagePct / 100 });
    }
    runeSettle(c);
}

/** 한 번 가로지르기: 향로의 그림 사건을 걸고, 그때 줄에 선 적마다 지나는 때를 줄 세운다. */
export function runeBaptismPass(env, state, c, row, foes) {
    const wind = env.kit.ms(c, PENDULUM.wind), sweep = env.kit.ms(c, PENDULUM.sweep);
    env.kit.visual(state, c, 'swing', row.at, wind + sweep + PENDULUM.smoke, { landingCell: env.kit.cell(c.source), pendulumFace: row.face, pendulumWind: wind,
        pendulumSweep: sweep, pendulumSwing: PENDULUM.swing, pendulumDepth: c.depth });
    for (const foe of foes.filter(runeBaptismIn(env, c.source, c.depth))) {
        c.queue.push({ at: row.at + wind + runeBaptismPassMs(env, c.source, foe, row.face, sweep), kind: 'hit', id: foe.id, face: row.face, pct: row.pct });
    }
    return [];
}

/** 지나는 순간: 화염 피해 한 번, 그리고 지나가는 쪽으로 밀어낸다(보스와 굳은 적은 밀리지 않는다). */
export function runeBaptismHit(env, state, c, row, foes) {
    const foe = foes.find(e => e.id === row.id);
    if (!foe) return [];
    env.kit.visual(state, c, 'flame', row.at, 320, { targetCells: [env.deps.getGridUnitCenter(foe)], pendulumFace: row.face });
    return [env.kit.contact(c, [foe], row.at, { damagePct: row.pct, key: `${c.key}:${row.face}:${foe.id}`, ownRepeat: true }),
        { type: 'shove', targets: [foe.id], at: row.at, face: row.face, cells: PENDULUM.push }];
}

export function runeStepBaptism(env, state, c, input) {
    const foes = runeLive(input.enemies), commands = [];
    for (const row of runeDue(c, input.now)) commands.push(...(row.kind === 'pass' ? runeBaptismPass(env, state, c, row, foes) : runeBaptismHit(env, state, c, row, foes)));
    runeSettle(c);
    return commands;
}

/** 출혈, 중독 한 줄: 전달본의 몫 × 횟수를 길이(횟수 × 간격) 동안 다 주도록 원천 피해(타격 기본 피해의 %)를 거꾸로 잰다. */
const viperDot = (type, element, rule) => Object.freeze({ type, element, seconds: rule.hits * rule.every / 1000,
    sourcePct: rule.pct * rule.hits / (DAMAGE_AILMENT_DPS_SHARE * rule.hits * rule.every / 1000) });
export const VIPER_DOTS = Object.freeze([viperDot('bleed', 'phys', VIPER.bleed), viperDot('poison', 'chaos', VIPER.poison)]);

export function runeViperRadius(env, c) { return VIPER.radius + env.kit.grow(c.stats); }

export function runeViperTargets(env, id, source, foes, extra) { return foes.filter(e => runeWithin(env, e, source, VIPER.radius + extra)); }

/** 칼날이 그 적을 지나는 몫(0~1): 앞(0)에서 시작해 아래, 뒤, 위로 돈다(시뮬레이터 doViper, 타원은 칸으로 재면 원이다). */
export function runeViperTurn(env, source, foe, face) {
    const p = env.deps.getGridUnitCenter(foe), angle = Math.atan2(p.gy - source.gy, face * (p.gx - source.gx));
    return (angle < 0 ? angle + TAU : angle) / TAU;
}

/** 독사의 춤: 제자리에서 돌며 칼날을 펼쳐(spread) 둘레를 한 바퀴(spin) 훑는다. 이중 발동의 둘째 피해(REPEAT_GAP_MS 뒤)에 맞춰 한 바퀴를 더 그린다. */
export function runeLaunchViper(env, state, c, enemies) {
    const impact = c.at + env.kit.ms(c, VIPER.release), spread = env.kit.ms(c, VIPER.spread), act = env.kit.ms(c, VIPER.act);
    c.face = runeFaceTo(env, c, runeFoeOf(c, enemies)); c.radius = runeViperRadius(env, c);
    env.kit.letGo(c, impact, impact + act);
    const look = { landingCell: env.kit.cell(c.source), viperFace: c.face, viperRadius: c.radius, viperSpread: spread, viperSpin: env.kit.ms(c, VIPER.spin), viperAct: act };
    env.kit.visual(state, c, 'swirl', impact, act + VIPER.linger, look);
    if (c.stats.sSkill.supportEffects?.repeat) env.kit.visual(state, c, 'swirl', impact + REPEAT_GAP_MS, act + VIPER.linger, look);
    c.queue = [{ at: impact + spread, kind: 'open' }];
    runeSettle(c);
}

export function runeViperRow(env, state, c, row, foes) {
    if (row.kind === 'open') {
        const spin = env.kit.ms(c, VIPER.spin);
        for (const foe of foes.filter(e => runeWithin(env, e, c.source, c.radius))) c.queue.push({ at: row.at + Math.round(spin * runeViperTurn(env, c.source, foe, c.face)), kind: 'cut', id: foe.id });
        return [];
    }
    const foe = foes.find(e => e.id === row.id);
    if (!foe) return [];
    const spot = env.deps.getGridUnitCenter(foe);
    env.kit.visual(state, c, 'bite', row.at, 360, { targetCells: [spot], viperFace: Math.sign(spot.gx - c.source.gx) || c.face });
    return [env.kit.contact(c, [foe], row.at, { damagePct: VIPER.pct, key: `${c.key}:${foe.id}`, dots: VIPER_DOTS })];
}

export function runeStepViper(env, state, c, input) {
    const foes = runeLive(input.enemies), commands = [];
    for (const row of runeDue(c, input.now)) commands.push(...runeViperRow(env, state, c, row, foes));
    runeSettle(c);
    return commands;
}

/** 강림은 거리 제한 없이 시야 안의 적 누구에게나 뛴다. */
export function runeDescentTargets(env, id, source, foes) { return foes.filter(e => env.kit.seen(e)); }

/** 내려설 칸: 이미 그 적 곁이면 제자리, 아니면 그 적의 빈 이웃 칸 가운데 같은 줄 주인공 쪽이 먼저, 그다음 주인공에게 가까운 칸. 빈 칸이 없으면 null. */
export function runeDescentLanding(env, c, foe, live) {
    const target = env.deps.getClosestGridUnitCell(c.source, foe), side = Math.sign(c.source.gx - target.gx) || 1;
    if (Math.max(Math.abs(target.gx - c.source.gx), Math.abs(target.gy - c.source.gy)) <= 1) return env.kit.cell(c.source);
    const cells = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) cells.push({ gx: target.gx + dx, gy: target.gy + dy });
    const rank = p => (p.gy === target.gy && p.gx - target.gx === side ? 0 : 1000) + (p.gx - c.source.gx) ** 2 + (p.gy - c.source.gy) ** 2;
    return cells.filter(p => env.kit.free(p, live)).sort((a, b) => rank(a) - rank(b))[0] || null;
}

/** 강림: 웅크렸다가 화면 밖으로 솟구쳐(그 사이 내려설 칸으로 옮긴다) 내리꽂힌다. 착지 둘레를 치고 지진이 두 번 더 넓게 퍼진다. 이동 중이라(holds) 걸어서 다가가지 않는다. */
export function runeLaunchDescent(env, state, c, enemies) {
    const live = runeLive(enemies), foe = runeFoeOf(c, live), to = foe && runeDescentLanding(env, c, foe, live);
    if (!to) { c.done = true; return; }
    const air = { at: c.at, wind: env.kit.ms(c, DESCENT.wind), up: env.kit.ms(c, DESCENT.up), hang: env.kit.ms(c, DESCENT.hang), fall: env.kit.ms(c, DESCENT.fall) };
    const land = c.at + air.wind + air.up + air.hang + air.fall, every = env.kit.ms(c, DESCENT.quake.every), grow = env.kit.grow(c.stats);
    c.holds = true; c.to = to; c.descend = air;
    c.face = Math.sign(env.deps.getGridUnitCenter(foe).gx - to.gx) || Math.sign(to.gx - c.source.gx) || 1;
    c.center = { gx: to.gx + c.face * DESCENT.ahead, gy: to.gy };
    c.radii = [DESCENT.radius + grow, ...DESCENT.quake.radii.map(radius => radius + grow)];
    env.kit.letGo(c, land, land + env.kit.ms(c, DESCENT.hold));
    c.queue = [{ at: c.at, kind: 'leap' }, { at: land, kind: 'land', index: 0, pct: DESCENT.pct },
        ...DESCENT.quake.radii.map((_, i) => ({ at: land + every * (i + 1), kind: 'quake', index: i + 1, pct: DESCENT.quake.pct }))];
    env.kit.visual(state, c, 'leap', c.at, land - c.at + 160, { sourceCell: env.kit.cell(c.source), landingCell: to, targetCells: [to], descentFace: c.face, descend: air });
    c.quakeEvent = env.kit.visual(state, c, 'quake', land, every * DESCENT.quake.radii.length + DESCENT.quake.life, { landingCell: c.center, descentFace: c.face,
        quakeWaves: c.radii.map((radius, i) => ({ at: i * every, radius })) });
    runeSettle(c);
}

export function runeDescentRow(env, state, c, row, input) {
    if (row.kind === 'leap') return [{ type: 'teleport', name: c.name, from: env.kit.cell(c.source), to: c.to, at: row.at, descend: c.descend }];
    if (row.kind === 'land') {   // 내려선 칸에서 친다(옮기지 못했으면 제자리)
        c.center = { gx: input.source.gx + c.face * DESCENT.ahead, gy: input.source.gy };
        c.quakeEvent.landingCell = c.center;
    }
    c.areaRadius = c.radii[row.index];
    const hit = env.kit.area(runeLive(input.enemies), c.center, 'circle', c.areaRadius);
    return hit.length ? [env.kit.contact(c, hit, row.at, { damagePct: row.pct, key: `${c.key}:${row.index}` })] : [];
}

export function runeStepDescent(env, state, c, input) {
    const commands = [];
    for (const row of runeDue(c, input.now)) commands.push(...runeDescentRow(env, state, c, row, input));
    runeSettle(c);
    return commands;
}
