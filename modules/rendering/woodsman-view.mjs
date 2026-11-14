/** Read-only giant boss drawing. Fixed-canvas sheets work without video codecs/autoplay and follow combat time.
 * Three 7.9 MiB motion sheets plus only the current six 1.5 MiB FX sheets; released on leaving the encounter. */
class WoodsmanView {
    constructor(deps) {
        this.deps = deps;
        this.images = new Map();
        this.lastEnemy = null;
        this.bodyRect = null;
        this.warmElement = null;
        this.floor = null;
        this.marks = null;
        this.active = enemy => this.deps.woodsmanBattle.owns(enemy)
            && this.bodyRect?.enemy === enemy && this.deps.performance.now() - this.bodyRect.at < 500;
        this.easeCube = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
        this.speechAnchor = enemy => this.active(enemy) ? { x: this.bodyRect.x + this.bodyRect.w / 2, y: this.bodyRect.y - this.bodyRect.h * .18 } : null;
    }

    viewTime(owner) { return owner.combatHalted || this.deps.isForegroundGameplayPausedForBackground() ? this.deps.getCombatTime() : this.deps.bossAttackView.now(); }

    image(file) {
        if (!this.images.has(file)) {
            this.images.set(file, this.deps.stageAssetRetry.image(this.deps.WOODSMAN_BATTLE.path + file));
        }
        const pic = this.images.get(file);
        return pic.complete && pic.naturalWidth ? pic : null;
    }

    /** Reserve the giant's head above the ledge while retaining the complete walkable floor below it. */
    fitTile(owner, map, width, height, normal) {
        if (owner.currentZoneId !== this.deps.OUTSIDE_CHAOS_ZONE_ID || !map.rooms) return normal;
        const room = this.deps.actExplorationRooms.roomAt(map, owner.gridPlayer), region = this.deps.stageRegionFit.of(map.region);
        if (room?.role !== 'boss' || !region) return normal;
        const scale = this.deps.stageRegionFit.scale(region, map.frame.columns, map.frame.rows);
        const rise = 372 * scale / 64, rows = room.y1 - room.y0 + 1;
        return Math.min(normal, Math.floor((height * this.deps.stageView.floorShare(width, height) - 80) / (rows * this.deps.STAGE_VIEW.depth + rise)));
    }

    currentEnemy(owner) {
        const enemy = owner.currentZoneId === this.deps.OUTSIDE_CHAOS_ZONE_ID
            ? owner.enemies.find(row => row.hp > 0 && this.deps.woodsmanBattle.owns(row)) || this.deps.woodsmanBattle.introduction()?.enemy : null;
        if (!enemy && this.lastEnemy) { this.images.clear(); this.bodyRect = null; this.warmElement = null; this.floor = null; this.marks = null; }
        this.lastEnemy = enemy || null;
        return enemy;
    }

    warm(enemy, cast) {
        const element = cast?.element || enemy.ele;
        if (this.warmElement === element) return;
        this.warmElement = element;
        // All three recur within one rotation. Evicting between warning/recovery repeatedly decoded the same large PNG.
        const keep = new Set(['idle.png', 'cast.png', 'command.png', 'weapon.png',
            'stump-hypercube-loop-v10.png', 'stump-cosmic-flow-v10.png']);
        for (const row of this.deps.WOODSMAN_BATTLE.patterns) keep.add('fx/' + row.id + '-' + element + '.png');
        for (const key of this.images.keys()) if (!keep.has(key)) this.images.delete(key);
        for (const key of keep) this.image(key);
    }

    motionFrame(owner, enemy, cast) {
        this.warm(enemy, cast);
        const sheet = cast && this.image(cast.motion + '.png');
        return { source: sheet || this.image('idle.png'), frame: sheet
            ? this.poseAt(cast, this.viewTime(owner)) : 0 };
    }

    poseAt(cast, now) {
        const motion = this.deps.WOODSMAN_BATTLE.motions[cast.motion];
        let elapsed = cast.releasedAt == null ? Math.min(motion.release - 1, now - cast.startedAt)
            : motion.release + now - cast.releasedAt;
        for (let i = 0; i < motion.durations.length; i++) {
            if (elapsed < motion.durations[i]) return i;
            elapsed -= motion.durations[i];
        }
        return motion.durations.length - 1;
    }

    drawWoodsmanBody(owner, ctx, view, p, picture) {
        const enemy = this.currentEnemy(owner);
        if (!enemy || this.deps.actExplorationRooms.roomAt(view.map, enemy) !== view.room && view.map.rooms.length > 1) return;
        const cast = this.deps.woodsmanBattle.current(enemy);
        const { source, frame } = this.motionFrame(owner, enemy, cast);
        if (!source) return;
        const scale = picture.w / 1672, ground = p.mapY + view.room.y0 * p.tileH;
        const veil = this.deps.bossEntranceView.stageLook(enemy, this.deps.performance.now());
        ctx.save();
        ctx.beginPath(); ctx.rect(picture.x, picture.y, picture.w, ground - picture.y + 2); ctx.clip();
        ctx.globalAlpha = veil ? veil.alpha : 1;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(source, frame % 8 * 480, Math.floor(frame / 8) * 270, 480, 270,
            Math.round(picture.x + 452 * scale), Math.round(ground - 372 * scale), Math.round(768 * scale), Math.round(432 * scale));
        ctx.restore();
        this.bodyRect = { enemy, at: this.deps.performance.now(), x: picture.x + 588 * scale, y: ground - 260 * scale,
            w: 496 * scale, h: 260 * scale };
    }

    hitAt(owner, point) {
        const rect = this.bodyRect;
        if (!rect || !point || !this.active(rect.enemy) || !owner.enemies.includes(rect.enemy) || rect.enemy.hp <= 0) return null;
        return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h ? rect.enemy : null;
    }

    fieldSpace(p, box) {
        const a = p.cellToScreen(box.x0, box.y0), b = p.cellToScreen(box.x1, box.y1);
        const sx = (b.x - a.x) / 1232, sy = (b.y - a.y) / 360;
        return { sx, sy, x: a.x - 220 * sx, y: a.y - 500 * sy + (p.actorGroundOffsetY || 0) };
    }

    floorCells(enemy) {
        const map = this.deps.getCombatGridSize(), box = this.deps.woodsmanBattle.bounds(enemy);
        if (this.floor?.map !== map) this.floor = { map, box, cells: this.deps.woodsmanBattle.cellsIn(box) };
        return this.floor;
    }

    cellPath(p, cells, inset = 1) {
        const path = new this.deps.Path2D(), scale = this.deps.uiDisplay.battleRenderScale;
        const snap = v => Math.round(v * scale) / scale;
        for (const cell of cells) {
            const c = p.cellToScreen(cell.gx, cell.gy);
            const x = snap(c.x - p.tileW / 2 + inset), y = snap(c.y - p.tileH / 2 + (p.actorGroundOffsetY || 0) + inset);
            path.rect(x, y, snap(p.tileW - inset * 2), snap(p.tileH - inset * 2));
        }
        return path;
    }

    /** Scheduled hit cells, not decorative circles. Read the simulation tick so a hit cannot vanish before it resolves. */
    markedCells(cast) {
        const tick = this.deps.getCombatTime(), release = cast.releasedAt ?? cast.startedAt + cast.warningMs;
        if (this.marks?.stages === cast.stages && this.marks.tick === tick && this.marks.release === release) return this.marks;
        this.marks = { stages: cast.stages, tick, release, ...this.gatherMarks(cast, tick - release) };
        return this.marks;
    }

    gatherMarks(cast, elapsed) {
        const soon = new Map(), hit = new Map();
        for (const stage of cast.stages) {
            if (stage.ms < elapsed - 100 || stage.ms > Math.max(0, elapsed) + 650) continue;
            const target = stage.ms <= elapsed && cast.releasedAt != null ? hit : soon;
            for (const cell of stage.cells) target.set(this.deps.gridCellKey(cell.gx, cell.gy), cell);
        }
        for (const key of hit.keys()) soon.delete(key);
        return { soon: [...soon.values()], hit: [...hit.values()] };
    }

    drawCells(ctx, p, cells, hit, outline) {
        if (!cells.length) return;
        const path = this.cellPath(p, cells, 2);
        if (!outline) {
            ctx.fillStyle = hit ? 'rgba(244,70,46,.38)' : 'rgba(210,109,38,.26)';
            ctx.fill(path);
        }
        if (outline) {
            ctx.strokeStyle = hit ? '#ff9b72' : 'rgba(243,204,141,.8)';
            ctx.lineWidth = hit ? 2 : 1;
            ctx.stroke(path);
        }
    }

    drawFloor(ctx, p, enemy) {
        const cells = this.floorCells(enemy).cells, path = this.cellPath(p, cells, 0);
        ctx.strokeStyle = 'rgba(207,211,210,.25)'; ctx.lineWidth = 1; ctx.stroke(path);
    }

    stamp(ctx, e, element, frame, box) {
        const art = this.image('fx/' + e.fx + '-' + element + '.png');
        if (!art) return;
        const anchors = this.deps.WOODSMAN_BATTLE.anchors[e.fx], anchor = anchors[Math.min(frame, anchors.length - 1)];
        const scale = this.deps.uiDisplay.battleRenderScale, snap = v => Math.round(v * scale) / scale;
        const flip = e.kind === 'segment' && e.mirrored;
        if (flip) { ctx.save(); ctx.translate(snap(box.x * 2), 0); ctx.scale(-1, 1); }
        ctx.drawImage(art, frame % 3 * 256, Math.floor(frame / 3) * 256, 256, 256,
            snap(box.x - box.w * anchor[0]), snap(box.y - box.h * anchor[1]), snap(box.w), snap(box.h));
        if (flip) ctx.restore();
    }

    effectFrame(event, age) {
        const moving = ['annulus', 'front'].includes(event.kind);
        const thresholds = moving ? [.08, .25, .75, .9] : [.09, .19, .34, .57, .82];
        return Math.min(5, thresholds.filter(v => age / event.duration >= v).length + (moving ? 1 : 0));
    }

    drawWoodsmanEffect(ctx, event, age, element, space) {
        const e = this.deps.woodsmanBattle.geometry(event, age);
        const frame = this.effectFrame(event, age);
        // Project ground anchors, not the upright art. Only the expanding floor ring follows floor perspective.
        const put = box => this.stamp(ctx, e, element, frame, { x: space.x + box.x * space.sx, y: space.y + box.y * space.sy,
            w: box.w * space.sx, h: box.h * (e.kind === 'annulus' ? space.sy : space.sx) });
        if (e.kind === 'ellipse') put({ ...e, w: e.fx === 'nova' ? 300 : 230, h: e.fx === 'nova' ? 300 : 230 });
        if (e.kind === 'lane' || e.kind === 'sidefront') for (const y of [540, 690, 840]) put({ x: e.x, y, w: 220, h: 220 });
        if (e.kind === 'annulus') put({ ...e, w: e.radius * 2 / .82, h: e.radius * 2 / .82 * .95 });
        if (e.kind === 'segment') put({ ...e, w: 620, h: 620 * space.sy / space.sx });
        if (e.kind === 'front') this.drawWave(ctx, e, space, put);
    }

    drawWave(ctx, e, space, put) {
        const spans = e.gapWidth ? [[220, e.gap - e.gapWidth / 2], [e.gap + e.gapWidth / 2, 1452]] : [[220,1452]];
        for (const [a, b] of spans) {
            const count = Math.ceil((b - a) / 320), span = (b - a) / count;
            ctx.save();
            ctx.beginPath(); ctx.rect(space.x + a * space.sx, 0, (b - a) * space.sx, ctx.canvas.height); ctx.clip();
            for (let i = 0; i < count; i++) put({ x: a + (i + .5) * span, y: e.y, w: span / .84, h: span / .84 });
            ctx.restore();
        }
    }

    drawWoodsmanField(owner, ctx, projection) {
        const enemy = this.currentEnemy(owner), cast = enemy && this.deps.woodsmanBattle.current(enemy);
        if (!enemy || !projection) return;
        ctx.save();
        this.drawFloor(ctx, projection, enemy);
        if (cast) {
            if (cast.cover) {
                const path = this.cellPath(projection, cast.cover.cells, 1);
                ctx.fillStyle = 'rgba(103,211,170,.18)'; ctx.fill(path);
                ctx.strokeStyle = '#a2e6c3'; ctx.lineWidth = 1.5; ctx.stroke(path);
            }
            const cells = this.markedCells(cast);
            this.drawCells(ctx, projection, cells.soon, false, false);
            this.drawCells(ctx, projection, cells.hit, true, false);
        }
        for (const row of this.deps.woodsmanStumps.rows()) if (row.target) {
            const cells = this.deps.getGridFootprintCells(row.target.gx, row.target.gy, row.footprint);
            const path = this.cellPath(projection, cells, 3);
            ctx.fillStyle = 'rgba(229,114,57,.22)'; ctx.fill(path);
            ctx.strokeStyle = '#ffbd75'; ctx.lineWidth = 2; ctx.stroke(path);
        }
        ctx.restore();
    }

    foreground(owner, ctx, projection) {
        const enemy = this.currentEnemy(owner), cast = enemy && this.deps.woodsmanBattle.current(enemy);
        if (!enemy || !projection) return;
        ctx.save();
        if (cast) this.paintField(owner, ctx, projection, enemy, cast);
        for (const row of this.deps.woodsmanStumps.rows()) this.drawCubeFlow(owner, ctx, projection, row);
        ctx.restore();
    }

    paintField(owner, ctx, projection, enemy, cast) {
        this.warm(enemy, cast);
        const now = this.viewTime(owner), space = this.fieldSpace(projection, cast.box), cells = this.markedCells(cast);
        ctx.imageSmoothingEnabled = false;
        ctx.save();
        this.maskCube(ctx, projection, now, cast.excluded || []);
        if (cast.cover) {
            const safe = this.cellPath(projection, cast.cover.cells, 0);
            safe.rect(-10000,-10000,20000,20000); ctx.clip(safe,'evenodd');
        }
        if (cast.releasedAt != null) for (const event of cast.events) {
            const age = now - cast.releasedAt - event.at;
            if (age >= 0 && age <= event.duration) this.drawWoodsmanEffect(ctx, event, age, cast.element, space);
        }
        // Warning boundaries and upright impacts stay above scenery. Fill alone stays beneath actors.
        this.drawCells(ctx, projection, cells.soon, false, true);
        this.drawCells(ctx, projection, cells.hit, true, true);
        ctx.restore();
    }

    // Clip each hole separately: overlapping body/floor holes must not cancel each other under even-odd fill.
    excludeRect(ctx, box) {
        ctx.beginPath(); ctx.rect(-10000, -10000, 20000, 20000);
        ctx.rect(box.x, box.y, box.w, box.h); ctx.clip('evenodd');
    }

    maskCube(ctx, p, now, excluded) {
        for (const row of this.deps.woodsmanStumps.rows()) {
            const pose = this.cubePose(row, p, now);
            this.excludeRect(ctx, { x: pose.x - pose.size * .46, y: pose.y - pose.size * .9, w: pose.size * .92, h: pose.size * .88 });
        }
        const protectedCells = new Map([...excluded, ...this.deps.woodsmanStumps.patternCells()].map(c => [this.deps.gridCellKey(c.gx, c.gy), c]));
        for (const cell of protectedCells.values()) {
            const at = p.cellToScreen(cell.gx, cell.gy);
            this.excludeRect(ctx, { x: at.x - p.tileW / 2, y: at.y - p.tileH / 2 + (p.actorGroundOffsetY || 0),
                w: p.tileW, h: p.tileH });
        }
    }

    cubePose(row, p, now) {
        const center = cell => p.cellToScreen(cell.gx + (row.footprint.columns - 1) / 2, cell.gy + row.footprint.rows - 1);
        const start = center(row), end = row.target ? center(row.target) : start;
        const elapsed = Math.max(0, now - row.phaseAt), rule = this.deps.WOODSMAN_BATTLE.stumps;
        const progress = Math.min(1, elapsed / rule.moveMs);
        const travel = row.phase === 'moving' ? this.easeCube(progress / rule.travelShare) : 0;
        let lift = row.phase === 'idle' ? Math.max(0, 1 - (now - row.plantedAt) / 240) : 1.4;
        if (row.phase === 'rising') lift *= this.easeCube(elapsed / rule.riseMs);
        // Finish horizontal travel first, then accelerate straight down at the final x/y ground anchor.
        if (row.phase === 'moving') lift *= 1 - Math.max(0, (progress - rule.travelShare) / (1 - rule.travelShare)) ** 2;
        const ground = start.y + (end.y - start.y) * travel + (p.actorGroundOffsetY || 0);
        return { x: start.x + (end.x - start.x) * travel, y: ground - lift * p.tileW, ground,
            size: p.tileW * (row.footprint.columns + .5) };
    }

    cubeStamp(ctx, art, frame, pose, scale = 1) {
        const size = pose.size * scale;
        ctx.drawImage(art, frame % 3 * 256, Math.floor(frame / 3) * 256, 256, 256,
            Math.round(pose.x - size / 2), Math.round(pose.y - pose.size * .93 - (size - pose.size) / 2),
            Math.round(size), Math.round(size));
    }

    drawCubeFlow(owner, ctx, p, row) {
        const now = this.viewTime(owner), pose = this.cubePose(row, p, now), art = this.image('stump-cosmic-flow-v10.png');
        const spawnAge = now - row.lastSpawnAt, active = row.phase !== 'idle';
        const burst = row.lastSpawnAt > 0 && spawnAge < 900;
        const frame = Math.floor(Math.max(0, now - row.plantedAt) / 160) % 6;
        ctx.save(); ctx.imageSmoothingEnabled = false;
        if (art) {
            ctx.globalAlpha = active ? .7 : burst ? .7 : .24;
            // Authored plume travels away from each aperture. Origins, scale and phase stay steady (no rocking halo).
            this.drawCubePlume(ctx, art, frame, pose, false);
            this.drawCubePlume(ctx, art, (frame + 2) % 6, pose, true);
        }
        ctx.globalAlpha = 1;
        if (row.phase === 'absorbing') this.drawAbsorbed(ctx, p, row, pose, now);
        ctx.restore();
    }

    drawCubePlume(ctx, art, frame, pose, side) {
        const size = Math.round(pose.size * (side ? .62 : .78));
        ctx.save();
        ctx.translate(Math.round(pose.x + pose.size * (side ? .33 : .1)), Math.round(pose.y - pose.size * (side ? .43 : .79)));
        if (side) ctx.rotate(Math.PI / 3);
        ctx.drawImage(art, frame % 3 * 256, Math.floor(frame / 3) * 256, 256, 256,
            -Math.round(size / 2), -Math.round(size * .88), size, size);
        ctx.restore();
    }

    drawAbsorbed(ctx, p, row, pose, now) {
        const t = Math.min(1, Math.max(0, (now - row.phaseAt) / this.deps.WOODSMAN_BATTLE.stumps.absorbMs));
        const progress = this.easeCube(t), size = 1 - progress * .9;
        for (const [index, echo] of row.echoes.entries()) {
            const from = p.cellToScreen(echo.gx, echo.gy);
            const x = from.x + (pose.x - from.x) * progress + Math.sin(t * Math.PI) * (index % 2 ? 1 : -1) * p.tileW * .5;
            const y = from.y + (p.actorGroundOffsetY || 0) + (pose.y - pose.size * .42 - from.y) * progress;
            ctx.save(); ctx.globalAlpha = 1 - progress * progress;
            ctx.translate(Math.round(x), Math.round(y)); ctx.scale(size, size);
            this.deps.stageRoster.draw(ctx, echo, { x: 0, y: 0, tile: p.tileW, now, facing: 'east', spawnScale: 1, moving: false, flash: 0 });
            ctx.restore();
        }
    }

    stumps(owner, actors, projection) {
        const closureView = this;
        for (const row of this.deps.woodsmanStumps.rows()) {
            const now = this.viewTime(owner), pose = this.cubePose(row, projection, now);
            actors.push({ kind: 'woodsmanStump', id: -2000 - actors.length, y: pose.ground, draw(ctx) {
                const art = closureView.image('stump-hypercube-loop-v10.png'); if (!art) return;
                const frame = Math.floor(Math.max(0, now - row.plantedAt) / 180) % 6;
                ctx.save(); ctx.imageSmoothingEnabled = false;
                ctx.globalAlpha = Math.min(1, Math.max(0, now - row.plantedAt) / 90);
                closureView.cubeStamp(ctx, art, frame, pose);
                ctx.restore();
            } });
        }
    }
}

export function createWoodsmanView(deps) {
    const instance = new WoodsmanView(deps);
    return Object.freeze({ active: instance.active, fitTile: instance.fitTile.bind(instance), body: instance.drawWoodsmanBody.bind(instance), field: instance.drawWoodsmanField.bind(instance), foreground: instance.foreground.bind(instance), stumps: instance.stumps.bind(instance), poseAt: instance.poseAt.bind(instance), hitAt: instance.hitAt.bind(instance), speechAnchor: instance.speechAnchor });
}
