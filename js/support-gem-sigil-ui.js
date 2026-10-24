// 보조스킬룬 문양(2026-10-11 사용자: 보조스킬룬이 전부 + 라 구별이 어렵다): 효과 종류마다 그림 하나, 계열마다 색 하나.
// 보드의 보조스킬룬 칸(js/skill-gem-board-ui.js), 목록 타일(js/ui.js renderSupportGemCard), 룬 칸 창(js/gem-slot-dialog-ui.js),
// 룬 연구 카드(js/skills-ui.js)가 함께 쓴다. 그림은 js/ui.js PIXEL_ICONS, 색은 css/gem-loadout.css의 .support-sigil.is-tone-*.
(function () {
    'use strict';

    /** stat → [PIXEL_ICONS key, tone]. 전령(속성별 기본 피해)과 공명(원소 피해와 같은 stat)은 룬 자체를 보고 고른다(below). */
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
    const FALLBACK = Object.freeze(['star', 'neutral']);
    /** 체감형은 동작을 뜻하는 문양을 쓴다. 같은 속성이라도 주입/변환/점화의 문양은 다르다. */
    const BEHAVIOR_LOOKS = Object.freeze({
        '화염 변환': ['prism', 'fire'], '냉기 변환': ['prism', 'cold'], '번개 변환': ['prism', 'lightning'], '카오스 변환': ['prism', 'chaos'],
        '이중 발동': ['twin', 'phys'], '이중 시전': ['twin', 'arcane'], '갈래 투사체': ['split', 'phys'], '연쇄 투사체': ['boomerang', 'lightning'],
        '휩쓸기': ['wave', 'phys'], '꿰뚫기': ['pierce', 'crit'], '넓은 판정': ['burst', 'arcane'], '밀어내기': ['speed', 'guard'],
        '투척': ['arrow', 'speed'], '지뢰 설치': ['bomb', 'arcane'], '강타화': ['hammer', 'crit'], '잔불': ['hourglass', 'fire'],
        '유지 시전': ['reticle', 'speed'], '분산': ['fork', 'arcane'], '집속': ['reticle', 'crit'], '불붙이기': ['flame', 'life'],
        '터지는 시체': ['skull', 'chaos'], '처형': ['down', 'crit'], '증원': ['split', 'summon']
    });
    /** 룬 그림이 없는 소환 칸 룬의 문양(가호 6종은 룬 그림이 있다: data/skills.js SKILL_GEM_ART_PATHS). */
    const SUMMON_LOOKS = Object.freeze({
        '수액 골렘 소환': ['shield', 'summon']
    });

    /** @param {string} name support gem name @returns {string[]} [icon, tone] */
    function sigilLook(name) {
        const def = SUPPORT_GEM_DB[name] || {};
        if (BEHAVIOR_LOOKS[name]) return BEHAVIOR_LOOKS[name];
        const base = BY_STAT[def.stat] || FALLBACK;
        // 공명 룬은 같은 원소의 피해 룬과 색이 같으므로 그림을 소리굽쇠로 바꾼다.
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

    function summonHtml(name, className) {
        const look = SUMMON_LOOKS[name];
        return look ? `<span class="support-sigil is-tone-${look[1]} ${className}" aria-label="${escapeHTML(name)}">${renderPixelIcon(look[0], 'support-sigil-icon')}</span>` : '';
    }

    safeExposeGlobals({ supportGemSigil: Object.freeze({ html: sigilHtml, tone: name => sigilLook(name)[1], summonHtml }) });
}());
