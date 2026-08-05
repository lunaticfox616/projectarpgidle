const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function readFunctionSource(source, name) {
    const start = source.indexOf(`function ${name}(`);
    assert(start >= 0, `${name} must exist`);
    let depth = 0;
    for (let index = source.indexOf('{', start); index < source.length; index++) {
        if (source[index] === '{') depth++;
        if (source[index] !== '}') continue;
        depth--;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`${name} must have a closing brace`);
}

function createChoiceButton() {
    const attributes = { 'aria-pressed': 'false' };
    return {
        attributes,
        addEventListener(type, listener) {
            if (type === 'click') this.click = listener;
        },
        setAttribute(name, value) {
            attributes[name] = value;
        }
    };
}

const source = fs.readFileSync('js/ui-feedback.js', 'utf8');
const buttons = [createChoiceButton(), createChoiceButton()];
let submitted = 0;
const context = {
    Number,
    playUiFeedbackSound() {},
    submitActiveDialog() { submitted++; }
};
vm.createContext(context);
vm.runInContext([
    readFunctionSource(source, 'normalizeDialogOptions'),
    readFunctionSource(source, 'bindDialogControl')
].join('\n'), context, { filename: 'instant-choice-dialog.js' });

const instantDialog = context.normalizeDialogOptions({ type: 'choice', submitOnChoice: true });
assert.strictEqual(instantDialog.submitOnChoice, true, '즉시 선택 옵션을 보존해야 한다');
assert.strictEqual(context.normalizeDialogOptions({ type: 'choice' }).submitOnChoice, false, '다른 선택창은 기존 적용 방식을 유지해야 한다');

const control = {
    querySelectorAll(selector) {
        assert.strictEqual(selector, '.game-choice-option');
        return buttons;
    }
};
context.bindDialogControl(instantDialog, control);
buttons[1].click();
assert.strictEqual(buttons[0].attributes['aria-pressed'], 'false');
assert.strictEqual(buttons[1].attributes['aria-pressed'], 'true');
assert.strictEqual(submitted, 1, '선택 항목 클릭 한 번으로 즉시 제출해야 한다');
assert(source.includes("confirm.style.display = activeDialog.type === 'choice' && activeDialog.submitOnChoice ? 'none' : '';"), '즉시 선택창은 적용 버튼을 숨겨야 한다');

console.log('smoke-instant-choice-dialog passed');
