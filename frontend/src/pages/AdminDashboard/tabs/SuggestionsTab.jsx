import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { adminService } from '../../../services/adminService';
import { useAnimatedNumber } from '../../../hooks/useAnimatedNumber';

const Motion = motion;

function pct(cur, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((cur / target) * 100));
}

export function SuggestionsTab() {
  const [ov, setOv] = useState(null);
  const [err, setErr] = useState('');
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let cancel = false;
    adminService
      .getOverview()
      .then((data) => {
        if (!cancel) setOv(data);
      })
      .catch((e) => {
        if (!cancel) setErr(e?.response?.data?.message || e?.message || 'Không tải được dữ liệu đề xuất từ API.');
      });
    return () => {
      cancel = true;
    };
  }, []);

  const monthLabel = useMemo(() => {
    const d = new Date();
    return `${d.getMonth() + 1}/${d.getFullYear()}`;
  }, []);

  const kpi = useMemo(() => {
    const revenueCurrent = Math.round(Number(ov?.revenueTodayVnd ?? ov?.RevenueTodayVnd ?? 0) / 1_000_000);
    const revenueTarget = Math.max(1, revenueCurrent + 5);
    const paidCurrent = Number(ov?.premiumUsers ?? ov?.PremiumUsers ?? 0);
    const paidTarget = Math.max(1, paidCurrent + 20);
    const convCurrent = Number(ov?.premiumConversionRatePercent ?? ov?.PremiumConversionRatePercent ?? 0);
    const convTarget = Math.max(1, Math.round(convCurrent + 8));
    return { revenueCurrent, revenueTarget, paidCurrent, paidTarget, convCurrent, convTarget };
  }, [ov]);

  const animRev = useAnimatedNumber(kpi.revenueCurrent, { duration: 900, reduceMotion });
  const animPaid = useAnimatedNumber(kpi.paidCurrent, { duration: 850, reduceMotion });
  const animConv = useAnimatedNumber(kpi.convCurrent, { duration: 800, reduceMotion });

  const suggestionCards = useMemo(() => {
    const premium = Number(ov?.premiumUsers ?? ov?.PremiumUsers ?? 0);
    const free = Number(ov?.freeUsers ?? ov?.FreeUsers ?? 0);
    const conversion = Number(ov?.premiumConversionRatePercent ?? ov?.PremiumConversionRatePercent ?? 0);
    const retention = Number(ov?.retentionRatePercent ?? ov?.RetentionRatePercent ?? 0);
    const msg24 = Number(ov?.messagesLast24Hours ?? ov?.MessagesLast24Hours ?? 0);
    const new7 = Number(ov?.newUsersLast7Days ?? ov?.NewUsersLast7Days ?? 0);
    return [
      {
        tone: 'blue',
        tag: 'Chuyển đổi',
        title: 'Tăng chuyển đổi Free -> Premium',
        body: `Hiện có ${free.toLocaleString('vi-VN')} tài khoản Free và ${premium.toLocaleString('vi-VN')} Premium (${conversion}%). Nên đặt điểm nâng cấp ở cuối bài học có tỷ lệ hoàn thành cao.`,
      },
      {
        tone: 'amber',
        tag: 'Retention',
        title: 'Giữ chân học viên cũ',
        body: `Retention 30 ngày đang là ${retention}%. Nên kích hoạt chiến dịch nhắc học lại cho nhóm không đăng nhập trong 7 ngày.`,
      },
      {
        tone: 'violet',
        tag: 'Hoạt động',
        title: 'Tối ưu trải nghiệm chat và game',
        body: `Hệ thống ghi nhận ${msg24.toLocaleString('vi-VN')} tin nhắn trong 24h. Ưu tiên tối ưu tải phòng chat và bảng xếp hạng game vào giờ cao điểm.`,
      },
      {
        tone: 'emerald',
        tag: 'Tăng trưởng',
        title: 'Tập trung nhóm người dùng mới',
        body: `Có ${new7.toLocaleString('vi-VN')} tài khoản mới trong 7 ngày. Nên gửi onboarding 3 bước trong 24h đầu để tăng tỷ lệ quay lại.`,
      },
    ];
  }, [ov]);

  const listReveal = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: { staggerChildren: reduceMotion ? 0 : 0.1, delayChildren: reduceMotion ? 0 : 0.05 },
      },
    }),
    [reduceMotion],
  );

  const itemRise = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
    }),
    [reduceMotion],
  );

  const goalsReveal = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: { staggerChildren: reduceMotion ? 0 : 0.12, delayChildren: reduceMotion ? 0 : 0.25 },
      },
    }),
    [reduceMotion],
  );

  const goalBars = useMemo(
    () => [
      {
        key: 'revenue',
        label: 'Doanh thu mục tiêu',
        current: kpi.revenueCurrent,
        target: kpi.revenueTarget,
        color: '#8e031d',
        display: () => `${animRev}M / ${kpi.revenueTarget}M`,
      },
      {
        key: 'paid',
        label: 'Học viên trả phí mới',
        current: kpi.paidCurrent,
        target: kpi.paidTarget,
        color: '#6366f1',
        display: () => `${animPaid} / ${kpi.paidTarget}`,
      },
      {
        key: 'conv',
        label: 'Tỷ lệ chuyển đổi',
        current: kpi.convCurrent,
        target: kpi.convTarget,
        color: '#ea580c',
        display: () => `${animConv}% / ${kpi.convTarget}%`,
      },
    ],
    [kpi, animRev, animPaid, animConv],
  );

  return (
    <div className="admin-dash__tab-inner">
      <Motion.div className="admin-dash__ai-hero" variants={itemRise} initial="hidden" animate="visible">
        <h2 className="admin-dash__ai-title">Đề xuất tối ưu hóa từ AI</h2>
        <p className="admin-dash__ai-desc">Phân tích dữ liệu thật từ API và gợi ý bốn hướng tối ưu doanh thu cùng trải nghiệm học viên.</p>
      </Motion.div>
      {err ? <div className="admin-users__alert">{err}</div> : null}

      <Motion.div className="admin-dash__suggest-grid" variants={listReveal} initial="hidden" animate="visible">
        {suggestionCards.map((c) => (
          <Motion.div key={c.title} className={`admin-dash__suggest-card admin-dash__suggest-card--${c.tone}`} variants={itemRise}>
            <span className="admin-dash__suggest-tag">{c.tag}</span>
            <h3 className="admin-dash__suggest-title">{c.title}</h3>
            <p className="admin-dash__suggest-body">{c.body}</p>
            <button type="button" className="admin-dash__suggest-link">
              Xem chi tiết →
            </button>
          </Motion.div>
        ))}
      </Motion.div>

      <Motion.div className="admin-dash__card admin-dash__card--goals" variants={itemRise} initial="hidden" animate="visible">
        <div className="admin-dash__goals-head">
          <div>
            <h3 className="admin-dash__card-title admin-dash__card-title--serif">Mục tiêu tháng {monthLabel}</h3>
            <p className="admin-dash__card-sub">KPI theo dõi từ API (mục tiêu tự tính theo dữ liệu hiện tại).</p>
          </div>
        </div>
        <Motion.ul className="admin-dash__goal-list" variants={goalsReveal} initial="hidden" animate="visible">
          {goalBars.map((b, idx) => (
            <Motion.li key={b.key} variants={itemRise}>
              <div className="admin-dash__goal-row">
                <span>{b.label}</span>
                <strong>{b.display()}</strong>
              </div>
              <div className="admin-dash__goal-track">
                <Motion.div
                  className="admin-dash__goal-fill"
                  initial={reduceMotion ? { width: `${pct(b.current, b.target)}%` } : { width: '0%' }}
                  animate={{ width: `${pct(b.current, b.target)}%` }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.95,
                    ease: [0.22, 1, 0.36, 1],
                    delay: reduceMotion ? 0 : 0.12 + idx * 0.1,
                  }}
                  style={{ background: b.color }}
                />
              </div>
              <span className="admin-dash__goal-pct">{pct(b.current, b.target)}%</span>
            </Motion.li>
          ))}
        </Motion.ul>
      </Motion.div>
    </div>
  );
}
