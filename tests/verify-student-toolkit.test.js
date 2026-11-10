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
  replaceChildren(...nodes) { this.children = [...nodes]; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, handler) { this.handlers[name] = handler; }
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
  }
  return {
    hosts,
    body: new FakeElement("body"),
    getElementById(id) { return hosts.get(id) || null; },
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
  const doc = makeDocument(true);
  assert.equal(toolkit.mount(doc, null), true);
  assert.equal(toolkit.mount(doc, null), false, "mount is idempotent");
  assert.ok(doc.hosts.get("toolkit-disclosure").children.length);
  assert.ok(doc.hosts.get("toolkit-prompts").children.length);

  const disclosureTree = walk(doc.hosts.get("toolkit-disclosure"));
  const checkboxes = disclosureTree.filter((node) => node.tagName === "INPUT" && node.type === "checkbox");
  assert.equal(checkboxes.length, Object.values(toolkit.OPTIONS).reduce((sum, options) => sum + options.length, 0));
  assert.ok(checkboxes.every((input) => !input.checked), "all declaration choices must be opt-in");
  const copyButton = disclosureTree.find((node) => node.className.includes("stk-toolkit-button-primary"));
  assert.equal(copyButton.disabled, true, "copy stays disabled until real use is selected");
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
  const preview = disclosureTree.find((node) => node.className === "stk-toolkit-preview");
  assert.ok(disclosureTree.some((node) => node.id === preview.attributes["aria-labelledby"]), "preview accessible name must reference a real heading");
  const reset = disclosureTree.find((node) => node.textContent === "Xóa lựa chọn");
  reset.handlers.click();
  assert.ok(checkboxes.every((input) => !input.checked));
  assert.equal(copyButton.disabled, true);
  assert.equal(output.lang, "vi");
  assert.doesNotMatch(tool._optionLabel.className, /is-selected/);

  const prompts = walk(doc.hosts.get("toolkit-prompts")).filter((node) => node.className === "stk-toolkit-prompt-card");
  assert.equal(prompts.length, 6);
  assert.equal(walk(doc.hosts.get("toolkit-prompts")).filter((node) => node.tagName === "DETAILS").length, 18,
    "each card has a challenge, a nested answer, and its full copyable prompt");
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
  const challenge = promptTree.find((node) => node.tagName === "DETAILS" && node.children[0].textContent === "Thử nâng cấp: câu này còn thiếu gì?");
  assert.ok(challenge, "each prompt includes an optional refinement challenge");
  assert.equal(challenge.attributes.open, undefined, "challenge starts collapsed");
  assert.ok(challenge.children.some((node) => node.tagName === "DETAILS" && node.children[0].textContent === "Xem một cách nâng cấp"));
  const promptCopy = promptTree.find((node) => node.tagName === "BUTTON" && node.textContent === "Sao chép prompt");
  await promptCopy.handlers.click();
  assert.equal(promptTree.find((node) => node.className === "stk-toolkit-status" && node.textContent === "Đã sao chép.").textContent, "Đã sao chép.");
  console.log("PASS disclosure is blank by default and includes only selected statements");
  console.log("PASS English output is not mislabeled as an APA citation");
  console.log("PASS clipboard failure returns false and mount is idempotent");
  console.log("PASS all declaration choices start unchecked and require tool plus task before copy");
  console.log("PASS six study prompts render with accessible category filters and collapsed refinement challenges");
  console.log("PASS prompt copy feedback remains available after filtering");
  console.log("PASS language buttons, selected state, accessible preview heading, reset and collapsed prompt details");
})().catch((error) => { console.error(error); process.exitCode = 1; });
