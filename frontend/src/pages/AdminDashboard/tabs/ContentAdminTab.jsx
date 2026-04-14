import { adminContentOutline } from '../mockStats';

export function ContentAdminTab() {
  return (
    <div className="admin-dash__tab-inner">
      <h2 className="admin-dash__section-title">Quản lý nội dung học tập</h2>
      <p className="admin-dash__section-desc">
        CRUD thực tế nối <code className="admin-dash__code-inline">/api/moderator/lessons</code> và các controller Learning — đây là bản checklist UI đầy đủ theo đặc tả 3.4.
      </p>

      {adminContentOutline.map((block) => (
        <div key={block.id} className="admin-dash__subcard">
          <h3 className="admin-dash__subcard-title">{block.title}</h3>
          <ul className="admin-dash__card-sub" style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.6 }}>
            {block.items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <button type="button" className="admin-dash__btn admin-dash__btn--ghost" style={{ marginTop: '0.75rem' }}>
            Mở trình soạn thảo (nối API)
          </button>
        </div>
      ))}

      <div className="admin-dash__subcard">
        <h3 className="admin-dash__subcard-title">Upload tài liệu (PDF, audio, video)</h3>
        <p className="admin-dash__card-sub">Chọn tệp — hiện chỉ minh họa; lưu trữ nên dùng object storage + URL trong bài học.</p>
        <input type="file" multiple className="admin-dash__select" />
      </div>

      <div className="admin-dash__subcard">
        <h3 className="admin-dash__subcard-title">Flashcards</h3>
        <p className="admin-dash__card-sub">Quản lý bộ thẻ theo bài / level — bảng flashcards + API import CSV (bổ sung sau).</p>
        <button type="button" className="admin-dash__btn admin-dash__btn--primary">
          Tạo bộ thẻ mới (demo)
        </button>
      </div>
    </div>
  );
}
