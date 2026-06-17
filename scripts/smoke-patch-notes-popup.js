#!/usr/bin/env node
// Patch notes must be shown via a button-triggered scrollable popup, not rendered inline on the
// startup screen or settings tab (so a growing changelog never bloats those screens).
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');
const css = fs.readFileSync('css/ui-premium.css', 'utf8');

// Old inline containers must be gone.
assert(!html.includes('id="startup-patch-notes"'), 'startup inline patch-note container must be removed');
assert(!html.includes('id="ui-patch-notes-settings"'), 'settings inline patch-note container must be removed');

// Both entry points must now be buttons that open the popup.
const openButtons = html.match(/onclick="openPatchNotes\(\)"/g) || [];
assert(openButtons.length >= 2, 'startup and settings must each have a 패치 노트 보기 button');

// The popup modal and its scrollable body must exist.
assert(html.includes('id="patch-notes-overlay"'), 'patch notes popup overlay must exist');
assert(html.includes('id="patch-notes-overlay-body"'), 'patch notes popup scroll body must exist');
assert(/class="[^"]*patch-notes-modal-body[^"]*"/.test(html), 'popup body must use the scrollable modal class');
assert(html.includes('onclick="closePatchNotes()"'), 'popup must have a close button');
assert(html.includes('if(event.target===this)closePatchNotes()'), 'clicking the backdrop must close the popup');

// JS wiring: open/close helpers and the render target must point at the popup body only.
assert(/function openPatchNotes\(\)/.test(ui), 'openPatchNotes must be defined');
assert(/function closePatchNotes\(\)/.test(ui), 'closePatchNotes must be defined');
assert(ui.includes("getElementById('patch-notes-overlay-body')"), 'applyPatchNotesHTML must target the popup body');
assert(!ui.includes("'ui-patch-notes-settings'") && !ui.includes("'startup-patch-notes'"),
  'JS must not reference the removed inline containers');

// Scrollable styling.
assert(/\.patch-notes-modal-body\s*\{[^}]*overflow|\.patch-note-body\s*\{[^}]*overflow-y:\s*auto/.test(css) || css.includes('overflow-y: auto'),
  'patch note body must be scrollable');
assert(/\.patch-notes-modal-body\s*\{[^}]*max-height/.test(css), 'popup body must cap its height for scrolling');
assert(css.includes('.patch-notes-open-btn'), 'open button must be styled');
// Popup must sit above the startup overlay (z-index 14000) so it opens on the main screen too.
assert(/#patch-notes-overlay\s*\{[^}]*z-index:\s*1[5-9]\d{3}/.test(css), 'patch notes popup must have a z-index above the startup overlay');

console.log('patch notes popup smoke checks passed');
