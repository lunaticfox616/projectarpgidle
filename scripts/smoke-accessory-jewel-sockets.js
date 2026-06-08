#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const passives = fs.readFileSync('js/passives.js', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');
const items = fs.readFileSync('data/items.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert(items.includes("voidChisel: { name: '공허의 끌'"), 'void chisel currency must exist');
assert(passives.includes('function isVoidSocketAccessoryItem(item)'), 'void socket eligibility helper must exist');
assert(passives.includes("String(item && item.slot || '').replace(/[12]$/, '')"), 'void socket eligibility must normalize equipped ring slot suffixes');
assert(passives.includes('if (!isVoidSocketAccessoryItem(item)) return addLog'), 'void chisel creation must use normalized accessory eligibility');
assert(passives.includes('function removeJewelFromAbyssSocket(socketIdx)'), 'abyss socket jewel removal helper must exist');
assert(passives.includes('item.abyssSockets[idx].jewel = null;'), 'abyss socket removal must clear the socket');
assert(passives.includes('safeExposeGlobals({ isVoidSocketAccessoryItem, applyVoidChiselToSelectedItem, insertJewelIntoVoidSocket, removeJewelFromVoidSocket, insertJewelIntoAbyssSocket, removeJewelFromAbyssSocket });'), 'socket helpers must be explicitly exposed for inline UI handlers');
assert(!passives.includes('game.jewelInventory.splice(invIdx, 1);\n    game.jewelInventory.splice(invIdx, 1);'), 'abyss socket insertion must not remove two inventory jewels');
assert(ui.includes('onclick="removeJewelFromAbyssSocket(${sidx})"'), 'socketed abyss jewels must render a remove button');
assert(ui.includes('onclick="applyVoidChiselToSelectedItem()">사용</button>'), 'void chisel currency card must expose a use button');
assert(ui.includes('key === \'voidChisel\' ? getMobileCraftCurrencyUseState'), 'void chisel tooltip reason must use the special currency validator');
assert(ui.includes('onclick="insertJewelIntoVoidSocket(${i})"'), 'empty void sockets must render insert buttons');
assert(index.includes('js/passives.js?v=20260608-accessory-socket2'), 'passives cache buster must be updated for socket fixes');
assert(index.includes('js/ui.js?v=20260608-accessory-socket2'), 'ui cache buster must be updated for socket fixes');
assert(index.includes('data/skills.js?v=20260608-flame-socket2'), 'skill data cache buster must include latest flame decay data');
assert(index.includes('js/combat.js?v=20260608-flame-socket2'), 'combat cache buster must include latest flame decay formula');

console.log('accessory jewel socket smoke checks passed');
