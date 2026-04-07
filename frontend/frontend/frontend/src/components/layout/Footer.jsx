export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="layout-footer">
      <div className="sn-container footer-grid">
        <div className="footer-brand">
          <div className="footer-logo">Sakura Nihongo</div>
          <p className="footer-desc">
            Nền tảng học tiếng Nhật dành cho người Việt — học vui, nhớ lâu, luyện giao tiếp mỗi ngày.
          </p>
        </div>
        <div className="footer-col">
          <h4 className="footer-title">Bài viết</h4>
          <a className="footer-link" href="#roadmap">Lộ trình học JLPT</a>
          <a className="footer-link" href="#roadmap">Học Hiragana</a>
          <a className="footer-link" href="#roadmap">Học Katakana</a>
        </div>
        <div className="footer-col">
          <h4 className="footer-title">Cộng tác</h4>
          <a className="footer-link" href="#roadmap">Về chúng tôi</a>
          <a className="footer-link" href="#roadmap">Liên hệ</a>
          <a className="footer-link" href="#roadmap">Tuyển dụng</a>
        </div>
        <div className="footer-col">
          <h4 className="footer-title">Theo dõi</h4>
          <div className="footer-social">
            <span className="footer-social__dot" aria-hidden="true" />
            <span className="footer-social__dot" aria-hidden="true" />
            <span className="footer-social__dot" aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="footer-bottom sn-container">
        <span>&copy; {year} Sakura Nihongo. All rights reserved.</span>
        <span className="footer-bottom__right">Điều khoản sử dụng • Chính sách bảo mật</span>
      </div>
    </footer>
  );
}
