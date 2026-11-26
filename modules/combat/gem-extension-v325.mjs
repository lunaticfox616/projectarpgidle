// 2026-11-26 스킬 전달본 V3.24 후속(96 계약)과 V3.25(97 영혼 흡수, 99 야만스러운 난격)의 판정. 그림은 무대가 그린다
// (modules/rendering/stage-pact.mjs, stage-soul-drain.mjs, stage-flurry.mjs). 98 기공파는 곧은 투사체라 여기에 없다.
import { PACT, SOUL, FLURRY } from './gem-extension-values.mjs';
import { runeLive, runeByNear, runeDue, runeSettle, runeFaceTo, runeFoeOf, runeCenters } from './gem-extension-common.mjs';
import { REPEAT_GAP_MS } from '../domain/support-attack.mjs';

export function runePactRadius(env, c) { return PACT.radius + env.kit.grow(c.stats); }

/** 계약: 문양을 새기고 높은 틈에서 주먹이 떨어진다. 이중 시전이 붙으면 둘째 피해(REPEAT_GAP_MS 뒤)에 맞춰 주먹이 하나 더 떨어진다. */
export function runeLaunchPact(env, state, c) {
    const impact = c.at + env.kit.ms(c, PACT.release), seal = env.kit.ms(c, PACT.seal), fall = env.kit.ms(c, PACT.fall);
    env.kit.letGo(c, impact, impact + env.kit.ms(c, PACT.hold));
    c.nextAt = impact + seal + fall;
    const look = { landingCell: env.kit.cell(c.aim), pactRadius: runePactRadius(env, c), pactSeal: seal, pactFall: fall };
    env.kit.visual(state, c, 'pact', impact, seal + fall + PACT.after, look);
    if (c.stats.sSkill.supportEffects?.repeat) env.kit.visual(state, c, 'pact', impact + REPEAT_GAP_MS, seal + fall + PACT.after, look);
}

export function runeStepPact(env, state, c, input) {
    c.done = true;
    const hit = env.kit.area(input.enemies, c.aim, 'circle', runePactRadius(env, c));
    return hit.length ? [env.kit.contact(c, hit, c.nextAt, { damagePct: PACT.pct })] : [];
}

export function runeSoulReach(env, c) { return SOUL.reach + env.kit.grow(c.stats); }

/** 레벨 5, 10, 15, 20마다 대상이 1명씩 는다. */
export function runeSoulCount(stats) {
    const level = Number(stats?.sSkill?.finalLevel) || 1;
    return 1 + SOUL.levels.filter(step => level >= step).length;
}

export function runeSoulTargets(env, id, source, foes, extra) { return env.kit.area(foes, source, 'square', SOUL.reach + extra); }

/** 영혼 흡수: 둘레 네모 안 가까운 적부터 차례로(간격 gap) 영혼을 뽑는다. */
export function runeLaunchSoul(env, state, c, enemies) {
    const impact = c.at + env.kit.ms(c, SOUL.release), gap = env.kit.ms(c, SOUL.gap);
    const foes = env.kit.area(runeLive(enemies), c.source, 'square', runeSoulReach(env, c)).sort(runeByNear(env, c.source)).slice(0, runeSoulCount(c.stats));
    env.kit.letGo(c, impact, impact + env.kit.ms(c, SOUL.hold));
    c.queue = foes.map((foe, index) => ({ at: impact + gap * index, id: foe.id, index }));
    if (!c.queue.length) { c.done = true; return; }
    c.nextAt = c.queue[0].at;
}

export function runeStepSoul(env, state, c, input) {
    const foes = runeLive(input.enemies), commands = [], pull = SOUL.pull, fly = SOUL.fly;
    for (const row of runeDue(c, input.now)) {
        const foe = foes.find(e => e.id === row.id);
        if (!foe) continue;
        const from = env.deps.getGridUnitCenter(foe);
        env.kit.visual(state, c, 'soul', row.at, pull + fly + 150, { sourceCell: from, landingCell: env.kit.cell(c.source), targetCells: [from], soulPull: pull, soulFly: fly,
            soulSide: row.index % 2 ? 1 : -1 });
        env.kit.visual(state, c, 'shield', row.at + pull + fly, 220, { landingCell: env.kit.cell(c.source) });
        commands.push(env.kit.contact(c, [foe], row.at, { damagePct: SOUL.pct, key: `${c.key}:${row.index}`,
            soul: { shieldPct: SOUL.shieldPct, capLifePct: SOUL.capLifePct, lifeMs: SOUL.lifeMs } }));
    }
    runeSettle(c);
    return commands;
}

/** 그 레벨의 난격 횟수와 간격(ms, 공격 속도를 반영하기 전). */
export function runeFlurryPlan(stats) {
    const level = Number(stats?.sSkill?.finalLevel) || 1, hits = FLURRY.hits.filter(([from]) => level >= from).at(-1)[1];
    return { hits, every: Math.max(FLURRY.least, Math.min(FLURRY.gap, Math.floor(FLURRY.maxDur / hits))) };
}

export function runeFlurryBand(env, c) { return FLURRY.band + 0.5 * env.kit.grow(c.stats); }

/** 앞 depth칸(face 쪽), 위아래 band줄 안에 칸이 하나라도 든 적. face 0이면 양쪽을 다 본다(대상 고르기). */
export function runeFlurryIn(env, foe, source, face, band) {
    return env.deps.getGridUnitCells(foe).some(p => {
        const dx = p.gx - source.gx, ahead = face ? dx * face : Math.abs(dx);
        return ahead >= 0 && ahead <= FLURRY.depth && Math.abs(p.gy - source.gy) <= band && !(dx === 0 && p.gy === source.gy);
    });
}

export function runeFlurryTargets(env, id, source, foes, extra) { return foes.filter(e => runeFlurryIn(env, e, source, 0, FLURRY.band + 0.5 * extra)); }

/** 야만스러운 난격: 그 자리에 서서 앞을 횟수만큼 친다. 동작은 친 횟수 셋마다 다시 휘두른다(pose). */
export function runeLaunchFlurry(env, state, c, enemies) {
    const plan = runeFlurryPlan(c.stats), every = env.kit.ms(c, plan.every), impact = c.at + env.kit.ms(c, FLURRY.release);
    c.face = runeFaceTo(env, c, runeFoeOf(c, enemies));
    c.holds = true; c.hits = plan.hits; c.every = every; c.index = 0; c.nextAt = impact;
    env.kit.letGo(c, impact, impact + every * plan.hits);
}

export function runeStepFlurry(env, state, c, input) {
    const at = c.nextAt, index = c.index++, band = runeFlurryBand(env, c);
    const hit = runeLive(input.enemies).filter(e => runeFlurryIn(env, e, c.source, c.face, band)).sort(runeByNear(env, c.source));
    env.kit.visual(state, c, 'punch', at, c.every > 100 ? 121 : 88, { sourceCell: env.kit.cell(c.source), targetCells: runeCenters(env, hit.slice(0, 4)),
        flurryIndex: index + 1, flurryFace: c.face, flurryEvery: c.every, landingCell: env.kit.cell(c.source) });
    c.done = c.index >= c.hits;
    if (!c.done) c.nextAt += c.every;
    const commands = hit.length ? [env.kit.contact(c, hit, at, { key: `${c.key}:${index}` })] : [];
    if (index && index % 3 === 0 && !c.done) commands.push({ type: 'pose', name: c.name, element: c.stats.sSkill.ele, swing: { impactDelayMs: 0, duration: c.every * 3 } });
    return commands;
}

/** 친 칸(소품을 깨는 칸, modules/combat/gem-cast-common.mjs gemContactCells). */
export function runeFlurryCells(env, c) {
    const band = Math.floor(runeFlurryBand(env, c)), cells = [];
    for (let dy = -band; dy <= band; dy++) for (let dx = 1; dx <= FLURRY.depth; dx++) cells.push({ gx: c.source.gx + dx * (c.face || 1), gy: c.source.gy + dy });
    return cells;
}

