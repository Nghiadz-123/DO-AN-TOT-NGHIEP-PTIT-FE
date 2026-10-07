// Logo công ty; chưa có logo thì hiển thị chữ cái đầu của tên
export default function CompanyLogo({ name = '', src, large = false }) {
  const className = `company-logo ${large ? 'company-logo-lg' : ''}`
  if (src) return <img className={`${className} company-logo-img`} src={src} alt={`Logo ${name}`} />
  return <div className={className}>{name.charAt(0) || 'C'}</div>
}
