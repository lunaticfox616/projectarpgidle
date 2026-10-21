/** 방 입구의 뿌리 봉인과 열린 문의 방향 표시. 봉인은 앞뒤 문에 정면, 좌우 문에 옆에서 본 9프레임 시트를 쓰며(data/stage-view.js
 * STAGE_ROOMS.rootSeal), 잠금 해제 때 한 번 풀린다. 뒤쪽과 앞쪽 표시는 문 칸의 바닥, 좌우 표시는 뿌리가 누운 자리에 선다. 좌우는 화면
 * 가장자리 조명에 묻히지 않게 조명 뒤에 그린다. 저장·잠금·통행 규칙은 바꾸지 않고 그림과 연출 시각만 관리한다.
 */
const stageDoorMarks = (() => {
    const ARROW = Object.freeze({ east: [1, 0], west: [-1, 0], north: [0, -1], south: [0, 1] });
    const INK = Object.freeze({ open: '#f3e5b4', gate: '#ff7a66', shade: '#1b171c' });
    const seals = new WeakMap(); // 탐험마다 현재 방의 연출만 기억한다. 저장·통행 상태에는 쓰지 않는다.
    const opened = new WeakMap(); // 탐험마다 한 번이라도 열린 채로 본 문(id). 저장하지 않는다.
    const sheets = new Map();     // 'front' | 'side' → Image
    /** 그 쪽의 문이 쓰는 시트: 앞뒤 문은 정면, 좌우 문은 옆에서 본 그림. */
    const sheetOf = side => (side === 'west' || side === 'east' ? 'side' : 'front');
    /** 그 시트의 그림: 다 불러왔으면 그림, 아니면 null(처음 부를 때 불러오기 시작한다). */
    function sheetImage(kind) {
        if (!sheets.has(kind)) {
            const image = new Image(), file = STAGE_ROOMS.rootSeal[kind].file;
            image.decoding = 'async';
            image.onerror = () => console.warn('Root seal image failed to load:', file);
            image.src = file;
            sheets.set(kind, image);
        }
        const image = sheets.get(kind);
        return image.complete && image.naturalWidth > 0 ? image : null;
    }
    /** 두 시트를 불러 두고, 둘 다 왔는가. */
    function sealReady() {
        const front = sheetImage('front'), side = sheetImage('side');
        return !!front && !!side;
    }
    const shadedSeals = new Map(); // 시트와 어둠(rgba) → 봉인 시트에 어두운 심해 띠의 어둠을 얹은 그림(js/canvas-stage-ocean.js shade)
    function shadedSeal(kind, image, shade) {
        const key = kind + '|' + shade;
        if (!shadedSeals.has(key)) {
            const canvas = document.createElement('canvas'), c = canvas.getContext('2d');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            c.drawImage(image, 0, 0);
            c.globalCompositeOperation = 'source-atop';
            c.fillStyle = shade;
            c.fillRect(0, 0, canvas.width, canvas.height);
            shadedSeals.set(key, canvas);
        }
        return shadedSeals.get(key);
    }
    function sealRoom(run, id) {
        let room = seals.get(run);
        if (!room || room.id !== id) {
            room = { id, doors: new Map() };
            seals.set(run, room);
        }
        return room;
    }
    /** 봉인이 닫힌 모습인가: 잠긴 문. 다만 방에 막 들어선 유예로만 잠긴 문(row.arrival)은 한 번이라도 열린 채로 봤으면 접힌 채로 둔다
     * (2026-10-17 사용자 "입장 유예 동안에도 이미 연 문은 봉인을 접힌 모습으로": 방에 들어설 때마다 닫혔다 다시 열렸다). */
    function sealShut(run, row) {
        if (!opened.has(run)) opened.set(run, new Set());
        const seen = opened.get(run);
        if (!row.locked) seen.add(row.door.id);
        return row.locked && !(row.arrival && seen.has(row.door.id));
    }
    /** 모든 문을 화면 밖에서도 관찰한다. 처음 보는 열린 문·재진입은 마지막 모습, 잠금 해제만 1회 재생한다. */
    function noteSeal(run, row, now = performance.now()) {
        const last = STAGE_ROOMS.rootSeal.ends.length;
        if (!run) return row.locked ? 0 : last;
        const shut = sealShut(run, row), room = sealRoom(run, row.door.room);
        let entry = room.doors.get(row.door.id);
        if (!entry) {
            entry = { locked: shut, at: -Infinity };
            room.doors.set(row.door.id, entry);
        } else if (entry.locked !== shut) {
            entry.at = shut ? -Infinity : now;
            entry.locked = shut;
        }
        if (shut) return 0;
        const frame = STAGE_ROOMS.rootSeal.ends.findIndex(end => now - entry.at < end);
        return frame < 0 ? last : frame;
    }
    /** at는 발 자리와 도트 배율. 앞뒤 문은 정면 시트, 좌우 문은 옆 시트를 쓰고, 옆 그림은 앞이 화면 왼쪽을 보므로 서쪽 문에서는
     * 발 자리를 축으로 좌우를 뒤집는다(뿌리 끝이 방 안을 본다). 회전하거나 눌러 그리지 않는다. */
    function drawSeal(ctx, run, row, at) {
        const frame = noteSeal(run, row), kind = sheetOf(row.door.side), spec = STAGE_ROOMS.rootSeal[kind], image = sheetImage(kind);
        if (!image) return false;
        const w = spec.width * at.dot, h = spec.height * at.dot, hero = at.hero, shade = typeof stageOcean === 'object' ? stageOcean.shade() : null;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (hero && hero.y < at.y && hero.y > at.y - spec.heights[frame] * at.dot && Math.abs(hero.x - at.x) < spec.half * at.dot) ctx.globalAlpha *= .5;
        if (row.door.side === 'west') { ctx.translate(Math.round(at.x) * 2, 0); ctx.scale(-1, 1); }
        ctx.drawImage(shade ? shadedSeal(kind, image, shade) : image, frame * spec.width, 0, spec.width, spec.height,
            Math.round(at.x - w / 2), Math.round(at.y - spec.anchorY * at.dot), w, h);
        ctx.restore();
        return true;
    }
    /** 문 자리의 빛: 바닥에 깔리면 납작한 타원, 좌우 문에 세우면 세로로 긴 타원. */
    function glow(ctx, box, colour, upright) {
        const light = ctx.createRadialGradient(box.cx, box.cy, 0, box.cx, box.cy, box.w * .75);
        light.addColorStop(0, colour + (upright ? '80' : '66'));
        light.addColorStop(1, colour + '00');
        ctx.save();
        ctx.translate(box.cx, box.cy); ctx.scale(upright ? .8 : 1, upright ? 1.25 : .5); ctx.translate(-box.cx, -box.cy);
        ctx.fillStyle = light;
        ctx.fillRect(box.cx - box.w, box.cy - box.w, box.w * 2, box.w * 2);
        ctx.restore();
    }
    /** 도트 갈매기 표시 하나(dx, dy 쪽을 가리킨다): 어두운 그림자 위에 size 굵기로 찍는다. squash = 깊이 쪽 길이를 누르는 비율. */
    function chevron(ctx, mark) {
        const { dx, dy, size, squash } = mark;
        for (const [shade, colour] of [[mark.dot, INK.shade], [0, mark.colour]]) {
            ctx.fillStyle = colour;
            for (let step = 0; step < 4; step++) {
                const along = dx ? [-dx * step * size, 0] : [0, -dy * step * size * squash], across = dx ? [0, step * size * squash] : [step * size, 0];
                for (const side of [-1, 1]) {
                    ctx.fillRect(Math.round(mark.x + along[0] + across[0] * side), Math.round(mark.y + along[1] + across[1] * side + shade), size, size);
                }
            }
        }
    }
    /** 문 표시 위의 글(2026-10-16 사용자 "첫 시작 - 오른쪽 방 이동하는 위치(문) 좀 더 직관적으로"): 보스 방 문은 '보스 방', 아직 가 보지 않은
     * 방으로 가는 문은 '다음 방', 가 본 방으로 가는 문은 글이 없다. NPC 이름과 같은 글꼴로 화살표 위에 선다. */
    function doorLabel(door) {
        if (door.gate) return '보스 방';
        const run = actExplorationState.current(game), map = run ? actExplorationDoors.stageMap(run) : null, to = map && map.rooms[door.to];
        return to && !run.visitedRooms.includes(to.id) ? '다음 방' : '';
    }
    // NPC 이름처럼 갈무리11 12px(2026-10-21): 적어 둔 MulmaruMono는 웹 글꼴로 불러오지 않아 맑은 고딕 13px로 그려졌다.
    const LABEL_FONT = `12px 'Galmuri11', 'Malgun Gothic', sans-serif`;
    function markLabel(ctx, label, at, colour) {
        ctx.globalAlpha = 1;
        ctx.font = LABEL_FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(8,6,4,0.9)';
        ctx.fillStyle = colour;
        drawCrispCanvasText(ctx, label, at.x, at.y, 'strokeText');
        drawCrispCanvasText(ctx, label, at.x, at.y);
    }
    /**
     * @param {{cx:number, cy:number, w:number}} box where the mark sits and how wide its light spreads
     * @param {{side:string, gate?:boolean, to?:number}} door the side it leads out by; the boss gate is red; to = the room it leads to
     * @param {{dot:number, thick?:number, upright?:boolean}} look one dot on screen, the stroke in dots, standing in a door frame
     */
    function arrows(ctx, box, door, look) {
        const [dx, dy] = ARROW[door.side], phase = performance.now() / 240, colour = door.gate ? INK.gate : INK.open;
        const size = Math.max(2, Math.round(look.dot * (look.thick || 2))), squash = look.upright ? 1 : .5, gap = size * 3.5, dim = look.upright ? .55 : .3;
        ctx.save();
        // 밝은 바닥(심해 얕은 암초의 흰 모래)에서는 빛무리가 묻혀 어둡게 깐다
        glow(ctx, box, typeof stageOcean === 'object' && stageOcean.brightFloor() ? INK.shade : colour, !!look.upright);
        for (let i = 0; i < 3; i++) {
            const reach = (i - 1) * gap;
            ctx.globalAlpha = dim + (1 - dim) * Math.max(0, Math.sin(phase - i * .9));
            chevron(ctx, { x: box.cx + dx * reach - size / 2, y: box.cy + dy * reach * squash - size / 2, dx, dy, dot: Math.max(1, Math.round(look.dot)), size, squash, colour });
        }
        const label = doorLabel(door);
        if (label) markLabel(ctx, label, { x: box.cx, y: box.cy - box.w * 0.8 }, colour);
        ctx.restore();
    }
    /** 열린 문이 화면 옆으로 벗어나 있으면 그쪽 화면 가장자리에 같은 표시를 세운다. 방이 화면보다 넓어(휴대폰은 여덟 칸만 보인다)
     * 싸움이 끝난 뒤 어느 쪽으로 나가는지 보이지 않았다(2026-10-13 무대를 직접 돌려 본 결과). 문의 높이에 세우므로 뒤쪽, 옆, 앞쪽 문이
     * 서로 다른 높이에 선다. @param rows actExplorationDoors.doorsHere의 줄들 @param width 전장의 가로(CSS px) */
    function edgeMarks(ctx, p, rows, width) {
        const inset = Math.round(p.tileW * 0.5), dot = p.tileW / 64;
        if (!(width > 0)) return;   // 전장의 크기를 아직 모른다
        for (const row of rows) {
            const at = row.locked ? null : p.cellToScreen(row.door.cell.gx, row.door.cell.gy);
            if (!at) continue;
            // 오른쪽은 전투 기록이나 채팅 창이 가리는 데까지만 보인다: 창 밑에 깔린 문도 창 왼쪽에 표시를 세운다
            const limit = shownUntil(at.y, width);
            if (at.x >= 0 && !beyond(at.x, limit, p)) continue;
            const side = at.x < 0 ? 'west' : 'east';
            arrows(ctx, { cx: side === 'west' ? inset : limit - inset, cy: at.y, w: p.tileW * 0.7 }, { ...row.door, side }, { dot, thick: 3, upright: true });
        }
    }
    /** 그 높이에서 전장이 오른쪽으로 어디까지 보이는가(전장의 px): 창에 가려지지 않았으면 전장의 너비. */
    const shownUntil = (y, width) => (typeof messageFrames === 'object' ? messageFrames.coveredFrom(y, width) : width);
    /** Past the visible part on the right (half a cell short of limit): edgeMarks stands the door's mark at the edge instead. */
    const beyond = (x, limit, p) => x > limit - Math.round(p.tileW * 0.5);
    /** Whether an open door's own mark would sit under the log or chat window. Its mark then stands at the window's edge
     * (edgeMarks), so the door's own one is not drawn: it showed through the window, its 다음 방 label over the window's head
     * (2026-10-18 first minutes at 1536x864). */
    function underFrame(p, row) {
        const width = typeof lastBattlefieldCanvasSize === 'object' && lastBattlefieldCanvasSize ? lastBattlefieldCanvasSize.width : 0;
        const at = width > 0 && !row.locked ? p.cellToScreen(row.door.cell.gx, row.door.cell.gy) : null;
        return !!at && at.x >= 0 && beyond(at.x, shownUntil(at.y, width), p);
    }
    return Object.freeze({ arrows, edges: edgeMarks, underFrame, seal: Object.freeze({ ready: sealReady, note: noteSeal, draw: drawSeal }) });
})();
safeExposeGlobals({ stageDoorMarks });
