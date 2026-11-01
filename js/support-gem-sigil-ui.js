// 보조스킬룬 그림(2026-11-02 사용자: 사각 아이콘 60종, 2026-10-11 문양을 대신한다)과 계열 색.
// 보드의 보조스킬룬 칸(js/skill-gem-board-ui.js), 목록 타일(js/ui.js renderSupportGemCard), 룬 칸 창(js/gem-slot-dialog-ui.js),
// 룬 연구 카드(js/skills-ui.js)가 함께 쓴다. 그림판은 assets/ui/support-rune-icons-32.png와 -64.png, 색은 css/gem-loadout.css의 .is-tone-*.
(function () {
    'use strict';

    /** 그림판의 칸 순서(10열 6행, 전달본 support-001부터). 방패 공명은 없앤 룬이지만 그림판의 자리를 지킨다. */
    const ART_ORDER = Object.freeze([
        '근접 물리 피해', '투사체 강화', '원소 집중', '범위 피해', '지속 확산', '화염 주입', '냉기 증폭', '번개 전도', '혼돈 전환', '화염 공명',
        '냉기 공명', '번개 공명', '혼돈 공명', '카오스 잠식', '분쇄의 일격', '비전 증폭', '방패 공명', '지뢰 증폭', '연금 촉매', '기동 타격',
        '집중 유지', '소환수 피해 증폭', '소환수 생명력', '가속', '날카로움', '무자비', '연속타격', '생명력 흡수', '갑주 파쇄', '저항 침식',
        '재생 억제', '정밀 하한', '과충전 상한', '잔향', '소환수 가속', '소환수 예리함', '소환수 무자비', '화염 변환', '냉기 변환', '번개 변환',
        '카오스 변환', '이중 발동', '이중 시전', '갈래 투사체', '연쇄 투사체', '휩쓸기', '꿰뚫기', '넓은 판정', '밀어내기', '투척',
        '지뢰 설치', '강타화', '잔불', '유지 시전', '분산', '집속', '불붙이기', '터지는 시체', '처형', '증원'
    ]);
    /** stat → 계열 색. */
    const TONE_BY_STAT = Object.freeze({
        aspd: 'speed', move: 'speed', ds: 'speed', crit: 'crit', critDmg: 'crit',
        meleePctDmg: 'phys', projectilePctDmg: 'phys', aoePctDmg: 'phys', slamPctDmg: 'phys', shieldPctDmg: 'phys', mobilityPctDmg: 'phys', physIgnore: 'phys', minDmgRoll: 'phys', maxDmgRoll: 'phys',
        elementalPctDmg: 'elemental', resPen: 'elemental', firePctDmg: 'fire', coldPctDmg: 'cold', lightPctDmg: 'lightning', chaosPctDmg: 'chaos',
        resF: 'fire', resC: 'cold', resL: 'lightning', resChaos: 'chaos', dotPctDmg: 'chaos', chaosErosion: 'chaos', regenSuppress: 'chaos',
        leech: 'life', regen: 'life', dr: 'guard', summonPctDmg: 'summon', summonAspd: 'summon', summonCrit: 'summon', summonCritDmg: 'summon', summonHpPct: 'summon', summonGuardRedirectPct: 'summon',
        echoPower: 'arcane', spellFlatPct: 'arcane', channelingPctDmg: 'arcane', minePctDmg: 'fire', potionPctDmg: 'life'
    });
    /** 체감형은 stat이 아니라 동작으로 색을 고른다. */
    const BEHAVIOR_TONES = Object.freeze({
        '화염 변환': 'fire', '냉기 변환': 'cold', '번개 변환': 'lightning', '카오스 변환': 'chaos', '이중 발동': 'phys', '이중 시전': 'arcane', '갈래 투사체': 'phys', '연쇄 투사체': 'lightning',
        '휩쓸기': 'phys', '꿰뚫기': 'crit', '넓은 판정': 'arcane', '밀어내기': 'guard', '투척': 'speed', '지뢰 설치': 'arcane', '강타화': 'crit', '잔불': 'fire',
        '유지 시전': 'speed', '분산': 'arcane', '집속': 'crit', '불붙이기': 'life', '터지는 시체': 'chaos', '처형': 'crit', '증원': 'summon'
    });
    /** 룬 그림이 없는 소환 칸 룬의 문양(가호 6종은 룬 그림이 있다: data/skills.js SKILL_GEM_ART_PATHS). */
    const SUMMON_LOOKS = Object.freeze({
        '수액 골렘 소환': ['shield', 'summon']
    });

    /** @param {string} name support gem name @returns {string} tone */
    function sigilTone(name) {
        return BEHAVIOR_TONES[name] || TONE_BY_STAT[(SUPPORT_GEM_DB[name] || {}).stat] || 'neutral';
    }

    /** @param {number} tier worn tier 1~3 (0 = no pips) @returns {string} the tier pips shown in the corner */
    function sigilPips(tier) {
        const count = Math.max(0, Math.min(3, Math.floor(Number(tier) || 0)));
        return count ? `<em>${'◆'.repeat(count)}</em>` : '';
    }

    /** @param {string} name support gem name @param {string} className extra classes of the box @param {number} [tier] pips to show
     * @returns {string} the rune's picture from the atlas (a rune with none yet shows a star) with the tier pips in the corner */
    function sigilHtml(name, className, tier) {
        const cell = ART_ORDER.indexOf(name);
        const art = cell < 0 ? renderPixelIcon('star', 'support-sigil-icon') : `<span class="support-rune-art" style="--col:${cell % 10};--row:${Math.floor(cell / 10)}"></span>`;
        return `<span class="support-sigil${cell < 0 ? '' : ' is-art'} is-tone-${sigilTone(name)} ${className || ''}" aria-hidden="true">${art}${sigilPips(tier)}</span>`;
    }

    function summonHtml(name, className) {
        const look = SUMMON_LOOKS[name];
        return look ? `<span class="support-sigil is-tone-${look[1]} ${className}" aria-label="${escapeHTML(name)}">${renderPixelIcon(look[0], 'support-sigil-icon')}</span>` : '';
    }

    safeExposeGlobals({ supportGemSigil: Object.freeze({ html: sigilHtml, tone: sigilTone, summonHtml }) });
}());
