# AI Smart Campus — Thu thập và phân tích kết quả

> **Đã thay đổi từ 28/10/2026:** Website chỉ giữ công cụ. Nhóm sẽ gửi form khảo sát riêng sau khi sinh viên sử dụng web; không còn pre/post-test hay xuất CSV khảo sát trong website. Quy trình cũ dưới đây được giữ để đối chiếu lịch sử, không dùng cho lượt thử mới. Các bản xuất dữ liệu đã có cần được nhóm giữ riêng; bản cập nhật website không xóa dữ liệu trình duyệt cũ.

## Người tham gia

1. Mở website bằng cùng một trình duyệt trong suốt lượt thử.
2. Vào Learn with AI: làm Pre-test, học 3 bài và hoàn thành 4 câu tự kiểm tra, rồi làm Post-test.
3. Chọn **Tải CSV lượt đánh giá** trước khi bắt đầu lượt mới. Nếu không tải được, mở **Xem / sao chép CSV** và lưu nội dung thành tệp `.csv` UTF-8.
4. Vào Góp ý, chọn mức hữu ích 1–5, nhập ý kiến nếu muốn, bấm **Lưu trên thiết bị**, rồi **Xuất CSV cho Sheets**.
5. Tự nguyện gửi hai tệp cho Minh/Nhật Huy theo kênh nhóm hướng dẫn. Website không tự gửi dữ liệu và không yêu cầu tên/email.

## Nhóm tổng hợp

- **Minh:** hướng dẫn tham gia tự nguyện và nhận tệp được chủ động chia sẻ.
- **Nhật Huy:** giữ bản gốc CSV, ghi nguồn/lượt thu, phân loại dữ liệu và tổng hợp kết quả.
- **Hòa/Hùng:** hỗ trợ lỗi trình duyệt và định dạng nhập. **Long/Khang:** xử lý góp ý nội dung. **Quang:** chốt báo cáo pilot.
- Bảng phân tích có ba trang: Tong quan, Diem test, Feedback. Dán dữ liệu CSV dưới dòng tiêu đề tương ứng; không thay cả trang hoặc ghi đè cột công thức. Chọn loại dữ liệu **Thật** chỉ sau khi đã xác nhận nguồn của lượt thử. TEST và dòng chưa phân loại không được tính.
- Diem test nhận 52 cột nguyên gốc của CSV điểm; Feedback nhận 4 cột: `thoi_gian_utc`, `muc_huu_ich_1_5`, `gop_y`, `feedback_id`. Các cột phân loại/công thức nằm sau cột nguồn. Giới hạn mẫu là 500 dòng mỗi bảng.
- Mỗi lượt chỉ giữ một bản xuất điểm cuối cùng. Khi trùng thời gian bắt đầu hoặc trùng mã góp ý, kiểm tra và giữ một bản đúng; không cộng lặp nhiều bản xuất. Thời gian bắt đầu là khóa rà soát lượt, không phải định danh người.
- Không ghép góp ý với điểm bằng thời gian hoặc nội dung. Hai bảng không có mã người tham gia chung. Số lượt không đồng nghĩa số người duy nhất.
- So sánh Pre/Post trên cùng các lượt đã hoàn thành. Lượt chỉ có Pre được ghi nhận riêng; không coi Post còn thiếu là điểm 0. Chênh lệch là điểm trên thang 0–5, không phải phần trăm.
- Mức hữu ích là phản hồi tự nguyện. Chênh lệch điểm của công cụ nhỏ này chưa đủ chứng minh website gây ra cải thiện học tập. CSV khảo sát cũ chưa xác minh không được nhập như kết quả pilot thật.

## Kiểm thử của nhóm

Thêm `?mode=test` trước phần `#learn` hoặc `#about` để lưu vào vùng TEST riêng. Trang có nhãn TEST và tên tệp tải xuống bắt đầu bằng `TEST-`. Nếu sao chép CSV thủ công, tự đặt tên tệp bắt đầu bằng `TEST-`. Không đánh dấu các dòng này là Thật trong bảng phân tích. Bỏ `?mode=test` để trở lại dữ liệu thông thường; không chuyển dữ liệu tự động giữa hai vùng.

Điểm và góp ý chỉ tồn tại trên trình duyệt/thiết bị đã dùng. Đổi thiết bị, xóa bộ nhớ trình duyệt hoặc dùng cửa sổ riêng tư có thể làm mất tiến độ; cần xuất tệp trước.
