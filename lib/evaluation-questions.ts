// Server only: never bundle answer keys into the participant interface.
export const preQuestions = [
    {
      prompt: "Đề bài có chấm điểm nhưng chưa nói rõ cách dùng AI. Bạn nên làm gì trước?",
      options: [
        "Dùng AI cho phần nào thấy hữu ích rồi tự chịu trách nhiệm.",
        "Đọc hướng dẫn của môn học và hỏi giảng viên nếu vẫn chưa rõ.",
        "Dùng AI miễn là không chép nguyên văn câu trả lời."
      ],
      correct: 1
    },
    {
      prompt: "AI nêu một con số cụ thể nhưng không có nguồn. Cách kiểm tra nào hữu ích nhất?",
      options: [
        "Hỏi thêm một chatbot để xem câu trả lời có giống nhau không.",
        "Dùng con số nếu nó phù hợp với lập luận của bạn.",
        "Tìm nguồn gốc đáng tin cậy, rồi kiểm tra phạm vi, thời điểm và cách đo."
      ],
      correct: 2
    },
    {
      prompt: "Môn học cho phép AI hỗ trợ và yêu cầu khai báo. Bạn đã dùng AI góp ý bản nháp. Bạn nên…",
      options: [
        "Ghi trung thực công cụ và phần AI đã hỗ trợ theo hướng dẫn môn học.",
        "Không khai báo vì bản nháp ban đầu do mình viết.",
        "Chỉ khai báo nếu giảng viên phát hiện có dùng AI."
      ],
      correct: 0
    },
    {
      prompt: "Bạn muốn dùng AI để hiểu một khái niệm trong bài tập. Cách tiếp cận nào phù hợp hơn?",
      options: [
        "Nhờ AI tạo câu trả lời hoàn chỉnh để nộp cho nhanh.",
        "Dùng công cụ bất kể hướng dẫn của bài tập nói gì.",
        "Kiểm tra quy định trước; nếu được phép, xin lời giải thích rồi tự làm và kiểm tra mức hiểu của mình."
      ],
      correct: 2
    },
    {
      prompt: "Bản phỏng vấn có tên và email của người tham gia. Trước khi dùng dịch vụ AI, bạn nên…",
      options: [
        "Tải bản ghi lên nếu chỉ yêu cầu tóm tắt.",
        "Không chia sẻ dữ liệu nhận diện; làm theo quy trình được phê duyệt và xác nhận dữ liệu được phép sử dụng.",
        "Xóa tên nhưng giữ mọi chi tiết cá nhân vì như vậy chắc chắn đã ẩn danh."
      ],
      correct: 1
    }
  ];

export const postQuestions = [
    {
      prompt: "Hướng dẫn chung của trường cho phép một số công cụ, nhưng bài kiểm tra ghi rõ “không dùng AI”. Bạn nên…",
      options: [
        "Làm theo hướng dẫn chung của trường vì hướng dẫn đó rộng hơn.",
        "Dùng AI cho câu hỏi khó nếu không chép câu trả lời.",
        "Tôn trọng giới hạn cụ thể của bài kiểm tra; hỏi giảng viên nếu hướng dẫn có vẻ mâu thuẫn."
      ],
      correct: 2,
      explanation: "Giới hạn nêu cho bài đánh giá cụ thể cần được tôn trọng. Hãy hỏi giảng viên trước nếu có điểm chưa rõ hoặc mâu thuẫn."
    },
    {
      prompt: "Bạn cần xác minh một kết quả nghiên cứu mà AI đã tóm tắt. Bước nào cho bằng chứng tốt nhất?",
      options: [
        "Mở nghiên cứu gốc qua DOI, nhà xuất bản hoặc cơ sở dữ liệu và đọc phương pháp cùng kết quả liên quan.",
        "Dùng phần tóm tắt của AI nếu có tên tạp chí và năm.",
        "Hỏi một chatbot khác xem kết quả đó có đúng không."
      ],
      correct: 0,
      explanation: "Nguồn gốc cho phép bạn kiểm tra chính nghiên cứu, mẫu, phương pháp và giới hạn thay vì dựa vào phần diễn giải của AI."
    },
    {
      prompt: "Môn học yêu cầu khai báo việc dùng AI. Bạn nên ghi gì?",
      options: [
        "Không cần ghi nếu bạn đã sửa lại nội dung do AI gợi ý.",
        "Mô tả trung thực công cụ và phần việc đã được hỗ trợ theo định dạng môn học yêu cầu.",
        "Ghi rằng AI chỉ sửa chính tả, kể cả khi công cụ đã làm nhiều hơn."
      ],
      correct: 1,
      explanation: "Khai báo cần trung thực và theo hướng dẫn của môn học, bao gồm loại hỗ trợ AI đã cung cấp."
    },
    {
      prompt: "Cách nào giúp bạn học chủ động khi AI hỗ trợ ôn tập, nếu cách dùng đó được môn học cho phép?",
      options: [
        "Đọc câu trả lời do AI tạo thay cho việc thử giải bài.",
        "Ghi nhớ đáp án ngắn mà không cần xem cách suy luận.",
        "Yêu cầu giải thích và câu hỏi gợi mở, tự trả lời trước rồi kiểm tra lý do của mình."
      ],
      correct: 2,
      explanation: "Tự thử trước, giải thích lại và kiểm tra lý do giúp bạn luyện năng lực của mình thay vì chỉ nhận đáp án."
    },
    {
      prompt: "Bạn muốn nhờ AI phân loại phản hồi có thông tin nhận diện người tham gia. Hành động phù hợp là gì?",
      options: [
        "Chỉ dùng dữ liệu đã được phép, giảm khả năng nhận diện và làm theo quy trình cùng công cụ được phê duyệt.",
        "Tải dữ liệu lên nếu không yêu cầu AI nêu tên người tham gia.",
        "Xóa tên rồi mặc định mọi chi tiết còn lại đều an toàn để chia sẻ."
      ],
      correct: 0,
      explanation: "Tên đã xóa chưa chắc ngăn được việc nhận diện lại. Hãy theo quy trình, sự đồng thuận và công cụ được phê duyệt cho dữ liệu đó."
    }
  ];

