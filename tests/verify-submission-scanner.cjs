"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const scanner = require("../dist/submission-scanner.js");

class FakeText {
  constructor(value) { this.nodeType = 3; this.text = String(value); this.parentNode = null; }
  get textContent() { return this.text; }
}

class FakeElement {
  constructor(tagName) {
    this.nodeType = 1;
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.listeners = {};
    this.className = "";
    this.value = "";
    this.disabled = false;
    this._textContent = "";
  }
  append(...nodes) {
    this._textContent = "";
    for (const node of nodes) {
      if (node && node.nodeType) {
        node.parentNode = this;
        this.children.push(node);
      }
    }
  }
  replaceChildren(...nodes) { this.children = []; this._textContent = ""; this.append(...nodes); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] || null; }
  addEventListener(name, callback) { (this.listeners[name] ||= []).push(callback); }
  dispatch(name) { for (const callback of this.listeners[name] || []) callback({ target: this }); }
  focus() { this.focused = true; }
  set textContent(value) {
    this.children = [];
    this._textContent = String(value);
    if (this._textContent) this.children.push(new FakeText(this._textContent));
  }
  get textContent() { return this.children.map((node) => node.textContent).join(""); }
}

class FakeDocument {
  constructor() { this.body = new FakeElement("body"); }
  createElement(tagName) { return new FakeElement(tagName); }
  createTextNode(value) { return new FakeText(value); }
  getElementById(id) {
    const visit = (node) => {
      if (node.id === id) return node;
      for (const child of node.children || []) {
        const found = visit(child);
        if (found) return found;
      }
      return null;
    };
    return visit(this.body);
  }
}

function walk(node, predicate = () => true, found = []) {
  if (predicate(node)) found.push(node);
  for (const child of node.children || []) walk(child, predicate, found);
  return found;
}

function click(node) { assert.ok(node, "expected button exists"); node.dispatch("click"); }

assert.equal(scanner.MAX_TEXT_LENGTH, 100000);

{
  const text = "Delve into the tapestry: a testament. This is crucial; furthermore, in conclusion.";
  const result = scanner.analyzeText(text);
  assert.equal(result.ok, true);
  assert.equal(result.counts.cliche, 6);
  for (const match of result.matches) assert.equal(text.slice(match.start, match.end), match.excerpt);
  assert.deepEqual(result.matches.map((match) => match.term), ["delve into", "tapestry", "testament", "crucial", "furthermore", "in conclusion"]);
  assert.deepEqual(result.references, []);
}

{
  const text = "Trong kỷ nguyên số hiện nay, bức tranh toàn cảnh, không thể phủ nhận rằng AI đóng vai trò then chốt.";
  const result = scanner.analyzeText(text.toLowerCase());
  assert.equal(result.counts.cliche, 4);
  assert.deepEqual(result.matches.map((match) => text.toLowerCase().slice(match.start, match.end)), [
    "trong kỷ nguyên số hiện nay", "bức tranh toàn cảnh", "không thể phủ nhận rằng", "đóng vai trò then chốt"
  ]);
  assert.equal(scanner.analyzeText("đangdelve intoSomething").counts.cliche, 0, "Unicode-aware boundaries avoid matches inside words");
}

{
  const text = "Chắc chắn rồi, dưới đây là kết quả. Certainly, here's the answer.\n### Tiêu đề\n**đậm** and `code`.";
  const result = scanner.analyzeText(text);
  assert.equal(result.counts.preamble, 2);
  assert.equal(result.counts.formatting, 3, "paired inline code is excluded from formatting review");
  const spans = result.matches.map(({ start, end }) => text.slice(start, end));
  assert.ok(spans.includes("Chắc chắn rồi, dưới đây là"));
  assert.ok(spans.includes("Certainly, here's"));
  assert.ok(spans.includes("###"));
  assert.ok(spans.filter((span) => span === "**").length === 2);
  assert.ok(!spans.includes("`"), "do not flag delimiters of an intentional code span");
  assert.ok(result.matches.every((match) => match.start >= 0 && match.end <= text.length && match.start < match.end));
}

{
  const text = "(Smith et al., 2023; Nguyễn Văn A, 2024; Smith et al., 2023). See https://example.edu/report_(draft)). and www.school.vn/source,";
  const result = scanner.analyzeText(text);
  assert.deepEqual(result.references, [
    { text: "(Smith et al., 2023)", kind: "citation" },
    { text: "(Nguyễn Văn A, 2024)", kind: "citation" },
    { text: "https://example.edu/report_(draft)", kind: "url" },
    { text: "www.school.vn/source", kind: "url" }
  ]);
}

{
  const result = scanner.analyzeText("https://example.com/Study?q=AI https://example.com/study?q=AI https://EXAMPLE.COM/Study?q=AI");
  assert.deepEqual(result.references, [
    { text: "https://example.com/Study?q=AI", kind: "url" },
    { text: "https://example.com/study?q=AI", kind: "url" }
  ], "URL de-duplication folds the host but preserves path and query case");
}

{
  const result = scanner.analyzeText("a".repeat(scanner.MAX_TEXT_LENGTH + 1));
  assert.equal(result.ok, false);
  assert.match(result.error, /100\.000/);
  assert.equal(result.length, scanner.MAX_TEXT_LENGTH + 1);
  assert.equal(scanner.analyzeText("").ok, true);
}

{
  const doc = new FakeDocument();
  const host = doc.createElement("div");
  host.id = "toolkit-scanner";
  doc.body.append(host);
  scanner.mount(doc);
  const textarea = walk(host, (node) => node.tagName === "TEXTAREA")[0];
  const scan = walk(host, (node) => node.tagName === "BUTTON" && node.textContent === "Quét độ an toàn")[0];
  const text = "delve into ".repeat(9000);
  assert.equal(text.length, 99000);
  textarea.value = text;
  textarea.dispatch("input");
  click(scan);
  const results = walk(host, (node) => node.className === "sc-results")[0];
  assert.equal(walk(results, (node) => node.tagName === "MARK").length, 9000);
  const preview = walk(results, (node) => node.className === "sc-preview")[0];
  assert.equal(preview.textContent, text, "sweep rendering preserves the full source text near the size limit");
}

{
  const doc = new FakeDocument();
  const host = doc.createElement("div");
  host.id = "toolkit-scanner";
  doc.body.append(host);
  assert.equal(scanner.mount(doc), true);
  assert.equal(scanner.mount(doc), false, "mount is idempotent");
  assert.equal(doc.getElementById("scanner-title").textContent, "Soi Bài Trước Giờ G");

  const textarea = walk(host, (node) => node.tagName === "TEXTAREA")[0];
  const scan = walk(host, (node) => node.tagName === "BUTTON" && node.textContent === "Quét độ an toàn")[0];
  const clear = walk(host, (node) => node.tagName === "BUTTON" && node.textContent === "Xóa văn bản")[0];
  const results = walk(host, (node) => node.className === "sc-results")[0];
  assert.equal(textarea.maxLength, scanner.MAX_TEXT_LENGTH);
  assert.equal(textarea.getAttribute("aria-describedby"), "sc-input-help sc-character-count");
  click(scan);
  assert.match(results.textContent, /Ô văn bản đang trống/);

  const payload = "A <img src=x onerror=alert(1)> citation (Smith, 2023).";
  textarea.value = payload;
  textarea.dispatch("input");
  click(scan);
  assert.equal(results.textContent.includes(payload), true, "preview preserves input as plain text");
  assert.equal(walk(results, (node) => node.tagName === "IMG").length, 0, "input does not create markup elements");
  const scholar = walk(results, (node) => node.tagName === "A")[0];
  assert.equal(scholar.target, "_blank");
  assert.equal(scholar.rel, "noopener noreferrer");
  assert.match(scholar.href, /scholar\.google\.com\/scholar\?q=\(Smith%2C%202023\)/);
  assert.match(results.textContent, /Chỉ khi bạn bấm/);
  textarea.value += " revised";
  textarea.dispatch("input");
  assert.match(results.textContent, /Văn bản đã thay đổi/);
  click(clear);
  assert.equal(textarea.value, "");
  assert.match(results.textContent, /Kết quả sẽ hiện ở đây/);
}

{
  const text = 'Tôi phân tích cụm “delve into” trong tài liệu.\n> furthermore là ví dụ được trích.\n```js\nconst x = "crucial";\n```';
  const result = scanner.analyzeText(text);
  assert.equal(result.counts.cliche, 0, "quoted discussion and code are not treated as the author's writing");
  assert.ok(result.writing.excludedRanges.length > 0);
}

{
  const doc = new FakeDocument();
  const host = doc.createElement("div");
  host.id = "toolkit-scanner";
  doc.body.append(host);
  scanner.mount(doc);
  const textarea = walk(host, (node) => node.tagName === "TEXTAREA")[0];
  textarea.value = 'As an AI language model, I cannot have personal experiences. <img src=x onerror=alert(1)>';
  click(walk(host, (node) => node.tagName === "BUTTON" && node.textContent === "Quét độ an toàn")[0]);
  const result = scanner.analyzeText(textarea.value);
  assert.ok(result.writing.findings.some((finding) => finding.category === "assistant"));
  assert.ok(host.textContent.includes("Phân tích mẫu diễn đạt"));
  assert.ok(host.textContent.includes("Văn bản còn ngắn"));
  assert.ok(host.textContent.includes("không phải xác suất AI"));
  assert.ok(walk(host, (node) => node.className === "sc-finding").length > 0);
  assert.equal(walk(host, (node) => node.tagName === "IMG").length, 0);
  const preview = walk(host, (node) => node.className === "sc-preview")[0];
  assert.equal(preview.textContent, textarea.value, "new signal highlighting preserves source safely");
}

{
  const source = fs.readFileSync(path.join(__dirname, "../dist/submission-scanner.js"), "utf8");
  assert.doesNotMatch(source, /\binnerHTML\b/);
  assert.doesNotMatch(source, /\blocalStorage\b|\bsessionStorage\b|\bfetch\s*\(/);
  const styles = fs.readFileSync(path.join(__dirname, "../dist/submission-scanner.css"), "utf8");
  assert.match(styles, /\.sc-results\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.7fr\)\s+minmax\(250px,\s*1fr\)/s);
  assert.match(styles, /@media\s*\(max-width:\s*620px\)[\s\S]*?\.sc-results\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
}

console.log("Submission scanner checks passed.");
