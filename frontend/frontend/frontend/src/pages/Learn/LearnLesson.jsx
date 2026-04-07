import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import SpeakJaButton from '../../components/learn/SpeakJaButton';
import { ROUTES } from '../../constants/routes';
import { getN5LessonBySlug, N5_LESSONS } from '../../data/n5BeginnerCourse';
import { useAuth } from '../../hooks/useAuth';
import http from '../../services/http';
import {
  japaneseSpeechSupported,
  speakJapaneseFromElement,
  stopJapaneseSpeech,
} from '../../utils/japaneseSpeech';
import { getHiraganaDeckSegmentItems, isHiraganaLesson } from '../../utils/hiraganaLessonDeck';
import { buildApiLessonContentParts } from '../../utils/lessonContentSegments';
import { getLessonBodyHtml } from '../../utils/lessonContentHtml';
import {
  PREFER_VOCAB_COUNT_OVER_PARAGRAPH_DECK,
  tryBuildParagraphDeckFromHtml,
} from '../../utils/lessonParagraphDeck';
import { augmentVocabNumbers1To10 } from '../../utils/lessonVocabFallback';
import { writeN5DoneSlug } from '../../utils/learnProgressStorage';

function phraseMoodFromLabel(labelVi) {
  const s = String(labelVi || '').toLowerCase();
  if (/sáng|buổi sáng|朝|ohayo|おはよう/i.test(s)) return 'morning';
  if (/ngủ ngon|đêm|おやすみ|夜|oyasu/i.test(s)) return 'night';
  if (/tối|chiều|こんばん|konban/i.test(s)) return 'evening';
  if (/chào|hello|こんにち|konnichi/i.test(s)) return 'greeting';
  return 'default';
}

function DialogueBlock({ lines }) {
  return (
    <section className="learn-block learn-block--dialogue">
      <ul className="learn-dialogue">
        {lines.map((line, idx) => (
          <li
            key={idx}
            className={`learn-dialogue__turn ${idx % 2 === 0 ? 'learn-dialogue__turn--a' : 'learn-dialogue__turn--b'}`}
          >
            <div className="learn-dialogue__top">
              <span className="learn-dialogue__avatar" aria-hidden>
                {(line.speaker || '?').trim().charAt(0).toUpperCase()}
              </span>
              <div className="learn-dialogue__body">
                <div className="learn-dialogue__head">
                  <span className="learn-dialogue__speaker">{line.speaker}</span>
                  <SpeakJaButton text={line.jp} label={`Nghe: ${line.jp}`} />
                </div>
                <p className="learn-dialogue__jp" lang="ja">
                  {line.jp}
                </p>
              </div>
            </div>
            <p className="learn-dialogue__romaji">{line.romaji}</p>
            <p className="learn-dialogue__vi">{line.vi}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReadingBodyBlock({ title, jp, vi }) {
  return (
    <section className="learn-block learn-block--reading learn-reading-card">
      {title ? <h3 className="learn-block__h3">{title}</h3> : null}
      <div className="learn-reading-card__jp-row">
        <p className="learn-reading__jp" lang="ja">
          {jp}
        </p>
        <SpeakJaButton text={jp} label="Nghe đoạn đọc" />
      </div>
      <p className="learn-reading__vi">{vi}</p>
    </section>
  );
}

function ComprehensionBlock({ title, items }) {
  return (
    <section className="learn-block learn-block--quiz">
      <h3 className="learn-block__h3">{title}</h3>
      <ol className="learn-comprehension">
        {items.map((it, idx) => (
          <li key={idx} className="learn-comprehension__item">
            <div className="learn-comprehension__jp-row">
              <p className="learn-comprehension__jp" lang="ja">
                {it.qJp}
              </p>
              <SpeakJaButton text={it.qJp} />
            </div>
            <p className="learn-comprehension__vi">{it.qVi}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function KeywordListBlock({ title, items }) {
  return (
    <section className="learn-block learn-block--keywords">
      <h3 className="learn-block__h3">{title}</h3>
      <dl className="learn-keywords">
        {items.map((it, idx) => (
          <div key={idx} className="learn-keywords__row">
            <dt className="learn-keywords__dt">
              <span className="learn-keywords__jp" lang="ja">
                {it.jp}
              </span>
              <SpeakJaButton text={it.jp} />
            </dt>
            <dd className="learn-keywords__vi">{it.vi}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function VocabTableBlock({ title, rows }) {
  return (
    <section className="learn-block learn-block--vocab">
      {title ? <h3 className="learn-block__h3">{title}</h3> : null}
      <div className="learn-vocab-cards" role="list">
        {rows.map((row, idx) => (
          <div key={idx} className="learn-vocab-card" role="listitem">
            <div className="learn-vocab-card__top">
              <span className="learn-vocab-card__word" lang="ja">
                {row.word}
              </span>
              <SpeakJaButton text={row.word} label={`Nghe: ${row.word}`} />
            </div>
            <span className="learn-vocab-card__reading">{row.reading}</span>
            <p className="learn-vocab-card__mean">{row.vi}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PhraseListBlock({ title, items }) {
  return (
    <section className="learn-block learn-block--phrases">
      {title ? <h3 className="learn-block__h3">{title}</h3> : null}
      <ul className="learn-phrases">
        {items.map((it, idx) => (
          <li
            key={idx}
            className="learn-phrases__item learn-phrase-card"
            data-mood={phraseMoodFromLabel(it.labelVi)}
          >
            <div className="learn-phrase-card__inner">
              <div className="learn-phrase-card__header">
                <span className="learn-phrases__label">{it.labelVi}</span>
                <SpeakJaButton text={it.jp} label={`Nghe: ${it.jp}`} />
              </div>
              <p className="learn-phrases__jp" lang="ja">
                {it.jp}
              </p>
              <p className="learn-phrases__romaji">{it.romaji}</p>
              {it.noteVi ? <p className="learn-phrases__note">{it.noteVi}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ComprehensionRevealBlock({ title, items }) {
  return (
    <section className="learn-block learn-block--quiz learn-block--reveal">
      <h3 className="learn-block__h3">{title}</h3>
      <ol className="learn-comprehension learn-comprehension--reveal">
        {items.map((it, idx) => (
          <li key={idx} className="learn-comprehension__item">
            <div className="learn-comprehension__jp-row">
              <p className="learn-comprehension__jp" lang="ja">
                {it.qJp}
              </p>
              <SpeakJaButton text={it.qJp} />
            </div>
            <p className="learn-comprehension__vi">{it.qVi}</p>
            <details className="learn-reveal">
              <summary className="learn-reveal__summary">Xem đáp án</summary>
              <div className="learn-reveal__body">
                <div className="learn-reveal__jp-row">
                  <p className="learn-reveal__jp" lang="ja">
                    {it.aJp}
                  </p>
                  <SpeakJaButton text={it.aJp} label="Nghe đáp án" />
                </div>
                {it.aVi ? <p className="learn-reveal__vi">{it.aVi}</p> : null}
              </div>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}

function KanjiTableBlock({ title, rows }) {
  return (
    <section className="learn-block learn-block--kanji">
      <h3 className="learn-block__h3">{title}</h3>
      <div className="learn-table-wrap">
        <table className="learn-table learn-table--kanji">
          <thead>
            <tr>
              <th scope="col">Hán tự</th>
              <th scope="col">Đọc</th>
              <th scope="col">Nghĩa</th>
              <th scope="col">Ví dụ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className="learn-table__kanji-cell" lang="ja">
                  <span className="learn-table__kanji-wrap">
                    <span className="learn-table__kanji">{row.char}</span>
                    <SpeakJaButton text={row.char} />
                  </span>
                </td>
                <td className="learn-table__reading">{row.reading}</td>
                <td>{row.vi}</td>
                <td className="learn-table__ex learn-table__ex-cell" lang="ja">
                  <span className="learn-table__ex-wrap">
                    {row.ex}
                    {row.ex ? <SpeakJaButton text={row.ex} label="Nghe ví dụ" /> : null}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GrammarBlock({ pattern, meaningVi, examples }) {
  return (
    <section className="learn-block learn-block--grammar">
      <div className="learn-grammar__pattern-row">
        <h3 className="learn-block__grammar-pattern" lang="ja">
          {pattern}
        </h3>
        <SpeakJaButton text={pattern} label="Nghe mẫu ngữ pháp" />
      </div>
      <p className="learn-block__grammar-meaning">{meaningVi}</p>
      <ul className="learn-grammar-examples">
        {examples.map((ex, idx) => (
          <li key={idx} className="learn-grammar-examples__item">
            <div className="learn-grammar-examples__jp-row">
              <p className="learn-grammar-examples__jp" lang="ja">
                {ex.jp}
              </p>
              <SpeakJaButton text={ex.jp} />
            </div>
            {ex.romaji ? (
              <p className="learn-grammar-examples__romaji">{ex.romaji}</p>
            ) : null}
            <p className="learn-grammar-examples__vi">{ex.vi}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function renderBlock(block, index) {
  switch (block.type) {
    case 'dialogue':
      return <DialogueBlock key={index} lines={block.lines} />;
    case 'reading_body':
      return (
        <ReadingBodyBlock
          key={index}
          title={block.title}
          jp={block.jp}
          vi={block.vi}
        />
      );
    case 'comprehension':
      return (
        <ComprehensionBlock key={index} title={block.title} items={block.items} />
      );
    case 'comprehension_reveal':
      return (
        <ComprehensionRevealBlock
          key={index}
          title={block.title}
          items={block.items}
        />
      );
    case 'kanji_table':
      return (
        <KanjiTableBlock key={index} title={block.title} rows={block.rows} />
      );
    case 'keyword_list':
      return (
        <KeywordListBlock key={index} title={block.title} items={block.items} />
      );
    case 'vocab_table':
      return (
        <VocabTableBlock key={index} title={block.title} rows={block.rows} />
      );
    case 'grammar_block':
      return (
        <GrammarBlock
          key={index}
          pattern={block.pattern}
          meaningVi={block.meaningVi}
          examples={block.examples}
        />
      );
    case 'phrase_list':
      return (
        <PhraseListBlock key={index} title={block.title} items={block.items} />
      );
    default:
      return null;
  }
}

const JP_IN_STRING = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\uff66-\uff9f]/;

/** Bài lưu trong DB (moderator import / create-from-draft), đã publish. */
function ApiLessonView({ data }) {
  const { isAuthenticated } = useAuth();
  const { reloadSidebarProgress } = useOutletContext() || {};
  const htmlRef = useRef(null);
  const L = data.lesson ?? data.Lesson;
  const lessonId = L?.id ?? L?.Id;
  const title = L?.title ?? L?.Title ?? '';
  const slug = L?.slug ?? L?.Slug ?? '';
  const categoryName = L?.categoryName ?? L?.CategoryName ?? 'Bài học';
  const content = L?.content ?? L?.Content ?? '';
  const vocabRaw = data.vocabulary ?? data.Vocabulary ?? [];
  const vocab = augmentVocabNumbers1To10(vocabRaw, title, slug);
  const useHiraganaDeck = isHiraganaLesson(title, slug);
  const vocabStructuredCount = vocab.length;
  const paragraphDeckResult =
    !useHiraganaDeck && vocabStructuredCount < PREFER_VOCAB_COUNT_OVER_PARAGRAPH_DECK
      ? tryBuildParagraphDeckFromHtml(content)
      : null;
  const useParagraphDeck = Boolean(paragraphDeckResult && paragraphDeckResult.cardCount >= 3);
  const contentParts = useHiraganaDeck
    ? {
        showSegments: true,
        segmentItems: getHiraganaDeckSegmentItems(),
        suppressMainHtml: true,
        introSource: '',
      }
    : useParagraphDeck
      ? {
          showSegments: false,
          segmentItems: [],
          suppressMainHtml: true,
          introSource: '',
        }
      : buildApiLessonContentParts(content);
  const mainLessonHtml =
    contentParts.showSegments || contentParts.suppressMainHtml
      ? contentParts.introSource.trim()
        ? getLessonBodyHtml(contentParts.introSource)
        : ''
      : getLessonBodyHtml(content);
  const grammar = data.grammar ?? data.Grammar ?? [];
  const quiz = data.quiz ?? data.Quiz ?? [];
  const [saving, setSaving] = useState(false);
  const [markedDone, setMarkedDone] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !lessonId) return undefined;
    let alive = true;
    http
      .get('/api/users/me/progress', { params: { pageSize: 100 } })
      .then((r) => {
        if (!alive) return;
        const items = r.data?.items ?? r.data?.Items ?? [];
        const row = items.find((x) => (x.lessonId ?? x.LessonId) === lessonId);
        if (row) {
          const st = (row.status ?? row.Status ?? '').toLowerCase();
          const pct = Number(row.progressPercent ?? row.ProgressPercent ?? 0);
          if (st === 'completed' || pct >= 100) setMarkedDone(true);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isAuthenticated, lessonId]);

  if (!L) {
    return <Navigate to={ROUTES.LEARN} replace />;
  }

  const markComplete = async () => {
    if (!lessonId || !isAuthenticated) return;
    setSaving(true);
    try {
      await http.post(`/api/lessons/${lessonId}/progress`, {
        progressPercent: 100,
        status: 'completed',
      });
      setMarkedDone(true);
      reloadSidebarProgress?.();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="learn-lesson learn-lesson--from-api">
      <header className="learn-lesson__header learn-lesson__header--lesson">
        <span className="learn-lesson__badge">{categoryName}</span>
        <h2 className="learn-lesson__title">{title}</h2>
      </header>
      {japaneseSpeechSupported() ? (
        <div className="learn-lesson__audio-bar">
          <p className="learn-lesson__audio-bar__text">
            Nút loa trên từng thẻ: nghe từ đó. “Nghe nội dung” đọc cả phần bài + danh sách ôn (giọng máy,
            tùy trình duyệt).
          </p>
          <div className="learn-lesson__audio-bar__actions">
            <button
              type="button"
              className="learn-lesson__audio-bar__btn learn-lesson__audio-bar__btn--play"
              onClick={() => speakJapaneseFromElement(htmlRef.current)}
            >
              Nghe nội dung (tiếng Nhật)
            </button>
            <button type="button" className="learn-lesson__audio-bar__btn" onClick={() => stopJapaneseSpeech()}>
              Dừng
            </button>
          </div>
        </div>
      ) : (
        <p className="learn-lesson__audio-hint">
          Trình duyệt không hỗ trợ đọc tiếng Nhật (Web Speech). Thử Chrome hoặc Edge để có nút loa.
        </p>
      )}
      <div ref={htmlRef} className="learn-lesson__readable-stack">
        {vocab.length > 0 ? (
          <section className="learn-block learn-block--api-extra learn-block--vocab-structured">
            <h3 className="learn-block__h3">Từ vựng</h3>
            <p className="learn-lesson__segments-lead learn-lesson__segments-lead--compact">
              Dữ liệu từ API (từ — phiên âm — nghĩa). Nên bổ sung khi import bài để học viên thấy đúng cấu trúc thẻ,
              thay vì chỉ dựa vào HTML nhiều thẻ p.
            </p>
            <div className="learn-paragraph-deck-grid learn-paragraph-deck-grid--vocab-api" role="list">
              {vocab.map((v) => {
                const w = v.wordJp ?? v.WordJp ?? '';
                const reading = String(v.reading ?? v.Reading ?? '').trim();
                const meaning = String(v.meaningVi ?? v.MeaningVi ?? '').trim();
                const speakText = (reading || w).trim();
                return (
                  <div
                    key={v.id ?? v.Id ?? w}
                    className="learn-vocab-card learn-vocab-card--paragraph-deck"
                    role="listitem"
                  >
                    <div className="learn-vocab-card__paragraph-inner">
                      <div className="learn-vocab-card__text-stack">
                        {w ? (
                          <span className="learn-vocab-card__word learn-vocab-card__word--paragraph" lang="ja">
                            {w}
                          </span>
                        ) : null}
                        {reading ? (
                          <span className="learn-vocab-card__reading learn-vocab-card__reading--paragraph" lang="ja">
                            {reading}
                          </span>
                        ) : null}
                        {meaning ? (
                          <p className="learn-vocab-card__mean learn-vocab-card__mean--paragraph">{meaning}</p>
                        ) : null}
                      </div>
                      {speakText ? (
                        <SpeakJaButton
                          text={speakText}
                          label={`Nghe: ${speakText}`}
                          className="learn-speak-btn--paragraph"
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
        {mainLessonHtml ? (
          <div
            className="learn-lesson__body learn-lesson__html"
            dangerouslySetInnerHTML={{ __html: mainLessonHtml }}
          />
        ) : null}
        {useParagraphDeck && paragraphDeckResult ? (
          <section className="learn-block learn-block--api-extra learn-block--paragraph-deck">
            <h3 className="learn-block__h3">Ôn từng mục</h3>
            <p className="learn-lesson__segments-lead">
              Ôn theo từng mục được gom từ nội dung HTML dạng nhiều đoạn văn bản. Trên mỗi thẻ: chữ Nhật, phiên âm
              kana (nếu có), nghĩa tiếng Việt (nếu có); loa đọc kana hoặc chữ Nhật. Phần nhãn/giải thích tiếng Việt
              dài nằm trong khung ghi chú. Để hiển thị chuẩn, moderator nên soạn mỗi từ thành{' '}
              <strong>ba đoạn liền nhau</strong>: kanji hoặc từ — kana — nghĩa VN (xem hướng dẫn ở màn import bài).
            </p>
            <div className="learn-paragraph-deck-grid" role="list">
              {paragraphDeckResult.items.map((it, i) => {
                if (it.type === 'note') {
                  return (
                    <div key={`pnote-${i}`} className="learn-paragraph-note" role="listitem">
                      {it.text}
                    </div>
                  );
                }
                const jp = it.jp ?? '';
                const reading = (it.reading ?? '').trim();
                const vi = (it.vi ?? '').trim();
                const speakText = (reading || jp).trim();
                return (
                  <div
                    key={`pcard-${i}-${jp.slice(0, 12)}`}
                    className="learn-vocab-card learn-vocab-card--paragraph-deck"
                    role="listitem"
                  >
                    <div className="learn-vocab-card__paragraph-inner">
                      <div className="learn-vocab-card__text-stack">
                        {jp ? (
                          <span className="learn-vocab-card__word learn-vocab-card__word--paragraph" lang="ja">
                            {jp}
                          </span>
                        ) : null}
                        {reading ? (
                          <span className="learn-vocab-card__reading learn-vocab-card__reading--paragraph" lang="ja">
                            {reading}
                          </span>
                        ) : null}
                        {vi ? <p className="learn-vocab-card__mean learn-vocab-card__mean--paragraph">{vi}</p> : null}
                      </div>
                      {speakText ? (
                        <SpeakJaButton text={speakText} label={`Nghe: ${speakText}`} className="learn-speak-btn--paragraph" />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
        {!useParagraphDeck && contentParts.showSegments ? (
          <section className="learn-block learn-block--api-extra learn-block--api-segments">
            <h3 className="learn-block__h3">
              {useHiraganaDeck ? 'Bảng chữ Hiragana' : 'Ôn từng mục'}
            </h3>
            <p className="learn-lesson__segments-lead">
              {useHiraganaDeck
                ? 'Hiragana (chữ lớn) + romaji; ghi chú tiếng Việt khi cần. Bấm loa từng ô. Phần text romaji/tiếng Việt lẫn trong bài nhập không hiển thị — ôn theo bảng chuẩn dưới đây.'
                : 'Mỗi ô có nút loa — nghe phát âm riêng (Web Speech).'}
            </p>
            <div
              className={`learn-vocab-cards learn-vocab-cards--segments${useHiraganaDeck ? ' learn-vocab-cards--hiragana' : ''}`}
              role="list"
            >
              {contentParts.segmentItems.map((it, i) => {
                if (it.section) {
                  return (
                    <h4 key={`sec-${i}`} className="learn-hiragana-section-title">
                      {it.section}
                    </h4>
                  );
                }
                const jp = it.jp ?? '';
                return (
                  <div
                    key={`${jp}-${i}`}
                    className={`learn-vocab-card learn-vocab-card--segment${useHiraganaDeck ? ' learn-vocab-card--hiragana' : ''}`}
                    role="listitem"
                  >
                    <div className="learn-vocab-card__top">
                      <span className="learn-vocab-card__word" lang="ja">
                        {jp}
                      </span>
                      <SpeakJaButton text={jp} label={`Nghe: ${jp}`} />
                    </div>
                    {it.reading ? (
                      <span className="learn-vocab-card__reading learn-vocab-card__reading--deck">
                        {it.reading}
                      </span>
                    ) : null}
                    {it.gloss ? (
                      <p className="learn-vocab-card__mean learn-vocab-card__gloss">{it.gloss}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
      {grammar.length > 0 ? (
        <section className="learn-block learn-block--api-extra">
          <h3 className="learn-block__h3">Ngữ pháp</h3>
          <ul className="learn-api-grammar">
            {grammar.map((g) => {
              const pat = g.pattern ?? g.Pattern ?? '';
              return (
                <li key={g.id ?? g.Id ?? pat}>
                  <span className="learn-api-grammar__row">
                    <strong lang="ja">{pat}</strong>
                    {pat ? <SpeakJaButton text={pat} label={`Nghe: ${pat}`} /> : null}
                    {g.meaningVi ?? g.MeaningVi ? (
                      <span className="learn-api-grammar__mean"> — {g.meaningVi ?? g.MeaningVi}</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {quiz.length > 0 ? (
        <section className="learn-block learn-block--api-extra">
          <h3 className="learn-block__h3">Ôn tập</h3>
          <ol className="learn-api-quiz">
            {quiz.map((q) => {
              const opts = q.options ?? q.Options ?? [];
              const ci = Number(q.correctIndex ?? q.CorrectIndex ?? 0);
              const qText = q.question ?? q.Question ?? '';
              return (
                <li key={q.id ?? q.Id}>
                  <div className="learn-api-quiz__q-row">
                    <p className="learn-api-quiz__q">{qText}</p>
                    {JP_IN_STRING.test(qText) ? <SpeakJaButton text={qText} label="Nghe câu hỏi" /> : null}
                  </div>
                  <ul className="learn-api-quiz__opts">
                    {opts.map((opt, i) => (
                      <li
                        key={i}
                        className={
                          i === ci ? 'learn-api-quiz__opt learn-api-quiz__opt--correct' : 'learn-api-quiz__opt'
                        }
                      >
                        <span className="learn-api-quiz__opt-row">
                          <span className="learn-api-quiz__opt-text">{opt}</span>
                          {JP_IN_STRING.test(String(opt)) ? (
                            <SpeakJaButton text={String(opt)} label="Nghe đáp án" />
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
      <footer className="learn-lesson__footer">
        {isAuthenticated && lessonId ? (
          <div className="learn-lesson__progress-actions">
            {markedDone ? (
              <p className="learn-lesson__done-msg">Đã hoàn thành — có thể ôn tập từ lộ trình.</p>
            ) : (
              <button
                type="button"
                className="learn-lesson__complete-btn"
                disabled={saving}
                onClick={markComplete}
              >
                {saving ? 'Đang lưu…' : 'Hoàn thành bài học'}
              </button>
            )}
          </div>
        ) : null}
        <Link className="learn-lesson__all" to={ROUTES.LEARN}>
          Về lộ trình học
        </Link>
      </footer>
    </article>
  );
}

export default function LearnLesson() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [remote, setRemote] = useState(undefined);
  const [premiumBlock, setPremiumBlock] = useState(null);

  const staticLesson = slug ? getN5LessonBySlug(slug) : null;

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setPremiumBlock(null);
    queueMicrotask(() => {
      if (alive) setRemote(undefined);
    });
    http
      .get(`/api/lessons/slug/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (alive) setRemote(r.data);
      })
      .catch((e) => {
        if (!alive) return;
        if (e?.response?.status === 403) {
          setPremiumBlock({
            message: e?.response?.data?.message || 'Nội dung Premium — cần nâng cấp gói.',
          });
          setRemote(null);
          return;
        }
        setRemote(null);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  if (!slug) {
    return <Navigate to={ROUTES.LEARN} replace />;
  }

  if (premiumBlock) {
    return (
      <article className="learn-lesson learn-lesson--premium-block">
        <header className="learn-lesson__header learn-lesson__header--lesson">
          <span className="learn-lesson__badge">Premium</span>
          <h2 className="learn-lesson__title">Bài học dành cho gói Premium</h2>
          <p className="learn-lesson__desc">{premiumBlock.message}</p>
        </header>
        <p className="learn-lesson__upgrade-hint">
          <Link to={ROUTES.UPGRADE}>Nâng cấp Premium</Link>
          {' · '}
          <Link to={ROUTES.LEARN}>Về lộ trình học</Link>
        </p>
      </article>
    );
  }

  if (remote === undefined) {
    return (
      <article className="learn-lesson learn-lesson--loading">
        <p className="learn-lesson__loading-text">Đang tải nội dung bài học…</p>
      </article>
    );
  }

  if (remote && typeof remote === 'object') {
    return <ApiLessonView data={remote} />;
  }

  if (!staticLesson) {
    return <Navigate to={ROUTES.LEARN} replace />;
  }

  const lesson = staticLesson;
  const idx = N5_LESSONS.findIndex((l) => l.slug === lesson.slug);
  const prev = idx > 0 ? N5_LESSONS[idx - 1] : null;
  const next = idx >= 0 && idx < N5_LESSONS.length - 1 ? N5_LESSONS[idx + 1] : null;

  return (
    <article className="learn-lesson">
      <header className="learn-lesson__header learn-lesson__header--lesson">
        <span className="learn-lesson__badge">{lesson.sectionLabel}</span>
        <h2 className="learn-lesson__title">{lesson.headline}</h2>
        {lesson.description ? (
          <p className="learn-lesson__desc">{lesson.description}</p>
        ) : null}
        {japaneseSpeechSupported() ? (
          <p className="learn-lesson__audio-hint learn-lesson__audio-hint--inline">
            Bấm nút loa cạnh câu tiếng Nhật để nghe phát âm (giọng máy — Chrome/Edge thường ổn hơn).
          </p>
        ) : null}
      </header>
      <div className="learn-lesson__body">{lesson.blocks.map(renderBlock)}</div>
      <footer className="learn-lesson__footer">
        <div className="learn-lesson__pager">
          {prev ? (
            <Link className="learn-lesson__pager-link" to={`${ROUTES.LEARN}/${prev.slug}`}>
              ← {prev.navTitle}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              className="learn-lesson__pager-link learn-lesson__pager-link--next"
              to={`${ROUTES.LEARN}/${next.slug}`}
            >
              {next.navTitle} →
            </Link>
          ) : null}
        </div>
        <div className="learn-lesson__progress-actions learn-lesson__progress-actions--n5">
          <button
            type="button"
            className="learn-lesson__complete-btn learn-lesson__complete-btn--outline"
            onClick={() => {
              writeN5DoneSlug(lesson.slug);
              navigate(ROUTES.LEARN);
            }}
          >
            Đánh dấu xong (N5) — về lộ trình
          </button>
        </div>
        <Link className="learn-lesson__all" to={ROUTES.LEARN}>
          Về lộ trình học
        </Link>
      </footer>
    </article>
  );
}
