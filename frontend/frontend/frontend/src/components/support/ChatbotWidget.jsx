import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { postGuestChatbotMessage, createModeratorSupportRoom } from '../../services/chatbotService';

const INTRO_GUEST =
  'Chào bạn! Mình là chatbot YumeGo-ji (không cần tài khoản). Hỏi mình về học Nhật, đăng ký, hoặc cách dùng web nhé.';

const INTRO_MEMBER =
  'Chào bạn! Mình vẫn là chatbot YumeGo-ji — bạn có thể hỏi mình như khách. Nếu cần nói chuyện trực tiếp với người, hãy bấm nút "Mở chat với điều hành viên" phía trên.';

function sourceLabel(source) {
  if (source === 'llm') return ' · Chatbot (LLM)';
  if (source === 'template') return ' · Chatbot (mẫu)';
  return '';
}

export function ChatbotWidget() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [modLoading, setModLoading] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (!open || messages.length > 0) return;
    setMessages([{ role: 'bot', text: isAuthenticated ? INTRO_MEMBER : INTRO_GUEST }]);
  }, [open, isAuthenticated, messages.length]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const sendGuest = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setError('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setSending(true);
    try {
      const res = await postGuestChatbotMessage(text);
      const reply = res?.reply ?? 'Xin lỗi, chatbot chưa trả lời được.';
      setMessages((m) => [...m, { role: 'bot', text: reply, source: res?.source }]);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Không gửi được tin. Thử lại sau.';
      setError(msg);
      setMessages((m) => [...m, { role: 'bot', text: `Lỗi: ${msg}` }]);
    } finally {
      setSending(false);
    }
  }, [input, sending]);

  const openModeratorChat = useCallback(async () => {
    setError('');
    setModLoading(true);
    try {
      const room = await createModeratorSupportRoom();
      const id = room?.id ?? room?.Id;
      if (id == null) throw new Error('Không lấy được phòng chat.');
      setOpen(false);
      navigate(`/chat/room/${id}`);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Không mở được chat với điều hành viên.';
      setError(msg);
    } finally {
      setModLoading(false);
    }
  }, [navigate]);

  return (
    <>
      <div className="support-chat-fab-wrap">
        <button
          type="button"
          className="support-chat-fab"
          aria-expanded={open}
          aria-label="Chatbot YumeGo-ji và hỗ trợ"
          onClick={() => setOpen((o) => !o)}
        >
          🤖
        </button>
        <span className="support-chat-fab__hint">
          {isAuthenticated ? 'Chatbot & moderator' : 'Chatbot (khách)'}
        </span>
      </div>

      {open && (
        <div className="support-chat-backdrop" role="presentation" onClick={() => setOpen(false)} />
      )}

      {open && (
        <aside
          className={`support-chat-panel${isAuthenticated ? ' support-chat-panel--member' : ''}`}
          aria-label="Chatbot và hỗ trợ"
        >
          <div className="support-chat-panel__head">
            <h3 className="support-chat-panel__title">Chatbot YumeGo-ji</h3>
            <button type="button" className="support-chat-panel__close" onClick={() => setOpen(false)} aria-label="Đóng">
              ×
            </button>
          </div>

          {error && (
            <p className="support-chat-panel__error" role="alert">
              {error}
            </p>
          )}

          {isAuthenticated ? (
            <div className="support-chat-panel__member-bar">
              <p className="support-chat-panel__member-bar__text">
                Chat trực tiếp với <strong>điều hành viên</strong> (khác chatbot tự động bên dưới).
              </p>
              <button
                type="button"
                className="support-chat-panel__btn support-chat-panel__btn--primary support-chat-panel__member-bar__btn"
                disabled={modLoading}
                onClick={() => void openModeratorChat()}
              >
                {modLoading ? 'Đang mở phòng chat…' : 'Mở chat với điều hành viên'}
              </button>
            </div>
          ) : null}

          <div className="support-chat-panel__messages" ref={listRef}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={
                  msg.role === 'user' ? 'support-chat-msg support-chat-msg--user' : 'support-chat-msg support-chat-msg--bot'
                }
              >
                {msg.text}
                {msg.source ? <span className="support-chat-msg__meta">{sourceLabel(msg.source)}</span> : null}
              </div>
            ))}
          </div>
          <div className="support-chat-panel__form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi cho chatbot…"
              maxLength={2000}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendGuest();
                }
              }}
              disabled={sending}
            />
            <button type="button" disabled={sending || !input.trim()} onClick={() => void sendGuest()}>
              Gửi
            </button>
          </div>
          <p className="support-chat-panel__foot">
            {isAuthenticated
              ? 'Ô trên: chat với người (moderator). Khung dưới: chatbot tự động. Chat học viên — vào mục Chat trên menu.'
              : 'Khách chỉ dùng chatbot tại đây. Đăng ký để mở chat với điều hành viên và chat với học viên khác.'}
          </p>
        </aside>
      )}
    </>
  );
}
