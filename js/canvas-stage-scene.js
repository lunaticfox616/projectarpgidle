/** 무대 조각 묶음으로 방을 조립한다 (2026-10-11 사용자가 이미지 생성으로 만들어 온 "뿌리 성소 무대 조각", 2026-10-30 PixelLab Pro로 다시 그린
 * 액트 1: 먼 배경, 뒤쪽 띠, 바닥 세 가지, 바닥 양옆의 수액 계단, 보스 방의 구조물). 던파의 무대처럼 층과 조각을 겹친다. 규격과 놓는 규칙은
 * data/stage-view.js STAGE_SCENES에 있고, 그 묶음을 만든 쪽의 조립 화면을 따른다.
 * - 먼 배경: 좌우로 이어 붙는 띠. 카메라보다 느리게 움직인다.
 * - 바닥과 뒤쪽 띠: 지도 왼쪽 끝에서 센 자리에 이어 붙는 띠(방마다 한 번 그려 둔다). 뒤쪽 띠가 바닥과 배경이 만나는 줄을 덮고, 수액
 *   계단이 그 위에 바닥과 같은 자리로 한 장 얹힌다.
 * - 보스 구조물과 문: 캐릭터와 같은 깊이 순서로 그리는 배우. 문은 공용 뿌리 봉인으로 막고 풀릴 때 아래로 접힌다. 주인공이 조각 뒤에
 *   서면 그 조각이 비쳐 보인다.
 * 그림은 한 장이 캐릭터 도트 하나에 1px이라 캐릭터와 같은 배율로 찍는다(js/canvas-stage-dots.js). 그림 폴더가 없는 판에서는 ready가
 * 거짓이라 코드로 그린 임시 무대(js/canvas-stage-sanctum.js)가 그대로 나온다. 그리기만 하고 전투와 길 찾기에는 닿지 않는다.
 * 지도에 지역 무대 그림(js/canvas-stage-region.js: 방 그림 한 장과 문, 소품)이 정해져 있고 그 그림이 준비됐으면 그쪽이 방을 그린다:
 * 방을 그리는 쪽(js/canvas-stage-rooms.js)은 여기 하나만 부르고, 여기서 어느 묶음이 그릴지 가른다.
 */
const stageScene = (() => {
    const WIDE = 64, DEEP = 32;                 // 한 칸의 도트(js/canvas-stage-terrain.js와 같다)
    const images = new Map();                   // 파일 경로 → Image
    const fits = new Map();                     // 파일 → 지금 배율(fitDot)로 옮겨 둔 그림(먼 배경과 조각: 매 프레임 다시 옮기지 않는다)
    let fitDot = 0;
    const complete = new Set();                 // 그림을 모두 불러온 묶음
    const layouts = new WeakMap();              // 지도 → Map(방 번호 → 조각 자리)

    /** 지도의 지형에 조각 묶음이 있는가(테스트 패널에서 벽돌 벽을 고르면 쓰지 않는다). */
    function kitOf(map) {
        return (map && stageView.backdrops() && STAGE_SCENES.biomes[map.biome]) || null;
    }
    function picture(kit, file) {
        const path = STAGE_SCENES.path + kit.dir + file + '?v=' + STAGE_SCENES.version;
        if (!images.has(path)) {
            const image = new Image();
            image.decoding = 'async';
            image.src = path;
            images.set(path, image);
        }
        const image = images.get(path);
        return image.complete && image.naturalWidth > 0 ? image : null;
    }
    const terraceFiles = (kit, side) => kit.terraces.files.map(name => name + side + '.png');
    const filesOf = kit => [kit.far.file, ...Object.values(kit.far.rooms), kit.back.file, ...kit.floor.files, ...kit.terraces.sides.flatMap(side => terraceFiles(kit, side)),
        ...Object.keys(kit.pieces).map(name => name + '.png')];
    /** 그 방의 먼 배경: 구실(정예, 보스)에 따로 그린 것이 있으면 그것. */
    const farFile = (kit, room) => (kit.far.rooms && kit.far.rooms[room.role]) || kit.far.file;
    /** 지역 무대 그림의 형편: 'ready', 'pending'(불러오는 중), 'failed'(그림이 없다), 지역이 없는 지도면 null. */
    const regionState = map => (typeof stageRegion === 'object' ? stageRegion.status(map) : null);
    /** 이 지형의 조각 묶음 그림이 모두 불러와졌는가. 처음 물을 때 불러오기를 시작한다. */
    function sceneReady(map) {
        const kit = kitOf(map);
        if (!kit) return false;
        if (complete.has(kit)) return true;
        const loaded = filesOf(kit).map(file => picture(kit, file)).every(Boolean);
        if (loaded) complete.add(kit);
        return loaded;
    }
    /** @returns {(string|boolean)} 이 지도의 방을 그릴 묶음: 'region' 지역 무대 그림, 'scene' 지형의 조각 묶음, 없으면 false.
     * 지역 그림을 불러오는 동안은 false다(그동안 다른 지형의 그림이 잠깐 보이지 않게 pending이 화면을 가린다). */
    function ready(map) {
        stageDoorMarks.seal.ready();
        const region = regionState(map);
        if (region === 'ready') return 'region';
        return region !== 'pending' && sceneReady(map) ? 'scene' : false;
    }
    const pending = map => regionState(map) === 'pending';

    // ---------------------------------------------------------------- far backdrop
    function fitted(kit, file, dot) {
        // 창 크기가 바뀌어 배율이 달라지면 앞 배율로 옮겨 둔 그림은 버린다(배율마다 쌓이지 않게).
        if (fitDot !== dot) { fits.clear(); fitDot = dot; }
        const key = kit.dir + file;
        if (!fits.has(key)) fits.set(key, stageDots.fitted(picture(kit, file), dot));
        return fits.get(key);
    }
    /** 먼 배경: 방 중심에 맞춰 양 끝 여백을 나눠 쓴다. 카메라 이동의 parallax배만 움직이고 필요할 때만 좌우로 잇는다. */
    function drawFar(ctx, view, p, area) {
        if (regionState(view.map) === 'ready') {
            // 지역 그림으로 그리는 지도에서는 조각 묶음의 옮겨 둔 그림을 쓰지 않는다: 놓아 준다(화면 배율 125%에서 19MB쯤이었다).
            if (fits.size) fits.clear();
            stageRegion.drawFar(ctx, view, p, area);
            return;
        }
        const kit = kitOf(view.map), far = kit.far, dot = p.tileW / WIDE, w = far.width * dot, h = far.height * dot;
        const y = Math.round(p.mapY + view.room.y0 * p.tileH + far.bottom * dot - h);
        const centre = p.mapX + (view.room.x0 + view.room.x1 + 1) * p.tileW / 2;
        const origin = (area.width - w) / 2 + (centre - area.width / 2) * far.parallax + far.shift * dot;
        const offset = ((origin % w) + w) % w, image = fitted(kit, farFile(kit, view.room), dot);
        ctx.fillStyle = kit.fill;
        ctx.fillRect(0, 0, area.width, area.height);
        ctx.fillStyle = kit.sky;
        ctx.fillRect(0, 0, area.width, Math.max(0, y + 2));
        ctx.imageSmoothingEnabled = false;
        for (let x = offset - w; x < area.width; x += w) ctx.drawImage(image, Math.round(x), y, w, h);
    }

    /** 방의 먼 그림(지역 그림, 없으면 조각 묶음의 먼 띠)이 화면 위끝까지 닿는 가장 작은 칸 너비(px). 그림의 위끝은 바닥의 앞쪽 끝
     * (stageView.floorShare)에서 방 깊이와 그림이 바닥선 위로 올라간 높이만큼 위라, 세로로 긴 화면(태블릿 세로)에서는 너비로 정한 칸으로는
     * 그림 위에 하늘 색 띠가 남았다(2026-10-22 사용자: 빈 띠 삭제). 칸은 지도 하나에서 같아야 하므로 가장 얕은 방으로 잰다. 먼 그림이 없으면 0. */
    function coverTile(map, width, height) {
        const kit = kitOf(map), rise = regionState(map) === 'ready' ? stageRegion.rise(map) : kit ? (kit.far.height - kit.far.bottom) / WIDE : 0;
        if (!rise || !map.rooms || !map.rooms.length) return 0;
        const rows = Math.min(...map.rooms.map(room => room.y1 + 1 - room.y0));
        return Math.ceil(stageView.floorShare(width, height) * height / (rows * STAGE_VIEW.depth + rise));
    }

    // ---------------------------------------------------------------- floor and back strip (painted once a room)
    /** 띠 그림을 도트 그대로 이어 붙인다. 위/아래 이음은 원본의 2도트 줄을 투명하게 겹쳐 직선을 누른다(방 진입 시 한 번). */
    function strip(ctx, box, image, at) {
        const left = box.x * WIDE, right = (box.x + box.columns) * WIDE;
        const top = at.fadeTop || 0, bottom = at.fadeBottom || 0, height = image.naturalHeight;
        ctx.save();
        for (let x = Math.floor((left - at.shift) / at.width) * at.width + at.shift; x < right; x += at.width) {
            ctx.globalAlpha = 1;
            ctx.drawImage(image, 0, top, at.width, height - top - bottom, x, at.y + top, at.width, height - top - bottom);
            for (let y = 0; y < top; y += 2) {
                ctx.globalAlpha = (y + 1) / top;
                ctx.drawImage(image, 0, y, at.width, 2, x, at.y + y, at.width, 2);
            }
            for (let y = 0; y < bottom; y += 2) {
                ctx.globalAlpha = 1 - (y + 1) / bottom;
                ctx.drawImage(image, 0, height - bottom + y, at.width, 2, x, at.y + height - bottom + y, at.width, 2);
            }
        }
        ctx.restore();
    }
    /** 방 하나의 바닥과 뒤쪽 띠. 바닥 그림은 방마다 정해진 한 가지다. 방의 옆쪽 바깥은 조금 어둡게 눌러 걸을 수 있는 자리를 알린다. */
    function paintRoom(map, room, box) {
        if (regionState(map) === 'ready') return stageRegion.paintRoom(map, room, box);
        const kit = kitOf(map), canvas = document.createElement('canvas'), top = room.y0 * DEEP;
        canvas.width = box.columns * WIDE;
        canvas.height = box.rows * DEEP;
        const ctx = canvas.getContext('2d'), floor = kit.floor.files[(room.index + (Number(map.act) || 0)) % kit.floor.files.length];
        ctx.imageSmoothingEnabled = false;
        ctx.translate(-box.x * WIDE, -box.y * DEEP);
        // 한 장 안에 방 전체가 들어오도록 방 중심에 맞춘다. 기본 15~21칸에서는 바닥의 좌우 이음이 전투 칸 밖에 놓인다.
        const floorShift = Math.round((room.x0 + room.x1 + 1) * WIDE / 2 - kit.floor.width / 2);
        strip(ctx, box, picture(kit, floor), { width: kit.floor.width, shift: floorShift, y: top + kit.floor.top, fadeTop: 28 });
        strip(ctx, box, picture(kit, kit.back.file), { width: kit.back.width, shift: kit.back.shift, y: top + kit.back.bottom - kit.back.height, fadeBottom: 14 });
        // 수액 계단: 바닥 그림과 같은 자리에 한 장. 놓임새(양쪽, 왼쪽만, 오른쪽만)는 바닥처럼 방마다 정해진 하나다.
        const side = kit.terraces.sides[(room.index + (Number(map.act) || 0)) % kit.terraces.sides.length];
        for (const file of terraceFiles(kit, side)) ctx.drawImage(picture(kit, file), floorShift, top + kit.terraces.top);
        shadeBeyond(ctx, kit, room, box);
        return canvas;
    }

    /** 방의 옆쪽 바깥은 멀어질수록 어두워진다(한 칸에 걸쳐 차오른다): 걸을 수 있는 자리가 어디까지인지 알린다. */
    function shadeBeyond(ctx, kit, room, box) {
        const top = room.y0 * DEEP + kit.floor.top, left = room.x0 * WIDE, right = (room.x1 + 1) * WIDE;
        for (let step = 0; step < (box.x + box.columns) * WIDE - right; step += 4) {
            ctx.fillStyle = `rgba(20,14,8,${(kit.beyond * Math.min(1, step / WIDE)).toFixed(3)})`;
            ctx.fillRect(right + step, top, 4, kit.floor.height);
            ctx.fillRect(left - step - 4, top, 4, kit.floor.height);
        }
    }

    // ---------------------------------------------------------------- pieces and doors (actors)
    /** 방 하나에 놓이는 조각의 자리(도트, 지도 좌표): 보스 방의 큰 구조물 하나. y는 그림의 맨 아래 줄이 놓이는 줄이다. 문은 따로 센다(doorsOf). */
    function layoutOf(map, room, kit) {
        if (room.role !== 'boss') return [];
        return [{ name: kit.boss.name, x: Math.round((room.x0 + room.x1 + 1) * WIDE / 2), y: room.y0 * DEEP + kit.boss.drop }];
    }
    function piecesOf(map, room, kit) {
        if (!layouts.has(map)) layouts.set(map, new Map());
        const rooms = layouts.get(map);
        if (!rooms.has(room.index)) rooms.set(room.index, layoutOf(map, room, kit));
        return rooms.get(room.index);
    }
    /** 문 하나의 뿌리 봉인 자리: 뒤쪽과 앞쪽 문은 문 칸의 가로 가운데에, 좌우 문은 방의 그쪽 끝에 그 줄의 아래에 맞춰 선다. */
    function doorPiece(room, row, kit) {
        const door = row.door, at = kit.doors[door.side], top = room.y0 * DEEP;
        if (door.side === 'north' || door.side === 'south') return { doorRow: row, x: (door.cell.gx + 0.5) * WIDE, y: top + at };
        return { doorRow: row, x: (door.side === 'west' ? room.x0 * WIDE : (room.x1 + 1) * WIDE) + at, y: (door.cell.gy + 1) * DEEP };
    }
    /** 그 방을 그릴 때 화면 배율로 옮겨 쓰는 그림(먼 배경, 소품)을 미리 옮겨 두는 일들, 하나에 그림 한 장
     * (js/canvas-stage-room-pictures.js가 방 그림을 준비할 때 한 걸음씩 한다). 지역 그림으로 그리는 지도는 그쪽의 조각이다. */
    function sceneFitJobs(map, room, dot) {
        const mode = ready(map);
        if (mode === 'region') return stageRegion.fitJobs(map, room, dot);
        if (mode !== 'scene') return [];
        const kit = kitOf(map);
        const names = [...new Set(piecesOf(map, room, kit).map(piece => piece.name))].filter(name => kit.pieces[name]);
        return [farFile(kit, room)].concat(names.map(name => name + '.png')).map(file => () => fitted(kit, file, dot));
    }
    /** 전장 그리기의 배우 목록에 이 방의 소품과 문을 끼운다(깊이 순서는 그림 맨 아래 줄의 화면 y). */
    /** 주인공이 선 방과 그 방을 그릴 묶음(mode: 'region', 'scene', false). 방 단위 무대가 아니면 mode가 false다. */
    function standingRoom() {
        const run = actExplorationState.current(game), map = actExplorationDoors.stageMap(run), room = map ? actExplorationDoors.room(run) : null;
        return { run, map, room, mode: room ? ready(map) : false };
    }
    function append(actors, state) {
        const here = standingRoom(), { run, map, room } = here;
        // 방 그림을 아직 준비하는 중이면(어둠으로 가린 프레임) 소품과 문도 그리지 않는다: 그 조각들은 방 그림과 함께 준비된다.
        if (room && stageRoomPictures.roomPictureWaiting(map, room)) return;
        if (here.mode === 'region') stageRegion.append(actors, state, here);
        if (here.mode !== 'scene') return;
        const kit = kitOf(map), p = state.gridProj, dot = p.tileW / WIDE, reach = 400 * dot;
        const doors = actExplorationDoors.doorsHere(run).map(row => doorPiece(room, row, kit));
        piecesOf(map, room, kit).concat(doors).forEach((piece, index) => {
            const x = p.mapX + piece.x * dot, y = p.mapY + piece.y * dot;
            if (x > -reach && x < state.width + reach) actors.push({ kind: 'scenery', id: -2000 - index, y, piece: { ...piece, kit }, point: { x, y } });
        });
    }
    /** 주인공이 이 조각 바로 뒤에 서 있는가(조각이 주인공을 가린다). box = 그림에서 조각이 차지하는 상자. */
    function hidesHero(actor, state, size, dot) {
        const hero = state.playerPos, left = actor.point.x - (size[0] / 2 - size[2]) * dot, top = actor.y - size[5] * dot;
        return hero.y < actor.y && hero.y > top && hero.x > left - 4 && hero.x < left + size[4] * dot + 4;
    }
    /** 조각 하나: 가로 가운데를 point.x에, 그림의 맨 아래 줄을 actor.y에 맞춘다. */
    function draw(ctx, actor, state) {
        if (actor.piece.doorRow) {
            stageDoorMarks.seal.draw(ctx, actExplorationState.current(game), actor.piece.doorRow,
                { x: actor.point.x, y: actor.y, dot: stageActors.scaleFor(state.gridProj.tileW) });
            return;
        }
        if (actor.piece.region) { stageRegion.draw(ctx, actor, state); return; }
        const { name, kit } = actor.piece, size = kit.pieces[name];
        if (!size || !picture(kit, name + '.png')) return;
        const dot = stageActors.scaleFor(state.gridProj.tileW);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (hidesHero(actor, state, size, dot)) ctx.globalAlpha *= 0.5;
        ctx.drawImage(fitted(kit, name + '.png', dot), Math.round(actor.point.x - size[0] / 2 * dot), Math.round(actor.y - (size[3] + size[5]) * dot), size[0] * dot, size[1] * dot);
        ctx.restore();
    }
    /** 열린 좌우 문의 화살표: 뿌리가 접힌 자리에 세운다. 좌우 문은 화면
     * 가장자리에 서서 전장의 조명(주인공에서 멀수록 어둡다)에 묻히므로, 조명을 입힌 뒤에 그린다(js/canvas-battlefield.js가 부른다). */
    function drawMarks(ctx, p) {
        const here = standingRoom();
        const kit = here.mode === 'scene' ? kitOf(here.map) : null;
        if (here.mode === 'region') stageRegion.drawMarks(ctx, p, here);
        else if (kit) sceneSideMarks(ctx, p, here, kit);
        if (here.room) stageDoorMarks.edges(ctx, p, actExplorationDoors.doorsHere(here.run), lastBattlefieldCanvasSize.width);
    }
    function sceneSideMarks(ctx, p, here, kit) {
        const dot = stageActors.scaleFor(p.tileW);
        for (const row of actExplorationDoors.doorsHere(here.run)) {
            if (row.locked || (row.door.side !== 'west' && row.door.side !== 'east') || stageDoorMarks.underFrame(p, row)) continue;
            const piece = doorPiece(here.room, row, kit);
            stageDoorMarks.arrows(ctx, { cx: p.mapX + piece.x * dot, cy: p.mapY + (piece.y - 20) * dot, w: WIDE * dot }, row.door, { dot, thick: 3, upright: true });
        }
    }
    return Object.freeze({ ready, pending, coverTile, drawFar, paintRoom, append, draw, drawMarks, fitJobs: sceneFitJobs });
})();
safeExposeGlobals({ stageScene });
