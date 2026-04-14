import { useEffect, useMemo, useRef, useState } from 'react';
import { moderationService } from '../../../services/moderationService';
import { labelReportType } from '../mockModerator';

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

  const trend = useMemo(() => normalizeTrendRows(data?.trend ?? data?.Trend), [data]);

  const maxBar = useMemo(() => {
    const vals = trend.flatMap((t) => [t.reportsCreated, t.reportsResolved]);
    const m = Math.max(0, ...vals);
    return m < 1 ? 1 : m;
  }, [trend]);

  const trendHasAnyCount = useMemo(
    () => trend.some((t) => (t.reportsCreated ?? 0) > 0 || (t.reportsResolved ?? 0) > 0),
    [trend],
  );

  const useWideChart = trend.length > 14;
  const labelStep = useMemo(() => labelStepForCount(trend.length), [trend.length]);

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
          <p className="mod-dash__panel-desc">
            Số liệu từ <code className="mod-dash__code">GET /api/Moderation/staff/overview</code> — báo cáo chờ, đã xử lý,
            và xu hướng theo ngày.
          </p>
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
        <div className="mod-dash__overview-grid">
          <div className="mod-dash__mini-stat mod-dash__mini-stat--amber">
            <span className="mod-dash__mini-stat-label">Đang chờ xử lý</span>
            <span className="mod-dash__mini-stat-value">{data.pendingCount ?? data.PendingCount ?? 0}</span>
          </div>
          <div className="mod-dash__mini-stat mod-dash__mini-stat--green">
            <span className="mod-dash__mini-stat-label">Đã xử lý hôm nay</span>
            <span className="mod-dash__mini-stat-value">{data.resolvedTodayCount ?? data.ResolvedTodayCount ?? 0}</span>
          </div>
          <div className="mod-dash__mini-stat">
            <span className="mod-dash__mini-stat-label">Đã bỏ qua hôm nay</span>
            <span className="mod-dash__mini-stat-value">{data.dismissedTodayCount ?? data.DismissedTodayCount ?? 0}</span>
          </div>
          <div className="mod-dash__mini-stat mod-dash__mini-stat--purple">
            <span className="mod-dash__mini-stat-label">Báo cáo mới (~24h)</span>
            <span className="mod-dash__mini-stat-value">{data.newSinceYesterdayCount ?? data.NewSinceYesterdayCount ?? 0}</span>
          </div>
        </div>
      ) : null}

      <div className="mod-dash__subsection">
        <h3 className="mod-dash__subsection-title">Thống kê theo ngày</h3>
        <p className="mod-dash__subsection-desc">
          Cột tím: báo cáo mới; cột xanh: đã đóng (resolved/dismissed) trong ngày. Khoảng &quot;3 tháng&quot; = 90 ngày
          lịch từ API; cuộn ngang nếu nhiều cột.
        </p>
        {!loading && trend.length > 0 ? (
          <div
            className={useWideChart ? 'mod-dash__trend-scroll' : undefined}
            role="presentation"
          >
            <div
              className={`mod-dash__trend-chart ${useWideChart ? 'mod-dash__trend-chart--wide' : ''}`}
              role="img"
              aria-label="Biểu đồ báo cáo theo ngày"
            >
              {trend.map((t, idx) => {
                const c = t.reportsCreated;
                const r = t.reportsResolved;
                const h1 = Math.round((c / maxBar) * 100);
                const h2 = Math.round((r / maxBar) * 100);
                const showDateLabel =
                  idx % labelStep === 0 || idx === trend.length - 1;
                const dayTitle = `${t.date}: mới ${c}, đóng ${r}`;
                return (
                  <div
                    key={t.key}
                    className={`mod-dash__trend-col ${useWideChart ? 'mod-dash__trend-col--fixed' : ''}`}
                    title={dayTitle}
                  >
                    <div className="mod-dash__trend-bars">
                      <span
                        className="mod-dash__trend-bar mod-dash__trend-bar--new"
                        style={{
                          height: c > 0 ? `${h1}%` : '0',
                          minHeight: c > 0 ? 4 : 0,
                        }}
                        title={`Mới: ${c}`}
                      />
                      <span
                        className="mod-dash__trend-bar mod-dash__trend-bar--done"
                        style={{
                          height: r > 0 ? `${h2}%` : '0',
                          minHeight: r > 0 ? 4 : 0,
                        }}
                        title={`Đóng: ${r}`}
                      />
                    </div>
                    <span className="mod-dash__trend-date" aria-hidden={!showDateLabel}>
                      {showDateLabel ? formatDayLabel(t.date) : '\u00a0'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : !loading ? (
          <p className="mod-dash__muted">Chưa có dữ liệu xu hướng (hoặc chưa có báo cáo trong khoảng thời gian này).</p>
        ) : null}
        {!loading && trend.length > 0 && !trendHasAnyCount ? (
          <p className="mod-dash__muted mod-dash__inline-hint">
            Trong khoảng đã chọn, mỗi ngày đều 0 báo cáo — biểu đồ vẫn đúng theo dữ liệu server.
          </p>
        ) : null}
      </div>

      <div className="mod-dash__subsection">
        <h3 className="mod-dash__subsection-title">Hoạt động gần đây (báo cáo)</h3>
        <p className="mod-dash__subsection-desc">
          Danh sách từ <code className="mod-dash__code">GET /api/Moderation/staff/reports</code> (mới nhất trước).
        </p>
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
