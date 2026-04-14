import { useEffect, useMemo, useState } from 'react';
import { createAdminGame, deleteAdminGame, fetchAdminGames } from '../../../services/gameService';

export function GamesAdminTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ slug: '', name: '', description: '', skillType: '', maxHearts: 3, sortOrder: 0 });

  async function loadRows() {
    setLoading(true);
    setErr('');
    try {
      const list = await fetchAdminGames();
      setRows(Array.isArray(list) ? list : []);
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

  const total = useMemo(() => rows.length, [rows]);

  return (
    <div className="admin-dash__tab-inner">
      <h2 className="admin-dash__section-title">Quản lý trò chơi</h2>
      <p className="admin-dash__section-desc">Dữ liệu game realtime từ DB. Có game mới thì tab Admin tự cập nhật.</p>

      <div className="admin-dash__subcard">
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
          <span className="admin-dash__muted-sm">Tổng game đang active: {total}</span>
        </div>
        {err ? <div className="admin-users__alert">{err}</div> : null}
      </div>

      <div className="admin-dash__subcard">
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
                <th>Hearts</th>
                <th>Sắp xếp</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.id}>
                  <td>
                    <strong>{g.name ?? g.Name}</strong>
                  </td>
                  <td>{g.slug ?? g.Slug}</td>
                  <td>{g.skillType ?? g.SkillType ?? '—'}</td>
                  <td>{g.maxHearts ?? g.MaxHearts ?? 3}</td>
                  <td>{g.sortOrder ?? g.SortOrder ?? 0}</td>
                  <td>
                    <button type="button" className="admin-users__action admin-users__action--danger" onClick={() => void onDeleteGame(g.id ?? g.Id, g.name ?? g.Name)}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={6} className="admin-users__empty">
                    Chưa có game nào.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-dash__subcard">
        <h3 className="admin-dash__subcard-title">Vật phẩm &amp; huy hiệu</h3>
        <p className="admin-dash__card-sub">Cấu hình drop rate, thành tích — minh họa.</p>
        <button type="button" className="admin-dash__btn admin-dash__btn--ghost">
          Quản lý inventory (demo)
        </button>
      </div>
    </div>
  );
}
