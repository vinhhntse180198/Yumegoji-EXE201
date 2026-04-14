/**
 * Khóa N5 mẫu — nội dung tĩnh (hội thoại, đọc, từ vựng, ngữ pháp).
 * Có thể thay bằng API /api/lessons sau khi seed DB.
 */
import {
  grammarBai1CauCoBan,
  grammarBai1DongTu,
  grammarBai1Joshi,
  grammarBai1Keiyoshi,
} from './n5GrammarUnits';

const sectionLabel = {
  dialogue: 'Hội thoại',
  reference: 'Tra cứu',
  reading: 'Bài đọc',
  vocab: 'Từ vựng',
  kanji: 'Kanji',
  grammar: 'Ngữ pháp',
};

function lessonBase(slug, navTitle, section, headline, description, blocks) {
  return {
    slug,
    navTitle,
    section,
    sectionLabel: sectionLabel[section],
    headline,
    description,
    blocks,
  };
}

export const N5_LESSONS = [
  lessonBase(
    'n5-kaiwa-1-hajimemashite',
    'Bài 1 — Gặp gỡ & giới thiệu',
    'dialogue',
    'Bài 1 — Gặp gỡ & giới thiệu',
    'Hana và Minh: tự giới thiệu, quốc tịch, nghề nghiệp.',
    [
      {
        type: 'dialogue',
        lines: [
          {
            speaker: 'Hana',
            jp: 'はじめまして。わたしはハナです。にほんじんです。どうぞよろしく。',
            romaji: 'Hajimemashite. Watashi wa Hana desu. Nihonjin desu. Dōzo yoroshiku.',
            vi: 'Rất vui được gặp. Tôi là Hana, người Nhật.',
          },
          {
            speaker: 'Minh',
            jp: 'はじめまして。ミンといいます。ベトナムからきました。よろしくおねがいします。',
            romaji:
              'Hajimemashite. Min to iimasu. Betonamu kara kimashita. Yoroshiku onegaishimasu.',
            vi: 'Rất vui. Tôi tên là Minh. Tôi đến từ Việt Nam.',
          },
          {
            speaker: 'Hana',
            jp: 'ミンさんはおしごとはなんですか。',
            romaji: 'Min-san wa oshigoto wa nan desu ka?',
            vi: 'Anh Minh làm nghề gì?',
          },
          {
            speaker: 'Minh',
            jp: 'だいがくのがくせいです。にほんごをべんきょうしています。ハナさんは？',
            romaji:
              'Daigaku no gakusei desu. Nihongo o benkyō shite imasu. Hana-san wa?',
            vi: 'Tôi là sinh viên đại học, đang học tiếng Nhật. Còn bạn?',
          },
          {
            speaker: 'Hana',
            jp: 'わたしはかいしゃいんです。どうぞよろしく！',
            romaji: 'Watashi wa kaishain desu. Dōzo yoroshiku!',
            vi: 'Tôi là nhân viên công ty. Rất vui được biết!',
          },
        ],
      },
    ]
  ),
  lessonBase(
    'n5-chao-hoi-thong-dung',
    'Chào hỏi & lịch sự cơ bản',
    'reference',
    'Chào hỏi và thành ngữ thông dụng',
    'Theo giáo trình JDP113 — ôn cụm dùng hàng ngày.',
    [
      {
        type: 'phrase_list',
        title: 'Chào hỏi theo thời điểm',
        items: [
          {
            labelVi: 'Chào buổi sáng',
            jp: 'おはようございます。',
            romaji: 'Ohayō gozaimasu.',
            noteVi: 'Chào buổi sáng (lịch sự).',
          },
          {
            labelVi: 'Xin chào (khoảng 10h–17h)',
            jp: 'こんにちは。',
            romaji: 'Konnichiwa.',
            noteVi: 'Chào ban ngày.',
          },
          {
            labelVi: 'Chào buổi tối',
            jp: 'こんばんは。',
            romaji: 'Konbanwa.',
            noteVi: 'Chào buổi tối.',
          },
          {
            labelVi: 'Chúc ngủ ngon',
            jp: 'おやすみなさい。',
            romaji: 'Oyasuminasai.',
            noteVi: 'Chúc ngủ ngon.',
          },
          {
            labelVi: 'Tạm biệt',
            jp: 'さようなら。',
            romaji: 'Sayōnara.',
            noteVi: 'Tạm biệt.',
          },
          {
            labelVi: 'Hẹn gặp lại',
            jp: 'じゃ、また。',
            romaji: 'Ja, mata.',
            noteVi: 'Vậy nhé, gặp lại sau (thân mật).',
          },
        ],
      },
      {
        type: 'phrase_list',
        title: 'Xin lỗi, cảm ơn, làm quen',
        items: [
          {
            labelVi: 'Xin lỗi',
            jp: 'すみません。',
            romaji: 'Sumimasen.',
            noteVi: 'Xin lỗi / Xin nhờ.',
          },
          {
            labelVi: 'Cảm ơn',
            jp: 'ありがとうございます。',
            romaji: 'Arigatō gozaimasu.',
            noteVi: 'Cảm ơn (lịch sự).',
          },
          {
            labelVi: 'Không có gì / Trả lời khi được cảm ơn',
            jp: 'どういたしまして。',
            romaji: 'Dōitashimashite.',
            noteVi: 'Không có chi; (đáp lại lời cảm ơn).',
          },
          {
            labelVi: 'Không (phủ định đơn giản)',
            jp: 'いいえ。',
            romaji: 'Iie.',
            noteVi: 'Không.',
          },
          {
            labelVi: 'Rất vui được làm quen',
            jp: 'はじめまして。',
            romaji: 'Hajimemashite.',
            noteVi: 'Lần đầu gặp — rất vui được làm quen.',
          },
          {
            labelVi: 'Mong được giúp đỡ / chiếu cố',
            jp: 'よろしくおねがいします。',
            romaji: 'Yoroshiku onegaishimasu.',
            noteVi: 'Nhờ bạn giúp đỡ / rất mong được chiếu cố.',
          },
        ],
      },
      {
        type: 'phrase_list',
        title: 'Bữa ăn & về nhà',
        items: [
          {
            labelVi: 'Trước khi ăn',
            jp: 'いただきます。',
            romaji: 'Itadakimasu.',
            noteVi: 'Mời cơm (trước khi ăn).',
          },
          {
            labelVi: 'Sau khi ăn xong',
            jp: 'ごちそうさまでした。',
            romaji: 'Gochisōsama deshita.',
            noteVi: 'Cảm ơn vì bữa ăn ngon.',
          },
          {
            labelVi: 'Tôi về rồi đây',
            jp: 'ただいま。',
            romaji: 'Tadaima.',
            noteVi: 'Nói khi vừa về đến nhà (tôi đã về).',
          },
          {
            labelVi: 'Chào người vừa về',
            jp: 'おかえりなさい。',
            romaji: 'Okaerinasai.',
            noteVi: 'Anh/chị về rồi à / chào mừng đã về.',
          },
        ],
      },
    ]
  ),
  lessonBase(
    'n5-kaiwa-2-doko-desu-ka',
    '2. Ở đâu? — どこですか',
    'dialogue',
    'Ở đâu? — どこですか',
    'Hỏi đường và chỉ hướng.',
    [
      {
        type: 'dialogue',
        lines: [
          {
            speaker: 'A',
            jp: 'すみません、トイレはどこですか。',
            romaji: 'Sumimasen, toire wa doko desu ka?',
            vi: 'Xin lỗi, nhà vệ sinh ở đâu vậy?',
          },
          {
            speaker: 'B',
            jp: 'トイレはにかいです。エレベーターのみぎです。',
            romaji: 'Toire wa nikai desu. Erebētā no migi desu.',
            vi: 'Nhà vệ sinh ở tầng 2. Bên phải thang máy.',
          },
          {
            speaker: 'A',
            jp: 'ありがとうございます。',
            romaji: 'Arigatō gozaimasu.',
            vi: 'Cảm ơn bạn rất nhiều.',
          },
          {
            speaker: 'B',
            jp: 'いいえ、どういたしまして。',
            romaji: 'Iie, dōitashimashite.',
            vi: 'Không có gì, không cần khách khí.',
          },
        ],
      },
    ]
  ),
  lessonBase(
    'n5-kaiwa-3-kaimono',
    '3. Mua sắm — かいもの',
    'dialogue',
    'Mua sắm — かいもの',
    'Hỏi giá và số lượng.',
    [
      {
        type: 'dialogue',
        lines: [
          {
            speaker: 'Khách',
            jp: 'このりんごはいくらですか。',
            romaji: 'Kono ringo wa ikura desu ka?',
            vi: 'Táo này bao nhiêu tiền?',
          },
          {
            speaker: 'Người bán',
            jp: 'ひとつひゃくえんです。',
            romaji: 'Hitotsu hyaku-en desu.',
            vi: 'Một quả 100 yên.',
          },
          {
            speaker: 'Khách',
            jp: 'みっつください。',
            romaji: 'Mittsu kudasai.',
            vi: 'Cho tôi 3 quả.',
          },
          {
            speaker: 'Người bán',
            jp: 'はい、さんびゃくえんです。',
            romaji: 'Hai, sanbyaku-en desu.',
            vi: 'Vâng, 300 yên ạ.',
          },
        ],
      },
    ]
  ),
  lessonBase(
    'n5-kaiwa-4-nanji',
    '4. Thời gian — なんじですか',
    'dialogue',
    'Thời gian — なんじですか',
    'Hỏi giờ và lịch học.',
    [
      {
        type: 'dialogue',
        lines: [
          {
            speaker: 'A',
            jp: 'いまなんじですか。',
            romaji: 'Ima nanji desu ka?',
            vi: 'Bây giờ là mấy giờ?',
          },
          {
            speaker: 'B',
            jp: 'ごごさんじはんです。',
            romaji: 'Gogo sanji han desu.',
            vi: 'Bây giờ là 3 giờ 30 chiều.',
          },
          {
            speaker: 'A',
            jp: 'じゅぎょうはなんじからですか。',
            romaji: 'Jugyō wa nanji kara desu ka?',
            vi: 'Giờ học bắt đầu từ mấy giờ?',
          },
          {
            speaker: 'B',
            jp: 'よじからごじまでです。',
            romaji: 'Yoji kara goji made desu.',
            vi: 'Từ 4 giờ đến 5 giờ.',
          },
        ],
      },
    ]
  ),
  lessonBase(
    'n5-kaiwa-5-kazoku',
    '5. Gia đình — かぞく',
    'dialogue',
    'Gia đình — かぞく',
    'Hỏi về thành viên và nghề nghiệp.',
    [
      {
        type: 'dialogue',
        lines: [
          {
            speaker: 'A',
            jp: 'かぞくはなんにんですか。',
            romaji: 'Kazoku wa nan-nin desu ka?',
            vi: 'Gia đình bạn có mấy người?',
          },
          {
            speaker: 'B',
            jp: 'よにんです。ちちとははとあにといます。',
            romaji: 'Yonin desu. Chichi to haha to ani to imasu.',
            vi: 'Có 4 người. Có bố, mẹ, anh trai và tôi.',
          },
          {
            speaker: 'A',
            jp: 'おとうさんはおしごとはなんですか。',
            romaji: 'Otōsan wa oshigoto wa nan desu ka?',
            vi: 'Bố bạn làm nghề gì?',
          },
          {
            speaker: 'B',
            jp: 'ちちはいしゃです。はははせんせいです。',
            romaji: 'Chichi wa isha desu. Haha wa sensei desu.',
            vi: 'Bố tôi là bác sĩ. Mẹ tôi là giáo viên.',
          },
        ],
      },
    ]
  ),
  lessonBase(
    'n5-dokku-1-jiko-shokai',
    'Bài 1 — Đọc: じこしょうかい',
    'reading',
    'Đọc 1 — Tự giới thiệu（じこしょうかい）',
    'Bài đọc mở rộng theo giáo trình Bài 1.',
    [
      {
        type: 'reading_body',
        title: 'Bài đọc',
        jp: 'わたしはグエンミンといいます。ベトナムのホーチミンしゅっしんです。いま、にほんごがっこうでべんきょうしています。まいにちさんじかんぐらいべんきょうします。にほんごはむずかしいですが、とてもおもしろいです。しょうらいはにほんのかいしゃではたらきたいです。にほんのりょうりもだいすきです。とくにすしとラーメンがすきです。',
        vi: 'Tôi tên là Nguyễn Minh. Quê ở Thành phố Hồ Chí Minh, Việt Nam. Hiện tôi đang học ở trường tiếng Nhật. Mỗi ngày học khoảng 3 tiếng. Tiếng Nhật khó nhưng rất thú vị. Tương lai tôi muốn làm việc ở công ty Nhật. Tôi cũng rất thích đồ ăn Nhật. Đặc biệt thích sushi và ramen.',
      },
      {
        type: 'keyword_list',
        title: 'Từ khóa trong bài',
        items: [
          { jp: 'しゅっしん', vi: 'quê quán' },
          { jp: 'ぐらい', vi: 'khoảng' },
          { jp: 'しょうらい', vi: 'tương lai' },
          { jp: 'とくに', vi: 'đặc biệt' },
        ],
      },
      {
        type: 'comprehension_reveal',
        title: 'Câu hỏi',
        items: [
          {
            qJp: 'グエンさんはどこのしゅっしんですか。',
            qVi: 'Quê của Nguyễn Minh ở đâu?',
            aJp: 'ベトナムのホーチミンしゅっしんです。',
            aVi: 'Quê ở Thành phố Hồ Chí Minh, Việt Nam.',
          },
          {
            qJp: 'しょうらいなにをしたいですか。',
            qVi: 'Tương lai (anh/chị) muốn làm gì?',
            aJp: 'にほんのかいしゃではたらきたいです。',
            aVi: 'Muốn làm việc ở công ty Nhật.',
          },
        ],
      },
    ]
  ),
  lessonBase(
    'n5-dokku-2-ichinichi',
    'Đọc 2 — わたしのいちにち',
    'reading',
    'Một ngày của tôi — わたしのいちにち',
    null,
    [
      {
        type: 'reading_body',
        title: 'Bài đọc',
        jp: 'わたしはまいあさしちじにおきます。はちじにあさごはんをたべます。くじにがっこうにいきます。じゅうにじにひるごはんをたべます。ごごさんじにかえります。よるはほんをよんだり、おんがくをきいたりします。じゅういちじにねます。',
        vi: 'Mỗi buổi sáng tôi thức dậy lúc 7 giờ. Lúc 8 giờ tôi ăn sáng. Lúc 9 giờ tôi đi học. Lúc 12 giờ tôi ăn trưa. Lúc 3 giờ chiều tôi về nhà. Buổi tối tôi đọc sách hoặc nghe nhạc. Lúc 11 giờ tôi đi ngủ.',
      },
      {
        type: 'keyword_list',
        title: 'Từ khóa quan trọng',
        items: [
          { jp: 'おきます', vi: 'thức dậy' },
          { jp: 'たべます', vi: 'ăn' },
          { jp: 'いきます', vi: 'đi' },
          { jp: 'かえります', vi: 'về' },
          { jp: 'ねます', vi: 'ngủ' },
        ],
      },
    ]
  ),
  lessonBase(
    'n5-dokku-3-nihon',
    'Đọc 3 — にほん',
    'reading',
    'Nhật Bản — にほん',
    null,
    [
      {
        type: 'reading_body',
        title: 'Bài đọc',
        jp: 'にほんはアジアのくにです。しゅとはとうきょうです。にほんのじんこうはやくいちおくにせんまんにんです。にほんはやまがおおいです。ふじさんはにほんでいちばんたかいやまです。にほんごとえいごがよくつかわれています。',
        vi: 'Nhật Bản là một đất nước ở châu Á. Thủ đô là Tokyo. Dân số Nhật Bản khoảng 120 triệu người. Nhật Bản có nhiều núi. Núi Phú Sĩ là ngọn núi cao nhất ở Nhật Bản. Tiếng Nhật và tiếng Anh được sử dụng phổ biến.',
      },
    ]
  ),
  lessonBase(
    'n5-goi-tong-hop',
    'Bài 1 — Từ vựng (con người & nghề)',
    'vocab',
    'Từ vựng N5 — con người & nghề nghiệp',
    'Bảng ôn theo Bài 1; kèm địa điểm và thời gian.',
    [
      {
        type: 'vocab_table',
        title: 'Con người & nghề nghiệp',
        rows: [
          { word: 'わたし', reading: 'watashi', vi: 'tôi' },
          { word: 'あなた', reading: 'anata', vi: 'bạn' },
          { word: 'かれ', reading: 'kare', vi: 'anh ấy' },
          { word: 'かのじょ', reading: 'kanojo', vi: 'cô ấy' },
          { word: 'ひと', reading: 'hito', vi: 'người' },
          { word: 'こども', reading: 'kodomo', vi: 'trẻ em' },
          { word: 'おとな', reading: 'otona', vi: 'người lớn' },
          { word: 'がくせい', reading: 'gakusei', vi: 'học sinh / sinh viên' },
          { word: 'せんせい', reading: 'sensei', vi: 'giáo viên' },
          { word: 'かいしゃいん', reading: 'kaishain', vi: 'nhân viên công ty' },
          { word: 'いしゃ', reading: 'isha', vi: 'bác sĩ' },
          { word: 'かんごし', reading: 'kangoshi', vi: 'y tá' },
          { word: 'けいさつかん', reading: 'keisatsukan', vi: 'cảnh sát' },
          { word: 'うんてんしゅ', reading: 'untenshu', vi: 'tài xế' },
          { word: 'りょうりにん', reading: 'ryōrinin', vi: 'đầu bếp' },
          { word: 'ともだち', reading: 'tomodachi', vi: 'bạn bè' },
          { word: 'かぞく', reading: 'kazoku', vi: 'gia đình' },
          { word: 'ちち / おとうさん', reading: 'chichi / otōsan', vi: 'bố (mình / người khác)' },
          { word: 'はは / おかあさん', reading: 'haha / okāsan', vi: 'mẹ (mình / người khác)' },
        ],
      },
      {
        type: 'vocab_table',
        title: 'Địa điểm & phương hướng',
        rows: [
          { word: 'みぎ', reading: 'migi', vi: 'bên phải' },
          { word: 'ひだり', reading: 'hidari', vi: 'bên trái' },
          { word: 'まえ', reading: 'mae', vi: 'phía trước' },
          { word: 'うしろ', reading: 'ushiro', vi: 'phía sau' },
          { word: 'なか', reading: 'naka', vi: 'bên trong / giữa' },
          { word: 'そと', reading: 'soto', vi: 'bên ngoài' },
          { word: 'うえ', reading: 'ue', vi: 'phía trên' },
          { word: 'した', reading: 'shita', vi: 'phía dưới' },
        ],
      },
      {
        type: 'vocab_table',
        title: 'Số đếm & thời gian',
        rows: [
          { word: 'いち、に、さん', reading: 'ichi, ni, san', vi: '1, 2, 3' },
          { word: 'し、ご、ろく', reading: 'shi, go, roku', vi: '4, 5, 6' },
          { word: 'なな、はち、きゅう', reading: 'nana, hachi, kyū', vi: '7, 8, 9' },
          { word: 'じゅう、ひゃく', reading: 'jū, hyaku', vi: '10, 100' },
          { word: 'なんじ', reading: 'nanji', vi: 'mấy giờ' },
          { word: 'ごぜん / ごご', reading: 'gozen / gogo', vi: 'sáng (AM) / chiều (PM)' },
          { word: 'きょう', reading: 'kyō', vi: 'hôm nay' },
          { word: 'あした', reading: 'ashita', vi: 'ngày mai' },
        ],
      },
    ]
  ),
  lessonBase(
    'n5-kanji-bai1',
    'Bài 1 — Kanji (người & số)',
    'kanji',
    'Kanji — người & số',
    'Cách đọc và ví dụ từ ghép thường gặp.',
    [
      {
        type: 'kanji_table',
        title: 'Người & số',
        rows: [
          {
            char: '人',
            reading: 'ひと / じん / にん',
            vi: 'người',
            ex: 'にほんじん（người Nhật）、なんにん（mấy người）',
          },
          {
            char: '一二三',
            reading: 'いち・に・さん',
            vi: '1 · 2 · 3',
            ex: 'いちにち（một ngày）、にほん（Nhật Bản）',
          },
          {
            char: '四五六',
            reading: 'し・よん、ご、ろく',
            vi: '4 · 5 · 6',
            ex: 'よじ（4 giờ）、ごご（buổi chiều）',
          },
          {
            char: '七八九十',
            reading: 'なな、はち、きゅう、じゅう',
            vi: '7 · 8 · 9 · 10',
            ex: 'じゅうじ（10 giờ）',
          },
          {
            char: '百千万',
            reading: 'ひゃく、せん、まん',
            vi: '100 · 1000 · 10000',
            ex: 'ひゃくえん（100 yên）',
          },
          {
            char: '女',
            reading: 'おんな / じょ',
            vi: 'phụ nữ',
            ex: 'おんなのこ（con gái）、じょせい（phụ nữ）',
          },
          {
            char: '男',
            reading: 'おとこ / だん',
            vi: 'đàn ông',
            ex: 'おとこのこ（con trai）',
          },
          {
            char: '子',
            reading: 'こ / し',
            vi: 'con, trẻ em',
            ex: 'こども（trẻ em）',
          },
        ],
      },
    ]
  ),
  lessonBase(
    'n5-bunpo-co-ban',
    'Ngữ pháp — câu cơ bản (は・です・も…)',
    'grammar',
    'Câu cơ bản',
    'Khẳng định, phủ định, câu hỏi, chỉ thị, も.',
    [...grammarBai1CauCoBan],
  ),
  lessonBase(
    'n5-bunpo-joshi',
    'Ngữ pháp — trợ từ (は・が・を・に…)',
    'grammar',
    'Trợ từ quan trọng',
    'は・が・を・に・で・へ・から〜まで・と・や〜など・の.',
    [...grammarBai1Joshi],
  ),
  lessonBase(
    'n5-bunpo-dong-tu',
    'Ngữ pháp — chia động từ (ます・て…)',
    'grammar',
    'Chia động từ N5',
    'Thể ます・ました・たい・ています・てください…',
    [...grammarBai1DongTu],
  ),
  lessonBase(
    'n5-bunpo-keiyoshi',
    'Ngữ pháp — tính từ (い・な)',
    'grammar',
    'Tính từ（い・な）',
    'Chia tính từ, nối て, so sánh.',
    [...grammarBai1Keiyoshi],
  ),
  lessonBase(
    'n5-bunpo-nang-cao',
    'Ngữ pháp — mẫu câu nâng cao N5',
    'grammar',
    'Mẫu câu nâng cao N5',
    'Lý do, đối lập, trợ từ が, hỏi “thế nào / gì / làm sao”.',
    [
      {
        type: 'grammar_block',
        pattern: '～から（vì…）',
        meaningVi:
          'Vì / bởi vì — đặt lý do trước から, sau đó là kết quả hoặc hành động.',
        examples: [
          {
            jp: 'たかいから、かいません。',
            romaji: 'Takai kara, kaimasen.',
            vi: 'Vì đắt nên (tôi) không mua.',
          },
        ],
      },
      {
        type: 'grammar_block',
        pattern: '～が（nhưng）',
        meaningVi:
          'Nhưng / mặc dù — nối hai mệnh đề trái ngược hoặc bổ sung ý.',
        examples: [
          {
            jp: 'むずかしいですが、おもしろいです。',
            romaji: 'Muzukashii desu ga, omoshiroi desu.',
            vi: 'Khó nhưng thú vị.',
          },
        ],
      },
      {
        type: 'grammar_block',
        pattern: '～ので',
        meaningVi:
          'Vì… — diễn đạt lý do khách quan, thường lịch sự hơn から trong hội thoại.',
        examples: [
          {
            jp: 'あめなので、うちにいます。',
            romaji: 'Ame na node, uchi ni imasu.',
            vi: 'Vì trời mưa nên (tôi) ở nhà.',
          },
        ],
      },
      {
        type: 'grammar_block',
        pattern: '～とき',
        meaningVi:
          'Khi… — đứng sau V/い-adj/な-adj + の + とき hoặc danh từ + のとき.',
        examples: [
          {
            jp: 'にほんにいくとき、おみやげをかいます。',
            romaji: 'Nihon ni iku toki, omiyage o kaimasu.',
            vi: 'Khi (tôi) đi Nhật, tôi mua quà lưu niệm.',
          },
        ],
      },
      {
        type: 'grammar_block',
        pattern: '～が すきです / きらいです / じょうずです / へたです',
        meaningVi:
          'Thích / ghét / giỏi / kém — dùng が với khả năng & sở thích, không dùng を.',
        examples: [
          {
            jp: 'にほんごがすきです。',
            romaji: 'Nihongo ga suki desu.',
            vi: 'Tôi thích tiếng Nhật.',
          },
          {
            jp: 'りょうりがじょうずです。',
            romaji: 'Ryōri ga jōzu desu.',
            vi: 'Nấu ăn giỏi.',
          },
        ],
      },
      {
        type: 'grammar_block',
        pattern: '～が わかります / できます',
        meaningVi:
          'Hiểu / có thể làm — năng lực với が (わかる・できる・ひける…).',
        examples: [
          {
            jp: 'にほんごがわかります。',
            romaji: 'Nihongo ga wakarimasu.',
            vi: 'Hiểu tiếng Nhật.',
          },
          {
            jp: 'ピアノがひけます。',
            romaji: 'Piano ga hikemasu.',
            vi: 'Có thể chơi piano.',
          },
        ],
      },
      {
        type: 'grammar_block',
        pattern: 'なん / なに',
        meaningVi:
          'Cái gì / mấy — なん ghép với âm tiếp theo (なんじ、なんにん…), なに đứng riêng.',
        examples: [
          {
            jp: 'それはなんですか。',
            romaji: 'Sore wa nan desu ka?',
            vi: 'Đó là gì?',
          },
          {
            jp: 'なんじですか。',
            romaji: 'Nanji desu ka?',
            vi: 'Mấy giờ?',
          },
          {
            jp: 'なんにんですか。',
            romaji: 'Nan-nin desu ka?',
            vi: 'Mấy người?',
          },
        ],
      },
      {
        type: 'grammar_block',
        pattern: 'どんな / どう / どうやって',
        meaningVi:
          'Như thế nào / thế nào / làm thế nào — hỏi tính chất, cảm nhận, cách làm.',
        examples: [
          {
            jp: 'どんなたべものがすきですか。',
            romaji: 'Donna tabemono ga suki desu ka?',
            vi: 'Bạn thích loại đồ ăn nào?',
          },
          {
            jp: 'がっこうはどうですか。',
            romaji: 'Gakkō wa dō desu ka?',
            vi: 'Trường (của bạn) thế nào?',
          },
          {
            jp: 'えきへはどうやっていきますか。',
            romaji: 'Eki e wa dō yatte ikimasu ka?',
            vi: 'Đi đến ga bằng cách nào?',
          },
        ],
      },
    ]
  ),
];

export function getN5LessonBySlug(slug) {
  if (!slug) return null;
  return N5_LESSONS.find((l) => l.slug === slug) ?? null;
}
