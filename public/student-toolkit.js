/* Student Toolkit add-ons for AI Smart Campus. No network calls or persistence. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }
  if (!root || !root.document) return;
  root.AISmartCampusToolkit = api;
  const start = () => api.mount(root.document, root.navigator, root.AISmartCampusProcessLog);
  if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  let activeProcessLog = null;
  const integrationRefreshers = [];

  function attachProcessLog(processLog) {
    activeProcessLog = processLog && typeof processLog.offerDraft === "function" ? processLog : null;
    integrationRefreshers.forEach((refresh) => refresh());
    return Boolean(activeProcessLog);
  }

  const OPTIONS = {
    tools: ["ChatGPT (OpenAI)", "Google Gemini", "Claude (Anthropic)", "GitHub Copilot", "Canva AI", "Gamma AI", "Grammarly", "QuillBot"].map((name) => ({ vi: name, en: name })),
    tasks: [
      { vi: "gợi ý ý tưởng", en: "brainstorm ideas" },
      { vi: "gợi ý dàn ý", en: "suggest an outline" },
      { vi: "giải thích khái niệm trong môn học", en: "explain course concepts" },
      { vi: "rà soát ngữ pháp", en: "proofread grammar" },
      { vi: "gợi ý tìm lỗi mã", en: "suggest ways to debug code" },
      { vi: "giải thích mã", en: "explain code" },
      { vi: "thiết kế bố cục slide", en: "suggest slide layouts" },
      { vi: "tạo câu hỏi luyện tập", en: "create practice questions" }
    ],
    checks: [
      { vi: "đối chiếu nhận định với nguồn gốc", en: "checked claims against original sources" },
      { vi: "xác nhận tài liệu trích dẫn có tồn tại", en: "confirmed cited sources exist" },
      { vi: "đọc nguồn và đối chiếu nhận định", en: "read sources and checked whether they support the claim" },
      { vi: "tự chạy kiểm thử mã", en: "tested code independently" },
      { vi: "tự chỉnh sửa cách diễn đạt cuối cùng", en: "revised the final wording myself" }
    ]
  };

  const PROMPTS = [
    {
      title: "Giảng viên phản biện khó tính",
      category: "writing",
      challenge: {
        weak: "Sửa bài này cho hay hơn.",
        improved: "Đọc bản nháp do tôi viết và nêu tối đa ba điểm cần xem lại về lập luận, bằng chứng hoặc cấu trúc. Chỉ đặt câu hỏi gợi mở để tôi tự sửa; đừng viết lại bài hoặc thêm nguồn mới.",
        lesson: "Nêu rõ việc cần làm, giới hạn phản hồi và phần bạn vẫn tự chịu trách nhiệm."
      },
      purpose: "Khi đã có bản nháp và muốn tự sửa lập luận còn yếu.",
      text: "Đọc bản nháp do tôi viết và nêu tối đa ba điểm cần xem lại về lập luận, bằng chứng hoặc cấu trúc. Chỉ đặt câu hỏi gợi mở để tôi tự sửa; đừng viết lại bài hoặc thêm nguồn mới.\n\n[Bản nháp bạn được phép chia sẻ]"
    },
    {
      title: "Gia sư Debug không lộ đáp án",
      category: "programming",
      challenge: {
        weak: "Sửa code này giúp tôi.",
        improved: "Giải thích nguyên nhân có thể xảy ra và gợi ý từng bước kiểm tra. Đừng viết sẵn lời giải hoàn chỉnh; chờ tôi thử mỗi bước rồi mới gợi ý tiếp.",
        lesson: "Cung cấp ngữ cảnh lỗi và yêu cầu gợi ý theo từng bước để bạn vẫn tự thực hành."
      },
      purpose: "Khi gặp lỗi và muốn hiểu nguyên nhân để tự sửa.",
      text: "Đoạn mã [ngôn ngữ] của tôi gặp lỗi [thông báo lỗi]. Hãy giải thích nguyên nhân có thể xảy ra và gợi ý từng bước kiểm tra. Đừng viết sẵn lời giải hoàn chỉnh; chờ tôi thử mỗi bước rồi mới gợi ý tiếp.\n\n[Chỉ dán mã bạn được phép chia sẻ; xóa khóa, dữ liệu cá nhân và mã nội bộ.]"
    },
    {
      title: "Máy quét câu hỏi bảo vệ đồ án",
      category: "learning",
      challenge: {
        weak: "Đặt câu hỏi cho nhóm tôi về đồ án.",
        improved: "Dựa trên phần tóm tắt do nhóm tôi tự viết, hãy đặt lần lượt năm câu hỏi phản biện về tính khả thi, dữ liệu và giới hạn của đề tài. Đợi nhóm tôi trả lời từng câu rồi mới hỏi tiếp; đừng tự tạo dữ liệu hay kết luận.",
        lesson: "Cho biết tài liệu đầu vào, số lượng và góc nhìn cần luyện; yêu cầu AI chờ câu trả lời của bạn."
      },
      purpose: "Trước khi thuyết trình hoặc bảo vệ đề tài.",
      text: "Dựa trên phần tóm tắt do nhóm tôi tự viết, hãy đặt lần lượt năm câu hỏi phản biện về tính khả thi, dữ liệu và giới hạn của đề tài. Đợi nhóm tôi trả lời từng câu rồi mới hỏi tiếp; đừng tự tạo dữ liệu hay kết luận.\n\n[Chỉ chia sẻ nội dung được phép công khai.]"
    },
    {
      title: "Giải ngố tài liệu học thuật khó",
      category: "learning",
      challenge: {
        weak: "Giải thích đoạn này dễ hiểu.",
        improved: "Giải thích [khái niệm] theo hai mức: lời dễ hiểu kèm ví dụ mới, rồi thuật ngữ chuyên ngành cốt lõi cần giữ chính xác. Nếu đoạn trích chưa đủ thông tin, hãy nói rõ điều đó.",
        lesson: "Nêu khái niệm, mức giải thích và cách xử lý khi thiếu thông tin."
      },
      purpose: "Khi gặp khái niệm hoặc đoạn tài liệu chuyên ngành khó hiểu.",
      text: "Giải thích [khái niệm] trong đoạn trích dưới đây theo hai mức: (1) lời dễ hiểu kèm ví dụ mới; (2) thuật ngữ chuyên ngành cốt lõi cần giữ chính xác. Nếu đoạn trích chưa đủ thông tin, hãy nói rõ điều đó.\n\n[Chỉ chia sẻ tài liệu bạn được phép đưa vào công cụ AI.]"
    },
    {
      title: "Kiểm tra ảo giác trích dẫn",
      category: "writing",
      challenge: {
        weak: "Tìm nguồn cho nhận định này.",
        improved: "Gợi ý cụm từ khóa để tôi tự tìm trên cơ sở dữ liệu học thuật hoặc trang nhà xuất bản. Không khẳng định nguồn có thật, không bịa tên bài, tác giả, DOI hay đường dẫn. Liệt kê chi tiết tôi cần tự đối chiếu.",
        lesson: "Yêu cầu đường tìm kiếm và tiêu chí tự kiểm tra thay vì để AI khẳng định nguồn."
      },
      purpose: "Tự tìm nguồn gốc thay vì tin một trích dẫn do AI nêu ra.",
      text: "Tôi muốn kiểm tra nhận định hoặc trích dẫn sau: [thông tin]. Hãy gợi ý cụm từ khóa để tôi tự tìm trên cơ sở dữ liệu học thuật hoặc trang nhà xuất bản. Không khẳng định nguồn có thật, không bịa tên bài, tác giả, DOI hay đường dẫn. Liệt kê chi tiết tôi cần tự đối chiếu."
    },
    {
      title: "Khung brainstorm chống bí ý",
      category: "learning",
      challenge: {
        weak: "Cho tôi vài ý tưởng hay.",
        improved: "Với chủ đề [chủ đề] và đối tượng [đối tượng], hãy gợi ý ba hướng tiếp cận, nêu ưu điểm, hạn chế và câu hỏi cần khảo sát thực tế của mỗi hướng. Đừng chọn thay tôi hoặc bịa dữ liệu.",
        lesson: "Bổ sung bối cảnh, số lượng và tiêu chí để so sánh các lựa chọn thay vì nhận một đáp án chung chung."
      },
      purpose: "Khi mới nhận đề bài và cần các hướng để tự cân nhắc.",
      text: "Với chủ đề [chủ đề] và đối tượng [đối tượng], hãy gợi ý ba hướng tiếp cận khác nhau, nêu ưu điểm, hạn chế và câu hỏi cần khảo sát thực tế của mỗi hướng. Đừng chọn thay tôi hoặc bịa dữ liệu. Kết thúc bằng câu hỏi giúp nhóm tôi tự chọn hướng khả thi."
    }
  ];

  const PROMPT_CATEGORIES = [
    { key: "all", label: "Tất cả mẫu" },
    { key: "writing", label: "Bài viết & nguồn" },
    { key: "programming", label: "Lập trình" },
    { key: "learning", label: "Tự học & thuyết trình" }
  ];

  function initialDisclosureState() {
    return { tools: [], tasks: [], checks: [], otherTool: "", language: "vi" };
  }

  function buildDisclosure(state) {
    const selected = state || initialDisclosureState();
    const tools = [...(Array.isArray(selected.tools) ? selected.tools : [])];
    const otherTool = typeof selected.otherTool === "string" ? selected.otherTool.trim().slice(0, 100) : "";
    if (otherTool && !tools.includes(otherTool)) tools.push(otherTool);
    const tasks = Array.isArray(selected.tasks) ? selected.tasks : [];
    const checks = Array.isArray(selected.checks) ? selected.checks : [];
    if (!tools.length || !tasks.length) return "";

    const english = selected.language === "en";
    const apaGuidance = selected.language === "apa";
    const course = typeof selected.course === "string" ? selected.course.trim().slice(0, 120) : "";
    const assignment = typeof selected.assignment === "string" ? selected.assignment.trim().slice(0, 160) : "";
    if (english) {
      const lines = [];
      if (course) lines.push(`Course: ${course}.`);
      if (assignment) lines.push(`Assignment: ${assignment}.`);
      lines.push(`I used ${tools.join(", ")} to ${tasks.join(", ")} while working on this assignment.`);
      if (checks.length) lines.push(`I took these steps to check the work: ${checks.join(", ")}.`);
      lines.push("I take responsibility for the final work and its accuracy.");
      return lines.join(" ");
    }
    const lines = [];
    if (course) lines.push(`Môn học: ${course}.`);
    if (assignment) lines.push(`Bài tập: ${assignment}.`);
    lines.push(`Tôi đã sử dụng ${tools.join(", ")} để ${tasks.join(", ")} trong quá trình làm bài.`);
    if (checks.length) lines.push(`Các bước tôi đã thực hiện để kiểm tra lại gồm: ${checks.join(", ")}.`);
    lines.push("Tôi chịu trách nhiệm về nội dung và độ chính xác của bài nộp cuối cùng.");
    if (apaGuidance) lines.push("Hướng dẫn APA 7: Đây là lời khai báo, không phải trích dẫn hay mục tài liệu tham khảo. Kiểm tra hướng dẫn chính thức và quy định của môn học; công cụ không tự tạo thông tin nguồn.");
    return lines.join(" ");
  }

  function makeElement(doc, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function makeButton(doc, text, className) {
    const button = makeElement(doc, "button", className || "stk-toolkit-button", text);
    button.type = "button";
    return button;
  }

  function navigateToJournal(doc) {
    if (!doc || typeof doc.getElementById !== "function") return;
    const browser = doc.defaultView || null;
    const focusJournal = () => {
      const target = doc.getElementById("apl-draft-title") || doc.getElementById("toolkit-process-log");
      if (target && typeof target.scrollIntoView === "function") target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (target && typeof target.focus === "function") target.focus();
    };
    const scheduleFocus = () => {
      if (browser && typeof browser.requestAnimationFrame === "function") browser.requestAnimationFrame(focusJournal);
      else if (browser && typeof browser.setTimeout === "function") browser.setTimeout(focusJournal, 0);
      else focusJournal();
    };
    const alreadyOnJournal = !browser || !browser.location || browser.location.hash === "#toolkit-process-log";
    if (alreadyOnJournal) {
      scheduleFocus();
      return;
    }
    if (typeof browser.addEventListener === "function") {
      browser.addEventListener("hashchange", scheduleFocus, { once: true });
      browser.location.hash = "#toolkit-process-log";
    } else {
      browser.location.hash = "#toolkit-process-log";
      scheduleFocus();
    }
  }

  function makeSourceLink(doc, text, href) {
    const link = makeElement(doc, "a", "stk-toolkit-source-link", text);
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  }

  function renderDisclosure(doc, host, navigatorObject) {
    const section = makeElement(doc, "section", "stk-toolkit stk-toolkit-disclosure");
    section.setAttribute("aria-labelledby", "stk-disclosure-title");
    const heading = makeElement(doc, "div", "stk-toolkit-heading");
    heading.append(makeElement(doc, "span", "stk-toolkit-kicker", "CÔNG CỤ 01 · KHAI BÁO AI"));
    const title = makeElement(doc, "h1", "stk-toolkit-title", "Khai báo & Nhật ký minh bạch AI");
    title.id = "stk-disclosure-title";
    heading.append(title, makeElement(doc, "p", "stk-toolkit-intro", "Chỉ chọn những gì bạn đã thực sự làm cho bài này. Bản khai báo là bản nháp để bạn rà lại trước khi sao chép hoặc lưu."));
    section.append(heading);

    const jump = makeElement(doc, "nav", "page-tool-links");
    jump.setAttribute("aria-label", "Các phần của công cụ minh bạch AI");
    const logJump = makeElement(doc, "a", "", "Đi đến Nhật ký minh bạch AI ↓");
    logJump.href = "#toolkit-process-log";
    jump.append(logJump);
    section.append(jump);

    const form = makeElement(doc, "div", "stk-toolkit-form");
    const contextGroup = makeElement(doc, "div", "stk-toolkit-context");
    const courseLabel = makeElement(doc, "label", "stk-toolkit-field", "Môn học (không bắt buộc)");
    const courseInput = doc.createElement("input");
    courseInput.type = "text";
    courseInput.maxLength = 120;
    courseInput.autocomplete = "off";
    courseInput.placeholder = "Ví dụ: Nhập môn khoa học dữ liệu";
    courseInput.className = "stk-toolkit-text-input";
    courseLabel.append(courseInput);
    const assignmentLabel = makeElement(doc, "label", "stk-toolkit-field", "Tên bài tập (không bắt buộc)");
    const assignmentInput = doc.createElement("input");
    assignmentInput.type = "text";
    assignmentInput.maxLength = 160;
    assignmentInput.autocomplete = "off";
    assignmentInput.placeholder = "Ví dụ: Báo cáo giữa kỳ";
    assignmentInput.className = "stk-toolkit-text-input";
    assignmentLabel.append(assignmentInput);
    contextGroup.append(courseLabel, assignmentLabel);
    form.append(contextGroup);
    const presetLabel = makeElement(doc, "label", "stk-toolkit-field", "Gợi ý theo loại bài (không tự chọn thay bạn)");
    const presetSelect = doc.createElement("select");
    presetSelect.className = "stk-toolkit-text-input";
    presetSelect.setAttribute("aria-label", "Gợi ý theo loại bài; không tự chọn mục khai báo");
    [
      ["", "Chọn loại bài để xem gợi ý"],
      ["writing", "Bài viết / tiểu luận"],
      ["programming", "Bài lập trình"]
    ].forEach(([value, label]) => {
      const option = makeElement(doc, "option", "", label);
      option.value = value;
      presetSelect.append(option);
    });
    presetLabel.append(presetSelect);
    const presetNote = makeElement(doc, "p", "stk-toolkit-hint stk-toolkit-preset-note", "Gợi ý chỉ giúp bạn nhớ các mục có thể phù hợp. Mọi ô vẫn để trống; chỉ tự chọn việc bạn đã thực sự làm.");
    presetNote.setAttribute("aria-live", "polite");
    form.append(presetLabel, presetNote);
    const fields = {};
    [
      ["tools", "01", "Công cụ AI đã dùng", "Chọn công cụ đã dùng cho chính bài này."],
      ["tasks", "02", "Khâu AI đã hỗ trợ", "Chọn từng việc đúng với cách bạn đã dùng AI."],
      ["checks", "03", "Bước kiểm tra bạn đã làm", "Để trống mục nào bạn chưa thực hiện."]
    ].forEach(([key, number, labelText, hintText]) => {
      const fieldset = makeElement(doc, "fieldset", "stk-toolkit-choice-group");
      const legend = makeElement(doc, "legend", "stk-toolkit-legend");
      legend.append(makeElement(doc, "span", "stk-toolkit-step", number), makeElement(doc, "span", "", labelText));
      fieldset.append(legend, makeElement(doc, "p", "stk-toolkit-hint", hintText));
      const list = makeElement(doc, "div", "stk-toolkit-options");
      fields[key] = [];
      OPTIONS[key].forEach((option, index) => {
        const label = makeElement(doc, "label", "stk-toolkit-option");
        const input = doc.createElement("input");
        input.type = "checkbox";
        input.value = String(index);
        input.id = `stk-${key}-${index}`;
        const caption = makeElement(doc, "span", "", option.vi);
        input._optionLabel = label;
        label.append(input, caption);
        list.append(label);
        fields[key].push(input);
      });
      fieldset.append(list);
      form.append(fieldset);
    });

    const otherLabel = makeElement(doc, "label", "stk-toolkit-field", "Công cụ khác (không bắt buộc)");
    const otherInput = doc.createElement("input");
    otherInput.type = "text";
    otherInput.maxLength = 100;
    otherInput.autocomplete = "off";
    otherInput.placeholder = "Ghi tên công cụ đã dùng";
    otherInput.className = "stk-toolkit-text-input";
    otherLabel.append(otherInput);
    form.append(otherLabel);

    const layout = makeElement(doc, "div", "stk-toolkit-disclosure-layout");
    const preview = makeElement(doc, "aside", "stk-toolkit-preview");
    preview.setAttribute("aria-labelledby", "stk-disclosure-preview-title");
    const previewHeading = makeElement(doc, "div", "stk-toolkit-preview-heading");
    const languageGroup = makeElement(doc, "div", "stk-toolkit-language", "");
    languageGroup.setAttribute("role", "group");
    languageGroup.setAttribute("aria-label", "Ngôn ngữ hoặc hướng dẫn bản nháp");
    let language = "vi";
    const languageButtons = {};
    [["vi", "Tiếng Việt"], ["en", "English"], ["apa", "APA 7 · hướng dẫn"]].forEach(([value, text]) => {
      const button = makeButton(doc, text, "stk-toolkit-language-button");
      button.setAttribute("aria-pressed", value === language ? "true" : "false");
      if (value === "apa") button.setAttribute("title", "Hướng dẫn khai báo theo APA 7; không tạo trích dẫn APA");
      languageButtons[value] = button;
      languageGroup.append(button);
    });
    const previewTitle = makeElement(doc, "h3", "stk-toolkit-preview-title", "Bản nháp của bạn");
    previewTitle.id = "stk-disclosure-preview-title";
    previewHeading.append(previewTitle, languageGroup);
    const output = makeElement(doc, "pre", "stk-toolkit-output", "Chọn ít nhất một công cụ và một khâu hỗ trợ để tạo bản nháp.");
    output.setAttribute("aria-live", "polite");
    output.setAttribute("aria-label", "Bản nháp khai báo AI");
    preview.append(previewHeading, output);
    const caveat = makeElement(doc, "p", "stk-toolkit-caveat", "Khai báo minh bạch không biến một hành vi bị cấm thành hợp lệ. Hãy kiểm tra yêu cầu riêng của giảng viên. Bản nháp này không phải tài liệu tham khảo APA hoàn chỉnh.");
    preview.append(caveat);
    const reference = makeElement(doc, "p", "stk-toolkit-reference", "Công cụ không tự tạo trích dẫn APA vì mỗi lời khai cần phản ánh đúng cách bạn đã dùng AI và yêu cầu của môn học. Nếu môn yêu cầu APA, hãy kiểm tra hướng dẫn chính thức và bổ sung thông tin nguồn phù hợp.");
    reference.append(makeSourceLink(doc, "APA Style ↗", "https://apastyle.apa.org/blog/cite-generative-ai-references"));
    preview.append(reference);
    const actions = makeElement(doc, "div", "stk-toolkit-actions");
    const copy = makeButton(doc, "Sao chép bản khai báo", "stk-toolkit-button stk-toolkit-button-primary");
    copy.disabled = true;
    const save = makeButton(doc, "Lưu bản nháp vào nhật ký…", "stk-toolkit-button stk-toolkit-button-secondary");
    save.disabled = true;
    const reset = makeButton(doc, "Xóa lựa chọn", "stk-toolkit-button stk-toolkit-button-secondary");
    const status = makeElement(doc, "span", "stk-toolkit-status", "");
    status.setAttribute("role", "status");
    actions.append(copy, save, reset, status);
    preview.append(actions);
    layout.append(form, preview);
    section.append(layout);
    host.replaceChildren(section);

    const readState = () => ({
      tools: fields.tools.filter((input) => input.checked).map((input) => OPTIONS.tools[Number(input.value)][language === "en" ? "en" : "vi"]),
      tasks: fields.tasks.filter((input) => input.checked).map((input) => OPTIONS.tasks[Number(input.value)][language === "en" ? "en" : "vi"]),
      checks: fields.checks.filter((input) => input.checked).map((input) => OPTIONS.checks[Number(input.value)][language === "en" ? "en" : "vi"]),
      otherTool: otherInput.value,
      course: courseInput.value,
      assignment: assignmentInput.value,
      language
    });
    const update = () => {
      Object.keys(fields).forEach((key) => fields[key].forEach((input) => {
        const label = input._optionLabel;
        if (label) label.className = input.checked ? "stk-toolkit-option is-selected" : "stk-toolkit-option";
      }));
      const value = buildDisclosure(readState());
      output.textContent = value || "Chọn ít nhất một công cụ và một khâu hỗ trợ để tạo bản nháp.";
      output.lang = language === "en" ? "en" : "vi";
      copy.disabled = !value;
      save.disabled = !value || !disclosureConfirmed.checked || !activeProcessLog;
      status.textContent = value && !fields.checks.some((input) => input.checked)
        ? "Chưa ghi bước kiểm tra; bản nháp sẽ không khẳng định bạn đã kiểm tra."
        : "";
    };
    const disclosureConfirmedLabel = makeElement(doc, "label", "stk-toolkit-confirm-label");
    const disclosureConfirmed = doc.createElement("input");
    disclosureConfirmed.type = "checkbox";
    disclosureConfirmed.id = "stk-disclosure-confirmed";
    disclosureConfirmedLabel.append(disclosureConfirmed, makeElement(doc, "span", "", "Tôi xác nhận các lựa chọn trên phản ánh đúng cách tôi đã dùng AI cho bài này."));
    preview.insertBefore(disclosureConfirmedLabel, actions);
    disclosureConfirmed.addEventListener("change", update);
    integrationRefreshers.push(update);
    ["vi", "en", "apa"].forEach((value) => languageButtons[value].addEventListener("click", () => {
      language = value;
      Object.entries(languageButtons).forEach(([key, button]) => button.setAttribute("aria-pressed", value === key ? "true" : "false"));
      update();
    }));
    form.addEventListener("change", update);
    otherInput.addEventListener("input", update);
    courseInput.addEventListener("input", update);
    assignmentInput.addEventListener("input", update);
    presetSelect.addEventListener("change", () => {
      const suggestions = {
        writing: "Bài viết: hãy cân nhắc riêng từng ô về gợi ý ý tưởng, dàn ý, sửa ngữ pháp, đọc nguồn và tự chỉnh bản cuối. Chỉ chọn đúng việc đã làm.",
        programming: "Lập trình: hãy cân nhắc riêng từng ô về giải thích mã, gợi ý debug và tự chạy kiểm thử. Chỉ chọn đúng việc đã làm."
      };
      presetNote.textContent = suggestions[presetSelect.value] || "Gợi ý chỉ giúp bạn nhớ các mục có thể phù hợp. Mọi ô vẫn để trống; chỉ tự chọn việc bạn đã thực sự làm.";
    });
    copy.addEventListener("click", async () => {
      const value = buildDisclosure(readState());
      const success = await copyText(value, doc, navigatorObject);
      status.textContent = success ? "Đã sao chép." : "Không sao chép được. Hãy chọn văn bản trong ô và sao chép thủ công.";
    });
    save.addEventListener("click", () => {
      if (!activeProcessLog) {
        status.textContent = "Nhật ký chưa sẵn sàng. Mở phần Nhật ký minh bạch AI rồi thử lại.";
        return;
      }
      const offered = activeProcessLog.offerDraft({ kind: "disclosure", title: "Bản khai báo AI", body: buildDisclosure(readState()) });
      if (offered) {
        status.textContent = offered === "pending" ? "Bạn đang có bản nháp chưa lưu. Hãy xử lý bản nháp đó trước." : "Bản nháp chưa được lưu. Chọn môn học và xác nhận trong màn hình nhật ký.";
        navigateToJournal(doc);
      } else {
        status.textContent = "Chưa mở được bước lưu. Hãy mở lại trang hoặc dùng nút sao chép bản nháp.";
      }
    });
    reset.addEventListener("click", () => {
      Object.values(fields).flat().forEach((input) => { input.checked = false; });
      otherInput.value = "";
      courseInput.value = "";
      assignmentInput.value = "";
      presetSelect.value = "";
      presetNote.textContent = "Gợi ý chỉ giúp bạn nhớ các mục có thể phù hợp. Mọi ô vẫn để trống; chỉ tự chọn việc bạn đã thực sự làm.";
      disclosureConfirmed.checked = false;
      language = "vi";
      Object.entries(languageButtons).forEach(([key, button]) => button.setAttribute("aria-pressed", key === "vi" ? "true" : "false"));
      update();
      status.textContent = "Đã xóa lựa chọn.";
    });
    return { update };
  }

  function renderPrompts(doc, host, navigatorObject) {
    const section = makeElement(doc, "section", "stk-toolkit", "");
    section.setAttribute("aria-labelledby", "stk-prompts-title");
    const heading = makeElement(doc, "div", "stk-toolkit-heading");
    heading.append(makeElement(doc, "span", "stk-toolkit-kicker", "CÔNG CỤ 02 · TỰ HỌC"));
    const title = makeElement(doc, "h1", "stk-toolkit-title", "Tủ thuốc prompt học thuật");
    title.id = "stk-prompts-title";
    heading.append(title, makeElement(doc, "p", "stk-toolkit-intro", "Sáu mẫu gợi mở để bạn tự suy nghĩ, tự kiểm tra và luyện trình bày. Xem mẫu rồi chỉnh cho đúng việc mình cần."));
    section.append(heading);
    const privacyNote = makeElement(doc, "p", "stk-toolkit-caveat", "Trước khi dán bản nháp, mã hoặc tài liệu vào công cụ AI, hãy kiểm tra quy định môn học và chắc chắn bạn được phép chia sẻ nội dung đó. Xóa thông tin cá nhân, khóa và tài liệu mật.");
    section.append(privacyNote);

    const filterControls = makeElement(doc, "div", "stk-toolkit-actions");
    filterControls.setAttribute("role", "group");
    filterControls.setAttribute("aria-label", "Lọc prompt theo nhu cầu");
    const filterButtons = {};
    PROMPT_CATEGORIES.forEach((category) => {
      const count = category.key === "all" ? PROMPTS.length : PROMPTS.filter((prompt) => prompt.category === category.key).length;
      const initialClass = category.key === "all"
        ? "stk-toolkit-button stk-toolkit-button-primary"
        : "stk-toolkit-button stk-toolkit-button-secondary";
      const button = makeButton(doc, `${category.label} (${count})`, initialClass);
      button.setAttribute("aria-pressed", category.key === "all" ? "true" : "false");
      filterButtons[category.key] = button;
      filterControls.append(button);
    });
    const filterStatus = makeElement(doc, "p", "stk-toolkit-hint", `Đang hiển thị ${PROMPTS.length} trên ${PROMPTS.length} mẫu.`);
    filterStatus.setAttribute("role", "status");
    filterStatus.setAttribute("aria-live", "polite");
    const searchLabel = makeElement(doc, "label", "stk-toolkit-field stk-toolkit-search-label", "Tìm mẫu prompt");
    const searchInput = doc.createElement("input");
    searchInput.type = "search";
    searchInput.className = "stk-toolkit-text-input";
    searchInput.placeholder = "Tìm theo tình huống, từ khóa hoặc công cụ…";
    searchInput.autocomplete = "off";
    searchLabel.append(searchInput);
    const topicLabel = makeElement(doc, "label", "stk-toolkit-field stk-toolkit-topic-label", "Chủ đề cần học (không bắt buộc)");
    const topicInput = doc.createElement("input");
    topicInput.type = "text";
    topicInput.maxLength = 160;
    topicInput.className = "stk-toolkit-text-input";
    topicInput.placeholder = "Ví dụ: đạo đức khi dùng AI trong đại học";
    topicInput.autocomplete = "off";
    topicLabel.append(topicInput);
    const searchRow = makeElement(doc, "div", "stk-toolkit-prompt-controls");
    searchRow.append(searchLabel, topicLabel);
    section.append(filterControls, searchRow, filterStatus);

    const grid = makeElement(doc, "div", "stk-toolkit-prompt-grid");
    const cards = [];
    const promptSaveButtons = [];
    PROMPTS.forEach((prompt, index) => {
      const card = makeElement(doc, "article", "stk-toolkit-prompt-card");
      card.dataset.category = prompt.category;
      card.dataset.promptIndex = String(index);
      const heading = makeElement(doc, "h3", "stk-toolkit-card-title", `${String(index + 1).padStart(2, "0")} · ${prompt.title}`);
      const categoryLabel = PROMPT_CATEGORIES.find((category) => category.key === prompt.category).label;
      card.append(makeElement(doc, "span", "stk-toolkit-kicker", categoryLabel), heading, makeElement(doc, "p", "stk-toolkit-purpose", prompt.purpose));

      const challenge = makeElement(doc, "details", "stk-toolkit-prompt-details");

      const exampleGrid = makeElement(doc, "div", "stk-toolkit-example-grid");
      const weakExample = makeElement(doc, "div", "stk-toolkit-example stk-toolkit-example-weak");
      const weakText = makeElement(doc, "p", "", prompt.challenge.weak);
      weakExample.append(makeElement(doc, "strong", "", "Câu ban đầu"), weakText);
      const improvedExample = makeElement(doc, "div", "stk-toolkit-example stk-toolkit-example-strong");
      const improvedText = makeElement(doc, "p", "", prompt.challenge.improved);
      improvedExample.append(makeElement(doc, "strong", "", "Một cách cải thiện"), improvedText);
      exampleGrid.append(weakExample, improvedExample);
      const text = makeElement(doc, "pre", "stk-toolkit-prompt-text", prompt.text);
      const sample = makeElement(doc, "details", "stk-toolkit-prompt-details");
      sample.append(makeElement(doc, "summary", "", "Xem mẫu prompt"), text);
      challenge.replaceChildren(makeElement(doc, "summary", "", "So sánh câu hỏi ban đầu và cách cải thiện"), exampleGrid,
        makeElement(doc, "p", "stk-toolkit-hint", prompt.challenge.lesson));
      card.append(challenge, sample);
      const actions = makeElement(doc, "div", "stk-toolkit-actions");
      const button = makeButton(doc, "Sao chép prompt", "stk-toolkit-button stk-toolkit-button-primary");
      const saveButton = makeButton(doc, "Lưu mẫu vào nhật ký…", "stk-toolkit-button stk-toolkit-button-secondary");
      saveButton.disabled = !activeProcessLog;
      promptSaveButtons.push(saveButton);
      const status = makeElement(doc, "span", "stk-toolkit-status", "");
      status.setAttribute("role", "status");
      button.addEventListener("click", async () => {
        const success = await copyText(renderPromptText(prompt, topicInput.value), doc, navigatorObject);
        status.textContent = success ? "Đã sao chép." : "Không sao chép được. Hãy chọn văn bản trong prompt và sao chép thủ công.";
      });
      saveButton.addEventListener("click", () => {
        if (!activeProcessLog) {
          status.textContent = "Nhật ký chưa sẵn sàng. Bạn vẫn có thể sao chép prompt.";
          return;
        }
        const offered = activeProcessLog.offerDraft({
          kind: "prompt",
          title: `Mẫu prompt: ${prompt.title}`,
          body: renderPromptText(prompt, topicInput.value)
        });
        status.textContent = offered
          ? (offered === "pending" ? "Bạn đang có bản nháp chưa lưu. Hãy xử lý bản nháp đó trước." : "Mẫu chưa được lưu. Chọn môn học và xác nhận trong màn hình nhật ký.")
          : "Chưa mở được bước lưu. Hãy dùng nút sao chép prompt.";
        if (offered) navigateToJournal(doc);
      });
      actions.append(button, saveButton, status);
      card.append(actions);
      grid.append(card);
      cards.push(card);
      card._topicNodes = { weakText, improvedText, sampleText: text };
      card.dataset.search = promptSearchText(prompt, "");
    });
    section.append(grid);
    integrationRefreshers.push(() => promptSaveButtons.forEach((button) => { button.disabled = !activeProcessLog; }));

    let selectedCategory = "all";
    const applyFilter = (category) => {
      selectedCategory = category;
      const query = searchInput.value.trim().toLocaleLowerCase();
      const visibleCount = cards.reduce((count, card) => {
        const matchesCategory = selectedCategory === "all" || card.dataset.category === selectedCategory;
        const matchesSearch = !query || card.dataset.search.includes(query);
        const visible = matchesCategory && matchesSearch;
        card.hidden = !visible;
        return count + (visible ? 1 : 0);
      }, 0);
      Object.entries(filterButtons).forEach(([key, button]) => {
        const selected = key === selectedCategory;
        button.setAttribute("aria-pressed", selected ? "true" : "false");
        button.className = selected
          ? "stk-toolkit-button stk-toolkit-button-primary"
          : "stk-toolkit-button stk-toolkit-button-secondary";
      });
      filterStatus.textContent = query
        ? `Đang hiển thị ${visibleCount} trên ${cards.length} mẫu phù hợp với “${searchInput.value.trim()}”.`
        : `Đang hiển thị ${visibleCount} trên ${cards.length} mẫu.`;
    };
    PROMPT_CATEGORIES.forEach(({ key }) => filterButtons[key].addEventListener("click", () => applyFilter(key)));
    searchInput.addEventListener("input", () => applyFilter(selectedCategory));
    topicInput.addEventListener("input", () => {
      cards.forEach((card) => {
        const prompt = PROMPTS[Number(card.dataset.promptIndex)];
        const topic = topicInput.value.trim().slice(0, 160);
        const replaceTopic = (text) => text.replace(/\[(?:topic|chủ đề|khái niệm)\]/gi, (match) => topic || match);
        card._topicNodes.sampleText.textContent = renderPromptText(prompt, topic);
        card._topicNodes.weakText.textContent = replaceTopic(prompt.challenge.weak);
        card._topicNodes.improvedText.textContent = replaceTopic(prompt.challenge.improved);
        card.dataset.search = promptSearchText(prompt, topic).toLocaleLowerCase();
      });
      applyFilter(selectedCategory);
    });
    applyFilter("all");
    host.replaceChildren(section);
  }

  function renderPromptText(prompt, topic) {
    const value = typeof topic === "string" ? topic.trim().slice(0, 160) : "";
    return prompt.text.replace(/\[(?:topic|chủ đề|khái niệm)\]/gi, (match) => value || match);
  }

  function promptSearchText(prompt, topic) {
    const value = typeof topic === "string" ? topic.trim().slice(0, 160) : "";
    const replaceTopic = (text) => text.replace(/\[(?:topic|chủ đề|khái niệm)\]/gi, (match) => value || match);
    return [prompt.title, prompt.category, prompt.purpose, prompt.text, prompt.challenge.weak, prompt.challenge.improved, prompt.challenge.lesson]
      .map(replaceTopic).join(" ").toLocaleLowerCase();
  }

  async function copyText(text, doc, navigatorObject) {
    if (typeof text !== "string" || !text) return false;
    if (navigatorObject && navigatorObject.clipboard && typeof navigatorObject.clipboard.writeText === "function") {
      try {
        await navigatorObject.clipboard.writeText(text);
        return true;
      } catch (_) {
        // A denied Clipboard API may still allow the user-gesture fallback below.
      }
    }
    if (!doc || typeof doc.execCommand !== "function" || !doc.body) return false;
    const input = doc.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.className = "stk-toolkit-copy-buffer";
    doc.body.append(input);
    input.select();
    let copied = false;
    try { copied = Boolean(doc.execCommand("copy")); } catch (_) { copied = false; }
    input.remove();
    return copied;
  }

  function mount(doc, navigatorObject, processLog) {
    if (!doc || !doc.getElementById) return false;
    if (processLog) attachProcessLog(processLog);
    const targets = [
      ["toolkit-disclosure", renderDisclosure],
      ["toolkit-prompts", renderPrompts]
    ];
    let mounted = false;
    targets.forEach(([id, render]) => {
      const host = doc.getElementById(id);
      if (!host || host.dataset.toolkitMounted === "true") return;
      render(doc, host, navigatorObject);
      host.dataset.toolkitMounted = "true";
      mounted = true;
    });
    return mounted;
  }

  return { OPTIONS, PROMPTS, PROMPT_CATEGORIES, initialDisclosureState, buildDisclosure, renderPromptText, promptSearchText, copyText, attachProcessLog, mount };
});
