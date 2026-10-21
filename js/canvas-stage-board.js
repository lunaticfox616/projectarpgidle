/** 옆에서 보는 무대의 고정 전장 (docs/stage-view-20261011.md, 2026-10-13 무대를 직접 돌려 본 결과).
 * 걷는 지도가 없는 구역은 위에서 본 판 그림을 세로로 눌러 그렸다(2026-10-13 밤부터 방 단위 무대에서는 벌집, 군락지, 심해, 우주계, 대균열,
 * 혼돈 밖, 나무꾼의 잔상, 경계 너머가 모두 제 지도를 걷는다: js/content-maps.js withRooms. 판은 방 단위를 끈 창에만 남았다): 주인공과 몬스터가 방
 * 무대의 두 배 가까운 크기로 거칠게 보였고 바닥은 흐렸다. 그 구역의 지역 무대 그림(data/stage-regions.js)이 있으면 방 하나처럼
 * 그린다: 칸의 크기는 방 무대와 같고(화면 너비에 스무 칸), 아홉 칸에 여덟 줄의 판이 화면 가운데에 놓이며, 뒤에는 지역 그림이,
 * 판 밖의 바닥에는 그늘이 깔린다. 칸의 수와 판정은 그대로다: 그리는 자리만 바꾼다.
 * 그 구역의 지역 그림이 없으면(케르베로스 전장, 테스트 패널에서 배경 그림을 끈 때) 앞서의 판 그림을 그대로 쓰되 칸의 크기만 방 무대에
 * 맞춘다. 무대가 꺼져 있으면 null과 false를 답해 위에서 보는 전장 그대로다.
 */
const stageBoard = (() => {
    const WIDE = 64;                                                    // 그늘 그림에서 한 칸의 가로 도트(js/canvas-stage-region.js와 같다)
    const FRAME = Object.freeze({ side: 9, top: 2, bottom: 8 });       // 그늘 그림이 판 둘레로 더 담는 칸 수
    const maps = new Map();                                             // "지역|가로|세로" → 방 하나짜리 지도(지역 그림을 그리는 쪽이 읽는 모양)
    // 지도 → { canvas, box }: 판과 고스트 대전의 방(js/ghost-duel-stage-ui.js)이 한 화면에 번갈아 그려져도 그늘을 다시 칠하지 않는다
    const shades = new Map(), SHADES_KEPT = 2;

    const boardLayout = () => ACT_BATTLE_MAP_LAYOUT;
    /** 구역 → 지역 이름. 무대가 꺼져 있거나 표에 없는 구역이면 ''. */
    function boardRegion(zone) {
        if (!zone || !stageView.enabled() || typeof STAGE_ROOM_PLANS !== 'object') return '';
        // 심해 판은 방 지도처럼 수심 띠의 그림이다(가디언 판은 해구)
        if (zone.type === 'oceanDepth') return actExplorationRoomPlans.oceanRegion(zone, !!game.oceanBossRunPending);
        return STAGE_ROOM_PLANS.regions.boards[zone.type] || '';
    }
    /** 지역 그림을 그리는 쪽(js/canvas-stage-region.js)에 넘길 지도: 문 없는 방 하나(고정 전장은 판 전체, 고스트 대전은 그 방). */
    function roomMapOf(region, columns, rows) {
        const key = `${region}|${columns}|${rows}`, layout = boardLayout();
        if (!maps.has(key)) {
            const room = Object.freeze({ index: 0, id: 'board', role: 'battle', x0: 0, y0: 0, x1: columns - 1, y1: rows - 1, mirror: false });
            const id = columns === layout.columns && rows === layout.rows ? 'board:' + region : 'board:' + key;
            maps.set(key, Object.freeze({ id, region, stage: true, rooms: Object.freeze([room]), doors: Object.freeze([]), plan: Object.freeze({ boxes: Object.freeze([]) }) }));
        }
        return maps.get(key);
    }
    /** 그 지역의 방 하나를 무대 그림으로 그리는가: 그 지도와 그림의 상태('ready', 'pending'). 그림이 없는 지역이면 null. */
    function roomStage(region, columns, rows) {
        const map = region ? roomMapOf(region, columns, rows) : null, status = map ? stageRegion.status(map) : null;
        return status === 'ready' || status === 'pending' ? { map, status } : null;
    }
    /** 이 구역의 판을 무대 그림으로 그리는가(roomStage). */
    function boardStage(zone) {
        const layout = boardLayout();
        return roomStage(boardRegion(zone), layout.columns, layout.rows);
    }
    /** columns × rows 칸의 방을 화면에 놓는 자리. 칸은 방 무대와 같은 규칙으로: 너비와, 방의 깊이가 화면 높이에 들어오는 크기
     * (stageView.tile)이되 방이 화면에 다 들어오게 줄인다(좁은 화면). */
    function roomPlace(width, height, columns, rows) {
        const tile = Math.min(stageView.tile(width, height, rows), Math.floor(width / (columns + 0.5))), deep = tile * stageView.depth();
        const left = Math.round((width - columns * tile) / 2), top = Math.round(height * stageView.floorShare(width, height) - rows * deep);
        const cells = { tileW: tile, tileH: deep, actorGroundOffsetY: deep / 6, unitScaleCap: tile / 46, cellToScreen: (gx, gy) => ({ x: left + (gx + 0.5) * tile, y: top + (gy + 0.5) * deep }) };
        return { cells, left, top };
    }
    /** 고정 전장의 화면 자리. 칸은 방 무대의 크기이되 판이 화면에 다 들어오게 줄인다(좁은 화면).
     * @returns {?object} js/ui.js getFixedBattleGridProjection과 같은 모양, 무대 그림으로 그리지 않는 구역이면 null */
    function boardProjection(width, height, zone) {
        if (!stageView.enabled()) return null;
        const stage = boardStage(zone), layout = boardLayout();
        const { cells, left, top } = roomPlace(width, height, layout.columns, layout.rows), tile = cells.tileW, deep = cells.tileH;
        if (stage) return { ...cells, mapX: left, mapY: top, mapWidth: layout.columns * tile, mapHeight: layout.rows * deep, stageBoard: stage };
        // 지역 그림이 없는 고정 전장(케르베로스): 앞서의 판 그림을 그대로 쓰되 칸은 방 무대의 크기다. 판 그림을 놓는 쪽(js/ui.js
        // drawGridAlignedBackdrop)이 읽는 지도 상자는 판 그림 전체(칸 둘레의 장식까지)라, 칸의 자리에서 거꾸로 셈해 준다.
        const scale = tile / layout.cellWidth, tall = deep / layout.cellHeight;
        return { ...cells, mapX: left - layout.gridOriginX * scale, mapY: top - layout.gridOriginY * tall, mapWidth: layout.width * scale, mapHeight: layout.height * tall };
    }
    /** 판 밖의 바닥이 멀어질수록 어두워지는 그늘(판마다 한 번 그려 둔다). */
    function boardShade(map) {
        if (!shades.has(map)) {
            const room = map.rooms[0], box = { x: -FRAME.side, y: -FRAME.top, columns: room.x1 + 1 + FRAME.side * 2, rows: room.y1 + 1 + FRAME.top + FRAME.bottom };
            shades.set(map, { box, canvas: stageRegion.paintRoom(map, room, box) });
            if (shades.size > SHADES_KEPT) shades.delete(shades.keys().next().value);
        }
        return shades.get(map);
    }
    /** 고정 전장의 배경: 지역 그림과 그늘. p는 boardProjection이 준 자리다.
     * @returns {boolean} 그렸는가(그렸으면 부르는 쪽은 앞서의 판 그림을 그리지 않는다) */
    function boardBackground(ctx, p, area) {
        const stage = p && p.stageBoard;
        if (!stage) return false;
        ctx.save();
        if (stage.status !== 'ready' || stageRegion.status(stage.map) !== 'ready') {
            // 그림을 불러오는 동안은 어둠만 둔다(방 무대와 같다)
            ctx.fillStyle = '#0b090c';
            ctx.fillRect(0, 0, area.width, area.height);
            ctx.restore();
            return true;
        }
        stageRegion.drawFar(ctx, { map: stage.map, room: stage.map.rooms[0] }, p, area);
        const under = boardShade(stage.map), box = under.box, dot = p.tileW / WIDE;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(under.canvas, Math.round(p.mapX + box.x * p.tileW), Math.round(p.mapY + box.y * p.tileH), Math.round(under.canvas.width * dot), Math.round(under.canvas.height * dot));
        ctx.restore();
        return true;
    }
    return Object.freeze({ projection: boardProjection, background: boardBackground, room: roomStage, place: roomPlace });
})();
safeExposeGlobals({ stageBoard });
