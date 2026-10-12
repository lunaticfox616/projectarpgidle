/** 옆에서 보는 무대의 탐험 물체 그림 (2026-10-11 사용자: "몬스터, 상자, 항아리 등등 새로운 캐릭터에 맞게"). 나무 상자, 항아리,
 * 보급 상자 세 등급, 봉인된 보물함, 알집과 그 부서지거나 열린 모습을 캐릭터와 같은 도트 크기로 그린다. 그림 한 장
 * (data/stage-view.js STAGE_OBJECTS, scripts/build-stage-objects.cjs가 그린다)에 물체마다 한 칸씩 들어 있다.
 * 무엇을 언제 그리는지는 js/canvas-exploration-objects.js가 정하고 여기는 그 그림을 찍기만 한다.
 */
const stageObjects = (() => {
    const sheets = new Map(); // 그림 파일 → Image
    const rims = new Map();   // "그림|칸|색" → 그 칸의 실루엣을 한 색으로 칠한 캔버스

    /** 지금 걷는 지도의 지형에 맞춘 그림 묶음이 있으면 그 파일, 없으면 공용 그림. */
    function sheetFile() {
        const run = actExplorationState.current(game), map = run ? actExplorationMap.forRun(run) : null;
        const look = map && typeof STAGE_BACKDROPS === 'object' ? STAGE_BACKDROPS.biomes[map.biome] : null;
        return (look && STAGE_OBJECTS.themes[look.objects]) || STAGE_OBJECTS.sheet;
    }
    function image() {
        const file = sheetFile();
        if (!sheets.has(file)) {
            const sheet = new Image();
            sheet.decoding = 'async';
            sheet.src = file;
            sheets.set(file, sheet);
        }
        const sheet = sheets.get(file);
        return sheet.complete && sheet.naturalWidth > 0 ? sheet : null;
    }
    /** 무대가 켜져 있고 그림이 준비됐는가. 아니면 예전 16도트 그림으로 그린다. */
    function ready() { return stageView.enabled() && !!image(); }
    /** 그림 이름(js/canvas-exploration-objects.js look)과 보급 상자 등급 → 칸 번호. 등급 그림은 chestSilver, chestGoldOpen처럼 이름에 끼워 넣는다. */
    function cellOf(look) {
        const grade = STAGE_OBJECTS.grades.includes(look.tint) ? look.tint[0].toUpperCase() + look.tint.slice(1) : '';
        const name = grade ? look.name.replace('chest', 'chest' + grade) : look.name;
        return STAGE_OBJECTS.names.indexOf(name);
    }
    /** 발 자리(at.x, at.y)에 한 칸을 찍을 자리. */
    function boxOf(index, at) {
        const { cell, feet } = STAGE_OBJECTS;
        return { sx: index * cell, x: Math.round(at.x - feet[0] * at.dot), y: Math.round(at.y - feet[1] * at.dot), size: cell * at.dot };
    }
    /** @param {{name:string,tint?:string}} look @param {{x:number,y:number,dot:number}} at 발 자리와 도트 하나의 크기 @returns {boolean} 그렸는지 */
    function draw(ctx, look, at) {
        // 지역 무대 그림이 있는 방에서는 보급 상자, 항아리, 목재 상자를 그 재질의 그림으로 그린다(js/canvas-stage-region.js).
        if (typeof stageRegion === 'object' && stageRegion.drawObject(ctx, look, at)) return true;
        const index = cellOf(look), source = image();
        if (index < 0 || !source) return false;
        const box = boxOf(index, at), cell = STAGE_OBJECTS.cell;
        stageDots.blit(ctx, source, { x: box.sx, y: 0, w: cell, h: cell }, { x: box.x, y: box.y, scale: at.dot }, true);
        return true;
    }
    function silhouette(index, colour) {
        const key = sheetFile() + '|' + index + '|' + colour, cell = STAGE_OBJECTS.cell;
        if (rims.has(key)) return rims.get(key);
        const canvas = document.createElement('canvas');
        canvas.width = cell;
        canvas.height = cell;
        const c = canvas.getContext('2d');
        c.drawImage(image(), index * cell, 0, cell, cell, 0, 0, cell, cell);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = colour;
        c.fillRect(0, 0, cell, cell);
        rims.set(key, canvas);
        return canvas;
    }
    /** 누를 수 있는 물체의 밝은 테: 그림 둘레에 한 도트 두께로 두른다(그림을 찍기 전에 부른다). */
    function outline(ctx, look, at, colour) {
        if (typeof stageRegion === 'object' && stageRegion.outlineObject(ctx, look, at, colour)) return;
        const index = cellOf(look);
        if (index < 0 || !image()) return;
        const box = boxOf(index, at), rim = silhouette(index, colour), cell = STAGE_OBJECTS.cell;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            stageDots.blit(ctx, rim, { x: 0, y: 0, w: cell, h: cell }, { x: box.x + dx * at.dot, y: box.y + dy * at.dot, scale: at.dot }, true);
        }
    }
    return Object.freeze({ ready, draw, outline });
})();
safeExposeGlobals({ stageObjects });
