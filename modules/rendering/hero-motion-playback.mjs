import { clampNumber } from '../common/numbers.mjs';
import { HERO_MOTIONS, SKILL_CONFIG } from '../data/hero-motion-layout.mjs';

/** Generic fallback atlas playback; authored world-tree effects keep their separate animation. */
export class HeroMotionPlayback {
    constructor(deps, runtime) { this.deps = deps; this.runtime = runtime; }

    getSkillPlaybackState(now) {
        let playback = this.runtime.scene.skillPlayback;
        if (!playback) return null;
        if (now > playback.endAt) {
            this.runtime.scene.skillPlayback = null;
            return null;
        }
        let skillCfg = SKILL_CONFIG[playback.skillId];
        if (!skillCfg) return null;
        let motionFrames = HERO_MOTIONS[skillCfg.motion] || HERO_MOTIONS.idle;
        let frameCount = motionFrames.length;
        let progress = clampNumber((now - playback.startAt) / Math.max(1, playback.duration), 0, 0.999);
        let frameLocalIndex = clampNumber(Math.floor(progress * frameCount), 0, frameCount - 1);
        return { ...playback, skillCfg, frameLocalIndex, frameIndex: motionFrames[frameLocalIndex], progress };
    }

    playSkill(skillId) {
        let normalized = Number(skillId);
        if (!SKILL_CONFIG[normalized]) return false;
        let now = this.deps.performance.now();
        let skillCfg = SKILL_CONFIG[normalized];
        let motionFrames = HERO_MOTIONS[skillCfg.motion] || HERO_MOTIONS.idle;
        let duration = Math.max(560, motionFrames.length * 220);
        this.runtime.scene.skillPlayback = {
            skillId: normalized,
            startAt: now,
            endAt: now + duration,
            duration: duration
        };
        return true;
    }

    mapSkillSlotByGemTags(skillName) {
        let tags = ((this.deps.SKILL_DB[skillName] && this.deps.SKILL_DB[skillName].tags) || []).map(tag => String(tag).toLowerCase());
        if (tags.includes('projectile')) {
            if (tags.includes('chaos')) return 8;
            if (['elemental', 'light', 'lightning', 'thunder', 'cold', 'fire'].some(tag => tags.includes(tag))) return 6;
            return 4;
        }
        if (tags.includes('slam')) return 2;
        if (tags.includes('aoe')) return 7;
        if (tags.includes('chain')) return 6;
        return 1;
    }

    playSkillFromActiveGem(skillName) {
        // World-tree gems draw their own art (the movement gems of the 이동 스킬 slot swing without the generic effect).
        if (this.deps.SKILL_GEM_VFX_PROFILES[skillName]?.family === 'worldTree') return false;
        return this.playSkill(this.mapSkillSlotByGemTags(skillName));
    }
}
