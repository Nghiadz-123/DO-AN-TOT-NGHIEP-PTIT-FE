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
│   ├── Candidate/  # Hồ sơ, quản lý & tải CV, phân tích CV, việc làm gợi ý
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
File CV ứng viên tải lên được lưu trong IndexedDB (`ats_mock_files`) để xem / tải lại đúng file, kể cả từ phía nhà tuyển dụng.

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
| Ứng viên | `/cv` | Quản lý CV: xem PDF, tải về, sửa, đặt CV chính, xóa (CV đã dùng ứng tuyển thì không xóa được) |
| Ứng viên | `/cv/new`, `/cv/:id/edit` | Tải CV lên kèm thông tin mong muốn (vị trí, cấp bậc, nơi làm việc, lương, kỹ năng...) |
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

## API phía ứng viên: quản lý CV (backend cần bổ sung)

Frontend gọi qua `src/api/cvApi.js`, chuyển đổi dữ liệu ở `toCV` / `toCVFormData` trong `src/api/adapters.js`.

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/candidate/cvs/` | Danh sách CV của ứng viên (mảng hoặc trang `{ results }`), CV chính trước rồi mới nhất trước |
| POST | `/candidate/cvs/` | Tạo CV, `multipart/form-data`, bắt buộc `file` |
| GET | `/candidate/cvs/{id}/` | Chi tiết một CV |
| PATCH | `/candidate/cvs/{id}/` | Sửa thông tin, `multipart/form-data`; có `file` thì thay file (từ chối nếu CV đã dùng ứng tuyển) |
| DELETE | `/candidate/cvs/{id}/` | Xóa (từ chối nếu CV đã dùng ứng tuyển) |
| POST | `/candidate/cvs/{id}/set-default/` | Đặt làm CV chính |
| GET | `/candidate/cvs/{id}/file/` | Tải file gốc, kèm `Content-Disposition` chứa tên file |

Trường gửi lên (multipart; giá trị rỗng gửi `""` = null với field `allow_null`; `skills` gửi lặp lại từng tên):
`file`, `title`, `desired_position`, `job_type`, `work_mode`, `current_level`, `desired_location_id`,
`years_of_experience`, `education_level`, `expected_salary_min`, `expected_salary_max` (VND),
`is_salary_negotiable`, `summary`, `is_default`, `skills`.

Trường trả về: `id`, `title`, `original_filename`, `file_size`, `mime_type`, `desired_position`, `job_type`, `work_mode`,
`current_level`, `desired_location { id, name }`, `years_of_experience`, `education_level`, `expected_salary_min`,
`expected_salary_max`, `is_salary_negotiable`, `skills [{ name }]`, `summary`, `is_default`, `application_count`,
`created_at`, `updated_at` (và `parsed_data`, `analysis` khi có module AI).

Quy tắc: chỉ nhận PDF/DOC/DOCX tối đa 5MB; luôn có đúng một CV chính (CV đầu tiên tự là CV chính; xóa CV chính thì CV mới nhất còn lại thay thế).
