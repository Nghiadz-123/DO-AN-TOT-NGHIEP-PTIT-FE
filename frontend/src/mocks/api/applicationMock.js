import { APPLICATION_STATUS, APPLICATION_TRANSITIONS } from '@/utils/constants'
import { normalize } from '@/utils/text'
import { screenApplication } from '../ai'
import {
  currentUser,
  delay,
  findOr404,
  genId,
  getDb,
  httpError,
  paginate,
  requireRecruiter,
  requireRole,
  saveDb,
} from '../db'
import { effectiveStatus, jobView } from './jobMock'

// View-model của một hồ sơ (cùng cấu trúc với adapters.toApplication khi gọi API thật)
export function expandApplication(app) {
  const db = getDb()
  const job = db.jobs.find((j) => j.id === app.jobId)
  const user = db.users.find((u) => u.id === app.candidateId)
  const cv = db.cvs.find((c) => c.id === app.cvId)
  return {
    ...app,
    job: job && jobView(job),
    candidate: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      headline: cv?.parsed?.title ?? user.title,
      yearsOfExperience: cv?.parsed?.yearsOfExperience,
      level: null,
      location: user.location,
      summary: cv?.parsed?.summary ?? user.about ?? '',
    },
    cv: cv && { ...cv, title: cv.fileName, mimeType: 'application/pdf' },
    allowedTransitions: APPLICATION_TRANSITIONS[app.status] ?? [],
  }
}

function ownApplication(id) {
  const { company } = requireRecruiter()
  const db = getDb()
  const app = findOr404(db.applications, id, 'Hồ sơ ứng tuyển')
  if (db.jobs.find((j) => j.id === app.jobId)?.companyId !== company.id) {
    throw httpError(404, 'Hồ sơ ứng tuyển không tồn tại.')
  }
  return app
}

function screen(app) {
  const db = getDb()
  const job = db.jobs.find((j) => j.id === app.jobId)
  const cv = db.cvs.find((c) => c.id === app.cvId)
  app.aiReview = screenApplication(cv.parsed, job, app.coverLetter)
}

const applicationMock = {
  // ---------------------------------------------------------------- ứng viên
  async apply({ jobId, cvId, coverLetter = '' }) {
    await delay()
    const user = requireRole('candidate')
    const db = getDb()
    const job = findOr404(db.jobs, jobId, 'Tin tuyển dụng')
    const cv = findOr404(db.cvs, cvId, 'CV')
    if (effectiveStatus(job) !== 'published') throw httpError(400, 'Tin tuyển dụng không còn nhận hồ sơ.')
    if (cv.candidateId !== user.id) throw httpError(403, 'Bạn không có quyền với CV này.')
    if (db.applications.some((a) => a.jobId === jobId && a.candidateId === user.id)) {
      throw httpError(400, 'Bạn đã ứng tuyển công việc này.')
    }
    const now = new Date().toISOString()
    const app = {
      id: genId('app'),
      jobId,
      candidateId: user.id,
      cvId,
      coverLetter,
      status: 'applied',
      appliedAt: now,
      statusChangedAt: now,
      rating: null,
      rejectionReason: '',
      history: [{ id: genId('h'), fromStatus: null, toStatus: 'applied', note: '', changedBy: user.fullName, createdAt: now }],
      aiReview: null,
    }
    db.applications.push(app)
    saveDb()
    return expandApplication(app)
  },

  async getMine() {
    await delay()
    const user = requireRole('candidate')
    return getDb()
      .applications.filter((a) => a.candidateId === user.id)
      .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
      .map(expandApplication)
  },

  // ---------------------------------------------------------------- nhà tuyển dụng
  async list({ jobId = '', status = '', keyword = '', ordering = '', page = 1, pageSize = 20 } = {}) {
    await delay()
    const { company } = requireRecruiter()
    const db = getDb()
    const jobIds = new Set(db.jobs.filter((j) => j.companyId === company.id).map((j) => j.id))
    const statuses = [].concat(status).filter(Boolean)
    const kw = normalize(keyword)
    const list = db.applications
      .filter((a) => jobIds.has(a.jobId) && (!jobId || a.jobId === jobId))
      .filter((a) => !statuses.length || statuses.includes(a.status))
      .map(expandApplication)
      .filter((a) => !kw || normalize(`${a.candidate.fullName} ${a.candidate.email}`).includes(kw))
      .sort((a, b) => (ordering === 'applied_at' ? 1 : -1) * (new Date(a.appliedAt) - new Date(b.appliedAt)))
    return paginate(list, { page, pageSize })
  },

  async getById(id) {
    await delay()
    const user = currentUser()
    if (user.role === 'employer') return expandApplication(ownApplication(id))
    const app = findOr404(getDb().applications, id, 'Hồ sơ ứng tuyển')
    if (app.candidateId !== user.id) throw httpError(403, 'Bạn không có quyền xem hồ sơ này.')
    return expandApplication(app)
  },

  async updateStatus(id, status, { note = '', rejectionReason = '' } = {}) {
    await delay(300)
    const app = ownApplication(id)
    if (!(APPLICATION_TRANSITIONS[app.status] ?? []).includes(status)) {
      const from = APPLICATION_STATUS[app.status]?.label
      throw httpError(409, `Không thể chuyển hồ sơ từ "${from}" sang "${APPLICATION_STATUS[status]?.label ?? status}".`)
    }
    const now = new Date().toISOString()
    app.history = [
      ...(app.history ?? []),
      { id: genId('h'), fromStatus: app.status, toStatus: status, note: note.trim(), changedBy: currentUser().fullName, createdAt: now },
    ]
    if (status === 'rejected') app.rejectionReason = rejectionReason.trim()
    else if (app.status === 'rejected') app.rejectionReason = ''
    app.status = status
    app.statusChangedAt = now
    saveDb()
    return expandApplication(app)
  },

  async rate(id, rating) {
    await delay(200)
    const app = ownApplication(id)
    app.rating = rating
    saveDb()
    return expandApplication(app)
  },

  // Chế độ mock không có file CV thật: trả về bản tóm tắt dạng text
  async downloadCv(id) {
    await delay(300)
    const app = expandApplication(ownApplication(id))
    const parsed = app.cv?.parsed ?? {}
    const content = [
      `${parsed.fullName ?? app.candidate.fullName} - ${parsed.title ?? ''}`,
      '(Bản CV mô phỏng - chế độ mock không có file thật)',
      '',
      parsed.summary ?? '',
      '',
      `Kỹ năng: ${(parsed.skills ?? []).join(', ')}`,
    ].join('\n')
    return { blob: new Blob([content], { type: 'text/plain;charset=utf-8' }), fileName: app.cv?.fileName ?? 'cv.txt' }
  },

  // ---------------------------------------------------------------- AI sàng lọc (mô phỏng)
  async screenByJob(jobId) {
    await delay(1800)
    const { company } = requireRecruiter()
    const job = findOr404(getDb().jobs, jobId, 'Tin tuyển dụng')
    if (job.companyId !== company.id) throw httpError(404, 'Tin tuyển dụng không tồn tại.')
    const apps = getDb().applications.filter((a) => a.jobId === jobId)
    apps.forEach(screen)
    saveDb()
    return apps.map(expandApplication)
  },

  async screen(id) {
    await delay(1200)
    const app = ownApplication(id)
    screen(app)
    saveDb()
    return expandApplication(app)
  },
}

export default applicationMock
