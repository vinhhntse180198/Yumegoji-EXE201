-- Bài test đầu vào JLPT N5–N3 (40 câu)
-- Tạo bảng câu hỏi + đáp án và insert dữ liệu mẫu

IF OBJECT_ID(N'placement_question_options', N'U') IS NOT NULL
BEGIN
    DROP TABLE placement_question_options;
END;

IF OBJECT_ID(N'placement_questions', N'U') IS NOT NULL
BEGIN
    DROP TABLE placement_questions;
END;
GO

-- Bảng câu hỏi
CREATE TABLE placement_questions (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    level_label  NVARCHAR(5) NOT NULL,       -- 'N5', 'N4', 'N3'
    sort_order   INT          NOT NULL,      -- 1..40
    text         NVARCHAR(MAX) NOT NULL
);

-- Bảng đáp án
CREATE TABLE placement_question_options (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    question_id  INT           NOT NULL,
    option_key   NVARCHAR(1)   NOT NULL,     -- 'a','b','c','d'
    text         NVARCHAR(MAX) NOT NULL,
    is_correct   BIT           NOT NULL DEFAULT 0,
    CONSTRAINT FK_placement_options_question
        FOREIGN KEY (question_id) REFERENCES placement_questions(id)
);
GO

-- =========================
-- INSERT 40 CÂU HỎI
-- =========================

-- N5: câu 1–15
INSERT INTO placement_questions (level_label, sort_order, text) VALUES
(N'N5',  1, N'これは＿＿ペンです。'),
(N'N5',  2, N'いま、＿＿ですか。'),
(N'N5',  3, N'わたしは毎日７時に＿＿。'),
(N'N5',  4, N'教室に学生が３０＿＿います。'),
(N'N5',  5, N'明日＿＿に行きます。'),
(N'N5',  6, N'これはいくらですか。＿＿、１０００円です。'),
(N'N5',  7, N'わたしのしゅみは本を＿＿ことです。'),
(N'N5',  8, N'山田さんは日本語がとても＿＿です。'),
(N'N5',  9, N'日曜日、どこ＿＿行きましたか。'),
(N'N5', 10, N'きのうは＿＿でしたか。'),
(N'N5', 11, N'＿＿、もう一度言ってください。'),
(N'N5', 12, N'わたしは日本のアニメ＿＿好きです。'),
(N'N5', 13, N'きょうは仕事が＿＿、とてもつかれました。'),
(N'N5', 14, N'田中さんはどこに＿＿か。'),
(N'N5', 15, N'電車で＿＿ください。');

-- N4: câu 16–30
INSERT INTO placement_questions (level_label, sort_order, text) VALUES
(N'N4', 16, N'田中さんは今、日本で＿＿います。'),
(N'N4', 17, N'雨が＿＿、サッカーの試合は中止になりました。'),
(N'N4', 18, N'きのうは本を読んだり、音楽を聞いたり＿＿。'),
(N'N4', 19, N'まだ夕ごはんを＿＿。'),
(N'N4', 20, N'明日、雨が降る＿＿しれません。'),
(N'N4', 21, N'A: 先生、宿題を忘れてしまいました。' + CHAR(13) + CHAR(10) +
           N'B: そうですか。＿＿、こんどは気をつけてくださいね。'),
(N'N4', 22, N'A: いっしょに映画を見に行きませんか。' + CHAR(13) + CHAR(10) +
           N'B: ＿＿、今日は用事があります。'),
(N'N4', 23, N'あした雨が＿＿、ハイキングに行きます。'),
(N'N4', 24, N'これは日本人＿＿もむずかしい本です。'),
(N'N4', 25, N'兄はギターを＿＿ことができます。'),
(N'N4', 26, N'【読解】「田中さんは毎朝６時に起きて、朝ごはんを食べてから会社に行きます。週末はよく家族と買い物をします。」' + CHAR(13) + CHAR(10) +
           N'田中さんは＿＿と買い物をしますか。'),
(N'N4', 27, N'【会話】A: 駅までどうやって行きますか。' + CHAR(13) + CHAR(10) +
           N'B: このバスに＿＿行けますよ。'),
(N'N4', 28, N'【文法】日本語を上手に話せる＿＿、毎日練習しています。'),
(N'N4', 29, N'【語彙】１か月に日本語の本を何＿＿読みますか。'),
(N'N4', 30, N'【読解】「来週、会社で大きいプロジェクトが始まります。わたしはリーダーになったので、とても忙しくなりそうです。」' + CHAR(13) + CHAR(10) +
           N'筆者は来週からどうなりそうですか。');

-- N3: câu 31–40
INSERT INTO placement_questions (level_label, sort_order, text) VALUES
(N'N3', 31, N'日本では、春になると桜が咲く＿＿です。'),
(N'N3', 32, N'そんなに夜遅くまでゲームをしていたら、体に悪い＿＿。'),
(N'N3', 33, N'大事な書類をなくして＿＿いました。'),
(N'N3', 34, N'健康のために、毎朝３０分歩くことに＿＿。'),
(N'N3', 35, N'彼は日本に来た＿＿、日本語が上手になった。'),
(N'N3', 36, N'【読解】「私は１０年前に日本へ留学しました。最初はほとんど日本語が話せませんでしたが、毎日ニュースを見たり、日本人の友達と話したりして、少しずつ上手になりました。」' + CHAR(13) + CHAR(10) +
           N'筆者はどうやって日本語が上手になりましたか。'),
(N'N3', 37, N'【会話】A: あの、新しいプロジェクトの資料、もう読みましたか。' + CHAR(13) + CHAR(10) +
           N'B: いいえ、＿＿。今日の午後読むつもりです。'),
(N'N3', 38, N'【文法】日本語だけでなく、英語＿＿勉強する必要があります。'),
(N'N3', 39, N'【読解】「この会社では、１日に３回ミーティングがあります。１回目は９時、２回目は１３時、３回目は１７時に行われます。」' + CHAR(13) + CHAR(10) +
           N'ミーティングは１日に何回行われますか。'),
(N'N3', 40, N'【読解】「最近、日本語の勉強があまり進んでいません。仕事が忙しくて、家に帰るといつも疲れてしまいます。それでも、日本語が上手になりたいので、毎日３０分だけでも勉強を続けようと思っています。」' + CHAR(13) + CHAR(10) +
           N'筆者はこれからどうしようと思っていますか。');
GO

-- =========================
-- INSERT ĐÁP ÁN
-- =========================

-- N5 (1–15)
DECLARE @q1 INT = (SELECT id FROM placement_questions WHERE sort_order = 1);
INSERT INTO placement_question_options (question_id, option_key, text, is_correct) VALUES
(@q1, N'a', N'わたし', 0),
(@q1, N'b', N'わたしの', 1),
(@q1, N'c', N'わたしを', 0),
(@q1, N'd', N'わたしが', 0);

DECLARE @q2 INT = (SELECT id FROM placement_questions WHERE sort_order = 2);
INSERT INTO placement_question_options VALUES
(@q2, N'a', N'なんじ', 1),
(@q2, N'b', N'なんにち', 0),
(@q2, N'c', N'なんさい', 0),
(@q2, N'd', N'なんがつ', 0);

DECLARE @q3 INT = (SELECT id FROM placement_questions WHERE sort_order = 3);
INSERT INTO placement_question_options VALUES
(@q3, N'a', N'ねます', 0),
(@q3, N'b', N'おきます', 1),
(@q3, N'c', N'いきます', 0),
(@q3, N'd', N'たべます', 0);

DECLARE @q4 INT = (SELECT id FROM placement_questions WHERE sort_order = 4);
INSERT INTO placement_question_options VALUES
(@q4, N'a', N'まい', 0),
(@q4, N'b', N'さつ', 0),
(@q4, N'c', N'にん', 1),
(@q4, N'd', N'ひき', 0);

DECLARE @q5 INT = (SELECT id FROM placement_questions WHERE sort_order = 5);
INSERT INTO placement_question_options VALUES
(@q5, N'a', N'かいもの', 1),
(@q5, N'b', N'かいものを', 0),
(@q5, N'c', N'かいものが', 0),
(@q5, N'd', N'かいもので', 0);

DECLARE @q6 INT = (SELECT id FROM placement_questions WHERE sort_order = 6);
INSERT INTO placement_question_options VALUES
(@q6, N'a', N'すみません', 0),
(@q6, N'b', N'どうも', 0),
(@q6, N'c', N'はい', 1),
(@q6, N'd', N'いいえ', 0);

DECLARE @q7 INT = (SELECT id FROM placement_questions WHERE sort_order = 7);
INSERT INTO placement_question_options VALUES
(@q7, N'a', N'よむ', 1),
(@q7, N'b', N'よみ', 0),
(@q7, N'c', N'よんで', 0),
(@q7, N'd', N'よみます', 0);

DECLARE @q8 INT = (SELECT id FROM placement_questions WHERE sort_order = 8);
INSERT INTO placement_question_options VALUES
(@q8, N'a', N'じょうず', 1),
(@q8, N'b', N'へた', 0),
(@q8, N'c', N'ひま', 0),
(@q8, N'd', N'きれい', 0);

DECLARE @q9 INT = (SELECT id FROM placement_questions WHERE sort_order = 9);
INSERT INTO placement_question_options VALUES
(@q9, N'a', N'が', 0),
(@q9, N'b', N'で', 0),
(@q9, N'c', N'に', 1),
(@q9, N'd', N'を', 0);

DECLARE @q10 INT = (SELECT id FROM placement_questions WHERE sort_order = 10);
INSERT INTO placement_question_options VALUES
(@q10, N'a', N'あつい', 0),
(@q10, N'b', N'あつく', 0),
(@q10, N'c', N'あつかった', 1),
(@q10, N'd', N'あついです', 0);

DECLARE @q11 INT = (SELECT id FROM placement_questions WHERE sort_order = 11);
INSERT INTO placement_question_options VALUES
(@q11, N'a', N'ごちそうさま', 0),
(@q11, N'b', N'いただきます', 0),
(@q11, N'c', N'すみません', 1),
(@q11, N'd', N'おめでとう', 0);

DECLARE @q12 INT = (SELECT id FROM placement_questions WHERE sort_order = 12);
INSERT INTO placement_question_options VALUES
(@q12, N'a', N'が', 1),
(@q12, N'b', N'で', 0),
(@q12, N'c', N'に', 0),
(@q12, N'd', N'を', 0);

DECLARE @q13 INT = (SELECT id FROM placement_questions WHERE sort_order = 13);
INSERT INTO placement_question_options VALUES
(@q13, N'a', N'やさしくて', 0),
(@q13, N'b', N'すくなくて', 0),
(@q13, N'c', N'おおくて', 1),
(@q13, N'd', N'うるさくて', 0);

DECLARE @q14 INT = (SELECT id FROM placement_questions WHERE sort_order = 14);
INSERT INTO placement_question_options VALUES
(@q14, N'a', N'すんで', 0),
(@q14, N'b', N'すみます', 0),
(@q14, N'c', N'すんでいます', 1),
(@q14, N'd', N'すんでいました', 0);

DECLARE @q15 INT = (SELECT id FROM placement_questions WHERE sort_order = 15);
INSERT INTO placement_question_options VALUES
(@q15, N'a', N'すわって', 1),
(@q15, N'b', N'すわらないで', 0),
(@q15, N'c', N'すわります', 0),
(@q15, N'd', N'すわった', 0);

-- N4 (16–30)
DECLARE @q16 INT = (SELECT id FROM placement_questions WHERE sort_order = 16);
INSERT INTO placement_question_options VALUES
(@q16, N'a', N'はたらき', 0),
(@q16, N'b', N'はたらく', 0),
(@q16, N'c', N'はたらいて', 0),
(@q16, N'd', N'はたらいて', 1); -- 働いています

DECLARE @q17 INT = (SELECT id FROM placement_questions WHERE sort_order = 17);
INSERT INTO placement_question_options VALUES
(@q17, N'a', N'ふると', 0),
(@q17, N'b', N'ふって', 0),
(@q17, N'c', N'ふったので', 1),
(@q17, N'd', N'ふるから', 0);

DECLARE @q18 INT = (SELECT id FROM placement_questions WHERE sort_order = 18);
INSERT INTO placement_question_options VALUES
(@q18, N'a', N'した', 1),
(@q18, N'b', N'します', 0),
(@q18, N'c', N'している', 0),
(@q18, N'd', N'しない', 0);

DECLARE @q19 INT = (SELECT id FROM placement_questions WHERE sort_order = 19);
INSERT INTO placement_question_options VALUES
(@q19, N'a', N'たべました', 0),
(@q19, N'b', N'たべていません', 1),
(@q19, N'c', N'たべませんでした', 0),
(@q19, N'd', N'たべないです', 0);

DECLARE @q20 INT = (SELECT id FROM placement_questions WHERE sort_order = 20);
INSERT INTO placement_question_options VALUES
(@q20, N'a', N'に', 0),
(@q20, N'b', N'かも', 0),
(@q20, N'c', N'かもしれない', 0),
(@q20, N'd', N'かもしれません', 1);

DECLARE @q21 INT = (SELECT id FROM placement_questions WHERE sort_order = 21);
INSERT INTO placement_question_options VALUES
(@q21, N'a', N'だから', 0),
(@q21, N'b', N'でも', 0),
(@q21, N'c', N'まあ', 1),
(@q21, N'd', N'じゃあ', 0);

DECLARE @q22 INT = (SELECT id FROM placement_questions WHERE sort_order = 22);
INSERT INTO placement_question_options VALUES
(@q22, N'a', N'すみませんが', 1),
(@q22, N'b', N'ありがとうございます', 0),
(@q22, N'c', N'そうですね', 0),
(@q22, N'd', N'いいですよ', 0);

DECLARE @q23 INT = (SELECT id FROM placement_questions WHERE sort_order = 23);
INSERT INTO placement_question_options VALUES
(@q23, N'a', N'ふっても', 0),
(@q23, N'b', N'ふらなくても', 1),
(@q23, N'c', N'ふれば', 0),
(@q23, N'd', N'ふらなければ', 0);

DECLARE @q24 INT = (SELECT id FROM placement_questions WHERE sort_order = 24);
INSERT INTO placement_question_options VALUES
(@q24, N'a', N'だけ', 0),
(@q24, N'b', N'でも', 1),
(@q24, N'c', N'に', 0),
(@q24, N'd', N'さえ', 0);

DECLARE @q25 INT = (SELECT id FROM placement_questions WHERE sort_order = 25);
INSERT INTO placement_question_options VALUES
(@q25, N'a', N'ひく', 1),
(@q25, N'b', N'ひいて', 0),
(@q25, N'c', N'ひくの', 0),
(@q25, N'd', N'ひきます', 0);

DECLARE @q26 INT = (SELECT id FROM placement_questions WHERE sort_order = 26);
INSERT INTO placement_question_options VALUES
(@q26, N'a', N'一人', 0),
(@q26, N'b', N'友だち', 0),
(@q26, N'c', N'家族', 1),
(@q26, N'd', N'会社の人', 0);

DECLARE @q27 INT = (SELECT id FROM placement_questions WHERE sort_order = 27);
INSERT INTO placement_question_options VALUES
(@q27, N'a', N'のると', 0),
(@q27, N'b', N'のって', 0),
(@q27, N'c', N'のれば', 1),
(@q27, N'd', N'のっても', 0);

DECLARE @q28 INT = (SELECT id FROM placement_questions WHERE sort_order = 28);
INSERT INTO placement_question_options VALUES
(@q28, N'a', N'ので', 0),
(@q28, N'b', N'ように', 1),
(@q28, N'c', N'から', 0),
(@q28, N'd', N'ために', 0);

DECLARE @q29 INT = (SELECT id FROM placement_questions WHERE sort_order = 29);
INSERT INTO placement_question_options VALUES
(@q29, N'a', N'まい', 0),
(@q29, N'b', N'さつ', 1),
(@q29, N'c', N'だい', 0),
(@q29, N'd', N'こ', 0);

DECLARE @q30 INT = (SELECT id FROM placement_questions WHERE sort_order = 30);
INSERT INTO placement_question_options VALUES
(@q30, N'a', N'ひまになりそうだ', 0),
(@q30, N'b', N'仕事をやめそうだ', 0),
(@q30, N'c', N'いそがしくなりそうだ', 1),
(@q30, N'd', N'旅行に行きそうだ', 0);

-- N3 (31–40)
DECLARE @q31 INT = (SELECT id FROM placement_questions WHERE sort_order = 31);
INSERT INTO placement_question_options VALUES
(@q31, N'a', N'らしい', 1),
(@q31, N'b', N'よう', 0),
(@q31, N'c', N'そう', 0),
(@q31, N'd', N'こと', 0);

DECLARE @q32 INT = (SELECT id FROM placement_questions WHERE sort_order = 32);
INSERT INTO placement_question_options VALUES
(@q32, N'a', N'ことになった', 0),
(@q32, N'b', N'ことにした', 0),
(@q32, N'c', N'のではないか', 1),
(@q32, N'd', N'らしい', 0);

DECLARE @q33 INT = (SELECT id FROM placement_questions WHERE sort_order = 33);
INSERT INTO placement_question_options VALUES
(@q33, N'a', N'おいて', 0),
(@q33, N'b', N'しまって', 1),
(@q33, N'c', N'もらって', 0),
(@q33, N'd', N'あげて', 0);

DECLARE @q34 INT = (SELECT id FROM placement_questions WHERE sort_order = 34);
INSERT INTO placement_question_options VALUES
(@q34, N'a', N'する', 1),
(@q34, N'b', N'なった', 0),
(@q34, N'c', N'している', 0),
(@q34, N'd', N'なっている', 0);

DECLARE @q35 INT = (SELECT id FROM placement_questions WHERE sort_order = 35);
INSERT INTO placement_question_options VALUES
(@q35, N'a', N'ので', 0),
(@q35, N'b', N'以来', 1),
(@q35, N'c', N'うちに', 0),
(@q35, N'd', N'ところ', 0);

DECLARE @q36 INT = (SELECT id FROM placement_questions WHERE sort_order = 36);
INSERT INTO placement_question_options VALUES
(@q36, N'a', N'一人で勉強しただけだ', 0),
(@q36, N'b', N'日本人の友達と話したりした', 1),
(@q36, N'c', N'日本語の本を読まなかった', 0),
(@q36, N'd', N'勉強するのをやめた', 0);

DECLARE @q37 INT = (SELECT id FROM placement_questions WHERE sort_order = 37);
INSERT INTO placement_question_options VALUES
(@q37, N'a', N'まだ読んでいません', 1),
(@q37, N'b', N'もう読みません', 0),
(@q37, N'c', N'まだ読みませんでした', 0),
(@q37, N'd', N'もう読んでいません', 0);

DECLARE @q38 INT = (SELECT id FROM placement_questions WHERE sort_order = 38);
INSERT INTO placement_question_options VALUES
(@q38, N'a', N'まで', 0),
(@q38, N'b', N'など', 0),
(@q38, N'c', N'さえ', 0),
(@q38, N'd', N'も', 1);

DECLARE @q39 INT = (SELECT id FROM placement_questions WHERE sort_order = 39);
INSERT INTO placement_question_options VALUES
(@q39, N'a', N'１回', 0),
(@q39, N'b', N'２回', 0),
(@q39, N'c', N'３回', 1),
(@q39, N'd', N'４回', 0);

DECLARE @q40 INT = (SELECT id FROM placement_questions WHERE sort_order = 40);
INSERT INTO placement_question_options VALUES
(@q40, N'a', N'日本語の勉強をやめる', 0),
(@q40, N'b', N'毎日少しだけでも勉強を続ける', 1),
(@q40, N'c', N'仕事をやめて日本語を勉強する', 0),
(@q40, N'd', N'日本語ではなく英語を勉強する', 0);
GO