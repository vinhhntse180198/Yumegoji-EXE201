import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { moderationService } from '../../../services/moderationService';
import { modLevelOptions } from '../mockModerator';

function levelMeta(code) {
  const o = modLevelOptions.find((x) => x.code === code);
  return o || modLevelOptions[0];
}

function mapStaffLearnerToRow(api) {
  const userId = api.userId ?? api.UserId;
  const levelIdRaw = api.levelId ?? api.LevelId;
  const levelId = levelIdRaw === null || levelIdRaw === undefined ? null : Number(levelIdRaw);
  const levelCodeRaw = api.levelCode ?? api.LevelCode;
  const levelCode = levelCodeRaw != null ? String(levelCodeRaw).toUpperCase() : null;
  const levelName = api.levelName ?? api.LevelName;

  const opt =
    (Number.isFinite(levelId) ? modLevelOptions.find((o) => o.levelId === levelId) : null) ||
    (levelCode ? modLevelOptions.find((o) => o.code === levelCode) : null);

  const levelLabel =
    opt?.label || (levelName && levelCode ? `${levelCode} — ${levelName}` : levelName) || 'Chưa xếp loại';
  const levelTone =
    opt?.tone ??
    (levelId === 1 ? 'n5' : levelId === 2 ? 'n4' : levelId === 3 ? 'n3' : 'none');

  const displayName = String(api.displayName ?? api.DisplayName ?? '').trim();
  const username = api.username ?? api.Username ?? '—';
  const name = displayName || username || `User #${userId}`;
  const created = api.createdAt ?? api.CreatedAt;

  return {
    userId,
    name,
    sid: `HV-${userId}`,
    username,
    email: api.email ?? api.Email ?? '—',
    levelId: Number.isFinite(levelId) ? levelId : null,
    levelCode: opt?.code ?? levelCode,
    levelLabel,
    levelTone,
    joinedAt: created
      ? new Date(created).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' })
      : '—',
  };
}

export function StudentsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [savingUserId, setSavingUserId] = useState(null);
  const [openId, setOpenId] = useState(null);
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await moderationService.listStaffLearners({ limit: 300 });
      setRows(list.map(mapStaffLearnerToRow));
    } catch (e) {
      setErr(e?.message || 'Không tải danh sách học viên (cần JWT moderator/admin).');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!openId) return undefined;
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenId(null);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openId]);

  const legend = useMemo(
    () => [
      { tone: 'n5', label: 'N5 — Sơ cấp' },
      { tone: 'n4', label: 'N4 — Trung cấp' },
      { tone: 'n3', label: 'N3 — Nâng cao' },
      { tone: 'none', label: 'Chưa xếp loại' },
    ],
    [],
  );

  async function applyLevel(userId, levelId, patchRow) {
    setSavingUserId(userId);
    setErr(null);
    try {
      await moderationService.patchLearnerLevel(userId, levelId);
      setRows((prev) => prev.map((s) => (s.userId === userId ? { ...s, ...patchRow } : s)));
      setOpenId(null);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.Message ||
        e?.message ||
        'Không cập nhật được cấp độ.';
      setErr(msg);
    } finally {
      setSavingUserId(null);
    }
  }

  function setLevel(userId, code) {
    const meta = levelMeta(code);
    return applyLevel(userId, meta.levelId, {
      levelId: meta.levelId,
      levelCode: meta.code,
      levelLabel: meta.label,
      levelTone: meta.tone,
    });
  }

  function clearLevel(userId) {
    return applyLevel(userId, null, {
      levelId: null,
      levelCode: null,
      levelLabel: 'Chưa xếp loại',
      levelTone: 'none',
    });
  }

  function levelIdDisplay(levelId) {
    if (levelId === null || levelId === undefined) return '—';
    return String(levelId);
  }

  return (
    <div className="mod-dash__panel">
      <div className="mod-dash__panel-head mod-dash__panel-head--row">
        <div>
          <h2 className="mod-dash__panel-title">Quản lý học viên</h2>
          <p className="mod-dash__panel-desc">
            Dữ liệu từ <code className="mod-dash__code">GET /api/Moderation/staff/learners</code>; cập nhật cấp:{' '}
            <code className="mod-dash__code">PATCH /api/Moderation/staff/learners/&#123;userId&#125;/level</code> với{' '}
            <code className="mod-dash__code">&#123; &quot;levelId&quot;: 1|2|3|null &#125;</code> (khớp bảng <code className="mod-dash__code">levels</code>).
          </p>
        </div>
        <button type="button" className="mod-dash__btn mod-dash__btn--ghost" onClick={load} disabled={loading}>
          ⟳ Làm mới
        </button>
      </div>
      {err ? (
        <p className="mod-dash__inline-hint mod-dash__inline-hint--warn" role="status">
          {err}
        </p>
      ) : null}
      {loading ? <p className="mod-dash__muted mod-dash__inline-hint">Đang tải…</p> : null}
      <div className="mod-dash__table-wrap" ref={wrapRef}>
        <table className="mod-dash__table">
          <thead>
            <tr>
              <th>Học viên</th>
              <th>Tên đăng nhập</th>
              <th>Email</th>
              <th>
                <abbr title="Khóa ngoại / cột users.level_id">level_id</abbr>
              </th>
              <th>Cấp độ</th>
              <th>Ngày tham gia</th>
              <th className="mod-dash__th-actions">Điều chỉnh</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="mod-dash__muted">
                  Chưa có học viên (role <code className="mod-dash__code">user</code>) trong hệ thống.
                </td>
              </tr>
            ) : null}
            {rows.map((s) => (
              <tr key={s.userId}>
                <td>
                  <div className="mod-dash__person">
                    <span className="mod-dash__avatar">{String(s.name).slice(0, 1).toUpperCase()}</span>
                    <div>
                      <div className="mod-dash__person-name">{s.name}</div>
                      <div className="mod-dash__subtle">{s.sid}</div>
                    </div>
                  </div>
                </td>
                <td className="mod-dash__mono">{s.username}</td>
                <td className="mod-dash__td-email">{s.email}</td>
                <td>
                  <span className="mod-dash__level-id">{levelIdDisplay(s.levelId)}</span>
                </td>
                <td>
                  <span className={`mod-dash__level mod-dash__level--${s.levelTone}`}>{s.levelLabel}</span>
                </td>
                <td className="mod-dash__mono">{s.joinedAt}</td>
                <td>
                  <div className="mod-dash__action-cell">
                    <button
                      type="button"
                      className="mod-dash__btn mod-dash__btn--outline"
                      onClick={() => setOpenId((x) => (x === s.userId ? null : s.userId))}
                      aria-expanded={openId === s.userId}
                      disabled={savingUserId === s.userId}
                    >
                      Chỉnh cấp độ ▾
                    </button>
                    {openId === s.userId ? (
                      <div className="mod-dash__action-menu mod-dash__action-menu--wide" role="menu">
                        {modLevelOptions.map((opt) => (
                          <button
                            key={opt.code}
                            type="button"
                            className="mod-dash__action-item mod-dash__action-item--stack"
                            role="menuitem"
                            disabled={savingUserId === s.userId}
                            onClick={() => setLevel(s.userId, opt.code)}
                          >
                            <span>
                              <strong>
                                {opt.label}
                                {s.levelCode === opt.code ? ' ✓' : ''}
                              </strong>
                              <small>
                                {opt.sub} · level_id = {opt.levelId}
                              </small>
                            </span>
                          </button>
                        ))}
                        <div className="mod-dash__menu-sep" />
                        <button
                          type="button"
                          className="mod-dash__action-item mod-dash__action-item--muted"
                          role="menuitem"
                          disabled={savingUserId === s.userId}
                          onClick={() => clearLevel(s.userId)}
                        >
                          <span>
                            <strong>Gỡ gán cấp</strong>
                            <small>Đặt level_id = NULL (chưa xếp loại)</small>
                          </span>
                        </button>
                        <div className="mod-dash__menu-sep" />
                        <button type="button" className="mod-dash__action-item mod-dash__action-item--muted" role="menuitem">
                          <span>
                            <strong>Reset bài test xếp loại</strong>
                            <small>Chưa nối API — có thể bổ sung sau</small>
                          </span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mod-dash__legend">
        <span className="mod-dash__legend-title">Chú thích cấp độ:</span>
        {legend.map((l) => (
          <span key={l.label} className="mod-dash__legend-item">
            <span className={`mod-dash__dot mod-dash__dot--${l.tone}`} aria-hidden />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
