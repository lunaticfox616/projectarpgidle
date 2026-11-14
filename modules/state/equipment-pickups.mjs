// Session-only oldest-first pickup queue. Acquisition bounds it to 40; rating consumes it.
export const freshGearIds = [];
export const takeFreshGearIds = limit => freshGearIds.splice(0, limit);
