import { useState } from 'react';
import { adminSystemLogsMock, adminUserErrorReports } from '../mockStats';

const LS_POL = 'yumegoji_admin_policies_v1';

export function SystemAdminTab() {
  const [policies, setPolicies] = useState(() => {
    try {
      return localStorage.getItem(LS_POL) || 'Điều khoản dịch vụ (bản nháp)…\n\nChính sách bảo mật (bản nháp)…';
    } catch {
      return '';
    }
  });
  const [broadcast, setBroadcast] = useState({ title: '', body: '', type: 'maintenance' });
  const [toast, setToast] = useState('');

  function savePolicies() {
    localStorage.setItem(LS_POL, policies);
    setToast('Đã lưu chính sách (localStorage).');
    setTimeout(() => setToast(''), 3000);
  }

  function sendBroadcast() {
    if (!broadcast.title.trim()) {
      setToast('Nhập tiêu đề.');
      return;
    }
    setToast(`Đã ghi nhận thông báo "${broadcast.title}" (demo — nối push/email sau).`);
    setTimeout(() => setToast(''), 4000);
  }

  function runBackup() {
    setToast('Yêu cầu backup đã xếp hàng (demo).');
    setTimeout(() => setToast(''), 3000);
  }

  return (
    <div className="admin-dash__tab-inner">
      <h2 className="admin-dash__section-title">Quản lý hệ thống</h2>
      {toast ? <div className="admin-users__alert">{toast}</div> : null}

      <div className="admin-dash__subcard">
        <h3 className="admin-dash__subcard-title">Nhật ký hệ thống (mẫu)</h3>
        <div className="admin-users__table-scroll">
          <table className="admin-users__table">
            <thead>
              <tr>
                <th>Thời điểm</th>
                <th>Level</th>
                <th>Nội dung</th>
              </tr>
            </thead>
            <tbody>
              {adminSystemLogsMock.map((l) => (
                <tr key={l.id}>
                  <td className="admin-users__td-email">{l.at}</td>
                  <td>{l.level}</td>
                  <td>{l.msg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-dash__subcard">
        <h3 className="admin-dash__subcard-title">Báo cáo lỗi từ người dùng</h3>
        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
          {adminUserErrorReports.map((e) => (
            <li key={e.id} style={{ marginBottom: '0.5rem' }}>
              <strong>{e.title}</strong> — @{e.user} · {e.at}
            </li>
          ))}
        </ul>
      </div>

      <div className="admin-dash__subcard">
        <h3 className="admin-dash__subcard-title">Chính sách bảo mật &amp; điều khoản</h3>
        <textarea className="admin-dash__select" style={{ width: '100%', minHeight: 140, resize: 'vertical', fontFamily: 'inherit' }} value={policies} onChange={(e) => setPolicies(e.target.value)} />
        <button type="button" className="admin-dash__btn admin-dash__btn--primary" style={{ marginTop: '0.5rem' }} onClick={savePolicies}>
          Lưu bản nháp
        </button>
      </div>

      <div className="admin-dash__subcard">
        <h3 className="admin-dash__subcard-title">Backup dữ liệu thủ công</h3>
        <p className="admin-dash__card-sub">Trigger job backup DB / export — tích hợp SQL Server maintenance plan sau.</p>
        <button type="button" className="admin-dash__btn admin-dash__btn--dark" onClick={runBackup}>
          Chạy backup (demo)
        </button>
      </div>

      <div className="admin-dash__subcard">
        <h3 className="admin-dash__subcard-title">Thông báo toàn hệ thống</h3>
        <p className="admin-dash__card-sub">Bảo trì, sự kiện, khuyến mãi — gửi tới tất cả phiên đang mở (cần SignalR / FCM).</p>
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
        <button type="button" className="admin-dash__btn admin-dash__btn--primary" onClick={sendBroadcast}>
          Gửi thông báo (demo)
        </button>
      </div>
    </div>
  );
}
