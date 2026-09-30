# Smart ATS - Frontend (ReactJS + Vite)

## Chạy dự án

```bash
npm install
cp .env.example .env   # chỉnh VITE_API_URL trỏ tới Django API
npm run dev            # http://localhost:3000
```

Các lệnh khác: `npm run build`, `npm run preview`, `npm run lint`.

## Cấu trúc thư mục

```text
src/
├── api/            # Gọi REST API (axiosClient + từng module: auth, job, cv)
├── assets/         # Ảnh, icon tĩnh
├── components/
│   ├── common/     # Component dùng chung (Button, Loading, Modal...)
│   └── layout/     # Header, Footer
├── context/        # React Context (AuthContext, AuthProvider)
├── hooks/          # Custom hooks (useAuth...)
├── layouts/        # Bố cục trang: MainLayout, RecruiterLayout
├── pages/          # Mỗi màn hình một thư mục
│   ├── Auth/       # Đăng nhập, đăng ký
│   ├── Candidate/  # Hồ sơ, phân tích CV, việc làm gợi ý
│   ├── Home/
│   ├── Jobs/       # Danh sách, chi tiết việc làm
│   ├── NotFound/
│   └── Recruiter/  # Dashboard, quản lý tin, xếp hạng ứng viên
├── routes/         # Khai báo route + ProtectedRoute phân quyền
├── styles/         # CSS toàn cục
├── utils/          # Hằng số, helper
├── App.jsx
└── main.jsx
```

Import tuyệt đối qua alias `@` → `src` (ví dụ `import useAuth from '@/hooks/useAuth'`).

## Chế độ mock (chưa cần backend)

Mặc định `VITE_USE_MOCK=true`: dữ liệu và các tính năng AI được giả lập trong `src/mocks/` (lưu ở localStorage).
Khi backend Django sẵn sàng, đặt `VITE_USE_MOCK=false` — các file trong `src/api/` sẽ gọi REST API thật.

Tài khoản demo (mật khẩu `123456`): `candidate@demo.com` (ứng viên), `recruiter@demo.com` (nhà tuyển dụng).
Xóa key `ats_mock_db_v1` trong localStorage để reset dữ liệu mẫu.

## Các trang

| Vai trò | Đường dẫn | Chức năng |
| --- | --- | --- |
| Chung | `/jobs`, `/jobs/:id` | Tìm kiếm, lọc việc làm; xem chi tiết & ứng tuyển |
| Ứng viên | `/cv-analysis` | Tải CV lên, AI bóc tách, chấm điểm và gợi ý cải thiện CV |
| Ứng viên | `/recommended-jobs` | AI gợi ý việc làm phù hợp theo CV (điểm khớp, kỹ năng thiếu) |
| Ứng viên | `/my-applications` | Theo dõi trạng thái đơn ứng tuyển |
| Ứng viên | `/profile` | Cập nhật hồ sơ cá nhân |
| Nhà tuyển dụng | `/recruiter` | Tổng quan, thống kê hồ sơ |
| Nhà tuyển dụng | `/recruiter/jobs`, `/recruiter/jobs/new` | Quản lý, đăng / sửa / đóng tin tuyển dụng |
| Nhà tuyển dụng | `/recruiter/applicants` | AI sàng lọc, xếp hạng và lọc ứng viên tiềm năng |
| Nhà tuyển dụng | `/recruiter/applicants/:id` | Xem hồ sơ ứng viên + đánh giá AI, cập nhật trạng thái |
