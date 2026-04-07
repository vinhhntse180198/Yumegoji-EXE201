import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { extractLearnDocument, postLearnAiChat } from '../../services/learnAiService';

const MAX_TEXT_FILE_CHARS = 24_000;
const MAX_IMAGE_BYTES = 2_200_000;
const MAX_DOC_BYTES = 24 * 1024 * 1024;

function stripBase64Prefix(dataUrlOrB64) {
  const s = String(dataUrlOrB64 || '').trim();
  const i = s.indexOf('base64,');
  return i >= 0 ? s.slice(i + 7) : s;
}

/** Bubble user: chỉ hiện câu hỏi + tên file; nội dung dài gửi kèm trong `content` cho API. */
function buildUserBubbleDisplay(q, textSnippets, imageCount) {
  const docNames = textSnippets.map((s) => s.name).filter(Boolean);
  const attachBits = [];
  if (docNames.length) attachBits.push(docNames.join(', '));
  if (imageCount > 0) attachBits.push(`${imageCount} ảnh`);
  const attachLine = attachBits.length ? `📎 ${attachBits.join(' · ')}` : '';

  if (q && attachLine) return `${q}\n${attachLine}`;
  if (q) return q;
  if (attachLine) return `${attachLine}\n(Nội dung đã gửi kèm cho AI — không hiện đầy đủ trong khung chat.)`;
  return '';
}

function IconSparkles({ className }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l1.09 3.26L16 7l-2.91 1.74L12 12l-1.09-3.26L8 7l2.91-1.74L12 3zM5 14l.73 2.18L8 17l-2.27 1.36L5 21l-.73-2.64L2 17l2.27-1.36L5 14zm14 0l.73 2.18L22 17l-2.27 1.36L19 21l-.73-2.64L16 17l2.27-1.36L19 14z"
        fill="currentColor"
        opacity="0.92"
      />
    </svg>
  );
}

export default function LearnAiWidget({ isAuthenticated }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [imagePreviews, setImagePreviews] = useState([]);
  const [textSnippets, setTextSnippets] = useState([]);
  const [busy, setBusy] = useState(false);
  const [docBusy, setDocBusy] = useState(false);
  const [err, setErr] = useState('');
  const listRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, busy]);

  const clearAttachments = useCallback(() => {
    setImagePreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    setTextSnippets([]);
  }, []);

  const onPickFiles = useCallback(
    (ev) => {
      const files = Array.from(ev.target.files || []);
      ev.target.value = '';
      if (!files.length) return;

      for (const f of files) {
        if (f.type.startsWith('image/')) {
          if (f.size > MAX_IMAGE_BYTES) {
            setErr(`Ảnh "${f.name}" quá lớn (tối đa ~${Math.round(MAX_IMAGE_BYTES / 1024)} KB).`);
            continue;
          }
          const url = URL.createObjectURL(f);
          const reader = new FileReader();
          reader.onload = () => {
            const b64 = stripBase64Prefix(reader.result);
            setImagePreviews((p) => [...p, { id: `${Date.now()}-${f.name}`, url, base64: b64, name: f.name }]);
          };
          reader.readAsDataURL(f);
        } else if (f.type === 'text/plain' || /\.(txt|md)$/i.test(f.name)) {
          const reader = new FileReader();
          reader.onload = () => {
            let t = String(reader.result || '');
            if (t.length > MAX_TEXT_FILE_CHARS) t = `${t.slice(0, MAX_TEXT_FILE_CHARS)}\n\n…(đã cắt bớt)`;
            setTextSnippets((s) => [...s, { id: `${Date.now()}-${f.name}`, name: f.name, text: t }]);
          };
          reader.readAsText(f, 'UTF-8');
        } else if (/\.(pdf|docx|pptx)$/i.test(f.name)) {
          if (f.size > MAX_DOC_BYTES) {
            setErr(`Tài liệu "${f.name}" quá lớn (tối đa ~24 MB).`);
            continue;
          }
          if (!isAuthenticated) {
            setErr('Đăng nhập để đính kèm PDF / Word / PowerPoint.');
            continue;
          }
          void (async () => {
            try {
              setDocBusy(true);
              setErr('');
              const data = await extractLearnDocument(f);
              const text = data?.plainText ?? data?.PlainText ?? '';
              const warn = data?.warning ?? data?.Warning;
              if (!String(text).trim()) {
                setErr('Không trích được chữ từ file (file trống hoặc không đọc được).');
                return;
              }
              let t = String(text);
              if (warn) t += `\n\n---\n(${warn})`;
              setTextSnippets((s) => [...s, { id: `${Date.now()}-${f.name}`, name: f.name, text: t }]);
            } catch (ex) {
              const msg =
                ex?.response?.data?.message ||
                ex?.response?.data?.Message ||
                ex?.message ||
                'Không tải được tài liệu.';
              setErr(String(msg));
            } finally {
              setDocBusy(false);
            }
          })();
        } else {
          setErr('Chỉ hỗ trợ ảnh PNG/JPG/WebP, .txt / .md, hoặc .pdf / .docx / .pptx.');
        }
      }
    },
    [isAuthenticated]
  );

  const removeImage = useCallback((id) => {
    setImagePreviews((prev) => {
      const x = prev.find((p) => p.id === id);
      if (x) URL.revokeObjectURL(x.url);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const removeText = useCallback((id) => {
    setTextSnippets((s) => s.filter((x) => x.id !== id));
  }, []);

  async function handleSend(e) {
    e.preventDefault();
    const q = draft.trim();
    if (!q && imagePreviews.length === 0 && textSnippets.length === 0) return;
    if (!isAuthenticated) return;

    let userContent = q;
    if (textSnippets.length) {
      const blocks = textSnippets.map((s) => `### ${s.name}\n${s.text}`);
      userContent = [userContent, ...blocks].filter(Boolean).join('\n\n---\n\n');
    }

    const imgs = imagePreviews.map((p) => p.base64);
    const apiUserContent = userContent || (imgs.length ? '(Đính kèm ảnh)' : '');
    const bubbleDisplay =
      buildUserBubbleDisplay(q, textSnippets, imgs.length) ||
      apiUserContent ||
      'Đính kèm ảnh — xem và phân tích giúp mình.';

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const nextHistory = [...history, { role: 'user', content: apiUserContent }];

    setErr('');
    setBusy(true);
    setDraft('');
    clearAttachments();
    setMessages((m) => [
      ...m,
      {
        role: 'user',
        content: apiUserContent,
        displayContent: bubbleDisplay,
      },
    ]);

    try {
      const data = await postLearnAiChat({
        messages: nextHistory,
        imagesBase64: imgs.length ? imgs : undefined,
      });
      const reply = data?.message ?? data?.Message ?? '';
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (ex) {
      const msg =
        ex?.response?.data?.message ||
        ex?.message ||
        (ex?.response?.status === 503
          ? 'Ollama chưa chạy hoặc model chưa tải. Kiểm tra máy chủ backend và `ollama serve`.'
          : 'Không gửi được tin nhắn.');
      setErr(String(msg));
      setMessages((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="learn-ai-widget" aria-live="polite">
      {open ? (
        <div className="learn-ai-widget__panel" role="dialog" aria-label="AI dùm tôi">
          <header className="learn-ai-widget__head">
            <div className="learn-ai-widget__head-text">
              <span className="learn-ai-widget__title">AI dùm tôi</span>
              <span className="learn-ai-widget__sub">Ollama · ảnh &amp; văn bản</span>
            </div>
            <button
              type="button"
              className="learn-ai-widget__icon-btn"
              aria-label="Đóng"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>

          {!isAuthenticated ? (
            <div className="learn-ai-widget__gate">
              <p>Đăng nhập để dùng AI dùm tôi trên trang Học tập.</p>
              <Link className="learn-ai-widget__link" to={`${ROUTES.LOGIN}?redirect=${encodeURIComponent(ROUTES.LEARN)}`}>
                Đăng nhập
              </Link>
            </div>
          ) : (
            <>
              <div className="learn-ai-widget__messages" ref={listRef}>
                {messages.length === 0 ? (
                  <p className="learn-ai-widget__hint">
                    Hỏi ngữ pháp, từ vựng; đính <strong>ảnh PNG/JPG</strong> (screenshot bài tập); hoặc{' '}
                    <strong>.txt / .md / .pptx / .docx / .pdf</strong> — slide Word/PowerPoint/PDF được trích chữ trên
                    server rồi gửi cho AI.
                  </p>
                ) : null}
                {messages.map((m, i) => (
                  <div key={`${i}-${m.role}`} className={`learn-ai-widget__bubble learn-ai-widget__bubble--${m.role}`}>
                    <span className="learn-ai-widget__bubble-label">
                      {m.role === 'user' ? 'Bạn' : 'AI dùm tôi'}
                    </span>
                    <div className="learn-ai-widget__bubble-body">
                      {m.displayContent != null && m.displayContent !== '' ? m.displayContent : m.content}
                    </div>
                  </div>
                ))}
                {busy ? <div className="learn-ai-widget__typing">AI dùm tôi đang suy nghĩ…</div> : null}
              </div>

              {err ? <div className="learn-ai-widget__error">{err}</div> : null}
              {docBusy ? (
                <div className="learn-ai-widget__typing learn-ai-widget__typing--bar">Đang trích văn bản từ tài liệu…</div>
              ) : null}

              {(imagePreviews.length > 0 || textSnippets.length > 0) && (
                <div className="learn-ai-widget__attach-bar">
                  {imagePreviews.map((p) => (
                    <div key={p.id} className="learn-ai-widget__attach-chip learn-ai-widget__attach-chip--img">
                      <img src={p.url} alt="" />
                      <button type="button" onClick={() => removeImage(p.id)} aria-label={`Bỏ ${p.name}`}>
                        ×
                      </button>
                    </div>
                  ))}
                  {textSnippets.map((s) => (
                    <div key={s.id} className="learn-ai-widget__attach-chip">
                      <span>{s.name}</span>
                      <button type="button" onClick={() => removeText(s.id)} aria-label={`Bỏ ${s.name}`}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form className="learn-ai-widget__form" onSubmit={handleSend}>
                <input
                  ref={fileRef}
                  type="file"
                  className="learn-ai-widget__file"
                  accept="image/png,image/jpeg,image/webp,.txt,.md,.pdf,.docx,.pptx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  multiple
                  onChange={onPickFiles}
                />
                <button
                  type="button"
                  className="learn-ai-widget__attach-trigger"
                  aria-label="Đính ảnh hoặc tài liệu"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy || docBusy}
                >
                  +
                </button>
                <textarea
                  className="learn-ai-widget__input"
                  rows={2}
                  placeholder="Hỏi bài, dán nội dung, hoặc mô tả ảnh đính kèm…"
                  value={draft}
                  onChange={(ev) => setDraft(ev.target.value)}
                  disabled={busy || docBusy}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' && !ev.shiftKey) {
                      ev.preventDefault();
                      void handleSend(ev);
                    }
                  }}
                />
                <button type="submit" className="learn-ai-widget__send" disabled={busy || docBusy}>
                  Gửi
                </button>
              </form>
            </>
          )}
        </div>
      ) : null}

      <button
        type="button"
        className={`learn-ai-widget__fab${open ? ' learn-ai-widget__fab--open' : ''}`}
        aria-expanded={open}
        aria-label={open ? 'Đóng AI dùm tôi' : 'Mở AI dùm tôi'}
        onClick={() => setOpen((v) => !v)}
      >
        <IconSparkles className="learn-ai-widget__fab-ico" />
      </button>
    </div>
  );
}
