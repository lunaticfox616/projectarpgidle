#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const themeCss = fs.readFileSync('css/theme.css', 'utf8');
const componentsCss = fs.readFileSync('css/components.css', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');

const enemyListRule = themeCss.match(/\.enemy-list\s*\{([^}]+)\}/);
assert(enemyListRule, 'base enemy-list layout rule must exist');
assert(enemyListRule[1].includes('max-height: none'), 'enemy HP panel must not be height-capped in the base battle layout');
assert(enemyListRule[1].includes('overflow: visible'), 'enemy HP panel must render its full focused enemy card instead of clipping it');
assert(!componentsCss.includes('.enemy-list { max-height: 132px; }'), 'wide responsive layout must not reintroduce enemy HP panel clipping');
assert(!componentsCss.includes('.enemy-list { grid-template-columns: 1fr; max-height: 88px; }'), 'narrow desktop layout must not reintroduce enemy HP panel clipping');

const battlefieldRule = themeCss.match(/\.battlefield-wrap\s*\{([^}]+)\}/);
assert(battlefieldRule, 'base battlefield layout rule must exist');
assert(battlefieldRule[1].includes('height: 200px'), 'base battlefield height must leave room for enemy HP and combat log panels');
assert(componentsCss.includes('.battlefield-wrap { height: clamp(240px, 34vh, 340px); }'), 'wide layout battlefield height must stay compact enough for the panels below');
assert(componentsCss.includes('.battlefield-wrap { height: 180px; }'), 'narrow desktop battlefield height must stay compact enough for the panels below');

const loopBannerIndex = indexSource.indexOf('id="loop-ready-banner"');
const enemyListIndex = indexSource.indexOf('id="ui-enemy-list"');
assert(loopBannerIndex >= 0 && enemyListIndex >= 0, 'loop-ready banner and enemy HP list must exist in the combat layout');
assert(loopBannerIndex < enemyListIndex, 'pre-loop-10 loop notice must render before the enemy HP list so it stays visible under the battlefield');

const combatLoopButtonIndex = indexSource.indexOf('id="btn-combat-loop-advance"');
const returnButtonIndex = indexSource.indexOf('onclick="returnToTown()"');
assert(combatLoopButtonIndex >= 0 && returnButtonIndex >= 0, 'combat loop button and return button must both exist');
assert(combatLoopButtonIndex < returnButtonIndex, 'combat loop button must sit to the left of the return button');
assert(!indexSource.slice(loopBannerIndex, enemyListIndex).includes('confirmLoopReady()'), 'loop-ready banner must not duplicate the moved loop button');
assert(uiSource.includes('function canShowCombatLoopAdvanceButton()'), 'combat loop button visibility helper must exist');
assert(uiSource.includes('if (game && (game.pendingLoopReady || game.pendingLoopDecision)) return true;'), 'pending loop states must show the combat loop button');
assert(uiSource.includes("hasCurrentLoopAbyssRequirementClear(game.season || 1)"), 'loop 10+ requirement completion must show the combat loop button without relying on pendingLoopReady');

console.log('enemy health panel layout smoke checks passed');
