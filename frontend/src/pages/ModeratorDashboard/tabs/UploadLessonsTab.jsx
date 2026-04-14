import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { ROUTES } from '../../../data/routes';
import http from '../../../api/client';
import {
  createLessonFromDraft,
  extractLessonPlainText,
  generateLessonDraft,
} from '../../../services/lessonImportService';

const MAX_IMPORT_FILE_MB = 20;
const MAX_IMPORT_FILE_BYTES = MAX_IMPORT_FILE_MB * 1024 * 1024;

/** Ưu tiên message từ API (kể cả ProblemDetails: title/detail/errors). */
function getApiErrorMessage(err, fallback) {
  const d = err?.response?.data;
  if (d == null) return err?.message || fallback;
  if (typeof d === 'string') return d;
  if (typeof d.message === 'string' && d.message) return d.message;
  if (typeof d.detail === 'string' && d.detail) return d.detail;
  if (typeof d.title === 'string' && d.title) {
    if (d.errors && typeof d.errors === 'object')
      return `${d.title} ${JSON.stringify(d.errors)}`;
    return d.title;
  }
  return err?.message || fallback;
}

function emptyDraft() {
  return {
    title: '',
    slugSuggestion: '',
    contentHtml: '',
    estimatedMinutes: 15,
    vocabulary: [],
    grammar: [],
    quiz: [],
  };
}

/** Đưa plain text thành HTML đơn giản (&lt;p&gt;). */
function plainTextToBasicHtml(text) {
  if (text == null || !String(text).trim()) return '<p></p>';
  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const paragraphs = String(text)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!paragraphs.length) return '<p></p>';
  return paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n');
}

/** Bỏ thẻ HTML trong câu hỏi/đáp án quiz (AI đôi khi nhét &lt;strong&gt;). */
function stripHtmlToPlain(s) {
  if (s == null) return '';
  const str = String(s);
  if (typeof document === 'undefined') return str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const el = document.createElement('div');
  el.innerHTML = str;
  const t = (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
  return t;
}

function normalizeAiDraft(d) {
  if (!d) return d;
  const quiz = (d.quiz || []).map((q) => ({
    ...q,
    question: stripHtmlToPlain(q.question),
    options: (q.options || []).map((o) => stripHtmlToPlain(o)),
  }));
  return { ...d, quiz };
}

function mapDraftToCreatePayload(draft, categoryId, overrides) {
  const title = overrides.title?.trim() || draft.title || 'Bài học';
  const slug = overrides.slug?.trim() || draft.slugSuggestion || 'bai-hoc';
  const content = overrides.content ?? draft.contentHtml ?? '';
  const estimatedMinutes = Number(overrides.estimatedMinutes) || draft.estimatedMinutes || 15;

  const vocabulary = (draft.vocabulary || [])
    .filter((v) => v.wordJp?.trim())
    .map((v) => ({
      wordJp: v.wordJp.trim(),
      reading: v.reading || null,
      meaningVi: v.meaningVi || null,
    }));

  const grammar = (draft.grammar || [])
    .filter((g) => g.pattern?.trim())
    .map((g) => ({
      pattern: g.pattern.trim(),
      meaningVi: g.meaningVi || null,
      exampleSentences:
        Array.isArray(g.examples) && g.examples.length
          ? g.examples.filter(Boolean).join('\n')
          : null,
    }));

  const quiz = (draft.quiz || [])
    .filter((q) => q.question?.trim() && Array.isArray(q.options) && q.options.length >= 2)
    .map((q) => {
      const options = q.options.map((o) => String(o || '').trim()).filter(Boolean);
      let correctIndex = Number(q.correctIndex);
      if (!Number.isFinite(correctIndex)) correctIndex = 0;
      if (options.length) correctIndex = Math.min(Math.max(0, correctIndex), options.length - 1);
      return { question: q.question.trim(), options, correctIndex };
    })
    .filter((q) => q.options.length >= 2);

  return {
    categoryId: Number(categoryId),
    title,
    slug,
    content,
    estimatedMinutes,
    isPublished: Boolean(overrides.isPublished),
    vocabulary: vocabulary.length ? vocabulary : null,
    grammar: grammar.length ? grammar : null,
    quiz: quiz.length ? quiz : null,
  };
}

export function UploadLessonsTab() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [pastedContent, setPastedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  /** Sau khi Lưu thành công — hiện link sang /learn/:slug */
  const [savedLearnSlug, setSavedLearnSlug] = useState('');
  const [savedWasPublished, setSavedWasPublished] = useState(false);
  const [dropActive, setDropActive] = useState(false);

  const [levels, setLevels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [levelId, setLevelId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  /** auto | vocabulary | grammar | reading — gửi kèm generate-draft */
  const [lessonKind, setLessonKind] = useState('auto');

  const [extractedPreview, setExtractedPreview] = useState('');
  const [aiWarning, setAiWarning] = useState('');
  const [draft, setDraft] = useState(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);
  const [isPublished, setIsPublished] = useState(false);

  const htmlPreviewSanitized = useMemo(() => {
    if (!contentHtml?.trim()) return '';
    return DOMPurify.sanitize(contentHtml, { USE_PROFILES: { html: true } });
  }, [contentHtml]);

  useEffect(() => {
    http
      .get('/api/levels')
      .then((r) => setLevels(r.data || []))
      .catch(() => setLevels([]));
  }, []);

  useEffect(() => {
    if (!levelId) {
      setCategories([]);
      setCategoryId('');
      return;
    }
    http
      .get('/api/lesson-categories', { params: { levelId } })
      .then((r) => setCategories(r.data || []))
      .catch(() => setCategories([]));
  }, [levelId]);

  const validateAndSetFile = useCallback((f) => {
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_IMPORT_FILE_BYTES) {
      setError(`Tệp quá lớn — tối đa ${MAX_IMPORT_FILE_MB}MB.`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setError('');
    setFile(f);
  }, []);

  const onPick = useCallback(
    (e) => {
      const f = e.target.files?.[0];
      validateAndSetFile(f ?? null);
    },
    [validateAndSetFile],
  );

  const onDropZoneDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropActive(true);
  }, []);

  const onDropZoneDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDropActive(false);
  }, []);

  const onDropZoneDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDropActive(false);
      const f = e.dataTransfer.files?.[0];
      if (!f) return;
      validateAndSetFile(f);
    },
    [validateAndSetFile],
  );

  const runExtractNoAi = async () => {
    setError('');
    setSuccess('');
    setSavedLearnSlug('');
    setAiWarning('');
    const text = pastedContent.trim();
    if (!file && !text) {
      setError('Chọn file PDF / DOCX / PPTX hoặc dán nội dung.');
      return;
    }

    setExtracting(true);
    try {
      const res = await extractLessonPlainText({ file, text });
      const html = plainTextToBasicHtml(res.plainText || '');
      setDraft({ ...emptyDraft(), contentHtml: html });
      setTitle('');
      setSlug('');
      setContentHtml(html);
      setEstimatedMinutes(15);
      setExtractedPreview(res.preview || '');
      setAiWarning(res.warning || '');
      setSuccess('Đã trích văn bản (không AI). Chỉnh tiêu đề, slug, HTML và quiz rồi Lưu.');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Lỗi trích văn bản');
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setExtracting(false);
    }
  };

  const startManualNoAi = () => {
    setError('');
    setSuccess('');
    setSavedLearnSlug('');
    setAiWarning('');
    setExtractedPreview('');
    const initial = { ...emptyDraft(), contentHtml: '<p></p>' };
    setDraft(initial);
    setTitle('');
    setSlug('');
    setContentHtml('<p></p>');
    setEstimatedMinutes(15);
    setSuccess('Soạn bài thủ công — điền nội dung và (tuỳ chọn) quiz, rồi Lưu.');
  };

  const runAi = async () => {
    setError('');
    setSuccess('');
    setSavedLearnSlug('');
    setAiWarning('');
    setDraft(null);
    setExtractedPreview('');

    const text = pastedContent.trim();
    if (!file && !text) {
      setError('Chọn file PDF / DOCX / PPTX hoặc dán nội dung vào ô bên trái.');
      return;
    }

    setLoading(true);
    try {
      const res = await generateLessonDraft({ file, text, lessonKind });
      setExtractedPreview(res.extractedPreview || '');
      setAiWarning(res.warning || '');
      const d = normalizeAiDraft(res.draft);
      setDraft(d);
      setTitle(d.title || '');
      setSlug(d.slugSuggestion || '');
      setContentHtml(d.contentHtml || '');
      setEstimatedMinutes(d.estimatedMinutes || 15);
      setSuccess('Đã sinh bản nháp — kiểm tra và chỉnh trước khi lưu.');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Lỗi gọi AI');
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const addQuizRow = useCallback(() => {
    setDraft((d) => {
      if (!d) return d;
      const quiz = [...(d.quiz || []), { question: '', options: ['', '', '', ''], correctIndex: 0 }];
      return { ...d, quiz };
    });
  }, []);

  const removeQuizRow = useCallback((index) => {
    setDraft((d) => {
      if (!d) return d;
      const quiz = (d.quiz || []).filter((_, i) => i !== index);
      return { ...d, quiz };
    });
  }, []);

  const patchQuiz = useCallback((index, patch) => {
    setDraft((d) => {
      if (!d) return d;
      const quiz = [...(d.quiz || [])];
      quiz[index] = { ...quiz[index], ...patch };
      return { ...d, quiz };
    });
  }, []);

  const patchQuizOption = useCallback((qIndex, optIndex, value) => {
    setDraft((d) => {
      if (!d) return d;
      const quiz = [...(d.quiz || [])];
      const row = quiz[qIndex];
      if (!row) return d;
      const options = [...(row.options || [])];
      options[optIndex] = value;
      quiz[qIndex] = { ...row, options };
      return { ...d, quiz };
    });
  }, []);

  const patchVocab = useCallback((index, patch) => {
    setDraft((d) => {
      if (!d) return d;
      const vocabulary = [...(d.vocabulary || [])];
      vocabulary[index] = { ...vocabulary[index], ...patch };
      return { ...d, vocabulary };
    });
  }, []);

  const saveLesson = async () => {
    setError('');
    setSuccess('');
    setSavedLearnSlug('');
    if (!categoryId) {
      setError('Chọn cấp độ và danh mục bài học.');
      return;
    }
    if (!draft) {
      setError('Chưa có dữ liệu — dùng “Upload & sinh bằng AI”, hoặc tuỳ chọn nâng cao bên dưới.');
      return;
    }

    setSaving(true);
    try {
      const draftForSave = { ...draft, contentHtml };
      const payload = mapDraftToCreatePayload(draftForSave, categoryId, {
        title,
        slug,
        content: contentHtml,
        estimatedMinutes,
        isPublished,
      });
      await createLessonFromDraft(payload);
      setSuccess('Đã lưu bài học vào database.');
      setSavedLearnSlug(payload.slug);
      setSavedWasPublished(Boolean(isPublished));
      setDraft(null);
      setFile(null);
      setPastedContent('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Lỗi lưu');
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  const previewStats = useMemo(() => {
    const blob = `${pastedContent || ''}\n${extractedPreview || ''}\n${contentHtml || ''}`;
    const kanjiChars = blob.match(/[\u4e00-\u9fff]/g) || [];
    const kanjiUnique = new Set(kanjiChars).size;
    const vocabN = draft?.vocabulary?.length ?? 0;
    const grammarN = draft?.grammar?.length ?? 0;
    const quizN = draft?.quiz?.length ?? 0;
    const kanjiBar = Math.min(100, Math.round(vocabN * 14 + Math.min(80, kanjiUnique * 3)));
    const complexityBar = Math.min(
      100,
      Math.round(grammarN * 14 + quizN * 10 + vocabN * 8 + Math.min(35, blob.length / 400)),
    );
    let complexityLabel = '—';
    if (draft || blob.trim()) {
      if (complexityBar < 33) complexityLabel = 'Thấp';
      else if (complexityBar < 66) complexityLabel = 'Trung bình';
      else complexityLabel = 'Cao';
    }
    const kanjiLabel =
      vocabN > 0 ? `${vocabN} mục từ` : kanjiUnique > 0 ? `${kanjiUnique} kanji` : '—';
    return { kanjiBar, complexityBar, complexityLabel, kanjiLabel };
  }, [pastedContent, extractedPreview, contentHtml, draft]);

  const busy = loading || extracting;

  const systemBadgeClass =
    error && !draft
      ? 'mod-import__badge mod-import__badge--err'
      : busy
        ? 'mod-import__badge mod-import__badge--busy'
        : 'mod-import__badge mod-import__badge--ok';
  const systemBadgeText =
    error && !draft ? 'CẦN KIỂM TRA' : busy ? 'ĐANG XỬ LÝ' : 'HỆ THỐNG SẴN SÀNG';

  return (
    <div className="mod-import">
      <header className="mod-import__header">
        <div className="mod-import__header-text">
          <h2>Import bài học</h2>
          <p>
            Tải PDF/DOCX/PPTX hoặc dán văn bản tiếng Nhật — AI gợi ý từ vựng, cấu trúc và quiz. Chọn cấp độ và danh mục trước
            khi lưu.
          </p>
        </div>
      </header>

      <p className="mod-import__notice">
        <strong>Lưu ý:</strong> file chỉ dùng để <strong>trích chữ</strong> trên server — không lưu file gốc. «Lưu bài học»
        ghi HTML, từ vựng, ngữ pháp, quiz. Trang này <strong>không</strong> liệt kê bài — xem như học viên: menu{' '}
        <strong>Học tập</strong> → <strong>Bài từ hệ thống</strong> (thường cần tick <strong>Xuất bản ngay</strong>). Server
        dùng <strong>OpenAI</strong> hoặc <strong>Ollama</strong> (sinh có thể vài phút; tối đa ~48k ký tự văn bản).
      </p>

      {error ? <div className="mod-dash__alert mod-dash__alert--err">{error}</div> : null}
      {success || savedLearnSlug ? (
        <div className="mod-dash__alert mod-dash__alert--ok mod-dash__alert--learn-hint">
          {success ? <p className="mod-dash__alert-p">{success}</p> : null}
          {savedLearnSlug ? (
            <div className="mod-dash__learn-hint-body">
              <p className="mod-dash__alert-p">
                <Link className="mod-dash__learn-link" to={`${ROUTES.LEARN}/${encodeURIComponent(savedLearnSlug)}`}>
                  → Mở bài trên trang Học tập
                </Link>{' '}
                <span className="mod-dash__muted">
                  (<code className="mod-dash__code">/learn/{savedLearnSlug}</code>)
                </span>
              </p>
              {savedWasPublished ? (
                <p className="mod-dash__muted mod-dash__alert-p">
                  Đã xuất bản: trong <strong>Học tập</strong> tìm mục <strong>Bài từ hệ thống</strong> (không nằm trong lộ
                  trình N5 tĩnh phía trên).
                </p>
              ) : (
                <p className="mod-dash__muted mod-dash__alert-p">
                  <strong>Chưa xuất bản</strong> — học viên và API danh sách bài <strong>không thấy</strong> bài này. Import
                  lại và tick «Xuất bản ngay» trước khi Lưu, hoặc bật publish trong quản trị nội dung.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mod-import__selects">
        <div className="mod-import__field">
          <label htmlFor="mod-level">Cấp độ</label>
          <select
            id="mod-level"
            value={levelId}
            onChange={(e) => {
              setLevelId(e.target.value);
              setCategoryId('');
            }}
          >
            <option value="">— Chọn —</option>
            {levels.map((l) => (
              <option key={l.id ?? l.Id} value={l.id ?? l.Id}>
                {l.code ?? l.Code} — {l.name ?? l.Name}
              </option>
            ))}
          </select>
        </div>
        <div className="mod-import__field">
          <label htmlFor="mod-cat">Danh mục bài học</label>
          <select
            id="mod-cat"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={!levelId}
          >
            <option value="">— Chọn danh mục —</option>
            {categories.map((c) => (
              <option key={c.id ?? c.Id} value={c.id ?? c.Id}>
                {c.name ?? c.Name}
              </option>
            ))}
          </select>
        </div>
        <div className="mod-import__field">
          <label htmlFor="mod-kind">Loại nội dung (gợi ý AI)</label>
          <select id="mod-kind" value={lessonKind} onChange={(e) => setLessonKind(e.target.value)}>
            <option value="auto">AI tự chọn (từ vựng / ngữ pháp / đọc)</option>
            <option value="vocabulary">Ưu tiên từ vựng (bảng từ — đọc — nghĩa)</option>
            <option value="grammar">Ưu tiên ngữ pháp (mẫu câu + ví dụ)</option>
            <option value="reading">Ưu tiên bài đọc (đoạn văn + từ khóa)</option>
          </select>
        </div>
      </div>

      <div className="mod-import__grid">
        <div className="mod-import__col">
          <div className="mod-import__card">
            <h4 className="mod-import__card-title">Tải tệp lên</h4>
            <p className="mod-dash__upload-hint mod-import__drop-note">
              Slide chỉ ảnh: hãy dán phần chữ ở ô bên dưới. Có thể vừa file vừa dán — server ưu tiên nội dung hợp lệ.
            </p>
            <div
              role="button"
              tabIndex={0}
              className={`mod-import__drop${dropActive ? " mod-import__drop--active" : ""}`}
              onDragOver={onDropZoneDragOver}
              onDragLeave={onDropZoneDragLeave}
              onDrop={onDropZoneDrop}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
            >
              <span className="mod-import__drop-icon" aria-hidden>
                ☁️
              </span>
              <span className="mod-import__drop-title">Kéo thả PDF, DOCX hoặc PPTX vào đây</span>
              <span className="mod-import__drop-hint">Tối đa {MAX_IMPORT_FILE_MB}MB · .doc (Word cũ) không hỗ trợ</span>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="mod-dash__file-input"
              onChange={onPick}
            />
            <div className="mod-import__file-row">
              <button type="button" className="mod-dash__btn mod-dash__btn--primary mod-dash__btn--sm" onClick={() => inputRef.current?.click()}>
                Chọn file
              </button>
              <span className="mod-import__file-name">
                {file ? (
                  <>
                    Đã chọn: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
                  </>
                ) : (
                  "Chưa chọn tệp"
                )}
              </span>
            </div>
          </div>

          <div className="mod-import__card">
            <h4 className="mod-import__card-title">Hoặc dán văn bản tiếng Nhật</h4>
            <label className="mod-import__paste-label" htmlFor="mod-lesson-paste">
              Văn bản nguồn
            </label>
            <textarea
              id="mod-lesson-paste"
              className="mod-import__paste"
              rows={8}
              placeholder="Nhập văn bản tiếng Nhật tại đây… (Ví dụ: 日本語を勉強するのはとても楽しいです。)"
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              spellCheck
            />
          </div>

          {aiWarning ? <p className="mod-dash__muted mod-dash__ai-warning">{aiWarning}</p> : null}

          <details className="mod-import__advanced">
            <summary>Tuỳ chọn nâng cao (không AI)</summary>
            <div className="mod-import__advanced-body">
              <div className="mod-dash__import-actions mod-dash__import-actions--split mod-dash__import-actions--nested">
                <button type="button" className="mod-dash__btn mod-dash__btn--outline" disabled={busy} onClick={runExtractNoAi}>
                  {extracting ? "Đang trích văn bản…" : "Chỉ trích văn bản"}
                </button>
                <button type="button" className="mod-dash__btn mod-dash__btn--outline" disabled={busy} onClick={startManualNoAi}>
                  Soạn tay trên HTML trống
                </button>
              </div>
            </div>
          </details>
        </div>

        <div className="mod-import__col mod-import__col--preview">
          <div className="mod-import__card mod-import__card--preview">
            <div className="mod-import__preview-head">
              <h3>Xem trước kết quả AI</h3>
              <span className={systemBadgeClass}>{systemBadgeText}</span>
            </div>
            <div className="mod-import__metrics">
              <div className="mod-import__metric">
                <div className="mod-import__metric-label">Kanji / từ vựng</div>
                <div className="mod-import__metric-bar mod-import__metric-bar--kanji">
                  <span style={{ width: `${previewStats.kanjiBar}%` }} />
                </div>
                <div className="mod-import__metric-val">{previewStats.kanjiLabel}</div>
              </div>
              <div className="mod-import__metric">
                <div className="mod-import__metric-label">Độ phức tạp</div>
                <div className="mod-import__metric-bar mod-import__metric-bar--complex">
                  <span style={{ width: `${previewStats.complexityBar}%` }} />
                </div>
                <div className="mod-import__metric-val">{previewStats.complexityLabel}</div>
              </div>
            </div>

            <div className={`mod-import__preview-body${draft ? " mod-import__preview-body--expanded" : ""}`}>
              {loading ? (
                <div className="mod-import__preview-empty">
                  <p>Đang xử lý — server trích chữ và gọi AI. File lớn hoặc Ollama có thể mất vài phút.</p>
                </div>
              ) : null}
              {!loading && !draft ? (
                <div className="mod-import__preview-empty">
                  <span className="mod-import__preview-empty-icon" aria-hidden>
                    🙈
                  </span>
                  <p>
                    Chưa có dữ liệu để xem trước. Tải tệp hoặc nhập văn bản, rồi bấm <strong>Upload &amp; Sinh bằng AI</strong>.
                    Từ vựng hiển thị dạng bảng: tiếng Nhật — kana — nghĩa Việt.
                  </p>
                </div>
              ) : null}
              {!loading && draft ? (
                <>
                  <h3 className="mod-dash__ai-preview-title">Kết quả (chỉnh trực tiếp trong bảng nếu cần)</h3>
                  <p className="mod-dash__muted mod-dash__ai-preview-meta">
                    Từ vựng: {draft.vocabulary?.length ?? 0} · Ngữ pháp: {draft.grammar?.length ?? 0} · Quiz:{' '}
                    {draft.quiz?.length ?? 0}
                  </p>

                  {(draft.vocabulary || []).length ? (
                    <div className="mod-dash__vocab-table-wrap">
                      <table className="mod-dash__vocab-table">
                        <thead>
                          <tr>
                            <th>Từ / kanji</th>
                            <th>Phiên âm (kana)</th>
                            <th>Nghĩa (VI)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(draft.vocabulary || []).map((row, vi) => (
                            <tr key={vi}>
                              <td>
                                <input
                                  className="mod-dash__input mod-dash__input--table"
                                  value={row.wordJp ?? ""}
                                  onChange={(e) => patchVocab(vi, { wordJp: e.target.value })}
                                  lang="ja"
                                />
                              </td>
                              <td>
                                <input
                                  className="mod-dash__input mod-dash__input--table"
                                  value={row.reading ?? ""}
                                  onChange={(e) => patchVocab(vi, { reading: e.target.value })}
                                  lang="ja"
                                />
                              </td>
                              <td>
                                <input
                                  className="mod-dash__input mod-dash__input--table"
                                  value={row.meaningVi ?? ""}
                                  onChange={(e) => patchVocab(vi, { meaningVi: e.target.value })}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mod-dash__muted">
                      Chưa có dòng từ vựng (ví dụ sau khi chỉ trích văn bản). Có thể bổ sung trong HTML bên dưới hoặc chạy lại
                      AI.
                    </p>
                  )}

                  {(draft.grammar || []).length > 0 ? (
                    <div className="mod-dash__grammar-preview">
                      <h4 className="mod-dash__grammar-preview-title">Ngữ pháp (xem nhanh)</h4>
                      <ul className="mod-dash__grammar-preview-list">
                        {(draft.grammar || []).map((g, gi) => (
                          <li key={gi}>
                            <strong>{g.pattern || "—"}</strong>
                            {g.meaningVi ? <span> — {g.meaningVi}</span> : null}
                            {Array.isArray(g.examples) && g.examples.length ? (
                              <div className="mod-dash__grammar-examples">
                                {g.examples.filter(Boolean).map((ex, xi) => (
                                  <span key={xi} className="mod-dash__grammar-ex" lang="ja">
                                    {ex}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {extractedPreview ? (
                    <details className="mod-dash__details">
                      <summary>Xem trước văn bản đã trích (mở rộng — đủ nhiều slide nếu file có chữ thật)</summary>
                      <pre className="mod-dash__preview-pre">{extractedPreview}</pre>
                    </details>
                  ) : null}

                  <div className="mod-dash__draft-box mod-dash__draft-box--in-panel">
                    <h4 className="mod-dash__upload-card-title">Chỉnh trước khi lưu</h4>
                    <label className="mod-dash__paste-label">
                      Tiêu đề
                      <input className="mod-dash__input" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </label>
                    <label className="mod-dash__paste-label">
                      Slug (URL, Latin, không dấu)
                      <input className="mod-dash__input" value={slug} onChange={(e) => setSlug(e.target.value)} />
                    </label>
                    <label className="mod-dash__paste-label">
                      Ước lượng phút
                      <input
                        type="number"
                        min={1}
                        max={240}
                        className="mod-dash__input mod-dash__input--narrow"
                        value={estimatedMinutes}
                        onChange={(e) => setEstimatedMinutes(Number(e.target.value) || 15)}
                      />
                    </label>
                    <label className="mod-dash__paste-label">
                      Nội dung (HTML — mã nguồn)
                      <textarea
                        className="mod-dash__paste-area mod-dash__paste-area--html"
                        rows={10}
                        value={contentHtml}
                        onChange={(e) => setContentHtml(e.target.value)}
                        spellCheck={false}
                      />
                    </label>

                    <details className="mod-dash__format-help">
                      <summary>Định dạng HTML — giải thích &amp; ví dụ (bấm mở)</summary>
                      <div className="mod-dash__format-help-body">
                        <p>
                          Ô phía trên là <strong>mã HTML</strong> nên bạn vẫn thấy thẻ <code>&lt;p&gt;</code>,{' '}
                          <code>&lt;strong&gt;</code>… — đó là bình thường khi soạn. Trang học viên sẽ{' '}
                          <strong>render</strong> thành chữ đẹp; dùng khối <strong>«Xem trưới»</strong> ngay dưới để hình dung.
                        </p>
                        <p>
                          <strong>Mẫu A — một dòng</strong> (từ/kanji + đọc trong ngoặc kiểu Nhật + nghĩa tiếng Việt):
                        </p>
                        <pre className="mod-dash__format-example" tabIndex={0}>
                          <code>{"<p><strong>見る</strong>（みる）— xem, nhìn</p>"}</code>
                        </pre>
                        <p>
                          <strong>Mẫu B — ba dòng</strong> (dòng 1: từ Nhật, dòng 2: chỉ kana, dòng 3: nghĩa Việt):
                        </p>
                        <pre className="mod-dash__format-example" tabIndex={0}>
                          <code>{`<p><strong>勉強</strong></p>
<p>べんきょう</p>
<p>học, ôn bài</p>`}</code>
                        </pre>
                        <p className="mod-dash__format-warn">
                          Cụm «(1) từ/kanji, (2) kana, (3) nghĩa» trong hướng dẫn cũ chỉ là <strong>mô tả vai trò từng dòng</strong>{' '}
                          của mẫu B — <strong>không</strong> phải câu cần chép vào bài. AI đôi khi sinh HTML rối (vd tách{' '}
                          <code>&lt;em&gt;(</code>…); server đã cấm trong prompt và bạn có thể sửa tay theo mẫu A hoặc B.
                        </p>
                      </div>
                    </details>

                    {htmlPreviewSanitized ? (
                      <div className="mod-dash__html-preview-wrap">
                        <div className="mod-dash__html-preview-head">Xem trước (gần giống học viên)</div>
                        <div
                          className="mod-dash__html-preview-body mod-dash__prose-tiny"
                          dangerouslySetInnerHTML={{ __html: htmlPreviewSanitized }}
                        />
                      </div>
                    ) : null}

                    <p className="mod-dash__muted mod-dash__html-structure-hint">
                      Luôn đối chiếu kana/kanji với tài liệu gốc trước khi lưu (vd <strong>あ</strong> không được thành{' '}
                      <strong>か</strong>).
                    </p>
                    <label className="mod-dash__import-check">
                      <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
                      Xuất bản ngay (học viên thấy trên API public)
                    </label>
                    <p className="mod-dash__muted mod-dash__publish-hint">
                      <strong>Không tick</strong> thì bài chỉ là bản nháp: <code>/api/lessons</code> và sidebar trang{' '}
                      <strong>Học tập</strong> sẽ <strong>không</strong> liệt kê bài này. Muốn học viên thấy — bật tick trước khi
                      Lưu (hoặc publish sau trong quản trị nội dung).
                    </p>

                    <div className="mod-dash__quiz-block">
                      <h4 className="mod-dash__quiz-block-title">Quiz trắc nghiệm</h4>
                      <p className="mod-dash__muted mod-dash__quiz-hint">
                        Mỗi câu cần ít nhất 2 đáp án không trống. Chỉ nhập <strong>chữ thuần</strong> (không thẻ HTML); nếu AI
                        trả <code>&lt;strong&gt;…</code> thì đã được làm sạch khi tải bản nháp.
                      </p>
                      {(draft.quiz || []).map((q, qi) => (
                        <div key={qi} className="mod-dash__quiz-row">
                          <div className="mod-dash__quiz-row-head">
                            <span>Câu {qi + 1}</span>
                            <button
                              type="button"
                              className="mod-dash__btn mod-dash__btn--outline mod-dash__btn--sm"
                              onClick={() => removeQuizRow(qi)}
                            >
                              Xóa câu
                            </button>
                          </div>
                          <input
                            className="mod-dash__input"
                            placeholder="Nội dung câu hỏi"
                            value={q.question || ""}
                            onChange={(e) => patchQuiz(qi, { question: e.target.value })}
                          />
                          <div className="mod-dash__quiz-options">
                            {(q.options || ["", "", "", ""]).map((opt, oi) => (
                              <input
                                key={oi}
                                className="mod-dash__input"
                                placeholder={`Đáp án ${oi + 1}`}
                                value={opt}
                                onChange={(e) => patchQuizOption(qi, oi, e.target.value)}
                              />
                            ))}
                          </div>
                          <label className="mod-dash__import-label mod-dash__import-label--inline">
                            Đáp án đúng (0–3 tương ứng ô trên)
                            <select
                              className="mod-dash__select mod-dash__select--narrow"
                              value={Math.min(3, Math.max(0, Number(q.correctIndex) || 0))}
                              onChange={(e) => patchQuiz(qi, { correctIndex: Number(e.target.value) })}
                            >
                              <option value={0}>1</option>
                              <option value={1}>2</option>
                              <option value={2}>3</option>
                              <option value={3}>4</option>
                            </select>
                          </label>
                        </div>
                      ))}
                      <button type="button" className="mod-dash__btn mod-dash__btn--outline mod-dash__btn--sm" onClick={addQuizRow}>
                        + Thêm câu hỏi
                      </button>
                    </div>

                    <button
                      type="button"
                      className="mod-dash__btn mod-dash__btn--primary"
                      disabled={saving || !categoryId}
                      onClick={saveLesson}
                    >
                      {saving ? "Đang lưu…" : "Lưu bài học vào database"}
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            <p className="mod-import__tip">
              <strong>Mẹo tối ưu:</strong> văn bản nguồn rõ chữ giúp AI ổn định Furigana/kana — luôn đối chiếu với file gốc.
            </p>
          </div>

          <div className="mod-import__footer">
            <button type="button" className="mod-import__cta" disabled={busy} onClick={runAi}>
              {loading ? "Đang trích & gọi AI…" : "🚀 Upload & Sinh bằng AI"}
            </button>
            <button
              type="button"
              className="mod-import__help"
              title="Chọn cấp độ và danh mục; tải file hoặc dán text; bấm Upload và sinh AI; chỉnh bảng từ và HTML rồi Lưu. Tick xuất bản để học viên thấy trong Học tập, mục Bài từ hệ thống."
              aria-label="Trợ giúp import"
            >
              ?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
