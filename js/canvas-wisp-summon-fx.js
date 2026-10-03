/** 위습 정령 소환 공격 그림 (스킬 변경분 2, 2026-09-30). 전투가 남긴 summonAttack 효과(위습 칸 → 대상 칸, 시작 = 타격 프레임)마다
 * redrawnSkillArtMoves.WispAttack을 도트 판(칸당 16도트)에 찍는다: 카오스 안개는 바닥 층(적 아래), 나머지는 앞 층.
 * 위치는 인계와 같이 위습 16×16 칸의 가운데 → 대상 칸 가운데 1도트 위이고, 둘 다 그려진 발 높이에 맞춰 옮긴다
 * (인계 시뮬레이터는 칸 아래 끝, 본편은 발 자리가 칸의 바닥선). 그림만 — 피해 시점은 전투(js/wisp-summons.js)가 같은 비행 시간으로 정한다.
 */
const wispSummonFx = (() => {
    const DOTS = 16;
    function isWispStrike(fx, now) {
        return !!fx && fx.type === 'summonAttack' && !!WISP_SUMMONS[fx.gemName] && fx.start <= now
            && [fx.sourceGx, fx.sourceGy, fx.targetGx, fx.targetGy].every(Number.isFinite);
    }
    /** W / T in board dots. lift: how far the drawn feet line sits from the bottom edge of the cell (the handoff's block bottom). */
    function ends(fx, lift) {
        return {
            W: { x: fx.sourceGx * DOTS + 8, y: fx.sourceGy * DOTS + 8 + lift },
            T: { x: fx.targetGx * DOTS + 8, y: fx.targetGy * DOTS + 7 + lift }
        };
    }
    function paint(dot, layer, fx, lift, now) {
        const { W, T } = ends(fx, lift), el = WISP_SUMMONS[fx.gemName].art, age = now - fx.start;
        if (layer === 'ground') redrawnSkillArtMoves.WispAttack.mist(dot, el, W, T, age);
        else redrawnSkillArtMoves.WispAttack.attack(dot, el, W, T, age);
    }
    /** Draws every wisp attack on screen into the open remake pass. layer: 'ground' | 'fore'. */
    function drawLayer(layer, visualNow) {
        const projection = fxRemake.projection();
        if (!fxRemake.isOpen() || !projection) return;
        const strikes = battleFx.filter(fx => isWispStrike(fx, visualNow));
        if (!strikes.length) return;
        const lift = redrawnSkillFx.kit.feetY({ gx: 0, gy: 0 }, { projection }) - DOTS;
        fxRemake.drawDots(dot => strikes.forEach(fx => paint(dot, layer, fx, lift, visualNow)));
    }
    return Object.freeze({ drawLayer });
})();
safeExposeGlobals({ wispSummonFx });
