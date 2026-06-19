const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const components = fs.readFileSync('css/components.css', 'utf8');
const state = fs.readFileSync('js/state.js', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');

assert(html.includes('id="passive-search-clear">검색초기화</button>'), 'passive search clear button label must be 검색초기화');
['chk-exp-comma', 'chk-hp-comma', 'chk-enemy-hp-comma', 'chk-character-comma'].forEach(id => {
  assert(html.includes(`id="${id}"`), `${id} setting checkbox must exist`);
});
['showExpComma', 'showHpComma', 'showEnemyHpComma', 'showCharacterComma'].forEach(key => {
  assert(state.includes(`${key}: true`), `${key} must default to true`);
  assert(ui.includes(`merged.settings.${key} = merged.settings.${key} !== false;`), `${key} save normalization must preserve default-on behavior`);
});
assert(components.includes('@media (min-width: 1481px)') && components.includes('.combat-dashboard { grid-template-columns: 1fr;'), 'large combat layout must move log below the combat stage');
assert(components.includes('.battlefield-wrap { height: clamp(300px, 44vh, 460px); }'), 'large combat battlefield must be expanded');
assert(ui.includes("formatSettingNumber(game.exp, 'showExpComma')"), 'experience text must use the experience comma setting');
assert(ui.includes("formatSettingNumber(pStats.maxHp, 'showHpComma')"), 'player health text must use the health comma setting');
assert(ui.includes("formatSettingNumber(focusedEnemy.maxHp, 'showEnemyHpComma')"), 'enemy health text must use the enemy health comma setting');
assert(ui.includes("formatSettingNumber(pStats.baseDmg, 'showCharacterComma')"), 'character tab stat text must use the character comma setting');
