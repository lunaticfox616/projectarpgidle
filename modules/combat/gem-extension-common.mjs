

export function runeByNear(env, source) { return (a, b) => env.deps.getGridUnitDistance(source, a) - env.deps.getGridUnitDistance(source, b); }

export function runeLive(enemies) { return enemies.filter(e => e.hp > 0); }

/** 그 적의 칸 가운데 하나라도 둘레(유클리드, 칸) 안에 드는가. */
export function runeWithin(env, e, center, radius) { return env.deps.getGridUnitCells(e).some(p => env.kit.distance(center, p) <= radius); }

export function runeReachOf(env, range) { return (id, source, foes) => foes.filter(e => runeWithin(env, e, source, range)); }

export function runeFaceTo(env, c, foe) { return Math.sign(env.deps.getGridUnitCenter(foe).gx - c.source.gx) || 1; }

export function runeFoeOf(c, enemies) { return enemies.find(e => e.id === c.targetId); }

export function runeCenters(env, foes) { return foes.map(env.deps.getGridUnitCenter); }

/** 줄 세운 일(at 오름차순)에서 때가 된 것을 꺼낸다. */
export function runeDue(c, now) {
    const rows = c.queue.filter(row => row.at <= now);
    c.queue = c.queue.filter(row => row.at > now);
    return rows;
}

export function runeSettle(c) {
    c.done = !c.queue.length;
    if (!c.done) c.nextAt = Math.min(...c.queue.map(row => row.at));
}
