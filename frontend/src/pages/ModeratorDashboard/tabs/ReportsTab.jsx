import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chatService } from '../../../services/chatService';
import { moderationService } from '../../../services/moderationService';
import {
  appendModerationLog,
  labelReportType,
  labelSeverity,
  loadInternalNotes,
  REPORT_STATUS_OPTIONS,
  REPORT_TYPE_OPTIONS,
  saveInternalNotes,
  SEVERITY_OPTIONS,
} from '../mockModerator';

const LS_MUTES = 'yumegoji_mod_chat_mutes';

function loadMutes() {
  try {
    const raw = localStorage.getItem(LS_MUTES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMutes(m) {
  localStorage.setItem(LS_MUTES, JSON.stringify(m));
}

function mapApiReport(r) {
  const id = r.id ?? r.Id;
  const desc = r.description ?? r.Description ?? '';
  return {
    id: `db-${id}`,
    dbId: id,
    reportedUser: r.reportedUsername || (r.reportedUserId != null ? `user#${r.reportedUserId}` : '—'),
    reportedUserId: r.reportedUserId ?? r.ReportedUserId,
    reportedEmail: null,
    reporterLabel: r.reporterUsername || `Người dùng #${r.reporterId ?? r.ReporterId}`,
    reporterUsername: r.reporterUsername || r.ReporterUsername || `id${r.reporterId ?? r.ReporterId}`,
    reporterUserId: r.reporterId ?? r.ReporterId,
    reporterEmail: null,
    reason: labelReportType(r.type ?? r.Type),
    reportType: r.type ?? r.Type,
    severity: r.severity ?? r.Severity,
    status: r.status ?? r.Status ?? 'pending',
    reasonTone: 'danger',
    content: desc.length > 100 ? `${desc.slice(0, 100)}…` : desc || '—',
    fullContent: desc || '—',
    room: r.roomId != null || r.RoomId != null ? `Phòng #${r.roomId ?? r.RoomId}` : '—',
    roomId: r.roomId ?? r.RoomId,
    messageId: r.messageId ?? r.MessageId,
    time: new Date(r.createdAt ?? r.CreatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    violationHistory: [],
  };
}

export function ReportsTab() {
  const [rows, setRows] = useState([]);
  const [source, setSource] = useState('idle');
  const [loading, setLoading] = useState(false);
  const [apiErr, setApiErr] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [warnOpen, setWarnOpen] = useState(null);
  const [warnReason, setWarnReason] = useState('');
  const [internalNotes, setInternalNotes] = useState(() => loadInternalNotes());
  const [mutes, setMutes] = useState(() => loadMutes());
  const [feedback, setFeedback] = useState('');
  const [historyByUser, setHistoryByUser] = useState({});
  const wrapRef = useRef(null);

  const loadFromApi = useCallback(async () => {
    setLoading(true);
    setApiErr(null);
    try {
      const list = await moderationService.listStaffReports({
        type: filterType || undefined,
        severity: filterSeverity ? Number(filterSeverity) : undefined,
        status: filterStatus || undefined,
        limit: 100,
      });
      setRows(Array.isArray(list) ? list.map(mapApiReport) : []);
      setSource('api');
    } catch (e) {
      setApiErr(e?.message || 'Không gọi được API (kiểm tra quyền moderator và backend).');
      setRows([]);
      setSource('error');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterSeverity, filterStatus]);

  useEffect(() => {
    loadFromApi();
  }, [loadFromApi]);

  useEffect(() => {
    if (!openMenuId) return undefined;
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenMenuId(null);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openMenuId]);

  /** Bộ lọc đã gửi lên API — không lọc lại mock cục bộ. */
  const filtered = useMemo(() => rows, [rows]);

  useEffect(() => {
    const uid = detail?.reportedUserId;
    if (uid == null) return undefined;
    let cancelled = false;
    moderationService
      .listUserWarnings(uid, 30)
      .then((w) => {
        if (!cancelled) setHistoryByUser((prev) => ({ ...prev, [uid]: w }));
      })
      .catch(() => {
        if (!cancelled) setHistoryByUser((prev) => ({ ...prev, [uid]: [] }));
      });
    return () => {
      cancelled = true;
    };
  }, [detail]);

  function setNoteFor(id, text) {
    const next = { ...internalNotes, [id]: text };
    setInternalNotes(next);
    saveInternalNotes(next);
  }

  function pushFeedback(msg) {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 5000);
  }

  async function markResolved(r, status) {
    if (r.dbId) {
      try {
        await moderationService.resolveReport(r.dbId, {
          status,
          resolutionNote: internalNotes[r.id] || '',
        });
      } catch (e) {
        pushFeedback(e?.message || 'Lỗi khi cập nhật báo cáo');
        return;
      }
    }
    appendModerationLog({
      at: new Date().toISOString(),
      action: status === 'dismissed' ? 'dismiss_report' : 'resolve_report',
      target: r.dbId ? `Report #${r.dbId}` : r.id,
      note: internalNotes[r.id] || status,
    });
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status } : x)));
    setOpenMenuId(null);
    setDetail(null);
    pushFeedback(status === 'dismissed' ? 'Đã đánh dấu bỏ qua.' : 'Đã đánh dấu đã xử lý.');
    if (source === 'api') void loadFromApi();
  }

  async function sendWarning(r) {
    if (!warnReason.trim()) {
      pushFeedback('Nhập lý do cảnh cáo.');
      return;
    }
    if (!r.reportedUserId) {
      pushFeedback('Thiếu user bị báo.');
      return;
    }
    try {
      await moderationService.issueWarning({
        userId: r.reportedUserId,
        reason: warnReason.trim(),
        reportId: r.dbId ?? null,
      });
    } catch (e) {
      pushFeedback(e?.response?.data?.message || e?.message || 'Không gửi được cảnh cáo (API).');
      return;
    }
    appendModerationLog({
      at: new Date().toISOString(),
      action: 'issue_warning',
      target: `User #${r.reportedUserId}`,
      note: warnReason.trim(),
    });
    setWarnOpen(null);
    setWarnReason('');
    pushFeedback('Đã ghi cảnh cáo vào hồ sơ (warnings).');
  }

  function applyMute(r, hours) {
    if (!r.reportedUserId) return;
    const until = new Date(Date.now() + hours * 3600000).toISOString();
    const next = { ...mutes, [r.reportedUserId]: until };
    setMutes(next);
    saveMutes(next);
    appendModerationLog({
      at: new Date().toISOString(),
      action: 'mute_chat',
      target: `User #${r.reportedUserId}`,
      note: `${hours}h (local demo)`,
    });
    setOpenMenuId(null);
    pushFeedback(`Đã đặt mute chat ${hours}h (lưu cục bộ — nối API mute sau).`);
  }

  async function deleteViolatingMessage(r) {
    if (!r.roomId || !r.messageId) {
      pushFeedback('Thiếu roomId/messageId — chỉ demo.');
      return;
    }
    if (!window.confirm('Xóa tin nhắn vi phạm khỏi phòng?')) return;
    try {
      await chatService.deleteMessageAsModerator(r.roomId, r.messageId);
      pushFeedback('Đã xóa tin (moderate).');
    } catch (e) {
      pushFeedback(e?.message || 'Không xóa được tin.');
    }
    setOpenMenuId(null);
  }

  async function escalateToAdmin(r) {
    if (!r.dbId) {
      pushFeedback('Thiếu ID báo cáo trên server.');
      return;
    }
    try {
      await moderationService.escalateLockRequest(r.dbId, internalNotes[r.id] || `Đề xuất khóa tài khoản user #${r.reportedUserId}`);
      appendModerationLog({
        at: new Date().toISOString(),
        action: 'escalate_admin',
        target: `User #${r.reportedUserId}`,
        note: internalNotes[r.id] || 'pending_admin_lock',
      });
      pushFeedback('Đã gửi đề xuất khóa tài khoản cho Admin.');
      setOpenMenuId(null);
      if (source === 'api') await loadFromApi();
    } catch (e) {
      pushFeedback(e?.response?.data?.message || e?.message || 'Không gửi được đề xuất lên admin.');
    }
  }

  function statusPill(status) {
    if (status === 'resolved') return 'mod-dash__pill mod-dash__pill--ok';
    if (status === 'dismissed') return 'mod-dash__pill mod-dash__pill--muted';
    return 'mod-dash__pill mod-dash__pill--warn';
  }

  return (
    <div className="mod-dash__panel">
      <div className="mod-dash__panel-head mod-dash__panel-head--row">
        <div>
          <h2 className="mod-dash__panel-title">Quản lý báo cáo &amp; xử lý vi phạm</h2>
          <p className="mod-dash__panel-desc">
            Lọc theo loại / mức độ / trạng thái; xem chi tiết nội dung, lịch sử cảnh cáo, cảnh báo, mute, xóa tin, đề xuất Admin, ghi chú nội bộ.
          </p>
        </div>
        <button type="button" className="mod-dash__btn mod-dash__btn--ghost" onClick={loadFromApi} disabled={loading}>
          ⟳ Tải lại
        </button>
      </div>

      <div className="mod-dash__filters" ref={wrapRef}>
        <label className="mod-dash__filter-field">
          <span>Loại</span>
          <select className="mod-dash__input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            {REPORT_TYPE_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="mod-dash__filter-field">
          <span>Mức độ</span>
          <select className="mod-dash__input" value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="mod-dash__filter-field">
          <span>Trạng thái</span>
          <select className="mod-dash__input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            {REPORT_STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <span className="mod-dash__filter-meta">
          Nguồn:{' '}
          <strong>
            {source === 'api'
              ? 'API · GET /api/Moderation/staff/reports'
              : source === 'error'
                ? 'Lỗi tải'
                : '—'}
          </strong>
        </span>
      </div>

      {apiErr ? (
        <p className="mod-dash__inline-hint mod-dash__inline-hint--warn" role="status">
          {apiErr}
        </p>
      ) : null}
      {feedback ? (
        <p className="mod-dash__inline-hint mod-dash__inline-hint--ok" role="status">
          {feedback}
        </p>
      ) : null}
      {loading ? <p className="mod-dash__muted mod-dash__inline-hint">Đang tải…</p> : null}

      <div className="mod-dash__table-wrap">
        <table className="mod-dash__table mod-dash__table--reports">
          <thead>
            <tr>
              <th>Đối chiếu tài khoản</th>
              <th>Loại / mức</th>
              <th>Nội dung</th>
              <th>Phòng</th>
              <th>Trạng thái</th>
              <th>Giờ</th>
              <th className="mod-dash__th-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {!loading && source === 'api' && filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="mod-dash__muted" style={{ textAlign: 'center', padding: '1.5rem' }}>
                  Chưa có báo cáo nào trong hệ thống (hoặc không khớp bộ lọc). Học viên gửi báo cáo qua ứng dụng sẽ hiện
                  tại đây.
                </td>
              </tr>
            ) : null}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="mod-dash__report-identities" role="group" aria-label="Đối chiếu người bị báo và người báo cáo">
                    <div className="mod-dash__account-link-grid">
                      <div className="mod-dash__account-card mod-dash__account-card--reported">
                        <span className="mod-dash__account-card-label mod-dash__account-card-label--reported">Bị báo cáo</span>
                        <span className="mod-dash__mono mod-dash__account-username">@{r.reportedUser}</span>
                        <div className="mod-dash__account-field">
                          <span className="mod-dash__account-field-label">User ID</span>
                          <code className="mod-dash__code mod-dash__code--id">{r.reportedUserId ?? '—'}</code>
                        </div>
                        {r.reportedEmail ? (
                          <div className="mod-dash__account-field">
                            <span className="mod-dash__account-field-label">Email</span>
                            <a className="mod-dash__account-mail" href={`mailto:${r.reportedEmail}`}>
                              {r.reportedEmail}
                            </a>
                          </div>
                        ) : null}
                      </div>
                      <div className="mod-dash__account-connector" aria-hidden="true">
                        <span className="mod-dash__connector-rail" />
                        <span className="mod-dash__connector-badge" title="Liên kết trong cùng báo cáo">
                          ⇄
                        </span>
                        <span className="mod-dash__connector-rail" />
                      </div>
                      <div className="mod-dash__account-card mod-dash__account-card--reporter">
                        <span className="mod-dash__account-card-label mod-dash__account-card-label--reporter">Người báo cáo</span>
                        <span className="mod-dash__person-inline">{r.reporterLabel}</span>
                        <span className="mod-dash__mono mod-dash__account-username">@{r.reporterUsername}</span>
                        <div className="mod-dash__account-field">
                          <span className="mod-dash__account-field-label">User ID</span>
                          <code className="mod-dash__code mod-dash__code--id">{r.reporterUserId}</code>
                        </div>
                        {r.reporterEmail ? (
                          <div className="mod-dash__account-field">
                            <span className="mod-dash__account-field-label">Email</span>
                            <a className="mod-dash__account-mail" href={`mailto:${r.reporterEmail}`}>
                              {r.reporterEmail}
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="mod-dash__pill mod-dash__pill--danger">{r.reason}</span>
                  <div className="mod-dash__muted mod-dash__mt-xs">{labelSeverity(r.severity)}</div>
                </td>
                <td className="mod-dash__td-clip">{r.content}</td>
                <td>
                  <span className="mod-dash__pill mod-dash__pill--room">{r.room}</span>
                  {r.messageId ? (
                    <div className="mod-dash__muted mod-dash__mt-xs">
                      msg #{r.messageId}
                    </div>
                  ) : null}
                </td>
                <td>
                  <span className={statusPill(r.status)}>{r.status === 'pending' ? 'Chờ xử lý' : r.status === 'resolved' ? 'Đã xử lý' : 'Đã bỏ qua'}</span>
                  {r.reportedUserId && mutes[r.reportedUserId] ? (
                    <div className="mod-dash__muted mod-dash__mt-xs">Mute đến {new Date(mutes[r.reportedUserId]).toLocaleString('vi-VN')}</div>
                  ) : null}
                </td>
                <td className="mod-dash__mono">{r.time}</td>
                <td>
                  <div className="mod-dash__action-cell mod-dash__action-cell--split">
                    <button type="button" className="mod-dash__btn mod-dash__btn--ghost mod-dash__btn--sm" onClick={() => setDetail(r)}>
                      Chi tiết
                    </button>
                    <button
                      type="button"
                      className="mod-dash__btn mod-dash__btn--outline mod-dash__btn--sm"
                      onClick={() => setOpenMenuId((x) => (x === r.id ? null : r.id))}
                      aria-expanded={openMenuId === r.id}
                    >
                      Hành động ▾
                    </button>
                    {openMenuId === r.id ? (
                      <div className="mod-dash__action-menu mod-dash__action-menu--tall" role="menu">
                        <button type="button" className="mod-dash__action-item" role="menuitem" onClick={() => { setWarnOpen(r); setOpenMenuId(null); }}>
                          <span className="mod-dash__action-ico mod-dash__action-ico--warn" aria-hidden>
                            ⚠
                          </span>
                          <span>
                            <strong>Cảnh cáo (warnings)</strong>
                            <small>Ghi vào hồ sơ người dùng</small>
                          </span>
                        </button>
                        <div className="mod-dash__menu-sep" />
                        <div className="mod-dash__menu-heading">Tạm khóa chat (mute)</div>
                        <button type="button" className="mod-dash__action-item" role="menuitem" onClick={() => applyMute(r, 1)}>
                          <span>1 giờ</span>
                        </button>
                        <button type="button" className="mod-dash__action-item" role="menuitem" onClick={() => applyMute(r, 24)}>
                          <span>24 giờ</span>
                        </button>
                        <button type="button" className="mod-dash__action-item" role="menuitem" onClick={() => applyMute(r, 168)}>
                          <span>7 ngày</span>
                        </button>
                        <div className="mod-dash__menu-sep" />
                        <button type="button" className="mod-dash__action-item" role="menuitem" onClick={() => deleteViolatingMessage(r)}>
                          <span>
                            <strong>Xóa tin nhắn vi phạm</strong>
                            <small>DELETE …/moderate</small>
                          </span>
                        </button>
                        <button type="button" className="mod-dash__action-item" role="menuitem" onClick={() => void escalateToAdmin(r)}>
                          <span className="mod-dash__action-ico mod-dash__action-ico--lock" aria-hidden>
                            ⊘
                          </span>
                          <span>
                            <strong>Đề xuất đình chỉ lên Admin</strong>
                            <small>Chuyển trạng thái pending_admin_lock</small>
                          </span>
                        </button>
                        <div className="mod-dash__menu-sep" />
                        <button type="button" className="mod-dash__action-item" role="menuitem" onClick={() => markResolved(r, 'resolved')}>
                          <span>
                            <strong>Đánh dấu đã xử lý</strong>
                          </span>
                        </button>
                        <button type="button" className="mod-dash__action-item mod-dash__action-item--muted" role="menuitem" onClick={() => markResolved(r, 'dismissed')}>
                          <span>
                            <strong>Bỏ qua báo cáo</strong>
                          </span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail ? (
        <div className="mod-dash__drawer-backdrop" role="presentation" onClick={() => setDetail(null)}>
          <aside className="mod-dash__drawer" role="dialog" aria-labelledby="mod-detail-title" onClick={(e) => e.stopPropagation()}>
            <div className="mod-dash__drawer-head">
              <h3 id="mod-detail-title">Chi tiết báo cáo</h3>
              <button type="button" className="mod-dash__btn mod-dash__btn--ghost" onClick={() => setDetail(null)}>
                Đóng
              </button>
            </div>
            <div className="mod-dash__drawer-body">
              <section>
                <h4>Nội dung bị báo cáo</h4>
                <p className="mod-dash__detail-text">{detail.fullContent}</p>
              </section>
              <section>
                <h4>Lịch sử vi phạm / cảnh cáo (người bị báo)</h4>
                {detail.reportedUserId ? (
                  <ul className="mod-dash__history-list">
                    {(detail.violationHistory || []).map((h) => (
                      <li key={h.id}>
                        <span className="mod-dash__mono">{h.at}</span> — {h.reason}{' '}
                        <span className="mod-dash__muted">({h.moderator})</span>
                      </li>
                    ))}
                    {(historyByUser[detail.reportedUserId] || []).map((w) => (
                      <li key={w.id ?? w.Id}>
                        <span className="mod-dash__mono">
                          {new Date(w.createdAt ?? w.CreatedAt).toLocaleString('vi-VN')}
                        </span>{' '}
                        — {w.reason ?? w.Reason}{' '}
                        <span className="mod-dash__muted">(mod #{w.moderatorId ?? w.ModeratorId})</span>
                      </li>
                    ))}
                    {!detail.violationHistory?.length && !(historyByUser[detail.reportedUserId] || []).length ? (
                      <li className="mod-dash__muted">Chưa có bản ghi API / mẫu.</li>
                    ) : null}
                  </ul>
                ) : (
                  <p className="mod-dash__muted">Không có user ID.</p>
                )}
              </section>
              <section>
                <h4>Ghi chú nội bộ (mod khác sẽ thấy khi nối API; hiện lưu cục bộ)</h4>
                <textarea
                  className="mod-dash__paste-area mod-dash__paste-area--sm"
                  rows={4}
                  value={internalNotes[detail.id] || ''}
                  onChange={(e) => setNoteFor(detail.id, e.target.value)}
                  placeholder="Ghi chú handoff, bối cảnh…"
                />
              </section>
            </div>
          </aside>
        </div>
      ) : null}

      {warnOpen ? (
        <div className="mod-dash__drawer-backdrop" role="presentation" onClick={() => setWarnOpen(null)}>
          <div className="mod-dash__modal" role="dialog" aria-labelledby="mod-warn-title" onClick={(e) => e.stopPropagation()}>
            <h3 id="mod-warn-title">Gửi cảnh cáo</h3>
            <p className="mod-dash__muted">User #{warnOpen.reportedUserId}</p>
            <textarea
              className="mod-dash__paste-area mod-dash__paste-area--sm"
              rows={4}
              value={warnReason}
              onChange={(e) => setWarnReason(e.target.value)}
              placeholder="Lý do cảnh cáo…"
            />
            <div className="mod-dash__modal-actions">
              <button type="button" className="mod-dash__btn mod-dash__btn--ghost" onClick={() => setWarnOpen(null)}>
                Hủy
              </button>
              <button type="button" className="mod-dash__btn mod-dash__btn--primary" onClick={() => sendWarning(warnOpen)}>
                Gửi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
