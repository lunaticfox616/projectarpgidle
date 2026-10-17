/** 고른 대상의 표시 (2026-10-17 사용자 "상자, 항아리(파괴하거나 열러가기 전까지), 몬스터(락온기능) 클릭 시 타겟이 지정되었다는 표시가
 * 필요해"): 고른 대상의 머리 위에서 천천히 오르내리는 금빛 도트 화살표(▼) 하나.
 * - 락온한 몬스터(js/act-exploration-state.js lockOn): 체력 막대 위의 화살표, 발밑 고리도 금빛으로 돈다(js/canvas-stage-rings.js 'target').
 * - 누른 상자와 항아리(상자의 pendingId): 열거나 부술 때까지 화살표, 숨 쉬던 테는 밝은 채로 멈춘다(js/canvas-exploration-objects.js).
 * 무엇을 골랐는지는 탐험 상태가 정한다. 여기서는 그리기만 한다.
 */
const targetMarks = (() => {
    const INK = Object.freeze({ fill: '#ffd66b', light: '#fff3c4', edge: '#1b171c' });
    const ROWS = Object.freeze([7, 5, 3, 1]);    // 화살표의 도트 줄(위에서 아래로)마다 칠하는 너비
    const ROUND = Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    /** 화살표 모양 한 벌: left = 맨 윗줄 가운데 도트의 왼쪽, top = 맨 윗줄의 위(화면 px). */
    function shape(ctx, at, size, colour) {
        ctx.fillStyle = colour;
        ROWS.forEach((width, row) => ctx.fillRect(at.left - Math.floor(width / 2) * size, at.top + row * size, width * size, size));
    }
    /** 화살표 하나. x = 가운데, y = 아래 꼭짓점이 닿는 자리(화면 px), dot = 캐릭터 도트 한 칸의 px(화살표의 도트는 그 두 배, 적어도
     * 3px: 몰려 선 몬스터 사이에서도 읽힌다). 0.9초에 한 번 두 도트만큼 오르내린다. */
    function arrow(ctx, x, y, dot) {
        const size = Math.max(3, Math.round(dot * 2)), bob = Math.round((1 + Math.sin(performance.now() / 140)) * size);
        const at = { left: Math.round(x - size / 2), top: Math.round(y) - bob - ROWS.length * size };
        ctx.save();
        ctx.globalAlpha = 1;
        for (const [dx, dy] of ROUND) shape(ctx, { left: at.left + dx * size, top: at.top + dy * size }, size, INK.edge);
        shape(ctx, at, size, INK.fill);
        ctx.fillStyle = INK.light;
        ctx.fillRect(at.left - 2 * size, at.top, 3 * size, size);
        ctx.restore();
    }
    return Object.freeze({ arrow });
})();
safeExposeGlobals({ targetMarks });
