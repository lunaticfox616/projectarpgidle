import { ascendTreeEsc, ascendTreeArtHtml, ascendTreeKeystoneFamily, ascendTreeKeystoneRows, ascendTreeKeystoneReqs, ascendTreeLinkHtml, ascendTreeLinkState } from './ascend-tree-common.mjs';
import { KEYSTONE_TEXT, KEYSTONE_HALF_WIDTH } from './ascend-tree-data.mjs';

export function ascendTreeKeystoneState(runtime, k) {
        if (runtime.deps.game.ascendKeystones.includes(k.id)) return 'taken';
        if (k.fifthJobOnly && !runtime.deps.isAscendKeystoneRequirementMet(k)) return 'fifth';
        if (!runtime.deps.isAscendKeystoneRequirementMet(k)) return 'locked';
        if (runtime.deps.game.ascendKeystones.length >= runtime.deps.CLASS_KEYSTONE_PICK_LIMIT) return 'full';
        return Math.floor(runtime.deps.game.ascendKeystonePoints || 0) > 0 ? 'open' : 'nopoint';
    }

export function ascendTreeKeystoneButton(runtime, k, pos, state) {
        const focused = runtime.focus && runtime.focus.kind === 'keystone' && runtime.focus.id === k.id ? ' is-focus' : '';
        return `<button type="button" class="ascend-node ascend-keystone is-${state}${focused}" style="--x:${pos.x}%;--y:${pos.y}%"
            aria-label="${ascendTreeEsc(runtime, `${runtime.deps._t(k.name)}, ${runtime.deps._t(KEYSTONE_TEXT[state])}`)}" aria-pressed="${state === 'taken'}" data-ascend-kind="keystone" data-ascend-id="${k.id}"
            data-info-tooltip-anchor="1">${ascendTreeArtHtml(runtime, ascendTreeKeystoneFamily(k.desc))}<span class="ascend-plate"><span class="ascend-node-name">${ascendTreeEsc(runtime, runtime.deps._t(k.name))}</span></span></button>`;
    }

export function ascendTreeKeystoneSpots(defs) {
        const fifth = defs.filter(k => k.fifthJobOnly).map(k => k.id);
        const rows = ascendTreeKeystoneRows(defs).map(ids => ids.filter(id => !fifth.includes(id))).filter(ids => ids.length);
        const spots = new Map();
        rows.forEach((ids, row) => ids.forEach((id, index) => {
            const reqs = ascendTreeKeystoneReqs(defs.find(k => k.id === id)).filter(req => spots.has(req)).map(req => spots.get(req).x);
            const x = reqs.length ? reqs.reduce((sum, value) => sum + value, 0) / reqs.length : (index + 0.5) * 100 / ids.length;
            spots.set(id, { x, row });
        }));
        const last = rows.length - 1, taken = [...spots.values()].filter(spot => spot.row === last).map(spot => spot.x);
        const clearance = x => Math.min(...taken.map(other => Math.abs(other - x)), 100);
        const column = [100 / 6, 50, 500 / 6].reduce((best, x) => (clearance(x) > clearance(best) ? x : best));
        const beside = clearance(column) >= KEYSTONE_HALF_WIDTH * 2;
        fifth.forEach(id => spots.set(id, beside ? { x: column, row: last } : { x: 50, row: last + 1 }));
        const count = rows.length + (fifth.length && !beside ? 1 : 0);
        spots.forEach(spot => { spot.y = (spot.row + 0.5) * 100 / count; });
        return { spots, rows: count };
    }

export function ascendTreeKeystoneLinkPoints(from, to, spots) {
        const points = [from];
        const span = to.row - from.row, reach = Math.abs(to.y - from.y) / span * 0.48;
        for (let row = from.row + 1; row < to.row; row++) {
            const y = from.y + (to.y - from.y) * (row - from.row) / span;
            const xAt = at => from.x + (to.x - from.x) * (at - from.y) / (to.y - from.y);
            const straight = xAt(y), passes = [xAt(y - reach), straight, xAt(y + reach)];
            const inRow = [...spots.values()].filter(spot => spot.row === row).map(spot => spot.x).sort((a, b) => a - b);
            if (!inRow.some(x => passes.some(pass => Math.abs(x - pass) < KEYSTONE_HALF_WIDTH))) continue;
            const gaps = [...inRow, 100].map((x, index) => (x + [0, ...inRow][index]) / 2);
            const x = gaps.reduce((best, gap) => (Math.abs(gap - straight) < Math.abs(best - straight) ? gap : best));
            points.push({ x, y: y - reach }, { x, y: y + reach });
        }
        return [...points, to];
    }

export function ascendTreeKeystoneGraphHtml(runtime, defs) {
        if (!defs.length) return '<p class="ascend-muted">이 전직에는 키스톤이 없습니다.</p>';
        const { spots, rows } = ascendTreeKeystoneSpots(defs);
        const states = new Map(defs.map(k => [k.id, ascendTreeKeystoneState(runtime, k)]));
        const links = defs.flatMap(k => ascendTreeKeystoneReqs(k).filter(id => spots.has(id))
            .map(id => ascendTreeLinkHtml(ascendTreeKeystoneLinkPoints(spots.get(id), spots.get(k.id), spots), ascendTreeLinkState(states.get(id), states.get(k.id)))));
        const buttons = defs.map(k => ascendTreeKeystoneButton(runtime, k, spots.get(k.id), states.get(k.id)));
        return `<div class="ascend-graph is-keystones" style="--rows:${rows}"><svg class="ascend-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${links.join('')}</svg>${buttons.join('')}</div>`;
    }
