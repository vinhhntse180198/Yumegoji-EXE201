import { useEffect, useMemo, useState } from 'react';
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
  LineChart,
  Line,
} from 'recharts';
import { adminService } from '../../../services/adminService';

function formatVndFull(n) {
  const v = Number(n || 0);
  return new Intl.NumberFormat('vi-VN').format(v) + ' đ';
}

export function OverviewTab() {
  const [ov, setOv] = useState(null);
  const [ovErr, setOvErr] = useState(null);

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

  const levelFromApi = useMemo(() => {
    const raw = ov?.usersByLevel ?? ov?.UsersByLevel ?? [];
    if (!raw.length) return null;
    const max = Math.max(1, ...raw.map((x) => x.count ?? x.Count ?? 0));
    return raw.map((x) => ({
      level: x.label ?? x.Label ?? '—',
      count: x.count ?? x.Count ?? 0,
      pct: Math.round(((x.count ?? x.Count ?? 0) / max) * 100),
      color: '#7c3aed',
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

  const learning = useMemo(() => {
    const la = ov?.learningActivity ?? ov?.LearningActivity ?? {};
    return [
      {
        label: 'Phiên game (30 ngày)',
        value: (la.gameSessionsStartedLast30Days ?? la.GameSessionsStartedLast30Days ?? 0).toLocaleString('vi-VN'),
        icon: '▶',
      },
      {
        label: 'Bài học hoàn thành (30 ngày)',
        value: (la.completedLessonsLast30Days ?? la.CompletedLessonsLast30Days ?? 0).toLocaleString('vi-VN'),
        icon: '✓',
      },
      {
        label: 'Phiên game kết thúc (30 ngày)',
        value: (la.gameSessionsEndedLast30Days ?? la.GameSessionsEndedLast30Days ?? 0).toLocaleString('vi-VN'),
        icon: '🎮',
      },
    ];
  }, [ov]);

  const packageTotal = useMemo(() => packagePie.reduce((s, x) => s + x.value, 0), [packagePie]);

  return (
    <div className="admin-dash__tab-inner">
      <div className="admin-dash__toolbar">
        <div>
          <h2 className="admin-dash__section-title">Tổng quan hệ thống</h2>
          <p className="admin-dash__section-desc">
            Số liệu người dùng + doanh thu lấy trực tiếp từ <code className="admin-dash__code-inline">GET /api/Admin/overview</code>.
          </p>
        </div>
        <div className="admin-dash__toolbar-actions">
          <span className="admin-dash__date-pill">Cập nhật theo thời gian thực</span>
          <button
            type="button"
            className="admin-dash__btn admin-dash__btn--primary"
            onClick={() => {
              const rows = growthData.map((r) => `${r.day},${r.count}`).join('\n');
              const blob = new Blob([`day,count\n${rows}`], { type: 'text/csv;charset=utf-8' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'user-signups-sample.csv';
              a.click();
            }}
          >
            Xuất CSV đăng ký (API)
          </button>
        </div>
      </div>

      {ovErr ? (
        <div className="admin-users__alert" role="alert">
          {ovErr}
        </div>
      ) : null}

      {ov ? (
        <>
          <div className="admin-dash__kpi-grid admin-dash__kpi-grid--4">
            <div className="admin-dash__kpi-card">
              <span className="admin-dash__kpi-meta">Free</span>
              <div className="admin-dash__kpi-value">{totalUsers}</div>
              <div className="admin-dash__kpi-label">Tài khoản học viện</div>
            </div>
            <div className="admin-dash__kpi-card">
              <div className="admin-dash__kpi-value">{activeUsers}</div>
              <div className="admin-dash__kpi-label">Đang hoạt động (không khóa)</div>
            </div>
            <div className="admin-dash__kpi-card">
              <span className="admin-dash__kpi-meta">Premium</span>
              <div className="admin-dash__kpi-value">{premiumUsers}</div>
              <div className="admin-dash__kpi-label">Tài khoản Premium</div>
            </div>
            <div className="admin-dash__kpi-card">
              <span className="admin-dash__kpi-meta">{conversionRate}% chuyển đổi</span>
              <div className="admin-dash__kpi-value">{freeUsers}</div>
              <div className="admin-dash__kpi-label">Tài khoản Free</div>
            </div>
          </div>
          <div className="admin-dash__kpi-grid admin-dash__kpi-grid--4" style={{ marginTop: '0.75rem' }}>
            <div className="admin-dash__kpi-card">
              <div className="admin-dash__kpi-value">{formatVndFull(revenueToday)}</div>
              <div className="admin-dash__kpi-label">Doanh thu hôm nay</div>
            </div>
            <div className="admin-dash__kpi-card">
              <div className="admin-dash__kpi-value">{formatVndFull(revenueCumulative)}</div>
              <div className="admin-dash__kpi-label">Doanh thu tích lũy</div>
            </div>
            <div className="admin-dash__kpi-card">
              <div className="admin-dash__kpi-value">{new7}</div>
              <div className="admin-dash__kpi-label">Mới trong 7 ngày</div>
            </div>
            <div className="admin-dash__kpi-card">
              <div className="admin-dash__kpi-value">{retention != null ? `${retention}%` : (msg24?.toLocaleString?.('vi-VN') ?? msg24)}</div>
              <div className="admin-dash__kpi-label">{retention != null ? 'Retention (30 ngày)' : 'Tin nhắn 24h'}</div>
            </div>
          </div>

          <div className="admin-dash__charts-row" style={{ marginTop: '1.25rem' }}>
            <div className="admin-dash__card admin-dash__card--chart">
              <h3 className="admin-dash__card-title">Tăng trưởng đăng ký (30 ngày)</h3>
              <p className="admin-dash__card-sub">Số tài khoản mới theo ngày — từ database.</p>
              <div className="admin-dash__chart-h">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={growthData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-chart-grid)" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" name="Đăng ký" stroke="#7c3aed" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="admin-dash__card admin-dash__card--chart">
              <h3 className="admin-dash__card-title">Phân bổ theo trình độ (level_id)</h3>
              <p className="admin-dash__card-sub">N5 / N4 / N3 / chưa gán — theo bảng users.</p>
              <div className="admin-dash__chart-h">
                {levelFromApi && levelFromApi.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={levelFromApi} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-chart-grid)" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="level" width={72} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Số user" fill="#6366f1" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="admin-dash__card-sub">Không có dữ liệu.</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : !ovErr ? (
        <p className="admin-dash__card-sub">Đang tải số liệu người dùng…</p>
      ) : null}

      <h3 className="admin-dash__section-divider">Doanh thu &amp; hoạt động học tập</h3>

      <div className="admin-dash__toolbar" style={{ marginTop: '1rem' }}>
        <div>
          <h2 className="admin-dash__section-title" style={{ fontSize: '1.15rem' }}>
            Kế hoạch kinh doanh
          </h2>
          <p className="admin-dash__section-desc">Doanh thu theo tháng (8 tháng gần nhất) từ giao dịch Premium đã duyệt; phân bổ Free/Premium từ DB.</p>
        </div>
        <div className="admin-dash__toolbar-actions">
          <span className="admin-dash__date-pill">Cập nhật theo API</span>
        </div>
      </div>

      <div className="admin-dash__kpi-grid admin-dash__kpi-grid--4">
        <div className="admin-dash__kpi-card">
          <div className="admin-dash__kpi-value">{formatVndFull(revenueToday)}</div>
          <div className="admin-dash__kpi-label">Doanh thu hôm nay</div>
        </div>
        <div className="admin-dash__kpi-card">
          <div className="admin-dash__kpi-value">{formatVndFull(revenueCumulative)}</div>
          <div className="admin-dash__kpi-label">Doanh thu tích lũy</div>
        </div>
        <div className="admin-dash__kpi-card">
          <span className="admin-dash__kpi-meta">Premium / Academy</span>
          <div className="admin-dash__kpi-value">{conversionRate}%</div>
          <div className="admin-dash__kpi-label">Tỷ lệ chuyển đổi</div>
        </div>
        <div className="admin-dash__kpi-card">
          <div className="admin-dash__kpi-value">{totalUsers}</div>
          <div className="admin-dash__kpi-label">Số user học viện</div>
        </div>
      </div>

      <div className="admin-dash__charts-row">
        <div className="admin-dash__card admin-dash__card--chart">
          <h3 className="admin-dash__card-title">Doanh thu 8 tháng gần nhất</h3>
          <p className="admin-dash__card-sub">Tổng tiền duyệt theo tháng (triệu VND) — nguồn premium_payment_requests.</p>
          <div className="admin-dash__chart-h">
            {revenue8.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenue8} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-chart-grid)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v} triệu`, 'Doanh thu']} />
                  <Legend />
                  <Bar dataKey="actual" name="Doanh thu" fill="#be123c" radius={[6, 6, 0, 0]} />
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

      <div className="admin-dash__card admin-dash__card--activity">
        <h3 className="admin-dash__card-title">Thống kê hoạt động học tập (30 ngày)</h3>
        <p className="admin-dash__card-sub">Đếm từ game_sessions và user_lesson_progress trên database.</p>
        <div className="admin-dash__activity-row">
          {learning.map((a) => (
            <div key={a.label} className="admin-dash__activity-item">
              <span className="admin-dash__activity-ico" aria-hidden>
                {a.icon}
              </span>
              <div>
                <div className="admin-dash__activity-value">{a.value}</div>
                <div className="admin-dash__activity-label">{a.label}</div>
              </div>
            </div>
          ))}
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
