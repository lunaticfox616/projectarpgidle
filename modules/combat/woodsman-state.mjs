

export function woodOwns(env, enemy) { return !!enemy?.isWoodsman && !enemy.noAttack && env.owner.currentZoneId === env.deps.OUTSIDE_CHAOS_ZONE_ID; }

export function woodPhase(env, enemy) { return env.deps.getWoodsmanPhaseProgress(enemy); }

export function woodElement(env, enemy) { return env.deps.WOODSMAN_BATTLE.elements[Math.floor(woodPhase(env, enemy) / .05) % 5]; }

/** The boss remains owned by pack.waiting until this combat-clock introduction ends.
     * Views may show the body and its existing story line; target selection/HP HUD only see active enemies. */
    export function woodIntroduction(env) {
        if (env.owner.currentZoneId !== env.deps.OUTSIDE_CHAOS_ZONE_ID) return null;
        const run = env.deps.actExplorationState.current(env.owner), entrance = env.deps.actExplorationState.entrance(run);
        if (!entrance) return null;
        const enemy = run.packs.find(pack => pack.key === entrance.key)?.waiting.find((arg0) => woodOwns(env, arg0));
        return enemy ? { enemy, elapsedMs: Math.max(0, run.motionTimeMs - entrance.at) } : null;
    }

export function woodPreview(env, enemy) {
        const n = Math.max(0, Math.floor(enemy.patternAttackCount || 0));
        const area = enemy.patternArea?.woodsman, kept = area?.attackNumber === n + 1 ? area : null;
        const row = woodInstallationDue(enemy, kept) ? env.deps.WOODSMAN_BATTLE.stumpPattern : woodChoosePattern(env, enemy, n, kept);
        const cover = row.id.startsWith('cover-');
        return { mode: 'woodsman', patternMode: 'woodsman', attackNumber: n + 1,
            label: env.deps._t(row.name), isSpecial: true, damageMul: cover ? 1.7 : 1.15, telegraphKind: 'woodsman',
            warningMs: cover ? 2600 : env.deps.WOODSMAN_BATTLE.motions[row.motion].release,
            attackElement: kept?.element || woodElement(env, enemy), woodsmanType: row.id, motion: row.motion, recoveryMs: 900 };
    }

export function woodInstallationDue(enemy, kept) {
        return kept?.type === 'stump' || !enemy.woodsmanStumpsPlaced && (enemy.woodsmanStumpsDue || enemy.hp <= enemy.maxHp * .6);
    }

export function woodChoosePattern(env, enemy, n, kept) {
        if (kept) return [...env.deps.WOODSMAN_BATTLE.patterns, ...env.deps.WOODSMAN_BATTLE.coverPatterns].find(row => row.id === kept.type);
        const grounded = enemy.woodsmanStumps?.some(row => row.phase === 'idle');
        if (grounded && n % 2) return env.deps.WOODSMAN_BATTLE.coverPatterns[Math.floor(n / 2) % 3];
        return env.deps.WOODSMAN_BATTLE.patterns[(grounded ? Math.floor(n / 2) : n) % 6];
    }

export function woodCurrent(env, enemy) {
        if (!woodOwns(env, enemy) || enemy.hp <= 0) return null;
        if (enemy.patternTelegraphKey && enemy.patternArea?.woodsman) return enemy.patternArea.woodsman;
        const live = env.deps.bossMoves.live(env.deps.getCombatTime()).find(row => row.source === enemy && row.move.kind === 'woodsman' && !row.move.cutAt);
        return live ? { ...live.move.cast, releasedAt: live.move.releasedAt } : null;
    }
