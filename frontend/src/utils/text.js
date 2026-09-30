// Chuẩn hóa chuỗi để so khớp: bỏ dấu tiếng Việt, chữ thường, gọn khoảng trắng
export function normalize(value = '') {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
}

export function splitLines(value = '') {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}
