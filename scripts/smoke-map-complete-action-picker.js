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
const select = { value: '' };
const quickButton = { textContent: '', title: '' };
const quickRow = { hidden: true };
let saved = 0;
let refreshed = 0;
let toast = null;
let choiceOptions = null;
const context = {
    game: { settings: { mapCompleteAction: 'nextZone' } },
    document: {
        getElementById(id) {
            if (id === 'sel-map-complete-action') return select;
            if (id === 'tab-etc-combat-action') return quickRow;
            if (id === 'btn-map-complete-action-picker') return quickButton;
            return null;
        }
    },
    isTabGroupingActive() { return true; },
    getActiveTabGroup() { return 'etc'; },
    queueImportantSave() { saved++; },
    updateStaticUI() { refreshed++; },
    showGameToast(message, options) { toast = { message, options }; },
    async requestGameChoice(options) {
        choiceOptions = options;
        return 'nextLoopBestPlusOne';
    }
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
assert.strictEqual(quickRow.hidden, false, '기타 그룹에서는 전투 완료 행동 빠른 버튼이 보여야 한다');
assert.strictEqual(quickButton.textContent, '전투 완료 후: 다음 지역');

context.applyMapCompleteAction('repeatZone');
assert.strictEqual(context.game.settings.mapCompleteAction, 'repeatZone', '빠른 선택은 저장 설정을 바꿔야 한다');
assert.strictEqual(select.value, 'repeatZone', '빠른 선택은 설정 드롭다운에도 반영되어야 한다');
assert.strictEqual(quickButton.textContent, '전투 완료 후: 반복', '빠른 버튼은 현재 선택을 보여야 한다');
assert.strictEqual(saved, 1, '빠른 선택은 저장 대기열에 들어가야 한다');
assert.strictEqual(refreshed, 1, '빠른 선택은 UI를 갱신해야 한다');
assert.strictEqual(toast.options.tone, 'success');

context.openMapCompleteActionPicker().then(() => {
    assert.deepStrictEqual(
        Array.from(choiceOptions.choices, option => option.value).sort(),
        ['nextLoopBestPlusOne', 'nextZone', 'repeatZone', 'stop'],
        '오버레이는 네 가지 전투 완료 행동을 모두 제공해야 한다'
    );
    assert.strictEqual(choiceOptions.choices[0].value, 'repeatZone', '오버레이는 현재 행동을 기본 선택으로 열어야 한다');
    assert.strictEqual(context.game.settings.mapCompleteAction, 'nextLoopBestPlusOne', '오버레이 선택은 설정에 적용되어야 한다');
    assert.strictEqual(quickButton.textContent, '전투 완료 후: 최고층');
    assert(html.includes('<option value="repeatZone">반복</option>'));
    assert(html.includes('<option value="nextZone">다음 지역</option>'));
    assert(html.includes('<option value="nextLoopBestPlusOne">최고층</option>'));
    assert(html.includes('<option value="stop">중단</option>'));
    console.log('smoke-map-complete-action-picker passed');
}).catch(error => {
    console.error(error);
    process.exitCode = 1;
});
