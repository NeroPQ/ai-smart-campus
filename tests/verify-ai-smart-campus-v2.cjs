"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const htmlPath = path.join(__dirname, "..", "public", "ai_smart_campus_v2.html");
assert.ok(fs.existsSync(htmlPath), "ai_smart_campus_v2.html should exist in dist/");

const html = fs.readFileSync(htmlPath, "utf8");
assert.ok(html.length > 50000, "HTML should be substantial and populated");

// 1. Verify 4 AI Themes
const themes = ["neural-glass", "verify-hud", "quantum-neon", "academic-light"];
for (const theme of themes) {
  assert.ok(html.includes(`data-theme="${theme}"`) || html.includes(`[data-theme="${theme}"]`), `Theme ${theme} missing`);
  assert.ok(html.includes(`data-theme-btn="${theme}"`), `Theme button for ${theme} missing`);
}

// 2. Verify 7 Views / 6 Tools + Overview
const views = [
  "view-overview",
  "view-disclosure",
  "view-process-log",
  "view-vn-analyzer",
  "view-model-signal",
  "view-prompt-vault",
  "view-checker-persona"
];
for (const v of views) {
  assert.ok(html.includes(`id="${v}"`), `View ${v} missing`);
}

// 3. Verify Traffic Light policy styles
assert.ok(html.includes(".policy-green"), "Policy green CSS missing");
assert.ok(html.includes(".policy-yellow"), "Policy yellow CSS missing");
assert.ok(html.includes(".policy-red"), "Policy red CSS missing");

// 4. Verify Local VN NLP Highlighter classes
assert.ok(html.includes(".hl-cliche"), "Cliche highlight class missing");
assert.ok(html.includes(".hl-uncited"), "Uncited highlight class missing");
assert.ok(html.includes(".hl-long"), "Long sentence highlight class missing");
assert.ok(html.includes(".hl-good"), "Good citation highlight class missing");

// 5. Verify Export elements in Process Log
assert.ok(html.includes('id="btn-export-md"'), "Markdown export button missing");
assert.ok(html.includes('id="btn-copy-log-table"'), "Copy log table button missing");
assert.ok(html.includes('id="btn-export-json"'), "JSON export button missing");

console.log("PASS AI Smart Campus v2.0 multi-theme design system and 6 tools verification");
