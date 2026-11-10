(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AISmartCampusPersona = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  function getCard(count) {
    if (!Number.isInteger(count) || count < 0 || count > 10) return null;
    if (count >= 8) return {
      kind: "architect", icon: "🛡️", title: "Kiến Trúc Sư Tư Duy Độc Lập", english: "The Independent Thinking Architect",
      slogan: "AI có thể gợi ý; bạn vẫn kiểm chứng và làm chủ bài học.",
      description: "Trong lượt thực hành này, bạn chọn cách dùng AI phù hợp nguyên tắc học có trách nhiệm ở phần lớn tình huống. Tiếp tục xác minh thông tin và kiểm tra quy định của từng môn.",
      action: "Tạo bản khai báo AI", href: "#toolkit-disclosure"
    };
    if (count >= 5) return {
      kind: "sprinter", icon: "🧭", title: "Người Khai Phá Đang Hoàn Thiện", english: "The Developing Explorer",
      slogan: "Mỗi lần dừng lại kiểm chứng sẽ giúp bạn dùng AI chủ động hơn.",
      description: "Lượt thực hành này có cả lựa chọn phù hợp và lựa chọn cần xem lại. Trước khi nộp bài, hãy đọc quy định, đối chiếu nguồn và ghi lại phần AI hỗ trợ.",
      action: "Lấy prompt để đổi chiến thuật", href: "#toolkit-prompts"
    };
    return {
      kind: "sleepwalker", icon: "⚡", title: "Người Phụ Thuộc Tốc Độ", english: "The Speed-First User",
      slogan: "Chậm lại một nhịp để tự hiểu, kiểm chứng và chịu trách nhiệm.",
      description: "Trong lượt thực hành này, nhiều lựa chọn cần được xem lại. Đây chỉ là ảnh chụp cách bạn thử các tình huống, không phải kết luận về con người bạn. Hãy đọc lý do, tự làm trước rồi dùng gợi ý AI khi được phép.",
      action: "Thử prompt gợi mở để tự học", href: "#toolkit-prompts"
    };
  }
  return { getCard };
});
