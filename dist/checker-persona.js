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
      kind: "architect", icon: "🏛️", title: "Kiến Trúc Sư Tỉnh Táo", english: "The Mindful Architect",
      slogan: "AI chỉ là trợ lý thực tập, bạn mới là Tổng công trình sư!",
      description: "Trong lượt này, phần lớn lựa chọn của bạn phù hợp nguyên tắc học có trách nhiệm. Tiếp tục kiểm chứng nguồn và kiểm tra yêu cầu của từng bài.",
      action: "Tạo bản khai báo AI", href: "#toolkit-disclosure"
    };
    if (count >= 5) return {
      kind: "sprinter", icon: "🏎️", title: "Tay Đua Deadline Tốc Độ", english: "The Agile Sprinter",
      slogan: "Biết tận dụng động cơ phản lực, nhưng coi chừng khúc cua gấp!",
      description: "Lượt này có những lựa chọn cần cân nhắc thêm. Trước khi chạy deadline, dừng một nhịp để đọc quy định, đối chiếu nguồn và ghi lại phần AI hỗ trợ.",
      action: "Lấy prompt để đổi chiến thuật", href: "#toolkit-prompts"
    };
    return {
      kind: "sleepwalker", icon: "🌙", title: "Kẻ Mộng Du Giữa Rừng Bot", english: "The AI Sleepwalker",
      slogan: "Coi chừng AI đang đi học đại học thay bạn!",
      description: "Lượt thử này có nhiều lựa chọn cần xem lại. Đọc phần giải thích, thử tự làm trước rồi dùng AI để hỏi gợi ý từng bước khi được phép.",
      action: "Thử prompt gợi mở để tự học", href: "#toolkit-prompts"
    };
  }
  return { getCard };
});
