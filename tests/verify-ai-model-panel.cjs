"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const panelApi = require("../dist/ai-model-panel.js");
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.events = {}; this.value = ""; this.attrs = {}; }
  set textContent(value) { this.children = []; this.text = String(value); }
  get textContent() { return (this.text || "") + this.children.map(child => child.textContent).join(""); }
  setAttribute(key, value) { this.attrs[key] = value; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.text = ""; this.children = children; }
  addEventListener(event, fn) { (this.events[event] ||= []).push(fn); }
  fire(event = "click") { for (const fn of this.events[event] || []) fn({ target: this }); }
}
const doc = { createElement: tag => new Element(tag) };
const long = "Tôi đã tự đọc nguồn và ghi chú các ý cần kiểm tra. ".repeat(8);
assert.ok(panelApi.validate("ngắn"));
assert.ok(panelApi.validate("a ".repeat(4000)));
assert.equal(panelApi.validate(long), "");
const host = new Element("div"), input = new Element("textarea"), clear = new Element("button");
const workers = [];
function makeWorker() {
  const worker = { messages: [], terminated: false, postMessage(message) { this.messages.push(message); }, terminate() { this.terminated = true; } };
  workers.push(worker); return worker;
}
const ui = panelApi.mount(doc, host, input, clear, makeWorker);
assert.equal(workers.length, 0, "no model or remote runtime load on page open");
ui.analyze.fire(); assert.equal(workers.length, 0, "invalid input cannot load model");
input.value = long; ui.analyze.fire();
const first = workers[0], oldId = first.messages[0].id;
assert.equal(ui.analyze.disabled, true);
assert.equal(first.messages[0].text, long);
input.fire("input");
assert.equal(first.terminated, true);
assert.equal(ui.analyze.disabled, false);
const fakeResult = { scoreAi: .91, verdict: "ai-leaning", tokenCount: 100, chunks: [{ text: "<img src=x onerror=alert(1)>", scoreAi: .91, tokenCount: 100 }] };
first.onmessage({ data: { type: "result", id: oldId, result: fakeResult } });
assert.equal(ui.output.children.length, 0, "queued stale success cannot reappear after edits");
ui.analyze.fire();
const second = workers[1], nextId = second.messages[0].id;
first.onerror();
assert.equal(second.terminated, false, "old worker errors cannot terminate a new request");
second.onmessage({ data: { type: "result", id: nextId, result: fakeResult } });
assert.match(ui.output.textContent, /không phải xác suất/);
assert.match(ui.output.textContent, /<img src=x onerror=alert\(1\)>/);
assert.equal(ui.analyze.disabled, false);
input.fire("input"); assert.equal(ui.output.children.length, 0, "edits invalidate completed output");
ui.analyze.fire();
second.onmessage({ data: { type: "error", id: second.messages.at(-1).id, error: { code: "LOAD", message: "Không tải được mô hình" } } });
assert.match(ui.status.textContent, /Không tải được/);
assert.equal(second.terminated, true);
ui.analyze.fire();
clear.fire();
assert.equal(workers[2].terminated, true);
assert.equal(ui.output.children.length, 0);
assert.match(ui.status.textContent, /Đã xóa/);
const source = fs.readFileSync(require.resolve("../dist/ai-model-panel.js"), "utf8");
assert.doesNotMatch(source, /innerHTML|\bfetch\s*\(|localStorage|sessionStorage/);
console.log("Model panel validation, lazy loading, stale results, cancellation, safe rendering and retry checks passed.");
