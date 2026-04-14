import { useEffect, useMemo, useState } from 'react';
import { adminService } from '../../../services/adminService';

function formatVndFull(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + ' đ';
}

export function RevenueTab() {
  const [ov, setOv] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    adminService
      .getOverview()
      .then((data) => {
        if (!cancelled) setOv(data);
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.response?.data?.message || e?.message || 'Không tải được số liệu doanh thu.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const data = useMemo(() => {
    const revenueToday = Number(ov?.revenueTodayVnd ?? ov?.RevenueTodayVnd ?? 0);
    const revenueCumulative = Number(ov?.revenueCumulativeVnd ?? ov?.RevenueCumulativeVnd ?? 0);
    const academyUsers = Number(ov?.academyUsers ?? ov?.AcademyUsers ?? ov?.totalUsers ?? ov?.TotalUsers ?? 0);
    const premiumUsers = Number(ov?.premiumUsers ?? ov?.PremiumUsers ?? 0);
    const freeUsers = Number(ov?.freeUsers ?? ov?.FreeUsers ?? Math.max(0, academyUsers - premiumUsers));
    const conversionRate = Number(ov?.premiumConversionRatePercent ?? ov?.PremiumConversionRatePercent ?? 0);
    const arpu = academyUsers > 0 ? Math.round(revenueCumulative / academyUsers) : 0;
    return { revenueToday, revenueCumulative, academyUsers, premiumUsers, freeUsers, conversionRate, arpu };
  }, [ov]);

  function exportCsv() {
    const header = 'metric,value\n';
    const body = [
      ['revenue_today_vnd', data.revenueToday],
      ['revenue_cumulative_vnd', data.revenueCumulative],
      ['academy_users', data.academyUsers],
      ['premium_users', data.premiumUsers],
      ['free_users', data.freeUsers],
      ['conversion_rate_percent', data.conversionRate],
      ['arpu_vnd', data.arpu],
    ]
      .map((r) => `${r[0]},${r[1]}`)
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'revenue-real-metrics.csv';
    a.click();
  }

  function exportPdfHint() {
    window.print();
  }

  return (
    <div className="admin-dash__tab-inner">
      <div className="admin-dash__period-bar">
        <span className="admin-dash__period-label">Kỳ xem:</span>
        <div className="admin-dash__period-chips">
          <button type="button" className="admin-dash__chip admin-dash__chip--on">
            Dữ liệu thật (Realtime)
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="admin-dash__btn admin-dash__btn--ghost" onClick={exportCsv}>
            Xuất CSV
          </button>
          <button type="button" className="admin-dash__btn admin-dash__btn--ghost" onClick={exportPdfHint}>
            In / PDF (trình duyệt)
          </button>
        </div>
      </div>
      {err ? <div className="admin-users__alert">{err}</div> : null}

      <div className="admin-dash__kpi-grid admin-dash__kpi-grid--4">
        <div className="admin-dash__kpi-card admin-dash__kpi-card--icon">
          <span className="admin-dash__kpi-ico admin-dash__kpi-ico--green">$</span>
          <div className="admin-dash__kpi-value">{formatVndFull(data.revenueToday)}</div>
          <div className="admin-dash__kpi-label">Doanh thu hôm nay (duyệt thành công)</div>
          <span className="admin-dash__kpi-foot admin-dash__kpi-foot--ok">Nguồn: premium_payment_requests.status=approved</span>
        </div>
        <div className="admin-dash__kpi-card admin-dash__kpi-card--icon">
          <span className="admin-dash__kpi-ico admin-dash__kpi-ico--blue">⌁</span>
          <div className="admin-dash__kpi-value">{formatVndFull(data.revenueCumulative)}</div>
          <div className="admin-dash__kpi-label">Doanh thu tích lũy</div>
          <span className="admin-dash__kpi-foot">Tổng toàn bộ giao dịch đã duyệt</span>
        </div>
        <div className="admin-dash__kpi-card admin-dash__kpi-card--icon">
          <span className="admin-dash__kpi-ico admin-dash__kpi-ico--purple">★</span>
          <div className="admin-dash__kpi-value">{data.academyUsers.toLocaleString('vi-VN')}</div>
          <div className="admin-dash__kpi-label">Số lượng tài khoản user học viện</div>
          <span className="admin-dash__kpi-foot admin-dash__kpi-foot--ok">Chỉ tính role = user</span>
        </div>
        <div className="admin-dash__kpi-card admin-dash__kpi-card--icon">
          <span className="admin-dash__kpi-ico admin-dash__kpi-ico--orange">◎</span>
          <div className="admin-dash__kpi-value">{data.conversionRate}%</div>
          <div className="admin-dash__kpi-label">Tỷ lệ chuyển đổi Free → Premium</div>
          <span className="admin-dash__kpi-foot admin-dash__kpi-foot--warn">Miễn phí → Trả phí</span>
        </div>
      </div>

      <div className="admin-dash__card admin-dash__card--wide">
        <h3 className="admin-dash__card-title">Tổng hợp chuyển đổi</h3>
        <p className="admin-dash__card-sub">Cập nhật tự động theo dữ liệu user + payment đã duyệt.</p>
        <div className="admin-users__table-scroll">
          <table className="admin-users__table">
            <thead>
              <tr>
                <th>Nhóm</th>
                <th>Số lượng</th>
                <th>Tỷ trọng</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Free</td>
                <td>{data.freeUsers.toLocaleString('vi-VN')}</td>
                <td>{data.academyUsers ? `${Math.round((data.freeUsers * 100) / data.academyUsers)}%` : '0%'}</td>
              </tr>
              <tr>
                <td>Premium</td>
                <td>{data.premiumUsers.toLocaleString('vi-VN')}</td>
                <td>{data.academyUsers ? `${Math.round((data.premiumUsers * 100) / data.academyUsers)}%` : '0%'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
