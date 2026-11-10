(() => {
  "use strict";

  const STORAGE_KEY = "ai-smart-campus-main-theme";
  const DEFAULT_THEME = "campus";
  const allowedThemes = new Set([DEFAULT_THEME, "ocean", "forest", "ember"]);
  const root = document.documentElement;
  const choices = Array.from(document.querySelectorAll("[data-theme-choice]"));
  const status = document.getElementById("theme-status");

  function syncChoices(theme) {
    choices.forEach((choice) => {
      choice.setAttribute("aria-pressed", String(choice.dataset.themeChoice === theme));
    });
  }

  function applyTheme(theme, persist) {
    if (!allowedThemes.has(theme)) return;
    root.dataset.mainTheme = theme;
    syncChoices(theme);
    const selected = choices.find((choice) => choice.dataset.themeChoice === theme);
    if (status && selected) status.textContent = `Đã chọn giao diện ${selected.textContent.trim()}.`;
    if (persist) {
      try { window.localStorage.setItem(STORAGE_KEY, theme); } catch (_) { /* Storage may be disabled. */ }
    }
  }

  let initialTheme = DEFAULT_THEME;
  try {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (allowedThemes.has(savedTheme)) initialTheme = savedTheme;
  } catch (_) { /* The default palette remains usable when storage is unavailable. */ }
  applyTheme(initialTheme, false);

  choices.forEach((choice) => {
    choice.addEventListener("click", () => applyTheme(choice.dataset.themeChoice, true));
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    applyTheme(allowedThemes.has(event.newValue) ? event.newValue : DEFAULT_THEME, false);
  });
})();
