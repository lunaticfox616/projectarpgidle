// Runtime integrity checks for modularized build (non-fatal).
(function () {
  var globalRoot = typeof window !== 'undefined' ? window : globalThis;

  function missingWindow(name) {
    return typeof globalRoot[name] === 'undefined' || globalRoot[name] === null || !!(globalRoot[name] && globalRoot[name].__placeholderGlobal === true);
  }

  function hasMapZones() {
    return (typeof globalRoot.MAP_ZONES !== 'undefined' && globalRoot.MAP_ZONES !== null)
     