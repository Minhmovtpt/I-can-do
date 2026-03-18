export const BASE_STATS = {
  atk: 0,
  int: 0,
  disc: 0,
  cre: 0,
  end: 0,
  foc: 0,
  wis: 0,
  exp: 0,
  level: 1,
};

const RULES = {
  multipliers: {
    atk: 1,
    int: 1,
    disc: 1,
    cre: 1,
    end: 1,
    foc: 1,
    wis: 1,
    exp: 1,
  },
  skillBonuses: {},
  levelScaling: (level) => level * 100,
};

function withDefaults(stats) {
  return { ...BASE_STATS, ...(stats || {}) };
}

function gainWithRules(key, value, context = {}) {
  const multiplier = RULES.multipliers[key] ?? 1;
  const skillBonus = RULES.skillBonuses[context.skill || ""]?.[key] ?? 0;
  return Math.round(((value + skillBonus) * multiplier + Number.EPSILON) * 100) / 100;
}

export function resolveReward(rawReward, context = {}) {
  const reward = rawReward || {};
  const resolved = {};
  Object.keys(reward).forEach((key) => {
    resolved[key] = gainWithRules(key, Number(reward[key]) || 0, context);
  });
  return resolved;
}

export function applyLevelUps(stats) {
  while (stats.exp >= RULES.levelScaling(stats.level)) {
    stats.exp -= RULES.levelScaling(stats.level);
    stats.level += 1;
  }
}

export function applyRewardLocally(currentStats, rawReward, context = {}) {
  const reward = resolveReward(rawReward, context);
  const next = { ...withDefaults(currentStats) };

  Object.entries(reward).forEach(([key, value]) => {
    if (typeof next[key] === "number") {
      next[key] += value;
    }
  });

  applyLevelUps(next);
  return { next, reward };
}
