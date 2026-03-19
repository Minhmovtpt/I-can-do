import { getMillisecondsUntilNextLocalDay } from "./scheduling.js";

export function scheduleAtLocalDayBoundary(callback, now = () => Date.now()) {
  let timeoutId = null;
  let stopped = false;

  const scheduleNext = () => {
    if (stopped) return;

    const delay = getMillisecondsUntilNextLocalDay(now());
    timeoutId = setTimeout(async () => {
      try {
        await callback();
      } finally {
        if (!stopped) {
          scheduleNext();
        }
      }
    }, delay);
  };

  scheduleNext();

  return () => {
    stopped = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
}
