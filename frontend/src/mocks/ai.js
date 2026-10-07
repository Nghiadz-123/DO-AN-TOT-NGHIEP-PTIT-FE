// Mô phỏng các tính năng AI (bóc tách CV, chấm điểm, so khớp, sàng lọc) bằng luật đơn giản.
// Khi có backend thật, các kết quả này sẽ do NLP/LLM phía server trả về với cùng cấu trúc.
import { JOB_LEVELS } from '@/utils/constants'
import { labelOf } from '@/utils/formatters'
import { normalize } from '@/utils/text'

const EDU_DEFAULT = {
  school: 'Học viện Công nghệ Bưu chính Viễn thông',
  degree: 'Kỹ sư Công nghệ thông tin',
  year: '2021 - 2025',
}

const CV_TEMPLATES = {
  frontend: {
    title: 'Frontend Developer',
    summary: 'Lập trình viên frontend yêu thích xây dựng giao diện web.',
    yearsOfExperience: 1,
    skills: ['JavaScript', 'React', 'HTML', 'CSS', 'Git', 'Responsive Design'],
    experience: [
      {
        company: 'Công ty CP Phần mềm Sao Mai',
        role: 'Frontend Developer',
        duration: '06/2025 - nay',
        description: 'Phát triển giao diện web bằng ReactJS, phối hợp với team backend tích hợp API.',
      },
    ],
  },
  backend: {
    title: 'Backend Developer',
    summary: 'Lập trình viên backend Python, có kinh nghiệm xây dựng REST API.',
    yearsOfExperience: 2,
    skills: ['Python', 'Django', 'REST API', 'PostgreSQL', 'Git', 'Linux'],
    experience: [
      {
        company: 'Công ty TNHH Giải pháp Số Việt',
        role: 'Backend Developer',
        duration: '2024 - nay',
        description: 'Xây dựng API cho hệ thống quản lý kho, tham gia thiết kế cơ sở dữ liệu.',
      },
    ],
  },
  data: {
    title: 'Data Analyst',
    summary: 'Chuyên viên phân tích dữ liệu.',
    yearsOfExperience: 1,
    skills: ['SQL', 'Excel', 'Python', 'Power BI'],
    experience: [
      {
        company: 'Công ty Bán lẻ Xanh',
        role: 'Data Analyst',
        duration: '2025 - nay',
        description: 'Tổng hợp số liệu bán hàng và làm báo cáo định kỳ.',
      },
    ],
  },
}

// Từ khóa phổ biến theo nhóm vị trí, dùng để đánh giá mức độ tối ưu ATS
const TRENDING_KEYWORDS = {
  frontend: ['React', 'TypeScript', 'JavaScript', 'Next.js', 'Redux', 'Jest', 'REST API', 'Git'],
  backend: ['Python', 'Django', 'REST API', 'PostgreSQL', 'Docker', 'Redis', 'CI/CD', 'Git'],
  data: ['SQL', 'Python', 'Power BI', 'Excel', 'Statistics', 'Pandas', 'Tableau'],
  ai: ['Python', 'Machine Learning', 'NLP', 'PyTorch', 'LLM', 'Docker', 'SQL'],
  general: ['Git', 'SQL', 'REST API', 'Docker', 'Agile'],
}

const LEVEL_YEARS = { intern: 0, fresher: 0, junior: 1, middle: 2, senior: 4, lead: 5, manager: 5 }
const levelLabel = (level) => labelOf(JOB_LEVELS, level)

const TITLE_STOPWORDS = new Set(['developer', 'engineer', 'thuc', 'tap', 'sinh', 'nhan', 'vien', 'fresher', 'junior', 'senior'])

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)))

function detectDomain(text) {
  const t = normalize(text)
  if (/\b(ai|ml|machine|nlp|llm)\b/.test(t)) return 'ai'
  if (/\b(data|analyst|bi)\b/.test(t)) return 'data'
  if (/(backend|python|django|java|node)/.test(t)) return 'backend'
  if (/(frontend|react|web|ui|vue)/.test(t)) return 'frontend'
  return 'general'
}

function hasSkill(skills, skill) {
  return skills.some((s) => normalize(s) === normalize(skill))
}

// ---------- 1. Bóc tách thông tin CV ----------
export function parseCV(fileName, user) {
  const fromFile = detectDomain(fileName.replace(/[_\-.]/g, ' '))
  const domain = fromFile === 'general' ? detectDomain(user.title || '') : fromFile
  const template = CV_TEMPLATES[domain] ?? CV_TEMPLATES.frontend
  return {
    fullName: user.fullName,
    email: user.email,
    phone: user.phone || '',
    location: user.location || 'Hà Nội',
    links: [],
    education: [EDU_DEFAULT],
    ...structuredClone(template),
    title: fromFile === 'general' ? user.title || template.title : template.title,
  }
}

// ---------- 2. Chấm điểm CV & gợi ý cải thiện ----------
export function analyzeCV(cv) {
  const years = cv.yearsOfExperience ?? 0
  const hasNumbers = cv.experience.some((e) => /\d+\s*(%|\+|người|dự án|api|dashboard)/i.test(e.description))
  const hasLinks = cv.links?.length > 0
  const summaryLength = cv.summary?.length ?? 0
  const domain = detectDomain(cv.title)
  const trending = TRENDING_KEYWORDS[domain]
  const missingKeywords = trending.filter((k) => !hasSkill(cv.skills, k))
  const coverage = (trending.length - missingKeywords.length) / trending.length

  const sections = [
    {
      key: 'contact',
      name: 'Thông tin liên hệ',
      weight: 0.1,
      score: (cv.email ? 40 : 0) + (cv.phone ? 30 : 0) + (hasLinks ? 30 : 10),
      comment: hasLinks ? 'Đầy đủ thông tin liên hệ và liên kết.' : 'Thiếu liên kết GitHub/Portfolio/LinkedIn.',
    },
    {
      key: 'summary',
      name: 'Giới thiệu bản thân',
      weight: 0.15,
      score: summaryLength >= 150 ? 90 : summaryLength >= 80 ? 70 : summaryLength ? 45 : 20,
      comment: summaryLength >= 150 ? 'Phần giới thiệu rõ ràng, có điểm nhấn.' : 'Phần giới thiệu còn ngắn, chưa nêu bật thế mạnh.',
    },
    {
      key: 'experience',
      name: 'Kinh nghiệm làm việc',
      weight: 0.3,
      score: clamp(35 + cv.experience.length * 12 + (hasNumbers ? 25 : 0) + Math.min(years, 5) * 4),
      comment: hasNumbers ? 'Kinh nghiệm có số liệu chứng minh.' : 'Mô tả công việc chưa có kết quả định lượng.',
    },
    {
      key: 'skills',
      name: 'Kỹ năng',
      weight: 0.2,
      score: clamp(30 + cv.skills.length * 8),
      comment: cv.skills.length >= 8 ? 'Bộ kỹ năng phong phú.' : 'Danh sách kỹ năng còn hạn chế.',
    },
    {
      key: 'education',
      name: 'Học vấn',
      weight: 0.1,
      score: cv.education?.length ? 85 : 40,
      comment: cv.education?.length ? 'Thông tin học vấn đầy đủ.' : 'Chưa có thông tin học vấn.',
    },
    {
      key: 'ats',
      name: 'Tối ưu ATS & từ khóa',
      weight: 0.15,
      score: clamp(35 + coverage * 65),
      comment: `Chứa ${trending.length - missingKeywords.length}/${trending.length} từ khóa phổ biến cho vị trí ${cv.title}.`,
    },
  ]

  const overallScore = clamp(sections.reduce((sum, s) => sum + s.score * s.weight, 0))

  const strengths = []
  const weaknesses = []
  if (years >= 2) strengths.push(`Có ${years} năm kinh nghiệm thực tế`)
  else weaknesses.push('Kinh nghiệm làm việc thực tế còn ít')
  if (cv.skills.length >= 8) strengths.push(`Bộ kỹ năng đa dạng (${cv.skills.length} kỹ năng)`)
  else weaknesses.push(`Chỉ liệt kê ${cv.skills.length} kỹ năng`)
  if (hasNumbers) strengths.push('Thành tích được định lượng bằng con số cụ thể')
  else weaknesses.push('Thành tích chưa được định lượng')
  if (hasLinks) strengths.push('Có liên kết tới sản phẩm/mã nguồn cá nhân')
  else weaknesses.push('Thiếu link GitHub/Portfolio')
  if (coverage >= 0.7) strengths.push('Chứa nhiều từ khóa phù hợp với hệ thống ATS')
  if (cv.education?.length) strengths.push('Thông tin học vấn rõ ràng')

  const suggestions = []
  if (!hasNumbers) {
    suggestions.push({
      section: 'Kinh nghiệm làm việc',
      priority: 'high',
      issue: 'Mô tả công việc chưa có số liệu cụ thể.',
      suggestion: 'Định lượng kết quả bằng con số (%, thời gian, số người dùng, số tính năng...) để nhà tuyển dụng thấy rõ đóng góp của bạn.',
      example: 'Tối ưu lazy-loading giúp giảm 40% thời gian tải trang cho hơn 10.000 người dùng/ngày.',
    })
  }
  if (summaryLength < 150) {
    suggestions.push({
      section: 'Giới thiệu bản thân',
      priority: summaryLength < 80 ? 'high' : 'medium',
      issue: 'Phần giới thiệu còn ngắn hoặc chung chung.',
      suggestion: 'Viết 2-3 câu nêu rõ vị trí mục tiêu, số năm kinh nghiệm, công nghệ thế mạnh và thành tích nổi bật.',
      example: `${cv.title} với ${years} năm kinh nghiệm, thành thạo ${cv.skills.slice(0, 3).join(', ')}. Đã tham gia phát triển sản phẩm phục vụ hàng nghìn người dùng, mong muốn đóng góp vào sản phẩm có quy mô lớn.`,
    })
  }
  if (missingKeywords.length) {
    suggestions.push({
      section: 'Tối ưu ATS & từ khóa',
      priority: coverage < 0.5 ? 'high' : 'medium',
      issue: `Thiếu ${missingKeywords.length} từ khóa phổ biến cho vị trí ${cv.title}.`,
      suggestion: `Nếu bạn đã từng làm việc với các công nghệ sau, hãy bổ sung vào CV: ${missingKeywords.join(', ')}.`,
    })
  }
  if (!hasLinks) {
    suggestions.push({
      section: 'Thông tin liên hệ',
      priority: 'medium',
      issue: 'Chưa có liên kết GitHub, Portfolio hoặc LinkedIn.',
      suggestion: 'Thêm link tới dự án cá nhân để nhà tuyển dụng có thể kiểm chứng năng lực.',
      example: 'github.com/ten-cua-ban · linkedin.com/in/ten-cua-ban',
    })
  }
  if (years < 1) {
    suggestions.push({
      section: 'Kinh nghiệm làm việc',
      priority: 'medium',
      issue: 'Kinh nghiệm thực tế còn ít.',
      suggestion: 'Bổ sung đồ án, dự án cá nhân, cuộc thi hoặc hoạt động ngoại khóa có liên quan; mô tả vai trò và công nghệ sử dụng.',
    })
  }
  if (cv.skills.length < 8) {
    suggestions.push({
      section: 'Kỹ năng',
      priority: 'low',
      issue: 'Danh sách kỹ năng còn ít.',
      suggestion: 'Chia kỹ năng thành nhóm (Ngôn ngữ, Framework, Công cụ, Kỹ năng mềm) và ghi rõ mức độ thành thạo.',
    })
  }
  suggestions.push({
    section: 'Trình bày',
    priority: 'low',
    issue: 'Có thể tăng sức thuyết phục của từng gạch đầu dòng.',
    suggestion: 'Bắt đầu mỗi ý bằng động từ hành động mạnh (Xây dựng, Tối ưu, Triển khai, Dẫn dắt...) và giữ CV trong 1-2 trang.',
  })

  return {
    overallScore,
    sections: sections.map(({ weight: _weight, ...s }) => s),
    strengths,
    weaknesses,
    suggestions,
    missingKeywords,
    analyzedAt: new Date().toISOString(),
  }
}

// ---------- 3. So khớp CV với tin tuyển dụng ----------
export function matchCVToJob(cv, job) {
  const matchedSkills = job.skills.filter((s) => hasSkill(cv.skills, s))
  const missingSkills = job.skills.filter((s) => !hasSkill(cv.skills, s))
  const skillRatio = job.skills.length ? matchedSkills.length / job.skills.length : 0

  const requiredYears = LEVEL_YEARS[job.level] ?? 1
  const years = cv.yearsOfExperience ?? 0
  const expRatio = requiredYears === 0 ? 1 : Math.min(years / requiredYears, 1)

  const titleTokens = normalize(job.title)
    .split(/[^a-z0-9.+#]+/)
    .filter((t) => t.length > 1 && !TITLE_STOPWORDS.has(t))
  const cvText = normalize(`${cv.title} ${cv.skills.join(' ')}`)
  const titleMatch = titleTokens.some((t) => cvText.includes(t))

  const score = clamp(skillRatio * 65 + expRatio * 25 + (titleMatch ? 10 : 0))

  const reasons = []
  reasons.push(`Đáp ứng ${matchedSkills.length}/${job.skills.length} kỹ năng yêu cầu`)
  reasons.push(
    expRatio >= 1
      ? `Kinh nghiệm ${years} năm phù hợp cấp độ ${levelLabel(job.level)}`
      : `Kinh nghiệm ${years} năm, thấp hơn mức ${requiredYears} năm của cấp độ ${levelLabel(job.level)}`,
  )
  if (titleMatch) reasons.push('Định hướng nghề nghiệp phù hợp với vị trí')

  return { score, matchedSkills, missingSkills, requiredYears, years, reasons }
}

// ---------- 4. Sàng lọc hồ sơ ứng tuyển cho nhà tuyển dụng ----------
export function screenApplication(cv, job, coverLetter) {
  const match = matchCVToJob(cv, job)
  const recommendation = match.score >= 75 ? 'strong' : match.score >= 50 ? 'consider' : 'weak'

  const strengths = []
  const concerns = []
  if (match.matchedSkills.length) strengths.push(`Có các kỹ năng: ${match.matchedSkills.join(', ')}`)
  if (match.years >= match.requiredYears) strengths.push(`${match.years} năm kinh nghiệm, đạt yêu cầu cấp độ ${levelLabel(job.level)}`)
  else concerns.push(`Kinh nghiệm ${match.years} năm, chưa đạt ${match.requiredYears} năm theo yêu cầu`)
  if (match.missingSkills.length) concerns.push(`Thiếu kỹ năng: ${match.missingSkills.join(', ')}`)
  if (cv.links?.length) strengths.push('Có sản phẩm/mã nguồn công khai để kiểm chứng')
  if (!coverLetter) concerns.push('Không gửi thư giới thiệu')

  const verdict = {
    strong: 'Nên ưu tiên liên hệ phỏng vấn.',
    consider: 'Có thể cân nhắc, nên kiểm tra thêm qua vòng phỏng vấn kỹ thuật.',
    weak: 'Mức độ phù hợp thấp so với yêu cầu vị trí.',
  }[recommendation]

  return {
    score: match.score,
    recommendation,
    summary: `${cv.fullName} đáp ứng ${match.matchedSkills.length}/${job.skills.length} kỹ năng yêu cầu, có ${match.years} năm kinh nghiệm. ${verdict}`,
    matchedSkills: match.matchedSkills,
    missingSkills: match.missingSkills,
    strengths,
    concerns,
    screenedAt: new Date().toISOString(),
  }
}
