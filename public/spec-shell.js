/* Small interactions for the six-view shell; no progress is sent to a server. */
(() => {
  "use strict";

  function initShell() {
    const tourButton = document.querySelector(".asc-tour-trigger");
    if (tourButton) {
      tourButton.textContent = "✨ Hướng dẫn";
      tourButton.setAttribute("aria-label", "Mở hướng dẫn nhanh 30 giây");
      tourButton.title = "Hướng dẫn nhanh 30 giây";
    }
    const logBadge = document.getElementById("navBadgeLogCount");
    if (logBadge) {
      logBadge.textContent = "Mở";
      logBadge.setAttribute("aria-label", "Mở nhật ký");
      logBadge.title = "Mở nhật ký trên thiết bị này";
    }

    document.querySelectorAll(".spec-tour-open").forEach((trigger) => {
      trigger.addEventListener("click", () => document.querySelector(".asc-tour-trigger")?.click());
    });

    const progressCount = document.getElementById("spec-checker-count");
    const personaLabel = document.getElementById("spec-checker-persona");
    const checkerLivePanel = document.querySelector(".scenario-live-panel");

    function renderCheckerProgress() {
      if (!progressCount || !personaLabel) return;
      const status = checkerLivePanel?.querySelector(".scenario-live-status")?.textContent.trim() || "";
      const match = status.match(/(\d+)\s*\/\s*10/u);
      const answered = match ? Number(match[1]) : 0;
      progressCount.textContent = `${answered} / 10`;
      if (answered < 10) {
        personaLabel.textContent = answered ? `Đã trả lời ${answered} tình huống trong phiên này` : "Bắt đầu để xem tiến độ phiên này";
        return;
      }
      const personaTitle = checkerLivePanel?.querySelector(".scenario-live-persona h3")?.textContent.trim();
      personaLabel.textContent = personaTitle ? `Persona: ${personaTitle}` : "Đã hoàn thành 10 tình huống trong phiên này";
    }

    renderCheckerProgress();
    if (checkerLivePanel && typeof MutationObserver !== "undefined") {
      new MutationObserver(renderCheckerProgress).observe(checkerLivePanel, { attributes: true, characterData: true, childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initShell, { once: true });
  else initShell();
})();
