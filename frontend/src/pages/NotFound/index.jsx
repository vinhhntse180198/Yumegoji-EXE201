import { Link } from 'react-router-dom';
import { ROUTES } from '../../data/routes';

export default function NotFound() {
  return (
    <div className="page page-not-found">
      <h1>404</h1>
      <p>Trang không tồn tại.</p>
      <Link to={ROUTES.HOME}>Về trang chủ</Link>
    </div>
  );
}
