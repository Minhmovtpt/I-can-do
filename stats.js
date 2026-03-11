import { getPaths, subscribe } from "./firebase.js";

function renderStatBar(elements, statKey, value) {
  const percent = Math.min(100, Math.round((Math.max(0, value) / 100) * 100));
  const bar = elements.statBars[statKey];
  if (!bar) return;
  bar.style.width = `${percent}%`;
}

export function renderStats(elements, stats) {
  if (!stats) return;
  ["atk", "int", "disc", "cre", "end", "foc", "wis"].forEach((key) => {
    const value = stats[key] ?? 0;
    elements[key].textContent = value;
    renderStatBar(elements, key, value);
  });
  elements.level.textContent = stats.level ?? 1;
  elements.exp.textContent = stats.exp ?? 0;
}

export function initStats(elements) {
  const paths = getPaths();
  return subscribe(paths.stats, (stats) => renderStats(elements, stats));
}
