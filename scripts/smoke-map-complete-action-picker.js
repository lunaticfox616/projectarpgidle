const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function readFunctionSource(source, name) {
    const start = source.indexOf(`function ${name}(`);
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

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/base.css', 'utf8');
const select = { value: '' };
const quickButton = {
    textContent: '', title: '',
    getBoundingClientRect() { return { top: 40, bottom: 80, right: 500 }; }
};
const quickRow = { hidden: true };
const quickMenu = { hidden: true, innerHTML: '', onclick: null, offsetWidth: 300, offsetHeight: 240, style: {} };
let saved = 0;
let refreshed = 0;
let toast = null;
let groupingActive = true;
const context = {
    game: { settings: { mapCompleteAction: 'nextZone' } },
    document: {
        documentElement: { clientWidth: 1024, clientHeight: 768 },
        getElementById(id) {
            if (id === 'sel-map-complete-action') return select;
            if (id === 'tab-etc-combat-action') return quickRow;
            if (id === 'btn-map-complete-action-picker') return quickButton;
            if (id === 'map-complete-action-menu') return quickMenu;
            return null;
        }
    },
    isTabGroupingActive() { return groupingActive; },
    getActiveTabGroup() { return 'etc'; },
    queueImportantSave() { saved++; },
    updateStaticUI() { refreshed++; },
    showGameToast(message, options) { toast = { message, options }; },
    innerWidth: 1024,
    innerHeight: 768
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const functionNames = [
    'getMapCompleteActionOptions',
    'getMapCompleteActionOption',
    'closeMapCompleteActionMenu',
    'syncMapCompleteActionQuickControl',
    'positionMapCompleteActionMenu',
    'renderMapCompleteActionMenu',
    'applyMapCompleteAction',
    'openMapCompleteActionPicker'
];
vm.runInContext(functionNames.map(name => readFunctionSource(uiSource, name)).join('\n'), context, { filename: 'map-complete-action.js' });

context.syncMapCompleteActionQuickControl();
assert.strictEqual(quickRow.hidden, false, '기타 그룹에서는 설정 탭 옆 빠른 버튼이 보여야 한다');
assert.strictEqual(quickButton.textContent, '전투 완료 후: 다음 지역');
groupingActive = false;
context.syncMapCompleteActionQuickControl();
assert.strictEqual(quickRow.hidden, false, '그룹을 쓰지 않는 창 UI에서도 설정 탭 옆 빠른 버튼이 보여야 한다');
groupingActive = true;

let prevented = 0;
context.openMapCompleteActionPicker({ preventDefault() { prevented++; }, stopPropagation() { prevented++; } });
assert.strictEqual(prevented, 2, '빠른 버튼 클릭은 탭 헤더의 다른 클릭 처리로 전달되면 안 된다');
assert.strictEqual(quickMenu.hidden, false, '빠른 버튼은 작은 선택 메뉴를 열어야 한다');
assert(quickMenu.innerHTML.includes('data-map-complete-action="repeatZone"'));
assert(quickMenu.innerHTML.includes('data-map-complete-action="nextLoopBestPlusOne"'));
assert.strictEqual(quickMenu.style.top, '86px', '선택 메뉴는 빠른 버튼 바로 아래에 배치되어야 한다');

quickMenu.onclick({
    target: {
        closest() { return { dataset: { mapCompleteAction: 'nextLoopBestPlusOne' } }; }
    }
});
assert.strictEqual(context.game.settings.mapCompleteAction, 'nextLoopBestPlusOne');
assert.strictEqual(select.value, 'nextLoopBestPlusOne');
assert.strictEqual(quickButton.textContent, '전투 완료 후: 최고층');
assert.strictEqual(quickMenu.hidden, true, '행동을 선택하면 작은 메뉴가 닫혀야 한다');
assert.strictEqual(saved, 1);
assert.strictEqual(refreshed, 1);
assert.strictEqual(toast.options.tone, 'success');

const firstHeaderStart = html.indexOf('<div class="tab-header">');
const firstHeaderEnd = html.indexOf('</div>', html.indexOf('tab-etc-combat-action', firstHeaderStart));
const settingsIndex = html.indexOf('id="btn-tab-settings"', firstHeaderStart);
const quickControlIndex = html.indexOf('id="tab-etc-combat-action"', firstHeaderStart);
assert(settingsIndex > firstHeaderStart && quickControlIndex > settingsIndex && quickControlIndex < firstHeaderEnd, '빠른 버튼은 기타의 설정 탭 바로 옆에 있어야 한다');
assert(css.includes('.tab-etc-combat-action[hidden], .map-complete-action-menu[hidden] { display: none; }'), '숨긴 빠른 버튼과 메뉴가 화면을 가리면 안 된다');
assert(css.includes('.map-complete-action-menu { position: fixed;'), '선택 메뉴는 전체 화면 모달이 아닌 작은 팝오버여야 한다');
assert(html.includes('<option value="repeatZone">반복</option>'));
assert(html.includes('<option value="nextZone">다음 지역</option>'));
assert(html.includes('<option value="nextLoopBestPlusOne">최고층</option>'));
assert(html.includes('<option value="stop">중단</option>'));
console.log('smoke-map-complete-action-picker passed');
