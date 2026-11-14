import { woodOwns, woodPhase, woodElement } from './woodsman-state.mjs';
import { stumpTick } from './stump-cycle.mjs';
import { woodBounds } from './woodsman-geometry.mjs';

export function* woodPrepare(env, enemy) {
        if (!woodOwns(env, enemy)) return;
        const p = woodPhase(env, enemy);
        enemy.ele = woodElement(env, enemy);
        enemy.atkMul = 1 + Math.pow(p, 1.4) * 3.2;
        enemy.attackSpeedVar = (1 + Math.pow(p, 1.2) * 1.8) * 1.5;
        enemy.penetration = 8 + Math.floor(p * 28);
        enemy.dr = 10 + Math.floor(p * 40);
        if (!enemy.woodsmanStumpsPlaced && !enemy.woodsmanStumpsDue && enemy.hp <= enemy.maxHp * .6) {
            enemy.woodsmanStumpsDue = true;
            if (!enemy.patternTelegraphKey) enemy.nextPatternState = null;
        }
        yield* stumpTick(env, enemy);
        if (enemy.patternMode === 'woodsman') return;
        enemy.patternMode = 'woodsman';
        const box = woodBounds(env, enemy);
        enemy.footprint = { columns: 3, rows: 1 };
        enemy.gx = Math.floor((box.x0 + box.x1 - 2) / 2);
        enemy.gy = box.y0;
        enemy.gridMove = null;
        enemy.nextPatternState = null;
        enemy.patternArea = null;
        enemy.patternTelegraphKey = null;
    }
