/**
 * Hằng số API (base URL lấy từ env trong config/env.js)
 */
export const API_ENDPOINTS = {
  AUTH: {
    // ASP.NET Core backend: [Route("api/[controller]")] => /api/Auth
    LOGIN: '/api/Auth/login',
    REGISTER: '/api/Auth/register',
  },
  USER: {
    // /api/Auth/users và /api/Auth/users/{id}
    USERS: '/api/Auth/users',
  },
};
