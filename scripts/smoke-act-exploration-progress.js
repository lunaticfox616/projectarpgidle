// Real coreLoop act explorations, direct travel and manual destinations (full exploration: smoke-act-exploration-progress-full.js).
const checks=require('./lib/act-exploration-progress-checks')(29);
checks.checkTravel('direct');
checks.checkManual();
console.log('Real coreLoop: 10 acts, direct travel, reconnect, manual destination and once-only completion: OK');
