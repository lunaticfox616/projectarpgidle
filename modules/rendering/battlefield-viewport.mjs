/** Canvas size is view state, never serialized with the game. Projection retains the classic grid anchor. */
class BattlefieldViewport {
    constructor(deps) { this.deps = deps; this.size = { width: 0, height: 0, dpr: 1 }; }
    resizeBattlefieldCanvas() {
        const canvas = this.deps.document.getElementById('battlefield-canvas');
        if (!canvas || canvas.offsetParent === null) return;
        const parent = canvas.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 50) return;
        const cssWidth = Math.max(1, Math.round(rect.width / this.deps.uiDisplay.factor || 1));
        const cssHeight = Math.max(1, Math.round(rect.height / this.deps.uiDisplay.factor || 1));
        const dpr = this.deps.uiDisplay.battleRenderScale;
        canvas.width = Math.max(1, Math.round(cssWidth * dpr));
        canvas.height = Math.max(1, Math.round(cssHeight * dpr));
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        canvas.dataset.renderScale = String(dpr);
        this.size = { width: cssWidth, height: cssHeight, dpr };
        this.deps.canvasBox.forget();
    }

    getBattleGridProjection(width, height, fitMode) {
        if(this.deps.hasExploration())return this.deps.exploration.projection(width,height);
        return this.getStageBoardProjection(width,height,fitMode) || this.getFixedBattleGridProjection(width,height,fitMode);
    }

    getStageBoardProjection(width,height,fitMode) {
        return fitMode==='grid-contain' && typeof this.deps.stageBoard==='object' ? this.deps.stageBoard.projection(width,height,this.deps.currentZone()) : null;
    }

    drawStageBoardBackdrop(ctx,width,height,gridProj) {
        return typeof this.deps.stageBoard==='object' && this.deps.stageBoard.background(ctx,gridProj,{width,height});
    }

    getFixedBattleGridProjection(width,height,fitMode) {
        const layout = this.deps.layout;
        const gridContain = fitMode === 'grid-contain';
        const contain = fitMode === 'contain' || gridContain;
        // 옆에서 보는 무대(data/stage-view.js): 세로(깊이)만 depth배로 눌러 그린다. 배경 그림과 칸이 함께 눌리고, 남는 높이만큼 무대가 커진다.
        const depth = this.deps.stageView.depth();
        const frameLeft = gridContain ? layout.gridOriginX - 48 : 0;
        const frameTop = gridContain ? layout.gridOriginY - 64 : 0;
        const frameWidth = gridContain ? layout.columns * layout.cellWidth + 96 : layout.width;
        const frameHeight = (gridContain ? layout.rows * layout.cellHeight + 112 : layout.height) * depth;
        const scale = contain
            ? Math.min(width / frameWidth, height / frameHeight)
            : Math.max(width / layout.width, height / (layout.height * depth)) * layout.viewScale;
        const deep = scale * depth;
        const mapWidth = layout.width * scale;
        const mapHeight = layout.height * deep;
        const frameX = (width - frameWidth * scale) / 2;
        const frameY = gridContain ? (height - frameHeight * scale) / 2 : height - frameHeight * scale;
        const mapX = contain ? frameX - frameLeft * scale : (width - mapWidth) / 2;
        const mapY = contain ? frameY - frameTop * deep : (height - mapHeight) / 2;
        const tileW = layout.cellWidth * scale;
        const tileH = layout.cellHeight * deep;
        return {
            tileW,
            tileH,
            actorGroundOffsetY: Math.round(tileH * 0.22),
            mapX,
            mapY,
            mapWidth,
            mapHeight,
            cellToScreen(gx, gy) {
                return {
                    x: mapX + (layout.gridOriginX + (gx + 0.5) * layout.cellWidth) * scale,
                    y: mapY + (layout.gridOriginY + (gy + 0.5) * layout.cellHeight) * deep
                };
            }
        };
    }

    getBattleLayout(enemies, width, height, projection) {
        let list = enemies || [];
        if (list.length === 0) return [];
        let proj = projection || this.getBattleGridProjection(width, height);
        let fallbackCell = this.deps.bossSpawn;
        return list.map(enemy => {
            let cell = this.deps.hasGridCell(enemy) ? enemy : fallbackCell;
            let center = this.deps.hasGridCell(enemy) ? this.deps.getGridUnitCenter(enemy) : cell;
            let footprint = this.deps.hasGridCell(enemy) ? this.deps.getGridUnitFootprint(enemy) : { columns: 1, rows: 1 };
            // 다칸 유닛의 몸은 점유 영역 중앙에 두되, 발은 마지막 행의 중앙을 딛게 한다.
            // 2x2 보스가 네 칸 사이 교차점 위에 떠 있는 듯 보이는 것을 막는다.
            let groundCell = {
                gx: center.gx,
                gy: center.gy + (footprint.rows - 1) / 2
            };
            let pos = proj.cellToScreen(groundCell.gx, groundCell.gy);
            return { enemy: enemy, x: pos.x, y: pos.y + proj.actorGroundOffsetY };
        }).sort((a, b) => a.y - b.y || (a.enemy.id - b.enemy.id));
    }

    drawBattleBackdrop(ctx, width, height, gridProj) {
        if(this.deps.exploration.background(ctx,width,height,gridProj))return true;
        if(this.drawStageBoardBackdrop(ctx,width,height,gridProj))return true;
        // 무대에서 지도가 아직 없는 순간(부팅, 구역을 여는 중)은 그림을 기다리는 방처럼 어둠만 둔다.
        ctx.fillStyle='#0b090c';ctx.fillRect(0,0,width,height);return true;
    }
}

export function createBattlefieldViewport(deps) {
    const owner = new BattlefieldViewport(deps);
    return Object.freeze({
        resize: owner.resizeBattlefieldCanvas.bind(owner),
        projection: owner.getBattleGridProjection.bind(owner),
        fixedProjection: owner.getFixedBattleGridProjection.bind(owner),
        layout: owner.getBattleLayout.bind(owner), background: owner.drawBattleBackdrop.bind(owner),
        size: () => owner.size,
        dispose: () => { owner.size = { width: 0, height: 0, dpr: 1 }; }
    });
}
