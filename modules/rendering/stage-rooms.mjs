/** 방 단위 무대를 그리는 쪽 (2026-10-11 사용자: "던파처럼 방 하나마다 이동하는 방식"). 지도는 js/act-exploration-rooms.js,
 * 문을 지나는 규칙은 js/act-exploration-doors.js에 있고 여기는 그리기만 한다.
 * - 방이 화면보다 좁으면 가운데에 두고, 넓으면 방 끝에서 멈추며 주인공을 따라간다. 짧은 가로 화면에서는 주인공과 공격을 준비하는 적의 머리를 보호한다.
 * - 방 그림은 그리기 밖에서 준비해 둔 것을 쓴다(js/canvas-stage-room-pictures.js): 지금 방과 걸어가는 문 너머의 방.
 *   아직 준비되지 않은 방은 어둠으로 두고, 그림이 오면 그때부터 밝아진다(다른 방의 그림을 잠깐 쓰지 않는다).
 * - 문: 잠긴 문은 회백색 뿌리 봉인, 풀릴 때 아래로 접히며 열린 문에는 방향 화살표가 선다. 보스 방의 표시는 붉다.
 * - 방을 옮기면 화면이 어둠에서 밝아진다(STAGE_ROOMS.fadeMs).
 */
class StageRoomsView {
    constructor(deps) {
        this.deps = deps;
        this.WIDE = 64;
        this.WAIT_DARK = '#0b090c';
        this.AHEAD_MS = 250;
        this.RIFT_EDGE_INSET = 14;
        this.shown = { run: null, room: null, at: 0 };
        this.ahead = { run: null, room: null, at: 0, next: null };
        this.roomCamera = { run: null, room: null, view: {} };
        this.mapOf = run => this.deps.actExplorationDoors.stageMap(run);
        this.riftOnscreen = (point, area) => point.x >= 0 && point.x <= area.width && point.y >= 0 && point.y <= area.height;
    }

    /** The room the camera holds: the hero's (the one being left until the step's half-way point moves the hero). */
    roomOf(owner, run) {
        const map = this.mapOf(run);
        return map ? this.deps.actExplorationRooms.roomAt(map, owner.gridPlayer) : null;
    }

    /** 카메라 가운데 칸(소수): 가로는 방 안에서 따라가고, 세로는 방 기준 위치와 화면 안 인물의 머리 보호 한계를 함께 적용한다. */
    focus(owner, run, cell, view) {
        const map = this.mapOf(run), room = this.roomOf(owner, run);
        if (!room) return null;
        const left = room.x0 - 1, right = room.x1 + 2, span = right - left;
        const gx = span <= view.columns ? (left + right) / 2
            : Math.max(left + view.columns / 2, Math.min(right - view.columns / 2, cell.gx + .5 + this.coreViewLean(map, cell, view)));
        const row = map.colonyDefense || map.grandBreach ? this.specialFocusRow(room, cell, view)
            : this.roomFocusRow(room, view);
        const base = Math.min(row, this.heroRow(room, cell, view));
        if (!this.deps.uiDisplay.battleHudAtSide) { this.roomCamera.room = null; return { gx, gy: base }; }
        const frame = { gx, gy: base, min: this.heroFeetRow(room, cell, view) };
        return { gx, gy: Math.max(this.heldCombatRow(owner, run, room, view, frame), frame.min) };
    }

    /** On a narrow screen, keep the nearby defense core inside the frame beside the hero. */
    coreViewLean(map, cell, view) {
        if (!map.colonyDefense || view.columns >= 12) return 0;
        const towardCore = map.colonyDefense.core.gx - cell.gx;
        return Math.sign(towardCore) * .65 * Math.max(0, Math.min(1, (6 - Math.abs(towardCore)) / 2));
    }

    /** The wide defense and breach floors extend beyond a screen vertically as well as horizontally. */
    specialFocusRow(room, cell, view) {
        const anchor = this.deps.stageView.anchorY(), low = room.y0 - 1 + anchor * view.rows;
        const high = room.y1 + 2 - (1 - anchor) * view.rows;
        return low > high ? (low + high) / 2 : Math.max(low, Math.min(high, cell.gy + .5));
    }

    /** Hold acquired headroom until room/viewport changes; never snap the loot floor back after a cast or death.
     * Bosses retain their existing absolute bound. Ordinary casters reserve an offset that still follows the hero. */
    heldCombatRow(owner, run, room, view, frame) {
        const prior = this.roomCamera.view, now = this.deps.performance.now();
        if (this.roomCamera.run !== run || this.roomCamera.room !== room || prior.width !== view.width || prior.height !== view.height
            || prior.columns !== view.columns || prior.rows !== view.rows) {
            this.roomCamera = { run, room, view: { ...view }, bossRow: Infinity, casterRows: 0, casterFrom: 0, casterAt: now };
        }
        const needed = this.combatRows(owner, room, view, frame, this.mapOf(run)), extra = this.casterOffset(now);
        const target = Math.max(0, Math.min(frame.gy - needed.caster, frame.gy - frame.min));
        if (target > this.roomCamera.casterRows) {
            this.roomCamera.casterFrom = extra;
            this.roomCamera.casterRows = target;
            this.roomCamera.casterAt = now;
        }
        this.roomCamera.bossRow = Math.min(this.roomCamera.bossRow, needed.boss);
        return Math.min(frame.gy - extra, this.roomCamera.bossRow);
    }

    casterOffset(now) {
        const progress = Math.max(0, Math.min(1, (now - this.roomCamera.casterAt) / 200));
        return this.roomCamera.casterFrom + (this.roomCamera.casterRows - this.roomCamera.casterFrom) * (1 - (1 - progress) ** 3);
    }

    /** In a view too short for hero and boss together, retain the hero's feet, ring and one warning row below them. */
    heroFeetRow(room, cell, view) {
        const deep = view.height / view.rows, gy = Math.max(room.y0, Math.min(room.y1, cell.gy));
        return gy + .5 + 1 / 6 + 1 - (1 - this.deps.stageView.anchorY()) * view.rows + this.deps.STAGE_ROOMS.sideHudGap / deep;
    }

    /** One enemy scan, with no per-enemy cache. Visibility uses the unadjusted camera to avoid acquiring ever farther rows. */
    combatRows(owner, room, view, frame, map) {
        const limits = { boss: Infinity, caster: Infinity }, clock = { render: this.deps.performance.now(), combat: this.deps.getCombatTime() };
        for (const enemy of owner.enemies) {
            if (enemy.hp <= 0 || !this.deps.hasGridCell(enemy)) continue;
            if (!enemy.isBoss && !this.activeCast(enemy, clock.combat)) continue;
            if (this.deps.actExplorationRooms.roomAt(map, enemy) !== room) continue;
            if (Math.abs(this.deps.getGridUnitCenter(enemy).gx + .5 - frame.gx) > view.columns / 2) continue;
            const key = enemy.isBoss ? 'boss' : 'caster';
            limits[key] = Math.min(limits[key], this.enemyHeadRow(enemy, view, frame, clock.render));
        }
        return limits;
    }

    activeCast(enemy, now) {
        const cast = enemy.attackCast;
        return cast && cast.startAt <= now && now < cast.finishAt;
    }

    /** Stable roster dimensions, not last frame's scale. Ordinary casters must already have visible feet. */
    enemyHeadRow(enemy, view, frame, now) {
        const deep = view.height / view.rows, stride = this.deps.stageStride.read(enemy, now);
        const feet = enemy.gy + this.deps.getGridUnitFootprint(enemy).rows - .5 + (stride?.dy || 0) + 1 / 6;
        const screenY = (feet - frame.gy) * deep + this.deps.stageView.anchorY() * view.height;
        if (!enemy.isBoss && (screenY < 0 || screenY > view.height)) return Infinity;
        const size = this.deps.stageRoster.bodySize(enemy, view.width / view.columns), lift = this.deps.getEnemyFieldBarLift(enemy, size?.h);
        // Boss: 16 px decoration + 24 px space. Casters: compact headroom; hero-foot safety still wins.
        return feet + (this.deps.stageView.anchorY() * view.height - lift - (enemy.isBoss ? 40 : 8)) / deep;
    }

    /** A short view keeps the minimum-sized hero's head below the top margin. In a view that fits the room this limit leaves
     * its fixed row unchanged. Follow fractional walking positions, clamped to the room's end rows during a door crossing. */
    heroRow(room, cell, view) {
        const deep = view.height / view.rows, dot = deep / this.deps.STAGE_VIEW.depth / this.deps.STAGE_VIEW.heroTile, head = this.deps.STAGE_VIEW.headroom;
        const gy = Math.max(room.y0, Math.min(room.y1, cell.gy));
        return gy + .5 + (this.deps.stageView.anchorY() * view.height - head.dots * dot - head.top) / deep;
    }

    /** 방의 세로 자리: 바닥의 앞쪽 끝이 화면의 정해진 높이(STAGE_ROOMS.floorBottom)에 오게 한다. 그 위로 바닥 다섯 줄, 그 위가 배경이다. */
    roomFocusRow(room, view) {
        // 왼쪽 HUD는 전장 바닥을 덮지 않는다. 위치만 내리고 tallestTile의 기존 확대율은 유지한다.
        const gap = this.deps.STAGE_VIEW.heroTile * this.deps.STAGE_VIEW.minDot + this.deps.STAGE_ROOMS.sideHudGap;
        const floor = this.deps.uiDisplay.battleHudAtSide ? Math.max(0, Math.min(this.deps.STAGE_ROOMS.floorBottom.sideHud, 1 - gap / view.height))
            : this.deps.stageView.floorShare(view.width, view.height);
        return room.y1 + 1 - (floor - this.deps.stageView.anchorY()) * view.rows;
    }

    /** 주인공이 걸어가는 문 너머의 방(없으면 null): 이동 명령이나 자동 탐험의 목표가 다른 방이면 그 방으로 가는 문을 향해 걷는다. 그 방의
     * 그림을 미리 준비하려고 묻는다. 싸우는 동안에는 문이 잠겨 목표가 방 안에 있다. AHEAD_MS마다 한 번만 묻는다. */
    aheadRoom(owner, run, map, room) {
        const now = this.deps.performance.now();
        if (this.ahead.run === run && this.ahead.room === room && now - this.ahead.at < this.AHEAD_MS) return this.ahead.next;
        const target = run.status === 'active' ? this.deps.actExplorationState.destination(run, owner.gridPlayer, this.deps.actExplorationProgress.runMode(run)) : null;
        const door = target ? this.deps.actExplorationRooms.doorAt(map, this.deps.actExplorationDoors.toward(run, target)) : null;
        this.ahead = { run, room, at: now, next: door && door.room === room.index ? map.rooms[door.to] : null };
        return this.ahead.next;
    }

    /** 방 그림을 기다리는 동안의 어둠(고정 전장과 같은 색, js/canvas-stage-board.js). */
    drawWaitDark(ctx, area) {
        ctx.fillStyle = this.WAIT_DARK;
        ctx.fillRect(0, 0, area.width, area.height);
    }

    /** Readable approach lanes, core footprint and rift mouths on the existing painted stage floor. */
    drawSpecialGround(owner, ctx, map, p) {
        if (!map.colonyDefense && !map.grandBreach) return;
        ctx.save();
        if (map.colonyDefense) this.drawDefenseMarks(owner, ctx, map.colonyDefense, p);
        else this.drawRiftMarks(owner, ctx, map.grandBreach, p);
        ctx.restore();
    }

    drawDefenseMarks(owner, ctx, defense, p) {
        const core = p.cellToScreen(defense.core.gx, defense.core.gy);
        ctx.lineWidth = Math.max(2, p.tileH * .13);
        ctx.setLineDash([p.tileW * .23, p.tileW * .2]);
        for (const spawn of defense.spawnCells) {
            const from = p.cellToScreen(spawn.gx, spawn.gy);
            const turn = p.cellToScreen(defense.core.gx - 5, spawn.gy);
            ctx.strokeStyle = 'rgba(238, 171, 74, .32)';
            ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(turn.x, turn.y); ctx.lineTo(core.x, core.y); ctx.stroke();
            ctx.fillStyle = 'rgba(255, 177, 76, .68)';
            ctx.fillRect(from.x - p.tileW * .18, from.y - p.tileH * .24, p.tileW * .36, p.tileH * .48);
        }
        ctx.setLineDash([]);
        const colony = owner.colony, max = Math.max(1, Number(colony?.coreMaxHp) || 1);
        const share = Math.max(0, Math.min(1, Number(colony?.coreHp) / max));
        ctx.strokeStyle = share > .5 ? '#f5c96e' : share > .2 ? '#ff9c5a' : '#f45d5d';
        ctx.lineWidth = Math.max(2, p.tileH * .16);
        ctx.beginPath(); ctx.ellipse(core.x, core.y + p.tileH * .18, p.tileW * .84, p.tileH * .85, 0, 0, Math.PI * 2); ctx.stroke();
    }

    riftWarningActive(owner, run) {
        if (!run?.inRun || run.phase !== 'survival') return false;
        const progress = this.deps.getGrandBreachProgress(run.gauge), config = this.deps.GRAND_BREACH_ENCOUNTER.arena;
        const remaining = run.nextRefillAt - this.deps.getCombatTime();
        if (progress.complete || remaining < 0 || remaining > config.warningMs) return false;
        // Announced mouths stay lit even at capacity: a last-moment kill must not create an unannounced refill.
        if (run.refillPlan) return true;
        return owner.enemies.filter(enemy => enemy.hp > 0).length < config.capacities[progress.stage];
    }

    drawRiftMarks(owner, ctx, breach, p) {
        const run=owner.voidRift?.grandRun,plan=run?.refillPlan,warning=this.riftWarningActive(owner, run);
        breach.riftCells.forEach((cell,index) => {
            const active=warning && (!plan || plan.portalIndices.includes(index));
            const at = p.cellToScreen(cell.gx, cell.gy), radius = p.tileW * (active ? .9 : .68);
            ctx.strokeStyle = active ? '#de8eff' : '#9e6ebe';
            ctx.lineWidth = Math.max(2, p.tileH * (active ? .2 : .13));
            ctx.beginPath(); ctx.ellipse(at.x, at.y + p.tileH * .22, radius, p.tileH * (active ? 1 : .75), 0, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = active ? 'rgba(199, 95, 255, .29)' : 'rgba(112, 60, 148, .15)';
            ctx.fillRect(at.x - p.tileW * .4, at.y - p.tileH * .35, p.tileW * .8, p.tileH * .7);
        });
    }

    /** Ray parameters inside a screen rectangle. Keeping one ray preserves the actual direction near corners. */
    riftRayBox(origin, direction, box) {
        let near = -Infinity, far = Infinity;
        for (const [axis, size] of [['x', 'w'], ['y', 'h']]) {
            const low = box[axis], high = low + box[size], step = direction[axis];
            if (step === 0) {
                if (origin[axis] < low || origin[axis] > high) return null;
                continue;
            }
            const a = (low - origin[axis]) / step, b = (high - origin[axis]) / step;
            near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
        }
        return far >= near ? { near, far } : null;
    }

    /** Pull back only when the rim point is covered. Descending entries also handle overlapping HUD rectangles. */
    riftUncoveredReach(origin, direction, overlays, reach) {
        const inset = this.RIFT_EDGE_INSET;
        const covered = overlays.map(rect => this.riftRayBox(origin, direction,
            { x: rect.x - inset, y: rect.y - inset, w: rect.w + inset * 2, h: rect.h + inset * 2 }))
            .filter(Boolean).sort((a, b) => b.near - a.near);
        for (const span of covered) if (span.near <= reach && span.far >= reach) reach = span.near;
        return reach;
    }

    /** Canvas CSS pixels only; HUD bounds were measured by battleCanvasBox, never during this draw. */
    riftEdgePoint(origin, target, area) {
        const inset = this.RIFT_EDGE_INSET;
        if (this.riftOnscreen(target, area) || area.width <= inset * 2 || area.height <= inset * 2) return null;
        const direction = { x: target.x - origin.x, y: target.y - origin.y };
        const visible = this.riftRayBox(origin, direction, { x: inset, y: inset, w: area.width - inset * 2, h: area.height - inset * 2 });
        if (!visible || visible.far <= 0) return null;
        const reach = this.riftUncoveredReach(origin, direction, area.enemyOverlays, visible.far);
        if (reach <= Math.max(0, visible.near)) return null;
        return { x: origin.x + direction.x * reach, y: origin.y + direction.y * reach, angle: Math.atan2(direction.y, direction.x) };
    }

    /** Two purple notches have no door hit target or movement meaning. The dark outline survives bright floors. */
    drawRiftChevron(ctx, point) {
        ctx.save(); ctx.translate(point.x, point.y); ctx.rotate(point.angle);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-6, -5); ctx.lineTo(0, 0); ctx.lineTo(-6, 5);
        ctx.moveTo(1, -5); ctx.lineTo(7, 0); ctx.lineTo(1, 5);
        ctx.strokeStyle = '#190c26'; ctx.lineWidth = 6; ctx.stroke();
        ctx.strokeStyle = '#e3a0ff'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.restore();
    }

    drawRiftEdges(owner, ctx, p, area) {
        const run = owner.voidRift?.grandRun;
        if (!run?.refillPlan || !this.riftWarningActive(owner, run)) return;
        const map = this.mapOf(this.deps.actExplorationState.current(owner));
        if (!map?.grandBreach) return;
        const origin = p.cellToScreen(owner.gridPlayer.gx, owner.gridPlayer.gy);
        for (const index of run.refillPlan.portalIndices) {
            const cell = map.grandBreach.riftCells[index], target = p.cellToScreen(cell.gx, cell.gy);
            const point = this.riftEdgePoint(origin, target, area);
            if (point) this.drawRiftChevron(ctx, point);
        }
    }

    /** 방이 바뀐 순간을 기억한다(밝아지기의 시작). 탐험이 바뀐 첫 방은 밝아지지 않고 바로 보인다. waiting: 방 그림이 아직 준비되지
     * 않았다. 그동안은 어둠을 지키고(밝아지기의 시작을 뒤로 민다) 그림이 온 때부터 밝아진다. */
    noteRoom(run, room, now, waiting) {
        if (this.shown.run === run && this.shown.room === room) {
            if (waiting) this.shown.at = now;
            return;
        }
        if (this.shown.run === run) this.deps.clearRoomEffects();
        this.shown = { run, room, at: this.shown.run === run || waiting ? now : -Infinity };
        this.warmNextAct(this.mapOf(run), room);
    }

    /** 보스 방에 들어서면 다음 액트의 방 그림을 미리 불러 둔다: 액트가 넘어갈 때 그림을 기다리는 어둠이 짧아진다. */
    warmNextAct(map, room) {
        const act = room.role === 'boss' ? /^act-(\d+)$/.exec(map.region || '') : null;
        if (act) this.deps.stageRegion.warm('act-' + String(Number(act[1]) + 1).padStart(2, '0'));
    }

    /** @returns {boolean} whether the run is a room-by-room stage and its room was drawn (the caller then skips the map picture and fog) */
    background(owner, ctx, run, p, area) {
        const map = this.mapOf(run), room = map ? this.roomOf(owner, run) : null;
        if (!room) return false;
        // 지역 무대 그림을 불러오는 동안은 어둠만 둔다: 다른 지형의 방이 잠깐 비쳤다가 바뀌지 않게.
        if (this.deps.stageScene.pending(map)) { this.drawWaitDark(ctx, area); return true; }
        // 방 그림은 그리기 밖에서 준비된다: 아직 없으면 어둠을 두고 기다린다(걷기와 전투는 그대로 간다).
        const view = this.deps.stageRoomPictures.roomPictureFor(map, room, p.tileW / this.WIDE, this.aheadRoom(owner, run, map, room));
        this.noteRoom(run, room, this.deps.performance.now(), !view);
        if (!view) { this.drawWaitDark(ctx, area); return true; }
        const box = view.box;
        this.deps.stageScene.drawFar(ctx, view, p, area);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(view.canvas, p.mapX + box.x * p.tileW, p.mapY + box.y * p.tileH, this.deps.stageDots.span(box.columns * p.tileW), this.deps.stageDots.span(box.rows * p.tileH));
        this.drawChaosHaze(owner, ctx, map, area);
        this.drawSpecialGround(owner, ctx, map, p);
        for (const row of this.deps.actExplorationDoors.doorsHere(run)) this.drawDoor(ctx, row, p, run);
        this.drawFrontShade(ctx, view, p, area);
        if (typeof this.deps.stageOcean === 'object') this.deps.stageOcean.back(ctx, view, p, area); // 심해: 먼 입자와 가디언 방의 리프트
        return true;
    }

    /** 혼돈 층계는 깊을수록 붉은 보랏빛이 조금씩 짙어진다(STAGE_ROOMS.chaosHaze): 방 그림과 소품 위, 문과 배우 아래에 화면 전체로 한 번,
     * 가장자리에 한 번 더 덮는다. */
    drawChaosHaze(owner, ctx, map, area) {
        const rule = this.deps.STAGE_ROOMS.chaosHaze, zone = map.region === 'chaos' ? this.deps.getZone(owner.currentZoneId) : null;
        const floor = zone && zone.type === 'abyss' ? Math.min(rule.floors, Math.floor(zone.depth || this.deps.getAbyssDepthFromZoneId(zone.id) || 1)) : 1;
        if (floor < 2) return;
        const share = (floor - 1) / (rule.floors - 1), cx = area.width / 2, cy = area.height / 2;
        const edge = ctx.createRadialGradient(cx, cy, Math.min(cx, cy) * 0.7, cx, cy, Math.hypot(cx, cy));
        edge.addColorStop(0, 'rgba(0, 0, 0, 0)');
        edge.addColorStop(1, rule.colour);
        ctx.save();
        ctx.fillStyle = rule.colour;
        ctx.globalAlpha = share * rule.wash;
        ctx.fillRect(0, 0, area.width, area.height);
        ctx.fillStyle = edge;
        ctx.globalAlpha = share * rule.edge;
        ctx.fillRect(0, 0, area.width, area.height);
        ctx.restore();
    }

    /** 바닥의 앞쪽 끝 아래는 걸어갈 수 없는 자리다: 아래로 갈수록 어둡게 덮어 걸을 수 있는 바닥과 가른다(STAGE_ROOMS.frontShade).
     * 그림의 도트 줄에 맞춘 띠로 짙어진다. 앞쪽 문의 그림은 이 뒤에 깊이 순서로 그려져 덮이지 않는다(문 칸의 바닥만 따로 밝히면
     * 계단 밑으로 네모가 비어져 나왔다). */
    drawFrontShade(ctx, view, p, area) {
        const rule = this.deps.STAGE_ROOMS.frontShade, top = Math.round(p.mapY + (view.room.y1 + 1) * p.tileH), bottom = area.height;
        if (top >= bottom) return;
        const step = Math.max(1, Math.round(rule.bandDots * p.tileW / this.WIDE));
        ctx.save();
        ctx.fillStyle = rule.colour;
        for (let band = 0; band < rule.bands && top + band * step < bottom; band++) {
            ctx.globalAlpha = rule.alpha * (band + 1) / rule.bands;
            ctx.fillRect(0, top + band * step, area.width, band === rule.bands - 1 ? bottom - top - band * step : step);
        }
        ctx.restore();
    }

    /** 한 칸짜리 문 자리의 화면 상자. */
    cellBox(door, p) {
        const centre = p.cellToScreen(door.cell.gx, door.cell.gy);
        return { x: centre.x - p.tileW / 2, y: centre.y - p.tileH / 2, w: p.tileW, h: p.tileH, cx: centre.x, cy: centre.y };
    }

    /** 문의 화살표. 공용 뿌리 봉인은 배우로 깊이 정렬되어 그려진다(js/canvas-stage-scene.js). */
    drawDoor(ctx, row, p, run) {
        this.deps.stageDoorMarks.seal.note(run, row);
        const box = this.cellBox(row.door, p), dot = p.tileW / this.WIDE;
        const sideways = row.door.side === 'west' || row.door.side === 'east';
        ctx.save();
        if (!row.locked && !sideways && !this.deps.stageDoorMarks.underFrame(p, row)) this.deps.stageDoorMarks.arrows(ctx, box, row.door, { dot });
        ctx.restore();
    }

    /** 방을 옮긴 직후의 어둠: 화면 전체를 덮고 fadeMs 동안 걷힌다. 전투 화면의 맨 위에 그린다. */
    drawFade(owner, ctx, area) {
        if (this.deps.uiDisplay.reducedEffects()) return;
        const run = this.deps.actExplorationState.current(owner);
        if (!run || this.shown.run !== run) return;
        const left = 1 - (this.deps.performance.now() - this.shown.at) / this.deps.STAGE_ROOMS.fadeMs;
        if (!(left > 0)) return;
        ctx.save();
        ctx.globalAlpha = Math.min(1, left * 1.25);
        ctx.fillStyle = '#05040a';
        ctx.fillRect(0, 0, area.width, area.height);
        ctx.restore();
    }

    /** Fixed screen hints follow lighting and hurt shading; room transitions still fade over them. */
    drawOverlay(owner, ctx, area, p) {
        this.drawRiftEdges(owner, ctx, p, area);
        this.drawFade(owner, ctx, area);
    }
}

export function createStageRoomsView(deps) {
    const instance = new StageRoomsView(deps);
    return Object.freeze({ focus: instance.focus.bind(instance), background: instance.background.bind(instance), drawOverlay: instance.drawOverlay.bind(instance) });
}
