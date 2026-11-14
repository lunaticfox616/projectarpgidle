import { killEnterAutomaticMapInterruptionAfterClear } from './clear-interruption.mjs';
import { clearGrantSeasonBossRewards } from '../combat/pinnacle-payouts.mjs';

export function* clearFinishSeasonBossEncounter(env, zone) {
    let firstRootBossClear = !(env.owner.clearedRootBosses || []).includes(zone.id);
    env.owner.clearedRootBosses = Array.isArray(env.owner.clearedRootBosses) ? env.owner.clearedRootBosses : [];
    if (firstRootBossClear) env.owner.clearedRootBosses.push(zone.id);
    if (zone.rivalBlade) (yield* clearNoteRivalBladeKill(env, zone, firstRootBossClear));
    (yield* clearGrantSeasonBossRewards(env, zone, firstRootBossClear));
    (yield { kind: 'finishSay', args: [env.deps._t('🗝️ [{name}] 토벌 완료!', { name: env.deps._t(zone.name) }), 'loot-unique'] });
    (yield* clearDepartSeasonBoss(env, zone));
    (yield { kind: 'finishUnlocks', args: [] });
    (yield { kind: 'finishRedraw', args: [] });
    (yield { kind: 'queueImportantSave', args: [200] });
}

export function* clearNoteRivalBladeKill(env, zone, firstRootBossClear) {
    env.deps.markLoopSpecialBossKill(zone.id);
    if (zone.journalId && firstRootBossClear && typeof env.deps.unlockJournalEntry === 'function') env.deps.unlockJournalEntry(zone.journalId);
    if (zone.capstoneRival) return (yield { kind: 'finishSay', args: [env.deps._t('🗡️ 완성작이 무릎 꿇었습니다. 버려진 날이 벼려진 날을 이겼습니다.'), 'loot-unique'] });
    let killedRivals = (env.owner.loopProgressCurrent && Array.isArray(env.owner.loopProgressCurrent.specialBosses)) ? env.owner.loopProgressCurrent.specialBosses : [];
    let remaining = env.deps.SEASON_BOSS_ZONES.filter(rival => rival.rivalBlade && !rival.capstoneRival && !killedRivals.includes(rival.id)).length;
    if (remaining > 0) (yield { kind: 'finishSay', args: [env.deps._t('🗡️ 버려진 날 격파! 이번 루프에 남은 날: {remaining}개 (모두 꺾으면 「완성작」이 나타납니다)', { remaining }), 'season-up'] });
    else (yield { kind: 'finishSay', args: [env.deps._t('🗡️ 다섯 날이 모두 꺾였습니다. 「일곱 번째 날 - 완성작」이 결투를 기다립니다.'), 'loot-unique'] });
}

/** After a root boss: with repeat on and a key left, spend it and fight again; else back to the auto progress zone. */
export function* clearDepartSeasonBoss(env, zone) {
    let shouldRepeat = !!env.owner.autoRepeatSeasonBoss && !zone.milestonePinnacle;
    let keyLeft = zone.key ? env.owner.currencies[zone.key] || 0 : 0;
    if (shouldRepeat && keyLeft > 0) {
        env.owner.currencies[zone.key]--;
        env.owner.currentZoneId = zone.id;
        env.owner.killsInZone = 0;
        env.owner.inTicketBossFight = true;
        (yield { kind: 'finishSay', args: [env.deps._t('🔁 입장권 1개 소모, [{name}] 자동 재도전 시작! (남은 열쇠 {value})', { name: env.deps._t(zone.name), value: env.owner.currencies[zone.key] || 0 }), 'season-up'] });
        env.deps.startMoving(true);
        return;
    }
    if (shouldRepeat && keyLeft <= 0) (yield { kind: 'finishSay', args: [env.deps._t('🔁 반복 도전이 켜져 있지만 입장권이 없어 자동 재도전을 중단합니다.'), 'attack-monster'] });
    env.owner.currentZoneId = env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    env.owner.killsInZone = 0;
    env.owner.inTicketBossFight = false;
    yield* killEnterAutomaticMapInterruptionAfterClear(env, zone);
    env.deps.startMoving(false);
}
