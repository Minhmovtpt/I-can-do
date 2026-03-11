import { activityApi } from "./firebaseService.js";

export async function logRewardActivity(reward, context = {}) {
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
}
