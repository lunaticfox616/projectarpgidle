/** 방 단위 무대를 그리는 쪽 (2026-10-11 사용자: "던파처럼 방 하나마다 이동하는 방식"). 지도는 js/act-exploration-rooms.js,
 * 문을 지나는 규칙은 js/act-exploration-doors.js에 있고 여기는 그리기만 한다.
 * - 카메라는 주인공이 선 방에 고정된다: 방이 화면보다 좁으면 방을 가운데에 두고, 넓으면 방 끝에서 멈추며 주인공을 따라간다.
 * - 방 그림은 그 방 하나만 그려 둔다(js/canvas-stage-terrain.js의 box). 방이 바뀌면 다시 그린다(몇 ms).
 * - 문: 잠긴 문은 쇠창살, 열린 문은 나가는 쪽을 가리키며 깜빡이는 화살표. 보스 방으로 가는 문은 붉다.
 * - 방을 옮기면 화면이 어둠에서 밝아진다(STAGE_ROOMS.fadeMs).
 */
const stageRoomsView = (() => {
    const WIDE = 64;                             // 방 그림에서 한 칸의 가로 도트(js/canvas-stage-terrain.js와 같다)
    let picture = null;                          // { map, room, canvas, box }
    let shown = { run: null, room: null, at: 0 }; // 마지막으로 그린 방과 그 방에 들어선 시각(화면 밝아지기)

    const mapOf = run => actExplorationDoors.stageMap(run);
    /** The room the camera holds: the hero's (the one being left until the step's half-way point moves the hero). */
    function roomOf(run) {
        const map = mapOf(run);
        return map ? actExplorationRooms.roomAt(map, game.gridPlayer) : null;
    }
    /** 방 그림이 담는 칸 범위: 방과 둘레의 벽. 배경 그림을 쓰는 방(open)은 바닥과 길이 화면 끝까지 가도록 더 넓게 담는다. */
    function boxOf(map, room, open) {
        const frame = open ? STAGE_ROOMS.openFrame : STAGE_ROOMS.frame;
        const x = Math.max(0, room.x0 - frame.side), y = Math.max(0, room.y0 - frame.top);
        return { x, y, columns: Math.min(map.columns, room.x1 + frame.side + 1) - x, rows: Math.min(map.rows, room.y1 + frame.bottom + 1) - y };
    }
    /** 카메라의 가운데 칸(소수): 가로는 방 안에서 주인공을 따라가되 방 둘레의 벽 한 칸 밖은 보이지 않게, 세로는 방에 고정. */
    function focus(run, cell, view) {
        const room = roomOf(run);
        if (!room) return null;
        const left = room.x0 - 1, right = room.x1 + 2, span = right - left;
        const gx = span <= view.columns ? (left + right) / 2
            : Math.max(left + view.columns / 2, Math.min(right - view.columns / 2, cell.gx + .5));
        return { gx, gy: stageBackdrop.ready(mapOf(run)) ? openFocusRow(room, view) : focusRow(room, view) };
    }
    /** 배경 그림을 쓰는 방: 바닥의 앞쪽 끝이 화면의 정해진 높이(STAGE_ROOMS.floorBottom)에 오게 한다. 그 위로 바닥 다섯 줄, 그 위가 배경이다. */
    function openFocusRow(room, view) {
        const narrow = view.width < STAGE_VIEW.minColumns.narrowBelow;
        const share = narrow ? STAGE_ROOMS.floorBottom.narrow : STAGE_ROOMS.floorBottom.wide;
        return room.y1 + 1 - (share - stageView.anchorY()) * view.rows;
    }
    /** 세로로 화면의 기준 줄(stageView.anchorY)에 올 칸: 뒷벽 꼭대기(방 위 네 칸)부터 앞쪽 문 자리까지의 가운데에서, 뒷벽이 잘리지
     * 않는 만큼(최대 lift칸) 방을 위로 올린다. 화면 아래쪽은 HUD가 덮어 앞쪽 문이 가려지기 때문이다. */
    function focusRow(room, view) {
        const top = room.y0 - 4, bottom = room.y1 + 2, half = (bottom - top) / 2;
        const headroom = stageView.anchorY() * view.rows - half - .5;
        return (top + bottom) / 2 + Math.max(0, Math.min(STAGE_ROOMS.lift, headroom));
    }
    /** 배경 그림이 준비된 지형이면 벽 없는 방(바닥과 길, 뒷문의 굴)을, 아니면 벽돌 뒷벽이 선 방을 그려 둔다. */
    function prepare(map, room) {
        const open = stageBackdrop.ready(map);
        if (picture && picture.map === map && picture.room === room && picture.open === open) return picture;
        const box = boxOf(map, room, open);
        picture = { map, room, box, open, canvas: open ? stageTerrain.paintOpen(map, room, box, stageBackdrop.look(map)) : stageTerrain.paint(map, box) };
        return picture;
    }
    /** 방 뒤쪽: 배경 그림을 바닥선 위에 세우고 그 아래는 그림의 빈 띠와 같은 어둠으로 채운다. 방이 화면보다 넓으면 배경이 조금 따라 움직인다. */
    function drawBackdrop(ctx, view, p, area) {
        const room = view.room, look = stageBackdrop.look(view.map), span = (room.x1 - room.x0 + 3) * p.tileW;
        ctx.fillStyle = look.earth;
        ctx.fillRect(0, 0, area.width, area.height);
        stageBackdrop.draw(ctx, view.map, { width: area.width, groundY: p.mapY + room.y0 * p.tileH, dot: p.tileW / WIDE,
            drift: p.mapX + (room.gx + .5) * p.tileW - area.width / 2, slack: Math.max(0, span - area.width) / 2 });
    }
    function drawWallDark(ctx, map, area) {
        ctx.fillStyle = stageTerrain.colours(map).dark;
        ctx.fillRect(0, 0, area.width, area.height);
    }
    /** 방이 바뀐 순간을 기억한다(밝아지기의 시작). 탐험이 바뀐 첫 방은 밝아지지 않고 바로 보인다. */
    function noteRoom(run, room, now) {
        if (shown.run === run && shown.room === room) return;
        shown = { run, room, at: shown.run === run ? now : -Infinity };
    }
    /** @returns {boolean} whether the run is a room-by-room stage and its room was drawn (the caller then skips the map picture and fog) */
    function background(ctx, run, p, area) {
        const map = mapOf(run), room = map ? roomOf(run) : null;
        if (!room) return false;
        const view = prepare(map, room), box = view.box;
        noteRoom(run, room, performance.now());
        if (view.open) drawBackdrop(ctx, view, p, area);
        else drawWallDark(ctx, map, area);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(view.canvas, p.mapX + box.x * p.tileW, p.mapY + box.y * p.tileH, box.columns * p.tileW, box.rows * p.tileH);
        for (const row of actExplorationDoors.doorsHere(run)) drawDoor(ctx, row, p);
        return true;
    }

    // ---------------------------------------------------------------- doors
    const ARROW = Object.freeze({ east: [1, 0], west: [-1, 0], north: [0, -1], south: [0, 1] });
    const INK = Object.freeze({ open: '#f3e5b4', gate: '#ff7a66', bar: '#1b171c', barLight: '#6d6470' });
    /** 한 칸짜리 문 자리의 화면 상자. */
    function cellBox(door, p) {
        const centre = p.cellToScreen(door.cell.gx, door.cell.gy);
        return { x: centre.x - p.tileW / 2, y: centre.y - p.tileH / 2, w: p.tileW, h: p.tileH, cx: centre.x, cy: centre.y };
    }
    /** 잠긴 문: 문 자리를 어둡게 덮고 쇠창살을 세운다. */
    function drawBars(ctx, box, dot) {
        ctx.fillStyle = 'rgba(8,6,12,0.62)';
        ctx.fillRect(box.x, box.y, box.w, box.h);
        const count = 5, gap = box.w / (count + 1), height = box.h + dot * 10;
        for (let i = 1; i <= count; i++) {
            const x = Math.round(box.x + gap * i - dot);
            ctx.fillStyle = INK.bar;
            ctx.fillRect(x, box.y + box.h - height, dot * 3, height);
            ctx.fillStyle = INK.barLight;
            ctx.fillRect(x, box.y + box.h - height, dot, height);
        }
        ctx.fillStyle = INK.bar;
        ctx.fillRect(box.x, box.y + box.h - height + dot * 3, box.w, dot * 2);
    }
    /** 열린 문: 문 자리에 빛이 깔리고, 나가는 쪽을 가리키는 갈매기 표시 셋이 차례로 밝아진다. */
    function drawArrows(ctx, box, door, dot) {
        const [dx, dy] = ARROW[door.side], phase = performance.now() / 240, colour = door.gate ? INK.gate : INK.open;
        glow(ctx, box, colour);
        for (let i = 0; i < 3; i++) {
            const reach = (i - 1) * dot * 7;
            ctx.globalAlpha = .3 + .7 * Math.max(0, Math.sin(phase - i * .9));
            chevron(ctx, { x: box.cx + dx * reach, y: box.cy + dy * reach * .5, dx, dy, dot, colour });
        }
        ctx.globalAlpha = 1;
    }
    /** 도트 갈매기 표시 하나(dx, dy 쪽을 가리킨다): 어두운 그림자 위에 두 도트 굵기로 찍는다. */
    function chevron(ctx, mark) {
        const { dx, dy, dot } = mark, size = dot * 2;
        for (const [shade, colour] of [[dot, INK.bar], [0, mark.colour]]) {
            ctx.fillStyle = colour;
            for (let step = 0; step < 4; step++) {
                const back = step * size, spread = step * size;
                const along = dx ? [-dx * back, 0] : [0, -dy * back * .5], across = dx ? [0, spread * .5] : [spread, 0];
                for (const side of [-1, 1]) {
                    ctx.fillRect(Math.round(mark.x + along[0] + across[0] * side), Math.round(mark.y + along[1] + across[1] * side + shade), size, size);
                }
            }
        }
    }
    function drawDoor(ctx, row, p) {
        const box = cellBox(row.door, p), dot = Math.max(1, Math.round(p.tileW / WIDE));
        ctx.save();
        if (row.locked) drawBars(ctx, box, dot);
        else drawArrows(ctx, box, row.door, dot);
        ctx.restore();
    }
    /** 문 자리 바닥에 깔리는 빛(납작한 타원). */
    function glow(ctx, box, colour) {
        const light = ctx.createRadialGradient(box.cx, box.cy, 0, box.cx, box.cy, box.w * .75);
        light.addColorStop(0, colour + '66');
        light.addColorStop(1, colour + '00');
        ctx.save();
        ctx.translate(box.cx, box.cy); ctx.scale(1, .5); ctx.translate(-box.cx, -box.cy);
        ctx.fillStyle = light;
        ctx.fillRect(box.cx - box.w, box.cy - box.w, box.w * 2, box.w * 2);
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
