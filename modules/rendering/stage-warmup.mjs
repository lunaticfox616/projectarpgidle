/** 지금 쓰는 이펙트만 미리 준비해 두기 (2026-10-14, docs/stage-render-performance-20261013.md 7번 "처음 그릴 때의 끊김").
 * 사용자: "내가 사용하는 이펙트만 미리 풀어두고, 룬 변경 등 일때 기존꺼 삭제하는 방식". 그림은 처음 그려지는 프레임에서 풀리며 그
 * 프레임을 붙잡으므로, 전투에서 처음 그리기 전에 미리 해 둔다. 무엇을 미리 하는가는 여기서 정하고, 하는 일은 그림의 주인이 한다.
 *   낀 룬(주 스킬, 이동기, 소환 룬)의 새 이펙트 클립  띠를 미리 만들고, 낀 룬이 쓰지 않는 띠는 놓는다(js/canvas-stage-skill-vfx.js keepStrips)
 *   전장에 바로 그리는 예전 이펙트 시트                기본 공격의 베기와 타격 섬광, 적의 투사체.
 *                                                    전장을 그린 뒤 TOUCH_MS마다 한 장씩 돌아가며, 한 점을 제 크기로 그린다(touchNextSheet).
 *                                                    이 시트들은 브라우저가 풀어 둔 것을 들고 있다가 몇 초 안 그리면 스스로 놓는다: 한 번만
 *                                                    풀어 두면 걸어가서 치는 첫 타격에서 다시 풀렸다. 계속 건드려 풀린 채로 둔다.
 *   세계수 스킬 시트(낀 룬이 쓰면)                     리메이크 판(js/canvas-fx-remake.js)이 그 시트의 사본을 미리 만들고, 처음 한 번 드는
 *                                                    값을 미리 치른다(prepareSheet). 판은 화소를 읽는 캔버스라 전장에 그려 풀어 둔 것은
 *                                                    듣지 않는다. 리메이크가 꺼져 있으면 그 시트도 전장에 바로 그려지므로 위처럼 한다.
 *   지금 지도의 몬스터                                지도가 바뀌면 그 지도에 서 있는 무리의 그림을 미리 풀어 두고, 지난 지도의 것은 놓는다
 *                                                    (js/canvas-stage-roster.js keepFor). 방이 있는 지도든 없는 지도든 같다.
 * 주인공의 시트는 직업과 무기 자세가 바뀔 때 그 주인이 준비하고 놓는다(js/canvas-stage-actors.js).
 * 빌드는 CHECK_MS마다 한 번 견준다(룬 이름 몇 개를 잇는 값): 달라졌을 때만 준비한다. 지도는 그릴 때마다 견준다(같은 탐험인가만 본다).
 * 전투 계산에는 닿지 않는다.
 */
class StageWarmup {
    constructor(deps) {
        this.deps = deps;
        this.CHECK_MS = 250;
        this.TOUCH_MS = 400;
        this.COMMON_SHEETS = Object.freeze(['skillFxBasicSlash', 'skillFxImpactFlare', 'skillFxEnemyProjectiles']);
        this.WORLD_TREE_SHEET = 'skillFxWorldTree';
        this.checkedAt = 0;
        this.buildKey = '';
        this.sheetKeys = [];
        this.touchedAt = 0;
        this.touchTurn = 0;
        this.mapKey = null;
        this.remakeDue = false;
    }

    /** 지금 낀 룬의 이름: 주 스킬, 이동기, 소환 룬. */
    wornGems(owner) {
        const summons = Array.isArray(owner.equippedSummonSkills) ? owner.equippedSummonSkills : [];
        return [owner.activeSkill || '기본 공격', this.deps.mobilitySkill.equipped(owner)].concat(summons).filter(Boolean);
    }

    /** 그 룬의 타격이 띨 수 있는 속성: 룬의 속성과, 지금 주 스킬이면 빌드가 바꾼 속성. */
    elementsOf(owner, name) {
        const def = this.deps.SKILL_DB[name] || {}, live = owner.lastCombatStats && owner.lastCombatStats.sSkill;
        return [def.ele, name === owner.activeSkill && live ? live.ele : null].filter(Boolean);
    }

    /** 빌드가 달라졌으면 그 빌드의 이펙트를 준비한다: 클립의 띠를 맡기고, 풀어 둘 시트를 정한다. */
    syncBuild(owner) {
        const worn = this.wornGems(owner), vfx = this.deps.stageSkillVfx.ready(owner);
        const key = worn.map(name => name + ':' + this.elementsOf(owner, name).join('+')).join('|') + '|' + vfx;
        if (key === this.buildKey) return;
        this.buildKey = key;
        if (vfx) this.deps.stageSkillVfx.keepStrips(owner, worn.flatMap(name => this.deps.stageSkillRules.clipsOf(name, this.elementsOf(owner, name))).concat(this.deps.stageBlessing.clipsOf(worn)));
        // 향로 다섯 룬의 고딕 그림(js/canvas-stage-gothic-remakes.js): 끼면 그림을 연다. 열기 전에 쏘면 그 시전은 예전 그림이다.
        if (worn.some(name => this.deps.stageGothicRemakes.GEMS.includes((this.deps.SKILL_DB[name] || {}).nativeCastId))) this.deps.stageGothicRemakes.ready();
        const tree = worn.some(name => this.deps.SKILL_FX_ATLAS[name]), remade = this.deps.fxRemake.isEnabled();
        this.sheetKeys = this.COMMON_SHEETS.concat(tree && !remade ? [this.WORLD_TREE_SHEET] : []);
        this.remakeDue = tree && remade;
    }

    /** 지도가 바뀌었으면 그 지도의 몬스터 그림을 맡긴다: 서서 기다리는 무리와 이미 나와 있는 적 모두. */
    syncMap(owner) {
        const run = this.deps.actExplorationState.current(owner), key = run || owner.currentZoneId;
        if (key === this.mapKey) return;
        this.mapKey = key;
        this.deps.stageRoster.keepFor(owner, (run ? run.packs.flatMap(pack => pack.waiting) : []).concat(owner.enemies));
    }

    /** 다음 차례의 시트 한 장을 지금 그린 전장의 구석에 한 점, 제 크기로, 거의 보이지 않게 그린다: 풀려 있지 않으면 이 프레임의
     * 끝에 풀리고(한 장에 데스크톱 10ms, 느린 기기 40ms쯤), 풀려 있으면 값이 들지 않고 풀린 채로 남는다. */
    touchNextSheet(ctx) {
        const image = (this.deps.battleAssets.images || {})[this.sheetKeys[this.touchTurn++ % this.sheetKeys.length]];
        if (!(image instanceof this.deps.HTMLImageElement) || !image.complete || !image.naturalWidth) return;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 0.01;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 0, 0, 1, 1, 0, 0, 1, 1);
        ctx.restore();
    }

    /** 전장을 끝까지 그린 뒤에 부른다(js/canvas-battlefield.js). 무대가 꺼져 있으면 아무 일도 하지 않는다. */
    afterBattleDraw(owner, ctx) {
        const now = this.deps.performance.now();
        this.syncMap(owner);
        if (now - this.checkedAt >= this.CHECK_MS) { this.checkedAt = now; this.syncBuild(owner); }
        if (this.remakeDue) this.remakeDue = !this.deps.fxRemake.prepareSheet((this.deps.battleAssets.images || {})[this.WORLD_TREE_SHEET]);
        if (this.sheetKeys.length && now - this.touchedAt >= this.TOUCH_MS) { this.touchedAt = now; this.touchNextSheet(ctx); }
    }
}

export function createStageWarmup(deps) {
    const instance = new StageWarmup(deps);
    return Object.freeze({ afterBattleDraw: instance.afterBattleDraw.bind(instance) });
}
