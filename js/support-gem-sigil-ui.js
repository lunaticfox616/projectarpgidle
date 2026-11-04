// 보조스킬룬 그림(2026-11-02 사용자: 사각 아이콘 60종, 2026-10-11 문양을 대신한다)과 계열 색.
// 보드의 보조스킬룬 칸(js/skill-gem-board-ui.js), 목록 타일(js/ui.js renderSupportGemCard), 룬 칸 창(js/gem-slot-dialog-ui.js),
// 상점(js/shop-view-ui.js)이 함께 쓴다. 그림판은 assets/ui/support-rune-icons-32.png와 -64.png, 색은 css/gem-loadout.css의 .is-tone-*.
(function () {
    'use strict';

    // 그림판의 칸 순서와 계열 색 표는 data/skills.js(SUPPORT_RUNE_ART_ORDER, STAT_TONES), 색 고르기는 js/skills.js getSupportRuneTone
    /** 룬 그림이 없는 소환 칸 룬의 문양(가호 6종은 룬 그림이 있다: data/skills.js SKILL_GEM_ART_PATHS). */
    const SUMMON_LOOKS = Object.freeze({
        '수액 골렘 소환': ['shield', 'summon']
    });

    /** @param {number} tier worn tier 1~3 (0 = no pips) @returns {string} the tier pips shown in the corner */
    function sigilPips(tier) {
        const count = Math.max(0, Math.min(3, Math.floor(Number(tier) || 0)));
        return count ? `<em>${'◆'.repeat(count)}</em>` : '';
    }

    /** @param {string} name support gem name @param {string} className extra classes of the box @param {number} [tier] pips to show
     * @returns {string} the rune's picture from the atlas (a rune with none yet shows a star) with the tier pips in the corner */
    function sigilHtml(name, className, tier) {
        const cell = getSupportRuneArtCell(name);
        const art = cell ? `<span class="support-rune-art" style="--col:${cell.col};--row:${cell.row}"></span>` : renderPixelIcon('star', 'support-sigil-icon');
        return `<span class="support-sigil${cell ? ' is-art' : ''} is-tone-${getSupportRuneTone(name)} ${className || ''}" aria-hidden="true">${art}${sigilPips(tier)}</span>`;
    }

    function summonHtml(name, className) {
        const look = SUMMON_LOOKS[name];
        return look ? `<span class="support-sigil is-tone-${look[1]} ${className}" aria-label="${escapeHTML(name)}">${renderPixelIcon(look[0], 'support-sigil-icon')}</span>` : '';
    }

    safeExposeGlobals({ supportGemSigil: Object.freeze({ html: sigilHtml, tone: getSupportRuneTone, summonHtml }) });
}());
