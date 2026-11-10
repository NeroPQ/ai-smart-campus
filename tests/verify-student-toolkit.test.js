const assert = require("node:assert/strict");
const toolkit = require("../public/student-toolkit.js");

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
    this.checked = false;
    this.disabled = false;
  }
  append(...nodes) { this.children.push(...nodes); }
  insertBefore(node, reference) {
    const index = this.children.indexOf(reference);
    if (index < 0) this.children.push(node);
    else this.children.splice(index, 0, node);
  }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, handler) { this.handlers[name] = handler; }
  focus() { this.focused = true; }
  scrollIntoView() { this.scrolled = true; }
  select() {}
  remove() {}
}

function walk(node) {
  return [node, ...(node.children || []).flatMap(walk)];
}

function makeDocument(withHosts = true) {
  const hosts = new Map();
  if (withHosts) {
    ["toolkit-disclosure", "toolkit-prompts"].forEach((id) => {
      const host = new FakeElement("div");
      host.id = id;
      hosts.set(id, host);
    });
    const journalHost = new FakeElement("div");
    journalHost.id = "toolkit-process-log";
    const draftHeading = new FakeElement("h3");
    draftHeading.id = "apl-draft-title";
    journalHost.append(draftHeading);
    hosts.set("toolkit-process-log", journalHost);
  }
  const viewHandlers = new Map();
  let currentHash = "#toolkit-prompts";
  const location = {};
  Object.defineProperty(location, "hash", {
    get() { return currentHash; },
    set(value) {
      const changed = currentHash !== value;
      currentHash = value;
      const handler = viewHandlers.get("hashchange");
      if (changed && handler) {
        handler.callback();
        if (handler.once) viewHandlers.delete("hashchange");
      }
    }
  });
  const defaultView = {
    location,
    requestAnimationFrame(callback) { callback(); },
    addEventListener(name, callback, options) { viewHandlers.set(name, { callback, once: Boolean(options && options.once) }); }
  };
  return {
    hosts,
    body: new FakeElement("body"),
    defaultView,
    getElementById(id) { return hosts.get(id) || [...hosts.values()].flatMap(walk).find((node) => node.id === id) || null; },
    createElement(tag) { return new FakeElement(tag); },
    execCommand() { return true; }
  };
}

assert.deepEqual(toolkit.initialDisclosureState(), { tools: [], tasks: [], checks: [], otherTool: "", language: "vi" });
assert.equal(toolkit.buildDisclosure(toolkit.initialDisclosureState()), "", "an untouched form must not invent AI use");

const withoutChecks = toolkit.buildDisclosure({
  tools: ["ChatGPT (OpenAI)"],
  tasks: ["giải thích khái niệm trong môn học"],
  checks: [],
  language: "vi"
});
assert.match(withoutChecks, /ChatGPT \(OpenAI\)/);
assert.match(withoutChecks, /giải thích khái niệm/);
assert.doesNotMatch(withoutChecks, /kiểm chứng|đối chiếu|APA|UNESCO/i, "unselected checks and citation claims must not appear");

const withChecks = toolkit.buildDisclosure({
  tools: ["Claude (Anthropic)"],
  tasks: ["proofread grammar"],
  checks: ["checked claims against original sources"],
  language: "en"
});
assert.match(withChecks, /I used Claude \(Anthropic\) to proofread grammar/);
assert.match(withChecks, /I took these steps to check the work: checked claims against original sources/);
assert.match(withChecks, /I take responsibility/);
assert.doesNotMatch(withChecks, /APA 7|UNESCO|citation/i);
const apaGuidance = toolkit.buildDisclosure({
  tools: ["ChatGPT (OpenAI)"], tasks: ["gợi ý ý tưởng"], checks: [], language: "apa"
});
assert.match(apaGuidance, /Hướng dẫn APA 7/);
assert.match(apaGuidance, /không phải trích dẫn/);
assert.doesNotMatch(apaGuidance, /OpenAI\. \(\d{4}\)|doi\.org|https?:\/\//i, "APA guidance must not invent a reference");

const literalUserText = toolkit.buildDisclosure({
  tools: ["<img src=x onerror=alert(1)>"] , tasks: ["tạo câu hỏi luyện tập"], checks: [], language: "vi"
});
assert.match(literalUserText, /<img src=x onerror=alert\(1\)>/);

(async () => {
  assert.equal(await toolkit.copyText("copy me", null, { clipboard: { async writeText() {} } }), true);
  const fallbackDoc = makeDocument(false);
  assert.equal(await toolkit.copyText("fallback", fallbackDoc, { clipboard: { async writeText() { throw new Error("denied"); } } }), true);
  fallbackDoc.execCommand = () => false;
  assert.equal(await toolkit.copyText("denied", fallbackDoc, null), false);

  assert.equal(toolkit.mount(makeDocument(false), null), false, "missing hosts should be a no-op");
  const offeredDrafts = [];
  const processLog = { offerDraft(entry) { offeredDrafts.push(entry); return true; } };
  let copiedText = "";
  const navigatorObject = { clipboard: { async writeText(value) { copiedText = value; } } };
  const doc = makeDocument(true);
  assert.equal(toolkit.mount(doc, navigatorObject, processLog), true);
  assert.equal(toolkit.mount(doc, navigatorObject, processLog), false, "mount is idempotent");
  assert.ok(doc.hosts.get("toolkit-disclosure").children.length);
  assert.ok(doc.hosts.get("toolkit-prompts").children.length);

  const disclosureTree = walk(doc.hosts.get("toolkit-disclosure"));
  const checkboxes = disclosureTree.filter((node) => node.tagName === "INPUT" && node.type === "checkbox");
  assert.equal(checkboxes.length, Object.values(toolkit.OPTIONS).reduce((sum, options) => sum + options.length, 0) + 1,
    "usage options and the separate accuracy confirmation start unchecked");
  assert.ok(checkboxes.every((input) => !input.checked), "all declaration choices must be opt-in");
  const copyButton = disclosureTree.find((node) => node.className.includes("stk-toolkit-button-primary"));
  assert.equal(copyButton.disabled, true, "copy stays disabled until real use is selected");
  const saveDisclosure = disclosureTree.find((node) => node.tagName === "BUTTON" && node.textContent === "Lưu bản nháp vào nhật ký…");
  assert.equal(saveDisclosure.disabled, true, "cross-save is disabled before the student confirms the declaration");
  const tool = disclosureTree.find((node) => node.id === "stk-tools-0");
  const task = disclosureTree.find((node) => node.id === "stk-tasks-2");
  tool.checked = true;
  task.checked = true;
  const form = disclosureTree.find((node) => node.className === "stk-toolkit-form");
  form.handlers.change();
  assert.equal(copyButton.disabled, false);
  const output = disclosureTree.find((node) => node.tagName === "PRE");
  assert.match(output.textContent, /ChatGPT \(OpenAI\)/);
  assert.match(output.textContent, /giải thích khái niệm/);
  assert.doesNotMatch(output.textContent, /gợi ý ý tưởng|gợi ý dàn ý/, "a single task choice must not imply other actions");
  assert.doesNotMatch(output.textContent, /kiểm chứng|đối chiếu/i, "empty verification choices must not create a verification claim");
  assert.match(tool._optionLabel.className, /is-selected/);
  const englishButton = disclosureTree.find((node) => node.tagName === "BUTTON" && node.textContent === "English");
  englishButton.handlers.click();
  assert.match(output.textContent, /^I used ChatGPT/);
  assert.equal(output.lang, "en");
  assert.equal(englishButton.attributes["aria-pressed"], "true");
  const apaButton = disclosureTree.find((node) => node.tagName === "BUTTON" && node.textContent === "APA 7 · hướng dẫn");
  apaButton.handlers.click();
  assert.match(output.textContent, /không phải trích dẫn/);
  assert.equal(apaButton.attributes["aria-pressed"], "true");
  englishButton.handlers.click();
  const accuracy = disclosureTree.find((node) => node.id === "stk-disclosure-confirmed");
  accuracy.checked = true;
  accuracy.handlers.change();
  assert.equal(saveDisclosure.disabled, false, "declaration save is enabled only after confirming the selections");
  doc.defaultView.location.hash = "#toolkit-disclosure";
  await saveDisclosure.handlers.click();
  assert.equal(offeredDrafts.at(-1).kind, "disclosure");
  assert.match(offeredDrafts.at(-1).body, /I used ChatGPT/);
  assert.equal(doc.defaultView.location.hash, "#toolkit-process-log", "declaration cross-save opens the journal screen");
  const preview = disclosureTree.find((node) => node.className === "stk-toolkit-preview");
  assert.ok(disclosureTree.some((node) => node.id === preview.attributes["aria-labelledby"]), "preview accessible name must reference a real heading");
  const reset = disclosureTree.find((node) => node.textContent === "Xóa lựa chọn");
  apaButton.handlers.click();
  reset.handlers.click();
  assert.equal(apaButton.attributes["aria-pressed"], "false", "reset clears the APA guidance selection too");
  assert.ok(checkboxes.every((input) => !input.checked));
  assert.equal(copyButton.disabled, true);
  assert.equal(output.lang, "vi");
  assert.doesNotMatch(tool._optionLabel.className, /is-selected/);

  const prompts = walk(doc.hosts.get("toolkit-prompts")).filter((node) => node.className === "stk-toolkit-prompt-card");
  assert.equal(prompts.length, 6);
  assert.equal(walk(doc.hosts.get("toolkit-prompts")).filter((node) => node.tagName === "DETAILS").length, 12,
    "each card has a side-by-side refinement and a full copyable prompt");
  assert.equal(toolkit.PROMPTS[0].title, "Giảng viên phản biện khó tính");
  assert.equal(toolkit.PROMPT_CATEGORIES.length, 4);
  assert.ok(prompts.every((card) => card.hidden === undefined || card.hidden === false), "all six prompts are visible initially");
  const promptTree = walk(doc.hosts.get("toolkit-prompts"));
  const promptFilterGroup = promptTree.find((node) => node.attributes.role === "group" && node.attributes["aria-label"] === "Lọc prompt theo nhu cầu");
  assert.ok(promptFilterGroup, "category controls have an accessible group name");
  const programmingFilter = promptTree.find((node) => node.tagName === "BUTTON" && node.textContent === "Lập trình (1)");
  programmingFilter.handlers.click();
  assert.equal(programmingFilter.attributes["aria-pressed"], "true");
  assert.deepEqual(prompts.filter((card) => !card.hidden).map((card) => card.dataset.category), ["programming"]);
  assert.equal(promptTree.find((node) => node.attributes["aria-live"] === "polite").textContent, "Đang hiển thị 1 trên 6 mẫu.");
  const allFilter = promptTree.find((node) => node.tagName === "BUTTON" && node.textContent === "Tất cả mẫu (6)");
  allFilter.handlers.click();
  assert.ok(prompts.every((card) => !card.hidden), "the all filter restores every prompt");
  const challenge = promptTree.find((node) => node.tagName === "DETAILS" && node.children[0].textContent === "So sánh câu hỏi ban đầu và cách cải thiện");
  assert.ok(challenge, "each prompt includes an optional refinement challenge");
  assert.equal(challenge.attributes.open, undefined, "challenge starts collapsed");
  assert.ok(challenge.children.some((node) => node.className === "stk-toolkit-example-grid" && node.children.length === 2), "weak and strong prompt examples appear side by side");
  const search = promptTree.find((node) => node.tagName === "INPUT" && node.type === "search");
  search.value = "debug";
  search.handlers.input();
  assert.deepEqual(prompts.filter((card) => !card.hidden).map((card) => card.dataset.category), ["programming"], "search narrows category results");
  search.value = "";
  search.handlers.input();
  const topic = promptTree.find((node) => node.tagName === "INPUT" && node.placeholder === "Ví dụ: đạo đức khi dùng AI trong đại học");
  topic.value = "climate change";
  topic.handlers.input();
  search.value = "climate change";
  search.handlers.input();
  assert.deepEqual(prompts.filter((card) => !card.hidden).map((card) => card.dataset.promptIndex), ["3", "5"],
    "search also matches the selected topic after substitution");
  search.value = "";
  search.handlers.input();
  const substitutedCard = prompts[3];
  assert.match(walk(substitutedCard).map((node) => node.textContent).join(" "), /climate change/);
  const substitutedTree = walk(substitutedCard);
  const promptCopy = substitutedTree.find((node) => node.tagName === "BUTTON" && node.textContent === "Sao chép prompt");
  await promptCopy.handlers.click();
  assert.equal(substitutedTree.find((node) => node.className === "stk-toolkit-status" && node.textContent === "Đã sao chép.").textContent, "Đã sao chép.");
  assert.match(copiedText, /climate change/, "the selected topic is used in the copied prompt");
  const savePrompt = substitutedTree.find((node) => node.tagName === "BUTTON" && node.textContent === "Lưu mẫu vào nhật ký…");
  doc.defaultView.location.hash = "#toolkit-prompts";
  savePrompt.handlers.click();
  assert.equal(offeredDrafts.at(-1).kind, "prompt");
  assert.match(offeredDrafts.at(-1).body, /climate change/);
  assert.equal(doc.defaultView.location.hash, "#toolkit-process-log", "saving a toolkit draft navigates to the journal screen");
  const reviewHeading = doc.getElementById("apl-draft-title");
  assert.equal(reviewHeading.focused, true, "after route change, focus moves to the journal review panel");
  assert.equal(reviewHeading.scrolled, true, "after route change, the review panel is brought into view");

  toolkit.attachProcessLog(null);
  const lateDoc = makeDocument(true);
  toolkit.mount(lateDoc, null);
  const lateTree = walk(lateDoc.hosts.get("toolkit-disclosure"));
  const preset = lateTree.find((node) => node.tagName === "SELECT" && node.attributes["aria-label"] === "Gợi ý theo loại bài; không tự chọn mục khai báo");
  preset.value = "writing";
  preset.handlers.change();
  assert.ok(lateTree.filter((node) => node.tagName === "INPUT" && node.type === "checkbox").every((input) => !input.checked),
    "essay/code suggestions never preselect unverified usage claims");
  lateTree.find((node) => node.id === "stk-tools-0").checked = true;
  lateTree.find((node) => node.id === "stk-tasks-0").checked = true;
  lateTree.find((node) => node.id === "stk-disclosure-confirmed").checked = true;
  lateTree.find((node) => node.className === "stk-toolkit-form").handlers.change();
  const lateSave = lateTree.find((node) => node.tagName === "BUTTON" && node.textContent === "Lưu bản nháp vào nhật ký…");
  assert.equal(lateSave.disabled, true, "save stays unavailable until the journal module attaches");
  toolkit.attachProcessLog(processLog);
  assert.equal(lateSave.disabled, false, "late journal initialization enables existing save controls");
  console.log("PASS disclosure is blank by default and includes only selected statements");
  console.log("PASS English output is not mislabeled as an APA citation");
  console.log("PASS clipboard failure returns false and mount is idempotent");
  console.log("PASS all declaration choices start unchecked and require tool plus task before copy");
  console.log("PASS six study prompts render with search, category filters, topic substitution and side-by-side examples");
  console.log("PASS prompt copy feedback remains available after filtering");
  console.log("PASS language buttons, selected state, accessible preview heading, reset and collapsed prompt details");
  console.log("PASS toolkit/journal startup order is handled through a late integration handshake");
})().catch((error) => { console.error(error); process.exitCode = 1; });
