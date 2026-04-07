/** Dữ liệu mẫu & hằng số UI kiểm duyệt — đồng bộ với API khi có JWT Staff. */

export const modSummary = {
  pendingReports: 2,
  processedToday: 8,
  managedStudents: 2,
};

/** Khớp CreateReportRequest.Type backend */
export const REPORT_TYPE_OPTIONS = [
  { value: '', label: 'Tất cả loại' },
  { value: 'spam', label: 'Spam' },
  { value: 'profanity', label: 'Ngôn ngữ thô tục' },
  { value: 'harassment', label: 'Quấy rối' },
  { value: 'inappropriate', label: 'Nội dung không phù hợp' },
  { value: 'other', label: 'Khác' },
];

export const REPORT_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Đang chờ' },
  { value: 'resolved', label: 'Đã xử lý' },
  { value: 'dismissed', label: 'Đã bỏ qua' },
];

/** 1 = thấp, 2 = trung bình, 3 = cao */
export const SEVERITY_OPTIONS = [
  { value: '', label: 'Mọi mức độ' },
  { value: '1', label: 'Thấp' },
  { value: '2', label: 'Trung bình' },
  { value: '3', label: 'Cao' },
];

export function labelReportType(type) {
  const o = REPORT_TYPE_OPTIONS.find((x) => x.value === type);
  return o?.label || type || '—';
}

export function labelSeverity(sev) {
  const n = Number(sev);
  if (n === 1) return 'Thấp';
  if (n === 2) return 'Trung bình';
  if (n === 3) return 'Cao';
  return '—';
}

export const modReports = [
  {
    id: 'r1',
    dbId: null,
    reportedUser: 'user_xyz',
    reportedUserId: 42,
    reportedEmail: 'user_xyz@example.com',
    reporterLabel: 'Học viên A',
    reporterUsername: 'hocvien_a',
    reporterUserId: 101,
    reporterEmail: 'hocvien.a@nihongo.vn',
    reason: 'Spam',
    reportType: 'spam',
    severity: 2,
    status: 'pending',
    reasonTone: 'danger',
    content: 'Mua khóa học giá rẻ tại…',
    fullContent:
      'Mua khóa học giá rẻ tại link lạ — nội dung quảng cáo spam trong phòng N5. Người dùng đã gửi 3 tin tương tự trong 10 phút.',
    room: 'N5 — Sơ cấp',
    roomId: 2,
    messageId: 9001,
    time: '21:10',
    violationHistory: [
      { id: 'vh1', at: '2025-03-20', reason: 'Cảnh cáo nhẹ — spam nhẹ', moderator: 'mod_team' },
      { id: 'vh2', at: '2025-03-10', reason: 'Nhắc nhở nội quy phòng', moderator: 'mod_team' },
    ],
  },
  {
    id: 'r2',
    dbId: null,
    reportedUser: 'user_abc',
    reportedUserId: 55,
    reportedEmail: 'user_abc@example.com',
    reporterLabel: 'Học viên B',
    reporterUsername: 'hocvien_b',
    reporterUserId: 102,
    reporterEmail: 'hocvien.b@nihongo.vn',
    reason: 'Ngôn từ không phù hợp',
    reportType: 'profanity',
    severity: 3,
    status: 'pending',
    reasonTone: 'danger',
    content: 'Nội dung vi phạm quy định…',
    fullContent: 'Nội dung chứa ngôn từ thô tục hướng vào người khác trong phòng chung — cần xem xét mute hoặc cảnh cáo chính thức.',
    room: 'Phòng chung',
    roomId: 1,
    messageId: 9002,
    time: '21:00',
    violationHistory: [{ id: 'vh3', at: '2025-02-01', reason: 'Báo cáo spam (đã bỏ qua)', moderator: 'mod_legacy' }],
  },
];

export const modStudents = [
  {
    id: 's1',
    name: 'Nguyễn Văn A',
    sid: 'HV-1024',
    username: 'learner',
    email: 'learner@nihongo.vn',
    levelId: 1,
    levelCode: 'N5',
    levelLabel: 'N5 — Sơ cấp',
    levelTone: 'n5',
    joinedAt: '2024-02-10',
  },
  {
    id: 's2',
    name: 'Trần Thị B',
    sid: 'HV-1025',
    username: 'learner2',
    email: 'learner2@nihongo.vn',
    levelId: 3,
    levelCode: 'N3',
    levelLabel: 'N3 — Nâng cao',
    levelTone: 'n3',
    joinedAt: '2024-03-01',
  },
];

export const modLevelOptions = [
  { code: 'N5', levelId: 1, label: 'N5 — Sơ cấp', sub: 'Từ vựng & Hiragana cơ bản', tone: 'n5' },
  { code: 'N4', levelId: 2, label: 'N4 — Trung cấp', sub: 'Từ vựng & ngữ pháp mở rộng', tone: 'n4' },
  { code: 'N3', levelId: 3, label: 'N3 — Nâng cao', sub: 'Kanji & giao tiếp phức tạp', tone: 'n3' },
];

export const modChatRooms = [
  { id: 'c1', name: 'N5 — Sơ cấp', online: 12, messages: 156, lastActivity: '2 phút trước', active: true },
  { id: 'c2', name: 'N4 — Trung cấp', online: 8, messages: 89, lastActivity: '5 phút trước', active: true },
  { id: 'c3', name: 'N3 — Nâng cao', online: 5, messages: 42, lastActivity: '12 phút trước', active: true },
  { id: 'c4', name: 'Phòng chung', online: 20, messages: 340, lastActivity: 'Vừa xong', active: true },
];

/** Hoạt động kiểm duyệt gần đây (UI — có thể nối API nhật ký sau) */
export const modRecentModeration = [
  { id: 'a1', at: '14:32', actor: 'Bạn', action: 'Đánh dấu báo cáo #12 đã xử lý', detail: 'Spam — cảnh cáo + ghi chú nội bộ' },
  { id: 'a2', at: 'Hôm qua', actor: 'moderator2', action: 'Gửi cảnh cáo tới user #55', detail: 'Profanity' },
  { id: 'a3', at: '2 ngày trước', actor: 'Bạn', action: 'Mute chat 24h — phòng N5', detail: 'Quấy rối' },
];

/** Luồng tin “gần thời gian thực” (demo — thật cần SignalR / poll messages) */
/** Người online (demo — thật: presence API / SignalR) */
export const modOnlineUsers = [
  { id: 1, username: 'learner1', room: 'Phòng chung', since: '5 phút' },
  { id: 2, username: 'hocvien_a', room: 'N5 — Sơ cấp', since: '12 phút' },
  { id: 3, username: 'user_xyz', room: 'N5 — Sơ cấp', since: '1 phút' },
];

export const modLiveMessages = [
  { id: 'lm1', room: 'Phòng chung', user: 'learner99', text: 'こんにちは!', at: 'Vừa xong', flagged: false },
  { id: 'lm2', room: 'N5 — Sơ cấp', user: 'user_xyz', text: 'Click link sale...', at: '12s', flagged: true },
  { id: 'lm3', room: 'Phòng chung', user: 'mod_bot', text: '[Hệ thống] Từ khóa nhạy cảm: sale', at: '12s', flagged: true },
];

export const modSensitiveKeywordsDefault = ['spam', 'sale', 'khóa học lậu', 'đường link', 'chửi'];

export const modLessonEdits = [
  { id: 'le1', lesson: 'Bài 3 — Đếm số', editor: 'moderator1', at: '2025-03-26 10:00', change: 'Sửa ví dụ câu' },
  { id: 'le2', lesson: 'Từ vựng N4 — Tuần 2', editor: 'admin', at: '2025-03-25 16:20', change: 'Thêm audio' },
];

export const modPendingContributions = [
  { id: 'pc1', title: 'Flashcard từ vựng N3 (bản nháp)', author: 'hocvien_a', at: '2025-03-27', status: 'pending' },
  { id: 'pc2', title: 'Bài tập Kanji N4', author: 'learner2', at: '2025-03-26', status: 'pending' },
];

export const modModerationLog = [
  { id: 'ml1', at: '2025-03-28 09:12', action: 'resolve_report', target: 'Report #14', note: 'Spam — cảnh cáo' },
  { id: 'ml2', at: '2025-03-27 18:40', action: 'issue_warning', target: 'User #55', note: 'Profanity' },
  { id: 'ml3', at: '2025-03-27 11:05', action: 'dismiss_report', target: 'Report #11', note: 'Không đủ căn cứ' },
];

const LS_NOTES = 'yumegoji_mod_internal_notes';
const LS_LOG_APPEND = 'yumegoji_mod_log_append';

export function loadInternalNotes() {
  try {
    const raw = localStorage.getItem(LS_NOTES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveInternalNotes(map) {
  localStorage.setItem(LS_NOTES, JSON.stringify(map));
}

export function appendModerationLog(entry) {
  try {
    const raw = localStorage.getItem(LS_LOG_APPEND);
    const arr = raw ? JSON.parse(raw) : [];
    arr.unshift({ ...entry, id: `local-${Date.now()}` });
    localStorage.setItem(LS_LOG_APPEND, JSON.stringify(arr.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

export function loadAppendedLog() {
  try {
    const raw = localStorage.getItem(LS_LOG_APPEND);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
