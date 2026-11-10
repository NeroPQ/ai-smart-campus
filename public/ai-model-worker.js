"use strict";

// This worker downloads only the pinned runtime/model files. Manuscript text is
// tokenized and classified locally in the browser and is never used in a URL.
const MODEL_ID = "mujian2026/multilingual-ai-text-detector";
const MODEL_REVISION = "60be618d23e169de6fe04b8e6135be7d8976abb7";
const RUNTIME_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js";
const MAX_CHARACTERS = 6000;
const MIN_WORDS = 80;
const MAX_MODEL_TOKENS = 256;
const SPECIAL_TOKEN_COUNT = 2;
const MAX_SOURCE_TOKENS = MAX_MODEL_TOKENS - SPECIAL_TOKEN_COUNT;
const MAX_CHUNKS = 24;
const AI_THRESHOLD = 0.8;
const HUMAN_THRESHOLD = 0.2;

const ERROR_MESSAGES = Object.freeze({
  invalid_text: "Không đọc được văn bản. Hãy dán văn bản rồi thử lại.",
  empty_text: "Hãy dán văn bản cần kiểm tra.",
  text_too_long: "Văn bản tối đa 6.000 ký tự.",
  text_too_short: "Bản thử nghiệm cần ít nhất 80 từ hoặc âm tiết.",
  too_many_tokens: "Văn bản có quá nhiều đoạn để phân tích an toàn. Hãy rút ngắn văn bản rồi thử lại.",
  tokenization_failed: "Không thể chia văn bản thành các đoạn an toàn. Hãy rút ngắn văn bản rồi thử lại.",
  model_output_invalid: "Mô hình không trả về điểm hợp lệ. Hãy thử lại sau.",
  model_unavailable: "Không tải hoặc chạy được mô hình. Kiểm tra kết nối, bộ nhớ trình duyệt rồi thử lại."
});

class AnalysisError extends Error {
  constructor(code) {
    super(ERROR_MESSAGES[code] || ERROR_MESSAGES.model_unavailable);
    this.name = "AnalysisError";
    this.code = ERROR_MESSAGES[code] ? code : "model_unavailable";
  }
}

function countWords(text) {
  if (typeof text !== "string") return 0;
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu);
  return words ? words.length : 0;
}

function validateText(text) {
  if (typeof text !== "string") throw new AnalysisError("invalid_text");
  if (!text.trim()) throw new AnalysisError("empty_text");
  if (text.length > MAX_CHARACTERS) throw new AnalysisError("text_too_long");
  const wordCount = countWords(text);
  if (wordCount < MIN_WORDS) throw new AnalysisError("text_too_short");
  return { wordCount, characterCount: text.length };
}

function splitTokenIds(tokenIds, maxSourceTokens = MAX_SOURCE_TOKENS, maxChunks = MAX_CHUNKS) {
  if (!Array.isArray(tokenIds) || tokenIds.some((token) => !Number.isSafeInteger(token) || token < 0)) {
    throw new AnalysisError("tokenization_failed");
  }
  if (!Number.isSafeInteger(maxSourceTokens) || maxSourceTokens < 1 || !Number.isSafeInteger(maxChunks) || maxChunks < 1) {
    throw new AnalysisError("tokenization_failed");
  }
  if (tokenIds.length > maxSourceTokens * maxChunks) throw new AnalysisError("too_many_tokens");

  const chunks = [];
  for (let offset = 0; offset < tokenIds.length; offset += maxSourceTokens) {
    chunks.push(tokenIds.slice(offset, offset + maxSourceTokens));
  }
  if (chunks.length > maxChunks) throw new AnalysisError("too_many_tokens");
  return chunks;
}

async function prepareChunks(tokenIds, tokenizer, options = {}) {
  const maxSourceTokens = options.maxSourceTokens || MAX_SOURCE_TOKENS;
  const maxChunks = options.maxChunks || MAX_CHUNKS;
  if (!tokenizer || typeof tokenizer.encode !== "function" || typeof tokenizer.decode !== "function") {
    throw new AnalysisError("tokenization_failed");
  }
  // This up-front check bounds memory and provides a deterministic failure before
  // constructing strings for every possible chunk.
  splitTokenIds(tokenIds, maxSourceTokens, maxChunks);

  const chunks = [];
  let start = 0;
  while (start < tokenIds.length) {
    let end = Math.min(start + maxSourceTokens, tokenIds.length);
    let accepted = null;
    while (end > start) {
      const ids = tokenIds.slice(start, end);
      let decoded;
      let reencoded;
      try {
        decoded = tokenizer.decode(ids, { skip_special_tokens: true, clean_up_tokenization_spaces: false });
        reencoded = tokenizer.encode(decoded, { add_special_tokens: false });
      } catch (_error) {
        throw new AnalysisError("tokenization_failed");
      }
      if (typeof decoded !== "string" || !Array.isArray(reencoded) || reencoded.length === 0) {
        throw new AnalysisError("tokenization_failed");
      }
      if (reencoded.length <= maxSourceTokens) {
        accepted = { text: decoded, tokenCount: ids.length, sourceStart: start, sourceEnd: end };
        break;
      }
      // Decode and re-encode can change a boundary token. Shrink this source slice
      // until the actual pipeline input still fits with both model special tokens.
      const smallerLength = Math.max(1, Math.floor((end - start) / 2));
      if (smallerLength === end - start) break;
      end = start + smallerLength;
    }
    if (!accepted) throw new AnalysisError("tokenization_failed");
    chunks.push(accepted);
    if (chunks.length > maxChunks) throw new AnalysisError("too_many_tokens");
    start = accepted.sourceEnd;
  }

  return chunks;
}

function normalizeClassLabel(label) {
  if (typeof label !== "string") return null;
  const normalized = label.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  if (["ai", "ai generated", "ai generated text", "ai written", "machine generated", "label 1"].includes(normalized)) return "ai";
  if (["human", "human written", "human authored", "human text", "label 0"].includes(normalized)) return "human";
  return null;
}

function scoreAiFromOutput(output) {
  const entries = Array.isArray(output) ? output.flat(Infinity) : [output];
  const scores = new Map();
  for (const item of entries) {
    if (!item || typeof item !== "object") throw new AnalysisError("model_output_invalid");
    const kind = normalizeClassLabel(item.label);
    if (!kind || typeof item.score !== "number" || !Number.isFinite(item.score) || item.score < 0 || item.score > 1 || scores.has(kind)) {
      throw new AnalysisError("model_output_invalid");
    }
    scores.set(kind, item.score);
  }
  if (scores.has("ai") && scores.has("human")) {
    const total = scores.get("ai") + scores.get("human");
    if (!(total > 0) || !Number.isFinite(total)) throw new AnalysisError("model_output_invalid");
    return scores.get("ai") / total;
  }
  if (scores.size === 1) {
    const [[kind, score]] = scores.entries();
    return kind === "ai" ? score : 1 - score;
  }
  throw new AnalysisError("model_output_invalid");
}

function verdictFor(scoreAi) {
  if (typeof scoreAi !== "number" || !Number.isFinite(scoreAi) || scoreAi < 0 || scoreAi > 1) {
    throw new AnalysisError("model_output_invalid");
  }
  if (scoreAi >= AI_THRESHOLD) return "ai-leaning";
  if (scoreAi <= HUMAN_THRESHOLD) return "human-leaning";
  return "uncertain";
}

function aggregateChunkScores(chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) throw new AnalysisError("model_output_invalid");
  let weightedScore = 0;
  let totalTokens = 0;
  for (const chunk of chunks) {
    if (!chunk || !Number.isSafeInteger(chunk.tokenCount) || chunk.tokenCount < 1 ||
        typeof chunk.scoreAi !== "number" || !Number.isFinite(chunk.scoreAi) || chunk.scoreAi < 0 || chunk.scoreAi > 1) {
      throw new AnalysisError("model_output_invalid");
    }
    weightedScore += chunk.scoreAi * chunk.tokenCount;
    totalTokens += chunk.tokenCount;
  }
  const scoreAi = weightedScore / totalTokens;
  if (!Number.isFinite(scoreAi)) throw new AnalysisError("model_output_invalid");
  return { scoreAi, verdict: verdictFor(scoreAi), tokenCount: totalTokens };
}

function safeProgress(progress) {
  const safe = {};
  if (progress && typeof progress.status === "string") safe.status = progress.status.slice(0, 40);
  if (progress && typeof progress.file === "string") safe.file = progress.file.slice(0, 120);
  for (const key of ["loaded", "total", "progress"]) {
    if (progress && typeof progress[key] === "number" && Number.isFinite(progress[key])) safe[key] = progress[key];
  }
  return safe;
}

function errorPayload(error) {
  const code = error && ERROR_MESSAGES[error.code] ? error.code : "model_unavailable";
  return { code, message: ERROR_MESSAGES[code] };
}

function createMessageHandler({ postMessage, loadClassifier }) {
  if (typeof postMessage !== "function" || typeof loadClassifier !== "function") {
    throw new TypeError("postMessage and loadClassifier are required");
  }

  return async function handleMessage(data) {
    if (!data || data.type !== "analyze") return false;
    const id = data.id;
    const post = (message) => postMessage(Object.assign({ id }, message));
    try {
      const { wordCount } = validateText(data.text);
      post({ type: "status", status: "loading-runtime" });
      const classifier = await loadClassifier({
        report(message) {
          if (!message || typeof message !== "object") return;
          if (message.type === "progress") post({ type: "progress", progress: safeProgress(message.progress) });
          else if (message.type === "status") post({ type: "status", status: String(message.status || "loading-model").slice(0, 40) });
        }
      });
      if (typeof classifier !== "function" || !classifier.tokenizer || typeof classifier.tokenizer.encode !== "function") {
        throw new AnalysisError("model_unavailable");
      }

      let tokenIds;
      try {
        tokenIds = classifier.tokenizer.encode(data.text, { add_special_tokens: false });
      } catch (_error) {
        throw new AnalysisError("tokenization_failed");
      }
      if (!Array.isArray(tokenIds) || tokenIds.length === 0) throw new AnalysisError("tokenization_failed");
      const modelChunks = await prepareChunks(tokenIds, classifier.tokenizer);
      const scoredChunks = [];
      for (let index = 0; index < modelChunks.length; index += 1) {
        const chunk = modelChunks[index];
        post({ type: "status", status: "running", chunk: index + 1, totalChunks: modelChunks.length });
        let output;
        try {
          output = await classifier(chunk.text, { truncation: true, max_length: MAX_MODEL_TOKENS, top_k: 2 });
        } catch (_error) {
          throw new AnalysisError("model_unavailable");
        }
        scoredChunks.push({ text: chunk.text, tokenCount: chunk.tokenCount, scoreAi: scoreAiFromOutput(output) });
      }

      const aggregate = aggregateChunkScores(scoredChunks);
      post({
        type: "result",
        result: Object.assign(aggregate, {
          chunks: scoredChunks,
          wordCount,
          model: MODEL_ID,
          revision: MODEL_REVISION,
          aggregation: "token-weighted mean of chunk model scores; uncalibrated"
        })
      });
    } catch (error) {
      post({ type: "error", error: errorPayload(error) });
    }
    return true;
  };
}

let classifierPromise = null;
let classifierInstance = null;

async function loadClassifier({ report } = {}) {
  if (classifierInstance) return classifierInstance;
  if (!classifierPromise) {
    classifierPromise = (async () => {
      const transformers = await import(RUNTIME_URL);
      const { env, pipeline } = transformers;
      if (!env || typeof pipeline !== "function") throw new Error("Runtime unavailable");

      // This model revision contains files beneath q4/ and does not contain a
      // root config.json, so force the Hub resolver into the pinned subdirectory.
      env.remotePathTemplate = "{model}/resolve/{revision}/q4/";
      env.allowLocalModels = false;
      env.backends = env.backends || {};
      env.backends.onnx = env.backends.onnx || {};
      env.backends.onnx.wasm = env.backends.onnx.wasm || {};
      env.backends.onnx.wasm.numThreads = 1;

      if (report) report({ type: "status", status: "loading-model" });
      const classifier = await pipeline("text-classification", MODEL_ID, {
        revision: MODEL_REVISION,
        dtype: "q4",
        device: "wasm",
        progress_callback(progress) {
          if (report) report({ type: "progress", progress: safeProgress(progress) });
        }
      });
      return classifier;
    })();
  }

  try {
    classifierInstance = await classifierPromise;
    return classifierInstance;
  } catch (error) {
    // Permit a later explicit click to retry after a transient network failure.
    classifierPromise = null;
    classifierInstance = null;
    throw error;
  }
}

if (typeof self !== "undefined" && typeof self.addEventListener === "function") {
  const handleMessage = createMessageHandler({ postMessage: (data) => self.postMessage(data), loadClassifier });
  let requestQueue = Promise.resolve();
  self.addEventListener("message", (event) => {
    requestQueue = requestQueue.then(() => handleMessage(event.data)).catch(() => false);
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    MODEL_ID,
    MODEL_REVISION,
    RUNTIME_URL,
    MAX_CHARACTERS,
    MIN_WORDS,
    MAX_MODEL_TOKENS,
    MAX_SOURCE_TOKENS,
    MAX_CHUNKS,
    countWords,
    validateText,
    splitTokenIds,
    prepareChunks,
    normalizeClassLabel,
    scoreAiFromOutput,
    verdictFor,
    aggregateChunkScores,
    createMessageHandler,
    _errorPayload: errorPayload
  };
}
