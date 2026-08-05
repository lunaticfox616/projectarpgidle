const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const mobileCss = fs.readFileSync('css/mobile.css', 'utf8');
const gameCss = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');

assert.ok(html.includes('id="ui-combat-flasks"'), 'combat HUD should expose the flask charge strip');
assert.ok(mobileCss.includes('height: clamp(210px, 42svh, 360px) !important'), 'phone battlefields need a playable viewport height');
assert.ok(mobileCss.includes('grid-template-columns: repeat(2, minmax(0, 1fr)) !important'), 'dense mobile map layouts should collapse to two columns');
assert.ok(mobileCss.includes('@media (max-width: 480px)'), 'small phones need a dedicated one-column breakpoint');
assert.ok(gameCss.includes('.gem-engrave-slot-dialog'), 'engraving slot selection needs a responsive in-game dialog');
assert.ok(gameCss.includes('.combat-flask-mini'), 'combat flask charges need dedicated readable controls');
assert.ok(ui.indexOf('function renderCombatFlaskHud()') < ui.indexOf('function updateCombatUI('), 'the dynamic combat HUD renderer must live in updateCombatUI scope');

console.log('smoke-mobile-playability passed');
