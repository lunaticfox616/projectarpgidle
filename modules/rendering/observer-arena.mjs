import { sceneEase } from './observer-scene-ease.mjs';

class ObserverArena {
    constructor(deps, scene) {
        this.deps = deps;
        this.scene = scene;

        this.OBSERVER_PAINT = { violet: '#cfb0fc', pearl: '#f7e7ff', gold: '#ffda76', ink: '#251c38',
            silver: '#e4edf3', glass: '#a8dbe2' };
    }

    drawObserverArena(owner, ctx, projection, now) {
        if (owner.currentZoneId !== this.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID) return;
        const split = this.observerReveal(owner, now);
        if (!split) return;
        const { room, age, revealing } = split;
        const top = projection.cellToScreen(room.x0 - .5, room.y0 - .5);
        const bottom = projection.cellToScreen(room.x1 + .5, room.y1 + .5);
        const a = projection.cellToScreen(this.deps.bossMoves.observer.boundaryX(room, room.y0 - .5), room.y0 - .5);
        const b = projection.cellToScreen(this.deps.bossMoves.observer.boundaryX(room, room.y1 + .5), room.y1 + .5);
        ctx.save();
        ctx.globalAlpha = revealing ? sceneEase(age / 570) : 1;
        this.paintObserverSide(ctx, a, b, top.x, 'violet');
        this.paintObserverSide(ctx, a, b, bottom.x, 'gold');
        ctx.globalAlpha = 1;
        this.paintObserverRift(ctx, a, b, revealing ? age : 920);
        if (!revealing && age < 3000) {
            this.observerSideText(ctx, this.deps._t('보라색 공격 안전'), (a.x + top.x) / 2, top.y + 19, this.OBSERVER_PAINT.violet);
            this.observerSideText(ctx, this.deps._t('노란색 공격 안전'), (a.x + bottom.x) / 2, top.y + 19, this.OBSERVER_PAINT.gold);
        }
        ctx.restore();
    }

    observerReveal(owner, now) {
        const scene = this.scene.observerScene();
        if (scene) return scene.age < scene.cue.reveal ? null : { room: scene.room, age: scene.age - scene.cue.reveal, revealing: true };
        const enemy = owner.enemies.find(enemy => enemy.monsterVisualId === 'pinnacle_observer');
        const boundary = enemy && this.deps.bossMoves.observer.boundary(enemy);
        return boundary ? { room: boundary.room, age: Math.max(0,now-boundary.started), revealing: false } : null;
    }

    paintObserverSide(ctx, a, b, edge, color) {
        const tint = ctx.createLinearGradient(edge, 0, (a.x + b.x) / 2, 0);
        tint.addColorStop(0, this.OBSERVER_PAINT[color] + '10');
        tint.addColorStop(1, this.OBSERVER_PAINT[color] + '34');
        this.observerPath(ctx, [[edge, a.y], [a.x, a.y], [b.x, b.y], [edge, b.y]], true);
        ctx.fillStyle = tint;
        ctx.fill();
    }

    paintObserverRift(ctx, a, b, age) {
        const reduced = this.deps.uiDisplay.reducedEffects(), scale = reduced ? 1 : Math.min(1, age / 560);
        const flash = reduced ? 0 : Math.max(0, 1 - age / 920);
        const points = [0, .15, .27, .43, .58, .76, .87, 1].map((t, i) =>
            [a.x + (b.x - a.x) * t * scale + [0,-6,2,-4,6,-2,3,0][i], a.y + (b.y - a.y) * t * scale]);
        this.observerPath(ctx, points);
        ctx.strokeStyle = '#1c0e2b';
        ctx.lineWidth = 8 + 10 * flash;
        ctx.stroke();
        ctx.strokeStyle = '#e0a8fb';
        ctx.lineWidth = 2.5 + flash * 4;
        ctx.stroke();
        ctx.strokeStyle = '#fff1c2';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (!reduced && scale < 1 && age > 0) this.paintRiftFront(ctx, points.at(-1), flash);
    }

    paintRiftFront(ctx, [x,y], flash) {
        const light = ctx.createRadialGradient(x,y,2,x,y,38);
        light.addColorStop(0,'#fff5d2');
        light.addColorStop(.25,'#e6baffad');
        light.addColorStop(1,'#a26dff00');
        ctx.globalAlpha = .46 + flash*.3;
        ctx.fillStyle = light;
        ctx.fillRect(x-38,y-38,76,76);
        ctx.globalAlpha = 1;
    }

    observerSideText(ctx, label, x, y, color) {
        ctx.font = `bold 12px ${this.deps.battlePixelFont()}`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#211429';
        ctx.fillStyle = color;
        ctx.strokeText(label, x, y);
        ctx.fillText(label, x, y);
    }

    paintObserverBand(ctx, projection, room, band, look) {
        const top = band.first - .5, bottom = band.last + .5;
        const a = projection.cellToScreen(this.deps.bossMoves.observer.boundaryX(room, top), top);
        const b = projection.cellToScreen(this.deps.bossMoves.observer.boundaryX(room, bottom), bottom);
        const edge = projection.cellToScreen(band.color === 'violet' ? room.x1 + .5 : room.x0 - .5, top).x;
        const color = this.OBSERVER_PAINT[band.color], { progress, hit } = look;
        const left = Math.min(edge, a.x, b.x), right = Math.max(edge, a.x, b.x);
        ctx.save();
        this.observerPath(ctx, [[edge,a.y],[a.x,a.y],[b.x,b.y],[edge,b.y]], true);
        ctx.fillStyle = '#171020';
        ctx.globalAlpha = hit ? progress * .54 : .43;
        ctx.fill();
        ctx.fillStyle = color;
        ctx.globalAlpha = hit ? progress * .62 : .25 + progress * .19;
        ctx.fill();
        ctx.globalAlpha = hit ? progress : .82 + progress * .18;
        ctx.strokeStyle = color;
        ctx.lineWidth = hit ? 4 : 2.5;
        ctx.stroke();
        ctx.clip();
        this.paintObserverBandCore(ctx, { left, right, top: a.y, bottom: b.y }, color, band.flood, look);
        ctx.restore();
    }

    paintObserverBandCore(ctx, box, color, flood, { progress, hit, strength = 1 }) {
        const height = box.bottom - box.top, width = box.right - box.left;
        const y = box.top + height * (flood ? (hit ? 1 - progress : progress) : .5);
        const size = hit ? Math.max(12, height * (flood ? .16 : .46)) : Math.max(5, height * .13);
        const core = ctx.createLinearGradient(0, y-size, 0, y+size);
        core.addColorStop(0, color + '00');
        core.addColorStop(.43, color);
        core.addColorStop(.5, '#fff7e9');
        core.addColorStop(.57, color);
        core.addColorStop(1, color + '00');
        ctx.fillStyle = core;
        ctx.globalAlpha = (hit ? progress : .53 + progress * .35) * strength;
        ctx.fillRect(box.left, y-size, width, size*2);
        if (!hit && flood) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            for (let x = box.left + 26; x < box.right; x += 75) {
                this.observerPath(ctx, [[x-6,y-7],[x,y],[x+6,y-7]]);
                ctx.stroke();
            }
        }
    }

    paintObserverBands(ctx, projection, area, look) {
        for (const band of area.bands) {
            if (!band.flood) this.paintSafeObserverRay(ctx, projection, area.room, band, look);
            this.paintObserverBand(ctx, projection, area.room, band, look);
        }
    }

    paintSafeObserverRay(ctx, projection, room, band, look) {
        const top = band.first - .5, bottom = band.last + .5;
        const a = projection.cellToScreen(this.deps.bossMoves.observer.boundaryX(room, top), top);
        const b = projection.cellToScreen(this.deps.bossMoves.observer.boundaryX(room, bottom), bottom);
        const edge = projection.cellToScreen(band.color === 'violet' ? room.x0 - .5 : room.x1 + .5, top).x;
        ctx.save();
        this.observerPath(ctx, [[edge,a.y],[a.x,a.y],[b.x,b.y],[edge,b.y]], true);
        ctx.clip();
        this.paintObserverBandCore(ctx, { left: Math.min(edge,a.x,b.x), right: Math.max(edge,a.x,b.x), top: a.y, bottom: b.y },
            this.OBSERVER_PAINT[band.color], false, { ...look, strength: look.hit ? .78 : .53 });
        ctx.restore();
    }

    drawObserverSealMark(owner, ctx, projection, area, { cells, progress }) {
        if (area.sealLocked) {
            this.paintLockedSeal(ctx, projection, cells);
            return;
        }
        const run = this.deps.actExplorationState.current(owner);
        const pose = run ? this.deps.actExplorationMotion.position(run, owner.gridPlayer) : area.center;
        const foot = projection.cellToScreen(pose.gx,pose.gy);
        const x = foot.x, y = foot.y + (projection.actorGroundOffsetY || 0);
        const rx = projection.tileW*1.49, ry = projection.tileH*1.49;
        const { room } = area;
        const a = projection.cellToScreen(room.x0-.5,room.y0-.5), b = projection.cellToScreen(room.x1+.5,room.y1+.5);
        ctx.beginPath(); ctx.rect(a.x,a.y,b.x-a.x,b.y-a.y); ctx.clip();
        ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
        ctx.globalAlpha = .36 + progress*.18;
        ctx.fillStyle = '#2b1428'; ctx.fill();
        ctx.globalAlpha = .9;
        ctx.strokeStyle = '#e9abb1'; ctx.lineWidth = 2; ctx.setLineDash([7,5]); ctx.stroke();
        ctx.setLineDash([]);
        this.observerPath(ctx, [[x-7,y],[x,y-5],[x+7,y],[x,y+5]], true);
        ctx.fillStyle = '#fff0da'; ctx.fill();
    }

    paintLockedSeal(ctx, projection, cells) {
        const footprint = this.deps.projectSkillFootprint({ cells, center: cells[0] }, projection);
        const { tileW:w, tileH:h } = projection;
        ctx.fillStyle = '#211326';
        ctx.strokeStyle = '#c28e9e';
        ctx.lineWidth = 1.5;
        for (const { x,y } of footprint.points) {
            ctx.globalAlpha = .80;
            ctx.fillRect(x-w/2,y-h/2,w,h);
            ctx.globalAlpha = .75;
            ctx.strokeRect(x-w/2+1.5,y-h/2+1.5,w-3,h-3);
        }
        this.deps.drawSkillFootprintGround(ctx,footprint,'#ffdac1',1,true);
    }

    observerBounds(cells, projection) {
        const points = cells.map(cell => projection.cellToScreen(cell.gx, cell.gy));
        const w = projection.tileW, h = projection.tileH;
        const left = Math.min(...points.map(p => p.x)) - w / 2, top = Math.min(...points.map(p => p.y)) - h / 2;
        const width = Math.max(...points.map(p => p.x)) + w / 2 - left;
        const height = Math.max(...points.map(p => p.y)) + h / 2 - top;
        return { left, top, width, height, x: left + width / 2, y: top + height / 2 };
    }

    observerPath(ctx, points, close = false) {
        ctx.beginPath();
        points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        if (close) ctx.closePath();
    }

    observerRay(ctx, box, progress, second, hit) {
        const vertical = second, length = vertical ? box.height : box.width;
        const color = second ? this.OBSERVER_PAINT.silver : this.OBSERVER_PAINT.glass;
        const half = (vertical ? box.width : box.height) * .46, wide = Math.max(2, half * (hit ? .75 + .25 * progress : .17 + .58 * progress));
        ctx.translate(box.x, box.y);
        if (vertical) ctx.rotate(Math.PI / 2);
        const edge = length / 2;
        const haze = ctx.createLinearGradient(0, -wide, 0, wide);
        haze.addColorStop(0, '#17102100'); haze.addColorStop(.5, color); haze.addColorStop(1, '#17102100');
        ctx.fillStyle = this.OBSERVER_PAINT.ink;
        ctx.globalAlpha = hit ? .6 * progress : .30;
        ctx.fillRect(-edge, -half, length, half * 2);
        ctx.fillStyle = haze;
        ctx.globalAlpha = hit ? .92 * progress : .45 + .3 * progress;
        this.observerPath(ctx, [[-edge, 0], [-edge + half, -wide], [edge - half, -wide], [edge, 0], [edge - half, wide], [-edge + half, wide]], true);
        ctx.fill();
        ctx.strokeStyle = hit ? this.OBSERVER_PAINT.pearl : color;
        ctx.lineWidth = hit ? 3 : 1.5;
        this.observerPath(ctx, [[-edge, 0], [edge, 0]]);
        ctx.stroke();
        ctx.setLineDash([4, 7]);
        this.observerPath(ctx, [[-edge, -half], [edge, -half], [edge, half], [-edge, half]], true);
        ctx.stroke();
    }

    observerMark(ctx, box, progress, hit) {
        ctx.translate(box.x, box.y);
        const rx = box.width * .43, ry = box.height * .42;
        const footprint = [[-rx, 0], [0, -ry], [rx, 0], [0, ry]];
        ctx.globalAlpha = hit ? progress * .72 : .20 + progress * .2;
        ctx.fillStyle = hit ? this.OBSERVER_PAINT.glass : this.OBSERVER_PAINT.ink;
        this.observerPath(ctx, footprint, true);
        ctx.fill();
        ctx.globalAlpha = hit ? progress : .5 + progress * .5;
        ctx.strokeStyle = hit ? this.OBSERVER_PAINT.pearl : this.OBSERVER_PAINT.glass;
        ctx.lineWidth = hit ? 3 : 2;
        ctx.stroke();
        const circle = hit ? 1.25 - progress * .55 : 1.15 - progress * .62;
        ctx.beginPath(); ctx.ellipse(0, 0, rx * circle, ry * circle, 0, 0, Math.PI * 2); ctx.stroke();
        this.observerPath(ctx, [[0, -ry * .62], [rx * .16, 0], [0, ry * .62], [-rx * .16, 0]], true);
        ctx.fillStyle = this.OBSERVER_PAINT.pearl;
        ctx.fill();
    }

    observerFault(ctx, box, progress) {
        ctx.translate(box.left, box.top);
        const w = box.width, h = box.height;
        ctx.fillStyle = this.OBSERVER_PAINT.ink;
        ctx.globalAlpha = .24 + progress * .22;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = .72 + .28 * progress;
        ctx.strokeStyle = '#ddc8b2';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(1, 1, w - 2, h - 2);
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, w, h * progress); ctx.clip();
        this.observerPath(ctx, [[w * .28, 0], [w * .43, h * .23], [w * .40, h * .46], [w * .66, h * .67], [w * .58, h]], false);
        ctx.stroke();
        this.observerPath(ctx, [[0, h * .61], [w * .22, h * .53], [w * .4, h * .46], [w * .65, h * .29], [w, h * .41]]);
        ctx.stroke();
        ctx.restore();
    }

    observerWarning(owner, ctx, area, projection, progress) {
        const opacity = this.deps.uiDisplay.reducedEffects() ? .76 : progress;
        if (area.bands) {
            this.paintObserverBands(ctx, projection, area, { progress: opacity, hit: false });
            return;
        }
        area.waves.forEach((cells, i) => {
            if (!cells.length) return;
            const box = this.observerBounds(cells, projection);
            const second = i + (area.waveOffset || 0) > 0;
            ctx.save();
            if (area.observerMove === 'collapse') {
                this.deps.clipSkillFootprint(ctx, this.deps.projectSkillFootprint({ cells, center: cells[0] }, projection));
                this.observerFault(ctx, box, opacity);
            }
            else if (area.observerMove === 'seal') this.drawObserverSealMark(owner, ctx, projection, area, { cells, progress: opacity });
            else if (area.observerMove === 'mark') {
                const shape = this.deps.projectSkillFootprint({ cells, center: area.center || cells[0] }, projection);
                if (shape) this.deps.drawSkillFootprintGround(ctx, shape, this.OBSERVER_PAINT.glass, 1.2 + opacity * 1.4);
                this.observerMark(ctx, box, opacity, false);
            }
            else this.observerRay(ctx, box, opacity * (second ? .70 : 1), second, false);
            ctx.restore();
        });
    }

    drawObserverWarnings(owner, ctx, layout, projection) {
        for (const { enemy } of layout) {
            if (!enemy.patternArea?.observerMove || !this.deps.bossAttackView.isLiveWarning(enemy)) continue;
            const progress = this.deps.bossAttackView.warningShare(enemy);
            if (progress !== null) this.observerWarning(owner, ctx, enemy.patternArea, projection, progress);
        }
    }

    drawObserverMove(owner, ctx, entry, projection, now) {
        const { move } = entry, kind = move.observerMove, reduced = this.deps.uiDisplay.reducedEffects();
        if (move.bands) {
            this.drawObserverBandImpact(ctx, move, projection, now);
            return;
        }
        move.stages.forEach((stage, i) => {
            const age = now - move.releasedAt - stage.ms;
            if (age < 0) {
                this.observerWarning(owner, ctx, { observerMove: kind, waves: [stage.cells], waveOffset: i, sealLocked: true }, projection, .95);
                return;
            }
            if (reduced || age > 550 || kind === 'collapse' || kind === 'seal') return;
            const box = this.observerBounds(stage.cells, projection), remaining = 1 - age / 550;
            ctx.save();
            if (kind === 'mark') this.observerMark(ctx, box, remaining, true);
            else this.observerRay(ctx, box, remaining, i === 1, true);
            ctx.restore();
        });
    }

    drawObserverBandImpact(ctx, move, projection, now) {
        const age = now - move.releasedAt - move.stages[0].ms;
        if (age > 520) return;
        const hit = move.next > 0;
        const progress = hit ? Math.max(0, 1 - age / 520) : 1;
        this.paintObserverBands(ctx, projection, move, { progress, hit });
    }

    drawObserverFloor(owner, ctx, projection, now) {
        if (owner.currentZoneId !== this.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID) return;
        const floor = this.deps.bossMoves.observer.mergedFloor(this.deps.actExplorationState.current(owner), this.deps.getCombatTime());
        if (!floor) return;
        for (const cells of floor.patches) {
            const box = this.observerBounds(cells, projection), footprint = this.deps.projectSkillFootprint({ cells, center: cells[0] }, projection);
            ctx.save();
            this.deps.clipSkillFootprint(ctx, footprint);
            this.paintObserverHole(ctx, box, floor.at === undefined ? Infinity : Math.max(0, now - floor.at), (floor.until ?? Infinity) - now);
            ctx.restore();
            this.deps.drawSkillFootprintGround(ctx, footprint, '#a591a5', .44, true);
        }
    }

    paintObserverHole(ctx, box, elapsed, timeLeft) {
        ctx.save();
        ctx.translate(box.left, box.top);
        ctx.beginPath(); ctx.rect(0, 0, box.width, box.height); ctx.clip();
        const shade = ctx.createLinearGradient(0, 0, 0, box.height);
        shade.addColorStop(0, '#372744'); shade.addColorStop(.22, '#140f24'); shade.addColorStop(1, '#090812');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, box.width, box.height);
        this.drawObserverLip(ctx, box, elapsed, timeLeft);
        ctx.restore();
    }

    drawObserverAir(ctx, entry, projection, now) {
        if (this.deps.uiDisplay.reducedEffects() || !['crossing', 'mark'].includes(entry.move.observerMove)) return;
        const move = entry.move;
        move.stages.forEach((stage, i) => {
            const age = now - move.releasedAt - stage.ms;
            if (age < 0 || age > 460) return;
            const box = this.observerBounds(stage.cells, projection), t = age / 460;
            const isMark = move.observerMove !== 'crossing';
            const color = i ? this.OBSERVER_PAINT.silver : this.OBSERVER_PAINT.glass;
            const h = projection.tileH * (isMark ? 4.6 : 2.6);
            const w = (isMark ? projection.tileW * .40 : Math.min(box.width * .42, projection.tileW * 3.5)) * (.4 + .6 * t);
            ctx.save();
            ctx.translate(box.x, box.y);
            const shaft = ctx.createLinearGradient(0, -h, 0, 0);
            shaft.addColorStop(0, '#24133d00'); shaft.addColorStop(.55, color); shaft.addColorStop(1, this.OBSERVER_PAINT.pearl);
            this.observerPath(ctx, [[-w, -h], [-w * .24, -h * .62], [0, 0], [w * .24, -h * .62], [w, -h], [0, -h * .73]], true);
            ctx.fillStyle = shaft;
            ctx.globalAlpha = (1 - t) * .72;
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(0, -h * (.48 + .29 * t), w * .75, h * .12, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        });
    }

    drawObserverLip(ctx, box, elapsed, left) {
        const w = box.width, h = box.height;
        const rim = [[0,3],[w*.14,2],[w*.23,6],[w*.37,2],[w*.51,5],[w*.64,1],[w*.78,5],[w*.89,2],[w-2,5]];
        const chipped = [[w-3,h*.22],[w-7,h*.30],[w-2,h*.51],[w-6,h*.72],[w-2,h-3],
            [w*.82,h-3],[w*.74,h-6],[w*.61,h-3],[w*.53,h-7],[w*.35,h-3],[w*.22,h-6],[w*.13,h-3],[2,h-2],
            [5,h*.78],[2,h*.54],[7,h*.42],[2,h*.21]];
        this.observerPath(ctx, [...rim, ...chipped], true);
        ctx.strokeStyle = left < 500 ? this.OBSERVER_PAINT.pearl : '#806f87';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        this.observerWall(ctx, rim, h);
        if (this.deps.uiDisplay.reducedEffects() || elapsed > 900) return;
        const fall = elapsed / 900;
        for (let i = 0; i < 7; i++) {
            const x = w * (.10 + i * .135), y = h * (.17 + (i % 3) * .12 + fall * fall);
            const size = w * (.017 + (i % 3) * .006);
            ctx.globalAlpha = 1 - fall;
            ctx.fillStyle = i % 2 ? '#ab8fb4' : '#776080';
            this.observerPath(ctx, [[x-size,y],[x+size,y-4],[x+size*.7,y+5],[x-size*.4,y+8]], true);
            ctx.fill();
        }
    }

    observerWall(ctx, rim, h) {
        const depth = [.17, .23, .13, .29, .18, .25, .13, .21, .18];
        const base = rim.map(([x], i) => [x, h * depth[i]]);
        const stones = ['#766978', '#594c63', '#6d5c72', '#4c405b'];
        for (let i = 1; i < rim.length; i++) {
            ctx.fillStyle = stones[i % stones.length];
            this.observerPath(ctx, [rim[i-1], rim[i], base[i], base[i-1]], true);
            ctx.fill();
        }
        ctx.strokeStyle = '#b6a6b2';
        ctx.lineWidth = 1.7;
        this.observerPath(ctx, rim);
        ctx.stroke();
    }
}

export function createObserverArena(deps, scene) {
    const view=new ObserverArena(deps, scene);
    return Object.freeze({ drawObserverArena:view.drawObserverArena.bind(view), drawObserverFloor:view.drawObserverFloor.bind(view), drawObserverMove:view.drawObserverMove.bind(view), drawObserverAir:view.drawObserverAir.bind(view), drawObserverWarnings:view.drawObserverWarnings.bind(view) });
}
