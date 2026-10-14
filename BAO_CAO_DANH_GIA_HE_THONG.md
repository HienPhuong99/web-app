# BÁO CÁO KIỂM TOÁN KỸ THUẬT, NGHIỆP VỤ & TRẢI NGHIỆM NGƯỜI DÙNG — HỆ THỐNG `phuonghihi`

- **Đơn vị thực hiện kiểm toán**: Gemini Argon (Principal Retail ERP Auditor & Automated Fuzzing Engine)
- **Ngày thực hiện**: 14/10/2026
- **Phiên bản mã nguồn kiểm toán**: Nhánh `main` — Commit `4264c97` (PR #14)
- **Phạm vi kiểm toán**:
  - Máy chủ & Giao diện Web Google Apps Script: `apps-script/Code.gs`, `DichVu.gs`, `SoQuy.gs`, `Api.gs`, `HopDong.gs`, `TimKiem.gs`, `EmailSang.gs`, `Index.html`
  - Ứng dụng Di động (Expo / React Native 0.86 / TypeScript): `mobile/src/**`
  - Bộ công cụ kiểm thử tự động: `dev/chay-thu.js`, `dev/kiem-tra*.js`, `playwright` (Chromium Headless), `fast-check` (Property-based Fuzzing)
- **Cam kết nguyên trạng**: Toàn bộ mã nguồn dự án được giữ nguyên 100% (`git diff` trống), không chỉnh sửa bất kỳ dòng code nào của hệ thống.

---

## MỤC LỤC DÀNH CHO CHỦ CỬA HÀNG & AI TIẾP NHẬN (AI HANDOFF)

1. [Tóm tắt Điều hành (Executive Summary)](#1-tóm-tắt-điều-hành-executive-summary)
2. [Kết quả chạy Bộ công cụ Kiểm thử & Fuzzing tự động](#2-kết-quả-chạy-bộ-công-cụ-kiểm-thử--fuzzing-tự-động)
3. [Danh mục 8 Lỗi Ngầm & Lỗ Hổng Nghiệp Vụ Nghiêm Trọng (Có PoC Thực Nghiệm)](#3-danh-mục-8-lỗi-ngầm--lỗ-hổng-nghiệp-vụ-nghiêm-trọng-có-poc-thực-nghiệm)
   - [BUG-01 (High): Màn hình Tra bảo hành trên Mobile (`quet.tsx`) tự xóa dấu cách, làm hỏng tìm kiếm tên khách](#bug-01-high-màn-hình-tra-bảo-hành-trên-mobile-quettsx-tự-xóa-dấu-cách-làm-hỏng-tìm-kiếm-tên-khách)
   - [BUG-02 (Critical): Lỗ hổng "Phụ kiện 0 đồng" khi Khách trả hàng 1 phần trên đơn có Giảm giá (`DichVu.gs:386`)](#bug-02-critical-lỗ-hổng-phụ-kiện-0-đồng-khi-khách-trả-hàng-1-phần-trên-đơn-có-giảm-giá-dichvugs386)
   - [BUG-03A (Critical): Gộp mã hàng máy cũ (`hangMayCu_`) + Giá vốn bình quân (`giaVonBQ_`) làm sai lệch lãi gộp từng IMEI tới +200%](#bug-03a-critical-gộp-mã-hàng-máy-cũ-hangmaycu_-giá-vốn-bình-quân-giavonbq_-làm-sai-lệch-lãi-gộp-từng-imei-tới-200)
   - [BUG-03B (Critical): Hiệu ứng "Du hành thời gian" — Nhập hàng tháng mới làm nhảy số báo cáo lãi lỗ của các tháng trước (`SoQuy.gs:35-48`)](#bug-03b-critical-hiệu-ứng-du-hành-thời-gian--nhập-hàng-tháng-mới-làm-nhảy-số-báo-cáo-lãi-lỗ-của-các-tháng-trước-soquygs35-48)
   - [BUG-03C (High): Máy cũ đã trả lại cho khách (khi hủy đơn lên đời trong 7 ngày) vẫn bị tính vào Giá vốn bình quân](#bug-03c-high-máy-cũ-đã-trả-lại-cho-khách-khi-hủy-đơn-lên-đời-trong-7-ngày-vẫn-bị-tính-vào-giá-vốn-bình-quân)
   - [BUG-04 (High): 4 chức năng ghi nhạy cảm trên Mobile quên dùng `goiGhi` (`maGhi`) và quên cập nhật bộ nhớ đệm (`boNho`)](#bug-04-high-4-chức-năng-ghi-nhạy-cảm-trên-mobile-quên-dùng-goighi-maghi-và-quên-cập-nhật-bộ-nhớ-đệm-bonho)
   - [BUG-05 (High): Lập Hợp đồng từ Đơn hàng (`hdTuDon`) làm mất khoản Giảm giá và làm trống cột IMEI đã xuất kho](#bug-05-high-lập-hợp-đồng-từ-đơn-hàng-hdtudon-làm-mất-khoản-giảm-giá-và-làm-trống-cột-imei-đã-xuất-kho)
   - [BUG-06 (Medium): Đối soát Nợ nhà cung cấp (`noNCC`) phân biệt chữ HOA/thường và gom mọi hình thức thanh toán vào chung "Ngân hàng"](#bug-06-medium-đối-soát-nợ-nhà-cung-cấp-noncc-phân-biệt-chữ-hoathường-và-gom-mọi-hình-thức-thanh-toán-vào-chung-ngân-hàng)
4. [Góc nhìn Người dùng Thực chiến tại Quầy iPhone (UX & Nghiệp vụ còn thiếu)](#4-góc-nhìn-người-dùng-thực-chiến-tại-quầy-iphone-ux--nghiệp-vụ-còn-thiếu)
5. [Đặc tả Kỹ thuật Chi tiết cho AI Tiếp nhận Sửa lỗi (Actionable Spec for AI Agents)](#5-đặc-tả-kỹ-thuật-chi-tiết-cho-ai-tiếp-nhận-sửa-lỗi-actionable-spec-for-ai-agents)

---

## 1. Tóm tắt Điều hành (Executive Summary)

### 1.1. Những điểm hệ thống đã làm rất xuất sắc
- **Kiến trúc Zero-Cost thông minh**: Tận dụng Google Sheets làm cơ sở dữ liệu nhưng vượt qua giới hạn tốc độ đọc nhờ lớp đệm `CacheService` chia mảnh 90KB (`apps-script/Code.gs:168-194`) và cơ chế `Stale-While-Revalidate` (`mobile/src/lib/boNho.ts:1-90`) trên ứng dụng di động.
- **Nghiệp vụ đặc thù ngành Apple**:
  - Hỗ trợ bóc tách mã vạch GS1 trên vỏ hộp iPhone và mã QR Căn cước công dân 12 số (`mobile/src/lib/maQuet.ts:1-45`).
  - Cơ chế **"Đơn lên đời giữ máy cũ 7 ngày"** (`apps-script/DichVu.gs:228-321`, `Code.gs:244-259`): Khóa xuất bán máy cũ trong 7 ngày đầu để đảm bảo nếu khách trả lại máy mới thì cửa hàng còn đúng chiếc máy cũ đó trả lại cho khách.
  - Tự động sinh mã **VietQR** đúng số tiền cần thu và xuất **Sổ doanh thu S1a-HKD (Thông tư 152/2025/TT-BTC)**.

### 1.2. Tại sao chưa thể đem ra vận hành thực tế ngay nếu chưa vá lỗi?
Dù các bài kiểm thử đơn vị hiện có (`dev/kiem-tra.js`) đều báo `OK`, đó là vì các bài test đó chỉ kiểm tra kịch bản "đường thẳng" (happy path). Khi kiểm toán bằng **Property-Based Fuzzing (`fast-check`)** và **Playwright UI Audit** dưới góc độ kế toán – vận hành tiệm điện thoại thực tế, hệ thống bộc lộ **3 nhóm rủi ro cốt tử**:
1. **Sai lệch Lãi gộp & Giá vốn (Accounting Integrity)**: Tính giá vốn bình quân cộng dồn toàn lịch sử thay vì đích danh theo IMEI khiến báo cáo lợi nhuận sai lệch từ **+200% đến +300%**, đồng thời việc nhập hàng ở tháng hiện tại làm thay đổi ngược lại số liệu báo cáo của các tháng trong quá khứ.
2. **Thất thoát tiền khi Khách trả hàng 1 phần hoặc Lập hợp đồng từ đơn**: Đơn hàng có giảm giá khi trả lại máy chính sẽ trừ toàn bộ giảm giá vào phụ kiện còn lại (biến phụ kiện thành 0 đồng); tạo hợp đồng từ đơn hàng có giảm giá làm mất khoản giảm giá và mất toàn bộ danh sách IMEI đã giao.
3. **Đứt gãy luồng thao tác trên Mobile**: Tìm tên khách ở màn hình Tra bảo hành bị nuốt dấu cách dẫn đến không tìm ra khách; 4 thao tác ghi dữ liệu nhạy cảm thiếu `maGhi` chống ghi trùng và không làm mới `boNho`.

---

## 2. Kết quả chạy Bộ công cụ Kiểm thử & Fuzzing tự động

Để thực hiện báo cáo này, các công cụ sau đã được cài đặt và thực thi trực tiếp:
1. **`playwright` + Chromium Headless (`v156.0.8078.4`)**: Kiểm thử giao diện tự động (E2E) trên cả Web App (`dev/kiem-trinh-duyet.js`), Mobile Web Export (`dev/kiem-trinh-duyet-app.js`) và kịch bản kiểm toán giao diện chuyên sâu (`audit-ui-playwright.js`).
2. **`fast-check` (Property-Based Testing Engine)**: Chạy 500 kịch bản giao dịch ngẫu nhiên (`kiem-toan-sau.js`) để kiểm chứng các bất biến kế toán (Accounting Invariants).
3. **Trình giả lập Apps Script VM (`dev/chay-thu.js`) + Bộ test TypeScript (`mobile/test/*.test.ts`)**.

| Bộ kiểm thử / Công cụ | Số kịch bản | Kết quả | Ghi chú phát hiện |
| :--- | :---: | :---: | :--- |
| `dev/kiem-tra.js` + `kiem-tra-api.js` | 180+ assertions | ĐẠT (Pass) | Các luồng cơ bản (Happy Path) hoạt động ổn định. |
| `dev/kiem-trinh-duyet.js` (Playwright Web) | 31 luồng UI | ĐẠT (Pass) | Giao diện Web phản hồi nhanh, không lỗi cú pháp HTML/JS. |
| `mobile` (`tsc` + `node --test` + Web Export) | Toàn bộ test TS + UI | ĐẠT (Pass) | Đã cài đặt đầy đủ `node_modules` và chạy kiểm thử trình duyệt di động. |
| **`kiem-toan-sau.js` (Gemini Argon PoC + `fast-check`)** | **5 PoC + 500 Fuzz runs** | **PHÁT HIỆN 8 LỖI** | **499/500 kịch bản fuzzing (99.8%) xuất hiện độ lệch giữa Giá vốn bình quân và Giá vốn đích danh IMEI (lệch tới 7.918.794 ₫/máy).** |

---

## 3. Danh mục 8 Lỗi Ngầm & Lỗ Hổng Nghiệp Vụ Nghiêm Trọng (Có PoC Thực Nghiệm)

### BUG-01 (High): Màn hình Tra bảo hành trên Mobile (`quet.tsx`) tự xóa dấu cách, làm hỏng tìm kiếm tên khách

- **Tệp & Dòng code**:
  - `mobile/src/app/(tabs)/quet.tsx` (dòng `25–29` và `65–72`)
  - `mobile/src/lib/maQuet.ts` (dòng `23–25`)
  - `apps-script/Api.gs` (dòng `215–227`) & `apps-script/TimKiem.gs` (dòng `28–55`)
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Ô tìm kiếm tại `quet.tsx:66` hướng dẫn người dùng: `placeholder="IMEI, SĐT hoặc tên khách"`.
  - Nhưng khi bấm Tìm, hàm `tra(raw)` ở `quet.tsx:26` luôn chạy `const ma = chuanHoaMa(raw); setQ(ma);`.
  - Hàm `chuanHoaMa` (`maQuet.ts:24`) thực thi `.replace(/[\s.\-]/g, '').toUpperCase()`, xóa sạch mọi khoảng trắng!
  - Khi nhân viên gõ `"Nguyễn Minh"` để tìm khách hàng `"Nguyễn Văn Minh"`, chuỗi bị biến thành `"NGUYỄNMINH"` và gửi lên `traBaoHanh`. Trên server, `phanTichTim_("NGUYỄNMINH")` coi đây là 1 từ duy nhất dài 10 ký tự `"nguyenminh"`. Trong khi tên khách trong DB được tách thành 3 từ `["nguyen", "van", "minh"]` (chuỗi liền là `"nguyenvanminh"`), không chứa chuỗi con `"nguyenminh"` $\rightarrow$ **Điểm khớp = 0!**
- **Bằng chứng thực nghiệm (PoC Output)**:
  ```json
  {
    "tenKhachTrongDB": "Nguyễn Văn Minh",
    "nhanVienGo": "Nguyễn Minh",
    "chuoiBiBienDoiTrenApp": "NGUYỄNMINH",
    "soKetQuaTrenAppMobile": 0,
    "soKetQuaNeuKhongXoaDauCach": 1
  }
  ```

---

### BUG-02 (Critical): Lỗ hổng "Phụ kiện 0 đồng" khi Khách trả hàng 1 phần trên đơn có Giảm giá (`DichVu.gs:386`)

- **Tệp & Dòng code**: `apps-script/DichVu.gs` (dòng `385–392` và `403–405`)
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Khi đơn hàng có giảm giá toàn đơn `dh.GiamGia` (ví dụ khách mua iPhone 30.000.000 ₫ + Ốp lưng MagSafe 500.000 ₫, cửa hàng giảm giá 600.000 ₫ $\rightarrow$ Tổng thanh toán = `29.900.000 ₫`), rồi hôm sau khách trả lại chiếc iPhone và giữ lại chiếc Ốp lưng.
  - Tại `DichVu.gs:386`, hệ thống tính lại tổng đơn mới theo công thức:
    ```javascript
    const cong = conLai.reduce((s, l) => s + Math.round(l.SoLuong * (+l.DonGia || 0)), 0),
          giam = Math.min(Math.max(0, cong), +dh.GiamGia || 0);
    const tongMoi = huy ? 0 : (cong - giam) + Math.round((cong - giam) * (+dh.VAT || 0) / 100);
    ```
  - Vì `dh.GiamGia` (`600.000 ₫`) **không được phân bổ theo tỷ lệ hàng trả** mà giữ nguyên 100% trừ thẳng vào `cong` còn lại (`500.000 ₫`), nên `giam = Math.min(500000, 600000) = 500.000 ₫` $\rightarrow$ **`tongMoi = 0 ₫`!**
  - Hệ thống báo: **Cho phép hoàn trả tối đa `29.900.000 ₫` (100% số tiền khách đã đóng)** trong khi khách vẫn cầm chiếc Ốp lưng `500.000 ₫` mang về miễn phí! Nghiêm trọng hơn, ở dòng `405`, `ghiDon` lưu lại đơn hàng với `TienHang = 0` nhưng cột `GiamGia` vẫn giữ nguyên `600.000 ₫`.
- **Bằng chứng thực nghiệm (PoC Output)**:
  ```json
  {
    "tongDonBanDau": 29900000,
    "giamGiaToanDon": 600000,
    "giaOpLungKhachGiuLai": 500000,
    "tongDonMoiSauKhiTraMay": 0,
    "soTienHeThongChoHoanToiDa": 29900000,
    "thietHaiCuaHang": 500000
  }
  ```

---

### BUG-03A (Critical): Gộp mã hàng máy cũ (`hangMayCu_`) + Giá vốn bình quân (`giaVonBQ_`) làm sai lệch lãi gộp từng IMEI tới +200%

- **Tệp & Dòng code**:
  - `apps-script/DichVu.gs` (dòng `36–46`)
  - `apps-script/SoQuy.gs` (dòng `35–48` và `139–193`)
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Hàm `hangMayCu_` (`DichVu.gs:38`) gộp tất cả máy cũ thu vào có cùng tên (VD: `iPhone 13 128GB (máy cũ)`) vào **chung một mã hàng `MaHH`**.
  - Hàm `giaVonBQ_` (`SoQuy.gs:38–47`) tính trung bình cộng giá nhập của mọi phiếu nhập thuộc `MaHH` đó, cộng thêm mọi phiếu chi `Làm lại máy cũ` (`LAM_LAI_MAY`), bất kể đang bán chiếc IMEI nào!
  - Trong ngành điện thoại cũ, hai chiếc cùng tên `iPhone 13 128GB` có thể chênh nhau 4–5 triệu đồng (máy đẹp keng pin 100% thu 9 triệu vs. máy vỡ kính màn linh kiện thu 5 triệu). Khi bán chiếc máy đẹp giá 10 triệu (lãi thật 1 triệu), hệ thống lấy giá vốn bình quân `(9tr + 5tr)/2 = 7 triệu` và báo **lãi gộp 3 triệu (+200% lãi ảo)**.
- **Bằng chứng thực nghiệm (PoC Output)**:
  ```json
  {
    "imeiBan": "359111000000001",
    "giaThuThucTeCuaMayNay": 9000000,
    "giaThuMayKiaTrongKho": 5000000,
    "giaBan": 10000000,
    "giaVonHeThongTinh": 7000000,
    "laiThucTe": 1000000,
    "laiHeThongBaoCao": 3000000,
    "saiLech": 2000000
  }
  ```

---

### BUG-03B (Critical): Hiệu ứng "Du hành thời gian" — Nhập hàng tháng mới làm nhảy số báo cáo lãi lỗ của các tháng trước (`SoQuy.gs:35-48`)

- **Tệp & Dòng code**: `apps-script/SoQuy.gs` (dòng `35–48` và `147`)
- **Nguyên nhân gốc rễ (Root Cause)**:
  - `giaVonBQ_()` quét toàn bộ bảng `PhieuKhoCT` từ đầu thời gian đến hiện tại mà không lọc theo ngày chứng từ (`Ngay <= denNgay`) và không trừ những lô hàng đã xuất bán hết trong quá khứ.
  - Hệ quả: Tháng 8/2026 nhập 1 máy giá 24tr, bán 25tr (xem báo cáo tháng 8 thấy lãi `1.000.000 ₫`). Đến tháng 10/2026, giá iPhone hạ nhiệt, nhập thêm 3 máy giá 20tr. Khi chủ tiệm mở lại báo cáo lợi nhuận của **Tháng 8/2026**, giá vốn của đơn hàng tháng 8 bị tụt xuống `21.000.000 ₫` và lãi tháng 8 tự động nhảy vọt từ `1.000.000 ₫` lên `4.000.000 ₫`!
- **Bằng chứng thực nghiệm (PoC Output)**:
  ```json
  {
    "donThang8": "006-2026/DH",
    "laiThang8KhiXemVaoThang8": 1000000,
    "laiThang8KhiXemLaiVaoThang10": 4000000,
    "doLechLichSu": 3000000
  }
  ```

---

### BUG-03C (High): Máy cũ đã trả lại cho khách (khi hủy đơn lên đời trong 7 ngày) vẫn bị tính vào Giá vốn bình quân

- **Tệp & Dòng code**: `apps-script/DichVu.gs` (dòng `401–402`) & `apps-script/SoQuy.gs` (dòng `37–41`)
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Khi khách trả hàng đơn lên đời trong 7 ngày, `traHang` tạo một phiếu xuất `XK` (`Trả lại máy cũ · đơn ...`) để xuất chiếc máy cũ trả lại cho khách.
  - Tuy nhiên, phiếu nhập `NK` (`Thu cũ đổi mới · đơn ...`) lúc đầu vẫn nằm nguyên trong `PhieuKhoCT` với `GiaVon = GiaThu` ban đầu. Hàm `giaVonBQ_()` chỉ cộng các phiếu `Nhập` mà không loại trừ các phiếu nhập thu cũ đã bị hoàn trả (`XK` trả lại máy cũ) $\rightarrow$ Giá thu của chiếc máy đã trả lại cho khách tiếp tục làm méo giá vốn của các máy thu mua sau này.
- **Bằng chứng thực nghiệm (PoC Output)**:
  ```json
  {
    "giaThuMay1DaTraLaiKhach": 14000000,
    "giaThuMay2DangTrongKho": 10000000,
    "giaVonDungPhaiLa": 10000000,
    "giaVonHeThongTinh": 12000000
  }
  ```

---

### BUG-04 (High): 4 chức năng ghi nhạy cảm trên Mobile quên dùng `goiGhi` (`maGhi`) và quên cập nhật bộ nhớ đệm (`boNho`)

- **Tệp & Dòng code**:
  - `apps-script/Api.gs` (dòng `82`: `GHI_MOT_LAN_ = ['banNhanh', 'luuThuTien', 'luuPhieuChi', 'traHang', 'traMaySua', 'luuSuaChua']`)
  - `mobile/src/app/tra-hang.tsx` (dòng `40`)
  - `mobile/src/app/so-quy.tsx` (dòng `90`)
  - `mobile/src/app/sua-chua/[so].tsx` (dòng `46` và `121`)
- **Nguyên nhân gốc rễ (Root Cause)**:
  - Server đã chuẩn bị sẵn cơ chế idempotency `maGhi` cho 6 API ghi dữ liệu, nhưng trên tầng UI Mobile chỉ có `ban.tsx` và `thu-tien.tsx` gọi `goiGhi()`.
  - 4 hành động còn lại (`traHang`, `luuPhieuChi`, `luuSuaChua`, `traMaySua`) gọi `goi()` thường mà không truyền `maGhi`. Nếu mạng 4G/WiFi chập chờn gây timeout ở chiều về và nhân viên bấm Lưu lại, server sẽ tạo **2 phiếu chi trùng nhau**!
  - Đặc biệt, tại `tra-hang.tsx:40–48`, sau khi nhận hàng trả xong, app chỉ hiện màn hình xác nhận mà **không hề cập nhật hay xóa bộ nhớ đệm (`boNho`)** của `khoMay`, `dsMaTon`, `tongQuanMay`, `chiTietKhach`, `soQuyMay`. Khi nhân viên quay ra, ứng dụng vẫn hiển thị số tồn kho cũ và doanh thu cũ từ RAM!

---

### BUG-05 (High): Lập Hợp đồng từ Đơn hàng (`hdTuDon`) làm mất khoản Giảm giá và làm trống cột IMEI đã xuất kho

- **Tệp & Dòng code**: `apps-script/Index.html` (dòng `2894–2901`)
- **Nguyên nhân gốc rễ (Root Cause)**:
  ```javascript
  function hdTuDon(dh) {
    const kh = S.khach.find(x => x.MaKH === dh.MaKH) || {};
    return {
      LoaiHD: S.loaiHD[0] || 'Hợp đồng mua bán', Ngay: today(), TrangThai: S.hdTrangThai[0],
      SoDH: dh.SoDH, MaKH: dh.MaKH, TenDN: dh.TenKH || kh.TenKH || '', DiaChi: dh.DiaChi || kh.DiaChi || '',
      MST: kh.MST || '', NguoiDaiDien: dh.NguoiLienHe || kh.NguoiLienHe || '', SDT: dh.SDT || kh.SDT || '',
      VAT: dh.VAT, lines: filled(dh.lines).map(l => ({ MaHH: l.MaHH, TenHang: l.TenHang, DVT: l.DVT, SoLuong: l.SoLuong, DonGia: l.DonGia, IMEI: l.IMEI || '' })),
    };
  }
  ```
  1. **Mất `GiamGia`**: Bảng `DonHang` có cột `GiamGia`, nhưng `HopDong` không có cột `GiamGia` và `hdTuDon` cũng không trừ giảm giá hay thêm dòng giảm giá. Kết quả: Đơn hàng `31.000.000 ₫` giảm `1.000.000 ₫` còn `30.000.000 ₫`, khi bấm **"Tạo hợp đồng"**, hợp đồng nhảy thành **`31.000.000 ₫`**!
  2. **Mất `IMEI`**: Trong `DonHangCT`, các dòng máy bán ra không lưu cột `IMEI` (vì `IMEI` được lưu trong `PhieuKhoCT` của phiếu xuất kho `XK` gắn với `SoDH`). Do đó `l.IMEI` trong `dh.lines` luôn là chuỗi rỗng `""`, làm cột IMEI trên hợp đồng trống trơn dù đơn đã xuất kho có IMEI đầy đủ!
- **Bằng chứng thực nghiệm (Playwright UI Audit Output)**:
  ```json
  {
    "soDH": "003-2026/DH",
    "tongDonHang": 30000000,
    "giamGiaDonHang": 1000000,
    "imeiDaXuat": "359999888877771",
    "hdLines": [
      {
        "MaHH": "HH0001",
        "TenHang": "iPhone 16 Pro Max 256GB - Titan Đen",
        "DVT": "Máy",
        "SoLuong": 1,
        "DonGia": 31000000,
        "IMEI": ""
      }
    ],
    "tongTrenHopDong": 31000000
  }
  ```

---

### BUG-06 (Medium): Đối soát Nợ nhà cung cấp (`noNCC`) phân biệt chữ HOA/thường và gom mọi hình thức thanh toán vào chung "Ngân hàng"

- **Tệp & Dòng code**:
  - `apps-script/Index.html` (dòng `3499–3504`) & `apps-script/SoQuy.gs` (dòng `89`)
  - `apps-script/SoQuy.gs` (dòng `12` và `105`)
- **Nguyên nhân gốc rễ (Root Cause)**:
  1. Hàm `noNCC()` gom nhóm công nợ theo chuỗi thô `p.DoiTac.trim()` có phân biệt chữ HOA/thường. Khi phiếu nhập ghi `"NCC Hoàng Hà"` (`15.000.000 ₫`) nhưng phiếu chi trả tiền ghi `"ncc hoàng hà"` (`15.000.000 ₫`), bảng Nợ nhà cung cấp tách thành 2 dòng: `"NCC Hoàng Hà"` vẫn báo **Còn nợ `15.000.000 ₫`**, còn `"ncc hoàng hà"` báo **Trả trước `15.000.000 ₫`**!
  2. Hàm `laTienMat_` (`SoQuy.gs:12`) chỉ kiểm tra `=== 'tiền mặt'`. Mọi hình thức khác như `Trả góp` (qua công ty tài chính HD Saison/Home Credit chờ giải ngân) hoặc `Thẻ tín dụng` (bị trừ phí quẹt POS 1.8% và chờ T+1) đều được cộng 100% vào **"Tiền trong ngân hàng"** ngay lập tức, gây lệch số dư tài khoản ngân hàng thực tế.

---

## 4. Góc nhìn Người dùng Thực chiến tại Quầy iPhone (UX & Nghiệp vụ còn thiếu)

Dưới vai trò chủ tiệm / thu ngân / kỹ thuật viên sử dụng hàng ngày, đây là **6 khoảng trống trải nghiệm** cần bổ sung:

1. **Thiếu Thanh toán kết hợp (Split Payment) trong 1 lần Bán nhanh**:
   - Khách mua iPhone 25–35 triệu rất thường trả một phần Tiền mặt (VD: 10tr) + phần còn lại Chuyển khoản/Quẹt thẻ (20tr). Hiện tại màn Bán nhanh chỉ cho chọn 1 hình thức thanh toán duy nhất.
2. **Sửa chữa có thay linh kiện không trừ tồn kho linh kiện & không tính giá vốn linh kiện**:
   - Hàm `traMaySua` (`DichVu.gs:193–195`) chỉ sinh một dòng dịch vụ chữ thuần (`DVT: 'Lần'`, không có `MaHH`). Nếu thợ thay viên Pin hoặc Màn hình lấy từ kho `HangHoa`, kho không tự trừ và báo cáo lợi nhuận tính lãi gộp = 100% tiền thu sửa chữa.
3. **Không xem được ảnh chụp máy sửa chữa trên App Mobile & thiếu xuất PDF Phiếu nhận máy sửa trên Mobile**:
   - Tại `mobile/src/app/sua-chua/[so].tsx:143`, kỹ thuật viên chụp ảnh máy xong chỉ thấy dòng chữ `"N ảnh (xem trên web)"`, không bấm xem lại ảnh ngay trên điện thoại được. Ngoài ra Mobile chưa có nút xuất PDF **Phiếu Nhận Máy Sửa Chữa** để gửi Zalo cho khách như phiếu bán hàng.
4. **Màn hình Kiểm kho trên Mobile (`kiem-kho.tsx`) dễ mất trắng dữ liệu khi quét số lượng lớn**:
   - Danh sách mã đã quét chỉ lưu trong `useState([])` tạm thời, không lưu vào `boNho` / đĩa, không có nút xóa lẻ 1 mã quét nhầm, và nút `"Làm lại"` xóa sạch toàn bộ danh sách mà không có hộp thoại xác nhận (`Alert.alert`).
5. **Thiếu luồng "Thu mua máy cũ lẻ (Khách bán đứt lấy tiền mặt, không mua máy mới)"**:
   - Hiện tại chỉ có `thuMayCu` gắn với một đơn bán hàng (`SoDH`). Nếu khách vãng lai mang iPhone cũ vào bán đứt lấy tiền mặt, nhân viên phải tự tạo Phiếu Nhập (`NK`) rời (làm tên khách bị đẩy vào danh sách *Nợ nhà cung cấp*) rồi lại phải qua Sổ quỹ lập Phiếu Chi (`PC`).
6. **Thiếu Checklist 3uTools / iCloud bắt buộc & In tem QR dán lưng máy cũ**:
   - Khi thu máy cũ hoặc nhận sửa chữa, cần có nút gạt bắt buộc xác nhận **"Đã thoát iCloud / Tắt Find My iPhone"** để tránh rủi ro nhân viên thu nhầm máy dính iCloud ẩn, kèm tính năng in tem nhiệt 50x30mm dán lưng máy cũ.

---

## 5. Đặc tả Kỹ thuật Chi tiết cho AI Tiếp nhận Sửa lỗi (Actionable Spec for AI Agents)

> **Hướng dẫn dành cho AI Agent tiếp theo**: Nếu được người dùng yêu cầu sửa các lỗi trong báo cáo này, hãy thực hiện tuần tự theo đúng danh sách kiểm tra (Checklist) dưới đây và chạy lại `node dev/kiem-tra.js` sau mỗi bước.

### Bước 1: Vá lỗi Tìm kiếm bảo hành trên Mobile (`BUG-01`)
- **File**: `mobile/src/app/(tabs)/quet.tsx`
- **Thay đổi**:
  - Khi người dùng nhập từ bàn phím (không phải từ camera scanner), chỉ gọi `chuanHoaMa(raw)` nếu chuỗi không chứa chữ cái tiếng Việt có dấu và không có dạng nhiều từ cách nhau bởi khoảng trắng (ví dụ: chỉ chuẩn hóa khi `/^[0-9A-Za-z.\-\s]+$/` mà có chứa chữ số, hoặc tách hàm `chuanHoaTimBaoHanh(raw)` giữ nguyên khoảng trắng đơn khi chuỗi toàn chữ cái).

### Bước 2: Vá lỗ hổng Giảm giá khi Khách trả hàng 1 phần (`BUG-02`)
- **File**: `apps-script/DichVu.gs` (hàm `traHang`, dòng `385–405`)
- **Thay đổi**:
  - Phân bổ `dh.GiamGia` theo tỷ lệ giá trị hàng còn lại trên tổng tiền hàng ban đầu trước giảm giá (`congCu = cu.filter(l => l.SoLuong > 0).reduce(...)`), hoặc giảm `GiamGia` tương ứng trên đơn hàng khi lưu lại `ghiDon` (`GiamGia: giam`) để đảm bảo khách trả món hàng chính không được hưởng nguyên mức giảm giá của món hàng đã trả vào món phụ kiện còn lại.

### Bước 3: Chuẩn hóa Giá vốn Đích danh theo IMEI & Chốt kỳ (`BUG-03A`, `BUG-03B`, `BUG-03C`)
- **File**: `apps-script/SoQuy.gs` (hàm `giaVonBQ_`, `loiNhuanKy_`)
- **Thay đổi**:
  - Bổ sung bảng tra giá vốn đích danh theo từng `IMEI` (`giaVonIMEI_`): Với mỗi `IMEI`, lấy `GiaVon` tại phiếu `NK` gần nhất của `IMEI` đó (trước hoặc trong kỳ báo cáo) cộng với tổng `PhieuChi` loại `'Làm lại máy cũ'` có `c.IMEI === gonMa_(imei)`.
  - Trong `loiNhuanKy_(tuNgay, denNgay)`:
    - Với dòng bán hàng có gắn phiếu xuất chứa `IMEI`: tính giá vốn bằng tổng giá vốn đích danh của từng `IMEI` xuất trong đơn đó.
    - Với hàng không có `IMEI` (phụ kiện): tính `giaVonBQ_(denNgay)` chỉ tính các phiếu nhập có `Ngay <= denNgay` và loại bỏ các phiếu nhập `"Thu cũ đổi mới"` đã có phiếu xuất `"Trả lại máy cũ"` tương ứng.

### Bước 4: Bổ sung `goiGhi` và đồng bộ `boNho` trên 4 màn hình Mobile (`BUG-04`)
- **File**:
  - `mobile/src/app/so-quy.tsx`: Đổi `goi<PhieuChi>('luuPhieuChi', ...)` sang dùng `goiGhi` với `maGhi = taoMaGhi()`, và cập nhật `boNho` của `tongQuanMay`.
  - `mobile/src/app/tra-hang.tsx`: Đổi `goi('traHang', ...)` sang `goiGhi`, và sau khi thành công, cập nhật/làm mới `boNho` cho `khoMay`, `dsMaTon`, `tongQuanMay`, `chiTietKhach`, `soQuyMay`.
  - `mobile/src/app/sua-chua/[so].tsx`: Đổi `luuSuaChua` và `traMaySua` sang `goiGhi`, đồng thời cập nhật `dsSuaChua`, `tongQuanMay`, `soQuyMay` khi trả máy có thu phí.

### Bước 5: Vá lỗi Lập Hợp đồng từ Đơn hàng (`BUG-05`) & Công nợ NCC (`BUG-06`)
- **File**: `apps-script/Index.html`
- **Thay đổi**:
  - Trong `hdTuDon(dh)` (dòng `2894`):
    - Lấy danh sách `IMEI` đã xuất của đơn hàng từ `S.phieuKho` (các phiếu xuất có `SoDH === dh.SoDH` trừ đi các phiếu nhập trả hàng) để điền tự động vào `l.IMEI`.
    - Nếu đơn hàng có `+dh.GiamGia > 0`, phân bổ giảm giá vào đơn giá hoặc thêm thông tin giảm giá để `TongCong` của Hợp đồng khớp 100% với `TongCong` của Đơn hàng.
  - Trong `noNCC()` (`Index.html:3500`) và `soQuyMay` (`SoQuy.gs:89`): Chuẩn hóa khóa đối tác theo `gon(ten)` (không phân biệt hoa/thường và khoảng trắng thừa) khi gom nhóm nhà cung cấp.
