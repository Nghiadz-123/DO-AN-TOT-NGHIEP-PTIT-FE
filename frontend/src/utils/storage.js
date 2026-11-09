import { REFRESH_TOKEN_KEY, TOKEN_KEY } from './constants'

// sessionStorage: mỗi tab giữ phiên đăng nhập riêng (test cùng lúc ứng viên và nhà tuyển dụng);
// mở tab mới hoặc mở lại trình duyệt thì phải đăng nhập lại
export const getToken = () => sessionStorage.getItem(TOKEN_KEY)
export const getRefreshToken = () => sessionStorage.getItem(REFRESH_TOKEN_KEY)

export function setTokens(access, refresh) {
  sessionStorage.setItem(TOKEN_KEY, access)
  if (refresh) sessionStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

export function clearTokens() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
}
