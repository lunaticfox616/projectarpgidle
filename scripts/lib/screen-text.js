// The text a player reads in an HTML string: tags dropped, the few entities escapeHTML writes decoded, spaces collapsed.
// Smokes check screen words with it, so markup around them (a <b> that colours a number) does not break the check (2026-10-27 retro).
const ENTITIES = Object.freeze({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' });

module.exports = function screenText(html) {
    return String(html).replace(/<[^>]*>/g, ' ').replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, entity => ENTITIES[entity])
        .replace(/\s+/g, ' ').trim();
};
