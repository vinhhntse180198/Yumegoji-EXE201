import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { createAdminGame, deleteAdminGame, fetchAdminGames } from '../../../services/gameService';

const Motion = motion;

function normGame(g) {
  return {
    id: g.id ?? g.Id,
    slug: g.slug ?? g.Slug ?? '',
    name: g.name ?? g.Name ?? '',
    description: g.description ?? g.Description ?? '',
    skillType: g.skillType ?? g.SkillType ?? '',
    maxHearts: g.maxHearts ?? g.MaxHearts ?? 3,
    isPvp: Boolean(g.isPvp ?? g.IsPvp),
    isBossMode: Boolean(g.isBossMode ?? g.IsBossMode),
    sortOrder: g.sortOrder ?? g.SortOrder ?? 0,
    levelMin: g.levelMin ?? g.LevelMin ?? '',
    levelMax: g.levelMax ?? g.LevelMax ?? '',
  };
}

function truncate(s, n) {
  const t = String(s ?? '').trim();
  if (t.length <= n) return t || '—';
  return `${t.slice(0, n)}…`;
}

export function GamesAdminTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ slug: '', name: '', description: '', skillType: '', maxHearts: 3, sortOrder: 0 });
  const reduceMotion = useReducedMotion();

  const listReveal = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: reduceMotion ? 0 : 0.06,
          delayChildren: reduceMotion ? 0 : 0.04,
        },
      },
    }),
    [reduceMotion],
  );

  const cardRise = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
      },
    }),
    [reduceMotion],
  );

  const tableReveal = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: reduceMotion ? 0 : 0.035,
          delayChildren: reduceMotion ? 0 : 0.05,
        },
      },
    }),
    [reduceMotion],
  );

  const tableRow = useMemo(
    () => ({
      hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
      },
    }),
    [reduceMotion],
  );

  async function loadRows() {
    setLoading(true);
    setErr('');
    try {
      const list = await fetchAdminGames();
      setRows(Array.isArray(list) ? list.map(normGame) : []);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Không tải được danh sách game.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
    const id = setInterval(() => void loadRows(), 15000);
    return () => clearInterval(id);
  }, []);

  async function onAddGame() {
    if (!form.slug.trim() || !form.name.trim()) {
      setErr('Cần nhập slug và tên game.');
      return;
    }
    setErr('');
    try {
      await createAdminGame({
        slug: form.slug.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        skillType: form.skillType.trim() || null,
        maxHearts: Number(form.maxHearts) || 3,
        sortOrder: Number(form.sortOrder) || 0,
      });
      setForm({ slug: '', name: '', description: '', skillType: '', maxHearts: 3, sortOrder: 0 });
      await loadRows();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Không thêm được game.');
    }
  }

  async function onDeleteGame(id, name) {
    if (!window.confirm(`Xóa game "${name}"?`)) return;
    setErr('');
    try {
      await deleteAdminGame(id);
      await loadRows();
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Không xóa được game.');
    }
  }

  const total = rows.length;

  return (
    <div className="admin-dash__tab-inner">
      <Motion.div variants={listReveal} initial="hidden" animate="visible">
        <Motion.div variants={cardRise}>
          <h2 className="admin-dash__section-title admin-dash__section-title--serif">Quản lý trò chơi</h2>
        </Motion.div>

        <Motion.div className="admin-dash__subcard" variants={cardRise}>
          <h3 className="admin-dash__subcard-title">Thêm game mới</h3>
          <div className="admin-dash__form-grid">
            <label>
              Slug
              <input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="vd: kana-race" />
            </label>
            <label>
              Tên game
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="vd: Kana Race" />
            </label>
            <label>
              Skill type
              <input value={form.skillType} onChange={(e) => setForm((p) => ({ ...p, skillType: e.target.value }))} placeholder="vocabulary / grammar..." />
            </label>
            <label>
              Max hearts
              <input type="number" min={1} max={10} value={form.maxHearts} onChange={(e) => setForm((p) => ({ ...p, maxHearts: Number(e.target.value || 3) }))} />
            </label>
            <label>
              Sort order
              <input type="number" value={form.sortOrder} onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value || 0) }))} />
            </label>
            <label>
              Mô tả
              <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </label>
          </div>
          <div className="admin-dash__toolbar-actions" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="admin-dash__btn admin-dash__btn--primary" onClick={() => void onAddGame()}>
              + Thêm game
            </button>
            <button type="button" className="admin-dash__btn admin-dash__btn--ghost" onClick={() => void loadRows()} disabled={loading}>
              Làm mới
            </button>
            <span className="admin-dash__muted-sm">Tổng game: {total}</span>
          </div>
          {err ? <div className="admin-users__alert">{err}</div> : null}
        </Motion.div>

        <Motion.div className="admin-dash__subcard" variants={cardRise}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 className="admin-dash__subcard-title" style={{ margin: 0 }}>
              Danh sách game
            </h3>
            <span className="admin-dash__muted-sm">{loading ? 'Đang tải...' : 'Đồng bộ 15s/lần'}</span>
          </div>
          <div className="admin-users__table-scroll">
            <table className="admin-users__table">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Slug</th>
                  <th>Skill</th>
                  <th>PvP</th>
                  <th>Boss</th>
                  <th>Hearts</th>
                  <th>Sắp xếp</th>
                  <th>Cấp độ</th>
                  <th>Mô tả</th>
                  <th />
                </tr>
              </thead>
              <Motion.tbody variants={tableReveal} initial="hidden" animate="visible">
                {rows.map((g) => (
                  <Motion.tr key={g.id} variants={tableRow}>
                    <td>
                      <strong>{g.name}</strong>
                    </td>
                    <td>
                      <code className="admin-dash__muted-sm">{g.slug}</code>
                    </td>
                    <td>{g.skillType || '—'}</td>
                    <td>{g.isPvp ? 'Có' : '—'}</td>
                    <td>{g.isBossMode ? 'Có' : '—'}</td>
                    <td>{g.maxHearts}</td>
                    <td>{g.sortOrder}</td>
                    <td>
                      {g.levelMin || g.levelMax ? (
                        <span className="admin-users__level">
                          {g.levelMin || '—'} → {g.levelMax || '—'}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="admin-users__td-email">{truncate(g.description, 56)}</td>
                    <td>
                      <button type="button" className="admin-users__action admin-users__action--danger" onClick={() => void onDeleteGame(g.id, g.name)}>
                        Xóa
                      </button>
                    </td>
                  </Motion.tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td colSpan={10} className="admin-users__empty">
                      Chưa có game nào.
                    </td>
                  </tr>
                ) : null}
              </Motion.tbody>
            </table>
          </div>
        </Motion.div>
      </Motion.div>
    </div>
  );
}
