// DOM placement only; coordinates and inventory ownership remain in the domain.
const EDGE_PAD = 4;
const EDGE_GRIP = 12;
// Space kept between two piles' names, so names that touch read as one pile.
const STACK_GAP = 10;

function edgeShift(x, half, width) {
    const atEdge = x < EDGE_PAD + EDGE_GRIP || x > width - EDGE_PAD - EDGE_GRIP;
    const reach = atEdge ? Infinity : Math.max(0, half - EDGE_GRIP), left = x - half, right = x + half;
    const want = left < EDGE_PAD ? EDGE_PAD - left : right > width - EDGE_PAD ? width - EDGE_PAD - right : 0;
    return Math.round(Math.max(-reach, Math.min(reach, want)));
}

function setStyle(marker, name, value) {
    if (marker.style.getPropertyValue(name) !== value) marker.style.setProperty(name, value);
}

function measure(marker, labels) {
    const row = labels.querySelector('.battle-loot-name')?.offsetHeight || 20;
    marker.dataset.labelRow = String(row);
    marker.dataset.labelHeight = String(labels.offsetHeight || row);
    marker.dataset.labelHalf = String(labels.offsetWidth / 2);
}

/** hero: the hero's body on screen ({ x, y, w, h }, ground-loot-view.mjs heroBox) the names keep off, or null. */
function place(marker, point, view, entries, hero) {
    const x = Math.round(point.x), y = Math.round(point.y);
    setStyle(marker, 'left', x + 'px'); setStyle(marker, 'top', y + 'px');
    const labels = marker.querySelector('.battle-loot-labels');
    if (!labels) return; // a falling picture has no names; a marker whose labels failed to build is rebuilt on the next frame (syncFloor)
    if (marker.hidden) return; // Measure when shown again, not as a zero-width hidden element.
    if (!marker.dataset.labelRow) measure(marker, labels);
    const half = Number(marker.dataset.labelHalf), shift = edgeShift(x, half, view.width);
    const height = Number(marker.dataset.labelHeight);
    // A visible pile whose names cannot fit above it uses the less-clipped side, keeping its first name nearest the picture.
    const caption = marker.classList.contains('in-cleared-room') ? Math.min(view.height * .43, view.width < 600 ? 188 : 145) : EDGE_PAD;
    const above = caption - (y - 30 - height), below = y + 24 + height - (view.height - EDGE_PAD);
    const under = y >= 0 && above > 0 && below < above;
    setStyle(marker, '--label-shift', shift + 'px');
    stackLabel(marker, { x, y, half, shift, height, under, ceiling: caption, floor: view.height - EDGE_PAD }, entries, hero);
}

function needsPlacement(marker, point) {
    return marker.style.left !== Math.round(point.x) + 'px' || marker.style.top !== Math.round(point.y) + 'px'
        || (!marker.hidden && !marker.dataset.labelRow);
}

/** force: place every name again although no pile moved (the hero walked, ground-loot-view.mjs projectLoot). */
function projectEntries(entries, projection, box, hero, force) {
    const projected = [];
    let changed = !!force;
    for (const entry of entries.values()) {
        const point = originFor(entry.cell, projection), marker = entry.marker;
        const off = point.x < -64 || point.y < -64 || point.x > box.width + 64 || point.y > box.height + 64;
        if (marker.hidden !== off) {
            marker.hidden = off; changed = true;
            if (!off) delete marker.dataset.labelRow;
        }
        projected.push({ marker, point });
        if (needsPlacement(marker, point)) changed = true;
    }
    if (!changed) return;
    entries.forEach(entry => { delete entry.marker.dataset.labelTop; });
    projected.forEach(({ marker, point }) => place(marker, point, box, entries, hero));
    return true;
}

function collides(a, b) {
    return a.x < b.x + b.w + 3 && b.x < a.x + a.w + 3 && a.y < b.y + b.h + 3 && b.y < a.y + a.h + 3;
}

function closestSlot(anchor, bounds, taken) {
    const { w, h } = anchor;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const neighbours = taken.slice(-8);
    const xs = [anchor.x, ...neighbours.flatMap(r => [r.x - w - 4, r.x + r.w + 4])];
    const ys = [anchor.y, ...neighbours.flatMap(r => [r.y - h - 4, r.y + r.h + 4])];
    let best, distance = Infinity;
    for (const rawX of xs) for (const rawY of ys) {
        const x = clamp(rawX, EDGE_PAD, bounds.width - w - EDGE_PAD);
        const y = clamp(rawY, bounds.top, bounds.height - h - EDGE_PAD);
        const score = Math.abs(anchor.x - x) + Math.abs(anchor.y - y);
        if (score >= distance || taken.some(box => collides({ x, y, w, h }, box))) continue;
        if (score === 0) return { x, y, w, h };
        best = { x, y, w, h }; distance = score;
    }
    return best || { ...anchor, x: clamp(anchor.x, EDGE_PAD, bounds.width - w - EDGE_PAD), y: clamp(anchor.y, bounds.top, bounds.height - h - EDGE_PAD) };
}

function clearedStacks(piles) {
    const stacks = [];
    for (const { marker } of piles.values()) {
        if (marker.hidden || !marker.classList.contains('in-cleared-room')) continue;
        const arm = marker.querySelector('.battle-loot-labels');
        if (arm) stacks.push({ marker, arm, rank: Number(!!arm.querySelector('.is-priority')) });
    }
    return stacks.sort((a, b) => b.rank - a.rank);
}

/** Reserve the caption and place each pile's names near its picture, off the hero. Run only after positions or contents change. */
export function packClearedPiles(piles, view, hero) {
    const stacks = clearedStacks(piles);
    const mobile = view.width < 350 ? 207 : 186;
    const bounds = { ...view, top: Math.min(view.height * .5, view.width < 600 ? mobile : 145) };
    const taken = hero ? [hero] : [];
    for (const { marker, arm } of stacks) {
        const x = parseFloat(marker.style.left), y = parseFloat(marker.style.top);
        const w = Number(marker.dataset.labelHalf) * 2, h = Number(marker.dataset.labelHeight);
        const box = closestSlot({ x: Math.round(x - w / 2), y: Math.round(y - 25 - h), w, h }, bounds, taken);
        taken.push(box);
        setStyle(marker, '--floor-stack-x', (box.x - x) + 'px');
        setStyle(marker, '--floor-stack-y', (box.y - y) + 'px');
        arm.classList.add('is-packed');
    }
}

/** What a pile's names must clear: the names already placed and the hero's body, as { top, height, centre, half }. */
function blockersFor(marker, entries, hero) {
    const blockers = [...entries.keys()].filter(other => other !== marker && other.dataset.labelTop).map(other => ({
        top: Number(other.dataset.labelTop), height: Number(other.dataset.labelHeight),
        centre: Number(other.dataset.labelCentre), half: Number(other.dataset.labelHalf) }));
    if (hero) blockers.push({ top: hero.y, height: hero.h, centre: hero.x + hero.w / 2, half: hero.w / 2 });
    return blockers;
}

/** Where a pile's names sit on one side of its picture: right by it, never lifted away on a line (2026-11-26 사용자: 위로 늘어나서
 * 선 연장되는거 삭제). clear: they cover no other names nor the hero and stay inside the battlefield. */
function settle(box, blockers, under) {
    const centre = box.x + box.shift, top = under ? box.y + 24 : box.y - 30 - box.height;
    const covers = blockers.some(other => top < other.top + other.height + STACK_GAP && other.top < top + box.height + STACK_GAP
        && Math.abs(other.centre - centre) < box.half + other.half + 4);
    return { top, clear: !covers && (under ? top + box.height <= box.floor : top >= box.ceiling) };
}

/** A clear STACK_GAP between two piles' names shows which names belong together (2026-11-26). Names that find no clear place on
 * their side of the picture take the other side when that one is clear (a crowded phone screen runs out of room above). */
function stackLabel(marker, box, entries, hero) {
    const blockers = blockersFor(marker, entries, hero);
    let under = box.under, spot = settle(box, blockers, under);
    if (!spot.clear) {
        const other = settle(box, blockers, !under);
        if (other.clear) { under = !under; spot = other; }
    }
    marker.classList.toggle('is-under', under);
    marker.dataset.labelTop = String(spot.top);
    marker.dataset.labelCentre = String(box.x + box.shift);
}

function originFor(cell, projection) {
    const point = projection.cellToScreen(cell.gx, cell.gy);
    return { x: point.x, y: point.y + projection.actorGroundOffsetY };
}

export { place, projectEntries, originFor };
