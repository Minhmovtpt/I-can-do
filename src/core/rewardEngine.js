import { statsApi } from "./firebaseService.js";
import { resolveReward, applyLevelUps, applyRewardLocally } from "./rewardLogic.js";
import { ACTION_TYPES, subscribeActionEvents } from "./domainEvents.js";
import { logRewardActivity } from "./activityLogger.js";

export { resolveReward, applyLevelUps, applyRewardLocally };

export async function applyReward(rawReward, context = {}) {
  const { reward } = applyRewardLocally(null, rawReward, context);

  const next = await statsApi.transact((current) => {
    const result = applyRewardLocally(current, reward, context);
    return result.next;
  });

  await logRewardActivity(reward, context);

  return next;
}

function resolveEventReward(event) {
  switch (event.type) {
    case ACTION_TYPES.TASK_COMPLETED:
      return {
        reward: event.payload?.task?.reward || { exp: 20 },
        source: event.payload?.task?.title || "Task"
      };
    case ACTION_TYPES.DAILY_TASK_COMPLETED:
      return {
        reward: event.payload?.task?.reward || {},
        source: event.payload?.task?.title || "Daily Task"
      };
    case ACTION_TYPES.HABIT_COMPLETED:
      return {
        reward: event.payload?.habit?.reward || {},
        source: event.payload?.habit?.title || "Habit"
      };
    case ACTION_TYPES.FOCUS_SESSION_COMPLETED:
      return {
        reward: { foc: 5, exp: 10 },
        source: "Focus Session"
      };
    default:
      return null;
  }
}

export function initRewardEngine({ notifyError } = {}) {
  return subscribeActionEvents(async (event) => {
    const resolved = resolveEventReward(event);
    if (!resolved) return;
    try {
      await applyReward(resolved.reward, { source: resolved.source });
    } catch (error) {
      if (notifyError) {
        notifyError(error, "Failed to apply reward");
      } else {
        console.error(error);
      }
    }
  });
}
