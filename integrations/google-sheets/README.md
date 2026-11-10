# Đồng bộ kết quả AI Smart Campus vào Google Sheet

Apps Script chạy dưới tài khoản đã cài trigger, lấy Google ID token ngắn hạn bằng `ScriptApp.getIdentityToken()` rồi gửi token trong header `Authorization: Bearer …` tới endpoint đồng bộ của website. Website xác minh chữ ký Google, audience cố định `189645506328-tf5uhef31v3mfnbl9kake65aih9ro7gu.apps.googleusercontent.com`, email đã xác minh và email chủ `phanthienquang11234@gmail.com` (phải khớp với runtime `ADMIN_EMAIL` trên website). Token không được đặt trong payload, ghi log hoặc chia sẻ.

Apps Script upsert theo Participant ID vào hai tab `Sinh viên` và `QA - Dữ liệu thử`. Website giữ D1 làm bản lưu chính; Sheet được cập nhật mỗi 5 phút. Mỗi lượt đọc tối đa 5.000 mã và chạy lại không tạo hàng trùng. Chỉ điểm, mức hữu ích, góp ý và thời điểm được đồng bộ; token truy cập, câu trả lời từng câu và hash không được xuất.

## Thiết lập một lần

1. Mở [bảng kết quả](https://docs.google.com/spreadsheets/d/1G8mhVJ7lpEel4TRU0Uz0YHPIC1hi5rKVM4jOFgVq8qc/edit) bằng tài khoản chủ bảng. Vào **Tiện ích mở rộng → Apps Script**, rồi dán nội dung `Code.gs` vào dự án gắn với bảng.
2. Trong Apps Script mở **Project Settings**, bật **Show `appsscript.json` manifest file in editor**. Mở `appsscript.json` và bảo đảm `oauthScopes` có các scope sau; nếu manifest đã có scope khác mà dự án cần, giữ lại chúng:

   ```json
   "oauthScopes": [
     "openid",
     "https://www.googleapis.com/auth/userinfo.email",
     "https://www.googleapis.com/auth/spreadsheets.currentonly",
     "https://www.googleapis.com/auth/script.external_request",
     "https://www.googleapis.com/auth/script.scriptapp"
   ]
   ```

   Lưu manifest. `openid` và `userinfo.email` cho phép tạo ID token có danh tính; các scope còn lại dùng để ghi bảng, gọi endpoint và cài trigger.
3. Không cần tạo khóa bí mật hay nhập `SHEETS_SYNC_TOKEN`. Endpoint mặc định trong `Code.gs` là `https://ai-smart-campus-use-ai-wisely-2026.phanthienquang11234.chatgpt.site/api/evaluation/sheets-sync`. Có thể để trống Script Properties; nếu đặt `SHEETS_SYNC_URL`, giá trị phải đúng endpoint này. Mã Apps Script từ chối gửi ID token tới host khác.
4. Trên website, cấu hình runtime `ADMIN_EMAIL` là `phanthienquang11234@gmail.com`, cùng tài khoản Google đã xác minh trong ID token. Nếu chưa đúng, endpoint sẽ từ chối đồng bộ bằng HTTP 401.
5. Chọn `setupSync` rồi bấm **Run**. Xem màn hình cấp quyền của Google, kiểm tra scope và cấp quyền cho dự án này. Nếu Google báo ứng dụng chưa được xác minh, đó là cảnh báo OAuth cho Apps Script riêng của nhóm; chỉ tiếp tục nếu màn hình dự án và các quyền đúng như cấu hình trên. Hàm kiểm tra hai tab cùng tiêu đề, sau đó tạo trigger tự chạy mỗi 5 phút. Không triển khai Apps Script thành web app và không bật chia sẻ công khai.
6. Chọn `syncAll` rồi bấm **Run** để đồng bộ ngay. Mở tab `QA - Dữ liệu thử`, xác nhận dữ liệu QA nằm riêng; không đưa các hàng synthetic vào kết quả sinh viên thật.

Nếu Script Properties còn `SHEETS_SYNC_TOKEN` từ lần cấu hình cũ, mã mới không đọc thuộc tính đó; để nguyên trong lúc chuyển đổi. Không cần tạo, sao chép, gửi hoặc ghi khóa này ở đâu.

## Giới hạn và vận hành

- Dữ liệu mới lên Sheet chậm tối đa khoảng 5 phút. D1 vẫn là bản chính khi trigger tắt hoặc đồng bộ gặp lỗi.
- Mỗi lần chạy đọc toàn bộ danh sách hiện có, tối đa 5.000 bản ghi. Lỗi một trang sẽ dừng lượt đó; lần chạy tiếp theo đọc lại và upsert an toàn. Nếu nhóm dự kiến vượt 5.000 người, tăng `MAX_PAGES_PER_RUN` sau khi kiểm tra giới hạn thời gian Apps Script.
- Không xóa hoặc sắp xếp lại các hàng đang được đồng bộ. Dùng Filter view để lọc hoặc sắp xếp. Nếu một tab có ID trùng, tiêu đề khác dự kiến hoặc bị xóa, đồng bộ sẽ dừng.
- Chỉ chia sẻ bảng và dự án Apps Script cho thành viên nhóm cần xem kết quả. Trigger chạy dưới quyền tài khoản đã cài đặt; người có quyền chỉnh sửa script có thể thay đổi nơi dữ liệu được gửi.
- ID token là credential ngắn hạn. Không ghi token vào log, ô trong Sheet, mã nguồn hoặc tin nhắn. Apps Script chỉ gửi nó tới endpoint production đã được cố định trong mã.

## Kiểm chứng

Mã `QA001` và `QA002` phải được tạo bằng chế độ QA của website. Chạy `syncAll`, rồi xác nhận chúng nằm riêng tab QA với đúng pre/post, chênh lệch và rating. Không dùng dữ liệu synthetic trong kết quả sinh viên thật.
