#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const ui = fs.readFileSync('js/ui.js', 'utf8');

assert(ui.includes('function buildTalismanTooltipHtml(talisman)'), 'talisman tooltip HTML builder must be shared');
assert(ui.includes('function showTalismanUnsealTooltip(event)'), 'unseal candidate tooltip handler must exist');
assert(ui.includes('buildTalismanTooltipHtml(current)'), 'unseal tooltip must render the current candidate with exact options');
assert(ui.includes('onmouseenter="showTalismanUnsealTooltip(event)"'), 'unseal candidate row must show the tooltip on hover');
assert(ui.includes('onmousemove="showTalismanUnsealTooltip(event)"'), 'unseal candidate row must update the tooltip while hovering');
assert(ui.includes('onmouseleave="hideInfoTooltip()"'), 'unseal candidate row must hide the tooltip on leave');
assert(ui.includes('getTalismanTooltipStatLines(talisman)'), 'tooltip builder must include rolled talisman stat lines');
assert(ui.includes('getTalismanSpecialDescription(talisman)'), 'tooltip builder must include special talisman effects');

console.log('talisman unseal tooltip smoke checks passed');
