import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FORGE_NAV_ITEMS } from '../../data/forgeNavItems';
import { ROUTES } from '../../data/routes';

const DEMO_MASTERS = [
  { name: 'Hana S.', status: 'Forging Zen Shaders' },
  { name: 'Kenji W.', status: 'Reviewing JLPT N2' },
  { name: 'Master Ryu', status: 'In the forge' },
];

const DEMO_APPRENTICES = [
  { name: 'Mina K.', status: 'Practicing particles' },
  { name: 'Yuki T.', status: 'Reading manga' },
];

/**
 * @param {Object} props
 * @param {'general' | 'guild'} props.sidebarActive
 * @param {React.ReactNode} props.children — nội dung cột giữa (header + body + optional composer)
 * @param {boolean} [props.showBackToRooms]
 */
export function ForgeChatLayout({ sidebarActive, children, showBackToRooms = false }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="forge-chat">
      <aside className="forge-chat__sidebar" aria-label="Điều hướng chat">
        <div className="forge-chat__brand">
          <div className="forge-chat__brand-mark" aria-hidden>
            S
          </div>
          <div>
            <div className="forge-chat__brand-title">The Shokunin</div>
            <div className="forge-chat__brand-sub">MASTER ARTISAN</div>
          </div>
        </div>

        <nav className="forge-chat__nav">
          {FORGE_NAV_ITEMS.map((item) => {
            const isGeneral = item.id === 'general';
            const isGuild = item.id === 'guild';
            const isActive =
              (isGeneral && sidebarActive === 'general') ||
              (isGuild && sidebarActive === 'guild');
            if (item.to) {
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className={`forge-chat__nav-item ${isActive ? 'forge-chat__nav-item--active' : ''}`}
                >
                  <span className="forge-chat__nav-icon" aria-hidden />
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                className={`forge-chat__nav-item ${isActive ? 'forge-chat__nav-item--active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                }}
              >
                <span className="forge-chat__nav-icon" aria-hidden />
                {item.label}
              </button>
            );
          })}
        </nav>

        <button type="button" className="forge-chat__new-msg" onClick={() => navigate(ROUTES.CHAT)}>
          + NEW MESSAGE
        </button>

        <div className="forge-chat__sidebar-foot">
          <button type="button" className="forge-chat__foot-link" onClick={() => {}}>
            ⚙ SETTINGS
          </button>
          <button
            type="button"
            className="forge-chat__foot-link forge-chat__foot-link--danger"
            onClick={logout}
          >
            ⎋ LOGOUT
          </button>
        </div>
      </aside>

      <section className="forge-chat__center">{children}</section>

      <aside className="forge-chat__right" aria-label="Artisans online">
        <div className="forge-chat__online-head">
          <span>ARTISANS ONLINE — {12}</span>
          <button type="button" className="forge-chat__filter" aria-label="Lọc">
            ⛶
          </button>
        </div>
        <p className="forge-chat__online-section">MASTER ARTISANS</p>
        <ul className="forge-chat__online-list">
          {DEMO_MASTERS.map((p) => (
            <li key={p.name} className="forge-chat__online-item">
              <span className="forge-chat__online-av" aria-hidden />
              <div>
                <div className="forge-chat__online-name">{p.name}</div>
                <div className="forge-chat__online-status">{p.status}</div>
              </div>
            </li>
          ))}
        </ul>
        <p className="forge-chat__online-section">APPRENTICES</p>
        <ul className="forge-chat__online-list">
          {DEMO_APPRENTICES.map((p) => (
            <li key={p.name} className="forge-chat__online-item">
              <span className="forge-chat__online-av" aria-hidden />
              <div>
                <div className="forge-chat__online-name">{p.name}</div>
                <div className="forge-chat__online-status">{p.status}</div>
              </div>
            </li>
          ))}
        </ul>

        <div className="forge-chat__event">
          <div className="forge-chat__event-kicker">SPECIAL EVENT</div>
          <div className="forge-chat__event-title">Great Forge Ceremony</div>
          <div className="forge-chat__event-time">Starts in 2h 45m</div>
          <button type="button" className="forge-chat__event-btn">
            RSVP NOW
          </button>
        </div>

        {showBackToRooms && (
          <button type="button" className="forge-chat__back-rooms" onClick={() => navigate(ROUTES.CHAT)}>
            ← Danh sách phòng
          </button>
        )}
      </aside>
    </div>
  );
}
