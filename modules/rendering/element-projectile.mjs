function polygon(ctx, points) {
    if (!points.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(point => ctx.lineTo(point[0], point[1]));
    ctx.closePath();
}

function fire(ctx, width, height) {
    polygon(ctx, [[-width * 0.54, 0], [-width * 0.12, -height * 0.38], [width * 0.18, 0], [-width * 0.12, height * 0.38]]);
    ctx.globalAlpha *= 0.52;
    ctx.fill();
    ctx.globalAlpha /= 0.52;
    ctx.beginPath(); ctx.arc(width * 0.2, 0, height * 0.31, 0, Math.PI * 2); ctx.fill();
}

function cold(ctx, width, height) {
    polygon(ctx, [[-width * 0.46, 0], [width * 0.08, -height * 0.22], [width * 0.5, 0], [width * 0.08, height * 0.22]]);
    ctx.fill(); ctx.strokeStyle = '#e9fbff'; ctx.stroke();
}

function light(ctx, width, height, progress) {
    ctx.beginPath();
    for (let step = 0; step <= 6; step++) {
        const x = -width * 0.5 + width * step / 6;
        const y = step === 0 || step === 6 ? 0 : ((step + Math.floor(progress * 8)) % 2 ? -height * 0.24 : height * 0.24);
        if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#f8f2a0'; ctx.stroke();
}

function chaos(ctx, width, height) {
    ctx.beginPath(); ctx.arc(0, 0, height * 0.38, -2.35, 2.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-width * 0.45, 0); ctx.lineTo(width * 0.42, 0); ctx.stroke();
}

function shield(ctx, height, progress) {
    const radius = height * 0.42;
    const points = Array.from({ length: 8 }, (_, index) => {
        const angle = index * Math.PI / 4 + progress * Math.PI * 3;
        return [Math.cos(angle) * radius, Math.sin(angle) * radius];
    });
    polygon(ctx, points); ctx.globalAlpha *= 0.56; ctx.fill(); ctx.globalAlpha /= 0.56; ctx.stroke();
}

/** No asset changes: the original low-cost fallback shapes, with colour supplied by the caller. */
export function paintElementProjectile(ctx, pose, color) {
    const { style, width, height, progress } = pose;
    ctx.filter = 'none';
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, height * 0.09);
    if (style === 'fire') fire(ctx, width, height);
    else if (style === 'cold') cold(ctx, width, height);
    else if (style === 'light') light(ctx, width, height, progress);
    else if (style === 'chaos') chaos(ctx, width, height);
    else if (style === 'shield') shield(ctx, height, progress);
    else {
        polygon(ctx, [[-width * 0.48, -height * 0.08], [width * 0.22, -height * 0.08], [width * 0.5, 0], [width * 0.22, height * 0.08], [-width * 0.48, height * 0.08]]);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
}
