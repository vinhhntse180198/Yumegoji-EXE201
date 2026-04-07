import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminService } from '../../../services/adminService';
import { moderationService } from '../../../services/moderationService';

export function ModerationAdminTab() {
  const [reports, setReports] = useState([]);
  const [repErr, setRepErr] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [kwErr, setKwErr] = useState(null);
  const [newKw, setNewKw] = useState('');
  const [newSev, setNewSev] = useState(1);
  const [lockReqs, setLockReqs] = useState([]);
  const [lockErr, setLockErr] = useState(null);
  const [lockBusyId, setLockBusyId] = useState(0);
  const [lockNoteById, setLockNoteById] = useState({});

  const loadReports = useCallback(async () => {
    setRepErr(null);
    try {
      const list = await moderationService.listStaffReports({ limit: 150 });
      setReports(Array.isArray(list) ? list : []);
    } catch (e) {
      setRepErr(e?.message || 'Không tải danh sách báo cáo.');
      setReports([]);
    }
  }, []);

  const loadKw = useCallback(async () => {
    setKwErr(null);
    try {
      const list = await adminService.listSensitiveKeywords();
      setKeywords(Array.isArray(list) ? list : []);
    } catch (e) {
      setKwErr(e?.message || 'Không tải từ khóa (cần quyền admin).');
      setKeywords([]);
    }
  }, []);

  const loadLockReqs = useCallback(async () => {
    setLockErr(null);
    try {
      const list = await moderationService.listAdminLockRequests({ status: 'pending_admin_lock', limit: 100 });
      setLockReqs(Array.isArray(list) ? list : []);
    } catch (e) {
      setLockErr(e?.response?.data?.message || e?.message || 'Không tải được đề xuất khóa tài khoản.');
      setLockReqs([]);
    }
  }, []);

  useEffect(() => {
    void loadReports();
    void loadKw();
    void loadLockReqs();
  }, [loadReports, loadKw, loadLockReqs]);

  const modStats = useMemo(() => {
    const map = new Map();
    for (const r of reports) {
      const mid = r.assignedModeratorId ?? r.AssignedModeratorId;
      if (mid == null) continue;
      map.set(mid, (map.get(mid) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([id, cnt]) => ({ id, cnt }))
      .sort((a, b) => b.cnt - a.cnt);
  }, [reports]);

  async function addKeyword() {
    if (!newKw.trim()) return;
    try {
      await adminService.createSensitiveKeyword({ keyword: newKw.trim(), severity: Number(newSev) });
      setNewKw('');
      await loadKw();
    } catch (e) {
      setKwErr(e?.response?.data?.message || e?.message);
    }
  }

  async function toggleKw(k) {
    try {
      await adminService.updateSensitiveKeyword(k.id ?? k.Id, { isActive: !(k.isActive ?? k.IsActive) });
      await loadKw();
    } catch (e) {
      setKwErr(e?.message);
    }
  }

  async function deleteKw(id) {
    if (!window.confirm('Xóa từ khóa?')) return;
    try {
      await adminService.deleteSensitiveKeyword(id);
      await loadKw();
    } catch (e) {
      setKwErr(e?.message);
    }
  }

  async function resolveLockRequest(id, approve) {
    setLockBusyId(id);
    setLockErr(null);
    try {
      const note = lockNoteById[id] || '';
      if (approve) {
        await moderationService.approveAdminLockRequest(id, note);
      } else {
        await moderationService.rejectAdminLockRequest(id, note);
      }
      await loadLockReqs();
    } catch (e) {
      setLockErr(e?.response?.data?.message || e?.message || 'Không xử lý được đề xuất khóa.');
    } finally {
      setLockBusyId(0);
    }
  }

  return (
    <div className="admin-dash__tab-inner">
      <h2 className="admin-dash__section-title">Quản lý kiểm duyệt</h2>
      <p className="admin-dash__section-desc">
        Báo cáo từ <code className="admin-dash__code-inline">GET /api/Moderation/staff/reports</code>; blacklist từ{' '}
        <code className="admin-dash__code-inline">/api/Admin/sensitive-keywords</code>.
      </p>

      <div className="admin-dash__subcard">
        <h3 className="admin-dash__subcard-title">Đề xuất đình chỉ từ Moderator</h3>
        <p className="admin-dash__card-sub">Nguồn realtime từ báo cáo có trạng thái pending_admin_lock.</p>
        {lockErr ? <div className="admin-users__alert">{lockErr}</div> : null}
        <div className="admin-users__table-scroll">
          <table className="admin-users__table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Moderator</th>
                <th>User ID</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th>Ghi chú admin</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lockReqs.map((p) => {
                const id = p.id ?? p.Id;
                const busy = lockBusyId === id;
                return (
                  <tr key={id} className={busy ? 'admin-users__tr--busy' : ''}>
                    <td>#{id}</td>
                    <td>{p.reporterUsername ?? p.ReporterUsername ?? `mod#${p.reporterId ?? p.ReporterId}`}</td>
                    <td>{p.reportedUserId ?? p.ReportedUserId}</td>
                    <td>{p.resolutionNote ?? p.ResolutionNote ?? p.description ?? p.Description ?? '—'}</td>
                    <td>{p.status ?? p.Status}</td>
                    <td style={{ minWidth: '220px' }}>
                      <input
                        className="admin-dash__select"
                        value={lockNoteById[id] ?? ''}
                        placeholder="Lý do duyệt/từ chối"
                        onChange={(e) => setLockNoteById((prev) => ({ ...prev, [id]: e.target.value }))}
                      />
                    </td>
                    <td>
                      <button type="button" className="admin-users__action" onClick={() => void resolveLockRequest(id, true)} disabled={busy}>
                        Phê duyệt
                      </button>
                      <button type="button" className="admin-users__action" onClick={() => void resolveLockRequest(id, false)} disabled={busy}>
                        Từ chối
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {lockReqs.length === 0 ? (
            <p className="admin-dash__card-sub">Không có đề xuất chờ.</p>
          ) : null}
        </div>
      </div>

      <div className="admin-dash__subcard">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 className="admin-dash__subcard-title">Tất cả báo cáo</h3>
          <button type="button" className="admin-dash__btn admin-dash__btn--ghost" onClick={() => void loadReports()}>
            Làm mới
          </button>
        </div>
        {repErr ? <div className="admin-users__alert">{repErr}</div> : null}
        <div className="admin-users__table-scroll">
          <table className="admin-users__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Loại</th>
                <th>Trạng thái</th>
                <th>Ngày</th>
              </tr>
            </thead>
            <tbody>
              {reports.slice(0, 80).map((r) => (
                <tr key={r.id ?? r.Id}>
                  <td>{r.id ?? r.Id}</td>
                  <td>{r.type ?? r.Type}</td>
                  <td>{r.status ?? r.Status}</td>
                  <td>{new Date(r.createdAt ?? r.CreatedAt).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-dash__subcard">
        <h3 className="admin-dash__subcard-title">Hiệu suất Moderator (theo báo cáo đã gán)</h3>
        <p className="admin-dash__card-sub">Đếm theo AssignedModeratorId trong DB.</p>
        <ul className="admin-dash__bar-list">
          {modStats.length === 0 ? <li className="admin-dash__card-sub">Chưa có báo cáo gán mod.</li> : null}
          {modStats.map((m) => (
            <li key={m.id}>
              <div className="admin-dash__bar-head">
                <span>Moderator #{m.id}</span>
                <strong>{m.cnt} báo cáo</strong>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="admin-dash__subcard">
        <h3 className="admin-dash__subcard-title">Blacklist từ khóa nhạy cảm (toàn hệ thống)</h3>
        <p className="admin-dash__card-sub">Áp dụng khi gửi tin chat (ScanSensitiveKeywordsAsync).</p>
        {kwErr ? <div className="admin-users__alert">{kwErr}</div> : null}
        <div className="admin-dash__filter-row">
          <label>
            Từ khóa
            <input className="admin-dash__select" style={{ minWidth: '12rem' }} value={newKw} onChange={(e) => setNewKw(e.target.value)} />
          </label>
          <label>
            Mức (1–3)
            <select className="admin-dash__select" value={newSev} onChange={(e) => setNewSev(e.target.value)}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>
          <button type="button" className="admin-dash__btn admin-dash__btn--primary" onClick={() => void addKeyword()}>
            Thêm
          </button>
          <button type="button" className="admin-dash__btn admin-dash__btn--ghost" onClick={() => void loadKw()}>
            Tải lại
          </button>
        </div>
        <div className="admin-users__table-scroll">
          <table className="admin-users__table">
            <thead>
              <tr>
                <th>Từ khóa</th>
                <th>Mức</th>
                <th>Hoạt động</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {keywords.map((k) => {
                const id = k.id ?? k.Id;
                const active = k.isActive ?? k.IsActive;
                return (
                  <tr key={id}>
                    <td>{k.keyword ?? k.Keyword}</td>
                    <td>{k.severity ?? k.Severity}</td>
                    <td>{active ? 'Có' : 'Tắt'}</td>
                    <td>
                      <button type="button" className="admin-users__action" onClick={() => void toggleKw(k)}>
                        {active ? 'Tắt' : 'Bật'}
                      </button>
                      <button type="button" className="admin-users__action admin-users__action--danger" onClick={() => void deleteKw(id)}>
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-dash__subcard">
        <h3 className="admin-dash__subcard-title">Cảnh báo tự động</h3>
        <p className="admin-dash__card-sub">
          Đã có cảnh báo từ khóa khi gửi tin; có thể mở rộng rule engine (điểm tin cậy, rate limit) ở backend sau.
        </p>
      </div>
    </div>
  );
}
