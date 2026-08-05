const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function readFunctionSource(source, name) {
    const start = source.indexOf(`function ${name}(`);
    assert.ok(start >= 0, `${name} must exist`);
    const declarationStart = source.slice(Math.max(0, start - 6), start) === 'async ' ? start - 6 : start;
    let depth = 0;
    for (let index = source.indexOf('{', start); index < source.length; index++) {
        if (source[index] === '{') depth++;
        if (source[index] !== '}') continue;
        depth--;
        if (depth === 0) return source.slice(declarationStart, index + 1);
    }
    throw new Error(`${name} must have a closing brace`);
}

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/base.css', 'utf8');
const windowCss = fs.readFileSync('css/ui-windows.css', 'utf8');
const select = { value: '' };
const quickButton = { textContent: '', title: '', hidden: true };
let saved = 0;
let refreshed = 0;
let toast = null;
let choiceOptions = null;
let groupingActive = true;
const context = {
    game: { settings: { mapCompleteAction: 'nextZone' } },
    document: {
        getElementById(id) {
            if (id === 'sel-map-complete-action') return select;
            if (id === 'btn-map-complete-action-picker') return quickButton;
            return null;
        }
    },
    isTabGroupingActive() { return groupingActive; },
    getActiveTabGroup() { return 'etc'; },
    queueImportantSave() { saved++; },
    updateStaticUI() { refreshed++; },
    showGameToast(message, options) { toast = { message, options }; },
    async requestGameChoice(options) {
        choiceOptions = options;
        return 'nextLoopBestPlusOne';
    },
    mapCompleteActionPickerOpen: false
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const functionNames = [
    'getMapCompleteActionOptions',
    'getMapCompleteActionOption',
    'syncMapCompleteActionQuickControl',
    'applyMapCompleteAction',
    'openMapCompleteActionPicker'
];
vm.runInContext(functionNames.map(name => readFunctionSource(uiSource, name)).join('\n'), context, { filename: 'map-complete-action.js' });

context.syncMapCompleteActionQuickControl();
assert.strictEqual(quickButton.hidden, false, '기타 그룹에서는 설정 탭 옆 빠른 버튼이 보여야 한다');
assert.strictEqual(quickButton.textContent, '전투 완료: 다음 지역', '빠른 버튼에서 현재 설정을 바로 확인할 수 있어야 한다');
assert(quickButton.title.includes('현재: 다음 지역'));
groupingActive = false;
context.syncMapCompleteActionQuickControl();
assert.strictEqual(quickButton.hidden, false, '그룹을 쓰지 않는 창 UI에서도 빠른 버튼이 보여야 한다');

let prevented = 0;
context.openMapCompleteActionPicker({ preventDefault() { prevented++; }, stopPropagation() { prevented++; } }).then(() => {
    assert.strictEqual(prevented, 2, '빠른 버튼 클릭은 탭 전환 클릭으로 전달되면 안 된다');
    assert.deepStrictEqual(
        Array.from(choiceOptions.choices, option => option.value).sort(),
        ['nextLoopBestPlusOne', 'nextZone', 'repeatZone', 'stop'],
        '오버레이는 네 가지 전투 완료 행동을 모두 제공해야 한다'
    );
    assert.strictEqual(choiceOptions.choices[0].value, 'nextZone', '현재 행동이 오버레이의 기본 선택이어야 한다');
    assert.strictEqual(choiceOptions.submitOnChoice, true, '항목을 누르면 적용 버튼 없이 즉시 확정되어야 한다');
    assert.strictEqual(context.game.settings.mapCompleteAction, 'nextLoopBestPlusOne');
    assert.strictEqual(select.value, 'nextLoopBestPlusOne');
    assert.strictEqual(quickButton.textContent, '전투 완료: 최고층');
    assert(quickButton.title.includes('현재: 최고층'));
    assert.strictEqual(saved, 1);
    assert.strictEqual(refreshed, 1);
    assert.strictEqual(toast.options.tone, 'success');

    const headerStart = html.indexOf('<div class="tab-header">');
    const settingsIndex = html.indexOf('id="btn-tab-settings"', headerStart);
    const quickControlIndex = html.indexOf('id="btn-map-complete-action-picker"', headerStart);
    assert(settingsIndex > headerStart && quickControlIndex > settingsIndex, '빠른 버튼은 설정 탭 바로 옆에 있어야 한다');
    assert(!html.includes('id="map-complete-action-menu"'), '별도 팝업 메뉴는 남기지 않아야 한다');
    assert(html.includes('class="tab-btn" id="btn-map-complete-action-picker"'), '빠른 버튼 자체가 별도 래퍼 없이 일반 탭 요소여야 한다');
    assert(!html.includes('id="tab-etc-combat-action"'), '일반 탭 바깥에 별도 버튼 래퍼를 두면 안 된다');
    assert(!css.includes('.tab-etc-combat-action'), '전투 완료 버튼만을 위한 별도 시각 규칙을 남기면 안 된다');
    assert(windowCss.includes("#btn-map-complete-action-picker::before { content: '↻';"), '데스크톱 탭에 의미 있는 전투 반복 아이콘이 보여야 한다');
    assert(windowCss.includes('#btn-map-complete-action-picker { white-space: normal;'), '현재 설정 문구가 탭 안에서 두 줄로 보여야 한다');
    assert(html.includes('<option value="repeatZone">반복</option>'));
    assert(html.includes('<option value="nextZone">다음 지역</option>'));
    assert(html.includes('<option value="nextLoopBestPlusOne">최고층</option>'));
    assert(html.includes('<option value="stop">중단</option>'));
    console.log('smoke-map-complete-action-picker passed');
}).catch(error => {
    console.error(error);
    process.exitCode = 1;
});
