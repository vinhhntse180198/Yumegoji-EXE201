import { Link } from 'react-router-dom';
import { ROUTES } from '../../data/routes';
import { ChatbotWidget } from '../../components/support/ChatbotWidget';

export default function Home() {
  return (
    <div className="home">
      {/* Hero (2-column like screenshot) */}
      <section className="sn-hero">
        <div className="sn-container sn-hero__grid">
          <div className="sn-hero__content">
            <p className="sn-hero__eyebrow">HỌC TIẾNG NHẬT DỄ DÀNG</p>
            <h1 className="sn-hero__title">
              Chinh phục tiếng Nhật cùng <span className="sn-hero__accent">Sakura</span>
            </h1>
            <p className="sn-hero__desc">
              Học ngữ pháp và giao tiếp như người bản xứ thông qua phương pháp học
              tương tác, trò chơi và cộng đồng học tập 24/7.
            </p>
            <div className="sn-hero__cta">
              <Link to={ROUTES.REGISTER} className="btn btn--primary btn--lg">
                Bắt đầu học ngay
              </Link>
              <a href="#roadmap" className="btn btn--outline btn--lg">
                Xem lộ trình
              </a>
            </div>
          </div>

          <div className="sn-hero__visual">
            <div className="sn-visual-card">
              <div className="sn-visual-frame">
                <div className="sn-visual-image" aria-hidden="true" />
              </div>
              <div className="sn-visual-float">
                <span className="sn-visual-float__dot" />
                <div>
                  <div className="sn-visual-float__label">Điểm tích lũy hôm nay</div>
                  <div className="sn-visual-float__value">12,400+</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What you need (3 cards) */}
      <section className="sn-section">
        <div className="sn-container">
          <h2 className="sn-title">Mọi thứ bạn cần để thành thạo</h2>
          <p className="sn-subtitle">
            Chúng tôi kết hợp phương pháp học truyền thống với công nghệ hiện đại để mang lại hiệu quả cao nhất.
          </p>
          <div className="sn-grid-3">
            <article className="sn-feature">
              <div className="sn-feature__icon">📖</div>
              <h3 className="sn-feature__title">Học tập</h3>
              <ul className="sn-list">
                <li>100+ bài học video</li>
                <li>Kho từ vựng & Kanji</li>
                <li>Ngữ pháp thực dụng</li>
              </ul>
            </article>
            <article className="sn-feature">
              <div className="sn-feature__icon">💬</div>
              <h3 className="sn-feature__title">Trò chuyện</h3>
              <p className="sn-feature__text">
                Luyện nói cùng cộng đồng học viên và nhận phản hồi theo thời gian thực.
              </p>
              <div className="sn-tabs" aria-hidden="true">
                <span className="sn-tab sn-tab--active">N5</span>
                <span className="sn-tab">N4</span>
                <span className="sn-tab">N3</span>
              </div>
            </article>
            <article className="sn-feature">
              <div className="sn-feature__icon">🎮</div>
              <h3 className="sn-feature__title">Trò chơi</h3>
              <p className="sn-feature__text">
                Gamification giúp bạn duy trì động lực và ghi nhớ nhanh hơn.
              </p>
              <div className="sn-tabs" aria-hidden="true">
                <span className="sn-pill sn-pill--active">Quizzes</span>
                <span className="sn-pill">Puzzles</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Why choose (3 icons) */}
      <section id="roadmap" className="sn-section sn-section--alt">
        <div className="sn-container">
          <h2 className="sn-title">Tại sao chọn Sakura Nihongo?</h2>
          <div className="sn-grid-3 sn-why">
            <article className="sn-why__item">
              <div className="sn-why__badge">🧑‍🏫</div>
              <h3 className="sn-why__title">Giáo viên bản xứ</h3>
              <p className="sn-why__text">
                Học phát âm chuẩn và hội thoại thực tế với giáo viên giàu kinh nghiệm.
              </p>
            </article>
            <article className="sn-why__item">
              <div className="sn-why__badge">🎯</div>
              <h3 className="sn-why__title">Game hóa việc học</h3>
              <p className="sn-why__text">
                Nhiệm vụ, streak, thành tích giúp bạn học đều mỗi ngày.
              </p>
            </article>
            <article className="sn-why__item">
              <div className="sn-why__badge">🛟</div>
              <h3 className="sn-why__title">Hỗ trợ 24/7</h3>
              <p className="sn-why__text">
                Giải đáp nhanh chóng và đồng hành với bạn trong suốt quá trình học.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* CTA big red banner */}
      <section className="sn-cta">
        <div className="sn-container sn-cta__inner">
          <div>
            <h2 className="sn-cta__title">Sẵn sàng để bắt đầu hành trình?</h2>
            <p className="sn-cta__text">Đăng ký ngay hôm nay để nhận được lộ trình học miễn phí.</p>
          </div>
          <Link to={ROUTES.REGISTER} className="btn btn--inverted btn--lg">
            Tạo tài khoản ngay
          </Link>
        </div>
      </section>

      <ChatbotWidget />
    </div>
  );
}
