import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { moderationService } from '../../../services/moderationService';
import { labelReportType } from '../mockModerator';

const Motion = motion;

const PERIODS = [
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
  { days: 90, label: '3 tháng' },
];

function normalizeTrendRows(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((row, idx) => {
        if (row == null || typeof row !== 'object') return null;
        const dateVal = row.date ?? row.Date;
        if (dateVal == null || dateVal === '') return null;
        const dateStr = typeof dateVal === 'string' ? dateVal : String(dateVal);
        const c = Number(row.reportsCreated ?? row.ReportsCreated ?? 0);
        const r = Number(row.reportsResolved ?? row.ReportsResolved ?? 0);
        return {
          key: `${dateStr}-${idx}`,
          date: dateStr,
          reportsCreated: Number.isFinite(c) ? c : 0,
          reportsResolved: Number.isFinite(r) ? r : 0,
        };
      })
      .filter(Boolean);
  }
  return [];
}

function formatDayLabel(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '—';
  if (dateStr.length >= 10) return dateStr.slice(5, 10);
  return dateStr;
}

/** Thứ trong tuần (UTC) — T2 = thứ Hai theo thói quen VN. */
const VI_DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function weekdayLabelFromYmd(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '—';
  const iso = dateStr.length >= 10 ? dateStr.slice(0, 10) : dateStr;
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return formatDayLabel(dateStr);
  return VI_DOW[d.getUTCDay()];
}

function normalizeMonthlyTrend(raw) {
  if (raw == null || !Array.isArray(raw)) return [];
  return raw
    .map((row, idx) => {
      if (row == null || typeof row !== 'object') return null;
      const monthKey = row.monthKey ?? row.MonthKey;
      if (monthKey == null || monthKey === '') return null;
      const monthLabel = row.monthLabel ?? row.MonthLabel ?? String(monthKey);
      const c = Number(row.reportsCreated ?? row.ReportsCreated ?? 0);
      const r = Number(row.reportsResolved ?? row.ReportsResolved ?? 0);
      return {
        key: `${monthKey}-${idx}`,
        date: String(monthKey),
        monthLabel: String(monthLabel),
        reportsCreated: Number.isFinite(c) ? c : 0,
        reportsResolved: Number.isFinite(r) ? r : 0,
      };
    })
    .filter(Boolean);
}

/** Fallback khi API cũ chưa có monthlyTrend: gom 90 điểm ngày thành 3 tháng dương lịch (UTC). */
function aggregateLastThreeMonthsFromDaily(daily) {
  if (!Array.isArray(daily) || daily.length === 0) return [];
  const buckets = new Map();
  for (const row of daily) {
    const ds = row.date;
    if (!ds || typeof ds !== 'string' || ds.length < 7) continue;
    const ym = ds.slice(0, 7);
    const cur = buckets.get(ym) || { reportsCreated: 0, reportsResolved: 0 };
    cur.reportsCreated += row.reportsCreated ?? 0;
    cur.reportsResolved += row.reportsResolved ?? 0;
    buckets.set(ym, cur);
  }
  const keys = [...buckets.keys()].sort();
  const last3 = keys.slice(-3);
  return last3.map((ym, idx) => {
    const [, mo] = ym.split('-');
    const mNum = Number(mo);
    return {
      key: `${ym}-${idx}`,
      date: ym,
      monthLabel: Number.isFinite(mNum) ? `Tháng ${mNum}` : ym,
      ...buckets.get(ym),
    };
  });
}

/** Khoảng cách nhãn trục X để tránh chồng chữ khi có nhiều ngày (dữ liệu thật từ API). */
function labelStepForCount(n) {
  if (n <= 12) return 1;
  if (n <= 24) return 2;
  if (n <= 45) return 4;
  return Math.max(1, Math.ceil(n / 14));
}

function mapReportToActivity(r) {
  const id = r.id ?? r.Id;
  const st = r.status ?? r.Status ?? '';
  const type = labelReportType(r.type ?? r.Type);
  const desc = String(r.description ?? r.Description ?? '')
    .trim()
    .slice(0, 160);
  const rawAt =
    r.updatedAt ?? r.UpdatedAt ?? r.resolvedAt ?? r.ResolvedAt ?? r.createdAt ?? r.CreatedAt;
  let at = '—';
  if (rawAt) {
    try {
      at = new Date(rawAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      at = String(rawAt);
    }
  }
  return {
    id,
    at,
    action: `Báo cáo #${id} · ${st}`,
    detail: [type, desc].filter(Boolean).join(' — ') || '—',
  };
}

export function OverviewTab() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetchAttemptedRef = useRef(false);
  const reduceMotion = useReducedMotion();

  const miniReveal = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: { staggerChildren: reduceMotion ? 0 : 0.07, delayChildren: reduceMotion ? 0 : 0.06 },
      },
    }),
    [reduceMotion],
  );

  const miniItem = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
    }),
    [reduceMotion],
  );

  const colRise = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 1, scaleY: 1 } : { opacity: 0, scaleY: 0.2 },
      visible: {
        opacity: 1,
        scaleY: 1,
        transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
      },
    }),
    [reduceMotion],
  );

  useEffect(() => {
    let cancelled = false;
    // Không gọi setErr(null) ở đây: chỉ xóa lỗi khi API trả về thành công (tránh che lỗi khi đang gọi lại).
    // Chỉ full-screen loading lần đầu; đổi khoảng ngày → giữ UI, tránh nhấp nháy / ẩn hết nội dung.
    queueMicrotask(() => {
      if (cancelled) return;
      if (!fetchAttemptedRef.current) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
    });

    Promise.all([
      moderationService.getStaffOverview(days),
      moderationService.listStaffReports({ limit: 24 }),
    ])
      .then(([ov, reports]) => {
        if (cancelled) return;
        setErr(null);
        setData(ov);
        setRecentReports(Array.isArray(reports) ? reports : []);
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.message || 'Không tải được tổng quan (cần quyền moderator + backend).');
      })
      .finally(() => {
        if (cancelled) return;
        fetchAttemptedRef.current = true;
        setLoading(false);
        setRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const chartMonthly = days === 90;
  /** Trục X theo thứ (T2…CN) cho 7 và 30 ngày. */
  const weekAxisDaily = !chartMonthly && (days === 7 || days === 30);

  const chartPoints = useMemo(() => {
    const daily = normalizeTrendRows(data?.trend ?? data?.Trend);
    if (chartMonthly) {
      const monthly = normalizeMonthlyTrend(data?.monthlyTrend ?? data?.MonthlyTrend);
      if (monthly.length > 0) return monthly;
      return aggregateLastThreeMonthsFromDaily(daily);
    }
    return daily;
  }, [data, chartMonthly]);

  const chartTitle = chartMonthly
    ? 'Lưu lượng kiểm duyệt (3 tháng)'
    : days === 30
      ? 'Lưu lượng kiểm duyệt (30 ngày)'
      : 'Lưu lượng kiểm duyệt (7 ngày)';

  const maxBar = useMemo(() => {
    const vals = chartPoints.flatMap((t) => [t.reportsCreated, t.reportsResolved]);
    const m = Math.max(0, ...vals);
    return m < 1 ? 1 : m;
  }, [chartPoints]);

  const useWideChart = !chartMonthly && chartPoints.length > 14;
  const labelStep = useMemo(() => {
    if (chartMonthly) return 1;
    if (days === 7 || days === 30) return 1;
    return labelStepForCount(chartPoints.length);
  }, [chartMonthly, days, chartPoints.length]);

  const sortedActivities = useMemo(() => {
    const rows = recentReports.map((rep) => ({ rep, act: mapReportToActivity(rep) }));
    rows.sort((a, b) => {
      const da = new Date(
        a.rep.updatedAt ?? a.rep.UpdatedAt ?? a.rep.createdAt ?? a.rep.CreatedAt ?? 0,
      ).getTime();
      const db = new Date(
        b.rep.updatedAt ?? b.rep.UpdatedAt ?? b.rep.createdAt ?? b.rep.CreatedAt ?? 0,
      ).getTime();
      return db - da;
    });
    return rows.slice(0, 12).map((x) => x.act);
  }, [recentReports]);

  return (
    <div className="mod-dash__panel">
      <div className="mod-dash__panel-head mod-dash__panel-head--row">
        <div>
          <h2 className="mod-dash__panel-title">Tổng quan kiểm duyệt</h2>
        </div>
        <div className="mod-dash__seg" role="group" aria-label="Khoảng thời gian biểu đồ">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              className={`mod-dash__seg-btn ${days === p.days ? 'mod-dash__seg-btn--on' : ''}`}
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {err ? (
        <p className="mod-dash__inline-hint mod-dash__inline-hint--warn" role="status">
          {err}
        </p>
      ) : null}
      {loading ? (
        <p className="mod-dash__muted mod-dash__inline-hint">Đang tải…</p>
      ) : refreshing ? (
        <p className="mod-dash__muted mod-dash__inline-hint">Đang cập nhật số liệu…</p>
      ) : null}

      {!loading && data ? (
        <Motion.div
          className="mod-dash__overview-grid"
          variants={miniReveal}
          initial="hidden"
          animate="visible"
        >
          <Motion.div className="mod-dash__mini-stat mod-dash__mini-stat--amber" variants={miniItem}>
            <span className="mod-dash__mini-stat-label">Đang chờ xử lý</span>
            <span className="mod-dash__mini-stat-value">{data.pendingCount ?? data.PendingCount ?? 0}</span>
          </Motion.div>
          <Motion.div className="mod-dash__mini-stat mod-dash__mini-stat--green" variants={miniItem}>
            <span className="mod-dash__mini-stat-label">Đã xử lý hôm nay</span>
            <span className="mod-dash__mini-stat-value">{data.resolvedTodayCount ?? data.ResolvedTodayCount ?? 0}</span>
          </Motion.div>
          <Motion.div className="mod-dash__mini-stat" variants={miniItem}>
            <span className="mod-dash__mini-stat-label">Đã bỏ qua hôm nay</span>
            <span className="mod-dash__mini-stat-value">{data.dismissedTodayCount ?? data.DismissedTodayCount ?? 0}</span>
          </Motion.div>
          <Motion.div className="mod-dash__mini-stat mod-dash__mini-stat--purple" variants={miniItem}>
            <span className="mod-dash__mini-stat-label">Báo cáo mới (~24h)</span>
            <span className="mod-dash__mini-stat-value">{data.newSinceYesterdayCount ?? data.NewSinceYesterdayCount ?? 0}</span>
          </Motion.div>
        </Motion.div>
      ) : null}

      <div className="mod-dash__subsection">
        <h3 className="mod-dash__subsection-title">{chartTitle}</h3>
        {!loading && chartPoints.length > 0 ? (
          <div
            className={useWideChart ? 'mod-dash__trend-scroll' : undefined}
            role="presentation"
          >
            <div
              className={`mod-dash__trend-chart ${useWideChart ? 'mod-dash__trend-chart--wide' : ''} ${chartMonthly ? 'mod-dash__trend-chart--monthly' : ''} ${days === 30 && !chartMonthly ? 'mod-dash__trend-chart--30d-wk' : ''}`}
              role="img"
              aria-label={chartMonthly ? 'Biểu đồ báo cáo theo tháng' : 'Biểu đồ báo cáo theo ngày'}
            >
              {chartPoints.map((t, idx) => {
                const c = t.reportsCreated;
                const r = t.reportsResolved;
                const h1 = Math.round((c / maxBar) * 100);
                const h2 = Math.round((r / maxBar) * 100);
                const showDateLabel = chartMonthly || idx % labelStep === 0 || idx === chartPoints.length - 1;
                const xLabel = chartMonthly
                  ? t.monthLabel || t.date
                  : weekAxisDaily
                    ? weekdayLabelFromYmd(t.date)
                    : formatDayLabel(t.date);
                const dayTitle = chartMonthly
                  ? `${t.monthLabel}: mới ${c}, đóng ${r}`
                  : weekAxisDaily
                    ? `${weekdayLabelFromYmd(t.date)} · ${t.date}: mới ${c}, đóng ${r}`
                    : `${t.date}: mới ${c}, đóng ${r}`;
                return (
                  <div
                    key={t.key}
                    className={`mod-dash__trend-col ${useWideChart ? 'mod-dash__trend-col--fixed' : ''} ${chartMonthly ? 'mod-dash__trend-col--monthly' : ''}`}
                    title={dayTitle}
                  >
                    <div className="mod-dash__trend-bars">
                      <Motion.span
                        className="mod-dash__trend-bar mod-dash__trend-bar--new"
                        variants={colRise}
                        initial="hidden"
                        animate="visible"
                        style={{
                          display: 'block',
                          height: c > 0 ? `${h1}%` : '0',
                          minHeight: c > 0 ? 4 : 0,
                          transformOrigin: 'bottom center',
                        }}
                        title={`Mới: ${c}`}
                      />
                      <Motion.span
                        className="mod-dash__trend-bar mod-dash__trend-bar--done"
                        variants={colRise}
                        initial="hidden"
                        animate="visible"
                        style={{
                          display: 'block',
                          height: r > 0 ? `${h2}%` : '0',
                          minHeight: r > 0 ? 4 : 0,
                          transformOrigin: 'bottom center',
                        }}
                        title={`Đóng: ${r}`}
                      />
                    </div>
                    <span className="mod-dash__trend-date" aria-hidden={!showDateLabel}>
                      {showDateLabel ? xLabel : '\u00a0'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : !loading ? (
          <p className="mod-dash__muted">Chưa có dữ liệu xu hướng (hoặc chưa có báo cáo trong khoảng thời gian này).</p>
        ) : null}
      </div>

      <div className="mod-dash__subsection">
        <h3 className="mod-dash__subsection-title">Hoạt động gần đây (báo cáo)</h3>
        {sortedActivities.length === 0 && !loading ? (
          <p className="mod-dash__muted">Chưa có báo cáo nào trong hệ thống.</p>
        ) : (
          <ul className="mod-dash__activity-list">
            {sortedActivities.map((a) => (
              <li key={a.id} className="mod-dash__activity-item">
                <span className="mod-dash__activity-time">{a.at}</span>
                <div>
                  <strong>{a.action}</strong>
                  <div className="mod-dash__activity-detail">{a.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
