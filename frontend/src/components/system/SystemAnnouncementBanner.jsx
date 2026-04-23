import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { publicApi } from '../../api/publicApi';
import { ROUTES } from '../../data/routes';

const DISMISS_KEY = 'yumegoji_sys_ann_dismiss_id';
const POLL_MS = 60_000;

function readDismissedId() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) || '';
  } catch {
    return '';
  }
}

function writeDismissedId(id) {
  try {
    sessionStorage.setItem(DISMISS_KEY, String(id));
  } catch {
    /* ignore */
  }
}

export function SystemAnnouncementBanner() {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState(null);
  const [dismissedId, setDismissedId] = useState(readDismissedId);

  const hideOnRoute = useMemo(() => {
    const p = location.pathname || '';
    return p.startsWith(ROUTES.ADMIN) || p.startsWith(ROUTES.MODERATOR);
  }, [location.pathname]);

  useEffect(() => {
    if (hideOnRoute) return undefined;

    let cancelled = false;

    async function load() {
      try {
        const { data } = await publicApi.getLatestSystemAnnouncement();
        if (cancelled) return;
        const ann = data?.announcement ?? data?.Announcement ?? null;
        setAnnouncement(ann && (ann.id ?? ann.Id) ? ann : null);
      } catch {
        if (!cancelled) setAnnouncement(null);
      }
    }

    void load();
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [hideOnRoute]);

  if (hideOnRoute) return null;

  const id = announcement?.id ?? announcement?.Id;
  const title = announcement?.title ?? announcement?.Title ?? '';
  const content = announcement?.content ?? announcement?.Content ?? '';
  const type = announcement?.type ?? announcement?.Type ?? '';

  if (!id || !title) return null;
  if (String(dismissedId) === String(id)) return null;

  const typeLabel =
    type === 'maintenance'
      ? 'Bảo trì'
      : type === 'event'
        ? 'Sự kiện'
        : type === 'promo'
          ? 'Khuyến mãi'
          : type || 'Thông báo';

  return (
    <div className="sys-announce" role="region" aria-label="Thông báo hệ thống">
      <div className="sys-announce__inner">
        <span className="sys-announce__badge">{typeLabel}</span>
        <div className="sys-announce__text">
          <strong className="sys-announce__title">{title}</strong>
          {content ? <p className="sys-announce__body">{content}</p> : null}
        </div>
        <button
          type="button"
          className="sys-announce__close"
          aria-label="Đóng thông báo (chỉ ẩn trên thiết bị này)"
          onClick={() => {
            writeDismissedId(id);
            setDismissedId(String(id));
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
