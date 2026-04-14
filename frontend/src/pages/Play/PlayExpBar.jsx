import { useEffect, useMemo, useState } from 'react';
import { fetchMyProgressSummary } from '../../services/learningProgressService';

const EXP_REFRESH = 'yume-play-exp-refresh';

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

const TIERS = [
  { label: 'Bronze', minExp: 0 },
  { label: 'Silver', minExp: 5000 },
  { label: 'Gold', minExp: 15000 },
  { label: 'Platinum', minExp: 30000 },
];

function tierProgress(exp) {
  const e = Math.max(0, Number(exp) || 0);
  let idx = 0;
  for (let i = TIERS.length - 1; i >= 0; i -= 1) {
    if (e >= TIERS[i].minExp) {
      idx = i;
      break;
    }
  }
  const cur = TIERS[idx];
  const next = TIERS[idx + 1];
  if (!next) return { pct: 100, line: `${e.toLocaleString('vi-VN')} XP`, sub: cur.label };
  const span = next.minExp - cur.minExp;
  const pct = Math.min(100, Math.round(((e - cur.minExp) / span) * 100));
  return {
    pct,
    line: `${e.toLocaleString('vi-VN')} / ${next.minExp.toLocaleString('vi-VN')} XP`,
    sub: `${cur.label} → ${next.label}`,
  };
}

export default function PlayExpBar() {
  const [exp, setExp] = useState(0);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let c = false;
    const load = async () => {
      try {
        const s = await fetchMyProgressSummary();
        if (!c) {
          setExp(pick(s, 'exp', 'Exp') ?? 0);
          setErr(false);
        }
      } catch {
        if (!c) setErr(true);
      }
    };
    load();
    const onRefresh = () => {
      load();
    };
    window.addEventListener(EXP_REFRESH, onRefresh);
    return () => {
      c = true;
      window.removeEventListener(EXP_REFRESH, onRefresh);
    };
  }, []);

  const prog = useMemo(() => tierProgress(exp), [exp]);

  if (err) return null;

  return (
    <div className="play-expbar" aria-label="Tiến độ EXP">
      <div className="play-expbar__row">
        <span className="play-expbar__label">EXP · lên cấp</span>
        <span className="play-expbar__nums">{prog.line}</span>
      </div>
      <div className="play-expbar__track" role="progressbar" aria-valuenow={prog.pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="play-expbar__fill" style={{ width: `${prog.pct}%` }} />
      </div>
      <span className="play-expbar__sub">{prog.sub}</span>
    </div>
  );
}
