

export function ascendNodeValue(env, id) { return env.deps.ASCENDANCY_KEYSTONE_VALUES[id]; }

export function ascendNodeTagged(skill, tag) { return Array.isArray(skill && skill.tags) && skill.tags.includes(tag); }

export function ascendNodeLiving(enemy) { return !!enemy && enemy.hp > 0; }
