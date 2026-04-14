/**
 * Ngữ pháp Bài 1 — tách file để dễ bảo trì.
 * Mỗi phần tử là một block { type: 'grammar_block', ... } dùng trong n5BeginnerCourse.
 */

export const grammarBai1CauCoBan = [
  {
    type: 'grammar_block',
    pattern: '～は ～です',
    meaningVi:
      'Chủ ngữ là… (câu khẳng định). Cấu trúc: N は N です.',
    examples: [
      {
        jp: 'わたしはがくせいです。',
        romaji: 'Watashi wa gakusei desu.',
        vi: 'Tôi là học sinh.',
      },
      {
        jp: 'これはほんです。',
        romaji: 'Kore wa hon desu.',
        vi: 'Đây là sách.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: '～は ～じゃありません／ではありません',
    meaningVi:
      'Câu phủ định của です. N は N じゃありません. じゃ = thân mật；では = trang trọng hơn.',
    examples: [
      {
        jp: 'かれはせんせいじゃありません。',
        romaji: 'Kare wa sensei ja arimasen.',
        vi: 'Anh ấy không phải giáo viên.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: '～は ～ですか',
    meaningVi: 'Câu hỏi Có/Không. N は N ですか.',
    examples: [
      {
        jp: 'にほんじんですか。',
        romaji: 'Nihonjin desu ka?',
        vi: 'Bạn có phải người Nhật không?',
      },
      {
        jp: 'はい、そうです。／いいえ、ちがいます。',
        romaji: 'Hai, sō desu. / Iie, chigaimasu.',
        vi: 'Vâng, đúng. / Không, không phải.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'これ・それ・あれ・どれ',
    meaningVi:
      'Đây / đó / kia / cái nào. これ (gần người nói)、それ (gần người nghe)、あれ (xa cả hai)、どれ (hỏi).',
    examples: [
      {
        jp: 'これはいくらですか。',
        romaji: 'Kore wa ikura desu ka?',
        vi: 'Cái này bao nhiêu tiền?',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'この・その・あの・どの ＋ N',
    meaningVi: 'Cái này/đó/kia + danh từ. この／その／あの／どの ＋ danh từ.',
    examples: [
      {
        jp: 'このほんはおもしろいです。',
        romaji: 'Kono hon wa omoshiroi desu.',
        vi: 'Quyển sách này thú vị.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: '～も',
    meaningVi:
      'Cũng… — thay thế は/が trong ngữ cảnh “cũng”. N も V／Adj.',
    examples: [
      {
        jp: 'わたしもにほんごをべんきょうします。',
        romaji: 'Watashi mo nihongo o benkyō shimasu.',
        vi: 'Tôi cũng học tiếng Nhật.',
      },
    ],
  },
];

export const grammarBai1Joshi = [
  {
    type: 'grammar_block',
    pattern: 'は（wa）— chủ đề',
    meaningVi: 'Đánh dấu chủ đề câu.',
    examples: [
      {
        jp: 'わたしはミンです。',
        romaji: 'Watashi wa Min desu.',
        vi: 'Tôi là Minh.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'が（ga）— chủ ngữ',
    meaningVi:
      'Đánh dấu chủ ngữ (nhấn mạnh, thông tin mới).',
    examples: [
      {
        jp: 'だれがきましたか。',
        romaji: 'Dare ga kimashita ka?',
        vi: 'Ai đến?',
      },
      {
        jp: 'ミンさんがきました。',
        romaji: 'Min-san ga kimashita.',
        vi: 'Anh Minh đến.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'を（o）— tân ngữ trực tiếp',
    meaningVi: 'Theo sau danh từ chịu tác động của động từ.',
    examples: [
      {
        jp: 'ごはんをたべます。',
        romaji: 'Gohan o tabemasu.',
        vi: 'Ăn cơm.',
      },
      {
        jp: 'ほんをよみます。',
        romaji: 'Hon o yomimasu.',
        vi: 'Đọc sách.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'に（ni）— địa điểm / điểm đến / thời điểm',
    meaningVi:
      'Ở đâu (います・あります) / đi đến đâu / lúc mấy giờ.',
    examples: [
      {
        jp: 'つくえのうえにほんがあります。',
        romaji: 'Tsukue no ue ni hon ga arimasu.',
        vi: 'Trên bàn có sách.',
      },
      {
        jp: 'がっこうにいきます。',
        romaji: 'Gakkō ni ikimasu.',
        vi: 'Đi đến trường.',
      },
      {
        jp: 'くじにおきます。',
        romaji: 'Kuji ni okimasu.',
        vi: 'Thức dậy lúc 9 giờ.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'で（de）— nơi chốn / phương tiện hành động',
    meaningVi: 'Ở đâu làm gì / bằng phương tiện gì.',
    examples: [
      {
        jp: 'こうえんでたべます。',
        romaji: 'Kōen de tabemasu.',
        vi: 'Ăn ở công viên.',
      },
      {
        jp: 'でんしゃでいきます。',
        romaji: 'Densha de ikimasu.',
        vi: 'Đi bằng tàu điện.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'へ（e）— hướng di chuyển',
    meaningVi:
      'Đi về phía… (mềm hơn に). に và へ thường thay nhau với động từ di chuyển.',
    examples: [
      {
        jp: 'にほんへいきます。',
        romaji: 'Nihon e ikimasu.',
        vi: 'Đi đến Nhật Bản.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'から〜まで',
    meaningVi: 'Từ… đến… (thời gian hoặc không gian).',
    examples: [
      {
        jp: 'くじからごじまではたらきます。',
        romaji: 'Kuji kara goji made hatarakimasu.',
        vi: 'Làm việc từ 9 giờ đến 5 giờ.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'と（to）— và / cùng với',
    meaningVi: 'Liệt kê đủ / đi cùng ai.',
    examples: [
      {
        jp: 'ペンとほんとノートをかいました。',
        romaji: 'Pen to hon to nōto o kaimashita.',
        vi: 'Đã mua bút, sách và vở.',
      },
      {
        jp: 'ともだちといきます。',
        romaji: 'Tomodachi to ikimasu.',
        vi: 'Đi cùng bạn bè.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'や〜など',
    meaningVi: 'Và… v.v. (liệt kê không đầy đủ).',
    examples: [
      {
        jp: 'りんごやバナナなどをかいました。',
        romaji: 'Ringo ya banana nado o kaimashita.',
        vi: 'Đã mua táo, chuối, v.v.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'の（no）— sở hữu / bổ nghĩa',
    meaningVi: 'Của / bổ nghĩa cho danh từ.',
    examples: [
      {
        jp: 'わたしのほん。',
        romaji: 'Watashi no hon.',
        vi: 'Sách của tôi.',
      },
      {
        jp: 'にほんごのせんせい。',
        romaji: 'Nihongo no sensei.',
        vi: 'Giáo viên tiếng Nhật.',
      },
    ],
  },
];

export const grammarBai1DongTu = [
  {
    type: 'grammar_block',
    pattern: 'Thể ます — hiện tại / tương lai (lịch sự)',
    meaningVi: 'V-ます（肯定）/ V-ません（否定）.',
    examples: [
      {
        jp: 'たべます／たべません。',
        romaji: 'Tabemasu / tabemasen.',
        vi: 'Ăn / không ăn.',
      },
      {
        jp: 'いきます／いきません。',
        romaji: 'Ikimasu / ikimasen.',
        vi: 'Đi / không đi.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'Thể ました — quá khứ lịch sự',
    meaningVi: 'V-ました（肯定）/ V-ませんでした（否定）.',
    examples: [
      {
        jp: 'きのうえいがをみました。',
        romaji: 'Kinō eiga o mimashita.',
        vi: 'Hôm qua tôi đã xem phim.',
      },
      {
        jp: 'あさごはんをたべませんでした。',
        romaji: 'Asagohan o tabemasen deshita.',
        vi: 'Tôi đã không ăn sáng.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'V-ませんか',
    meaningVi: 'Mời / gợi ý: “… cùng nhau không?”.',
    examples: [
      {
        jp: 'いっしょにたべませんか。',
        romaji: 'Issho ni tabemasen ka?',
        vi: 'Cùng ăn không?',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'V-ましょう',
    meaningVi: 'Cùng làm… nào!',
    examples: [
      {
        jp: 'はじめましょう！',
        romaji: 'Hajimemashō!',
        vi: 'Bắt đầu nào!',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'V-たいです',
    meaningVi:
      'Muốn làm… — V（ます形 bỏ ます）＋たいです. Chủ yếu cho ý muốn của bản thân.',
    examples: [
      {
        jp: 'にほんにいきたいです。',
        romaji: 'Nihon ni ikitai desu.',
        vi: 'Tôi muốn đi Nhật.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'V-ています',
    meaningVi:
      'Đang làm… / trạng thái hiện tại. V-て ＋ います.',
    examples: [
      {
        jp: 'にほんごをべんきょうしています。',
        romaji: 'Nihongo o benkyō shite imasu.',
        vi: 'Đang học tiếng Nhật.',
      },
      {
        jp: 'けっこんしています。',
        romaji: 'Kekkon shite imasu.',
        vi: 'Đã kết hôn (trạng thái).',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'V-てください',
    meaningVi: 'Hãy làm… (yêu cầu lịch sự).',
    examples: [
      {
        jp: 'みてください。',
        romaji: 'Mite kudasai.',
        vi: 'Hãy nhìn.',
      },
      {
        jp: 'きいてください。',
        romaji: 'Kiite kudasai.',
        vi: 'Hãy nghe.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'V-てもいいですか',
    meaningVi: 'Tôi có thể… được không?',
    examples: [
      {
        jp: 'ここにすわってもいいですか。',
        romaji: 'Koko ni suwatte mo ii desu ka?',
        vi: 'Tôi có thể ngồi đây không?',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'V-てはいけません',
    meaningVi: 'Không được làm…',
    examples: [
      {
        jp: 'ここでたばこをすってはいけません。',
        romaji: 'Koko de tabako o sutte wa ikemasen.',
        vi: 'Không được hút thuốc ở đây.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'V-たり V-たりします',
    meaningVi:
      'Vừa… vừa… / khi thì… khi thì…. V-た形＋り V-た形＋り します.',
    examples: [
      {
        jp: 'ほんをよんだり、おんがくをきいたりします。',
        romaji: 'Hon o yondari, ongaku o kiitari shimasu.',
        vi: 'Khi đọc sách, khi nghe nhạc.',
      },
    ],
  },
];

export const grammarBai1Keiyoshi = [
  {
    type: 'grammar_block',
    pattern: 'い形容詞 — hiện tại khẳng định',
    meaningVi: 'いAdj + です.',
    examples: [
      {
        jp: 'このほんはおもしろいです。',
        romaji: 'Kono hon wa omoshiroi desu.',
        vi: 'Quyển sách này thú vị.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'い形容詞 — hiện tại phủ định',
    meaningVi: 'いAdj（い→くない）+ です. いい → よくない（ngoại lệ）.',
    examples: [
      {
        jp: 'このほんはおもしろくないです。',
        romaji: 'Kono hon wa omoshirokunai desu.',
        vi: 'Quyển sách này không thú vị.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'い形容詞 — quá khứ',
    meaningVi: 'いAdj（い→かった）/（い→くなかった）.',
    examples: [
      {
        jp: 'きのうはさむかったです。',
        romaji: 'Kinō wa samukatta desu.',
        vi: 'Hôm qua lạnh.',
      },
      {
        jp: 'さむくなかったです。',
        romaji: 'Samukunakatta desu.',
        vi: 'Không lạnh.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'な形容詞 — chia',
    meaningVi: 'なAdj + です / じゃありません / でした.',
    examples: [
      {
        jp: 'あのまちはしずかです。',
        romaji: 'Ano machi wa shizuka desu.',
        vi: 'Thị trấn đó yên tĩnh.',
      },
      {
        jp: 'しずかじゃありません。',
        romaji: 'Shizuka ja arimasen.',
        vi: 'Không yên tĩnh.',
      },
      {
        jp: 'しずかでした。',
        romaji: 'Shizuka deshita.',
        vi: 'Đã yên tĩnh.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'Adj + て — nối tính từ',
    meaningVi: 'Và… — いAdj（い→くて）/ なAdj（→で）.',
    examples: [
      {
        jp: 'このへやはひろくてきれいです。',
        romaji: 'Kono heya wa hirokute kirei desu.',
        vi: 'Phòng này rộng và đẹp.',
      },
    ],
  },
  {
    type: 'grammar_block',
    pattern: 'いちばん ～ / ～のほうが ～',
    meaningVi: 'Nhất / … hơn….',
    examples: [
      {
        jp: 'にほんごがいちばんすきです。',
        romaji: 'Nihongo ga ichiban suki desu.',
        vi: 'Tôi thích tiếng Nhật nhất.',
      },
      {
        jp: 'バスよりでんしゃのほうがはやいです。',
        romaji: 'Basu yori densha no hō ga hayai desu.',
        vi: 'Tàu nhanh hơn xe buýt.',
      },
    ],
  },
];
