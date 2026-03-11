import { statsApi, activityApi } from "./firebaseService.js";
import { resolveReward, applyLevelUps, applyRewardLocally } from "./rewardLogic.js";

export { resolveReward, applyLevelUps, applyRewardLocally };

export async function applyReward(rawReward, context = {}) {
  const { reward } = applyRewardLocally(null, rawReward, context);

  const next = await statsApi.transact((current) => {
    const result = applyRewardLocally(current, reward, context);
    return result.next;
  });

  await Promise.all(
    Object.entries(reward)
      .filter(([, value]) => value !== 0)
      .map(([stat, value]) =>
        activityApi.addEntry({
          stat,
          value,
          source: context.source || "Unknown",
          createdAt: Date.now(),
          message: `+${value} ${stat.toUpperCase()} (${context.source || "Unknown"})`
        })
      )
  );

  return next;
}
