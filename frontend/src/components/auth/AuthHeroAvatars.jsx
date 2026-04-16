import { AUTH_HERO_LEARNER_AVATAR_URLS } from '../../data/homepageContent';

/** Ba avatar học viên mẫu (đồng bộ footer) cho pill “Joined by 12,000+ learners”. */
export function AuthHeroAvatars() {
  return (
    <div className="auth-avatars">
      {AUTH_HERO_LEARNER_AVATAR_URLS.map((src) => (
        <span key={src} className="auth-avatar auth-avatar--photo">
          <img src={src} alt="" width={34} height={34} loading="lazy" decoding="async" />
        </span>
      ))}
    </div>
  );
}
