import { killResolveEnemyDeath, killGrantLoopStarterWeaponOnFirstKill, killTickTalentKillRuntime, killClearDotFxThrottleForEnemy } from '../combat/kill-state.mjs';
import { killTransferSkillDotOnDeath } from '../combat/kill-dot-transfer.mjs';
import { killCountKillForContent } from '../combat/kill-counters.mjs';
import { killGrantExpAndGem } from '../combat/kill-experience.mjs';
import { killRollRandomVoidRiftOnKill } from '../combat/rift-kill-state.mjs';
import { killApplyUniqueKillEffects, killGetOverkillSplash } from '../combat/kill-unique-effects.mjs';
import { killAdvanceColonyWaveOnKill } from '../combat/kill-colony-wave.mjs';
import { killFinishGrandBreachOnBossKill } from '../combat/kill-grand-breach.mjs';
import { killFlagHeavyUiAfterKill } from '../combat/kill-refresh.mjs';
import { coreExplodeCorpse } from '../combat/core-hit-results.mjs';
import { hitRecordKillProgress } from './kill-progression.mjs';
import { playerGrantEliteTraitOnKill } from './player-stat-events.mjs';

/** A monster's death, once: it leaves the field, the kill is counted, rewards are given, kill effects and content runs advance, and
 * monsters a kill effect brought to 0 die in turn. 2026-10-18 split into the steps below (it was one function of complexity 151);
 * the order of every random roll is kept. */
export function* killHandleEnemyDeath(env, enemy, pStats) {
    enemy = killResolveEnemyDeath(env, enemy);
    if (!enemy) return;
    env.deps.woodsmanStumps.clear(enemy);
    if (env.deps.woodsmanStumps.retireAdd(enemy)) return;
    // Rewards below change build inputs under one settlement memo revision: stats asked for until the end are not kept.
    env.deps.playerStatCache.beginEvent();
    retireKilledEnemy(env, enemy, pStats);
    (yield* killTransferSkillDotOnDeath(env, enemy));
    const zone = env.deps.getZone(env.owner.currentZoneId);
    (yield* killCountKillForContent(env, enemy, zone, pStats));
    (yield* killGrantLoopStarterWeaponOnFirstKill(env, enemy));
    killTickTalentKillRuntime(env, enemy);
    yield* announceKilledEnemy(env, enemy);
    yield* playerGrantEliteTraitOnKill(env, enemy, pStats);
    const gemLeveled = (yield* killGrantExpAndGem(env, enemy, pStats));
    const currencyDropVersionBefore = Math.max(0, Math.floor(env.owner.currencyDropVersion || 0));
    (yield { kind: 'grantEnemyLoot', args: [enemy] });
    hitRecordKillProgress(env, enemy);
    if(env.deps.actExplorationState.recordDeath(env.owner,enemy))env.deps.actExplorationProgress.objects.afterDeath(env.deps.actExplorationState.current(env.owner));
    env.deps.gainSkyRiftGaugeFromCombat(zone, enemy);
    env.deps.applyAilmentEffectsOnDeath(enemy, pStats);
    // The steps below log through say (addLog, passed from here): they stay free of the UI themselves.
    (yield* killRollRandomVoidRiftOnKill(env, enemy, zone));
    (yield* killExplodeCorpsesOnKill(env, enemy, pStats));
    killApplyUniqueKillEffects(env, pStats);
    yield* splashOverkill(env, enemy, pStats);
    clearKilledEnemyRuntime(env, enemy);
    advanceBeehiveAfterKill(env, zone);
    (yield* killAdvanceColonyWaveOnKill(env, zone, enemy));
    (yield* killFinishGrandBreachOnBossKill(env, enemy, zone));
    // 시체폭발/연쇄 피해 등으로 동시에 0 이하가 된 적은
    // 일반 타격 루프를 통하지 않으면 사망 처리(handleEnemyDeath)가 누락될 수 있다.
    // 누락 시 enemies 배열에 hp<=0 엔트리가 남아 100% 진행 후에도 클리어가 멈춘다.
    yield* settleRemainingDeaths(env, pStats);
    (yield* killFlagHeavyUiAfterKill(env, enemy, zone, gemLeveled, currencyDropVersionBefore));
    env.deps.playerStatCache.endEvent();
}

function retireKilledEnemy(env, enemy, pStats) {
    // Retire the victim before any reward or recursive corpse explosion can report it again.
    env.owner.enemies = env.owner.enemies.filter(entry => entry.id !== enemy.id);
    env.deps.combatSupports.retire(enemy);
    if (pStats && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.erosionLegacy) {
        const inherited = Math.floor(Math.max(0, Number(enemy.chaosErosionShred) || 0) * 0.5);
        if (inherited > 0) env.owner.passiveChaosErosionTransfer = inherited;
    }
}

function* announceKilledEnemy(env, enemy) {
    yield { kind: 'addBattleFx', args: ['enemyDeath', {
        enemyId: enemy.id, name: enemy.name, color: env.deps.getElementColor(enemy.ele),
        // Reviving bosses keep their standing fade until the story animation ends.
        duration: enemy.isBoss ? (env.deps.STAGE_STORY_ART.revives[enemy.bossAssetKey]?.total || 1600) : (enemy.isElite ? 500 : 340),
        boss: !!enemy.isBoss, elite: !!enemy.isElite
    }] };
}

function* splashOverkill(env, enemy, pStats) {
    const damage = killGetOverkillSplash(enemy, pStats);
    if (!(damage > 0)) return;
    const victims = env.owner.enemies || [], count = victims.length;
    for (let index = 0; index < count; index++) {
        if (!(index in victims)) continue;
        const target = victims[index];
        if (!target || target.id === enemy.id || target.hp <= 0) continue;
        env.deps.applyDamageToEnemyResource(target, damage);
        if (target.hp <= 0) yield { kind: 'settleDeath', args: [target, pStats] };
    }
}

function clearKilledEnemyRuntime(env, enemy) {
    if (env.owner.enemyWitherStacks && typeof env.owner.enemyWitherStacks === 'object') delete env.owner.enemyWitherStacks[enemy.id];
    killClearDotFxThrottleForEnemy(env, enemy.id);
}

function advanceBeehiveAfterKill(env, zone) {
    if (zone && zone.id === 'beehive_run' && env.owner.beehive && env.owner.beehive.inRun && env.deps.countBeehiveWaveAlive() === 0) {
        if (typeof env.deps.onBeehiveWaveCleared === 'function') env.deps.onBeehiveWaveCleared();
    }
}

function* settleRemainingDeaths(env, pStats) {
    const defeated = (env.owner.enemies || []).filter(entry => entry && entry.hp <= 0);
    for (const enemy of defeated) yield { kind: 'settleDeath', args: [enemy, pStats] };
}

/** Corpse explosions a kill may set off, each rolled in turn: rune corpses, 종말의 논리, 시체 역병. chain kills what a blast
 * brings to 0, log writes a blast's line. */
export function* killExplodeCorpsesOnKill(env, enemy,pStats) {
    (yield* killExplodeRuneCorpse(env, enemy,pStats));
    (yield* killExplodeUniqueCorpse(env, enemy,pStats));
    (yield* killExplodePlagueCorpse(env, enemy,pStats));
}

export function* killExplodeRuneCorpse(env, enemy,pStats) {
    if (!pStats || !((pStats.runeCorpseExplodeChance || 0) > 0) || Math.random() >= killCorpseExplosionChance(pStats.runeCorpseExplodeChance)) return;
    const splash = killCorpseExplosionSplash(enemy, pStats.runeCorpseExplodeLifePct);
    const line = yield* killSettleCorpseExplosion(env, enemy, splash, { label: '룬 시체 폭발', pStats });
    yield* killLogCorpseExplosion(env, line);
}

/** 종말의 논리: rolled whenever the unique is worn (even at 0%), as it always was. 대폭발(폭약술사 bm7, 2026-11-11): 점화된 채 쓰러진
 * 적은 굴림 없이 터진다. */
export function* killExplodeUniqueCorpse(env, enemy,pStats) {
    if (!pStats || !pStats.uniqueCorpseExplode) return;
    const ignited=env.deps.hasKeystone('bm7') && (enemy.ailments || []).some(row=>row && row.type==='ignite' && (row.time || 0)>0);
    if (!ignited && Math.random()>=killCorpseExplosionChance(pStats.uniqueCorpseExplode.chance)) return;
    const splash=killCorpseExplosionSplash(enemy,pStats.uniqueCorpseExplode.lifePct);
    const line=yield* killSettleCorpseExplosion(env, enemy, splash, { label: env.deps.hasKeystone('bm7')?'대폭발':'종말의 논리 시체 폭발', pStats });
    (yield { kind: 'addBattleFx', args: ['hit',{enemyId:enemy.id,color:'#c56cff',damage:splash,duration:360,element:'chaos',syncToSwing:true}] });
    (yield* killLogCorpseExplosion(env, line));
}

/** 시체 역병(워록 wlk9): 카오스 피해로 처치 시 50% 확률로 시체 폭발(적 최대 생명력의 20%를 주변에 카오스 피해). 심연 각인(wlk1)으로 모든
 * 피해가 카오스인 경우 처치 원소와 무관하게 카오스 처치로 간주. */
export function* killExplodePlagueCorpse(env, enemy,pStats) {
    if (!env.deps.hasKeystone('wlk9') || !(enemy.lastHitElement==='chaos' || env.deps.hasKeystone('wlk1')) || Math.random()>=0.5) return;
    const splash=Math.max(1,Math.floor((enemy.maxHp || enemy.hp || 0)*0.20));
    const line=yield* killSettleCorpseExplosion(env, enemy, splash, { label: '시체 역병', pStats, noun: '카오스 피해' });
    (yield { kind: 'addBattleFx', args: ['hit',{enemyId:enemy.id,color:'#9b59ff',damage:splash,duration:360,element:'chaos',syncToSwing:true}] });
    (yield* killLogCorpseExplosion(env, line));
}

export function killCorpseExplosionSplash(enemy, lifePct) { return Math.max(1, Math.floor((enemy.maxHp || 0) * (Math.max(0, Number(lifePct || 0)) / 100))); }

export function killCorpseExplosionChance(pct) { return Math.max(0, Math.min(1, Number(pct || 0) / 100)); }

export function* killSettleCorpseExplosion(env, enemy, splash, detail) {
    const { label, pStats, noun } = detail;
    const commands=coreExplodeCorpse(env,enemy,splash,{label,noun});
    let step=commands.next();
    while (!step.done) {
        const command=step.value;
        if (command.kind==='corpseDeath') {
            yield {kind:'settleDeath',args:[command.args[0],pStats]};
            step=commands.next();
        } else step=commands.next(yield command);
    }
    return step.value;
}

export function* killLogCorpseExplosion(env, line) {
    if (line && env.owner.settings.showCombatLog) (yield { kind: 'killSay', args: [line,'attack-player'] });
}
