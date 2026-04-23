import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { adminService } from '../../../services/adminService';
import { moderationService } from '../../../services/moderationService';

const Motion = motion;

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
  const reduceMotion = useReducedMotion();

  const sectionReveal = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: { staggerChildren: reduceMotion ? 0 : 0.08, delayChildren: reduceMotion ? 0 : 0.04 },
      },
    }),
    [reduceMotion],
  );

  const blockRise = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } },
    }),
    [reduceMotion],
  );

  const tableStagger = useMemo(
    () => ({
      hidden: {},
      visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.035 } },
    }),
    [reduceMotion],
  );

  const tableRow = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
    }),
    [reduceMotion],
  );

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
    <Motion.div className="admin-dash__tab-inner" variants={sectionReveal} initial="hidden" animate="visible">
      <Motion.div variants={blockRise}>
        <h2 className="admin-dash__section-title admin-dash__section-title--serif">Quản lý kiểm duyệt</h2>
        <p className="admin-dash__section-desc">
          Duyệt đề xuất khóa tài khoản từ moderator, theo dõi báo cáo vi phạm chat và cấu hình từ khóa nhạy cảm toàn hệ thống.
        </p>
      </Motion.div>

      <Motion.div className="admin-dash__subcard" variants={blockRise}>
        <h3 className="admin-dash__subcard-title">Đề xuất đình chỉ từ Moderator</h3>
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
            <Motion.tbody variants={tableStagger} initial="hidden" animate="visible">
              {lockReqs.map((p) => {
                const id = p.id ?? p.Id;
                const busy = lockBusyId === id;
                return (
                  <Motion.tr key={id} className={busy ? 'admin-users__tr--busy' : ''} variants={tableRow}>
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
                  </Motion.tr>
                );
              })}
            </Motion.tbody>
          </table>
          {lockReqs.length === 0 ? (
            <p className="admin-dash__card-sub">Không có đề xuất chờ.</p>
          ) : null}
        </div>
      </Motion.div>

      <Motion.div className="admin-dash__subcard" variants={blockRise}>
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
            <Motion.tbody variants={tableStagger} initial="hidden" animate="visible">
              {reports.slice(0, 80).map((r) => (
                <Motion.tr key={r.id ?? r.Id} variants={tableRow}>
                  <td>{r.id ?? r.Id}</td>
                  <td>{r.type ?? r.Type}</td>
                  <td>{r.status ?? r.Status}</td>
                  <td>{new Date(r.createdAt ?? r.CreatedAt).toLocaleString('vi-VN')}</td>
                </Motion.tr>
              ))}
            </Motion.tbody>
          </table>
        </div>
      </Motion.div>

      <Motion.div className="admin-dash__subcard" variants={blockRise}>
        <h3 className="admin-dash__subcard-title">Blacklist từ khóa nhạy cảm (toàn hệ thống)</h3>
        {kwErr ? <div className="admin-users__alert">{kwErr}</div> : null}
        <div className="admin-dash__filter-row">
          <label>
            Từ khóa
            <input className="admin-dash__select" style={{ minWidth: '12rem' }} value={newKw} onChange={(e) => setNewKw(e.target.value)} />
          </label>
          <label>
            Mức (1–3)
            <select className="admin-dash__select" value={newSev} onChange={(e) => setNewSev(Number(e.target.value))}>
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
            <Motion.tbody variants={tableStagger} initial="hidden" animate="visible">
              {keywords.map((k) => {
                const id = k.id ?? k.Id;
                const active = k.isActive ?? k.IsActive;
                return (
                  <Motion.tr key={id} variants={tableRow}>
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
                  </Motion.tr>
                );
              })}
            </Motion.tbody>
          </table>
        </div>
      </Motion.div>
    </Motion.div>
  );
}
