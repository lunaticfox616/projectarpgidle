import { castNoteNativeGemArrivalSwing } from './player-cast-effects.mjs';
import { CAST_MARKS } from './player-cast-controls.mjs';
import { castPerformPlayerAttack } from './player-attack-execution.mjs';
import { gainSoulShield } from '../domain/player-soul-shield.mjs';

export function* castApplySkillGemCommand(env, command,stats) {
    if (command.type==='pose') return yield* castNoteNativeGemArrivalSwing(env, command);
    if (command.type === 'bellToll') {
        if (!env.owner.isBackgroundCalculation) yield { kind: 'addBattleFx', args: ['bellToll', { duration: 180 }] };
        return;
    }
    if (command.type==='teleport') return yield* castTeleport(env, command);
    env.deps.actExplorationProgress.objects.area(command.splashCells);
    env.deps.actExplorationState.wake(env.owner,env.deps.getSplashDormantEnemies().filter(e=>command.targets.includes(e.id)));
    const targets=env.owner.enemies.filter(e=>e.hp>0 && command.targets.includes(e.id));
    if (CAST_MARKS[command.type]) return CAST_MARKS[command.type](env, command,targets);
    if (command.type==='dot') return yield* castApplySkillGemDot(env, command,targets);
    if (!targets.length) return;
    yield* castApplySkillGemContact(env, command,targets,stats);
}

/** 순간이동하는 룬(차원찢기, 향로구름, 강림)의 칸 옮기기. 닿는 칸이 막혔으면 옮기지 않는다. descend(강림): 무대의 주인공이 떠난 칸에서 화면 밖으로
 * 솟구쳤다가 닿는 칸으로 내리꽂힌다(modules/rendering/stage-rune-air.mjs). */
export function* castTeleport(env, command) {
    if (!env.deps.skillGemCasts.free(command.to,env.owner.enemies.filter(e=>e.hp>0))) return;
    env.deps.actExplorationMotion.cancel(env.owner.actExploration);
    Object.assign(env.owner.gridPlayer,command.to);
    const move={skillName:command.name,fromCell:command.from,toCell:command.to,instant:true,duration:180};
    if (command.descend) move.descend=command.descend;
    yield { kind: 'addBattleFx', args: ['playerMobility',move] };
    if (command.swing) yield* castNoteNativeGemArrivalSwing(env, command);
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

/** 영혼 흡수(97): 이번 타격으로 깎은 생명력과 보호막의 shieldPct%를 에너지 보호막으로(최대 생명력의 capLifePct%까지, lifeMs 동안). */
export function castGainSoulShield(env, command, targets, before) {
    const dealt = targets.reduce((sum, enemy, i) => sum + Math.max(0, before[i] - Math.max(0, enemy.hp) - (enemy.energyShield || 0)), 0);
    if (!(dealt > 0)) return;
    const stats = command.stats, rule = command.soul, baseCap = env.deps.combatResources.caps.shield(stats);
    const next = gainSoulShield({ gain: dealt * rule.shieldPct / 100, cap: Math.floor((stats.maxHp || 0) * rule.capLifePct / 100), lifeMs: rule.lifeMs,
        now: env.deps.getCombatTime(), baseCap, energyShield: env.owner.playerEnergyShield });
    env.soulShield = next.shield;
    env.owner.playerEnergyShield = Math.floor(next.energyShield);
}

/** 독사의 춤(94): 깎인 적에게 게임의 피해 상태이상을 반드시 건다. dots: [{ element 그 속성의 상태이상(물리 출혈, 카오스 중독), sourcePct 원천 피해(타격 기본 피해의 %),
 * seconds 길이(초) }]. 다시 맞으면 게임의 규칙대로 시간을 새로 채우고 센 쪽을 남긴다. */
export function castApplyContactDots(env, command, targets, before) {
    const stats = command.stats;
    targets.forEach((enemy, i) => {
        if (enemy.hp <= 0 || enemy.hp + (enemy.energyShield || 0) >= before[i]) return;
        for (const dot of command.dots) env.deps.applyEnemyAilmentFromHit(enemy, { ...stats, sSkill: { ...stats.sSkill, ele: dot.element } }, stats.baseDmg * dot.sourcePct / 100, false,
            { primaryAilmentChance: 1, damageAilmentSeconds: { [dot.type]: dot.seconds } });
        if (enemy.hp <= 0) env.deps.handleEnemyDeath(enemy, stats);
    });
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
    if (command.soul) castGainSoulShield(env, command, targets, before);
    if (command.dots) castApplyContactDots(env, command, targets, before);
    if (!command.ailment) return;
    targets.forEach((enemy,i)=>{
        if (enemy.hp<=0 || enemy.hp+(enemy.energyShield||0)>=before[i]) return;
        const ele=command.ailment==='poison'?'chaos':'phys';
        env.deps.applyEnemyAilmentFromHit(enemy,{...stats,sSkill:{...stats.sSkill,ele}},stats.baseDmg,false,{primaryAilmentChance:1});
        if (enemy.hp<=0) env.deps.handleEnemyDeath(enemy,stats); // 촉매 ct8 터뜨림이 쓰러뜨린 적(타격의 죽음 처리는 이미 지났다)
    });
}
