// Lưu file CV thật (Blob) ở chế độ mock để xem / tải lại đúng file đã tải lên.
// localStorage không đủ dung lượng cho file 5MB nên dữ liệu CV (JSON, trong db.js) và file được lưu tách:
// file nằm trong IndexedDB, trình duyệt không hỗ trợ thì giữ trong bộ nhớ (mất khi tải lại trang).
const DB_NAME = 'ats_mock_files'
const STORE = 'cv_files'
const memory = new Map()
let dbPromise = null

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB không khả dụng'))
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }).catch((err) => {
    dbPromise = null
    throw err
  })
  return dbPromise
}

async function run(mode, action) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const request = action(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(request.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function putFile(id, file) {
  memory.set(id, file)
  try {
    await run('readwrite', (store) => store.put(file, id))
  } catch {
    // giữ bản trong bộ nhớ
  }
}

export async function getFile(id) {
  try {
    const blob = await run('readonly', (store) => store.get(id))
    if (blob) return blob
  } catch {
    // dùng bản trong bộ nhớ
  }
  return memory.get(id) ?? null
}

export async function deleteFile(id) {
  memory.delete(id)
  try {
    await run('readwrite', (store) => store.delete(id))
  } catch {
    // không có gì để xóa
  }
}
