import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { ROUTES } from '../../data/routes';
import { fetchGameInventory, purchaseGamePowerUp } from '../../services/gameService';
import { fetchMyProgressSummary } from '../../services/learningProgressService';
import { SakuraRainLayer } from '../../components/effects/SakuraRainLayer';
import {
  artPowerup5050,
  artPowerupDouble,
  artPowerupHeart,
  artPowerupSkip,
  artPowerupTimeFreeze,
} from '../../assets/play';
import '../../styles/pages/play-shop-page.css';

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

function StarIcon({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2.5l2.8 6.5 7 .6-5.3 4.6 1.6 6.8L12 17.9 6.9 20.9l1.6-6.8L3.2 9.6l7-.6L12 2.5z"
      />
    </svg>
  );
}

export default function PlayShop() {
  const [inventory, setInventory] = useState(null);
  const [xu, setXu] = useState(0);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);
  const reduceMotion = useReducedMotion();

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

  const pageContainer = useMemo(
    () => ({
      hidden: {},
      show: {
        transition: {
          staggerChildren: reduceMotion ? 0 : 0.11,
          delayChildren: reduceMotion ? 0 : 0.05,
        },
      },
    }),
    [reduceMotion],
  );

  const pageBlock = useMemo(
    () => ({
      hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 22 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: reduceMotion ? 0.05 : 0.48, ease: [0.22, 1, 0.36, 1] },
      },
    }),
    [reduceMotion],
  );

  const listVariants = useMemo(
    () => ({
      hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 16 },
      show: {
        opacity: 1,
        y: 0,
        transition: {
          duration: reduceMotion ? 0.05 : 0.38,
          ease: [0.22, 1, 0.36, 1],
          staggerChildren: reduceMotion ? 0 : 0.065,
          delayChildren: reduceMotion ? 0 : 0.03,
        },
      },
    }),
    [reduceMotion],
  );

  const listItemVariants = useMemo(
    () => ({
      hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 26 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: reduceMotion ? 0.05 : 0.4, ease: [0.16, 1, 0.3, 1] },
      },
    }),
    [reduceMotion],
  );

  return (
    <div className="play-shop-page">
      <div className="play-shop-page__sakura-stack" aria-hidden>
        <div className="play-shop-page__sakura play-shop-page__sakura--far">
          <SakuraRainLayer petalCount={16} />
        </div>
        <div className="play-shop-page__sakura play-shop-page__sakura--mid">
          <SakuraRainLayer petalCount={24} buoyant />
        </div>
        <div className="play-shop-page__sakura play-shop-page__sakura--near">
          <SakuraRainLayer petalCount={12} buoyant />
        </div>
      </div>
      <div className="play-shop-page__wash" aria-hidden />

      <Motion.div
        className="play-shop-page__inner"
        variants={pageContainer}
        initial="hidden"
        animate="show"
      >
        <Motion.nav className="play-shop-page__toolbar" variants={pageBlock} aria-label="Điều hướng cửa hàng">
          <Link className="play-shop-page__back" to={ROUTES.PLAY}>
            ← Về danh sách trò chơi
          </Link>
        </Motion.nav>

        <Motion.header className="play-shop-page__hero" variants={pageBlock}>
          <div>
            <h1 className="play-shop-page__title">Cửa hàng Xu</h1>
            <p className="play-shop-page__lead">
              Mua vật phẩm (power-up) để dùng trong game — giá và số dư lấy từ tài khoản của bạn trên server.
            </p>
            <p className="play-shop-page__hint">
              Xu kiếm khi chơi: mỗi câu đúng +1 xu (tối đa theo số câu trong phiên), cộng thêm phần thưởng cuối phiên nếu có.
            </p>
          </div>
          <div className="play-shop-page__balance">
            <span className="play-shop-page__balance-label">Số dư hiện tại</span>
            <div className="play-shop-page__balance-row">
              <StarIcon className="play-shop-page__star" />
              <span>{formatIntVi(xu)}</span>
            </div>
          </div>
        </Motion.header>

        {msg ? <p className="play-shop-page__flash play-shop-page__flash--ok">{msg}</p> : null}
        {err ? <p className="play-shop-page__flash play-shop-page__flash--err">{err}</p> : null}

        {items.length === 0 && !err ? (
          <Motion.p className="play-shop-page__empty" variants={pageBlock}>
            Chưa có dữ liệu vật phẩm từ API.
          </Motion.p>
        ) : null}

        {items.length > 0 ? (
          <Motion.ul className="play-shop-page__grid" variants={listVariants}>
            {items.map((row) => {
            const id = row.id ?? row.Id;
            const slug = row.slug ?? row.Slug ?? '';
            const name = row.name ?? row.Name ?? slug;
            const desc = row.description ?? row.Description ?? '';
            const price = row.xuPrice ?? row.XuPrice;
            const qty = row.quantityOwned ?? row.QuantityOwned ?? 0;
            const isPremium = Boolean(pick(row, 'isPremium', 'IsPremium'));
            const img = ART_BY_SLUG[slug] ?? artPowerup5050;
            const priceNum = price != null ? Number(price) : NaN;
            const canBuy = Number.isFinite(priceNum) && priceNum >= 1 && xu >= priceNum;
            const rowKey = id != null && id !== '' ? `pu-${id}` : `pu-${slug}-${name}`;

            return (
              <Motion.li key={rowKey} className="play-shop-page__card" variants={listItemVariants}>
                <span className="play-shop-page__qty" title="Đang có trong túi">
                  {formatIntVi(qty)}
                </span>
                <div className="play-shop-page__icon-wrap">
                  <img className="play-shop-page__icon" src={img} alt="" />
                </div>
                <img className="play-shop-page__watermark" src={img} alt="" />
                <h3 className="play-shop-page__name">
                  {name}
                  {isPremium ? (
                    <span className="play-shop-page__premium" title="Vật phẩm Premium">
                      Premium
                    </span>
                  ) : null}
                </h3>
                <p className="play-shop-page__desc">{desc || '—'}</p>
                <div className="play-shop-page__row">
                  <div className="play-shop-page__price">
                    {Number.isFinite(priceNum) && priceNum >= 1 ? (
                      <>
                        <StarIcon className="play-shop-page__star" />
                        <span>{formatIntVi(priceNum)}</span>
                      </>
                    ) : (
                      <span className="play-shop-page__price-na">Chưa bán bằng xu</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="play-shop-page__buy"
                    disabled={!canBuy || busyId === id}
                    aria-busy={busyId === id}
                    onClick={() => onBuy(slug, priceNum, id)}
                  >
                    {busyId === id ? 'Đang mua…' : canBuy ? 'Mua' : 'Không đủ xu'}
                  </button>
                </div>
              </Motion.li>
            );
          })}
          </Motion.ul>
        ) : null}

        <Motion.section className="play-shop-page__promo" variants={pageBlock} aria-labelledby="shop-promo-title">
          <div>
            <p className="play-shop-page__promo-kicker">Ưu đãi hôm nay</p>
            <h2 id="shop-promo-title" className="play-shop-page__promo-title">
              Gói tăng tốc học tập
            </h2>
            <p className="play-shop-page__promo-text">
              Mở Premium để mở khóa lợi ích học tập và chơi game thoải mái hơn — xem chi tiết gói trên trang nâng cấp.
            </p>
            <Link className="play-shop-page__promo-cta" to={ROUTES.UPGRADE}>
              Xem ngay
            </Link>
          </div>
          <div className="play-shop-page__promo-art" aria-hidden>
            🎁
          </div>
        </Motion.section>

        <Motion.footer className="play-shop-page__foot" variants={pageBlock}>
          YumeGo-ji · Cửa hàng vật phẩm
        </Motion.footer>
      </Motion.div>
    </div>
  );
}
