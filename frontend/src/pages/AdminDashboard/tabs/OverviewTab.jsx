import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { adminService } from '../../../services/adminService';

const Motion = motion;

function formatVndFull(n) {
  const v = Number(n || 0);
  return new Intl.NumberFormat('vi-VN').format(v) + ' đ';
}

/** Cột đăng ký: ngày cũ xám nhạt → gần đây đỏ Kurenai #8E031D. */
function signupBarFill(index, total) {
  if (total <= 1) return '#8e031d';
  const palette = ['#ebe8e4', '#ddd5d0', '#d4b8bc', '#c4707e', '#8e031d', '#6b0216'];
  const j = Math.round((index / (total - 1)) * (palette.length - 1));
  return palette[Math.min(j, palette.length - 1)];
}

export function OverviewTab() {
  const [ov, setOv] = useState(null);
  const [ovErr, setOvErr] = useState(null);
  const reduceMotion = useReducedMotion();

  const listReveal = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: reduceMotion ? 0 : 0.085,
          delayChildren: reduceMotion ? 0 : 0.05,
        },
      },
    }),
    [reduceMotion],
  );

  const itemRise = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
      },
    }),
    [reduceMotion],
  );

  useEffect(() => {
    adminService
      .getOverview()
      .then(setOv)
      .catch((e) => setOvErr(e?.message || 'Không tải được tổng quan từ API.'));
  }, []);

  const growthData = useMemo(() => {
    const raw = ov?.newUsersPerDay ?? ov?.NewUsersPerDay ?? [];
    return raw.map((d) => ({
      day: (d.date ?? d.Date ?? '').slice(5),
      count: d.count ?? d.Count ?? 0,
    }));
  }, [ov]);

  const totalUsers = ov?.academyUsers ?? ov?.AcademyUsers ?? ov?.totalUsers ?? ov?.TotalUsers;
  const freeUsers = ov?.freeUsers ?? ov?.FreeUsers ?? 0;
  const premiumUsers = ov?.premiumUsers ?? ov?.PremiumUsers;
  const activeUsers = ov?.activeUsers ?? ov?.ActiveUsers;
  const revenueToday = ov?.revenueTodayVnd ?? ov?.RevenueTodayVnd ?? 0;
  const revenueCumulative = ov?.revenueCumulativeVnd ?? ov?.RevenueCumulativeVnd ?? 0;
  const conversionRate = ov?.premiumConversionRatePercent ?? ov?.PremiumConversionRatePercent ?? 0;
  const new7 = ov?.newUsersLast7Days ?? ov?.NewUsersLast7Days;
  const retention = ov?.retentionRatePercent ?? ov?.RetentionRatePercent;
  const msg24 = ov?.messagesLast24Hours ?? ov?.MessagesLast24Hours;

  const revenue8 = useMemo(() => {
    const raw = ov?.revenueLast8Months ?? ov?.RevenueLast8Months ?? [];
    return raw.map((m) => {
      const vnd = Number(m.amountVnd ?? m.AmountVnd ?? 0);
      return {
        name: m.monthLabel ?? m.MonthLabel ?? m.monthKey ?? m.MonthKey ?? '',
        actual: Math.round((vnd / 1_000_000) * 1000) / 1000,
      };
    });
  }, [ov]);

  const packagePie = useMemo(() => {
    const raw = ov?.usersByPackage ?? ov?.UsersByPackage ?? [];
    return raw.map((p) => ({
      name: p.name ?? p.Name,
      value: p.count ?? p.Count ?? 0,
      color: p.color ?? p.Color ?? '#94a3b8',
    }));
  }, [ov]);

  const packageTotal = useMemo(() => packagePie.reduce((s, x) => s + x.value, 0), [packagePie]);

  return (
    <div className="admin-dash__tab-inner">
      <div className="admin-dash__toolbar">
        <h2 className="admin-dash__section-title admin-dash__section-title--serif">Tổng quan hệ thống</h2>
      </div>

      {ovErr ? (
        <div className="admin-users__alert" role="alert">
          {ovErr}
        </div>
      ) : null}

      {ov ? (
        <>
          <Motion.div
            className="admin-dash__kpi-hero"
            variants={listReveal}
            initial="hidden"
            animate="visible"
          >
            <Motion.div className="admin-dash__kpi-card admin-dash__kpi-card--kurenai admin-dash__kpi-card--hero" variants={itemRise}>
              <span className="admin-dash__kpi-ico-ring" aria-hidden>
                👥
              </span>
              <div className="admin-dash__kpi-value admin-dash__kpi-value--hero">{totalUsers}</div>
              <div className="admin-dash__kpi-label">Tài khoản học viên</div>
            </Motion.div>
            <Motion.div className="admin-dash__kpi-card admin-dash__kpi-card--kurenai admin-dash__kpi-card--hero" variants={itemRise}>
              <span className="admin-dash__kpi-ico-ring" aria-hidden>
                ✓
              </span>
              <div className="admin-dash__kpi-value admin-dash__kpi-value--hero">{activeUsers}</div>
              <div className="admin-dash__kpi-label">Đang hoạt động</div>
              <span className="admin-dash__kpi-foot">
                {totalUsers > 0 ? `${Math.round(((activeUsers || 0) / totalUsers) * 100)}% trên tổng` : '—'}
              </span>
            </Motion.div>
            <Motion.div className="admin-dash__kpi-card admin-dash__kpi-card--kurenai admin-dash__kpi-card--hero" variants={itemRise}>
              <span className="admin-dash__kpi-ico-ring" aria-hidden>
                ★
              </span>
              <div className="admin-dash__kpi-value admin-dash__kpi-value--hero">{premiumUsers}</div>
              <div className="admin-dash__kpi-label">Tài khoản Premium</div>
              <span className="admin-dash__kpi-foot">{conversionRate}% chuyển đổi gói</span>
            </Motion.div>
          </Motion.div>
          <Motion.div
            className="admin-dash__kpi-grid admin-dash__kpi-grid--flow"
            variants={listReveal}
            initial="hidden"
            animate="visible"
          >
            <Motion.div className="admin-dash__kpi-card admin-dash__kpi-card--kurenai" variants={itemRise}>
              <span className="admin-dash__kpi-meta admin-dash__kpi-meta--soft">Free</span>
              <div className="admin-dash__kpi-value">{freeUsers}</div>
              <div className="admin-dash__kpi-label">Tài khoản Free</div>
            </Motion.div>
            <Motion.div className="admin-dash__kpi-card admin-dash__kpi-card--kurenai" variants={itemRise}>
              <div className="admin-dash__kpi-value">{formatVndFull(revenueToday)}</div>
              <div className="admin-dash__kpi-label">Doanh thu hôm nay</div>
            </Motion.div>
            <Motion.div className="admin-dash__kpi-card admin-dash__kpi-card--kurenai" variants={itemRise}>
              <div className="admin-dash__kpi-value">{formatVndFull(revenueCumulative)}</div>
              <div className="admin-dash__kpi-label">Doanh thu tích lũy</div>
            </Motion.div>
            <Motion.div className="admin-dash__kpi-card admin-dash__kpi-card--kurenai" variants={itemRise}>
              <div className="admin-dash__kpi-value">{new7}</div>
              <div className="admin-dash__kpi-label">Mới trong 7 ngày</div>
            </Motion.div>
            <Motion.div className="admin-dash__kpi-card admin-dash__kpi-card--kurenai" variants={itemRise}>
              <div className="admin-dash__kpi-value">{retention != null ? `${retention}%` : (msg24?.toLocaleString?.('vi-VN') ?? msg24)}</div>
              <div className="admin-dash__kpi-label">{retention != null ? 'Retention (30 ngày)' : 'Tin nhắn 24h'}</div>
            </Motion.div>
          </Motion.div>

          <Motion.div
            className="admin-dash__charts-row admin-dash__charts-row--single admin-dash__charts-row--reveal"
            variants={listReveal}
            initial="hidden"
            animate="visible"
            style={{ marginTop: '1.25rem' }}
          >
            <Motion.div className="admin-dash__card admin-dash__card--chart admin-dash__card--rise" variants={itemRise}>
              <h3 className="admin-dash__card-title admin-dash__card-title--serif">Tăng trưởng đăng ký (30 ngày)</h3>
              <p className="admin-dash__card-sub">Cột màu nhạt → đỏ theo thời gian (ngày gần nhất nổi bật hơn).</p>
              <div className="admin-dash__chart-h">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={growthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-chart-grid)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--admin-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--admin-muted)' }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(142, 3, 29, 0.06)' }} />
                    <Bar dataKey="count" name="Đăng ký" radius={[6, 6, 0, 0]}>
                      {growthData.map((_, i) => (
                        <Cell key={`g-${i}`} fill={signupBarFill(i, growthData.length)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Motion.div>
          </Motion.div>
        </>
      ) : !ovErr ? (
        <p className="admin-dash__card-sub">Đang tải số liệu người dùng…</p>
      ) : null}

      <h3 className="admin-dash__section-divider">Doanh thu</h3>

      <div className="admin-dash__charts-row">
        <div className="admin-dash__card admin-dash__card--chart">
          <h3 className="admin-dash__card-title">Doanh thu 8 tháng gần nhất</h3>
          <div className="admin-dash__chart-h">
            {revenue8.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenue8} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-chart-grid)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v} triệu`, 'Doanh thu']} />
                  <Legend />
                  <Bar dataKey="actual" name="Doanh thu" fill="#8e031d" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="admin-dash__card-sub">Chưa có dữ liệu doanh thu theo tháng.</p>
            )}
          </div>
        </div>
        <div className="admin-dash__card admin-dash__card--chart">
          <h3 className="admin-dash__card-title">Phân bổ Free / Premium</h3>
          <p className="admin-dash__card-sub">Học viên (role user): {packageTotal.toLocaleString('vi-VN')} tài khoản</p>
          <div className="admin-dash__donut-wrap">
            {packageTotal > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={packagePie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {packagePie.map((e) => (
                        <Cell key={e.name} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="admin-dash__donut-legend">
                  {packagePie.map((e) => (
                    <li key={e.name}>
                      <span className="admin-dash__dot" style={{ background: e.color }} />
                      <span>{e.name}</span>
                      <strong>{e.value.toLocaleString('vi-VN')}</strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="admin-dash__card-sub">Chưa có dữ liệu phân bổ.</p>
            )}
          </div>
        </div>
      </div>

      <div className="admin-dash__bottom-row">
        <div className="admin-dash__card admin-dash__card--cta">
          <h3 className="admin-dash__card-title">Thông báo toàn hệ thống</h3>
          <p className="admin-dash__cta-text">Dùng tab Hệ thống để soạn nội dung bảo trì / khuyến mãi và gửi (demo).</p>
          <button type="button" className="admin-dash__btn admin-dash__btn--dark">
            Mở tab Hệ thống
          </button>
        </div>
        <div className="admin-dash__card admin-dash__card--premium">
          <h3 className="admin-dash__card-title admin-dash__card-title--on-dark">YumeGo-ji Premium</h3>
          <p className="admin-dash__premium-desc">Quản lý gói &amp; mã giảm giá — tab Doanh thu.</p>
        </div>
      </div>
    </div>
  );
}
