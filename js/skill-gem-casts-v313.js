// GENERATED from modules/skill-gem-casts-v313*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/gem-extension-common.mjs
  function runeByNear(env, source) {
    return (a, b) => env.deps.getGridUnitDistance(source, a) - env.deps.getGridUnitDistance(source, b);
  }
  function runeLive(enemies) {
    return enemies.filter((e) => e.hp > 0);
  }
  function runeWithin(env, e, center, radius) {
    return env.deps.getGridUnitCells(e).some((p) => env.kit.distance(center, p) <= radius);
  }
  function runeReachOf(env, range) {
    return (id, source, foes) => foes.filter((e) => runeWithin(env, e, source, range));
  }
  function runeFaceTo(env, c, foe) {
    return Math.sign(env.deps.getGridUnitCenter(foe).gx - c.source.gx) || 1;
  }
  function runeFoeOf(c, enemies) {
    return enemies.find((e) => e.id === c.targetId);
  }
  function runeCenters(env, foes) {
    return foes.map(env.deps.getGridUnitCenter);
  }
  function runeDue(c, now) {
    const rows = c.queue.filter((row) => row.at <= now);
    c.queue = c.queue.filter((row) => row.at > now);
    return rows;
  }
  function runeSettle(c) {
    c.done = !c.queue.length;
    if (!c.done) c.nextAt = Math.min(...c.queue.map((row) => row.at));
  }

  // modules/combat/gem-extension-values.mjs
  var TAU = Math.PI * 2;
  var ORB = Object.freeze({
    range: 6,
    speed: 240 / 72,
    every: 50,
    spin: 0.62,
    nova: 16,
    past: 1.2,
    least: 3,
    stagger: 90,
    release: 320,
    fan: 0.24,
    stepMs: 20,
    bolt: Object.freeze({ reach: 2.6, speed: 520 / 72, pct: 22, hitX: 0.3, hitY: 0.45 })
  });
  var BOLT_LIFE = ORB.bolt.reach / ORB.bolt.speed * 1e3;
  var ORBIT = Object.freeze({ life: 12e3, every: 900, pct: 32, reach: 3, max: Object.freeze([5, 7, 10]), first: 240, firstStep: 110, avoid: 400, retry: 200, release: 320 });
  var RIFT = Object.freeze({ middle: 2, half: 0.75, depth: 4.5, pull: 1.2, pullAt: 90, close: 520, pct: 60, impact: 630, hold: 200, grow: 0.5 });
  var ISSEN = Object.freeze({ reach: 10, depth: 0.6, grow: 0.25, delay: 220, impact: 350, hold: 200, cuts: 6 });
  var VOID = Object.freeze({ radius: 3, pullCells: 2, spirit: 40, hit: 300, gap: 30, weak: 4e3, impact: 400, hold: 200, fly: 260 });
  var STORM = Object.freeze({ range: 5, radius: 2, charge: 180, stagger: 200, pct: 200 });
  var CAULDRON = Object.freeze({ range: 6, radius: 2.5, pour: 260, fall: 130, every: 250, pcts: Object.freeze([80, 50, 50]), impact: 840, hold: 200 });
  var BELL = Object.freeze({ range: 6, radius: 3, drop: 220, tolls: Object.freeze([300, 750]), pcts: Object.freeze([120, 80]), least: 35, wave: 320, impact: 320, hold: 200 });
  var CHANDELIER = Object.freeze({ range: 5, radius: 2, hang: 140, fall: 220, pct: 100, fireLag: 70, contact: 540, frame: 6, mageContact: 630, mageFrame: 7, hold: 140 });
  var GAVEL = Object.freeze({
    near: 0.5,
    far: 3.5,
    depth: 1.5,
    grow: 0.25,
    length: 2.3,
    windup: 150,
    swing: 170,
    pct: 120,
    impact: 320,
    hold: 200,
    verdict: Object.freeze({ delay: 200, gap: 45, pct: 60, lag: 50 })
  });

  // modules/combat/gem-extension-orbs.mjs
  function runeOrbAim(env, c, foe, index, missing) {
    const from = c.source;
    if (foe) {
      const p = env.deps.getGridUnitCenter(foe), angle = Math.atan2(p.gy - from.gy, p.gx - from.gx);
      return { angle, reach: Math.max(ORB.least, Math.min(ORB.range, env.kit.distance(from, p) + ORB.past)) };
    }
    const side = (missing % 2 ? 1 : -1) * Math.ceil((missing + 1) / 2) * ORB.fan;
    return { angle: (c.face > 0 ? 0 : Math.PI) + side, reach: ORB.range };
  }
  function runeLaunchFrozenOrb(env, state, c, enemies) {
    const release = c.at + env.kit.ms(c, ORB.release), first = runeFoeOf(c, enemies);
    const count = 1 + env.kit.grow(c.stats) + env.kit.supportShots(c) + env.deps.rollProjectileExtraShots(c.stats.projectileExtraShots);
    const aimed = [first, ...runeReachOf(env, ORB.range)(82, c.source, runeLive(enemies)).filter((e) => e !== first).sort(runeByNear(env, c.source))].slice(0, count);
    c.face = runeFaceTo(env, c, first);
    env.kit.letGo(c, release, release + env.kit.ms(c, 160));
    c.flownTo = release;
    c.nextAt = release;
    c.bolted = 0;
    c.orbs = Array.from({ length: count }, (_, i) => {
      const aim = runeOrbAim(env, c, aimed[i], i, i - aimed.length), start = release + env.kit.ms(c, ORB.stagger * i);
      const orb = { start, ...aim, dur: aim.reach / ORB.speed * 1e3, next: start, spin: i * 1.7, bolts: [], nova: false };
      orb.event = env.kit.visual(state, c, "orb", start, orb.dur + BOLT_LIFE + 200, {
        orbFrom: env.kit.cell(c.source),
        orbAngle: aim.angle,
        orbReach: aim.reach,
        orbSpeed: ORB.speed,
        orbBolts: orb.bolts,
        orbSeed: i,
        orbNovaAt: start + orb.dur,
        boltSpeed: ORB.bolt.speed,
        boltLife: BOLT_LIFE
      });
      return orb;
    });
  }
  function runeOrbSpot(c, orb, at) {
    const k = Math.min(Math.max(0, at - orb.start), orb.dur) / 1e3 * ORB.speed;
    return { gx: c.source.gx + Math.cos(orb.angle) * k, gy: c.source.gy + Math.sin(orb.angle) * k };
  }
  function runeShoot(orb, at, spot, angle) {
    return orb.bolts.push({ at, gx: spot.gx, gy: spot.gy, angle, until: at + BOLT_LIFE, hit: false });
  }
  function runeOrbShoot(c, orb, now) {
    const end = orb.start + orb.dur;
    for (; orb.next <= Math.min(now, end); orb.next += ORB.every) {
      orb.spin += ORB.spin;
      runeShoot(orb, orb.next, runeOrbSpot(c, orb, orb.next), orb.spin);
    }
    if (orb.nova || now < end) return;
    orb.nova = true;
    for (let i = 0; i < ORB.nova; i++) runeShoot(orb, end, runeOrbSpot(c, orb, end), i / ORB.nova * TAU + orb.spin);
  }
  function runeBoltSpot(bolt, at) {
    const k = (at - bolt.at) / 1e3 * ORB.bolt.speed;
    return { gx: bolt.gx + Math.cos(bolt.angle) * k, gy: bolt.gy + Math.sin(bolt.angle) * k };
  }
  function runeBoltTouches(env, spot, e) {
    return env.deps.getGridUnitCells(e).some((p) => Math.abs(p.gx - spot.gx) <= ORB.bolt.hitX && Math.abs(p.gy - spot.gy) <= ORB.bolt.hitY);
  }
  function runeBoltFly(flight, bolt, at, index) {
    const { env, c, foes } = flight;
    if (bolt.hit || at < bolt.at || at > bolt.until) return null;
    const spot = runeBoltSpot(bolt, at), foe = foes.find((e) => runeBoltTouches(env, spot, e));
    if (!foe) return null;
    bolt.hit = true;
    bolt.until = at;
    return env.kit.contact(c, [foe], at, { damagePct: ORB.bolt.pct, key: `${c.key}:o${index}`, noAugment: c.bolted++ > 0 });
  }
  function runeStepFrozenOrb(env, state, c, input) {
    const foes = runeLive(input.enemies), commands = [];
    const flight = { env, c, foes };
    for (; c.flownTo + ORB.stepMs <= input.now; c.flownTo += ORB.stepMs) {
      const at = c.flownTo + ORB.stepMs;
      c.orbs.forEach((orb, index) => {
        if (at < orb.start) return;
        runeOrbShoot(c, orb, at);
        for (const bolt of orb.bolts) {
          const row = runeBoltFly(flight, bolt, at, index);
          if (row) commands.push(row);
        }
      });
    }
    c.nextAt = input.now;
    c.done = c.orbs.every((orb) => orb.nova && orb.bolts.every((bolt) => bolt.hit || bolt.until < c.flownTo));
    return commands;
  }
  function runeOrbitMax(env, stats) {
    const g = env.kit.grow(stats);
    return g < ORBIT.max.length ? ORBIT.max[g] : 10 + 3 * (g - 2);
  }
  function runeOrbitReach(env, id, source, foes) {
    return foes.filter((e) => env.deps.getGridUnitCells(e).some((p) => Math.max(Math.abs(p.gx - source.gx), Math.abs(p.gy - source.gy)) <= ORBIT.reach));
  }
  function runeAddOrb(env, owner, at, max) {
    owner.orbs.splice(0, owner.orbs.length, ...owner.orbs.filter((orb) => orb.until > at));
    if (owner.orbs.length >= max) {
      const old = owner.orbs.reduce((a, b) => a.until < b.until ? a : b);
      Object.assign(old, { until: at + ORBIT.life, born: at });
    } else owner.orbs.push({ born: at, until: at + ORBIT.life, next: at + ORBIT.first + owner.orbs.length % 4 * ORBIT.firstStep, seed: env.deps.random() * 99, flashAt: -1, target: null, targetAt: -Infinity });
    owner.event.orbitMax = max;
    owner.event.duration = Math.max(...owner.orbs.map((orb) => orb.until)) - owner.event.at + 200;
    owner.nextAt = Math.min(...owner.orbs.map((orb) => Math.min(orb.next, orb.until)));
  }
  function runeLaunchOrbit(env, state, c) {
    const release = c.at + env.kit.ms(c, ORBIT.release), owner = state.casts.find((cast) => cast.id === 83 && !cast.done && cast.orbs);
    env.kit.letGo(c, release, release + env.kit.ms(c, 160));
    if (owner) {
      runeAddOrb(env, owner, release, runeOrbitMax(env, c.stats));
      c.done = true;
      return;
    }
    c.orbs = [];
    c.event = env.kit.visual(state, c, "orbit", release, ORBIT.life + 200, { orbitOrbs: c.orbs, orbitMax: runeOrbitMax(env, c.stats) });
    runeAddOrb(env, c, release, runeOrbitMax(env, c.stats));
  }
  function runeOrbitPick(env, c, orb, foes, now) {
    const taken = new Set(c.orbs.filter((o) => o !== orb && o.target !== null && now - o.targetAt < ORBIT.avoid).map((o) => o.target));
    const fresh = foes.filter((e) => !taken.has(e.id));
    return (fresh.length ? fresh : foes).sort(runeByNear(env, c.source))[0] || null;
  }
  function runeOrbitZap(env, state, c, orb, pulse) {
    const { now, index } = pulse, foe = runeOrbitPick(env, c, orb, pulse.foes, now);
    if (!foe) {
      orb.next = now + ORBIT.retry;
      return null;
    }
    Object.assign(orb, { next: now + ORBIT.every, target: foe.id, targetAt: now, flashAt: now });
    const spot = env.deps.getGridUnitCenter(foe);
    env.kit.visual(state, c, "zap", now, 150, { orbIndex: index, orbSeed: orb.seed, targetCells: [spot], landingCell: spot });
    return env.kit.contact(c, [foe], now, { damagePct: ORBIT.pct, key: `${c.key}:z`, noAugment: true });
  }
  function runeStepOrbit(env, state, c, input) {
    const now = input.now;
    c.source = env.kit.cell(input.source);
    c.orbs.splice(0, c.orbs.length, ...c.orbs.filter((orb) => orb.until > now));
    if (!c.orbs.length) {
      c.done = true;
      return [];
    }
    const pulse = { foes: runeOrbitReach(env, 83, c.source, runeLive(input.enemies)), now, index: 0 }, commands = [];
    c.orbs.forEach((orb, index) => {
      if (orb.next > now) return;
      pulse.index = index;
      const row = runeOrbitZap(env, state, c, orb, pulse);
      if (row) commands.push(row);
    });
    c.nextAt = Math.min(...c.orbs.map((orb) => Math.min(orb.next, orb.until)));
    return commands;
  }

  // modules/combat/gem-extension-rifts.mjs
  function runeRiftShape(g, source, face) {
    const half = RIFT.half + RIFT.grow * g / 2;
    return { column: source.gx + face * RIFT.middle, half, band: half + RIFT.pull + RIFT.grow * g, row: source.gy };
  }
  function runeInBand(env, e, s, width) {
    return env.deps.getGridUnitCells(e).some((p) => Math.abs(p.gx - s.column) <= width && Math.abs(p.gy - s.row) <= RIFT.depth);
  }
  function runeRiftTargets(env, id, source, foes, extra) {
    const shapes = [-1, 1].map((face) => runeRiftShape(extra, source, face));
    return foes.filter((e) => shapes.some((s) => runeInBand(env, e, s, s.band)));
  }
  function runeLaunchRift(env, state, c, enemies) {
    const face = runeFaceTo(env, c, runeFoeOf(c, enemies)), impact = c.at + env.kit.ms(c, RIFT.impact);
    c.shape = runeRiftShape(env.kit.grow(c.stats), c.source, face);
    env.kit.letGo(c, impact, impact + env.kit.ms(c, RIFT.hold));
    c.queue = [{ at: impact, kind: "cut" }, { at: impact + env.kit.ms(c, RIFT.pullAt), kind: "pull" }, { at: impact + env.kit.ms(c, RIFT.close), kind: "collapse" }];
    c.nextAt = impact;
    env.kit.visual(state, c, "rift", impact, env.kit.ms(c, RIFT.close) + 220, {
      riftColumn: c.shape.column,
      riftHalf: c.shape.half,
      riftTop: c.shape.row - RIFT.depth,
      riftBottom: c.shape.row + RIFT.depth,
      riftClose: env.kit.ms(c, RIFT.close),
      riftFace: face
    });
  }
  function runeRiftRow(env, state, c, row, foes) {
    const s = c.shape, onLine = foes.filter((e) => runeInBand(env, e, s, s.half));
    if (row.kind === "pull") {
      const pulled = foes.filter((e) => runeInBand(env, e, s, s.band) && !onLine.includes(e));
      return pulled.length ? [{ type: "pull", targets: pulled.map((e) => e.id), at: row.at, column: s.column, cells: Math.ceil(s.band - s.half) }] : [];
    }
    if (row.kind === "collapse") env.kit.visual(state, c, "collapse", row.at, 420, { riftColumn: s.column, riftTop: s.row - RIFT.depth, riftBottom: s.row + RIFT.depth });
    return onLine.length ? [env.kit.contact(c, onLine, row.at, { damagePct: row.kind === "collapse" ? RIFT.pct : 100, key: `${c.key}:${row.kind}` })] : [];
  }
  function runeStepRift(env, state, c, input) {
    const foes = runeLive(input.enemies), commands = [];
    for (const row of runeDue(c, input.now)) commands.push(...runeRiftRow(env, state, c, row, foes));
    runeSettle(c);
    return commands;
  }
  function runeIssenBand(env, source, depth) {
    return (e) => env.deps.getGridUnitCells(e).some((p) => Math.abs(p.gy - source.gy) <= depth && Math.abs(p.gx - source.gx) <= ISSEN.reach);
  }
  function runeIssenDepth(extra) {
    return ISSEN.depth + ISSEN.grow * extra;
  }
  function runeIssenTargets(env, id, source, foes, extra) {
    return foes.filter(runeIssenBand(env, source, runeIssenDepth(extra)));
  }
  function runeLaunchIssen(env, state, c, enemies) {
    const face = runeFaceTo(env, c, runeFoeOf(c, enemies)), impact = c.at + env.kit.ms(c, ISSEN.impact), delay = env.kit.ms(c, ISSEN.delay);
    c.depth = runeIssenDepth(env.kit.grow(c.stats));
    c.face = face;
    env.kit.letGo(c, impact, impact + env.kit.ms(c, ISSEN.hold));
    c.nextAt = impact + delay;
    env.kit.visual(state, c, "line", impact, delay + 260, { issenRow: c.source.gy, issenDepth: c.depth, issenDelay: delay, issenFace: face, issenReach: ISSEN.reach });
  }
  function runeStepIssen(env, state, c, input) {
    const hit = runeLive(input.enemies).filter(runeIssenBand(env, c.source, c.depth)).sort(runeByNear(env, c.source));
    c.done = true;
    if (!hit.length) return [];
    env.kit.visual(state, c, "cut", c.nextAt, 400, { targetCells: runeCenters(env, hit.slice(0, ISSEN.cuts)), issenFace: c.face });
    return [env.kit.contact(c, hit, c.nextAt)];
  }

  // modules/combat/gem-extension-void.mjs
  function runeVoidRadius(extra) {
    return VOID.radius + extra;
  }
  function runeVoidTargets(env, id, source, foes, extra) {
    return foes.filter((e) => runeWithin(env, e, source, runeVoidRadius(extra)));
  }
  function runeLaunchVoid(env, state, c) {
    const impact = c.at + env.kit.ms(c, VOID.impact);
    env.kit.letGo(c, impact, impact + env.kit.ms(c, VOID.hold));
    c.queue = [{ at: impact, kind: "shout" }];
    c.nextAt = impact;
  }
  function runeVoidShout(env, state, c, row, foes) {
    const radius = runeVoidRadius(env.kit.grow(c.stats)), list = foes.filter((e) => runeWithin(env, e, c.source, radius)).sort(runeByNear(env, c.source)), spot = env.kit.cell(c.source);
    env.kit.visual(state, c, "pull", row.at, 420, { voidCenter: spot, voidRadius: radius });
    list.forEach((foe, i) => {
      env.kit.visual(state, c, "spirit", row.at + env.kit.ms(c, VOID.spirit + i * VOID.gap), VOID.fly, { sourceCell: spot, landingCell: env.deps.getGridUnitCenter(foe), targetCells: [env.deps.getGridUnitCenter(foe)], spiritIndex: i });
      c.queue.push({ at: row.at + env.kit.ms(c, VOID.hit + i * VOID.gap), kind: "possess", id: foe.id, index: i });
    });
    const far = list.filter((e) => env.deps.getGridUnitDistance(c.source, e) > 1);
    return far.length ? [{ type: "pull", targets: far.map((e) => e.id), at: row.at, center: spot, cells: VOID.pullCells }] : [];
  }
  function runeMarkWeak(env, state, c, foe, at) {
    const open = state.voidWeak && at < state.voidWeak.at + state.voidWeak.duration;
    if (!open) state.voidWeak = env.kit.visual(state, c, "weak", at, VOID.weak, { voidTargets: [] });
    const rows = new Map(state.voidWeak.voidTargets.filter((row) => row.expiresAt > at).map((row) => [row.id, row]));
    rows.set(foe.id, { id: foe.id, appliedAt: rows.get(foe.id)?.appliedAt ?? at, expiresAt: at + VOID.weak });
    state.voidWeak.voidTargets = [...rows.values()];
    state.voidWeak.duration = at + VOID.weak - state.voidWeak.at;
  }
  function runeVoidPossess(env, state, c, row, foes) {
    const foe = foes.find((e) => e.id === row.id);
    if (!foe) return [];
    runeMarkWeak(env, state, c, foe, row.at);
    return [env.kit.contact(c, [foe], row.at, { key: `${c.key}:${row.index}` }), { type: "weaken", targets: [foe.id], at: row.at, ms: VOID.weak }];
  }
  function runeStepVoid(env, state, c, input) {
    const foes = runeLive(input.enemies), commands = [];
    for (const row of runeDue(c, input.now)) commands.push(...row.kind === "shout" ? runeVoidShout(env, state, c, row, foes) : runeVoidPossess(env, state, c, row, foes));
    runeSettle(c);
    return commands;
  }

  // modules/combat/gem-extension-flasks.mjs
  function runeStormRadius(env, c) {
    return STORM.radius + env.kit.grow(c.stats);
  }
  function runeLaunchStorm(env, state, c) {
    env.kit.launchFlask(state, c);
    c.index = 0;
  }
  function runeStepStorm(env, state, c, input) {
    if (!c.index) {
      const boltAt = Math.max(c.nextAt + env.kit.ms(c, STORM.charge), state.stormNext || 0);
      state.stormNext = boltAt + STORM.stagger;
      env.kit.visual(state, c, "charge", c.nextAt, boltAt - c.nextAt + 40, { landingCell: env.kit.cell(c.aim), stormRadius: runeStormRadius(env, c) });
      c.index = 1;
      c.nextAt = boltAt;
      return [];
    }
    c.done = true;
    env.kit.visual(state, c, "bolt", c.nextAt, 820, { landingCell: env.kit.cell(c.aim), stormRadius: runeStormRadius(env, c) });
    return [env.kit.contact(c, env.kit.area(input.enemies, c.aim, "circle", runeStormRadius(env, c)), c.nextAt, { damagePct: STORM.pct })];
  }
  function runeCauldronRadius(env, c) {
    return CAULDRON.radius + env.kit.grow(c.stats);
  }
  function runeLaunchCauldron(env, state, c) {
    const impact = c.at + env.kit.ms(c, CAULDRON.impact), pour = env.kit.ms(c, CAULDRON.pour), fall = env.kit.ms(c, CAULDRON.fall), every = env.kit.ms(c, CAULDRON.every);
    env.kit.letGo(c, impact, impact + env.kit.ms(c, CAULDRON.hold));
    c.index = 0;
    c.every = every;
    c.nextAt = impact + pour + fall;
    env.kit.visual(state, c, "cauldron", impact, pour + fall + every * (CAULDRON.pcts.length - 1) + 1080, {
      landingCell: env.kit.cell(c.aim),
      cauldronRadius: runeCauldronRadius(env, c),
      cauldronPour: pour,
      cauldronFall: fall,
      cauldronEvery: every,
      cauldronHits: CAULDRON.pcts.length,
      cauldronDir: env.deps.random() < 0.5 ? 1 : -1
    });
  }
  function runeStepCauldron(env, state, c, input) {
    const hit = env.kit.area(input.enemies, c.aim, "circle", runeCauldronRadius(env, c)), at = c.nextAt, index = c.index++;
    if (!index && hit.length) env.kit.visual(state, c, "splash", at, 400, { targetCells: runeCenters(env, hit) });
    c.done = c.index >= CAULDRON.pcts.length;
    if (!c.done) c.nextAt += c.every;
    return hit.length ? [env.kit.contact(c, hit, at, { damagePct: CAULDRON.pcts[index], key: `${c.key}:${index}` })] : [];
  }

  // modules/combat/gem-extension-relics.mjs
  function runeBellRadius(env, c) {
    return BELL.radius + env.kit.grow(c.stats);
  }
  function runeLaunchBell(env, state, c) {
    const impact = c.at + env.kit.ms(c, BELL.impact), tolls = BELL.tolls.map((t) => env.kit.ms(c, t)), wave = env.kit.ms(c, BELL.wave);
    env.kit.letGo(c, impact, impact + env.kit.ms(c, BELL.hold));
    c.wave = wave;
    c.queue = tolls.map((t, i) => ({ at: impact + t, kind: "toll", index: i }));
    c.nextAt = c.queue[0].at;
    env.kit.visual(state, c, "bell", impact, tolls[tolls.length - 1] + wave + 520, {
      landingCell: env.kit.cell(c.aim),
      bellRadius: runeBellRadius(env, c),
      bellDrop: env.kit.ms(c, BELL.drop),
      bellTolls: tolls,
      bellWave: wave
    });
  }
  function runeBellToll(env, state, c, row, foes) {
    const radius = runeBellRadius(env, c);
    for (const foe of foes.filter((e) => runeWithin(env, e, c.aim, radius))) {
      const d = Math.min(1, env.kit.distance(env.deps.getGridUnitCenter(foe), c.aim) / radius), mul = 1 - (1 - BELL.least / 100) * d;
      c.queue.push({ at: row.at + Math.round(d * c.wave), kind: "hit", id: foe.id, pct: BELL.pcts[row.index] * mul, index: row.index });
    }
    return state.visuals === false ? [] : [{ type: "bellToll" }];
  }
  function runeBellHit(env, c, row, foes) {
    const foe = foes.find((e) => e.id === row.id);
    return foe ? [env.kit.contact(c, [foe], row.at, { damagePct: row.pct, key: `${c.key}:${row.index}` })] : [];
  }
  function runeStepBell(env, state, c, input) {
    const foes = runeLive(input.enemies), commands = [];
    for (const row of runeDue(c, input.now)) commands.push(...row.kind === "toll" ? runeBellToll(env, state, c, row, foes) : runeBellHit(env, c, row, foes));
    runeSettle(c);
    return commands;
  }
  function runeChandRadius(env, c) {
    return CHANDELIER.radius + env.kit.grow(c.stats);
  }
  function runeLaunchChandelier(env, state, c, enemies) {
    const mage = env.deps.getHeroAppearanceId() === "occultist", impact = c.at + env.kit.ms(c, mage ? CHANDELIER.mageContact : CHANDELIER.contact);
    const hang = env.kit.ms(c, CHANDELIER.hang), fall = env.kit.ms(c, CHANDELIER.fall);
    env.kit.letGo(c, impact, impact + env.kit.ms(c, CHANDELIER.hold));
    c.swing.contactFrame = mage ? CHANDELIER.mageFrame : CHANDELIER.frame;
    c.index = 0;
    c.nextAt = impact + hang + fall;
    env.kit.visual(state, c, "chandelier", impact, hang + fall + 1100, {
      landingCell: env.kit.cell(c.aim),
      chandRadius: runeChandRadius(env, c),
      chandHang: hang,
      chandFall: fall,
      chandFace: runeFaceTo(env, c, runeFoeOf(c, enemies))
    });
  }
  function runeStepChandelier(env, state, c, input) {
    if (!c.index) {
      const hit = env.kit.area(input.enemies, c.aim, "circle", runeChandRadius(env, c)), at = c.nextAt;
      c.struck = hit.map((e) => e.id);
      c.index = 1;
      c.nextAt = at + env.kit.ms(c, CHANDELIER.fireLag);
      c.done = !hit.length;
      return hit.length ? [env.kit.contact(c, hit, at, { damagePct: CHANDELIER.pct, key: `${c.key}:phys` })] : [];
    }
    c.done = true;
    const burn = runeLive(input.enemies).filter((e) => c.struck.includes(e.id));
    if (!burn.length) return [];
    env.kit.visual(state, c, "burn", c.nextAt, 360, { targetCells: runeCenters(env, burn) });
    return [env.kit.contact(c, burn, c.nextAt, { damagePct: CHANDELIER.pct, key: `${c.key}:fire`, attackOptions: { ...c.attackOptions, forcedElement: "fire" } })];
  }
  function runeGavelDepth(extra) {
    return GAVEL.depth + GAVEL.grow * extra;
  }
  function runeGavelBox(env, source, face, depth) {
    return (e) => env.deps.getGridUnitCells(e).some((p) => {
      const ahead = (p.gx - source.gx) * face;
      return ahead >= GAVEL.near && ahead <= GAVEL.far && Math.abs(p.gy - source.gy) <= depth;
    });
  }
  function runeGavelTargets(env, id, source, foes, extra) {
    return foes.filter((e) => [-1, 1].some((face) => runeGavelBox(env, source, face, runeGavelDepth(extra))(e)));
  }
  function runeGavelCells(source, face, depth) {
    const out = [], rows = Math.floor(depth);
    for (let ahead = Math.ceil(GAVEL.near); ahead < GAVEL.far; ahead++) for (let dy = -rows; dy <= rows; dy++) out.push({ gx: source.gx + face * ahead, gy: source.gy + dy });
    return out;
  }
  function runeLaunchGavel(env, state, c, enemies) {
    const face = runeFaceTo(env, c, runeFoeOf(c, enemies)), impact = c.at + env.kit.ms(c, GAVEL.impact), windup = env.kit.ms(c, GAVEL.windup), swing = env.kit.ms(c, GAVEL.swing);
    c.face = face;
    c.depth = runeGavelDepth(env.kit.grow(c.stats));
    env.kit.letGo(c, impact, impact + env.kit.ms(c, GAVEL.hold));
    c.queue = [{ at: impact + windup + swing, kind: "slam" }];
    c.nextAt = c.queue[0].at;
    env.kit.visual(state, c, "gavel", impact, windup + swing + 820, {
      gavelFace: face,
      gavelLength: GAVEL.length,
      gavelWindup: windup,
      gavelSwing: swing,
      gavelDepth: c.depth,
      gavelCells: runeGavelCells(c.source, face, c.depth)
    });
  }
  function runeGavelRow(env, state, c, row, foes) {
    if (row.kind === "slam") {
      const hit = foes.filter(runeGavelBox(env, c.source, c.face, c.depth)).sort(runeByNear(env, c.source)), start = row.at + env.kit.ms(c, GAVEL.verdict.delay);
      hit.forEach((foe2, i) => c.queue.push({ at: start + env.kit.ms(c, GAVEL.verdict.gap * i), kind: "bolt", id: foe2.id, index: i }));
      return hit.length ? [env.kit.contact(c, hit, row.at, { damagePct: GAVEL.pct, key: `${c.key}:slam` })] : [];
    }
    const foe = foes.find((e) => e.id === row.id);
    if (!foe) return [];
    if (row.kind === "bolt") {
      env.kit.visual(state, c, "verdict", row.at, 400, { targetCells: [env.deps.getGridUnitCenter(foe)], landingCell: env.deps.getGridUnitCenter(foe) });
      c.queue.push({ ...row, at: row.at + env.kit.ms(c, GAVEL.verdict.lag), kind: "guilty" });
      return [];
    }
    return [env.kit.contact(c, [foe], row.at, { damagePct: GAVEL.verdict.pct, key: `${c.key}:v${row.index}` })];
  }
  function runeStepGavel(env, state, c, input) {
    const foes = runeLive(input.enemies), commands = [];
    for (const row of runeDue(c, input.now)) commands.push(...runeGavelRow(env, state, c, row, foes));
    runeSettle(c);
    return commands;
  }

  // modules/combat/gem-cast-extensions.mjs
  function registerGemOrbExtensions(controller, env) {
    controller.define(82, { targets: runeReachOf(env, ORB.range), launch: (state, c, enemies) => runeLaunchFrozenOrb(env, state, c, enemies), step: (state, c, input) => runeStepFrozenOrb(env, state, c, input), phase: "frozenOrbPhase" });
    controller.define(83, { targets: (id, source, foes) => runeOrbitReach(env, id, source, foes), launch: (state, c) => runeLaunchOrbit(env, state, c), step: (state, c, input) => runeStepOrbit(env, state, c, input), phase: "orbitPhase" });
  }
  function registerGemMovementExtensions(controller, env) {
    controller.define(84, { targets: (id, source, foes, extra) => runeRiftTargets(env, id, source, foes, extra), launch: (state, c, enemies) => runeLaunchRift(env, state, c, enemies), step: (state, c, input) => runeStepRift(env, state, c, input), phase: "singularityPhase" });
    controller.define(85, { targets: (id, source, foes, extra) => runeIssenTargets(env, id, source, foes, extra), launch: (state, c, enemies) => runeLaunchIssen(env, state, c, enemies), step: (state, c, input) => runeStepIssen(env, state, c, input), phase: "issenPhase" });
    controller.define(86, { targets: (id, source, foes, extra) => runeVoidTargets(env, id, source, foes, extra), launch: (state, c) => runeLaunchVoid(env, state, c), step: (state, c, input) => runeStepVoid(env, state, c, input), phase: "voidPhase" });
  }
  function registerGemRelicExtensions(controller, env) {
    controller.define(87, {
      targets: runeReachOf(env, STORM.range),
      launch: (state, c) => runeLaunchStorm(env, state, c),
      step: (state, c, input) => runeStepStorm(env, state, c, input),
      phase: "stormFlaskPhase",
      thrown: true,
      area: (c) => env.kit.cells(c.aim, "circle", runeStormRadius(env, c))
    });
    controller.define(88, {
      targets: runeReachOf(env, CAULDRON.range),
      launch: (state, c) => runeLaunchCauldron(env, state, c),
      step: (state, c, input) => runeStepCauldron(env, state, c, input),
      phase: "cauldronPhase",
      area: (c) => env.kit.cells(c.aim, "circle", runeCauldronRadius(env, c))
    });
    controller.define(89, { targets: runeReachOf(env, BELL.range), launch: (state, c) => runeLaunchBell(env, state, c), step: (state, c, input) => runeStepBell(env, state, c, input), phase: "bellPhase", area: (c) => env.kit.cells(c.aim, "circle", runeBellRadius(env, c)) });
    controller.define(90, {
      targets: runeReachOf(env, CHANDELIER.range),
      launch: (state, c, enemies) => runeLaunchChandelier(env, state, c, enemies),
      step: (state, c, input) => runeStepChandelier(env, state, c, input),
      phase: "chandelierPhase",
      area: (c) => env.kit.cells(c.aim, "circle", runeChandRadius(env, c))
    });
    controller.define(91, { targets: (id, source, foes, extra) => runeGavelTargets(env, id, source, foes, extra), launch: (state, c, enemies) => runeLaunchGavel(env, state, c, enemies), step: (state, c, input) => runeStepGavel(env, state, c, input), phase: "gavelPhase" });
  }
  function installGemCastExtensions(controller, deps) {
    const env = { kit: controller.kit, deps };
    registerGemOrbExtensions(controller, env);
    registerGemMovementExtensions(controller, env);
    registerGemRelicExtensions(controller, env);
    return Object.freeze({ ORB, ORBIT, RIFT, ISSEN, VOID, STORM, CAULDRON, BELL, CHANDELIER, GAVEL });
  }

  // modules/skill-gem-casts-v313-classic.mjs
  var skillGemCastsV313 = installGemCastExtensions(skillGemCasts, {
    get getGridUnitDistance() {
      return getGridUnitDistance;
    },
    get getGridUnitCells() {
      return getGridUnitCells;
    },
    get getGridUnitCenter() {
      return getGridUnitCenter;
    },
    get rollProjectileExtraShots() {
      return rollProjectileExtraShots;
    },
    get random() {
      return Math.random;
    },
    get getHeroAppearanceId() {
      return getHeroAppearanceId;
    }
  });
  safeExposeGlobals({ skillGemCastsV313 });
})();
