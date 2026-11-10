# AI Smart Campus — đánh giá trước và sau

Website phục vụ các công cụ hiện có từ `public/`, còn `/evaluate` cung cấp luồng đánh giá. Đây là một bài 5 câu trước, ba bài đọc tự xác nhận, một bài 5 câu sau và feedback 1–5 kèm lời nhắn tùy chọn. Điểm được tính trên máy chủ; API câu hỏi không gửi đáp án hoặc lời giải. Không khẳng định bài kiểm tra chứng minh tác động học tập nếu chưa có thiết kế và dữ liệu phù hợp.

Lượt đánh giá được lưu trong D1. Mã tham gia là biệt danh và mỗi lượt có mã truy cập ngẫu nhiên riêng; mất mã truy cập có thể khiến người tham gia không tiếp tục được trên thiết bị khác. Không yêu cầu tên, email hay mã sinh viên. Tiền tố QA theo định dạng `QA` và chữ số được dành riêng cho dữ liệu thử; CSV thông thường không bao gồm QA. `/api/evaluation/export?qa=1` chỉ xuất QA. Không dùng QA làm dữ liệu sinh viên thật.

Để xuất CSV với tiêu đề cột giống Google Sheet, quản trị viên được phép dùng `/api/evaluation/export?format=sheet`; thêm `&qa=1` chỉ khi xuất dữ liệu thử. Xuất CSV vẫn yêu cầu quyền quản trị như trước.

CSV được kiểm tra quyền trên máy chủ bằng danh tính đăng nhập ChatGPT và email trong biến runtime bí mật `ADMIN_EMAIL`. Không đặt email hoặc khóa trong mã phía trình duyệt. Mã truy cập được băm trong cơ sở dữ liệu và không xuất ra CSV. Phân quyền và header nhận dạng của môi trường xuất bản cần được kiểm tra trên môi trường thật trước khi thu dữ liệu.

Chạy `npm test` để kiểm tra công cụ cũ và các hàm chính sách. Với D1 cục bộ đã chạy migration, `node tests/evaluation-integration.mjs` kiểm tra hai lượt QA, điểm, feedback và phân quyền xuất; dùng cơ sở dữ liệu thử mới để tránh trùng mã. `npm run build` đồng bộ trang chủ từ `public/index.html` trước khi đóng gói.

Trạng thái hoàn thành bài học là người tham gia tự xác nhận đã đọc, không chứng minh đã hiểu nội dung. Gợi ý không nhập dữ liệu cá nhân vào góp ý; nhóm cần xác định thời gian lưu, kênh liên hệ và cách xử lý yêu cầu xóa trước khi phát khảo sát thật.
