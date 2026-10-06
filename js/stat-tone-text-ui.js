// 설명 글의 옵션 색(2026-10-06 사용자 요청: "설명에서 색이 거의 흰색이나 한 색깔 뿐이라 읽기가 피로하고 한눈에 잘 들어오질 않아.
// 우리 게임에서 쓰기로 한 옵션별 색감을 좀 넣어줘"). 장비 옵션 줄이 쓰는 색표(js/ui.js getItemStatToneColor)를 그대로 쓴다.
// 능력치 id가 있는 줄은 그 색 하나로 칠하고(statLine), 글뿐인 설명은 핵심어(화염, 생명력, 치명타 …)를 그 능력치의 색으로,
// 수치는 같은 절(쉼표, 마침표, 괄호 사이)의 첫 핵심어 색으로 칠한다. 나머지 글은 원래 색 그대로라 칠한 곳이 먼저 눈에 들어온다.
const statToneText = (() => {
    // 핵심어 → 색표의 능력치 id. 긴 말이 먼저 맞는다("화염 저항"이 "화염"보다, "피해 감소"가 "피해"보다 먼저).
    const KEYWORDS = Object.freeze([
        ['에너지 보호막', 'energyShield'], ['보호막', 'energyShield'],
        ['공격 속도', 'aspd'], ['시전 속도', 'aspd'], ['이동 속도', 'move'], ['이속', 'move'], ['공속', 'aspd'],
        // 붙여 쓴 말(재능 카드 원문 등)
        ['공격속도', 'aspd'], ['시전속도', 'aspd'], ['이동속도', 'move'], ['치명타확률', 'crit'], ['피해감소', 'dr'], ['최대생명력', 'flatHp'],
        ['물리 피해 감소', 'dr'], ['치명타 피해', 'critDmg'], ['치명타 확률', 'crit'], ['치명타', 'crit'], ['치명', 'crit'],
        ['모든 원소 저항', 'resAll'], ['원소 저항', 'resAll'], ['최대 저항', 'resAll'], ['저항 관통', 'resPen'],
        ['화염 저항', 'resF'], ['냉기 저항', 'resC'], ['번개 저항', 'resL'], ['카오스 저항', 'resChaos'],
        ['화염 피해', 'firePctDmg'], ['냉기 피해', 'coldPctDmg'], ['번개 피해', 'lightPctDmg'], ['카오스 피해', 'chaosPctDmg'],
        ['물리 피해', 'physPctDmg'], ['주문 피해', 'spellPctDmg'], ['원소 피해', 'elementalPctDmg'],
        ['화염', 'firePctDmg'], ['점화', 'igniteChance'], ['불꽃', 'firePctDmg'], ['용암', 'firePctDmg'],
        ['냉기', 'coldPctDmg'], ['동결', 'freezeChance'], ['냉각', 'chillChance'], ['서리', 'coldPctDmg'], ['얼음', 'coldPctDmg'], ['혹한', 'coldPctDmg'],
        ['번개', 'lightPctDmg'], ['감전', 'shockChance'], ['뇌전', 'lightPctDmg'], ['폭풍', 'lightPctDmg'],
        ['카오스', 'chaosPctDmg'], ['중독', 'poisonChance'], ['독무', 'poisonChance'], ['출혈', 'bleedChance'], ['지속 피해', 'dotPctDmg'], ['공허', 'chaosPctDmg'],
        ['최대 생명력', 'flatHp'], ['생명력 흡수', 'leech'], ['생명력', 'pctHp'], ['재생', 'regen'], ['회복', 'regen'], ['흡혈', 'leech'],
        ['방어도', 'armor'], ['피해 감소', 'dr'], ['막기', 'blockChance'], ['방패', 'armor'],
        ['회피', 'evasion'], ['비껴내기', 'deflectChance'],
        ['저항', 'resAll'], ['관통', 'resPen'],
        ['물리', 'physPctDmg'], ['주문', 'spellPctDmg'], ['젬 레벨', 'gemLevel'], ['경험치', 'expGain'],
        ['피해', 'pctDmg'], ['공격력', 'flatDmg'], ['증폭', 'pctDmg']
    ].sort((a, b) => b[0].length - a[0].length));
    const BY_WORD = new Map(KEYWORDS);
    // 핵심어를 품은 다른 낱말: 칠하지 않고 절의 첫 핵심어도 되지 않는다('모서리'의 '서리'가 냉기 색이 되고 뒤 수치까지 끌고 갔다, 2026-10-07 검토).
    const STOP_WORDS = Object.freeze(['모서리']);
    const isKeyword = word => BY_WORD.has(word);
    const escapeRe = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 수치: +12%, -2.5%, 1.2배, 0.5초, 3칸, 5중첩, 2회, x1.25, 12%p, 1,033
    const NUMBER = '[+\\-−×x]?\\d+(?:[.,]\\d+)*(?:%p|%|배|초|칸|중첩|회|x)?';
    const WORDS = [...KEYWORDS.map(([word]) => word), ...STOP_WORDS].sort((a, b) => b.length - a.length);
    const TOKEN = new RegExp(`(${WORDS.map(escapeRe).join('|')})|(${NUMBER})`, 'g');
    // 절 나누기: 쉼표와 마침표는 수 사이(1.2배, 1,033)가 아닐 때만 나눈다.
    const CLAUSE = /([·:;!?()[\]{}/|\n]|[.,](?!\d)|\s-\s)/;
    const NUMBER_TONE = '#f6e7c1'; // 핵심어 없는 절의 수치: 글보다 조금 밝게
    const VOID_TAGS = new Set(['br', 'img', 'hr', 'input', 'wbr']);
    const escape = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const toneOf = word => getItemStatToneColor(BY_WORD.get(word));

    /** One clause → [{text, color, number}] (color null = leave the text as it is). Numbers take the clause's first keyword colour. */
    function clauseSegments(clause) {
        const tokens = [...clause.matchAll(TOKEN)], lead = tokens.find(match => isKeyword(match[1]));
        const clauseTone = lead ? toneOf(lead[1]) : NUMBER_TONE, out = [];
        let at = 0;
        for (const match of tokens) {
            if (match.index > at) out.push({ text: clause.slice(at, match.index), color: null });
            out.push({ text: match[0], color: match[1] ? (isKeyword(match[1]) ? toneOf(match[1]) : null) : clauseTone, number: !match[1] });
            at = match.index + match[0].length;
        }
        if (at < clause.length) out.push({ text: clause.slice(at), color: null });
        return out;
    }
    /** Plain text → [{text, color, number}] in order (canvas drawing; a null colour keeps the caller's own). */
    function segments(text) {
        return String(text == null ? '' : text).split(CLAUSE)
            .flatMap(part => (CLAUSE.test(part) && part.length <= 3 ? [{ text: part, color: null }] : clauseSegments(part)));
    }
    const spanOf = segment => (segment.color
        ? `<span class="stat-tone${segment.number ? ' is-number' : ''}" style="color:${segment.color}">${escape(segment.text)}</span>`
        : escape(segment.text));
    /** Plain text → escaped HTML with keywords and their numbers in the stat colours. */
    function html(text) {
        return segments(text).map(spanOf).join('');
    }
    // 제 색이 있는 요소: 글자색을 직접 정했거나, 꼬리표 · 칩 · 배지 · 제목 · 색 클래스(tone)처럼 CSS가 색을 정하는 것.
    const OWN_COLOUR_CLASS = /\bclass="[^"]*(?:\bstat-tone\b|\btooltip-title\b|[\w-]*(?:tag|chip|badge|tone)[\w-]*)/i;
    /** Tracks open elements; true while inside one that already has its own colour (its text is left alone). */
    function tagStep(stack, tag) {
        const close = /^<\/(\w+)/.exec(tag), open = /^<(\w+)/.exec(tag);
        if (close) {
            const at = stack.map(row => row.name).lastIndexOf(close[1].toLowerCase());
            if (at >= 0) stack.length = at;
        } else if (open && !VOID_TAGS.has(open[1].toLowerCase()) && !tag.endsWith('/>')) {
            stack.push({ name: open[1].toLowerCase(), coloured: /\bstyle="[^"]*\bcolor\s*:/i.test(tag) || OWN_COLOUR_CLASS.test(tag) });
        }
        return stack.some(row => row.coloured);
    }
    /** Existing HTML → the same colouring on its text only (tags and entities untouched). Text inside an element that already sets
     * its colour stays as it is. */
    function markup(source) {
        const stack = [];
        let coloured = false;
        // 따옴표 안의 '>'는 태그를 끝내지 않는다(title="a > b" 같은 속성이 태그를 깨뜨렸다, 2026-10-07 검토).
        return String(source == null ? '' : source).split(/(<(?:[^>"']|"[^"]*"|'[^']*')*>)/).map(part => {
            if (part.startsWith('<')) { coloured = tagStep(stack, part); return part; }
            if (coloured || !part) return part;
            return part.split(/(&[#a-z0-9]+;)/i).map(piece => (piece.startsWith('&') ? piece : html(piece))).join('');
        }).join('');
    }
    /** The line's subject colour (its first keyword), or fallback. */
    function lineColor(text, fallback = null) {
        const lead = [...String(text == null ? '' : text).matchAll(TOKEN)].find(match => isKeyword(match[1]));
        return lead ? toneOf(lead[1]) : fallback;
    }
    /** A line about one stat, in that stat's colour (the item affix look). */
    function statLine(stat, text) {
        return `<span class="stat-tone" style="color:${getItemStatToneColor(stat)}">${escape(text)}</span>`;
    }
    return Object.freeze({ html, markup, segments, lineColor, statLine });
})();
safeExposeGlobals({ statToneText });
