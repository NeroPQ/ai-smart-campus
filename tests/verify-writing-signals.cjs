"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const writing = require("../dist/writing-signals.js");

function findingsOf(result, id) { return result.findings.filter((finding) => finding.id === id); }

function assertValidResult(text, result) {
  assert.deepEqual(Object.keys(result).sort(), ["excludedRanges", "findings", "metrics", "sufficientText"].sort());
  assert.deepEqual(Object.keys(result.metrics).sort(), ["paragraphCount", "sentenceCount", "wordCount"].sort());
  for (const range of result.excludedRanges) {
    assert.ok(range.start >= 0 && range.start < range.end && range.end <= text.length);
  }
  for (let index = 1; index < result.excludedRanges.length; index += 1) {
    assert.ok(result.excludedRanges[index - 1].end < result.excludedRanges[index].start, "exclusions are sorted and merged");
  }
  for (const finding of result.findings) {
    assert.ok(["assistant", "template", "repetition", "structure"].includes(finding.category));
    assert.ok(finding.ranges.length <= writing.MAX_RANGES_PER_FINDING);
    for (const range of finding.ranges) {
      assert.ok(range.start >= 0 && range.start < range.end && range.end <= text.length);
      assert.ok(!result.excludedRanges.some((excluded) => excluded.start < range.end && range.start < excluded.end), "findings never highlight excluded content");
    }
  }
  assert.ok(result.findings.length <= writing.MAX_FINDINGS);
}

assert.equal(writing.MAX_TEXT_LENGTH, 100000);

{
  const text = "As an AI language model, I cannot have personal experiences.";
  const result = writing.analyze(text);
  assertValidResult(text, result);
  assert.equal(result.sufficientText, false);
  assert.equal(result.metrics.wordCount, 10);
  assert.deepEqual(findingsOf(result, "assistant-residue")[0].ranges.map((range) => text.slice(range.start, range.end)), ["As an AI language model"]);
}

{
  const text = "It is important to note that this short example contains only one sentence.";
  const result = writing.analyze(text);
  assertValidResult(text, result);
  assert.equal(result.sufficientText, false);
  assert.equal(findingsOf(result, "generic-boilerplate").length, 0, "short prose does not get stylistic findings");
}

{
  const manyWords = Array(45).fill("evidence").join(" ");
  const text = `It is important to note that ${manyWords}. ${manyWords}.`;
  const result = writing.analyze(text);
  assertValidResult(text, result);
  assert.ok(result.metrics.wordCount >= 80);
  assert.equal(result.metrics.sentenceCount, 2);
  assert.equal(result.sufficientText, false, "two-sentence text stays below the stylistic-analysis gate");
  assert.equal(findingsOf(result, "generic-boilerplate").length, 0);
}

{
  const text = [
    "A student quoted “delve into” while discussing the wording in a source.",
    "> The report says that this is crucial for the whole study.",
    "```js",
    "const phrase = \"as an AI language model\";",
    "const label = 'furthermore';",
    "```",
    "The writer also typed `a tapestry of evidence` as literal code."
  ].join("\n");
  const result = writing.analyze(text);
  assertValidResult(text, result);
  assert.equal(findingsOf(result, "assistant-residue").length, 0);
  assert.equal(findingsOf(result, "generic-boilerplate").length, 0);
  assert.ok(result.excludedRanges.some((range) => text.slice(range.start, range.end).startsWith("“delve into”")));
  assert.ok(result.excludedRanges.some((range) => text.slice(range.start, range.end).startsWith("> The report")));
  assert.ok(result.excludedRanges.some((range) => text.slice(range.start, range.end).includes("```js")));
  assert.ok(result.excludedRanges.some((range) => text.slice(range.start, range.end).includes("a tapestry of evidence")));
}

{
  const text = "A careful analysis compares each result with the original source.\n\nReferences\nSmith (2022). It is important to note that this listing is not essay prose.\n";
  const result = writing.analyze(text);
  assertValidResult(text, result);
  const bibliography = result.excludedRanges.find((range) => text.slice(range.start, range.end).startsWith("References"));
  assert.ok(bibliography);
  assert.equal(text.slice(bibliography.start, bibliography.end).includes("Smith (2022)"), true);
  assert.equal(findingsOf(result, "generic-boilerplate").length, 0);
}

{
  const ordinaryFormal = [
    "The committee reviewed the enrollment records before publishing its annual report.",
    "Researchers compared the regional figures with interviews from three campus offices, then noted several limits in the sample.",
    "A later survey may clarify whether the observed change reflects policy, student demand, or a difference in data collection.",
    "The appendix explains how responses were coded, including two categories defined before collection began.",
    "Several participants asked for a weekday appointment; the schedule offered none, so their comments remain in a separate table."
  ].join(" ");
  const result = writing.analyze(ordinaryFormal);
  assertValidResult(ordinaryFormal, result);
  assert.ok(result.metrics.wordCount >= 80);
  assert.equal(result.sufficientText, true);
  assert.deepEqual(result.findings, [], "ordinary formal prose should not be flagged without an observed listed pattern");
}

{
  const prose = [
    "It is important to note that the library records access by course, while staff interviews explain why students choose particular sources.",
    "Điều quan trọng cần lưu ý là số liệu chỉ phản ánh nhóm được khảo sát, vì vậy báo cáo cũng cần nêu rõ giới hạn của mẫu.",
    "The research team checked each entry against the original document and described any uncertainty before drawing a conclusion.",
    "Students can compare these findings with their own observations, then explain which evidence supports each claim in the final report."
  ].join(" ");
  const result = writing.analyze(prose);
  assertValidResult(prose, result);
  assert.equal(result.sufficientText, true);
  const boilerplate = findingsOf(result, "generic-boilerplate")[0];
  assert.ok(boilerplate);
  assert.ok(boilerplate.ranges.some((range) => prose.slice(range.start, range.end) === "It is important to note that"));
  assert.ok(boilerplate.ranges.some((range) => prose.slice(range.start, range.end) === "Điều quan trọng cần lưu ý là"));
}

{
  const text = "Draft note: [insert your source here]; and in Vietnamese, [điền tên tác giả] or [ví dụ].";
  const result = writing.analyze(text);
  assertValidResult(text, result);
  const placeholders = findingsOf(result, "template-placeholder")[0];
  assert.ok(placeholders);
  assert.deepEqual(placeholders.ranges.map((range) => text.slice(range.start, range.end)), ["[insert your source here]", "[điền tên tác giả]", "[ví dụ]"]);
}

{
  const text = "“😀🧪” As an AI language model";
  const result = writing.analyze(text);
  assertValidResult(text, result);
  const finding = findingsOf(result, "assistant-residue")[0];
  assert.ok(finding);
  assert.deepEqual(finding.ranges.map((range) => text.slice(range.start, range.end)), ["As an AI language model"], "excluded astral characters do not shift later source offsets");
}

{
  const repeated = "Every student should review each source and explain its relevance before submission.";
  const padding = "Researchers should identify evidence, describe the method, compare the results, and explain any limits before making a careful conclusion. ".repeat(4);
  const text = `${repeated} ${repeated} ${padding}`;
  const result = writing.analyze(text);
  assertValidResult(text, result);
  const finding = findingsOf(result, "repeated-sentence-1")[0];
  assert.ok(finding);
  assert.deepEqual(finding.ranges.map((range) => text.slice(range.start, range.end)), [repeated, repeated]);
}

{
  const opening = "In the study group students compare evidence carefully";
  const firstSixWords = "In the study group students compare";
  const paragraphs = [
    `${opening} before writing a short summary of the first source. This paragraph adds details about interviews and observations.`,
    `${opening} while reviewing a separate question from the second source. This paragraph gives a different example and explains its limits.`,
    "Each team should record its own question, explain the chosen evidence, and identify the source before reaching a conclusion.",
    "The instructor can then compare the notes and ask students to justify the differences using details from their readings."
  ];
  const text = paragraphs.join("\n\n");
  const result = writing.analyze(text);
  assertValidResult(text, result);
  const finding = findingsOf(result, "repeated-opening-1")[0];
  assert.ok(finding);
  assert.deepEqual(finding.ranges.map((range) => text.slice(range.start, range.end)), [firstSixWords, firstSixWords]);
}

{
  const sentences = [
    "However, the first dataset covers only two academic terms, which limits comparison across years.",
    "Therefore, the team checked enrollment records before interpreting the reported change.",
    "In addition, staff interviews supplied context that the numeric table could not show.",
    "For example, several students described a scheduling change that affected when they could use the library.",
    "The report states the method, names the sources, and distinguishes recorded results from interpretation.",
    "The authors identify the data source and explain how the team checked dates against the original records."
  ];
  const text = sentences.join(" ");
  const result = writing.analyze(text);
  assertValidResult(text, result);
  assert.ok(result.metrics.wordCount >= 80);
  const finding = findingsOf(result, "connector-cluster")[0];
  assert.ok(finding);
  assert.deepEqual(finding.ranges.map((range) => text.slice(range.start, range.end)), ["However", "Therefore", "In addition", "For example"]);
}

{
  const sentences = [
    "However, the first campus survey received responses from several departments during the autumn term.",
    "Therefore, the methods note lists recruitment dates so readers can understand the sample.",
    "In addition, staff recorded incomplete forms before excluding any entries from the final table.",
    "Students described different study schedules during interviews held across three separate weeks.",
    "The report gives the response count and names the offices that shared the records.",
    "One participant asked for a weekday appointment, while another preferred an online meeting.",
    "A second review checked the dates against the archived copy before analysts summarized the results.",
    "The final appendix preserves the questions used in the survey for later comparison.",
    "Researchers can repeat the process next term and record any changes to the collection method.",
    "Those details help readers interpret the figures within the limits of this small sample."
  ];
  const text = sentences.join(" ");
  const result = writing.analyze(text);
  assertValidResult(text, result);
  assert.ok(result.metrics.wordCount >= 80);
  assert.equal(result.metrics.sentenceCount, 10);
  assert.equal(findingsOf(result, "connector-cluster").length, 0, "three connectors scattered across a long article are not a cluster");
}

{
  const sentence = "It is important to note that careful researchers describe the evidence and explain each result with precision.";
  const text = Array.from({ length: 8 }, () => sentence).join(" ");
  const result = writing.analyze(text);
  assertValidResult(text, result);
  assert.ok(result.metrics.wordCount >= 120);
  assert.equal(result.metrics.sentenceCount, 8);
  assert.ok(findingsOf(result, "uniform-sentence-length").length, "uniformity appears only beside an observed phrase pattern");
  const uniform = findingsOf(result, "uniform-sentence-length")[0];
  assert.equal(uniform.ranges.length, 8);
}

{
  const decomposed = "Tôi không có trải nghiệm cá nhân".normalize("NFD");
  const text = `🧪👩🏽‍🔬 ${decomposed}.`;
  const result = writing.analyze(text);
  assertValidResult(text, result);
  const finding = findingsOf(result, "assistant-residue")[0];
  assert.ok(finding);
  assert.equal(text.slice(finding.ranges[0].start, finding.ranges[0].end), decomposed, "source offsets preserve the original decomposed spelling and emoji");
}

{
  assert.throws(() => writing.analyze("x".repeat(writing.MAX_TEXT_LENGTH + 1)), RangeError);
  assert.equal(writing.analyze("x".repeat(writing.MAX_TEXT_LENGTH)).metrics.wordCount, 1);
}

{
  const sentence = "The laboratory records each measurement before the team writes a careful note. ";
  const text = sentence.repeat(1300).slice(0, 99970);
  assert.equal(text.length, 99970);
  const started = performance.now();
  const result = writing.analyze(text);
  const elapsed = performance.now() - started;
  assertValidResult(text, result);
  assert.ok(result.findings.length <= writing.MAX_FINDINGS);
  assert.ok(elapsed < 5000, `near-limit analysis should complete within five seconds (took ${Math.round(elapsed)}ms)`);
}

{
  const text = "! ".repeat(49985);
  assert.equal(text.length, 99970);
  const started = performance.now();
  const result = writing.analyze(text);
  const elapsed = performance.now() - started;
  assertValidResult(text, result);
  assert.equal(result.metrics.wordCount, 0);
  assert.equal(result.findings.length, 0);
  assert.ok(elapsed < 5000, `punctuation-heavy near-limit input stays bounded (took ${Math.round(elapsed)}ms)`);
}

{
  const source = fs.readFileSync(path.join(__dirname, "../dist/writing-signals.js"), "utf8");
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/u);
  assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage|indexedDB)\b/u);
}

console.log("Writing signal engine checks passed.");
