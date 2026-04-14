import { useState } from 'react';
import {
  appendModerationLog,
  loadAppendedLog,
  loadInternalNotes,
  modModerationLog,
  saveInternalNotes,
} from '../mockModerator';

function buildInitialLog() {
  const extra = loadAppendedLog();
  return [...extra, ...modModerationLog].slice(0, 40);
}

export function LogsTab() {
  const [notesMap, setNotesMap] = useState(() => loadInternalNotes());
  const [logRows, setLogRows] = useState(buildInitialLog);
  const [board, setBoard] = useState(() => {
    try {
      const raw = localStorage.getItem('yumegoji_mod_board');
      return raw || '';
    } catch {
      return '';
    }
  });
  const [adminReport, setAdminReport] = useState({ userId: '', summary: '', severity: '2' });
  const [toast, setToast] = useState('');

  function persistBoard(text) {
    setBoard(text);
    localStorage.setItem('yumegoji_mod_board', text);
  }

  function submitAdminReport() {
    if (!adminReport.summary.trim()) {
      setToast('Nhập nội dung báo cáo.');
      return;
    }
    const entry = {
      id: `local-${Date.now()}`,
      at: new Date().toLocaleString('vi-VN'),
      action: 'report_to_admin',
      target: adminReport.userId ? `User #${adminReport.userId}` : '—',
      note: `${adminReport.summary} (mức ${adminReport.severity})`,
    };
    appendModerationLog({
      at: entry.at,
      action: entry.action,
      target: entry.target,
      note: entry.note,
    });
    setLogRows((prev) => [entry, ...prev].slice(0, 40));
    setAdminReport({ userId: '', summary: '', severity: '2' });
    setToast('Đã ghi nhận (local) — API gửi Admin có thể nối sau.');
    setTimeout(() => setToast(''), 4000);
  }

  return (
    <div className="mod-dash__panel-stack">
      {toast ? (
        <p className="mod-dash__inline-hint mod-dash__inline-hint--ok" role="status">
          {toast}
        </p>
      ) : null}

      <div className="mod-dash__panel">
        <h2 className="mod-dash__panel-title">Nhật ký kiểm duyệt cá nhân</h2>
        <p className="mod-dash__panel-desc">Kết hợp mẫu + các thao tác bạn đã làm trong phiên (lưu localStorage).</p>
        <div className="mod-dash__table-wrap">
          <table className="mod-dash__table">
            <thead>
              <tr>
                <th>Thời điểm</th>
                <th>Hành động</th>
                <th>Đối tượng</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {logRows.map((row) => (
                <tr key={row.id}>
                  <td className="mod-dash__mono">{row.at}</td>
                  <td>
                    <code className="mod-dash__code">{row.action}</code>
                  </td>
                  <td>{row.target}</td>
                  <td className="mod-dash__td-clip">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mod-dash__panel">
        <h2 className="mod-dash__panel-title">Báo cáo vi phạm lên Admin</h2>
        <p className="mod-dash__panel-desc">Tóm tắt case nghiêm trọng / tái phạm để Admin đình chỉ tài khoản (demo: chỉ ghi log cục bộ).</p>
        <div className="mod-dash__form-grid">
          <label className="mod-dash__field">
            <span>User ID (tuỳ chọn)</span>
            <input
              className="mod-dash__input"
              value={adminReport.userId}
              onChange={(e) => setAdminReport((s) => ({ ...s, userId: e.target.value }))}
              placeholder="vd. 55"
            />
          </label>
          <label className="mod-dash__field">
            <span>Mức độ</span>
            <select
              className="mod-dash__input"
              value={adminReport.severity}
              onChange={(e) => setAdminReport((s) => ({ ...s, severity: e.target.value }))}
            >
              <option value="1">Thấp</option>
              <option value="2">Trung bình</option>
              <option value="3">Cao</option>
            </select>
          </label>
          <label className="mod-dash__field mod-dash__field--full">
            <span>Nội dung báo cáo</span>
            <textarea
              className="mod-dash__paste-area mod-dash__paste-area--sm"
              rows={4}
              value={adminReport.summary}
              onChange={(e) => setAdminReport((s) => ({ ...s, summary: e.target.value }))}
              placeholder="Mô tả vi phạm, bằng chứng, đề xuất hành động…"
            />
          </label>
        </div>
        <button type="button" className="mod-dash__btn mod-dash__btn--primary" onClick={submitAdminReport}>
          Gửi báo cáo (demo)
        </button>
      </div>

      <div className="mod-dash__panel">
        <h2 className="mod-dash__panel-title">Ghi chú nội bộ giữa moderator</h2>
        <p className="mod-dash__panel-desc">Bảng tin chung — lưu trên trình duyệt; đồng bộ server cần API team.</p>
        <textarea
          className="mod-dash__paste-area"
          rows={8}
          value={board}
          onChange={(e) => persistBoard(e.target.value)}
          placeholder="Chia sẻ context case, handoff ca trực…"
        />
        <p className="mod-dash__muted mod-dash__inline-hint">
          Ghi chú theo từng báo cáo nằm ở tab Báo cáo (lưu theo ID báo cáo). Map nội bộ hiện có {Object.keys(notesMap).length} mục.
        </p>
        <button
          type="button"
          className="mod-dash__btn mod-dash__btn--ghost"
          onClick={() => {
            if (window.confirm('Xóa toàn bộ ghi chú theo báo cáo?')) {
              saveInternalNotes({});
              setNotesMap({});
            }
          }}
        >
          Reset ghi chú theo báo cáo
        </button>
      </div>
    </div>
  );
}
