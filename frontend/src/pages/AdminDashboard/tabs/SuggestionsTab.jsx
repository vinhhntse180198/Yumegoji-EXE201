import { useEffect, useMemo, useState } from 'react';
import { suggestionCards } from '../mockStats';

const STORAGE_KEY = 'yume_admin_kpi_v1';

const defaultKpi = {
  revenueTarget: 38,
  revenueCurrent: 33.4,
  paidTarget: 120,
  paidCurrent: 90,
  convTarget: 50,
  convCurrent: 41,
};

function loadKpi() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultKpi;
    return { ...defaultKpi, ...JSON.parse(raw) };
  } catch {
    return defaultKpi;
  }
}

function pct(cur, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((cur / target) * 100));
}

export function SuggestionsTab() {
  const [kpi, setKpi] = useState(loadKpi);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(defaultKpi);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kpi));
  }, [kpi]);

  const monthLabel = useMemo(() => {
    const d = new Date();
    return `${d.getMonth() + 1}/${d.getFullYear()}`;
  }, []);

  const bars = useMemo(
    () => [
      {
        key: 'revenue',
        label: 'Doanh thu mục tiêu',
        current: kpi.revenueCurrent,
        target: kpi.revenueTarget,
        unit: 'M',
        display: `${kpi.revenueCurrent}M / ${kpi.revenueTarget}M`,
        color: '#16a34a',
      },
      {
        key: 'paid',
        label: 'Học viên trả phí mới',
        current: kpi.paidCurrent,
        target: kpi.paidTarget,
        unit: '',
        display: `${kpi.paidCurrent} / ${kpi.paidTarget}`,
        color: '#6366f1',
      },
      {
        key: 'conv',
        label: 'Tỷ lệ chuyển đổi',
        current: kpi.convCurrent,
        target: kpi.convTarget,
        unit: '%',
        display: `${kpi.convCurrent}% / ${kpi.convTarget}%`,
        color: '#ea580c',
      },
    ],
    [kpi]
  );

  return (
    <div className="admin-dash__tab-inner">
      <div className="admin-dash__ai-hero">
        <h2 className="admin-dash__ai-title">Đề xuất tối ưu hóa từ AI</h2>
        <p className="admin-dash__ai-desc">
          Phân tích xu hướng gần đây và gợi ý bốn hướng tối ưu doanh thu cùng trải nghiệm học viên.
        </p>
      </div>

      <div className="admin-dash__suggest-grid">
        {suggestionCards.map((c) => (
          <div key={c.title} className={`admin-dash__suggest-card admin-dash__suggest-card--${c.tone}`}>
            <span className="admin-dash__suggest-tag">{c.tag}</span>
            <h3 className="admin-dash__suggest-title">{c.title}</h3>
            <p className="admin-dash__suggest-body">{c.body}</p>
            <button type="button" className="admin-dash__suggest-link">
              Xem chi tiết →
            </button>
          </div>
        ))}
      </div>

      <div className="admin-dash__card admin-dash__card--goals">
        <div className="admin-dash__goals-head">
          <div>
            <h3 className="admin-dash__card-title">Mục tiêu tháng {monthLabel}</h3>
            <p className="admin-dash__card-sub">KPI theo dõi — bạn có thể chỉnh mục tiêu &amp; số thực tế (lưu trên trình duyệt)</p>
          </div>
          <button
            type="button"
            className="admin-dash__btn admin-dash__btn--ghost"
            onClick={() => {
              setDraft({ ...kpi });
              setEditOpen(true);
            }}
          >
            Chỉnh mục tiêu
          </button>
        </div>
        <ul className="admin-dash__goal-list">
          {bars.map((b) => (
            <li key={b.key}>
              <div className="admin-dash__goal-row">
                <span>{b.label}</span>
                <strong>{b.display}</strong>
              </div>
              <div className="admin-dash__goal-track">
                <div
                  className="admin-dash__goal-fill"
                  style={{ width: `${pct(b.current, b.target)}%`, background: b.color }}
                />
              </div>
              <span className="admin-dash__goal-pct">{pct(b.current, b.target)}%</span>
            </li>
          ))}
        </ul>
      </div>

      {editOpen ? (
        <div className="admin-dash__modal-back" role="presentation" onClick={() => setEditOpen(false)}>
          <div className="admin-dash__modal admin-dash__modal--wide" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h4>Chỉnh KPI mục tiêu</h4>
            <p className="admin-dash__modal-sub">Giá trị chỉ lưu trên trình duyệt hiện tại.</p>
            <div className="admin-dash__form-grid">
              <label>
                Doanh thu thực tế (triệu)
                <input
                  type="number"
                  step="0.1"
                  value={draft.revenueCurrent}
                  onChange={(e) => setDraft((d) => ({ ...d, revenueCurrent: Number(e.target.value) }))}
                />
              </label>
              <label>
                Doanh thu mục tiêu (triệu)
                <input
                  type="number"
                  step="0.1"
                  value={draft.revenueTarget}
                  onChange={(e) => setDraft((d) => ({ ...d, revenueTarget: Number(e.target.value) }))}
                />
              </label>
              <label>
                HV trả phí mới (thực tế)
                <input
                  type="number"
                  value={draft.paidCurrent}
                  onChange={(e) => setDraft((d) => ({ ...d, paidCurrent: Number(e.target.value) }))}
                />
              </label>
              <label>
                HV trả phí mới (mục tiêu)
                <input
                  type="number"
                  value={draft.paidTarget}
                  onChange={(e) => setDraft((d) => ({ ...d, paidTarget: Number(e.target.value) }))}
                />
              </label>
              <label>
                Tỷ lệ chuyển đổi thực tế (%)
                <input
                  type="number"
                  value={draft.convCurrent}
                  onChange={(e) => setDraft((d) => ({ ...d, convCurrent: Number(e.target.value) }))}
                />
              </label>
              <label>
                Tỷ lệ chuyển đổi mục tiêu (%)
                <input
                  type="number"
                  value={draft.convTarget}
                  onChange={(e) => setDraft((d) => ({ ...d, convTarget: Number(e.target.value) }))}
                />
              </label>
            </div>
            <div className="admin-dash__modal-actions">
              <button type="button" className="admin-dash__btn admin-dash__btn--ghost" onClick={() => setEditOpen(false)}>
                Hủy
              </button>
              <button
                type="button"
                className="admin-dash__btn admin-dash__btn--primary"
                onClick={() => {
                  setKpi({ ...draft });
                  setEditOpen(false);
                }}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
