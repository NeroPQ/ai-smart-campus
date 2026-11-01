# AI Smart Campus

**Use AI. Don’t let AI use you.** — Bộ công cụ giúp sinh viên sử dụng AI có trách nhiệm.

[Mở website](https://ai-smart-campus-use-ai-wisely-2026.phanthienquang11234.chatgpt.site/)

## Công cụ

- **Khai báo AI:** tạo bản khai báo từ công cụ, khâu hỗ trợ và các bước tự kiểm tra đã chọn.
- **Nhật ký minh bạch AI:** ghi quá trình theo môn học, tự lưu bằng localStorage, xuất Markdown và bản in / lưu PDF.
- **Tủ prompt:** sáu mẫu phục vụ tự học, phản biện, debug và kiểm chứng.
- **Soi Bài Trước Giờ G:** rà mẫu diễn đạt, dấu định dạng, câu lặp và gom trích dẫn để tự đối chiếu.
- **Mô hình thử nghiệm:** phân tích văn bản trên thiết bị bằng XLM-R, có dữ liệu tiếng Việt; tải mô hình khi người dùng chủ động bấm nút.
- **Checker & Persona:** thực hành 10 tình huống dùng AI và nhận phản hồi.

## Chạy trên máy

Website tĩnh HTML/CSS/JavaScript, không cần bước build hoặc cài thư viện để chạy phần giao diện.

Với Python 3, chạy tại thư mục dự án:

```sh
python -m http.server 4173 --directory dist
```

Sau đó mở <http://localhost:4173>. Cần phục vụ qua HTTP/HTTPS để Web Worker hoạt động; không mở trực tiếp bằng `file://`.

Có thể đưa nội dung `dist/` lên dịch vụ lưu trữ website tĩnh hỗ trợ HTTPS. Kho GitHub này không tự triển khai hoặc thay đổi website đang chạy.

## Kiểm thử

Cần Node.js 20 trở lên; không cần cài thêm gói npm:

```sh
npm test
```

Các kiểm thử tự động bao phủ điều hướng, khai báo, Persona, lưu nhật ký, xuất phụ lục, phân tích văn phong, chia token và điều khiển mô hình. Kiểm thử mô hình dùng dữ liệu giả lập để kiểm tra mã điều khiển, không tải trọng số hay đo độ chính xác phân loại. Lượt chạy mô hình thật cần kiểm tra trong trình duyệt.

## Mô hình và quyền riêng tư

- Mô hình: [mujian2026/multilingual-ai-text-detector](https://huggingface.co/mujian2026/multilingual-ai-text-detector), bản ONNX Q4 của [bibbbu/XLM-R classifier](https://huggingface.co/bibbbu/multilingual-ai-human-detector_xlm-roberta-base).
- Revision được ghim: `60be618d23e169de6fe04b8e6135be7d8976abb7`; runtime Transformers.js `3.8.1` tải từ jsDelivr.
- Lần đầu tải trọng số khoảng 181 MB từ Hugging Face. Trọng số không nằm trong kho này; không cần API key.
- Chế độ mô hình nhận ít nhất 80 từ/âm tiết, tối đa 6.000 ký tự mỗi lượt, chia toàn bộ đầu vào thành các phần nhỏ để phân tích.
- Nội dung bài được xử lý tại trình duyệt, không gửi đến API phân tích. Các máy chủ CDN nhận yêu cầu tải thư viện/trọng số. Trình duyệt có thể lưu đệm mô hình; nhật ký môn học lưu riêng trong localStorage trên cùng thiết bị và nguồn website.
- Kết quả chỉ là tín hiệu thử nghiệm, **không phải % nội dung AI hay bằng chứng gian lận**. Mô hình có thể bỏ sót và nhận nhầm; kiểm thử gốc có phạm vi hẹp, chưa chứng minh khả năng tổng quát cho mọi văn bản hoặc hệ AI.

## Cấu trúc

```text
dist/     Giao diện, JavaScript, Web Worker, ảnh và font
tests/    Kiểm thử Node.js
*.md      Tài liệu thiết kế, hướng dẫn pilot và bàn giao
```

Các tài liệu pilot/bàn giao được giữ lại làm tham khảo, một số mô tả phiên bản trước. README này mô tả bản xuất hiện tại.

## Nguồn và ghi công

- Thiết kế tham khảo Nucleus UI LITE: [Design_Source.md](Design_Source.md).
- Ảnh: [Photo_Credits.md](dist/assets/Photo_Credits.md).
- Font Inter: giữ nguyên thông báo [SIL Open Font License](dist/assets/fonts/Inter-OFL.txt).
- Thông tin tác giả và giấy phép MIT của mô hình: xem model card và kho chuyển đổi ONNX được liên kết ở trên. Trọng số được tải từ nguồn của tác giả.

Đây là bản sao mã nguồn từ website phiên bản 19, source commit `8cc545738a4f8ffa634cc081454aacf4d8293250`, xuất ngày 02/11/2026. Cấu hình lưu trữ riêng của Sites và lịch sử Git nội bộ không được đưa vào bản xuất.
