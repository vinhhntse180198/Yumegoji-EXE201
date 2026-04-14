import { learningProgressApi } from '../api/learningProgressApi';

export async function fetchMyProgressSummary() {
  const { data } = await learningProgressApi.getMyProgressSummary();
  return data ?? {};
}
