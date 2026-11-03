'use strict';
/**
 * 언어 계약 검사(docs/i18n.md). `npm run check:i18n`(npm test 끝에도 돈다). `--report`는 번역 진행 보고, `--baseline`은 한국어 식별자 기준선 갱신.
 * 막는 것:
 *  - 언어팩(data/locales/*.js) 모양: code·name·locale이 있고 Intl이 아는 로캘, strings의 열쇠는 한국어 원문, 값은 글이거나 other가 있는 복수형.
 *  - 코드·index.html 어디에도 없는 열쇠(원문을 고치고 팩을 안 고친 흔적).
 *  - 번역이 원문에 없는 {자리}를 쓰는 것.
 *  - js/i18n.js 밖의 고정 로캘(toLocaleString('ko-KR'), localeCompare(.., 'ko')): i18n.locale을 쓴다.
 *  - index.html의 data-i18n이 자식 요소가 든 요소에 달린 것(글만 든 요소에만 단다).
 *  - 한국어 식별자(변수·속성 이름, .무기 접근)가 기준선(scripts/i18n-baseline.json)보다 늘어나는 것. 줄었으면 --baseline으로 기준선을 내린다.
 *  - js/i18n.js의 행동: 원문 그대로, 번역, 없는 열쇠의 되돌림과 기록, 문맥 떼기, 매개변수, 복수형, 언어 바꾸기와 data-i18n 적용, ?lang=.
 * 번역이 아직 없는 원문은 막지 않고 --report에 센다(한국어로 먼저 쓰고 팩은 뒤따른다). 언어를 내놓기 전에 보고가 0이어야 한다.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const espree = require('espree');

const ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(__dirname, 'i18n-baseline.json');
const LOCALES_DIR = 'data/locales';
const HANGUL = /[가-힣]/;
const PLURAL_CATEGORIES = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);
const FIXED_LOCALE = /toLocale\w*\(\s*['"]ko|localeCompare\([^)]*['"]ko['"]\s*\)/;
const STATIC_KEY_CALL = /_t\(\s*(['"])((?:\\.|(?!\1).)*)\1/g;

function read(file) { return fs.readFileSync(path.join(ROOT, file), 'utf8'); }

function listJs(dir) {
    return fs.readdirSync(path.join(ROOT, dir), { recursive: true }).filter(name => name.endsWith('.js'))
        .map(name => path.join(dir, name).split(path.sep).join('/')).sort();
}

/** 원문이 적힌 곳: 런타임 js, 언어팩을 뺀 data, index.html. */
function readSources() {
    const files = [...listJs('js'), ...listJs('data').filter(file => !file.startsWith(`${LOCALES_DIR}/`)), 'index.html'];
    return files.map(file => ({ file, text: read(file) }));
}

function walk(node, visit) {
    if (!node || typeof node !== 'object') return;
    if (node.type) visit(node);
    for (const [key, value] of Object.entries(node)) {
        if (key === 'parent') continue;
        if (Array.isArray(value)) value.forEach(child => walk(child, visit));
        else if (value && typeof value === 'object') walk(value, visit);
    }
}

// ── 언어팩 ───────────────────────────────────────────────────────────────────
function loadPacks() {
    const exposed = {};
    const context = vm.createContext({ safeExposeData: map => Object.assign(exposed, map) });
    for (const file of listJs(LOCALES_DIR)) vm.runInContext(read(file), context, { filename: file });
    return Object.entries(exposed).map(([name, pack]) => ({ name, pack }));
}

function placeholders(text) { return new Set([...String(text).matchAll(/\{(\w+)\}/g)].map(match => match[1])); }

function checkTranslationText(key, text, where, failures) {
    const allowed = placeholders(key);
    for (const name of placeholders(text)) if (!allowed.has(name)) failures.push(`${where}: '${key}'의 번역이 원문에 없는 {${name}}을 쓴다`);
}

function checkPackEntry(name, key, value, failures) {
    if (!HANGUL.test(key)) failures.push(`${name}: 열쇠는 한국어 원문이어야 한다: '${key}'`);
    if (typeof value === 'string') return checkTranslationText(key, value, name, failures);
    if (!value || typeof value !== 'object' || typeof value.other !== 'string') {
        return failures.push(`${name}: '${key}'의 값은 글이거나 other가 있는 복수형 { one, other }이어야 한다`);
    }
    for (const [category, text] of Object.entries(value)) {
        if (!PLURAL_CATEGORIES.has(category) || typeof text !== 'string') failures.push(`${name}: '${key}'의 복수형 범주 ${category}가 틀렸다`);
        else checkTranslationText(key, text, name, failures);
    }
}

function checkPackShape(name, pack, failures) {
    if (!pack || typeof pack !== 'object') return failures.push(`${name}: 팩이 객체가 아니다`);
    if (!/^[a-z]{2,3}(-[A-Za-z0-9]+)?$/.test(String(pack.code))) failures.push(`${name}: code가 언어 코드가 아니다: ${pack.code}`);
    if (typeof pack.name !== 'string' || !pack.name.trim()) failures.push(`${name}: name(그 언어로 적은 이름)이 없다`);
    try { new Intl.PluralRules(pack.locale); new Intl.NumberFormat(pack.locale); } catch (error) { failures.push(`${name}: locale '${pack.locale}'을 Intl이 모른다 (${error.message})`); }
    if (!pack.strings || typeof pack.strings !== 'object') return failures.push(`${name}: strings가 없다`);
    for (const [key, value] of Object.entries(pack.strings)) checkPackEntry(name, key, value, failures);
}

function checkOrphans(name, pack, sources, failures) {
    for (const key of Object.keys(pack.strings || {})) {
        if (!sources.some(source => source.text.includes(key))) failures.push(`${name}: 코드와 index.html 어디에도 없는 열쇠(원문이 바뀌었나): '${key}'`);
    }
}

// ── 코드 ─────────────────────────────────────────────────────────────────────
function checkFixedLocales(sources, failures) {
    for (const { file, text } of sources) {
        if (!file.startsWith('js/') || file === 'js/i18n.js') continue;
        text.split('\n').forEach((line, index) => { if (FIXED_LOCALE.test(line)) failures.push(`${file}:${index + 1}: 고정 로캘 대신 i18n.locale을 쓴다`); });
    }
}

/** index.html의 data-i18n 요소: 글만 든 요소여야 한다. 짝이 안 맞거나 자식 요소가 들었으면 알린다. */
function staticTexts(html, failures) {
    const marks = (html.match(/\sdata-i18n(?=[\s>])/g) || []).length;
    const texts = [];
    for (const [, , text] of html.matchAll(/<([a-zA-Z][\w-]*)\b[^>]*\sdata-i18n(?=[\s>])[^>]*>([^<]*)<\/\1>/g)) texts.push(text.trim());
    if (texts.length !== marks) failures.push(`index.html: data-i18n ${marks}개 중 ${texts.length}개만 글만 든 요소다(자식 요소가 든 요소에는 달지 않는다)`);
    return texts;
}

function hangulIdentifierCounts(sources) {
    const counts = {};
    for (const { file, text } of sources) {
        if (!file.endsWith('.js')) continue;
        let count = 0;
        walk(espree.parse(text, { ecmaVersion: 'latest', sourceType: 'script' }), node => { if (node.type === 'Identifier' && HANGUL.test(node.name)) count++; });
        if (count) counts[file] = count;
    }
    return counts;
}

function checkIdentifierRatchet(counts, failures) {
    const baseline = fs.existsSync(BASELINE_PATH) ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')).hangulIdentifiers : {};
    const notes = [];
    for (const file of new Set([...Object.keys(counts), ...Object.keys(baseline)])) {
        const now = counts[file] || 0, allowed = baseline[file] || 0;
        if (now > allowed) failures.push(`${file}: 한국어 식별자 ${now}개(기준선 ${allowed}). 새 식별자는 영문으로, 한국어 글은 _t()로 보인다(docs/i18n.md)`);
        else if (now < allowed) notes.push(`${file} ${allowed}→${now}`);
    }
    if (notes.length) console.log(`한국어 식별자가 줄었다(--baseline으로 기준선을 내린다): ${notes.join(', ')}`);
}

function writeBaseline(counts) {
    fs.writeFileSync(BASELINE_PATH, JSON.stringify({ hangulIdentifiers: counts }, null, 2) + '\n');
    console.log(`기준선 갱신: ${BASELINE_PATH}`);
}

// ── js/i18n.js 행동 ───────────────────────────────────────────────────────────
function fakeElement(text, attrs = {}) {
    const element = { dataset: {}, textContent: text, attrs: { ...attrs } };
    element.hasAttribute = name => name in element.attrs;
    element.getAttribute = name => (name in element.attrs ? element.attrs[name] : null);
    element.setAttribute = (name, value) => { element.attrs[name] = String(value); };
    return element;
}

function buildI18nRuntime(search, extraEnglish) {
    const textEl = fakeElement('화면 배율'), attrEl = fakeElement('', { 'aria-label': '설정 분류' });
    attrEl.dataset.i18nAttr = 'aria-label';
    const events = [], warnings = [];
    const context = {
        console: { warn: message => warnings.push(message), log() {}, error() {} },
        location: { search },
        document: { documentElement: { lang: 'ko' }, querySelectorAll: selector => (selector === '[data-i18n]' ? [textEl] : [attrEl]) },
        CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
        dispatchEvent: event => events.push(event),
        safeExposeGlobals: map => Object.assign(context, map),
        safeExposeData: map => Object.assign(context, map)
    };
    context.window = context;
    vm.createContext(context);
    // 팩의 const는 vm 전역 어휘 바인딩이라 덮어쓸 수 없어 var로 바꿔 올린다(복수형 검사용 항목을 더하기 위해).
    for (const file of listJs(LOCALES_DIR)) vm.runInContext(read(file).replace(/^const (LANGUAGE_PACK_\w+) =/m, 'var $1 ='), context, { filename: file });
    if (extraEnglish) context.LANGUAGE_PACK_EN = { ...context.LANGUAGE_PACK_EN, strings: { ...context.LANGUAGE_PACK_EN.strings, ...extraEnglish } };
    vm.runInContext(read('js/i18n.js'), context, { filename: 'js/i18n.js' });
    return { ...context, textEl, attrEl, events, warnings };
}

function testTranslationBehaviour() {
    const plural = { '{count}개 남음|검사': { one: '{count} left', other: '{count} left (plural)' } };
    const run = buildI18nRuntime('', plural);
    const { i18n, _t } = run;
    assert.strictEqual(i18n.language, 'ko');
    assert.strictEqual(i18n.locale, 'ko-KR');
    assert.strictEqual(_t('화면 배율'), '화면 배율', '원문 언어는 그대로');
    assert.strictEqual(_t('접기|기록'), '접기', '한국어로는 문맥을 뗀다');
    assert.strictEqual(_t('보유 {count}개', { count: 3 }), '보유 3개', '팩에 없어도 매개변수는 넣는다');
    assert.strictEqual(_t('{count}개 남음|검사', { count: 1 }), '1개 남음', '한국어는 복수형 없이 원문');
    assert.deepStrictEqual(['xx', undefined, null, 7, 'en', 'ko'].map(value => i18n.normalizeLanguage(value)), ['ko', 'ko', 'ko', 'ko', 'en', 'ko']);
    assert.deepStrictEqual(Array.from(i18n.missingKeys()), [], '원문 언어에서는 없는 열쇠를 세지 않는다');

    i18n.setLanguage('en');
    assert.strictEqual(i18n.locale, 'en-US');
    assert.strictEqual(run.document.documentElement.lang, 'en', 'html lang이 따라간다');
    assert.deepStrictEqual(run.events.map(event => [event.type, event.detail.language]), [['game:languagechange', 'en']]);
    assert.strictEqual(_t('화면 배율'), 'UI scale');
    assert.strictEqual(_t('{step}% (추천)', { step: 150 }), '150% (recommended)');
    assert.strictEqual(_t('{count}개 남음|검사', { count: 1 }), '1 left');
    assert.strictEqual(_t('{count}개 남음|검사', { count: 2 }), '2 left (plural)');
    assert.strictEqual(_t('없는 글|문맥', { x: 1 }), '없는 글', '번역이 없으면 한국어 원문(문맥을 떼고)');
    _t('없는 글|문맥');
    assert.deepStrictEqual(Array.from(i18n.missingKeys()), ['없는 글|문맥']);
    assert.strictEqual(run.warnings.length, 1, '없는 열쇠는 한 번만 알린다');
    assert.strictEqual(run.textEl.textContent, 'UI scale', 'data-i18n 요소가 옮겨진다');
    assert.strictEqual(run.textEl.dataset.i18nSource, '화면 배율');
    assert.strictEqual(run.attrEl.getAttribute('aria-label'), 'Settings sections', 'data-i18n-attr 속성이 옮겨진다');
    i18n.setLanguage('en');
    assert.strictEqual(run.events.length, 1, '같은 언어로 다시 정하면 이벤트가 없다');
    i18n.setLanguage('ko');
    assert.strictEqual(run.textEl.textContent, '화면 배율', '원문으로 되돌아간다');
    assert.strictEqual(run.attrEl.getAttribute('aria-label'), '설정 분류');
}

function testAppliedSettings() {
    const plain = buildI18nRuntime('');
    const settings = { language: 'xx' };
    plain.i18n.applySaved(settings);
    assert.strictEqual(settings.language, 'ko', '모르는 저장값은 원문 언어로 바로잡아 적는다');
    assert.strictEqual(plain.i18n.language, 'ko');
    const forced = buildI18nRuntime('?lang=en&x=1');
    const saved = { language: 'ko' };
    forced.i18n.applySaved(saved);
    assert.strictEqual(forced.i18n.language, 'en', '?lang=이 이번 판의 언어를 덮는다');
    assert.strictEqual(saved.language, 'ko', '저장은 바뀌지 않는다');
    const unknown = buildI18nRuntime('?lang=zz');
    unknown.i18n.applySaved({ language: 'en' });
    assert.strictEqual(unknown.i18n.language, 'en', '모르는 ?lang=은 무시한다');
}

// ── 보고 ─────────────────────────────────────────────────────────────────────
function countHangulLines(sources, prefix, pattern) {
    return sources.filter(source => source.file.startsWith(prefix))
        .reduce((sum, { text }) => sum + text.split('\n').filter(line => pattern.test(line)).length, 0);
}

function report(packs, sources, staticKeys, identifierCounts) {
    const quoted = /['"`][^'"`]*[가-힣]/;
    const codeKeys = new Set();
    let calls = 0;
    for (const { file, text } of sources) {
        if (file === 'js/i18n.js') continue;   // 머리말의 보기는 열쇠가 아니다
        for (const match of text.matchAll(STATIC_KEY_CALL)) { calls++; codeKeys.add(match[2]); }
    }
    console.log('── 언어 진행 보고 ──');
    console.log(`한국어 글이 든 줄: js ${countHangulLines(sources, 'js/', quoted)}, data ${countHangulLines(sources, 'data/', quoted)}, index.html ${countHangulLines(sources, 'index.html', HANGUL)}`);
    console.log(`_t() 호출 ${calls}개(글자 그대로의 열쇠 ${codeKeys.size}개), index.html data-i18n ${staticKeys.length}개`);
    console.log(`한국어 식별자 ${Object.values(identifierCounts).reduce((sum, count) => sum + count, 0)}개(${Object.keys(identifierCounts).length}개 파일, 기준선 scripts/i18n-baseline.json)`);
    const wanted = new Set([...codeKeys, ...staticKeys]);
    for (const { pack } of packs) {
        if (!Object.keys(pack.strings).length) { console.log(`${pack.code}: 원문 언어`); continue; }
        const missing = [...wanted].filter(key => !(key in pack.strings));
        console.log(`${pack.code}: 번역 ${Object.keys(pack.strings).length}개, 코드·HTML의 열쇠 ${wanted.size}개 중 번역 없음 ${missing.length}개`);
        missing.slice(0, 40).forEach(key => console.log(`  - ${key}`));
        if (missing.length > 40) console.log(`  … ${missing.length - 40}개 더`);
    }
}

function main() {
    const failures = [];
    const sources = readSources();
    const packs = loadPacks();
    if (!packs.some(({ pack }) => pack && pack.code === 'ko')) failures.push(`${LOCALES_DIR}: 원문 언어 팩(ko)이 없다`);
    for (const { name, pack } of packs) { checkPackShape(name, pack, failures); if (pack && pack.strings) checkOrphans(name, pack, sources, failures); }
    checkFixedLocales(sources, failures);
    const staticKeys = staticTexts(sources.find(source => source.file === 'index.html').text, failures);
    const identifierCounts = hangulIdentifierCounts(sources);
    if (process.argv.includes('--baseline')) writeBaseline(identifierCounts);
    checkIdentifierRatchet(identifierCounts, failures);
    testTranslationBehaviour();
    testAppliedSettings();
    if (process.argv.includes('--report')) report(packs, sources, staticKeys, identifierCounts);
    if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; return; }
    console.log(`check-i18n passed (${packs.length} language packs, ${staticKeys.length} static texts)`);
}

main();
