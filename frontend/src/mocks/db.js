import { getToken } from '@/utils/storage'
import { seed } from './seed'

const STORAGE_KEY = 'ats_mock_db_v2'
let db = null

export function getDb() {
  if (db) return db
  try {
    db = JSON.parse(localStorage.getItem(STORAGE_KEY))
  } catch {
    db = null
  }
  if (!db) {
    db = structuredClone(seed)
    saveDb()
  }
  return db
}

export function saveDb() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // localStorage không khả dụng: dữ liệu chỉ tồn tại trong phiên hiện tại
  }
}

export function resetDb() {
  db = structuredClone(seed)
  saveDb()
}

export const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms))

export const genId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// Tạo lỗi có cấu trúc giống lỗi axios để UI xử lý thống nhất
export function httpError(status, detail) {
  const error = new Error(detail)
  error.response = { status, data: { detail } }
  return error
}

export function publicUser(user) {
  if (!user) return null
  const copy = { ...user }
  delete copy.password
  return copy
}

export function currentUser() {
  const id = getToken()?.replace('mock-token-', '')
  const user = getDb().users.find((u) => u.id === id)
  if (!user) throw httpError(401, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.')
  return user
}

export function requireRole(role) {
  const user = currentUser()
  if (user.role !== role) throw httpError(403, 'Bạn không có quyền thực hiện thao tác này.')
  return user
}

export function findOr404(list, id, name = 'Dữ liệu') {
  const item = list.find((x) => x.id === id)
  if (!item) throw httpError(404, `${name} không tồn tại.`)
  return item
}
