import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { adminService } from '../../../services/adminService';
import { useAnimatedNumber } from '../../../hooks/useAnimatedNumber';

const Motion = motion;

function formatVndFull(n) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ';
}

function barFill(index, total) {
  if (total <= 1) return '#8e031d';
  const palette = ['#ebe8e4', '#ddd5d0', '#d4b8bc', '#c4707e', '#8e031d', '#6b0216'];
  const j = Math.round((index / Math.max(1, total - 1)) * (palette.length - 1));
  return palette[Math.min(j, palette.length - 1)];
}

export function RevenueTab() {
  const [ov, setOv] = useState(null);
  const [err, setErr] = useState('');
  const reduceMotion = useReducedMotion();

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

  const revenue8 = useMemo(() => {
    const raw = ov?.revenueLast8Months ?? ov?.RevenueLast8Months ?? [];
    return raw.map((m) => {
      const vnd = Number(m.amountVnd ?? m.AmountVnd ?? 0);
      return {
        name: m.monthLabel ?? m.MonthLabel ?? m.monthKey ?? m.MonthKey ?? '',
        trieu: Math.round((vnd / 1_000_000) * 1000) / 1000,
      };
    });
  }, [ov]);

  const animToday = useAnimatedNumber(data.revenueToday, { duration: 1100, reduceMotion });
  const animCumulative = useAnimatedNumber(data.revenueCumulative, { duration: 1200, reduceMotion });
  const animAcademy = useAnimatedNumber(data.academyUsers, { duration: 900, reduceMotion });
  const animConv = useAnimatedNumber(data.conversionRate, { duration: 1000, reduceMotion });

  const listReveal = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: reduceMotion ? 0 : 0.09,
          delayChildren: reduceMotion ? 0 : 0.06,
        },
      },
    }),
    [reduceMotion],
  );

  const cardRise = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 26 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
      },
    }),
    [reduceMotion],
  );

  const tableReveal = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: { staggerChildren: reduceMotion ? 0 : 0.08, delayChildren: reduceMotion ? 0 : 0.2 },
      },
    }),
    [reduceMotion],
  );

  const tableRow = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } },
    }),
    [reduceMotion],
  );

  const chartReveal = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: reduceMotion ? 0 : 0.15 },
      },
    }),
    [reduceMotion],
  );

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
        <span className="admin-dash__period-label">Báo cáo doanh thu</span>
        <div className="admin-dash__period-chips">
          <button type="button" className="admin-dash__chip admin-dash__chip--on">
            Dữ liệu
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

      <Motion.div className="admin-dash__kpi-grid admin-dash__kpi-grid--4" variants={listReveal} initial="hidden" animate="visible">
        <Motion.div className="admin-dash__kpi-card admin-dash__kpi-card--icon admin-dash__kpi-card--revenue" variants={cardRise}>
          <div className="admin-dash__kpi-card-head">
            <span className="admin-dash__kpi-ico admin-dash__kpi-ico--green">$</span>
            <span className="admin-dash__kpi-trend admin-dash__kpi-trend--muted">Theo ngày</span>
          </div>
          <div className="admin-dash__kpi-value admin-dash__kpi-value--lg">{formatVndFull(animToday)}</div>
          <div className="admin-dash__kpi-label">Doanh thu hôm nay (đã duyệt)</div>
          <span className="admin-dash__kpi-foot admin-dash__kpi-foot--ok">Giao dịch premium đã duyệt</span>
        </Motion.div>
        <Motion.div className="admin-dash__kpi-card admin-dash__kpi-card--icon admin-dash__kpi-card--revenue" variants={cardRise}>
          <div className="admin-dash__kpi-card-head">
            <span className="admin-dash__kpi-ico admin-dash__kpi-ico--blue">⌁</span>
            <span className="admin-dash__kpi-trend admin-dash__kpi-trend--muted">Lũy kế</span>
          </div>
          <div className="admin-dash__kpi-value admin-dash__kpi-value--lg">{formatVndFull(animCumulative)}</div>
          <div className="admin-dash__kpi-label">Doanh thu tích lũy</div>
          <span className="admin-dash__kpi-foot">Tổng đã ghi nhận</span>
        </Motion.div>
        <Motion.div className="admin-dash__kpi-card admin-dash__kpi-card--icon admin-dash__kpi-card--revenue" variants={cardRise}>
          <div className="admin-dash__kpi-card-head">
            <span className="admin-dash__kpi-ico admin-dash__kpi-ico--purple">★</span>
            <span className="admin-dash__kpi-trend admin-dash__kpi-trend--muted">Học viện</span>
          </div>
          <div className="admin-dash__kpi-value admin-dash__kpi-value--lg">{animAcademy.toLocaleString('vi-VN')}</div>
          <div className="admin-dash__kpi-label">Học viên</div>
          <span className="admin-dash__kpi-foot admin-dash__kpi-foot--ok">Chỉ role user</span>
        </Motion.div>
        <Motion.div className="admin-dash__kpi-card admin-dash__kpi-card--icon admin-dash__kpi-card--revenue" variants={cardRise}>
          <div className="admin-dash__kpi-card-head">
            <span className="admin-dash__kpi-ico admin-dash__kpi-ico--orange">◎</span>
            <span className="admin-dash__kpi-trend admin-dash__kpi-trend--kurenai">Free → Premium</span>
          </div>
          <div className="admin-dash__kpi-value admin-dash__kpi-value--lg">{animConv}%</div>
          <div className="admin-dash__kpi-label">Tỷ lệ chuyển đổi</div>
          <span className="admin-dash__kpi-foot admin-dash__kpi-foot--warn">Trên tổng học viên</span>
        </Motion.div>
      </Motion.div>

      <Motion.div
        className="admin-dash__card admin-dash__card--chart admin-dash__revenue-chart"
        variants={chartReveal}
        initial="hidden"
        animate="visible"
      >
        <div className="admin-dash__revenue-chart-head">
          <div>
            <h3 className="admin-dash__card-title admin-dash__card-title--serif">Biểu đồ doanh thu</h3>
          </div>
        </div>
        <div className="admin-dash__chart-h admin-dash__chart-h--revenue">
          {revenue8.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenue8} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-chart-grid, rgba(0,0,0,0.06))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--admin-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--admin-muted)' }} />
                <Tooltip formatter={(v) => [`${v} triệu`, 'Doanh thu']} />
                <Bar dataKey="trieu" name="Doanh thu" radius={[8, 8, 0, 0]} animationDuration={reduceMotion ? 0 : 1400} animationEasing="ease-out">
                  {revenue8.map((_, i) => (
                    <Cell key={`rev-${i}`} fill={barFill(i, revenue8.length)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="admin-dash__card-sub">Chưa có chuỗi doanh thu theo tháng — hiển thị khi API có dữ liệu.</p>
          )}
        </div>
      </Motion.div>

      <div className="admin-dash__card admin-dash__card--wide">
        <h3 className="admin-dash__card-title admin-dash__card-title--serif">Tổng hợp chuyển đổi</h3>
        <p className="admin-dash__card-sub">Phân bổ Free / Premium trong nhóm học viên.</p>
        <div className="admin-users__table-scroll">
          <table className="admin-users__table">
            <thead>
              <tr>
                <th>Nhóm</th>
                <th>Số lượng</th>
                <th>Tỷ trọng</th>
              </tr>
            </thead>
            <Motion.tbody variants={tableReveal} initial="hidden" animate="visible">
              <Motion.tr variants={tableRow}>
                <td>Free</td>
                <td>{data.freeUsers.toLocaleString('vi-VN')}</td>
                <td>{data.academyUsers ? `${Math.round((data.freeUsers * 100) / data.academyUsers)}%` : '0%'}</td>
              </Motion.tr>
              <Motion.tr variants={tableRow}>
                <td>Premium</td>
                <td>{data.premiumUsers.toLocaleString('vi-VN')}</td>
                <td>{data.academyUsers ? `${Math.round((data.premiumUsers * 100) / data.academyUsers)}%` : '0%'}</td>
              </Motion.tr>
            </Motion.tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
