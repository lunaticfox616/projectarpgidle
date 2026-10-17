/** 방 단위 무대를 그리는 쪽 (2026-10-11 사용자: "던파처럼 방 하나마다 이동하는 방식"). 지도는 js/act-exploration-rooms.js,
 * 문을 지나는 규칙은 js/act-exploration-doors.js에 있고 여기는 그리기만 한다.
 * - 방이 화면보다 좁으면 가운데에 두고, 넓으면 방 끝에서 멈추며 주인공을 따라간다. 세로는 고정하되 주인공 머리가 잘릴 때만 따라간다.
 * - 방 그림은 그리기 밖에서 준비해 둔 것을 쓴다(js/canvas-stage-room-pictures.js): 지금 방과 걸어가는 문 너머의 방.
 *   아직 준비되지 않은 방은 어둠으로 두고, 그림이 오면 그때부터 밝아진다(다른 방의 그림을 잠깐 쓰지 않는다).
 * - 문: 잠긴 문은 회백색 뿌리 봉인, 풀릴 때 아래로 접히며 열린 문에는 방향 화살표가 선다. 보스 방의 표시는 붉다.
 * - 방을 옮기면 화면이 어둠에서 밝아진다(STAGE_ROOMS.fadeMs).
 */
const stageRoomsView = (() => {
    const WIDE = 64;                             // 방 그림에서 한 칸의 가로 도트(js/canvas-stage-terrain.js와 같다)
    const AHEAD_MS = 250;                        // 걸어가는 문 너머의 방을 다시 묻는 간격
    let shown = { run: null, room: null, at: 0 }; // 마지막으로 그린 방과 그 방에 들어선 시각(화면 밝아지기)
    let ahead = { run: null, room: null, at: 0, next: null };

    const mapOf = run => actExplorationDoors.stageMap(run);
    /** The room the camera holds: the hero's (the one being left until the step's half-way point moves the hero). */
    function roomOf(run) {
        const map = mapOf(run);
        return map ? actExplorationRooms.roomAt(map, game.gridPlayer) : null;
    }
    /** 카메라의 가운데 칸(소수): 가로는 방 안에서 따라가고, 세로는 방에 고정하되 작은 화면에서 주인공 머리가 잘릴 때만 따라간다. */
    function focus(run, cell, view) {
        const room = roomOf(run);
        if (!room) return null;
        const left = room.x0 - 1, right = room.x1 + 2, span = right - left;
        const gx = span <= view.columns ? (left + right) / 2
            : Math.max(left + view.columns / 2, Math.min(right - view.columns / 2, cell.gx + .5));
        const row = isOpen(mapOf(run)) ? openFocusRow(room, view) : focusRow(room, view);
        return { gx, gy: stageView.enabled() ? Math.min(row, heroRow(room, cell, view)) : row };
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
        // 넓은 화면: 정해진 높이와, 하단 HUD 위로 앞쪽 문이 드러나는 높이 가운데 더 위쪽(stageView.floorShare). 전장의 px은 UI 배율로 이미 나뉜 값이다.
        return room.y1 + 1 - (stageView.floorShare(view.width, view.height) - stageView.anchorY()) * view.rows;
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
        Object.assign(battleVisualState, { damageTexts: [], projectiles: [], skillProjectiles: [], skillEffects: [] });
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
        ctx.drawImage(view.canvas, p.mapX + box.x * p.tileW, p.mapY + box.y * p.tileH, box.columns * p.tileW, box.rows * p.tileH);
        for (const row of actExplorationDoors.doorsHere(run)) drawDoor(ctx, row, p, { run, kit: view.kit });
        drawFrontShade(ctx, view, p, area);
        return true;
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
        if (!row.locked && !(look.kit && sideways)) stageDoorMarks.arrows(ctx, box, row.door, { dot });
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
    return Object.freeze({ focus, background, drawFade });
})();
safeExposeGlobals({ stageRoomsView });
