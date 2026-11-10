"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const worker = require("../public/ai-model-worker.js");

const source = fs.readFileSync(path.join(__dirname, "../public/ai-model-worker.js"), "utf8");
assert.equal(worker.MODEL_ID, "mujian2026/multilingual-ai-text-detector");
assert.equal(worker.MODEL_REVISION, "60be618d23e169de6fe04b8e6135be7d8976abb7");
assert.equal(worker.RUNTIME_URL, "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js", "use the browser bundle; the .web entry contains bare imports unsupported by a native Worker");
assert.match(source, /remotePathTemplate\s*=\s*["']\{model\}\/resolve\/\{revision\}\/q4\/["']/);
assert.match(source, /allowLocalModels\s*=\s*false/);
assert.match(source, /wasm\.numThreads\s*=\s*1/);
assert.match(source, /pipeline\("text-classification",\s*MODEL_ID/);
assert.match(source, /dtype:\s*["']q4["']/);
assert.match(source, /device:\s*["']wasm["']/);

function words(count) {
  return Array.from({ length: count }, (_, index) => `word${index}`).join(" ");
}

assert.equal(worker.countWords("Tôi học AI trong năm học này."), 7);
assert.equal(worker.validateText(words(80)).wordCount, 80);
assert.throws(() => worker.validateText(words(79)), (error) => error.code === "text_too_short");
assert.throws(() => worker.validateText("  \n"), (error) => error.code === "empty_text");
assert.throws(() => worker.validateText(words(800)), (error) => error.code === "text_too_long");
assert.throws(() => worker.validateText("😀".repeat(3001)), (error) => error.code === "text_too_long");
assert.throws(() => worker.validateText(null), (error) => error.code === "invalid_text");

{
  const tokens = Array.from({ length: 611 }, (_, index) => index);
  const chunks = worker.splitTokenIds(tokens);
  assert.deepEqual(chunks.map((chunk) => chunk.length), [254, 254, 103]);
  assert.deepEqual(chunks.flat(), tokens, "chunk boundaries preserve every source token in order");
  assert.ok(chunks.every((chunk) => chunk.length <= 254));
  assert.throws(() => worker.splitTokenIds(Array.from({ length: 254 * 24 + 1 }, (_, index) => index)),
    (error) => error.code === "too_many_tokens");
  assert.throws(() => worker.splitTokenIds([1, Number.NaN]), (error) => error.code === "tokenization_failed");
}

assert.equal(worker.normalizeClassLabel("LABEL_0"), "human");
assert.equal(worker.normalizeClassLabel("AI-generated"), "ai");
assert.equal(worker.normalizeClassLabel("mystery"), null);
assert.equal(worker.scoreAiFromOutput([{ label: "human", score: 0.25 }, { label: "ai", score: 0.75 }]), 0.75);
assert.equal(worker.scoreAiFromOutput([{ label: "LABEL_0", score: 0.2 }, { label: "LABEL_1", score: 0.8 }]), 0.8);
assert.ok(Math.abs(worker.scoreAiFromOutput([{ label: "human", score: 0.9 }]) - 0.1) < 1e-12);
assert.throws(() => worker.scoreAiFromOutput([{ label: "unknown", score: 0.5 }]),
  (error) => error.code === "model_output_invalid");
assert.throws(() => worker.scoreAiFromOutput([{ label: "ai", score: Number.NaN }]),
  (error) => error.code === "model_output_invalid");
assert.throws(() => worker.scoreAiFromOutput([{ label: "ai", score: 1.1 }]),
  (error) => error.code === "model_output_invalid");
const weighted = worker.aggregateChunkScores([
  { scoreAi: 0.9, tokenCount: 3 },
  { scoreAi: 0.1, tokenCount: 1 }
]);
assert.ok(Math.abs(weighted.scoreAi - 0.7) < 1e-12);
assert.equal(weighted.verdict, "uncertain");
assert.equal(weighted.tokenCount, 4);
assert.equal(worker.verdictFor(0.8), "ai-leaning");
assert.equal(worker.verdictFor(0.2), "human-leaning");
assert.equal(worker.verdictFor(0.5), "uncertain");
assert.throws(() => worker.verdictFor(Number.NaN), (error) => error.code === "model_output_invalid");

(async () => {
  {
    const tokenizer = {
      encode(text) { return text.trim() ? text.trim().split(/\s+/u).map(Number) : []; },
      decode(ids) { return ids.join(" "); }
    };
    const sourceTokens = Array.from({ length: 520 }, (_, index) => index + 1);
    const chunks = await worker.prepareChunks(sourceTokens, tokenizer);
    assert.deepEqual(chunks.map((chunk) => chunk.tokenCount), [254, 254, 12]);
    assert.equal(chunks[0].sourceStart, 0);
    assert.equal(chunks.at(-1).sourceEnd, sourceTokens.length);
    assert.deepEqual(chunks.map((chunk) => chunk.text).join(" ").split(/\s+/u).map(Number), sourceTokens);
  }

  const messages = [];
  const fakeTokenizer = {
    encode(text) { return text.match(/[\p{L}\p{M}\p{N}]+/gu).map((_, index) => index); },
    decode(ids) { return ids.map((id) => `token${id}`).join(" "); }
  };
  const fakeClassifier = async () => [
    { label: "human", score: 0.3 },
    { label: "ai", score: 0.7 }
  ];
  fakeClassifier.tokenizer = fakeTokenizer;
  const handler = worker.createMessageHandler({
    postMessage(message) { messages.push(message); },
    async loadClassifier({ report }) {
      report({ type: "status", status: "loading-model" });
      report({ type: "progress", progress: { status: "progress", loaded: 2, total: 4 } });
      return fakeClassifier;
    }
  });

  assert.equal(await handler({ type: "ignored", id: "ignore" }), false);
  await handler({ type: "analyze", id: "test-1", text: words(80) });
  const resultMessage = messages.find((message) => message.type === "result");
  assert.ok(resultMessage, "the request handler returns a completed mock-model result");
  assert.equal(resultMessage.id, "test-1");
  assert.equal(resultMessage.result.wordCount, 80);
  assert.ok(Math.abs(resultMessage.result.scoreAi - 0.7) < 1e-12);
  assert.equal(resultMessage.result.verdict, "uncertain");
  assert.equal(resultMessage.result.tokenCount, 80);
  assert.equal(resultMessage.result.chunks[0].tokenCount, 80);
  assert.match(resultMessage.result.aggregation, /uncalibrated/);
  assert.ok(messages.some((message) => message.type === "status" && message.status === "running"));
  assert.ok(messages.some((message) => message.type === "progress" && message.progress.loaded === 2));

  messages.length = 0;
  await handler({ type: "analyze", id: "test-invalid", text: words(79) });
  assert.deepEqual(messages, [{
    id: "test-invalid",
    type: "error",
    error: { code: "text_too_short", message: "Bản thử nghiệm cần ít nhất 80 từ hoặc âm tiết." }
  }]);
})().catch((error) => {
  process.nextTick(() => { throw error; });
});
