import { clampNumber } from '../common/numbers.mjs';
import { SEAL_IMPACT_MS, IMPACT_MS } from './boss-move-values.mjs';

export function moveCellOf(unit) { return { gx: unit.gx, gy: unit.gy }; }

export function moveSteps(from, cell) { return Math.max(Math.abs(cell.gx - from.gx), Math.abs(cell.gy - from.gy)); }

export function movePlain(cell) { return { gx: cell.gx, gy: cell.gy, lane: 0 }; }

export function observerBoundaryX(room, gy) { return room.gx + (gy - room.gy) * .82; }

export function observerSideOf(room, cell) { return cell.gx <= observerBoundaryX(room, cell.gy) ? 'violet' : 'gold'; }

export function observerBox(room, at, rx, ry) {
            const out = [];
            for (let gy = Math.max(room.y0, at.gy - ry); gy <= Math.min(room.y1, at.gy + ry); gy++) {
                for (let gx = Math.max(room.x0, at.gx - rx); gx <= Math.min(room.x1, at.gx + rx); gx++) out.push({ gx, gy });
            }
            return out;
        }

export function observerFloorArea(room, center) {
            const rx = Math.min(4, Math.floor((room.x1 - room.x0) / 2));
            const ry = Math.min(2, Math.floor((room.y1 - room.y0) / 2));
            const focus = {
                gx: clampNumber(center.gx, room.x0 + rx, room.x1 - rx),
                gy: clampNumber(center.gy, room.y0 + ry, room.y1 - ry)
            };
            return observerBox(room, focus, rx, ry);
        }

/** Three adjacent lanes centered on the target, shifted inward at the room edge. */
        export function observerBandStart(value, first, last) { return clampNumber(value - 1, first, last - 2); }

export function observerGroups(room, center, kind) {
            if (kind === 'collapse') return [observerFloorArea(room, center)];
            if (kind === 'mark') {
                return [observerBox(room, center, 3, 3).filter(cell => Math.abs(cell.gx - center.gx) + Math.abs(cell.gy - center.gy) <= 3)];
            }
            const gy = observerBandStart(center.gy, room.y0, room.y1);
            const horizontal = observerBox({ ...room, y0: gy, y1: Math.min(gy + 2, room.y1) }, center, room.x1 - room.x0, 2);
            if (kind === 'sight') return [horizontal];
            const gx = observerBandStart(center.gx, room.x0, room.x1);
            return [horizontal, observerBox({ ...room, x0: gx, x1: Math.min(gx + 2, room.x1) }, center, 2, room.y1 - room.y0)];
        }

export function observerObserverFloorMove(kind) { return kind === 'collapse' || kind === 'seal'; }

export function observerObserverGroups(room, center, kind) {
            if (kind === 'seal') return [observerBox(room, center, 1, 1)];
            return observerGroups(room, center, kind);
        }

/** One hit stage owns both colors. Floods take a whole side and leave an escape lane around the other ray. */
        export function observerColorBands(room, center, state) {
            const kind = state.observerMove;
            if (kind !== 'dualLaser' && kind !== 'dualFlood') return null;
            if (kind === 'dualLaser') return observerTwinRays(room, center);
            const flood = kind === 'dualFlood' ? (state.attackNumber % 2 ? 'gold' : 'violet') : null;
            const first = observerBandStart(center.gy, room.y0, room.y1);
            return ['violet', 'gold'].map(color => color === flood
                ? { color, first: room.y0, last: room.y1, flood: true }
                : { color, first, last: Math.min(first + 2, room.y1), flood: false });
        }

export function observerTwinRays(room, center) {
            const first = clampNumber(center.gy - 1, room.y0, room.y1 - 3);
            const targetHigh = center.gy < first + 2, targetViolet = observerSideOf(room, center) === 'violet';
            const violet = targetHigh === targetViolet ? first + 2 : first;
            const gold = violet === first ? first + 2 : first;
            return [{ color: 'violet', first: violet, last: violet + 1 }, { color: 'gold', first: gold, last: gold + 1 }];
        }

export function observerColorHits({ room, bands }, { gx, gy }) {
            if (gx < room.x0 - .5 || gx >= room.x1 + .5 || gy < room.y0 - .5 || gy >= room.y1 + .5) return false;
            const hit = bands[observerSideOf(room, { gx, gy }) === 'violet' ? 1 : 0];
            return gy >= hit.first - .5 && gy < hit.last + .5;
        }

export function observerColorCells(room, center, bands) {
            return observerBox(room, center, room.x1 - room.x0, room.y1 - room.y0).filter(cell => observerColorHits({ room, bands }, cell));
        }

export function observerImpactMs(area) { return area.observerMove === 'seal' ? SEAL_IMPACT_MS : IMPACT_MS; }

export function observerImpacts(area) { return area.waves.map((cells, i) => ({ ms: observerImpactMs(area) + i * 580, cells: cells.map(cell => ({ ...cell, lane: 0 })) })); }
