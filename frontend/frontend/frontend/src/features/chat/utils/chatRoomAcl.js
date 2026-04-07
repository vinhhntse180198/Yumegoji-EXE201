/** Quyền xóa nhóm — khớp backend DeleteRoomAsync (nhóm): admin hoặc người tạo (CreatedBy). */

export function normalizeUserId(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Gộp bản ghi "phòng của tôi" với bản public khi cần (trang khám phá). */
export function mergeJoinedForAcl(publicRow, myRoomRow) {
  if (!myRoomRow) return null;
  return {
    ...myRoomRow,
    type: myRoomRow.type ?? myRoomRow.Type ?? publicRow?.type ?? publicRow?.Type,
    Type: myRoomRow.Type ?? myRoomRow.type ?? publicRow?.Type ?? publicRow?.type,
    myRole: myRoomRow.myRole ?? myRoomRow.MyRole ?? publicRow?.myRole ?? publicRow?.MyRole,
    MyRole: myRoomRow.MyRole ?? myRoomRow.myRole ?? publicRow?.MyRole ?? publicRow?.myRole,
    createdBy: myRoomRow.createdBy ?? myRoomRow.CreatedBy ?? publicRow?.createdBy ?? publicRow?.CreatedBy,
    CreatedBy: myRoomRow.CreatedBy ?? myRoomRow.createdBy ?? publicRow?.CreatedBy ?? publicRow?.createdBy,
  };
}

/**
 * @param {object | null} joinedRoom — DTO phòng (type group, myRole, createdBy)
 * @param {number | string | null} myId
 */
export function canDeleteGroupFromJoined(joinedRoom, myId) {
  if (!joinedRoom) return false;
  const type = String(joinedRoom.type ?? joinedRoom.Type ?? '').toLowerCase();
  if (type !== 'group') return false;
  const role = String(joinedRoom.myRole ?? joinedRoom.MyRole ?? '').toLowerCase();
  const createdBy = normalizeUserId(joinedRoom.createdBy ?? joinedRoom.CreatedBy);
  const mid = normalizeUserId(myId);
  if (role === 'admin' || role === 'owner') return true;
  if (createdBy != null && mid != null && createdBy === mid) return true;
  return false;
}
