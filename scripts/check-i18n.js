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
 *
 * 번역 표(언어를 더하거나 업데이트 뒤 새 글을 옮길 때, docs/i18n.md):
 *   node scripts/check-i18n.js --export en [파일] [--names] [--descs] [--all]
 *       en 팩에 없는 원문을 쓰인 자리(파일:줄, 그 줄)와 {자리} 이름과 함께 JSON 표로 쓴다(기본 artifacts/i18n/en-missing.json).
 *       --names는 데이터의 이름(name·label·title·bossName), --descs는 설명(desc·uniqueEffect 따위)도 원문으로 모은다. --all은 번역이 있는 것도.
 *   node scripts/check-i18n.js --import en 파일
 *       표의 en 칸이 채워진 줄을 data/locales/en.js에 넣는다(있는 열쇠는 값을 바꾸고, 새 열쇠는 날짜 블록으로 끝에 더한다). 넣은 뒤 검사가 돈다.
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
        // '원문|문맥'은 코드가 붙여 만들기도 한다(하단 메뉴 이름표): 원문과 '|문맥'이 각각 어딘가에 있으면 된다.
        const at = key.lastIndexOf('|');
        const parts = at > 0 ? [key.slice(0, at), key.slice(at)] : [key];
        // 코드의 '…\n…'은 글자 두 개(\, n)라 줄바꿈이 든 열쇠는 그 꼴로도 찾는다.
        const appears = part => sources.some(source => source.text.includes(part) || source.text.includes(part.replace(/\n/g, '\\n')));
        if (!parts.every(appears)) failures.push(`${name}: 코드와 index.html 어디에도 없는 열쇠(원문이 바뀌었나): '${key}'`);
    }
}

// ── 코드 ─────────────────────────────────────────────────────────────────────
function checkFixedLocales(sources, failures) {
    for (const { file, text } of sources) {
        if (!file.startsWith('js/') || file === 'js/i18n.js') continue;
        text.split('\n').forEach((line, index) => { if (FIXED_LOCALE.test(line)) failures.push(`${file}:${index + 1}: 고정 로캘 대신 i18n.locale을 쓴다`); });
    }
}

/** index.html의 data-i18n 요소가 옮기는 글 마디(바로 아래 글만)와 data-i18n-attr 속성값. 여는 태그를 차례로 읽어 깊이를 센다. */
function staticTexts(html, failures) {
    const body = html.slice(html.indexOf('<body')).replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/g, '');
    const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'wbr', 'area', 'col', 'base', 'track', 'embed', 'param']);
    const texts = new Set(), stack = [];
    let marks = 0, useless = 0;
    const tag = /<\/?([a-zA-Z][\w-]*)\b([^>]*)>/g;
    let last = 0, match;
    const text = (from, to) => { const piece = body.slice(from, to).trim(); if (HANGUL.test(piece) && stack.length && stack[stack.length - 1].marked) { texts.add(piece); stack[stack.length - 1].hit = true; } };
    while ((match = tag.exec(body))) {
        text(last, match.index);
        last = tag.lastIndex;
        const [whole, name, attributes] = match;
        if (whole.startsWith('</')) { const open = stack.pop(); if (open && open.marked && !open.hit) useless++; continue; }
        const marked = /\sdata-i18n(?=[\s>=\/])/.test(whole) && !/\sdata-i18n=/.test(whole);
        if (marked) marks++;
        for (const [, names] of attributes.matchAll(/\sdata-i18n-attr="([^"]*)"/g)) for (const attribute of names.split(/\s+/).filter(Boolean)) {
            const value = new RegExp(`\\s${attribute}="([^"]*)"`).exec(attributes);
            if (value && value[1].trim()) texts.add(value[1].trim()); else failures.push(`index.html: data-i18n-attr가 가리키는 ${attribute}이 비었다: ${whole.slice(0, 80)}`);
        }
        if (!VOID.has(name.toLowerCase()) && !whole.endsWith('/>')) stack.push({ name, marked, hit: false });
    }
    if (useless) failures.push(`index.html: 바로 아래에 글이 없는 data-i18n 요소 ${useless}개(자식 요소 안의 글은 그 요소에 단다)`);
    return [...texts];
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
function fakeElement(text, attrs = {}, child = null) {
    const node = { nodeType: 3, nodeValue: text };
    const element = { dataset: {}, node, childNodes: child ? [node, child] : [node], attrs: { ...attrs } };
    element.hasAttribute = name => name in element.attrs;
    element.getAttribute = name => (name in element.attrs ? element.attrs[name] : null);
    element.setAttribute = (name, value) => { element.attrs[name] = String(value); };
    return element;
}

function buildI18nRuntime(search, extraEnglish) {
    const textEl = fakeElement(' 화면 배율 ', {}, { nodeType: 1, childNodes: [] }), attrEl = fakeElement('', { 'aria-label': '설정 분류' });
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
    assert.strictEqual(run.textEl.node.nodeValue, ' UI scale ', 'data-i18n 요소의 글 마디가 공백을 지킨 채 옮겨지고 자식 요소는 그대로다');
    assert.strictEqual(run.textEl.childNodes.length, 2);
    assert.strictEqual(run.attrEl.getAttribute('aria-label'), 'Settings sections', 'data-i18n-attr 속성이 옮겨진다');
    i18n.setLanguage('en');
    assert.strictEqual(run.events.length, 1, '같은 언어로 다시 정하면 이벤트가 없다');
    i18n.setLanguage('ko');
    assert.strictEqual(run.textEl.node.nodeValue, ' 화면 배율 ', '원문으로 되돌아간다');
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

// ── 원문 모으기(보고·표) ─────────────────────────────────────────────────────
const NAME_PROPS = /\b(?:name|label|title|blindLabel|bossName)\s*:\s*(['"])((?:\\.|(?!\1).)*[가-힣](?:\\.|(?!\1).)*)\1/g;
const DESC_PROPS = /\b(?:desc|description|uniqueEffect|note|text|hint|body|lore|flavor|tip|summary)\s*:\s*(['"])((?:\\.|(?!\1).)*[가-힣](?:\\.|(?!\1).)*)\1/g;

function lineOf(text, index) { return text.slice(0, index).split('\n').length; }
function snippet(text, index) {
    const start = text.lastIndexOf('\n', index) + 1, end = text.indexOf('\n', index);
    return text.slice(start, end < 0 ? text.length : end).trim().slice(0, 160);
}
function unescapeLiteral(raw) { return raw.replace(/\\n/g, '\n').replace(/\\(['"\\])/g, '$1'); }

/** 열쇠 → 쓰인 자리들. _t('…') 호출과 index.html의 data-i18n 글이 기본이고, names·descs는 데이터 속성값도 더한다. */
function collectKeys(sources, options = {}) {
    const keys = new Map();
    const add = (key, file, text, index) => {
        if (!keys.has(key)) keys.set(key, []);
        keys.get(key).push(`${file}:${lineOf(text, index)}  ${snippet(text, index)}`);
    };
    for (const { file, text } of sources) {
        if (file === 'js/i18n.js') continue;   // 머리말의 보기는 열쇠가 아니다
        for (const match of text.matchAll(STATIC_KEY_CALL)) add(unescapeLiteral(match[2]), file, text, match.index);
        if (file === 'index.html') {
            for (const key of options.staticKeys || []) { const at = text.indexOf(key); if (at >= 0) add(key, file, text, at); }
            continue;
        }
        if (options.names) for (const match of text.matchAll(NAME_PROPS)) add(unescapeLiteral(match[2]), file, text, match.index);
        if (options.descs) for (const match of text.matchAll(DESC_PROPS)) add(unescapeLiteral(match[2]), file, text, match.index);
    }
    return keys;
}

// ── 보고 ─────────────────────────────────────────────────────────────────────
function countHangulLines(sources, prefix, pattern) {
    return sources.filter(source => source.file.startsWith(prefix))
        .reduce((sum, { text }) => sum + text.split('\n').filter(line => pattern.test(line)).length, 0);
}

function report(packs, sources, staticKeys, identifierCounts) {
    const quoted = /['"`][^'"`]*[가-힣]/;
    const keys = collectKeys(sources, { staticKeys });
    const calls = [...keys.values()].reduce((sum, where) => sum + where.filter(place => !place.startsWith('index.html')).length, 0);
    console.log('── 언어 진행 보고 ──');
    console.log(`한국어 글이 든 줄: js ${countHangulLines(sources, 'js/', quoted)}, data ${countHangulLines(sources, 'data/', quoted)}, index.html ${countHangulLines(sources, 'index.html', HANGUL)}`);
    console.log(`_t() 호출 ${calls}개, index.html data-i18n ${staticKeys.length}개, 서로 다른 열쇠 ${keys.size}개`);
    console.log(`한국어 식별자 ${Object.values(identifierCounts).reduce((sum, count) => sum + count, 0)}개(${Object.keys(identifierCounts).length}개 파일, 기준선 scripts/i18n-baseline.json)`);
    for (const { pack } of packs) {
        if (!Object.keys(pack.strings).length) { console.log(`${pack.code}: 원문 언어`); continue; }
        const missing = [...keys.keys()].filter(key => !(key in pack.strings));
        console.log(`${pack.code}: 번역 ${Object.keys(pack.strings).length}개, 코드·HTML의 열쇠 ${keys.size}개 중 번역 없음 ${missing.length}개 (표: --export ${pack.code})`);
        missing.slice(0, 40).forEach(key => console.log(`  - ${key}`));
        if (missing.length > 40) console.log(`  … ${missing.length - 40}개 더`);
    }
}

// ── 번역 표 내보내기·넣기 ───────────────────────────────────────────────────────
function packFile(code) { return `${LOCALES_DIR}/${code}.js`; }

function exportTable(code, pack, sources, staticKeys, argv) {
    const out = argv.find((arg, index) => index > 0 && argv[index - 1] === code && !arg.startsWith('--')) || `artifacts/i18n/${code}-missing.json`;
    const keys = collectKeys(sources, { staticKeys, names: argv.includes('--names'), descs: argv.includes('--descs') });
    const rows = [];
    for (const [key, where] of keys) {
        if (!argv.includes('--all') && key in pack.strings) continue;
        rows.push({ key, [code]: pack.strings[key] || '', params: [...placeholders(key)], where: where.slice(0, 5) });
    }
    rows.sort((a, b) => a.where[0].localeCompare(b.where[0]));
    fs.mkdirSync(path.dirname(path.join(ROOT, out)), { recursive: true });
    fs.writeFileSync(path.join(ROOT, out), JSON.stringify(rows, null, 1) + '\n');
    console.log(`${code}: 원문 ${rows.length}개를 ${out}에 썼다. ${code} 칸을 채운 뒤 --import ${code} ${out}`);
}

function jsString(text) { return /['\n\r\\]/.test(text) ? JSON.stringify(text) : `'${text}'`; }   // 줄바꿈·따옴표는 JSON 꼴("…\n…")로
function jsValue(value) { return typeof value === 'string' ? jsString(value) : `{ ${Object.entries(value).map(([k, v]) => `${k}: ${jsString(v)}`).join(', ')} }`; }

function importTable(code, file) {
    const rows = JSON.parse(fs.readFileSync(path.resolve(ROOT, file), 'utf8'));
    const target = path.join(ROOT, packFile(code));
    let source = fs.readFileSync(target, 'utf8');
    if (source.lastIndexOf('    })\n});') < 0) throw new Error(`${packFile(code)}: strings를 닫는 '    })\\n});'를 찾지 못했다`);
    const filled = rows.filter(row => row && typeof row.key === 'string' && row[code] && (typeof row[code] === 'string' ? row[code].trim() : typeof row[code] === 'object'));
    const added = [];
    let replaced = 0;
    for (const row of filled) {
        const value = typeof row[code] === 'string' ? row[code].trim() : row[code];
        const line = new RegExp(`^(\\s*)(?:'${row.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "\\\\'")}'|${JSON.stringify(row.key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}):\\s*(?:'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"|\\{[^}]*\\})(,?)\\s*$`, 'm');
        if (line.test(source)) { source = source.replace(line, (whole, indent, comma) => `${indent}${jsString(row.key)}: ${jsValue(value)}${comma}`); replaced++; }
        else added.push(`        ${jsString(row.key)}: ${jsValue(value)},`);
    }
    if (added.length) {
        const close = source.lastIndexOf('    })\n});');   // 값을 바꾼 뒤에 찾는다(바뀐 길이만큼 자리가 밀린다)
        let head = source.slice(0, close).replace(/\s+$/, '');
        if (!head.endsWith(',') && !head.endsWith('{')) head += ',';
        source = `${head}\n        // ── ${new Date().toISOString().slice(0, 10)} 표에서 넣음(${file}) ──\n${added.join('\n')}\n${source.slice(close)}`;
    }
    try { espree.parse(source, { ecmaVersion: 'latest', sourceType: 'script' }); } catch (error) { throw new Error(`${packFile(code)}: 넣은 결과가 JS로 읽히지 않아 쓰지 않았다(${error.message}). 표의 값에 따옴표나 줄바꿈이 있는지 본다`); }
    fs.writeFileSync(target, source);
    console.log(`${packFile(code)}: 새 열쇠 ${added.length}개, 바뀐 값 ${replaced}개 (표의 ${rows.length}줄 중 채워진 ${filled.length}줄)`);
}

function main() {
    const argv = process.argv.slice(2);
    const importAt = argv.indexOf('--import');
    if (importAt >= 0) importTable(argv[importAt + 1], argv[importAt + 2]);
    const failures = [];
    const sources = readSources();
    const packs = loadPacks();
    if (!packs.some(({ pack }) => pack && pack.code === 'ko')) failures.push(`${LOCALES_DIR}: 원문 언어 팩(ko)이 없다`);
    for (const { name, pack } of packs) { checkPackShape(name, pack, failures); if (pack && pack.strings) checkOrphans(name, pack, sources, failures); }
    checkFixedLocales(sources, failures);
    const staticKeys = staticTexts(sources.find(source => source.file === 'index.html').text, failures);
    const identifierCounts = hangulIdentifierCounts(sources);
    if (argv.includes('--baseline')) writeBaseline(identifierCounts);
    checkIdentifierRatchet(identifierCounts, failures);
    testTranslationBehaviour();
    testAppliedSettings();
    if (argv.includes('--report')) report(packs, sources, staticKeys, identifierCounts);
    const exportAt = argv.indexOf('--export');
    if (exportAt >= 0) {
        const code = argv[exportAt + 1], found = packs.find(({ pack }) => pack && pack.code === code);
        if (!found) failures.push(`--export: ${code} 팩이 없다(${LOCALES_DIR}/${code}.js)`);
        else exportTable(code, found.pack, sources, staticKeys, argv);
    }
    if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; return; }
    console.log(`check-i18n passed (${packs.length} language packs, ${staticKeys.length} static texts)`);
}

main();
