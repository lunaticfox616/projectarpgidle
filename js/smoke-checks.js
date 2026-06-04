// Runtime integrity checks for modularized build (non-fatal).
(function () {
  var globalRoot = typeof window !== 'undefined' ? window : globalThis;

  function missingWindow(name) {
    return typeof globalRoot[name] === 'undefined' || globalRoot[name] === null || !!(globalRoot[name] && globalRoot[name].__placeholderGlobal === true);
  }

  function hasMapZones() {
    return (typeof globalRoot.MAP_ZONES !== 'undefined' && globalRoot.MAP_ZONES !== null)
      || (typeof MAP_ZONES !== 'undefined' && MAP_ZONES !== null);
  }

  function ensureCosmosAtlasAssets() {
    if (typeof document === 'undefined') return;
    if (!document.querySelector('link[href*="css/cosmos-atlas.css"]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'css/cosmos-atlas.css?v=20260603-runtime-coherent2';
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[src*="js/cosmos-atlas.js"]')) {
      var script = document.createElement('script');
      script.defer = true;
      script.src = 'js/cosmos-atlas.js?v=20260603-runtime-coherent2';
      document.body.appendChild(script);
    }
  }

  ensureCosmosAtlasAssets();

  globalRoot.runModuleIntegrityChecks = function runModuleIntegrityChecks() {
    var required = [
      'defaultGame', 'SKILL_DB', 'UNIQUE_DB', 'ORB_DB', 'PASSIVE_TREE',
      'saveGame', 'loadGame', 'getPlayerStats', 'getSkillTargets', 'updateStaticUI', 'updateCombatUI', 'coreLoop', 'startMoving', 'startEncounterRun', 'renderBattlefield', 'drawPassiveTree'
    ];
    var missingKeys = required.filter(missingWindow);
    if (!hasMapZones()) missingKeys.push('MAP_ZONES');
    if (missingKeys.length > 0) {
      console.warn('[integrity-check] missing globals:', missingKeys.join(', '));
      return false;
    }
    console.info('[integrity-check] modular globals look ready.');
    return true;
  };
})();
