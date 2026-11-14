/** Existing host polyfills, installed once by the boot entry. */
export function installLegacyPolyfills(dom) {
    if (!Array.prototype.includes) {
        Array.prototype.includes = function(search, start) {
            let index = start || 0;
            if (index < 0) index = Math.max(this.length + index, 0);
            for (let i = index; i < this.length; i++) {
                if (this[i] === search || (search !== search && this[i] !== this[i])) return true;
            }
            return false;
        };
    }
    if (!String.prototype.startsWith) {
        String.prototype.startsWith = function(search, pos) {
            let start = pos || 0;
            return this.substring(start, start + String(search).length) === String(search);
        };
    }
    if (!Math.hypot) {
        Math.hypot = function() {
            let sum = 0;
            for (let i = 0; i < arguments.length; i++) sum += arguments[i] * arguments[i];
            return Math.sqrt(sum);
        };
    }
    if (!Object.values) {
        Object.values = function(obj) {
            return Object.keys(obj).map(function(key) { return obj[key]; });
        };
    }
    if (!Object.entries) {
        Object.entries = function(obj) {
            return Object.keys(obj).map(function(key) { return [key, obj[key]]; });
        };
    }
    if (!Object.fromEntries) {
        Object.fromEntries = function(entries) {
            let obj = {};
            (entries || []).forEach(function(entry) {
                if (!entry || entry.length < 2) return;
                obj[entry[0]] = entry[1];
            });
            return obj;
        };
    }
    installCollectionIteration(dom);
}

function installCollectionIteration(dom) {
    if (typeof dom.NodeList !== 'undefined' && !dom.NodeList.prototype.forEach) {
        dom.NodeList.prototype.forEach = Array.prototype.forEach;
    }
    if (typeof dom.HTMLCollection !== 'undefined' && !dom.HTMLCollection.prototype.forEach) {
        dom.HTMLCollection.prototype.forEach = Array.prototype.forEach;
    }
}
