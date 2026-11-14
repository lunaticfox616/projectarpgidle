import { gemMoveStart, gemLandNear, gemMoveReach, gemCell, gemMoveRadius, gemBesideTarget, gemPullLanding, gemDistance, gemLandingNow, gemSame, gemArea } from './gem-cast-geometry.mjs';
import { gemGrow, gemMs } from './gem-cast-math.mjs';
import { gemVisual, gemContact } from './gem-cast-common.mjs';
import { SMOKE_RADIUS } from './gem-cast-values.mjs';

export function gemLaunchRift(env, state,c,enemies) {                   // 54: a tear before the caster, out of a second one
    const {live,aim}=gemMoveStart(env, state,c,enemies),to=gemLandNear(env, c.source,aim,live,gemMoveReach(54,gemGrow(c.stats)));
    if(!to){c.done=true;return;}
    const tear=c.at+gemMs(c,300),close=tear+gemMs(c,380);
    c.move={from:gemCell(c.source),to,tear,openB:tear+gemMs(c,120),vanish:[tear+gemMs(c,80),tear+gemMs(c,340)],close,burst:close+gemMs(c,40),
        swing:{impact:tear,until:tear+gemMs(c,140)}};
    c.nextAt=tear+gemMs(c,210);
    gemVisual(env, state,c,'move',c.at,c.move.burst+gemMs(c,520)-c.at,{move:c.move,targetCells:[to],footprint:{center:to,radius:gemMoveRadius(c)}});
}

export function gemLaunchSmoke(env, state,c,enemies) {                  // 55: a smoke puff, then out of another beside the target
    const {live,aim}=gemMoveStart(env, state,c,enemies),to=gemBesideTarget(env, c.source,aim,live);
    if(!to){c.done=true;return;}
    const puff=c.at+gemMs(c,400);
    c.move={from:gemCell(c.source),to,foe:aim,puff,puffB:puff+gemMs(c,120),vanish:[puff+gemMs(c,30),puff+gemMs(c,310)],lifeA:gemMs(c,720),lifeB:gemMs(c,1000),
        swing:{impact:puff,until:puff+gemMs(c,140)}};
    c.nextAt=puff+gemMs(c,170);
    gemVisual(env, state,c,'move',c.at,c.move.puffB+c.move.lifeB+80-c.at,{move:c.move,targetCells:[aim]});
}

export function gemLaunchHarpoon(env, state,c,enemies) {                // 56: the harpoon strikes, the rope pulls the archer in
    const {live,aim}=gemMoveStart(env, state,c,enemies),to=gemPullLanding(env, c.source,aim,live);
    const release=c.at+gemMs(c,360),hitAt=release+gemMs(c,70+gemDistance(c.source,aim)*42),pull0=hitAt+gemMs(c,90);
    const pull1=to ? pull0+gemMs(c,70+gemDistance(c.source,to)*75) : hitAt;
    c.move={from:gemCell(c.source),to:to || gemCell(c.source),foe:aim,release,hitAt,pull0,pull1,moved:!!to,swing:{impact:release,until:release+gemMs(c,140)}};
    c.nextAt=hitAt;
    gemVisual(env, state,c,'move',c.at,pull1+gemMs(c,420)-c.at,{move:c.move,targetCells:[aim]});
}

/** 77 바위 플라스크(2026-10-20 스킬룬 추가본 v44, 사용자 구상): 줄 매단 바위 병을 던져 떨어진 자리 둘레(3×3, 효과 확장 +N칸)를 치고,
 * 0.11초 뒤 줄을 당겨 그 앞 칸까지 0.26초에 돌진한다(작살화살의 pullLanding, 이미 붙어 있으면 줄만 당긴다). 던진 팔은 돌진이 끝날 때까지
 * 뻗은 채다(c.move.swing의 until). 대상이 없으면 쓰지 않는다(작살화살과 같다). */
export function gemLaunchRockFlask(env, state,c,enemies) {
    const {live,aim}=gemMoveStart(env, state,c,enemies),to=gemPullLanding(env, c.source,aim,live);
    const release=c.at+gemMs(c,360),hitAt=release+gemMs(c,300+gemDistance(c.source,aim)*32),pull0=hitAt+gemMs(c,110);
    const pull1=to ? pull0+gemMs(c,260) : pull0;
    c.move={from:gemCell(c.source),to:to || gemCell(c.source),foe:aim,release,hitAt,pull0,pull1,moved:!!to,swing:{impact:release,until:pull1+gemMs(c,60)}};
    c.nextAt=hitAt;
    gemVisual(env, state,c,'move',c.at,pull1+gemMs(c,420)-c.at,{move:c.move,targetCells:[aim],footprint:{center:aim,radius:gemMoveRadius(c)}});
}

export function gemStepRift(env, state,c,input) {                       // mid-vanish: into one tear, out of the other; the burst
    if(!c.index) {
        c.index=1;c.nextAt=c.move.burst;
        if(!gemLandingNow(env, c,input)){c.done=true;c.failed=true;return [];}
        return [gemMoveTo(c,'vanish')];
    }
    c.done=true;
    return gemSame(input.source,c.move.to) ? [gemContact(env, c,gemArea(env, input.enemies,c.move.to,'square',gemMoveRadius(c)),c.move.burst)] : [];
}

/** 향로구름(2026-11-01 전달본 V3.6): 닿는 순간 그 자리와 주변 1칸에 물리 피해를 대상마다 한 번 준다. */
export function gemStepSmoke(env, state,c,input) {
    c.done=true;
    if(!gemLandingNow(env, c,input))return [];
    const hit=gemArea(env, input.enemies,c.move.to,'square',SMOKE_RADIUS),move=gemMoveTo(c,'vanish');
    c.source=c.move.to;
    return [move,gemContact(env, c,hit,c.nextAt)];
}

export function gemStepHarpoon(env, state,c,input) {                    // the strike, then (if it moved) the arrival at the rope's end
    if(!c.index) {
        c.index=1;c.nextAt=c.move.pull1;c.done=!c.move.moved;
        const hit=gemContact(env, c,input.enemies.filter(e=>e.id===c.targetId && e.hp>0),c.move.hitAt);
        return c.move.moved ? [hit,gemHarpoonPull(c)] : [hit];
    }
    c.done=true;
    return gemLandingNow(env, c,input) ? [gemMoveTo(c,'pull')] : [];
}

export function gemStepRockFlask(env, state,c,input) {                  // the flask breaks around where it lands, then (if it moved) the dash
    if(!c.index) {
        c.index=1;c.nextAt=c.move.pull1;c.done=!c.move.moved;
        return [gemContact(env, c,gemArea(env, input.enemies,c.move.foe,'square',gemMoveRadius(c)),c.move.hitAt)];
    }
    c.done=true;
    return gemLandingNow(env, c,input) ? [gemMoveTo(c,'pull')] : [];
}

/** 작살화살이 끌려가는 동안 무대의 주인공이 밧줄을 당긴다(2026-10-20 v42, 활 이동 동작): 당기기 시작에 한 번 힘을 주고 끝까지. */
export function gemHarpoonPull(c) {
    const m=c.move;
    return {type:'pose',name:c.name,element:c.stats.sSkill.ele,targets:[],swing:{impactDelayMs:m.pull0-m.hitAt+gemMs(c,60),duration:m.pull1-m.hitAt+gemMs(c,120),pose:'pull'}};
}

export function gemMoveTo(c, motion) { return {type:'teleport',name:c.name,from:c.move.from,to:c.move.to,motion}; }
