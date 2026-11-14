/** 무대 조각 묶음으로 방을 조립한다 (2026-10-11 사용자가 이미지 생성으로 만들어 온 "뿌리 성소 무대 조각", 2026-10-30 PixelLab Pro로 다시 그린
 * 액트 1: 먼 배경, 뒤쪽 띠, 바닥 세 가지, 바닥 양옆의 수액 계단, 보스 방의 구조물). 던파의 무대처럼 층과 조각을 겹친다. 규격과 놓는 규칙은
 * data/stage-view.js STAGE_SCENES에 있고, 그 묶음을 만든 쪽의 조립 화면을 따른다.
 * - 먼 배경: 좌우로 이어 붙는 띠. 카메라보다 느리게 움직인다.
 * - 바닥과 뒤쪽 띠: 지도 왼쪽 끝에서 센 자리에 이어 붙는 띠(방마다 한 번 그려 둔다). 뒤쪽 띠가 바닥과 배경이 만나는 줄을 덮고, 수액
 *   계단이 그 위에 바닥과 같은 자리로 한 장 얹힌다.
 * - 보스 구조물과 문: 캐릭터와 같은 깊이 순서로 그리는 배우. 문은 공용 뿌리 봉인으로 막고 풀릴 때 아래로 접힌다. 주인공이 조각 뒤에
 *   서면 그 조각이 비쳐 보인다.
 * 그림은 한 장이 캐릭터 도트 하나에 1px이라 캐릭터와 같은 배율로 찍는다(js/canvas-stage-dots.js). 받지 못한 그림은 다시 받고(js/stage-asset-retry.js),
 * 다 올 때까지 ready는 거짓이고 방은 어둠으로 기다린다. 그리기만 하고 전투와 길 찾기에는 닿지 않는다.
 * 지도에 지역 무대 그림(js/canvas-stage-region.js: 방 그림 한 장과 문, 소품)이 정해져 있고 그 그림이 준비됐으면 그쪽이 방을 그린다:
 * 방을 그리는 쪽(js/canvas-stage-rooms.js)은 여기 하나만 부르고, 여기서 어느 묶음이 그릴지 가른다.
 */
class StageSceneAssets {
    constructor(deps) {
        this.deps = deps;
        this.WIDE = 64;
        this.DEEP = 32;
        this.images = new Map();
        this.fits = new Map();
        this.fitDot = 0;
        this.complete = new Set();
        this.layouts = new WeakMap();
        this.terraceFiles = (kit, side) => kit.terraces.files.map(name => name + side + '.png');
        this.filesOf = kit => [kit.far.file, ...Object.values(kit.far.rooms), kit.back.file, ...kit.floor.files, ...kit.terraces.sides.flatMap(side => this.terraceFiles(kit, side)),
            ...Object.keys(kit.pieces).map(name => name + '.png')];
        this.farFile = (kit, room) => (kit.far.rooms && kit.far.rooms[room.role]) || kit.far.file;
        this.regionState = map => (typeof this.deps.stageRegion === 'object' ? this.deps.stageRegion.status(map) : null);
        this.pending = map => !this.ready(map);
    }

    /** 지도의 지형에 조각 묶음이 있는가(액트 1의 뿌리끝 성소). */
    kitOf(map) {
        return (map && this.deps.STAGE_SCENES.biomes[map.biome]) || null;
    }

    picture(kit, file) {
        const path = this.deps.STAGE_SCENES.path + kit.dir + file + '?v=' + this.deps.STAGE_SCENES.version;
        if (!this.images.has(path)) this.images.set(path, this.deps.stageAssetRetry.image(path));
        const image = this.images.get(path);
        return this.deps.stageAssetRetry.loaded(image) ? image : null;
    }

    /** 이 지형의 조각 묶음 그림이 모두 불러와졌는가. 처음 물을 때 불러오기를 시작한다. */
    sceneReady(map) {
        const kit = this.kitOf(map);
        if (!kit) return false;
        if (this.complete.has(kit)) return true;
        const loaded = this.filesOf(kit).map(file => this.picture(kit, file)).every(Boolean);
        if (loaded) this.complete.add(kit);
        return loaded;
    }

    /** @returns {(string|boolean)} 이 지도의 방을 그릴 묶음: 'region' 지역 무대 그림, 'scene' 지형의 조각 묶음(액트 1), 아직이면 false.
     * false인 동안은 pending이 화면을 어둠으로 가린다: 받지 못한 그림은 다시 받고, 예전 무대로 대신 그리지 않는다(2026-11-11 사용자). */
    ready(map) {
        this.deps.stageDoorMarks.seal.ready();
        const region = this.regionState(map);
        if (region === 'ready') return 'region';
        return region !== 'pending' && this.sceneReady(map) ? 'scene' : false;
    }

    // ---------------------------------------------------------------- far backdrop
    fitted(kit, file, dot) {
        // 창 크기가 바뀌어 배율이 달라지면 앞 배율로 옮겨 둔 그림은 버린다(배율마다 쌓이지 않게).
        if (this.fitDot !== dot) { this.fits.clear(); this.fitDot = dot; }
        const key = kit.dir + file;
        if (!this.fits.has(key)) this.fits.set(key, this.deps.stageDots.fitted(this.picture(kit, file), dot));
        return this.fits.get(key);
    }

    /** 먼 배경: 방 중심에 맞춰 양 끝 여백을 나눠 쓴다. 카메라 이동의 parallax배만 움직이고 필요할 때만 좌우로 잇는다. */
    drawFar(ctx, view, p, area) {
        if (this.regionState(view.map) === 'ready') {
            // 지역 그림으로 그리는 지도에서는 조각 묶음의 옮겨 둔 그림을 쓰지 않는다: 놓아 준다(화면 배율 125%에서 19MB쯤이었다).
            if (this.fits.size) this.fits.clear();
            this.deps.stageRegion.drawFar(ctx, view, p, area);
            return;
        }
        const kit = this.kitOf(view.map), far = kit.far, dot = p.tileW / this.WIDE, w = this.deps.stageDots.span(far.width * dot), h = this.deps.stageDots.span(far.height * dot);
        const y = Math.round(p.mapY + view.room.y0 * p.tileH + far.bottom * dot - h);
        const centre = p.mapX + (view.room.x0 + view.room.x1 + 1) * p.tileW / 2;
        const origin = (area.width - w) / 2 + (centre - area.width / 2) * far.parallax + far.shift * dot;
        const offset = ((origin % w) + w) % w, image = this.fitted(kit, this.farFile(kit, view.room), dot);
        ctx.fillStyle = kit.fill;
        ctx.fillRect(0, 0, area.width, area.height);
        ctx.fillStyle = kit.sky;
        ctx.fillRect(0, 0, area.width, Math.max(0, y + 2));
        ctx.imageSmoothingEnabled = false;
        for (let x = Math.round(offset - w); x < area.width; x += w) ctx.drawImage(image, x, y, w, h);
        if (y > 0) {
            const edge = ctx.createLinearGradient(0, y, 0, y + 56 * dot);
            edge.addColorStop(0, kit.sky);
            edge.addColorStop(1, kit.sky + '00');
            ctx.fillStyle = edge;
            ctx.fillRect(0, y, area.width, 56 * dot);
        }
    }

    /** 방의 먼 그림(지역 그림, 없으면 조각 묶음의 먼 띠)이 화면 위끝까지 닿는 가장 작은 칸 너비(px). 그림의 위끝은 바닥의 앞쪽 끝
     * (stageView.floorShare)에서 방 깊이와 그림이 바닥선 위로 올라간 높이만큼 위라, 세로로 긴 화면(태블릿 세로)에서는 너비로 정한 칸으로는
     * 그림 위에 하늘 색 띠가 남았다(2026-10-22 사용자: 빈 띠 삭제). 칸은 지도 하나에서 같아야 하므로 가장 얕은 방으로 잰다. 먼 그림이 없으면 0. */
    coverTile(map, width, height) {
        const kit = this.kitOf(map), rise = this.regionState(map) === 'ready' ? this.deps.stageRegion.rise(map) : kit ? (kit.far.height - kit.far.bottom) / this.WIDE : 0;
        if (!rise || !map.rooms || !map.rooms.length) return 0;
        const rows = Math.min(...map.rooms.map(room => room.y1 + 1 - room.y0));
        return Math.ceil(this.deps.stageView.floorShare(width, height) * height / (rows * this.deps.STAGE_VIEW.depth + rise));
    }

    /** 띠 그림을 도트 그대로 이어 붙인다. 위/아래 이음은 원본의 2도트 줄을 투명하게 겹쳐 직선을 누른다(방 진입 시 한 번). */
    strip(ctx, box, image, at) {
        const left = box.x * this.WIDE, right = (box.x + box.columns) * this.WIDE;
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
    paintRoom(map, room, box) {
        if (this.regionState(map) === 'ready') return this.deps.stageRegion.paintRoom(map, room, box);
        const kit = this.kitOf(map), canvas = this.deps.document.createElement('canvas'), top = room.y0 * this.DEEP;
        canvas.width = box.columns * this.WIDE;
        canvas.height = box.rows * this.DEEP;
        const ctx = canvas.getContext('2d'), floor = kit.floor.files[(room.index + (Number(map.act) || 0)) % kit.floor.files.length];
        ctx.imageSmoothingEnabled = false;
        ctx.translate(-box.x * this.WIDE, -box.y * this.DEEP);
        // 한 장 안에 방 전체가 들어오도록 방 중심에 맞춘다. 기본 15~21칸에서는 바닥의 좌우 이음이 전투 칸 밖에 놓인다.
        const floorShift = Math.round((room.x0 + room.x1 + 1) * this.WIDE / 2 - kit.floor.width / 2);
        this.strip(ctx, box, this.picture(kit, floor), { width: kit.floor.width, shift: floorShift, y: top + kit.floor.top, fadeTop: 28, fadeBottom: 16 });
        this.strip(ctx, box, this.picture(kit, kit.back.file), { width: kit.back.width, shift: kit.back.shift, y: top + kit.back.bottom - kit.back.height, fadeBottom: 14 });
        // 수액 계단: 바닥 그림과 같은 자리에 한 장. 놓임새(양쪽, 왼쪽만, 오른쪽만)는 바닥처럼 방마다 정해진 하나다.
        const side = kit.terraces.sides[(room.index + (Number(map.act) || 0)) % kit.terraces.sides.length];
        for (const file of this.terraceFiles(kit, side)) ctx.drawImage(this.picture(kit, file), floorShift, top + kit.terraces.top);
        this.shadeBeyond(ctx, kit, room, box);
        return canvas;
    }

    /** 방의 옆쪽 바깥은 멀어질수록 어두워진다(한 칸에 걸쳐 차오른다): 걸을 수 있는 자리가 어디까지인지 알린다. */
    shadeBeyond(ctx, kit, room, box) {
        const top = room.y0 * this.DEEP + kit.floor.top, left = room.x0 * this.WIDE, right = (room.x1 + 1) * this.WIDE;
        for (let step = 0; step < (box.x + box.columns) * this.WIDE - right; step += 4) {
            ctx.fillStyle = `rgba(20,14,8,${(kit.beyond * Math.min(1, step / this.WIDE)).toFixed(3)})`;
            ctx.fillRect(right + step, top, 4, kit.floor.height);
            ctx.fillRect(left - step - 4, top, 4, kit.floor.height);
        }
    }

    /** 방 하나에 놓이는 조각의 자리(도트, 지도 좌표): 보스 방의 큰 구조물 하나. y는 그림의 맨 아래 줄이 놓이는 줄이다. 문은 따로 센다(doorsOf). */
    layoutOf(map, room, kit) {
        if (room.role !== 'boss') return [];
        return [{ name: kit.boss.name, x: Math.round((room.x0 + room.x1 + 1) * this.WIDE / 2), y: room.y0 * this.DEEP + kit.boss.drop }];
    }

    piecesOf(map, room, kit) {
        if (!this.layouts.has(map)) this.layouts.set(map, new Map());
        const rooms = this.layouts.get(map);
        if (!rooms.has(room.index)) rooms.set(room.index, this.layoutOf(map, room, kit));
        return rooms.get(room.index);
    }

    /** 문 하나의 뿌리 봉인 자리: 뒤쪽과 앞쪽 문은 문 칸의 가로 가운데에, 좌우 문은 방의 그쪽 끝에 그 줄의 아래에 맞춰 선다. */
    doorPiece(room, row, kit) {
        const door = row.door, at = kit.doors[door.side], top = room.y0 * this.DEEP;
        if (door.side === 'north' || door.side === 'south') return { doorRow: row, x: (door.cell.gx + 0.5) * this.WIDE, y: top + at };
        return { doorRow: row, x: (door.side === 'west' ? room.x0 * this.WIDE : (room.x1 + 1) * this.WIDE) + at, y: (door.cell.gy + 1) * this.DEEP };
    }

    /** 그 방을 그릴 때 화면 배율로 옮겨 쓰는 그림(먼 배경, 소품)을 미리 옮겨 두는 일들, 하나에 그림 한 장
     * (js/canvas-stage-room-pictures.js가 방 그림을 준비할 때 한 걸음씩 한다). 지역 그림으로 그리는 지도는 그쪽의 조각이다. */
    sceneFitJobs(map, room, dot) {
        const mode = this.ready(map);
        if (mode === 'region') return this.deps.stageRegion.fitJobs(map, room, dot);
        if (mode !== 'scene') return [];
        const kit = this.kitOf(map);
        const names = [...new Set(this.piecesOf(map, room, kit).map(piece => piece.name))].filter(name => kit.pieces[name]);
        return [this.farFile(kit, room)].concat(names.map(name => name + '.png')).map(file => () => this.fitted(kit, file, dot));
    }

}

/** Assets and room preparation do not depend on the draw list or preparation queue. */
export function createStageSceneAssets(deps) {
    const assets = new StageSceneAssets(deps);
    return Object.freeze({
        ready: assets.ready.bind(assets), pending: assets.pending,
        coverTile: assets.coverTile.bind(assets), drawFar: assets.drawFar.bind(assets),
        paintRoom: assets.paintRoom.bind(assets), fitJobs: assets.sceneFitJobs.bind(assets),
        kitOf: assets.kitOf.bind(assets), picture: assets.picture.bind(assets),
        fitted: assets.fitted.bind(assets), piecesOf: assets.piecesOf.bind(assets),
        doorPiece: assets.doorPiece.bind(assets)
    });
}
