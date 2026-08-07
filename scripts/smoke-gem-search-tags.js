const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

function readFunctionSource(source, name) {
    const start = source.indexOf(`function ${name}`);
    assert.ok(start >= 0, `${name} must exist`);
    let depth = 0;
    for (let index = source.indexOf('{', start); index < source.length; index++) {
        if (source[index] === '{') depth++;
        if (source[index] !== '}') continue;
        depth--;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`${name} must have a closing brace`);
}

const gameContext = buildGameRuntime();
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const attackDefinition = vm.runInContext("SKILL_DB['얼음 창']", gameContext);
const supportDefinition = vm.runInContext("SUPPORT_GEM_DB['수액 골렘 소환']", gameContext);
const searchContext = {
    translateSkillTag: gameContext.translateSkillTag,
    getStatName: gameContext.getStatName
};
vm.createContext(searchContext);
vm.runInContext([
    readFunctionSource(uiSource, 'matchSearchQuery'),
    readFunctionSource(uiSource, 'isGemLibraryMatchVisible'),
    readFunctionSource(uiSource, 'getGemSearchText'),
    'this.matchSearchQuery = matchSearchQuery; this.isGemLibraryMatchVisible = isGemLibraryMatchVisible; this.getGemSearchText = getGemSearchText;'
].join('\n'), searchContext);

function matches(name, definition, query) {
    const searchable = searchContext.getGemSearchText(name, definition);
    return searchContext.matchSearchQuery(searchable, query);
}

assert.strictEqual(matches('얼음 창', attackDefinition, '투사체 냉기'), true,
    '공격 젬은 화면에 표시되는 한글 태그 조합으로 검색되어야 한다');
assert.strictEqual(matches('얼음 창', attackDefinition, 'projectile cold'), true,
    '기존 영문 내부 태그 검색도 유지되어야 한다');
assert.strictEqual(matches('얼음 창', attackDefinition, '화염'), false,
    '관련 없는 한글 태그로는 공격 젬이 검색되면 안 된다');

assert.strictEqual(matches('수액 골렘 소환', supportDefinition, '방어형 소환수 물리'), true,
    '태그가 있는 보조 젬도 화면의 한글 태그로 검색되어야 한다');
assert.strictEqual(matches('수액 골렘 소환', supportDefinition, 'summon_guard physical'), true,
    '보조 젬의 기존 영문 내부 태그 검색도 유지되어야 한다');

const armorBreakDefinition = vm.runInContext("SUPPORT_GEM_DB['갑주 파쇄']", gameContext);
assert.strictEqual(matches('갑주 파쇄', armorBreakDefinition, '물피감'), true,
    '보조 젬 카드에 표시되는 효과명으로 검색되어야 한다');
assert.strictEqual(matches('갑주 파쇄', armorBreakDefinition, 'physIgnore'), true,
    '보조 젬의 내부 능력치 태그도 검색되어야 한다');
assert.strictEqual(searchContext.isGemLibraryMatchVisible(
    searchContext.getGemSearchText('갑주 파쇄', armorBreakDefinition), '물피감', true, false
), true, '검색 중에는 장착 젬만 보기 상태여도 일치하는 미장착 보조 젬을 보여야 한다');
assert.strictEqual(searchContext.isGemLibraryMatchVisible(
    searchContext.getGemSearchText('갑주 파쇄', armorBreakDefinition), '', true, false
), false, '검색어가 없을 때 장착 젬만 보기 동작은 유지되어야 한다');

console.log('smoke-gem-search-tags passed');
