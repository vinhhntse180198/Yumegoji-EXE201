import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { useAuth } from '../hooks/useAuth';
import http from '../services/http';
import { getPostLoginRoute } from '../utils/postLoginRoute';
import { isStaffUser } from '../utils/roles';

const TEST_DURATION_SECONDS = 20 * 60; // 20 phút

export default function LevelUpTest() {
  const { toLevel } = useParams();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION_SECONDS);
  const [submitted, setSubmitted] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (isStaffUser(user)) {
      navigate(getPostLoginRoute(user, ROUTES.DASHBOARD), { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (isStaffUser(user)) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await http.get('/api/LevelUpTest', {
          params: { toLevel },
        });
        if (!cancelled) {
          setTest(res.data);
          setTimeLeft(res.data?.timeLimitSeconds ?? TEST_DURATION_SECONDS);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setTest(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [toLevel, user]);

  useEffect(() => {
    if (!test || submitted) return;
    if (timeLeft <= 0) {
      setSubmitted(true);
      void handleSubmit(true);
      return;
    }
    const id = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [test, timeLeft, submitted]);

  const handleChange = (qid, key) => {
    setAnswers((prev) => ({ ...prev, [qid]: key }));
  };

  const handleSubmit = async (isAuto = false) => {
    if (!test || submitted || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        testId: test.testId,
        answers: test.questions.map((q) => ({
          questionId: q.id,
          selectedKey: answers[q.id] || '',
        })),
      };
      const res = await http.post('/api/LevelUpTest/submit', payload);
      setResult(res.data);
      setSubmitted(true);
      setTimeout(() => {
        navigate(ROUTES.CHAT);
      }, 3000);
    } catch (e) {
      if (!isAuto) {
        console.error(e);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Đang tải bài thi nâng level...</div>;
  }

  if (!test) {
    return <div style={{ padding: 24 }}>Chưa có bài thi nâng level phù hợp. Hỏi moderator để tạo đề.</div>;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div
      className="placement-test-layout"
      style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
    >
      <header
        className="placement-test-header"
        style={{ padding: '16px 24px', borderBottom: '1px solid #eee', background: '#fff' }}
      >
        <h1 style={{ margin: 0 }}>{test.title}</h1>
        <p style={{ margin: '4px 0 0' }}>
          Xin chào {user?.username}. Đây là bài thi nâng level từ {test.fromLevel} lên {test.toLevel}. Bạn có{' '}
          {Math.round((test.timeLimitSeconds ?? TEST_DURATION_SECONDS) / 60)} phút để làm {test.questions.length} câu.
        </p>
        {test.description ? (
          <p style={{ margin: '4px 0 0', color: '#6b7280' }}>{test.description}</p>
        ) : null}
        <div
          className="placement-test-timer"
          style={{ marginTop: 8, fontWeight: 600, color: timeLeft <= 60 ? '#d93025' : '#111827' }}
        >
          Thời gian còn lại: {minutes}:{String(seconds).padStart(2, '0')}
        </div>
      </header>

      <main
        className="placement-test-body"
        style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}
      >
        {test.questions.map((q, idx) => (
          <div
            key={q.id}
            style={{ marginBottom: 16, padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              Câu {idx + 1} ({q.points} điểm): {q.text}
            </div>
            <div>
              {q.options.map((opt) => (
                <label key={opt.key} style={{ display: 'block', marginBottom: 4, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={opt.key}
                    checked={answers[q.id] === opt.key}
                    onChange={() => handleChange(q.id, opt.key)}
                    style={{ marginRight: 8 }}
                  />
                  {opt.key}. {opt.text}
                </label>
              ))}
            </div>
          </div>
        ))}
      </main>

      <footer
        className="placement-test-footer"
        style={{ padding: '12px 24px', borderTop: '1px solid #eee', background: '#fff', textAlign: 'right' }}
      >
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={submitting || submitted}
          style={{ padding: '8px 16px' }}
        >
          {submitting ? 'Đang nộp...' : submitted ? 'Đã nộp bài' : 'Nộp bài'}
        </button>
        {result && (
          <div style={{ marginTop: 8, textAlign: 'left' }}>
            <p>
              Bạn đạt {result.score}/{result.maxScore} điểm.
            </p>
            <p>Kết quả: {result.isPassed ? 'ĐẬU (sẽ nâng level trong giây lát)' : 'CHƯA ĐẠT (cần ≥ 80%)'}</p>
            <p>Hệ thống sẽ chuyển sang khu vực chat sau ít giây...</p>
          </div>
        )}
      </footer>
    </div>
  );
}

