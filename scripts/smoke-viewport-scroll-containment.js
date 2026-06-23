#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const baseCss = fs.readFileSync('css/base.css', 'utf8');

assert(baseCss.includes('html { height: 100%; overflow: hidden; }'), 'document root must not create a page-level scrollbar');
assert(baseCss.includes('height: 100dvh') && baseCss.includes('overflow: hidden;'), 'body must be viewport-bound and hide page-level overflow');
assert(!baseCss.includes('overflow-y: auto; -webkit-text-size-adjust'), 'body must not keep the old page-level vertical scrollbar');
assert(baseCss.includes('.tab-content { padding: 15px; display: none; overflow-y: auto;'), 'tab contents must retain internal vertical scrolling');
assert(baseCss.includes('#log { flex: 1 1 auto;') && baseCss.includes('overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;'), 'combat log must retain its own contained scrollbar');
assert(baseCss.includes('#right-pane {') && baseCss.includes('overflow: hidden; position: relative;'), 'right pane must clip to the viewport while tab contents scroll internally');

console.log('viewport scroll containment smoke checks passed');
