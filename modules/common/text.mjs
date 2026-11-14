function dedupeList(values) {
    return Array.from(new Set(Array.isArray(values) ? values.filter(Boolean) : []));
}

/** 도트 UI에 섞이면 안 되는 컬러 그림 글자를 뺀다. 이모지 속성이 없는 그림 기호(U+1F56E 책 등)도 U+1F000 ~ 1FAFF 묶음으로 함께 뺀다. */
/** The final consonant (batchim) index of the word's last syllable for picking a particle: 0 for none, 8 for ㄹ, -1 when the word
 * ends in something else (the caller keeps a dual form). Closing brackets and quotes are skipped; a digit reads as its name (일, 삼). */
function getLastBatchim(word) {
    const text = String(word || '').replace(/[\s)\]}」』'"]+$/u, '');
    const last = text.charAt(text.length - 1);
    if (last >= '0' && last <= '9') return KOREAN_DIGIT_BATCHIM[Number(last)];
    const code = text.charCodeAt(text.length - 1) - 0xAC00;
    return code >= 0 && code < 11172 ? code % 28 : -1;
}

/** 영(십, 백) 일 이 삼 사 오 육 칠 팔 구: the batchim each digit is read with. */
const KOREAN_DIGIT_BATCHIM = /* @__PURE__ */ Object.freeze([21, 8, 0, 16, 0, 0, 1, 8, 8, 0]);

/** 받침에 맞춘 조사: pickParticle('검', '을', '를') → '을'. 받침을 알 수 없는 끝(영문 따위)은 '을(를)'. */
function pickParticle(word, afterConsonant, afterVowel, language = 'ko') {
    // 한국어 조사는 한국어로 볼 때만 붙인다. 다른 언어에서는 이름만 남고, 문장은 호출부가 _t()로 옮긴다(docs/i18n.md).
    if (language !== 'ko') return '';
    const batchim = getLastBatchim(word);
    if (batchim < 0) return `${afterConsonant}(${afterVowel})`;
    return batchim ? afterConsonant : afterVowel;
}

/** 받침에 맞춘 방향 조사: "성소" → "성소로", "숲" → "숲으로", "길" → "길로"(ㄹ 받침은 '로'). 알 수 없는 끝은 '(으)로'. */
function withDirectionParticle(word, language = 'ko') {
    if (language !== 'ko') return String(word || '');
    const batchim = getLastBatchim(word);
    return String(word || '') + (batchim < 0 ? '(으)로' : (batchim === 0 || batchim === 8 ? '로' : '으로'));
}

/** 받침에 맞춘 목적격 조사: "줄기의 전령" → "줄기의 전령을", "부제녀" → "부제녀를". */
function withObjectParticle(word, language = 'ko') {
    return String(word || '') + pickParticle(word, '을', '를', language);
}

/** 받침에 맞춘 주격 조사: "힘" → "힘이", "계시" → "계시가". */
function withSubjectParticle(word, language = 'ko') {
    return String(word || '') + pickParticle(word, '이', '가', language);
}

/** Text made safe for HTML: & < > " and ' as entities; null and undefined as an empty string. */
/** 말한 이의 짧은 이름: '관측자의 그림자, 베일라'는 베일라, '벼림꾼 오르가'는 오르가(2026-11-02 사용자: 인용 뒤에 - 베일라로 적는다). */
function speakerShortName(speaker) {
    return String(speaker || '').split(' (')[0].split(/[\s,]+/).pop();
}

function escapeHTML(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function stripDecorativeEmoji(value) {
    return String(value == null ? '' : value)
        .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\u{1F000}-\u{1FAFF}\uFE0F\u200D]/gu, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

export function getSearchTokens(query) {
    return String(query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
}

/** Display-only: keep a percent value and its Korean particle together across line wraps. */
export function keepKoreanUnitParticles(text) {
    return String(text).replace(/%(?=[가-힣])/g, '%\u2060');
}

export function matchSearchQuery(raw, query) {
    const tokens = getSearchTokens(query);
    if (!tokens.length) return true;
    const text = String(raw || '').toLowerCase();
    return tokens.every(token => text.includes(token));
}

export { dedupeList, getLastBatchim, KOREAN_DIGIT_BATCHIM, pickParticle, withDirectionParticle, withObjectParticle, withSubjectParticle, speakerShortName, escapeHTML, stripDecorativeEmoji };
