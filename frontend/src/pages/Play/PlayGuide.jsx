import { Link } from 'react-router-dom';
import { ROUTES } from '../../data/routes';

export default function PlayGuide() {
  return (
    <div className="play-game play-guide">
      <header className="play-game__head">
        <Link className="play-game__back" to={ROUTES.PLAY}>
          ← Trò chơi
        </Link>
        <h1 className="play-game__title">Đặc tả game &amp; phần thưởng</h1>
      </header>

      <div className="play-guide__body">
        <section className="play-guide__section">
          <h2>9 trò chơi (đặc tả)</h2>
          <ol className="play-guide__list play-guide__list--num">
            <li>
              <strong>Hiragana Match</strong> — Chọn đúng romaji cho chữ Hiragana — <em>10 giây/câu</em> — <em>N5</em>
            </li>
            <li>
              <strong>Katakana Match</strong> — Tương tự cho Katakana — <em>10 giây/câu</em> — <em>N5</em>
            </li>
            <li>
              <strong>Kanji Memory</strong> — Lật thẻ ghép Kanji (hoặc từ) với nghĩa tiếng Việt — <em>memory game</em> —{' '}
              <em>N5</em>
            </li>
            <li>
              <strong>Vocabulary Speed Quiz</strong> — Quiz từ vựng phản xạ nhanh — <em>8 giây/câu</em> —{' '}
              <em>N5–N3</em>
            </li>
            <li>
              <strong>Sentence Builder</strong> — Sắp xếp từ thành câu hoàn chỉnh — <em>N5–N3</em>
            </li>
            <li>
              <strong>Counter Quest</strong> — Chọn cách đếm đúng (trợ từ đếm) — <em>N5–N4</em>
            </li>
            <li>
              <strong>Flashcard Battle</strong> — Đấu với Bot AI (client mô phỏng ~70% “trúng”/câu); trận PvP người với
              người qua <Link to={`${ROUTES.PLAY}/pvp`}>phòng PvP</Link> — <em>N5–N3</em>
            </li>
            <li>
              <strong>Boss Battle</strong> — Đánh boss bằng kiến thức — thanh HP boss &amp; thanh người chơi (theo mạng) —{' '}
              <em>N5–N3</em>
            </li>
            <li>
              <strong>Daily Challenge</strong> — Mix <em>15 câu</em> từ nhiều chủ đề (cấu hình bộ đề DB) —{' '}
              <em>N5–N3</em>
            </li>
          </ol>
          <p className="play-guide__note">
            Seed game + câu hỏi: <code>doc/sql/seed_games_playable_fix_v1.sql</code> và{' '}
            <code>yumegoji_game_system_spec.sql</code>. Timer Hiragana/Katakana 10s, Vocab Speed 8s được áp thêm trên
            client; Daily 15 câu cần <code>questions_per_round = 15</code> trong bộ đề.
          </p>
        </section>

        <section className="play-guide__section">
          <h2>6.2 — Cơ chế điểm &amp; combo</h2>
          <ul className="play-guide__list">
            <li>Trả lời đúng: +100 điểm cơ bản (cấu hình theo game trong <code>game_score_configs</code>).</li>
            <li>Trả lời nhanh: thêm điểm thưởng tốc độ (ngưỡng ms trong config).</li>
            <li>
              Combo liên tiếp: nhân điểm ×1.2, ×1.5, ×2.0 (trong <code>sp_SubmitAnswer</code> /{' '}
              <code>game_score_configs.combo_rules_json</code>).
            </li>
            <li>Trả lời sai: mất 1 mạng, combo reset (trừ khi dùng <strong>Skip</strong> — không trừ mạng, xử lý phía API).</li>
          </ul>
        </section>

        <section className="play-guide__section">
          <h2>6.2 — Power-up</h2>
          <ul className="play-guide__list">
            <li>
              <strong>50:50</strong> — Loại 2 đáp án sai: cần mở rộng API/SP để server trả về chỉ số ẩn an toàn (hiện tại
              chưa gắn UI).
            </li>
            <li>
              <strong>Time Freeze</strong> — Đóng băng đồng hồ ~5 giây: dùng <code>POST /api/game/inventory/use</code> + đếm
              ngược phía client.
            </li>
            <li>
              <strong>Double Points</strong> — Bấm ×2 rồi chọn đáp án: gửi <code>powerUpUsed: double-points</code> khi submit;
              server chỉ <strong>trừ túi đồ khi trả lời đúng</strong>. Điểm phiên theo thang 0–100 (≈ 100 ÷ số câu mỗi vòng;
              câu có ×2 nhân đôi phần điểm đó, tổng chặn 100).
            </li>
            <li>
              <strong>Skip</strong> — Bỏ qua câu, không mất mạng: <code>powerUpUsed: skip</code> + xử lý backend không trừ
              heart khi sai.
            </li>
            <li>
              <strong>Heart</strong> — Hồi 1 mạng: <code>POST /api/game/inventory/use</code> với slug <code>heart</code>.
            </li>
          </ul>
          <p className="play-guide__note">
            Nhận vật phẩm: đăng nhập hàng ngày, daily challenge, thắng PvP, mua xu, gói Premium — cần bổ sung job/store.
            Khi <strong>tổng số lượng trong túi = 0</strong>, backend tự cấp gói mở đầu lúc <code>POST /session/start</code>.
            Script tay: <code>doc/sql/seed_powerup_starter_inventory.sql</code>. Seed đủ game + câu hỏi:{' '}
            <code>doc/sql/seed_games_playable_fix_v1.sql</code>.
          </p>
        </section>

        <section className="play-guide__section">
          <h2>6.3 — Thành tích</h2>
          <p>
            Hiragana/Katakana Master, Combo King, Speed Demon, Daily Dedication… được seed trong{' '}
            <code>patch_achievements_leaderboard_v1.sql</code> và một phần tự động trong{' '}
            <code>GameService.PostGame.cs</code> (phiên game kết thúc). Kanji Novice/Hunter, PvP Champion, Perfect Score cần
            nối thêm học Kanji / PvP / bài kiểm tra.
          </p>
        </section>

        <section className="play-guide__section">
          <h2>6.4 — Bảng xếp hạng</h2>
          <ul className="play-guide__list">
            <li>Tuần / tháng toàn hệ thống — <code>period</code> weekly | monthly, không lọc game.</li>
            <li>Theo game — tham số <code>gameSlug</code>.</li>
            <li>Theo cấp độ — <code>levelId</code> (id bảng <code>levels</code>).</li>
            <li>Độ chính xác / tốc độ — <code>sortBy=accuracy|speed</code>.</li>
            <li>Bạn bè — <code>friendsOnly=true</code> (cần đăng nhập + bảng <code>friendships</code>).</li>
          </ul>
          <p className="play-guide__note">
            Xem trang <Link to={`${ROUTES.PLAY}/leaderboard`}>Bảng xếp hạng</Link>.
          </p>
        </section>

        <section className="play-guide__section">
          <h2>6.5 — Phần thưởng (roadmap)</h2>
          <ul className="play-guide__list">
            <li>EXP — lên cấp tài khoản (đã cộng khi kết thúc phiên + thành tích).</li>
            <li>Xu — đổi power-up (cột <code>xu</code> user + giá trong <code>power_ups</code>).</li>
            <li>
              Huy hiệu / danh hiệu / sticker chat / Premium / khung avatar — cần module profile &amp; shop; hiện lưu
              thành tích trong <code>user_achievements</code>.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
