/** 방 단위 무대를 그리는 쪽 (2026-10-11 사용자: "던파처럼 방 하나마다 이동하는 방식"). 지도는 js/act-exploration-rooms.js,
 * 문을 지나는 규칙은 js/act-exploration-doors.js에 있고 여기는 그리기만 한다.
 * - 방이 화면보다 좁으면 가운데에 두고, 넓으면 방 끝에서 멈추며 주인공을 따라간다. 짧은 가로 화면에서는 주인공과 공격을 준비하는 적의 머리를 보호한다.
 * - 방 그림은 그리기 밖에서 준비해 둔 것을 쓴다(js/canvas-stage-room-pictures.js): 지금 방과 걸어가는 문 너머의 방.
 *   아직 준비되지 않은 방은 어둠으로 두고, 그림이 오면 그때부터 밝아진다(다른 방의 그림을 잠깐 쓰지 않는다).
 * - 문: 잠긴 문은 회백색 뿌리 봉인, 풀릴 때 아래로 접히며 열린 문에는 방향 화살표가 선다. 보스 방의 표시는 붉다.
 * - 방을 옮기면 화면이 어둠에서 밝아진다(STAGE_ROOMS.fadeMs).
 */
const stageRoomsView = (() => {
    const WIDE = 64;                             // 방 그림에서 한 칸의 가로 도트(js/canvas-stage-terrain.js와 같다)
    const AHEAD_MS = 250;                        // 걸어가는 문 너머의 방을 다시 묻는 간격
    const RIFT_EDGE_INSET = 14;                  // CSS px: chevron radius plus clearance from canvas/HUD edges
    let shown = { run: null, room: null, at: 0 }; // 마지막으로 그린 방과 그 방에 들어선 시각(화면 밝아지기)
    let ahead = { run: null, room: null, at: 0, next: null };
    let roomCamera = { run: null, room: null, view: {} };

    const mapOf = run => actExplorationDoors.stageMap(run);
    /** The room the camera holds: the hero's (the one being left until the step's half-way point moves the hero). */
    function roomOf(run) {
        const map = mapOf(run);
        return map ? actExplorationRooms.roomAt(map, game.gridPlayer) : null;
    }
    /** 카메라 가운데 칸(소수): 가로는 방 안에서 따라가고, 세로는 방 기준 위치와 화면 안 인물의 머리 보호 한계를 함께 적용한다. */
    function focus(run, cell, view) {
        const map = mapOf(run), room = roomOf(run);
        if (!room) return null;
        const left = room.x0 - 1, right = room.x1 + 2, span = right - left;
        const gx = span <= view.columns ? (left + right) / 2
            : Math.max(left + view.columns / 2, Math.min(right - view.columns / 2, cell.gx + .5 + coreViewLean(map, cell, view)));
        const row = map.colonyDefense || map.grandBreach ? specialFocusRow(room, cell, view)
            : isOpen(map) ? openFocusRow(room, view) : focusRow(room, view);
        if (!stageView.enabled()) return { gx, gy: row };
        const base = Math.min(row, heroRow(room, cell, view));
        if (!uiDisplay.battleHudAtSide) { roomCamera.room = null; return { gx, gy: base }; }
        const frame = { gx, gy: base, min: heroFeetRow(room, cell, view) };
        return { gx, gy: Math.max(heldCombatRow(run, room, view, frame), frame.min) };
    }
    /** On a narrow screen, keep the nearby defense core inside the frame beside the hero. */
    function coreViewLean(map, cell, view) {
        if (!map.colonyDefense || view.columns >= 12) return 0;
        const towardCore = map.colonyDefense.core.gx - cell.gx;
        return Math.sign(towardCore) * .65 * Math.max(0, Math.min(1, (6 - Math.abs(towardCore)) / 2));
    }
    /** The wide defense and breach floors extend beyond a screen vertically as well as horizontally. */
    function specialFocusRow(room, cell, view) {
        const anchor = stageView.anchorY(), low = room.y0 - 1 + anchor * view.rows;
        const high = room.y1 + 2 - (1 - anchor) * view.rows;
        return low > high ? (low + high) / 2 : Math.max(low, Math.min(high, cell.gy + .5));
    }
    /** Hold acquired headroom until room/viewport changes; never snap the loot floor back after a cast or death.
     * Bosses retain their existing absolute bound. Ordinary casters reserve an offset that still follows the hero. */
    function heldCombatRow(run, room, view, frame) {
        const prior = roomCamera.view, now = performance.now();
        if (roomCamera.run !== run || roomCamera.room !== room || prior.width !== view.width || prior.height !== view.height
            || prior.columns !== view.columns || prior.rows !== view.rows) {
            roomCamera = { run, room, view: { ...view }, bossRow: Infinity, casterRows: 0, casterFrom: 0, casterAt: now };
        }
        const needed = combatRows(room, view, frame, mapOf(run)), extra = casterOffset(now);
        const target = Math.max(0, Math.min(frame.gy - needed.caster, frame.gy - frame.min));
        if (target > roomCamera.casterRows) {
            roomCamera.casterFrom = extra;
            roomCamera.casterRows = target;
            roomCamera.casterAt = now;
        }
        roomCamera.bossRow = Math.min(roomCamera.bossRow, needed.boss);
        return Math.min(frame.gy - extra, roomCamera.bossRow);
    }
    function casterOffset(now) {
        const progress = Math.max(0, Math.min(1, (now - roomCamera.casterAt) / 200));
        return roomCamera.casterFrom + (roomCamera.casterRows - roomCamera.casterFrom) * (1 - (1 - progress) ** 3);
    }
    /** In a view too short for hero and boss together, retain the hero's feet, ring and one warning row below them. */
    function heroFeetRow(room, cell, view) {
        const deep = view.height / view.rows, gy = Math.max(room.y0, Math.min(room.y1, cell.gy));
        return gy + .5 + 1 / 6 + 1 - (1 - stageView.anchorY()) * view.rows + STAGE_ROOMS.sideHudGap / deep;
    }
    /** One enemy scan, with no per-enemy cache. Visibility uses the unadjusted camera to avoid acquiring ever farther rows. */
    function combatRows(room, view, frame, map) {
        const limits = { boss: Infinity, caster: Infinity }, clock = { render: performance.now(), combat: getCombatTime() };
        for (const enemy of game.enemies) {
            if (enemy.hp <= 0 || !hasGridCell(enemy)) continue;
            if (!enemy.isBoss && !activeCast(enemy, clock.combat)) continue;
            if (actExplorationRooms.roomAt(map, enemy) !== room) continue;
            if (Math.abs(getGridUnitCenter(enemy).gx + .5 - frame.gx) > view.columns / 2) continue;
            const key = enemy.isBoss ? 'boss' : 'caster';
            limits[key] = Math.min(limits[key], enemyHeadRow(enemy, view, frame, clock.render));
        }
        return limits;
    }
    function activeCast(enemy, now) {
        const cast = enemy.attackCast;
        return cast && cast.startAt <= now && now < cast.finishAt;
    }
    /** Stable roster dimensions, not last frame's scale. Ordinary casters must already have visible feet. */
    function enemyHeadRow(enemy, view, frame, now) {
        const deep = view.height / view.rows, stride = stageStride.read(enemy, now);
        const feet = enemy.gy + getGridUnitFootprint(enemy).rows - .5 + (stride?.dy || 0) + 1 / 6;
        const screenY = (feet - frame.gy) * deep + stageView.anchorY() * view.height;
        if (!enemy.isBoss && (screenY < 0 || screenY > view.height)) return Infinity;
        const size = stageRoster.bodySize(enemy, view.width / view.columns), lift = getEnemyFieldBarLift(enemy, size?.h);
        // Boss: 16 px decoration + 24 px space. Casters: compact headroom; hero-foot safety still wins.
        return feet + (stageView.anchorY() * view.height - lift - (enemy.isBoss ? 40 : 8)) / deep;
    }
    /** A short view keeps the minimum-sized hero's head below the top margin. In a view that fits the room this limit leaves
     * its fixed row unchanged. Follow fractional walking positions, clamped to the room's end rows during a door crossing. */
    function heroRow(room, cell, view) {
        const deep = view.height / view.rows, dot = deep / STAGE_VIEW.depth / STAGE_VIEW.heroTile, head = STAGE_VIEW.headroom;
        const gy = Math.max(room.y0, Math.min(room.y1, cell.gy));
        return gy + .5 + (stageView.anchorY() * view.height - head.dots * dot - head.top) / deep;
    }
    /** 벽 없이 그리는 방인가: 조각 묶음(js/canvas-stage-scene.js)이나 배경 그림(js/canvas-stage-backdrop.js)이 준비된 지형. */
    const isOpen = map => stageScene.ready(map) || stageBackdrop.ready(map);
    /** 배경 그림을 쓰는 방: 바닥의 앞쪽 끝이 화면의 정해진 높이(STAGE_ROOMS.floorBottom)에 오게 한다. 그 위로 바닥 다섯 줄, 그 위가 배경이다. */
    function openFocusRow(room, view) {
        // 왼쪽 HUD는 전장 바닥을 덮지 않는다. 위치만 내리고 tallestTile의 기존 확대율은 유지한다.
        const gap = STAGE_VIEW.heroTile * STAGE_VIEW.minDot + STAGE_ROOMS.sideHudGap;
        const floor = uiDisplay.battleHudAtSide ? Math.max(0, Math.min(STAGE_ROOMS.floorBottom.sideHud, 1 - gap / view.height))
            : stageView.floorShare(view.width, view.height);
        return room.y1 + 1 - (floor - stageView.anchorY()) * view.rows;
    }
    /** 세로로 화면의 기준 줄(stageView.anchorY)에 올 칸: 뒷벽 꼭대기(방 위 네 칸)부터 앞쪽 문 자리까지의 가운데에서, 뒷벽이 잘리지
     * 않는 만큼(최대 lift칸) 방을 위로 올린다. 화면 아래쪽은 HUD가 덮어 앞쪽 문이 가려지기 때문이다. */
    function focusRow(room, view) {
        const top = room.y0 - 4, bottom = room.y1 + 2, half = (bottom - top) / 2;
        const headroom = stageView.anchorY() * view.rows - half - .5;
        return (top + bottom) / 2 + Math.max(0, Math.min(STAGE_ROOMS.lift, headroom));
    }
    /** 주인공이 걸어가는 문 너머의 방(없으면 null): 이동 명령이나 자동 탐험의 목표가 다른 방이면 그 방으로 가는 문을 향해 걷는다. 그 방의
     * 그림을 미리 준비하려고 묻는다. 싸우는 동안에는 문이 잠겨 목표가 방 안에 있다. AHEAD_MS마다 한 번만 묻는다. */
    function aheadRoom(run, map, room) {
        const now = performance.now();
        if (ahead.run === run && ahead.room === room && now - ahead.at < AHEAD_MS) return ahead.next;
        const target = run.status === 'active' ? actExplorationState.destination(run, game.gridPlayer, actExplorationProgress.runMode(run)) : null;
        const door = target ? actExplorationRooms.doorAt(map, actExplorationDoors.toward(run, target)) : null;
        ahead = { run, room, at: now, next: door && door.room === room.index ? map.rooms[door.to] : null };
        return ahead.next;
    }
    /** 방 뒤쪽: 배경 그림을 바닥선 위에 세우고 그 아래는 그림의 빈 띠와 같은 어둠으로 채운다. 방이 화면보다 넓으면 배경이 조금 따라 움직인다. */
    function drawBackdrop(ctx, view, p, area) {
        const room = view.room, look = stageBackdrop.look(view.map), span = (room.x1 - room.x0 + 3) * p.tileW;
        ctx.fillStyle = look.earth;
        ctx.fillRect(0, 0, area.width, area.height);
        stageBackdrop.draw(ctx, view.map, { width: area.width, groundY: p.mapY + room.y0 * p.tileH, dot: stageDots.wholeDot(p.tileW / WIDE),
            drift: p.mapX + (room.gx + .5) * p.tileW - area.width / 2, slack: Math.max(0, span - area.width) / 2 });
    }
    function drawWallDark(ctx, map, area) {
        ctx.fillStyle = stageTerrain.colours(map).dark;
        ctx.fillRect(0, 0, area.width, area.height);
    }
    /** Readable approach lanes, core footprint and rift mouths on the existing painted stage floor. */
    function drawSpecialGround(ctx, map, p) {
        if (!map.colonyDefense && !map.grandBreach) return;
        ctx.save();
        if (map.colonyDefense) drawDefenseMarks(ctx, map.colonyDefense, p);
        else drawRiftMarks(ctx, map.grandBreach, p);
        ctx.restore();
    }
    function drawDefenseMarks(ctx, defense, p) {
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
        const colony = game.colony, max = Math.max(1, Number(colony?.coreMaxHp) || 1);
        const share = Math.max(0, Math.min(1, Number(colony?.coreHp) / max));
        ctx.strokeStyle = share > .5 ? '#f5c96e' : share > .2 ? '#ff9c5a' : '#f45d5d';
        ctx.lineWidth = Math.max(2, p.tileH * .16);
        ctx.beginPath(); ctx.ellipse(core.x, core.y + p.tileH * .18, p.tileW * .84, p.tileH * .85, 0, 0, Math.PI * 2); ctx.stroke();
    }
    function riftWarningActive(run) {
        if (!run?.inRun || run.phase !== 'survival') return false;
        const progress = getGrandBreachProgress(run.gauge), config = GRAND_BREACH_ENCOUNTER.arena;
        const remaining = run.nextRefillAt - getCombatTime();
        if (progress.complete || remaining < 0 || remaining > config.warningMs) return false;
        // Announced mouths stay lit even at capacity: a last-moment kill must not create an unannounced refill.
        if (run.refillPlan) return true;
        return game.enemies.filter(enemy => enemy.hp > 0).length < config.capacities[progress.stage];
    }
    function drawRiftMarks(ctx, breach, p) {
        const run=game.voidRift?.grandRun,plan=run?.refillPlan,warning=riftWarningActive(run);
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
    function riftRayBox(origin, direction, box) {
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
    function riftUncoveredReach(origin, direction, overlays, reach) {
        const inset = RIFT_EDGE_INSET;
        const covered = overlays.map(rect => riftRayBox(origin, direction,
            { x: rect.x - inset, y: rect.y - inset, w: rect.w + inset * 2, h: rect.h + inset * 2 }))
            .filter(Boolean).sort((a, b) => b.near - a.near);
        for (const span of covered) if (span.near <= reach && span.far >= reach) reach = span.near;
        return reach;
    }
    const riftOnscreen = (point, area) => point.x >= 0 && point.x <= area.width && point.y >= 0 && point.y <= area.height;
    /** Canvas CSS pixels only; HUD bounds were measured by battleCanvasBox, never during this draw. */
    function riftEdgePoint(origin, target, area) {
        const inset = RIFT_EDGE_INSET;
        if (riftOnscreen(target, area) || area.width <= inset * 2 || area.height <= inset * 2) return null;
        const direction = { x: target.x - origin.x, y: target.y - origin.y };
        const visible = riftRayBox(origin, direction, { x: inset, y: inset, w: area.width - inset * 2, h: area.height - inset * 2 });
        if (!visible || visible.far <= 0) return null;
        const reach = riftUncoveredReach(origin, direction, area.enemyOverlays, visible.far);
        if (reach <= Math.max(0, visible.near)) return null;
        return { x: origin.x + direction.x * reach, y: origin.y + direction.y * reach, angle: Math.atan2(direction.y, direction.x) };
    }
    /** Two purple notches have no door hit target or movement meaning. The dark outline survives bright floors. */
    function drawRiftChevron(ctx, point) {
        ctx.save(); ctx.translate(point.x, point.y); ctx.rotate(point.angle);
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-6, -5); ctx.lineTo(0, 0); ctx.lineTo(-6, 5);
        ctx.moveTo(1, -5); ctx.lineTo(7, 0); ctx.lineTo(1, 5);
        ctx.strokeStyle = '#190c26'; ctx.lineWidth = 6; ctx.stroke();
        ctx.strokeStyle = '#e3a0ff'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.restore();
    }
    function drawRiftEdges(ctx, p, area) {
        const run = game.voidRift?.grandRun;
        if (!run?.refillPlan || !riftWarningActive(run)) return;
        const map = mapOf(actExplorationState.current(game));
        if (!map?.grandBreach) return;
        const origin = p.cellToScreen(game.gridPlayer.gx, game.gridPlayer.gy);
        for (const index of run.refillPlan.portalIndices) {
            const cell = map.grandBreach.riftCells[index], target = p.cellToScreen(cell.gx, cell.gy);
            const point = riftEdgePoint(origin, target, area);
            if (point) drawRiftChevron(ctx, point);
        }
    }
    /** 방이 바뀐 순간을 기억한다(밝아지기의 시작). 탐험이 바뀐 첫 방은 밝아지지 않고 바로 보인다. waiting: 방 그림이 아직 준비되지
     * 않았다. 그동안은 어둠을 지키고(밝아지기의 시작을 뒤로 민다) 그림이 온 때부터 밝아진다. */
    function noteRoom(run, room, now, waiting) {
        if (shown.run === run && shown.room === room) {
            if (waiting) shown.at = now;
            return;
        }
        if (shown.run === run) clearLeftRoom();
        shown = { run, room, at: shown.run === run || waiting ? now : -Infinity };
        warmNextAct(mapOf(run), room);
    }
    /** 방을 옮기면 앞 방에서 떠 있던 연출을 걷는다: 대미지 숫자, 투사체, 스킬 효과, 무대 클립, 마법진, 임팩트. 2026-10-17 사용자 "방을
     * 이동했는데 vfx, 대미지폰트 등이 남아있는데 없어지게 해줘": 화면 좌표에 묶인 것(대미지 숫자 등)은 카메라가 새 방으로 넘어가도
     * 그 자리에 남았다. */
    function clearLeftRoom() {
        Object.assign(battleVisualState, { damageTexts: [], projectiles: [], skillEffects: [] });
        if (battleVisualState.enemyHitPulses) battleVisualState.enemyHitPulses.clear();
        stageSkillVfx.clear();
        stageSkillSigil.clear();
        if (typeof redrawnSkillFx === 'object') redrawnSkillFx.reset();
        if (typeof attackFxClear === 'function') attackFxClear();
    }
    /** 보스 방에 들어서면 다음 액트의 방 그림을 미리 불러 둔다: 액트가 넘어갈 때 그림을 기다리는 어둠이 짧아진다. */
    function warmNextAct(map, room) {
        const act = room.role === 'boss' ? /^act-(\d+)$/.exec(map.region || '') : null;
        if (act) stageRegion.warm('act-' + String(Number(act[1]) + 1).padStart(2, '0'));
    }
    /** @returns {boolean} whether the run is a room-by-room stage and its room was drawn (the caller then skips the map picture and fog) */
    function background(ctx, run, p, area) {
        const map = mapOf(run), room = map ? roomOf(run) : null;
        if (!room) return false;
        // 지역 무대 그림을 불러오는 동안은 어둠만 둔다: 다른 지형의 방이 잠깐 비쳤다가 바뀌지 않게.
        if (stageScene.pending(map)) { drawWallDark(ctx, map, area); return true; }
        // 방 그림은 그리기 밖에서 준비된다: 아직 없으면 어둠을 두고 기다린다(걷기와 전투는 그대로 간다).
        const view = stageRoomPictures.roomPictureFor(map, room, p.tileW / WIDE, aheadRoom(run, map, room));
        noteRoom(run, room, performance.now(), !view);
        if (!view) { drawWallDark(ctx, map, area); return true; }
        const box = view.box;
        if (view.kit) stageScene.drawFar(ctx, view, p, area);
        else if (view.open) drawBackdrop(ctx, view, p, area);
        else drawWallDark(ctx, map, area);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(view.canvas, p.mapX + box.x * p.tileW, p.mapY + box.y * p.tileH, stageDots.span(box.columns * p.tileW), stageDots.span(box.rows * p.tileH));
        drawChaosHaze(ctx, map, area);
        drawSpecialGround(ctx, map, p);
        for (const row of actExplorationDoors.doorsHere(run)) drawDoor(ctx, row, p, { run, kit: view.kit });
        drawFrontShade(ctx, view, p, area);
        if (view.kit && typeof stageOcean === 'object') stageOcean.back(ctx, view, p, area); // 심해: 먼 입자와 가디언 방의 리프트
        return true;
    }
    /** 혼돈 층계는 깊을수록 붉은 보랏빛이 조금씩 짙어진다(STAGE_ROOMS.chaosHaze): 방 그림과 소품 위, 문과 배우 아래에 화면 전체로 한 번,
     * 가장자리에 한 번 더 덮는다. */
    function drawChaosHaze(ctx, map, area) {
        const rule = STAGE_ROOMS.chaosHaze, zone = map.region === 'chaos' ? getZone(game.currentZoneId) : null;
        const floor = zone && zone.type === 'abyss' ? Math.min(rule.floors, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1)) : 1;
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
     * 계단 밑으로 네모가 비어져 나왔다). 벽으로 둘러싼 방은 앞쪽이 벽이라 하지 않는다. */
    function drawFrontShade(ctx, view, p, area) {
        const rule = STAGE_ROOMS.frontShade, top = Math.round(p.mapY + (view.room.y1 + 1) * p.tileH), bottom = area.height;
        if ((!view.kit && !view.open) || top >= bottom) return;
        const step = Math.max(1, Math.round(rule.bandDots * p.tileW / WIDE));
        ctx.save();
        ctx.fillStyle = rule.colour;
        for (let band = 0; band < rule.bands && top + band * step < bottom; band++) {
            ctx.globalAlpha = rule.alpha * (band + 1) / rule.bands;
            ctx.fillRect(0, top + band * step, area.width, band === rule.bands - 1 ? bottom - top - band * step : step);
        }
        ctx.restore();
    }

    // ---------------------------------------------------------------- doors
    /** 한 칸짜리 문 자리의 화면 상자. */
    function cellBox(door, p) {
        const centre = p.cellToScreen(door.cell.gx, door.cell.gy);
        return { x: centre.x - p.tileW / 2, y: centre.y - p.tileH / 2, w: p.tileW, h: p.tileH, cx: centre.x, cy: centre.y };
    }
    /** 공용 뿌리 봉인. 조각 묶음에서는 배우로 깊이 정렬하고, 그 밖의 방은 이 자리에서 그린다. */
    function drawDoor(ctx, row, p, look) {
        stageDoorMarks.seal.note(look.run, row);
        const box = cellBox(row.door, p), dot = p.tileW / WIDE;
        const sideways = row.door.side === 'west' || row.door.side === 'east';
        ctx.save();
        if (!look.kit) stageDoorMarks.seal.draw(ctx, look.run, row, { x: box.cx, y: box.cy + box.h / 2, dot });
        if (!row.locked && !(look.kit && sideways) && !stageDoorMarks.underFrame(p, row)) stageDoorMarks.arrows(ctx, box, row.door, { dot });
        ctx.restore();
    }

    // ---------------------------------------------------------------- fade
    /** 방을 옮긴 직후의 어둠: 화면 전체를 덮고 fadeMs 동안 걷힌다. 전투 화면의 맨 위에 그린다. */
    function drawFade(ctx, area) {
        const run = actExplorationState.current(game);
        if (!run || shown.run !== run) return;
        const left = 1 - (performance.now() - shown.at) / STAGE_ROOMS.fadeMs;
        if (!(left > 0)) return;
        ctx.save();
        ctx.globalAlpha = Math.min(1, left * 1.25);
        ctx.fillStyle = '#05040a';
        ctx.fillRect(0, 0, area.width, area.height);
        ctx.restore();
    }
    /** Fixed screen hints follow lighting and hurt shading; room transitions still fade over them. */
    function drawOverlay(ctx, area, p) {
        drawRiftEdges(ctx, p, area);
        drawFade(ctx, area);
    }
    return Object.freeze({ focus, background, drawOverlay });
})();
safeExposeGlobals({ stageRoomsView });
