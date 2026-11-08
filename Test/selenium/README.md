# Automation test – Đăng nhập (Smart ATS) – Selenium

Python + Selenium WebDriver + Pytest, mô hình Page Object. Cùng kịch bản (`FE/Test/KBKTCN_ATS_WEB_v1.0.xlsx`,
sheet "Đăng nhập, Đăng ký", Login_1 → Login_57) và cùng định dạng báo cáo với project `../playwright`.

| Nhóm | Test Case ID | File test |
|---|---|---|
| Giao diện + validation | Login_1 → Login_48 | `tests/ui/test_login_ui.py` |
| Luồng nghiệp vụ | Login_49 → Login_57 | `tests/function/test_login_function.py` |

## Cấu trúc

```
config/            environments.yaml (URL FE/BE, timeout, giới hạn API auth), settings.py
pages/             base_page.py, login_page.py (locator lấy từ source FE)
test_data/         login.json (dữ liệu nhập, mã TC, câu thông báo mong đợi)
utils/expect.py    assertion có tự chờ, mô phỏng expect() của Playwright (không dùng sleep)
utils/network.py   đọc request/response qua DevTools log (thay page.expect_response)
utils/             auth_api.py (tạo tiền điều kiện qua API), rate_limit.py, excel_report.py, ...
conftest.py        khởi tạo WebDriver, screenshot khi fail, cột Test Case ID, sinh báo cáo
reports/           report.html, report.xlsx, junit.xml, test.log (sinh khi chạy)
screenshots/       ảnh chụp toàn trang khi test fail
```

## Cài đặt

```bash
cd FE/Test/selenium
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env      # điền tài khoản test (mặc định là tài khoản demo)
```

Không cần tải chromedriver: Selenium Manager tự tải driver khớp với Chrome/Edge đã cài.

## Chạy

Cần chạy BE (`http://localhost:8000`) và FE (`http://localhost:3000`) trước.

```bash
pytest                       # toàn bộ Login_1..57 (~5 phút do điều tiết rate limit API auth)
pytest -m smoke              # bộ nhanh
pytest -m ui                 # chỉ UI
pytest -m function           # chỉ luồng nghiệp vụ
pytest -k Login_52           # theo Test Case ID
pytest --headed              # xem trình duyệt chạy
pytest --browser=edge        # chạy trên Microsoft Edge
pytest --env=staging         # môi trường khác (config/environments.yaml)
```

## Báo cáo (giống project Playwright)

- `reports/report.html` – pytest-html: cột **Test Case ID**, thông tin môi trường, khi fail có screenshot
  toàn trang, URL lúc lỗi và console log của trình duyệt. Mở bằng Chrome/Edge.
- `reports/report.xlsx` – sheet **Tổng hợp** (P/F/Manual theo chức năng) + sheet **Đăng nhập**: mỗi dòng
  1 TC của KBKTCN kèm Mục đích, Các bước, Kết quả mong muốn, Kết quả, chi tiết lỗi, ảnh lỗi nhúng trong ô.
  Dựng lại từ junit.xml: `python -m utils.excel_report`.
- `reports/junit.xml` – dùng cho CI.

## Khác biệt so với Playwright (đã xử lý)

| Playwright | Selenium trong project này |
|---|---|
| `expect(locator)` tự chờ | `utils/expect.py` (WebDriverWait, retry tới khi đúng) |
| `page.expect_response()` | `utils/network.py` đọc Chrome performance log |
| `context.grant_permissions(clipboard)` | CDP `Browser.grantPermissions` |
| `page.set_viewport_size` (Login_3) | CDP `Emulation.setDeviceMetricsOverride` |
| `page.screenshot(full_page=True)` | CDP `Page.captureScreenshot` + `captureBeyondViewport` |
| trace.zip khi fail | console log của trình duyệt đính kèm trong report |

Vì dùng CDP nên chỉ hỗ trợ trình duyệt nhân Chromium (Chrome, Edge).
