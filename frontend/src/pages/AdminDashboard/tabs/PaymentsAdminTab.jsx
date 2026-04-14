import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminService } from '../../../services/adminService';

function fmtVnd(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  return new Intl.NumberFormat('vi-VN').format(Math.round(x));
}

function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
}

function mapStatus(s) {
  const k = String(s || '').toLowerCase();
  if (k === 'pending_review') return 'Chờ duyệt';
  if (k === 'approved') return 'Đã duyệt';
  if (k === 'rejected') return 'Đã từ chối';
  if (k === 'created') return 'Đã tạo mã';
  return s || '—';
}

export function PaymentsAdminTab() {
  const [config, setConfig] = useState(null);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('pending_review');
  const [loading, setLoading] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);
  const [busyId, setBusyId] = useState(0);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [noteById, setNoteById] = useState({});
  const [form, setForm] = useState({
    accountNo: '',
    accountName: '',
    premiumPriceVnd: 10000,
    premiumDurationDays: 30,
    isActive: true,
  });

  const loadConfig = useCallback(async () => {
    const cfg = await adminService.getPremiumConfig();
    setConfig(cfg);
    setForm({
      accountNo: cfg?.accountNo ?? '',
      accountName: cfg?.accountName ?? '',
      premiumPriceVnd: Number(cfg?.premiumPriceVnd ?? 10000),
      premiumDurationDays: Number(cfg?.premiumDurationDays ?? 30),
      isActive: !!cfg?.isActive,
    });
  }, []);

  const loadRows = useCallback(async (s) => {
    const list = await adminService.listPremiumRequests(s);
    setRows(Array.isArray(list) ? list : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const [cfg, list] = await Promise.all([adminService.getPremiumConfig(), adminService.listPremiumRequests(status)]);
        if (!cancelled) {
          setConfig(cfg);
          setForm({
            accountNo: cfg?.accountNo ?? '',
            accountName: cfg?.accountName ?? '',
            premiumPriceVnd: Number(cfg?.premiumPriceVnd ?? 10000),
            premiumDurationDays: Number(cfg?.premiumDurationDays ?? 30),
            isActive: !!cfg?.isActive,
          });
          setRows(Array.isArray(list) ? list : []);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e?.response?.data?.message || e?.message || 'Không tải được dữ liệu thanh toán.');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  async function onSaveConfig() {
    setSavingCfg(true);
    setErr('');
    setOk('');
    try {
      const body = {
        accountNo: form.accountNo?.trim(),
        accountName: form.accountName?.trim(),
        premiumPriceVnd: Number(form.premiumPriceVnd),
        premiumDurationDays: Number(form.premiumDurationDays),
        isActive: !!form.isActive,
      };
      const next = await adminService.updatePremiumConfig(body);
      setConfig(next);
      setOk('Đã lưu cấu hình Premium.');
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Lưu cấu hình thất bại.');
    } finally {
      setSavingCfg(false);
    }
  }

  async function onApprove(id) {
    setBusyId(id);
    setErr('');
    setOk('');
    try {
      await adminService.approvePremiumRequest(id, noteById[id] || '');
      await loadRows(status);
      setOk(`Đã duyệt yêu cầu #${id}.`);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Duyệt yêu cầu thất bại.');
    } finally {
      setBusyId(0);
    }
  }

  async function onReject(id) {
    setBusyId(id);
    setErr('');
    setOk('');
    try {
      await adminService.rejectPremiumRequest(id, noteById[id] || '');
      await loadRows(status);
      setOk(`Đã từ chối yêu cầu #${id}.`);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Từ chối yêu cầu thất bại.');
    } finally {
      setBusyId(0);
    }
  }

  const pendingCount = useMemo(
    () => rows.filter((r) => String(r?.status || '').toLowerCase() === 'pending_review').length,
    [rows]
  );

  return (
    <div className="admin-dash__tab-inner">
      <h2 className="admin-dash__section-title">Thanh toán Premium</h2>
      <p className="admin-dash__section-desc">Xác nhận thanh toán QR và cập nhật cấu hình gói Premium trực tiếp tại đây.</p>

      {err ? <div className="admin-users__alert">{err}</div> : null}
      {ok ? <p className="admin-dash__card-sub" style={{ color: '#16a34a', fontWeight: 700 }}>{ok}</p> : null}

      <div className="admin-dash__subcard">
        <h3 className="admin-dash__subcard-title">Cấu hình gói Premium</h3>
        <p className="admin-dash__card-sub">Admin có thể đổi giá tiền, số ngày và trạng thái bật/tắt gói.</p>
        <div className="admin-dash__form-grid">
          <label>
            Số tài khoản
            <input value={form.accountNo} onChange={(e) => setForm((p) => ({ ...p, accountNo: e.target.value }))} />
          </label>
          <label>
            Chủ tài khoản
            <input value={form.accountName} onChange={(e) => setForm((p) => ({ ...p, accountName: e.target.value }))} />
          </label>
          <label>
            Giá Premium (VND)
            <input
              type="number"
              min={1000}
              value={form.premiumPriceVnd}
              onChange={(e) => setForm((p) => ({ ...p, premiumPriceVnd: Number(e.target.value || 0) }))}
            />
          </label>
          <label>
            Số ngày hiệu lực
            <input
              type="number"
              min={1}
              value={form.premiumDurationDays}
              onChange={(e) => setForm((p) => ({ ...p, premiumDurationDays: Number(e.target.value || 0) }))}
            />
          </label>
          <label>
            Trạng thái gói
            <select
              className="admin-dash__select"
              value={form.isActive ? '1' : '0'}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === '1' }))}
            >
              <option value="1">Đang mở bán</option>
              <option value="0">Tạm khóa</option>
            </select>
          </label>
        </div>
        <div className="admin-dash__toolbar-actions" style={{ marginTop: '0.75rem' }}>
          <button type="button" className="admin-dash__btn admin-dash__btn--primary" onClick={() => void onSaveConfig()} disabled={savingCfg}>
            {savingCfg ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
          <button type="button" className="admin-dash__btn admin-dash__btn--ghost" onClick={() => void loadConfig()}>
            Tải lại cấu hình
          </button>
          {config ? (
            <span className="admin-dash__muted-sm">
              Hiện tại: {fmtVnd(config.premiumPriceVnd)} VND / {config.premiumDurationDays} ngày
            </span>
          ) : null}
        </div>
      </div>

      <div className="admin-dash__subcard">
        <div className="admin-dash__toolbar">
          <div>
            <h3 className="admin-dash__subcard-title">Yêu cầu xác nhận thanh toán</h3>
            <p className="admin-dash__card-sub">Chờ duyệt hiện tại: {pendingCount} yêu cầu.</p>
          </div>
          <div className="admin-dash__toolbar-actions">
            <label>
              Trạng thái
              <select className="admin-dash__select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="pending_review">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="rejected">Đã từ chối</option>
                <option value="created">Đã tạo mã</option>
                <option value="all">Tất cả</option>
              </select>
            </label>
            <button type="button" className="admin-dash__btn admin-dash__btn--ghost" onClick={() => void loadRows(status)} disabled={loading}>
              Làm mới
            </button>
          </div>
        </div>

        <div className="admin-users__table-scroll">
          <table className="admin-users__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Token</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Ghi chú admin</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const id = r.id ?? r.Id;
                const st = r.status ?? r.Status;
                const isPending = String(st || '').toLowerCase() === 'pending_review';
                const busy = busyId === id;
                return (
                  <tr key={id} className={busy ? 'admin-users__tr--busy' : ''}>
                    <td>#{id}</td>
                    <td>
                      {r.username ?? r.Username} <span className="admin-dash__muted-sm">(ID: {r.userId ?? r.UserId})</span>
                    </td>
                    <td>
                      <code className="admin-dash__code-inline">{r.token ?? r.Token}</code>
                    </td>
                    <td>{fmtVnd(r.amountVnd ?? r.AmountVnd)} VND</td>
                    <td>{mapStatus(st)}</td>
                    <td>{fmtDate(r.createdAt ?? r.CreatedAt)}</td>
                    <td style={{ minWidth: '220px' }}>
                      <input
                        className="admin-dash__select"
                        value={noteById[id] ?? ''}
                        placeholder="Ghi chú khi duyệt/từ chối"
                        onChange={(e) => setNoteById((p) => ({ ...p, [id]: e.target.value }))}
                      />
                    </td>
                    <td>
                      {isPending ? (
                        <div className="admin-users__actions">
                          <button type="button" className="admin-users__action" onClick={() => void onApprove(id)} disabled={busy}>
                            Duyệt
                          </button>
                          <button
                            type="button"
                            className="admin-users__action admin-users__action--danger"
                            onClick={() => void onReject(id)}
                            disabled={busy}
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <span className="admin-dash__muted-sm">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={8} className="admin-users__empty">
                    {loading ? 'Đang tải dữ liệu...' : 'Không có yêu cầu phù hợp.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
