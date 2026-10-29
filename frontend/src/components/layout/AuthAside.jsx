import { BriefcaseBusiness, ClipboardList, Search, Sparkles } from 'lucide-react'
import { FEATURES } from '@/utils/constants'

// Cột giới thiệu bên trái trang đăng nhập / đăng ký (ẩn ở màn hẹp)
const BENEFITS = [
  { icon: Search, title: 'Việc làm đa ngành nghề', text: 'Bán lẻ, y tế, giáo dục, sản xuất, khách sạn và nhiều lĩnh vực khác.' },
  FEATURES.candidateAi && {
    icon: Sparkles,
    title: 'AI chấm điểm CV',
    text: 'Biết CV mạnh, yếu ở đâu và sửa theo yêu cầu của tin tuyển dụng thật.',
  },
  { icon: ClipboardList, title: 'Theo dõi hồ sơ', text: 'Xem trạng thái từng đơn ứng tuyển ngay trên tài khoản.' },
].filter(Boolean)

export default function AuthAside({ title }) {
  return (
    <aside className="auth-aside">
      <span className="logo-mark" aria-hidden="true">
        <BriefcaseBusiness />
      </span>
      <h2>{title}</h2>
      <ul className="auth-benefits">
        {BENEFITS.map((item) => (
          <li key={item.title}>
            <span className="auth-benefit-icon" aria-hidden="true">
              <item.icon />
            </span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}
