#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const componentsCss = fs.readFileSync('css/components.css', 'utf8');

assert(indexHtml.includes('<h2>사냥터 선택</h2>'), 'exploration heading must render without an icon');
assert(indexHtml.includes('id="ui-season-boss-header">뿌리 보스 도전'), 'root-boss exploration heading must render without an icon');
assert(indexHtml.includes('id="ui-labyrinth-header">고대 미궁'), 'labyrinth exploration heading must render without an icon');
assert(indexHtml.includes('id="ui-deep-chaos-header">혼돈 심화층</h2>'), 'deep-chaos exploration heading must render without an icon');
assert(indexHtml.includes('id="ui-meteor-header">운석 낙하 지점'), 'meteor exploration heading must render without an icon');
assert(indexHtml.includes('id="ui-beehive-header">벌집 원정</h2>'), 'beehive exploration heading must render without an icon');
assert(indexHtml.includes('id="ui-colony-header">군락지 방어전</h2>'), 'colony exploration heading must render without an icon');
assert(indexHtml.includes('id="ui-voidrift-header">공허 균열'), 'void rift exploration heading must render without an icon');
assert(indexHtml.includes('id="ui-trials-header">전직 시련의 성소</h2>'), 'trial exploration heading must render without an icon');
assert(!indexHtml.includes('<h2>🗺️ 사냥터 선택</h2>'), 'exploration heading must not keep the map icon');
assert(!indexHtml.includes('>🗝️ 뿌리 보스 도전'), 'root-boss heading must not keep the key icon');

assert(uiSource.includes('class="map-zone-group-icon"'), 'exploration group headers must keep a stable icon span for CSS hiding');
assert(componentsCss.includes('#map-tab-zones h2{padding:9px 12px;'), 'exploration section headers must use upgraded tab-like styling');
assert(componentsCss.includes('#map-tab-zones .map-zone-group-header{padding:11px 13px;'), 'exploration vertical group tabs must use upgraded styling');
assert(componentsCss.includes('#map-tab-zones .map-zone-group:not(.collapsed) .map-zone-group-header{border-color:#ffd36b;'), 'active exploration group tabs must use high-visibility colors');
assert(componentsCss.includes('#map-tab-zones .map-zone-group-icon{display:none}'), 'exploration group tab icons must be hidden');
assert(componentsCss.includes('#map-tab-zones .map-item-main>span:first-child:not(:last-child){display:none}'), 'exploration list leading icons must be hidden');
assert(!componentsCss.includes('#tab-map.map-tab-panel.active{display:grid;grid-template-columns:150px minmax(0,1fr);'), 'top-level map subtabs must not be converted into the exploration vertical rail');

assert(componentsCss.includes('.codex-slot-tabs{display:flex;flex-direction:column;gap:8px;min-width:0;padding:10px;'), 'codex slot tabs must use the upgraded vertical rail container');
assert(componentsCss.includes('.codex-slot-tab{display:flex;align-items:center;justify-content:space-between;'), 'codex slot tabs must use the upgraded tab layout');
assert(componentsCss.includes('.codex-slot-tab.active{border-color:#ffd36b;'), 'codex active slot tab must use high-visibility colors');
assert(componentsCss.includes('@media (max-width:900px){.codex-layout{grid-template-columns:1fr}'), 'mobile codex overrides must remain after base rules');

console.log('map exploration and codex vertical tab visibility smoke checks passed');
