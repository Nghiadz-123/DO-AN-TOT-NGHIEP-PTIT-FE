# Automation test – Đăng nhập, Đăng ký (Smart ATS)

Python + Playwright + Pytest, mô hình Page Object. Kịch bản lấy từ `FE/Test/KBKTCN_ATS_WEB_v1.0.xlsx`,
sheet "Đăng nhập, Đăng ký":

| Chức năng | Test Case ID | File test |
|---|---|---|
| Đăng nhập | Login_1 → Login_48 | `tests/ui/test_login_ui.py` |
| Đăng nhập | Login_49 → Login_57 | `tests/function/test_login_function.py` |
| Đăng ký – Ứng viên | Login_58 → Login_141 | `tests/ui/test_register_ui.py` |
| Đăng ký – Ứng viên | Login_142 → Login_148 | `tests/function/test_register_function.py` |
| Đăng ký – Nhà tuyển dụng | Login_149 → Login_249 | `tests/ui/test_register_ui.py` |
| Đăng ký – Nhà tuyển dụng | Login_250 → Login_256 | `tests/function/test_register_function.py` |

## Cấu trúc

```
config/            environments.yaml (URL FE/BE, timeout, giới hạn API auth), settings.py
pages/             base_page.py, login_page.py, register_page.py (locator lấy từ source FE)
test_data/         login.json, register.json (dữ liệu nhập, mã TC, câu thông báo mong đợi theo tài liệu)
utils/             auth_api.py (tạo tiền điều kiện qua API), rate_limit.py, register_data.py, ...
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
