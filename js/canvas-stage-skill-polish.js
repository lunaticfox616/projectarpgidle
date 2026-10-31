/** 시전의 앞뒤를 잇는 작은 보강 (전달본 V3.6의 vfx-polish.js): 준비하는 동안 바닥이나 손의 작은 빛, 놓는 순간의 빛, 무거운 동작과 이동의 끝에 먼지.
 * 룬마다의 갈래는 STAGE_SKILL_VFX.polish(번호 → [갈래, 무거운가]), 쓰는 클립은 pol_ 이름이다. 그림만 더하고 피해, 대상, 시간에는 닿지 않는다.
 * 한 번의 시전에 셋까지, 동시에 열여섯까지만 낸다(시뮬레이터의 예산).
 * 시뮬레이터는 주문의 손 마법진을 바닥 고리로 바꾼다: 주문, 시간, 소환 갈래는 js/canvas-stage-skill-rules.js가 손 마법진 없이 외곽선 오라만 건다.
 */
const stageSkillPolish = (() => {
    const K = stageSkillKit, MAX_ACTIVE = 16, MAX_CAST = 3;
    const FLOOR_MODES = new Set(['spell', 'time', 'summon', 'blessing', 'shout']);
    const HAND_MODES = Object.freeze({ bow: { y: -56, alpha: 0.64 }, projectile: { y: -48, alpha: 0.45 }, flask: { y: -43, alpha: 0.45 }, censer: { y: -43, alpha: 0.45 } });
    const NO_HAND_SIGIL = new Set(['spell', 'time', 'summon', 'blessing']);
    const rows = [];                              // 떠 있는 보강 클립

    const modeOf = gem => (STAGE_SKILL_VFX.polish[gem.id] || [])[0] || null;
    const heavyOf = gem => !!(STAGE_SKILL_VFX.polish[gem.id] || [])[1];
    /** 그 룬의 색: 시뮬레이터 rampFor. */
    function rampOf(gem) {
        const el = gem.meta.el;
        if (gem.id === 80) return 'light';
        return el === 'none' ? 'smoke' : STAGE_SKILL_VFX.elementRamp[el] || 'phys';
    }
    function polishPlay(name, at, o) {
        const now = stageSkillVfx.now();
        for (let i = rows.length - 1; i >= 0; i--) if (now - rows[i].start >= rows[i].life) rows.splice(i, 1);
        if (rows.length >= MAX_ACTIVE) return null;
        const ramp = o.ramp || 'phys', row = stageSkillVfx.play(name + '@' + ramp, at, o);
        if (row) rows.push(row);
        return row;
    }
    /** 준비: 주문 갈래는 발밑 고리(조금 더 길게), 쏘고 던지는 갈래는 손의 작은 빛. */
    function polishWindup(gem, c) {
        const mode = c.mode, ramp = c.ramp, hand = HAND_MODES[mode];
        if (FLOOR_MODES.has(mode)) {
            const life = c.wind + 70, shout = mode === 'shout';
            polishPlay('pol_cast_ring', K.at(c.hero, 0, 2), { ramp, layer: 'ground', alpha: shout ? 0.38 : 0.62, scale: shout ? 1.05 : 1, ms: life / 7, follow: K.heroDrawn });
        } else if (hand) {
            polishPlay('pol_draw', K.at(c.hero, c.face * 28, hand.y), { ramp, face: c.face, alpha: hand.alpha, ms: c.wind / 5, cut: c.wind, follow: K.heroDrawn });
        }
    }
    /** 놓는 순간의 빛 하나. */
    function polishRelease(gem, c) {
        const { mode, ramp, face, hero, wind: delay } = c;
        if (mode === 'bow') polishPlay('pol_focus', K.at(hero, face * 31, -55), { ramp, face, delay, alpha: 0.76 });
        else if (mode === 'flask') polishPlay('pol_focus', K.at(hero, face * 30, -43), { ramp: 'stone', face, delay, alpha: 0.48 });
        else if (mode === 'spell' || mode === 'time') polishPlay('pol_focus', K.at(hero, face * 37, -52), { ramp, face, delay, alpha: 0.6, scale: 1.12 });
        else if (mode === 'projectile') polishPlay('pol_focus', K.at(hero, face * 32, -48), { ramp, face, delay, alpha: 0.64 });
        else if (mode === 'summon') polishPlay('pol_release_ring', K.at(hero, 0, 2), { ramp, layer: 'ground', delay, alpha: 0.65 });
        else if (mode === 'blessing') polishPlay('pol_bless_ring', K.at(hero, 0, 2), { ramp, layer: 'ground', delay, alpha: 0.65 });
        else if (mode === 'shout') polishPlay('pol_release_ring', K.at(hero, 0, 2), { ramp, layer: 'ground', delay, alpha: 0.42, scale: 1.15 });
        else if (c.heavy) polishPlay('pol_dust', K.at(hero, face * 9, 2), { ramp: 'smoke', face, layer: 'ground', delay, alpha: 0.5 });
    }
    /** 무거운 동작과 이동의 끝: 발밑 먼지(바위 플라스크는 돌가루). */
    function polishRecover(gem, c) {
        if (!c.heavy && c.mode !== 'movement') return;
        const chaos = gem.meta.el === 'chaos', name = gem.id === 77 ? 'pol_stone' : 'pol_dust';
        polishPlay(name, K.at(K.heroSpot(), 0, 2), { ramp: chaos ? 'chaos' : gem.id === 77 ? 'stone' : 'smoke', face: c.face, layer: 'ground', delay: c.end, alpha: 0.42, scale: chaos ? 0.7 : 0.8, follow: K.heroDrawn });
    }
    /** 시전 시작에 한 번(js/canvas-stage-skill-rules.js). @param {object} gem @param {{wind:number, end:number}} o 놓기까지, 동작 끝까지(ms) */
    function polishCast(gem, o) {
        const mode = modeOf(gem);
        if (!mode) return;
        const c = { mode, heavy: heavyOf(gem), ramp: rampOf(gem), face: K.heroFace(), hero: K.heroSpot(), wind: Math.max(140, Math.min(900, o.wind)), end: Math.max(o.wind, o.end) };
        let spent = 0;
        const steps = [polishWindup, polishRelease, polishRecover];
        for (const step of steps) if (spent++ < MAX_CAST) step(gem, c);
    }
    /** 갈래마다 놓는 순간의 클립(polishRelease). */
    const RELEASE_CLIPS = Object.freeze({ bow: 'pol_focus', projectile: 'pol_focus', spell: 'pol_focus', time: 'pol_focus', summon: 'pol_release_ring', shout: 'pol_release_ring', blessing: 'pol_bless_ring' });
    /** 그 룬이 틀 수 있는 보강 클립: 끼면 띠를 미리 만들어 둔다. */
    function polishRefs(gem) {
        const mode = modeOf(gem);
        if (!mode) return [];
        const ramp = rampOf(gem), names = [FLOOR_MODES.has(mode) && 'pol_cast_ring', HAND_MODES[mode] && 'pol_draw', RELEASE_CLIPS[mode]].filter(Boolean);
        const refs = names.map(name => name + '@' + ramp);
        if (mode === 'flask') refs.push('pol_focus@stone');
        if (heavyOf(gem) || mode === 'movement') refs.push(gem.id === 77 ? 'pol_stone@stone' : 'pol_dust@' + (gem.meta.el === 'chaos' ? 'chaos' : 'smoke'));
        return refs;
    }
    const handSigil = gem => !NO_HAND_SIGIL.has(modeOf(gem));
    return Object.freeze({ cast: polishCast, refs: polishRefs, handSigil });
})();
safeExposeGlobals({ stageSkillPolish });
