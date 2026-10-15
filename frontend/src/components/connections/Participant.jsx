import CompanyLogo from '@/components/common/CompanyLogo'

// Ảnh đại diện của tài khoản bên kia: nhà tuyển dụng dùng logo công ty, ứng viên dùng chữ cái đầu của tên
export function ParticipantAvatar({ user }) {
  if (user.company) return <CompanyLogo name={user.company.name} src={user.company.logoUrl} />
  return <span className="avatar avatar-md">{user.fullName.charAt(0)}</span>
}
