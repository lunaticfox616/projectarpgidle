// Runtime integrity checks for modularized build (non-fatal).
(function () {
  function missingWindow(name) {
    return typeof window[name] === 'undefined' || window[name] === null;
  }

  function hasMapZones() {
    return (typeof window.MAP_ZONES !== 'undefined' && window.MAP_ZONES !== null)
      || (typeof MAP_ZONES !== 'undefined' && MAP_ZONES !== null);
  }
  window.runModuleIntegrityChecks = function runModuleIntegrityChecks() {
    var required = [
      'defaultGame', 'SKILL_DB', 'UNIQUE_DB', 'ORB_DB', 'PASSIVE_TREE',
      'saveGame', 'loadGame', 'updateStaticUI', 'updateCombatUI', 'coreLoop', 'renderBattlefield', 'drawPassiveTree'
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
