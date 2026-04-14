import { useState } from 'react';
import { modLessonEdits, modPendingContributions } from '../mockModerator';
import { UploadLessonsTab } from './UploadLessonsTab';

const HUB_NAV = [
  { id: 'import', label: 'Import', desc: 'Tải tệp & AI' },
  { id: 'history', label: 'Lịch sử', desc: 'Chỉnh sửa gần đây' },
  { id: 'approvals', label: 'Phê duyệt', desc: 'Đóng góp học viên' },
];

export function ContentTab() {
  const [contrib, setContrib] = useState(modPendingContributions);
  const [hubView, setHubView] = useState('import');
  /** Remount Import để «+ Bài học mới» xoá form */
  const [importMountKey, setImportMountKey] = useState(0);

  function approve(id) {
    setContrib((c) => c.filter((x) => x.id !== id));
  }

  function newLesson() {
    setHubView('import');
    setImportMountKey((k) => k + 1);
  }

  return (
    <div className="mod-hub">
      <aside className="mod-hub__sidebar" aria-label="Trung tâm nội dung">
        <div className="mod-hub__brand">
          <span className="mod-hub__brand-mark">夢</span>
          <div>
            <div className="mod-hub__brand-title">Yumegoji</div>
            <div className="mod-hub__brand-sub">Moderator · Nội dung</div>
          </div>
        </div>
        <nav className="mod-hub__nav" aria-label="Nội dung moderator">
          {HUB_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.desc}
              className={`mod-hub__nav-item${hubView === item.id ? ' mod-hub__nav-item--active' : ''}`}
              onClick={() => setHubView(item.id)}
            >
              <span className="mod-hub__nav-icon" aria-hidden>
                {item.id === 'import' ? '📥' : item.id === 'history' ? '📜' : '✅'}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
        <button type="button" className="mod-hub__new" onClick={newLesson}>
          + Bài học mới
        </button>
      </aside>

      <div className="mod-hub__main">
        {hubView === 'import' ? <UploadLessonsTab key={importMountKey} /> : null}

        {hubView === 'history' ? (
          <div className="mod-hub__panel mod-dash__panel">
            <h2 className="mod-dash__panel-title">Lịch sử chỉnh sửa nội dung</h2>
            <div className="mod-dash__table-wrap">
              <table className="mod-dash__table">
                <thead>
                  <tr>
                    <th>Bài / gói</th>
                    <th>Người sửa</th>
                    <th>Thời điểm</th>
                    <th>Thay đổi</th>
                  </tr>
                </thead>
                <tbody>
                  {modLessonEdits.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <strong>{e.lesson}</strong>
                      </td>
                      <td className="mod-dash__mono">{e.editor}</td>
                      <td className="mod-dash__mono">{e.at}</td>
                      <td>{e.change}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {hubView === 'approvals' ? (
          <div className="mod-hub__panel mod-dash__panel">
            <h2 className="mod-dash__panel-title">Phê duyệt đóng góp (mẫu)</h2>
            <p className="mod-dash__panel-desc">
              Nội dung do học viên gửi — duyệt / từ chối (demo chỉ cập nhật state trình duyệt).
            </p>
            {contrib.length === 0 ? (
              <p className="mod-dash__muted">Không có bản chờ duyệt.</p>
            ) : (
              <ul className="mod-dash__contrib-list">
                {contrib.map((c) => (
                  <li key={c.id} className="mod-dash__contrib-item">
                    <div>
                      <strong>{c.title}</strong>
                      <div className="mod-dash__muted">
                        @{c.author} · {c.at}
                      </div>
                    </div>
                    <div className="mod-dash__contrib-actions">
                      <button type="button" className="mod-dash__btn mod-dash__btn--primary" onClick={() => approve(c.id)}>
                        Phê duyệt
                      </button>
                      <button type="button" className="mod-dash__btn mod-dash__btn--outline" onClick={() => approve(c.id)}>
                        Từ chối
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
