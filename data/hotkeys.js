// PC 단축키로 부를 수 있는 동작과 기본 키(KeyboardEvent.code). 사용자가 바꾼 키는
// settings.hotkeyOverrides(기본값과 다른 것만, ''는 해제)에 저장되고 js/hotkeys.js가 해석한다.
// Esc(창 닫기)는 고정이라 여기에 없다. 순서는 설정 화면 표시 순서이자 충돌 시 앞선 동작이 키를 지키는 순서다.
const HOTKEY_ACTIONS = Object.freeze([
    { id: 'window:tab-character', kind: 'window', target: 'tab-character', label: '캐릭터', code: 'KeyC' },
    { id: 'window:tab-char', kind: 'window', target: 'tab-char', label: '스킬트리', code: 'KeyP' },
    { id: 'window:tab-items', kind: 'window', target: 'tab-items', label: '장비', code: 'KeyI' },
    { id: 'window:tab-map', kind: 'window', target: 'tab-map', label: '지도', code: 'KeyM' },
    { id: 'window:tab-skills', kind: 'window', target: 'tab-skills', label: '스킬 젬', code: 'KeyG' },
    { id: 'window:tab-journal', kind: 'window', target: 'tab-journal', label: '기록', code: 'KeyJ' },
    { id: 'flask:0', kind: 'flask', target: 0, label: '생명력 플라스크', code: 'Digit1' },
    { id: 'flask:1', kind: 'flask', target: 1, label: '보조 플라스크 1', code: 'Digit2' },
    { id: 'flask:2', kind: 'flask', target: 2, label: '보조 플라스크 2', code: 'Digit3' },
    { id: 'flask:3', kind: 'flask', target: 3, label: '보조 플라스크 3', code: 'Digit4' },
    { id: 'flask:4', kind: 'flask', target: 4, label: '보조 플라스크 4', code: 'Digit5' }
].map(Object.freeze));

// 바꿀 수 있는 키: 글자·숫자·숫자패드와 기호 몇 개. 브라우저 동작과 겹치는 Esc·Tab·Enter·Space·F키는 제외.
const HOTKEY_ASSIGNABLE_CODE = /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Backquote|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash)$/;

safeExposeData({ HOTKEY_ACTIONS, HOTKEY_ASSIGNABLE_CODE });
