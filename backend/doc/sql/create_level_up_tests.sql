IF OBJECT_ID(N'level_up_results', N'U') IS NOT NULL
    DROP TABLE level_up_results;
IF OBJECT_ID(N'level_up_question_options', N'U') IS NOT NULL
    DROP TABLE level_up_question_options;
IF OBJECT_ID(N'level_up_questions', N'U') IS NOT NULL
    DROP TABLE level_up_questions;
IF OBJECT_ID(N'level_up_tests', N'U') IS NOT NULL
    DROP TABLE level_up_tests;
GO

CREATE TABLE level_up_tests (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    from_level   NVARCHAR(10) NOT NULL,
    to_level     NVARCHAR(10) NOT NULL,
    title        NVARCHAR(200) NOT NULL,
    description  NVARCHAR(500) NULL,
    total_points INT          NOT NULL DEFAULT 40,
    pass_score   INT          NOT NULL, -- điểm tối thiểu để đậu (80%)
    is_active    BIT          NOT NULL DEFAULT 1,
    created_at   DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE level_up_questions (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    test_id     INT         NOT NULL REFERENCES level_up_tests(id) ON DELETE CASCADE,
    order_index INT         NOT NULL,
    text        NVARCHAR(MAX) NOT NULL,
    type        NVARCHAR(20)  NOT NULL DEFAULT 'single_choice',
    points      INT           NOT NULL DEFAULT 1
);
GO

CREATE TABLE level_up_question_options (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    question_id INT          NOT NULL REFERENCES level_up_questions(id) ON DELETE CASCADE,
    option_key  NVARCHAR(10) NOT NULL,
    text        NVARCHAR(MAX) NOT NULL,
    is_correct  BIT           NOT NULL DEFAULT 0
);
GO

CREATE TABLE level_up_results (
    id        INT IDENTITY(1,1) PRIMARY KEY,
    user_id   INT          NOT NULL,
    test_id   INT          NOT NULL REFERENCES level_up_tests(id),
    from_level NVARCHAR(10) NOT NULL,
    to_level   NVARCHAR(10) NOT NULL,
    score     INT          NOT NULL,
    max_score INT          NOT NULL,
    is_passed BIT          NOT NULL,
    created_at DATETIME2   NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE INDEX IX_level_up_results_user_created
    ON level_up_results(user_id, created_at);
GO

-- Seed mẫu 2 đề thi (40 câu / đề, pass >= 80%) để bạn test nhanh.
INSERT INTO level_up_tests (from_level, to_level, title, description, total_points, pass_score, is_active)
VALUES
('N5', 'N4', N'Thi lên N4', N'Bài thi nâng trình độ từ N5 lên N4 (mẫu).', 40, 32, 1),
('N4', 'N3', N'Thi lên N3', N'Bài thi nâng trình độ từ N4 lên N3 (mẫu).', 40, 32, 1);
GO

DECLARE @testN5N4 INT = (SELECT TOP 1 id FROM level_up_tests WHERE from_level = 'N5' AND to_level = 'N4' ORDER BY id);
DECLARE @testN4N3 INT = (SELECT TOP 1 id FROM level_up_tests WHERE from_level = 'N4' AND to_level = 'N3' ORDER BY id);

-- Đề mẫu 40 câu, dùng cho N5->N4. Moderator có thể sửa lại sau.
DECLARE @Q TABLE (
    qid        INT PRIMARY KEY,
    q          NVARCHAR(MAX),
    a1         NVARCHAR(MAX),
    a2         NVARCHAR(MAX),
    a3         NVARCHAR(MAX),
    a4         NVARCHAR(MAX),
    correctKey CHAR(1)
);

INSERT INTO @Q (qid, q, a1, a2, a3, a4, correctKey)
VALUES
 (1, N'これは＿＿ペンです。', N'わたし', N'わたしの', N'わたしを', N'わたしが', 'b')
,(2, N'いま、＿＿ですか。', N'なんじ', N'なんにち', N'なんさい', N'なんがつ', 'a')
,(3, N'わたしは毎日７時に＿＿。', N'ねます', N'おきます', N'いきます', N'たべます', 'b')
,(4, N'教室に学生が３０＿＿います。', N'まい', N'さつ', N'にん', N'ひき', 'c')
,(5, N'明日＿＿に行きます。', N'かいもの', N'かいものを', N'かいものが', N'かいもので', 'a')
,(6, N'これはいくらですか。＿＿、１０００円です。', N'すみません', N'どうも', N'はい', N'いいえ', 'c')
,(7, N'わたしのしゅみは本を＿＿ことです。', N'よむ', N'よみ', N'よんで', N'よみます', 'a')
,(8, N'山田さんは日本語がとても＿＿です。', N'じょうず', N'へた', N'ひま', N'きれい', 'a')
,(9, N'日曜日、どこ＿＿行きましたか。', N'が', N'で', N'に', N'を', 'c')
,(10, N'きのうは＿＿でしたか。', N'あつい', N'あつく', N'あつかった', N'あついです', 'c')
,(11, N'＿＿、もう一度言ってください。', N'ごちそうさま', N'いただきます', N'すみません', N'おめでとう', 'c')
,(12, N'わたしは日本のアニメ＿＿好きです。', N'が', N'で', N'に', N'を', 'a')
,(13, N'きょうは仕事が＿＿、とてもつかれました。', N'やさしくて', N'すくなくて', N'おおくて', N'うるさくて', 'c')
,(14, N'田中さんはどこに＿＿か。', N'すんで', N'すみます', N'すんでいます', N'すんでいました', 'c')
,(15, N'電車で＿＿ください。', N'すわって', N'すわらないで', N'すわります', N'すわった', 'a')
,(16, N'田中さんは今、日本で＿＿います。', N'はたらき', N'はたらく', N'はたらいて', N'はたらいて', 'd')
,(17, N'雨が＿＿、サッカーの試合は中止になりました。', N'ふると', N'ふって', N'ふったので', N'ふるから', 'c')
,(18, N'きのうは本を読んだり、音楽を聞いたり＿＿。', N'した', N'します', N'している', N'しない', 'a')
,(19, N'まだ夕ごはんを＿＿。', N'たべました', N'たべていません', N'たべませんでした', N'たべないです', 'b')
,(20, N'明日、雨が降る＿＿しれません。', N'に', N'かも', N'かもしれない', N'かもしれません', 'd')
,(21, N'A: 先生、宿題を忘れてしまいました。 B: そうですか。＿＿、こんどは気をつけてくださいね。', N'だから', N'でも', N'まあ', N'じゃあ', 'c')
,(22, N'A: いっしょに映画を見に行きませんか。 B: ＿＿、今日は用事があります。', N'すみませんが', N'ありがとうございます', N'そうですね', N'いいですよ', 'a')
,(23, N'あした雨が＿＿、ハイキングに行きます。', N'ふっても', N'ふらなくても', N'ふれば', N'ふらなければ', 'b')
,(24, N'これは日本人＿＿もむずかしい本です。', N'だけ', N'でも', N'に', N'さえ', 'b')
,(25, N'兄はギターを＿＿ことができます。', N'ひく', N'ひいて', N'ひくの', N'ひきます', 'a')
,(26, N'【読解】「田中さんは毎朝６時に起きて、朝ごはんを食べてから会社に行きます。週末はよく家族と買い物をします。」田中さんは＿＿と買い物をしますか。', N'一人', N'友だち', N'家族', N'会社の人', 'c')
,(27, N'A: 駅までどうやって行きますか。 B: このバスに＿＿行けますよ。', N'のると', N'のって', N'のれば', N'のっても', 'c')
,(28, N'日本語を上手に話せる＿＿、毎日練習しています。', N'ので', N'ように', N'から', N'ために', 'b')
,(29, N'１か月に日本語の本を何＿＿読みますか。', N'まい', N'さつ', N'だい', N'こ', 'b')
,(30, N'【読解】「来週、会社で大きいプロジェクトが始まります。わたしはリーダーになったので、とても忙しくなりそうです。」筆者は来週からどうなりそうですか。', N'ひまになりそうだ', N'仕事をやめそうだ', N'いそがしくなりそうだ', N'旅行に行きそうだ', 'c')
,(31, N'日本では、春になると桜が咲く＿＿です。', N'らしい', N'よう', N'そう', N'こと', 'a')
,(32, N'そんなに夜遅くまでゲームをしていたら、体に悪い＿＿。', N'ことになった', N'ことにした', N'のではないか', N'らしい', 'c')
,(33, N'大事な書類をなくして＿＿いました。', N'おいて', N'しまって', N'もらって', N'あげて', 'b')
,(34, N'健康のために、毎朝３０分歩くことに＿＿。', N'する', N'なった', N'している', N'なっている', 'a')
,(35, N'彼は日本に来た＿＿、日本語が上手になった。', N'ので', N'以来', N'うちに', N'ところ', 'b')
,(36, N'【読解】「私は１０年前に日本へ留学しました。最初はほとんど日本語が話せませんでしたが、毎日ニュースを見たり、日本人の友達と話したりして、少しずつ上手になりました。」筆者はどうやって日本語が上手になりましたか。', N'一人で勉強しただけだ', N'日本人の友達と話したりした', N'日本語の本を読まなかった', N'勉強するのをやめた', 'b')
,(37, N'A: あの、新しいプロジェクトの資料、もう読みましたか。 B: いいえ、＿＿。今日の午後読むつもりです。', N'まだ読んでいません', N'もう読みません', N'まだ読みませんでした', N'もう読んでいません', 'a')
,(38, N'日本語だけでなく、英語＿＿勉強する必要があります。', N'まで', N'など', N'さえ', N'も', 'd')
,(39, N'【読解】「この会社では、１日に３回ミーティングがあります。１回目は９時、２回目は１３時、３回目は１７時に行われます。」ミーティングは１日に何回行われますか。', N'１回', N'２回', N'３回', N'４回', 'c')
,(40, N'【読解】「最近、日本語の勉強があまり進んでいません。仕事が忙しくて、家に帰るといつも疲れてしまいます。それでも、日本語が上手になりたいので、毎日３０分だけでも勉強を続けようと思っています。」筆者はこれからどうしようと思っていますか。', N'日本語の勉強をやめる', N'毎日少しだけでも勉強を続ける', N'仕事をやめて日本語を勉強する', N'日本語ではなく英語を勉強する', 'b');

-- Tạo 40 câu hỏi cho đề N5->N4
INSERT INTO level_up_questions (test_id, order_index, text, type, points)
SELECT @testN5N4, qid, q, 'single_choice', 1
FROM @Q
ORDER BY qid;

-- Sao chép lại 40 câu từ đề N5->N4 sang đề N4->N3 (cùng nội dung, để bạn test trước).
INSERT INTO level_up_questions (test_id, order_index, text, type, points)
SELECT @testN4N3, qid, q, 'single_choice', 1
FROM @Q
ORDER BY qid;

-- Seed đầy đủ đáp án cho 40 câu N5->N4 dựa trên bảng @Q
INSERT INTO level_up_question_options (question_id, option_key, text, is_correct)
SELECT q.id,
       opt.option_key,
       opt.text,
       CASE WHEN opt.option_key = QQ.correctKey THEN 1 ELSE 0 END AS is_correct
FROM level_up_questions q
JOIN @Q AS QQ
    ON q.order_index = QQ.qid
   AND q.test_id = @testN5N4
CROSS APPLY (VALUES
    ('a', QQ.a1),
    ('b', QQ.a2),
    ('c', QQ.a3),
    ('d', QQ.a4)
) AS opt(option_key, text);

-- Seed đầy đủ đáp án cho 40 câu N4->N3 (sao chép cấu trúc và đáp án từ N5->N4)
INSERT INTO level_up_question_options (question_id, option_key, text, is_correct)
SELECT q2.id,
       opt.option_key,
       opt.text,
       CASE WHEN opt.option_key = QQ.correctKey THEN 1 ELSE 0 END AS is_correct
FROM level_up_questions q2
JOIN level_up_questions q1
    ON q1.order_index = q2.order_index
   AND q1.test_id = @testN5N4
   AND q2.test_id = @testN4N3
JOIN @Q AS QQ
    ON QQ.qid = q1.order_index
CROSS APPLY (VALUES
    ('a', QQ.a1),
    ('b', QQ.a2),
    ('c', QQ.a3),
    ('d', QQ.a4)
) AS opt(option_key, text);


