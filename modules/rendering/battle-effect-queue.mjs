import { BATTLE_FX_QUEUE_CAP } from '../data/battle-feedback.mjs';
import { getBattleHitFeedback } from './battle-hit-feedback.mjs';

/** Owns cue ordering and expiry; CombatFeedbackRenderer alone advances the visual clock. */
export class BattleEffectQueue {
    constructor(deps, runtime) {
        this.deps = deps;
        this.runtime = runtime;
        this.onVisibility = () => this.setBattleFxSuppressed(!!this.deps.document.hidden);
        if (deps.document?.addEventListener) deps.document.addEventListener('visibilitychange', this.onVisibility);
    }

    dispose() {
        this.deps.document?.removeEventListener?.('visibilitychange', this.onVisibility);
    }

    hitFeedback(data) { return getBattleHitFeedback(this.deps.game.enemies, data); }

    enemyGhostKeepMs(ghost) {
        return ghost && ghost.enemy && ghost.enemy.isBoss
            ? (this.deps.STAGE_STORY_ART.revives[ghost.enemy.bossAssetKey]?.total || 1600) + 400 : 1200;
    }

    getBattleFxStart(type, data, now) {
        if (!data) return now;
        if (this.syncsToSwing(type, data) && this.pendingSwing(now)) {
            return this.runtime.latestSwingImpactAt;
        }
        if (['enemyDeath', 'lootPickup', 'lootCelebration'].includes(type) && data.enemyId) {
            let pendingHit = [...this.runtime.fx].reverse().find(fx => fx && fx.type === 'hit' && fx.enemyId === data.enemyId && fx.start >= now);
            if (pendingHit) return pendingHit.start;
        }
        return now;
    }

    syncsToSwing(type, data) {
        return type === 'levelUp' || (type === 'hit' && data.syncToSwing === true && !data.dot);
    }

    pendingSwing(now) {
        return this.runtime.latestSwingImpactAt >= now && this.runtime.latestSwingImpactAt - now <= 340;
    }

    mergePendingBattleHitFx(payload, now) {
        if (!payload.damageTextGroupId || payload.enemyId === undefined || payload.enemyId === null) return false;
        let liveEnemies = (this.deps.game.enemies || []).reduce((count, enemy) => count + (enemy && enemy.hp > 0 ? 1 : 0), 0);
        if (liveEnemies < 5) return false;
        let existing = [...this.runtime.fx].reverse().find(fx => this.samePendingHit(fx, payload, now));
        if (!existing) return false;
        this.combineHit(existing, payload);
        return true;
    }

    samePendingHit(fx, payload, now) {
        return fx && fx.type === 'hit'
            && fx.damageTextGroupId === payload.damageTextGroupId
            && fx.repeatIndex === payload.repeatIndex
            && fx.enemyId === payload.enemyId
            && String(fx.stageKind || '') === String(payload.stageKind || '')
            && now - (Number(fx.queuedAt) || 0) <= 180;
    }

    combineHit(existing, payload) {
        existing.damage = Math.max(0, Number(existing.damage) || 0) + Math.max(0, Number(payload.damage) || 0);
        existing.rawDamage = Math.max(0, Number(existing.rawDamage) || 0) + Math.max(0, Number(payload.rawDamage) || 0);
        existing.crit = !!(existing.crit || payload.crit);
        existing.duration = Math.max(Number(existing.duration) || 0, Number(payload.duration) || 0);
        Object.assign(existing, this.hitFeedback(existing));
    }

    getCurrentBattleFxQueueCap() {
        let liveEnemies = (this.deps.game.enemies || []).reduce((count, enemy) => count + (enemy && enemy.hp > 0 ? 1 : 0), 0);
        if (liveEnemies >= 8) return 80;
        if (liveEnemies >= 5) return 104;
        return BATTLE_FX_QUEUE_CAP;
    }

    withFrostErosionSprite(type, payload) {
        if (type !== 'combatTravel' || payload.skillName !== '빙결 침식') return payload;
        return { ...payload, spriteFrame: 7 + Math.floor(Math.random() * 5) };
    }

    getBattleSpawnStamp() {
        let visualNow = this.runtime.scene && Number(this.runtime.scene.visualNow);
        return Number.isFinite(visualNow) && visualNow > 0 ? visualNow : this.deps.performance.now();
    }

    clearBattleVisualBacklog() {
        this.runtime.fx = [];
        this.runtime.scene.lootEpoch = (this.runtime.scene.lootEpoch || 0) + 1;
        this.runtime.latestSwingImpactAt = 0;
        this.runtime.scene.projectiles = [];
        this.runtime.scene.damageTexts = [];
        this.runtime.scene.skillEffects = [];
        this.runtime.scene.skillPlayback = null;
        this.runtime.scene.processedFxIds = new Set();
        this.runtime.scene.hitStopRemainingMs = 0;
        this.runtime.scene.nextHitStopAt = 0;
        this.runtime.scene.enemyHitPulses.clear();
        this.runtime.scene.lastHitStopFxId = 0;
        this.runtime.scene.lastNow = 0;
        this.runtime.scene.visualNow = 0;
        this.runtime.scene.lastWallNow = 0;
        this.runtime.scene.frameTimeEma = 16.7;
        this.runtime.scene.vfxDensity = 1;
    }

    setBattleFxSuppressed(suppressed) {
        this.runtime.suppressed = !!suppressed;
        if (this.runtime.suppressed) this.clearBattleVisualBacklog();
    }

    getPlayerSwingTailMs() {
        if (this.runtime.swingTailMs === null) {
            const classes = typeof this.deps.STAGE_CHARACTERS === 'object' && this.deps.STAGE_CHARACTERS ? Object.values(this.deps.STAGE_CHARACTERS.classes) : [];
            const clips = classes.flatMap(entry => Object.values(entry.weapons)).flatMap(set => Object.values(set)).filter(clip => Array.isArray(clip.hit));
            this.runtime.swingTailMs = clips.reduce((longest, clip) => {
                const ms = Array.isArray(clip.ms) ? clip.ms : Array(clip.frames).fill(clip.ms);
                return Math.max(longest, ms.slice(1).reduce((sum, value) => sum + value, 0));
            }, 0);
        }
        return this.runtime.swingTailMs;
    }

    cleanupBattleFx(now) {
        this.runtime.fx = this.runtime.fx.filter(fx => now - fx.start <= fx.duration + (fx.tailMs || 0));
    }

    cleanupBattleVisualState(now) {
        this.runtime.scene.projectiles = (this.runtime.scene.projectiles || []).filter(projectile => now - projectile.start <= projectile.duration + 60);
        this.runtime.scene.skillEffects = (this.runtime.scene.skillEffects || []).filter(effect => {
            let elapsed = now - Number(effect && effect.startAt);
            let duration = Math.max(1, Number(effect && effect.duration) || 1);
            return Number.isFinite(elapsed) && elapsed >= -160 && elapsed <= duration + 80;
        });
        this.runtime.scene.damageTexts = (this.runtime.scene.damageTexts || []).filter(text => {
            let elapsed = now - Number(text && text.start);
            let duration = Number(text && text.duration);
            return Number.isFinite(elapsed) && Number.isFinite(duration) && elapsed >= -80 && elapsed <= duration;
        });
        Object.keys(this.runtime.scene.enemyGhostPos || {}).forEach(enemyId => {
            if (now - (this.runtime.scene.enemyGhostPos[enemyId].stamp || 0) > this.enemyGhostKeepMs(this.runtime.scene.enemyGhostPos[enemyId])) delete this.runtime.scene.enemyGhostPos[enemyId];
        });
        Object.keys(this.runtime.scene.enemySmoothPos || {}).forEach(enemyId => {
            // 유령 위치가 만료된(전장에서 사라진 지 오래된) 적의 보간 좌표도 함께 정리한다.
            if (!this.runtime.scene.enemyGhostPos || !this.runtime.scene.enemyGhostPos[enemyId]) delete this.runtime.scene.enemySmoothPos[enemyId];
        });
        if (!this.runtime.scene.processedFxIds) this.runtime.scene.processedFxIds = new Set();
        if (this.runtime.fx.length === 0) {
            this.runtime.scene.processedFxIds = new Set();
            return;
        }
        let activeFxIds = new Set((this.runtime.fx || []).map(fx => fx.id));
        if (this.runtime.scene.processedFxIds.size > activeFxIds.size * 2 + 64) {
            this.runtime.scene.processedFxIds = new Set([...this.runtime.scene.processedFxIds].filter(id => activeFxIds.has(id)));
        }
    }

    addBattleFx(type, data) {
        if (this.runtime.suppressed || this.deps.document?.hidden) return;
        let payload = data || {};
        let now = this.currentCueTime();
        if (type === 'playerSwing') payload = this.prepareSwing(payload, now);
        this.replaceBlizzardField(type, payload);
        payload = this.withFrostErosionSprite(type, payload);
        if (this.duplicateStatus(type, payload, now)) return;
        if (type === 'hit' && this.mergePendingBattleHitFx(payload, now)) return;
        this.appendCue(type, payload, now);
    }

    appendCue(type, payload, now) {
        let start = this.getBattleFxStart(type, payload, now);
        this.runtime.fx.push({
            id: ++this.runtime.fxId,
            type: type,
            start: start,
            queuedAt: now,
            duration: payload.duration || 260,
            ...this.hitFeedback(payload),
            ...payload
        });
        let queueCap = this.getCurrentBattleFxQueueCap();
        if (this.runtime.fx.length > queueCap) this.runtime.fx.splice(0, this.runtime.fx.length - queueCap);
    }

    currentCueTime() {
        let wallNow = this.deps.performance.now();
        return this.runtime.scene
            && Number.isFinite(this.runtime.scene.visualNow)
            && this.runtime.scene.visualNow > 0
            && wallNow - (this.runtime.scene.lastWallNow || 0) < 250
            ? this.runtime.scene.visualNow
            : wallNow;
    }

    prepareSwing(payload, now) {
        let requestedDelay = Number(payload.impactDelayMs);
        let delay = Number.isFinite(requestedDelay) ? Math.max(0, requestedDelay) : (payload.projectile ? 260 : 205);
        this.runtime.latestSwingImpactAt = now + delay;
        return { ...payload, impactAt: this.runtime.latestSwingImpactAt, motionVariantSeed: Math.random(), tailMs: this.getPlayerSwingTailMs() };
    }

    replaceBlizzardField(type, payload) {
        if (type === 'combatTravel' && payload.patternKind === 'field' && payload.skillName === '난타 눈보라') {
            this.runtime.fx = this.runtime.fx.filter(fx => !(fx && fx.type === type
                && fx.patternKind === payload.patternKind && fx.skillName === payload.skillName));
        }
    }

    duplicateStatus(type, payload, now) {
        if (type !== 'statusText' || !payload.dedupeKey) return false;
        let dedupeWindowMs = Math.max(0, Number(payload.dedupeWindowMs) || 900);
        return [...this.runtime.fx].reverse().some(fx => fx && fx.type === type
            && fx.dedupeKey === payload.dedupeKey && now - (Number(fx.queuedAt) || 0) <= dedupeWindowMs);
    }
}
