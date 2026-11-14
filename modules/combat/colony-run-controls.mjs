import { runGetColonyRoomRun, runCountColonyWaveAlive } from './colony-wave-rooms.mjs';

export function runColonyNextBossWave(colony) { return Math.ceil(Math.max(1, colony.wave) / 5) * 5; }

export function runColonyReturnWave(colony) { return colony.lootPending ? Math.max(5, colony.wave - 1) : runColonyNextBossWave(colony); }

export function runColonyUncollected(env) {
        const run = runGetColonyRoomRun(env);
        return { held: env.owner.colony.pendingLoot.length, floor: run ? run.groundLoot.length : 0 };
    }

export function* runColonyToggleReturn(env) {
        const colony = env.owner.colony;
        if (!colony.inRun || env.owner.currentZoneId !== 'colony_run') return false;
        colony.returnAfterWave = colony.returnAfterWave ? 0 : runColonyReturnWave(colony);
        (yield { kind: 'queueImportantSave', args: [200] });
        return true;
    }

export function runColonyRecordEnd(env, kind) {
        const colony = env.owner.colony;
        if (!colony.inRun || !['withdraw', 'scheduled', 'left', 'core', 'defeat'].includes(kind)) return null;
        colony.lastResult = { kind, wave: colony.wave, completed: Math.max(0, colony.wave - 1), lostHeld: colony.pendingLoot.length };
        colony.returnAfterWave = 0;
        return colony.lastResult;
    }

export function runColonyEndLine(env, kind, result) {
        if (kind === 'left') return '🪲 군락지를 떠났습니다.';
        return result.completed ? env.deps._t('🪲 군락지 {completed}웨이브를 마치고 철수했습니다.', { completed: result.completed }) : '🪲 군락지에서 철수했습니다.';
    }

export function* runColonyFinish(env, kind = 'withdraw', move = true) {
        const colony = env.owner.colony;
        if (move && env.owner.currentZoneId !== 'colony_run') return false;
        const result = runColonyRecordEnd(env, kind);
        if (!result) return false;
        const returnZone = colony.returnZoneId ?? env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
        // Won floor loot is settled by this existing owner; the unreleased buffer is forfeited.
        env.deps.actExplorationState.groundLoot.discardEncounter(env.owner, 'colony_run');
        Object.assign(colony, { inRun: false, lootPending: false, bossLootCell: null, returnZoneId: null });
        if (move) {
            env.owner.currentZoneId = returnZone;
            env.owner.enemies = []; env.owner.encounterPlan = []; env.owner.encounterIndex = 0; env.owner.runProgress = 0;
            env.deps.actExplorationProgress.depart(env.owner);
        }
        (yield { kind: 'colonyLog', args: [runColonyEndLine(env, kind, result), 'season-up'] });
        (yield { kind: 'requestHeavyUiRefresh', args: [] });
        (yield { kind: 'queueImportantSave', args: [200] });
        return true;
    }

export function* runColonyFinishScheduled(env, run) {
        const colony = env.owner.colony;
        if (!colony.inRun || !colony.returnAfterWave || colony.wave <= colony.returnAfterWave || colony.lootPending) return false;
        const floor = run ? run.groundLoot.length : 0;
        if (colony.pendingLoot.length || floor || runCountColonyWaveAlive(env)) return false;
        return yield* runColonyFinish(env, 'scheduled');
    }
