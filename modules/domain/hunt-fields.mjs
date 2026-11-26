import { huntTraits } from '../data/hunt-traits.mjs';

// Offsets are shared by the simulation and the floor renderer. 침식 고리 is a round ring two cells out by straight-line distance, with a
// safe core (2026-11-26 사용자: 진짜 고리 형태로 지속 피해).
const patterns = {
    ring:(x,y) => { const d=Math.hypot(x,y); return d>=1.5 && d<2.5; },
    lava:(x,y) => x === 0 && y === 0,
    cold:(x,y) => Math.max(Math.abs(x),Math.abs(y)) === 2,
    light:(x,y) => x === 0 || y === 0,
    chaos:(x,y) => Math.abs(x) === Math.abs(y),
    fire:(x,y) => Math.abs(x)+Math.abs(y) <= 2,
    phys:(x,y) => Math.max(Math.abs(x),Math.abs(y)) <= 1
};
const elements = new Set(['cold','light','chaos','fire','phys']);
export const huntFieldLimit = 16;
export const huntShapes = /* @__PURE__ */ (()=>Object.fromEntries(Object.entries(patterns).map(([key,test]) => {
    const points=[];
    for (let y=-2;y<=2;y++) for (let x=-2;x<=2;x++) if (test(x,y)) points.push([x,y]);
    return [key,points];
})))();

function store(owner,field) {
    const room=owner.actExploration || owner.gridPlayer;
    if (!Array.isArray(room.huntFields)) room.huntFields=[];
    const fields=room.huntFields;
    if (fields.length>=huntFieldLimit) fields.splice(0,fields.length-huntFieldLimit+1);
    fields.push({...field,zone:owner.currentZoneId});
}

export function onHuntDeath(owner,enemy,now) {
    if (!Array.isArray(enemy.huntTraits)) return;
    if (enemy.huntPartner != null) {
        const other=claimPartner(owner,enemy);
        if (other) other.hp=0;
    }
    if (enemy.huntTraits.includes('nova')) {
        const shape=elements.has(enemy.ele) ? enemy.ele : 'phys';
        store(owner,{kind:'nova',shape,element:shape,gx:enemy.gx,gy:enemy.gy,start:now,at:now+1100,end:now+1450,level:enemy.level});
    }
}

function claimPartner(owner,enemy) {
    const paired=row=>row.id===enemy.huntPartner && row.huntPartner===enemy.id;
    const live=owner.enemies.find(paired);
    if (live) return live;
    const pack=owner.actExploration?.packs.find(row=>row.key===enemy.explorationPack);
    const index=pack?.waiting.findIndex(paired) ?? -1;
    if (index<0) return null;
    const [other]=pack.waiting.splice(index,1);
    owner.enemies.push(other);
    return other;
}

export function reflectHuntHit(owner,enemy,dealt,now) {
    if (!(dealt>0) || !enemy.huntTraits?.includes('thorns') || now<enemy.huntReflectAt) return;
    enemy.huntReflectAt=now+250;
    store(owner,{kind:'thorns',element:'phys',at:now,end:now+300,level:enemy.level});
}

function seedLivingFields(owner,enemy,now) {
    if (enemy.huntTraits.includes('lava') && !(now<enemy.huntLavaAt)) {
        enemy.huntLavaAt=now+2300;
        store(owner,{kind:'lava',shape:'lava',element:'fire',gx:enemy.gx,gy:enemy.gy,start:now,at:now+650,end:now+3400,level:enemy.level});
    }
}

/** 침식 고리 corrodes over time: a small hit every RING_TICK_MS while the hero stands in the ring, the same damage per second as the old
 * single hit (850 ms, so every 900 ms on the 100 ms combat step). One persistent hazard row per bearer, kept out of the save, sums the log lines. */
export const RING_TICK_MS = 300;
const ringHazards = new WeakMap();
function ringHazard(enemy) {
    let row=ringHazards.get(enemy);
    if (!row) { row={kind:'ring',element:'chaos',persistent:true,scale:RING_TICK_MS/900}; ringHazards.set(enemy,row); }
    row.level=enemy.level;
    return row;
}

function tickLiving(owner,enemy,now,hit) {
    if (enemy.hp<=0 || !Array.isArray(enemy.huntTraits)) return;
    seedLivingFields(owner,enemy,now);
    if (!enemy.huntTraits.includes('ring')) return;
    if (enemy.huntRingAt == null) enemy.huntRingAt=now+800;
    if (now<enemy.huntRingAt) return;
    enemy.huntRingAt=now+RING_TICK_MS;
    if (patterns.ring(owner.gridPlayer.gx-enemy.gx,owner.gridPlayer.gy-enemy.gy)) hit(ringHazard(enemy));
}

/** Whether the hero stands in this bearer's ring now (the painter shows the corrosion on them). */
export const inHuntRing = (enemy,cell) => !!cell && patterns.ring(cell.gx-enemy.gx,cell.gy-enemy.gy);

function tickField(owner,f,now,hit) {
    if (f.spent || now<f.at) return;
    if (f.kind==='lava') f.at=now+750;
    else f.spent=true;
    if (f.kind==='thorns' || patterns[f.shape](owner.gridPlayer.gx-f.gx,owner.gridPlayer.gy-f.gy)) hit(f);
}

export function advanceHuntFields(owner,now,hit) {
    const room=owner.actExploration || owner.gridPlayer;
    if (!room) return;
    if (owner.season>=19) for (const enemy of owner.enemies) tickLiving(owner,enemy,now,hit);
    const fields=room.huntFields;
    if (!Array.isArray(fields)) return;
    if (fields.length>huntFieldLimit) fields.splice(0,fields.length-huntFieldLimit);
    for (let i=0;i<fields.length;) {
        const f=fields[i];
        if (!validField(owner,f,now)) {fields.splice(i,1);continue;}
        tickField(owner,f,now,hit);
        i++;
    }
}

function validField(owner,f,now) {
    if (!f || f.zone!==owner.currentZoneId || now>f.end) return false;
    if (![f.at,f.end,f.level].every(Number.isFinite)) return false;
    if (f.kind==='thorns') return f.element==='phys';
    return validHuntShape(f);
}

export function validHuntShape(f) {
    if (![f.gx,f.gy,f.start].every(Number.isFinite)) return false;
    if (f.kind==='lava') return f.shape==='lava' && f.element==='fire';
    return f.kind==='nova' && elements.has(f.shape) && f.shape===f.element;
}

export function huntFieldDamage(field,stats) {
    const raw=(field.kind==='thorns' ? 2+Math.floor(field.level*0.18) : (7+field.level*1.4)*(field.kind==='nova'?2.7:1))*(field.scale ?? 1);
    const resist={cold:'resC',fire:'resF',light:'resL',chaos:'resChaos',phys:'dr'}[field.element];
    return Math.max(1,Math.floor(raw*(1-Math.min(85,Number(stats[resist]) || 0)/100)));
}

export const huntFieldName = kind => huntTraits[kind].name;
