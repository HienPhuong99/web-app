# App điện thoại phuonghihi (Android / iOS)

App Expo (React Native) cho nhân viên đứng quầy. Dữ liệu lấy từ web app Apps Script qua `apps-script/Api.gs`.

| Màn hình | Làm gì |
|---|---|
| Đăng nhập | Tài khoản của web app. Mã đăng nhập máy lưu trong Keychain / Keystore, mở lại app không phải nhập lại |
| Tổng quan | Phím tắt (Bán nhanh, Khách, Kho, Hợp đồng), doanh số hôm nay, đơn / đã thu / khách còn nợ, 7 ngày, việc cần làm; bấm khách còn nợ mở hồ sơ |
| Khách | Tìm khách (không cần dấu, theo SĐT, theo mã), công nợ; thêm khách mới. Hồ sơ khách: gọi / Zalo / nhắn tin, công nợ, **Thu tiền**, **Bán tiếp**, máy đã mua kèm bảo hành, đơn hàng, phiếu thu, hợp đồng (chia sẻ PDF) |
| Bán | **Bán nhanh**: quét / chọn ảnh / dán / gõ IMEI → app tự biết máy nào, giá lẻ, còn trong kho hay đã bán; thêm phụ kiện, dịch vụ; chọn khách, khách mới hoặc khách lẻ; khách trả bao nhiêu, hình thức nào (mã VietQR khi chuyển khoản). Một nút: máy chủ lập đơn hàng + phiếu xuất kho + phiếu thu |
| Thu tiền | Chọn đơn còn nợ (hoặc thu chung), số tiền, hình thức; chuyển khoản thì hiện mã VietQR cho khách quét |
| Quét | Tra bảo hành: quét mã vạch bằng camera, **chọn ảnh có mã**, **dán IMEI đã sao chép**, hoặc gõ IMEI / SĐT / tên khách |
| Thêm | Kho hàng (tồn kho, lọc sắp hết, kiểm tra một IMEI, thẻ kho), Hợp đồng (tìm, chia sẻ PDF), Điện thoại đăng nhập (đăng xuất máy khác từ xa), **khóa app bằng Face ID / vân tay**, **thông báo việc cần làm mỗi sáng**, đăng xuất |

Giao diện: nền màu đào, thẻ kính mờ, thanh tab nổi 5 nút (nút Bán ở giữa). Trên iPhone iOS 26 thanh tab dùng Liquid Glass thật (`expo-glass-effect`); máy khác dùng làm mờ hoặc nền trắng mờ.

## Thử trên điện thoại (miễn phí, Expo Go)

1. Cài app **Expo Go** trên điện thoại (App Store / Google Play), đăng nhập cùng tài khoản Expo với máy tính (`npx expo login`).
2. Trên máy tính: `cd mobile`, `npm install` (lần đầu), rồi `npx expo start`.
3. Android: mở Expo Go → quét mã QR. iPhone: mở Camera → quét mã QR.
   Điện thoại và máy tính phải cùng mạng Wi-Fi; khác mạng thì chạy `npx expo start --tunnel`.

App mặc định nối tới **link web app thật** (`extra.apiUrl` trong `app.json`).

**Thử mà không đụng dữ liệu thật:** chạy `node dev/chay-thu.js --mau-app` ở thư mục gốc (in mật khẩu admin). Trong app bấm **Máy chủ** dưới nút Đăng nhập, nhập `http://<IP máy tính>:5178/api` (xem IP bằng `ipconfig`). IMEI mẫu đã bán: `356789012345672` (còn hạn), `351234567890124` (hết hạn). Máy còn trong kho để thử bán: `356789012345680`, `356789012345698`, `351234567890132`.

### Giới hạn cần biết

- **Đọc mã từ ảnh**: Android đọc được cả mã vạch và mã QR. iPhone chỉ đọc được **mã QR** trong ảnh (giới hạn của `expo-camera`). Với mã vạch IMEI trên iPhone: mở ảnh trong app Ảnh, giữ tay lên dãy số để **Sao chép** (Live Text), rồi bấm **Dán** trong app.
- **Thông báo đẩy** cần làm một lần: trong `mobile/` chạy `npx eas-cli@latest init` (đăng nhập tài khoản Expo, chọn tạo dự án). Lệnh này ghi `extra.eas.projectId` vào `app.json`; commit thay đổi đó. Chưa có projectId thì app báo rõ khi bật thông báo.
  - iPhone: nhận thông báo được cả trong Expo Go.
  - Android: **Expo Go không nhận thông báo đẩy**, cần cài bản APK (bên dưới).
  - Máy chủ gửi bằng `UrlFetchApp`, một quyền mới của Apps Script: chủ Sheet chạy `caiDat` trong trình soạn thảo một lần và bấm **Cho phép** (xem `HUONG_DAN.md`).
- **Face ID**: trong Expo Go, iPhone hiện tên Expo Go khi hỏi Face ID; bản cài riêng hiện tên phuonghihi.

## Cài hẳn vào máy

- **Android (miễn phí):** `npx eas-cli@latest build -p android --profile preview` → tải file APK, gửi qua Zalo/Drive, cài. Cần tài khoản Expo (miễn phí).
- **iPhone:** cần Apple Developer Program (99 USD/năm), rồi `npx eas-cli@latest build -p ios --profile preview` hoặc TestFlight.

## Kiểm tra

- `npm run kiem-tra` (trong `mobile/`): kiểm tra kiểu TypeScript; hàm định dạng, mã quét, giỏ hàng bán nhanh, số điện thoại / Zalo, mã VietQR; gọi API thật của máy chủ thử qua HTTP.
- `npx expo lint`, `npx expo-doctor`.
- `node dev/kiem-trinh-duyet-app.js` (thư mục gốc, cần Playwright): build bản web rồi bấm qua 14 bước trên Chromium cỡ điện thoại: đăng nhập, tổng quan, tra bảo hành, dán IMEI, chọn ảnh có mã QR, bán nhanh (máy trong kho / đã bán / chưa nhập, dịch vụ, khách mới, trả một phần, mã QR), thu tiền, hồ sơ khách, thêm khách, kho, thẻ kho, kiểm tra IMEI, hợp đồng, điện thoại đăng nhập, đăng xuất từ xa (cả trên trang web quản lý), đăng xuất.

Camera, Face ID, thông báo và chia sẻ PDF chỉ thử được trên điện thoại thật.

## Cấu trúc

- `src/app/`: màn hình (Expo Router). `(tabs)/` là 5 tab (Tổng quan, Khách, Bán, Quét, Thêm); `khach/[ma].tsx` hồ sơ khách, `thu-tien.tsx`, `kho.tsx`, `kho/[ma].tsx` thẻ kho, `hop-dong.tsx`, `thiet-bi.tsx`, `dang-nhap.tsx`. Màn hình mới phải khai trong `MAN_DA_DANG_NHAP` ở `_layout.tsx` để chỉ vào được khi đã đăng nhập.
- `src/lib/`: gọi API (`api.ts`), đăng nhập (`auth.tsx`), khóa Face ID (`khoa.tsx`), thông báo (`thongBao.ts`), lưu an toàn (`luuTru.ts`), định dạng (`dinhDang.ts`), mã quét (`maQuet.ts`), lấy mã từ ảnh / bộ nhớ tạm (`layMa.ts`), giỏ hàng (`gioHang.ts`), gọi / Zalo / VietQR (`lienHe.ts`), PDF (`chiaSe.ts`, `pdf.ts`).
- `src/ui/`: màu, nền, thẻ kính, nút, chip, khung camera, mã QR, thẻ máy, danh sách, đầu trang, thanh tab.
- `AGENTS.md`: ghi chú cho trợ lý lập trình (Expo đổi API theo từng SDK, đọc tài liệu đúng phiên bản).
