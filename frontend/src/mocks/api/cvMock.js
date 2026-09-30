import { analyzeCV, matchCVToJob, parseCV } from '../ai'
import { delay, findOr404, genId, getDb, httpError, requireRole, saveDb } from '../db'

function ownCV(id) {
  const user = requireRole('candidate')
  const cv = findOr404(getDb().cvs, id, 'CV')
  if (cv.candidateId !== user.id) throw httpError(403, 'Bạn không có quyền với CV này.')
  return cv
}

const cvMock = {
  async getMine() {
    await delay()
    const user = requireRole('candidate')
    return getDb()
      .cvs.filter((c) => c.candidateId === user.id)
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
  },

  async upload(file) {
    await delay(1200) // mô phỏng thời gian bóc tách nội dung CV
    const user = requireRole('candidate')
    const cv = {
      id: genId('cv'),
      candidateId: user.id,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      parsed: parseCV(file.name, user),
      analysis: null,
    }
    getDb().cvs.push(cv)
    saveDb()
    return cv
  },

  async analyze(id) {
    await delay(1500) // mô phỏng thời gian AI chấm điểm
    const cv = ownCV(id)
    cv.analysis = analyzeCV(cv.parsed)
    saveDb()
    return cv
  },

  async matchJob(cvId, jobId) {
    await delay(500)
    const cv = ownCV(cvId)
    const job = findOr404(getDb().jobs, jobId, 'Tin tuyển dụng')
    return matchCVToJob(cv.parsed, job)
  },

  async remove(id) {
    await delay()
    ownCV(id)
    const db = getDb()
    if (db.applications.some((a) => a.cvId === id)) {
      throw httpError(400, 'CV này đang được dùng trong đơn ứng tuyển, không thể xóa.')
    }
    db.cvs = db.cvs.filter((c) => c.id !== id)
    saveDb()
  },
}

export default cvMock
