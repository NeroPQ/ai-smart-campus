# AI Smart Campus

**Use AI. Don’t let AI use you.** Bộ công cụ hỗ trợ sinh viên sử dụng AI có trách nhiệm, kèm luồng đánh giá trước và sau khi học.

[Mở website](https://ai-smart-campus-use-ai-wisely-2026.phanthienquang11234.chatgpt.site/)

## Mã nguồn hiện tại

- `public/`: giao diện chính và các công cụ, gồm khai báo AI, nhật ký, tủ prompt, soi bài và Checker.
- `app/evaluate/` và `app/api/evaluation/`: đánh giá, cấp mã tham gia, chấm điểm và lưu kết quả.
- `db/` và `drizzle/`: cấu trúc và các bản cập nhật cơ sở dữ liệu D1.
- `integrations/google-sheets/`: đồng bộ kết quả vào Google Sheet bằng Apps Script. Xem hướng dẫn trong thư mục này.
- `tests/`: các kiểm thử công cụ và luồng đánh giá.

Thư mục `dist/` và tệp `ai_smart_campus_v2.html` ở gốc được giữ từ phiên bản cũ của repo, không phải mã nguồn chính của phiên bản hiện tại. Phần giao diện mới nằm trong `public/`; luồng đánh giá cần chạy ứng dụng có backend và cơ sở dữ liệu.

## Phát triển

Yêu cầu Node.js tương thích với các phụ thuộc trong `package.json`.

```sh
npm ci
npm run dev
npm test
npm run build
```

Đồng bộ và đánh giá cần cấu hình D1 và quyền truy cập phù hợp; xem `EVALUATION_SETUP.md` và `integrations/google-sheets/README.md`. Không đưa biến môi trường, khóa truy cập, cơ sở dữ liệu hay kết quả người tham gia vào Git.

Dữ liệu QA hoặc giả lập phải được đánh dấu và tách khỏi kết quả sinh viên thật.
