import { stumpNeighbors } from './stump-box-geometry.mjs';
import { stumpFindItem } from './stump-box-state.mjs';
import { stumpIsMature, stumpYieldKind } from './stump-box-item-values.mjs';
import { stumpSignature } from './stump-box-board-items.mjs';

export function stumpRowOf(env, cell) { return Math.floor(cell / env.deps.STUMP_BOX_SIZE); }

/** The neighbours across a line: above and below a row's cell, left and right of a column's. */
export function stumpCrossNeighbors(env, cell, axis) { return stumpNeighbors(env, cell).filter(at => (stumpRowOf(env, at) === stumpRowOf(env, cell)) === (axis === 'col')); }

/** Each board cell as the synergies read it: its item, colour, kind (null while it grows), grown and ancient; null for empty cells,
 * talismans and scars. */
export function stumpSynergyCells(box) {
    return box.board.map(id => {
        const item = id === null ? null : stumpFindItem(box, id);
        return item && item.color ? { item, color: item.color, kind: stumpYieldKind(item), grown: stumpIsMature(item), ancient: !!item.ancient } : null;
    });
}

/** Every straight run of `length` cells in a row or column. */
export function stumpRuns(env, length) {
    return env.LINES.flatMap(line => [...Array(env.deps.STUMP_BOX_SIZE - length + 1).keys()].map(start => line.cells.slice(start, start + length)));
}

/** The colour or kind ('color' | 'kind') a run shares (ancient seeds stand for any): '' when all are ancient, null when two meet. */
export function stumpSharedTrait(run, trait) {
    const values = new Set(run.filter(at => !at.ancient).map(at => at[trait]));
    return values.size > 1 ? null : [...values][0] || '';
}

/** The same colour or kind (not ancient) touching the run from outside it. A growing seed has no kind, so it never crowds a kind. */
export function stumpCrowded(env, cells, run, trait, value) {
    return run.some(cell => stumpNeighbors(env, cell).some(at => !run.includes(at) && cells[at] && !cells[at].ancient && cells[at][trait] === value));
}

/** 공명 lines: { color (null for three ancients), cells }. */
export function stumpResonanceLines(env, cells) {
    return stumpRuns(env, env.deps.STUMP_BOX_SYNERGY.resonance.length)
        .filter(run => run.every(cell => cells[cell] && cells[cell].grown))
        .map(run => ({ cells: run, color: stumpSharedTrait(run.map(cell => cells[cell]), 'color') }))
        .filter(run => run.color === '' || (run.color !== null && !stumpCrowded(env, cells, run.cells, 'color', run.color)))
        .map(run => ({ color: run.color || null, cells: run.cells }));
}

/** 계열 공명 lines: { kind, cells }. Three grown, working items of one kind (꽃, 열매, 덩굴, 뿌리) in a straight run, colours free.
 * Ancient seeds stand for any kind and never crowd; three ancients are colour 공명 only. No 반극 immunity: it reads `stopped`. */
export function stumpKinLines(env, cells, stopped) {
    return stumpRuns(env, env.deps.STUMP_BOX_SYNERGY.kin.length)
        .filter(run => run.every(cell => cells[cell] && cells[cell].grown && !stopped.has(cell)))
        .map(run => ({ kind: stumpSharedTrait(run.map(cell => cells[cell]), 'kind'), cells: run }))
        .filter(run => run.kind && !stumpCrowded(env, cells, run.cells, 'kind', run.kind));
}

/** 오행 for one coloured cell: what stops it (상극 beside, or 반극: it overcomes a resonance cell beside) and the cells that feed it. */
export function stumpFiveElementsAt(env, cells, immune, cell) {
    const at = cells[cell], near = stumpNeighbors(env, cell).filter(next => cells[next]);
    const threat = near.find(next => cells[next].color === env.OVERCOMER[at.color]);
    const counter = near.find(next => immune.has(next) && cells[next].color === env.deps.STUMP_BOX_OVERCOMES[at.color]);
    const by = threat !== undefined ? threat : counter;
    return by === undefined ? null : { why: { color: cells[by].color, counter: threat === undefined },
        feeders: near.filter(next => cells[next].color === env.FEEDER[at.color]) };
}

/** Stopped cells (with why) and the 상생 rescues ([rescued, rescuer] cell pairs). Resonance cells never stop. */
export function stumpFiveElements(env, cells, immune) {
    const stopped = new Map(), links = [];
    cells.forEach((at, cell) => {
        const hit = at && !immune.has(cell) ? stumpFiveElementsAt(env, cells, immune, cell) : null;
        if (!hit) return;
        if (hit.feeders.length) hit.feeders.forEach(feeder => links.push([cell, feeder]));
        else stopped.set(cell, hit.why);
    });
    return { stopped, links };
}

/** Five different colours (ancient seeds fill any gap). */
export function stumpAllColors(run) { const real = run.filter(at => !at.ancient).map(at => at.color); return new Set(real).size === real.length; }

/** 규율 lines: a full row or column of five colours, all grown and working, no same colour across it. */
export function stumpDisciplineLines(env, cells, stopped) {
    const sameAcross = (cell, axis) => !cells[cell].ancient
        && stumpCrossNeighbors(env, cell, axis).some(at => cells[at] && !cells[at].ancient && cells[at].color === cells[cell].color);
    return env.LINES.filter(line => line.cells.every(cell => cells[cell] && cells[cell].grown && !stopped.has(cell))
        && stumpAllColors(line.cells.map(cell => cells[cell])) && !line.cells.some(cell => sameAcross(cell, line.axis)));
}

/** Item id → its synergies in SYNERGY_ORDER, from the board's groups (lines, and feed cell pairs). */
export function stumpSynergyTags(env, cells, groups) {
    const tags = {}, add = name => cell => { const id = cells[cell].item.id; (tags[id] = tags[id] || new Set()).add(name); };
    ['resonance', 'kin', 'discipline'].forEach(name => groups[name].forEach(line => line.cells.forEach(add(name))));
    groups.feed.flat().forEach(add('feed'));
    return Object.fromEntries(Object.entries(tags).map(([id, set]) => [id, env.SYNERGY_ORDER.filter(name => set.has(name))]));
}

/** The board's 오행 and synergies now: suppressed ids, stoppedBy (id → { color, counter }), synergy (id → tags),
 * groups (resonance, kin and discipline lines, feed cell pairs) and resonant (colours with a resonance line). */
export function stumpBoardEffects(env, box) {
    const key = stumpSignature(box);
    if (env.effectsMemo.key === key && env.effectsMemo.box === box) return env.effectsMemo.value;
    const cells = stumpSynergyCells(box), resonance = stumpResonanceLines(env, cells);
    const { stopped, links } = stumpFiveElements(env, cells, new Set(resonance.flatMap(line => line.cells)));
    const discipline = stumpDisciplineLines(env, cells, stopped).map(line => ({ axis: line.axis, cells: line.cells }));
    const groups = { resonance, kin: stumpKinLines(env, cells, stopped), discipline, feed: links }, idOf = cell => cells[cell].item.id;
    const value = { suppressed: new Set([...stopped.keys()].map(idOf)),
        stoppedBy: Object.fromEntries([...stopped].map(([cell, why]) => [idOf(cell), why])),
        synergy: stumpSynergyTags(env, cells, groups), groups, resonant: new Set(resonance.map(line => line.color).filter(Boolean)) };
    env.effectsMemo = { key, box, value };
    return value;
}

export function stumpSuppressedIds(env, box) { return stumpBoardEffects(env, box).suppressed; }

/** The colours of the items beside a cell (상하좌우). */
export function stumpNeighbourColors(env, box, cell) {
    return stumpNeighbors(env, cell).map(at => box.board[at]).filter(id => id !== null).map(id => (stumpFindItem(box, id) || {}).color).filter(Boolean);
}

/** The bonus multiplier an item's synergies give (1 without any). */
export function stumpSynergyMul(env, effects, item) {
    return 1 + (effects.synergy[item.id] || []).reduce((sum, name) => sum + env.deps.STUMP_BOX_SYNERGY[name].bonusPct, 0) / 100;
}

/** What changes a placed item's effect now, in the box's words: what stops it, or its bonuses while grown. null otherwise. */
export function stumpBoardNote(env, item, result) {
    const why = result.stoppedBy[item.id];
    if (why) return { text: env.deps._t('비활성화: {label}{value} 인접', { label: env.deps.STUMP_BOX_COLORS[why.color].label, value: why.counter ? env.deps._t(' 공명') : '' }), bad: true };
    const tags = stumpIsMature(item) ? result.synergy[item.id] || [] : [];
    return tags.length ? { text: tags.map(name => `${env.deps.STUMP_BOX_SYNERGY[name].label} +${env.deps.STUMP_BOX_SYNERGY[name].bonusPct}%`).join(', '), bad: false } : null;
}
