import { castNoteNativeGemArrivalSwing } from './player-cast-effects.mjs';
import { CAST_MARKS } from './player-cast-controls.mjs';
import { castPerformPlayerAttack } from './player-attack-execution.mjs';

export function* castApplySkillGemCommand(env, command,stats) {
    if (command.type==='pose') return yield* castNoteNativeGemArrivalSwing(env, command);
    if (command.type === 'bellToll') {
        if (!env.owner.isBackgroundCalculation) yield { kind: 'addBattleFx', args: ['bellToll', { duration: 180 }] };
        return;
    }
    if (command.type==='teleport') {
        if (!env.deps.skillGemCasts.free(command.to,env.owner.enemies.filter(e=>e.hp>0))) return;
        env.deps.actExplorationMotion.cancel(env.owner.actExploration);
        Object.assign(env.owner.gridPlayer,command.to);
        yield { kind: 'addBattleFx', args: ['playerMobility',{skillName:command.name,fromCell:command.from,toCell:command.to,instant:true,duration:180}] };
        if (command.swing) yield* castNoteNativeGemArrivalSwing(env, command);
        return;
    }
    env.deps.actExplorationProgress.objects.area(command.splashCells);
    env.deps.actExplorationState.wake(env.owner,env.deps.getSplashDormantEnemies().filter(e=>command.targets.includes(e.id)));
    const targets=env.owner.enemies.filter(e=>e.hp>0 && command.targets.includes(e.id));
    if (CAST_MARKS[command.type]) return CAST_MARKS[command.type](env, command,targets);
    if (command.type==='dot') return yield* castApplySkillGemDot(env, command,targets);
    if (!targets.length) return;
    yield* castApplySkillGemContact(env, command,targets,stats);
}

export function* castApplySkillGemDot(env, command,targets) {
    for (const enemy of targets) {
        const stats=command.stats,mitigation=env.deps.getEffectiveEnemyMitigation('chaos',env.deps.getZone(env.owner.currentZoneId).tier,enemy,stats);
        const attackMultiplier=command.attackOptions?.attackDamageMultiplier ?? 1;
        const damage=env.deps.applyDamageToEnemyResource(enemy,Math.floor(Math.max(1,Math.floor(stats.baseDmg*stats.dotDamageScale*attackMultiplier*(1-mitigation/100)))*env.deps.loopMutation.takenMul(enemy,'chaos')));
        yield { kind: 'addBattleFx', args: ['hit',{enemyId:enemy.id,damage,element:'chaos',color:env.deps.getElementColor('chaos'),duration:240,
            noLine:true,dot:true,resolvedSkillContact:true}] };
        if (enemy.hp<=0) env.deps.handleEnemyDeath(enemy,stats);
    }
}

export function* castApplySkillGemContact(env, command,targets) {
    const stats=command.stats;
    const before=targets.map(e=>e.hp+(e.energyShield||0));
    yield* castPerformPlayerAttack(env, {...stats,projectileExtraShots:0},{...command.attackOptions,stageReplay:true,skillName:command.name,
        sourceCell:command.sourceCell,targetEntries:targets.map(e=>({enemyId:e.id,mult:1})),stageRepeatOnce:true,
        restrictRandomTargets:true,skipSlamEcho:true,skipGridControl:true,
        hitDamageMultiplier:(command.bonus?env.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT/100:1)*(command.damagePct??100)/100,damageTextGroupId:command.key});
    env.deps.supports.repeatNative(command, targets);
    env.deps.supports.augmentNative(command, targets);
    if (!command.ailment) return;
    targets.forEach((enemy,i)=>{
        if (enemy.hp<=0 || enemy.hp+(enemy.energyShield||0)>=before[i]) return;
        const ele=command.ailment==='poison'?'chaos':'phys';
        env.deps.applyEnemyAilmentFromHit(enemy,{...stats,sSkill:{...stats.sSkill,ele}},stats.baseDmg,false,{primaryAilmentChance:1});
        if (enemy.hp<=0) env.deps.handleEnemyDeath(enemy,stats); // 촉매 ct8 터뜨림이 쓰러뜨린 적(타격의 죽음 처리는 이미 지났다)
    });
}
