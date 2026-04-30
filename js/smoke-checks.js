// Runtime integrity checks for modularized build (non-fatal).
(function () {
  function missing(name) {
    return typeof window[name] === 'undefined' || window[name] === null;
  }
  window.runModuleIntegrityChecks = function runModuleIntegrityChecks() {
    var required = [
      'defaultGame', 'SKILL_DB', 'UNIQUE_DB', 'ORB_DB', 'MAP_ZONES', 'PASSIVE_TREE',
      'saveGame', 'loadGame', 'updateStaticUI', 'updateCombatUI', 'coreLoop', 'renderBattlefield', 'drawPassiveTree'
    ];
    var missingKeys = required.filter(missing);
    if (missingKeys.length > 0) {
      console.warn('[integrity-check] missing globals:', missingKeys.join(', '));
      return false;
    }
    console.info('[integrity-check] modular globals look ready.');
    return true;
  };
})();
