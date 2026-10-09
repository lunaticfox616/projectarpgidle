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
    { id: 'combat:mobility', kind: 'combat', target: 'mobility', label: '이동 스킬 사용', code: 'KeyE' },
    // 2026-10-09: A는 걷기(WASD)가 쓰므로 자동 이동은 Q로 옮겼다(E 이동 스킬과 나란히).
    { id: 'combat:autoMove', kind: 'combat', target: 'autoMove', label: '자동 이동 켜고 끄기', code: 'KeyQ' },
    // 탐험 지도 걷기(2026-10-09 사용자 "wasd로도 움직일수있게해줘"): 누르는 동안 그쪽으로 걷고, 떼면 들어가던 칸에서 멈춘다.
    // 방향키도 늘 같은 일을 한다(바꿀 수 없는 키, js/hotkeys-ui.js ARROW_MOVES).
    { id: 'move:up', kind: 'move', target: 'up', label: '위로 걷기', code: 'KeyW' },
    { id: 'move:left', kind: 'move', target: 'left', label: '왼쪽으로 걷기', code: 'KeyA' },
    { id: 'move:down', kind: 'move', target: 'down', label: '아래로 걷기', code: 'KeyS' },
    { id: 'move:right', kind: 'move', target: 'right', label: '오른쪽으로 걷기', code: 'KeyD' }
].map(Object.freeze));

// 바꿀 수 있는 키: 글자·숫자·숫자패드와 기호 몇 개. 브라우저 동작과 겹치는 Esc·Tab·Enter·Space·F키는 제외.
const HOTKEY_ASSIGNABLE_CODE = /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Backquote|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash)$/;

safeExposeData({ HOTKEY_ACTIONS, HOTKEY_ASSIGNABLE_CODE });
