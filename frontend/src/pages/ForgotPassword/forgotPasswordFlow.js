import { authService } from '../../services/authService';
import { isRequired, isEmail } from '../../utils/validators';

/**
 * @returns {Promise<{ ok: true, data: object } | { ok: false, error: string }>}
 */
export async function executeForgotPassword(email) {
  if (!isRequired(email)) {
    return { ok: false, error: 'Vui lòng nhập email.' };
  }
  if (!isEmail(email)) {
    return { ok: false, error: 'Email không hợp lệ.' };
  }
  try {
    const data = await authService.forgotPassword({ email });
    return { ok: true, data };
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Không gửi được yêu cầu.';
    return { ok: false, error: msg };
  }
}
