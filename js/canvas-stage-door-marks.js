/** 열린 문의 표시 (방 단위 무대): 문 자리에 깔리는 빛과, 나가는 쪽을 가리키며 차례로 밝아지는 갈매기 표시 셋.
 * 뒤쪽과 앞쪽 문은 문 칸의 바닥에 그린다(js/canvas-stage-rooms.js). 조각 묶음의 좌우 문은 문틀 그림이 문 칸을 덮어 바닥의 표시가
 * 보이지 않았다(2026-10-11 사용자: "왼쪽이랑 오른쪽 문에서 화살표가 잘 안보여. 위아래는 멋지게 잘 보임"): 문틀의 뚫린 자리에 세워서
 * 더 굵게 그린다(js/canvas-stage-scene.js drawMarks: 화면 가장자리는 전장의 조명에 어두워지므로 조명을 입힌 뒤에 그린다). 그리기만 한다.
 */
const stageDoorMarks = (() => {
    const ARROW = Object.freeze({ east: [1, 0], west: [-1, 0], north: [0, -1], south: [0, 1] });
    const INK = Object.freeze({ open: '#f3e5b4', gate: '#ff7a66', shade: '#1b171c' });
    /** 문 자리의 빛: 바닥에 깔리면 납작한 타원, 문틀 안에 서면 세로로 긴 타원. */
    function glow(ctx, box, colour, upright) {
        const light = ctx.createRadialGradient(box.cx, box.cy, 0, box.cx, box.cy, box.w * .75);
        light.addColorStop(0, colour + (upright ? '80' : '66'));
        light.addColorStop(1, colour + '00');
        ctx.save();
        ctx.translate(box.cx, box.cy); ctx.scale(upright ? .8 : 1, upright ? 1.25 : .5); ctx.translate(-box.cx, -box.cy);
        ctx.fillStyle = light;
        ctx.fillRect(box.cx - box.w, box.cy - box.w, box.w * 2, box.w * 2);
        ctx.restore();
    }
    /** 도트 갈매기 표시 하나(dx, dy 쪽을 가리킨다): 어두운 그림자 위에 size 굵기로 찍는다. squash = 깊이 쪽 길이를 누르는 비율. */
    function chevron(ctx, mark) {
        const { dx, dy, size, squash } = mark;
        for (const [shade, colour] of [[mark.dot, INK.shade], [0, mark.colour]]) {
            ctx.fillStyle = colour;
            for (let step = 0; step < 4; step++) {
                const along = dx ? [-dx * step * size, 0] : [0, -dy * step * size * squash], across = dx ? [0, step * size * squash] : [step * size, 0];
                for (const side of [-1, 1]) {
                    ctx.fillRect(Math.round(mark.x + along[0] + across[0] * side), Math.round(mark.y + along[1] + across[1] * side + shade), size, size);
                }
            }
        }
    }
    /**
     * @param {{cx:number, cy:number, w:number}} box where the mark sits and how wide its light spreads
     * @param {{side:string, gate?:boolean}} door the side it leads out by; the boss gate is red
     * @param {{dot:number, thick?:number, upright?:boolean}} look one dot on screen, the stroke in dots, standing in a door frame
     */
    function arrows(ctx, box, door, look) {
        const [dx, dy] = ARROW[door.side], phase = performance.now() / 240, colour = door.gate ? INK.gate : INK.open;
        const size = Math.max(2, Math.round(look.dot * (look.thick || 2))), squash = look.upright ? 1 : .5, gap = size * 3.5, dim = look.upright ? .55 : .3;
        ctx.save();
        glow(ctx, box, colour, !!look.upright);
        for (let i = 0; i < 3; i++) {
            const reach = (i - 1) * gap;
            ctx.globalAlpha = dim + (1 - dim) * Math.max(0, Math.sin(phase - i * .9));
            chevron(ctx, { x: box.cx + dx * reach - size / 2, y: box.cy + dy * reach * squash - size / 2, dx, dy, dot: Math.max(1, Math.round(look.dot)), size, squash, colour });
        }
        ctx.restore();
    }
    return Object.freeze({ arrows });
})();
safeExposeGlobals({ stageDoorMarks });
