/* Browser-only submission text scanner for AI Smart Campus. */
(function (root, factory) {
  "use strict";
  const api = factory(typeof module === "object" && module.exports ? require("./writing-signals.js") : root.AISmartCampusWritingSignals, typeof module === "object" && module.exports ? require("./ai-model-panel.js") : root.AISmartCampusModelPanel);
  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }
  if (!root || !root.document) return;
  root.AISmartCampusScanner = api;
  const start = () => api.mount(root.document);
  if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(typeof window !== "undefined" ? window : globalThis, function (writingSignals, modelPanel) {
  "use strict";

  const MAX_TEXT_LENGTH = 100000;
  const CLICHES = [
    "delve into", "testament", "tapestry", "crucial", "furthermore", "in conclusion",
    "trong kỷ nguyên số hiện nay", "trong kỷ nguyên số hóa ngày nay", "bức tranh toàn cảnh",
    "không thể phủ nhận rằng", "hơn thế nữa", "tóm lại", "đóng vai trò then chốt"
  ];
  const VAGUE_CITATIONS = ["nhiều nghiên cứu chỉ ra rằng", "các chuyên gia cho rằng"];
  const SAMPLE_TEXTS = {
    signals: "Trong kỷ nguyên số hóa ngày nay, trí tuệ nhân tạo đóng vai trò then chốt trong giáo dục. Không thể phủ nhận rằng công nghệ này đang thay đổi mọi lĩnh vực. Nhiều nghiên cứu chỉ ra rằng AI giúp tất cả sinh viên học tốt hơn, nhưng đoạn mẫu này không cung cấp nghiên cứu, số liệu hay nguồn cụ thể để kiểm tra nhận định đó. Hơn thế nữa, việc ứng dụng AI mang lại nhiều lợi ích to lớn cho cộng đồng học thuật. Các chuyên gia cho rằng công cụ này chắc chắn sẽ tạo nên một tương lai tốt đẹp. Tóm lại, AI là một giải pháp quan trọng và cần được sử dụng hiệu quả trong mọi hoạt động học tập. Đây là văn bản ví dụ do dự án biên soạn để thử bộ dò cụm từ, không phải bài viết hay dữ liệu của sinh viên.",
    natural: "Trong buổi ôn môn phương pháp nghiên cứu, tôi dùng chatbot để nhờ giải thích sự khác nhau giữa câu hỏi khảo sát và câu hỏi phỏng vấn. Phần giải thích đầu tiên nghe hợp lý nhưng chưa giúp tôi quyết định cách hỏi cho đề tài của nhóm. Tôi mở lại bản nháp câu hỏi, gạch chân hai câu đang hỏi cùng một ý rồi tự viết lại một câu để hỏi về trải nghiệm, câu còn lại để hỏi về lý do. Sau đó, tôi đọc câu hỏi cho một bạn cùng nhóm nghe và sửa từ “thường xuyên” thành “trong tháng vừa qua” vì mốc thời gian cụ thể dễ trả lời hơn. Đây chỉ là tình huống minh họa được viết riêng cho công cụ; người dùng nên thay bằng trải nghiệm và bằng chứng của chính mình."
  };
  const PREAMBLES = [
    { source: "chắc chắn rồi[,!:\\s]+dưới đây là", label: "Chắc chắn rồi, dưới đây là" },
    { source: "certainly[,!:\\s]+here(?:'|’)s", label: "Certainly, here's" },
    { source: "sure[,!:\\s]+here(?:'|’)s", label: "Sure, here's" }
  ];

  function escaped(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    return Boolean(character && /[\p{L}\p{N}\p{M}_]/u.test(character));
  }

  function hasWholeWordBoundaries(text, start, end) {
    return !isWordCharacter(codePointBefore(text, start)) && !isWordCharacter(codePointAfter(text, end));
  }

  function addPhraseMatches(text, phrase, category, matches, source) {
    const pattern = source || phrase.split(/\s+/).map(escaped).join("\\s+");
    const regex = new RegExp(pattern, "giu");
    let match;
    while ((match = regex.exec(text))) {
      const start = match.index;
      const end = start + match[0].length;
      if (hasWholeWordBoundaries(text, start, end)) {
        matches.push({ start, end, category, term: phrase, excerpt: match[0] });
      }
      if (!match[0].length) regex.lastIndex += 1;
    }
  }

  function extractReferences(text) {
    const references = [];
    const seen = new Set();
    const normalizeUrlKey = (value) => {
      const candidate = /^www\./iu.test(value) ? `https://${value}` : value;
      try {
        const parsed = new URL(candidate);
        const credentials = parsed.username || parsed.password
          ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ""}@`
          : "";
        return `${parsed.protocol.toLowerCase()}//${credentials}${parsed.host.toLowerCase()}${parsed.pathname}${parsed.search}${parsed.hash}`;
      } catch (_) {
        return value;
      }
    };
    const add = (value, kind) => {
      const normalized = kind === "url" ? normalizeUrlKey(value) : value.normalize("NFC").toLocaleLowerCase();
      const key = `${kind}:${normalized}`;
      if (seen.has(key)) return;
      seen.add(key);
      references.push({ text: value, kind });
    };

    const parenthetical = /\(([^()\r\n]{1,240})\)/gu;
    let group;
    while ((group = parenthetical.exec(text))) {
      const parts = group[1].split(/[;；]/u);
      for (const part of parts) {
        const citation = part.match(/^\s*([^,，()]{1,100}?),\s*((?:19|20)\d{2}[a-z]?)(?=\s*(?:,|$))/iu);
        if (!citation || !/[\p{L}]/u.test(citation[1])) continue;
        add(`(${citation[1].trim()}, ${citation[2]})`, "citation");
      }
    }

    const urls = /(?:https?:\/\/|www\.)[^\s<>"']+/giu;
    let urlMatch;
    while ((urlMatch = urls.exec(text))) {
      let value = urlMatch[0];
      while (/[.,;:!?…]$/u.test(value)) value = value.slice(0, -1);
      const closingPairs = [[")", "("], ["]", "["], ["}", "{"]];
      let changed = true;
      while (changed && value) {
        changed = false;
        for (const [close, open] of closingPairs) {
          if (!value.endsWith(close)) continue;
          const opens = value.split(open).length - 1;
          const closes = value.split(close).length - 1;
          if (closes > opens) {
            value = value.slice(0, -1);
            changed = true;
            break;
          }
        }
      }
      if (value) add(value, "url");
    }
    return references;
  }

  function analyzeText(input) {
    const text = typeof input === "string" ? input : "";
    if (text.length > MAX_TEXT_LENGTH) {
      return { ok: false, error: `Bài viết vượt giới hạn ${MAX_TEXT_LENGTH.toLocaleString("vi-VN")} ký tự. Hãy rút ngắn rồi quét lại.`, length: text.length };
    }

    const matches = [];
    for (const phrase of CLICHES) addPhraseMatches(text, phrase, "cliche", matches);
    for (const phrase of VAGUE_CITATIONS) addPhraseMatches(text, phrase, "citation", matches);
    for (const preamble of PREAMBLES) addPhraseMatches(text, preamble.label, "preamble", matches, preamble.source);

    const formatting = /(?:\*{2,}|_{2,}|~{2,}|`{1,}|^[\t ]{0,3}#{1,}(?=[\t ]|$))/gmu;
    let formattingMatch;
    while ((formattingMatch = formatting.exec(text))) {
      matches.push({
        start: formattingMatch.index,
        end: formattingMatch.index + formattingMatch[0].length,
        category: "formatting",
        term: "Markdown",
        excerpt: formattingMatch[0]
      });
      if (!formattingMatch[0].length) formatting.lastIndex += 1;
    }

    const writing = writingSignals.analyze(text);
    const excluded = writing.excludedRanges || [];
    const visibleMatches = matches.filter((match) => {
      let low = 0;
      let high = excluded.length;
      while (low < high) {
        const mid = (low + high) >>> 1;
        if (excluded[mid].end <= match.start) low = mid + 1;
        else high = mid;
      }
      return low === excluded.length || excluded[low].start >= match.end;
    });
    visibleMatches.sort((a, b) => a.start - b.start || a.end - b.end || a.category.localeCompare(b.category));
    const counts = { cliche: 0, citation: 0, formatting: 0, preamble: 0 };
    for (const match of visibleMatches) counts[match.category] += 1;
    return { ok: true, length: text.length, matches: visibleMatches, counts, writing, references: extractReferences(text) };
  }

  function element(doc, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(doc, label, className) {
    const node = element(doc, "button", className, label);
    node.type = "button";
    return node;
  }

  function appendHighlightedText(doc, container, text, matches) {
    if (!matches.length) {
      container.append(doc.createTextNode(text));
      return;
    }
    const events = [];
    for (const match of matches) {
      const start = Math.max(0, Math.min(text.length, match.start));
      const end = Math.max(0, Math.min(text.length, match.end));
      if (start >= end) continue;
      events.push({ position: start, category: match.category, delta: 1 });
      events.push({ position: end, category: match.category, delta: -1 });
    }
    events.sort((a, b) => a.position - b.position || a.delta - b.delta);
    const active = new Map();
    let cursor = 0;
    let eventIndex = 0;
    while (eventIndex < events.length) {
      const position = events[eventIndex].position;
      if (position > cursor) {
        const content = text.slice(cursor, position);
        const categories = Array.from(active.entries()).filter(([, count]) => count > 0).map(([category]) => category).sort();
        if (!categories.length) container.append(doc.createTextNode(content));
        else {
          const mark = element(doc, "mark", "sc-highlight", content);
          mark.setAttribute("data-categories", categories.join(" "));
          mark.setAttribute("title", "Dấu hiệu để tự rà soát; xem giải thích bên dưới. Không kết luận tác giả là AI.");
          container.append(mark);
        }
        cursor = position;
      }
      while (eventIndex < events.length && events[eventIndex].position === position) {
        const event = events[eventIndex];
        const count = (active.get(event.category) || 0) + event.delta;
        if (count > 0) active.set(event.category, count);
        else active.delete(event.category);
        eventIndex += 1;
      }
    }
    if (cursor < text.length) {
      const content = text.slice(cursor);
      const categories = Array.from(active.entries()).filter(([, count]) => count > 0).map(([category]) => category).sort();
      if (!categories.length) container.append(doc.createTextNode(content));
      else {
        const mark = element(doc, "mark", "sc-highlight", content);
        mark.setAttribute("data-categories", categories.join(" "));
        mark.setAttribute("title", "Dấu hiệu để tự rà soát; xem giải thích bên dưới. Không kết luận tác giả là AI.");
        container.append(mark);
      }
    }
  }

  function renderReferences(doc, list, references) {
    if (!references.length) {
      list.append(element(doc, "p", "sc-empty-reference", "Chưa tìm thấy cụm trích dẫn dạng (Tác giả, Năm) hoặc đường link."));
      return;
    }
    references.forEach((reference) => {
      const item = element(doc, "li", "sc-reference-item");
      const detail = element(doc, "span", "sc-reference-text", reference.text);
      detail.lang = reference.kind === "citation" ? "vi" : undefined;
      const link = element(doc, "a", "sc-scholar-link", "Tìm thử trên Google Scholar ↗");
      link.href = `https://scholar.google.com/scholar?q=${encodeURIComponent(reference.text)}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Tìm thử trên Google Scholar: ${reference.text}`);
      item.append(detail, link);
      list.append(item);
    });
  }

  function renderWritingReport(doc, host, text, writing) {
    const report = element(doc, "section", "sc-writing-report");
    report.setAttribute("aria-labelledby", "sc-writing-title");
    const title = element(doc, "h2", "sc-section-title", "Phân tích mẫu diễn đạt");
    title.id = "sc-writing-title";
    report.append(title, element(doc, "p", "sc-help-text", "Đọc từng dấu hiệu trong ngữ cảnh. Văn học thuật, văn theo mẫu và bài do người viết cũng có thể có những đặc điểm này."));
    const metrics = writing.metrics;
    report.append(element(doc, "p", "sc-writing-metrics", `Thống kê ước lượng: ${metrics.wordCount.toLocaleString("vi-VN")} từ / âm tiết · ${metrics.sentenceCount} câu · ${metrics.paragraphCount} đoạn được phân tích`));
    if (!writing.sufficientText) {
      report.append(element(doc, "p", "sc-analysis-note", "Văn bản còn ngắn để phân tích cấu trúc và sự lặp lại một cách có ý nghĩa. Công cụ vẫn rà cụm từ và dấu vết phản hồi trợ lý; kết quả ít không đồng nghĩa với bài do người viết."));
    }
    if (writing.excludedRanges.length) {
      report.append(element(doc, "p", "sc-help-text", "Đã bỏ qua vùng được nhận diện là trích nguyên văn, mã, dòng trích dẫn hoặc danh mục tài liệu tham khảo khi phân tích văn phong. Việc nhận diện vùng này có thể chưa đầy đủ."));
    }
    if (!writing.findings.length) {
      report.append(element(doc, "p", "sc-zero-state", "Chưa thấy mẫu diễn đạt bổ sung theo các quy tắc hiện tại. Đây không phải xác nhận bài do người viết; hãy tiếp tục kiểm tra lập luận và nguồn."));
    }
    const labels = { assistant: "Dấu vết phản hồi", template: "Diễn đạt khuôn mẫu", repetition: "Lặp lại", structure: "Cấu trúc câu / đoạn" };
    writing.findings.forEach((finding) => {
      const card = element(doc, "article", "sc-finding");
      card.append(element(doc, "span", "sc-finding-kind", labels[finding.category] || "Dấu hiệu văn phong"));
      card.append(element(doc, "h3", "sc-finding-title", finding.label));
      card.append(element(doc, "p", "sc-finding-reason", finding.explanation));
      const excerpts = element(doc, "ul", "sc-finding-excerpts");
      finding.ranges.slice(0, 3).forEach((range) => {
        const excerpt = text.slice(range.start, range.end);
        excerpts.append(element(doc, "li", "", excerpt.length > 260 ? `${excerpt.slice(0, 260)}…` : excerpt));
      });
      card.append(excerpts, element(doc, "p", "sc-finding-suggestion", `Tự kiểm tra: ${finding.suggestion}`));
      report.append(card);
    });
    host.append(report);
  }

  function countMarkedWords(text, matches) {
    const ranges = matches.filter((match) => match.category === "cliche" || match.category === "citation")
      .map(({ start, end }) => ({ start, end }))
      .sort((left, right) => left.start - right.start || left.end - right.end);
    const merged = [];
    for (const range of ranges) {
      const previous = merged[merged.length - 1];
      if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
      else merged.push(range);
    }
    const wordPattern = new RegExp("[\\p{L}\\p{N}][\\p{L}\\p{M}\\p{N}]*(?:['’][\\p{L}\\p{M}\\p{N}][\\p{L}\\p{M}\\p{N}]*)*", "gu");
    let count = 0;
    for (const range of merged) {
      const segment = text.slice(range.start, range.end);
      for (const _match of segment.matchAll(wordPattern)) count += 1;
    }
    return count;
  }

  function renderLiveStats(doc, host, metrics) {
    const cards = element(doc, "div", "sc-live-stat-cards");
    const burstiness = Number.isFinite(metrics.burstinessCvPercent) ? metrics.burstinessCvPercent.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) : "0";
    const entropy = Number.isFinite(metrics.lexicalEntropyBits) ? metrics.lexicalEntropyBits.toLocaleString("vi-VN", { maximumFractionDigits: 2 }) : "0";
    [
      ["Độ biến thiên độ dài câu (Burstiness)", burstiness + "%", "Hệ số biến thiên = độ lệch chuẩn số từ mỗi câu ÷ độ dài câu trung bình × 100."],
      ["Entropy từ vựng", entropy + " bits/từ", "Tính từ tần suất các từ sau khi chuẩn hóa chữ hoa/thường; không phải điểm chất lượng hay nguồn gốc."],
      ["Từ / câu", metrics.wordCount.toLocaleString("vi-VN") + " / " + metrics.sentenceCount.toLocaleString("vi-VN"), metrics.uniqueWordCount.toLocaleString("vi-VN") + " từ khác nhau trong phần văn bản được phân tích."]
    ].forEach(([label, value, explanation]) => {
      const card = element(doc, "article", "sc-live-stat-card");
      card.append(element(doc, "span", "sc-live-stat-label", label), element(doc, "strong", "sc-live-stat-value", value), element(doc, "span", "sc-live-stat-explanation", explanation));
      cards.append(card);
    });
    host.append(cards);

    if (!metrics.sentenceWordCounts.length) {
      host.append(element(doc, "p", "sc-empty-state", "Chưa có câu để hiển thị biểu đồ."));
      return;
    }
    const chartSection = element(doc, "div", "sc-sentence-chart");
    chartSection.append(element(doc, "h3", "sc-chart-title", "Số từ theo câu"), element(doc, "p", "sc-help-text", "Thanh dài hơn biểu thị câu có nhiều từ hơn; đây chỉ là phân bố độ dài."));
    const chart = element(doc, "ol", "sc-sentence-bars");
    chart.setAttribute("aria-label", "Biểu đồ độ dài từng câu, tính bằng số từ");
    const maximum = metrics.sentenceWordCounts.reduce((largest, count) => Math.max(largest, count), 1);
    const visibleCounts = metrics.sentenceWordCounts.slice(0, 40);
    visibleCounts.forEach((count, index) => {
      const row = element(doc, "li", "sc-sentence-bar-row");
      row.append(element(doc, "span", "sc-sentence-label", "Câu " + (index + 1)));
      const track = element(doc, "span", "sc-sentence-track");
      track.setAttribute("aria-hidden", "true");
      const bar = element(doc, "span", "sc-sentence-bar");
      bar.setAttribute("style", "width: " + Math.max(3, (count / maximum) * 100) + "%");
      track.append(bar);
      row.append(track, element(doc, "span", "sc-sentence-count", count + " từ"));
      chart.append(row);
    });
    chartSection.append(chart);
    if (metrics.sentenceWordCounts.length > visibleCounts.length) {
      chartSection.append(element(doc, "p", "sc-help-text", "Hiển thị 40 câu đầu trong tổng số " + metrics.sentenceWordCounts.length.toLocaleString("vi-VN") + " câu."));
    }
    host.append(chartSection);
  }

  function renderResults(doc, resultHost, text, result) {
    resultHost.replaceChildren();
    const summary = element(doc, "div", "sc-summary");
    summary.setAttribute("aria-label", "Số dấu hiệu tìm thấy theo nhóm");
    const signalWords = countMarkedWords(text, result.matches);
    const density = result.writing.metrics.wordCount ? (signalWords / result.writing.metrics.wordCount) * 100 : 0;
    [
      ["cliche", "Cụm diễn đạt khuôn mẫu"],
      ["citation", "Nhận định gán nguồn mơ hồ"],
      ["density", "Mật độ cụm được đánh dấu (%)", density.toLocaleString("vi-VN", { maximumFractionDigits: 1 })]
    ].forEach(([key, label, value]) => {
      const item = element(doc, "div", "sc-count-card");
      item.append(element(doc, "strong", "sc-count", value === undefined ? String(result.counts[key]) : value), element(doc, "span", "sc-count-label", label));
      summary.append(item);
    });
    summary.append(element(doc, "p", "sc-density-note", "Mật độ là tỷ lệ số từ nằm trong cụm khuôn mẫu hoặc nhận định gán nguồn mơ hồ được đánh dấu trên tổng số từ phân tích; đây không phải xác suất AI."));
    resultHost.append(summary);

    const overview = element(doc, "div", "sc-analysis-overview");
    overview.append(element(doc, "strong", "", `${result.writing.findings.length} nhóm dấu hiệu văn phong bổ sung`));
    overview.append(element(doc, "span", "", "Số nhóm được tìm thấy, không phải xác suất AI. Không dùng kết quả này để kết luận gian lận hoặc đánh giá người viết."));
    resultHost.append(overview);

    const previewSection = element(doc, "section", "sc-result-section");
    const previewTitle = element(doc, "h2", "sc-section-title", "Văn bản đã quét");
    previewTitle.id = "sc-preview-title";
    previewSection.setAttribute("aria-labelledby", previewTitle.id);
    previewSection.append(previewTitle, element(doc, "p", "sc-help-text", "Vàng cam: cụm diễn đạt khuôn mẫu. Đỏ: nhận định gán nguồn còn mơ hồ. Tím: mẫu diễn đạt bổ sung. Xem các gợi ý bên dưới; màu sắc không kết luận tác giả hoặc nguồn gốc bài."));
    const preview = element(doc, "div", "sc-preview");
    preview.setAttribute("role", "region");
    preview.setAttribute("aria-label", "Bản xem trước với các cụm được đánh dấu");
    const signalMatches = result.writing.findings.flatMap((finding) => finding.ranges.map((range) => ({ ...range, category: `signal-${finding.category}` })));
    appendHighlightedText(doc, preview, text, [...result.matches, ...signalMatches]);
    previewSection.append(preview);
    if (!result.matches.length && !signalMatches.length) previewSection.append(element(doc, "p", "sc-zero-state", "Không thấy cụm nào trong danh sách dò. Điều này không xác nhận văn bản là do người viết hoặc không có vấn đề khác."));
    resultHost.append(previewSection);

    const refsSection = element(doc, "section", "sc-result-section");
    const refsTitle = element(doc, "h2", "sc-section-title", `Trích dẫn và đường link (${result.references.length})`);
    refsTitle.id = "sc-references-title";
    refsSection.setAttribute("aria-labelledby", refsTitle.id);
    refsSection.append(refsTitle, element(doc, "p", "sc-scholar-notice", "Chỉ khi bạn bấm một liên kết bên dưới, nội dung trích dẫn hoặc URL đó mới được gửi đến Google Scholar để tìm kiếm."));
    const references = element(doc, "ul", "sc-reference-list");
    renderReferences(doc, references, result.references);
    refsSection.append(references);
    resultHost.append(refsSection);
    renderWritingReport(doc, resultHost, text, result.writing);
  }

  function render(doc, host) {
    const section = element(doc, "section", "sc-tool");
    section.setAttribute("aria-labelledby", "scanner-title");
    const header = element(doc, "header", "sc-heading");
    header.append(element(doc, "span", "sc-kicker", "CÔNG CỤ · RÀ SOÁT BẢN NHÁP"));
    const title = element(doc, "h1", "sc-title", "Soi Bài Trước Giờ G");
    title.id = "scanner-title";
    header.append(title, element(doc, "p", "sc-intro", "Hai cách đọc lại bản nháp: quét mẫu diễn đạt có giải thích, hoặc thử mô hình đã huấn luyện có dữ liệu tiếng Việt. Kết quả là tín hiệu để đối chiếu, không phải kết luận tác giả."));
    section.append(header);

    const privacy = element(doc, "aside", "sc-privacy");
    privacy.setAttribute("role", "note");
    privacy.append(element(doc, "strong", "", "Riêng tư trong trình duyệt."), doc.createTextNode(" Nội dung bài chỉ được xử lý trên thiết bị này; công cụ không gửi hay lưu bài. Quét quy tắc dùng được ngay; mô hình thử nghiệm chỉ tải khi bạn chủ động yêu cầu ở bên dưới. Tất cả kết quả chỉ là tín hiệu để tự rà soát, có thể bỏ sót hoặc nhận nhầm; không phải bằng chứng đạo văn, bằng chứng dùng AI hay xác suất AI."));
    section.append(privacy);

    const method = element(doc, "details", "sc-method");
    method.append(element(doc, "summary", "", "Chế độ quét quy tắc đọc những dấu hiệu nào?"));
    method.append(element(doc, "p", "", "Ngoài cụm sáo rỗng và Markdown, công cụ tìm lời tự nhận là trợ lý, chỗ điền còn bỏ trống, câu lặp, cách mở đoạn lặp lại và mật độ từ nối. Phân tích cấu trúc chỉ chạy khi văn bản đủ dài; nhịp câu đều chỉ là dấu hiệu yếu khi đi cùng mẫu khác."));
    method.append(element(doc, "p", "", "Các ngưỡng của chế độ quét là quy tắc rà soát, không phải mô hình đã huấn luyện hay thước đo độ chính xác. Chế độ mô hình thử nghiệm riêng nằm bên dưới. Sửa câu chỉ để né đánh dấu không làm bài chính xác hơn; hãy bổ sung bằng chứng, lập luận của bạn và ghi lại quá trình dùng AI."));
    const research = element(doc, "a", "sc-scholar-link", "Đọc nghiên cứu về nguy cơ nhận nhầm văn người ↗");
    research.href = "https://arxiv.org/abs/2304.02819";
    research.target = "_blank";
    research.rel = "noopener noreferrer";
    method.append(research);
    section.append(method);

    const label = element(doc, "label", "sc-input-label", "Dán bài viết hoặc đoạn văn bản cần rà");
    label.htmlFor = "sc-submission-text";
    const textarea = element(doc, "textarea", "sc-textarea");
    textarea.id = "sc-submission-text";
    textarea.maxLength = MAX_TEXT_LENGTH;
    textarea.rows = 12;
    textarea.spellcheck = false;
    textarea.placeholder = "Dán bản nháp của bạn vào đây…";
    textarea.setAttribute("aria-describedby", "sc-input-help sc-character-count");
    section.append(label, textarea);
    section.append(element(doc, "p", "sc-help-text", "Chỉ dán nội dung bạn được phép lưu trên thiết bị đang dùng. Không dán thông tin cá nhân hoặc tài liệu mật."));
    const help = element(doc, "p", "sc-sr-only", `Tối đa ${MAX_TEXT_LENGTH.toLocaleString("vi-VN")} ký tự.`);
    help.id = "sc-input-help";
    section.append(help);

    const sampleControls = element(doc, "div", "sc-samples");
    sampleControls.append(element(doc, "strong", "sc-samples-title", "Thử nhanh với văn bản mẫu"));
    const sampleButtons = element(doc, "div", "sc-sample-buttons");
    const signalSample = button(doc, "🧪 Thử mẫu nhiều dấu hiệu AI", "sc-button sc-button-secondary");
    const naturalSample = button(doc, "✅ Thử mẫu bài viết tự nhiên", "sc-button sc-button-secondary");
    sampleButtons.append(signalSample, naturalSample);
    sampleControls.append(sampleButtons, element(doc, "p", "sc-help-text", "Hai đoạn là ví dụ do dự án biên soạn, không phải bài hoặc dữ liệu sinh viên. Mẫu chỉ nạp khi ô văn bản đang trống; hãy tự xóa nội dung nếu muốn thay bằng mẫu."));
    section.append(sampleControls);

    const liveStats = element(doc, "section", "sc-live-stats");
    liveStats.setAttribute("aria-labelledby", "sc-live-stats-title");
    const liveStatsTitle = element(doc, "h2", "sc-section-title", "Thống kê văn bản tức thì");
    liveStatsTitle.id = "sc-live-stats-title";
    liveStats.append(liveStatsTitle, element(doc, "p", "sc-help-text", "Các số dưới đây chỉ mô tả độ dài câu và phân bố từ trong văn bản. Chúng không ước tính ai là tác giả, không phải xác suất AI và không cần tải mô hình."));
    const liveStatsBody = element(doc, "div", "sc-live-stats-body");
    liveStatsBody.append(element(doc, "p", "sc-empty-state", "Nhập văn bản để xem các thống kê mô tả."));
    liveStats.append(liveStatsBody);
    section.append(liveStats);

    const controls = element(doc, "div", "sc-controls");
    const scan = button(doc, "Quét độ an toàn", "sc-button sc-button-primary");
    const modelJump = button(doc, "Mô hình thử nghiệm ↓", "sc-button sc-button-secondary");
    const clear = button(doc, "Xóa văn bản", "sc-button sc-button-secondary");
    const length = element(doc, "span", "sc-character-count", `0 / ${MAX_TEXT_LENGTH.toLocaleString("vi-VN")} ký tự`);
    length.id = "sc-character-count";
    controls.append(scan, modelJump, clear, length);
    section.append(controls);
    const status = element(doc, "p", "sc-status", "Dán văn bản vào ô phía trên rồi bắt đầu quét.");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    section.append(status);
    const resultsTitle = element(doc, "h2", "sc-section-title sc-main-results-title", "Kết quả rà soát");
    resultsTitle.id = "sc-results-title";
    const resultHost = element(doc, "div", "sc-results");
    resultHost.setAttribute("aria-labelledby", resultsTitle.id);
    resultHost.append(element(doc, "p", "sc-empty-state", "Kết quả sẽ hiện ở đây sau khi quét."));
    section.append(resultsTitle, resultHost);
    const modelControls = modelPanel.mount(doc, section, textarea, clear);
    modelJump.addEventListener("click", () => {
      modelControls.panel.scrollIntoView({ behavior: "smooth", block: "start" });
      const heading = doc.getElementById("sc-model-title");
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    });
    host.replaceChildren(section);

    const updateCount = () => { length.textContent = `${textarea.value.length.toLocaleString("vi-VN")} / ${MAX_TEXT_LENGTH.toLocaleString("vi-VN")} ký tự`; };
    let hasResults = false;
    const updateLiveStats = () => {
      liveStatsBody.replaceChildren();
      if (!textarea.value.trim()) {
        liveStatsBody.append(element(doc, "p", "sc-empty-state", "Nhập văn bản để xem các thống kê mô tả."));
        return;
      }
      try {
        renderLiveStats(doc, liveStatsBody, writingSignals.describe(textarea.value));
      } catch (_) {
        liveStatsBody.append(element(doc, "p", "sc-analysis-note", "Không thể tính thống kê cho nội dung hiện tại. Hãy rút ngắn văn bản rồi thử lại."));
      }
    };
    const handleInput = () => {
      updateCount();
      updateLiveStats();
      if (hasResults) {
        resultHost.replaceChildren(element(doc, "p", "sc-stale-state", "Văn bản đã thay đổi. Hãy quét lại để cập nhật kết quả."));
        hasResults = false;
      }
      status.textContent = textarea.value ? "Nội dung chỉ ở trên thiết bị này. Bấm quét khi bạn sẵn sàng." : "Dán văn bản vào ô phía trên rồi bắt đầu quét.";
    };
    textarea.addEventListener("input", handleInput);
    const loadSample = (sampleKey, label) => {
      if (textarea.value.length) {
        status.textContent = "Ô văn bản đang có nội dung. Nội dung hiện tại chưa bị thay đổi; hãy xóa bằng nút Xóa văn bản rồi chọn mẫu.";
        textarea.focus();
        return;
      }
      textarea.value = SAMPLE_TEXTS[sampleKey];
      handleInput();
      status.textContent = `${label} đã được nạp. Bấm «Quét độ an toàn» nếu muốn xem phần tô dấu.`;
      textarea.focus();
    };
    signalSample.addEventListener("click", () => loadSample("signals", "Văn bản mẫu nhiều cụm cần rà soát"));
    naturalSample.addEventListener("click", () => loadSample("natural", "Văn bản mẫu tự nhiên"));
    scan.addEventListener("click", () => {
      const text = textarea.value;
      if (text.length > MAX_TEXT_LENGTH) {
        status.textContent = `Văn bản vượt giới hạn ${MAX_TEXT_LENGTH.toLocaleString("vi-VN")} ký tự. Hãy rút ngắn rồi quét lại.`;
        return;
      }
      if (!text.trim()) {
        resultHost.replaceChildren(element(doc, "p", "sc-empty-state", "Ô văn bản đang trống. Dán nội dung bạn muốn rà trước."));
        status.textContent = "Chưa có văn bản để quét.";
        hasResults = true;
        return;
      }
      const result = analyzeText(text);
      if (!result.ok) {
        status.textContent = result.error;
        return;
      }
      renderResults(doc, resultHost, text, result);
      status.textContent = `Đã rà ${text.length.toLocaleString("vi-VN")} ký tự: ${result.matches.length} cụm / dấu định dạng, ${result.writing.findings.length} nhóm dấu hiệu văn phong bổ sung và ${result.references.length} trích dẫn hoặc link.`;
      hasResults = true;
    });
    clear.addEventListener("click", () => {
      textarea.value = "";
      updateCount();
      updateLiveStats();
      resultHost.replaceChildren(element(doc, "p", "sc-empty-state", "Kết quả sẽ hiện ở đây sau khi quét."));
      status.textContent = "Đã xóa văn bản và kết quả khỏi trang.";
      hasResults = false;
      textarea.focus();
    });
    return { textarea, scan, clear, status, resultHost, sampleButtons: [signalSample, naturalSample], liveStatsBody };
  }

  function mount(doc) {
    if (!doc || !doc.getElementById) return false;
    const host = doc.getElementById("toolkit-scanner");
    if (!host || (host.dataset && host.dataset.scannerMounted === "true")) return false;
    render(doc, host);
    if (host.dataset) host.dataset.scannerMounted = "true";
    return true;
  }

  return { MAX_TEXT_LENGTH, analyzeText, mount };
});
