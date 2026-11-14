import { gemSupportShots, gemChainsOf, gemNoteLeadContact } from './gem-cast-math.mjs';
import { gemContact } from './gem-cast-common.mjs';

export function gemThrowExtraFlasks(env, state,input,first,{ target, others }) {
    const plain=first.id===44?0:gemSupportShots(env, first),bonus=first.id===49?0:env.deps.rollProjectileExtraShots(first.stats.projectileExtraShots);
    const order=[target,...others.slice().sort((a,b)=>env.deps.getGridUnitDistance(first.source,a)-env.deps.getGridUnitDistance(first.source,b))];
    for(let shot=1;shot<=plain+bonus;shot++) {
        const foe=order[shot%order.length],at=first.at+env.deps.projectileShots.gapOf(shot,order.length,true);
        const mul=(first.attackOptions?.attackDamageMultiplier??1)*(shot>plain?env.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT/100:1);
        const cast={...first,at,attackOptions:{...first.attackOptions,attackDamageMultiplier:mul},
            aim:env.deps.getGridUnitCenter(foe),targetId:first.id===44?null:foe.id,firstFoe:foe,key:'gem-'+(++state.sequence),nextAt:at,struck:undefined};
        env.registry.launch[first.id](state,cast,input.enemies);
        state.casts.push(cast);
    }
}

export function gemChainContacts(env, c,rows,enemies) {
    const chains=c.id===44?0:gemChainsOf(c),hit=rows.find(row=>row.type==='hit' && row.targets.length);
    gemNoteLeadContact(c,hit);
    if(!chains || !hit)return rows;
    const struck=new Set(rows.flatMap(row=>row.targets||[]));
    let from=enemies.find(enemy=>enemy.id===hit.targets[0]);
    const chained=[];
    while(from && chained.length<chains) {
        const near=enemies.filter(e=>e.hp>0 && !struck.has(e.id) && env.deps.getGridUnitDistance(from,e)<=env.deps.COMBAT_GRID_CONFIG.chainJumpRange);
        from=near.length?env.deps.findNearestGridEnemy(from,near):null;
        if(from){struck.add(from.id);chained.push(from);}
    }
    return chained.length?[...rows,gemContact(env, c,chained,hit.at,{damagePct:env.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT,key:hit.key+':chain'})]:rows;
}
