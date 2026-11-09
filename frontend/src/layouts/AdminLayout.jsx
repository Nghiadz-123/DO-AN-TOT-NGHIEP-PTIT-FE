import { BriefcaseBusiness, Building, LayoutDashboard, ShieldCheck, Users } from 'lucide-react'
import WorkspaceShell from '@/components/layout/WorkspaceShell'

const SECTIONS = [
  { links: [{ to: '/admin', end: true, label: 'Tổng quan', icon: LayoutDashboard }] },
  {
    title: 'Quản lý',
    links: [
      { to: '/admin/users', label: 'Người dùng', icon: Users },
      { to: '/admin/companies', label: 'Doanh nghiệp', icon: Building },
      { to: '/admin/jobs', label: 'Tin tuyển dụng', icon: BriefcaseBusiness },
    ],
  },
]

export default function AdminLayout() {
  return (
    <WorkspaceShell
      navLabel="Điều hướng quản trị"
      sections={SECTIONS}
      brand={
        <>
          <span className="workspace-mark" aria-hidden="true">
            <ShieldCheck />
          </span>
          <div>
            <strong>Quản trị hệ thống</strong>
            <small>Smart ATS</small>
          </div>
        </>
      }
    />
  )
}
