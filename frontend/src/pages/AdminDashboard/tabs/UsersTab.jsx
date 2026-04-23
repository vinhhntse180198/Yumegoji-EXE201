import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { authService } from '../../../services/authService';
import { adminService } from '../../../services/adminService';
import { moderationService } from '../../../services/moderationService';

const Motion = motion;

const ROLES = [
  { value: '', label: 'Mọi vai trò' },
  { value: 'user', label: 'Học viên' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'admin', label: 'Admin' },
];

const LEVEL_BY_ID = {
  1: 'N5',
  2: 'N4',
  3: 'N3',
  4: 'N2',
  5: 'N1',
};

function formatApiError(err, fallback) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (data && typeof data === 'object') {
    const msg = data.message || data.title;
    const det = data.detail;
    if (msg && det) return `${msg}\n${det}`;
    if (msg) return String(msg);
  }
  if (status === 409) return 'Không thể hoàn tất: dữ liệu trên server xung đột hoặc còn ràng buộc.';
  if (status === 500) return 'Máy chủ báo lỗi (500). Xem log API hoặc thử lại sau.';
  return err?.message || fallback;
}

function normalizeUser(row) {
  const id = row.id ?? row.Id;
  const username = row.username ?? row.Username ?? '';
  const email = row.email ?? row.Email ?? '';
  const role = String(row.role ?? row.Role ?? 'user').toLowerCase();
  const isLocked = Boolean(row.isLocked ?? row.IsLocked);
  const levelId = row.levelId ?? row.LevelId ?? null;
  const isPremium = Boolean(row.isPremium ?? row.IsPremium);
  const exp = row.exp ?? row.Exp ?? 0;
  const xu = row.xu ?? row.Xu ?? 0;
  const isEmailVerified = Boolean(row.isEmailVerified ?? row.IsEmailVerified);
  const createdRaw = row.createdAt ?? row.CreatedAt;
  const createdAt = createdRaw ? new Date(createdRaw) : null;
  return { id, username, email, role, isLocked, levelId, isPremium, exp, xu, isEmailVerified, createdAt };
}

function RoleBadge({ role }) {
  const r = String(role).toLowerCase();
  if (r === 'admin') return <span className="admin-users__role admin-users__role--admin">Admin</span>;
  if (r === 'moderator') return <span className="admin-users__role admin-users__role--mod">Moderator</span>;
  return <span className="admin-users__role admin-users__role--user">Học viên</span>;
}

export function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [roleModal, setRoleModal] = useState(null);
  const [rolePick, setRolePick] = useState('user');
  const [query, setQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterLock, setFilterLock] = useState(''); // '', 'open', 'locked'
  const [filterPremium, setFilterPremium] = useState(''); // '', 'yes', 'no'
  const [filterLevel, setFilterLevel] = useState(''); // '', '1','2','3','none'
  const [pendingReports, setPendingReports] = useState(null);
  const [detailUser, setDetailUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [warnLoading, setWarnLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const reduceMotion = useReducedMotion();

  const myId = authService.getEffectiveUserId();

  const listReveal = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: reduceMotion ? 0 : 0.07,
          delayChildren: reduceMotion ? 0 : 0.04,
        },
      },
    }),
    [reduceMotion],
  );

  const statRise = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
      },
    }),
    [reduceMotion],
  );

  const tableReveal = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: reduceMotion ? 0 : 0.045,
          delayChildren: reduceMotion ? 0 : 0.06,
        },
      },
    }),
    [reduceMotion],
  );

  const tableRow = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
      },
    }),
    [reduceMotion],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await authService.adminListUsers();
      setUsers(list.map(normalizeUser));
    } catch (e) {
      setError(formatApiError(e, 'Không tải được danh sách người dùng.'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    adminService
      .getOverview()
      .then((data) => setOverview(data))
      .catch(() => setOverview(null));
  }, [users.length]);

  useEffect(() => {
    moderationService
      .listStaffReports({ status: 'pending', limit: 200 })
      .then((r) => setPendingReports(Array.isArray(r) ? r.length : 0))
      .catch(() => setPendingReports(null));
  }, [users.length]);

  useEffect(() => {
    if (!detailUser) {
      setWarnings([]);
      return;
    }
    let cancel = false;
    setWarnLoading(true);
    moderationService
      .listUserWarnings(detailUser.id, 40)
      .then((w) => {
        if (!cancel) setWarnings(Array.isArray(w) ? w : []);
      })
      .catch(() => {
        if (!cancel) setWarnings([]);
      })
      .finally(() => {
        if (!cancel) setWarnLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [detailUser]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filterRole && u.role !== filterRole) return false;
      if (filterLock === 'open' && u.isLocked) return false;
      if (filterLock === 'locked' && !u.isLocked) return false;
      if (filterPremium === 'yes' && !u.isPremium) return false;
      if (filterPremium === 'no' && u.isPremium) return false;
      if (filterLevel === 'none' && u.levelId != null) return false;
      if (filterLevel && filterLevel !== 'none' && String(u.levelId) !== filterLevel) return false;
      if (!q) return true;
      return (
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        String(u.id).includes(q)
      );
    });
  }, [users, query, filterRole, filterLock, filterPremium, filterLevel]);

  const activeCount = Number(overview?.activeUsers ?? overview?.ActiveUsers ?? users.filter((u) => !u.isLocked).length);
  const premiumCount = Number(overview?.premiumUsers ?? overview?.PremiumUsers ?? users.filter((u) => u.isPremium).length);
  const newCount = Number(
    overview?.newUsersLast7Days ?? overview?.NewUsersLast7Days ?? users.filter((u) => u.createdAt && u.createdAt.getTime() >= Date.now() - 7 * 86400000).length
  );
  const academyUsers = Number(overview?.academyUsers ?? overview?.AcademyUsers ?? users.filter((u) => u.role === 'user').length);

  async function toggleLock(u) {
    if (u.id === myId) return;
    setBusyId(u.id);
    setError('');
    try {
      await authService.adminUpdateUser(u.id, { isLocked: !u.isLocked });
      await load();
    } catch (e) {
      setError(formatApiError(e, 'Không cập nhật được trạng thái khóa.'));
    } finally {
      setBusyId(null);
    }
  }

  async function togglePremium(u) {
    if (u.id === myId) return;
    setBusyId(u.id);
    setError('');
    try {
      await authService.adminUpdateUser(u.id, { isPremium: !u.isPremium });
      await load();
      if (detailUser?.id === u.id) setDetailUser({ ...u, isPremium: !u.isPremium });
    } catch (e) {
      setError(formatApiError(e, 'Không cập nhật Premium.'));
    } finally {
      setBusyId(null);
    }
  }

  async function saveRole() {
    if (!roleModal) return;
    setBusyId(roleModal.id);
    setError('');
    try {
      await authService.adminUpdateUser(roleModal.id, { role: rolePick });
      setRoleModal(null);
      await load();
    } catch (e) {
      setError(formatApiError(e, 'Không đổi được vai trò.'));
    } finally {
      setBusyId(null);
    }
  }

  async function removeUser(u) {
    if (u.id === myId) return;
    if (
      !window.confirm(
        `Xóa vĩnh viễn @${u.username}?\n\nTài khoản và dữ liệu liên quan (tin nhắn, tiến độ, v.v.) sẽ bị gỡ khỏi database. Không thể hoàn tác.`
      )
    )
      return;
    setBusyId(u.id);
    setError('');
    try {
      await authService.adminDeleteUser(u.id);
      await load();
    } catch (e) {
      setError(formatApiError(e, 'Không xóa được tài khoản. Kiểm tra log server nếu lỗi lặp lại.'));
    } finally {
      setBusyId(null);
    }
  }

  async function openDetail(u) {
    setDetailError('');
    setDetailLoading(true);
    setDetailUser(u);
    try {
      const latest = await authService.getUserById(u.id);
      if (latest) setDetailUser(normalizeUser(latest));
    } catch (e) {
      setDetailError(formatApiError(e, 'Không tải được chi tiết người dùng, đang hiển thị dữ liệu hiện có.'));
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="admin-users">
      <Motion.div className="admin-users__stats" variants={listReveal} initial="hidden" animate="visible">
        <Motion.div className="admin-users__stat" variants={statRise}>
          <span className="admin-users__stat-icon admin-users__stat-icon--blue" aria-hidden>
            ◎
          </span>
          <div>
            <div className="admin-users__stat-value">{academyUsers}</div>
            <div className="admin-users__stat-label">Tài khoản học viện</div>
          </div>
        </Motion.div>
        <Motion.div className="admin-users__stat" variants={statRise}>
          <span className="admin-users__stat-icon admin-users__stat-icon--green" aria-hidden>
            ✓
          </span>
          <div>
            <div className="admin-users__stat-value">{activeCount}</div>
            <div className="admin-users__stat-label">Đang hoạt động</div>
          </div>
        </Motion.div>
        <Motion.div className="admin-users__stat" variants={statRise}>
          <span className="admin-users__stat-icon admin-users__stat-icon--purple" aria-hidden>
            ★
          </span>
          <div>
            <div className="admin-users__stat-value">{premiumCount}</div>
            <div className="admin-users__stat-label">Premium</div>
          </div>
        </Motion.div>
        <Motion.div className="admin-users__stat" variants={statRise}>
          <span className="admin-users__stat-icon admin-users__stat-icon--blue" aria-hidden>
            +
          </span>
          <div>
            <div className="admin-users__stat-value">{newCount}</div>
            <div className="admin-users__stat-label">Mới 7 ngày</div>
          </div>
        </Motion.div>
        <Motion.div className="admin-users__stat" variants={statRise}>
          <span className="admin-users__stat-icon admin-users__stat-icon--amber" aria-hidden>
            !
          </span>
          <div>
            <div className="admin-users__stat-value">{pendingReports ?? '—'}</div>
            <div className="admin-users__stat-label">Báo cáo chờ</div>
          </div>
        </Motion.div>
      </Motion.div>

      <div className="admin-users__panel">
        <div className="admin-users__panel-head">
          <div>
            <h3 className="admin-users__panel-title">Quản lý người dùng</h3>
          </div>
          <div className="admin-users__toolbar">
            <label className="admin-users__search">
              <span className="visually-hidden">Tìm</span>
              <input
                type="search"
                placeholder="Tìm username, email, id…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
            </label>
            <button type="button" className="admin-dash__btn admin-dash__btn--ghost admin-users__refresh" onClick={() => void load()} disabled={loading}>
              {loading ? 'Đang tải…' : 'Làm mới'}
            </button>
          </div>
        </div>

        <div className="admin-dash__filter-row" style={{ padding: '0 0 1rem' }}>
          <label>
            Vai trò
            <select className="admin-dash__select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r.value || 'all'} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Khóa
            <select className="admin-dash__select" value={filterLock} onChange={(e) => setFilterLock(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="open">Đang mở</option>
              <option value="locked">Đã khóa</option>
            </select>
          </label>
          <label>
            Premium
            <select className="admin-dash__select" value={filterPremium} onChange={(e) => setFilterPremium(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="yes">Có</option>
              <option value="no">Không</option>
            </select>
          </label>
          <label>
            Cấp độ
            <select className="admin-dash__select" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
              <option value="">Mọi cấp</option>
              <option value="1">N5</option>
              <option value="2">N4</option>
              <option value="3">N3</option>
              <option value="none">Chưa gán</option>
            </select>
          </label>
        </div>

        {error ? (
          <div className="admin-users__alert" role="alert">
            {error}
          </div>
        ) : null}

        <div className="admin-users__table-scroll">
          {loading && users.length === 0 ? (
            <p className="admin-users__empty">Đang tải danh sách…</p>
          ) : filtered.length === 0 ? (
            <p className="admin-users__empty">Không có người dùng khớp bộ lọc.</p>
          ) : (
            <table className="admin-users__table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Premium</th>
                  <th>Cấp độ</th>
                  <th className="admin-users__th-actions">Thao tác</th>
                </tr>
              </thead>
              <Motion.tbody variants={tableReveal} initial="hidden" animate="visible">
                {filtered.map((u) => {
                  const self = u.id === myId;
                  const level = u.levelId != null ? LEVEL_BY_ID[u.levelId] || `Lv.${u.levelId}` : '—';
                  return (
                    <Motion.tr key={u.id} className={busyId === u.id ? 'admin-users__tr--busy' : ''} variants={tableRow}>
                      <td>
                        <div className="admin-users__person">
                          <span className="admin-users__avatar" aria-hidden>
                            {String(u.username).slice(0, 1).toUpperCase()}
                          </span>
                          <div>
                            <div className="admin-users__name">{u.username}</div>
                            <div className="admin-users__handle">ID {u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="admin-users__td-email">{u.email}</td>
                      <td>
                        <RoleBadge role={u.role} />
                      </td>
                      <td>
                        {u.isLocked ? (
                          <span className="admin-users__status admin-users__status--locked">Đã khóa</span>
                        ) : (
                          <span className="admin-users__status admin-users__status--ok">Hoạt động</span>
                        )}
                      </td>
                      <td>{u.isPremium ? 'Có' : 'Không'}</td>
                      <td>
                        <span className="admin-users__level">{level}</span>
                      </td>
                      <td>
                        {self ? (
                          <span className="admin-users__self-note">Không thể tự chỉnh sửa</span>
                        ) : (
                          <div className="admin-users__actions">
                            <button type="button" className="admin-users__action" disabled={busyId === u.id} onClick={() => void openDetail(u)}>
                              Chi tiết
                            </button>
                            <button
                              type="button"
                              className="admin-users__action"
                              disabled={busyId === u.id}
                              title="Thay đổi vai trò"
                              onClick={() => {
                                setRolePick(u.role);
                                setRoleModal(u);
                              }}
                            >
                              Vai trò
                            </button>
                            <button type="button" className="admin-users__action" disabled={busyId === u.id} onClick={() => void togglePremium(u)}>
                              {u.isPremium ? 'Gỡ Premium' : 'Gán Premium'}
                            </button>
                            <button type="button" className="admin-users__action" disabled={busyId === u.id} onClick={() => void toggleLock(u)}>
                              {u.isLocked ? 'Mở khóa' : 'Khóa'}
                            </button>
                            <button type="button" className="admin-users__action admin-users__action--danger" disabled={busyId === u.id} onClick={() => void removeUser(u)}>
                              Xóa
                            </button>
                          </div>
                        )}
                      </td>
                    </Motion.tr>
                  );
                })}
              </Motion.tbody>
            </table>
          )}
        </div>
      </div>

      {roleModal ? (
        <div className="admin-dash__modal-back" role="presentation" onClick={() => setRoleModal(null)}>
          <div className="admin-dash__modal admin-users__modal" role="dialog" aria-labelledby="admin-role-title" onClick={(e) => e.stopPropagation()}>
            <h4 id="admin-role-title">Đổi vai trò</h4>
            <p className="admin-users__modal-user">@{roleModal.username} — thay đổi có hiệu lực ngay sau khi lưu.</p>
            <label className="admin-dash__modal-label">
              Vai trò
              <select className="admin-dash__select" value={rolePick} onChange={(e) => setRolePick(e.target.value)}>
                {ROLES.filter((r) => r.value).map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="admin-dash__modal-actions">
              <button type="button" className="admin-dash__btn admin-dash__btn--ghost" onClick={() => setRoleModal(null)}>
                Hủy
              </button>
              <button type="button" className="admin-dash__btn admin-dash__btn--primary" disabled={busyId != null} onClick={() => void saveRole()}>
                Lưu
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailUser ? (
        <div className="admin-dash__modal-back" role="presentation" onClick={() => setDetailUser(null)}>
          <div className="admin-dash__modal admin-dash__modal--wide" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h4>Hồ sơ: @{detailUser.username}</h4>
            <p className="admin-users__modal-user">
              Email: {detailUser.email} · Premium: {detailUser.isPremium ? 'Có' : 'Không'} · EXP {detailUser.exp} · Xu {detailUser.xu} · Email xác minh:{' '}
              {detailUser.isEmailVerified ? 'Có' : 'Chưa'}
            </p>
            {detailLoading ? <p className="admin-dash__card-sub">Đang đồng bộ chi tiết từ API…</p> : null}
            {detailError ? <p className="admin-users__alert">{detailError}</p> : null}
            <h5 style={{ margin: '1rem 0 0.35rem', fontSize: '0.85rem' }}>Thông tin tài khoản (API)</h5>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              <li>Trạng thái: {detailUser.isLocked ? 'Đã khóa' : 'Hoạt động'}</li>
              <li>Vai trò: {detailUser.role}</li>
              <li>Cấp độ: {detailUser.levelId != null ? LEVEL_BY_ID[detailUser.levelId] || `Lv.${detailUser.levelId}` : 'Chưa gán'}</li>
              <li>Tài khoản Premium: {detailUser.isPremium ? 'Có' : 'Không'}</li>
              <li>Ngày tạo: {detailUser.createdAt ? detailUser.createdAt.toLocaleString('vi-VN') : 'Chưa có dữ liệu'}</li>
              <li>Email xác minh: {detailUser.isEmailVerified ? 'Có' : 'Chưa'}</li>
            </ul>
            <h5 style={{ margin: '1rem 0 0.35rem', fontSize: '0.85rem' }}>Lịch sử cảnh cáo (API)</h5>
            {warnLoading ? <p className="admin-dash__card-sub">Đang tải…</p> : null}
            {!warnLoading && warnings.length === 0 ? <p className="admin-dash__card-sub">Không có cảnh cáo.</p> : null}
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              {warnings.map((w) => (
                <li key={w.id}>
                  {new Date(w.createdAt).toLocaleString('vi-VN')} — {w.reason} (mod #{w.moderatorId})
                </li>
              ))}
            </ul>
            <div className="admin-dash__modal-actions">
              <button type="button" className="admin-dash__btn admin-dash__btn--ghost" onClick={() => setDetailUser(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
