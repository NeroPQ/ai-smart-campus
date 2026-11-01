# AI Smart Campus — MVP handoff

> **Cập nhật phạm vi 28/10/2026:** Website hiện chỉ phục vụ bốn công cụ: khai báo AI, prompt tự học, cẩm nang tình huống và Checker/Persona. Pre/post-test, bài học và form góp ý đã được gỡ khỏi website. Khảo sát sau sử dụng sẽ thực hiện bằng form riêng do nhóm chuẩn bị; chưa có đường dẫn form được cung cấp. Các mô tả phạm vi MVP v1 dưới đây là hồ sơ lịch sử, không phản ánh giao diện hiện tại.

**Thông điệp:** Use AI, Don’t Let AI Use You  
**Phiên bản:** MVP v1, chốt phạm vi ngày 16/10/2026  
**Đối tượng:** sinh viên đại học; dùng để học và thử nghiệm nội dung, không thay thế quy định môn học.

**Phạm vi đã chốt: đúng ba chức năng chính.** Learn with AI gồm ba bài 3–5 phút về sử dụng AI có trách nhiệm, kiểm chứng và tư duy độc lập. AI Use Checker gồm 10 tình huống học tập cố định, lựa chọn hành vi, phân loại và giải thích. AI Guideline gồm Do & Don't, fact-check, disclose AI và giảm phụ thuộc; quyền dùng AI phụ thuộc vào quy định môn/trường.

Prompt Challenge, Fact-check Challenge và Mini Quiz nằm trong kế hoạch mở rộng sau khi MVP v1 hoạt động ổn định. Ví dụ prompt, ví dụ kiểm chứng và câu hỏi tự kiểm tra là thành phần của bài học, không có trang riêng hay cơ chế trò chơi. Góp ý và Giới thiệu là phần hỗ trợ cho ba chức năng chính.

## 1. Kiểm tra báo cáo khảo sát 5 trang

Nguồn đã đọc: `AI_Smart_Campus_bao_cao_survey_findings.pdf` (5 trang) và CSV được đính kèm ở cuộc trò chuyện trước. Người cung cấp dữ liệu xác nhận đây là phản hồi thật và sẽ cung cấp chứng cứ, nhưng hiện chưa có tài liệu để đối chiếu nguồn, cách tuyển mẫu hoặc danh tính người trả lời. Vì vậy **chưa được gọi các tỷ lệ này là bằng chứng khảo sát sinh viên thật**, chưa suy rộng cho trường/khoa và chưa dùng để xếp hạng tính năng.

| Trang | Phần kiểm tra được | Giới hạn diễn giải |
| --- | --- | --- |
| 1 | Báo cáo mô tả 100 dòng; các lượt chọn tính năng là câu đa lựa chọn. Ba luồng được đề xuất khớp phạm vi MVP. | Số lượt chọn không phải xếp hạng ưu tiên đã xác minh của sinh viên. |
| 2 | Tổng các mục của câu 6 và câu 8 đều khớp 65 dòng có dùng AI. | 59/65 dòng chọn “chưa gặp khó khăn đáng kể” đồng thời chọn khó khăn cụ thể; 15/65 dòng có câu 6 không khớp câu 5. Không ước lượng tỷ lệ khó khăn từ câu 5. |
| 3 | Câu 11 khớp 65 dòng, câu 14 khớp 100 dòng. | 68/100 dòng chọn “chưa có nhu cầu cụ thể” đồng thời chọn nội dung khác; “sẵn sàng thử” không chứng minh đã tuyển được người thử. |
| 4 | Phạm vi ba luồng và kế hoạch hai tuần khả thi cho bản thử. | Đây là quyết định thiết kế tạm thời cần kiểm chứng với người học và chính sách học thuật. |
| 5 | 100 dòng, 16 cột; 35 dòng bỏ trống câu 3–11 theo nhánh khảo sát. | Chưa có hồ sơ tuyển mẫu, số lời mời, trường/khoa, tỷ lệ phản hồi. 100 dấu thời gian trải trong khoảng 8 phút 52 giây, khoảng cách trung vị 2 giây; toàn bộ góp ý mở để trống. Đây là dấu hiệu cần xác minh, không tự nó chứng minh dữ liệu giả. |

**Quyết định dữ liệu:** chỉ dùng báo cáo như giả thuyết để dựng prototype. Website không hiển thị số liệu khảo sát. Trước khi công bố nghiên cứu, Quang và Nhật Huy cần đối chiếu bản xuất gốc đã ẩn danh, cấu hình form, cách phát phiếu, thời gian thu thập, số lời mời và quy tắc xử lý câu trả lời mâu thuẫn. Khi xác minh được, cập nhật báo cáo với giới hạn mẫu và bằng chứng truy xuất; nếu không xác minh được, ghi rõ là dữ liệu thử nghiệm.

## 2. Sitemap và màn hình

| Mục | Màn hình / thao tác chính | Đầu ra người học |
| --- | --- | --- |
| Trang chủ | Giới thiệu ngắn, điều hướng vào ba luồng | Biết mục đích và giới hạn của công cụ. |
| AI Guideline | Thẻ hướng dẫn: kiểm chứng, công khai AI, tự học trước khi hỏi | Checklist có thể áp dụng cho bài học. |
| AI Use Checker | 10 tình huống cố định; chọn phương án rồi xem mức Appropriate / Risky / Not Recommended và giải thích | Nhận biết quyết định an toàn hơn; không có AI API. |
| Learn with AI | Ba bài 3–5 phút, ví dụ và câu hỏi tự kiểm tra | Thực hành prompt, kiểm chứng, công khai và giảm phụ thuộc. |
| Góp ý / Giới thiệu | Phản hồi không yêu cầu tên/email; lưu tại trình duyệt, xuất CSV cho Google Sheets hoặc JSON để chủ động gửi cho người điều phối pilot | Cách thu phản hồi thử nghiệm có giới hạn minh bạch. |

**Prompt Challenge**, **Fact-check Challenge**, **Mini Quiz** được hoãn sang giai đoạn mở rộng. MVP v1 dùng nhãn “Ví dụ minh họa”, “Ví dụ thực hành” và “Tự kiểm tra” trong bài học. Công cụ tạo khung prompt đã được thay bằng ví dụ so sánh prompt để giữ đúng phạm vi đã chốt.

## 3. Dữ liệu nội dung và quy tắc biên tập

| Khối nội dung | Dữ liệu tối thiểu | Quy tắc |
| --- | --- | --- |
| Guideline | Tiêu đề ngắn, ví dụ thực hành, hành động nên làm | Luôn nhắc kiểm tra quy định môn/trường trước khi dùng AI cho bài nộp. |
| Checker | `id`, bối cảnh, ba lựa chọn hành vi, nhãn mức độ, lý do, bước an toàn hơn | Cố định trong mã; giải thích theo tình huống, không tuyên bố AI được phép trong mọi môn. |
| Lesson | Tiêu đề, thời lượng 3–5 phút, mục tiêu, ví dụ, bài tập tự kiểm tra, phản hồi đúng/sai | Chính sách học thuật là điều kiện ngoài nội dung bài; người học phải đối chiếu quy định hiện hành. |
| Feedback | Loại phản hồi, nội dung tùy chọn, thời điểm, không có định danh | Chỉ lưu trên thiết bị; người điều phối chỉ nhận dữ liệu khi người học chủ động chia sẻ bản xuất. |

Nội dung được viết cho mục đích giáo dục chung. Long và Khang cần rà lại các ví dụ và đối chiếu quy định AI cụ thể trước khi nhóm thử trong một môn học.

**Bộ tình huống cố định trong Checker:** (1) bắt đầu tiểu luận; (2) kiểm tra trích dẫn do AI đưa ra; (3) gỡ lỗi bài lập trình được chấm; (4) bảo vệ dữ liệu phỏng vấn; (5) bài kiểm tra cấm AI; (6) dịch bản nháp trong môn ngoại ngữ; (7) kiểm chứng con số cho thuyết trình; (8) dùng đoạn giải thích do AI tạo; (9) thống nhất cách dùng AI trong nhóm; (10) tự học trước kỳ thi. Mỗi tình huống có ba hành vi được gán đủ ba mức **Appropriate / Risky / Not Recommended**, kèm lý do và bước tiếp theo.

**Ba bài học:** “Hỏi rõ hơn, học sâu hơn” (4 phút) có cách nêu bối cảnh và giới hạn cho prompt, ví dụ và câu hỏi tự kiểm tra; “AI nói có vẻ đúng, hãy kiểm tra” (4 phút) có ba bước kiểm chứng, bài tập kiểm tra một khẳng định minh họa và câu hỏi về trích dẫn; “Minh bạch, giữ quyền chủ động” (3 phút) có cách đối chiếu quy định, bảo vệ dữ liệu, mẫu ghi chú sử dụng AI và câu hỏi khi đề bài chưa rõ. Các ví dụ là tình huống học tập giả định, không phải kết quả nghiên cứu.

## 4. Chạy thử và kiểm thử

**Bản chạy:** https://ai-smart-campus-use-ai-wisely-2026.silkybean64.chatgpt.site — Site riêng tư, chủ sở hữu đăng nhập bằng ChatGPT để mở.  
**Chạy tại máy:** giải nén mã nguồn, mở terminal trong thư mục `dist`, chạy `python -m http.server 8000`, rồi mở `http://localhost:8000`. Có thể dùng một máy chủ tĩnh tương đương. Không cần cài gói và không cần API key.

Danh sách kiểm thử trước pilot:

1. Trên điện thoại và desktop, mở được từng mục bằng menu; không tràn ngang, chữ đọc được.
2. Checker có đủ 10 tình huống; cả ba lựa chọn đều cho nhãn, lý do và bước tiếp theo; đổi tình huống đặt lại trạng thái đúng cách.
3. Ba bài học đều hiển thị ví dụ, nhận câu trả lời tự kiểm tra và phản hồi ngay; làm lại được.
4. Góp ý không yêu cầu thông tin cá nhân; xuất CSV/JSON được, giữ đúng dấu tiếng Việt và xuống dòng; giao diện nói rõ phản hồi chưa được gửi tự động.
5. Dùng bàn phím để điều hướng, thấy focus; kiểm tra nhãn form và trạng thái phản hồi bằng trình đọc màn hình nếu có.
6. Kiểm tra các câu về quyền dùng AI: mọi chỗ đều dẫn người học quay lại quy định môn, bài tập và trường.

## 5. Phân công và kế hoạch 2 tuần

| Thời gian | Chủ trì / phối hợp | Đầu ra kiểm được |
| --- | --- | --- |
| Ngày 1–2 | Quang (PM), Nhật Huy (evaluation), Minh (outreach) | Hồ sơ nguồn CSV và quyết định dùng/không dùng số liệu; sửa logic form để “không có” loại trừ lựa chọn khác; danh sách mời mẫu thật có đồng ý tham gia. |
| Ngày 3–5 | Long, Khang (nội dung), Quang | Guideline được rà chính sách, 10 tình huống và đáp án được duyệt, 3 bài học có ví dụ và câu hỏi; sitemap và luồng màn hình chốt. |
| Ngày 6–10 | Hòa, Hùng (dev), Long, Khang | Website responsive có đủ ba luồng, điều hướng và phản hồi; checklist kiểm thử trên điện thoại/desktop. |
| Ngày 11–12 | Nhật Huy, Minh, Quang | 5–8 buổi thử với sinh viên thật có đồng ý; ghi nhận hoàn thành nhiệm vụ, lỗi hiểu nội dung, góp ý ẩn danh; không nhập dữ liệu định danh vào file xuất. |
| Ngày 13–14 | Hòa, Hùng, Long, Khang, Nhật Huy, Quang | Sửa lỗi ưu tiên cao, rà lại nội dung và chính sách, báo cáo pilot nêu phương pháp và giới hạn, quyết định phạm vi vòng sau. |

**Tiêu chí chốt MVP:** ba luồng chạy ổn trên màn hình nhỏ và lớn; 10 tình huống, ba bài học và phản hồi hoạt động; không có số liệu khảo sát chưa xác minh trên site. Nội dung v1.1 đã được người dùng duyệt ngày 17/10/2026; Nhật Huy ghi nhận kết quả thử thật trước khi nêu kết luận về người học.

**Điều kiện xem xét mở rộng:** hoàn tất thử nghiệm với nhóm sinh viên đã đồng ý tham gia; sửa các lỗi cản trở ba luồng chính; có bằng chứng phản hồi thực cho vấn đề cần giải quyết. Quang và Nhật Huy tổng hợp kết quả, sau đó nhóm chọn một tính năng mở rộng cho vòng tiếp theo.

## 6. Hình ảnh và phong cách giao diện

Quy ước hình ảnh đã chốt: dùng ảnh chụp người thật, không dùng ảnh tạo bằng AI.

Bộ ảnh chụp người thật từ Pexels đã thay thế toàn bộ ảnh AI trên website: học nhóm, đối chiếu sách với laptop và tự học bằng ghi chú. Ảnh đầu trang có mô tả thay thế; ảnh thẻ nội dung dùng mô tả rỗng để tránh đọc lặp với tiêu đề thẻ. Các thẻ ảnh bên dưới được tải khi cần. Đây là ảnh stock minh họa hoạt động học tập, không phải hình người trả lời khảo sát hay bằng chứng nghiên cứu.

Ảnh và thông tin nguồn/giấy phép được bàn giao trong bộ nén `AI_Smart_Campus_Photos.zip`. Mã nguồn website dùng các ảnh JPG tương ứng tại `dist/assets/`; phần Giới thiệu có liên kết tới tác giả và giấy phép Pexels.

## 7. Pre-test / Post-test và xuất CSV

Pre-test và Post-test là phần đánh giá trong Learn with AI, không phải tính năng Mini Quiz độc lập. Mỗi bài có 5 câu, đúng được 1 điểm, tổng 0–5. Cả hai bao phủ quy định môn học, kiểm chứng, khai báo AI, học chủ động và bảo vệ dữ liệu, bằng hai bộ câu hỏi khác nhau. Đây là công cụ giáo dục nhỏ chưa được thẩm định; chênh lệch điểm không tự chứng minh hiệu quả hay quan hệ nhân quả.

Luồng: nộp đủ 5 câu Pre-test → làm đúng câu tự kiểm tra của ba bài (bài 2 có hai câu) → Post-test mở → nộp đủ 5 câu → xem điểm, chênh lệch và giải thích. Pre-test được khóa sau khi nộp. Tiến độ lưu trên trình duyệt; bắt đầu lượt mới cần xác nhận và chỉ xóa lượt đánh giá này. Nếu trình duyệt chặn lưu, màn hình cảnh báo dữ liệu chỉ còn trong phiên hiện tại. Sau khi đã bắt đầu Post-test, đổi câu tự kiểm tra sẽ đặt lại Post-test chưa nộp và có thông báo.

“Tải CSV lượt đánh giá” xuất một dòng: thời gian UTC, lựa chọn 0–2 và nội dung đáp án, điểm Pre/Post, chênh lệch điểm, số bài hoàn thành 0–3 và số câu tự kiểm tra đúng 0–4. Điểm của bài chưa nộp để trống. Không thu tên/email, không tự gửi kết quả cho nhóm. Cần xuất trước khi bắt đầu lượt mới nếu muốn giữ lượt cũ.

“Xuất CSV cho Sheets” xuất toàn bộ góp ý đang lưu trên thiết bị thành 4 cột: `thoi_gian_utc`, `muc_huu_ich_1_5`, `gop_y`, `feedback_id`. Mã góp ý giữ ổn định qua tải lại/xuất lại để kiểm tra trùng; không phải mã người tham gia. Tệp UTF-8 có BOM, giữ dấu phẩy, dấu ngoặc kép và xuống dòng. Nội dung có thể bị hiểu là công thức được giữ dạng văn bản. Không nhập lặp cùng một bản xuất.

Nhập vào Google Sheets trên máy tính: Tệp → Nhập → Tải lên → chọn CSV → tạo trang tính mới → dấu phân tách là dấu phẩy → nhập. Kiểm tra số dòng, dấu tiếng Việt và điểm trước khi tổng hợp. [Hướng dẫn Google](https://support.google.com/docs/answer/12236443?hl=vi). Đây là bước nhập thủ công theo lựa chọn của nhóm; website không đồng bộ trực tiếp lên Google Sheets.

## 8. Nghiệm thu và kiểm thử bổ sung ngày 16/10/2026

Xem `MVP_QA_Checklist.md` để biết bằng chứng và phần còn cần nhóm xác nhận. Các kết quả 2/5 → 5/5 trong kiểm thử là dữ liệu do người kiểm thử thao tác, không phải kết quả sinh viên.

Trong thư mục mã nguồn đã giải nén, chạy `node tests/verify-assessment.test.js` và `node tests/verify-feedback.cjs` nếu có Node.js. Bài kiểm thử đánh giá chạy mã sản phẩm qua một DOM tối giản, không thay cho thử trình duyệt; luồng trình duyệt đã được kiểm tra riêng. Không cần Node.js để phục vụ website tĩnh.

Nhật Huy: thử với sinh viên có đồng ý tham gia, xuất từng lượt, ghi cách tuyển mẫu và giới hạn đo; Minh: nhận các CSV được người dùng chủ động chia sẻ; Hòa/Hùng: nhập và kiểm tra định dạng; Long/Khang: đối chiếu chính sách môn/trường cụ thể; Quang: chốt nghiệm thu nội dung và hồ sơ nguồn khảo sát trước khi trình bày kết quả thật.
## 9. Bản trình bày gọn

Theo góp ý về khả năng đọc: trang chủ dùng câu ngắn; Guideline gồm 3 thẻ Nên/Tránh và ví dụ mở thêm; mỗi bài Learn with AI mở riêng. Pre-test/Post-test hiện từng câu, có nút trước/tiếp và giữ đáp án; lời giải chi tiết mở khi cần. Hướng dẫn Sheets và thông tin nhóm được thu gọn. Chữ form và câu hỏi tự kiểm tra từ 14px, vẫn giữ ảnh chụp thật.

Bài kiểm thử đánh giá cập nhật đạt 12/12, gồm cả điều hướng từng câu. Kiểm tra lại luồng bài học/đánh giá và 5 màn hình ở 1280px/390px; không tràn ngang. Không thay đổi cách tính điểm hay việc góp ý chỉ lưu cục bộ.
## 10. Academic Guideline v1.1 — cập nhật 17/10/2026

Đã đối chiếu nguồn công khai FPT, APA Style, UNESCO và Turnitin, cùng 9 tệp bài giảng (86 slide). Có phần lặp/tổng hợp, không tính là 9 nguồn độc lập. Giữ ba thẻ ngắn và bảy chủ đề cũ; cập nhật ba nhóm dùng AI trong assignment, sáu câu hỏi khai báo và mẫu tiếng Anh; bổ sung mục 08 về detector và đánh giá công bằng. Appropriate không xác nhận quyền dùng AI; disclosure không hợp thức hóa hành vi bị cấm. Chi tiết dài mở khi cần.

Xem `Guideline_Review.md` và `Lecture_Evidence_Matrix.md` để kiểm tra trạng thái, nguồn và số slide. Codex đã cập nhật và kiểm thử kỹ thuật. Ngày 17/10/2026, người dùng xác nhận không có chính sách riêng của môn/bài tập và đã duyệt nội dung v1.1; không còn chờ tài liệu này hoặc phê duyệt nội dung bổ sung. Hòa/Hùng vẫn có thể ghi nhận nghiệm thu trên thiết bị thực tế. Không gọi Guideline là quy định chính thức của FPT. Kết quả khảo sát cũ vẫn chưa được xác minh; chưa có kết quả user testing thật.

## 11. Feedback và phân tích — cập nhật 17/10/2026

Feedback có mã chống nhập trùng; phần điểm có CSV 52 cột và bản sao chép dự phòng nếu không tải tệp được. Chế độ `?mode=test` lưu riêng và đặt tiền tố TEST cho tên tệp. Kiểm thử điểm hiện đạt 16/16, feedback đạt các kiểm tra định dạng, lưu, ID, vùng TEST riêng và lỗi tải xuống. Xem `Pilot_Runbook.md` để thu tệp, nhập bảng phân tích và phân biệt lượt thử thật với kiểm thử chức năng. Người dùng đã yêu cầu mở công khai cho sinh viên thử ngày 17/10/2026; trạng thái thực tế được xác nhận trong biên bản kiểm tra bản triển khai.
