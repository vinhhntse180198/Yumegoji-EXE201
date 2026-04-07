using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using backend.Data;
using backend.DTOs.Assessment;
using backend.Models.Assessment;
using Microsoft.EntityFrameworkCore;

namespace backend.Services.Assessment;

public class AssessmentService : IAssessmentService
{
    private readonly ApplicationDbContext _db;

    public AssessmentService(ApplicationDbContext db)
    {
        _db = db;
    }

    private sealed class QuestionDef
    {
        public int Id { get; init; }
        public string Text { get; init; } = null!;
        public string CorrectKey { get; init; } = null!;
        public (string Key, string Text)[] Options { get; init; } = Array.Empty<(string, string)>();
    }

    // Ngân hàng 40 câu cố định – chỉ lưu ở backend.
    private static readonly IReadOnlyList<QuestionDef> Questions = new List<QuestionDef>
    {
        new()
        {
            Id = 1,
            Text = "これは＿＿ペンです。",
            CorrectKey = "b",
            Options = new[]
            {
                ("a", "わたし"),
                ("b", "わたしの"),
                ("c", "わたしを"),
                ("d", "わたしが")
            }
        },
        new()
        {
            Id = 2,
            Text = "いま、＿＿ですか。",
            CorrectKey = "a",
            Options = new[]
            {
                ("a", "なんじ"),
                ("b", "なんにち"),
                ("c", "なんさい"),
                ("d", "なんがつ")
            }
        },
        new()
        {
            Id = 3,
            Text = "わたしは毎日７時に＿＿。",
            CorrectKey = "b",
            Options = new[]
            {
                ("a", "ねます"),
                ("b", "おきます"),
                ("c", "いきます"),
                ("d", "たべます")
            }
        },
        new()
        {
            Id = 4,
            Text = "教室に学生が３０＿＿います。",
            CorrectKey = "c",
            Options = new[]
            {
                ("a", "まい"),
                ("b", "さつ"),
                ("c", "にん"),
                ("d", "ひき")
            }
        },
        new()
        {
            Id = 5,
            Text = "明日＿＿に行きます。",
            CorrectKey = "a",
            Options = new[]
            {
                ("a", "かいもの"),
                ("b", "かいものを"),
                ("c", "かいものが"),
                ("d", "かいもので")
            }
        },
        new()
        {
            Id = 6,
            Text = "これはいくらですか。＿＿、１０００円です。",
            CorrectKey = "c",
            Options = new[]
            {
                ("a", "すみません"),
                ("b", "どうも"),
                ("c", "はい"),
                ("d", "いいえ")
            }
        },
        new()
        {
            Id = 7,
            Text = "わたしのしゅみは本を＿＿ことです。",
            CorrectKey = "a",
            Options = new[]
            {
                ("a", "よむ"),
                ("b", "よみ"),
                ("c", "よんで"),
                ("d", "よみます")
            }
        },
        new()
        {
            Id = 8,
            Text = "山田さんは日本語がとても＿＿です。",
            CorrectKey = "a",
            Options = new[]
            {
                ("a", "じょうず"),
                ("b", "へた"),
                ("c", "ひま"),
                ("d", "きれい")
            }
        },
        new()
        {
            Id = 9,
            Text = "日曜日、どこ＿＿行きましたか。",
            CorrectKey = "c",
            Options = new[]
            {
                ("a", "が"),
                ("b", "で"),
                ("c", "に"),
                ("d", "を")
            }
        },
        new()
        {
            Id = 10,
            Text = "きのうは＿＿でしたか。",
            CorrectKey = "c",
            Options = new[]
            {
                ("a", "あつい"),
                ("b", "あつく"),
                ("c", "あつかった"),
                ("d", "あついです")
            }
        },
        new()
        {
            Id = 11,
            Text = "＿＿、もう一度言ってください。",
            CorrectKey = "c",
            Options = new[]
            {
                ("a", "ごちそうさま"),
                ("b", "いただきます"),
                ("c", "すみません"),
                ("d", "おめでとう")
            }
        },
        new()
        {
            Id = 12,
            Text = "わたしは日本のアニメ＿＿好きです。",
            CorrectKey = "a",
            Options = new[]
            {
                ("a", "が"),
                ("b", "で"),
                ("c", "に"),
                ("d", "を")
            }
        },
        new()
        {
            Id = 13,
            Text = "きょうは仕事が＿＿、とてもつかれました。",
            CorrectKey = "c",
            Options = new[]
            {
                ("a", "やさしくて"),
                ("b", "すくなくて"),
                ("c", "おおくて"),
                ("d", "うるさくて")
            }
        },
        new()
        {
            Id = 14,
            Text = "田中さんはどこに＿＿か。",
            CorrectKey = "c",
            Options = new[]
            {
                ("a", "すんで"),
                ("b", "すみます"),
                ("c", "すんでいます"),
                ("d", "すんでいました")
            }
        },
        new()
        {
            Id = 15,
            Text = "電車で＿＿ください。",
            CorrectKey = "a",
            Options = new[]
            {
                ("a", "すわって"),
                ("b", "すわらないで"),
                ("c", "すわります"),
                ("d", "すわった")
            }
        },
        new()
        {
            Id = 16,
            Text = "田中さんは今、日本で＿＿います。",
            CorrectKey = "d",
            Options = new[]
            {
                ("a", "はたらき"),
                ("b", "はたらく"),
                ("c", "はたらいて"),
                ("d", "はたらいて") // 働いています（ý nghĩa: chọn dạng て＋います）
            }
        },
        new()
        {
            Id = 17,
            Text = "雨が＿＿、サッカーの試合は中止になりました。",
            CorrectKey = "c",
            Options = new[]
            {
                ("a", "ふると"),
                ("b", "ふって"),
                ("c", "ふったので"),
                ("d", "ふるから")
            }
        },
        new()
        {
            Id = 18,
            Text = "きのうは本を読んだり、音楽を聞いたり＿＿。",
            CorrectKey = "a",
            Options = new[]
            {
                ("a", "した"),
                ("b", "します"),
                ("c", "している"),
                ("d", "しない")
            }
        },
        new()
        {
            Id = 19,
            Text = "まだ夕ごはんを＿＿。",
            CorrectKey = "b",
            Options = new[]
            {
                ("a", "たべました"),
                ("b", "たべていません"),
                ("c", "たべませんでした"),
                ("d", "たべないです")
            }
        },
        new()
        {
            Id = 20,
            Text = "明日、雨が降る＿＿しれません。",
            CorrectKey = "d",
            Options = new[]
            {
                ("a", "に"),
                ("b", "かも"),
                ("c", "かもしれない"),
                ("d", "かもしれません")
            }
        },
        new()
        {
            Id = 21,
            Text = "A: 先生、宿題を忘れてしまいました。\nB: そうですか。＿＿、こんどは気をつけてくださいね。",
            CorrectKey = "c",
            Options = new[]
            {
                ("a", "だから"),
                ("b", "でも"),
                ("c", "まあ"),
                ("d", "じゃあ")
            }
        },
        new()
        {
            Id = 22,
            Text = "A: いっしょに映画を見に行きませんか。\nB: ＿＿、今日は用事があります。",
            CorrectKey = "a",
            Options = new[]
            {
                ("a", "すみませんが"),
                ("b", "ありがとうございます"),
                ("c", "そうですね"),
                ("d", "いいですよ")
            }
        },
        new()
        {
            Id = 23,
            Text = "あした雨が＿＿、ハイキングに行きます。",
            CorrectKey = "b",
            Options = new[]
            {
                ("a", "ふっても"),
                ("b", "ふらなくても"),
                ("c", "ふれば"),
                ("d", "ふらなければ")
            }
        },
        new()
        {
            Id = 24,
            Text = "これは日本人＿＿もむずかしい本です。",
            CorrectKey = "b",
            Options = new[]
            {
                ("a", "だけ"),
                ("b", "でも"),
                ("c", "に"),
                ("d", "さえ")
            }
        },
        new()
        {
            Id = 25,
            Text = "兄はギターを＿＿ことができます。",
            CorrectKey = "a",
            Options = new[]
            {
                ("a", "ひく"),
                ("b", "ひいて"),
                ("c", "ひくの"),
                ("d", "ひきます")
            }
        },
        new()
        {
            Id = 26,
            Text = "【読解】「田中さんは毎朝６時に起きて、朝ごはんを食べてから会社に行きます。週末はよく家族と買い物をします。」\n田中さんは＿＿と買い物をしますか。",
            CorrectKey = "c",
            Options = new[]
            {
                ("a", "一人"),
                ("b", "友だち"),
                ("c", "家族"),
                ("d", "会社の人")
            }
        },
        new()
        {
            Id = 27,
            Text = "A: 駅までどうやって行きますか。\nB: このバスに＿＿行けますよ。",
            CorrectKey = "c",
            Options = new[]
            {
                ("a", "のると"),
                ("b", "のって"),
                ("c", "のれば"),
                ("d", "のっても")
            }
        },
        new()
        {
            Id = 28,
            Text = "日本語を上手に話せる＿＿、毎日練習しています。",
            CorrectKey = "b",
            Options = new[]
            {
                ("a", "ので"),
                ("b", "ように"),
                ("c", "から"),
                ("d", "ために")
            }
        },
        new()
        {
            Id = 29,
            Text = "１か月に日本語の本を何＿＿読みますか。",
            CorrectKey = "b",
            Options = new[]
            {
                ("a", "まい"),
                ("b", "さつ"),
                ("c", "だい"),
                ("d", "こ")
            }
        },
        new()
        {
            Id = 30,
            Text = "【読解】「来週、会社で大きいプロジェクトが始まります。わたしはリーダーになったので、とても忙しくなりそうです。」\n筆者は来週からどうなりそうですか。",
            CorrectKey = "c",
            Options = new[]
            {
                ("a", "ひまになりそうだ"),
                ("b", "仕事をやめそうだ"),
                ("c", "いそがしくなりそうだ"),
                ("d", "旅行に行きそうだ")
            }
        },
        new()
        {
            Id = 31,
            Text = "日本では、春になると桜が咲く＿＿です。",
            CorrectKey = "a",
            Options = new[]
            {
                ("a", "らしい"),
                ("b", "よう"),
                ("c", "そう"),
                ("d", "こと")
            }
        },
        new()
        {
            Id = 32,
            Text = "そんなに夜遅くまでゲームをしていたら、体に悪い＿＿。",
            CorrectKey = "c",
            Options = new[]
            {
                ("a", "ことになった"),
                ("b", "ことにした"),
                ("c", "のではないか"),
                ("d", "らしい")
            }
        },
        new()
        {
            Id = 33,
            Text = "大事な書類をなくして＿＿いました。",
            CorrectKey = "b",
            Options = new[]
            {
                ("a", "おいて"),
                ("b", "しまって"),
                ("c", "もらって"),
                ("d", "あげて")
            }
        },
        new()
        {
            Id = 34,
            Text = "健康のために、毎朝３０分歩くことに＿＿。",
            CorrectKey = "a",
            Options = new[]
            {
                ("a", "する"),
                ("b", "なった"),
                ("c", "している"),
                ("d", "なっている")
            }
        },
        new()
        {
            Id = 35,
            Text = "彼は日本に来た＿＿、日本語が上手になった。",
            CorrectKey = "b",
            Options = new[]
            {
                ("a", "ので"),
                ("b", "以来"),
                ("c", "うちに"),
                ("d", "ところ")
            }
        },
        new()
        {
            Id = 36,
            Text = "【読解】「私は１０年前に日本へ留学しました。最初はほとんど日本語が話せませんでしたが、毎日ニュースを見たり、日本人の友達と話したりして、少しずつ上手になりました。」\n筆者はどうやって日本語が上手になりましたか。",
            CorrectKey = "b",
            Options = new[]
            {
                ("a", "一人で勉強しただけだ"),
                ("b", "日本人の友達と話したりした"),
                ("c", "日本語の本を読まなかった"),
                ("d", "勉強するのをやめた")
            }
        },
        new()
        {
            Id = 37,
            Text = "A: あの、新しいプロジェクトの資料、もう読みましたか。\nB: いいえ、＿＿。今日の午後読むつもりです。",
            CorrectKey = "a",
            Options = new[]
            {
                ("a", "まだ読んでいません"),
                ("b", "もう読みません"),
                ("c", "まだ読みませんでした"),
                ("d", "もう読んでいません")
            }
        },
        new()
        {
            Id = 38,
            Text = "日本語だけでなく、英語＿＿勉強する必要があります。",
            CorrectKey = "d",
            Options = new[]
            {
                ("a", "まで"),
                ("b", "など"),
                ("c", "さえ"),
                ("d", "も")
            }
        },
        new()
        {
            Id = 39,
            Text = "【読解】「この会社では、１日に３回ミーティングがあります。１回目は９時、２回目は１３時、３回目は１７時に行われます。」\nミーティングは１日に何回行われますか。",
            CorrectKey = "c",
            Options = new[]
            {
                ("a", "１回"),
                ("b", "２回"),
                ("c", "３回"),
                ("d", "４回")
            }
        },
        new()
        {
            Id = 40,
            Text = "【読解】「最近、日本語の勉強があまり進んでいません。仕事が忙しくて、家に帰るといつも疲れてしまいます。それでも、日本語が上手になりたいので、毎日３０分だけでも勉強を続けようと思っています。」\n筆者はこれからどうしようと思っていますか。",
            CorrectKey = "b",
            Options = new[]
            {
                ("a", "日本語の勉強をやめる"),
                ("b", "毎日少しだけでも勉強を続ける"),
                ("c", "仕事をやめて日本語を勉強する"),
                ("d", "日本語ではなく英語を勉強する")
            }
        }
    };

    public Task<PlacementTestDefinitionDto> GetPlacementTestAsync()
    {
        var qs = Questions
            .Select(q => new PlacementQuestionDto
            {
                Id = q.Id,
                Text = q.Text,
                Options = q.Options
                    .Select(o => new PlacementQuestionOptionDto { Key = o.Key, Text = o.Text })
                    .ToArray()
            })
            .ToArray();

        var dto = new PlacementTestDefinitionDto
        {
            TotalQuestions = qs.Length,
            TimeLimitSeconds = 1200,
            Questions = qs
        };
        return Task.FromResult(dto);
    }

    public async Task<PlacementTestResultDto> SubmitPlacementTestAsync(int userId, PlacementTestSubmitRequest request)
    {
        var answerMap = request.Answers?.ToDictionary(a => a.QuestionId, a => a.SelectedKey?.Trim().ToLowerInvariant() ?? "") 
                        ?? new Dictionary<int, string>();
        var total = Questions.Count;
        var correct = 0;
        foreach (var q in Questions)
        {
            if (!answerMap.TryGetValue(q.Id, out var sel)) continue;
            if (string.Equals(sel, q.CorrectKey, StringComparison.OrdinalIgnoreCase))
                correct++;
        }

        string levelLabel;
        if (correct <= 15) levelLabel = "N5";
        else if (correct <= 30) levelLabel = "N4";
        else levelLabel = "N3";

        var now = DateTime.UtcNow;

        // Cập nhật level cho user dựa trên kết quả test
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId && u.DeletedAt == null);
        if (user != null)
        {
            var level = await _db.Levels.FirstOrDefaultAsync(l => l.Code == levelLabel);
            if (level != null)
            {
                user.LevelId = level.Id;
                user.UpdatedAt = now;
            }
        }

        _db.PlacementResults.Add(new PlacementResult
        {
            UserId = userId,
            CorrectCount = correct,
            TotalCount = total,
            LevelLabel = levelLabel,
            CreatedAt = now
        });
        await _db.SaveChangesAsync();

        return new PlacementTestResultDto
        {
            CorrectCount = correct,
            TotalCount = total,
            LevelLabel = levelLabel
        };
    }

    // --------------------- LEVEL-UP TEST (N5 -> N4, N4 -> N3) ---------------------

    public async Task<LevelUpTestDefinitionDto?> GetLevelUpTestAsync(int userId, string toLevel)
    {
        if (string.IsNullOrWhiteSpace(toLevel))
            return null;

        var target = toLevel.Trim().ToUpperInvariant();

        // Xác định fromLevel hiện tại của user dựa trên Levels
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId && u.DeletedAt == null);
        if (user == null)
            return null;

        string? fromLevelCode = null;
        if (user.LevelId.HasValue)
        {
            var lvl = await _db.Levels.FirstOrDefaultAsync(l => l.Id == user.LevelId.Value);
            fromLevelCode = lvl?.Code?.Trim().ToUpperInvariant();
        }

        if (string.IsNullOrEmpty(fromLevelCode))
            return null;

        var test = await _db.LevelUpTests
            .Include(t => t.Questions)
            .ThenInclude(q => q.Options)
            .Where(t => t.IsActive
                        && t.FromLevel.ToUpper() == fromLevelCode
                        && t.ToLevel.ToUpper() == target)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync();

        if (test == null)
            return null;

        var qs = test.Questions
            .OrderBy(q => q.OrderIndex)
            .Select(q => new LevelUpQuestionDto
            {
                Id = q.Id,
                Text = q.Text,
                Points = q.Points,
                Options = q.Options
                    .OrderBy(o => o.OptionKey)
                    .Select(o => new LevelUpQuestionOptionDto { Key = o.OptionKey, Text = o.Text })
                    .ToArray()
            })
            .ToArray();

        return new LevelUpTestDefinitionDto
        {
            TestId = test.Id,
            FromLevel = test.FromLevel,
            ToLevel = test.ToLevel,
            Title = test.Title,
            Description = test.Description,
            TotalPoints = test.TotalPoints,
            PassScore = test.PassScore,
            TimeLimitSeconds = 20 * 60,
            Questions = qs
        };
    }

    public async Task<LevelUpTestResultDto> SubmitLevelUpTestAsync(int userId, LevelUpTestSubmitRequest request)
    {
        var test = await _db.LevelUpTests
            .Include(t => t.Questions)
            .ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(t => t.Id == request.TestId && t.IsActive);

        if (test == null)
            throw new InvalidOperationException("Bài thi nâng level không tồn tại hoặc đã bị tắt.");

        var answerMap = request.Answers?
                             .ToDictionary(a => a.QuestionId, a => (a.SelectedKey ?? "").Trim().ToLowerInvariant())
                         ?? new Dictionary<int, string>();

        var maxScore = 0;
        var score = 0;

        foreach (var q in test.Questions)
        {
            var pts = q.Points > 0 ? q.Points : 1;
            maxScore += pts;

            if (!answerMap.TryGetValue(q.Id, out var sel) || string.IsNullOrEmpty(sel))
                continue;

            var correct = q.Options.FirstOrDefault(o => o.IsCorrect);
            if (correct == null)
                continue;

            if (string.Equals(sel, correct.OptionKey.Trim(), StringComparison.OrdinalIgnoreCase))
                score += pts;
        }

        if (maxScore <= 0)
            maxScore = test.TotalPoints > 0 ? test.TotalPoints : 40;

        // Chuẩn hóa: nếu TotalPoints đã cấu hình thì scale điểm về đó
        if (test.TotalPoints > 0 && maxScore != test.TotalPoints)
        {
            score = (int)Math.Round((double)score * test.TotalPoints / maxScore);
            maxScore = test.TotalPoints;
        }

        var isPassed = score * 100 >= maxScore * 80; // ngưỡng đậu 80%

        var now = DateTime.UtcNow;

        _db.LevelUpResults.Add(new LevelUpResult
        {
            UserId = userId,
            TestId = test.Id,
            FromLevel = test.FromLevel,
            ToLevel = test.ToLevel,
            Score = score,
            MaxScore = maxScore,
            IsPassed = isPassed,
            CreatedAt = now
        });

        if (isPassed)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId && u.DeletedAt == null);
            if (user != null)
            {
                var targetLevel = await _db.Levels.FirstOrDefaultAsync(l =>
                    l.Code != null && l.Code.Trim().ToUpper() == test.ToLevel.Trim().ToUpper());
                if (targetLevel != null)
                {
                    user.LevelId = targetLevel.Id;
                    user.UpdatedAt = now;
                }
            }
        }

        await _db.SaveChangesAsync();

        return new LevelUpTestResultDto
        {
            TestId = test.Id,
            FromLevel = test.FromLevel,
            ToLevel = test.ToLevel,
            Score = score,
            MaxScore = maxScore,
            IsPassed = isPassed
        };
    }
}

