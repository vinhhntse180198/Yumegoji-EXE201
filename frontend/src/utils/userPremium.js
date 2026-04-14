/** Gói Premium — đồng bộ với backend (User.IsPremium) và trang Upgrade. */
export function userIsPremium(user) {
  if (!user || typeof user !== 'object') return false;
  return !!(user.isPremium ?? user.IsPremium);
}
