import { screenApplication } from '../ai'
import { currentUser, delay, findOr404, genId, getDb, httpError, publicUser, requireRole, saveDb } from '../db'

function expand(app) {
  const db = getDb()
  return {
    ...app,
    job: db.jobs.find((j) => j.id === app.jobId),
    candidate: publicUser(db.users.find((u) => u.id === app.candidateId)),
    cv: db.cvs.find((c) => c.id === app.cvId),
  }
}

function ownJob(jobId) {
  const user = requireRole('recruiter')
  const job = findOr404(getDb().jobs, jobId, 'Tin tuyển dụng')
  if (job.recruiterId !== user.id) throw httpError(403, 'Bạn không có quyền với tin tuyển dụng này.')
  return job
}

function screen(app) {
  const db = getDb()
  const job = db.jobs.find((j) => j.id === app.jobId)
  const cv = db.cvs.find((c) => c.id === app.cvId)
  app.aiReview = screenApplication(cv.parsed, job, app.coverLetter)
}

const applicationMock = {
  async apply({ jobId, cvId, coverLetter = '' }) {
    await delay()
    const user = requireRole('candidate')
    const db = getDb()
    const job = findOr404(db.jobs, jobId, 'Tin tuyển dụng')
    const cv = findOr404(db.cvs, cvId, 'CV')
    if (job.status !== 'open') throw httpError(400, 'Tin tuyển dụng đã đóng.')
    if (cv.candidateId !== user.id) throw httpError(403, 'Bạn không có quyền với CV này.')
    if (db.applications.some((a) => a.jobId === jobId && a.candidateId === user.id)) {
      throw httpError(400, 'Bạn đã ứng tuyển công việc này.')
    }
    const app = {
      id: genId('app'),
      jobId,
      candidateId: user.id,
      cvId,
      coverLetter,
      status: 'pending',
      appliedAt: new Date().toISOString(),
      aiReview: null,
    }
    db.applications.push(app)
    saveDb()
    return expand(app)
  },

  async getMine() {
    await delay()
    const user = requireRole('candidate')
    return getDb()
      .applications.filter((a) => a.candidateId === user.id)
      .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
      .map(expand)
  },

  async getByJob(jobId) {
    await delay()
    ownJob(jobId)
    return getDb()
      .applications.filter((a) => a.jobId === jobId)
      .map(expand)
  },

  async getById(id) {
    await delay()
    const user = currentUser()
    const app = findOr404(getDb().applications, id, 'Hồ sơ ứng tuyển')
    if (user.role === 'recruiter') ownJob(app.jobId)
    else if (app.candidateId !== user.id) throw httpError(403, 'Bạn không có quyền xem hồ sơ này.')
    return expand(app)
  },

  async updateStatus(id, status) {
    await delay(300)
    const app = findOr404(getDb().applications, id, 'Hồ sơ ứng tuyển')
    ownJob(app.jobId)
    app.status = status
    saveDb()
    return expand(app)
  },

  async screenByJob(jobId) {
    await delay(1800) // mô phỏng thời gian AI sàng lọc
    ownJob(jobId)
    const apps = getDb().applications.filter((a) => a.jobId === jobId)
    apps.forEach(screen)
    saveDb()
    return apps.map(expand)
  },

  async screen(id) {
    await delay(1200)
    const app = findOr404(getDb().applications, id, 'Hồ sơ ứng tuyển')
    ownJob(app.jobId)
    screen(app)
    saveDb()
    return expand(app)
  },
}

export default applicationMock
