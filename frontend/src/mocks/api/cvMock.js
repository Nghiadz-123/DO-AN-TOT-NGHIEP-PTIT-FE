import { CV_MIME_TYPES } from '@/utils/constants'
import { fileExtension, fileTitle, validateCvFile } from '@/utils/file'
import { analyzeCV, matchCVToJob, parseCV } from '../ai'
import { LOCATIONS, locationName } from '../catalogData'
import { delay, findOr404, genId, getDb, httpError, requireRole, saveDb } from '../db'
import { deleteFile, getFile, putFile } from '../fileStore'

const levelFromYears = (years) => (years < 1 ? 'fresher' : years < 2 ? 'junior' : years < 4 ? 'middle' : 'senior')
const locationIdOf = (name) => LOCATIONS.find((l) => l.name === name)?.id ?? ''
const mimeOf = (file) => file.type || CV_MIME_TYPES[fileExtension(file.name)] || 'application/octet-stream'

// Thông tin khai báo mặc định suy ra từ nội dung CV (dùng cho dữ liệu mẫu và tải nhanh không qua form)
const fieldsFromParsed = (fileName, parsed) => ({
  title: fileTitle(fileName),
  desiredPosition: parsed.title ?? '',
  type: 'full_time',
  workMode: 'onsite',
  level: levelFromYears(parsed.yearsOfExperience ?? 0),
  locationId: locationIdOf(parsed.location),
  yearsOfExperience: parsed.yearsOfExperience ?? 0,
  educationLevel: parsed.education?.length ? 'bachelor' : '',
  salaryMin: null,
  salaryMax: null,
  isSalaryNegotiable: true,
  skills: parsed.skills ?? [],
  summary: parsed.summary ?? '',
})

// CV trong dữ liệu mẫu chỉ có phần AI bóc tách: bổ sung các trường khai báo (một lần)
function migrate(cv) {
  if (cv.title !== undefined) return cv
  Object.assign(cv, fieldsFromParsed(cv.fileName, cv.parsed ?? {}), {
    mimeType: CV_MIME_TYPES[fileExtension(cv.fileName)] ?? 'application/pdf',
    isDefault: false,
    updatedAt: cv.uploadedAt,
  })
  return cv
}

const byDefaultThenNewest = (a, b) => b.isDefault - a.isDefault || new Date(b.uploadedAt) - new Date(a.uploadedAt)

// CV của ứng viên; luôn đảm bảo có đúng một CV chính (mặc định là CV mới nhất)
function myCVs(user) {
  const list = getDb()
    .cvs.filter((c) => c.candidateId === user.id)
    .map(migrate)
  if (list.length && !list.some((c) => c.isDefault)) {
    list.reduce((newest, c) => (new Date(c.uploadedAt) > new Date(newest.uploadedAt) ? c : newest)).isDefault = true
    saveDb()
  }
  return list
}

function ownCV(id) {
  const user = requireRole('candidate')
  const cv = findOr404(getDb().cvs, id, 'CV')
  if (cv.candidateId !== user.id) throw httpError(403, 'Bạn không có quyền với CV này.')
  return migrate(cv)
}

// View-model (cùng cấu trúc với adapters.toCV khi gọi API thật)
function cvView(cv) {
  return {
    ...cv,
    location: locationName(cv.locationId),
    applicationCount: getDb().applications.filter((a) => a.cvId === cv.id).length,
  }
}

function validateForm(form, { file, creating }) {
  if (creating && !file) throw httpError(400, 'Vui lòng chọn file CV.')
  const fileError = file && validateCvFile(file)
  if (fileError) throw httpError(400, fileError)
  if (!form.title.trim()) throw httpError(400, 'Tên CV không được để trống.')
  if (!form.desiredPosition.trim()) throw httpError(400, 'Vị trí mong muốn không được để trống.')
  if (form.salaryMin !== '' && form.salaryMax !== '' && Number(form.salaryMin) > Number(form.salaryMax)) {
    throw httpError(400, 'Lương mong muốn tối đa phải lớn hơn hoặc bằng lương tối thiểu.')
  }
}

const fromForm = (form) => ({
  title: form.title.trim(),
  desiredPosition: form.desiredPosition.trim(),
  type: form.type,
  workMode: form.workMode,
  level: form.level,
  locationId: form.locationId ? Number(form.locationId) : '',
  yearsOfExperience: Number(form.yearsOfExperience) || 0,
  educationLevel: form.educationLevel,
  salaryMin: form.salaryMin === '' ? null : Number(form.salaryMin),
  salaryMax: form.salaryMax === '' ? null : Number(form.salaryMax),
  isSalaryNegotiable: form.isSalaryNegotiable,
  skills: form.skills,
  summary: form.summary.trim(),
})

// Thông tin ứng viên tự khai báo được ưu tiên hơn phần AI bóc tách khi so khớp việc làm
const syncParsed = (parsed, data) => ({
  ...parsed,
  title: data.desiredPosition || parsed.title,
  skills: data.skills.length ? data.skills : parsed.skills,
  yearsOfExperience: data.yearsOfExperience,
  summary: data.summary || parsed.summary,
  location: locationName(data.locationId) || parsed.location,
})

// Mô phỏng tiến trình tải file lên
async function simulateUpload(onProgress) {
  for (let percent = 0; percent <= 100; percent += 20) {
    onProgress?.(percent)
    await delay(150)
  }
}

function makeDefault(user, cv) {
  myCVs(user).forEach((c) => {
    c.isDefault = c.id === cv.id
  })
}

const cvMock = {
  async getMine() {
    await delay()
    const user = requireRole('candidate')
    return myCVs(user).sort(byDefaultThenNewest).map(cvView)
  },

  async getById(id) {
    await delay()
    return cvView(ownCV(id))
  },

  async create(form, { file, onProgress } = {}) {
    const user = requireRole('candidate')
    validateForm(form, { file, creating: true })
    await simulateUpload(onProgress)
    await delay(600) // mô phỏng thời gian bóc tách nội dung CV

    const data = fromForm(form)
    const now = new Date().toISOString()
    const isFirst = myCVs(user).length === 0
    const cv = {
      id: genId('cv'),
      candidateId: user.id,
      fileName: file.name,
      fileSize: file.size,
      mimeType: mimeOf(file),
      uploadedAt: now,
      updatedAt: now,
      ...data,
      isDefault: false,
      parsed: syncParsed(parseCV(file.name, { ...user, title: data.desiredPosition || user.title }), data),
      analysis: null,
    }
    getDb().cvs.push(cv)
    if (isFirst || form.isDefault) makeDefault(user, cv)
    await putFile(cv.id, file)
    saveDb()
    return cvView(cv)
  },

  async update(id, form, { file, onProgress } = {}) {
    const user = requireRole('candidate')
    const cv = ownCV(id)
    validateForm(form, { file, creating: false })
    if (file && getDb().applications.some((a) => a.cvId === id)) {
      throw httpError(409, 'CV đã được dùng để ứng tuyển nên không thể thay file. Hãy tải lên CV mới.')
    }
    if (file) await simulateUpload(onProgress)
    else await delay()

    const data = fromForm(form)
    Object.assign(cv, data, { updatedAt: new Date().toISOString() })
    if (file) {
      Object.assign(cv, { fileName: file.name, fileSize: file.size, mimeType: mimeOf(file), analysis: null })
      cv.parsed = parseCV(file.name, { ...user, title: data.desiredPosition || user.title })
      await putFile(cv.id, file)
    }
    cv.parsed = syncParsed(cv.parsed ?? {}, data)
    if (form.isDefault) makeDefault(user, cv) // bỏ chọn CV chính thì giữ nguyên: luôn cần một CV chính
    saveDb()
    return cvView(cv)
  },

  // Tải nhanh chỉ với file (trang AI chấm điểm): thông tin khai báo lấy từ nội dung bóc tách
  async upload(file) {
    const user = requireRole('candidate')
    const parsed = parseCV(file.name, user)
    const fields = fieldsFromParsed(file.name, parsed)
    return cvMock.create(
      { ...fields, salaryMin: '', salaryMax: '', locationId: fields.locationId || locationIdOf(user.location), isDefault: false },
      { file },
    )
  },

  async setDefault(id) {
    await delay(300)
    const user = requireRole('candidate')
    const cv = ownCV(id)
    makeDefault(user, cv)
    saveDb()
    return cvView(cv)
  },

  // File thật đã tải lên (IndexedDB); CV mẫu không có file thì trả bản tóm tắt dạng text
  async download(id) {
    await delay(300)
    const cv = ownCV(id)
    const blob = await getFile(id)
    if (blob) return { blob, fileName: cv.fileName }
    const content = [
      `${cv.parsed?.fullName ?? ''} - ${cv.desiredPosition}`,
      '(Bản CV mô phỏng - CV mẫu không có file thật)',
      '',
      cv.summary,
      '',
      `Kỹ năng: ${cv.skills.join(', ')}`,
    ].join('\n')
    return { blob: new Blob([content], { type: 'text/plain;charset=utf-8' }), fileName: `${cv.title}.txt` }
  },

  async analyze(id) {
    await delay(1500) // mô phỏng thời gian AI chấm điểm
    const cv = ownCV(id)
    cv.analysis = analyzeCV(cv.parsed)
    saveDb()
    return cvView(cv)
  },

  async matchJob(cvId, jobId) {
    await delay(500)
    const cv = ownCV(cvId)
    const job = findOr404(getDb().jobs, jobId, 'Tin tuyển dụng')
    return matchCVToJob(cv.parsed, job)
  },

  async remove(id) {
    await delay()
    const user = requireRole('candidate')
    ownCV(id)
    const db = getDb()
    if (db.applications.some((a) => a.cvId === id)) {
      throw httpError(400, 'CV này đang được dùng trong đơn ứng tuyển, không thể xóa.')
    }
    db.cvs = db.cvs.filter((c) => c.id !== id)
    myCVs(user) // xóa CV chính thì CV mới nhất còn lại trở thành CV chính
    await deleteFile(id)
    saveDb()
  },
}

export default cvMock
