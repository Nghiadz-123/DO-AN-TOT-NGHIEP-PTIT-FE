import { normalize } from '@/utils/text'
import { matchCVToJob } from '../ai'
import { delay, findOr404, genId, getDb, httpError, publicUser, requireRole, saveDb } from '../db'

const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt)

function withCounts(job) {
  const apps = getDb().applications.filter((a) => a.jobId === job.id)
  return {
    ...job,
    applicantCount: apps.length,
    pendingCount: apps.filter((a) => a.status === 'pending').length,
  }
}

function ownJob(id) {
  const user = requireRole('recruiter')
  const job = findOr404(getDb().jobs, id, 'Tin tuyển dụng')
  if (job.recruiterId !== user.id) throw httpError(403, 'Bạn không có quyền với tin tuyển dụng này.')
  return job
}

const jobMock = {
  async getAll({ keyword = '', location = '', type = '', level = '' } = {}) {
    await delay()
    const kw = normalize(keyword)
    return getDb()
      .jobs.filter((j) => j.status === 'open')
      .filter((j) => !kw || normalize([j.title, j.company, ...j.skills].join(' ')).includes(kw))
      .filter((j) => !location || j.location === location)
      .filter((j) => !type || j.type === type)
      .filter((j) => !level || j.level === level)
      .sort(byNewest)
      .map(withCounts)
  },

  async getById(id) {
    await delay()
    return withCounts(findOr404(getDb().jobs, id, 'Tin tuyển dụng'))
  },

  async getMine() {
    await delay()
    const user = requireRole('recruiter')
    return getDb()
      .jobs.filter((j) => j.recruiterId === user.id)
      .sort(byNewest)
      .map(withCounts)
  },

  async create(data) {
    await delay()
    const user = requireRole('recruiter')
    const job = {
      status: 'open',
      ...data,
      id: genId('job'),
      recruiterId: user.id,
      company: user.companyName || user.fullName,
      createdAt: new Date().toISOString(),
    }
    getDb().jobs.push(job)
    saveDb()
    return job
  },

  async update(id, data) {
    await delay()
    const job = ownJob(id)
    Object.assign(job, data)
    saveDb()
    return withCounts(job)
  },

  async remove(id) {
    await delay()
    ownJob(id)
    const db = getDb()
    db.jobs = db.jobs.filter((j) => j.id !== id)
    db.applications = db.applications.filter((a) => a.jobId !== id)
    saveDb()
  },

  async getRecommended(cvId) {
    await delay(900)
    const user = requireRole('candidate')
    const db = getDb()
    const cv = findOr404(db.cvs, cvId, 'CV')
    if (cv.candidateId !== user.id) throw httpError(403, 'Bạn không có quyền với CV này.')
    return db.jobs
      .filter((j) => j.status === 'open')
      .map((job) => ({ job: withCounts(job), match: matchCVToJob(cv.parsed, job) }))
      .sort((a, b) => b.match.score - a.match.score)
  },

  async getRecruiterStats() {
    await delay()
    const user = requireRole('recruiter')
    const db = getDb()
    const jobs = db.jobs.filter((j) => j.recruiterId === user.id)
    const jobIds = new Set(jobs.map((j) => j.id))
    const apps = db.applications.filter((a) => jobIds.has(a.jobId))
    const screened = apps.filter((a) => a.aiReview)
    return {
      totalJobs: jobs.length,
      openJobs: jobs.filter((j) => j.status === 'open').length,
      totalApplicants: apps.length,
      pendingApplicants: apps.filter((a) => a.status === 'pending').length,
      shortlisted: apps.filter((a) => ['shortlisted', 'interview', 'hired'].includes(a.status)).length,
      avgScore: screened.length
        ? Math.round(screened.reduce((sum, a) => sum + a.aiReview.score, 0) / screened.length)
        : null,
      recentApplications: [...apps]
        .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
        .slice(0, 6)
        .map((a) => ({
          ...a,
          job: jobs.find((j) => j.id === a.jobId),
          candidate: publicUser(db.users.find((u) => u.id === a.candidateId)),
        })),
    }
  },
}

export default jobMock
