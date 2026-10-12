/** 지역 무대 그림(data/stage-regions.js)을 방에 맞추는 셈. 방 그림 한 장을 늘이거나 이어 붙이지 않고, 기준 화면(가로 스무 칸)을
 * 덮는 가장 작은 배율로 방의 가운데에 놓는다: 그림의 바닥이 시작하는 줄이 방 바닥의 뒤쪽 끝에 온다. 배율은 방의 크기로만 정해지고
 * 창 크기와는 상관없다(어느 화면에서나 풍경과 캐릭터의 비례가 같다). 그림에 정해진 뒤쪽 문 자리도 여기서 방의 칸으로 옮긴다:
 * 지도를 짓는 쪽(js/act-exploration-rooms.js)과 그리는 쪽(js/canvas-stage-region.js)이 같은 셈을 쓴다.
 * 순수 함수: 게임 상태와 DOM을 쓰지 않는다. 표가 없는 환경(검증 스크립트)에서는 지역이 없는 것으로 답한다.
 */
const stageRegionFit = (() => {
    const WIDE = 64, DEEP = 32;                 // 한 칸의 도트(js/canvas-stage-terrain.js와 같다)
    /** 지역 이름 → 표의 줄. 모르는 지역이면 null. */
    const regionRow = id => (typeof STAGE_REGIONS === 'object' && id && STAGE_REGIONS.regions[id]) || null;
    /** 방 그림의 1px이 차지하는 도트 수: 방 바닥과 양옆 여백, 바닥선 위의 풍경, 바닥선 아래의 땅을 모두 덮는 가장 작은 값. */
    function regionScale(region, columns, rows) {
        const fit = STAGE_REGIONS.fit, above = fit.floorBottom - rows * DEEP, span = Math.max(fit.width, columns * WIDE + fit.margin);
        return Math.max(span / region.width, above / region.ground, (fit.height - above) / (region.height - region.ground));
    }
    /** 뒤쪽 벽의 문이 서는 칸(방 왼쪽 끝에서 0부터): 그림에 정해진 문 자리에 가장 가까운 칸. 구석 칸은 피한다. */
    function regionNorthColumn(id, columns, rows, mirror) {
        const region = regionRow(id), middle = Math.floor(columns / 2);
        if (!region || region.door === null) return middle;
        // 좌우로 뒤집어 쓰는 방(js/act-exploration-rooms.js roomMirrored)에서는 그림의 문 자리도 반대쪽이다
        const offset = (mirror ? -1 : 1) * (region.door - 0.5) * region.width * regionScale(region, columns, rows) / WIDE;
        return Math.max(1, Math.min(columns - 2, middle + Math.round(offset)));
    }
    return Object.freeze({ of: regionRow, scale: regionScale, northColumn: regionNorthColumn });
})();
safeExposeGlobals({ stageRegionFit });
