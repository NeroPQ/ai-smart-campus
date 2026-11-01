(() => {
  "use strict";

  const scenarios = [
    {
      category: "BÀI TẬP & Ý TƯỞNG",
      title: "Bạn đang bắt đầu một bài tiểu luận.",
      prompt: "Đề bài yêu cầu lập luận của riêng bạn. Bạn chưa rõ môn học cho phép dùng AI đến mức nào.",
      choices: [
        { text: "Đọc hướng dẫn trước; nếu được phép, dùng AI để gợi ý câu hỏi rồi tự xây dựng luận điểm và viết bài.", kind: "appropriate", explanation: "Bạn kiểm tra quy định trước và giữ phần lập luận, diễn đạt thuộc về mình. Hãy ghi nhận việc AI hỗ trợ theo yêu cầu của môn học.", next: "Mở đề cương hoặc hỏi giảng viên xem AI được dùng ở giai đoạn nào và cần khai báo ra sao." },
        { text: "Nhờ AI tạo dàn ý, dùng các ý đó nhưng không nói gì dù môn học yêu cầu khai báo AI.", kind: "risky", explanation: "Dàn ý có thể giúp khởi động, nhưng bỏ qua yêu cầu khai báo làm mất tính minh bạch và có thể vi phạm quy định môn học.", next: "Xem lại hướng dẫn, ghi rõ phần AI hỗ trợ và tự kiểm tra mọi luận điểm trước khi đưa vào bài." },
        { text: "Yêu cầu AI viết toàn bộ bài rồi nộp dưới tên mình.", kind: "not-recommended", explanation: "Cách này thay thế công việc học tập và trình bày sai tác giả của bài làm; nó cũng có thể vi phạm chính sách đánh giá.", next: "Hãy dùng AI để đặt câu hỏi gợi mở hoặc nhận góp ý trên bản nháp do bạn tự viết — nếu chính sách cho phép." }
      ]
    },
    {
      category: "NGUỒN & TRÍCH DẪN",
      title: "AI đưa cho bạn ba trích dẫn học thuật.",
      prompt: "Bạn định dùng chúng trong bài nghiên cứu, nhưng chưa tìm thấy các bài báo này trên thư viện số.",
      choices: [
        { text: "Tìm tiêu đề hoặc DOI trên trang nhà xuất bản/cơ sở dữ liệu, đọc nguồn gốc và chỉ trích dẫn khi xác minh được.", kind: "appropriate", explanation: "Bạn truy về nguồn gốc và kiểm tra trích dẫn trước khi sử dụng. AI có thể tạo thông tin thư mục trông thật nhưng không tồn tại.", next: "Đối chiếu tác giả, năm, tên tạp chí và nội dung bài với trích dẫn định dạng cuối cùng." },
        { text: "Tin các trích dẫn vì chúng có tên tác giả, năm và tên tạp chí rõ ràng.", kind: "risky", explanation: "Thông tin trông cụ thể vẫn có thể sai hoặc bị ghép từ nhiều nguồn. Trích dẫn chưa xác minh có thể làm giảm độ tin cậy của bài.", next: "Tìm từng bài qua thư viện trường, trang nhà xuất bản hoặc DOI trước khi đưa vào danh mục." },
        { text: "Giữ lại trích dẫn dù tìm không ra, vì nghĩ giảng viên sẽ không kiểm tra.", kind: "not-recommended", explanation: "Dùng nguồn không xác thực có thể khiến người đọc hiểu sai bằng chứng và làm sai lệch bài nghiên cứu.", next: "Loại bỏ nguồn chưa xác minh; tìm tài liệu thật qua thư viện hoặc hỏi thủ thư/giảng viên." }
      ]
    },
    {
      category: "LẬP TRÌNH & BÀI THỰC HÀNH",
      title: "Bạn bị mắc ở một lỗi trong bài lập trình.",
      prompt: "Đây là bài được chấm điểm. Bạn chưa kiểm tra hướng dẫn môn học về AI.",
      choices: [
        { text: "Kiểm tra chính sách; nếu được phép, yêu cầu AI giải thích lỗi và gợi ý cách tự kiểm thử, rồi tự viết và hiểu mã.", kind: "appropriate", explanation: "Bạn xác nhận phạm vi được phép trước và dùng trợ giúp để hiểu vấn đề. Việc tự kiểm thử giúp bạn chịu trách nhiệm với mã cuối cùng.", next: "Lưu lại phần hỗ trợ nếu môn học yêu cầu; chạy thử với ca kiểm tra phù hợp và giải thích được cách sửa." },
        { text: "Dán mã do AI tạo vào bài, chạy thử vài ca nhưng không chắc vì sao nó hoạt động.", kind: "risky", explanation: "Chạy được vài ca không bảo đảm mã đúng, an toàn hoặc do bạn hiểu. Bạn cũng chưa xác nhận công cụ có được dùng cho bài chấm điểm này không.", next: "Đọc chính sách, chia nhỏ lỗi và yêu cầu giải thích khái niệm thay vì nhận một lời giải hoàn chỉnh." },
        { text: "Dùng AI tạo lời giải đầy đủ cho bài kiểm tra mà đề bài cấm trợ giúp, rồi nộp như mã tự viết.", kind: "not-recommended", explanation: "Cách này đi ngược hướng dẫn đánh giá và che giấu mức độ hỗ trợ đã dùng.", next: "Không dùng AI cho phần bị cấm. Hỏi trợ giảng hoặc dùng tài liệu được phép để hiểu lỗi." }
      ]
    },
    {
      category: "DỮ LIỆU & QUYỀN RIÊNG TƯ",
      title: "Bạn cần tóm tắt phản hồi phỏng vấn cho một dự án.",
      prompt: "Bản ghi có tên, email và chia sẻ cá nhân của người tham gia. Bạn đang dùng một chatbot công cộng.",
      choices: [
        { text: "Không đưa dữ liệu nhận diện lên dịch vụ công cộng; chỉ dùng dữ liệu đã được phép, khử nhận diện và theo quy trình dự án.", kind: "appropriate", explanation: "Bạn giảm nguy cơ lộ dữ liệu và tôn trọng phạm vi đồng thuận. Khử tên đơn thuần có thể chưa đủ nếu nội dung vẫn nhận ra người tham gia.", next: "Kiểm tra quy trình đạo đức/đồng thuận, chính sách lưu trữ và công cụ mà trường cho phép." },
        { text: "Xóa tên nhưng giữ nguyên chi tiết câu chuyện, vì nghĩ như vậy đã ẩn danh hoàn toàn.", kind: "risky", explanation: "Tổ hợp chi tiết cụ thể vẫn có thể nhận diện một người. Dịch vụ công cộng cũng có thể có cách lưu trữ khác với mong đợi của bạn.", next: "Đánh giá khả năng tái nhận diện, xin hướng dẫn của người phụ trách và dùng môi trường được phê duyệt." },
        { text: "Dán nguyên bản ghi có tên và email vào chatbot để tiết kiệm thời gian.", kind: "not-recommended", explanation: "Bạn đang chia sẻ thông tin cá nhân nhạy cảm mà chưa biết nơi nhận, cách xử lý hay sự đồng thuận có cho phép hay không.", next: "Không tải bản ghi lên. Trao đổi với người phụ trách dự án về công cụ và cách xử lý dữ liệu được phép." }
      ]
    },
    {
      category: "BÀI ĐÁNH GIÁ CÓ GIỚI HẠN",
      title: "Bạn đang làm bài kiểm tra tại lớp không được dùng AI.",
      prompt: "Bạn quên một công thức và có thể mở công cụ AI trên điện thoại.",
      choices: [
        { text: "Làm bài theo tài liệu được phép; sau kỳ kiểm tra, có thể dùng công cụ học tập nếu quy định cho phép để ôn lại chủ đề.", kind: "appropriate", explanation: "Bạn tôn trọng điều kiện của bài đánh giá và tách việc ôn tập sau đó khỏi bài kiểm tra đang diễn ra.", next: "Sau giờ kiểm tra, hỏi giảng viên về cách ôn phần công thức và công cụ học tập được phép." },
        { text: "Mở AI chỉ để hỏi công thức, vì câu trả lời rất ngắn.", kind: "not-recommended", explanation: "Đề bài đã cấm AI; giới hạn câu hỏi không làm thay đổi điều kiện đánh giá.", next: "Đóng công cụ và tiếp tục bằng tài liệu được phép. Hỏi giảng viên sau bài kiểm tra nếu cần." },
        { text: "Sau khi nộp, đưa câu hỏi trong đề lên chatbot công cộng mà chưa kiểm tra quy định về việc chia sẻ nội dung bài thi.", kind: "risky", explanation: "Ôn tập sau khi nộp có thể hữu ích, nhưng đề bài có thể bị giới hạn chia sẻ hoặc chứa nội dung cần bảo vệ. Bạn chưa kiểm tra chính sách hay điều khoản của công cụ.", next: "Dùng ghi chú của bạn để ôn hoặc hỏi giảng viên cách trao đổi về câu hỏi đề thi sau khi kiểm tra." }
      ]
    },
    {
      category: "DỊCH THUẬT & BIÊN TẬP",
      title: "Bạn muốn dùng AI để dịch bản nháp của mình.",
      prompt: "Môn học đánh giá khả năng viết bằng ngoại ngữ và chưa nêu rõ việc sử dụng công cụ dịch.",
      choices: [
        { text: "Hỏi giảng viên hoặc kiểm tra hướng dẫn trước; nếu được phép, dùng công cụ để góp ý rồi tự xem lại ý nghĩa và khai báo khi cần.", kind: "appropriate", explanation: "Bạn xác nhận công cụ có phù hợp với mục tiêu đánh giá ngôn ngữ không và vẫn chịu trách nhiệm với bản cuối.", next: "Làm rõ giới hạn: từ điển, sửa lỗi, dịch câu hay dịch toàn văn; lưu lại thông tin khai báo theo hướng dẫn." },
        { text: "Dịch toàn bộ bài, nộp bản đó và không nhắc tới công cụ dù hướng dẫn yêu cầu khai báo.", kind: "risky", explanation: "Dịch toàn văn có thể thay thế kỹ năng môn học đang đánh giá. Không khai báo cũng trái yêu cầu minh bạch nếu môn học có quy định.", next: "Kiểm tra chính sách và hỏi rõ phạm vi hỗ trợ được phép trước khi nộp." },
        { text: "Dùng dịch vụ công cộng để dịch nội dung phỏng vấn có thông tin nhận diện người tham gia.", kind: "not-recommended", explanation: "Nội dung nhận diện có thể bị chia sẻ ngoài phạm vi đồng thuận, đồng thời việc dịch có thể vi phạm quy trình dữ liệu.", next: "Không tải nội dung lên. Dùng phương thức đã được người phụ trách và người tham gia chấp thuận." }
      ]
    },
    {
      category: "THÔNG TIN & BẰNG CHỨNG",
      title: "AI đưa ra một con số cho bài thuyết trình.",
      prompt: "Con số có vẻ phù hợp với luận điểm của nhóm, nhưng câu trả lời không dẫn nguồn cụ thể.",
      choices: [
        { text: "Truy tìm nguồn chính thức hoặc nghiên cứu gốc, kiểm tra năm, phạm vi và phương pháp trước khi dùng.", kind: "appropriate", explanation: "Bạn xác minh con số trong ngữ cảnh ban đầu. Một số liệu có thật vẫn có thể bị dùng sai nếu khác nhóm, thời gian hoặc cách đo.", next: "Lưu nguồn và ghi rõ giới hạn dữ liệu; nếu không tìm được bằng chứng, bỏ số liệu hoặc nói rõ chưa xác minh." },
        { text: "Dùng con số vì nghe hợp lý, rồi để AI viết câu giải thích thuyết phục hơn.", kind: "risky", explanation: "Văn phong thuyết phục không thay thế bằng chứng. Cách này có thể khiến nhóm trình bày thông tin sai như sự thật.", next: "Tìm nguồn độc lập trước khi giữ số liệu; đánh dấu mọi phần chưa kiểm chứng." },
        { text: "Tạo một đường dẫn trông như trang báo cáo chính thức để hỗ trợ con số.", kind: "not-recommended", explanation: "Tạo nguồn giả làm sai lệch bằng chứng và khiến người nghe không thể kiểm tra thông tin.", next: "Xóa đường dẫn giả. Chỉ dùng nguồn bạn đã mở và xác minh được, hoặc bỏ khẳng định." }
      ]
    },
    {
      category: "VIẾT & TÍNH NGUYÊN GỐC",
      title: "Bạn nhận được một đoạn giải thích rất hay từ AI.",
      prompt: "Bạn muốn dùng ý đó trong báo cáo nhưng chưa đọc tài liệu gốc và chưa biết môn học yêu cầu khai báo thế nào.",
      choices: [
        { text: "Kiểm tra chính sách, xác minh nội dung bằng nguồn gốc, rồi tự viết bằng hiểu biết của mình và khai báo phần hỗ trợ theo yêu cầu.", kind: "appropriate", explanation: "Bạn kiểm soát độ chính xác, giữ tiếng nói của mình và tuân thủ yêu cầu về công cụ hỗ trợ.", next: "Mở nguồn tham khảo, đối chiếu ý chính và lưu lại cách bạn dùng AI để khai báo nếu cần." },
        { text: "Đổi vài từ trong đoạn AI để phần mềm không nhận ra rồi nộp như bài tự viết.", kind: "not-recommended", explanation: "Đổi từ để che giấu nguồn gốc không chứng minh rằng bạn hiểu nội dung và có thể là hành vi né tránh quy định học thuật.", next: "Không dùng cách lách phát hiện. Học lại ý chính, viết bằng lời của mình và khai báo theo hướng dẫn." },
        { text: "Chép một phần vào bài vì AI viết tốt, nhưng chưa kiểm tra nguồn hay quy định.", kind: "risky", explanation: "Đoạn văn có thể chứa lỗi, thiếu nguồn hoặc không phù hợp với chính sách môn học. Bạn chưa thể chịu trách nhiệm cho nội dung chưa kiểm tra.", next: "Kiểm tra tính được phép, đối chiếu nguồn và chỉ giữ ý bạn hiểu rõ, trích dẫn hoặc khai báo đúng cách." }
      ]
    },
    {
      category: "LÀM VIỆC NHÓM",
      title: "Nhóm của bạn đang chuẩn bị một báo cáo chung.",
      prompt: "Một thành viên muốn dùng AI để tóm tắt tài liệu và viết phần kết luận, nhưng cả nhóm chưa thống nhất quy tắc.",
      choices: [
        { text: "Cùng đọc chính sách môn học, thống nhất phần AI được hỗ trợ, xác minh nguồn và ghi lại cách dùng trước khi bắt đầu.", kind: "appropriate", explanation: "Thống nhất sớm giúp nhóm không vô tình vi phạm chính sách và tránh việc khai báo không nhất quán.", next: "Ghi quy ước nhóm: công cụ, mục đích, dữ liệu được nhập, cách kiểm chứng và ai chịu trách nhiệm từng phần." },
        { text: "Để một người tự dùng AI, miễn là các thành viên khác không biết chi tiết.", kind: "risky", explanation: "Cả nhóm vẫn chịu trách nhiệm với sản phẩm chung. Dùng công cụ không thống nhất có thể tạo lỗi, lộ dữ liệu hoặc thiếu khai báo.", next: "Trao đổi cách dùng trước; kiểm tra chính sách và bảo đảm cả nhóm hiểu, xác minh nội dung cuối." },
        { text: "Nhờ AI viết toàn bộ báo cáo và để nhóm trình bày như công trình tự làm.", kind: "not-recommended", explanation: "Cách này thay thế đóng góp học tập của nhóm và che giấu việc tạo nội dung, đồng thời không bảo đảm thông tin đúng.", next: "Chia việc cho thành viên; chỉ dùng hỗ trợ AI khi chính sách cho phép, rồi kiểm chứng và khai báo." }
      ]
    },
    {
      category: "HỌC TẬP & TỰ CHỦ",
      title: "Bạn đang tự học một khái niệm khó trước kỳ thi.",
      prompt: "Bạn có thể nhờ AI giải thích, nhưng muốn chắc rằng mình thật sự hiểu chứ không chỉ đọc lời giải.",
      choices: [
        { text: "Yêu cầu giải thích từng bước và một câu hỏi luyện tập; tự trả lời trước khi xem gợi ý và đối chiếu tài liệu môn học.", kind: "appropriate", explanation: "Bạn dùng AI để luyện chủ động, tự tạo bằng chứng cho việc hiểu và kiểm tra lại với tài liệu của môn.", next: "Đóng câu trả lời, giải thích lại bằng lời mình và thử một bài mới không có trợ giúp." },
        { text: "Đọc lời giải AI nhiều lần và nghĩ rằng quen mắt nghĩa là đã nắm bài.", kind: "risky", explanation: "Cảm giác quen thuộc không đảm bảo bạn có thể tự áp dụng. AI cũng có thể giải sai hoặc bỏ qua điều kiện của môn học.", next: "Tự giải một câu mới, kiểm tra đáp án trong tài liệu chính thức và ghi rõ phần chưa hiểu." },
        { text: "Dùng AI trả lời mọi câu hỏi luyện tập rồi học thuộc đáp án, không cần tự làm.", kind: "not-recommended", explanation: "Cách học này dễ tạo phụ thuộc và không cho bạn biết mình có thể vận dụng kiến thức độc lập hay không.", next: "Thử tự làm trước, dùng gợi ý từng bước khi cần, rồi giải lại mà không xem đáp án." }
      ]
    }
  ];

  const kindLabels = { appropriate: "Appropriate", risky: "Risky", "not-recommended": "Not Recommended" };
  const kindDescriptions = { appropriate: "Có trách nhiệm · chưa xác nhận được phép", risky: "Có rủi ro · kiểm tra yêu cầu môn học", "not-recommended": "Không nên thực hiện · nguy cơ vi phạm hoặc gây hại" };
  const scenarioStep = document.getElementById("scenario-step");
  const scenarioCategory = document.getElementById("scenario-category");
  const scenarioTitle = document.getElementById("scenario-title");
  const scenarioPrompt = document.getElementById("scenario-prompt");
  const answerOptions = document.getElementById("answer-options");
  const scenarioResult = document.getElementById("scenario-result");
  const scenarioPrev = document.getElementById("scenario-prev");
  const scenarioNext = document.getElementById("scenario-next");
  const scenarioFeedback = document.getElementById("scenario-feedback");
  const progressFill = document.getElementById("scenario-progress-fill");
  const scenarioPercent = document.getElementById("scenario-percent");
  let scenarioIndex = 0;
  const scenarioAnswers = Array(scenarios.length).fill(null);

  function renderScenario() {
    const scenario = scenarios[scenarioIndex];
    const answer = scenarioAnswers[scenarioIndex];
    scenarioStep.textContent = `Tình huống ${String(scenarioIndex + 1).padStart(2, "0")} / ${scenarios.length}`;
    scenarioCategory.textContent = scenario.category;
    scenarioTitle.textContent = scenario.title;
    scenarioPrompt.textContent = scenario.prompt;
    const progress = Math.round(((scenarioIndex + 1) / scenarios.length) * 100);
    progressFill.style.width = `${progress}%`;
    scenarioPercent.textContent = `${progress}%`;
    answerOptions.replaceChildren();
    scenario.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "answer-option";
      button.setAttribute("aria-pressed", answer === index ? "true" : "false");
      const letter = document.createElement("span");
      letter.className = "option-letter";
      letter.setAttribute("aria-hidden", "true");
      letter.textContent = String.fromCharCode(65 + index);
      const text = document.createElement("span");
      text.className = "answer-text";
      text.textContent = choice.text;
      button.append(letter, text);
      button.addEventListener("click", () => {
        scenarioAnswers[scenarioIndex] = index;
        renderScenario();
        answerOptions.querySelectorAll("button")[index].focus();
      });
      answerOptions.append(button);
    });
    scenarioPrev.disabled = scenarioIndex === 0;
    scenarioNext.disabled = answer === null;
    scenarioNext.innerHTML = scenarioIndex === scenarios.length - 1 ? "Xem tổng kết <span aria-hidden=\"true\">→</span>" : "Tiếp theo <span aria-hidden=\"true\">→</span>";
    scenarioFeedback.textContent = answer === null ? "Chọn một phương án để tiếp tục." : "Bạn có thể đổi lựa chọn trước khi sang tình huống tiếp theo.";
    if (answer === null) {
      scenarioResult.hidden = true;
      scenarioResult.replaceChildren();
    } else {
      renderScenarioResult(scenario.choices[answer]);
    }
  }

  function renderScenarioResult(choice) {
    scenarioResult.hidden = false;
    scenarioResult.dataset.kind = choice.kind;
    scenarioResult.replaceChildren();
    const heading = document.createElement("div");
    heading.className = "result-heading";
    const badge = document.createElement("span");
    badge.className = "result-badge";
    badge.textContent = kindLabels[choice.kind];
    const desc = document.createElement("span");
    desc.className = "result-explanation";
    desc.textContent = kindDescriptions[choice.kind];
    heading.append(badge, desc);
    const explanation = document.createElement("p");
    explanation.className = "result-explanation";
    const sentences = choice.explanation.split(/(?<=[.!?])\s+/);
    explanation.textContent = sentences[0];
    const next = document.createElement("p");
    next.className = "result-next";
    const label = document.createElement("b");
    label.textContent = "Bước tiếp theo: ";
    next.append(label, document.createTextNode(choice.next));
    scenarioResult.append(heading, explanation, next);
    if (sentences.length > 1) {
      const detail = document.createElement("details");
      detail.className = "result-detail";
      const summary = document.createElement("summary");
      summary.textContent = "Giải thích thêm";
      const more = document.createElement("p");
      more.textContent = sentences.slice(1).join(" ");
      detail.append(summary, more);
      scenarioResult.append(detail);
    }
  }

  scenarioPrev.addEventListener("click", () => {
    if (scenarioIndex > 0) {
      scenarioIndex -= 1;
      renderScenario();
      scenarioTitle.setAttribute("tabindex", "-1");
      scenarioTitle.focus();
    }
  });
  scenarioNext.addEventListener("click", () => {
    if (scenarioAnswers[scenarioIndex] === null) return;
    if (scenarioIndex < scenarios.length - 1) {
      scenarioIndex += 1;
      renderScenario();
      scenarioTitle.setAttribute("tabindex", "-1");
      scenarioTitle.focus();
    } else {
      showScenarioSummary();
    }
  });

  function showScenarioSummary() {
    const card = document.querySelector(".scenario-card");
    let summary = document.getElementById("checker-summary");
    if (!summary) {
      summary = document.createElement("section");
      summary.id = "checker-summary";
      summary.className = "scenario-card checker-summary";
      summary.setAttribute("aria-labelledby", "summary-title");
      card.after(summary);
    }
    const counts = { appropriate: 0, risky: 0, "not-recommended": 0 };
    scenarioAnswers.forEach((answer, index) => { if (answer !== null) counts[scenarios[index].choices[answer].kind] += 1; });
    summary.replaceChildren();
    const label = document.createElement("span");
    label.className = "scenario-category";
    label.textContent = "BẠN ĐÃ HOÀN THÀNH 10 TÌNH HUỐNG";
    const title = document.createElement("h2");
    title.id = "summary-title";
    title.tabIndex = -1;
    title.textContent = "Mỗi tình huống là một cơ hội để kiểm tra cách dùng AI.";
    const intro = document.createElement("p");
    intro.className = "scenario-prompt";
    intro.textContent = "Phân loại dưới đây phản ánh các lựa chọn bạn đã thử trong công cụ này. Đây không phải điểm đánh giá năng lực hay xác nhận chính sách môn học.";
    const countsRow = document.createElement("div");
    countsRow.className = "summary-counts";
    ["appropriate", "risky", "not-recommended"].forEach((kind) => {
      const box = document.createElement("div");
      box.className = `summary-count summary-${kind}`;
      const number = document.createElement("b");
      number.textContent = String(counts[kind]);
      const caption = document.createElement("span");
      caption.textContent = kindLabels[kind];
      box.append(number, caption);
      countsRow.append(box);
    });
    const reflection = document.createElement("aside");
    const persona = window.AISmartCampusPersona?.getCard(counts.appropriate);
    reflection.className = `checker-reflection persona-${persona?.kind || "architect"}`;
    const reflectionLabel = document.createElement("span");
    reflectionLabel.className = "scenario-category";
    reflectionLabel.textContent = "AI PERSONA · THẺ VUI SAU LƯỢT THỰC HÀNH";
    const reflectionIcon = document.createElement("span");
    reflectionIcon.className = "persona-icon";
    reflectionIcon.setAttribute("aria-hidden", "true");
    reflectionIcon.textContent = persona?.icon || "✦";
    const reflectionTitle = document.createElement("h3");
    reflectionTitle.textContent = persona?.title || "Nhìn lại cách dùng AI";
    const reflectionEnglish = document.createElement("span");
    reflectionEnglish.className = "persona-english";
    reflectionEnglish.textContent = persona?.english || "";
    const reflectionSlogan = document.createElement("p");
    reflectionSlogan.className = "persona-slogan";
    reflectionSlogan.textContent = persona?.slogan || "";
    const reflectionText = document.createElement("p");
    reflectionText.textContent = persona?.description || "Xem lại phần giải thích của từng tình huống.";
    const reflectionScore = document.createElement("span");
    reflectionScore.className = "persona-score";
    reflectionScore.textContent = `${counts.appropriate}/10 lựa chọn Appropriate trong lượt này`;
    const reflectionCaveat = document.createElement("small");
    reflectionCaveat.textContent = "Thẻ vui dựa trên lựa chọn bạn vừa thử; không đánh giá tâm lý, năng lực hay quyền dùng AI cho môn học.";
    const reflectionLink = document.createElement("a");
    reflectionLink.className = "button button-dark";
    reflectionLink.href = persona?.href || "#guideline";
    reflectionLink.textContent = `${persona?.action || "Xem hướng dẫn"} ↗`;
    reflection.append(reflectionLabel, reflectionIcon, reflectionTitle, reflectionEnglish, reflectionSlogan, reflectionScore, reflectionText, reflectionLink, reflectionCaveat);
    const note = document.createElement("p");
    note.className = "scenario-prompt";
    note.textContent = "Trước khi dùng AI cho bài nộp hoặc bài đánh giá nào, hãy kiểm tra chính sách môn học và hỏi giảng viên nếu chưa rõ.";
    const controls = document.createElement("div");
    controls.className = "scenario-controls";
    const review = document.createElement("button");
    review.type = "button";
    review.className = "button button-quiet";
    review.textContent = "← Xem lại tình huống";
    review.addEventListener("click", () => {
      summary.hidden = true;
      card.hidden = false;
      scenarioIndex = 0;
      renderScenario();
      document.getElementById("scenario-title").setAttribute("tabindex", "-1");
      document.getElementById("scenario-title").focus();
    });
    const restart = document.createElement("button");
    restart.type = "button";
    restart.className = "button button-dark";
    restart.innerHTML = "Thử lại từ đầu <span aria-hidden=\"true\">↻</span>";
    restart.addEventListener("click", () => {
      scenarioAnswers.fill(null);
      scenarioIndex = 0;
      summary.hidden = true;
      card.hidden = false;
      renderScenario();
      document.getElementById("scenario-title").setAttribute("tabindex", "-1");
      document.getElementById("scenario-title").focus();
    });
    controls.append(review, restart);
    summary.append(label, title, intro, countsRow, reflection, note, controls);
    card.hidden = true;
    summary.hidden = false;
    title.focus();
  }

  // Hash navigation provides five small screens without a router or build step.
  const nav = document.getElementById("site-nav");
  const menuToggle = document.querySelector(".menu-toggle");
  const knownScreens = new Set(["home", "disclosure", "prompts", "scanner", "checker"]);
  const legacyRoutes = { survival: "scanner", "toolkit-survival": "scanner", guideline: "disclosure", learn: "prompts", about: "home", "learning-evaluation": "home" };
  function closeMenu() {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Mở điều hướng");
    nav.classList.remove("is-open");
  }
  menuToggle.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Đóng điều hướng" : "Mở điều hướng");
    nav.classList.toggle("is-open", open);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      closeMenu();
      menuToggle.focus();
    }
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  let routeInitialized = false;
  function renderRoute() {
    let hash;
    try { hash = decodeURIComponent(window.location.hash.slice(1)); } catch (_) { hash = ""; }
    hash = legacyRoutes[hash] || hash;
    if (hash === "main") {
      if (!routeInitialized) document.getElementById("home").hidden = false;
      const main = document.getElementById("main");
      main.focus({ preventScroll: true });
      main.scrollIntoView({ block: "start" });
      routeInitialized = true;
      return;
    }
    const target = hash ? document.getElementById(hash) : null;
    let screenId = knownScreens.has(hash) ? hash : (target && target.closest("[data-screen]")?.id) || "home";
    document.querySelectorAll("[data-screen]").forEach((screen) => { screen.hidden = screen.id !== screenId; });
    document.querySelectorAll("[data-nav]").forEach((link) => {
      if (link.dataset.nav === screenId) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    closeMenu();
    requestAnimationFrame(() => {
      const screen = document.getElementById(screenId);
      let disclosure = target?.closest("details");
      while (disclosure) {
        disclosure.open = true;
        disclosure = disclosure.parentElement?.closest("details");
      }
      const focusTarget = target && target !== screen ? (target.querySelector("h1, h2") || target) : screen.querySelector("h1");
      if (routeInitialized && focusTarget) {
        focusTarget.setAttribute("tabindex", "-1");
        focusTarget.focus({ preventScroll: true });
      }
      // Toolkit hashes identify mount points below the back link. Start at the
      // screen top so the title and return path are visible below the header.
      if (target && target !== screen && !["toolkit-disclosure", "toolkit-prompts", "toolkit-scanner"].includes(target.id)) target.scrollIntoView({ block: "start" });
      else window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      routeInitialized = true;
    });
  }
  document.querySelector(".skip-link").addEventListener("click", (event) => {
    event.preventDefault();
    const main = document.getElementById("main");
    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: "start" });
  });
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
  renderScenario();
})();
