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
  const start = () => api.mount(root.document, root.navigator);
  if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

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
    if (english) {
      const lines = [`I used ${tools.join(", ")} to ${tasks.join(", ")} while working on this assignment.`];
      if (checks.length) lines.push(`I took these steps to check the work: ${checks.join(", ")}.`);
      lines.push("I take responsibility for the final work and its accuracy.");
      return lines.join(" ");
    }
    const lines = [`Tôi đã sử dụng ${tools.join(", ")} để ${tasks.join(", ")} trong quá trình làm bài.`];
    if (checks.length) lines.push(`Các bước tôi đã thực hiện để kiểm tra lại gồm: ${checks.join(", ")}.`);
    lines.push("Tôi chịu trách nhiệm về nội dung và độ chính xác của bài nộp cuối cùng.");
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
    heading.append(title, makeElement(doc, "p", "stk-toolkit-intro", "Ghi lại đúng công cụ, khâu hỗ trợ và bước bạn đã tự làm. Chọn mục nào đúng với bài này."));
    section.append(heading);

    const jump = makeElement(doc, "nav", "page-tool-links");
    jump.setAttribute("aria-label", "Các phần của công cụ minh bạch AI");
    const logJump = makeElement(doc, "a", "", "Đi đến Nhật ký minh bạch AI ↓");
    logJump.href = "#toolkit-process-log";
    jump.append(logJump);
    section.append(jump);

    const form = makeElement(doc, "div", "stk-toolkit-form");
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
    languageGroup.setAttribute("aria-label", "Ngôn ngữ bản nháp");
    let language = "vi";
    const languageButtons = {};
    [["vi", "Tiếng Việt"], ["en", "English"]].forEach(([value, text]) => {
      const button = makeButton(doc, text, "stk-toolkit-language-button");
      button.setAttribute("aria-pressed", value === language ? "true" : "false");
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
    const reference = makeElement(doc, "p", "stk-toolkit-reference", "Nếu môn học yêu cầu APA, xem hướng dẫn chính thức rồi chỉnh theo yêu cầu của môn.");
    reference.append(makeSourceLink(doc, "APA Style ↗", "https://apastyle.apa.org/blog/cite-generative-ai-references"));
    preview.append(reference);
    const actions = makeElement(doc, "div", "stk-toolkit-actions");
    const copy = makeButton(doc, "Sao chép bản khai báo", "stk-toolkit-button stk-toolkit-button-primary");
    copy.disabled = true;
    const reset = makeButton(doc, "Xóa lựa chọn", "stk-toolkit-button stk-toolkit-button-secondary");
    const status = makeElement(doc, "span", "stk-toolkit-status", "");
    status.setAttribute("role", "status");
    actions.append(copy, reset, status);
    preview.append(actions);
    layout.append(form, preview);
    section.append(layout);
    host.replaceChildren(section);

    const readState = () => ({
      tools: fields.tools.filter((input) => input.checked).map((input) => OPTIONS.tools[Number(input.value)][language]),
      tasks: fields.tasks.filter((input) => input.checked).map((input) => OPTIONS.tasks[Number(input.value)][language]),
      checks: fields.checks.filter((input) => input.checked).map((input) => OPTIONS.checks[Number(input.value)][language]),
      otherTool: otherInput.value,
      language
    });
    const update = () => {
      Object.keys(fields).forEach((key) => fields[key].forEach((input) => {
        const label = input._optionLabel;
        if (label) label.className = input.checked ? "stk-toolkit-option is-selected" : "stk-toolkit-option";
      }));
      const value = buildDisclosure(readState());
      output.textContent = value || "Chọn ít nhất một công cụ và một khâu hỗ trợ để tạo bản nháp.";
      output.lang = language;
      copy.disabled = !value;
      status.textContent = value && !fields.checks.some((input) => input.checked)
        ? "Chưa ghi bước kiểm tra; bản nháp sẽ không khẳng định bạn đã kiểm tra."
        : "";
    };
    ["vi", "en"].forEach((value) => languageButtons[value].addEventListener("click", () => {
      language = value;
      languageButtons.vi.setAttribute("aria-pressed", value === "vi" ? "true" : "false");
      languageButtons.en.setAttribute("aria-pressed", value === "en" ? "true" : "false");
      update();
    }));
    form.addEventListener("change", update);
    otherInput.addEventListener("input", update);
    copy.addEventListener("click", async () => {
      const value = buildDisclosure(readState());
      const success = await copyText(value, doc, navigatorObject);
      status.textContent = success ? "Đã sao chép." : "Không sao chép được. Hãy chọn văn bản trong ô và sao chép thủ công.";
    });
    reset.addEventListener("click", () => {
      Object.values(fields).flat().forEach((input) => { input.checked = false; });
      otherInput.value = "";
      language = "vi";
      languageButtons.vi.setAttribute("aria-pressed", "true");
      languageButtons.en.setAttribute("aria-pressed", "false");
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
    section.append(filterControls, filterStatus);

    const grid = makeElement(doc, "div", "stk-toolkit-prompt-grid");
    const cards = [];
    PROMPTS.forEach((prompt, index) => {
      const card = makeElement(doc, "article", "stk-toolkit-prompt-card");
      card.dataset.category = prompt.category;
      const heading = makeElement(doc, "h3", "stk-toolkit-card-title", `${String(index + 1).padStart(2, "0")} · ${prompt.title}`);
      const categoryLabel = PROMPT_CATEGORIES.find((category) => category.key === prompt.category).label;
      card.append(makeElement(doc, "span", "stk-toolkit-kicker", categoryLabel), heading, makeElement(doc, "p", "stk-toolkit-purpose", prompt.purpose));

      const challenge = makeElement(doc, "details", "stk-toolkit-prompt-details");
      challenge.append(makeElement(doc, "summary", "", "Thử nâng cấp: câu này còn thiếu gì?"));
      challenge.append(makeElement(doc, "p", "stk-toolkit-purpose", `Câu ban đầu: “${prompt.challenge.weak}”`));
      challenge.append(makeElement(doc, "p", "stk-toolkit-hint", "Thử tự thêm bối cảnh hoặc giới hạn trước khi mở ví dụ."));
      const answer = makeElement(doc, "details", "stk-toolkit-prompt-details");
      answer.append(makeElement(doc, "summary", "", "Xem một cách nâng cấp"));
      answer.append(makeElement(doc, "p", "stk-toolkit-prompt-text", prompt.challenge.improved));
      answer.append(makeElement(doc, "p", "stk-toolkit-hint", prompt.challenge.lesson));
      challenge.append(answer);

      const text = makeElement(doc, "pre", "stk-toolkit-prompt-text", prompt.text);
      const sample = makeElement(doc, "details", "stk-toolkit-prompt-details");
      sample.append(makeElement(doc, "summary", "", "Xem mẫu prompt"), text);
      card.append(challenge, sample);
      const actions = makeElement(doc, "div", "stk-toolkit-actions");
      const button = makeButton(doc, "Sao chép prompt", "stk-toolkit-button stk-toolkit-button-primary");
      const status = makeElement(doc, "span", "stk-toolkit-status", "");
      status.setAttribute("role", "status");
      button.addEventListener("click", async () => {
        const success = await copyText(prompt.text, doc, navigatorObject);
        status.textContent = success ? "Đã sao chép." : "Không sao chép được. Hãy chọn văn bản trong prompt và sao chép thủ công.";
      });
      actions.append(button, status);
      card.append(actions);
      grid.append(card);
      cards.push(card);
    });
    section.append(grid);

    const applyFilter = (selectedCategory) => {
      const visibleCount = cards.reduce((count, card) => {
        const visible = selectedCategory === "all" || card.dataset.category === selectedCategory;
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
      filterStatus.textContent = `Đang hiển thị ${visibleCount} trên ${cards.length} mẫu.`;
    };
    PROMPT_CATEGORIES.forEach(({ key }) => filterButtons[key].addEventListener("click", () => applyFilter(key)));
    host.replaceChildren(section);
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

  function mount(doc, navigatorObject) {
    if (!doc || !doc.getElementById) return false;
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

  return { OPTIONS, PROMPTS, PROMPT_CATEGORIES, initialDisclosureState, buildDisclosure, copyText, mount };
});
