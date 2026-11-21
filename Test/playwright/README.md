# Automation test – Đăng nhập, Đăng ký, CV (Smart ATS)

Python + Playwright + Pytest, mô hình Page Object. Kịch bản lấy từ `FE/Test/KBKTCN_ATS_WEB_v1.0.xlsx`,
sheet "Đăng nhập, Đăng ký" và sheet "Ứng viên" (phần CV, Candidate_1..255):

| Chức năng | Test Case ID | File test |
|---|---|---|
| Đăng nhập | Login_1 → Login_48 | `tests/ui/test_login_ui.py` |
| Đăng nhập | Login_49 → Login_57 | `tests/function/test_login_function.py` |
| Đăng ký – Ứng viên | Login_58 → Login_141 | `tests/ui/test_register_ui.py` |
| Đăng ký – Ứng viên | Login_142 → Login_148 | `tests/function/test_register_function.py` |
| Đăng ký – Nhà tuyển dụng | Login_149 → Login_249 | `tests/ui/test_register_ui.py` |
| Đăng ký – Nhà tuyển dụng | Login_250 → Login_256 | `tests/function/test_register_function.py` |
| CV – giao diện chung 4 màn hình (zoom, 375px, Tab, phân quyền) | Candidate_2..9, 43..47, 98..102, 212..219 | `tests/ui/test_cv_common_ui.py` |
| CV của tôi | Candidate_1, 10..16, 20..23, 25, 26, 28 | `tests/ui/test_cv_list_ui.py` |
| CV của tôi | Candidate_17..19, 24, 27, 29..41 | `tests/function/test_cv_list_function.py` |
| Tải lên CV | Candidate_42, 48..50, 52, 56..58, 60..63, 67..72, 74..82, 84, 85 | `tests/ui/test_cv_upload_ui.py` |
| Tải lên CV | Candidate_51, 53..55, 59, 64..66, 73, 83, 86..96 | `tests/function/test_cv_upload_function.py` |
| Tạo CV | Candidate_97, 103..198 | `tests/ui/test_cv_builder_ui.py` |
| Tạo CV | Candidate_199..210 | `tests/function/test_cv_builder_function.py` |
| Chấm điểm & gợi ý sửa CV | Candidate_211, 220..241 | `tests/ui/test_cv_analysis_ui.py` |
| Chấm điểm & gợi ý sửa CV | Candidate_226, 231, 236, 238, 242..255 | `tests/function/test_cv_analysis_function.py` |
| **Các chức năng còn lại** – textbox, combobox, ô số, ô tìm kiếm, phân trang, popup Hủy/X/Esc | Home, Profile, Candidate_256..429, Recruiter, Admin (TC theo mẫu chung) | `tests/generic/test_widgets.py` |
| **Các chức năng còn lại** – giao diện chung, phân quyền, trạng thái tải | (như trên) | `tests/generic/test_screens_common.py` |
| Trang chủ, Tìm việc, Chi tiết tin, Công ty, 404 – nghiệp vụ riêng | Home_7..265 | `tests/function/test_public_function.py` |
| Hồ sơ cá nhân – nghiệp vụ riêng | Profile_13..323 | `tests/function/test_profile_function.py` |
| Việc làm phù hợp, Ứng tuyển, Đơn ứng tuyển, Thư mời, Yêu thích – nghiệp vụ riêng | Candidate_256..429 | `tests/function/test_candidate_jobs_function.py` |
| Nhà tuyển dụng – nghiệp vụ riêng | Recruiter_13..766 | `tests/function/test_recruiter_function.py` |
| Admin – nghiệp vụ riêng | Admin_14..178 | `tests/function/test_admin_function.py` |

## Engine test chung (sheet Trang chủ, Hồ sơ cá nhân, Ứng viên phần còn lại, Nhà tuyển dụng, Admin)

Khoảng 70% TC của các sheet này lặp lại cùng câu chữ trên nhiều màn hình (Textbox: hiển thị / mặc định /
placeholder / bắt buộc / space / trim / 8 định dạng / copy-paste / maxlength; Combobox; ô số min-max; Phân trang;
Popup xác nhận; Giao diện chung; Phân quyền; Trạng thái tải). Thay vì viết tay ~1.200 hàm giống nhau:

- `utils/kbktcn.py` đọc KBKTCN, gắn mỗi TC với (chức năng, nhóm) theo dòng tiêu đề và `classify()` ra loại kiểm tra.
- `specs/screens_*.py` khai báo màn hình (`Screen`: chức năng trong tài liệu, Page Object, vai trò, URL...) và thành
  phần (`Widget`: nhóm trong tài liệu, nhãn/locator, khóa đọc giá trị đã lưu qua API).
- `utils/widget_checks.py` cài đặt từng loại kiểm tra; giá trị mong đợi (placeholder, câu thông báo, maxlength,
  min/max, danh sách option, tiêu đề popup) đọc từ chính cột "Kết quả mong muốn" của TC.
- `tests/generic/*` sinh test parametrize với id = mã TC: `pytest -k Profile_41`.

Thêm/sửa TC theo mẫu trong tài liệu không cần sửa code; TC nghiệp vụ riêng (không theo mẫu) viết ở `tests/function/`.
Kiểm tra độ phủ (TC nào trong tài liệu chưa có test): `python -m utils.coverage`.

Quy ước kết quả:
- **FAIL "Thiếu tính năng theo tài liệu: ..."**: màn hình không có thành phần tài liệu mô tả (vd. Ảnh đại diện, Xóa
  tài khoản, AI sàng lọc) – lỗi ứng dụng so với tài liệu, không phải lỗi script.
- **SKIP "MÔI TRƯỜNG: ..."**: backend chưa có API (Thư mời ứng tuyển, Tìm ứng viên, AI) – bật API rồi chạy lại.
- **SKIP "MANUAL: ..."**: cảm quan giao diện, chờ hết hạn theo thời gian thực, giả lập dịch vụ phía backend.
- **SKIP "DỮ LIỆU: ..."**: môi trường không đủ dữ liệu cho điều kiện (vd. chưa đủ bản ghi để có trang 2).

Dữ liệu: mỗi màn hình dùng tài khoản ứng viên / NTD tạo mới qua API (email `auto.cv.*`, `auto.ntd.*@example.com`);
thao tác admin (khóa, xác minh, đóng tin) chỉ làm trên dữ liệu do test tạo. Tài khoản dùng lại quá 15 phút được
đăng nhập lại qua API (access token sống 30 phút, refresh token bị xoay vòng).

## Cấu trúc

```
config/            environments.yaml (URL FE/BE, timeout, giới hạn API auth), settings.py
pages/             base_page.py, login_page.py, register_page.py, cv_list_page.py, cv_form_page.py,
                   cv_builder_page.py, cv_analysis_page.py, components.py (locator lấy từ source FE)
test_data/         login.json, register.json, cv.json (dữ liệu nhập, mã TC, câu thông báo mong đợi theo tài liệu)
utils/             auth_api.py, cv_api.py (tạo tiền điều kiện qua API), cv_files.py (sinh file CV test),
                   ai_mock.py (giả lập API AI cho test giao diện), layout.py (zoom/tràn ngang/thứ tự Tab), ...
fixtures/cv.py     fixture bộ test CV: tài khoản ứng viên mới qua API, login_as (token -> sessionStorage),
                   recruiter, recruiter_job_id, ai_available
tests/conftest.py  fixture login_page, open_register
tests/ui/          test UI + validation
tests/function/    test luồng nghiệp vụ
reports/           report.html, junit.xml (sinh khi chạy)
screenshots/       ảnh chụp khi test fail
```

Màn hình Đăng ký có 2 vai trò dùng chung kịch bản: mỗi test được parametrize theo (vai trò, trường) và
lấy mã TC từ `test_data/register.json` > `roles`.

## Cài đặt

```bash
cd FE/Test/playwright
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
copy .env.example .env      # điền tài khoản test (mặc định là tài khoản demo)
```

## Chạy

Cần chạy BE (`http://localhost:8000`) và FE (`http://localhost:3000`) trước.

```bash
pytest                       # toàn bộ
pytest -m login              # chỉ Đăng nhập
pytest -m register           # chỉ Đăng ký
pytest -m "register and recruiter"   # Đăng ký Nhà tuyển dụng
pytest -m smoke              # bộ nhanh
pytest -k Login_142          # theo Test Case ID
pytest --headed              # xem trình duyệt chạy
pytest --env=staging         # môi trường khác (config/environments.yaml)
```

Báo cáo Excel: `reports/report.xlsx`, tự sinh sau mỗi lần chạy. Sheet **Tổng hợp** (số TC P/F/Manual
theo chức năng, có link sang từng sheet) + 1 sheet cho mỗi chức năng (**Đăng nhập**, **Đăng ký**): mỗi dòng
là 1 TC của KBKTCN kèm Mục đích, Các bước, Kết quả mong muốn (đọc trực tiếp từ file KBKTCN), Kết quả,
chi tiết lỗi. Dòng F có ảnh chụp màn hình lỗi nhúng ngay trong ô (ảnh thu nhỏ phần đầu trang) kèm link
"Mở ảnh gốc" tới file trong `screenshots/` (giữ nguyên cấu trúc thư mục khi gửi báo cáo để link còn dùng được). Nếu file đang mở trong Excel, báo cáo được ghi sang
`report_<thời gian>.xlsx`. Dựng lại từ junit.xml bất kỳ lúc nào: `python -m utils.excel_report`.

Report HTML: `reports/report.html` (có cột Test Case ID, screenshot khi fail). Report cần chạy JavaScript:
mở bằng Chrome/Edge, không xem bằng khung preview tĩnh. Mỗi lần chạy `pytest` sẽ ghi đè report cũ.
Trace khi fail: `test-results/` (mở bằng `playwright show-trace <file.zip>`).

## Lưu ý

- `pytest.ini` dùng `--browser-channel=chromium` vì headless shell mặc định luôn trả thông báo
  validation tiếng Anh, không so được với "Vui lòng điền vào trường này".
- Backend giới hạn 20 request/phút cho API auth (đăng nhập + đăng ký dùng chung). Bộ test tự đếm và
  chờ khi gần chạm giới hạn (`auth_rate_limit_per_min` trong `config/environments.yaml`, đặt 0 để tắt)
  nên chạy toàn bộ mất khoảng 10 phút. Nếu vừa chạy xong lại chạy tiếp ngay, lần đầu vẫn có thể gặp 429.
- Mỗi lần chạy sẽ tạo thêm tài khoản test (email `auto.*@example.com`, `pth*@gmail.com.vn`,
  `abc*@xyz.xxx`) trong database của môi trường test.
- Câu thông báo mong đợi nằm trong `test_data/*.json` > `messages`. Nếu tài liệu được cập nhật theo
  ứng dụng thì chỉ cần sửa các file này.

## Bộ test CV

```bash
pytest -m cv                          # toàn bộ chức năng CV
pytest -m "cv_list"                   # CV của tôi   (cv_upload | cv_builder | cv_analysis)
pytest -m "cv and not ai"             # bỏ các test cần AI thật
pytest -k Candidate_86
```

- Mỗi test làm thay đổi dữ liệu tự tạo **tài khoản ứng viên mới** qua API (`auto.cv.*@example.com`) và tải CV
  mẫu do code sinh ra (`utils/cv_files.py`) – không đụng tới tài khoản demo. Test chỉ đọc dùng chung 1 tài khoản / module.
- Đăng nhập trình duyệt bằng cách đặt token vào `sessionStorage` (không qua màn hình Đăng nhập) để tiết kiệm
  lượt gọi API auth (giới hạn 20/phút). Phía nhà tuyển dụng (CV công khai, CV đã nộp) kiểm tra qua API bằng
  tài khoản `RECRUITER_EMAIL` trong `.env`; NTD demo cần có ít nhất 1 tin đang tuyển (`seed_demo`).
- Test `@pytest.mark.ai` gọi AI thật qua backend; **tự skip** khi backend chưa bật API AI
  (`GET /candidate/cv-analyses/` trả 404). Test hiển thị kết quả AI (tab Chấm điểm/Gợi ý) dùng response giả lập.
- Câu thông báo / giới hạn mong đợi theo KBKTCN nằm ở `test_data/cv.json` > `messages`, `builder_fields`...
- Chromium của Playwright hỏng trên máy (lỗi "side-by-side configuration") -> chạy bằng Edge:
  `pytest -m cv --browser-channel=msedge`, hoặc cài lại: `playwright install --force chromium`.
- Candidate_207/208 đọc nội dung PDF bằng `pypdf` (đã thêm vào requirements.txt).

## Chạy các chức năng còn lại

```bash
pytest -m "home or jobs or job_detail or companies"   # sheet Trang chủ
pytest -m profile                                      # Hồ sơ cá nhân
pytest -m "recommended_jobs or apply or my_applications or invitations or favorites"   # Ứng viên phần còn lại
pytest -m recruiter                                    # Nhà tuyển dụng
pytest -m admin                                        # Admin
pytest -m generic                                      # chỉ các test sinh theo mẫu
pytest -k Recruiter_292                                # theo mã TC
python -m utils.coverage                               # TC nào trong KBKTCN chưa có test
```

- Cần `ADMIN_EMAIL` / `ADMIN_PASSWORD` trong `.env` (tài khoản admin demo) cho bộ Admin và kiểm tra phân quyền.
- Máy hiện tại Chromium của Playwright hỏng; Edge hiển thị thông báo validation khác ("Vui lòng điền vào ô này.")
  nên dùng Chrome: `pytest ... --browser-channel=chrome`.
- Backend giới hạn 30 lượt tải CV/giờ: ứng viên nộp đơn trong bộ NTD/Admin dùng chung (`shared_applicant`).
