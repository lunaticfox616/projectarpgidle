const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const uiSource = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');
const layoutCss = fs.readFileSync(path.join(root, 'css/layout.css'), 'utf8');
const componentCss = fs.readFileSync(path.join(root, 'css/components.css'), 'utf8');

assert(
  uiSource.includes('getVisibleHuntingMapCapZoneId()') && uiSource.includes('getAbyssZoneIdForDepth(20)'),
  'hunting map rendering must cap visible main hunting zones at chaos 20'
);
assert(
  uiSource.includes("document.getElementById('ui-deep-chaos-header').style.display = 'none'") &&
    uiSource.includes("document.getElementById('ui-deep-chaos-list').innerHTML = ''"),
  'hunting map tab must not render a deep-chaos summary card after chaos 20'
);
assert(
  uiSource.includes('buildMapZoneGroupHtml') && uiSource.includes('toggleMapZoneGroup'),
  'hunting map groups must be rendered through collapsible section controls'
);
assert(
  uiSource.includes('map-zone-grid--${groupKey}') && componentCss.includes('.map-zone-grid--hunting') && componentCss.includes('.map-zone-grid--chaos'),
  'hunting map and chaos maps must render into separate grids for responsive mobile layouts'
);
assert(
  uiSource.includes("buildMapZoneGroupHtml('hunting', '일반 사냥터'") &&
    uiSource.includes("buildMapZoneGroupHtml('chaos', '혼돈'"),
  'hunting and chaos map sections must be grouped separately'
);
assert(
  layoutCss.includes('.map-grid.map-grid--split') &&
    layoutCss.includes('.map-zone-group-header') &&
    layoutCss.includes('.map-zone-grid'),
  'split hunting map grids and collapsible headers must have base desktop styles'
);
assert(
  componentCss.includes('#ui-map-list.map-grid--split .map-zone-grid--hunting { grid-template-columns: repeat(2, minmax(0, 1fr)); }'),
  'mobile hunting maps must render two cards per row'
);
assert(
  componentCss.includes('#ui-map-list.map-grid--split .map-zone-grid--chaos { grid-template-columns: repeat(5, minmax(0, 1fr));'),
  'mobile chaos maps must render five cards per row'
);

console.log('smoke-map-hunting-layout: ok');
