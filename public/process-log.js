/* AI Process Log for AI Smart Campus. Browser-only storage; no network calls. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }
  if (!root || !root.document) return;
  root.AISmartCampusProcessLog = api;
  const start = () => api.mount(root.document, root.navigator, () => root.localStorage, root);
  if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const STORAGE_KEY = "aiSmartCampus.processLog.v1";
  const LEGACY_V2_STORAGE_KEY = "aisc_v2_logs";
  const VERSION = 1;
  const FIELDS = [
    { key: "originalIdea", label: "Bước 1 · Ý tưởng gốc của tôi là gì?" },
    { key: "mainPrompts", label: "Bước 2 · Tôi đã dùng câu lệnh (prompt) chính nào?" },
    { key: "corrections", label: "Bước 3 · AI trả về điều gì sai hoặc thiếu mà tôi đã tự sửa hoặc bác bỏ?" },
    { key: "evidenceLink", label: "Bước 4 · Link Google Docs có Version History hoặc Git Commit của tôi" }
  ];

  function normalizeCourseName(value) {
    if (typeof value !== "string") return "";
    const normalized = typeof value.normalize === "function" ? value.normalize("NFC") : value;
    return normalized.trim();
  }

  function courseNameKey(value) {
    return normalizeCourseName(value).toLowerCase();
  }

  function nowIso(now) {
    const value = typeof now === "function" ? now() : now === undefined ? new Date() : now;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new TypeError("Clock returned an invalid date");
    return date.toISOString();
  }

  function formatTimestamp(value) {
    if (typeof value !== "string") return "Chưa ghi nhận";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Chưa ghi nhận";
    // The audience is in Vietnam/Thailand time (UTC+7); persisted timestamps stay ISO UTC.
    const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const pad = (number) => String(number).padStart(2, "0");
    return `${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)}/${local.getUTCFullYear()} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())} (UTC+7)`;
  }

  function createCourse(name, timestamp) {
    const canonical = normalizeCourseName(name);
    if (!canonical) throw new TypeError("Course name is required");
    const stamp = timestamp || new Date().toISOString();
    return {
      name: canonical,
      originalIdea: "",
      mainPrompts: "",
      corrections: "",
      evidenceLink: "",
      createdAt: stamp,
      updatedAt: stamp
    };
  }

  function parseStoredData(raw) {
    if (raw === null || raw === undefined) return { ok: true, data: { version: VERSION, courses: [] }, empty: true };
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_error) {
      return { ok: false, error: "Nội dung lưu không phải JSON hợp lệ." };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || parsed.version !== VERSION || !Array.isArray(parsed.courses)) {
      return { ok: false, error: "Cấu trúc dữ liệu lưu không hợp lệ hoặc không được hỗ trợ." };
    }
    const courses = [];
    const seenNames = new Set();
    for (const item of parsed.courses) {
      if (!item || typeof item !== "object" || Array.isArray(item)) return { ok: false, error: "Có một mục môn học bị lỗi." };
      const name = normalizeCourseName(item.name);
      if (!name || typeof item.name !== "string") return { ok: false, error: "Có một mục môn học thiếu tên hợp lệ." };
      const key = courseNameKey(name);
      if (seenNames.has(key)) return { ok: false, error: "Dữ liệu có tên môn học trùng nhau." };
      seenNames.add(key);
      for (const field of FIELDS) {
        if (typeof item[field.key] !== "string") return { ok: false, error: `Dữ liệu trường “${field.label}” của môn ${name} không hợp lệ.` };
      }
      if (typeof item.createdAt !== "string" || typeof item.updatedAt !== "string" ||
          Number.isNaN(new Date(item.createdAt).getTime()) || Number.isNaN(new Date(item.updatedAt).getTime())) {
        return { ok: false, error: `Dữ liệu thời gian của môn ${name} không hợp lệ.` };
      }
      courses.push({
        name,
        originalIdea: item.originalIdea,
        mainPrompts: item.mainPrompts,
        corrections: item.corrections,
        evidenceLink: item.evidenceLink,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      });
    }
    return { ok: true, data: { version: VERSION, courses }, empty: courses.length === 0 };
  }

  function inspectLegacyV2Logs(storage) {
    if (!storage || typeof storage.getItem !== "function") return { exists: false, exportable: false, raw: null };
    let raw;
    try { raw = storage.getItem(LEGACY_V2_STORAGE_KEY); } catch (_error) {
      return { exists: false, exportable: false, raw: null };
    }
    if (raw === null || raw === undefined) return { exists: false, exportable: false, raw: null };
    if (typeof raw !== "string") return { exists: true, exportable: false, raw: null };
    try {
      // Parse only to verify this is the legacy JSON-array format. Never render or reshape its contents.
      if (Array.isArray(JSON.parse(raw))) return { exists: true, exportable: true, raw };
    } catch (_error) {
      // A malformed legacy value remains untouched and cannot be exported as JSON.
    }
    return { exists: true, exportable: false, raw: null };
  }

  function escapeMarkdownCell(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\\/g, "\\\\")
      .replace(/\|/g, "\\|")
      .replace(/`/g, "\\`")
      .replace(/([*_{}\[\]()#+.!-])/g, "\\$1")
      .replace(/\r\n?|\n/g, "<br>");
  }

  function buildMarkdownExport(course, exportedAt) {
    if (!course) throw new TypeError("A selected course is required");
    const rows = FIELDS.filter((field) => typeof course[field.key] === "string" && course[field.key].trim())
      .map((field) => `| ${escapeMarkdownCell(field.label)} | ${escapeMarkdownCell(course[field.key].trim())} |`);
    const lines = [
      "# Hồ sơ quá trình làm bài (Audit Trail)",
      "",
      `**Môn học:** ${escapeMarkdownCell(course.name)}`,
      `**Tạo lúc:** ${formatTimestamp(course.createdAt)}`,
      `**Cập nhật lúc:** ${formatTimestamp(course.updatedAt)}`,
      `**Xuất phụ lục lúc:** ${formatTimestamp(exportedAt || new Date().toISOString())}`,
      "",
      "> Đây là các ghi chú do sinh viên tự nhập. Nhật ký không xác thực thời điểm, hoạt động làm bài hoặc quyền sở hữu các liên kết.",
      "",
      "| Hạng mục | Ghi chú của sinh viên |",
      "| --- | --- |",
      ...rows
    ];
    if (!rows.length) lines.push("", "Chưa có ghi chú nào được nhập cho môn học này.");
    return `${lines.join("\n")}\n`;
  }

  function buildJsonExport(course) {
    if (!course || typeof course !== "object" || Array.isArray(course)) throw new TypeError("A selected course is required");
    // Match the versioned local-storage shape, but include only the selected course.
    // This makes the export portable without copying other course journals.
    const selectedCourse = {
      name: course.name,
      originalIdea: course.originalIdea,
      mainPrompts: course.mainPrompts,
      corrections: course.corrections,
      evidenceLink: course.evidenceLink,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    };
    return `${JSON.stringify({ version: VERSION, courses: [selectedCourse] }, null, 2)}\n`;
  }

  function makeElement(doc, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function makeButton(doc, text, className) {
    const button = makeElement(doc, "button", className || "apl-button", text);
    button.type = "button";
    return button;
  }

  function safeStorage(source, runtime) {
    try {
      const storage = typeof source === "function" ? source() : source === undefined ? runtime.localStorage : source;
      if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
        return { ok: false, error: "Bộ nhớ trình duyệt không khả dụng." };
      }
      return { ok: true, storage };
    } catch (_error) {
      return { ok: false, error: "Trình duyệt không cho phép truy cập bộ nhớ trên thiết bị này." };
    }
  }

  function mount(doc, navigatorObject, storageSource, runtime) {
    if (!doc || typeof doc.getElementById !== "function") return false;
    const host = doc.getElementById("toolkit-process-log");
    if (!host || (host.dataset && host.dataset.processLogMounted === "true")) return false;
    const browser = runtime || doc.defaultView || (typeof globalThis !== "undefined" ? globalThis : {});
    const storageResult = safeStorage(storageSource, browser);
    let storage = storageResult.ok ? storageResult.storage : null;
    let storageWritable = storageResult.ok;
    let storageProblem = storageResult.ok ? "" : storageResult.error;
    let data = { version: VERSION, courses: [] };
    let lastSavedAt = "";
    let lastObservedRaw = null;
    if (storage) {
      try {
        lastObservedRaw = storage.getItem(STORAGE_KEY);
        const loaded = parseStoredData(lastObservedRaw);
        if (loaded.ok) data = loaded.data;
        else {
          storageWritable = false;
          storageProblem = `${loaded.error} Dữ liệu gốc được giữ nguyên; chỉnh sửa hiện tại chỉ nằm trong tab này.`;
        }
      } catch (_error) {
        storageWritable = false;
        storageProblem = "Không đọc được bộ nhớ trình duyệt. Chỉnh sửa hiện tại chỉ nằm trong tab này.";
      }
    }
    const legacyV2 = inspectLegacyV2Logs(storage);

    const app = makeElement(doc, "section", "apl-process-log-app");
    app.setAttribute("aria-labelledby", "apl-title");
    const header = makeElement(doc, "div", "apl-heading");
    header.append(makeElement(doc, "span", "apl-kicker", "CÔNG CỤ · HỒ SƠ QUÁ TRÌNH"));
    const title = makeElement(doc, "h2", "apl-title", "Nhật Ký Minh Bạch AI");
    title.id = "apl-title";
    header.append(title, makeElement(doc, "p", "apl-intro", "Ghi lại cách bạn dùng AI, điều bạn tự kiểm tra và phần bạn đã tự sửa trong từng môn học."));
    app.append(header);

    const privacy = makeElement(doc, "aside", "apl-privacy");
    privacy.setAttribute("aria-label", "Lưu trữ và quyền riêng tư");
    privacy.append(
      makeElement(doc, "strong", "", "Lưu trên thiết bị của bạn"),
      makeElement(doc, "p", "", "Nhật ký tự lưu trong localStorage của trình duyệt này; công cụ không gửi nội dung lên máy chủ. Dữ liệu chỉ có trên cùng trình duyệt và thiết bị, không tự đồng bộ. Nếu dùng thiết bị chung, hãy tránh ghi thông tin nhạy cảm và xóa nhật ký hoặc dữ liệu trang khi xong."),
      makeElement(doc, "p", "apl-honesty", "Đây là ghi chú do bạn tự nhập; công cụ không xác thực thời điểm, quá trình làm bài hay quyền truy cập Google Docs/Git.")
    );
    app.append(privacy);

    let legacyExportButton = null;
    let legacyExportStatus = null;
    if (legacyV2.exists) {
      const legacyPanel = makeElement(doc, "aside", "apl-privacy");
      legacyPanel.setAttribute("aria-label", "Xuất nhật ký Legacy V2");
      legacyPanel.append(
        makeElement(doc, "strong", "", "Legacy V2 · nhật ký trên thiết bị này")
      );
      if (legacyV2.exportable) {
        legacyPanel.append(makeElement(doc, "p", "", "Có nhật ký cũ của công cụ V2 trên thiết bị này. Bản xuất giữ nguyên dữ liệu đã lưu; nhật ký có thể chứa mục mẫu từ bản V2 và không xác minh đây là hoạt động hay dữ liệu của sinh viên thật. Việc xuất không sửa hoặc xóa dữ liệu gốc."));
        legacyExportButton = makeButton(doc, "Xuất nhật ký Legacy V2 (JSON)", "apl-button apl-button-secondary");
        legacyExportStatus = makeElement(doc, "p", "apl-status", "");
        legacyExportStatus.setAttribute("role", "status");
        legacyExportStatus.setAttribute("aria-live", "polite");
        legacyPanel.append(legacyExportButton, legacyExportStatus);
      } else {
        legacyPanel.append(makeElement(doc, "p", "", "Có khóa dữ liệu Legacy V2 nhưng nội dung không phải JSON array hợp lệ; không thể xuất thành tệp JSON. Dữ liệu gốc chưa bị thay đổi."));
      }
      app.append(legacyPanel);
    }

    const status = makeElement(doc, "p", "apl-status", "");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const courseControls = makeElement(doc, "div", "apl-course-controls");
    const createLabel = makeElement(doc, "label", "apl-label", "Tên môn học");
    const createInput = doc.createElement("input");
    createInput.type = "text";
    createInput.id = "apl-course-name";
    createInput.className = "apl-input";
    createInput.maxLength = 120;
    createInput.autocomplete = "off";
    createInput.placeholder = "Ví dụ: Nhập môn Khoa học dữ liệu";
    createLabel.append(createInput);
    const addButton = makeButton(doc, "Thêm hoặc mở môn học", "apl-button apl-button-primary");
    const selectorLabel = makeElement(doc, "label", "apl-label apl-course-select-label", "Chọn nhật ký theo môn");
    const selector = doc.createElement("select");
    selector.id = "apl-course-select";
    selector.className = "apl-input apl-select";
    selectorLabel.append(selector);
    courseControls.append(createLabel, addButton, selectorLabel);
    app.append(courseControls, status);

    const corruptRecovery = makeElement(doc, "div", "apl-recovery");
    const recoveryButton = makeButton(doc, "Cho phép lưu nhật ký hiện tại thay cho dữ liệu lỗi", "apl-button apl-button-secondary");
    const recoveryPrompt = makeElement(doc, "div", "apl-confirm-panel");
    recoveryPrompt.hidden = true;
    recoveryPrompt.setAttribute("role", "group");
    recoveryPrompt.setAttribute("aria-label", "Xác nhận thay dữ liệu lưu bị lỗi");
    recoveryPrompt.append(
      makeElement(doc, "p", "", "Xác nhận này sẽ ghi đè dữ liệu không đọc được bằng các môn và ghi chú đang hiển thị trong tab. Nếu hủy, dữ liệu cũ sẽ được giữ nguyên."),
      makeButton(doc, "Ghi đè và lưu nhật ký hiện tại", "apl-button apl-button-danger"),
      makeButton(doc, "Hủy", "apl-button apl-button-secondary")
    );
    if (storage && !storageWritable && storageProblem.includes("Dữ liệu gốc được giữ nguyên")) {
      corruptRecovery.append(recoveryButton, recoveryPrompt);
      app.append(corruptRecovery);
    }

    const editor = makeElement(doc, "div", "apl-editor");
    app.append(editor);
    const actions = makeElement(doc, "div", "apl-actions");
    const downloadButton = makeButton(doc, "Xuất phụ lục Markdown", "apl-button apl-button-primary");
    const jsonButton = makeButton(doc, "Xuất JSON môn đang chọn", "apl-button apl-button-secondary");
    const printButton = makeButton(doc, "Bản in / Lưu PDF", "apl-button apl-button-secondary");
    downloadButton.disabled = true;
    jsonButton.disabled = true;
    printButton.disabled = true;
    actions.append(downloadButton, jsonButton, printButton);
    const removeButton = makeButton(doc, "Xóa môn học này", "apl-button apl-button-danger");
    removeButton.disabled = true;
    actions.append(removeButton);
    app.append(actions);

    const removeConfirm = makeElement(doc, "div", "apl-confirm-panel");
    removeConfirm.hidden = true;
    removeConfirm.setAttribute("role", "group");
    removeConfirm.setAttribute("aria-label", "Xác nhận xóa môn học");
    const removeMessage = makeElement(doc, "p", "", "");
    const confirmRemoveButton = makeButton(doc, "Có, xóa môn học và nhật ký", "apl-button apl-button-danger");
    const cancelRemoveButton = makeButton(doc, "Hủy", "apl-button apl-button-secondary");
    removeConfirm.append(removeMessage, confirmRemoveButton, cancelRemoveButton);
    app.append(removeConfirm);

    const printAppendix = makeElement(doc, "article", "apl-print-appendix");
    printAppendix.setAttribute("aria-label", "Phụ lục nhật ký quá trình làm bài");
    host.append(app, printAppendix);
    if (host.dataset) host.dataset.processLogMounted = "true";

    let currentName = "";
    let pendingDeleteName = "";

    function currentCourse() {
      return data.courses.find((course) => course.name === currentName) || null;
    }

    function announce(text) {
      status.textContent = text;
    }

    function saveData() {
      if (!storageWritable || !storage) {
        announce(storageProblem || "Chỉnh sửa nằm trong tab này; chưa thể lưu trên thiết bị.");
        return false;
      }
      try {
        const observedRaw = storage.getItem(STORAGE_KEY);
        if (observedRaw !== lastObservedRaw) {
          storageWritable = false;
          storageProblem = "Phát hiện nhật ký đã được thay đổi ở tab khác. Để tránh ghi đè, bản nháp hiện tại chỉ nằm trong tab này; hãy xuất Markdown trước khi tải lại trang.";
          announce(storageProblem);
          return false;
        }
        const serialized = JSON.stringify(data);
        storage.setItem(STORAGE_KEY, serialized);
        lastObservedRaw = serialized;
        lastSavedAt = nowIso();
        announce(`Đã tự lưu trên thiết bị lúc ${formatTimestamp(lastSavedAt)}.`);
        return true;
      } catch (_error) {
        storageWritable = false;
        storageProblem = "Không thể kiểm tra hoặc ghi bộ nhớ trình duyệt (có thể đã đầy hoặc bị chặn). Nội dung vẫn còn trong tab này; hãy xuất Markdown trước khi rời trang.";
        announce(storageProblem);
        return false;
      }
    }

    function renderCourseOptions() {
      const placeholder = makeElement(doc, "option", "", "Chọn môn học đã lưu");
      placeholder.value = "";
      selector.replaceChildren(placeholder);
      data.courses.forEach((course) => {
        const option = makeElement(doc, "option", "", course.name);
        option.value = course.name;
        selector.append(option);
      });
      if (!data.courses.some((course) => course.name === currentName)) currentName = "";
      selector.value = currentName;
      downloadButton.disabled = !currentName;
      jsonButton.disabled = !currentName;
      printButton.disabled = !currentName;
      removeButton.disabled = !currentName;
    }

    function buildPrintAppendix(course) {
      printAppendix.replaceChildren();
      if (!course) return;
      printAppendix.append(
        makeElement(doc, "p", "apl-print-kicker", "AI SMART CAMPUS · PHỤ LỤC"),
        makeElement(doc, "h1", "apl-print-title", "Hồ sơ quá trình làm bài (Audit Trail)"),
        makeElement(doc, "p", "apl-print-meta", `Môn học: ${course.name}`),
        makeElement(doc, "p", "apl-print-meta", `Tạo lúc: ${formatTimestamp(course.createdAt)} · Cập nhật lúc: ${formatTimestamp(course.updatedAt)}`)
      );
      const table = makeElement(doc, "table", "apl-print-table");
      const head = doc.createElement("thead");
      const headingRow = doc.createElement("tr");
      headingRow.append(makeElement(doc, "th", "", "Hạng mục"), makeElement(doc, "th", "", "Ghi chú của sinh viên"));
      head.append(headingRow);
      const body = doc.createElement("tbody");
      const populated = FIELDS.filter((field) => typeof course[field.key] === "string" && course[field.key].trim());
      populated.forEach((field) => {
        const row = doc.createElement("tr");
        const labelCell = makeElement(doc, "th", "", field.label);
        labelCell.scope = "row";
        const valueCell = makeElement(doc, "td", "", course[field.key].trim());
        row.append(labelCell, valueCell);
        body.append(row);
      });
      table.append(head, body);
      printAppendix.append(table);
      if (!populated.length) printAppendix.append(makeElement(doc, "p", "apl-print-empty", "Chưa có ghi chú nào được nhập cho môn học này."));
      printAppendix.append(makeElement(doc, "p", "apl-print-disclaimer", "Ghi chú do sinh viên tự nhập; tài liệu này không xác thực thời điểm, hoạt động làm bài hoặc quyền sở hữu liên kết."));
    }

    function renderEditor() {
      const course = currentCourse();
      editor.replaceChildren();
      buildPrintAppendix(course);
      renderCourseOptions();
      if (!course) {
        editor.append(makeElement(doc, "p", "apl-empty-state", "Thêm tên môn học để bắt đầu một nhật ký riêng. Chưa có nội dung nào được tạo thay bạn."));
        return;
      }
      editor.append(makeElement(doc, "h3", "apl-course-title", course.name));
      const fields = makeElement(doc, "div", "apl-fields");
      FIELDS.forEach((field) => {
        const label = makeElement(doc, "label", "apl-field-label", field.label);
        const textarea = doc.createElement("textarea");
        textarea.id = `apl-field-${field.key}`;
        textarea.className = "apl-textarea";
        textarea.rows = 5;
        textarea.value = course[field.key];
        textarea.setAttribute("aria-label", field.label);
        label.append(textarea);
        textarea.addEventListener("input", () => {
          course[field.key] = textarea.value;
          course.updatedAt = nowIso();
          buildPrintAppendix(course);
          saveData();
        });
        fields.append(label);
      });
      editor.append(fields);
      if (storageWritable && storage) {
        announce(lastSavedAt ? `Đã lưu trên thiết bị lúc ${formatTimestamp(lastSavedAt)}.` : "Nhật ký được lưu trên thiết bị này khi bạn nhập.");
      } else {
        announce(storageProblem || "Chỉnh sửa nằm trong tab này; chưa thể lưu trên thiết bị.");
      }
    }

    function updateSelectedCourse() {
      currentName = selector.value;
      pendingDeleteName = "";
      removeConfirm.hidden = true;
      renderEditor();
    }

    addButton.addEventListener("click", () => {
      const name = normalizeCourseName(createInput.value);
      if (!name) {
        announce("Nhập tên môn học trước khi tạo nhật ký.");
        createInput.focus();
        return;
      }
      const existing = data.courses.find((course) => courseNameKey(course.name) === courseNameKey(name));
      if (existing) {
        currentName = existing.name;
        createInput.value = "";
        renderEditor();
        announce(`Môn “${existing.name}” đã có nhật ký; đã mở nhật ký đó để tránh tạo bản trùng.`);
        return;
      }
      const stamp = nowIso();
      const course = createCourse(name, stamp);
      data.courses.push(course);
      currentName = course.name;
      createInput.value = "";
      renderEditor();
      saveData();
    });

    selector.addEventListener("change", updateSelectedCourse);
    removeButton.addEventListener("click", () => {
      const course = currentCourse();
      if (!course) return;
      pendingDeleteName = course.name;
      removeMessage.textContent = `Xóa môn “${course.name}” cùng toàn bộ ghi chú đã lưu của môn này?`;
      removeConfirm.hidden = false;
      confirmRemoveButton.focus();
    });
    cancelRemoveButton.addEventListener("click", () => {
      pendingDeleteName = "";
      removeConfirm.hidden = true;
      removeButton.focus();
    });
    confirmRemoveButton.addEventListener("click", () => {
      if (!pendingDeleteName) return;
      data.courses = data.courses.filter((course) => course.name !== pendingDeleteName);
      currentName = "";
      pendingDeleteName = "";
      removeConfirm.hidden = true;
      renderEditor();
      saveData();
    });

    if (recoveryPrompt.children.length) {
      recoveryButton.addEventListener("click", () => { recoveryPrompt.hidden = false; });
      recoveryPrompt.children[1].addEventListener("click", () => {
        storageWritable = true;
        recoveryPrompt.hidden = true;
        saveData();
      });
      recoveryPrompt.children[2].addEventListener("click", () => { recoveryPrompt.hidden = true; });
    }

    downloadButton.addEventListener("click", () => {
      const course = currentCourse();
      if (!course) return;
      try {
        const URLApi = browser.URL || (typeof URL !== "undefined" ? URL : null);
        const BlobCtor = browser.Blob || (typeof Blob !== "undefined" ? Blob : null);
        if (!URLApi || typeof URLApi.createObjectURL !== "function" || !BlobCtor) throw new Error("Download API unavailable");
        const blob = new BlobCtor(["\uFEFF", buildMarkdownExport(course, nowIso())], { type: "text/markdown;charset=utf-8" });
        const objectUrl = URLApi.createObjectURL(blob);
        const anchor = doc.createElement("a");
        anchor.href = objectUrl;
        anchor.download = "ho-so-qua-trinh-lam-bai.md";
        anchor.hidden = true;
        doc.body.append(anchor);
        anchor.click();
        anchor.remove();
        if (typeof URLApi.revokeObjectURL === "function") {
          const release = () => URLApi.revokeObjectURL(objectUrl);
          if (typeof browser.setTimeout === "function") browser.setTimeout(release, 0);
          else release();
        }
        announce("Đã tạo tệp Markdown từ nhật ký môn học đang chọn.");
      } catch (_error) {
        announce("Không thể tải tệp trong trình duyệt này. Bạn vẫn có thể dùng Bản in / Lưu PDF.");
      }
    });

    jsonButton.addEventListener("click", () => {
      const course = currentCourse();
      if (!course) return;
      try {
        const URLApi = browser.URL || (typeof URL !== "undefined" ? URL : null);
        const BlobCtor = browser.Blob || (typeof Blob !== "undefined" ? Blob : null);
        if (!URLApi || typeof URLApi.createObjectURL !== "function" || !BlobCtor) throw new Error("Download API unavailable");
        const blob = new BlobCtor([buildJsonExport(course)], { type: "application/json;charset=utf-8" });
        const objectUrl = URLApi.createObjectURL(blob);
        const anchor = doc.createElement("a");
        anchor.href = objectUrl;
        anchor.download = "ho-so-qua-trinh-lam-bai.json";
        anchor.hidden = true;
        doc.body.append(anchor);
        anchor.click();
        anchor.remove();
        if (typeof URLApi.revokeObjectURL === "function") {
          const release = () => URLApi.revokeObjectURL(objectUrl);
          if (typeof browser.setTimeout === "function") browser.setTimeout(release, 0);
          else release();
        }
        announce("Đã tạo tệp JSON từ nhật ký môn học đang chọn.");
      } catch (_error) {
        announce("Không thể tải tệp JSON trong trình duyệt này. Hãy thử Xuất phụ lục Markdown.");
      }
    });

    if (legacyExportButton) {
      legacyExportButton.addEventListener("click", () => {
        try {
          const URLApi = browser.URL || (typeof URL !== "undefined" ? URL : null);
          const BlobCtor = browser.Blob || (typeof Blob !== "undefined" ? Blob : null);
          if (!URLApi || typeof URLApi.createObjectURL !== "function" || !BlobCtor) throw new Error("Download API unavailable");
          // Export the exact original string; do not execute, display, normalize, or rewrite legacy entries.
          const blob = new BlobCtor([legacyV2.raw], { type: "application/json;charset=utf-8" });
          const objectUrl = URLApi.createObjectURL(blob);
          const anchor = doc.createElement("a");
          anchor.href = objectUrl;
          anchor.download = "legacy-ai-process-log-v2.json";
          anchor.hidden = true;
          doc.body.append(anchor);
          anchor.click();
          anchor.remove();
          if (typeof URLApi.revokeObjectURL === "function") {
            const release = () => URLApi.revokeObjectURL(objectUrl);
            if (typeof browser.setTimeout === "function") browser.setTimeout(release, 0);
            else release();
          }
          legacyExportStatus.textContent = "Đã tạo tệp Legacy V2; dữ liệu gốc trên thiết bị vẫn được giữ nguyên.";
        } catch (_error) {
          legacyExportStatus.textContent = "Không thể tải tệp Legacy V2 trong trình duyệt này.";
        }
      });
    }

    printButton.addEventListener("click", () => {
      if (!currentCourse()) return;
      buildPrintAppendix(currentCourse());
      const print = typeof browser.print === "function" ? browser.print.bind(browser) :
        browser.window && typeof browser.window.print === "function" ? browser.window.print.bind(browser.window) : null;
      if (!print) {
        announce("Trình duyệt hiện tại không hỗ trợ lệnh in. Hãy thử Xuất phụ lục Markdown.");
        return;
      }
      const body = doc.body;
      if (!body || !body.classList || typeof body.classList.add !== "function") {
        announce("Không thể mở chế độ in phụ lục trong trình duyệt này. Hãy thử Xuất phụ lục Markdown.");
        return;
      }
      const printTarget = typeof browser.addEventListener === "function" ? browser :
        browser.window && typeof browser.window.addEventListener === "function" ? browser.window : null;
      let printTimer = null;
      let cleared = false;
      const finishPrintMode = () => {
        if (cleared) return;
        cleared = true;
        body.classList.remove("apl-process-log-printing");
        if (printTarget) printTarget.removeEventListener("afterprint", finishPrintMode);
        if (printTimer !== null && typeof browser.clearTimeout === "function") browser.clearTimeout(printTimer);
      };
      try {
        body.classList.add("apl-process-log-printing");
        if (printTarget) {
          printTarget.addEventListener("afterprint", finishPrintMode, { once: true });
          // Safety net for browsers that fail to dispatch afterprint after a cancelled dialog.
          if (typeof browser.setTimeout === "function") printTimer = browser.setTimeout(finishPrintMode, 120000);
        }
        print();
        if (!printTarget) finishPrintMode();
      } catch (_error) {
        finishPrintMode();
        announce("Không thể mở bản in. Nhật ký vẫn được giữ nguyên; bạn có thể thử Xuất phụ lục Markdown.");
      }
    });

    if (storageProblem) announce(storageProblem);
    renderCourseOptions();
    renderEditor();
    return true;
  }

  return {
    STORAGE_KEY,
    VERSION,
    FIELDS,
    normalizeCourseName,
    courseNameKey,
    nowIso,
    formatTimestamp,
    createCourse,
    parseStoredData,
    escapeMarkdownCell,
    buildMarkdownExport,
    mount
  };
});
