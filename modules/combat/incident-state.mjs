// Session-owned pending incidents; run seeds and visited rooms remain in the saved exploration.
export function createIncidentState() { return { luckyAt: -Infinity, stars: [], challenge: null }; }
