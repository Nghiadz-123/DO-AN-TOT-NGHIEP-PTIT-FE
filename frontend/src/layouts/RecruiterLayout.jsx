import { BriefcaseBusiness, Building, LayoutDashboard, Send, Settings, SquarePen, Target, UserSearch, Users } from 'lucide-react'
import CompanyLogo from '@/components/common/CompanyLogo'
import WorkspaceShell from '@/components/layout/WorkspaceShell'
import useAuth from '@/hooks/useAuth'
import { FEATURES } from '@/utils/constants'

// Trang sửa tin (/recruiter/jobs/:id/edit) vẫn thuộc mục "Tin tuyển dụng"
const isJobsPage = (pathname) => pathname === '/recruiter/jobs' || /^\/recruiter\/jobs\/[^/]+\/edit$/.test(pathname)

const SECTIONS = [
  { links: [{ to: '/recruiter', end: true, label: 'Tổng quan', icon: LayoutDashboard }] },
  {
    title: 'Tuyển dụng',
    links: [
      { to: '/recruiter/jobs', label: 'Tin tuyển dụng', icon: BriefcaseBusiness, match: isJobsPage },
      { to: '/recruiter/jobs/new', end: true, label: 'Đăng tin mới', icon: SquarePen },
      { to: '/recruiter/applicants', label: FEATURES.ai ? 'Ứng viên & AI sàng lọc' : 'Ứng viên', icon: Users },
    ],
  },
  {
    title: 'Nguồn ứng viên',
    links: [
      { to: '/recruiter/talent-pool', label: 'Tìm ứng viên', icon: UserSearch },
      { to: '/recruiter/talents', label: 'Ứng viên phù hợp', icon: Target },
      { to: '/recruiter/invitations', label: 'Thư mời đã gửi', icon: Send },
    ],
  },
  {
    title: 'Công ty',
    links: [
      { to: '/recruiter/company', label: 'Hồ sơ công ty', icon: Building },
      { to: '/recruiter/account', label: 'Tài khoản', icon: Settings },
    ],
  },
]

export default function RecruiterLayout() {
  const { user } = useAuth()

  return (
    <WorkspaceShell
      navLabel="Điều hướng nhà tuyển dụng"
      sections={SECTIONS}
      brand={
        <>
          <CompanyLogo name={user.companyName} src={user.companyLogo} />
          <div>
            <strong>{user.companyName}</strong>
            <small>Nhà tuyển dụng</small>
          </div>
        </>
      }
    />
  )
}
