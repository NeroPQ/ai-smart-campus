/* Small, accessible command palette and first-visit guide for the existing toolkit. */
(() => {
  "use strict";

  const actions = [
    { title: "Về trang tổng quan", detail: "Chọn công cụ bạn cần", href: "#home", keywords: "home trang chủ tổng quan" },
    { title: "Tạo câu khai báo AI", detail: "Khai báo cách bạn đã dùng AI", href: "#toolkit-disclosure", keywords: "disclosure khai báo minh bạch" },
    { title: "Mở nhật ký quá trình dùng AI", detail: "Ghi lại prompt và bước kiểm chứng", href: "#toolkit-process-log", keywords: "log journal nhật ký phụ lục" },
    { title: "Tìm prompt học tập", detail: "Mẫu gợi mở để tự suy nghĩ", href: "#toolkit-prompts", keywords: "prompt tủ câu lệnh học tập" },
    { title: "Soi bài trước khi nộp", detail: "Rà dấu hiệu và tự đối chiếu", href: "#toolkit-scanner", keywords: "scanner bài viết kiểm tra" },
    { title: "Thử mô hình phân tích trên máy", detail: "Thử nghiệm; kết quả có thể nhầm", href: "#sc-model-title", keywords: "model detector mô hình" },
    { title: "Thực hành Checker & Persona", detail: "10 tình huống sử dụng AI", href: "#checker", keywords: "checker persona tình huống" },
    { title: "Làm Pre-test / Post-test", detail: "Bắt đầu hoặc tiếp tục lượt đánh giá", href: "/evaluate", keywords: "evaluation pre post survey đánh giá" },
  ];

  const tourSteps = [
    { title: "Bắt đầu với việc bạn cần làm", body: "Chọn một công cụ theo nhiệm vụ hiện tại. Không cần tài khoản để dùng các công cụ học tập.", href: "#home", label: "Xem các công cụ" },
    { title: "Ghi lại cách bạn đã dùng AI", body: "Tạo câu khai báo từ những lựa chọn thật của bạn, rồi ghi prompt và bước tự kiểm chứng vào nhật ký.", href: "#toolkit-disclosure", label: "Mở khai báo & nhật ký" },
    { title: "Tự học và rà bản nháp", body: "Dùng prompt để nhờ AI gợi mở, rồi rà bản nháp như một gợi ý. Công cụ không xác định ai đã viết văn bản.", href: "#toolkit-prompts", label: "Mở tủ prompt" },
    { title: "Thực hành và đánh giá", body: "Thử các tình huống Checker. Nếu tham gia đánh giá dự án, hệ thống tự cấp mã ẩn danh; hãy lưu cả mã và khóa khôi phục.", href: "/evaluate", label: "Mở Pre-test / Post-test" },
  ];

  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLocaleLowerCase("vi");
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function mount() {
    if (document.getElementById("asc-quick-actions")) return;
    const header = document.querySelector(".site-header");
    if (!header || !document.body) return;

    const toolbar = element("div", "asc-quick-toolbar");
    toolbar.id = "asc-quick-actions";
    const searchTrigger = element("button", "asc-quick-trigger");
    searchTrigger.type = "button";
    searchTrigger.setAttribute("aria-haspopup", "dialog");
    searchTrigger.setAttribute("aria-controls", "asc-command-dialog");
    searchTrigger.title = "Tìm nhanh công cụ (Ctrl/⌘ K)";
    searchTrigger.innerHTML = '<span aria-hidden="true">⌕</span><span class="asc-quick-trigger-label">Tìm nhanh</span><kbd>Ctrl K</kbd>';
    const openTour = element("button", "asc-tour-trigger", "Hướng dẫn");
    openTour.type = "button";
    openTour.setAttribute("aria-haspopup", "dialog");
    openTour.setAttribute("aria-controls", "asc-tour-dialog");
    toolbar.append(searchTrigger, openTour);
    const cta = header.querySelector(".header-cta");
    header.insertBefore(toolbar, cta || null);

    const commandOverlay = element("div", "asc-dialog-overlay");
    commandOverlay.id = "asc-command-dialog";
    commandOverlay.hidden = true;
    commandOverlay.setAttribute("role", "dialog");
    commandOverlay.setAttribute("aria-modal", "true");
    commandOverlay.setAttribute("aria-labelledby", "asc-command-title");
    commandOverlay.tabIndex = -1;
    const commandPanel = element("div", "asc-command-panel");
    const commandHead = element("div", "asc-dialog-head");
    const commandTitleWrap = element("div", "asc-dialog-title-wrap");
    commandTitleWrap.append(element("span", "asc-dialog-eyebrow", "AI SMART CAMPUS · ĐI ĐẾN"));
    const commandTitle = element("h2", "", "Tìm công cụ");
    commandTitle.id = "asc-command-title";
    commandTitleWrap.append(commandTitle);
    const closeCommand = element("button", "asc-icon-close", "Đóng");
    closeCommand.type = "button";
    closeCommand.setAttribute("aria-label", "Đóng tìm nhanh");
    commandHead.append(commandTitleWrap, closeCommand);
    const searchWrap = element("label", "asc-search-wrap");
    const searchIcon = element("span", "asc-search-icon", "⌕");
    searchIcon.setAttribute("aria-hidden", "true");
    const input = element("input", "asc-command-input");
    input.type = "search";
    input.placeholder = "Gõ tên công cụ hoặc từ khóa…";
    input.setAttribute("aria-label", "Tìm công cụ");
    searchWrap.append(searchIcon, input);
    const resultList = element("ul", "asc-command-results");
    resultList.id = "asc-command-results";
    resultList.setAttribute("aria-label", "Kết quả tìm công cụ");
    const resultStatus = element("p", "asc-visually-hidden");
    resultStatus.setAttribute("role", "status");
    resultStatus.setAttribute("aria-live", "polite");
    const hint = element("div", "asc-dialog-hint", "Dùng ↑ ↓ để chọn · Enter để mở · Esc để đóng");
    commandPanel.append(commandHead, searchWrap, resultList, resultStatus, hint);
    commandOverlay.append(commandPanel);

    const tourOverlay = element("div", "asc-dialog-overlay asc-tour-overlay");
    tourOverlay.id = "asc-tour-dialog";
    tourOverlay.hidden = true;
    tourOverlay.setAttribute("role", "dialog");
    tourOverlay.setAttribute("aria-modal", "true");
    tourOverlay.setAttribute("aria-labelledby", "asc-tour-title");
    tourOverlay.tabIndex = -1;
    const tourPanel = element("div", "asc-tour-panel");
    const tourHead = element("div", "asc-tour-head");
    const tourEyebrow = element("span", "asc-dialog-eyebrow", "HƯỚNG DẪN LÀM QUEN · 30 GIÂY");
    const tourTitle = element("h2", "", "Bắt đầu với AI Smart Campus");
    tourTitle.id = "asc-tour-title";
    const closeTour = element("button", "asc-icon-close", "Đóng");
    closeTour.type = "button";
    closeTour.setAttribute("aria-label", "Đóng hướng dẫn");
    const tourTitleWrap = element("div", "asc-dialog-title-wrap");
    tourTitleWrap.append(tourEyebrow, tourTitle);
    tourHead.append(tourTitleWrap, closeTour);
    const progressWrap = element("div", "asc-tour-progress-wrap");
    const progress = element("div", "asc-tour-progress");
    const progressFill = element("span", "asc-tour-progress-fill");
    progress.append(progressFill);
    const progressText = element("span", "asc-tour-progress-text");
    progressWrap.append(progress, progressText);
    const stepBody = element("div", "asc-tour-step");
    stepBody.setAttribute("aria-live", "polite");
    const stepNumber = element("span", "asc-tour-step-number");
    const stepHeading = element("h3", "");
    const stepDescription = element("p", "");
    stepBody.append(stepNumber, stepHeading, stepDescription);
    const tourControls = element("div", "asc-tour-controls");
    const previous = element("button", "asc-tour-secondary", "← Trước");
    previous.type = "button";
    const skip = element("button", "asc-tour-quiet", "Bỏ qua");
    skip.type = "button";
    const next = element("button", "asc-tour-primary");
    next.type = "button";
    tourControls.append(previous, skip, next);
    tourPanel.append(tourHead, progressWrap, stepBody, tourControls);
    tourOverlay.append(tourPanel);
    document.body.append(commandOverlay, tourOverlay);

    let selectedIndex = 0;
    let visibleActions = [];
    let tourIndex = 0;
    let returnFocus = null;

    function closeModal(modal) {
      if (modal.hidden) return;
      modal.hidden = true;
      const focusTarget = returnFocus;
      returnFocus = null;
      if (focusTarget && focusTarget.isConnected) focusTarget.focus();
    }
    function openModal(modal, trigger, focusElement) {
      const anotherModalIsOpen = !commandOverlay.hidden || !tourOverlay.hidden;
      if (!commandOverlay.hidden) commandOverlay.hidden = true;
      if (!tourOverlay.hidden) tourOverlay.hidden = true;
      // Preserve the original outside opener when the user switches between
      // the tour and the command palette with Ctrl/⌘K.
      if (!anotherModalIsOpen) returnFocus = trigger || document.activeElement;
      modal.hidden = false;
      requestAnimationFrame(() => focusElement ? focusElement.focus() : modal.focus());
    }
    function runAction(action) {
      const target = new URL(action.href, window.location.href);
      const current = new URL(window.location.href);
      const isSameLocation = target.href === current.href;
      const focusTarget = returnFocus;
      commandOverlay.hidden = true;
      tourOverlay.hidden = true;
      returnFocus = null;
      if (isSameLocation) {
        const canRestoreFocus = focusTarget && focusTarget !== document.body && focusTarget.isConnected && !commandOverlay.contains(focusTarget) && !tourOverlay.contains(focusTarget);
        (canRestoreFocus ? focusTarget : searchTrigger).focus();
        return;
      }
      window.location.assign(target.href);
    }
    function renderResults(query) {
      resultList.replaceChildren();
      const needle = normalize(query).trim();
      visibleActions = actions.filter((action) => !needle || normalize(`${action.title} ${action.detail} ${action.keywords}`).includes(needle));
      selectedIndex = Math.min(selectedIndex, Math.max(0, visibleActions.length - 1));
      resultStatus.textContent = visibleActions.length ? `${visibleActions.length} công cụ phù hợp.` : "Không tìm thấy công cụ phù hợp.";
      visibleActions.forEach((action, index) => {
        const item = element("li", "asc-command-item");
        const option = element("button", `asc-command-option${index === selectedIndex ? " is-active" : ""}`);
        option.type = "button";
        option.id = `asc-command-option-${index}`;
        const icon = element("span", "asc-command-option-icon", action.href === "/evaluate" ? "↗" : "⌁");
        icon.setAttribute("aria-hidden", "true");
        const copy = element("span", "asc-command-option-copy");
        copy.append(element("strong", "", action.title), element("small", "", action.detail));
        const enter = element("span", "asc-command-enter", "Enter ↵");
        option.append(icon, copy, enter);
        option.addEventListener("mouseenter", () => setSelection(index));
        option.addEventListener("click", () => runAction(action));
        item.append(option);
        resultList.append(item);
      });
      if (!visibleActions.length) {
        const empty = element("li", "asc-command-empty", "Không tìm thấy công cụ phù hợp.");
        empty.setAttribute("aria-hidden", "true");
        resultList.append(empty);
      }
    }
    function setSelection(index) {
      selectedIndex = (index + visibleActions.length) % visibleActions.length;
      [...resultList.querySelectorAll(".asc-command-option")].forEach((option, i) => option.classList.toggle("is-active", i === selectedIndex));
      resultList.querySelector(`#asc-command-option-${selectedIndex}`)?.scrollIntoView({ block: "nearest" });
    }
    function showCommandPalette(trigger = searchTrigger) {
      input.value = "";
      selectedIndex = 0;
      renderResults("");
      openModal(commandOverlay, trigger, input);
    }
    function renderTour() {
      const step = tourSteps[tourIndex];
      stepNumber.textContent = String(tourIndex + 1).padStart(2, "0");
      stepHeading.textContent = step.title;
      stepDescription.textContent = step.body;
      progressText.textContent = `Bước ${tourIndex + 1} / ${tourSteps.length}`;
      progressFill.style.width = `${((tourIndex + 1) / tourSteps.length) * 100}%`;
      previous.disabled = tourIndex === 0;
      next.textContent = tourIndex === tourSteps.length - 1 ? step.label : "Tiếp theo →";
      next.dataset.href = tourIndex === tourSteps.length - 1 ? step.href : "";
    }
    function openGuidedTour(trigger = openTour) {
      tourIndex = 0;
      renderTour();
      openModal(tourOverlay, trigger, closeTour);
    }
    function focusTrap(event, modal) {
      if (event.key !== "Tab") return;
      const focusable = [...modal.querySelectorAll('button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')].filter((node) => !node.hidden && node.offsetParent !== null);
      if (!focusable.length) { event.preventDefault(); modal.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    searchTrigger.addEventListener("click", () => showCommandPalette(searchTrigger));
    openTour.addEventListener("click", () => openGuidedTour(openTour));
    closeCommand.addEventListener("click", () => closeModal(commandOverlay));
    closeTour.addEventListener("click", () => closeModal(tourOverlay));
    commandOverlay.addEventListener("click", (event) => { if (event.target === commandOverlay) closeModal(commandOverlay); });
    tourOverlay.addEventListener("click", (event) => { if (event.target === tourOverlay) closeModal(tourOverlay); });
    input.addEventListener("input", () => { selectedIndex = 0; renderResults(input.value); });
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" && visibleActions.length) {
        event.preventDefault();
        setSelection(selectedIndex);
        resultList.querySelector(`#asc-command-option-${selectedIndex}`)?.focus();
      }
      else if (event.key === "ArrowUp" && visibleActions.length) {
        event.preventDefault();
        setSelection(visibleActions.length - 1);
        resultList.querySelector(`#asc-command-option-${selectedIndex}`)?.focus();
      }
      else if (event.key === "Enter" && visibleActions.length) { event.preventDefault(); runAction(visibleActions[selectedIndex]); }
    });
    resultList.addEventListener("keydown", (event) => {
      if (!visibleActions.length || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "ArrowDown") setSelection(selectedIndex + 1);
      else if (event.key === "ArrowUp") setSelection(selectedIndex - 1);
      else if (event.key === "Home") setSelection(0);
      else setSelection(visibleActions.length - 1);
      resultList.querySelector(`#asc-command-option-${selectedIndex}`)?.focus();
    });
    previous.addEventListener("click", () => { tourIndex = Math.max(0, tourIndex - 1); renderTour(); });
    skip.addEventListener("click", () => closeModal(tourOverlay));
    next.addEventListener("click", () => {
      if (tourIndex < tourSteps.length - 1) { tourIndex += 1; renderTour(); }
      else runAction({ href: next.dataset.href });
    });
    commandOverlay.addEventListener("keydown", (event) => focusTrap(event, commandOverlay));
    tourOverlay.addEventListener("keydown", (event) => focusTrap(event, tourOverlay));
    window.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!commandOverlay.hidden) closeModal(commandOverlay);
        else showCommandPalette(document.activeElement instanceof HTMLElement ? document.activeElement : searchTrigger);
      } else if (event.key === "Escape") {
        if (!commandOverlay.hidden) closeModal(commandOverlay);
        else if (!tourOverlay.hidden) closeModal(tourOverlay);
      }
    });

    window.AISmartCampusQuickActions = Object.freeze({ open: showCommandPalette, openTour: openGuidedTour });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
