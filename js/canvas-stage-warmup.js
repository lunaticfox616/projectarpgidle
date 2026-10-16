/** 지금 쓰는 이펙트만 미리 준비해 두기 (2026-10-14, docs/stage-render-performance-20261013.md 7번 "처음 그릴 때의 끊김").
 * 사용자: "내가 사용하는 이펙트만 미리 풀어두고, 젬 변경 등 일때 기존꺼 삭제하는 방식". 그림은 처음 그려지는 프레임에서 풀리며 그
 * 프레임을 붙잡으므로, 전투에서 처음 그리기 전에 미리 해 둔다. 무엇을 미리 하는가는 여기서 정하고, 하는 일은 그림의 주인이 한다.
 *   낀 젬(주 스킬, 이동기, 소환 젬)의 새 이펙트 클립  띠를 미리 만들고, 낀 젬이 쓰지 않는 띠는 놓는다(js/canvas-stage-skill-vfx.js keepStrips)
 *   전장에 바로 그리는 예전 이펙트 시트                기본 공격의 베기와 타격 섬광, 적의 투사체.
 *                                                    전장을 그린 뒤 TOUCH_MS마다 한 장씩 돌아가며, 한 점을 제 크기로 그린다(touchNextSheet).
 *                                                    이 시트들은 브라우저가 풀어 둔 것을 들고 있다가 몇 초 안 그리면 스스로 놓는다: 한 번만
 *                                                    풀어 두면 걸어가서 치는 첫 타격에서 다시 풀렸다. 계속 건드려 풀린 채로 둔다.
 *   세계수 스킬 시트(낀 젬이 쓰면)                     리메이크 판(js/canvas-fx-remake.js)이 그 시트의 사본을 미리 만들고, 처음 한 번 드는
 *                                                    값을 미리 치른다(prepareSheet). 판은 화소를 읽는 캔버스라 전장에 그려 풀어 둔 것은
 *                                                    듣지 않는다. 리메이크가 꺼져 있으면 그 시트도 전장에 바로 그려지므로 위처럼 한다.
 *   지금 지도의 몬스터                                지도가 바뀌면 그 지도에 서 있는 무리의 그림을 미리 풀어 두고, 지난 지도의 것은 놓는다
 *                                                    (js/canvas-stage-roster.js keepFor). 방이 있는 지도든 없는 지도든 같다.
 * 주인공의 시트는 직업과 무기 자세가 바뀔 때 그 주인이 준비하고 놓는다(js/canvas-stage-actors.js).
 * 빌드는 CHECK_MS마다 한 번 견준다(젬 이름 몇 개를 잇는 값): 달라졌을 때만 준비한다. 지도는 그릴 때마다 견준다(같은 탐험인가만 본다).
 * 전투 계산에는 닿지 않는다.
 */
const stageWarmup = (() => {
    const CHECK_MS = 250;
    const TOUCH_MS = 400;            // 시트 한 장을 건드리는 사이(세 장이면 한 장이 1.2초마다 한 번)
    /** 어느 빌드든 전투에서 그리는 예전 이펙트 시트(battleAssets.images의 열쇠). */
    const COMMON_SHEETS = Object.freeze(['skillFxBasicSlash', 'skillFxImpactFlare', 'skillFxEnemyProjectiles']);
    const WORLD_TREE_SHEET = 'skillFxWorldTree';
    let checkedAt = 0, buildKey = '', sheetKeys = [], touchedAt = 0, touchTurn = 0;
    let mapKey = null;               // 지금 지도: 탐험(그 객체) 또는, 탐험이 아닌 콘텐츠면 지역 id
    let remakeDue = false;           // 리메이크 판이 세계수 시트를 아직 준비하는 중인가

    /** 지금 낀 젬의 이름: 주 스킬, 이동기, 소환 젬. */
    function wornGems() {
        const summons = Array.isArray(game.equippedSummonSkills) ? game.equippedSummonSkills : [];
        return [game.activeSkill || '기본 공격', mobilitySkill.equipped()].concat(summons).filter(Boolean);
    }
    /** 그 젬의 타격이 띨 수 있는 속성: 젬의 속성과, 지금 주 스킬이면 빌드가 바꾼 속성. */
    function elementsOf(name) {
        const def = SKILL_DB[name] || {}, live = game.lastCombatStats && game.lastCombatStats.sSkill;
        return [def.ele, name === game.activeSkill && live ? live.ele : null].filter(Boolean);
    }
    /** 빌드가 달라졌으면 그 빌드의 이펙트를 준비한다: 클립의 띠를 맡기고, 풀어 둘 시트를 정한다. */
    function syncBuild() {
        const worn = wornGems(), vfx = stageSkillVfx.ready();
        const key = worn.map(name => name + ':' + elementsOf(name).join('+')).join('|') + '|' + vfx;
        if (key === buildKey) return;
        buildKey = key;
        if (vfx) stageSkillVfx.keepStrips(worn.flatMap(name => stageSkillRules.clipsOf(name, elementsOf(name))));
        const tree = worn.some(name => SKILL_FX_ATLAS[name]), remade = fxRemake.isEnabled();
        sheetKeys = COMMON_SHEETS.concat(tree && !remade ? [WORLD_TREE_SHEET] : []);
        remakeDue = tree && remade;
    }
    /** 지도가 바뀌었으면 그 지도의 몬스터 그림을 맡긴다: 서서 기다리는 무리와 이미 나와 있는 적 모두. */
    function syncMap() {
        const run = actExplorationState.current(game), key = run || game.currentZoneId;
        if (key === mapKey) return;
        mapKey = key;
        stageRoster.keepFor((run ? run.packs.flatMap(pack => pack.waiting) : []).concat(game.enemies));
    }
    /** 다음 차례의 시트 한 장을 지금 그린 전장의 구석에 한 점, 제 크기로, 거의 보이지 않게 그린다: 풀려 있지 않으면 이 프레임의
     * 끝에 풀리고(한 장에 데스크톱 10ms, 느린 기기 40ms쯤), 풀려 있으면 값이 들지 않고 풀린 채로 남는다. */
    function touchNextSheet(ctx) {
        const image = (battleAssets.images || {})[sheetKeys[touchTurn++ % sheetKeys.length]];
        if (!(image instanceof HTMLImageElement) || !image.complete || !image.naturalWidth) return;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 0.01;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 0, 0, 1, 1, 0, 0, 1, 1);
        ctx.restore();
    }
    /** 전장을 끝까지 그린 뒤에 부른다(js/canvas-battlefield.js). 무대가 꺼져 있으면 아무 일도 하지 않는다. */
    function afterBattleDraw(ctx) {
        if (!stageView.enabled()) return;
        const now = performance.now();
        syncMap();
        if (now - checkedAt >= CHECK_MS) { checkedAt = now; syncBuild(); }
        if (remakeDue) remakeDue = !fxRemake.prepareSheet((battleAssets.images || {})[WORLD_TREE_SHEET]);
        if (sheetKeys.length && now - touchedAt >= TOUCH_MS) { touchedAt = now; touchNextSheet(ctx); }
    }
    return Object.freeze({ afterBattleDraw });
})();
safeExposeGlobals({ stageWarmup });
