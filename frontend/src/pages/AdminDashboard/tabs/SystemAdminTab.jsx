import { useCallback, useEffect, useState } from 'react';
import { adminService } from '../../../services/adminService';
import { moderationService } from '../../../services/moderationService';

const LS_POL = 'yumegoji_admin_policies_v1';

function rowId(r) {
  return r.id ?? r.Id;
}

function isTerminalStatus(s) {
  const v = String(s ?? '').toLowerCase();
  return v === 'resolved' || v === 'dismissed' || v === 'lock_approved' || v === 'lock_rejected';
}

export function SystemAdminTab() {
  const [ov, setOv] = useState(null);
  const [reports, setReports] = useState([]);
  const [apiErr, setApiErr] = useState('');
  const [repBusyId, setRepBusyId] = useState(0);
  const [notes, setNotes] = useState({});
  const [policies, setPolicies] = useState(() => {
    try {
      return localStorage.getItem(LS_POL) || 'Điều khoản dịch vụ (bản nháp)…\n\nChính sách bảo mật (bản nháp)…';
    } catch {
      return '';
    }
  });
  const [broadcast, setBroadcast] = useState({ title: '', body: '', type: 'maintenance' });
  const [toast, setToast] = useState('');
  const [publishBusy, setPublishBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);

  const loadSystemData = useCallback(async () => {
    setApiErr('');
    try {
      const [overview, reportRows] = await Promise.all([
        adminService.getOverview(),
        moderationService.listStaffReports({ limit: 120 }),
      ]);
      setOv(overview);
      setReports(Array.isArray(reportRows) ? reportRows : []);
    } catch (e) {
      setApiErr(e?.response?.data?.message || e?.message || 'Không tải được dữ liệu hệ thống từ API.');
    }
  }, []);

  useEffect(() => {
    void loadSystemData();
  }, [loadSystemData]);

  function savePolicies() {
    localStorage.setItem(LS_POL, policies);
    setToast('Đã lưu chính sách (localStorage).');
    setTimeout(() => setToast(''), 3000);
  }

  async function sendBroadcast() {
    if (!broadcast.title.trim()) {
      setToast('Nhập tiêu đề.');
      setTimeout(() => setToast(''), 3000);
      return;
    }
    setPublishBusy(true);
    try {
      await adminService.publishSystemAnnouncement({
        title: broadcast.title.trim(),
        content: broadcast.body.trim(),
        type: broadcast.type,
      });
      setToast('Đã xuất bản thông báo. Người dùng sẽ thấy trên banner (tải lại hoặc chờ vài chục giây).');
      setBroadcast((b) => ({ ...b, title: '', body: '' }));
    } catch (e) {
      setToast(e?.response?.data?.message || e?.message || 'Không gửi được thông báo.');
    } finally {
      setPublishBusy(false);
      setTimeout(() => setToast(''), 5000);
    }
  }

  async function runBackup() {
    setBackupBusy(true);
    try {
      const res = await adminService.requestDataBackup();
      setToast(res?.message || 'Đã ghi nhận yêu cầu backup.');
    } catch (e) {
      setToast(e?.response?.data?.message || e?.message || 'Không gửi được yêu cầu backup.');
    } finally {
      setBackupBusy(false);
      setTimeout(() => setToast(''), 4000);
    }
  }

  async function resolveReport(report, status) {
    const id = rowId(report);
    if (!id) return;
    setRepBusyId(id);
    try {
      await moderationService.resolveReport(id, {
        status,
        resolutionNote: notes[id] ?? '',
      });
      await loadSystemData();
      setToast(status === 'dismissed' ? 'Đã đánh dấu bỏ qua.' : 'Đã đánh dấu đã xử lý.');
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      setToast(e?.response?.data?.message || e?.message || 'Không cập nhật được báo cáo.');
      setTimeout(() => setToast(''), 4000);
    } finally {
      setRepBusyId(0);
    }
  }

  return (
    <div className="admin-dash__tab-inner">
      <h2 className="admin-dash__section-title">Quản lý hệ thống</h2>
      {toast ? <div className="admin-users__alert">{toast}</div> : null}
      {apiErr ? <div className="admin-users__alert">{apiErr}</div> : null}

      <div className="admin-dash__subcard">
        <h3 className="admin-dash__subcard-title">Sức khỏe hệ thống</h3>
        <div className="admin-users__table-scroll">
          <table className="admin-users__table">
            <thead>
              <tr>
                <th>Chỉ số</th>
                <th>Giá trị</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Tổng người dùng</td>
                <td>{Number(ov?.totalUsers ?? ov?.TotalUsers ?? 0).toLocaleString('vi-VN')}</td>
              </tr>
              <tr>
                <td>Người dùng mới 7 ngày</td>
                <td>{Number(ov?.newUsersLast7Days ?? ov?.NewUsersLast7Days ?? 0).toLocaleString('vi-VN')}</td>
              </tr>
              <tr>
                <td>Tin nhắn 24 giờ</td>
                <td>{Number(ov?.messagesLast24Hours ?? ov?.MessagesLast24Hours ?? 0).toLocaleString('vi-VN')}</td>
              </tr>
              <tr>
                <td>Retention 30 ngày</td>
                <td>{Number(ov?.retentionRatePercent ?? ov?.RetentionRatePercent ?? 0)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-dash__subcard">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h3 className="admin-dash__subcard-title" style={{ margin: 0 }}>
            Báo cáo từ người dùng
          </h3>
          <button type="button" className="admin-dash__btn admin-dash__btn--ghost" onClick={() => void loadSystemData()}>
            Làm mới
          </button>
        </div>
        <div className="admin-users__table-scroll" style={{ marginTop: '0.75rem' }}>
          <table className="admin-users__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Loại</th>
                <th>Trạng thái</th>
                <th>Người bị báo cáo</th>
                <th>Mô tả</th>
                <th>Ngày</th>
                <th>Ghi chú xử lý</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const id = rowId(r);
                const status = r.status ?? r.Status ?? '';
                const terminal = isTerminalStatus(status);
                const reported = r.reportedUsername ?? r.ReportedUsername ?? r.reportedUserId ?? r.ReportedUserId ?? '—';
                const desc = (r.description ?? r.Description ?? '').slice(0, 120);
                const created = r.createdAt ?? r.CreatedAt;
                return (
                  <tr key={id}>
                    <td>#{id}</td>
                    <td>{r.type ?? r.Type ?? '—'}</td>
                    <td>{status || '—'}</td>
                    <td>{reported}</td>
                    <td title={r.description ?? r.Description}>{desc || '—'}</td>
                    <td>{created ? new Date(created).toLocaleString('vi-VN') : '—'}</td>
                    <td style={{ minWidth: 140 }}>
                      <input
                        className="admin-dash__select"
                        style={{ width: '100%', fontSize: '0.85rem' }}
                        disabled={terminal}
                        value={notes[id] ?? ''}
                        onChange={(e) => setNotes((m) => ({ ...m, [id]: e.target.value }))}
                        placeholder="Tùy chọn"
                      />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="admin-dash__btn admin-dash__btn--primary"
                        style={{ marginRight: '0.35rem', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        disabled={terminal || repBusyId === id}
                        onClick={() => void resolveReport(r, 'resolved')}
                      >
                        Đã xử lý
                      </button>
                      <button
                        type="button"
                        className="admin-dash__btn admin-dash__btn--ghost"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        disabled={terminal || repBusyId === id}
                        onClick={() => void resolveReport(r, 'dismissed')}
                      >
                        Bỏ qua
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {reports.length === 0 ? <p className="admin-dash__card-sub" style={{ marginTop: '0.5rem' }}>Chưa có báo cáo nào.</p> : null}
      </div>

      <div className="admin-dash__subcard">
        <h3 className="admin-dash__subcard-title">Chính sách bảo mật &amp; điều khoản</h3>
        <textarea className="admin-dash__select" style={{ width: '100%', minHeight: 140, resize: 'vertical', fontFamily: 'inherit' }} value={policies} onChange={(e) => setPolicies(e.target.value)} />
        <button type="button" className="admin-dash__btn admin-dash__btn--primary" style={{ marginTop: '0.5rem' }} onClick={savePolicies}>
          Lưu bản nháp
        </button>
      </div>

      <div className="admin-dash__subcard">
        <h3 className="admin-dash__subcard-title">Thông báo toàn hệ thống</h3>
        <label className="admin-dash__modal-label">
          Loại
          <select className="admin-dash__select" value={broadcast.type} onChange={(e) => setBroadcast((b) => ({ ...b, type: e.target.value }))}>
            <option value="maintenance">Bảo trì</option>
            <option value="event">Sự kiện</option>
            <option value="promo">Khuyến mãi</option>
          </select>
        </label>
        <label className="admin-dash__modal-label">
          Tiêu đề
          <input className="admin-dash__select" value={broadcast.title} onChange={(e) => setBroadcast((b) => ({ ...b, title: e.target.value }))} />
        </label>
        <label className="admin-dash__modal-label">
          Nội dung
          <textarea className="admin-dash__select" style={{ minHeight: 80 }} value={broadcast.body} onChange={(e) => setBroadcast((b) => ({ ...b, body: e.target.value }))} />
        </label>
        <button type="button" className="admin-dash__btn admin-dash__btn--primary" disabled={publishBusy} onClick={() => void sendBroadcast()}>
          {publishBusy ? 'Đang gửi…' : 'Gửi thông báo'}
        </button>
      </div>

      <div className="admin-dash__subcard">
        <h3 className="admin-dash__subcard-title">Backup dữ liệu thủ công</h3>
        <button type="button" className="admin-dash__btn admin-dash__btn--dark" disabled={backupBusy} onClick={() => void runBackup()}>
          {backupBusy ? 'Đang gửi…' : 'Chạy backup'}
        </button>
      </div>
    </div>
  );
}
