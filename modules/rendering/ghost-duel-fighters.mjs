import { COLOURS, RANGED, FALLBACK_REGION } from '../data/ghost-duel-stage.mjs';

export class GhostDuelFighters {
    constructor(deps) {
        this.deps = deps;
    }

    /** 고스트 기록의 영웅 번호 → 직업(data/passives.js PLAYER_CLASS_DEFS의 recommendedTalentHeroId는 직업마다 다르다). */
    classOfHero(heroId) {
        const found = Object.keys(this.deps.PLAYER_CLASS_DEFS).find(id => this.deps.PLAYER_CLASS_DEFS[id].recommendedTalentHeroId === heroId);
        return found && this.deps.STAGE_CHARACTERS.classes[found] ? found : 'wanderer';
    }

    /** 그 직업의 시작 무기 자세(data/hana-weapon-combos.js classWeapons → data/skills.js SKILL_RUNE_STANCE_BY_CATEGORY). */
    startStance(classId) {
        return this.deps.SKILL_RUNE_STANCE_BY_CATEGORY[this.deps.HANA_WEAPON_COMBOS.classWeapons[classId]] || 'unarmed';
    }

    /** 내 쪽: 지금 무대에 선 주인공과 같은 직업과 자세. */
    ownLook() {
        const classId = (0, this.deps.getHeroAppearanceId)();
        return this.deps.STAGE_CHARACTERS.classes[classId] ? { classId, stance: (0, this.deps.getStageHeroStance)() } : null;
    }

    /** 기록에 적힌 직업과 자세(js/ghost-combat.js getGhostCombatMotion). 없거나 모르는 값이면 영웅 번호의 직업과 그 직업의 시작 무기. */
    lookOfSnapshot(snap) {
        const classId = this.deps.STAGE_CHARACTERS.classes[snap.classId] ? snap.classId : this.classOfHero(snap.heroId);
        return { classId, stance: this.deps.STAGE_VIEW.stances.includes(snap.stance) ? snap.stance : this.startStance(classId) };
    }

    /** 그 룬의 휘두름: 룬의 동작이 그 자세에 있으면 그것, 없으면 그 자세의 기본 공격이나 시전. */
    strikeClip(set, motion) {
        return (motion && set[motion]) || set.attack || set.cast || set.throw || set.idle;
    }

    /** 이동 스킬룬의 동작: 그 룬의 동작, 없으면 도약이나 돌진, 그도 없으면 걷기. */
    dashClip(set, motion) {
        return (motion && set[motion]) || set.leap || set.charge || set.walk || set.idle;
    }

    /** 그 사람이 서고, 걷고, 치고, 이동 스킬룬을 쓰고, 쓰러지고, 외치는 동작(쓰러짐은 맨손 묶음에만 있다). */
    clipsOf(look, snap) {
        const kit = this.deps.STAGE_CHARACTERS.classes[look.classId].weapons, set = kit[look.stance] || kit.unarmed;
        const motion = name => this.deps.stageActors.motionFor(name, look.classId, look.stance);
        return { idle: set.idle, walk: set.walk || set.idle, strike: this.strikeClip(set, motion(snap.activeSkill)), dash: this.dashClip(set, snap.mobilitySkill ? motion(snap.mobilitySkill) : null),
            death: kit.unarmed.death, cheer: set.shout || set.idle };
    }

    labelsOf(row, snap, side) {
        return { name: String(row.nickname || (side === 'left' ? '도전자' : '수비자')), skill: String(snap.activeSkill || '기본 공격') };
    }

    styleOf(snap) {
        return { colour: COLOURS[snap.skillElement] || COLOURS.phys, ranged: RANGED.has(snap.style), dps: Math.max(1, Number(snap.dps) || 1) };
    }

    /** 걷기 동작의 빠르기: 기록의 이동 속도(100이 기본) 그대로이되 무대의 걷기와 같은 아래위(STAGE_CHARACTERS.move). */
    walkRateOf(snap) {
        const speed = Number(snap.moveSpeed), rule = this.deps.STAGE_CHARACTERS.move;
        return Number.isFinite(speed) && speed > 0 ? (0, this.deps.clampNumber)(speed / 100, rule.rateMin, rule.rateMax) : 1;
    }

    fighterOf(duel, side, look) {
        const row = duel[side] || {}, snap = row.snapshot || {};
        return { side, ...this.labelsOf(row, snap, side), ...this.styleOf(snap), clips: this.clipsOf(look || this.lookOfSnapshot(snap), snap), walkRate: this.walkRateOf(snap) };
    }

    regionOfHere() {
        const zone = typeof this.deps.getZone === 'function' ? (0, this.deps.getZone)(this.deps.game.currentZoneId) : null;
        const act = zone && Number(zone.act) > 0 ? 'act-' + String(zone.act).padStart(2, '0') : '';
        return this.deps.stageRegionFit.of(act) ? act : FALLBACK_REGION;
    }
}
