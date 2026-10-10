// 보조 젬 문양(2026-10-11 사용자: 보조 젬이 전부 + 라 구별이 어렵다): 효과 종류마다 그림 하나, 계열마다 색 하나.
// 보드의 보조 젬 칸(js/skill-gem-board-ui.js), 목록 타일(js/ui.js renderSupportGemCard), 젬 칸 창(js/gem-slot-dialog-ui.js),
// 젬 연구 카드(js/skills-ui.js)가 함께 쓴다. 그림은 js/ui.js PIXEL_ICONS, 색은 css/gem-loadout.css의 .support-sigil.is-tone-*.
(function () {
    'use strict';

    /** stat → [PIXEL_ICONS key, tone]. 전령(모두 flatDmg)과 공명(원소 피해와 같은 stat)은 젬 자체를 보고 고른다(below). */
    const BY_STAT = Object.freeze({
        aspd: ['speed', 'speed'], move: ['boot', 'speed'], ds: ['twin', 'speed'],
        crit: ['eye', 'crit'], critDmg: ['star', 'crit'],
        meleePctDmg: ['sword', 'phys'], projectilePctDmg: ['arrow', 'phys'], aoePctDmg: ['burst', 'phys'], slamPctDmg: ['hammer', 'phys'],
        shieldPctDmg: ['shield', 'phys'], mobilityPctDmg: ['boot', 'phys'], physIgnore: ['pierce', 'phys'],
        minDmgRoll: ['down', 'phys'], maxDmgRoll: ['up', 'phys'],
        elementalPctDmg: ['prism', 'elemental'], resPen: ['pierce', 'elemental'],
        firePctDmg: ['flame', 'fire'], coldPctDmg: ['shard', 'cold'], lightPctDmg: ['bolt', 'lightning'], chaosPctDmg: ['rift', 'chaos'],
        resF: ['shield', 'fire'], resC: ['shield', 'cold'], resL: ['shield', 'lightning'], resChaos: ['shield', 'chaos'],
        dotPctDmg: ['hourglass', 'chaos'], chaosErosion: ['crack', 'chaos'], regenSuppress: ['heart', 'chaos'],
        leech: ['drop', 'life'], regen: ['heart', 'life'], dr: ['shield', 'guard'],
        summonPctDmg: ['sword', 'summon'], summonAspd: ['speed', 'summon'], summonCrit: ['eye', 'summon'], summonCritDmg: ['star', 'summon'],
        summonHpPct: ['heart', 'summon'], summonGuardRedirectPct: ['shield', 'summon'],
        echoPower: ['wave', 'arcane'], spellFlatPct: ['orb', 'arcane'], channelingPctDmg: ['reticle', 'arcane'],
        minePctDmg: ['bomb', 'fire'], potionPctDmg: ['flask', 'life']
    });
    /** 전령의 속성은 표시 이름의 첫 낱말이다('화염 플랫 피해'). */
    const HERALD_TONES = Object.freeze({ 물리: 'phys', 화염: 'fire', 냉기: 'cold', 번개: 'lightning', 카오스: 'chaos' });
    const FALLBACK = Object.freeze(['star', 'neutral']);

    /** @param {string} name support gem name @returns {string[]} [icon, tone] */
    function sigilLook(name) {
        const def = SUPPORT_GEM_DB[name] || {};
        if (Number.isFinite(def.heraldExplodeBase)) return ['skull', HERALD_TONES[String(def.name || '').split(' ')[0]] || 'phys'];
        const base = BY_STAT[def.stat] || FALLBACK;
        // 공명 젬은 같은 원소의 피해 젬과 색이 같으므로 그림을 소리굽쇠로 바꾼다.
        return def.scaleWithOwnStat ? ['fork', base[1]] : base;
    }

    /** @param {number} tier worn tier 1~3 (0 = no pips) @returns {string} the tier pips shown in the corner */
    function sigilPips(tier) {
        const count = Math.max(0, Math.min(3, Math.floor(Number(tier) || 0)));
        return count ? `<em>${'◆'.repeat(count)}</em>` : '';
    }

    /** @param {string} name support gem name @param {string} className extra classes of the box @param {number} [tier] pips to show
     * @returns {string} the sigil box: pixel icon in the tone colour, tier pips in the corner */
    function sigilHtml(name, className, tier) {
        const [icon, tone] = sigilLook(name);
        return `<span class="support-sigil is-tone-${tone} ${className || ''}" aria-hidden="true">${renderPixelIcon(icon, 'support-sigil-icon')}${sigilPips(tier)}</span>`;
    }

    safeExposeGlobals({ supportGemSigil: Object.freeze({ html: sigilHtml, tone: name => sigilLook(name)[1] }) });
}());
