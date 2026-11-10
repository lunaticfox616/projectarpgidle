/** 스킬 전체 전달본 V3.13(2026-11-08)의 새 룬 열의 판정: 82 절대 영도, 83 전도성 형상체, 84 특이점 분리, 85 일섬, 86 공허의 빙의, 87 병에 담긴 번개,
 * 88 연금 가마솥, 89 거둬 가는 종, 90 탐욕 파문, 91 판결-유죄. 이름, 무기, 속성, 동작 방향은 사용자 결정이고 숫자, 간격은 전달본의 제안 그대로다(시뮬레이터 index.html
 * doFrozenOrb, doOrbit, doSingularity, doIssen, doVoidPossess, nukeLand, doCauldron, doBell, doChandelier, doGavel). 칸은 시뮬레이터의 72×36과 같은 한 칸으로
 * 옮겼다(타원 r칸 = 칸 단위의 원 r칸). 시간은 공격 속도로 줄인다(ms), 날아가는 구체와 서리 화살의 빠르기만 그대로다.
 * js/skill-gem-casts.js의 define으로 붙고 그 도구(kit)를 쓴다. 명령만 돌려주고 피해와 이동은 js/combat.js가 맡는다. 그림은 js/canvas-stage-runes-v313-*.js가 사건을 읽어 그린다.
 * 전달본과 다른 점: 시뮬레이터의 기본 타격이 적을 살짝 미는 밀침은 옮기지 않았다(게임의 칸 위에서는 한 칸 밀기가 된다).
 */
const skillGemCastsV313 = (() => {
    const K = skillGemCasts.kit, TAU = Math.PI * 2;
    const byNear = source => (a, b) => getGridUnitDistance(source, a) - getGridUnitDistance(source, b);
    const live = enemies => enemies.filter(e => e.hp > 0);
    /** 그 적의 칸 가운데 하나라도 둘레(유클리드, 칸) 안에 드는가. */
    const within = (e, center, radius) => getGridUnitCells(e).some(p => K.distance(center, p) <= radius);
    const reachOf = range => (id, source, foes) => foes.filter(e => within(e, source, range));
    const faceTo = (c, foe) => Math.sign(getGridUnitCenter(foe).gx - c.source.gx) || 1;
    const foeOf = (c, enemies) => enemies.find(e => e.id === c.targetId);
    const centers = foes => foes.map(getGridUnitCenter);
    /** 줄 세운 일(at 오름차순)에서 때가 된 것을 꺼낸다. */
    function due(c, now) {
        const rows = c.queue.filter(row => row.at <= now);
        c.queue = c.queue.filter(row => row.at > now);
        return rows;
    }
    function settle(c) {
        c.done = !c.queue.length;
        if (!c.done) c.nextAt = Math.min(...c.queue.map(row => row.at));
    }

    // ---------------------------------------------------------------- 82 절대 영도 (오브 전용 · 냉기 · 주문)
    // 서리 구체가 초당 3.3칸으로 날아가며 0.05초마다 도는 방향(0.62rad씩)으로 서리 화살을 쏘고, 끝에서 서리 화살 16발 고리를 터뜨린다. 서리 화살은 2.6칸을 날아 처음 닿는
    // 적 하나에 22%. 구체 수 = 대상 수(1 + 효과 확장 + 갈래 투사체와 추가 발사): 가까운 서로 다른 적을 하나씩 겨누고 모자라면 보는 쪽으로 부채꼴. 겨눈 적이 있으면 그 적을 1.2칸
    // 지난 자리(3~6칸)에서, 없으면 6칸 끝에서 터진다. 판정은 20ms 걸음으로 본다(추적 사격과 같다). 첫 화살만 연쇄 같은 보조룬의 덧타격을 받는다(전달본: 연쇄 투사체 제외).
    const ORB = Object.freeze({ range: 6, speed: 240 / 72, every: 50, spin: 0.62, nova: 16, past: 1.2, least: 3, stagger: 90, release: 320, fan: 0.24, stepMs: 20,
        bolt: Object.freeze({ reach: 2.6, speed: 520 / 72, pct: 22, hitX: 0.3, hitY: 0.45 }) });
    const BOLT_LIFE = ORB.bolt.reach / ORB.bolt.speed * 1000;
    function orbAim(c, foe, index, missing) {
        const from = c.source;
        if (foe) {
            const p = getGridUnitCenter(foe), angle = Math.atan2(p.gy - from.gy, p.gx - from.gx);
            return { angle, reach: Math.max(ORB.least, Math.min(ORB.range, K.distance(from, p) + ORB.past)) };
        }
        const side = (missing % 2 ? 1 : -1) * Math.ceil((missing + 1) / 2) * ORB.fan;
        return { angle: (c.face > 0 ? 0 : Math.PI) + side, reach: ORB.range };
    }
    function launchFrozenOrb(state, c, enemies) {
        const release = c.at + K.ms(c, ORB.release), first = foeOf(c, enemies);
        const count = 1 + K.grow(c.stats) + K.supportShots(c) + rollProjectileExtraShots(c.stats.projectileExtraShots);
        const aimed = [first, ...reachOf(ORB.range)(82, c.source, live(enemies)).filter(e => e !== first).sort(byNear(c.source))].slice(0, count);
        c.face = faceTo(c, first);
        K.letGo(c, release, release + K.ms(c, 160));
        c.flownTo = release; c.nextAt = release; c.bolted = 0;
        c.orbs = Array.from({ length: count }, (_, i) => {
            const aim = orbAim(c, aimed[i], i, i - aimed.length), start = release + K.ms(c, ORB.stagger * i);
            const orb = { start, ...aim, dur: aim.reach / ORB.speed * 1000, next: start, spin: i * 1.7, bolts: [], nova: false };
            orb.event = K.visual(state, c, 'orb', start, orb.dur + BOLT_LIFE + 200, { orbFrom: K.cell(c.source), orbAngle: aim.angle, orbReach: aim.reach,
                orbSpeed: ORB.speed, orbBolts: orb.bolts, orbSeed: i, orbNovaAt: start + orb.dur, boltSpeed: ORB.bolt.speed, boltLife: BOLT_LIFE });
            return orb;
        });
    }
    const orbSpot = (c, orb, at) => {
        const k = Math.min(Math.max(0, at - orb.start), orb.dur) / 1000 * ORB.speed;
        return { gx: c.source.gx + Math.cos(orb.angle) * k, gy: c.source.gy + Math.sin(orb.angle) * k };
    };
    const shoot = (orb, at, spot, angle) => orb.bolts.push({ at, gx: spot.gx, gy: spot.gy, angle, until: at + BOLT_LIFE, hit: false });
    /** 그 걸음까지 구체가 쏜 화살과, 끝에 닿았으면 고리. */
    function orbShoot(c, orb, now) {
        const end = orb.start + orb.dur;
        for (; orb.next <= Math.min(now, end); orb.next += ORB.every) { orb.spin += ORB.spin; shoot(orb, orb.next, orbSpot(c, orb, orb.next), orb.spin); }
        if (orb.nova || now < end) return;
        orb.nova = true;
        for (let i = 0; i < ORB.nova; i++) shoot(orb, end, orbSpot(c, orb, end), i / ORB.nova * TAU + orb.spin);
    }
    const boltSpot = (bolt, at) => {
        const k = (at - bolt.at) / 1000 * ORB.bolt.speed;
        return { gx: bolt.gx + Math.cos(bolt.angle) * k, gy: bolt.gy + Math.sin(bolt.angle) * k };
    };
    const boltTouches = (spot, e) => getGridUnitCells(e).some(p => Math.abs(p.gx - spot.gx) <= ORB.bolt.hitX && Math.abs(p.gy - spot.gy) <= ORB.bolt.hitY);
    function boltFly(c, bolt, foes, at, index) {
        if (bolt.hit || at < bolt.at || at > bolt.until) return null;
        const spot = boltSpot(bolt, at), foe = foes.find(e => boltTouches(spot, e));
        if (!foe) return null;
        bolt.hit = true; bolt.until = at;
        return K.contact(c, [foe], at, { damagePct: ORB.bolt.pct, key: `${c.key}:o${index}`, noAugment: c.bolted++ > 0 });
    }
    function stepFrozenOrb(state, c, input) {
        const foes = live(input.enemies), commands = [];
        for (; c.flownTo + ORB.stepMs <= input.now; c.flownTo += ORB.stepMs) {
            const at = c.flownTo + ORB.stepMs;
            c.orbs.forEach((orb, index) => {
                if (at < orb.start) return;
                orbShoot(c, orb, at);
                for (const bolt of orb.bolts) { const row = boltFly(c, bolt, foes, at, index); if (row) commands.push(row); }
            });
        }
        c.nextAt = input.now;
        c.done = c.orbs.every(orb => orb.nova && orb.bolts.every(bolt => bolt.hit || bolt.until < c.flownTo));
        return commands;
    }

    // ---------------------------------------------------------------- 83 전도성 형상체 (오브 전용 · 번개 · 주문)
    // 시전할 때마다 번개 구체 하나가 몸 둘레를 돈다(12초). 최대 5개(효과 확장 +1 = 7, +2 = 10). 최대일 때 다시 쓰면 가장 오래된 구체의 시간을 다시 채운다. 구체마다 0.9초에
    // 한 번 3칸(네모) 안의 한 대상에게 정전기 32%: 다른 구체가 방금(0.4초 안) 노린 적은 피해서 흩어 친다. 대상이 없으면 0.2초 뒤 다시 찾는다. 구체들은 첫 시전의 사건 하나에
    // 모인다(orbitOrbs). 룬을 바꾸면 사라진다(js/combat-player-attack.js skillGemRuntimeChanged).
    const ORBIT = Object.freeze({ life: 12000, every: 900, pct: 32, reach: 3, max: Object.freeze([5, 7, 10]), first: 240, firstStep: 110, avoid: 400, retry: 200, release: 320 });
    const orbitMax = stats => { const g = K.grow(stats); return g < ORBIT.max.length ? ORBIT.max[g] : 10 + 3 * (g - 2); };
    const orbitReach = (id, source, foes) => foes.filter(e => getGridUnitCells(e).some(p => Math.max(Math.abs(p.gx - source.gx), Math.abs(p.gy - source.gy)) <= ORBIT.reach));
    function addOrb(owner, at, max) {
        owner.orbs.splice(0, owner.orbs.length, ...owner.orbs.filter(orb => orb.until > at));
        if (owner.orbs.length >= max) {
            const old = owner.orbs.reduce((a, b) => (a.until < b.until ? a : b));
            Object.assign(old, { until: at + ORBIT.life, born: at });
        } else owner.orbs.push({ born: at, until: at + ORBIT.life, next: at + ORBIT.first + (owner.orbs.length % 4) * ORBIT.firstStep, seed: Math.random() * 99, flashAt: -1, target: null, targetAt: -Infinity });
        owner.event.orbitMax = max;
        owner.event.duration = Math.max(...owner.orbs.map(orb => orb.until)) - owner.event.at + 200;
        owner.nextAt = Math.min(...owner.orbs.map(orb => Math.min(orb.next, orb.until)));
    }
    function launchOrbit(state, c) {
        const release = c.at + K.ms(c, ORBIT.release), owner = state.casts.find(cast => cast.id === 83 && !cast.done && cast.orbs);
        K.letGo(c, release, release + K.ms(c, 160));
        if (owner) { addOrb(owner, release, orbitMax(c.stats)); c.done = true; return; }
        c.orbs = [];
        c.event = K.visual(state, c, 'orbit', release, ORBIT.life + 200, { orbitOrbs: c.orbs, orbitMax: orbitMax(c.stats) });
        addOrb(c, release, orbitMax(c.stats));
    }
    function orbitPick(c, orb, foes, now) {
        const taken = new Set(c.orbs.filter(o => o !== orb && o.target !== null && now - o.targetAt < ORBIT.avoid).map(o => o.target));
        const fresh = foes.filter(e => !taken.has(e.id));
        return (fresh.length ? fresh : foes).sort(byNear(c.source))[0] || null;
    }
    /** 구체 하나의 정전기. pool: 노릴 수 있는 적(foes)과 지금(now). */
    function orbitZap(state, c, orb, index, pool) {
        const now = pool.now, foe = orbitPick(c, orb, pool.foes, now);
        if (!foe) { orb.next = now + ORBIT.retry; return null; }
        Object.assign(orb, { next: now + ORBIT.every, target: foe.id, targetAt: now, flashAt: now });
        const spot = getGridUnitCenter(foe);
        K.visual(state, c, 'zap', now, 150, { orbIndex: index, orbSeed: orb.seed, targetCells: [spot], landingCell: spot });
        return K.contact(c, [foe], now, { damagePct: ORBIT.pct, key: `${c.key}:z`, noAugment: true });
    }
    function stepOrbit(state, c, input) {
        const now = input.now;
        c.source = K.cell(input.source);
        c.orbs.splice(0, c.orbs.length, ...c.orbs.filter(orb => orb.until > now));
        if (!c.orbs.length) { c.done = true; return []; }
        const pool = { foes: orbitReach(83, c.source, live(input.enemies)), now }, commands = [];
        c.orbs.forEach((orb, index) => {
            if (orb.next > now) return;
            const row = orbitZap(state, c, orb, index, pool);
            if (row) commands.push(row);
        });
        c.nextAt = Math.min(...c.orbs.map(orb => Math.min(orb.next, orb.until)));
        return commands;
    }

    // ---------------------------------------------------------------- 84 특이점 분리 (대검 전용 · 카오스 · 공격, 강타 동작)
    // 내리그어 앞 1.25~2.75칸(폭 1.5칸, 가운데 2칸)에 세로로 9칸(깊이 ±4.5칸) 혼돈 차원 틈을 연다. 틈 위의 적 100% → 0.09초 뒤 양옆 1.2칸 안 적을 틈 쪽으로 끌어당김 →
    // 0.52초 뒤 특이점 붕괴로 틈 위의 적 60%. 효과 확장 +N = 틈 폭 +0.5N칸, 끌어당김 +0.5N칸.
    const RIFT = Object.freeze({ middle: 2, half: 0.75, depth: 4.5, pull: 1.2, pullAt: 90, close: 520, pct: 60, impact: 630, hold: 200, grow: 0.5 });
    /** 틈의 칸: 가운데 줄(column), 반폭(half), 끌어당기는 반폭(band), 주인공 줄(row). g는 효과 확장. */
    const riftShape = (g, source, face) => {
        const half = RIFT.half + RIFT.grow * g / 2;
        return { column: source.gx + face * RIFT.middle, half, band: half + RIFT.pull + RIFT.grow * g, row: source.gy };
    };
    const inBand = (e, s, width) => getGridUnitCells(e).some(p => Math.abs(p.gx - s.column) <= width && Math.abs(p.gy - s.row) <= RIFT.depth);
    function riftTargets(id, source, foes, extra) {
        const shapes = [-1, 1].map(face => riftShape(extra, source, face));
        return foes.filter(e => shapes.some(s => inBand(e, s, s.band)));
    }
    function launchRift(state, c, enemies) {
        const face = faceTo(c, foeOf(c, enemies)), impact = c.at + K.ms(c, RIFT.impact);
        c.shape = riftShape(K.grow(c.stats), c.source, face);
        K.letGo(c, impact, impact + K.ms(c, RIFT.hold));
        c.queue = [{ at: impact, kind: 'cut' }, { at: impact + K.ms(c, RIFT.pullAt), kind: 'pull' }, { at: impact + K.ms(c, RIFT.close), kind: 'collapse' }];
        c.nextAt = impact;
        K.visual(state, c, 'rift', impact, K.ms(c, RIFT.close) + 220, { riftColumn: c.shape.column, riftHalf: c.shape.half, riftTop: c.shape.row - RIFT.depth,
            riftBottom: c.shape.row + RIFT.depth, riftClose: K.ms(c, RIFT.close), riftFace: face });
    }
    function riftRow(state, c, row, foes) {
        const s = c.shape, onLine = foes.filter(e => inBand(e, s, s.half));
        if (row.kind === 'pull') {
            const pulled = foes.filter(e => inBand(e, s, s.band) && !onLine.includes(e));
            return pulled.length ? [{ type: 'pull', targets: pulled.map(e => e.id), at: row.at, column: s.column, cells: Math.ceil(s.band - s.half) }] : [];
        }
        if (row.kind === 'collapse') K.visual(state, c, 'collapse', row.at, 420, { riftColumn: s.column, riftTop: s.row - RIFT.depth, riftBottom: s.row + RIFT.depth });
        return onLine.length ? [K.contact(c, onLine, row.at, { damagePct: row.kind === 'collapse' ? RIFT.pct : 100, key: `${c.key}:${row.kind}` })] : [];
    }
    function stepRift(state, c, input) {
        const foes = live(input.enemies), commands = [];
        for (const row of due(c, input.now)) commands.push(...riftRow(state, c, row, foes));
        settle(c);
        return commands;
    }

    // ---------------------------------------------------------------- 85 일섬 (대검 전용 · 물리 · 공격, 대검 전용 돌진 베기 동작)
    // 그 줄(깊이 ±0.6칸, 효과 확장 +N = +0.25N칸) 화면 끝에서 끝까지 흰 선이 0.07초에 뻗고, 0.22초 뒤 그 줄의 적이 한꺼번에 베인다. 베임 자국은 가까운 6명까지.
    // 판정은 앞뒤 10칸이다(전달본 14칸): 룬 사거리는 9×8 판의 대각선을 넘지 않는다(scripts/smoke-grid-combat.js), 무대 화면도 그보다 좁다.
    const ISSEN = Object.freeze({ reach: 10, depth: 0.6, grow: 0.25, delay: 220, impact: 350, hold: 200, cuts: 6 });
    const issenBand = (source, depth) => e => getGridUnitCells(e).some(p => Math.abs(p.gy - source.gy) <= depth && Math.abs(p.gx - source.gx) <= ISSEN.reach);
    const issenDepth = extra => ISSEN.depth + ISSEN.grow * extra;
    function issenTargets(id, source, foes, extra) { return foes.filter(issenBand(source, issenDepth(extra))); }
    function launchIssen(state, c, enemies) {
        const face = faceTo(c, foeOf(c, enemies)), impact = c.at + K.ms(c, ISSEN.impact), delay = K.ms(c, ISSEN.delay);
        c.depth = issenDepth(K.grow(c.stats)); c.face = face;
        K.letGo(c, impact, impact + K.ms(c, ISSEN.hold));
        c.nextAt = impact + delay;
        K.visual(state, c, 'line', impact, delay + 260, { issenRow: c.source.gy, issenDepth: c.depth, issenDelay: delay, issenFace: face, issenReach: ISSEN.reach });
    }
    function stepIssen(state, c, input) {
        const hit = live(input.enemies).filter(issenBand(c.source, c.depth)).sort(byNear(c.source));
        c.done = true;
        if (!hit.length) return [];
        K.visual(state, c, 'cut', c.nextAt, 400, { targetCells: centers(hit.slice(0, ISSEN.cuts)), issenFace: c.face });
        return [K.contact(c, hit, c.nextAt)];
    }

    // ---------------------------------------------------------------- 86 공허의 빙의 (함성 · 카오스)
    // 외치면 둘레 3칸(효과 확장 +N칸) 안 적을 몸 쪽으로 끌어당기고(바로 옆 칸까지, 칸 위에서는 두 걸음까지), 공허의 혼이 적마다 0.04초 + 0.03초 간격으로 날아가
    // 0.3초 + 0.03초 간격에 깃들며 100% → 약화 4초: 받는 피해 +20%(js/combat.js, 다시 걸면 시간만 새로). 약화된 적은 한 사건(voidTargets)에 모인다.
    const VOID = Object.freeze({ radius: 3, pullCells: 2, spirit: 40, hit: 300, gap: 30, weak: 4000, impact: 400, hold: 200, fly: 260 });
    const voidRadius = extra => VOID.radius + extra;
    function voidTargets(id, source, foes, extra) { return foes.filter(e => within(e, source, voidRadius(extra))); }
    function launchVoid(state, c) {
        const impact = c.at + K.ms(c, VOID.impact);
        K.letGo(c, impact, impact + K.ms(c, VOID.hold));
        c.queue = [{ at: impact, kind: 'shout' }];
        c.nextAt = impact;
    }
    function voidShout(state, c, row, foes) {
        const radius = voidRadius(K.grow(c.stats)), list = foes.filter(e => within(e, c.source, radius)).sort(byNear(c.source)), spot = K.cell(c.source);
        K.visual(state, c, 'pull', row.at, 420, { voidCenter: spot, voidRadius: radius });
        list.forEach((foe, i) => {
            K.visual(state, c, 'spirit', row.at + K.ms(c, VOID.spirit + i * VOID.gap), VOID.fly, { sourceCell: spot, landingCell: getGridUnitCenter(foe), targetCells: [getGridUnitCenter(foe)], spiritIndex: i });
            c.queue.push({ at: row.at + K.ms(c, VOID.hit + i * VOID.gap), kind: 'possess', id: foe.id, index: i });
        });
        const far = list.filter(e => getGridUnitDistance(c.source, e) > 1);
        return far.length ? [{ type: 'pull', targets: far.map(e => e.id), at: row.at, center: spot, cells: VOID.pullCells }] : [];
    }
    /** 약화된 적의 표시: 한 사건에 모아 시간만 새로 한다(신성한 안개의 markMistTargets와 같은 길). */
    function markWeak(state, c, foe, at) {
        const open = state.voidWeak && at < state.voidWeak.at + state.voidWeak.duration;
        if (!open) state.voidWeak = K.visual(state, c, 'weak', at, VOID.weak, { voidTargets: [] });
        const rows = new Map(state.voidWeak.voidTargets.filter(row => row.expiresAt > at).map(row => [row.id, row]));
        rows.set(foe.id, { id: foe.id, appliedAt: rows.get(foe.id)?.appliedAt ?? at, expiresAt: at + VOID.weak });
        state.voidWeak.voidTargets = [...rows.values()];
        state.voidWeak.duration = at + VOID.weak - state.voidWeak.at;
    }
    function voidPossess(state, c, row, foes) {
        const foe = foes.find(e => e.id === row.id);
        if (!foe) return [];
        markWeak(state, c, foe, row.at);
        return [K.contact(c, [foe], row.at, { key: `${c.key}:${row.index}` }), { type: 'weaken', targets: [foe.id], at: row.at, ms: VOID.weak }];
    }
    function stepVoid(state, c, input) {
        const foes = live(input.enemies), commands = [];
        for (const row of due(c, input.now)) commands.push(...(row.kind === 'shout' ? voidShout(state, c, row, foes) : voidPossess(state, c, row, foes)));
        settle(c);
        return commands;
    }

    // ---------------------------------------------------------------- 87 병에 담긴 번개 (플라스크 전용 · 번개 · 주문)
    // 정전기 병을 5칸 안으로 던진다 → 깨진 자리로 정전기가 0.18초 모인다 → 거대한 낙뢰 한 번: 둘레 2칸(효과 확장 +N칸) 안 적 모두 200%. 같은 때 병이 여럿(갈래 투사체,
    // 추가 발사)이면 낙뢰를 0.2초씩 밀어 하나씩 내리꽂는다(밝기 겹침 방지, state.stormNext). 지대나 지속 피해는 없다.
    const STORM = Object.freeze({ range: 5, radius: 2, charge: 180, stagger: 200, pct: 200 });
    const stormRadius = c => STORM.radius + K.grow(c.stats);
    function launchStorm(state, c) { K.launchFlask(state, c); c.index = 0; }
    function stepStorm(state, c, input) {
        if (!c.index) {
            const boltAt = Math.max(c.nextAt + K.ms(c, STORM.charge), state.stormNext || 0);
            state.stormNext = boltAt + STORM.stagger;
            K.visual(state, c, 'charge', c.nextAt, boltAt - c.nextAt + 40, { landingCell: K.cell(c.aim), stormRadius: stormRadius(c) });
            c.index = 1; c.nextAt = boltAt;
            return [];
        }
        c.done = true;
        K.visual(state, c, 'bolt', c.nextAt, 820, { landingCell: K.cell(c.aim), stormRadius: stormRadius(c) });
        return [K.contact(c, K.area(input.enemies, c.aim, 'circle', stormRadius(c)), c.nextAt, { damagePct: STORM.pct })];
    }

    // ---------------------------------------------------------------- 88 연금 가마솥 (플라스크 전용 · 카오스 · 주문, 긴 시전)
    // 6칸 안 대상 머리 위에 가마솥이 나타나 0.26초 뒤 기울어 물약을 쏟는다 → 0.13초 뒤 땅에 닿는 순간 둘레 2.5칸(효과 확장 +N칸) 안 적 80% → 0.25초마다 50%, 50%.
    // 웅덩이는 쏟기가 끝나면 증발한다(지대나 지속 피해 없음).
    const CAULDRON = Object.freeze({ range: 6, radius: 2.5, pour: 260, fall: 130, every: 250, pcts: Object.freeze([80, 50, 50]), impact: 840, hold: 200 });
    const cauldronRadius = c => CAULDRON.radius + K.grow(c.stats);
    function launchCauldron(state, c) {
        const impact = c.at + K.ms(c, CAULDRON.impact), pour = K.ms(c, CAULDRON.pour), fall = K.ms(c, CAULDRON.fall), every = K.ms(c, CAULDRON.every);
        K.letGo(c, impact, impact + K.ms(c, CAULDRON.hold));
        c.index = 0; c.every = every; c.nextAt = impact + pour + fall;
        K.visual(state, c, 'cauldron', impact, pour + fall + every * (CAULDRON.pcts.length - 1) + 1080, { landingCell: K.cell(c.aim), cauldronRadius: cauldronRadius(c),
            cauldronPour: pour, cauldronFall: fall, cauldronEvery: every, cauldronHits: CAULDRON.pcts.length, cauldronDir: Math.random() < 0.5 ? 1 : -1 });
    }
    function stepCauldron(state, c, input) {
        const hit = K.area(input.enemies, c.aim, 'circle', cauldronRadius(c)), at = c.nextAt, index = c.index++;
        if (!index && hit.length) K.visual(state, c, 'splash', at, 400, { targetCells: centers(hit) });
        c.done = c.index >= CAULDRON.pcts.length;
        if (!c.done) c.nextAt += c.every;
        return hit.length ? [K.contact(c, hit, at, { damagePct: CAULDRON.pcts[index], key: `${c.key}:${index}` })] : [];
    }

    // ---------------------------------------------------------------- 89 거둬 가는 종 (향로 전용 · 물리 · 주문)
    // 6칸 안 대상 위에 금빛 성당 종이 0.22초에 내려와 0.3초, 0.75초에 울린다. 울릴 때마다 둘레 3칸(효과 확장 +N칸) 안 적에게 120%, 80% × 거리 배율(가운데 100% → 끝 35%,
    // 곧게 줄어듦). 음파가 0.32초에 끝까지 퍼지므로 먼 적일수록 늦게 맞는다(거리 비율 × 0.32초).
    const BELL = Object.freeze({ range: 6, radius: 3, drop: 220, tolls: Object.freeze([300, 750]), pcts: Object.freeze([120, 80]), least: 35, wave: 320, impact: 320, hold: 200 });
    const bellRadius = c => BELL.radius + K.grow(c.stats);
    function launchBell(state, c) {
        const impact = c.at + K.ms(c, BELL.impact), tolls = BELL.tolls.map(t => K.ms(c, t)), wave = K.ms(c, BELL.wave);
        K.letGo(c, impact, impact + K.ms(c, BELL.hold));
        c.wave = wave;
        c.queue = tolls.map((t, i) => ({ at: impact + t, kind: 'toll', index: i }));
        c.nextAt = c.queue[0].at;
        K.visual(state, c, 'bell', impact, tolls[tolls.length - 1] + wave + 520, { landingCell: K.cell(c.aim), bellRadius: bellRadius(c), bellDrop: K.ms(c, BELL.drop),
            bellTolls: tolls, bellWave: wave });
    }
    function bellToll(state, c, row, foes) {
        const radius = bellRadius(c);
        for (const foe of foes.filter(e => within(e, c.aim, radius))) {
            const d = Math.min(1, K.distance(getGridUnitCenter(foe), c.aim) / radius), mul = 1 - (1 - BELL.least / 100) * d;
            c.queue.push({ at: row.at + Math.round(d * c.wave), kind: 'hit', id: foe.id, pct: BELL.pcts[row.index] * mul, index: row.index });
        }
        return state.visuals === false ? [] : [{ type: 'bellToll' }];
    }
    function bellHit(c, row, foes) {
        const foe = foes.find(e => e.id === row.id);
        return foe ? [K.contact(c, [foe], row.at, { damagePct: row.pct, key: `${c.key}:${row.index}` })] : [];
    }
    function stepBell(state, c, input) {
        const foes = live(input.enemies), commands = [];
        for (const row of due(c, input.now)) commands.push(...(row.kind === 'toll' ? bellToll(state, c, row, foes) : bellHit(c, row, foes)));
        settle(c);
        return commands;
    }

    // ---------------------------------------------------------------- 90 탐욕 파문 (향로 전용 · 물리 + 화염 · 공격, 강타 동작)
    // 향로를 내려찍는 순간(파문심판과 같은 장) 5칸 안 대상 위에 샹들리에가 매달려 0.14초 흔들리다 사슬이 끊어져 0.22초에 떨어진다. 부딪히는 순간 둘레 2칸(효과 확장 +N칸)
    // 안 적 모두 200% = 물리 100% + 0.07초 뒤 화염 100%(숫자가 겹치지 않게).
    const CHANDELIER = Object.freeze({ range: 5, radius: 2, hang: 140, fall: 220, pct: 100, fireLag: 70, contact: 540, frame: 6, mageContact: 630, mageFrame: 7, hold: 140 });
    const chandRadius = c => CHANDELIER.radius + K.grow(c.stats);
    function launchChandelier(state, c, enemies) {
        const mage = getHeroAppearanceId() === 'occultist', impact = c.at + K.ms(c, mage ? CHANDELIER.mageContact : CHANDELIER.contact);
        const hang = K.ms(c, CHANDELIER.hang), fall = K.ms(c, CHANDELIER.fall);
        K.letGo(c, impact, impact + K.ms(c, CHANDELIER.hold));
        c.swing.contactFrame = mage ? CHANDELIER.mageFrame : CHANDELIER.frame;
        c.index = 0; c.nextAt = impact + hang + fall;
        K.visual(state, c, 'chandelier', impact, hang + fall + 1100, { landingCell: K.cell(c.aim), chandRadius: chandRadius(c), chandHang: hang, chandFall: fall,
            chandFace: faceTo(c, foeOf(c, enemies)) });
    }
    function stepChandelier(state, c, input) {
        if (!c.index) {
            const hit = K.area(input.enemies, c.aim, 'circle', chandRadius(c)), at = c.nextAt;
            c.struck = hit.map(e => e.id); c.index = 1; c.nextAt = at + K.ms(c, CHANDELIER.fireLag); c.done = !hit.length;
            return hit.length ? [K.contact(c, hit, at, { damagePct: CHANDELIER.pct, key: `${c.key}:phys` })] : [];
        }
        c.done = true;
        const burn = live(input.enemies).filter(e => c.struck.includes(e.id));
        if (!burn.length) return [];
        K.visual(state, c, 'burn', c.nextAt, 360, { targetCells: centers(burn) });
        return [K.contact(c, burn, c.nextAt, { damagePct: CHANDELIER.pct, key: `${c.key}:fire`, attackOptions: { ...c.attackOptions, forcedElement: 'fire' } })];
    }

    // ---------------------------------------------------------------- 91 판결-유죄 (향로 전용 · 번개 · 주문)
    // 앞에 금빛 판결봉이 0.15초에 서서 나타났다가 0.17초에 앞으로 넘어지며 내리찍는다 → 전방 9칸(앞 0.5~3.5칸 × 깊이 ±1.5칸, 효과 확장 +N = 깊이 +0.25N칸) 안 적 모두 120%
    // → 0.2초 뒤 맞은 적마다 0.045초 간격으로 하늘에서 '유죄'의 낙뢰, 낙뢰가 닿고 0.05초 뒤 60%.
    const GAVEL = Object.freeze({ near: 0.5, far: 3.5, depth: 1.5, grow: 0.25, length: 2.3, windup: 150, swing: 170, pct: 120, impact: 320, hold: 200,
        verdict: Object.freeze({ delay: 200, gap: 45, pct: 60, lag: 50 }) });
    const gavelDepth = extra => GAVEL.depth + GAVEL.grow * extra;
    const gavelBox = (source, face, depth) => e => getGridUnitCells(e).some(p => {
        const ahead = (p.gx - source.gx) * face;
        return ahead >= GAVEL.near && ahead <= GAVEL.far && Math.abs(p.gy - source.gy) <= depth;
    });
    function gavelTargets(id, source, foes, extra) { return foes.filter(e => [-1, 1].some(face => gavelBox(source, face, gavelDepth(extra))(e))); }
    function gavelCells(source, face, depth) {
        const out = [], rows = Math.floor(depth);
        for (let ahead = Math.ceil(GAVEL.near); ahead < GAVEL.far; ahead++) for (let dy = -rows; dy <= rows; dy++) out.push({ gx: source.gx + face * ahead, gy: source.gy + dy });
        return out;
    }
    function launchGavel(state, c, enemies) {
        const face = faceTo(c, foeOf(c, enemies)), impact = c.at + K.ms(c, GAVEL.impact), windup = K.ms(c, GAVEL.windup), swing = K.ms(c, GAVEL.swing);
        c.face = face; c.depth = gavelDepth(K.grow(c.stats));
        K.letGo(c, impact, impact + K.ms(c, GAVEL.hold));
        c.queue = [{ at: impact + windup + swing, kind: 'slam' }];
        c.nextAt = c.queue[0].at;
        K.visual(state, c, 'gavel', impact, windup + swing + 820, { gavelFace: face, gavelLength: GAVEL.length, gavelWindup: windup, gavelSwing: swing,
            gavelDepth: c.depth, gavelCells: gavelCells(c.source, face, c.depth) });
    }
    function gavelRow(state, c, row, foes) {
        if (row.kind === 'slam') {
            const hit = foes.filter(gavelBox(c.source, c.face, c.depth)).sort(byNear(c.source)), start = row.at + K.ms(c, GAVEL.verdict.delay);
            hit.forEach((foe, i) => c.queue.push({ at: start + K.ms(c, GAVEL.verdict.gap * i), kind: 'bolt', id: foe.id, index: i }));
            return hit.length ? [K.contact(c, hit, row.at, { damagePct: GAVEL.pct, key: `${c.key}:slam` })] : [];
        }
        const foe = foes.find(e => e.id === row.id);
        if (!foe) return [];
        if (row.kind === 'bolt') {
            K.visual(state, c, 'verdict', row.at, 400, { targetCells: [getGridUnitCenter(foe)], landingCell: getGridUnitCenter(foe) });
            c.queue.push({ ...row, at: row.at + K.ms(c, GAVEL.verdict.lag), kind: 'guilty' });
            return [];
        }
        return [K.contact(c, [foe], row.at, { damagePct: GAVEL.verdict.pct, key: `${c.key}:v${row.index}` })];
    }
    function stepGavel(state, c, input) {
        const foes = live(input.enemies), commands = [];
        for (const row of due(c, input.now)) commands.push(...gavelRow(state, c, row, foes));
        settle(c);
        return commands;
    }

    // ---------------------------------------------------------------- 등록
    skillGemCasts.define(82, { targets: reachOf(ORB.range), launch: launchFrozenOrb, step: stepFrozenOrb, phase: 'frozenOrbPhase' });
    skillGemCasts.define(83, { targets: orbitReach, launch: launchOrbit, step: stepOrbit, phase: 'orbitPhase' });
    skillGemCasts.define(84, { targets: riftTargets, launch: launchRift, step: stepRift, phase: 'singularityPhase' });
    skillGemCasts.define(85, { targets: issenTargets, launch: launchIssen, step: stepIssen, phase: 'issenPhase' });
    skillGemCasts.define(86, { targets: voidTargets, launch: launchVoid, step: stepVoid, phase: 'voidPhase' });
    skillGemCasts.define(87, { targets: reachOf(STORM.range), launch: launchStorm, step: stepStorm, phase: 'stormFlaskPhase', thrown: true,
        area: c => K.cells(c.aim, 'circle', stormRadius(c)) });
    skillGemCasts.define(88, { targets: reachOf(CAULDRON.range), launch: launchCauldron, step: stepCauldron, phase: 'cauldronPhase',
        area: c => K.cells(c.aim, 'circle', cauldronRadius(c)) });
    skillGemCasts.define(89, { targets: reachOf(BELL.range), launch: launchBell, step: stepBell, phase: 'bellPhase', area: c => K.cells(c.aim, 'circle', bellRadius(c)) });
    skillGemCasts.define(90, { targets: reachOf(CHANDELIER.range), launch: launchChandelier, step: stepChandelier, phase: 'chandelierPhase',
        area: c => K.cells(c.aim, 'circle', chandRadius(c)) });
    skillGemCasts.define(91, { targets: gavelTargets, launch: launchGavel, step: stepGavel, phase: 'gavelPhase' });
    /** 무대가 쓰는 값: 서리 화살의 길이와 판결봉 칸(그림이 시간표를 다시 계산하지 않게). */
    return Object.freeze({ ORB, ORBIT, RIFT, ISSEN, VOID, STORM, CAULDRON, BELL, CHANDELIER, GAVEL });
})();
safeExposeGlobals({ skillGemCastsV313 });
