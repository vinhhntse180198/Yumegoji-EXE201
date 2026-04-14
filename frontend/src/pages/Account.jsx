import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import http, { ENV } from '../api/client';
import { authService } from '../services/authService';
import { PremiumBadge } from '../components/profile/PremiumBadge';
import { userIsPremium } from '../utils/userPremium';
import { fetchMyProgressSummary } from '../services/learningProgressService';
import { socialService } from '../services/socialService';

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj != null && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function accountLevelTitle(code) {
  const c = String(code || 'N5').toUpperCase();
  const map = {
    N5: 'N5 Sơ cấp',
    N4: 'N4 Trung cấp',
    N3: 'N3 Trung cao',
    N2: 'N2 Cao cấp',
    N1: 'N1 Thành thạo',
  };
  return map[c] || `${c} — Học viên`;
}

function buildImageUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const origin = ENV.API_URL || '';
  return `${origin}${path}`;
}

export default function AccountPage() {
  const { user, setUser } = useAuth();
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl ? buildImageUrl(user.avatarUrl) : '');
  const [avatarFileError, setAvatarFileError] = useState('');

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postError, setPostError] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postImageFile, setPostImageFile] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState('');
  const [creatingPost, setCreatingPost] = useState(false);
  const [postReactions, setPostReactions] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [coverPreview, setCoverPreview] = useState('');
  const [progressSummary, setProgressSummary] = useState(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [friendsCount, setFriendsCount] = useState(null);
  const [coverFileError, setCoverFileError] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const quickEmojis = ['👍', '❤️', '😂', '😍', '😮', '😢', '😡'];

  const displayName = useMemo(
    () => user?.displayName || user?.username || user?.name || user?.email?.split('@')[0] || 'Học viên',
    [user]
  );

  const username = user?.username || user?.email || '';
  const email = user?.email || '';
  let levelCode = String(user?.levelCode || user?.level || '').toUpperCase() || '';
  const rawLevelId = user?.levelId ?? user?.LevelId ?? null;
  if (!levelCode && rawLevelId != null) {
    const idNum = Number(rawLevelId);
    if (idNum === 1) levelCode = 'N5';
    else if (idNum === 2) levelCode = 'N4';
    else if (idNum === 3) levelCode = 'N3';
  }
  levelCode = levelCode || 'N5';
  const avatarInitial = (displayName || 'U').trim().slice(0, 2).toUpperCase();
  const isPremium = useMemo(() => userIsPremium(user), [user]);
  const levelTitle = accountLevelTitle(levelCode);

  const levelCompletionPct = useMemo(() => {
    const byLevel = progressSummary?.byLevel ?? progressSummary?.ByLevel ?? [];
    const row = byLevel.find(
      (r) => String(pick(r, 'levelCode', 'LevelCode') || '').toUpperCase() === levelCode
    );
    return Math.min(100, Math.round(Number(pick(row, 'completionPercent', 'CompletionPercent')) || 0));
  }, [progressSummary, levelCode]);

  useEffect(() => {
    const url = user?.avatarUrl ? buildImageUrl(user.avatarUrl) : '';
    setAvatarPreview(url);
    setAvatarFileError('');
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function fetchProfile() {
      try {
        const profile = await authService.getMyProfile();
        if (!profile || cancelled) return;
        const prem = profile.isPremium ?? profile.IsPremium;
        const coverPath = profile.coverUrl ?? profile.CoverUrl;
        setCoverPreview(coverPath ? buildImageUrl(coverPath) : '');
        if (profile.avatarUrl) {
          setAvatarPreview(buildImageUrl(profile.avatarUrl));
        }

        if (user && (profile.avatarUrl || prem !== undefined)) {
          const updatedUser = {
            ...user,
            ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
            ...(prem !== undefined ? { isPremium: !!prem, IsPremium: !!prem } : {}),
          };
          setUser(updatedUser);
          authService.setStoredUser(updatedUser);
        }
      } catch {
        /* im lặng */
      }
    }
    void fetchProfile();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user?.id == null && user?.userId == null) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setProgressLoading(true);
        const data = await fetchMyProgressSummary();
        if (!cancelled) setProgressSummary(data ?? {});
      } catch {
        if (!cancelled) setProgressSummary(null);
      } finally {
        if (!cancelled) setProgressLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await socialService.getFriends();
        if (!cancelled) setFriendsCount(Array.isArray(list) ? list.length : 0);
      } catch {
        if (!cancelled) setFriendsCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarFileError('Vui lòng chọn file hình ảnh.');
      return;
    }
    try {
      setAvatarFileError('');
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await http.post('/api/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const relativeUrl = uploadRes.data?.url || '';
      const fullUrl = buildImageUrl(relativeUrl);
      setAvatarPreview(fullUrl);

      if (user) {
        try {
          await authService.updateMyProfile({ avatarUrl: relativeUrl });
        } catch {
          /* giữ preview */
        }

        const updatedUser = { ...user, avatarUrl: relativeUrl };
        setUser(updatedUser);
        authService.setStoredUser(updatedUser);
      }
    } catch {
      setAvatarFileError('Không upload được avatar. Vui lòng thử lại.');
    }
  };

  const handleCoverFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setCoverFileError('Chỉ chọn file ảnh (JPG, PNG, WebP…).');
      return;
    }
    try {
      setCoverFileError('');
      setCoverUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await http.post('/api/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const relativeUrl = uploadRes.data?.url || '';
      if (!relativeUrl) throw new Error('no url');
      await authService.updateMyProfile({ coverUrl: relativeUrl });
      setCoverPreview(buildImageUrl(relativeUrl));
    } catch {
      setCoverFileError('Không tải được ảnh bìa. Thử ảnh nhỏ hơn hoặc định dạng khác.');
    } finally {
      setCoverUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveCover = async () => {
    if (!coverPreview) return;
    if (!window.confirm('Bỏ ảnh bìa và dùng nền gradient mặc định?')) return;
    try {
      setCoverFileError('');
      setCoverUploading(true);
      await authService.updateMyProfile({ coverUrl: '' });
      setCoverPreview('');
    } catch {
      setCoverFileError('Không xóa được ảnh bìa. Thử lại sau.');
    } finally {
      setCoverUploading(false);
    }
  };

  const loadMyPosts = async () => {
    try {
      setLoadingPosts(true);
      setPostError('');
      const res = await http.get('/api/social/posts', { params: { limit: 50 } });
      const all = Array.isArray(res.data) ? res.data : [];
      const myId = user?.id ?? user?.Id;
      const mine = all.filter((p) => (p.author?.id ?? p.Author?.Id) === myId);
      setPosts(mine);

      const commentsEntries = await Promise.all(
        mine.map(async (p) => {
          const id = p.id ?? p.Id;
          try {
            const commentsRes = await http.get(`/api/social/posts/${id}/comments`, { params: { limit: 50 } });
            const list = Array.isArray(commentsRes.data) ? commentsRes.data : [];
            return [id, list];
          } catch {
            return [id, []];
          }
        })
      );

      const commentsMap = {};
      for (const [pid, list] of commentsEntries) {
        commentsMap[pid] = list;
      }
      setCommentsByPost(commentsMap);
    } catch {
      setPostError('Không tải được bài đăng. Vui lòng thử lại.');
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    void loadMyPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePostImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPostImageFile(null);
      setPostImagePreview('');
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh cho bài đăng.');
      return;
    }
    setPostImageFile(file);
    setPostImagePreview(URL.createObjectURL(file));
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postContent && !postImageFile) return;
    try {
      setCreatingPost(true);
      setPostError('');

      let imageUrl = null;
      if (postImageFile) {
        const formData = new FormData();
        formData.append('file', postImageFile);
        const uploadRes = await http.post('/api/uploads/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        imageUrl = uploadRes.data?.url || null;
      }

      const res = await http.post('/api/social/posts', {
        content: postContent || null,
        imageUrl,
      });
      const dto = res.data;
      setPosts((old) => [dto, ...old]);
      setPostContent('');
      setPostImageFile(null);
      setPostImagePreview('');
    } catch {
      setPostError('Không đăng được bài. Vui lòng thử lại.');
    } finally {
      setCreatingPost(false);
    }
  };

  const handleAddEmoji = (emoji) => {
    setPostContent((old) => `${old || ''}${emoji}`);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Xóa bài đăng này?')) return;
    try {
      await http.delete(`/api/social/posts/${postId}`);
      setPosts((old) => old.filter((p) => (p.id ?? p.Id) !== postId));
    } catch {
      alert('Không xóa được bài đăng. Vui lòng thử lại.');
    }
  };

  const handleToggleReactionOnServer = async (postId, emoji) => {
    setPostReactions((old) => {
      const current = old[postId];
      const next = current === emoji ? null : emoji;
      return { ...old, [postId]: next };
    });

    try {
      const res = await http.post(`/api/social/posts/${postId}/reactions/toggle`, { emoji });
      const summary = res.data;
      setPosts((old) =>
        old.map((p) =>
          (p.id ?? p.Id) === postId
            ? {
                ...p,
                reactions: summary,
              }
            : p
        )
      );
    } catch {
      /* im lặng */
    }
  };

  const handleCommentInputChange = (postId, value) => {
    setCommentInputs((old) => ({ ...old, [postId]: value }));
  };

  const handleSubmitComment = async (postId) => {
    const content = (commentInputs[postId] || '').trim();
    if (!content) return;
    try {
      const res = await http.post(`/api/social/posts/${postId}/comments`, { content });
      const dto = res.data;
      setCommentsByPost((old) => ({
        ...old,
        [postId]: [...(old[postId] || []), dto],
      }));
      setCommentInputs((old) => ({ ...old, [postId]: '' }));
    } catch {
      /* toast sau */
    }
  };

  return (
    <div className="yume-dashboard yume-account-page">
      <header className={`yume-account-profile${isPremium ? ' yume-account-profile--premium' : ''}`}>
        <div className="yume-account-profile__cover" role="region" aria-label="Ảnh bìa hồ sơ">
          {coverPreview ? (
            <img src={coverPreview} alt="" className="yume-account-profile__cover-img" />
          ) : null}
          <div className="yume-account-profile__cover-toolbar">
            <label
              htmlFor="cover-file"
              className={`yume-account-profile__cover-btn${coverUploading ? ' yume-account-profile__cover-btn--disabled' : ''}`}
            >
              {coverUploading ? 'Đang tải…' : coverPreview ? 'Đổi ảnh bìa' : 'Thêm ảnh bìa'}
            </label>
            <input
              id="cover-file"
              type="file"
              accept="image/*"
              className="yume-account-profile__visually-hidden"
              disabled={coverUploading}
              onChange={(ev) => void handleCoverFileChange(ev)}
            />
            {coverPreview ? (
              <button
                type="button"
                className="yume-account-profile__cover-btn yume-account-profile__cover-btn--ghost"
                disabled={coverUploading}
                onClick={() => void handleRemoveCover()}
              >
                Nền mặc định
              </button>
            ) : null}
          </div>
          {coverFileError ? <p className="yume-account-profile__cover-err">{coverFileError}</p> : null}
        </div>

        <div className="yume-account-profile__body">
          <div className="yume-account-profile__head">
            <div className="yume-account-profile__avatar-col">
              <div
                className={`yume-account-profile__avatar-ring${isPremium ? ' yume-account-profile__avatar-ring--premium' : ''}`}
              >
                <div className="yume-account-profile__avatar-face">
                  {avatarPreview ? <img src={avatarPreview} alt="" /> : avatarInitial}
                </div>
              </div>
              <label htmlFor="avatar-file" className="yume-account-profile__avatar-btn">
                Đổi ảnh đại diện
              </label>
              <input
                id="avatar-file"
                type="file"
                accept="image/*"
                className="yume-account-profile__visually-hidden"
                onChange={handleAvatarFileChange}
              />
              {avatarFileError ? <p className="yume-account-profile__avatar-err">{avatarFileError}</p> : null}
            </div>

            <div className="yume-account-profile__meta">
              <div className="yume-account-profile__name-row">
                <h1 className="yume-account-profile__name">{displayName}</h1>
                {isPremium ? <PremiumBadge variant="large" /> : null}
              </div>
              <p className="yume-account-profile__tagline">
                {levelTitle}
                {isPremium ? (
                  <>
                    {' '}
                    · <span className="yume-account-profile__tag-premium">Gói Premium</span>
                  </>
                ) : null}
              </p>

              <details className="yume-account-profile__details">
                <summary>Thông tin tài khoản</summary>
                <dl className="yume-account-profile__dl">
                  <div>
                    <dt>Email</dt>
                    <dd>{email || '—'}</dd>
                  </div>
                  <div>
                    <dt>Tên đăng nhập</dt>
                    <dd>{username || '—'}</dd>
                  </div>
                  <div>
                    <dt>Cấp độ JLPT</dt>
                    <dd>{levelCode}</dd>
                  </div>
                </dl>
              </details>
            </div>
          </div>

          <div className="yume-account-profile__stats">
            <article className="yume-account-stat-card">
              <div className="yume-account-stat-card__label">Cấp độ</div>
              <div className="yume-account-stat-card__value">{levelCode}</div>
              <div
                className="yume-account-stat-card__bar"
                role="progressbar"
                aria-valuenow={levelCompletionPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="yume-account-stat-card__bar-fill" style={{ width: `${levelCompletionPct}%` }} />
              </div>
              <div className="yume-account-stat-card__hint">
                {progressLoading ? 'Đang tải tiến độ…' : `${levelCompletionPct}% hoàn thành (theo bài đã xuất bản)`}
              </div>
            </article>
            <article className="yume-account-stat-card">
              <div className="yume-account-stat-card__label">Bài viết</div>
              <div className="yume-account-stat-card__value">{loadingPosts ? '…' : posts.length}</div>
              <div className="yume-account-stat-card__hint">Bài đăng của bạn</div>
            </article>
            <article className="yume-account-stat-card">
              <div className="yume-account-stat-card__label">Bạn bè</div>
              <div className="yume-account-stat-card__value">{friendsCount === null ? '…' : friendsCount}</div>
              <div className="yume-account-stat-card__hint">Danh sách kết bạn</div>
            </article>
          </div>
        </div>
      </header>

      <section className="yume-account-composer yume-panel" aria-label="Đăng bài mới">
        <form onSubmit={handleCreatePost} className="yume-account-composer__form">
          <div className="yume-account-composer__row">
            <div className="yume-account-composer__mini-avatar" aria-hidden>
              {avatarPreview ? <img src={avatarPreview} alt="" /> : avatarInitial}
            </div>
            <textarea
              className="yume-account-composer__textarea"
              rows={3}
              placeholder="Bạn đang nghĩ gì?"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
            />
          </div>
          <div className="yume-account-composer__toolbar">
            <div className="yume-account-composer__emojis">
              {quickEmojis.map((em) => (
                <button key={em} type="button" className="yume-account-composer__emoji" onClick={() => handleAddEmoji(em)}>
                  {em}
                </button>
              ))}
            </div>
            <div className="yume-account-composer__actions">
              <label htmlFor="post-image-input" className="yume-account-composer__link">
                Ảnh
              </label>
              <input
                id="post-image-input"
                type="file"
                accept="image/*"
                className="yume-account-profile__visually-hidden"
                onChange={handlePostImageChange}
              />
              <button type="submit" className="yume-account-composer__submit" disabled={creatingPost}>
                {creatingPost ? 'Đang đăng…' : 'Đăng bài'}
              </button>
            </div>
          </div>
          {postImagePreview ? (
            <img src={postImagePreview} alt="" className="yume-account-composer__preview" />
          ) : null}
        </form>
      </section>

      {postError ? (
        <p className="yume-account-feed__error" role="alert">
          {postError}
        </p>
      ) : null}

      <section className="yume-account-feed" aria-labelledby="yume-account-feed-title">
        <h2 id="yume-account-feed-title" className="yume-account-feed__title">
          Dòng thời gian
        </h2>
        <div className="yume-account__posts-scroll yume-account__posts-scroll--feed">
          {loadingPosts ? (
            <p className="yume-account-feed__empty">Đang tải bài đăng…</p>
          ) : posts.length === 0 ? (
            <p className="yume-account-feed__empty">Chưa có bài đăng. Hãy viết dòng đầu tiên!</p>
          ) : (
            <ul className="yume-account-post-list">
              {posts.map((p) => {
                const id = p.id ?? p.Id;
                const createdAt = p.createdAt ?? p.CreatedAt;
                const content = p.content ?? p.Content;
                const imageUrl = p.imageUrl ?? p.ImageUrl;
                const activeReaction = postReactions[id];
                const reactionEmojis = ['👍', '❤️', '😆', '😮', '😢', '😡'];
                const reactionsSummary = p.reactions ?? p.Reactions ?? null;
                const reactionCounts = reactionsSummary?.counts ?? reactionsSummary?.Counts ?? {};
                const comments = commentsByPost[id] || [];
                return (
                  <li key={id} className="yume-account-post-card">
                    <div className="yume-account-post-card__head">
                      <div className="yume-account-post-card__author">
                        <div className="yume-account-post-card__author-av" aria-hidden>
                          {avatarPreview ? <img src={avatarPreview} alt="" /> : avatarInitial}
                        </div>
                        <div>
                          <div className="yume-account-post-card__author-name">{displayName}</div>
                          <div className="yume-account-post-card__time">
                            {createdAt ? new Date(createdAt).toLocaleString('vi-VN') : ''}
                          </div>
                        </div>
                      </div>
                      <button type="button" className="yume-account-post-card__delete" onClick={() => handleDeletePost(id)}>
                        Xóa
                      </button>
                    </div>
                    {content ? <p className="yume-account-post-card__text">{content}</p> : null}
                    {imageUrl ? (
                      <img
                        className="yume-account-post-card__media"
                        src={buildImageUrl(imageUrl)}
                        alt=""
                      />
                    ) : null}
                    <div className="yume-account__post-reactions">
                      <button
                        type="button"
                        onClick={() => void handleToggleReactionOnServer(id, activeReaction || '👍')}
                        className={
                          activeReaction
                            ? 'yume-account__post-reaction-main yume-account__post-reaction-main--active'
                            : 'yume-account__post-reaction-main'
                        }
                      >
                        <span className="yume-account__post-reaction-main-emoji">{activeReaction || '👍'}</span>
                        <span className="yume-account__post-reaction-main-label">Thích</span>
                      </button>
                      <div className="yume-account__post-reaction-picker">
                        {reactionEmojis.map((em) => {
                          const count = reactionCounts?.[em] ?? 0;
                          const isActive = activeReaction === em;
                          return (
                            <button
                              key={em}
                              type="button"
                              onClick={() => void handleToggleReactionOnServer(id, em)}
                              className={
                                isActive
                                  ? 'yume-account__post-reaction yume-account__post-reaction--active'
                                  : 'yume-account__post-reaction'
                              }
                            >
                              <span className="yume-account__post-reaction-emoji">{em}</span>
                              {count > 0 ? <span className="yume-account__post-reaction-count">{count}</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="yume-account__comments">
                      {comments.length > 0 ? (
                        <ul className="yume-account__comment-list">
                          {comments.map((c) => (
                            <li key={c.id ?? c.Id}>
                              <strong>{c.author?.displayName ?? c.author?.username ?? 'Bạn bè'}</strong>
                              <span>{c.content ?? c.Content}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="yume-account__comment-form">
                        <input
                          type="text"
                          placeholder="Viết bình luận…"
                          value={commentInputs[id] || ''}
                          onChange={(e) => handleCommentInputChange(id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              void handleSubmitComment(id);
                            }
                          }}
                        />
                        <button type="button" onClick={() => void handleSubmitComment(id)}>
                          Gửi
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
