// The silhouette and cadence of each family's released attack. Every strike stays in the previewed area.
const families = {
    forge:['pyre','hymn','blackSun','cinderRain','ashTide'],
    antler:['gnaw','tendril','hunger','prune','graft','thornLash','saplingRush','rootSnare'],
    loom:['weave','echo','memory','rift','amberSeal','vault','sapBurst'],
    comet:['sting','starfall','verdict','decay','swarm','compost','witherBloom']
};
const byMechanic=/* @__PURE__ */ (()=>Object.fromEntries(Object.entries(families).flatMap(([family,ids])=>ids.map(id=>[id,family]))))();
const repeated={rift:['beam','split'],sting:['fan','lane'],vault:['pulse','wave'],starfall:['ring','pulse']};
const firstHit={forge:520,antler:380,loom:660,comet:510};
// Locked areas are replaced on each new cast. Preview and release read the same ordered cells.
const castStages=new WeakMap();

export function signaturePreview(enemy,plan) {
    if (!plan?.isSpecial || !byMechanic[enemy.apexMechanic]) return plan;
    const phase=enemy.atlasPhase || 0;
    const shapes=repeated[enemy.apexMechanic];
    return {...plan,signature:byMechanic[enemy.apexMechanic],phase,
        telegraphKind:shapes ? shapes[phase%shapes.length] : plan.telegraphKind,
        warningMs:Math.max(plan.warningMs,950),recoveryMs:Math.max(plan.recoveryMs,480)};
}

export const signatureFirstHit = family => firstHit[family];

function distances(source,area,family) {
    const centre=area.center || area.cells[Math.floor(area.cells.length/2)] || source;
    const score={
        forge:cell=>Math.hypot(cell.gx-source.gx,cell.gy-source.gy),
        antler:cell=>-Math.abs(cell.gx-centre.gx),
        loom:cell=>-Math.hypot(cell.gx-centre.gx,cell.gy-centre.gy),
        comet:cell=>cell.gy*3+cell.gx
    }[family];
    return area.cells.map(cell=>({cell,dist:score(cell)})).sort((a,b)=>a.dist-b.dist);
}

export function signatureStages(area,plan,enemy) {
    const cached=castStages.get(area);
    if (cached) return cached;
    const family=plan.signature,ranked=distances(area.source || enemy,area,family);
    if (!ranked.length) return [];
    const groups=Math.min(ranked.length,2+Math.min(1,plan.phase));
    const stages=Array.from({length:groups},(_,i)=>({ms:firstHit[family]+i*330,
        cells:ranked.slice(Math.floor(i*ranked.length/groups),Math.floor((i+1)*ranked.length/groups)).map(row=>row.cell)}));
    // The final form draws the attack back along its outward path, leaving time to cross the first wave.
    if (plan.phase>=2) stages.push(...stages.slice().reverse().map((s,i)=>({ms:stages.at(-1).ms+600+i*260,cells:s.cells,share:0.55})));
    castStages.set(area,stages);
    return stages;
}

export function planSignature(plan,enemy) {
    const family=plan.signature,source={gx:enemy.gx,gy:enemy.gy},stages=signatureStages(plan.area,plan,enemy);
    if (!stages.length) return null;
    plan.move={kind:'signature',family,phase:plan.phase,source,stages,next:0,spent:[],hits:[],releasedAt:0};
    return plan.move;
}
