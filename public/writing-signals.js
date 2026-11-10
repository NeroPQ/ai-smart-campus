/* Local-only, rule-based writing-pattern review for AI Smart Campus. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }
  if (root) root.AISmartCampusWritingSignals = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const MAX_TEXT_LENGTH = 100000;
  const MAX_FINDINGS = 24;
  const MAX_RANGES_PER_FINDING = 12;
  const WORD_SOURCE = "[\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N}]*(?:['’][\\p{L}\\p{M}\\p{N}][\\p{L}\\p{M}\\p{N}]*)*";
  const TERMINAL = /[.!?…]/u;
  const CLOSING = new Set(["\"", "'", "’", "”", "»", ")", "]", "}"]);

  const ASSISTANT_PHRASES = [
    "as an ai language model", "as a language model", "as an ai", "i am an ai language model",
    "i'm an ai language model", "i am a language model", "i'm a language model", "i am an ai",
    "i'm an ai", "i don't have personal experiences", "i do not have personal experiences",
    "i don't have personal experience", "i cannot browse the internet", "i can't browse the internet",
    "i cannot access the internet", "i don't have access to the internet", "i cannot access real-time information",
    "my knowledge cutoff", "my training data", "i don't have consciousness", "i lack personal opinions",
    "với tư cách là một ai", "là một mô hình ngôn ngữ ai", "tôi là một mô hình ngôn ngữ",
    "tôi không có trải nghiệm cá nhân", "tôi không có kinh nghiệm cá nhân", "tôi không thể truy cập internet",
    "tôi không có quyền truy cập internet", "tôi không thể truy cập thông tin thời gian thực",
    "kiến thức của tôi được cập nhật", "dữ liệu huấn luyện của tôi", "tôi không có ý thức",
    "tôi không có quan điểm cá nhân", "tôi không thể duyệt web"
  ];

  // These are examples of stock phrasing, not validated authorship markers.
  const BOILERPLATE_PHRASES = [
    "it is important to note that", "it is worth noting that", "in today's fast-paced world",
    "in today’s fast-paced world", "in today's digital age", "in today’s digital age",
    "plays a crucial role in", "a wide range of", "this highlights the importance of",
    "the key takeaway is", "as we move forward", "in the ever-changing landscape of",
    "this underscores the need for", "there are several factors to consider",
    "it is essential to understand that", "can have a significant impact on", "at the end of the day",
    "one of the most important aspects of", "điều quan trọng cần lưu ý là", "điều đáng chú ý là",
    "trong bối cảnh thế giới không ngừng thay đổi", "trong xã hội hiện đại ngày nay",
    "có vai trò quan trọng trong", "đóng góp quan trọng vào", "điều này nhấn mạnh tầm quan trọng của",
    "có thể tạo ra tác động đáng kể đến", "một trong những khía cạnh quan trọng nhất của",
    "có nhiều yếu tố cần xem xét", "như chúng ta đã biết", "trên hành trình hướng tới",
    "để hiểu rõ hơn về vấn đề này", "nhìn chung có thể thấy rằng", "góp phần không nhỏ vào",
    "là minh chứng rõ nét cho", "không thể bỏ qua vai trò của"
  ];

  const CONNECTORS = [
    "on the other hand", "as a result", "in addition", "for example", "for instance",
    "in contrast", "in conclusion", "furthermore", "moreover", "additionally", "however",
    "therefore", "consequently", "firstly", "secondly", "finally", "overall", "instead",
    "meanwhile", "similarly", "nevertheless", "thus", "also", "first", "second",
    "tuy nhiên", "bên cạnh đó", "ngoài ra", "mặt khác", "chẳng hạn", "do đó", "vì vậy",
    "hơn nữa", "đồng thời", "trước hết", "sau đó", "tóm lại", "nhìn chung"
  ];

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function phraseSource(phrase) {
    return phrase.normalize("NFC").split(/(\s+|['’])/u).map((part) => {
      if (/^\s+$/u.test(part)) return "\\s+";
      if (part === "'" || part === "’") return "['’]";
      return escapeRegex(part);
    }).join("");
  }

  function codePointBefore(text, index) {
    if (index <= 0) return "";
    const last = text.charCodeAt(index - 1);
    if (last >= 0xdc00 && last <= 0xdfff && index > 1) {
      const first = text.charCodeAt(index - 2);
      if (first >= 0xd800 && first <= 0xdbff) return text.slice(index - 2, index);
    }
    return text.charAt(index - 1);
  }

  function codePointAfter(text, index) {
    if (index >= text.length) return "";
    const first = text.charCodeAt(index);
    if (first >= 0xd800 && first <= 0xdbff && index + 1 < text.length) {
      const last = text.charCodeAt(index + 1);
      if (last >= 0xdc00 && last <= 0xdfff) return text.slice(index, index + 2);
    }
    return text.charAt(index);
  }

  function isWordCharacter(character) {
    return Boolean(character && /[\p{L}\p{M}\p{N}_]/u.test(character));
  }

  function findLines(text) {
    const lines = [];
    let start = 0;
    while (start < text.length) {
      let end = text.indexOf("\n", start);
      if (end < 0) end = text.length;
      const contentEnd = end > start && text.charAt(end - 1) === "\r" ? end - 1 : end;
      lines.push({ start, contentEnd, end: end < text.length ? end + 1 : end });
      start = end < text.length ? end + 1 : text.length;
    }
    if (!text.length || text.endsWith("\n")) lines.push({ start: text.length, contentEnd: text.length, end: text.length });
    return lines;
  }

  function addQuotedRanges(text, excluded) {
    const pairs = [["“", "”"], ["„", "“"], ["«", "»"], ["‘", "’"]];
    for (const [open, close] of pairs) {
      let cursor = 0;
      while (cursor < text.length) {
        const start = text.indexOf(open, cursor);
        if (start < 0) break;
        const endQuote = text.indexOf(close, start + open.length);
        if (endQuote < 0) break;
        const end = endQuote + close.length;
        const interior = text.slice(start + open.length, endQuote);
        if (interior.length && !/[\r\n]/u.test(interior)) excluded.push({ start, end });
        cursor = end;
      }
    }

    // Straight double quotes are unambiguous. Limit to one line so an unmatched
    // opening quote cannot swallow the rest of a submission.
    let cursor = 0;
    while (cursor < text.length) {
      const start = text.indexOf('"', cursor);
      if (start < 0) break;
      const endQuote = text.indexOf('"', start + 1);
      if (endQuote < 0) break;
      const interior = text.slice(start + 1, endQuote);
      if (interior.length && !/[\r\n]/u.test(interior)) excluded.push({ start, end: endQuote + 1 });
      cursor = endQuote + 1;
    }

    // ASCII apostrophes count as quotation marks only when they begin at a
    // token boundary and close at one; contractions such as don't are ignored.
    for (let index = 0; index < text.length; index += 1) {
      if (text.charAt(index) !== "'") continue;
      if (isWordCharacter(codePointBefore(text, index)) || !isWordCharacter(codePointAfter(text, index + 1))) continue;
      let endQuote = text.indexOf("'", index + 1);
      if (endQuote < 0 || endQuote - index > 1000) continue;
      const interior = text.slice(index + 1, endQuote);
      if (/[\r\n]/u.test(interior) || !interior.trim() || isWordCharacter(codePointAfter(text, endQuote + 1))) continue;
      excluded.push({ start: index, end: endQuote + 1 });
      index = endQuote;
    }
  }

  function collectExclusions(text) {
    const excluded = [];
    const lines = findLines(text);
    let fence = null;
    let fenceStart = -1;

    for (const line of lines) {
      const value = text.slice(line.start, line.contentEnd);
      if (fence) {
        const close = value.match(new RegExp("^ {0,3}" + escapeRegex(fence.char) + "{" + fence.length + ",}[\\t ]*$", "u"));
        if (close) {
          excluded.push({ start: fenceStart, end: line.end });
          fence = null;
          fenceStart = -1;
        }
        continue;
      }

      const opening = value.match(/^ {0,3}(`{3,}|~{3,})(.*)$/u);
      if (opening) {
        fence = { char: opening[1].charAt(0), length: opening[1].length };
        fenceStart = line.start;
        continue;
      }

      if (/^ {0,3}>/u.test(value)) excluded.push({ start: line.start, end: line.end });
    }
    if (fence) excluded.push({ start: fenceStart, end: text.length });

    // Inline backtick spans are also code. Pair only same-line runs of the
    // same length; unmatched ticks stay visible for the legacy formatter scan.
    for (const line of lines) {
      const value = text.slice(line.start, line.contentEnd);
      if (/^ {0,3}(?:`{3,}|~{3,})/u.test(value) || /^ {0,3}>/u.test(value)) continue;
      let cursor = 0;
      while (cursor < value.length) {
        const open = value.indexOf("`", cursor);
        if (open < 0) break;
        let runEnd = open + 1;
        while (value.charAt(runEnd) === "`") runEnd += 1;
        const count = runEnd - open;
        if (count >= 3) { cursor = runEnd; continue; }
        let search = runEnd;
        let close = -1;
        while (search < value.length) {
          const candidate = value.indexOf("`", search);
          if (candidate < 0) break;
          let candidateEnd = candidate + 1;
          while (value.charAt(candidateEnd) === "`") candidateEnd += 1;
          if (candidateEnd - candidate === count) { close = candidateEnd; break; }
          search = candidateEnd;
        }
        if (close > runEnd) {
          excluded.push({ start: line.start + open, end: line.start + close });
          cursor = close;
        } else cursor = runEnd;
      }
    }

    // Ignore a standalone references/bibliography section through the next
    // Markdown heading (or end of input).
    let bibliographyStart = -1;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const value = text.slice(line.start, line.contentEnd).trim();
      if (bibliographyStart < 0 && /^(?:#{1,6}\s*)?(?:references|bibliography|works cited|tài liệu tham khảo|danh mục tài liệu tham khảo)\s*:?(?:\s+#{1,6})?$/iu.test(value)) {
        bibliographyStart = line.start;
        continue;
      }
      if (bibliographyStart >= 0 && /^ {0,3}#{1,6}\s+/u.test(text.slice(line.start, line.contentEnd))) {
        excluded.push({ start: bibliographyStart, end: line.start });
        bibliographyStart = -1;
      }
    }
    if (bibliographyStart >= 0) excluded.push({ start: bibliographyStart, end: text.length });

    addQuotedRanges(text, excluded);
    return mergeRanges(excluded, text.length);
  }

  function mergeRanges(ranges, maxLength) {
    const sorted = ranges.filter((range) => range && range.end > range.start)
      .map((range) => ({ start: Math.max(0, Math.min(maxLength, range.start)), end: Math.max(0, Math.min(maxLength, range.end)) }))
      .filter((range) => range.end > range.start)
      .sort((left, right) => left.start - right.start || left.end - right.end);
    const merged = [];
    for (const range of sorted) {
      const previous = merged[merged.length - 1];
      if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
      else merged.push({ start: range.start, end: range.end });
    }
    return merged;
  }

  function maskExcluded(text, ranges) {
    if (!ranges.length) return text;
    const pieces = [];
    let cursor = 0;
    for (const range of ranges) {
      pieces.push(text.slice(cursor, range.start));
      // No Unicode flag: replacing each UTF-16 code unit preserves DOM range offsets,
      // including surrogate pairs, in the masked comparison copy.
      const hidden = text.slice(range.start, range.end).replace(/[^\r\n]/g, " ");
      pieces.push(hidden);
      cursor = range.end;
    }
    pieces.push(text.slice(cursor));
    return pieces.join("");
  }

  function graphemeParts(text) {
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      return segmenter.segment(text);
    }
    const parts = [];
    let index = 0;
    while (index < text.length) {
      const start = index;
      const first = text.codePointAt(index);
      index += first > 0xffff ? 2 : 1;
      while (index < text.length) {
        const point = text.codePointAt(index);
        const character = String.fromCodePoint(point);
        if (!/\p{M}/u.test(character)) break;
        index += point > 0xffff ? 2 : 1;
      }
      parts.push({ index: start, segment: text.slice(start, index) });
    }
    return parts;
  }

  function buildComparable(text) {
    const chunks = [];
    const starts = [];
    const ends = [];
    for (const part of graphemeParts(text)) {
      const normalized = part.segment.normalize("NFC");
      chunks.push(normalized);
      const originalEnd = part.index + part.segment.length;
      for (let unit = 0; unit < normalized.length; unit += 1) {
        starts.push(part.index);
        ends.push(originalEnd);
      }
    }
    return { text: chunks.join(""), starts, ends };
  }

  function toSourceRange(comparable, start, end) {
    if (start < 0 || end <= start || end > comparable.starts.length) return null;
    return { start: comparable.starts[start], end: comparable.ends[end - 1] };
  }

  function overlapsExcluded(range, excluded) {
    let low = 0;
    let high = excluded.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (excluded[middle].end <= range.start) low = middle + 1;
      else high = middle;
    }
    return low < excluded.length && excluded[low].start < range.end;
  }

  function countWords(text) {
    const regex = new RegExp(WORD_SOURCE, "gu");
    let count = 0;
    while (regex.exec(text)) count += 1;
    return count;
  }

  function wordTokens(text, start, end, limit) {
    const regex = new RegExp(WORD_SOURCE, "gu");
    const bounded = text.slice(start, end);
    const tokens = [];
    let match;
    while ((match = regex.exec(bounded))) {
      tokens.push({ text: match[0], start: start + match.index, end: start + match.index + match[0].length });
      if (limit && tokens.length >= limit) break;
    }
    return tokens;
  }

  function paragraphSegments(text) {
    const segments = [];
    const separator = /\n[ \t\r]*\n+/gu;
    let start = 0;
    let match;
    while ((match = separator.exec(text))) {
      segments.push({ start, end: match.index });
      start = match.index + match[0].length;
    }
    segments.push({ start, end: text.length });
    return segments;
  }

  function sentenceSegments(text, start, end) {
    const sentences = [];
    let startAt = start;
    let index = start;
    const add = (rawStart, rawEnd) => {
      while (rawStart < rawEnd && /\s/u.test(text.charAt(rawStart))) rawStart += 1;
      while (rawEnd > rawStart && /\s/u.test(text.charAt(rawEnd - 1))) rawEnd -= 1;
      if (rawStart >= rawEnd) return;
      const words = wordTokens(text, rawStart, rawEnd);
      if (words.length) sentences.push({ start: rawStart, end: rawEnd, words, wordCount: words.length });
    };

    while (index < end) {
      const current = text.charAt(index);
      if (!TERMINAL.test(current)) { index += 1; continue; }
      if (current === "." && /\p{N}/u.test(codePointBefore(text, index)) && /\p{N}/u.test(codePointAfter(text, index + 1))) {
        index += 1;
        continue;
      }
      let after = index + 1;
      while (after < end && TERMINAL.test(text.charAt(after))) after += 1;
      while (after < end && CLOSING.has(text.charAt(after))) after += 1;
      if (after === end || /\s/u.test(text.charAt(after))) {
        add(startAt, after);
        startAt = after;
        index = after;
      } else index = after;
    }
    add(startAt, end);
    return sentences;
  }

  function addRangeFinding(findings, finding) {
    if (findings.length >= MAX_FINDINGS || !finding.ranges.length) return;
    const ranges = mergeRanges(finding.ranges, Number.MAX_SAFE_INTEGER).slice(0, MAX_RANGES_PER_FINDING);
    if (!ranges.length) return;
    findings.push({
      id: finding.id,
      category: finding.category,
      label: finding.label,
      explanation: finding.explanation,
      suggestion: finding.suggestion,
      ranges
    });
  }

  function phraseMatches(comparable, phrases, excluded) {
    const ranges = [];
    const seen = new Set();
    for (const phrase of phrases) {
      const regex = new RegExp(phraseSource(phrase), "giu");
      let match;
      while ((match = regex.exec(comparable.text))) {
        const start = match.index;
        const end = start + match[0].length;
        if (!isWordCharacter(codePointBefore(comparable.text, start)) && !isWordCharacter(codePointAfter(comparable.text, end))) {
          const range = toSourceRange(comparable, start, end);
          if (range && !overlapsExcluded(range, excluded)) {
            const key = `${range.start}:${range.end}`;
            if (!seen.has(key)) { seen.add(key); ranges.push(range); }
          }
        }
        if (!match[0].length) regex.lastIndex += 1;
      }
    }
    ranges.sort((left, right) => left.start - right.start || left.end - right.end);
    return ranges;
  }

  function placeholderMatches(comparable, excluded) {
    const ranges = [];
    const seen = new Set();
    const add = (start, end) => {
      const range = toSourceRange(comparable, start, end);
      if (!range || overlapsExcluded(range, excluded)) return;
      const key = `${range.start}:${range.end}`;
      if (!seen.has(key)) { seen.add(key); ranges.push(range); }
    };

    const brackets = /\[[^\]\r\n]{1,100}\]/gu;
    const placeholderWord = /(?:^|[^\p{L}\p{M}\p{N}_])(?:insert|add|replace|your|todo|tbd|placeholder|example|company|name|date|source|figure|title|điền|thêm|thay|tên|mẫu|ví dụ|ngày|nguồn|hình|số\s+liệu)(?=$|[^\p{L}\p{M}\p{N}_])/iu;
    let match;
    while ((match = brackets.exec(comparable.text))) {
      if (placeholderWord.test(match[0].slice(1, -1))) add(match.index, match.index + match[0].length);
    }

    const braces = /\{\{\s*[\p{L}\p{M}\p{N}_ -]{1,60}\s*\}\}/gu;
    while ((match = braces.exec(comparable.text))) add(match.index, match.index + match[0].length);

    const labels = /\b(?:TODO|TBD|TBA)\b\s*:?/giu;
    while ((match = labels.exec(comparable.text))) add(match.index, match.index + match[0].length);
    ranges.sort((left, right) => left.start - right.start || left.end - right.end);
    return ranges;
  }

  function getConnectorPattern() {
    const alternatives = CONNECTORS.slice().sort((a, b) => b.length - a.length)
      .map((phrase) => phraseSource(phrase));
    return new RegExp("^(?:" + alternatives.join("|") + ")(?=$|[^\\p{L}\\p{M}\\p{N}_])", "iu");
  }

  function analyze(input) {
    const source = typeof input === "string" ? input : "";
    if (source.length > MAX_TEXT_LENGTH) throw new RangeError(`Text exceeds ${MAX_TEXT_LENGTH} UTF-16 code units.`);

    const excludedRanges = collectExclusions(source);
    const metricText = maskExcluded(source, excludedRanges);
    const comparable = buildComparable(metricText);
    const metrics = {
      wordCount: countWords(comparable.text),
      sentenceCount: 0,
      paragraphCount: 0
    };
    const paragraphs = paragraphSegments(comparable.text);
    const sentences = [];
    for (const paragraph of paragraphs) {
      const words = countWords(comparable.text.slice(paragraph.start, paragraph.end));
      if (words) metrics.paragraphCount += 1;
      sentences.push(...sentenceSegments(comparable.text, paragraph.start, paragraph.end));
    }
    metrics.sentenceCount = sentences.length;
    const sufficientText = metrics.wordCount >= 80 && metrics.sentenceCount >= 3;
    const findings = [];

    const assistantRanges = phraseMatches(comparable, ASSISTANT_PHRASES, excludedRanges);
    addRangeFinding(findings, {
      id: "assistant-residue", category: "assistant", label: "Cụm tự nhận là trợ lý hoặc mô hình",
      explanation: "Cụm này nhắc trực tiếp đến vai trò, giới hạn hoặc dữ liệu của một trợ lý/mô hình. Đây là dấu vết văn bản có thể kiểm tra, không xác định ai đã viết đoạn này.",
      suggestion: "Nếu câu này còn sót từ lời nhắc hoặc câu trả lời mẫu, hãy bỏ đi; nếu cần nêu giới hạn, hãy viết giới hạn cụ thể liên quan đến nội dung.",
      ranges: assistantRanges
    });

    const placeholderRanges = placeholderMatches(comparable, excludedRanges);
    addRangeFinding(findings, {
      id: "template-placeholder", category: "template", label: "Chỗ trống hoặc chỉ dẫn trong mẫu",
      explanation: "Có dấu ngoặc hoặc nhãn thường dùng để nhắc người viết điền nội dung. Hãy kiểm tra xem đây có phải chỗ giữ chỗ còn sót lại không.",
      suggestion: "Thay chỗ giữ chỗ bằng dữ kiện và nguồn đã kiểm chứng, hoặc xóa nếu không còn cần thiết.",
      ranges: placeholderRanges
    });

    if (sufficientText) {
      const boilerplateRanges = phraseMatches(comparable, BOILERPLATE_PHRASES, excludedRanges);
      addRangeFinding(findings, {
        id: "generic-boilerplate", category: "template", label: "Cụm diễn đạt khuôn mẫu",
        explanation: "Một số cụm này thường xuất hiện trong văn phong khái quát và có thể làm ý bị chung chung. Chúng cũng có thể phù hợp trong văn bản trang trọng; bản thân chúng không nói lên nguồn gốc bài viết.",
        suggestion: "Thay bằng nhận định cụ thể, ví dụ, số liệu hoặc nguồn chứng minh ý đang nêu.",
        ranges: boilerplateRanges
      });

      const usableSentences = sentences.filter((sentence) => {
        const range = toSourceRange(comparable, sentence.start, sentence.end);
        return range && !overlapsExcluded(range, excludedRanges);
      });

      const sentenceGroups = new Map();
      for (const sentence of usableSentences) {
        const sourceRange = toSourceRange(comparable, sentence.start, sentence.end);
        const signature = comparable.text.slice(sentence.start, sentence.end).trim();
        if (sentence.wordCount < 7 || signature.length < 35 || signature.length > 2000) continue;
        let group = sentenceGroups.get(signature);
        if (!group) {
          if (sentenceGroups.size >= 2048) continue;
          group = { count: 0, ranges: [] };
          sentenceGroups.set(signature, group);
        }
        group.count += 1;
        if (group.ranges.length < MAX_RANGES_PER_FINDING) group.ranges.push(sourceRange);
      }
      const repeatedSentences = Array.from(sentenceGroups.entries())
        .filter(([, group]) => group.count >= 2)
        .sort((left, right) => left[1].ranges[0].start - right[1].ranges[0].start)
        .slice(0, 4);
      repeatedSentences.forEach(([, group], index) => addRangeFinding(findings, {
        id: `repeated-sentence-${index + 1}`, category: "repetition", label: "Câu dài xuất hiện lặp lại",
        explanation: "Có một câu từ bảy từ trở lên được lặp nguyên văn trong phần văn bản có thể phân tích (so sánh sau chuẩn hóa Unicode NFC). Việc lặp có thể có chủ ý, nhưng nên kiểm tra xem có đoạn nào bị nhân đôi không.",
        suggestion: "Giữ câu lặp nếu cần nhấn mạnh; nếu không, hãy gộp ý và bổ sung bằng chứng hoặc chi tiết mới.",
        ranges: group.ranges
      }));

      const openingGroups = new Map();
      for (const paragraph of paragraphs) {
        const paragraphRange = toSourceRange(comparable, paragraph.start, paragraph.end);
        if (!paragraphRange || overlapsExcluded(paragraphRange, excludedRanges)) continue;
        const tokens = wordTokens(comparable.text, paragraph.start, paragraph.end, 6);
        if (tokens.length < 6) continue;
        const signature = tokens.map((token) => token.text).join(" ");
        let group = openingGroups.get(signature);
        if (!group) { group = { count: 0, ranges: [] }; openingGroups.set(signature, group); }
        group.count += 1;
        if (group.ranges.length < MAX_RANGES_PER_FINDING) group.ranges.push(toSourceRange(comparable, tokens[0].start, tokens[5].end));
      }
      const repeatedOpenings = Array.from(openingGroups.entries())
        .filter(([, group]) => group.count >= 2)
        .sort((left, right) => left[1].ranges[0].start - right[1].ranges[0].start)
        .slice(0, 4);
      repeatedOpenings.forEach(([, group], index) => addRangeFinding(findings, {
        id: `repeated-opening-${index + 1}`, category: "repetition", label: "Các đoạn mở đầu bằng cùng một cụm",
        explanation: "Ít nhất hai đoạn bắt đầu bằng cùng sáu từ liên tiếp. Cấu trúc lặp có thể làm bài đơn điệu, dù đôi khi được dùng có chủ ý để tổ chức ý.",
        suggestion: "Kiểm tra xem mỗi đoạn có thể mở bằng luận điểm hoặc chi tiết riêng, phù hợp với nội dung của đoạn đó không.",
        ranges: group.ranges
      }));

      if (metrics.wordCount >= 80 && metrics.sentenceCount >= 4) {
        const connectorPattern = getConnectorPattern();
        const connectorRanges = [];
        for (const sentence of usableSentences) {
          let first = sentence.start;
          while (first < sentence.end && /\s/u.test(comparable.text.charAt(first))) first += 1;
          const match = connectorPattern.exec(comparable.text.slice(first, sentence.end));
          if (!match) continue;
          const range = toSourceRange(comparable, first, first + match[0].length);
          if (range && !overlapsExcluded(range, excludedRanges)) connectorRanges.push(range);
        }
        if (connectorRanges.length >= 3 && connectorRanges.length / usableSentences.length >= 0.5) addRangeFinding(findings, {
          id: "connector-cluster", category: "structure", label: "Nhiều câu mở đầu bằng từ nối",
          explanation: "Trong văn bản có ít nhất 80 từ và bốn câu, ít nhất một nửa số câu đủ điều kiện mở đầu bằng từ nối (tối thiểu ba câu). Đây là nhận xét về cách tổ chức câu; văn phong trang trọng hoặc người viết tiếng Anh như ngôn ngữ bổ sung cũng có thể dùng từ nối đều đặn.",
          suggestion: "Giữ từ nối khi nó thể hiện đúng quan hệ giữa các ý; nếu không, hãy nêu quan hệ bằng nội dung hoặc thay đổi cách bắt đầu câu.",
          ranges: connectorRanges
        });
      }

      // Deliberately weak/contextual: only show uniformity beside another
      // observable pattern, and only after the stricter 120-word/8-sentence gate.
      const uniformSentences = usableSentences.filter((sentence) => sentence.wordCount > 0);
      const uniformWordCount = uniformSentences.reduce((total, sentence) => total + sentence.wordCount, 0);
      if (uniformSentences.length >= 8 && uniformWordCount >= 120 && findings.length > 0) {
        const mean = uniformWordCount / uniformSentences.length;
        const variance = uniformSentences.reduce((total, sentence) => total + Math.pow(sentence.wordCount - mean, 2), 0) / uniformSentences.length;
        const coefficient = Math.sqrt(variance) / mean;
        if (coefficient < 0.22) addRangeFinding(findings, {
          id: "uniform-sentence-length", category: "structure", label: "Độ dài câu khá đồng đều (nhận xét yếu)",
          explanation: "Các câu có độ dài tương tự nhau trong một đoạn đủ dài. Nhịp đều cũng thường gặp ở văn bản học thuật, văn phong trang trọng và bài viết của người dùng ngôn ngữ thứ hai; chỉ nên xem đây là gợi ý để đọc lại cùng với dấu hiệu khác.",
          suggestion: "Chỉ thay đổi độ dài hoặc cấu trúc câu khi điều đó giúp lập luận rõ hơn; hãy ưu tiên ví dụ, nguồn và cách giải thích của chính bạn.",
          ranges: uniformSentences.map((sentence) => toSourceRange(comparable, sentence.start, sentence.end))
        });
      }
    }

    findings.sort((left, right) => left.ranges[0].start - right.ranges[0].start || left.id.localeCompare(right.id));
    return { findings: findings.slice(0, MAX_FINDINGS), metrics, sufficientText, excludedRanges };
  }

  // These are descriptive text statistics only. They are not authorship scores.
  function describe(input) {
    const source = typeof input === "string" ? input : "";
    if (source.length > MAX_TEXT_LENGTH) throw new RangeError(`Text exceeds ${MAX_TEXT_LENGTH} UTF-16 code units.`);

    const excludedRanges = collectExclusions(source);
    const comparable = buildComparable(maskExcluded(source, excludedRanges));
    const paragraphs = paragraphSegments(comparable.text);
    const sentenceWordCounts = [];
    const frequencies = new Map();
    let wordCount = 0;

    for (const paragraph of paragraphs) {
      for (const sentence of sentenceSegments(comparable.text, paragraph.start, paragraph.end)) {
        sentenceWordCounts.push(sentence.wordCount);
      }
    }
    const tokens = wordTokens(comparable.text, 0, comparable.text.length);
    for (const token of tokens) {
      const normalized = token.text.toLowerCase();
      frequencies.set(normalized, (frequencies.get(normalized) || 0) + 1);
      wordCount += 1;
    }

    const sentenceCount = sentenceWordCounts.length;
    const mean = sentenceCount ? sentenceWordCounts.reduce((total, count) => total + count, 0) / sentenceCount : 0;
    const variance = sentenceCount
      ? sentenceWordCounts.reduce((total, count) => total + Math.pow(count - mean, 2), 0) / sentenceCount
      : 0;
    const burstinessCvPercent = mean ? (Math.sqrt(variance) / mean) * 100 : 0;
    let lexicalEntropyBits = 0;
    if (wordCount) {
      for (const count of frequencies.values()) {
        const probability = count / wordCount;
        lexicalEntropyBits -= probability * Math.log2(probability);
      }
    }

    return {
      wordCount,
      sentenceCount,
      sentenceWordCounts,
      uniqueWordCount: frequencies.size,
      burstinessCvPercent,
      lexicalEntropyBits
    };
  }

  return { analyze, describe, MAX_TEXT_LENGTH, MAX_FINDINGS, MAX_RANGES_PER_FINDING };
});
