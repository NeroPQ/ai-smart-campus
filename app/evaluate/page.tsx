'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import './evaluation.css';

type Session = { id: string; token: string; qa: boolean };
type Question = { prompt: string; options: string[] };
type Attempt = {
  id: string;
  qa: boolean;
  preScore: number | null;
  postScore: number | null;
  lessons: number[];
  feedbackDone: boolean;
};
type EvaluationResponse = {
  error?: string;
  attempt: Attempt;
  questions: Question[];
  id: string;
  qa: boolean;
  token: string;
};

const lessons = [
  {
    title: '01 · Hỏi AI để hiểu bài',
    content:
      'Trước hết hãy tự nghĩ. Khi môn học cho phép, hỏi AI giải thích một khái niệm, yêu cầu ví dụ và tự trả lời một câu luyện tập. Không nhờ AI hoàn thành phần bài đánh giá bị cấm.',
  },
  {
    title: '02 · Kiểm chứng thông tin',
    content:
      'Tách nhận định cần kiểm tra, tìm đến bài báo, dữ liệu hay cơ quan gốc và đối chiếu tác giả, năm, phương pháp và kết quả. Một chatbot khác đồng ý không thay thế nguồn gốc.',
  },
  {
    title: '03 · Minh bạch và bảo vệ dữ liệu',
    content:
      'Kiểm tra quy định của bài; hỏi giảng viên nếu chưa rõ. Không đưa dữ liệu cá nhân, mật hoặc tài liệu chưa được phép chia sẻ vào AI công cộng. Khai báo đúng công cụ và phần AI hỗ trợ khi được yêu cầu.',
  },
];
const KEY = 'aisc-evaluation-sessions-v1';

export default function Evaluation() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [qaMode, setQaMode] = useState(false);
  const [qaId, setQaId] = useState('');
  const [recoveryId, setRecoveryId] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [consent, setConsent] = useState(false);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState('');

  useEffect(() => {
    const root = document.documentElement;
    try { root.classList.toggle('dark', localStorage.getItem('ai-smart-campus-color-scheme') === 'dark'); } catch { /* Use the light theme if storage is unavailable. */ }
    return () => root.classList.remove('dark');
  }, []);

  useEffect(() => {
    // The QA query flag and saved sessions are browser-only state; hydrate them after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQaMode(new URLSearchParams(window.location.search).get('qa') === '1');
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (Array.isArray(saved)) {
        setSessions(
          saved.filter(
            (value) =>
              value &&
              typeof value.id === 'string' &&
              typeof value.token === 'string' &&
              typeof value.qa === 'boolean',
          ),
        );
      }
    } catch {
      setMessage('Không đọc được lượt đã lưu trên thiết bị. Bạn có thể dùng mã và khóa khôi phục để tiếp tục.');
    }
  }, []);

  async function api(data: Record<string, unknown>) {
    const response = await fetch('/api/evaluation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      cache: 'no-store',
    });
    const result = (await response.json()) as EvaluationResponse;
    if (!response.ok) throw new Error(result.error || 'Không kết nối được. Vui lòng thử lại.');
    return result;
  }

  async function load(savedSession: Session) {
    const result = await api({ ...savedSession, action: 'state' });
    setSession(savedSession);
    setAttempt(result.attempt);
    setQuestions(result.questions);
    setAnswers([]);
    setRating('');
    setComment('');
    setCopyState('');
    setMessage('');
  }

  async function run(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Có lỗi, hãy thử lại.');
    } finally {
      setBusy(false);
    }
  }

  async function register() {
    await run(async () => {
      const data: Record<string, unknown> = qaMode
        ? { action: 'register', consent: true, qa: true, id: qaId.trim().toUpperCase() }
        : { action: 'register', consent: true };
      const result = await api(data);
      if (!result.id || !result.token) throw new Error('Chưa nhận được mã tham gia. Vui lòng thử lại.');
      const savedSession = { id: result.id, qa: result.qa, token: result.token };
      const next = [
        ...sessions.filter((item) => !(item.id === savedSession.id && item.qa === savedSession.qa)),
        savedSession,
      ];
      setSessions(next);
      let stored = true;
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        stored = false;
      }
      setSession(savedSession);
      setAttempt({ id: savedSession.id, qa: savedSession.qa, preScore: null, postScore: null, lessons: [], feedbackDone: false });
      setQuestions(result.questions);
      setAnswers([]);
      setCopyState('');
      setMessage('');
      if (!stored) setMessage('Không thể lưu lượt trên thiết bị. Hãy sao chép mã tham gia và khóa khôi phục để dùng lại.');
    });
  }

  async function submit(action: string, extra: Record<string, unknown> = {}) {
    if (!session) return;
    await run(async () => {
      await api({ ...session, action, ...extra });
      await load(session);
    });
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState(`${label} đã sao chép`);
    } catch {
      setCopyState('Không sao chép được tự động. Hãy chọn và sao chép mã bên trên.');
    }
  }

  const showPre = attempt?.preScore === null;
  const showPost = Boolean(
    attempt && attempt.preScore !== null && attempt.lessons.length === 3 && attempt.postScore === null,
  );
  const activeSessions = sessions.filter((saved) => saved.qa === qaMode);
  const progress = !attempt
    ? 0
      : attempt.postScore !== null
      ? attempt.feedbackDone ? 4 : 3
      : attempt.preScore === null
        ? 0
        : attempt.lessons.length === 3
          ? 2
          : 1;

  return (
    <main className="eval-page">
      <div className="eval-shell">
        <header className="eval-header">
          <Link className="back-link" href="/">← Về bộ công cụ</Link>
          <p className="eyebrow">AI SMART CAMPUS · ĐÁNH GIÁ TRẢI NGHIỆM</p>
          <h1>Thử công cụ. Nhìn lại cách mình dùng AI.</h1>
          <p className="intro">
            Làm bài kiểm tra ngắn, khám phá ba bài học thực tế rồi chia sẻ góp ý. Toàn bộ quy trình thường mất khoảng 8–10 phút.
          </p>
          <ol className="step-list" aria-label="Các bước tham gia">
            {['Pre-test', 'Bài học', 'Post-test', 'Góp ý'].map((step, index) => (
              <li className={progress >= index + 1 ? 'is-complete' : ''} key={step}>
                <span aria-hidden="true">{progress >= index + 1 ? '✓' : index + 1}</span>{step}
              </li>
            ))}
          </ol>
        </header>

        {message && <p className="notice" role="status">{message}</p>}

        {!session ? (
          <section className="panel start-panel" aria-labelledby="start-heading">
            <div className="panel-kicker">BẮT ĐẦU · TỰ NGUYỆN</div>
            <h2 id="start-heading">Tham gia đánh giá</h2>
            <p className="panel-intro">
              Sau khi đồng ý, hệ thống sẽ tự tạo cho bạn một mã ẩn danh và khóa khôi phục. Không nhập tên, email hay mã số sinh viên.
            </p>
            <div className="privacy-note">
              <span aria-hidden="true">🔒</span>
              <p>
                Câu trả lời, điểm và góp ý được lưu để đánh giá dự án. Nhóm đồng bộ kết quả vào bảng tính có quyền truy cập giới hạn. Tham gia là hoàn toàn tự nguyện.
              </p>
            </div>

            {activeSessions.length > 0 && (
              <div className="saved-sessions">
                <h3>Lượt đã lưu trên thiết bị này</h3>
                <p>Chọn mã của mình để tiếp tục ở bước gần nhất.</p>
                <div className="saved-session-list">
                  {activeSessions.map((saved) => (
                    <button
                      className="saved-session"
                      key={`${saved.id}-${saved.qa}`}
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => load(saved))}
                    >
                      <span><strong>{saved.id}</strong><small>{saved.qa ? 'Lượt kiểm thử' : 'Mã tham gia của bạn'}</small></span>
                      <span aria-hidden="true">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {qaMode && (
              <div className="qa-box">
                <strong>Chế độ kiểm thử nội bộ</strong>
                <p>Chỉ dùng mã QA thử nghiệm. Không dùng chế độ này với người tham gia thật.</p>
                <label htmlFor="qa-id">Mã QA</label>
                <input
                  id="qa-id"
                  value={qaId}
                  onChange={(event) => setQaId(event.target.value)}
                  placeholder="QA001"
                  autoComplete="off"
                  maxLength={32}
                />
              </div>
            )}

            <label className="consent-check" htmlFor="consent">
              <input id="consent" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
              <span>Tôi tự nguyện tham gia và đồng ý lưu câu trả lời, điểm cùng góp ý để đánh giá dự án.</span>
            </label>
            <button className="primary-button" type="button" disabled={busy || !consent || (qaMode && !qaId.trim())} onClick={register}>
              {busy ? 'Đang tạo lượt…' : 'Tạo mã và bắt đầu'} <span aria-hidden="true">→</span>
            </button>

            <details className="recovery-details">
              <summary>Đã có mã? Tiếp tục trên thiết bị khác</summary>
              <p>Nhập mã tham gia và khóa khôi phục đã lưu để mở lại tiến độ.</p>
              <label htmlFor="recovery-id">Mã tham gia</label>
              <input
                id="recovery-id"
                value={recoveryId}
                onChange={(event) => setRecoveryId(event.target.value)}
                placeholder="Ví dụ: ASC001"
                autoComplete="off"
                maxLength={32}
              />
              <label htmlFor="recovery-token">Khóa khôi phục</label>
              <input
                id="recovery-token"
                value={recoveryToken}
                onChange={(event) => setRecoveryToken(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="secondary-button"
                type="button"
                disabled={busy || !recoveryId.trim() || !recoveryToken.trim()}
                onClick={() => run(() => load({ id: recoveryId.trim().toUpperCase(), token: recoveryToken.trim(), qa: qaMode }))}
              >
                Tiếp tục lượt cũ
              </button>
            </details>
          </section>
        ) : (
          <>
            <section className="panel identity-panel" aria-labelledby="identity-heading">
              <div className="identity-copy">
                <div className="panel-kicker">MÃ THAM GIA CỦA BẠN{session.qa ? ' · QA' : ''}</div>
                <h2 id="identity-heading">{session.id}</h2>
                <p>Lưu lại khóa khôi phục để tiếp tục trên thiết bị khác. Mã này không chứa thông tin cá nhân.</p>
              </div>
              <button className="secondary-button" type="button" onClick={() => copy(session.id, 'Mã tham gia')}>
                Sao chép mã
              </button>
              <details className="token-details">
                <summary>Xem khóa khôi phục</summary>
                <div className="token-row">
                  <code>{session.token}</code>
                  <button className="quiet-button" type="button" onClick={() => copy(session.token, 'Khóa khôi phục')}>Sao chép khóa</button>
                </div>
                <p>Giữ kín khóa này. Bất kỳ ai có cả mã tham gia và khóa đều có thể mở lượt của bạn.</p>
              </details>
              {copyState && <p className="copy-status" role="status">{copyState}</p>}
              <button
                className="text-button change-session"
                type="button"
                disabled={busy}
                onClick={() => { setSession(null); setAttempt(null); setQuestions([]); setMessage(''); setCopyState(''); }}
              >
                Chuyển sang lượt khác
              </button>
            </section>

            {showPre && (
              <Quiz
                title="Pre-test"
                description="5 câu · 1 điểm cho mỗi câu. Chọn một đáp án cho từng câu."
                questions={questions}
                answers={answers}
                onAnswer={(index, value) => setAnswers((old) => { const next = [...old]; next[index] = value; return next; })}
                disabled={busy}
                onSubmit={() => submit('pre', { answers })}
              />
            )}

            {attempt && attempt.preScore !== null && (
              <section className="panel learning-panel">
                <div className="panel-kicker">BƯỚC 2 · HỌC QUA THỰC HÀNH</div>
                <h2>Pre-test: {attempt.preScore}/5</h2>
                <p className="panel-intro">Hoàn thành ba bài học dưới đây để mở Post-test. Mỗi bài chỉ mất một phút.</p>
                <div className="lessons">
                  {lessons.map((lesson, index) => {
                    const done = attempt.lessons.includes(index + 1);
                    return (
                      <article className={`lesson-card${done ? ' is-done' : ''}`} key={lesson.title}>
                        <span className="lesson-number" aria-hidden="true">{done ? '✓' : `0${index + 1}`}</span>
                        <h3>{lesson.title}</h3>
                        <p>{lesson.content}</p>
                        <button className={done ? 'quiet-button' : 'secondary-button'} type="button" disabled={busy || done || attempt.postScore !== null} onClick={() => submit('lesson', { lesson: index + 1 })}>
                          {done ? 'Đã hoàn thành' : 'Đánh dấu đã đọc'}
                        </button>
                      </article>
                    );
                  })}
                </div>
                <section className="do-dont" aria-labelledby="do-dont-title">
                  <h3 id="do-dont-title">Dùng AI có trách nhiệm: Nên &amp; Tránh</h3>
                  <div className="do-dont-grid">
                    <div><h4>✓ Nên làm</h4><ul>
                      <li>Đọc quy định môn học và hỏi giảng viên khi chưa rõ.</li>
                      <li>Tự suy nghĩ, tự viết và chịu trách nhiệm về bài làm.</li>
                      <li>Đối chiếu thông tin với nguồn gốc đáng tin cậy.</li>
                      <li>Khai báo trung thực phần AI hỗ trợ khi được yêu cầu.</li>
                      <li>Bảo vệ dữ liệu cá nhân và tài liệu chưa được phép chia sẻ.</li>
                    </ul></div>
                    <div><h4>✕ Cần tránh</h4><ul>
                      <li>Nộp nguyên câu trả lời AI như sản phẩm của mình.</li>
                      <li>Mặc định AI được phép làm mọi bài được chấm điểm.</li>
                      <li>Dùng trích dẫn chưa kiểm tra hoặc nguồn không tồn tại.</li>
                      <li>Nhập thông tin riêng tư hoặc bí mật vào AI công cộng.</li>
                      <li>Coi điểm nhận diện AI là bằng chứng kết luận tác giả.</li>
                    </ul></div>
                  </div>
                </section>
                <details className="guideline-details">
                  <summary>AI Guideline · gợi ý áp dụng</summary>
                  <ul>
                    <li>Ưu tiên quy định của trường, học phần và từng bài; hỏi giảng viên trước nếu chưa rõ. Một lựa chọn Appropriate trong Checker không phải phê duyệt.</li>
                    <li>Giữ phần suy nghĩ và lập luận của mình; đối chiếu thông tin và trích dẫn với nguồn gốc.</li>
                    <li>Khai báo trung thực công cụ và phần AI hỗ trợ theo yêu cầu của môn; khai báo không hợp thức hóa hành vi bị cấm.</li>
                    <li>Không đưa dữ liệu cá nhân, mật hoặc tài liệu chưa được phép chia sẻ vào công cụ AI công cộng.</li>
                  </ul>
                  <p>Hướng dẫn của nhóm, không phải chính sách chính thức của trường. Xem <a href="https://daihoc.fpt.edu.vn/hoat-dong-nha-truong/tin-tuc-chung/quy-che-dao-tao-dai-hoc-chinh-quy/" target="_blank" rel="noreferrer">quy chế FPT</a>, <a href="https://apastyle.apa.org/blog/cite-generative-ai-allowed" target="_blank" rel="noreferrer">APA Style</a> và <a href="https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research" target="_blank" rel="noreferrer">UNESCO</a>.</p>
                </details>
                <p className="tool-link">Thử thêm <a href="/#checker" target="_blank" rel="noreferrer">AI Checker</a> trước khi làm Post-test.</p>
              </section>
            )}

            {showPost && (
              <Quiz
                title="Post-test"
                description="5 câu · 1 điểm cho mỗi câu. Chọn một đáp án cho từng câu."
                questions={questions}
                answers={answers}
                onAnswer={(index, value) => setAnswers((old) => { const next = [...old]; next[index] = value; return next; })}
                disabled={busy}
                onSubmit={() => submit('post', { answers })}
              />
            )}

            {attempt && attempt.postScore !== null && (
              <section className="panel feedback-panel">
                <div className="panel-kicker">BƯỚC CUỐI · CHIA SẺ GÓP Ý</div>
                <h2>Post-test: {attempt.postScore}/5</h2>
                <p className="score-change">
                  <span>Pre-test <strong>{attempt.preScore}/5</strong></span>
                  <span aria-hidden="true">→</span>
                  <span>Thay đổi <strong>{attempt.postScore - (attempt.preScore ?? 0) > 0 ? '+' : ''}{attempt.postScore - (attempt.preScore ?? 0)} điểm</strong></span>
                </p>
                {attempt.feedbackDone ? (
                  <div className="success-note" role="status"><span aria-hidden="true">✓</span><p>Đã gửi góp ý. Cảm ơn bạn đã tham gia!</p></div>
                ) : (
                  <>
                    <fieldset className="rating-group">
                      <legend className="field-label">Mức độ hữu ích của AI Smart Campus <span>(bắt buộc)</span></legend>
                      <div className="rating-options">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <label className={`rating-option${rating === String(value) ? ' is-selected' : ''}`} key={value}>
                            <input type="radio" name="rating" value={value} checked={rating === String(value)} onChange={(event) => setRating(event.target.value)} />
                            <span aria-hidden="true">★</span> {value}<span className="rating-sr"> sao · {value <= 2 ? 'Chưa hữu ích' : value === 3 ? 'Bình thường' : value === 4 ? 'Hữu ích' : 'Rất hữu ích'}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <label className="field-label" htmlFor="comment">Góp ý thêm <span>(không bắt buộc)</span></label>
                    <textarea id="comment" maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Điều gì hữu ích? Bạn muốn cải thiện điểm nào? Không nhập thông tin cá nhân." />
                    <div className="field-hint">{comment.length}/500 ký tự</div>
                    <button className="primary-button" type="button" disabled={busy || !rating} onClick={() => submit('feedback', { rating: Number(rating), comment })}>Gửi góp ý <span aria-hidden="true">→</span></button>
                  </>
                )}
              </section>
            )}
          </>
        )}
        <footer className="eval-footer">Không thu tên, email hoặc mã số sinh viên. Nếu cần dừng lại, có thể tiếp tục sau bằng mã tham gia và khóa khôi phục.</footer>
      </div>
    </main>
  );
}

function Quiz({
  title,
  description,
  questions,
  answers,
  onAnswer,
  onSubmit,
  disabled,
}: {
  title: string;
  description: string;
  questions: Question[];
  answers: number[];
  onAnswer: (index: number, value: number) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  return (
    <section className="panel quiz-panel" aria-labelledby={`${title}-heading`}>
      <div className="panel-kicker">{title === 'Pre-test' ? 'BƯỚC 1 · TRƯỚC KHI DÙNG CÔNG CỤ' : 'BƯỚC 3 · SAU KHI DÙNG CÔNG CỤ'}</div>
      <h2 id={`${title}-heading`}>{title}</h2>
      <p className="panel-intro">{description}</p>
      {questions.length !== 5 ? (
        <p role="status" className="loading-questions">Đang tải câu hỏi…</p>
      ) : (
        <>
          {questions.map((question, index) => (
            <fieldset className="question" key={question.prompt}>
              <legend><span>{String(index + 1).padStart(2, '0')}</span>{question.prompt}</legend>
              <div className="answer-options">
                {question.options.map((option, optionIndex) => (
                  <label className={`answer-option${answers[index] === optionIndex ? ' is-selected' : ''}`} key={option}>
                    <input type="radio" name={`${title}-question-${index}`} checked={answers[index] === optionIndex} onChange={() => onAnswer(index, optionIndex)} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button className="primary-button" type="button" disabled={disabled || questions.some((_, index) => !Number.isInteger(answers[index]))} onClick={onSubmit}>
            {disabled ? 'Đang lưu…' : `Nộp ${title}`} <span aria-hidden="true">→</span>
          </button>
        </>
      )}
    </section>
  );
}
