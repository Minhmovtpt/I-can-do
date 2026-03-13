import { getShortcuts } from "../services/webShortcutService.js";

const FALLBACK_SHORTCUTS = [
  { name: "YouTube", url: "https://youtube.com", icon: "youtube", order: 1 },
  { name: "ChatGPT", url: "https://chatgpt.com", icon: "chatgpt", order: 2 },
  { name: "Gmail", url: "https://mail.google.com", icon: "gmail", order: 3 },
  { name: "Github", url: "https://github.com", icon: "github", order: 4 },
];

function asList(shortcuts) {
  if (!shortcuts || !Object.keys(shortcuts).length) return FALLBACK_SHORTCUTS;
  return Object.values(shortcuts)
    .filter((item) => item?.name && item?.url)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

export function initWebShortcuts(elements) {
  const container = elements.webShortcutsContainer;
  if (!container) return () => {};

  function render(shortcuts) {
    container.innerHTML = "";
    asList(shortcuts).forEach((item) => {
      const button = document.createElement("button");
      button.className = "shortcut-btn";
      button.type = "button";
      button.textContent = item.name;
      button.addEventListener("click", () => {
        window.open(item.url, "_blank");
      });
      container.appendChild(button);
    });
  }

  return getShortcuts(render);
}
