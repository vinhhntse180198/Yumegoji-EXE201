/** Admin / Moderator — không làm bài kiểm tra học viên. */
export function isStaffUser(user) {
  const r = String(user?.role ?? user?.Role ?? '').toLowerCase();
  return r === 'moderator' || r === 'admin';
}
