/** 옆에서 보는 무대의 탐험 물체 그림 (2026-10-11 사용자: "몬스터, 상자, 항아리 등등 새로운 캐릭터에 맞게"). 나무 상자, 항아리,
 * 보급 상자 세 등급, 봉인된 보물함, 알집과 그 부서지거나 열린 모습을 캐릭터와 같은 도트 크기로 그린다. 그림 한 장
 * (data/stage-view.js STAGE_OBJECTS, scripts/build-stage-objects.cjs가 그린다)에 물체마다 한 칸씩 들어 있다.
 * 무엇을 언제 그리는지는 js/canvas-exploration-objects.js가 정하고 여기는 그 그림을 찍기만 한다.
 */
class StageObjects {
    constructor(deps) {
        this.deps = deps;
        this.sheets = new Map();
        this.rims = new Map();
    }

    /** 지금 걷는 지도의 지형에 맞춘 그림 묶음이 있으면 그 파일, 없으면 공용 그림. */
    sheetFile(owner) {
        const run = this.deps.actExplorationState.current(owner), map = run ? this.deps.actExplorationMap.forRun(run) : null;
        const theme = map ? this.deps.STAGE_OBJECTS.biomes[map.biome] : null;
        return (theme && this.deps.STAGE_OBJECTS.themes[theme]) || this.deps.STAGE_OBJECTS.sheet;
    }

    image(owner) {
        const file = this.sheetFile(owner);
        if (!this.sheets.has(file)) this.sheets.set(file, this.deps.stageAssetRetry.image(file + '?v=' + this.deps.STAGE_OBJECTS.version));
        const sheet = this.sheets.get(file);
        return this.deps.stageAssetRetry.loaded(sheet) ? sheet : null;
    }

    /** 그림이 왔는가. 오기 전에는 탐험 물체를 그리지 않는다(못 받으면 다시 받는다. 예전 16도트 그림으로 대신 그리던 길은 2026-11-11에 지웠다). */
    ready(owner) { return !!this.image(owner); }

    /** 그림 이름(js/canvas-exploration-objects.js look)과 보급 상자 등급 → 칸 번호. 등급 그림은 chestSilver, chestGoldOpen처럼 이름에 끼워 넣는다. */
    cellOf(look) {
        const grade = this.deps.STAGE_OBJECTS.grades.includes(look.tint) ? look.tint[0].toUpperCase() + look.tint.slice(1) : '';
        const name = grade ? look.name.replace('chest', 'chest' + grade) : look.name;
        return this.deps.STAGE_OBJECTS.names.indexOf(name);
    }

    /** 발 자리(at.x, at.y)에 한 칸을 찍을 자리. */
    boxOf(index, at) {
        const { cell, feet } = this.deps.STAGE_OBJECTS;
        return { sx: index * cell, x: Math.round(at.x - feet[0] * at.dot), y: Math.round(at.y - feet[1] * at.dot), size: cell * at.dot };
    }

    /** @param {{name:string,tint?:string}} look @param {{x:number,y:number,dot:number}} at 발 자리와 도트 하나의 크기 @returns {boolean} 그렸는지 */
    draw(owner, ctx, look, at) {
        // 목재 상자, 봉인된 보물함, 알집은 액트 재질의 장면 상태 그림으로(js/canvas-stage-story.js, 2026-10-18).
        if (this.deps.stageStory.drawObject(owner, ctx, look, at)) return true;
        // 지역 무대 그림이 있는 방에서는 보급 상자, 항아리, 목재 상자를 그 재질의 그림으로 그린다(js/canvas-stage-region.js).
        if (typeof this.deps.stageRegion === 'object' && this.deps.stageRegion.drawObject(owner, ctx, look, at)) return true;
        const index = this.cellOf(look), source = this.image(owner);
        if (index < 0 || !source) return false;
        const box = this.boxOf(index, at), cell = this.deps.STAGE_OBJECTS.cell;
        this.deps.stageDots.blit(ctx, source, { x: box.sx, y: 0, w: cell, h: cell }, { x: box.x, y: box.y, scale: at.dot }, true);
        return true;
    }

    silhouette(owner, index, colour) {
        const key = this.sheetFile(owner) + '|' + index + '|' + colour, cell = this.deps.STAGE_OBJECTS.cell;
        if (this.rims.has(key)) return this.rims.get(key);
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = cell;
        canvas.height = cell;
        const c = canvas.getContext('2d');
        c.drawImage(this.image(owner), index * cell, 0, cell, cell, 0, 0, cell, cell);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = colour;
        c.fillRect(0, 0, cell, cell);
        this.rims.set(key, canvas);
        return canvas;
    }

    /** 누를 수 있는 물체의 밝은 테: 그림 둘레에 한 도트 두께로 두른다(그림을 찍기 전에 부른다). */
    outline(owner, ctx, look, at, colour) {
        if (this.deps.stageStory.outlineObject(owner, ctx, look, at, colour)) return;
        if (typeof this.deps.stageRegion === 'object' && this.deps.stageRegion.outlineObject(owner, ctx, look, at, colour)) return;
        const index = this.cellOf(look);
        if (index < 0 || !this.image(owner)) return;
        const box = this.boxOf(index, at), rim = this.silhouette(owner, index, colour), cell = this.deps.STAGE_OBJECTS.cell;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            this.deps.stageDots.blit(ctx, rim, { x: 0, y: 0, w: cell, h: cell }, { x: box.x + dx * at.dot, y: box.y + dy * at.dot, scale: at.dot }, true);
        }
    }

    /** 그 물체 그림의 맨 위(화면 px): 고른 물건의 화살표가 그 위에 선다(js/canvas-target-marks.js). 공용 그림은 칸의 맨 위다. */
    top(owner, look, at) {
        const story = this.deps.stageStory.objectTop(owner, look, at);
        if (story !== null) return story;
        const region = typeof this.deps.stageRegion === 'object' ? this.deps.stageRegion.objectTop(owner, look, at) : null;
        return region !== null ? region : at.y - this.deps.STAGE_OBJECTS.feet[1] * at.dot;
    }
}

export function createStageObjects(deps) {
    const instance = new StageObjects(deps);
    return Object.freeze({ ready: instance.ready.bind(instance), draw: instance.draw.bind(instance), outline: instance.outline.bind(instance), top: instance.top.bind(instance) });
}
