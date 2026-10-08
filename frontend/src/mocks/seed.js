// Dữ liệu mẫu cho chế độ mock. Tài khoản demo: candidate@demo.com / recruiter@demo.com / admin@demo.com (mật khẩu 123456)

const EDU_PTIT = {
  school: 'Học viện Công nghệ Bưu chính Viễn thông',
  degree: 'Kỹ sư Công nghệ thông tin',
  year: '2020 - 2025',
}

const users = [
  {
    id: 'u-admin-1',
    email: 'admin@demo.com',
    password: '123456',
    role: 'admin',
    fullName: 'Admin Hệ Thống',
    phone: '',
  },
  {
    id: 'u-cand-1',
    email: 'candidate@demo.com',
    password: '123456',
    role: 'candidate',
    fullName: 'Nguyễn Văn An',
    phone: '0912 345 678',
    title: 'Frontend Developer',
    location: 'Hà Nội',
    about: 'Lập trình viên frontend, yêu thích ReactJS và thiết kế giao diện.',
  },
  {
    id: 'u-rec-1',
    email: 'recruiter@demo.com',
    password: '123456',
    role: 'recruiter',
    fullName: 'Trần Thị Bình',
    phone: '0987 654 321',
    companyName: 'TechViet Solutions',
  },
  {
    id: 'u-rec-2',
    email: 'hr@cloudnine.demo',
    password: '123456',
    role: 'recruiter',
    fullName: 'Lê Hoàng Nam',
    companyName: 'CloudNine Tech',
  },
  ...[
    ['u-cand-2', 'Lê Thị Cúc', 'Backend Developer'],
    ['u-cand-3', 'Phạm Minh Đức', 'Frontend Developer'],
    ['u-cand-4', 'Hoàng Thu Hà', 'Web Developer'],
    ['u-cand-5', 'Vũ Quốc Huy', 'AI Engineer'],
    ['u-cand-6', 'Đỗ Mai Linh', 'Data Analyst'],
  ].map(([id, fullName, title], i) => ({
    id,
    email: `${id}@demo.com`,
    password: '123456',
    role: 'candidate',
    fullName,
    phone: `090${i + 1} 111 22${i}`,
    title,
    location: 'Hà Nội',
  })),
]

const job = (data) => ({
  status: 'open',
  benefits: [
    'Lương tháng 13, thưởng theo hiệu quả công việc',
    'Bảo hiểm đầy đủ theo luật lao động',
    'Môi trường trẻ trung, được đào tạo và phát triển',
  ],
  ...data,
})

const jobs = [
  job({
    id: 'job-1',
    recruiterId: 'u-rec-1',
    company: 'TechViet Solutions',
    title: 'Frontend Developer (ReactJS)',
    location: 'Hà Nội',
    type: 'Full-time',
    level: 'Junior',
    salaryMin: 15,
    salaryMax: 25,
    skills: ['React', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Redux', 'Git'],
    description:
      'Tham gia phát triển nền tảng quản lý doanh nghiệp SaaS. Xây dựng giao diện web hiện đại, tối ưu hiệu năng và trải nghiệm người dùng.',
    requirements: [
      'Ít nhất 1 năm kinh nghiệm với ReactJS',
      'Nắm vững JavaScript/TypeScript, HTML, CSS',
      'Có kinh nghiệm quản lý state (Redux, Zustand...)',
      'Biết sử dụng Git, làm việc theo quy trình Agile',
    ],
    deadline: '2026-11-15',
    createdAt: '2026-09-20T08:00:00Z',
  }),
  job({
    id: 'job-2',
    recruiterId: 'u-rec-1',
    company: 'TechViet Solutions',
    title: 'Backend Developer (Python/Django)',
    location: 'Hà Nội',
    type: 'Full-time',
    level: 'Middle',
    salaryMin: 25,
    salaryMax: 40,
    skills: ['Python', 'Django', 'REST API', 'PostgreSQL', 'Docker', 'Redis', 'Git'],
    description:
      'Thiết kế và phát triển hệ thống API cho các sản phẩm thương mại điện tử, xử lý hàng triệu request mỗi ngày.',
    requirements: [
      'Tối thiểu 2 năm kinh nghiệm Python/Django',
      'Thành thạo thiết kế REST API, PostgreSQL',
      'Có kinh nghiệm Docker, Redis là lợi thế',
    ],
    deadline: '2026-11-30',
    createdAt: '2026-09-18T08:00:00Z',
  }),
  job({
    id: 'job-3',
    recruiterId: 'u-rec-1',
    company: 'TechViet Solutions',
    title: 'AI/ML Engineer (NLP)',
    location: 'Hồ Chí Minh',
    type: 'Full-time',
    level: 'Senior',
    salaryMin: 40,
    salaryMax: 60,
    skills: ['Python', 'Machine Learning', 'NLP', 'PyTorch', 'LLM', 'SQL'],
    description:
      'Nghiên cứu và triển khai các mô hình xử lý ngôn ngữ tự nhiên, xây dựng chatbot và hệ thống gợi ý dựa trên LLM.',
    requirements: [
      'Tối thiểu 4 năm kinh nghiệm Machine Learning',
      'Hiểu sâu về NLP, Transformer, LLM',
      'Thành thạo PyTorch, có kinh nghiệm đưa mô hình lên production',
    ],
    deadline: '2026-12-10',
    createdAt: '2026-09-15T08:00:00Z',
  }),
  job({
    id: 'job-4',
    recruiterId: 'u-rec-1',
    company: 'TechViet Solutions',
    title: 'Thực tập sinh ReactJS',
    location: 'Hà Nội',
    type: 'Internship',
    level: 'Intern',
    salaryMin: 3,
    salaryMax: 5,
    skills: ['JavaScript', 'React', 'HTML', 'CSS', 'Git'],
    description: 'Chương trình thực tập 3 tháng, được mentor 1-1 và có cơ hội trở thành nhân viên chính thức.',
    requirements: [
      'Sinh viên năm 3, năm 4 ngành CNTT',
      'Có kiến thức cơ bản về JavaScript, HTML, CSS',
      'Đã từng làm dự án cá nhân với ReactJS là lợi thế',
    ],
    deadline: '2026-10-31',
    createdAt: '2026-09-25T08:00:00Z',
  }),
  job({
    id: 'job-5',
    recruiterId: 'u-rec-1',
    company: 'TechViet Solutions',
    title: 'Data Analyst',
    location: 'Hà Nội',
    type: 'Remote',
    level: 'Middle',
    salaryMin: 20,
    salaryMax: 30,
    skills: ['SQL', 'Python', 'Power BI', 'Excel', 'Statistics'],
    description: 'Phân tích dữ liệu kinh doanh, xây dựng dashboard báo cáo và đề xuất giải pháp tối ưu doanh thu.',
    requirements: [
      'Tối thiểu 2 năm kinh nghiệm phân tích dữ liệu',
      'Thành thạo SQL, Power BI hoặc Tableau',
      'Tư duy logic, kỹ năng trình bày tốt',
    ],
    deadline: '2026-11-20',
    createdAt: '2026-09-10T08:00:00Z',
  }),
  job({
    id: 'job-6',
    recruiterId: 'u-rec-2',
    company: 'CloudNine Tech',
    title: 'Mobile Developer (Flutter)',
    location: 'Đà Nẵng',
    type: 'Full-time',
    level: 'Junior',
    salaryMin: 15,
    salaryMax: 25,
    skills: ['Flutter', 'Dart', 'Firebase', 'REST API', 'Git'],
    description: 'Phát triển ứng dụng di động đa nền tảng cho khách hàng trong lĩnh vực fintech.',
    requirements: ['Ít nhất 1 năm kinh nghiệm Flutter', 'Có ứng dụng đã phát hành trên store là lợi thế'],
    deadline: '2026-11-10',
    createdAt: '2026-09-22T08:00:00Z',
  }),
  job({
    id: 'job-7',
    recruiterId: 'u-rec-2',
    company: 'CloudNine Tech',
    title: 'DevOps Engineer',
    location: 'Hồ Chí Minh',
    type: 'Full-time',
    level: 'Senior',
    salaryMin: 35,
    salaryMax: 55,
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux', 'Terraform'],
    description: 'Xây dựng và vận hành hạ tầng cloud, tự động hóa quy trình triển khai cho hơn 50 dịch vụ.',
    requirements: ['Tối thiểu 4 năm kinh nghiệm DevOps', 'Thành thạo Kubernetes, AWS, Terraform'],
    deadline: '2026-12-01',
    createdAt: '2026-09-12T08:00:00Z',
  }),
  job({
    id: 'job-8',
    recruiterId: 'u-rec-2',
    company: 'CloudNine Tech',
    title: 'QA/Tester Fresher',
    location: 'Hà Nội',
    type: 'Full-time',
    level: 'Fresher',
    salaryMin: 10,
    salaryMax: 15,
    skills: ['Manual Testing', 'API Testing', 'SQL', 'Jira', 'Selenium'],
    description: 'Kiểm thử chức năng các sản phẩm web/mobile, viết test case và báo cáo lỗi.',
    requirements: ['Tốt nghiệp ngành CNTT hoặc liên quan', 'Cẩn thận, tỉ mỉ, có tư duy phân tích'],
    deadline: '2026-10-25',
    createdAt: '2026-09-26T08:00:00Z',
  }),
  job({
    id: 'job-9',
    recruiterId: 'u-rec-2',
    company: 'CloudNine Tech',
    title: 'Fullstack Developer (Node.js/React)',
    location: 'Hà Nội',
    type: 'Remote',
    level: 'Middle',
    salaryMin: 25,
    salaryMax: 40,
    skills: ['Node.js', 'React', 'TypeScript', 'MongoDB', 'REST API', 'Docker'],
    description: 'Phát triển end-to-end các tính năng cho nền tảng thương mại điện tử B2B.',
    requirements: ['Tối thiểu 2 năm kinh nghiệm fullstack JavaScript', 'Thành thạo React và Node.js'],
    deadline: '2026-11-25',
    createdAt: '2026-09-19T08:00:00Z',
  }),
]

const cv = (id, candidateId, fileName, parsed) => ({
  id,
  candidateId,
  fileName,
  fileSize: 180000 + id.length * 13000,
  uploadedAt: '2026-09-21T10:00:00Z',
  parsed: { links: [], education: [EDU_PTIT], ...parsed },
  analysis: null,
})

const person = (userId) => {
  const u = users.find((x) => x.id === userId)
  return { fullName: u.fullName, email: u.email, phone: u.phone, location: u.location }
}

const cvs = [
  cv('cv-1', 'u-cand-1', 'NguyenVanAn_Frontend_CV.pdf', {
    ...person('u-cand-1'),
    title: 'Frontend Developer',
    summary: 'Lập trình viên frontend với hơn 1 năm kinh nghiệm ReactJS.',
    yearsOfExperience: 1.5,
    skills: ['React', 'JavaScript', 'HTML', 'CSS', 'Git', 'Redux', 'Node.js'],
    experience: [
      {
        company: 'Công ty CP Phần mềm Sao Mai',
        role: 'Frontend Developer',
        duration: '03/2025 - nay',
        description: 'Phát triển giao diện hệ thống quản lý bán hàng bằng ReactJS, tích hợp REST API.',
      },
    ],
  }),
  cv('cv-2', 'u-cand-2', 'LeThiCuc_Backend.pdf', {
    ...person('u-cand-2'),
    title: 'Backend Developer',
    summary:
      'Backend Developer 3 năm kinh nghiệm Python/Django, từng thiết kế hệ thống API phục vụ 200.000 người dùng. Mạnh về tối ưu truy vấn PostgreSQL và kiến trúc microservice.',
    yearsOfExperience: 3,
    skills: ['Python', 'Django', 'REST API', 'PostgreSQL', 'Docker', 'Redis', 'Git', 'Celery'],
    experience: [
      {
        company: 'Công ty TNHH Giải pháp Số Việt',
        role: 'Backend Developer',
        duration: '06/2023 - nay',
        description: 'Xây dựng 40+ API cho ứng dụng thương mại điện tử, giảm 35% thời gian phản hồi nhờ Redis cache.',
      },
      {
        company: 'Startup EduTech',
        role: 'Python Developer',
        duration: '01/2022 - 05/2023',
        description: 'Phát triển hệ thống quản lý khóa học bằng Django.',
      },
    ],
    links: ['github.com/lethicuc'],
  }),
  cv('cv-3', 'u-cand-3', 'PhamMinhDuc_CV.pdf', {
    ...person('u-cand-3'),
    title: 'Frontend Developer',
    summary:
      'Frontend Developer 2 năm kinh nghiệm React/TypeScript, đam mê tối ưu hiệu năng và trải nghiệm người dùng. Đã tham gia 5 dự án thương mại.',
    yearsOfExperience: 2,
    skills: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Next.js', 'Redux', 'Git', 'Jest'],
    experience: [
      {
        company: 'Công ty Công nghệ Bình Minh',
        role: 'Frontend Developer',
        duration: '08/2024 - nay',
        description: 'Tối ưu bundle giúp giảm 45% thời gian tải trang, xây dựng design system dùng cho 3 sản phẩm.',
      },
    ],
    links: ['github.com/phamminhduc', 'minhduc.dev'],
  }),
  cv('cv-4', 'u-cand-4', 'HoangThuHa_CV.docx', {
    ...person('u-cand-4'),
    title: 'Web Developer',
    summary: 'Sinh viên mới tốt nghiệp, mong muốn học hỏi.',
    yearsOfExperience: 0.5,
    skills: ['JavaScript', 'HTML', 'CSS', 'Vue.js', 'Git'],
    experience: [
      {
        company: 'Công ty Phần mềm Hoa Sen',
        role: 'Thực tập sinh Web',
        duration: '01/2026 - 06/2026',
        description: 'Tham gia làm giao diện trang quản trị.',
      },
    ],
  }),
  cv('cv-5', 'u-cand-5', 'VuQuocHuy_AI_Engineer.pdf', {
    ...person('u-cand-5'),
    title: 'AI Engineer',
    summary:
      'AI Engineer 4 năm kinh nghiệm NLP và LLM, đã triển khai chatbot chăm sóc khách hàng xử lý 10.000 hội thoại/ngày. Thành thạo PyTorch và các kỹ thuật fine-tuning.',
    yearsOfExperience: 4,
    skills: ['Python', 'Machine Learning', 'NLP', 'PyTorch', 'LLM', 'SQL', 'Docker', 'Django'],
    experience: [
      {
        company: 'Công ty AI Việt',
        role: 'AI Engineer',
        duration: '2022 - nay',
        description: 'Fine-tune mô hình ngôn ngữ tiếng Việt, tăng 20% độ chính xác phân loại ý định.',
      },
    ],
    links: ['github.com/vuquochuy'],
  }),
  cv('cv-6', 'u-cand-6', 'DoMaiLinh_DataAnalyst.pdf', {
    ...person('u-cand-6'),
    title: 'Data Analyst',
    summary: 'Chuyên viên phân tích dữ liệu 1 năm kinh nghiệm, thành thạo SQL và Power BI.',
    yearsOfExperience: 1,
    skills: ['SQL', 'Python', 'Excel', 'Power BI', 'Django', 'HTML'],
    experience: [
      {
        company: 'Công ty Bán lẻ Xanh',
        role: 'Data Analyst',
        duration: '09/2025 - nay',
        description: 'Xây dựng 12 dashboard doanh số, tự động hóa báo cáo tuần.',
      },
    ],
  }),
]

const app = (id, jobId, candidateId, cvId, status, appliedAt, coverLetter = '') => ({
  id,
  jobId,
  candidateId,
  cvId,
  status,
  appliedAt,
  coverLetter,
  aiReview: null,
})

const applications = [
  app('app-1', 'job-1', 'u-cand-1', 'cv-1', 'reviewing', '2026-09-22T09:00:00Z', 'Em rất mong được đóng góp vào đội ngũ frontend của công ty.'),
  app('app-2', 'job-1', 'u-cand-3', 'cv-3', 'pending', '2026-09-23T09:00:00Z', 'Tôi có 2 năm kinh nghiệm React/TypeScript và rất quan tâm tới sản phẩm SaaS.'),
  app('app-3', 'job-1', 'u-cand-4', 'cv-4', 'pending', '2026-09-24T09:00:00Z'),
  app('app-4', 'job-1', 'u-cand-6', 'cv-6', 'pending', '2026-09-25T09:00:00Z'),
  app('app-5', 'job-2', 'u-cand-2', 'cv-2', 'shortlisted', '2026-09-19T09:00:00Z', 'Tôi có 3 năm kinh nghiệm Django, từng tối ưu hệ thống lớn.'),
  app('app-6', 'job-2', 'u-cand-5', 'cv-5', 'pending', '2026-09-20T09:00:00Z'),
  app('app-7', 'job-2', 'u-cand-6', 'cv-6', 'pending', '2026-09-21T09:00:00Z'),
  app('app-8', 'job-3', 'u-cand-5', 'cv-5', 'interview', '2026-09-16T09:00:00Z', 'Tôi có kinh nghiệm triển khai LLM vào sản phẩm thực tế.'),
  app('app-9', 'job-3', 'u-cand-2', 'cv-2', 'pending', '2026-09-17T09:00:00Z'),
  app('app-10', 'job-4', 'u-cand-4', 'cv-4', 'pending', '2026-09-26T09:00:00Z'),
  app('app-11', 'job-5', 'u-cand-6', 'cv-6', 'reviewing', '2026-09-12T09:00:00Z'),
  app('app-12', 'job-6', 'u-cand-1', 'cv-1', 'rejected', '2026-09-23T09:00:00Z'),
]

export const seed = { users, jobs, cvs, applications }
