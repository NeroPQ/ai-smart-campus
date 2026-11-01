/* Optional local model UI. No manuscript is sent to a remote inference API. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AISmartCampusModelPanel = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  const MAX_LENGTH = 6000;
  const MIN_WORDS = 80;
  function node(doc, tag, cls, text) {
    const el = doc.createElement(tag);
    el.className = cls || "";
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function validate(text) {
    if (text.length > MAX_LENGTH) return "Chế độ mô hình nhận tối đa 6.000 ký tự mỗi lượt. Hãy chọn một đoạn ngắn hơn; công cụ không tự cắt phần còn lại.";
    if ((text.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu) || []).length < MIN_WORDS) return "Cần ít nhất 80 từ / âm tiết để dùng chế độ mô hình. Đoạn quá ngắn chưa đủ cơ sở cho phép thử này.";
    return "";
  }
  function mount(doc, host, textarea, clear, createWorker) {
    const panel = node(doc, "section", "sc-model-panel");
    panel.setAttribute("aria-labelledby", "sc-model-title");
    const heading = node(doc, "h2", "sc-section-title", "Nhận diện bằng mô hình · Thử nghiệm");
    heading.id = "sc-model-title";
    panel.append(heading, node(doc, "p", "sc-help-text", "Dùng mô hình đã huấn luyện có dữ liệu tiếng Việt, thay vì chỉ dò từ khóa. Bấm nút mới tải mô hình khoảng 181 MB từ Hugging Face và thư viện từ jsDelivr. Bài được phân tích trên thiết bị, không gửi đến dịch vụ chấm bài."));
    panel.append(node(doc, "p", "sc-model-limit", "Mô hình học từ câu trả lời diễn đàn và văn do Qwen tạo; chưa được kiểm định riêng cho bài quảng bá, báo cáo học thuật hoặc các đời ChatGPT mới. Kết quả có thể nhận nhầm và bỏ sót. Điểm mô hình không phải % bài do AI viết."));
    const source = node(doc, "a", "sc-scholar-link", "Nguồn mô hình và giới hạn kiểm thử ↗");
    source.href = "https://huggingface.co/bibbbu/multilingual-ai-human-detector_xlm-roberta-base";
    source.target = "_blank"; source.rel = "noopener noreferrer";
    panel.append(source);
    const conversion = node(doc, "a", "sc-scholar-link", " · Bản ONNX của mujian2026 (MIT) ↗");
    conversion.href = "https://huggingface.co/mujian2026/multilingual-ai-text-detector";
    conversion.target = "_blank"; conversion.rel = "noopener noreferrer";
    panel.append(conversion, node(doc, "p", "sc-help-text", "Tiếng Việt / English · 80 từ trở lên · tối đa 6.000 ký tự. Lần đầu có thể mất vài phút và dùng nhiều bộ nhớ; nên dùng máy tính và Wi-Fi. Dữ liệu mô hình có thể được trình duyệt lưu đệm."));
    const controls = node(doc, "div", "sc-controls");
    const analyze = node(doc, "button", "sc-button sc-button-primary", "Phân tích bằng mô hình"); analyze.type = "button";
    const stop = node(doc, "button", "sc-button sc-button-secondary", "Dừng / Giải phóng mô hình"); stop.type = "button"; stop.disabled = true;
    controls.append(analyze, stop);
    const status = node(doc, "p", "sc-status", "Chưa tải mô hình. Quét theo quy tắc phía trên vẫn dùng được ngay."); status.setAttribute("role", "status"); status.setAttribute("aria-live", "polite");
    const output = node(doc, "div", "sc-model-output");
    panel.append(controls, status, output); host.append(panel);
    let worker = null, requestId = 0, running = false, timer = null;
    const setRunning = (value) => { running = value; analyze.disabled = value; stop.disabled = !worker; panel.setAttribute("aria-busy", String(value)); };
    const release = () => { requestId += 1; if (worker) worker.terminate(); worker = null; if (timer) root.clearTimeout(timer); timer = null; setRunning(false); };
    const invalidate = () => {
      if (running) release();
      output.replaceChildren();
      status.textContent = textarea.value ? "Văn bản đã thay đổi. Bấm phân tích để nhận kết quả mới." : "Chưa có bài để phân tích bằng mô hình.";
    };
    textarea.addEventListener("input", invalidate);
    clear.addEventListener("click", () => { release(); output.replaceChildren(); status.textContent = "Đã xóa kết quả và giải phóng mô hình."; });
    stop.addEventListener("click", () => { release(); output.replaceChildren(); status.textContent = "Đã dừng và giải phóng mô hình. Có thể thử lại khi sẵn sàng."; });
    analyze.addEventListener("click", () => {
      const text = textarea.value;
      const error = validate(text);
      if (error) { output.replaceChildren(); status.textContent = error; return; }
      output.replaceChildren();
      try {
        if (!worker) worker = createWorker ? createWorker() : new root.Worker("ai-model-worker.js?v=20261030-model-v5", { type: "module" });
        const id = ++requestId;
        setRunning(true);
        status.textContent = "Đang chuẩn bị mô hình. Lần đầu cần tải khoảng 181 MB; có thể bấm Dừng bất cứ lúc nào.";
        worker.onmessage = ({ data }) => {
          if (!data || data.id !== id || id !== requestId) return;
          if (data.type === "status") status.textContent = data.message || ({ "loading-runtime": "Đang tải thư viện chạy mô hình…", "loading-model": "Đang tải / khởi tạo mô hình trên thiết bị…", running: `Đang phân tích phần ${data.chunk || 1} / ${data.totalChunks || "…"}…` }[data.status] || "Đang phân tích trên thiết bị…");
          if (data.type === "progress") {
            const progress = data.progress;
            const pct = typeof progress === "number" ? progress : progress && progress.progress;
            status.textContent = Number.isFinite(pct) ? `Đang tải một thành phần mô hình: ${Math.round(Math.min(100, Math.max(0, pct)))}%.` : "Đang tải / khởi tạo mô hình trên thiết bị…";
          }
          if (data.type === "error") { release(); status.textContent = data.message || (data.error && data.error.message) || "Không chạy được mô hình. Hãy thử lại trên trình duyệt máy tính; phần rà quy tắc vẫn dùng được."; }
          if (data.type === "result") {
            if (timer) root.clearTimeout(timer); timer = null; setRunning(false);
            const result = data.result;
            if (!result || !Number.isFinite(result.scoreAi) || result.scoreAi < 0 || result.scoreAi > 1 || !Array.isArray(result.chunks)) { release(); status.textContent = "Kết quả mô hình không hợp lệ. Hãy thử lại."; return; }
            const labels = { "ai-leaning": "Mô hình nghiêng về mẫu văn AI", "human-leaning": "Mô hình nghiêng về mẫu văn người", uncertain: "Mô hình chưa phân biệt rõ" };
            output.append(node(doc, "h3", "sc-finding-title", labels[result.verdict] || labels.uncertain));
            output.append(node(doc, "p", "sc-model-score", `Điểm nghiêng về lớp AI: ${result.scoreAi.toFixed(3)} (thang 0–1)`));
            output.append(node(doc, "p", "sc-model-limit", "Đây là điểm đầu ra trên mẫu mô hình đã học, không phải xác suất tác giả dùng AI hay tỷ lệ nội dung AI. Kết quả thấp cũng không xác nhận bài do người viết. Không dùng riêng kết quả này để kết luận gian lận."));
            output.append(node(doc, "p", "sc-help-text", `Đã phân tích toàn bộ đầu vào qua ${result.chunks.length} phần (${result.tokenCount} token). Điểm tổng hợp theo độ dài từng phần; không phải phép hiệu chỉnh xác suất.`));
            result.chunks.forEach((chunk, index) => {
              const details = node(doc, "details", "sc-model-chunk");
              details.append(node(doc, "summary", "", `Phần ${index + 1} · điểm lớp AI ${Number(chunk.scoreAi).toFixed(3)}`));
              details.append(node(doc, "p", "sc-model-excerpt", chunk.text)); output.append(details);
            });
            status.textContent = "Đã phân tích bằng mô hình trên thiết bị. Đọc kết quả cùng bản nháp, nguồn và nhật ký quá trình làm bài.";
          }
        };
        worker.onerror = () => { if (id !== requestId) return; release(); status.textContent = "Không tải hoặc chạy được mô hình trên trình duyệt này. Kiểm tra kết nối / bộ nhớ rồi thử lại; phần rà quy tắc vẫn hoạt động."; };
        timer = root.setTimeout(() => { release(); status.textContent = "Mô hình chưa hoàn tất sau 5 phút. Đã dừng để giải phóng tài nguyên; hãy thử lại với đoạn ngắn hơn hoặc kết nối ổn định hơn."; }, 300000);
        worker.postMessage({ type: "analyze", id, text });
      } catch (_) { release(); status.textContent = "Trình duyệt không hỗ trợ hoặc không khởi tạo được chế độ mô hình. Hãy dùng trình duyệt máy tính và thử lại."; }
    });
    return { panel, analyze, stop, status, output, release };
  }
  return { mount, validate, MAX_LENGTH, MIN_WORDS };
});
