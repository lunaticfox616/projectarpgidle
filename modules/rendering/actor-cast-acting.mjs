const ROOTLET = { x: 105, y: -70, color: '#f6b46c' };
const CHORUS = { x: -15, y: -58, color: '#f1bcff', load: 10, release: -15 };
const ELEMENT = { fire: '#ffc284', cold: '#d8eefe', light: '#fff0aa', chaos: '#edbeff', phys: '#f6d0a3' };
const ROOTLET_DRIVE_MS = 175;
const ROOTLET_SETTLE_MS = 225;

function windup(style, share) {
    return { style, phase: 'wind', dx: -style.load * share, dy: 4 * share, share, frame:undefined };
}

function burst(style, share, frame, element) {
    const fade = 1 - share;
    return { style, phase: 'release', dx: style.release * fade, dy: -3 * fade, share, frame, element };
}

function rootletActing(deps, enemy) {
    const now = deps.getCombatTime();
    const release = deps.bossMoves.live(now).find(row => row.source === enemy && row.move.kind === 'rings' && !row.move.cutAt);
    if (release) return rootletReleased(release,now);
    const area = enemy.patternArea;
    return area?.shape === 'diamond' && area.radius >= 2 && deps.bossAttackView.timing.isLiveWarning(enemy)
        ? rootletWindup(deps.bossAttackView.timing.warningShare(enemy) || 0) : null;
}

function rootletWindup(share) {
    const brace = Math.min(1, share * 1.4);
    return { style: ROOTLET, phase: 'wind', dx: -20 * brace, dy: 14 * brace, share, frame: share < .28 ? 0 : share < .5 ? 1 : 2 };
}

function rootletReleased(release,now) {
    const { move } = release;
    const sinceContact = now - move.releasedAt - move.stages[0].ms;
    const aftershock = move.stages[1];
    if (aftershock && release.element === 'phys' && sinceContact >= ROOTLET_SETTLE_MS) {
        return rootletAftershock(now - move.releasedAt - aftershock.ms);
    }
    if (sinceContact < -ROOTLET_DRIVE_MS) return rootletWindup(1);
    if (sinceContact < 0) return rootletDrive(sinceContact, release.element);
    if (sinceContact >= ROOTLET_SETTLE_MS) return null;
    const planted = 1 - Math.max(0, sinceContact - 50) / (ROOTLET_SETTLE_MS - 50);
    return {style:ROOTLET, phase:'recover', dx:38 * planted, dy:16 * planted, frame:sinceContact < 95 ? 4 : 5};
}

function rootletAftershock(age) {
    if (age < -240 || age >= 180) return null;
    if (age < -85) {
        const load = Math.min(1, (age + 240) / 120);
        return {style:ROOTLET, phase:'wind', dx:-13 * load, dy:-13 * load, share:load, frame:2};
    }
    if (age < 28) {
        const drive = Math.min(1, (age + 85) / 85);
        return {style:ROOTLET, phase:'recover', dx:-13 + 46 * drive, dy:-13 + 32 * drive, frame:3};
    }
    const settle = 1 - (age - 28) / 152;
    return {style:ROOTLET, phase:'recover', dx:33 * settle, dy:19 * settle, frame:age < 92 ? 4 : 5};
}

function rootletDrive(sinceContact, element) {
    const share = 1 + sinceContact / ROOTLET_DRIVE_MS;
    const push = share * share * (3 - 2 * share);
    return {style:ROOTLET, phase:'release', dx:-20 + 58 * push, dy:14 + 2 * push, share, element, frame:3};
}

function chorusActing(deps, enemy) {
    if (!(enemy.hp > 0) || enemy.noAttack) return null;
    const now = deps.getCombatTime();
    const cast = enemy.attackCast;
    if (cast) {
        const share = (now - cast.startAt) / Math.max(1, cast.finishAt - cast.startAt);
        return { ...windup(CHORUS, Math.max(0, Math.min(1, share))), element: enemy.ele, frame:share<.48?1:2 };
    }
    const pending = deps.pendingAttacks().find(attack => attack.source === enemy && attack.groundCell);
    if (!pending) return null;
    const age = now - pending.castStartAt;
    if (age >= 0 && age < 190) return burst(CHORUS, age / 190, 3, pending.groundElement);
    const share = Math.max(0, (pending.at - now) / Math.max(1, pending.at - pending.castStartAt));
    return { style: CHORUS, phase:'spent', dx:0, dy:0, share, element:pending.groundElement, frame:share>.4?3:4 };
}

export function chorusBloomOrigin(position, dot) {
    return {x:Math.round(position.x + CHORUS.x * dot),y:Math.round(position.y + CHORUS.y * dot)};
}

/** These two authored attacks get local acting. Other roster actors use their existing pose unchanged. */
export function stageActorCastActing(deps, enemy, actor) {
    if (actor.id === 'bossAct1') return rootletActing(deps, enemy);
    if (actor.id === 'act9-chorus-bulbs') return chorusActing(deps, enemy);
    return null;
}

/** A few pixels at the actual mouth or bud, inside the actor's facing transform. */
export function drawActorCastAccent(ctx, acting, position, dot, reduced) {
    if (acting.phase === 'recover') return;
    const scale = Math.max(1, Math.round(dot));
    const {style, share, phase} = acting;
    const x = Math.round(position.x + style.x * dot), y = Math.round(position.y + style.y * dot);
    if (style === CHORUS) return drawBudAfterglow(ctx,{x,y,scale,share},phase,reduced);
    const span = reduced ? 3 : phase === 'wind' ? 3 + Math.round(share * 2) : 5 + Math.round(share * 3);
    ctx.save();
    ctx.globalAlpha *= reduced ? .8 : phase === 'wind' ? .75 + share * .2 : .95 - share * .55;
    const light = ELEMENT[acting.element] || style.color;
    drawMouthSpark(ctx,{x,y,scale,span,light});
    ctx.restore();
}

function drawBudAfterglow(ctx,{x,y,scale:p,share},phase,reduced) {
    const released = phase === 'release', spent = phase === 'spent';
    const height = spent ? 8 : 10 + Math.floor(share * 4);
    const top = y - Math.floor(height * 0.66) * p;
    ctx.save();
    ctx.globalAlpha *= reduced ? .84 : 1;
    ctx.fillStyle = '#372137';
    ctx.fillRect(x - 5*p,top + 3*p,10*p,(height-3)*p);
    ctx.fillRect(x - 2*p,top,5*p,4*p);
    ctx.fillStyle = '#b773ae';
    ctx.fillRect(x - 3*p,top + 4*p,6*p,(height-5)*p);
    ctx.fillStyle = '#edbadc';
    ctx.fillRect(x - 2*p,top + (spent ? 5 : 2)*p,4*p,(spent ? 2 : height-4)*p);
    ctx.fillStyle = '#ffe9cd';
    ctx.fillRect(x - p,top + (spent ? 5 : 3)*p,(released ? 3 : 2)*p,(spent ? 1 : 4)*p);
    ctx.restore();
}

function drawMouthSpark(ctx,{x,y,scale,span,light}) {
    ctx.fillStyle = '#292123';
    ctx.fillRect(x - scale,y - 2 * scale,(span + 2) * scale,4 * scale);
    ctx.fillRect(x + scale,y - 5 * scale,4 * scale,3 * scale);
    ctx.fillStyle=light;
    ctx.fillRect(x,y - scale,span * scale,2 * scale);
    ctx.fillRect(x + 2 * scale,y - 4 * scale,2 * scale,scale);
}

