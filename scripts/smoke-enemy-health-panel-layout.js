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
assert(enemyListRule[1].includes('min-height: 92px'), 'enemy HP panel must reserve the focused-card height even when no enemy is targeted');
assert(enemyListRule[1].includes('margin-top: 2px'), 'enemy HP panel must sit tightly under the battlefield');
assert(!componentsCss.includes('.enemy-list { max-height: 132px; }'), 'wide responsive layout must not reintroduce enemy HP panel clipping');
assert(!componentsCss.includes('.enemy-list { grid-template-columns: 1fr; max-height: 88px; }'), 'narrow desktop layout must not reintroduce enemy HP panel clipping');

const enemyCardRule = themeCss.match(/\.enemy-card\s*\{([^}]+)\}/);
const enemyEmptyRule = themeCss.match(/\.enemy-empty\s*\{([^}]+)\}/);
assert(enemyCardRule && enemyCardRule[1].includes('min-height: 92px'), 'focused enemy HP card must define the shared reserved height');
assert(enemyEmptyRule && enemyEmptyRule[1].includes('min-height: 92px'), 'empty enemy HP placeholder must keep the same reserved height as a real enemy card');
assert(indexSource.includes('id="enemy-area" style="margin-top: 0;'), 'enemy HP area wrapper must not add extra vertical gap');

const battlefieldRule = themeCss.match(/\.battlefield-wrap\s*\{([^}]+)\}/);
assert(battlefieldRule, 'base battlefield layout rule must exist');
assert(battlefieldRule[1].includes('height: 185px'), 'base battlefield height must leave room for enemy HP and combat log panels');
assert(componentsCss.includes('.battlefield-wrap { height: clamp(220px, 30vh, 300px); }'), 'wide layout battlefield height must stay compact enough for the panels below');
assert(componentsCss.includes('.battlefield-wrap { height: 165px; }'), 'narrow desktop battlefield height must stay compact enough for the panels below');
assert(componentsCss.includes('.combat-dashboard { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); gap: 0; }'), 'stacked desktop battle layout must keep enemy HP and combat log tightly spaced');
assert(componentsCss.includes('.combat-feed { margin-top: -12px; }'), 'stacked desktop combat log must extend upward toward the enemy HP panel');

const compressedRule = themeCss.match(/\.battlefield-wrap\.compressed\s*\{([^}]+)\}/);
assert(compressedRule && compressedRule[1].includes('height: 0'), 'hidden combat scene must release its battlefield height');
assert(componentsCss.includes('.combat-dashboard.combat-scene-hidden { grid-template-rows: auto minmax(0, 1fr); }'), 'hidden combat scene must let the combat log expand into freed vertical space');
assert(componentsCss.includes('.combat-dashboard.combat-scene-hidden .combat-feed { height: 100%; max-height: none; }'), 'hidden combat scene must remove fixed combat-feed height caps');
assert(uiSource.includes("combatDashboard.classList.toggle('combat-scene-hidden', !showCombatScene)"), 'static UI update must toggle the hidden-scene layout class');

const loopBannerIndex = indexSource.indexOf('id="loop-ready-banner"');
const enemyListIndex = indexSource.indexOf('id="ui-enemy-list"');
assert(loopBannerIndex >= 0 && enemyListIndex >= 0, 'loop-ready banner and enemy HP list must exist in the combat layout');
assert(loopBannerIndex < enemyListIndex, 'pre-loop-10 loop notice must render before the enemy HP list so it stays visible under the battlefield');

const combatLoopButtonIndex = indexSource.indexOf('id="btn-combat-loop-advance"');
const returnButtonIndex = indexSource.indexOf('onclick="returnToTown()"');
assert(combatLoopButtonIndex >= 0 && returnButtonIndex >= 0, 'combat loop button and return button must both exist');
assert(combatLoopButtonIndex < returnButtonIndex, 'combat loop button must sit to the left of the return button');

const actionRule = themeCss.match(/\.combat-zone-actions\s*\{([^}]+)\}/);
assert(actionRule && actionRule[1].includes('margin-left: auto'), 'combat action buttons must stay pinned to the right of the level/class label');
assert(indexSource.includes('class="combat-action-btn" onclick="returnToTown()"'), 'return button must use the shared combat action button style');
assert(indexSource.includes('id="btn-combat-loop-advance" class="combat-action-btn"'), 'loop button must use the shared combat action button style');
assert(themeCss.includes('#btn-combat-loop-advance') && themeCss.includes('border-color: #d7c36a'), 'loop button must keep an accent that makes it stand out');
assert(!indexSource.slice(loopBannerIndex, enemyListIndex).includes('confirmLoopReady()'), 'loop-ready banner must not duplicate the moved loop button');
assert(uiSource.includes('function canShowCombatLoopAdvanceButton()'), 'combat loop button visibility helper must exist');
assert(uiSource.includes('if (game && (game.pendingLoopReady || game.pendingLoopDecision)) return true;'), 'pending loop states must show the combat loop button');
assert(uiSource.includes("hasCurrentLoopAbyssRequirementClear(game.season || 1)"), 'loop 10+ requirement completion must show the combat loop button without relying on pendingLoopReady');

console.log('enemy health panel layout smoke checks passed');
