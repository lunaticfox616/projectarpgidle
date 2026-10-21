/**
 * 잔잔한 사건의 그림(js/combat-incidents.js): 별똥별. 처음 들어선 방의 빈 칸에 별 하나가 오른쪽 위에서 비스듬히 떨어지고(fallMs), 닿은
 * 자리에서 네 갈래 빛이 퍼졌다가 사라진다(burstMs, 둘 다 data/act-exploration-maps.js ACT_EXPLORATION_INCIDENTS.star). 바닥 효과 층에서
 * 그린다(js/canvas-battlefield.js drawBattleGroundLayer). 크기는 칸 너비를 따른다(40점 칸에서 1배, 1.6배까지).
 * 그림 파일 없이 점과 선으로만 그리고, 도트 결을 지키려고 좌표를 정수로 맞춘다.
 */
const stageIncidents = (() => {
    const STAR = Object.freeze({ from: Object.freeze([130, -270]), tail: 120, head: '#fff6c8', glow: '#ffe27a', ray: '#ffe9a0' });
    const lerp = (a, b, t) => a + (b - a) * t;
    /** 떨어지는 별: 꼬리(머리 쪽이 진한 여덟 마디)와 빛무리를 두른 머리. k: 크기 배율. */
    function drawFall(ctx, end, progress, k) {
        const x = lerp(end.x + STAR.from[0] * k, end.x, progress), y = lerp(end.y + STAR.from[1] * k, end.y, progress);
        const len = Math.hypot(STAR.from[0], STAR.from[1]), ux = STAR.from[0] / len, uy = STAR.from[1] / len, tail = STAR.tail * k;
        ctx.lineWidth = Math.max(2, Math.round(3 * k));
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * tail, b = ((i + 1) / 8) * tail;
            ctx.globalAlpha = 0.9 * (1 - i / 8);
            ctx.strokeStyle = i < 3 ? STAR.head : STAR.glow;
            ctx.beginPath();
            ctx.moveTo(Math.round(x + ux * a), Math.round(y + uy * a));
            ctx.lineTo(Math.round(x + ux * b), Math.round(y + uy * b));
            ctx.stroke();
        }
        const glow = Math.round(9 * k), head = Math.round(4 * k);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = STAR.glow;
        ctx.fillRect(Math.round(x) - glow, Math.round(y) - glow, glow * 2, glow * 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = STAR.head;
        ctx.fillRect(Math.round(x) - head, Math.round(y) - head, head * 2, head * 2);
    }
    /** 닿은 자리: 네 갈래 빛이 10에서 46점까지 뻗으며 옅어지고, 그 사이 대각선으로 반짝임. k: 크기 배율. */
    function drawBurst(ctx, end, progress, k) {
        const fade = 1 - progress, reach = Math.round(lerp(10, 46, Math.sqrt(progress)) * k), cx = Math.round(end.x), cy = Math.round(end.y);
        const thick = Math.max(2, Math.round(3 * k)), dot = Math.max(2, Math.round(3 * k));
        ctx.globalAlpha = fade;
        ctx.fillStyle = STAR.ray;
        ctx.fillRect(cx - reach, cy - Math.floor(thick / 2), reach * 2, thick);
        ctx.fillRect(cx - Math.floor(thick / 2), cy - reach, thick, reach * 2);
        const twinkle = Math.round(reach * 0.5);
        ctx.globalAlpha = fade * 0.75;
        for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) ctx.fillRect(cx + dx * twinkle - 1, cy + dy * twinkle - 1, dot, dot);
        ctx.globalAlpha = fade;
        ctx.fillStyle = STAR.head;
        ctx.fillRect(cx - dot, cy - dot, dot * 2, dot * 2);
    }
    /** 바닥 효과 층: battleFx의 'fallingStar'(js/combat-incidents.js dropStar)마다. view: { now, gridProj } */
    function ground(ctx, view) {
        const { fallMs, burstMs } = ACT_EXPLORATION_INCIDENTS.star, k = Math.min(1.6, Math.max(1, (Number(view.gridProj.tileW) || 40) / 40));
        for (const fx of battleFx) {
            if (fx.type !== 'fallingStar' || !fx.cell || view.now < fx.start || view.now - fx.start >= fallMs + burstMs) continue;
            const end = view.gridProj.cellToScreen(fx.cell.gx, fx.cell.gy), age = view.now - fx.start;
            if (!end) continue;
            ctx.save();
            if (age < fallMs) drawFall(ctx, end, age / fallMs, k);
            else drawBurst(ctx, end, (age - fallMs) / burstMs, k);
            ctx.restore();
        }
    }
    return Object.freeze({ ground });
})();
safeExposeGlobals({ stageIncidents });
