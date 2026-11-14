/** 시전의 앞뒤를 잇는 작은 보강 (전달본 V3.6의 vfx-polish.js): 준비하는 동안 바닥이나 손의 작은 빛, 놓는 순간의 빛, 무거운 동작과 이동의 끝에 먼지.
 * 룬마다의 갈래는 STAGE_SKILL_VFX.polish(번호 → [갈래, 무거운가]), 쓰는 클립은 pol_ 이름이다. 그림만 더하고 피해, 대상, 시간에는 닿지 않는다.
 * 한 번의 시전에 셋까지, 동시에 열여섯까지만 낸다(시뮬레이터의 예산).
 * 시뮬레이터는 주문의 손 마법진을 바닥 고리로 바꾼다: 주문, 시간, 소환 갈래는 js/canvas-stage-skill-rules.js가 손 마법진 없이 외곽선 오라만 건다.
 */
class StageSkillPolish {
    constructor(deps) {
        this.deps = deps;
        this.K = this.deps.stageSkillKit;
        this.MAX_ACTIVE = 16;
        this.MAX_CAST = 3;
        this.FLOOR_MODES = new Set(['spell', 'time', 'summon', 'blessing', 'shout']);
        this.HAND_MODES = Object.freeze({ bow: { y: -56, alpha: 0.64 }, projectile: { y: -48, alpha: 0.45 }, flask: { y: -43, alpha: 0.45 }, censer: { y: -43, alpha: 0.45 } });
        this.NO_HAND_SIGIL = new Set(['spell', 'time', 'summon', 'blessing']);
        this.rows = [];
        this.modeOf = gem => (this.deps.STAGE_SKILL_VFX.polish[gem.id] || [])[0] || null;
        this.heavyOf = gem => !!(this.deps.STAGE_SKILL_VFX.polish[gem.id] || [])[1];
        this.forgeFlareAt = 0;
        this.RELEASE_CLIPS = Object.freeze({ bow: 'pol_focus', projectile: 'pol_focus', spell: 'pol_focus', time: 'pol_focus', summon: 'pol_release_ring', shout: 'pol_release_ring', blessing: 'pol_bless_ring' });
        this.bowDrawRef = gem => (this.deps.STAGE_VIEW.runeStanceMotions[gem.meta.name]?.bow ? 'pol_draw' : '');
        this.handSigil = gem => !this.NO_HAND_SIGIL.has(this.modeOf(gem));
    }

    /** 그 룬의 색: 시뮬레이터 rampFor. */
    rampOf(gem) {
        const el = gem.meta.el;
        if (gem.id === 80) return 'light';
        return el === 'none' ? 'smoke' : this.deps.STAGE_SKILL_VFX.elementRamp[el] || 'phys';
    }

    polishPlay(name, at, o) {
        const now = this.deps.stageSkillVfx.now();
        for (let i = this.rows.length - 1; i >= 0; i--) if (now - this.rows[i].start >= this.rows[i].life) this.rows.splice(i, 1);
        if (this.rows.length >= this.MAX_ACTIVE) return null;
        const ramp = o.ramp || 'phys', row = this.deps.stageSkillVfx.play(name + '@' + ramp, at, o);
        if (row) this.rows.push(row);
        return row;
    }

    /** 준비: 주문 갈래는 발밑 고리(조금 더 길게), 쏘고 던지는 갈래는 손의 작은 빛. */
    polishWindup(gem, c) {
        const mode = c.mode, ramp = c.ramp, hand = this.HAND_MODES[mode];
        if (this.FLOOR_MODES.has(mode)) {
            const life = c.wind + 70, shout = mode === 'shout';
            this.polishPlay('pol_cast_ring', this.K.at(c.hero, 0, 2), { ramp, layer: 'ground', alpha: shout ? 0.38 : 0.62, scale: shout ? 1.05 : 1, ms: life / 7, follow: this.K.heroDrawn });
        } else if (hand) {
            this.polishPlay('pol_draw', this.K.at(c.hero, c.face * 28, hand.y), { ramp, face: c.face, alpha: hand.alpha, ms: c.wind / 5, cut: c.wind, follow: this.K.heroDrawn });
        }
    }

    /** 놓는 순간의 빛 하나. */
    polishRelease(gem, c) {
        const { mode, ramp, face, hero, wind: delay } = c;
        if (mode === 'bow') this.polishPlay('pol_focus', this.K.at(hero, face * 31, -55), { ramp, face, delay, alpha: 0.76 });
        else if (mode === 'flask') this.polishPlay('pol_focus', this.K.at(hero, face * 30, -43), { ramp: 'stone', face, delay, alpha: 0.48 });
        else if (mode === 'spell' || mode === 'time') this.polishPlay('pol_focus', this.K.at(hero, face * 37, -52), { ramp, face, delay, alpha: 0.6, scale: 1.12 });
        else if (mode === 'projectile') this.polishPlay('pol_focus', this.K.at(hero, face * 32, -48), { ramp, face, delay, alpha: 0.64 });
        else if (mode === 'summon') this.polishPlay('pol_release_ring', this.K.at(hero, 0, 2), { ramp, layer: 'ground', delay, alpha: 0.65 });
        else if (mode === 'blessing') this.polishPlay('pol_bless_ring', this.K.at(hero, 0, 2), { ramp, layer: 'ground', delay, alpha: 0.65 });
        else if (mode === 'shout') this.polishPlay('pol_release_ring', this.K.at(hero, 0, 2), { ramp, layer: 'ground', delay, alpha: 0.42, scale: 1.15 });
        else if (c.heavy) this.polishPlay('pol_dust', this.K.at(hero, face * 9, 2), { ramp: 'smoke', face, layer: 'ground', delay, alpha: 0.5 });
    }

    /** 무거운 동작과 이동의 끝: 발밑 먼지(바위 플라스크는 돌가루). */
    polishRecover(gem, c) {
        if (!c.heavy && c.mode !== 'movement') return;
        const chaos = gem.meta.el === 'chaos', name = gem.id === 77 ? 'pol_stone' : 'pol_dust';
        this.polishPlay(name, this.K.at(this.K.heroSpot(), 0, 2), { ramp: chaos ? 'chaos' : gem.id === 77 ? 'stone' : 'smoke', face: c.face, layer: 'ground', delay: c.end, alpha: 0.42, scale: chaos ? 0.7 : 0.8, follow: this.K.heroDrawn });
    }

    worn(owner) { return this.deps.gemCoreForge.tierOf(Number(owner.gemData?.[owner.activeSkill]?.enhanceLevel) || 0); }

    /** 강화 단계가 높은 주 공격 룬(2026-11-02 사용자): 10강부터 놓는 순간 발밑에 고리, 15강부터 몸 앞에 빛이 더 오른다. 빨리 치는 룬이 화면을 덮지 않게 0.45초에 한 번만. */
    polishForge(owner, gem, c) {
        const tier = this.worn(owner), now = this.deps.stageSkillVfx.now();
        if (tier < 2 || this.K.gemOf(owner.activeSkill)?.id !== gem.id || now - this.forgeFlareAt < 450) return;
        this.forgeFlareAt = now;
        this.polishPlay('pol_release_ring', this.K.at(c.hero, 0, 2), { ramp: c.ramp, layer: 'ground', delay: c.wind, alpha: 0.4 + tier * 0.1, scale: 0.8 + tier * 0.25 });
        if (tier >= 3) this.polishPlay('pol_focus', this.K.at(c.hero, 0, -46), { ramp: c.ramp, face: c.face, delay: c.wind, alpha: 0.7, scale: tier >= 4 ? 2 : 1.5 });
    }

    /** 15강부터 주 공격 룬을 낀 몸에 도는 빛의 색(js/canvas-stage-actors.js drawAura), 없으면 null. */
    polishForgeAura(owner) {
        const tier = this.worn(owner);
        return tier >= 3 ? `${this.deps.GEM_CORE_FORGE.tierColours[tier]}${tier >= 4 ? 'cc' : '88'}` : null;
    }

    /** 시전 시작에 한 번(js/canvas-stage-skill-rules.js). @param {object} gem @param {{wind:number, end:number, mode:?string}} o 놓기까지, 동작 끝까지(ms), 표 대신 쓸 갈래 */
    polishCast(owner, gem, o) {
        const mode = o.mode || this.modeOf(gem);
        if (!mode) return;
        const c = { mode, heavy: this.heavyOf(gem), ramp: this.rampOf(gem), face: this.K.heroFace(), hero: this.K.heroSpot(), wind: Math.max(140, Math.min(900, o.wind)), end: Math.max(o.wind, o.end) };
        let spent = 0;
        const steps = [this.polishWindup.bind(this), this.polishRelease.bind(this), this.polishRecover.bind(this)];
        for (const step of steps) if (spent++ < this.MAX_CAST) step(gem, c);
        this.polishForge(owner, gem, c);
    }

    /** 그 룬이 틀 수 있는 보강 클립: 끼면 띠를 미리 만들어 둔다. */
    polishRefs(gem) {
        const mode = this.modeOf(gem);
        if (!mode) return [];
        const ramp = this.rampOf(gem), names = [this.FLOOR_MODES.has(mode) && 'pol_cast_ring', this.HAND_MODES[mode] && 'pol_draw', this.RELEASE_CLIPS[mode], 'pol_release_ring', 'pol_focus', this.bowDrawRef(gem)].filter(Boolean);
        const refs = names.map(name => name + '@' + ramp);
        if (mode === 'flask') refs.push('pol_focus@stone');
        if (this.heavyOf(gem) || mode === 'movement') refs.push(gem.id === 77 ? 'pol_stone@stone' : 'pol_dust@' + (gem.meta.el === 'chaos' ? 'chaos' : 'smoke'));
        return refs;
    }

    /** 이중 시전의 두 번째 발동(2026-11-08 전달본 V3.9.6 "마법진이 한 번 더 깜빡"): 발밑 고리를 쓰는 갈래는 그 고리가 ms 동안 한 번 더 돈다
     * (손 마법진을 쓰는 룬은 js/canvas-stage-skill-rules.js가 손 마법진을 다시 세운다). */
    polishRecast(gem, ms) {
        const mode = this.modeOf(gem);
        if (!this.FLOOR_MODES.has(mode)) return;
        this.polishPlay('pol_cast_ring', this.K.at(this.K.heroSpot(), 0, 2), { ramp: this.rampOf(gem), layer: 'ground', alpha: mode === 'shout' ? 0.38 : 0.62, ms: ms / 7, follow: this.K.heroDrawn });
    }
}

export function createStageSkillPolish(deps) {
    const instance = new StageSkillPolish(deps);
    return Object.freeze({ cast: instance.polishCast.bind(instance), refs: instance.polishRefs.bind(instance), handSigil: instance.handSigil, recast: instance.polishRecast.bind(instance), forgeAura: instance.polishForgeAura.bind(instance) });
}
