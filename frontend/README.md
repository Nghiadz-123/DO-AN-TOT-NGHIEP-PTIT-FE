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
├── api/            # Gọi REST API (axiosClient, adapters + từng module: auth, employer, candidate, job, company,
│                   #   application, cv, favorite, catalog)
├── assets/         # Ảnh, icon tĩnh
├── components/
│   ├── common/     # Component dùng chung (Loading, Modal, FavoriteButton...)
│   ├── companies/  # CompanyCard
│   ├── cv/, jobs/  # Thành phần của CV, việc làm (JobCard, ApplyModal...)
│   └── layout/     # Header, Footer
├── context/        # React Context: đăng nhập (AuthProvider), id việc làm / công ty yêu thích (FavoritesProvider)
├── hooks/          # Custom hooks (useAuth, useFavorites, useFetch, useCatalog)
├── layouts/        # Bố cục trang: MainLayout, RecruiterLayout
├── pages/          # Mỗi màn hình một thư mục
│   ├── Auth/       # Đăng nhập, đăng ký
│   ├── Candidate/  # Hồ sơ, quản lý & tải CV, đơn ứng tuyển, yêu thích (+ trang AI đang ẩn)
│   ├── Companies/  # Danh bạ công ty, hồ sơ công ty
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

## Kết nối backend Django

Mọi dữ liệu lấy từ API Django (không còn dữ liệu giả lập). Phải chạy backend trước:

```bash
# trong DO-AN-TOT-NGHIEP-PTIT-BE/backend
python manage.py migrate
python manage.py seed_demo     # tài khoản demo: candidate@demo.com, recruiter@demo.com / 123456
python manage.py runserver     # http://localhost:8000
```

File `.env` của frontend (xem `.env.example`):

```env
VITE_API_URL=http://localhost:8000/api/v1
```

- `src/api/adapters.js` chuyển dữ liệu backend (snake_case, lương VND) sang dạng giao diện dùng (camelCase, lương "triệu").
- `src/api/axiosClient.js` gắn JWT, tự refresh access token khi hết hạn; refresh token hết hạn thì đăng xuất.
- Backend chưa có module AI nên các phần AI (chấm điểm CV, gợi ý việc làm, sàng lọc hồ sơ) được ẩn
  (`FEATURES.ai` trong `src/utils/constants.js`). Bật bằng `VITE_FEATURE_AI=true` khi backend có các API này.
- Admin: tài khoản tạo bằng `python manage.py createsuperuser`; chức năng quản trị nằm ở Django Admin (`/admin/` của backend).

## Các trang

| Vai trò | Đường dẫn | Chức năng |
| --- | --- | --- |
| Chung | `/jobs`, `/jobs/:id` | Tìm kiếm, lọc việc làm; xem chi tiết & ứng tuyển |
| Chung | `/companies`, `/companies/:id` | Tìm công ty theo tên, lọc ngành nghề / tỉnh; hồ sơ công ty và các tin đang tuyển |
| Ứng viên | `/favorites` | Việc làm và công ty yêu thích (bấm ♡ trên thẻ việc làm, công ty hoặc trang chi tiết) |
| Ứng viên | `/cv` | Quản lý CV: xem PDF, tải về, đổi tên, đặt CV chính, xóa (CV đã dùng ứng tuyển thì không xóa được) |
| Ứng viên | `/cv/new`, `/cv/:id/edit` | Tải CV (PDF/DOCX ≤ 5MB), đổi tên, xem kết quả đọc nội dung CV |
| Ứng viên | `/cv-analysis` | (AI, đang ẩn) Chấm điểm và gợi ý cải thiện CV |
| Ứng viên | `/recommended-jobs` | (AI, đang ẩn) Gợi ý việc làm phù hợp theo CV |
| Ứng viên | `/my-applications` | Theo dõi trạng thái đơn ứng tuyển, rút hồ sơ |
| Ứng viên | `/profile` | Hồ sơ cá nhân và mong muốn công việc (vị trí, nơi làm việc, cấp bậc, lương) |
| Nhà tuyển dụng | `/recruiter` | Tổng quan, thống kê hồ sơ, pipeline tuyển dụng |
| Nhà tuyển dụng | `/recruiter/jobs`, `/recruiter/jobs/new` | Quản lý tin (lọc theo trạng thái, tìm kiếm, phân trang); lưu nháp / đăng / tạm dừng / đóng / mở lại / xóa |
| Nhà tuyển dụng | `/recruiter/applicants` | Lọc hồ sơ theo tin, trạng thái, từ khóa; chuyển trạng thái |
| Nhà tuyển dụng | `/recruiter/applicants/:id` | Thông tin ứng viên, xem / tải CV, chuyển trạng thái kèm ghi chú, chấm sao, lịch sử xử lý |
| Nhà tuyển dụng | `/recruiter/company` | Hồ sơ công ty, logo, trạng thái xác minh |
| Nhà tuyển dụng | `/recruiter/account` | Thông tin cá nhân, đổi mật khẩu |

## API phía ứng viên

Chi tiết xem `DO-AN-TOT-NGHIEP-PTIT-BE/docs/candidate-api.md` (hoặc Swagger `http://localhost:8000/api/docs/`).

| Module frontend | Endpoint backend |
| --- | --- |
| `candidateApi` | `candidate/register/`, `candidate/profile/` |
| `cvApi` | `candidate/cvs/...` (tải lên PDF/DOCX, đổi tên, CV chính, xem / tải file, đọc lại nội dung) |
| `applicationApi` | `candidate/applications/...` (ứng tuyển, danh sách, rút hồ sơ) |
| `favoriteApi` | `candidate/favorites/ids/`, `candidate/favorites/jobs/...`, `candidate/favorites/companies/...` |
| `companyApi` | `companies/`, `companies/{id}/` (công khai); tin của công ty: `jobs/?company={id}` |
