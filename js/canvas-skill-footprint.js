/**
 * Project a cast-time cell snapshot onto the current viewport. No enemy positions are read.
 * @param {ReturnType<typeof getSkillStageFootprint>|undefined} area Cast-time domain geometry.
 * @param {{tileW:number, tileH:number, cellToScreen:function(number,number):{x:number,y:number}}} projection
 * @param {{gx:number,gy:number}|undefined} sourceCell Cast-time origin for the caster's weapon trail.
 * @returns {{points:Array<{gx:number,gy:number,x:number,y:number}>,sourcePoint:{x:number,y:number}|null,tileW:number,tileH:number,x:number,y:number,width:number,height:number,round:boolean,centerPoint:{x:number,y:number},board:{x:number,y:number,width:number,height:number},cone:{vertices:Array<{x:number,y:number}>,length:number,width:number,angle:number}|null}|null}
 */
function projectSkillFootprint(area, projection, sourceCell) {
    if (!area || area.cells.length === 0) return null;
    let points = area.cells.map(cell => ({ ...cell, ...projection.cellToScreen(cell.gx, cell.gy) }));
    let minX = Math.min(...points.map(point => point.x)) - projection.tileW / 2;
    let maxX = Math.max(...points.map(point => point.x)) + projection.tileW / 2;
    let minY = Math.min(...points.map(point => point.y)) - projection.tileH / 2;
    let maxY = Math.max(...points.map(point => point.y)) + projection.tileH / 2;
    let round = area.shape === 'circle';
    if (round) {
        let center = projection.cellToScreen(area.center.gx, area.center.gy);
        minX = center.x - (area.radius + 0.5) * projection.tileW;
        maxX = center.x + (area.radius + 0.5) * projection.tileW;
        minY = center.y - (area.radius + 0.5) * projection.tileH;
        maxY = center.y + (area.radius + 0.5) * projection.tileH;
    }
    let cone = null;
    if (area.cone) {
        let vertices = area.cone.vertices.map(cell => projection.cellToScreen(cell.gx, cell.gy));
        let end = { x: (vertices[1].x + vertices[2].x) / 2, y: (vertices[1].y + vertices[2].y) / 2 };
        cone = { vertices, length: Math.hypot(end.x - vertices[0].x, end.y - vertices[0].y),
            width: Math.hypot(vertices[1].x - vertices[2].x, vertices[1].y - vertices[2].y),
            angle: Math.atan2(end.y - vertices[0].y, end.x - vertices[0].x) };
    }
    let corner = projection.cellToScreen(0, 0);
    return { points, round, cone, centerPoint: projection.cellToScreen(area.center.gx, area.center.gy),
        board: { x: corner.x - projection.tileW / 2, y: corner.y - projection.tileH / 2,
        width: COMBAT_GRID_CONFIG.columns * projection.tileW, height: COMBAT_GRID_CONFIG.rows * projection.tileH },
        tileW: projection.tileW, tileH: projection.tileH,
        sourcePoint: sourceCell ? projection.cellToScreen(sourceCell.gx, sourceCell.gy) : null,
        x: (minX + maxX) / 2, y: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
}

/** Clip smooth shapes from their cast geometry; other attacks retain the exact cell union. */
function clipSkillFootprint(ctx, footprint, includeCaster = false) {
    if (footprint.round || footprint.cone) {
        ctx.beginPath();
        ctx.rect(footprint.board.x, footprint.board.y, footprint.board.width, footprint.board.height);
        ctx.clip();
        ctx.beginPath();
        if (footprint.cone) {
            let [source, left, right] = footprint.cone.vertices;
            ctx.moveTo(source.x, source.y); ctx.lineTo(left.x, left.y); ctx.lineTo(right.x, right.y); ctx.closePath();
        } else ctx.ellipse(footprint.x, footprint.y, footprint.width / 2, footprint.height / 2, 0, 0, Math.PI * 2);
        ctx.clip();
        return;
    }
    ctx.beginPath();
    footprint.points.forEach(point => ctx.rect(point.x - footprint.tileW / 2,
        point.y - footprint.tileH / 2, footprint.tileW, footprint.tileH));
    // Weapon trails may cross the caster cell; the ground silhouette never marks it as damage.
    if (includeCaster && footprint.sourcePoint) ctx.rect(footprint.sourcePoint.x - footprint.tileW / 2,
        footprint.sourcePoint.y - footprint.tileH / 2, footprint.tileW, footprint.tileH);
    ctx.clip();
}

/** A faint continuous ground silhouette; only exterior edges, never a grid of cell borders. */
function drawSkillFootprintGround(ctx, footprint, color, alpha) {
    if (footprint.round || footprint.cone) return drawSmoothSkillGround(ctx, footprint, color, alpha);
    let keys = new Set(footprint.points.map(point => `${point.gx},${point.gy}`));
    let halfW = footprint.tileW / 2, halfH = footprint.tileH / 2;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha * 0.07;
    ctx.beginPath();
    footprint.points.forEach(point => ctx.rect(point.x - halfW, point.y - halfH, footprint.tileW, footprint.tileH));
    ctx.fill();
    ctx.globalAlpha = alpha * 0.32;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    footprint.points.forEach(point => {
        let edges = [[0, -1, -halfW, -halfH, halfW, -halfH], [1, 0, halfW, -halfH, halfW, halfH],
            [0, 1, halfW, halfH, -halfW, halfH], [-1, 0, -halfW, halfH, -halfW, -halfH]];
        edges.forEach(([dx, dy, x1, y1, x2, y2]) => {
            if (keys.has(`${point.gx + dx},${point.gy + dy}`)) return;
            ctx.moveTo(point.x + x1, point.y + y1);
            ctx.lineTo(point.x + x2, point.y + y2);
        });
    });
    ctx.stroke();
    ctx.restore();
}

/** The smooth boundary uses the same cell-center geometry as combat, including at board edges. */
function drawSmoothSkillGround(ctx, footprint, color, alpha) {
    ctx.save();
    clipSkillFootprint(ctx, footprint);
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    // clipSkillFootprint leaves the circle/triangle as the current path.
    ctx.globalAlpha = alpha * 0.035;
    ctx.fill();
    ctx.globalAlpha = alpha * 0.28;
    ctx.stroke();
    ctx.restore();
}
