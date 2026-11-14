import { ORB, BOLT_LIFE, TAU, ORBIT } from './gem-extension-values.mjs';
import { runeFoeOf, runeReachOf, runeLive, runeByNear, runeFaceTo } from './gem-extension-common.mjs';

export function runeOrbAim(env, c, foe, index, missing) {
    const from = c.source;
    if (foe) {
        const p = env.deps.getGridUnitCenter(foe), angle = Math.atan2(p.gy - from.gy, p.gx - from.gx);
        return { angle, reach: Math.max(ORB.least, Math.min(ORB.range, env.kit.distance(from, p) + ORB.past)) };
    }
    const side = (missing % 2 ? 1 : -1) * Math.ceil((missing + 1) / 2) * ORB.fan;
    return { angle: (c.face > 0 ? 0 : Math.PI) + side, reach: ORB.range };
}

export function runeLaunchFrozenOrb(env, state, c, enemies) {
    const release = c.at + env.kit.ms(c, ORB.release), first = runeFoeOf(c, enemies);
    const count = 1 + env.kit.grow(c.stats) + env.kit.supportShots(c) + env.deps.rollProjectileExtraShots(c.stats.projectileExtraShots);
    const aimed = [first, ...runeReachOf(env, ORB.range)(82, c.source, runeLive(enemies)).filter(e => e !== first).sort(runeByNear(env, c.source))].slice(0, count);
    c.face = runeFaceTo(env, c, first);
    env.kit.letGo(c, release, release + env.kit.ms(c, 160));
    c.flownTo = release; c.nextAt = release; c.bolted = 0;
    c.orbs = Array.from({ length: count }, (_, i) => {
        const aim = runeOrbAim(env, c, aimed[i], i, i - aimed.length), start = release + env.kit.ms(c, ORB.stagger * i);
        const orb = { start, ...aim, dur: aim.reach / ORB.speed * 1000, next: start, spin: i * 1.7, bolts: [], nova: false };
        orb.event = env.kit.visual(state, c, 'orb', start, orb.dur + BOLT_LIFE + 200, { orbFrom: env.kit.cell(c.source), orbAngle: aim.angle, orbReach: aim.reach,
            orbSpeed: ORB.speed, orbBolts: orb.bolts, orbSeed: i, orbNovaAt: start + orb.dur, boltSpeed: ORB.bolt.speed, boltLife: BOLT_LIFE });
        return orb;
    });
}

export function runeOrbSpot(c, orb, at) {
    const k = Math.min(Math.max(0, at - orb.start), orb.dur) / 1000 * ORB.speed;
    return { gx: c.source.gx + Math.cos(orb.angle) * k, gy: c.source.gy + Math.sin(orb.angle) * k };
}

export function runeShoot(orb, at, spot, angle) { return orb.bolts.push({ at, gx: spot.gx, gy: spot.gy, angle, until: at + BOLT_LIFE, hit: false }); }

/** 그 걸음까지 구체가 쏜 화살과, 끝에 닿았으면 고리. */
export function runeOrbShoot(c, orb, now) {
    const end = orb.start + orb.dur;
    for (; orb.next <= Math.min(now, end); orb.next += ORB.every) { orb.spin += ORB.spin; runeShoot(orb, orb.next, runeOrbSpot(c, orb, orb.next), orb.spin); }
    if (orb.nova || now < end) return;
    orb.nova = true;
    for (let i = 0; i < ORB.nova; i++) runeShoot(orb, end, runeOrbSpot(c, orb, end), i / ORB.nova * TAU + orb.spin);
}

export function runeBoltSpot(bolt, at) {
    const k = (at - bolt.at) / 1000 * ORB.bolt.speed;
    return { gx: bolt.gx + Math.cos(bolt.angle) * k, gy: bolt.gy + Math.sin(bolt.angle) * k };
}

export function runeBoltTouches(env, spot, e) { return env.deps.getGridUnitCells(e).some(p => Math.abs(p.gx - spot.gx) <= ORB.bolt.hitX && Math.abs(p.gy - spot.gy) <= ORB.bolt.hitY); }

export function runeBoltFly(flight, bolt, at, index) {
    const { env, c, foes } = flight;
    if (bolt.hit || at < bolt.at || at > bolt.until) return null;
    const spot = runeBoltSpot(bolt, at), foe = foes.find(e => runeBoltTouches(env, spot, e));
    if (!foe) return null;
    bolt.hit = true; bolt.until = at;
    return env.kit.contact(c, [foe], at, { damagePct: ORB.bolt.pct, key: `${c.key}:o${index}`, noAugment: c.bolted++ > 0 });
}

export function runeStepFrozenOrb(env, state, c, input) {
    const foes = runeLive(input.enemies), commands = [];
    const flight = { env, c, foes };
    for (; c.flownTo + ORB.stepMs <= input.now; c.flownTo += ORB.stepMs) {
        const at = c.flownTo + ORB.stepMs;
        c.orbs.forEach((orb, index) => {
            if (at < orb.start) return;
            runeOrbShoot(c, orb, at);
            for (const bolt of orb.bolts) { const row = runeBoltFly(flight, bolt, at, index); if (row) commands.push(row); }
        });
    }
    c.nextAt = input.now;
    c.done = c.orbs.every(orb => orb.nova && orb.bolts.every(bolt => bolt.hit || bolt.until < c.flownTo));
    return commands;
}

export function runeOrbitMax(env, stats) { const g = env.kit.grow(stats); return g < ORBIT.max.length ? ORBIT.max[g] : 10 + 3 * (g - 2); }

export function runeOrbitReach(env, id, source, foes) { return foes.filter(e => env.deps.getGridUnitCells(e).some(p => Math.max(Math.abs(p.gx - source.gx), Math.abs(p.gy - source.gy)) <= ORBIT.reach)); }

export function runeAddOrb(env, owner, at, max) {
    owner.orbs.splice(0, owner.orbs.length, ...owner.orbs.filter(orb => orb.until > at));
    if (owner.orbs.length >= max) {
        const old = owner.orbs.reduce((a, b) => (a.until < b.until ? a : b));
        Object.assign(old, { until: at + ORBIT.life, born: at });
    } else owner.orbs.push({ born: at, until: at + ORBIT.life, next: at + ORBIT.first + (owner.orbs.length % 4) * ORBIT.firstStep, seed: env.deps.random() * 99, flashAt: -1, target: null, targetAt: -Infinity });
    owner.event.orbitMax = max;
    owner.event.duration = Math.max(...owner.orbs.map(orb => orb.until)) - owner.event.at + 200;
    owner.nextAt = Math.min(...owner.orbs.map(orb => Math.min(orb.next, orb.until)));
}

export function runeLaunchOrbit(env, state, c) {
    const release = c.at + env.kit.ms(c, ORBIT.release), owner = state.casts.find(cast => cast.id === 83 && !cast.done && cast.orbs);
    env.kit.letGo(c, release, release + env.kit.ms(c, 160));
    if (owner) { runeAddOrb(env, owner, release, runeOrbitMax(env, c.stats)); c.done = true; return; }
    c.orbs = [];
    c.event = env.kit.visual(state, c, 'orbit', release, ORBIT.life + 200, { orbitOrbs: c.orbs, orbitMax: runeOrbitMax(env, c.stats) });
    runeAddOrb(env, c, release, runeOrbitMax(env, c.stats));
}

export function runeOrbitPick(env, c, orb, foes, now) {
    const taken = new Set(c.orbs.filter(o => o !== orb && o.target !== null && now - o.targetAt < ORBIT.avoid).map(o => o.target));
    const fresh = foes.filter(e => !taken.has(e.id));
    return (fresh.length ? fresh : foes).sort(runeByNear(env, c.source))[0] || null;
}

/** 구체 하나의 정전기. pulse는 한 번의 틱에서 재사용하는 후보·시각·구체 번호다. */
export function runeOrbitZap(env, state, c, orb, pulse) {
    const { now, index } = pulse, foe = runeOrbitPick(env, c, orb, pulse.foes, now);
    if (!foe) { orb.next = now + ORBIT.retry; return null; }
    Object.assign(orb, { next: now + ORBIT.every, target: foe.id, targetAt: now, flashAt: now });
    const spot = env.deps.getGridUnitCenter(foe);
    env.kit.visual(state, c, 'zap', now, 150, { orbIndex: index, orbSeed: orb.seed, targetCells: [spot], landingCell: spot });
    return env.kit.contact(c, [foe], now, { damagePct: ORBIT.pct, key: `${c.key}:z`, noAugment: true });
}

export function runeStepOrbit(env, state, c, input) {
    const now = input.now;
    c.source = env.kit.cell(input.source);
    c.orbs.splice(0, c.orbs.length, ...c.orbs.filter(orb => orb.until > now));
    if (!c.orbs.length) { c.done = true; return []; }
    const pulse = { foes: runeOrbitReach(env, 83, c.source, runeLive(input.enemies)), now, index: 0 }, commands = [];
    c.orbs.forEach((orb, index) => {
        if (orb.next > now) return;
        pulse.index = index;
        const row = runeOrbitZap(env, state, c, orb, pulse);
        if (row) commands.push(row);
    });
    c.nextAt = Math.min(...c.orbs.map(orb => Math.min(orb.next, orb.until)));
    return commands;
}
