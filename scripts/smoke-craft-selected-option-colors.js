#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const ui = fs.readFileSync('js/ui.js', 'utf8');
const css = fs.readFileSync('css/components.css', 'utf8');

assert(ui.includes('class="tooltip-line craft-option-line craft-option-line--base" style="color:${getItemStatToneColor(stat.id)}"'), 'selected craft base options must use stat tone colors');
assert(ui.includes('class="tooltip-line craft-option-line" style="color:${getItemStatToneColor(stat.id)}"'), 'selected craft explicit options must use stat tone colors');
assert(ui.includes('document.getElementById(\'forge-item-display\').innerHTML = `${craftTargetControls}<div class="craft-selected-body">${craftSelectedBodyHtml}</div>`;'), 'selected craft item body must avoid the old wide right padding');
assert(!ui.includes('padding-right:86px;">${craftSelectedBodyHtml}</div>'), 'selected craft item body must not reserve excessive right padding that forces wrapping');
assert(css.includes('.craft-selected-body'), 'selected craft body layout styles must exist');
assert(css.includes('.craft-option-line'), 'selected craft option line wrapping styles must exist');
assert(css.includes('word-break: keep-all;'), 'selected craft option lines should reduce Korean option label mid-word wrapping');
assert(css.includes('.craft-option-line .tier-badge'), 'selected craft tier badges should stay attached to option text');

console.log('craft selected option color smoke checks passed');
