import { incidentRule, incidentDraw, incidentOften, incidentTell, incidentReceipt, incidentNote } from '../combat/incident-common.mjs';

/** 처음 들어선 방에 chance의 확률로(forced면 반드시) 별 하나: 그림(battleFx 'fallingStar')을 띄우고 fallMs 뒤에 닿는다(landStars).
     * 떨어뜨렸는지. */
export function* incidentDropStar(env, run, room, key, { now, forced = false }) {
    const S = incidentRule(env).star;
    if (!forced && incidentDraw(env, 'shower', key) < S.shower.chance * incidentOften(env)) return (yield* incidentStarShower(env, run, room, key, now));
    const roll = forced || incidentDraw(env, 'star', key) < S.chance * incidentOften(env);
    const map = roll && incidentStarRewards(env).length ? env.deps.actExplorationDoors.stageMap(run) : null, cell = map ? incidentStarCell(env, map, room, key) : null;
    if (!cell) return false;
    (yield { kind: 'addBattleFx', args: ['fallingStar', { cell, duration: S.fallMs + S.burstMs }] });
    env.runtime.stars.push({ run, cell, key, at: now + S.fallMs });
    return true;
}

/** 유성우: 별 count개가 방의 서로 다른 칸에 한꺼번에(마지막 하나는 황금률), 알림은 한 번. 떨어뜨렸는지. */
export function* incidentStarShower(env, run, room, key, now) {
    const S = incidentRule(env).star, map = incidentStarRewards(env).length ? env.deps.actExplorationDoors.stageMap(run) : null, cells = [];
    for (let i = 0; map && cells.length < S.shower.count && i < S.shower.count * 3; i++) { // 겹친 칸은 다시 굴린다
        const cell = incidentStarCell(env, map, room, `${key}:shower${i}`);
        if (cell && !cells.some(other => other.gx === cell.gx && other.gy === cell.gy)) cells.push(cell);
    }
    if (!cells.length) return false;
    const count = cells.length;
    for (let index = 0; index < count; index++) {
        if (!(index in cells)) continue;
        const cell = cells[index];
        (yield { kind: 'addBattleFx', args: ['fallingStar', { cell, duration: S.fallMs + S.burstMs }] });
        env.runtime.stars.push({ run, cell, key: `${key}:shower${index}`, at: now + S.fallMs, shower: true, golden: index === cells.length - 1 });
    }
    (yield* incidentTell(env.deps._t('유성우가 쏟아집니다.'), 'chase', true));
    return true;
}

/** 별 하나의 보상 [currency, count]: 유성우의 황금 별은 황금률(떨어질 수 있을 때), 그 밖에는 별똥별 보상에서 하나. */
export function incidentStarLoot(env, star, rows) {
    const golden = incidentRule(env).star.shower.golden;
    return star.golden && env.deps.contentProgression.canDropCurrency(golden[0]) ? golden : rows[Math.floor(incidentDraw(env, 'starLoot', star.key) * rows.length)];
}

/** 방 안쪽의 걸을 수 있는 칸 가운데 영웅에게서 두 칸 넘게 떨어진 곳(열두 번 굴려 처음 맞는 칸). 없으면 null. */
export function incidentStarCell(env, map, room, key) {
    const hero = env.owner.gridPlayer, w = Math.max(1, room.x1 - room.x0 - 1), h = Math.max(1, room.y1 - room.y0 - 1);
    for (let i = 0; i < 12; i++) {
        const cell = { gx: room.x0 + 1 + Math.floor(incidentDraw(env, 'starX', key + i) * w), gy: room.y0 + 1 + Math.floor(incidentDraw(env, 'starY', key + i) * h) };
        if (env.deps.actExplorationMap.walkable(map, cell) && (!hero || env.deps.gridChebyshevDist(cell.gx, cell.gy, hero.gx, hero.gy) > 2)) return cell;
    }
    return null;
}

/** 지금 떨어질 수 있는 별똥별 보상(아직 열리지 않은 재화는 빠진다). */
export function incidentStarRewards(env) { return incidentRule(env).star.rewards.filter(([currency]) => env.deps.contentProgression.canDropCurrency(currency)); }

/** 닿은 별똥별: 그 칸에 떨어질 수 있는 보상에서 하나와 알림. 그 사이 지도를 떠났으면 사라진다. */
export function* incidentLandStars(env, run, now) {
    for (let i = env.runtime.stars.length - 1; i >= 0; i--) {
        if (env.runtime.stars[i].at > now) continue;
        const [star] = env.runtime.stars.splice(i, 1), rows = incidentStarRewards(env);
        if (star.run !== run || !rows.length) continue;
        const [currency, count] = incidentStarLoot(env, star, rows);
        const gained = incidentReceipt(env, () => env.deps.keepCurrencyDrop(star.cell, currency, count)).gain > 0;
        if (star.shower) { if (star.golden) (yield* incidentNote(env, 'shower')); continue; } // 유성우는 시작에 한 번 알렸고, 마지막 별이 닿을 때 센다
        if (!gained) continue;
        (yield* incidentTell(env.deps._t('별똥별이 떨어졌습니다.'), 'reward'));
        (yield* incidentNote(env, 'star'));
    }
}
