import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export default function Unauthorized() {
  return (
    <div className="page page-unauthorized">
      <h1>403</h1>
      <p>Bạn không có quyền truy cập trang này.</p>
      <Link to={ROUTES.HOME}>Về trang chủ</Link>
      <span> | </span>
      <Link to={ROUTES.LOGIN}>Đăng nhập</Link>
    </div>
  );
}
