#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const passivesSource = fs.readFileSync('js/passives.js', 'utf8');

assert(passivesSource.includes('game.codexNewlyRegistered[key] = true;'), 'new codex registrations must keep a per-item marker');
assert(uiSource.includes('신규 등록: ${newCodexLines.map(escapeHTML).join'), 'codex summary must list which slot/item was newly registered');
assert(uiSource.includes("return `${parts[0] || '기타'} > ${parts.slice(1).join('|') || '이름 없음'}`;"), 'new codex summary must include both slot and item name');
assert(uiSource.includes('let hasNewInSlot = entries.some'), 'codex renderer must detect slots that contain newly registered items');
assert(uiSource.includes('game.codexCollapsedSlots[slot] = false;'), 'codex renderer must expand the slot containing a new registration');
assert(uiSource.includes('● NEW'), 'newly registered codex cards must keep their visible NEW badge');

console.log('codex new registration summary smoke checks passed');
