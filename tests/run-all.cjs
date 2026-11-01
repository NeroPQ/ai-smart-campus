"use strict";
const { spawnSync } = require("node:child_process");
const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const tests = readdirSync(__dirname).filter(name => /^verify-.*\.(cjs|test\.js)$/.test(name)).sort();
for (const test of tests) {
  console.log(`\nRunning ${test}`);
  const args = test.endsWith(".test.js") ? ["--test", join(__dirname, test)] : [join(__dirname, test)];
  const result = spawnSync(process.execPath, args, { stdio: "inherit", cwd: join(__dirname, "..") });
  if (result.error || result.status !== 0) {
    if (result.error) console.error(result.error.message);
    process.exit(result.status || 1);
  }
}
console.log(`\nAll ${tests.length} test suites passed.`);
