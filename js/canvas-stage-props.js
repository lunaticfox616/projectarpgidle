/** 무대의 소품 층 (2026-10-11 사용자: 던파의 무대는 그림 한 장이 아니라 층과 조각이다). 방 단위 무대를 던파처럼 겹쳐 그린다:
 * 먼 배경(js/canvas-stage-backdrop.js) → 뒤쪽 띠와 바닥(js/canvas-stage-sanctum.js) → 소품(여기) → 캐릭터 → 앞쪽 소품(여기).
 * 소품은 바위, 뿌리, 선돌, 고사리 같은 조각 그림이고(data/stage-view.js STAGE_PROPS, 그리는 도구 scripts/build-stage-objects.cjs)
 * 방마다 정해진 규칙으로 놓는다: 바닥 뒤쪽 끝을 따라 한 줄, 양옆 바깥에 몇 개, 앞쪽 바깥에 한 줄. 걸을 수 있는 칸 위에는 놓지 않고
 * 문 앞은 비운다. 같은 방은 언제나 같은 자리다. 캐릭터와 같은 깊이 순서로 그려서 뒤쪽 소품은 캐릭터 뒤에, 앞쪽 소품은 앞에 선다.
 * 주인공이 앞쪽 소품 뒤에 서면 그 소품이 비쳐 보인다. 그리기만 하고 전투나 길 찾기에는 닿지 않는다.
 */
const stageProps = (() => {
    const WIDE = 64, DEEP = 32;                 // 한 칸의 도트(js/canvas-stage-terrain.js와 같다)
    const sheets = new Map();                   // 그림 파일 → Image
    const layouts = new WeakMap();              // 지도 → Map(방 번호 → 소품 목록)
    const bounds = new Map();                   // "그림|칸" → 그 칸에서 그림이 차지하는 상자(도트, 발 자리 기준)

    /** 지도의 지형에 소품 묶음이 있고 그 방을 배경 그림으로 그릴 때만 놓는다. */
    function themeOf(map) {
        if (stageScene.ready(map)) return null;     // 조각 묶음이 있는 지형은 그 묶음의 소품을 쓴다(js/canvas-stage-scene.js)
        const look = stageBackdrop.look(map);
        return look && stageBackdrop.ready(map) ? STAGE_PROPS.themes[look.props] || null : null;
    }
    function image(theme) {
        if (!sheets.has(theme.sheet)) {
            const sheet = new Image();
            sheet.decoding = 'async';
            sheet.src = theme.sheet;
            sheets.set(theme.sheet, sheet);
        }
        const sheet = sheets.get(theme.sheet);
        return sheet.complete && sheet.naturalWidth > 0 ? sheet : null;
    }
    /** 같은 씨앗에서 언제나 같은 수가 차례로 나온다(Math.random을 쓰지 않는다: 방은 언제나 같은 모습이다). */
    function stream(seed) {
        let value = seed >>> 0;
        return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
    }
    function pick(table, roll) {
        const total = table.reduce((sum, row) => sum + row[1], 0);
        let edge = 0;
        for (const [name, weight] of table) { edge += weight / total; if (roll < edge) return name; }
        return table[table.length - 1][0];
    }
    /** 문 앞에는 놓지 않는다: 그 방의 문이 벽을 따라 놓인 자리(도트)를 벽마다 모은다. */
    function doorSpots(map, room) {
        const spots = { north: [], south: [], west: [], east: [] };
        for (const door of map.doors.filter(row => row.room === room.index)) {
            spots[door.side].push(door.side === 'north' || door.side === 'south' ? (door.cell.gx + 0.5) * WIDE : (door.cell.gy + 0.5) * DEEP);
        }
        return spots;
    }
    const clear = (spots, at, reach) => spots.every(spot => Math.abs(spot - at) > reach);
    /** 바닥의 뒤쪽 끝이나 앞쪽 바깥을 따라 한 줄. row = { table, gap, y(x) → 발 자리, spots, reach } */
    function along(list, rand, span, row) {
        for (let x = span.from + rand() * row.gap[0]; x < span.to; x += row.gap[0] + rand() * (row.gap[1] - row.gap[0])) {
            const name = pick(row.table, rand()), flip = rand() > 0.5, y = row.y(rand());
            if (clear(row.spots, x, row.reach)) list.push({ name, x: Math.round(x), y: Math.round(y), flip });
        }
    }
    /** 방 하나의 소품 자리(도트, 지도 좌표). */
    function layoutOf(map, room, theme) {
        const left = room.x0 * WIDE, right = (room.x1 + 1) * WIDE, top = room.y0 * DEEP, bottom = (room.y1 + 1) * DEEP;
        const rand = stream(room.index * 7919 + map.columns * 31 + 17), spots = doorSpots(map, room), list = [];
        along(list, rand, { from: left - 60, to: right + 60 }, { table: theme.back, gap: theme.backGap, y: roll => top - 4 + roll * 5, spots: spots.north, reach: 58 });
        along(list, rand, { from: left - 40, to: right + 40 }, { table: theme.front, gap: theme.frontGap, y: roll => bottom + 24 + roll * 30, spots: spots.south, reach: 62 });
        for (const [side, edge, taken] of [[-1, left, spots.west], [1, right, spots.east]]) {
            for (let i = 0; i < theme.sides; i++) {
                const y = top + 24 + (i + rand() * 0.8) * (bottom - top - 30) / theme.sides, x = edge + side * (28 + rand() * 52), name = pick(theme.side, rand());
                if (clear(taken, y, 28)) list.push({ name, x: Math.round(x), y: Math.round(y), flip: side > 0 });
            }
        }
        return list;
    }
    function propsOf(map, room, theme) {
        if (!layouts.has(map)) layouts.set(map, new Map());
        const rooms = layouts.get(map);
        if (!rooms.has(room.index)) rooms.set(room.index, layoutOf(map, room, theme));
        return rooms.get(room.index);
    }
    /** 전장 그리기의 배우 목록에 이 방의 소품을 끼운다(깊이 순서는 발 자리의 화면 y). */
    function append(actors, state) {
        const run = actExplorationState.current(game), map = actExplorationDoors.stageMap(run), room = map ? actExplorationDoors.room(run) : null;
        const theme = room ? themeOf(map) : null, p = state.gridProj;
        if (!theme || !image(theme)) return;
        const dot = p.tileW / WIDE;
        propsOf(map, room, theme).forEach((prop, index) => {
            const x = p.mapX + prop.x * dot, y = p.mapY + prop.y * dot;
            if (x < -STAGE_PROPS.cell * dot || x > state.width + STAGE_PROPS.cell * dot) return;
            actors.push({ kind: 'scenery', id: -1000 - index, y, prop: { ...prop, theme }, point: { x, y } });
        });
    }
    /** 그 칸의 그림이 차지하는 상자: 발 자리에서 왼쪽, 오른쪽, 위로 몇 도트인지(한 번 재서 둔다). */
    function boundsOf(theme, index) {
        const key = theme.sheet + '|' + index, cell = STAGE_PROPS.cell;
        if (bounds.has(key)) return bounds.get(key);
        const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = canvas.height = cell;
        ctx.drawImage(image(theme), index * cell, 0, cell, cell, 0, 0, cell, cell);
        const alpha = ctx.getImageData(0, 0, cell, cell).data, box = { left: cell, right: 0, top: cell };
        for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
            if (alpha[(y * cell + x) * 4 + 3] < 128) continue;
            box.left = Math.min(box.left, x); box.right = Math.max(box.right, x); box.top = Math.min(box.top, y);
        }
        const [fx, fy] = STAGE_PROPS.feet, measured = { left: fx - box.left, right: box.right - fx, tall: fy - box.top };
        bounds.set(key, measured);
        return measured;
    }
    /** 주인공이 이 소품 바로 뒤에 서 있는가(소품이 주인공을 가린다). */
    function hidesHero(actor, state, box, dot) {
        const hero = state.playerPos, dx = hero.x - actor.point.x;
        return hero.y < actor.y && hero.y > actor.y - box.tall * dot && dx > -box.left * dot - 6 && dx < box.right * dot + 6;
    }
    function draw(ctx, actor, state) {
        const prop = actor.prop, index = STAGE_PROPS.names.indexOf(prop.name), sheet = image(prop.theme);
        if (index < 0 || !sheet) return;
        const dot = stageActors.scaleFor(state.gridProj.tileW), cell = STAGE_PROPS.cell, [fx, fy] = STAGE_PROPS.feet, x = Math.round(actor.point.x);
        ctx.save();
        if (hidesHero(actor, state, boundsOf(prop.theme, index), dot)) ctx.globalAlpha *= 0.45;
        if (prop.flip) { ctx.translate(x * 2, 0); ctx.scale(-1, 1); }
        stageDots.blit(ctx, sheet, { x: index * cell, y: 0, w: cell, h: cell }, { x: Math.round(x - fx * dot), y: Math.round(actor.y - fy * dot), scale: dot });
        ctx.restore();
    }
    return Object.freeze({ append, draw });
})();
safeExposeGlobals({ stageProps });
