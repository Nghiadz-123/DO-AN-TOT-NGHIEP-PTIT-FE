// Chuyển đổi giữa dữ liệu backend (snake_case, lương theo VND) và view-model của giao diện
// (camelCase, lương theo "triệu"). Chỉ dùng khi gọi API thật; dữ liệu mock trả thẳng view-model.
import { splitLines } from '@/utils/text'

const MILLION = 1_000_000

export const toMillion = (vnd) => (vnd == null ? null : vnd / MILLION)
export const toVnd = (million) => (million === '' || million == null ? null : Math.round(Number(million) * MILLION))

// Bỏ tham số rỗng để không gửi ?status=&q=
export const cleanParams = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && !v.length)))

export const toPage = (data, mapItem) => ({
  count: data.count,
  totalPages: data.total_pages,
  page: data.page,
  pageSize: data.page_size,
  results: data.results.map(mapItem),
})

// ---------------------------------------------------------------- tài khoản
export function toUser(dto) {
  const profile = dto.profile ?? {}
  return {
    id: dto.id,
    email: dto.email,
    fullName: dto.full_name,
    phone: dto.phone,
    role: dto.role,
    position: profile.position ?? '',
    companyRole: profile.company_role ?? null,
    companyId: profile.company?.id ?? null,
    companyName: profile.company?.name ?? '',
    companyLogo: profile.company?.logo_url ?? null,
  }
}

export const toSession = (dto) => ({ access: dto.access, refresh: dto.refresh, user: toUser(dto.user) })

export const toRecruiterProfile = (dto) => ({
  fullName: dto.full_name,
  email: dto.email,
  phone: dto.phone,
  position: dto.position,
  companyRole: dto.company_role,
  joinedAt: dto.joined_at,
})

// ---------------------------------------------------------------- công ty
export const toCompany = (dto) => ({
  id: dto.id,
  name: dto.name,
  taxCode: dto.tax_code ?? '',
  logoUrl: dto.logo_url,
  website: dto.website,
  email: dto.email,
  phone: dto.phone,
  address: dto.address,
  locationId: dto.location?.id ?? '',
  industryId: dto.industry?.id ?? '',
  companySize: dto.company_size,
  foundedYear: dto.founded_year ?? '',
  description: dto.description,
  verificationStatus: dto.verification_status,
})

export const fromCompanyForm = (form) => ({
  name: form.name,
  tax_code: form.taxCode,
  website: form.website,
  email: form.email,
  phone: form.phone,
  address: form.address,
  location_id: form.locationId || null,
  industry_id: form.industryId || null,
  company_size: form.companySize,
  founded_year: form.foundedYear ? Number(form.foundedYear) : null,
  description: form.description,
})

// ---------------------------------------------------------------- tin tuyển dụng
export const toJob = (dto) => ({
  id: dto.id,
  title: dto.title,
  company: dto.company?.name ?? '',
  companyLogo: dto.company?.logo_url ?? null,
  location: dto.location?.name ?? '',
  locationId: dto.location?.id ?? '',
  type: dto.job_type,
  workMode: dto.work_mode,
  level: dto.level,
  salaryMin: toMillion(dto.salary_min),
  salaryMax: toMillion(dto.salary_max),
  isSalaryNegotiable: dto.is_salary_negotiable,
  deadline: dto.deadline,
  skills: (dto.skills ?? []).map((s) => s.name),
  description: dto.description ?? '',
  requirements: splitLines(dto.requirements ?? ''),
  benefits: splitLines(dto.benefits ?? ''),
  minYearsExperience: dto.min_years_experience ?? 0,
  headcount: dto.headcount ?? 1,
  address: dto.address ?? '',
  status: dto.status,
  publishedAt: dto.published_at,
  createdAt: dto.created_at,
  viewCount: dto.view_count ?? 0,
  applicantCount: dto.applicant_count ?? dto.application_count ?? 0,
  pendingCount: dto.new_applicant_count ?? 0,
  allowedActions: dto.allowed_actions ?? [],
})

export const fromJobForm = (form) => ({
  title: form.title,
  description: form.description,
  requirements: form.requirements.join('\n'),
  benefits: form.benefits.join('\n'),
  job_type: form.type,
  work_mode: form.workMode,
  level: form.level,
  min_years_experience: Number(form.minYearsExperience) || 0,
  headcount: Number(form.headcount) || 1,
  salary_min: toVnd(form.salaryMin),
  salary_max: toVnd(form.salaryMax),
  is_salary_negotiable: form.isSalaryNegotiable,
  location_id: form.locationId || null,
  address: form.address,
  deadline: form.deadline || null,
  skills: form.skills.map((name) => ({ name })),
})

// ---------------------------------------------------------------- hồ sơ ứng tuyển
const toCandidate = (dto) => ({
  id: dto.id,
  fullName: dto.full_name,
  email: dto.email,
  phone: dto.phone,
  headline: dto.headline,
  yearsOfExperience: dto.years_of_experience,
  level: dto.current_level,
  location: dto.location?.name ?? '',
  summary: dto.summary ?? '',
})

export const toApplication = (dto) => ({
  id: dto.id,
  jobId: dto.job.id,
  job: { id: dto.job.id, title: dto.job.title },
  candidate: toCandidate(dto.candidate),
  cv: {
    id: dto.cv.id,
    title: dto.cv.title,
    fileName: dto.cv.original_filename,
    fileSize: dto.cv.file_size,
    mimeType: dto.cv.mime_type,
  },
  status: dto.status,
  rating: dto.recruiter_rating,
  appliedAt: dto.applied_at,
  statusChangedAt: dto.status_changed_at,
  allowedTransitions: dto.allowed_transitions ?? [],
  coverLetter: dto.cover_letter ?? '',
  rejectionReason: dto.rejection_reason ?? '',
  history: (dto.status_history ?? []).map((h) => ({
    id: h.id,
    fromStatus: h.from_status,
    toStatus: h.to_status,
    note: h.note,
    changedBy: h.changed_by?.full_name ?? null,
    createdAt: h.created_at,
  })),
  aiReview: null, // module AI chưa có ở backend giai đoạn này
})

export const toDashboard = (dto) => ({
  jobs: dto.jobs,
  applications: {
    total: dto.applications.total,
    newLast7Days: dto.applications.new_last_7_days,
    byStatus: dto.applications,
  },
  recentApplications: dto.recent_applications.map(toApplication),
  avgAiScore: null,
})
