const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');
const combat = fs.readFileSync('js/combat.js', 'utf8');
const canvas = fs.readFileSync('js/canvas-battlefield.js', 'utf8');
const css = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');
const utils = fs.readFileSync('js/utils.js', 'utf8');

assert.strictEqual((html.match(/data-loop10-panel=/g) || []).length, 1, 'deep-climb panel must only exist once');
assert.ok(html.includes('btn-toggle-past-loop-milestones') && ui.includes('collapsePastLoopMilestones'), 'past loop milestones need a collapse control');
assert.ok(css.includes('.enemy-card .hp-bar-bg') && css.includes('background: transparent !important'), 'combat health boxes need transparent styling');
assert.ok(!canvas.includes("ctx.fillStyle = 'rgba(36, 48, 62, 0.95)'"), 'player canvas health track must be transparent');
assert.ok(combat.includes('전장 이동: 칸당') && combat.includes('지도 진행도: 기본 대비'), 'movement tooltip needs grid and progress impact');
assert.ok(utils.includes("summonDps: { label: '소환 DPS'"), 'equipment comparison needs summon DPS');
assert.ok(canvas.includes('Math.round(hpWidth * hpPct)'), 'summon overhead health bar must be rendered');
assert.ok(!canvas.includes('fillText(`${Math.round(hpPct * 100)}%`'), 'summon overhead health percentage text must not be rendered');

console.log('smoke-requested-ui passed');
