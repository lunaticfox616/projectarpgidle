/**
 * One connected fracture with four prominent rock wedges and low debris between them.
 * Ground damage still covers every attack cell; decorative rock bases stay inside that area.
 * @param {CanvasRenderingContext2D} ctx
 * @param {NonNullable<ReturnType<typeof projectSkillFootprint>>} footprint
 * @param {{now:number,arriveAt:number,start:number,end:number,playerPoint?:{x:number,y:number}}} time Visual milliseconds.
 * @param {{spike:CanvasImageSource|null,crack:CanvasImageSource|null}} images
 */
function drawEarthSpikeField(ctx, footprint, time, images) {
    let elapsed = time.now - time.arriveAt;
    let fade = Math.max(0, Math.min(1, (time.end - time.now) / 160));
    if (fade <= 0) return;
    let prepare = Math.max(0, Math.min(1, (time.now - time.start) / Math.max(1, time.arriveAt - time.start)));
    let rise = elapsed < 0 ? 0 : 0.72 + Math.min(1, elapsed / 70) * 0.28;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.imageSmoothingEnabled = false;
    ctx.beginPath();
    ctx.rect(footprint.board.x, footprint.board.y, footprint.board.width, footprint.board.height);
    ctx.clip();
    let center = footprint.centerPoint;
    let groundWidth = footprint.tileW * 3, groundHeight = footprint.tileH * 3;
    ctx.globalAlpha = (0.06 + prepare * 0.72) * fade;
    if (images.crack) ctx.drawImage(images.crack, center.x - groundWidth / 2,
        center.y - groundHeight / 2, groundWidth, groundHeight);
    if (rise <= 0 || !images.spike) { ctx.restore(); return; }
    footprint.points.slice().sort((a, b) => a.y - b.y).forEach(point => {
        let dx = (point.x - center.x) / footprint.tileW, dy = (point.y - center.y) / footprint.tileH;
        if (Math.abs(dx) + Math.abs(dy) < 0.1) return;
        if (time.playerPoint && Math.abs(point.x - time.playerPoint.x) < footprint.tileW / 2
            && Math.abs(point.y - time.playerPoint.y) < footprint.tileH / 2) return;
        let prominent = Math.abs(dx * dy) > 0.5;
        let variation = ((point.gx * 7 + point.gy * 11) % 5) / 4;
        let width = footprint.tileW * (prominent ? 0.72 : 0.46);
        let height = footprint.tileH * (prominent ? 0.55 + variation * 0.20 : 0.18) * rise;
        ctx.save();
        ctx.translate(point.x - dx * footprint.tileW * 0.13, point.y - dy * footprint.tileH * 0.12);
        ctx.rotate(dx * (0.16 + variation * 0.16));
        ctx.scale(dx < 0 ? -1 : 1, 1);
        ctx.globalAlpha = (prominent ? 0.87 : 0.62) * fade;
        // Anchor the ground base, letting differently sized wedges lean away from the impact.
        ctx.drawImage(images.spike, -width / 2, -height * 0.92, width, height);
        ctx.restore();
    });
    ctx.restore();
}
