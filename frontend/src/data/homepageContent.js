/** Ảnh mẫu theo link bạn cung cấp */
const HERO_IMAGE_SRC =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDLA_MHEzHCfY-5kJAe4FDu1hRrb1cV8NHy0Feg9-6lZRIuJ_BKNddEexbfLE4jLLSFx6X9wVv3oCoGH_WSyhiEAsixgZSbC2y6CcZdEaGw7YmAMT_cMLrHmrFJg88D8-k_HkZy3GxOCO_x84qngV-kvX7toI4QLvOLRtJjsRX33AXnJF_bCPRpxdskgpSn28L3bxC8YsnaxlBIOZx-QjyuT79Avq0u6IR0SniXpbuMVnU5qzJyocL5e7aWgN0vEhzOnp3VAj_51HM';

/** Slide hero — link bài báo HTML không dùng làm src ảnh */
const HERO_SLIDE_GOOGLE_1 =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC3Ju_oFqE7vhueOnoRV2DE6LQMag2sV-_Pn70RrjHxzfqLZgiPul68BJwpAM7qxlxXi4SXV1HBlI0Vr6-OPFAtipgQIO3HCinqZb5P6E3UHWO_V66iLThyOsOHqIXqziVtM4EbDLxlhXKebsUpuKgS3xOTTk3qLLCn_6GXqpsL0cNG3ENY7b86u2QdDjOjmkoVn05I3Y6anpBFu2FYgkm-YBOvmE3aX8VQ6lJiDZfrXIXoCxOtEogai-h9CZROLNDLdeu4QnSTgHo';
const HERO_SLIDE_GOOGLE_2 =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBVTHYikuZH0p7u2VCJV4qI-wu_3DW0qy1-EjnWqAmqyUKdRzHNQAM9GXSCjCZvLnCgSzIsD9GHwR5swUyXr2lpEkNu_QJmMZc2IFGPO7OlB6I-49dkWSL6CFOeaUaSQVuNiZT137-CaSBs9AqyOpK1YQ5zCE-SQshPbR6dxzed2JeyZjAWHHbvxSCaoxKTdZ5Z5XUFHI-HWSjqErRVHUcX_Vt3_xULtdOpR4ar4q7CMzm9ERrDqSXR29ITa1Ur5WES4mQW_rl0YJY';

export const HOMEPAGE_HERO_SLIDES = [
  HERO_SLIDE_GOOGLE_1,
  HERO_SLIDE_GOOGLE_2,
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQaJS75BriGErLn_04I_XxxvUrdsMSE9fqFqw&s',
  'https://riki.edu.vn/goc-chia-se/wp-content/uploads/2020/06/thong-tin-nhat-ban-13-2.jpg',
  'https://kenh14cdn.com/2020/2/19/weroadofficial733126915670472273724112180452872398754856n-15820945105671173864668.jpg',
  HERO_IMAGE_SRC,
];
const WHY_IMAGE_CITY =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCYa70aIBMvItlNHTnzM7sykqn5DQDjN0OrK-nh3fcXoJZOQxuugTujAt6FlueOa_ikoTu02l_n5Rk1yk1jKk9pWAaanGXIjKvLI1vOPWAFBturyFynMXqEjXI-qLAuLnSMelKj6PDBXBGF5Zpit0U414HeBjhGwxNb_V0LBLJBQmXOYeUXZ8oFywUDa58_hWTJpDjQIKvhpRL2PlYebo3wgW7IeuFIxefNuz2py5dDBpm3TIEUpYD-uPFtfo8qxpKEBq5a1d0asP8';
const WHY_IMAGE_PAGODA =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDMdUJlcoHNdBGtmPJDJkJwMGaYgG06zDCDOiiWiCsMMLoKrqb3rf8TAEuQ1KciyyzEFd_A_22hoYrdvQ8RcU3BitbKELLG4Fq-2AuX4BLA-SJOtKHdnyVNfYIs94x6IcEqQh99md9PESE_lyiDsZ_3MlxLXaSzFugWqxuqJMiaNdCefVeo3SUdWnC7u0dl_smiJXNjnqIroIGqdvAMfhjTuc1M1cWpfaduwnEuC99ZK1gEu7ivoydFt5i0ktOWjgViitAhjQs185c';

export const HOMEPAGE_HERO = {
  badge: 'Chinh phục tiếng Nhật từ hôm nay',
  title: 'Học tiếng Nhật',
  highlight: 'Thật phong cách.',
  description:
    'Khám phá lộ trình học tiếng Nhật hiện đại, kết hợp tri thức văn hóa và công nghệ học tập để biến hành trình mỗi ngày thành trải nghiệm thú vị.',
  primaryCta: 'Bắt đầu học ngay',
  secondaryCta: 'Xem demo',
  metricLabel: 'Tiến độ tuần này',
  metricValue: '+120 Kanji mới',
  image: HERO_IMAGE_SRC,
  /** Ảnh carousel bên phải hero */
  slides: HOMEPAGE_HERO_SLIDES,
};

export const HOMEPAGE_METHOD = {
  title: 'Phương pháp Hanami độc bản',
  subtitle: 'Chúng tôi tái định nghĩa cách bạn tiếp cận ngôn ngữ thông qua sự kết hợp giữa tương tác và giải trí.',
  features: [
    {
      title: 'Học tập',
      icon: '📚',
      description:
        'Bài giảng có cấu trúc theo năng lực, bám sát JLPT và có bài tập tương tác giúp ghi nhớ từ vựng nhanh.',
      linkLabel: 'Tìm hiểu thêm',
    },
    {
      title: 'Trò chuyện',
      icon: '💬',
      description:
        'Luyện phản xạ hội thoại cùng cộng đồng học viên và giáo viên để tự tin giao tiếp trong ngữ cảnh thực tế.',
      linkLabel: 'Thử ngay',
    },
    {
      title: 'Trò chơi',
      icon: '🎮',
      description:
        'Mini-game theo chủ điểm giúp ôn Kanji, từ vựng và mẫu câu theo cách vui hơn, nhớ lâu hơn.',
      linkLabel: 'Khám phá kho game',
    },
  ],
};

export const HOMEPAGE_WHY = {
  title: 'Tại sao chọn Sakura Nihongo?',
  /** Thứ tự: đường phố hiện đại · chùa / biển (theo mockup hình 5) */
  images: [WHY_IMAGE_CITY, WHY_IMAGE_PAGODA],
  items: [
    {
      title: 'Đội ngũ giáo viên Top-tier',
      description:
        'Giáo viên có kinh nghiệm luyện thi JLPT và tập trung sửa lỗi phát âm, ngữ điệu theo từng học viên.',
    },
    {
      title: 'Lộ trình cá nhân hóa',
      description: 'Hệ thống theo dõi tiến độ và gợi ý nội dung phù hợp để bạn học đúng phần còn yếu.',
    },
    {
      title: 'Hỗ trợ 24/7',
      description: 'Đồng hành giải đáp trong suốt quá trình học để bạn không bị ngắt mạch tiến bộ.',
    },
  ],
};

export const HOMEPAGE_TESTIMONIALS = {
  title: 'Cảm nhận của học viên',
  subtitle: 'Hơn 50,000 học viên đã bắt đầu hành trình và thành công.',
  items: [
    {
      name: 'Minh Anh',
      level: 'Học viên N5',
      quote:
        'Lộ trình N5 rất dễ theo dõi, mỗi ngày mình học một ít nhưng vẫn thấy tiến bộ đều.',
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuB96mZjhhtdBCO82VL2lwW_fxJea65qRxit1ZsWKRUM_ipNoBom2zifSBLvfcqsCTEqflSwvUcj5mbUwCt6wO-kllK6NYzEwKI2kch8B7piII53Lb5KbCSlrH4Octx3SXCmwCa1Mdq9U2O4WgFR5MzAnXQ1lVO1lev20MRljekd9EhjRKvzTDILAe64D7-hBwH_fYOl31cR725pw61NBnjDU2DCepbc_xpb-eRmhq8xax_ReTUPITqLx2E2FrEym6NPkJzR1Shp65w',
    },
    {
      name: 'Hoàng Nam',
      level: 'Học viên N3',
      quote:
        'Lớp luyện nói giúp mình tự tin giao tiếp hơn trong công việc. Mình tiến bộ rõ chỉ sau vài tháng.',
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCxt1q_dgTjyweQg_C11KrtpRFMhWMpoApdLWhJw-o4dctjQ7H4B3AU6s4UXb9OUALSs1MXAT2fXkY7GR9amLSm-9YC4xcASzmAMsSAjGM46zKqbSmhyK6xm7mRsQgWgB_9kELFfIb7uqLvazvRdY1JK7zcLXCb94ss7RuPm6b5chtCx-Jr8F7RNz3i_hyy3c7N-1dc7b6IBo7LFaA9ElfebynUcg7vaEr4QlbJE6N_BIWL3MqQU1gR67BNTD8Dt-0GC4UurfaLfh8',
    },
    {
      name: 'Thu Thảo',
      level: 'Học viên N4',
      quote:
        'Nội dung N4 được sắp theo tuần rất rõ ràng, học xong là mình ôn lại được ngay.',
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD4VoxO11xGzajOEu5GGSNohEyz0nApGunVra-g2RGGqss_cRjnB6u9doLyiywIbTTHKaYS8mJegquffQDY_xUOTetEjB5z9xy8Etl_w8wZpDVRMDaEEDpFdneo_ZPRoRnj7ihgRXPIzXy2KFfFcu70L2c1AOEwCEV6vJmaApkuQbPplmYTw3cBYuc8PiLPEhbegA6Pg_r9pZYwVwqLCwaYjaqhZLil7lF_WrcdvzF2jTaDYoGHKt-lYb46k_wxT9ruufshbIxnvro',
    },
  ],
};

/** Cùng 3 ảnh học viên mẫu như footer — khối “Joined by…” đăng nhập / đăng ký / đặt lại MK */
export const AUTH_HERO_LEARNER_AVATAR_URLS = HOMEPAGE_TESTIMONIALS.items
  .filter((i) => i.avatarUrl)
  .map((i) => i.avatarUrl);

export const HOMEPAGE_CTA = {
  title: 'Sẵn sàng để bắt đầu chưa?',
  subtitle: 'Nhận ngay ưu đãi 30% cho khóa học đầu tiên khi đăng ký tài khoản trong hôm nay.',
  button: 'Tạo tài khoản ngay',
};
