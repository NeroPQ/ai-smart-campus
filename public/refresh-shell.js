(() => {
  "use strict";

  const STORAGE_KEY = "ai-smart-campus-color-scheme";
  const root = document.documentElement;
  const toggle = document.getElementById("theme-mode-toggle");
  const themeColor = document.querySelector('meta[name="theme-color"]');

  function readMode() {
    try { return window.localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light"; }
    catch (_) { return "light"; }
  }

  function applyMode(mode, persist) {
    const dark = mode === "dark";
    root.classList.toggle("dark", dark);
    if (toggle) {
      toggle.setAttribute("aria-pressed", String(dark));
      toggle.setAttribute("aria-label", dark ? "Bật giao diện sáng" : "Bật giao diện tối");
      const icon = toggle.querySelector(".theme-mode-icon");
      if (icon) icon.textContent = dark ? "☼" : "☾";
      const label = toggle.querySelector(".theme-mode-label");
      if (label) label.textContent = dark ? "Sáng" : "Tối";
    }
    if (themeColor) themeColor.setAttribute("content", dark ? "#0b1120" : "#ffffff");
    if (persist) {
      try { window.localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light"); }
      catch (_) { /* The selected appearance still applies for this page view. */ }
    }
  }

  applyMode(readMode(), false);
  toggle?.addEventListener("click", () => applyMode(root.classList.contains("dark") ? "light" : "dark", true));
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) applyMode(event.newValue === "dark" ? "dark" : "light", false);
  });
})();
