import { getMillisecondsUntilNextLocalDay } from "./scheduling.js";

export function scheduleAtLocalDayBoundary(callback, now = () => Date.now()) {
  let timeoutId = null;

  const scheduleNext = () => {
    const delay = getMillisecondsUntilNextLocalDay(now());
    timeoutId = setTimeout(async () => {
      await callback();
      scheduleNext();
    }, delay);
  };

  scheduleNext();

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}
