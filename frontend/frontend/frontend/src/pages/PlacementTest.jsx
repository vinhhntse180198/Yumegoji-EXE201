import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import { useAuth } from '../hooks/useAuth';
import http from '../services/http';
import { storage } from '../utils/storage';
import { isStaffUser } from '../utils/roles';

const TEST_DURATION_SECONDS = 20 * 60; // 20 phút

export default function PlacementTest() {
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION_SECONDS);
  const [submitted, setSubmitted] = useState(false);

  const navigate = useNavigate();
  const { user, setNeedsPlacementTest } = useAuth();

  useEffect(() => {
    if (isStaffUser(user)) {
      storage.set('needs_placement_test', false);
      setNeedsPlacementTest?.(false);
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [user, navigate, setNeedsPlacementTest]);

  // Load đề
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await http.get('/api/PlacementTest');
        if (!cancelled) {
          setTest(res.data);
          setLoading(false);
          setTimeLeft(res.data?.timeLimitSeconds ?? TEST_DURATION_SECONDS);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Đếm ngược thời gian, hết giờ tự nộp
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
        answers: test.questions.map((q) => ({
          questionId: q.id,
          selectedKey: answers[q.id] || '',
        })),
      };
      const res = await http.post('/api/PlacementTest/submit', payload);
      setResult(res.data);
      setSubmitted(true);
      storage.set('needs_placement_test', false);
      setNeedsPlacementTest?.(false);
      setTimeout(() => {
        navigate(ROUTES.DASHBOARD);
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
    return <div style={{ padding: 24 }}>Đang tải bài test...</div>;
  }

  if (!test) {
    return <div style={{ padding: 24 }}>Không tải được bài test.</div>;
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
        <h1 style={{ margin: 0 }}>Bài test phân trình độ</h1>
        <p style={{ margin: '4px 0 0' }}>
          Xin chào {user?.username}. Bạn có {Math.round((test.timeLimitSeconds ?? TEST_DURATION_SECONDS) / 60)} phút
          để làm {test.totalQuestions} câu.
        </p>
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
              Câu {idx + 1}: {q.text}
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
              Bạn làm đúng {result.correctCount}/{result.totalCount} câu.
            </p>
            <p>Trình độ gợi ý: {result.levelLabel}</p>
            <p>Hệ thống sẽ chuyển về Dashboard sau ít giây...</p>
          </div>
        )}
      </footer>
    </div>
  );
}


