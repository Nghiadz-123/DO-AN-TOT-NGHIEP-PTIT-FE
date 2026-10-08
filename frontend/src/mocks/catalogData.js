// Danh mục cho chế độ mock, cùng id/thứ tự với dữ liệu seed của backend (apps/catalog/migrations/0002)
const LOCATION_NAMES = [
  'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Huế',
  'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp',
  'Gia Lai', 'Hà Tĩnh', 'Hưng Yên', 'Khánh Hòa', 'Lai Châu', 'Lâm Đồng', 'Lạng Sơn', 'Lào Cai',
  'Nghệ An', 'Ninh Bình', 'Phú Thọ', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sơn La', 'Tây Ninh',
  'Thái Nguyên', 'Thanh Hóa', 'Tuyên Quang', 'Vĩnh Long',
]

export const LOCATIONS = LOCATION_NAMES.map((name, i) => ({ id: i + 1, name }))

export const INDUSTRIES = [
  'Công nghệ thông tin', 'Phát triển phần mềm', 'Trí tuệ nhân tạo & Dữ liệu', 'Viễn thông', 'Thương mại điện tử',
  'Tài chính - Ngân hàng', 'Giáo dục - Đào tạo', 'Y tế - Dược phẩm', 'Bán lẻ - Hàng tiêu dùng', 'Sản xuất',
  'Logistics - Vận tải', 'Bất động sản - Xây dựng', 'Marketing - Truyền thông', 'Du lịch - Khách sạn',
  'Tư vấn - Dịch vụ doanh nghiệp',
].map((name, i) => ({ id: i + 1, name }))

export const SKILLS = [
  'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'PHP', 'Kotlin', 'Swift', 'Dart', 'SQL', 'HTML',
  'CSS', 'React', 'Next.js', 'Vue.js', 'Angular', 'Redux', 'Node.js', 'Express.js', 'Django', 'Flask', 'FastAPI',
  'Spring Boot', '.NET', 'Laravel', 'Flutter', 'React Native', 'REST API', 'GraphQL', 'Microservices', 'PostgreSQL',
  'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'Linux', 'CI/CD', 'Terraform',
  'Machine Learning', 'Deep Learning', 'NLP', 'LLM', 'PyTorch', 'TensorFlow', 'Data Analysis', 'Statistics',
  'Manual Testing', 'Automation Testing', 'API Testing', 'Selenium', 'Jest', 'Git', 'Jira', 'Figma', 'Power BI',
  'Tableau', 'Excel', 'Agile', 'Giao tiếp', 'Làm việc nhóm', 'Tiếng Anh', 'Tiếng Nhật',
]

export const locationName = (id) => LOCATIONS.find((l) => l.id === Number(id))?.name ?? ''
