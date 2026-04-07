/** Thống kê tổng hợp (tạm dùng dữ liệu nội bộ — có thể nối API sau). */

export const overviewKpi = {
  revenueMonth: 33_400_000,
  revenueTrend: 12.8,
  totalStudents: 880,
  studentsTrend: 90,
  paidStudents: 360,
  paidRatio: 41,
  messagesToday: 1284,
  messagesTrend: 12,
};

export const overviewBarData = [
  { name: 'T1', actual: 12, plan: 14 },
  { name: 'T2', actual: 15, plan: 15 },
  { name: 'T3', actual: 18, plan: 17 },
  { name: 'T4', actual: 20, plan: 19 },
  { name: 'T5', actual: 24, plan: 22 },
  { name: 'T6', actual: 31, plan: 26 },
  { name: 'T7', actual: 28, plan: 28 },
  { name: 'T8', actual: 33, plan: 30 },
];

export const overviewPackageData = [
  { name: 'Miễn phí', value: 520, color: '#94a3b8' },
  { name: 'N5 Basic', value: 210, color: '#60a5fa' },
  { name: 'N4-N5 Combo', value: 95, color: '#818cf8' },
  { name: 'N3 Pro', value: 55, color: '#a78bfa' },
];

export const weeklyActivity = [
  { label: 'SESSIONS', value: '2.450', icon: '▶' },
  { label: 'COMPLETED LESSONS', value: '1.120', icon: '✓' },
  { label: 'GAME PLAYS', value: '892', icon: '🎮' },
];

/** Chuỗi số liệu doanh thu theo kỳ (bảng biểu đồ). */
export function getRevenueSeries(period) {
  if (period === 'day') {
    return [
      { m: '6h', revenue: 0.4, students: 880, newStudents: 2 },
      { m: '9h', revenue: 1.1, students: 882, newStudents: 4 },
      { m: '12h', revenue: 1.8, students: 885, newStudents: 6 },
      { m: '15h', revenue: 2.0, students: 886, newStudents: 7 },
      { m: '18h', revenue: 2.4, students: 888, newStudents: 8 },
      { m: '21h', revenue: 2.7, students: 890, newStudents: 9 },
    ];
  }
  if (period === 'month') {
    return [
      { m: 'Tuần 1', revenue: 8.2, students: 210, newStudents: 12 },
      { m: 'Tuần 2', revenue: 9.1, students: 225, newStudents: 18 },
      { m: 'Tuần 3', revenue: 10.4, students: 238, newStudents: 22 },
      { m: 'Tuần 4', revenue: 5.7, students: 242, newStudents: 15 },
    ];
  }
  if (period === 'year') {
    return [
      { m: 'T1', revenue: 11, students: 180, newStudents: 25 },
      { m: 'T2', revenue: 13, students: 200, newStudents: 28 },
      { m: 'T3', revenue: 14, students: 220, newStudents: 30 },
      { m: 'T4', revenue: 15, students: 240, newStudents: 32 },
      { m: 'T5', revenue: 17, students: 260, newStudents: 35 },
      { m: 'T6', revenue: 19, students: 280, newStudents: 38 },
      { m: 'T7', revenue: 21, students: 300, newStudents: 40 },
      { m: 'T8', revenue: 22, students: 320, newStudents: 42 },
      { m: 'T9', revenue: 24, students: 340, newStudents: 44 },
      { m: 'T10', revenue: 26, students: 360, newStudents: 46 },
      { m: 'T11', revenue: 28, students: 380, newStudents: 48 },
      { m: 'T12', revenue: 30, students: 400, newStudents: 50 },
    ];
  }
  if (period === 'y1') {
    return [
      { m: 'T8/24', revenue: 12, students: 400, newStudents: 35 },
      { m: 'T9/24', revenue: 14, students: 420, newStudents: 38 },
      { m: 'T10/24', revenue: 15, students: 450, newStudents: 40 },
      { m: 'T11/24', revenue: 16, students: 480, newStudents: 42 },
      { m: 'T12/24', revenue: 17, students: 510, newStudents: 45 },
      { m: 'T1/25', revenue: 18, students: 540, newStudents: 48 },
      { m: 'T2/25', revenue: 19, students: 560, newStudents: 50 },
      { m: 'T3/25', revenue: 20, students: 580, newStudents: 52 },
    ];
  }
  /* y3 */
  return [
    { m: '2023', revenue: 85, students: 320, newStudents: 120 },
    { m: '2024', revenue: 142, students: 620, newStudents: 280 },
    { m: '2025', revenue: 98, students: 880, newStudents: 190 },
  ];
}

export const revenueKpiByPeriod = {
  day: {
    revenue: 2_700_000,
    revenueSub: 'Doanh thu hôm nay (mẫu)',
    cumulative: 182_300_000,
    arpu: 92_778,
    conversion: 41,
  },
  month: {
    revenue: 33_400_000,
    revenueSub: 'Doanh thu tháng 3/25',
    cumulative: 182_300_000,
    arpu: 92_778,
    conversion: 41,
  },
  year: {
    revenue: 398_000_000,
    revenueSub: 'Tổng năm 2025',
    cumulative: 520_000_000,
    arpu: 88_200,
    conversion: 39,
  },
  y1: {
    revenue: 156_000_000,
    revenueSub: '12 tháng gần nhất',
    cumulative: 420_000_000,
    arpu: 91_000,
    conversion: 40,
  },
  y3: {
    revenue: 325_000_000,
    revenueSub: 'Lũy kế 3 năm',
    cumulative: 890_000_000,
    arpu: 85_500,
    conversion: 38,
  },
};

export const revenueByPackage = [
  { name: 'N3 Pro', students: 55, amount: 15_400_000, pct: 46, color: '#7c3aed' },
  { name: 'N4-N5 Combo', students: 95, amount: 11_400_000, pct: 34, color: '#6366f1' },
  { name: 'N5 Basic', students: 210, amount: 6_300_000, pct: 19, color: '#38bdf8' },
  { name: 'Miễn phí', students: 520, amount: 300_000, pct: 1, color: '#94a3b8' },
];

export const levelDistribution = [
  { level: 'N5', count: 520, pct: 59, color: '#7c3aed' },
  { level: 'N4', count: 230, pct: 26, color: '#6366f1' },
  { level: 'N3', count: 130, pct: 15, color: '#38bdf8' },
];

/** Gói Premium / khuyến mãi / giao dịch — mẫu UI (nối billing sau). */
export const adminPremiumPlans = [
  { id: 'p1', name: 'N5 Basic', price: 299_000, period: 'tháng', active: true },
  { id: 'p2', name: 'N4–N5 Combo', price: 499_000, period: 'tháng', active: true },
  { id: 'p3', name: 'N3 Pro', price: 699_000, period: 'tháng', active: true },
];

export const adminPromoCodes = [
  { code: 'SUMMER25', discount: '25%', expires: '2025-08-31', uses: 120 },
  { code: 'N3LAUNCH', discount: '15%', expires: '2025-06-01', uses: 45 },
];

export const adminTransactions = [
  { id: 't1', user: 'learner1', amount: 299_000, plan: 'N5 Basic', at: '2025-03-28 09:12', status: 'Thành công' },
  { id: 't2', user: 'hocvien_a', amount: 499_000, plan: 'Combo', at: '2025-03-27 18:40', status: 'Thành công' },
  { id: 't3', user: 'testuser', amount: 0, plan: '—', at: '2025-03-26 11:05', status: 'Hoàn tiền' },
];

export const adminContentOutline = [
  { id: 'c1', title: 'Bài học & bài kiểm tra', items: ['CRUD bài học theo level', 'Câu hỏi placement / quick quiz', 'Chủ đề (lesson_categories)'] },
  { id: 'c2', title: 'Tài liệu & flashcard', items: ['Upload PDF / audio / video → blob storage', 'Bộ thẻ SRS — nối API flashcards'] },
];

export const adminGamesOutline = [
  { id: 'g1', name: 'Trò chơi từ vựng', difficulty: 'Dễ–Khó', questions: 20, powerUps: 'Gợi ý, bỏ qua', leaderboard: 'Tuần' },
  { id: 'g2', name: 'Kanji rush', difficulty: 'Trung bình', questions: 15, powerUps: 'Thời gian +10s', leaderboard: 'Tháng' },
];

export const adminSystemLogsMock = [
  { id: 'l1', at: '2025-03-28 08:00:01', level: 'INFO', msg: 'Backup scheduled job completed' },
  { id: 'l2', at: '2025-03-28 07:12:44', level: 'WARN', msg: 'SMTP retry queue: 2 pending' },
];

export const adminUserErrorReports = [
  { id: 'e1', user: 'learner9', title: 'Không nghe được audio bài 4', at: '2025-03-27' },
  { id: 'e2', user: 'mod_test', title: 'Timeout khi mở phòng chat', at: '2025-03-26' },
];

export const adminSuspendProposals = [
  { id: 's1', mod: 'moderator1', userId: 55, reason: 'Tái phạm ngôn từ thô tục', at: '2025-03-27', status: 'pending' },
  { id: 's2', mod: 'moderator1', userId: 42, reason: 'Spam liên tục', at: '2025-03-26', status: 'pending' },
];

export const suggestionCards = [
  {
    tone: 'blue',
    tag: 'Tăng trưởng',
    title: 'Tăng chuyển đổi gói N4-N5 Combo',
    body: 'Chỉ 95/880 học viên dùng combo. Thử banner “Nâng cấp N4” sau khi hoàn thành N5 — ước tính +20–30% doanh thu.',
  },
  {
    tone: 'amber',
    tag: 'Tối ưu',
    title: 'Thứ 7 & CN là giờ cao điểm',
    body: 'Lưu lượng cuối tuần cao hơn ~60% so ngày thường. Đề xuất push notification 9:00 sáng thứ Bảy.',
  },
  {
    tone: 'violet',
    tag: 'Nội dung',
    title: 'Bổ sung bài thi thử JLPT',
    body: 'Nhóm N3 trả phí cao — gói “Luyện thi JLPT N3” + đề mock có thể là sản phẩm premium tiếp theo.',
  },
  {
    tone: 'emerald',
    tag: 'Cộng đồng',
    title: 'Chương trình giới thiệu bạn bè',
    body: 'Retention ~78%. “Mời bạn — tặng 1 tuần Premium” có thể tăng acquisition ~35% (ước tính).',
  },
];
