const assert = require("node:assert/strict");
const fs = require("node:fs");
const processLog = require("../dist/process-log.js");

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.handlers = {};
    this.className = "";
    this.textContent = "";
    this.value = "";
    this.disabled = false;
    this.hidden = false;
    this.classList = {
      add: (token) => { if (!this.className.split(/\s+/).includes(token)) this.className = `${this.className} ${token}`.trim(); },
      remove: (token) => { this.className = this.className.split(/\s+/).filter((item) => item && item !== token).join(" "); },
      contains: (token) => this.className.split(/\s+/).includes(token)
    };
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, handler) { this.handlers[name] = handler; }
  focus() {}
  click() { if (this.handlers.click) this.handlers.click({ target: this }); }
  remove() {}
}

function walk(node) {
  return [node, ...(node.children || []).flatMap(walk)];
}

function makeDocument(runtime) {
  const host = new FakeElement("div");
  host.id = "toolkit-process-log";
  const body = new FakeElement("body");
  return {
    host,
    body,
    defaultView: runtime,
    getElementById(id) { return id === "toolkit-process-log" ? host : null; },
    createElement(tag) { return new FakeElement(tag); }
  };
}

function makeRuntime() {
  const runtime = {
    printed: 0,
    listeners: new Map(),
    timers: new Map(),
    nextTimer: 0,
    URL: {
      created: [],
      revoked: [],
      createObjectURL(blob) { this.created.push(blob); return "blob:local"; },
      revokeObjectURL(url) { this.revoked.push(url); }
    },
    setTimeout(callback, delay) {
      const id = ++this.nextTimer;
      if (delay === 0) callback();
      else this.timers.set(id, callback);
      return id;
    },
    clearTimeout(id) { this.timers.delete(id); },
    addEventListener(name, callback) { this.listeners.set(name, callback); },
    removeEventListener(name, callback) { if (this.listeners.get(name) === callback) this.listeners.delete(name); },
    dispatch(name) { const callback = this.listeners.get(name); if (callback) callback(); },
    print() { this.printed += 1; }
  };
  runtime.Blob = class FakeBlob {
    constructor(parts, options) { this.parts = parts; this.options = options; this.text = parts.join(""); }
  };
  return runtime;
}

function makeStorage(initial = null) {
  return {
    values: new Map(initial === null ? [] : [[processLog.STORAGE_KEY, initial]]),
    writes: 0,
    getItem(key) { return this.values.has(key) ? this.values.get(key) : null; },
    setItem(key, value) { this.writes += 1; this.values.set(key, value); }
  };
}

function getById(root, id) {
  return walk(root).find((node) => node.id === id);
}

function getButton(root, text) {
  return walk(root).find((node) => node.tagName === "BUTTON" && node.textContent === text);
}

assert.equal(processLog.normalizeCourseName("  Ca\u0301ch ho\u0323c  "), "Cách học", "course names are trimmed and normalized to NFC");
assert.equal(processLog.courseNameKey("MÔN A"), processLog.courseNameKey("môn a"), "case variants map to one duplicate key");
assert.equal(processLog.formatTimestamp("2026-10-29T09:05:00.000Z"), "29/10/2026 16:05 (UTC+7)");

const markdownCourse = processLog.createCourse("Lịch sử", "2026-10-29T09:05:00.000Z");
markdownCourse.originalIdea = "**bài** | <script>alert(1)</script>\nnext";
markdownCourse.evidenceLink = "https://example.test/a_(b)";
markdownCourse.updatedAt = "2026-10-29T10:30:00.000Z";
const markdown = processLog.buildMarkdownExport(markdownCourse, "2026-10-29T11:00:00.000Z");
assert.match(markdown, /\| Hạng mục \| Ghi chú của sinh viên \|/);
assert.match(markdown, /\\\*\\\*bài\\\*\\\* \\\| &lt;script&gt;/, "markdown values escape syntax and HTML");
assert.match(markdown, /<br>next/);
assert.match(markdown, /29\/10\/2026 17:30 \(UTC\+7\)/);
assert.doesNotMatch(markdown, /<script>/);
assert.match(markdown, /không xác thực thời điểm/);
const emptyMarkdown = processLog.buildMarkdownExport(processLog.createCourse("Trống", "2026-10-29T09:05:00.000Z"), "2026-10-29T09:05:00.000Z");
assert.doesNotMatch(emptyMarkdown, /\| Bước [1-4]/, "empty fields do not produce invented audit entries");
assert.match(emptyMarkdown, /Chưa có ghi chú nào/);

const malformedJson = processLog.parseStoredData("{broken");
assert.equal(malformedJson.ok, false, "corrupt JSON is detected");
const malformedShape = processLog.parseStoredData(JSON.stringify({ version: 1, courses: [{ name: "Thiếu trường" }] }));
assert.equal(malformedShape.ok, false, "invalid saved records are detected rather than normalized over");
assert.equal(processLog.parseStoredData(null).ok, true);

const runtime = makeRuntime();
const doc = makeDocument(runtime);
const storage = makeStorage();
assert.equal(processLog.mount(doc, null, storage, runtime), true);
assert.equal(processLog.mount(doc, null, storage, runtime), false, "mount is idempotent");
assert.ok(walk(doc.host).some((node) => node.tagName === "H2" && node.textContent === "Nhật Ký Minh Bạch AI"));

const nameInput = getById(doc.host, "apl-course-name");
nameInput.value = "  Ca\u0301ch ho\u0323c  ";
getButton(doc.host, "Thêm hoặc mở môn học").click();
assert.equal(getById(doc.host, "apl-course-select").value, "Cách học");
assert.equal(storage.writes, 1);
const firstIdea = getById(doc.host, "apl-field-originalIdea");
firstIdea.value = "Ý tưởng gốc cho môn đầu";
firstIdea.handlers.input();
assert.equal(JSON.parse(storage.getItem(processLog.STORAGE_KEY)).courses[0].originalIdea, "Ý tưởng gốc cho môn đầu");

nameInput.value = "môn A";
getButton(doc.host, "Thêm hoặc mở môn học").click();
getById(doc.host, "apl-field-mainPrompts").value = "Prompt của môn thứ hai";
getById(doc.host, "apl-field-mainPrompts").handlers.input();
assert.equal(storage.writes, 4);
getById(doc.host, "apl-course-select").value = "Cách học";
getById(doc.host, "apl-course-select").handlers.change();
assert.equal(getById(doc.host, "apl-field-originalIdea").value, "Ý tưởng gốc cho môn đầu", "switching subjects preserves the first draft");
getById(doc.host, "apl-course-select").value = "môn A";
getById(doc.host, "apl-course-select").handlers.change();
assert.equal(getById(doc.host, "apl-field-mainPrompts").value, "Prompt của môn thứ hai", "each subject keeps separate entries");

nameInput.value = " MÔN A ";
getButton(doc.host, "Thêm hoặc mở môn học").click();
assert.equal(JSON.parse(storage.getItem(processLog.STORAGE_KEY)).courses.length, 2, "case-insensitive duplicate names open the existing course");
nameInput.value = "__proto__";
getButton(doc.host, "Thêm hoặc mở môn học").click();
assert.equal(JSON.parse(storage.getItem(processLog.STORAGE_KEY)).courses.at(-1).name, "__proto__", "prototype-like course names are handled as ordinary names");

const printButton = getButton(doc.host, "Bản in / Lưu PDF");
printButton.click();
assert.equal(runtime.printed, 1, "print uses the current browser print API");
assert.equal(doc.body.classList.contains("apl-process-log-printing"), true, "explicit print temporarily enables the appendix-only print mode");
const printedText = walk(doc.host).map((node) => node.textContent).join(" ");
assert.match(printedText, /Hồ sơ quá trình làm bài \(Audit Trail\)/);
assert.match(printedText, /không xác thực thời điểm/);
runtime.dispatch("afterprint");
assert.equal(doc.body.classList.contains("apl-process-log-printing"), false, "afterprint clears the temporary mode after printing or cancellation");

const printErrorRuntime = makeRuntime();
printErrorRuntime.print = () => { throw new Error("print failed"); };
const printErrorDoc = makeDocument(printErrorRuntime);
processLog.mount(printErrorDoc, null, makeStorage(), printErrorRuntime);
getById(printErrorDoc.host, "apl-course-name").value = "Lỗi in";
getButton(printErrorDoc.host, "Thêm hoặc mở môn học").click();
getButton(printErrorDoc.host, "Bản in / Lưu PDF").click();
assert.equal(printErrorDoc.body.classList.contains("apl-process-log-printing"), false, "a print error clears the temporary mode");

const noPrintRuntime = makeRuntime();
noPrintRuntime.print = undefined;
const noPrintDoc = makeDocument(noPrintRuntime);
processLog.mount(noPrintDoc, null, makeStorage(), noPrintRuntime);
getById(noPrintDoc.host, "apl-course-name").value = "Không hỗ trợ in";
getButton(noPrintDoc.host, "Thêm hoặc mở môn học").click();
getButton(noPrintDoc.host, "Bản in / Lưu PDF").click();
assert.equal(noPrintDoc.body.classList.contains("apl-process-log-printing"), false, "missing print support never enables the temporary mode");

const processLogCss = fs.readFileSync(require.resolve("../dist/process-log.css"), "utf8");
const printCss = processLogCss.slice(processLogCss.indexOf("@media print"));
assert.match(printCss, /body\.apl-process-log-printing > #main/);
assert.match(printCss, /body\.apl-process-log-printing #toolkit-process-log \.apl-print-appendix/);
assert.doesNotMatch(printCss, /^\s*#disclosure/m, "ordinary Ctrl+P has no unscoped diary disclosure rule");
assert.doesNotMatch(printCss, /@page/, "the appendix print rules do not change margins for other pages");

const quotaRuntime = makeRuntime();
const quotaDoc = makeDocument(quotaRuntime);
const quotaStorage = {
  writes: 0,
  getItem() { return null; },
  setItem() { this.writes += 1; throw new Error("quota exceeded"); }
};
processLog.mount(quotaDoc, null, quotaStorage, quotaRuntime);
getById(quotaDoc.host, "apl-course-name").value = "Môn ngoại tuyến";
getButton(quotaDoc.host, "Thêm hoặc mở môn học").click();
const offlineInput = getById(quotaDoc.host, "apl-field-corrections");
offlineInput.value = "Đã tự sửa nhận định sai";
offlineInput.handlers.input();
assert.equal(quotaStorage.writes, 1, "failed storage writes are stopped to avoid repeated quota errors");
assert.equal(getButton(quotaDoc.host, "Xuất phụ lục Markdown").disabled, false, "export remains enabled in memory-only mode");
getButton(quotaDoc.host, "Xuất phụ lục Markdown").click();
assert.equal(quotaRuntime.URL.created.length, 1);
assert.match(quotaRuntime.URL.created[0].text, /Đã tự sửa nhận định sai/, "the in-memory draft remains exportable after storage failure");
assert.equal(quotaRuntime.URL.created[0].options.type, "text/markdown;charset=utf-8");

const sharedStorage = makeStorage();
const tabOneRuntime = makeRuntime();
const tabTwoRuntime = makeRuntime();
const tabOne = makeDocument(tabOneRuntime);
const tabTwo = makeDocument(tabTwoRuntime);
processLog.mount(tabOne, null, sharedStorage, tabOneRuntime);
processLog.mount(tabTwo, null, sharedStorage, tabTwoRuntime);
getById(tabOne.host, "apl-course-name").value = "Tab một";
getButton(tabOne.host, "Thêm hoặc mở môn học").click();
const savedByTabOne = sharedStorage.getItem(processLog.STORAGE_KEY);
getById(tabTwo.host, "apl-course-name").value = "Tab hai";
getButton(tabTwo.host, "Thêm hoặc mở môn học").click();
assert.equal(sharedStorage.writes, 1, "a stale tab cannot overwrite storage changed by another tab");
assert.equal(sharedStorage.getItem(processLog.STORAGE_KEY), savedByTabOne, "the first tab's stored changes are preserved on conflict");
assert.match(walk(tabTwo.host).map((node) => node.textContent).join(" "), /tab khác.*xuất Markdown/i);
assert.equal(getButton(tabTwo.host, "Xuất phụ lục Markdown").disabled, false, "the stale tab can still export its in-memory draft");

const corruptOriginal = "{not valid and must remain untouched";
const corruptStorage = makeStorage(corruptOriginal);
const corruptRuntime = makeRuntime();
const corruptDoc = makeDocument(corruptRuntime);
processLog.mount(corruptDoc, null, corruptStorage, corruptRuntime);
assert.match(getById(corruptDoc.host, "apl-course-name") ? walk(corruptDoc.host).map((node) => node.textContent).join(" ") : "", /Dữ liệu gốc được giữ nguyên/);
getById(corruptDoc.host, "apl-course-name").value = "Môn bản nháp";
getButton(corruptDoc.host, "Thêm hoặc mở môn học").click();
getById(corruptDoc.host, "apl-field-originalIdea").value = "Vẫn giữ trong bộ nhớ";
getById(corruptDoc.host, "apl-field-originalIdea").handlers.input();
assert.equal(corruptStorage.writes, 0, "corrupt original is not silently overwritten");
getButton(corruptDoc.host, "Cho phép lưu nhật ký hiện tại thay cho dữ liệu lỗi").click();
const recoveryPanel = walk(corruptDoc.host).find((node) => node.className === "apl-confirm-panel" && node.attributes["aria-label"] === "Xác nhận thay dữ liệu lưu bị lỗi");
assert.equal(recoveryPanel.hidden, false, "replacing corrupt data requires a visible inline confirmation");
recoveryPanel.children[1].click();
assert.equal(corruptStorage.writes, 1);
assert.match(corruptStorage.getItem(processLog.STORAGE_KEY), /Vẫn giữ trong bộ nhớ/);

const unavailableRuntime = makeRuntime();
const unavailableDoc = makeDocument(unavailableRuntime);
const deniedStorage = {
  getItem() { throw new Error("blocked"); },
  setItem() { throw new Error("blocked"); }
};
processLog.mount(unavailableDoc, null, deniedStorage, unavailableRuntime);
getById(unavailableDoc.host, "apl-course-name").value = "Không có storage";
getButton(unavailableDoc.host, "Thêm hoặc mở môn học").click();
assert.equal(getButton(unavailableDoc.host, "Xuất phụ lục Markdown").disabled, false);
assert.match(walk(unavailableDoc.host).map((node) => node.textContent).join(" "), /chỉ nằm trong tab này/);

const deleteRuntime = makeRuntime();
const deleteDoc = makeDocument(deleteRuntime);
processLog.mount(deleteDoc, null, makeStorage(), deleteRuntime);
getById(deleteDoc.host, "apl-course-name").value = "Xóa có xác nhận";
getButton(deleteDoc.host, "Thêm hoặc mở môn học").click();
getButton(deleteDoc.host, "Xóa môn học này").click();
const deletePanel = walk(deleteDoc.host).find((node) => node.className === "apl-confirm-panel" && node.attributes["aria-label"] === "Xác nhận xóa môn học");
assert.equal(deletePanel.hidden, false);
deletePanel.children[2].click();
assert.equal(deletePanel.hidden, true, "cancel leaves course state intact and closes the confirmation");
getButton(deleteDoc.host, "Xóa môn học này").click();
deletePanel.children[1].click();
assert.equal(getById(deleteDoc.host, "apl-course-select").value, "", "confirmed deletion removes only the selected course");

console.log("PASS Unicode-normalized, duplicate-safe course names and independent per-course drafts");
console.log("PASS Markdown export escapes user markup, includes timestamps, and leaves empty fields empty");
console.log("PASS malformed, unavailable, quota-failed, and stale-tab storage preserve drafts and enable export");
console.log("PASS corrupt saved data is preserved until explicit inline overwrite confirmation");
console.log("PASS explicit print scopes appendix-only CSS and clears on afterprint, unavailable print, or failure");
console.log("PASS course deletion requires inline confirmation");
