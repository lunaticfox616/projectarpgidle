/** 옆에서 보는 무대의 탐험 물체 그림 (2026-10-11 사용자: "몬스터, 상자, 항아리 등등 새로운 캐릭터에 맞게"). 나무 상자, 항아리,
 * 보급 상자 세 등급, 봉인된 보물함, 알집과 그 부서지거나 열린 모습을 캐릭터와 같은 도트 크기로 그린다. 그림 한 장
 * (data/stage-view.js STAGE_OBJECTS, scripts/build-stage-objects.cjs가 그린다)에 물체마다 한 칸씩 들어 있다.
 * 무엇을 언제 그리는지는 js/canvas-exploration-objects.js가 정하고 여기는 그 그림을 찍기만 한다.
 */
const stageObjects = (() => {
    let sheet = null;
    const rims = new Map();   // "칸|색" → 그 칸의 실루엣을 한 색으로 칠한 캔버스

    function image() {
        if (!sheet) {
            sheet = new Image();
            sheet.decoding = 'async';
            sheet.src = STAGE_OBJECTS.sheet;
        }
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
        const index = cellOf(look), source = image();
        if (index < 0 || !source) return false;
        const box = boxOf(index, at);
        ctx.drawImage(source, box.sx, 0, STAGE_OBJECTS.cell, STAGE_OBJECTS.cell, box.x, box.y, box.size, box.size);
        return true;
    }
    function silhouette(index, colour) {
        const key = index + '|' + colour, cell = STAGE_OBJECTS.cell;
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
        const index = cellOf(look);
        if (index < 0 || !image()) return;
        const box = boxOf(index, at), rim = silhouette(index, colour);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ctx.drawImage(rim, box.x + dx * at.dot, box.y + dy * at.dot, box.size, box.size);
    }
    return Object.freeze({ ready, draw, outline });
})();
safeExposeGlobals({ stageObjects });
