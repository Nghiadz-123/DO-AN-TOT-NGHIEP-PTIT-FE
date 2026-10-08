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
├── api/            # Gọi REST API (axiosClient, adapters + từng module: auth, employer, job, application, catalog, cv)
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
Tài khoản demo (mật khẩu `123456`): `candidate@demo.com` (ứng viên), `recruiter@demo.com` (nhà tuyển dụng).
Xóa key `ats_mock_db_v2` trong localStorage để reset dữ liệu mẫu.

## Kết nối backend Django (giai đoạn 1: Nhà tuyển dụng)

Tạo file `.env.local`:

```env
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:8000/api/v1
```

Chạy backend (`python manage.py seed_demo` để có tài khoản `recruiter@demo.com` / `123456`) rồi `npm run dev`.

- `src/api/adapters.js` chuyển dữ liệu backend (snake_case, lương VND) sang dạng giao diện dùng (camelCase, lương "triệu"),
  nên mock và API thật trả về cùng một cấu trúc.
- `src/api/axiosClient.js` gắn JWT, tự refresh access token khi hết hạn; refresh token hết hạn thì đăng xuất.
- Backend giai đoạn 1 chưa có AI và API phía ứng viên nên các phần này được ẩn bằng feature flag
  (`FEATURES` trong `src/utils/constants.js`). Bật lại bằng `VITE_FEATURE_AI=true`, `VITE_FEATURE_CANDIDATE=true`
  khi backend hỗ trợ.

## Các trang

| Vai trò | Đường dẫn | Chức năng |
| --- | --- | --- |
| Chung | `/jobs`, `/jobs/:id` | Tìm kiếm, lọc việc làm; xem chi tiết & ứng tuyển |
| Ứng viên | `/cv-analysis` | Tải CV lên, AI bóc tách, chấm điểm và gợi ý cải thiện CV |
| Ứng viên | `/recommended-jobs` | AI gợi ý việc làm phù hợp theo CV (điểm khớp, kỹ năng thiếu) |
| Ứng viên | `/my-applications` | Theo dõi trạng thái đơn ứng tuyển |
| Ứng viên | `/profile` | Cập nhật hồ sơ cá nhân |
| Nhà tuyển dụng | `/recruiter` | Tổng quan, thống kê hồ sơ, pipeline tuyển dụng |
| Nhà tuyển dụng | `/recruiter/jobs`, `/recruiter/jobs/new` | Quản lý tin (lọc theo trạng thái, tìm kiếm, phân trang); lưu nháp / đăng / tạm dừng / đóng / mở lại / xóa |
| Nhà tuyển dụng | `/recruiter/applicants` | Lọc hồ sơ theo tin, trạng thái, từ khóa; chuyển trạng thái (AI sàng lọc ở chế độ mock) |
| Nhà tuyển dụng | `/recruiter/applicants/:id` | Thông tin ứng viên, xem / tải CV, chuyển trạng thái kèm ghi chú, chấm sao, lịch sử xử lý |
| Nhà tuyển dụng | `/recruiter/company` | Hồ sơ công ty, logo, trạng thái xác minh |
| Nhà tuyển dụng | `/recruiter/account` | Thông tin cá nhân, đổi mật khẩu |
