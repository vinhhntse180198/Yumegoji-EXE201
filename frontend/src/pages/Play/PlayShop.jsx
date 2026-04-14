import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../data/routes';
import { fetchGameInventory, purchaseGamePowerUp } from '../../services/gameService';
import { fetchMyProgressSummary } from '../../services/learningProgressService';
import {
  artPowerup5050,
  artPowerupDouble,
  artPowerupHeart,
  artPowerupSkip,
  artPowerupTimeFreeze,
} from '../../assets/play';

const YUME_PLAY_EXP_REFRESH = 'yume-play-exp-refresh';

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

const ART_BY_SLUG = {
  'fifty-fifty': artPowerup5050,
  'time-freeze': artPowerupTimeFreeze,
  'double-points': artPowerupDouble,
  skip: artPowerupSkip,
  heart: artPowerupHeart,
};

function formatIntVi(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  return x.toLocaleString('vi-VN');
}

/** API đôi khi trả nhiều dòng trùng slug (seed cũ + mới) — gộp theo slug, giữ bản có id nhỏ nhất để key React ổn định. */
function dedupePowerUpRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const sorted = [...rows].sort((a, b) => {
    const ia = Number(a.id ?? a.Id) || 0;
    const ib = Number(b.id ?? b.Id) || 0;
    return ia - ib;
  });
  const seen = new Set();
  return sorted.filter((row) => {
    const slug = String(row.slug ?? row.Slug ?? '').trim().toLowerCase();
    if (!slug) return true;
    if (seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

export default function PlayShop() {
  const [inventory, setInventory] = useState(null);
  const [xu, setXu] = useState(0);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [inv, sum] = await Promise.all([fetchGameInventory(), fetchMyProgressSummary()]);
      setInventory(inv);
      setXu(Number(pick(sum, 'xu', 'Xu')) || 0);
      setErr('');
    } catch {
      setInventory(null);
      setErr('Không tải được cửa hàng — kiểm tra đăng nhập và API.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => {
    const raw = inventory?.items ?? inventory?.Items ?? [];
    return dedupePowerUpRows(Array.isArray(raw) ? raw : []);
  }, [inventory]);

  const onBuy = async (slug, unitPrice, rowId) => {
    if (busyId != null || unitPrice == null || unitPrice < 1) return;
    setBusyId(rowId);
    setMsg('');
    setErr('');
    try {
      await purchaseGamePowerUp({ powerUpSlug: slug, quantity: 1 });
      window.dispatchEvent(new Event(YUME_PLAY_EXP_REFRESH));
      await load();
      setMsg('Đã mua 1 vật phẩm.');
    } catch (e) {
      const apiMsg =
        e?.response?.data?.message ??
        e?.response?.data?.Message ??
        (typeof e?.message === 'string' ? e.message : '');
      setErr(apiMsg || 'Mua thất bại.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="play-dash">
      <header className="play-dash__nav">
        <div className="play-dash__brand">
          <span className="play-dash__brand-icon" aria-hidden>
            🛒
          </span>
          <span className="play-dash__brand-text">CỬA HÀNG XU</span>
        </div>
        <div className="play-dash__nav-stats">
          <span className="play-dash__pill play-dash__pill--coin">
            <span aria-hidden>🪙</span> {formatIntVi(xu)}
          </span>
        </div>
      </header>

      <div className="play-dash__columns">
        <div className="play-dash__main play-shop">
          <p className="play-dash__hint">
            <Link to={ROUTES.PLAY}>← Về danh sách trò chơi</Link>
          </p>
          <h1 className="play-shop__title">Mua vật phẩm (power-up)</h1>
          <p className="play-dash__hint">
            Giá do server quy định theo từng loại vật phẩm. Xu kiếm khi chơi: mỗi câu đúng +1 xu (tối đa bằng số câu trong phiên).
          </p>
          {msg ? <p className="play-shop__ok">{msg}</p> : null}
          {err ? <p className="play-shop__err">{err}</p> : null}

          {items.length === 0 && !err ? (
            <p className="play-dash__muted">Chưa có dữ liệu vật phẩm từ API.</p>
          ) : null}

          <ul className="play-dash__power-grid play-shop__grid">
            {items.map((row) => {
              const id = row.id ?? row.Id;
              const slug = row.slug ?? row.Slug ?? '';
              const name = row.name ?? row.Name ?? slug;
              const desc = row.description ?? row.Description ?? '';
              const price = row.xuPrice ?? row.XuPrice;
              const qty = row.quantityOwned ?? row.QuantityOwned ?? 0;
              const img = ART_BY_SLUG[slug] ?? artPowerup5050;
              const priceNum = price != null ? Number(price) : NaN;
              const canBuy = Number.isFinite(priceNum) && priceNum >= 1 && xu >= priceNum;
              const rowKey = id != null && id !== '' ? `pu-${id}` : `pu-${slug}-${name}`;

              return (
                <li key={rowKey} className="play-dash__power-card play-shop__card">
                  <span className="play-dash__power-qty">{formatIntVi(qty)}</span>
                  <img className="play-dash__power-img" src={img} alt="" />
                  <div className="play-dash__power-body">
                    <div className="play-dash__power-name">{name}</div>
                    <div className="play-dash__power-desc">{desc}</div>
                    <div className="play-shop__price">
                      {Number.isFinite(priceNum) && priceNum >= 1 ? (
                        <>
                          <strong>{formatIntVi(priceNum)}</strong> xu / cái
                        </>
                      ) : (
                        <span className="play-shop__na">Chưa bán bằng xu</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="play-shop__buy"
                      disabled={!canBuy || busyId === id}
                      onClick={() => onBuy(slug, priceNum, id)}
                    >
                      {busyId === id ? 'Đang mua…' : canBuy ? 'Mua 1' : 'Không đủ xu'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <footer className="play-dash__footer">YumeGo-ji · Cửa hàng vật phẩm</footer>
    </div>
  );
}
