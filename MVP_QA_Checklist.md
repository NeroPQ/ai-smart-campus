# AI Smart Campus — Checklist nghiệm thu MVP v1

**Ngày kiểm tra: 16/10/2026.** Kết quả dưới đây là kiểm thử chức năng với dữ liệu thử, không phải khảo sát hay kết quả học tập của sinh viên thật.

| Tiêu chí | Trạng thái | Bằng chứng / giới hạn |
| --- | --- | --- |
| Các trang chính mở được trên desktop và điện thoại | Đạt trong kiểm thử trình duyệt | 5 màn hình × khung nhìn 1280px và 390px; đúng màn hình, không tràn ngang. Menu điện thoại mở, chọn mục và đóng đúng. Đây là giả lập khung nhìn, chưa thử trên thiết bị vật lý. |
| Hoàn thành đủ 10 tình huống AI Use Checker, xem giải thích | Đạt | Đi hết 10 tình huống tới tổng kết; quan sát đủ Appropriate / Risky / Not Recommended, giải thích và bước tiếp theo. |
| Hoàn thành 3 bài Learn with AI | Đạt | Bài 1: prompt; bài 2: khẳng định và trích dẫn; bài 3: chính sách. Bỏ một câu hoặc chọn sai vẫn khóa Post-test; đủ bốn câu đúng thì mở. Tải lại khôi phục lựa chọn. |
| Guideline và phê duyệt nội dung | Đã duyệt theo xác nhận người dùng | Ngày 17/10/2026, người dùng xác nhận không có chính sách riêng của môn/bài tập và đã duyệt v1.1. Không còn chờ tài liệu này. Nội dung vẫn ưu tiên quy định chung của trường và yêu cầu bài đánh giá; không phải chính sách chính thức FPT. |
| Pre-test và Post-test ghi điểm chính xác | Đạt kiểm thử kỹ thuật | Kiểm thử tự động đạt 12/12: 0/5, 2/5, 5/5; các chênh lệch +5, +3, 0; chặn nộp thiếu; lưu/khôi phục, bộ nhớ lỗi, đặt lại, xung đột tab. Trình duyệt chạy 2/5 → 5/5, hiện +3; CSV tải thực tế khớp. |
| Feedback Form nhận phản hồi và xuất sang Sheets | Đạt phần lưu và xuất CSV | Lưu góp ý thử, tải lại, tải CSV thực tế rồi đọc lại đúng 1 dòng và 3 cột; giữ tiếng Việt, dấu phẩy, ngoặc kép, xuống dòng. Góp ý thử đã xóa khỏi website xem thử. Chưa nhập vào tài khoản Google Sheets; nhóm nhập CSV thủ công theo hướng dẫn. |

## Phạm vi giữ nguyên

- Ba chức năng chính: AI Guideline, AI Use Checker, Learn with AI.
- Pre-test/Post-test nằm trong luồng Learn with AI; không có trò chơi Mini Quiz riêng.
- Prompt Challenge, Fact-check Challenge, Mini Quiz là kế hoạch mở rộng.
- Ảnh website là ảnh chụp thật từ Pexels, có nguồn trong Giới thiệu.
- Không hiển thị tỷ lệ khảo sát chưa được xác minh. Các con số 100, 65, 62, 57, 55 chỉ là mô tả CSV đang chờ xác minh nguồn; không dùng như bằng chứng từ sinh viên thật trong Final Presentation.

## Cách kiểm lại

1. Giải nén mã nguồn, phục vụ thư mục `dist` bằng một máy chủ tĩnh. Ví dụ: trong thư mục giải nén, chạy `python -m http.server 8000 --directory dist`, mở `http://localhost:8000`.
2. Mở Learn with AI, thử nộp thiếu câu; hoàn thành Pre-test, làm bốn câu tự kiểm tra, nộp Post-test. Điểm mỗi bài 0–5, chênh lệch tính bằng điểm.
3. Xuất CSV lượt đánh giá, đối chiếu điểm và thời gian với màn hình. `lessons_completed_count` có tối đa 3; `self_checks_correct_count` có tối đa 4.
4. Lưu một góp ý thử, tải lại, xuất CSV cho Sheets. Nhập qua Tệp → Nhập → Tải lên; dùng dấu phẩy làm dấu phân tách và kiểm tra số dòng. Không nhập lại cùng bản xuất.
5. Nếu có Node.js: `node tests/verify-assessment.test.js` và `node tests/verify-feedback.cjs`.

Các bài kiểm thử phản hồi còn bao phủ dữ liệu cũ, CSV an toàn với công thức, lỗi bộ nhớ, hai tab lưu cùng lúc, sự kiện cũ và xóa đúng dữ liệu của chức năng. Bài kiểm thử tự động không thay cho kiểm tra trình đọc màn hình hoặc thiết bị vật lý.

## Bước nhóm cần thực hiện

- **Quang:** duyệt phạm vi, hồ sơ nguồn CSV và checklist nội dung.
- **Long, Khang:** đối chiếu chính sách cụ thể, duyệt 10 tình huống, hai bộ câu hỏi và ba bài học.
- **Hòa, Hùng:** thử thêm trên điện thoại thực tế; hỗ trợ nhập CSV.
- **Minh:** hướng dẫn người thử tự nguyện xuất và gửi tệp; không yêu cầu dữ liệu định danh trong góp ý.
- **Nhật Huy:** tổ chức pilot có đồng ý tham gia, quản lý từng lượt đánh giá, mô tả phương pháp và giới hạn. Chênh lệch điểm trong công cụ nhỏ này chưa đủ để kết luận website gây ra cải thiện học tập.

Nguồn hướng dẫn nhập CSV: [Google Docs Editors Help](https://support.google.com/docs/answer/12236443?hl=vi). Không có kết nối gửi dữ liệu tự động sang Google Sheets.


## Kiểm tra bản trình bày gọn

Đã thử nút câu trước/tiếp, chặn bước chưa chọn đáp án, mở bài học theo liên kết, chỉ mở một bài mỗi lần, làm đủ Pre-test → ba bài → Post-test và mở giải thích. 5 màn hình ở 1280px và 390px không tràn ngang; nút tự kiểm tra dùng chữ 14px. Thông tin dài vẫn truy cập được qua phần mở rộng.

## Guideline v1.1 — kiểm tra ngày 17/10/2026

- Đối chiếu đủ 9 tệp bài giảng, 86 slide; lưu bảng nguồn và giới hạn trong `Lecture_Evidence_Matrix.md`.
- Giữ 7 chủ đề cũ; thêm chủ đề 08 về AI detector. Academic References là mục nguồn riêng, không tính vào số chủ đề.
- Desktop 1280px: mở được phần assignment, disclosure và mẫu tiếng Anh; nội dung hiển thị đủ. Không trùng ID hoặc thiếu hook JavaScript.
- Khung nhìn điện thoại 390px: ba nhóm assignment, sáu câu hỏi, mẫu disclosure và mục detector không tràn ngang; chữ xuống dòng đúng. Đây là kiểm thử khung nhìn trình duyệt, chưa phải điện thoại vật lý.
- Appropriate có cảnh báo không xác nhận quyền dùng AI; disclaimer ghi rõ không phải chính sách chính thức FPT. Liên kết detector trỏ đúng tài liệu Turnitin đã đối chiếu.
- Chạy lại 12/12 kiểm thử đánh giá và bộ kiểm thử feedback/CSV đều đạt; kiểm tra cú pháp JavaScript và bản sửa đạt. Không đổi cách chấm điểm, lưu phản hồi hoặc xuất CSV.
- Rà soát độc lập không phát hiện vấn đề trọng yếu. Người dùng đã duyệt nội dung và xác nhận không có chính sách riêng ngày 17/10/2026. Chưa ghi nhận nghiệm thu cá nhân Hòa/Hùng; không ghi thay chữ ký các thành viên.
