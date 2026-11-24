// DOM placement only; coordinates and inventory ownership remain in the domain.
const EDGE_PAD = 4;
const EDGE_GRIP = 12;

function edgeShift(x, half, width) {
    const atEdge = x < EDGE_PAD + EDGE_GRIP || x > width - EDGE_PAD - EDGE_GRIP;
    const reach = atEdge ? Infinity : Math.max(0, half - EDGE_GRIP), left = x - half, right = x + half;
    const want = left < EDGE_PAD ? EDGE_PAD - left : right > width - EDGE_PAD ? width - EDGE_PAD - right : 0;
    return Math.round(Math.max(-reach, Math.min(reach, want)));
}

function setStyle(marker, name, value) {
    if (marker.style.getPropertyValue(name) !== value) marker.style.setProperty(name, value);
}

function armWidth(marker, side) { return marker.querySelector(`.battle-loot-labels.${side}`)?.offsetWidth || 0; }

function measure(marker, labels) {
    marker.classList.remove('cuts-left', 'cuts-right');
    const row = labels.firstElementChild?.offsetHeight || 20;
    const down = marker.querySelector('.battle-loot-labels.is-down');
    marker.dataset.labelRow = String(row);
    marker.dataset.labelHeight = String(labels.offsetHeight || labels.children.length * (row + 2));
    setStyle(marker, '--up-height', marker.dataset.labelHeight + 'px');
    marker.dataset.labelHalf = String(labels.offsetWidth / 2);
    marker.dataset.downHalf = String(down ? down.offsetWidth / 2 : 0);
    marker.dataset.leftWidth = String(armWidth(marker, 'is-left'));
    marker.dataset.rightWidth = String(armWidth(marker, 'is-right'));
}

function hideCutSides(marker, x, width) {
    const left = x - 26, right = x + 26;
    marker.classList.toggle('cuts-left', left - Number(marker.dataset.leftWidth) < 0 || left > width);
    marker.classList.toggle('cuts-right', right < 0 || right + Number(marker.dataset.rightWidth) > width);
}

function place(marker, point, view, entries) {
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
    marker.classList.toggle('is-under', under);
    hideCutSides(marker, x, view.width);
    setStyle(marker, '--label-shift', shift + 'px');
    setStyle(marker, '--down-shift', edgeShift(x, Number(marker.dataset.downHalf), view.width) + 'px');
    stackLabel(marker, { x, y, half, shift, height, under, ceiling: caption, floor: view.height - EDGE_PAD, row: Number(marker.dataset.labelRow) }, entries);
}

function needsPlacement(marker, point) {
    return marker.style.left !== Math.round(point.x) + 'px' || marker.style.top !== Math.round(point.y) + 'px'
        || (!marker.hidden && !marker.dataset.labelRow);
}

function projectEntries(entries, projection, box) {
    const projected = [];
    let changed = false;
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
    projected.forEach(({ marker, point }) => place(marker, point, box, entries));
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
        if (arm) stacks.push({ marker, arm, rank: arm.querySelector('details[open]') ? 2 : Number(!!arm.querySelector('.is-priority')) });
    }
    return stacks.sort((a, b) => b.rank - a.rank);
}

/** Reserve the caption and place each pile's main labels near its picture. Run only after positions or contents change. */
export function packClearedPiles(piles, view) {
    const stacks = clearedStacks(piles);
    const mobile = view.width < 350 ? 207 : 186;
    const bounds = { ...view, top: Math.min(view.height * .5, view.width < 600 ? mobile : 145) };
    const taken = [];
    for (const { marker, arm } of stacks) {
        const x = parseFloat(marker.style.left), y = parseFloat(marker.style.top);
        const w = Number(marker.dataset.labelHalf) * 2, h = Number(marker.dataset.labelHeight);
        const box = closestSlot({ x: Math.round(x - w / 2), y: Math.round(y - 25 - h), w, h }, bounds, taken);
        taken.push(box);
        setStyle(marker, '--floor-stack-x', (box.x - x) + 'px');
        setStyle(marker, '--floor-stack-y', (box.y - y) + 'px');
        arm.classList.add('is-packed');
    }
    placeSecondaryArms(stacks, taken);
}

function placeSecondaryArms(stacks, taken) {
    for (const { marker } of stacks) {
        if (!marker.querySelector('.is-left,.is-right,.is-down')) continue;
        for (const side of marker.querySelectorAll('.is-left,.is-right,.is-down')) side.hidden = false;
        for (const box of armBoxes(marker).filter(b => ['is-left','is-right','is-down'].includes(b.side))) {
            const rect = { x: box.left, y: box.top, w: box.right - box.left, h: box.bottom - box.top };
            if (taken.some(slot => collides(slot, rect))) box.arm.hidden = true;
            else taken.push(rect);
        }
    }
}

function stackLabel(marker, box, entries) {
    const centre = box.x + box.shift;
    const others = [...entries.keys()].filter(other => other !== marker && other.dataset.labelTop);
    const overlaps = top => others.some(other => {
        const otherTop = Number(other.dataset.labelTop);
        return top < otherTop + Number(other.dataset.labelHeight) + 2 && otherTop < top + box.height + 2
            && Math.abs(Number(other.dataset.labelCentre) - centre) < box.half + Number(other.dataset.labelHalf) + 4;
    });
    const base = box.under ? box.y + 24 : box.y - 30 - box.height, step = box.under ? 1 : -1;
    const fits = top => box.under ? top + box.height <= box.floor : top >= box.ceiling;
    let lift = 0;
    while (lift < box.row * 5 && fits(base + step * (lift + box.row + 2)) && overlaps(base + step * lift)) lift += box.row + 2;
    marker.dataset.labelTop = String(base + step * lift);
    marker.dataset.labelCentre = String(centre);
    setStyle(marker, '--label-lift', lift + 'px');
}

function armBoxes(marker) {
    const x = parseFloat(marker.style.left), y = parseFloat(marker.style.top);
    const lift = parseFloat(marker.style.getPropertyValue('--label-lift')) || 0;
    const shift = parseFloat(marker.style.getPropertyValue('--label-shift')) || 0;
    const downShift = parseFloat(marker.style.getPropertyValue('--down-shift')) || 0;
    const under = marker.classList.contains('is-under'), upHeight = Number(marker.dataset.labelHeight) || 0;
    return [...marker.children]
        .filter(arm => String(arm.className).startsWith('battle-loot-labels') && !arm.hidden).map(arm => {
            const w = arm.offsetWidth, h = arm.offsetHeight || arm.children.length * 25;
            const side = arm.className.replace('battle-loot-labels', '').trim();
            if (side === 'is-right') return { arm, side, left: x + 26, right: x + 26 + w, top: y - 3 - h / 2, bottom: y - 3 + h / 2 };
            if (side === 'is-left') return { arm, side, left: x - 26 - w, right: x - 26, top: y - 3 - h / 2, bottom: y - 3 + h / 2 };
            if (side === 'is-down') {
                const top = under ? y + 26 + lift + upHeight : y + 24;
                return { arm, side, left: x - w / 2 + downShift, right: x + w / 2 + downShift, top, bottom: top + h };
            }
            const top = under ? y + 24 + lift : y - 30 - lift - h;
            return { arm, side: 'up', left: x - w / 2 + shift, right: x + w / 2 + shift, top, bottom: top + h };
        });
}

function yieldCrowdedArms(marker, entries) {
    const taken = [...entries.keys()].filter(other => other !== marker).flatMap(armBoxes);
    const hits = box => taken.some(other => box.left < other.right && other.left < box.right && box.top < other.bottom && other.top < box.bottom);
    armBoxes(marker).filter(box => box.side !== 'up' && hits(box)).forEach(box => { box.arm.hidden = true; });
}

function originFor(cell, projection) {
    const point = projection.cellToScreen(cell.gx, cell.gy);
    return { x: point.x, y: point.y + projection.actorGroundOffsetY };
}

export { place, projectEntries, yieldCrowdedArms, originFor };
