/** 화면에 그릴 적 목록 (2026-10-13 성능 작업, docs/stage-render-performance-20261013.md).
 * 전투, 투사체, 연쇄, 공격 예고가 쓰는 자리 목록(js/canvas-battlefield.js buildBattleEnemyPosMap)은 살아 있는 모든 적을 담는다.
 * 여기서는 그 가운데 그림을 그릴 것만 가른다(프레임마다 한 번):
 *   seen   주인공에게 보이는 적(시야 방식의 답: js/act-exploration-sight.js). 안 보이는 적은 그림도, 숫자도, 잔상도 없다.
 *   drawn  보이는 적 가운데 그림이 화면에 걸치는 적. 스프라이트 합성, 그림자, 체력 막대는 이 적들만 그린다.
 * 화면 밖 생략은 시야와 다른 일이다: 방 전체가 보이는 방식에서도 넓은 방이나 이어진 지도의 화면 밖 적은 그리지 않는다.
 * 그리지 않는 것은 그림뿐이다. 전투 계산, 걸음과 동작의 시계(걸은 거리와 공격 시각에서 그때그때 읽는다), 자리 목록은 그대로이고,
 * 보는 쪽의 기억만은 그릴 때 적히던 것이라 화면 밖에서도 이어 적는다(keepFacing): 화면에 다시 들어설 때 돌아서며 튀지 않는다.
 * 화면 밖의 적이 쏜 투사체, 범위 효과, 공격 예고는 자리 목록과 효과 기록으로 그려지므로 여기를 거치지 않는다.
 */
const battleDrawList = (() => {
    // 발 자리에서 그림이 뻗을 수 있는 범위. 칸 너비의 배수(몸, 무기, 기울임과 내밀기, 맞고 밀림, 그림자)에 화면 px(체력 막대, 정예 이름표,
    // 보스의 기술 이름)을 더한다. 가장 큰 그림(정점 보스의 3단계: 발에서 옆으로 6.3칸, 위로 4.1칸)을 넉넉히 덮는다. 좁게 잡으면 화면
    // 끝에서 그림이 잘려 보이므로 넓게 잡는다: 방 하나가 화면 너비인 무대에서는 사실상 모두 그려지고, 넓은 지도의 먼 적만 빠진다.
    const REACH = Object.freeze({ side: 8, up: 7, down: 2, labelSide: 80, labelUp: 150 });

    /** entry의 그림이 화면(view = { width, height, tile })에 걸칠 수 있는가. entry.x, entry.y는 발 자리(화면 px). */
    function touchesView(entry, view) {
        const side = REACH.side * view.tile + REACH.labelSide, up = REACH.up * view.tile + REACH.labelUp, down = REACH.down * view.tile;
        return entry.x + side >= 0 && entry.x - side <= view.width && entry.y + down >= 0 && entry.y - up <= view.height;
    }
    /** 이번 프레임의 자리 목록에 seen과 drawn을 적는다. */
    function markDrawn(layout, view) {
        for (const entry of layout) {
            entry.seen = actExplorationView.inSight(entry.enemy);
            entry.drawn = entry.seen && touchesView(entry, view);
        }
        return layout;
    }
    /** 보이지만 화면 밖이라 그리지 않는 적의 보는 쪽을 이어 적는다(그릴 때 적히는 기억: stageView.facing, noteEnemySpriteSide). */
    function keepFacing(entry, playerPos, tile) {
        stageView.facing(entry.enemy, resolveEnemyFacingDirection(entry, playerPos));
        noteEnemySpriteSide(entry.enemy, entry, playerPos, tile);
    }
    return Object.freeze({ REACH, touchesView, markDrawn, keepFacing });
})();
safeExposeGlobals({ battleDrawList });
