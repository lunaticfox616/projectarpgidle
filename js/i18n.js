/**
 * 언어(2026-11-03, docs/i18n.md). 코드와 index.html에 적힌 한국어 원문이 열쇠고, 다른 언어는 data/locales/<언어>.js의 팩이 그 원문을
 * 번역한다(gettext 방식). 팩에 없는 글은 한국어 원문 그대로 보인다. 장비 부위('무기')나 아이템 이름처럼 저장 키로도 쓰는 한국어는
 * 바꾸지 않고, 보여 줄 때 _t()로만 옮긴다. utils 층: 게임 상태를 모르고, DOM은 data-i18n 요소를 옮기는 applyStatic만 만진다.
 *
 *   _t('보유 {count}개', { count: 3 })   {이름} 자리에 매개변수를 넣는다(번역 뒤에).
 *   _t('접기|기록')                       같은 한국어가 문맥마다 다르게 번역되면 '|문맥'을 붙인다. 한국어로는 문맥을 떼고 보이고, 그 문맥의
 *                                         번역이 없으면 원문('접기')의 번역을 쓴다.
 *   팩 값이 { one: '...', other: '...' }면 params.count로 복수형을 고른다(Intl.PluralRules).
 *   <b data-i18n>화면</b>                 정적 HTML. 그 요소의 바로 아래 글 마디마다 옮긴다(자식 요소 사이의 글도, 자식 요소 안은 아니다).
 *                                         data-i18n-attr="data-tip placeholder"는 그 속성도 옮긴다.
 *   ?lang=en                              그 판에서만 언어를 덮는다(검사·갈무리용). 저장은 바뀌지 않는다.
 *   window 'game:languagechange'          언어가 바뀌면 보낸다. 번역한 글을 제 손으로 그려 둔 UI는 이 이벤트에서 다시 그린다.
 */
const i18n = (() => {
    const LANGUAGE_PACKS = [LANGUAGE_PACK_KO, LANGUAGE_PACK_EN, LANGUAGE_PACK_JA, LANGUAGE_PACK_ZH_CN, LANGUAGE_PACK_ZH_TW];
    const SOURCE = LANGUAGE_PACK_KO;
    const packs = new Map(LANGUAGE_PACKS.map(pack => [pack.code, pack]));
    const missing = new Set();
    let current = SOURCE;
    let pluralRules = null;

    /** 저장된 값을 아는 언어 코드로. 모르는 값(옛 저장, 손상)은 원문 언어다. */
    function normalizeLanguage(value) {
        return packs.has(value) ? value : SOURCE.code;
    }

    /** '원문|문맥'에서 원문. */
    function sourceText(key) {
        const at = key.lastIndexOf('|');
        return at > 0 ? key.slice(0, at) : key;
    }

    function interpolate(text, params) {
        if (!params) return text;
        return text.replace(/\{(\w+)\}/g, (whole, name) => (name in params ? String(params[name]) : whole));
    }

    /** 복수형 값({ one, other, ... })에서 params.count에 맞는 글. 그 범주가 없으면 other, 그것도 없으면 원문. */
    function pluralText(key, entry, params) {
        const count = params && Number.isFinite(Number(params.count)) ? Number(params.count) : null;
        const category = count === null || !pluralRules ? 'other' : pluralRules.select(count);
        const text = entry[category] ?? entry.other;
        if (typeof text === 'string') return text;
        noteMissing(key);
        return sourceText(key);
    }

    function noteMissing(key) {
        if (current === SOURCE || missing.has(key) || !/[가-힣]/.test(sourceText(key))) return;   // 한국어가 없는 글(플레이어 이름, 숫자)은 원문이 아니다
        missing.add(key);
        console.warn(`[i18n] ${current.code} 번역 없음: ${key}`);
    }

    /** 현재 언어의 글. 팩에 없으면 한국어 원문(문맥을 떼고). */
    function translate(key, params) {
        const text = String(key);
        const entry = current.strings[text] ?? current.strings[sourceText(text)];   // '원문|문맥'에 번역이 없으면 원문의 번역
        if (entry === undefined) {
            const numbered = translateNumbered(sourceText(text), params);
            if (numbered !== null) return numbered;
            noteMissing(text);
            return interpolate(sourceText(text), params);
        }
        return interpolate(typeof entry === 'string' ? entry : pluralText(text, entry, params), params);
    }

    /** 숫자가 박힌 채 만들어진 글('혼돈 심화 21', '소행성 115', '지하계 30층'): 숫자를 {n}, {n2}, …로 바꾼 열쇠의 번역에 그 숫자를 되넣는다.
     *  데이터가 만든 이름을 보여 주는 자리에서 쓰이며, 그런 열쇠가 팩에 없으면 null이다. */
    function translateNumbered(text, params) {
        if (!/\d/.test(text) || !/[가-힣]/.test(text)) return null;
        const numbers = [];
        const pattern = text.replace(/\d[\d,.]*/g, match => { numbers.push(match); return `{n${numbers.length === 1 ? '' : numbers.length}}`; });
        const entry = current.strings[pattern];
        if (typeof entry !== 'string') return null;
        const values = Object.fromEntries(numbers.map((value, index) => [`n${index === 0 ? '' : index + 1}`, value]));
        return interpolate(entry, params ? { ...values, ...params } : values);
    }

    /** 글 마디의 한국어 원문: 처음 볼 때 적어 두고, 그 뒤로는 그 원문을 현재 언어로 옮긴다(앞뒤 공백은 그대로). */
    const textSources = new WeakMap();
    function translateTextNode(node) {
        if (!textSources.has(node)) textSources.set(node, node.nodeValue);
        const source = textSources.get(node);
        const key = source.trim();
        if (/[가-힣]/.test(key)) node.nodeValue = source.replace(key, translate(key));   // 숫자·괄호만 있는 마디는 원문이 아니다
    }

    /** data-i18n 요소: 바로 아래 글 마디들만 옮긴다. 자식 요소(알림 점, 아이콘)는 그대로다. */
    function translateElement(element) {
        element.childNodes.forEach(node => { if (node.nodeType === 3) translateTextNode(node); });
    }

    /** data-i18n-attr="data-tip placeholder": 그 속성들의 원문을 data-i18n-source-<속성>에 두고 옮긴다. */
    function translateAttributes(element) {
        for (const name of element.dataset.i18nAttr.split(/\s+/).filter(Boolean)) {
            const store = `data-i18n-source-${name}`;
            if (!element.hasAttribute(store)) element.setAttribute(store, element.getAttribute(name) || '');
            element.setAttribute(name, translate(element.getAttribute(store)));
        }
    }

    /** root 아래 data-i18n·data-i18n-attr 요소를 현재 언어로. 새로 만든 DOM 조각에도 부를 수 있다. */
    function applyStatic(root) {
        const scope = root || document;
        if (scope.matches && scope.matches('[data-i18n]')) translateElement(scope);
        if (scope.matches && scope.matches('[data-i18n-attr]')) translateAttributes(scope);
        scope.querySelectorAll('[data-i18n]').forEach(translateElement);
        scope.querySelectorAll('[data-i18n-attr]').forEach(translateAttributes);
    }

    /** 글 마디의 한국어 원문(옮긴 적이 없으면 지금 글). 정적 글을 제 손으로 옮겨 그리는 UI(하단 메뉴 이름표)가 쓴다. */
    function sourceOf(node) {
        return textSources.has(node) ? textSources.get(node) : node.nodeValue;
    }

    function setLanguage(code) {
        const next = packs.get(normalizeLanguage(code));
        const changed = next !== current;
        current = next;
        pluralRules = new Intl.PluralRules(current.locale);
        document.documentElement.lang = current.code;
        cjkFamily = null;
        applyStatic(document);
        if (changed && typeof CustomEvent === 'function') window.dispatchEvent(new CustomEvent('game:languagechange', { detail: { language: current.code } }));
    }

    /** 캔버스 글꼴 목록: 앞 글꼴 뒤에 CSS --font-cjk(css/tokens.css가 html lang으로 고르는 언어별 CJK 보조 글꼴)를 붙인다.
     *  Galmuri에 없는 가나·한자가 화면의 글과 같은 글꼴로 그려진다. 언어를 바꾸면 다음 호출에서 다시 읽는다. */
    let cjkFamily = null;
    function fontFamily(primary) {
        if (cjkFamily === null) cjkFamily = readCjkFamily();
        return `${primary}, ${cjkFamily}`;
    }

    function readCjkFamily() {
        const value = typeof getComputedStyle === 'function' ? getComputedStyle(document.documentElement).getPropertyValue('--font-cjk').trim() : '';
        return value || "'Malgun Gothic', sans-serif";
    }

    /** 주소의 ?lang=: 그 판에서만 언어를 덮는다. 아는 언어가 아니면 무시한다. */
    function urlLanguage() {
        const match = /[?&]lang=([A-Za-z-]+)/.exec(location.search || '');
        return match && packs.has(match[1]) ? match[1] : null;
    }

    /** 저장을 읽은 뒤: 설정의 언어를 바로잡아 되돌려 적고 적용한다. 주소의 ?lang=은 저장을 바꾸지 않고 이번만 이긴다. */
    function applySaved(settings) {
        settings.language = normalizeLanguage(settings.language);
        setLanguage(urlLanguage() || settings.language);
    }

    return Object.freeze({
        get language() { return current.code; },
        /** toLocaleString·localeCompare에 넘기는 BCP 47 로캘(ko-KR, en-US). */
        get locale() { return current.locale; },
        /** 고를 수 있는 언어: { code, name }. 이름은 그 언어로 적혀 있어 번역하지 않는다. */
        get languages() { return LANGUAGE_PACKS.map(pack => ({ code: pack.code, name: pack.name })); },
        normalizeLanguage, t: translate, setLanguage, applySaved, applyStatic, sourceOf, fontFamily,
        /** 이번 판에서 현재 언어의 팩에 없던 열쇠(검사·보고용). */
        missingKeys: () => [...missing]
    });
})();

/** 현재 언어의 글: _t('한국어 원문', { 매개변수 }). 세부는 i18n의 머리말. */
function _t(key, params) {
    return i18n.t(key, params);
}

safeExposeGlobals({ i18n, _t });
