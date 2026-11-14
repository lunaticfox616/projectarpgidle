// GENERATED from modules/canvas-battle-draw-list*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/battle-draw-list.mjs
  var BattleDrawList = class {
    constructor(deps) {
      this.deps = deps;
      this.REACH = Object.freeze({ side: 8, up: 7, down: 2, labelSide: 80, labelUp: 150 });
      this.DRAWN_LIVE_MS = 500;
      this.drawn = { entries: [], tile: 0, at: -Infinity };
    }
    /** entry의 그림이 화면(view = { width, height, tile })에 걸칠 수 있는가. entry.x, entry.y는 발 자리(화면 px). */
    touchesView(entry, view) {
      const side = this.REACH.side * view.tile + this.REACH.labelSide, up = this.REACH.up * view.tile + this.REACH.labelUp, down = this.REACH.down * view.tile;
      return entry.x + side >= 0 && entry.x - side <= view.width && entry.y + down >= 0 && entry.y - up <= view.height;
    }
    /** 이번 프레임의 자리 목록에 seen과 drawn을 적는다. */
    markDrawn(layout, view) {
      for (const entry of layout) {
        entry.seen = this.deps.inSight(entry.enemy);
        entry.drawn = entry.seen && this.touchesView(entry, view);
      }
      return layout;
    }
    /** 보이지만 화면 밖이라 그리지 않는 적의 보는 쪽을 이어 적는다(그릴 때 적히는 기억: stageView.facing, noteEnemySpriteSide). */
    keepFacing(entry, playerPos, tile) {
      this.deps.stageView.facing(entry.enemy, this.deps.resolveEnemyFacingDirection(entry, playerPos));
      this.deps.noteEnemySpriteSide(entry.enemy, entry, playerPos, tile);
    }
    noteDrawn(entries, tile) {
      this.drawn = { entries, tile, at: this.deps.performance.now() };
    }
    /** 그림이 점(전장 CSS px)을 덮는가: 발 자리에서 그린 키만큼 위로, 칸 너비의 0.45배(보스는 그 발판 너비)만큼 옆으로. */
    covers(entry, point) {
      const tile = this.drawn.tile, half = tile * 0.45 * this.deps.getGridUnitFootprint(entry.enemy).columns;
      const tall = Math.max(tile * 0.9, this.deps.drawnEnemyHeight(entry.enemy) || 0);
      return Math.abs(point.x - entry.x) <= half && point.y <= entry.y + tile * 0.2 && point.y >= entry.y - tall;
    }
    /** 점 아래에 그려진 살아 있는 적. 여럿이면 앞에 선(발이 화면 아래인) 적. 없으면 null. */
    enemyAt(point) {
      if (!point || this.deps.performance.now() - this.drawn.at > this.DRAWN_LIVE_MS) return null;
      let front = null;
      for (const entry of this.drawn.entries) if (entry.enemy.hp > 0 && this.covers(entry, point) && (!front || entry.y > front.y)) front = entry;
      return front ? front.enemy : this.deps.woodsmanView.hitAt(point);
    }
    /** 이번 프레임에 그린 그 적의 자리({ x, y }: 발), 그리지 않았으면 null. */
    drawnEntry(enemy) {
      return this.deps.performance.now() - this.drawn.at > this.DRAWN_LIVE_MS ? null : this.drawn.entries.find((entry) => entry.enemy === enemy) || null;
    }
  };
  function createBattleDrawList(deps) {
    const instance = new BattleDrawList(deps);
    return Object.freeze({ REACH: instance.REACH, touchesView: instance.touchesView.bind(instance), markDrawn: instance.markDrawn.bind(instance), keepFacing: instance.keepFacing.bind(instance), noteDrawn: instance.noteDrawn.bind(instance), enemyAt: instance.enemyAt.bind(instance), drawnEntry: instance.drawnEntry.bind(instance) });
  }

  // modules/canvas-battle-draw-list-classic.mjs
  var native = createBattleDrawList({
    get inSight() {
      return actExplorationState.inSight;
    },
    get stageView() {
      return stageView;
    },
    get resolveEnemyFacingDirection() {
      return resolveEnemyFacingDirection;
    },
    get noteEnemySpriteSide() {
      return noteEnemySpriteSide;
    },
    get performance() {
      return performance;
    },
    get getGridUnitFootprint() {
      return getGridUnitFootprint;
    },
    drawnEnemyHeight: (enemy) => window.GameModules.battlefieldHud.drawnEnemyHeight(enemy),
    get woodsmanView() {
      return woodsmanView;
    }
  });
  var battleDrawList = Object.freeze({
    REACH: native.REACH,
    touchesView: native.touchesView,
    markDrawn: native.markDrawn,
    keepFacing: native.keepFacing,
    noteDrawn: native.noteDrawn,
    enemyAt: native.enemyAt,
    drawnEntry: native.drawnEntry
  });
  safeExposeGlobals({ battleDrawList });
})();
